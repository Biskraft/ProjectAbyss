/**
 * FluidSystem.ts — Dynamic fluid (water / lava / ...) — V1 구현
 *
 * 참조: Documents/System/System_World_Fluid.md
 *
 * 흐름:
 *  1. attach(level)   — LDtk level 의 collisionGrid value=2 셀을 flood-fill 로
 *                       connected component 분할 → FluidBody 배열 생성.
 *                       FluidVolume entity (있으면) 와 교차 검사로 type 결정.
 *  2. update(dt)      — 각 body 의 surface column spring physics 진행 + ambient wave.
 *  3. render()        — Graphics 로 surface strip polygon redraw.
 *  4. applyImpulse()  — 외부에서 entity 진입 시 호출 (Player/Enemy splash hook).
 *  5. queryFluidAt()  — 임의 world 좌표가 어떤 fluid 안에 있는지 조회 (damage tick 용).
 *  6. detach()        — 룸 떠날 때 모든 body cleanup.
 *
 * V1 스코프: water 완전 구현 + lava 데이터 검증. Mesh API 대신 PixiJS Graphics
 * 폴리곤 매 프레임 redraw (vertex 수 적어 비용 무시 가능).
 */

import { Container, Graphics, BlurFilter } from 'pixi.js';
import type { LdtkLevel, LdtkEntity } from '@level/LdtkLoader';
import { getFluidDef, type FluidType, type FluidTypeDef } from '@data/FluidTypes';

/**
 * IntGrid cell value → default FluidType id. Each value flood-fills into
 * its own bodies (water never merges with magma even if adjacent).
 * Values must match Physics.ts TILE_* constants.
 */
const FLUID_CELL_TYPES: Array<{ value: number; type: FluidType }> = [
  { value: 2,  type: 'water' },
  { value: 6,  type: 'magma' },
  { value: 11, type: 'oil'   },
  { value: 13, type: 'acid'  },
];

/** Set of IntGrid values that are treated as flowing fluid by gravityTick. */
const FLUID_VALUES = new Set(FLUID_CELL_TYPES.map(f => f.value));

const TILE = 16;
// Hybrid render — keep IntGrid logic at 16×16 but render fluid surface at
// SUB-PIXEL resolution. 4 px column spacing = 4 columns per 16-px cell,
// doubled from the previous 8 px (= 2/cell). Combined with quadratic curve
// smoothing in drawBody this gives Noita-ish fluid surface without paying
// the simulation cost of sub-cell physics.
const COLUMN_SPACING = 4;          // px per spring column (sub-tile)
const AMBIENT_AMP = 0.55;          // ambient wave amplitude — 분명한 잔파도
const AMBIENT_PERIOD_MS = 380;     // ambient 임펄스 주기 — 끊임없이 흐르는 wave
const IMPULSE_FALLOFF_PX = 16;     // splash 즉시 인접 범위 1 tile — 옆은 propagation 으로 시간 전파
const CENTER_IMPULSE_MUL = 2.2;    // 중심 column 추가 가중치 — 진입 지점만 깊게 dip
const SIDE_IMPULSE_MUL = 0.25;     // 즉시 인접 column 가중치 — 좁고 약하게

interface SurfaceColumn {
  x: number;        // world X (px, level local)
  y0: number;       // resting surface Y (px, level local)
  y: number;        // current Y
  vy: number;       // velocity (px/ms)
}

interface FluidBody {
  type: FluidType;
  def: FluidTypeDef;
  cells: Set<number>;             // packed key (row * gridW + col)
  bounds: { minX: number; minY: number; maxX: number; maxY: number };  // level-local px
  surface: SurfaceColumn[];
  /** Topmost gy per column (cell coords). Used for surface y0. */
  topRow: Map<number, number>;
  /** Bottom-most gy per column. Used for stair-stepped bottom polygon. */
  bottomRow: Map<number, number>;
  gfx: Graphics;
  /**
   * Optional soft halo behind the body for self-illuminating fluids
   * (magma / lava / acid). Drawn under gfx with BlurFilter for a light
   * source feel. null for non-emissive fluids (water / oil).
   */
  haloGfx: Graphics | null;
  ambientPhase: number;           // 0..1 — body 별 시간 진행
  /** Phase for pulsing halo brightness, ms accumulator. */
  haloPhaseMs: number;
}

export class FluidSystem {
  private parent: Container;
  private bodies: FluidBody[] = [];
  /** Set to current level grid width to allow packed cell key lookup. */
  private gridW = 0;
  /** FluidVolume entities cached from attach() — used by rebuildFromGrid to keep type assignments. */
  private cachedVolumes: LdtkEntity[] = [];
  /** Accumulator for gravity tick (ms). */
  private gravityAccum = 0;
  /** Accumulator for thin-strip evaporation (ms). */
  private evapAccum = 0;
  /** Tunable: gravity tick interval. Lower = water flows faster but more rebuild churn. */
  static GRAVITY_TICK_MS = 140;
  /** How often a thin-strip body loses one surface cell to evaporation. */
  static EVAP_INTERVAL_MS = 250;
  /** Per-frame animation of evaporating droplets (cells removed from grid but still fading visually). */
  private evaporatingDrops: Array<{
    gfx: Graphics;
    cx: number;          // pixel center X
    by: number;          // pixel bottom Y (anchor)
    age: number;
    life: number;
    color: number;
  }> = [];
  /** Total fade-out duration for an evaporating droplet (ms). */
  static EVAP_FADE_MS = 650;

  /**
   * Optional callback fired when a thin-strip cell dries up. Lets the scene
   * leave a per-cell residue (oil/acid/magma) where the puddle vanished.
   * `fluidType` mirrors the FluidBody.type string ('water' | 'oil' | 'acid' |
   * 'magma' | 'lava'). Scene decides what to spawn per type.
   */
  onEvaporated: ((gx: number, gy: number, fluidType: string) => void) | null = null;

  constructor(parent: Container) {
    this.parent = parent;
  }

  /**
   * 룸 진입 시 호출. 기존 bodies destroy 후 새 level 의 fluid 영역 추출.
   * @param level LdtkLevel — collisionGrid + entities
   */
  attach(level: LdtkLevel): void {
    const volumes = level.entities.filter(e => e.type === 'FluidVolume');
    this.attachGrid(level.collisionGrid, volumes);
  }

  /**
   * Grid-only attach — for scenes (ItemWorldScene) that build their grids
   * procedurally without a LdtkLevel wrapper. Behaves identically to
   * attach(level) but skips the LdtkLevel.entities filter step.
   */
  attachGrid(grid: number[][], volumes: LdtkEntity[] = []): void {
    this.detach();
    if (!grid || grid.length === 0) return;
    const gridH = grid.length;
    const gridW = grid[0]?.length ?? 0;
    this.gridW = gridW;

    // FluidVolume entity rect 들 — 있으면 type override 용. Cache for rebuildFromGrid.
    this.cachedVolumes = volumes;

    // Flood-fill: each fluid cell value → connected components per type.
    // Different fluid types never merge (water + magma adjacent = two bodies).
    const visited = new Uint8Array(gridH * gridW);
    for (const { value, type: defaultType } of FLUID_CELL_TYPES) {
      for (let y = 0; y < gridH; y++) {
        for (let x = 0; x < gridW; x++) {
          if (visited[y * gridW + x]) continue;
          if (grid[y][x] !== value) continue;
          const component = this.floodFill(grid, x, y, gridW, gridH, visited, value);
          if (component.cells.size === 0) continue;
          // FluidVolume entity may override type for water only (legacy lava use).
          const type = value === 2 ? this.resolveFluidType(component, volumes) : defaultType;
          this.createBody(type, component, gridW);
        }
      }
    }
    // 첫 프레임 지연 제거 — attach 직후 mesh polygon 즉시 그려 룸 자산과 동시 표시.
    for (const body of this.bodies) this.drawBody(body);
  }

  /** 룸 떠날 때 호출. 모든 body 의 mesh 제거. */
  detach(): void {
    for (const body of this.bodies) {
      if (body.gfx.parent) body.gfx.parent.removeChild(body.gfx);
      body.gfx.destroy();
      if (body.haloGfx) {
        if (body.haloGfx.parent) body.haloGfx.parent.removeChild(body.haloGfx);
        body.haloGfx.destroy();
      }
    }
    this.bodies = [];
    // Also clean up any in-flight evaporation droplets so they don't dangle
    // across level reloads.
    for (const d of this.evaporatingDrops) {
      if (d.gfx.parent) d.gfx.parent.removeChild(d.gfx);
      d.gfx.destroy();
    }
    this.evaporatingDrops.length = 0;
  }

  /** Per-frame simulation step + render. dt in ms. */
  update(dt: number): void {
    for (const body of this.bodies) {
      this.stepSpring(body, dt);
      // Advance halo pulse phase for emissive fluids — slow ~1.8 s period.
      if (body.haloGfx) body.haloPhaseMs += dt;
      this.drawBody(body);
    }
    this.updateEvaporatingDrops(dt);
  }

  /**
   * 외부 entity 진입/잠김 시 호출. 해당 world X 의 가장 가까운 surface column 에
   * vy 비례 임펄스 추가. body 인덱스는 자동 매칭.
   * @param worldX entity world X (level local)
   * @param worldY entity world Y (surface 가까이일 때만 유효)
   * @param vy 진입 속도 (양수=떨어짐). 음수면 작은 임펄스 (튀어나옴).
   */
  applyImpulse(worldX: number, worldY: number, vy: number): void {
    const body = this.queryBodyAt(worldX, worldY);
    if (!body) return;
    let nearestIdx = -1;
    let nearestDx = Infinity;
    for (let i = 0; i < body.surface.length; i++) {
      const dx = Math.abs(body.surface[i].x - worldX);
      if (dx < nearestDx) { nearestDx = dx; nearestIdx = i; }
    }
    if (nearestIdx < 0) return;
    // 중심 column 만 큰 dip 임펄스. 즉시 인접은 1 tile 범위 안에서만 약하게 — 옆으로의
    // wave 는 spring propagation 이 시간에 따라 자연스럽게 전파하면서 약해진다.
    const strength = Math.max(-6, Math.min(6, vy * 0.015));
    body.surface[nearestIdx].vy += strength * CENTER_IMPULSE_MUL;
    const reach = Math.ceil(IMPULSE_FALLOFF_PX / COLUMN_SPACING);
    for (let r = 1; r <= reach; r++) {
      const falloff = 1 - r / (reach + 1);
      const sub = strength * falloff * SIDE_IMPULSE_MUL;
      if (nearestIdx - r >= 0) body.surface[nearestIdx - r].vy += sub;
      if (nearestIdx + r < body.surface.length) body.surface[nearestIdx + r].vy += sub;
    }
  }

  /**
   * world 좌표가 어떤 fluid 안에 있는지 조회. fluid 안이면 def 반환, 아니면 null.
   * 잠긴 entity damage tick / drag 계산용.
   */
  queryFluidAt(worldX: number, worldY: number): FluidTypeDef | null {
    const body = this.queryBodyAt(worldX, worldY);
    return body ? body.def : null;
  }

  /**
   * Cell count of the fluid body that covers (gx, gy) — 0 if no body is
   * present at that grid cell. Exposed so spawners can cap themselves
   * against an unbounded pool (a sideways-spreading shallow puddle that
   * keeps gravity moving cells out of the spawn point, causing the
   * spawner to emit forever).
   */
  fluidBodyCellCountAtCell(gx: number, gy: number): number {
    const key = gy * this.gridW + gx;
    for (const body of this.bodies) {
      if (body.cells.has(key)) return body.cells.size;
    }
    return 0;
  }

  /** 임의 world 좌표가 어떤 fluid body 의 cells 안에 있는지. */
  private queryBodyAt(worldX: number, worldY: number): FluidBody | null {
    const col = Math.floor(worldX / TILE);
    const row = Math.floor(worldY / TILE);
    const key = row * this.gridW + col;
    for (const body of this.bodies) {
      if (body.cells.has(key)) return body;
    }
    return null;
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private floodFill(
    grid: number[][],
    sx: number,
    sy: number,
    gridW: number,
    gridH: number,
    visited: Uint8Array,
    targetValue: number,
  ): { cells: Set<number>; minX: number; minY: number; maxX: number; maxY: number; topRow: Map<number, number>; bottomRow: Map<number, number> } {
    const cells = new Set<number>();
    const topRow = new Map<number, number>();      // col → topmost row of fluid
    const bottomRow = new Map<number, number>();   // col → bottom-most row
    let minX = sx, minY = sy, maxX = sx, maxY = sy;
    const stack: Array<[number, number]> = [[sx, sy]];
    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      if (x < 0 || y < 0 || x >= gridW || y >= gridH) continue;
      const k = y * gridW + x;
      if (visited[k]) continue;
      if (grid[y][x] !== targetValue) continue;
      visited[k] = 1;
      cells.add(k);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      const prevTop = topRow.get(x);
      if (prevTop === undefined || y < prevTop) topRow.set(x, y);
      const prevBot = bottomRow.get(x);
      if (prevBot === undefined || y > prevBot) bottomRow.set(x, y);
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    return { cells, minX, minY, maxX, maxY, topRow, bottomRow };
  }

  private resolveFluidType(
    component: { cells: Set<number>; minX: number; minY: number; maxX: number; maxY: number },
    volumes: LdtkEntity[],
  ): FluidType {
    // component AABB (px)
    const aabb = {
      x0: component.minX * TILE,
      y0: component.minY * TILE,
      x1: (component.maxX + 1) * TILE,
      y1: (component.maxY + 1) * TILE,
    };
    for (const v of volumes) {
      const vx0 = v.px[0];
      const vy0 = v.px[1];
      const vx1 = vx0 + v.width;
      const vy1 = vy0 + v.height;
      if (aabb.x0 < vx1 && aabb.x1 > vx0 && aabb.y0 < vy1 && aabb.y1 > vy0) {
        const t = (v.fields?.Type as string | undefined) ?? 'water';
        return t;
      }
    }
    return 'water';
  }

  private createBody(
    type: FluidType,
    component: { cells: Set<number>; minX: number; minY: number; maxX: number; maxY: number; topRow: Map<number, number>; bottomRow: Map<number, number> },
    gridW: number,
  ): void {
    const def = getFluidDef(type);
    // Surface columns: component 의 topRow 에 따라 column 별 resting Y.
    // 8px spacing → 한 타일당 2 column.
    const surface: SurfaceColumn[] = [];
    const sortedCols = Array.from(component.topRow.keys()).sort((a, b) => a - b);
    if (sortedCols.length === 0) return;
    const startCol = sortedCols[0];
    const endCol = sortedCols[sortedCols.length - 1];
    const startX = startCol * TILE;
    const endX = (endCol + 1) * TILE;

    // Smooth topRow with 5-tap weighted average (weights 1·2·3·2·1) so a 1-cell
    // stair-step in the underlying grid renders as a soft ⅓-cell slope instead
    // of a hard 16-px bump. Cells themselves stay grid-aligned; only the
    // render-time resting Y of each surface column is smoothed.
    const smoothedY0 = new Map<number, number>();
    for (const gx of component.topRow.keys()) {
      let sum = 0, denom = 0;
      for (let dx = -2; dx <= 2; dx++) {
        const t = component.topRow.get(gx + dx);
        if (t !== undefined) {
          const w = dx === 0 ? 3 : (Math.abs(dx) === 1 ? 2 : 1);
          sum += t * w;
          denom += w;
        }
      }
      smoothedY0.set(gx, (sum / denom) * TILE);
    }

    // Loop 은 endX 미만까지만 — endX 자체는 col=endCol+1 매핑되어 topRow 실패.
    // 마지막 col 의 right edge (=endX) 는 sentinel column 으로 별도 push 해 polygon
    // 우측이 fluid 영역 우측 edge 와 정확히 일치하게 만든다.
    for (let x = startX; x < endX; x += COLUMN_SPACING) {
      const col = Math.floor(x / TILE);
      if (!component.topRow.has(col)) continue;
      const y0 = smoothedY0.get(col)!;
      surface.push({ x, y0, y: y0, vy: 0 });
    }
    if (component.topRow.has(endCol)) {
      const y0 = smoothedY0.get(endCol)!;
      surface.push({ x: endX, y0, y: y0, vy: 0 });
    }
    if (surface.length === 0) return;

    // Halo first (rendered UNDER body when both children of parent).
    let haloGfx: Graphics | null = null;
    if (type === 'magma' || type === 'lava' || type === 'acid') {
      haloGfx = new Graphics();
      // BlurFilter gives the halo a soft glow look without ugly hard edges.
      // strength=8 is enough for ~6px feathering at our zoom.
      const blur = new BlurFilter({ strength: 8, quality: 4 });
      haloGfx.filters = [blur];
      this.parent.addChild(haloGfx);
    }
    const gfx = new Graphics();
    this.parent.addChild(gfx);

    const body: FluidBody = {
      type,
      def,
      cells: component.cells,
      bounds: {
        minX: component.minX * TILE,
        minY: component.minY * TILE,
        maxX: (component.maxX + 1) * TILE,
        maxY: (component.maxY + 1) * TILE,
      },
      surface,
      topRow: component.topRow,
      bottomRow: component.bottomRow,
      gfx,
      haloGfx,
      ambientPhase: Math.random(),
      haloPhaseMs: Math.random() * 2000,
    };
    this.bodies.push(body);
    // Cache grid width for packed-key APIs (removeCell / queryBodyAt).
    this.gridW = gridW;
  }

  private stepSpring(body: FluidBody, dt: number): void {
    const def = body.def;
    const k = def.surfaceK;
    const prop = def.propagation;
    const cols = body.surface;
    const n = cols.length;

    // Body-size scaling — small puddles need calmer behaviour to avoid
    // looking like they shimmer forever. Threshold around 8 surface columns
    // (≈ 4 tiles wide) where ambient becomes negligible.
    const sizeFactor = Math.max(0, Math.min(1, (n - 4) / 8)); // 0 for n≤4, 1 for n≥12
    // Damping ramps UP as body shrinks so leftover spring energy dies fast.
    const damp = def.surfaceDamping + (1 - sizeFactor) * 0.35;

    // Per-fluid-type ambient profile — magma should look like it's actively
    // boiling/bubbling, oil more like sluggish sloshing, water natural.
    let ampMul = 1.0, periodMul = 1.0;
    if (body.type === 'magma' || body.type === 'lava') {
      ampMul = 2.4;     // bigger bubble bursts
      periodMul = 0.45; // ~2x more frequent
    } else if (body.type === 'oil') {
      ampMul = 0.7;
      periodMul = 1.6;
    } else if (body.type === 'acid') {
      ampMul = 1.2;
      periodMul = 0.8;
    }

    // Ambient wave — random column + neighbours cluster impulse. Skipped when
    // the body is small (size factor 0) so single-puddle puddles stop wobbling.
    if (sizeFactor > 0) {
      body.ambientPhase += dt / (AMBIENT_PERIOD_MS * periodMul);
      if (body.ambientPhase >= 1) {
        body.ambientPhase -= 1;
        const idx = Math.floor(Math.random() * n);
        const amp = (Math.random() - 0.5) * AMBIENT_AMP * sizeFactor * ampMul;
        cols[idx].vy += amp;
        if (idx - 1 >= 0) cols[idx - 1].vy += amp * 0.6;
        if (idx + 1 < n) cols[idx + 1].vy += amp * 0.6;
        if (idx - 2 >= 0) cols[idx - 2].vy += amp * 0.3;
        if (idx + 2 < n) cols[idx + 2].vy += amp * 0.3;
      }
    }

    // Spring forces — two-pass with prev-y preservation for correct adjacency.
    const prevY = new Float32Array(n);
    for (let i = 0; i < n; i++) prevY[i] = cols[i].y;

    for (let i = 0; i < n; i++) {
      const c = cols[i];
      let f = -k * (c.y - c.y0);
      f += -damp * c.vy;
      if (i > 0)     f += prop * (prevY[i - 1] - c.y);
      if (i < n - 1) f += prop * (prevY[i + 1] - c.y);
      c.vy += f * dt * 0.06;
      c.y  += c.vy * dt * 0.06;
      // Aggressive snap to rest for tiny bodies — kill numeric jitter that
      // keeps the puddle "moving" indefinitely below visible thresholds.
      if (sizeFactor < 0.2 && Math.abs(c.y - c.y0) < 0.5 && Math.abs(c.vy) < 0.05) {
        c.y = c.y0;
        c.vy = 0;
      }
    }
  }

  private drawBody(body: FluidBody): void {
    const def = body.def;
    const g = body.gfx;
    g.clear();
    const cols = body.surface;
    if (cols.length < 2) return;
    const bodyCols = Array.from(body.bottomRow.keys()).sort((a, b) => a - b);
    if (bodyCols.length === 0) return;

    // Build polygon path:
    //   1. Top edge — smoothed spring surface columns L→R
    //   2. Right side — down from rightmost top to rightmost bottom
    //   3. Bottom edge — per-column bottomRow R→L (stair-stepped, follows cells)
    //   4. closePath — vertical left side back to start
    //
    // Stair-stepped bottom means polygon shape matches actual cell footprint:
    // if a column has water from gy=4 down to gy=8 but next column only to gy=6,
    // the polygon dips at that column. Irregular shapes (after fire on water,
    // etc.) render exactly without filling air gaps.
    const drawShape = (yOffset: number) => {
      // Smooth top surface — quadratic curves through column midpoints
      // (each spring point is the control, segments end at the midpoint
      // between adjacent points). Eliminates the faceted segment look at
      // tight column spacing without changing physics.
      g.moveTo(cols[0].x, cols[0].y + yOffset);
      for (let i = 0; i < cols.length - 1; i++) {
        const mx = (cols[i].x + cols[i + 1].x) / 2;
        const my = (cols[i].y + cols[i + 1].y) / 2 + yOffset;
        g.quadraticCurveTo(cols[i].x, cols[i].y + yOffset, mx, my);
      }
      // Final segment ends at the last column exactly so the polygon
      // closes cleanly on the right edge.
      g.lineTo(cols[cols.length - 1].x, cols[cols.length - 1].y + yOffset);
      // Right side: down from last top to last column's bottom
      const lastGx = bodyCols[bodyCols.length - 1];
      let prevBy = (body.bottomRow.get(lastGx)! + 1) * TILE;
      g.lineTo(cols[cols.length - 1].x, prevBy);
      // Bottom edge R→L with stair-step
      for (let i = bodyCols.length - 1; i >= 0; i--) {
        const gx = bodyCols[i];
        const by = (body.bottomRow.get(gx)! + 1) * TILE;
        if (by !== prevBy) {
          // vertical step at right edge of this column
          g.lineTo((gx + 1) * TILE, by);
          prevBy = by;
        }
        // horizontal to left edge of this column
        g.lineTo(gx * TILE, by);
      }
      g.closePath();
    };

    drawShape(0);
    // Per-fluid body opacity. Water/acid stay translucent so the player +
    // background structures read through; magma/oil/lava are thick liquids
    // that should look near-solid.
    let bodyAlpha = 0.75;
    if (body.type === 'magma' || body.type === 'lava' || body.type === 'oil') {
      bodyAlpha = 0.95;
    }
    g.fill({ color: def.bodyColor, alpha: bodyAlpha });

    // Shared helper — smooth surface path with quadratic midpoint curves.
    const traceSmoothSurface = (
      gfx: typeof g,
      yShift: number,
    ): void => {
      gfx.moveTo(cols[0].x, cols[0].y + yShift);
      for (let i = 0; i < cols.length - 1; i++) {
        const mx = (cols[i].x + cols[i + 1].x) / 2;
        const my = (cols[i].y + cols[i + 1].y) / 2 + yShift;
        gfx.quadraticCurveTo(cols[i].x, cols[i].y + yShift, mx, my);
      }
      gfx.lineTo(cols[cols.length - 1].x, cols[cols.length - 1].y + yShift);
    };

    // ─── Inline body glow (lava etc.) — offset 4px below surface. Strong. ───
    if (def.glowColor !== null) {
      traceSmoothSurface(g, 0);
      const lastGx = bodyCols[bodyCols.length - 1];
      const lastBy = (body.bottomRow.get(lastGx)! + 1) * TILE;
      g.lineTo(cols[cols.length - 1].x, Math.min(lastBy, Math.round(cols[cols.length - 1].y) + 4));
      g.lineTo(cols[0].x, Math.min(lastBy, Math.round(cols[0].y) + 4));
      g.closePath();
      g.fill({ color: def.glowColor, alpha: 0.55 });
    }

    // ─── Light-source halo (magma / lava / acid) ───
    // Drawn on the separate haloGfx (which has BlurFilter) so it produces a
    // soft glow around and above the fluid surface. Two stacked shapes:
    //  - Wide outer halo extending ~24 px above + ~12 px outside body width
    //  - Tight inner halo extending ~10 px above + body footprint
    // Brightness pulses with haloPhaseMs (~ 2 s period).
    if (body.haloGfx && def.glowColor !== null) {
      const h = body.haloGfx;
      h.clear();
      const pulse = 0.5 + 0.5 * Math.sin((body.haloPhaseMs / 1800) * Math.PI * 2);
      const lastGx = bodyCols[bodyCols.length - 1];
      const lastBy = (body.bottomRow.get(lastGx)! + 1) * TILE;

      // Outer halo — wide, very soft, biggest above-surface reach.
      const outerLift = 24;
      const outerPad = 12;
      h.moveTo(cols[0].x - outerPad, cols[0].y - outerLift);
      traceSmoothSurface(h, -outerLift);
      h.lineTo(cols[cols.length - 1].x + outerPad, cols[cols.length - 1].y - outerLift);
      h.lineTo(cols[cols.length - 1].x + outerPad, lastBy + 4);
      h.lineTo(cols[0].x - outerPad, lastBy + 4);
      h.closePath();
      h.fill({ color: def.glowColor, alpha: 0.18 + pulse * 0.10 });

      // Inner halo — tighter, brighter, follows the surface.
      const innerLift = 10;
      traceSmoothSurface(h, -innerLift);
      h.lineTo(cols[cols.length - 1].x, lastBy + 2);
      h.lineTo(cols[0].x, lastBy + 2);
      h.closePath();
      h.fill({ color: def.glowColor, alpha: 0.35 + pulse * 0.15 });

      // Hot core line — bright accent right along the surface.
      traceSmoothSurface(h, -1);
      h.stroke({ color: 0xffffff, width: 1.5, alpha: 0.55 + pulse * 0.30 });
    }

    // Surface highlight line — 1px stroke for readability.
    traceSmoothSurface(g, 0);
    g.stroke({ color: def.surfaceColor, width: 1, alpha: 0.9 });
  }

  // ============================================================
  // Cell mutation API (option B + C from prototype)
  // ============================================================

  /**
   * Remove a cell from whichever body contains it. Handles 3 cases:
   *   - Empty body → destroy
   *   - Connected after removal → rebuild surface/bottom (preserve wave momentum)
   *   - Disconnected → split into N sub-bodies (each preserves wave from old)
   * Called by element attack hooks (e.g., Fire enchant on water cell).
   */
  removeCell(gx: number, gy: number): void {
    const key = gy * this.gridW + gx;
    let body: FluidBody | null = null;
    for (const b of this.bodies) {
      if (b.cells.has(key)) { body = b; break; }
    }
    if (!body) return;
    body.cells.delete(key);
    if (body.cells.size === 0) {
      // destroy
      if (body.gfx.parent) body.gfx.parent.removeChild(body.gfx);
      body.gfx.destroy();
      if (body.haloGfx) {
        if (body.haloGfx.parent) body.haloGfx.parent.removeChild(body.haloGfx);
        body.haloGfx.destroy();
      }
      this.bodies = this.bodies.filter(b => b !== body);
      return;
    }
    this.maybeSplit(body);
  }

  /**
   * Check whether body.cells is still 4-connected after a mutation.
   * If multiple components found, replace body with N new bodies sharing the
   * type/def. Wave state is transferred by closest x-match.
   */
  private maybeSplit(body: FluidBody): void {
    if (body.cells.size <= 1) {
      this.rebuildBody(body);
      return;
    }
    const visited = new Set<number>();
    const components: Set<number>[] = [];
    for (const start of body.cells) {
      if (visited.has(start)) continue;
      const comp = new Set<number>();
      const stack = [start];
      while (stack.length) {
        const k = stack.pop()!;
        if (visited.has(k)) continue;
        if (!body.cells.has(k)) continue;
        visited.add(k);
        comp.add(k);
        const x = k % this.gridW;
        const y = Math.floor(k / this.gridW);
        stack.push(
          y * this.gridW + (x + 1),
          y * this.gridW + (x - 1),
          (y + 1) * this.gridW + x,
          (y - 1) * this.gridW + x,
        );
      }
      components.push(comp);
    }
    if (components.length === 1) {
      this.rebuildBody(body);
      return;
    }
    // Split: destroy old body, create new ones per component, transfer wave.
    const oldSurface = body.surface;
    const oldAmbient = body.ambientPhase;
    if (body.gfx.parent) body.gfx.parent.removeChild(body.gfx);
    body.gfx.destroy();
    if (body.haloGfx) {
      if (body.haloGfx.parent) body.haloGfx.parent.removeChild(body.haloGfx);
      body.haloGfx.destroy();
    }
    this.bodies = this.bodies.filter(b => b !== body);
    for (const compCells of components) {
      const newBody = this.makeBodyFromCells(body.type, compCells);
      if (!newBody) continue;
      this.transferWaveState(newBody, oldSurface, oldAmbient);
    }
  }

  /** Recompute topRow / bottomRow / surface / bounds from body.cells in-place. */
  private rebuildBody(body: FluidBody): void {
    const oldSurface = body.surface;
    const oldAmbient = body.ambientPhase;
    const newBody = this.makeBodyFromCells(body.type, body.cells);
    if (!newBody) {
      // shouldn't happen unless cells empty
      if (body.gfx.parent) body.gfx.parent.removeChild(body.gfx);
      body.gfx.destroy();
      if (body.haloGfx) {
        if (body.haloGfx.parent) body.haloGfx.parent.removeChild(body.haloGfx);
        body.haloGfx.destroy();
      }
      this.bodies = this.bodies.filter(b => b !== body);
      return;
    }
    // newBody was pushed to this.bodies; remove old, transfer wave state.
    if (body.gfx.parent) body.gfx.parent.removeChild(body.gfx);
    body.gfx.destroy();
    if (body.haloGfx) {
      if (body.haloGfx.parent) body.haloGfx.parent.removeChild(body.haloGfx);
      body.haloGfx.destroy();
    }
    this.bodies = this.bodies.filter(b => b !== body);
    this.transferWaveState(newBody, oldSurface, oldAmbient);
  }

  /** Build a new FluidBody from a cell set (same type). Returns body or null if empty. */
  private makeBodyFromCells(type: FluidType, cells: Set<number>): FluidBody | null {
    if (cells.size === 0) return null;
    // Recompute topRow / bottomRow / bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const topRow = new Map<number, number>();
    const bottomRow = new Map<number, number>();
    for (const k of cells) {
      const x = k % this.gridW;
      const y = Math.floor(k / this.gridW);
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      const t = topRow.get(x); if (t === undefined || y < t) topRow.set(x, y);
      const b = bottomRow.get(x); if (b === undefined || y > b) bottomRow.set(x, y);
    }
    const before = this.bodies.length;
    this.createBody(type, { cells, minX, minY, maxX, maxY, topRow, bottomRow }, this.gridW);
    if (this.bodies.length === before) return null;
    return this.bodies[this.bodies.length - 1];
  }

  // ============================================================
  // Cellular gravity (prototype option C+) — water cells fall + spread
  // ============================================================

  /**
   * Accumulator-driven gravity tick. Call every frame with current roomData.
   * Mutates roomData (water cell positions) so player physics stays consistent
   * with the visible water surface. After mutations, rebuilds bodies from
   * the grid so polygons match new cell layout. Preserves wave momentum.
   *
   * @param roomData scene.collisionGrid (also player.roomData)
   * @param tileMutator optional — for frozen-cell check (ice cap support)
   * @param dtMs frame delta in milliseconds
   */
  gravityTick(
    roomData: number[][],
    dtMs: number,
    tileMutator?: {
      isFrozen(gx: number, gy: number): boolean;
      transferElectricOverlay?(fromGx: number, fromGy: number, toGx: number, toGy: number): void;
    },
  ): void {
    if (!roomData || !roomData.length) return;
    this.gravityAccum += dtMs;
    if (this.gravityAccum < FluidSystem.GRAVITY_TICK_MS) return;
    this.gravityAccum -= FluidSystem.GRAVITY_TICK_MS;

    const gridH = roomData.length;
    const gridW = roomData[0]?.length ?? 0;
    if (!gridW) return;

    let moved = false;
    const tryMove = (fx: number, fy: number, tx: number, ty: number): boolean => {
      if (tx < 0 || tx >= gridW || ty < 0 || ty >= gridH) return false;
      if (roomData[ty][tx] !== 0) return false; // dest must be AIR
      if (tileMutator?.isFrozen(tx, ty)) return false;
      const v = roomData[fy][fx]; // preserve cell type (water/magma/oil/acid)
      roomData[ty][tx] = v;
      roomData[fy][fx] = 0;
      // Carry electric overlay so thunder pulses stay on the (now moved) fluid
      // cells instead of being orphaned on the old AIR coordinate.
      tileMutator?.transferElectricOverlay?.(fx, fy, tx, ty);
      moved = true;
      return true;
    };

    // Collect locked cells — bodies that are STABLE puddles (thin strip on
    // a fully-solid floor AND wall-braced) stay put. Unstable bodies (the
    // pool at the foot of an airborne FluidSpawner waterfall, or a strip
    // missing its floor) stay free so cellular gravity can drain them.
    //
    // Without this stability gate, every flat puddle was locked — including
    // the half-formed pool below a mid-air spawner — and gravity couldn't
    // pull cells downward, leaving fluid floating in place.
    const lockedCells = new Set<number>();
    for (const body of this.bodies) {
      if (!this.isThinStrip(body)) continue;
      if (!this.hasSolidFloorUnderBottomRow(body, roomData)) continue;
      if (!this.isWallBraced(body, roomData)) continue;
      for (const k of body.cells) lockedCells.add(k);
    }

    // Bottom-up with alternating row direction to avoid bias
    for (let gy = gridH - 2; gy >= 0; gy--) {
      const ltr = (gy & 1) === 0;
      const xStart = ltr ? 0 : gridW - 1;
      const xEnd   = ltr ? gridW : -1;
      const xStep  = ltr ? 1 : -1;
      for (let gx = xStart; gx !== xEnd; gx += xStep) {
        const v = roomData[gy][gx];
        if (!FLUID_VALUES.has(v)) continue;
        if (tileMutator?.isFrozen(gx, gy)) continue;
        if (lockedCells.has(gy * gridW + gx)) continue;
        // Ice cap: fluid trapped beneath frozen cells doesn't drain.
        // The cap must be the same fluid type (so freezing the surface of a
        // water pool doesn't trap magma below — it wouldn't realistically).
        if (tileMutator) {
          let capped = false;
          for (let cy = gy - 1; cy >= 0; cy--) {
            const cc = roomData[cy][gx];
            if (cc !== v) break;
            if (tileMutator.isFrozen(gx, cy)) { capped = true; break; }
          }
          if (capped) continue;
        }
        // 1. fall straight down
        if (tryMove(gx, gy, gx, gy + 1)) continue;
        // 2. diagonal down (random priority)
        const dir = Math.random() < 0.5 ? -1 : 1;
        if (tryMove(gx, gy, gx + dir, gy + 1)) continue;
        if (tryMove(gx, gy, gx - dir, gy + 1)) continue;
        // 3. horizontal spread (always — self-levels naturally)
        if (tryMove(gx, gy, gx + dir, gy)) continue;
        tryMove(gx, gy, gx - dir, gy);
      }
    }

    if (moved) this.rebuildFromGrid(roomData);

    // Thin-strip evaporation — conditional.
    //
    // Original problem: 1-cell-deep strips that don't fill their row dance
    // around forever via cellular self-leveling. The fix is to dry up the
    // strip slowly so it eventually disappears.
    //
    // Counter-requirement (Victor): LDtk-authored puddles that DO sit on a
    // fully solid floor (no hole below any cell of the strip) are
    // intentional content and must be preserved. Floor-row is "꽉 차있다"
    // → puddle is stable; floor-row has any gap → puddle is residue.
    //
    // Decision rule per body:
    //   - must be a thin strip (1-cell-deep in every occupied column)
    //   - AND the cell directly below at least one of its cells must be
    //     non-solid (air or another fluid). That means the strip is sitting
    //     on a broken/incomplete floor — it's residue, dry it up.
    //   - If the floor is solid under every cell, leave it alone.
    this.evapAccum += dtMs;
    if (this.evapAccum >= FluidSystem.EVAP_INTERVAL_MS) {
      this.evapAccum -= FluidSystem.EVAP_INTERVAL_MS;
      let evaporated = false;
      for (const body of this.bodies) {
        // Two stability checks. BOTH must pass for the pool to be considered
        // an authored, locked-in puddle; otherwise it's residue and evaporates.
        //   1. hasSolidFloorUnderBottomRow — every floor cell directly below
        //      the body's bottom row is non-air, non-fluid.
        //   2. isWallBraced — every row the body touches has its leftmost
        //      and rightmost columns butted against a wall (or grid edge).
        // Either condition failing → puddle has somewhere to leak / dry up.
        const floorOk = this.hasSolidFloorUnderBottomRow(body, roomData);
        const braceOk = this.isWallBraced(body, roomData);
        if (floorOk && braceOk) continue;
        const choices: number[] = [];
        for (const k of body.cells) {
          const x = k % this.gridW;
          const y = Math.floor(k / this.gridW);
          if (!tileMutator?.isFrozen(x, y)) choices.push(k);
        }
        if (choices.length === 0) continue;
        const k = choices[Math.floor(Math.random() * choices.length)];
        const x = k % this.gridW;
        const y = Math.floor(k / this.gridW);
        if (roomData[y] && FLUID_VALUES.has(roomData[y][x])) {
          this.spawnEvaporatingDrop(x, y, body.def.bodyColor);
          this.onEvaporated?.(x, y, body.type);
          roomData[y][x] = 0;
          evaporated = true;
        }
      }
      if (evaporated) this.rebuildFromGrid(roomData);
    }
  }

  /**
   * Inspect ONLY the body's bottom-row cells (one per occupied column) —
   * those are the cells that actually touch the floor. The cell directly
   * below each bottom-row cell must be a true non-fluid non-air solid
   * (wall, wood, grass, metal, ice, breakable, …). A single air gap
   * returns false → puddle is considered residue and starts evaporating.
   *
   * Earlier version iterated every cell in the body, but the "below" of
   * a deep pool's upper cells is the pool itself (fluid) → false → every
   * deep pool got mis-classified as residue. The bottom-row check is the
   * correct anchor.
   */
  private hasSolidFloorUnderBottomRow(body: FluidBody, roomData: number[][]): boolean {
    if (!body.bottomRow.size) return true; // empty body — nothing to evap
    for (const [gx, bottomY] of body.bottomRow) {
      const below = roomData[bottomY + 1]?.[gx];
      if (below === undefined) continue; // grid bottom — treat as solid
      if (below === 0 || FLUID_VALUES.has(below)) return false;
    }
    return true;
  }

  /**
   * Wall-brace check. For every row the body occupies, the row's leftmost
   * and rightmost columns must be flanked by a non-air, non-fluid cell
   * (or by the grid edge). If either side is open, the pool can leak
   * sideways and should evaporate.
   */
  private isWallBraced(body: FluidBody, roomData: number[][]): boolean {
    if (!body.cells.size) return true;
    // Build per-row [minX, maxX].
    const rowExtent = new Map<number, [number, number]>();
    for (const k of body.cells) {
      const x = k % this.gridW;
      const y = Math.floor(k / this.gridW);
      const e = rowExtent.get(y);
      if (!e) rowExtent.set(y, [x, x]);
      else { if (x < e[0]) e[0] = x; if (x > e[1]) e[1] = x; }
    }
    for (const [y, [minX, maxX]] of rowExtent) {
      const row = roomData[y];
      if (!row) continue;
      const left  = minX === 0           ? undefined : row[minX - 1];
      const right = maxX === this.gridW - 1 ? undefined : row[maxX + 1];
      // undefined (grid edge) counts as solid — pool can't leak off-map.
      const leftSolid  = left  === undefined || (left  !== 0 && !FLUID_VALUES.has(left));
      const rightSolid = right === undefined || (right !== 0 && !FLUID_VALUES.has(right));
      if (!leftSolid || !rightSolid) return false;
    }
    return true;
  }

  /**
   * Create a fading droplet at the cell's center+bottom that scales down to
   * zero over EVAP_FADE_MS. Anchored at the bottom-center so the shrink
   * visually settles into the floor instead of vanishing in mid-air.
   */
  private spawnEvaporatingDrop(gx: number, gy: number, color: number): void {
    const cx = (gx + 0.5) * TILE;
    const by = (gy + 1) * TILE;   // bottom edge of the cell
    const g = new Graphics();
    g.x = cx;
    g.y = by;
    // Pivot at (0, 0) which is the center-bottom of the cell — scale shrinks
    // toward this anchor naturally.
    g.pivot.set(0, 0);
    this.parent.addChild(g);
    this.evaporatingDrops.push({
      gfx: g,
      cx,
      by,
      age: 0,
      life: FluidSystem.EVAP_FADE_MS,
      color,
    });
  }

  /** Tick + render evaporating droplets. Called from update(). */
  private updateEvaporatingDrops(dtMs: number): void {
    for (let i = this.evaporatingDrops.length - 1; i >= 0; i--) {
      const d = this.evaporatingDrops[i];
      d.age += dtMs;
      const k = Math.min(1, d.age / d.life);
      // Linear shrink from full cell → 0, anchored at center-bottom so the
      // square sinks evenly into the floor (bottom edge stays put, top edge
      // descends toward bottom).
      const scale = 1 - k;
      const w = TILE * scale;
      const h = TILE * scale;
      const alpha = 0.85 * (1 - k * 0.4);
      d.gfx.clear();
      // Rect anchored: x from -w/2..+w/2, y from -h..0 (bottom edge at y=0).
      d.gfx.rect(-w / 2, -h, w, h).fill({ color: d.color, alpha });
      if (d.age >= d.life) {
        if (d.gfx.parent) d.gfx.parent.removeChild(d.gfx);
        d.gfx.destroy();
        this.evaporatingDrops.splice(i, 1);
      }
    }
  }

  /** True when every column of the body has exactly 1 cell (single-row strip). */
  private isThinStrip(body: FluidBody): boolean {
    if (!body.topRow.size) return false;
    for (const gx of body.topRow.keys()) {
      const top = body.topRow.get(gx)!;
      const bot = body.bottomRow.get(gx)!;
      if (top !== bot) return false; // any column ≥ 2 cells deep → not thin
    }
    return true;
  }

  /**
   * Public entry for outside callers (e.g. scene reacts to ice→water melt)
   * to nudge the fluid system into discovering newly-introduced fluid cells.
   * Internal path uses rebuildFromGrid directly after gravityTick.
   */
  refreshFromGrid(roomData: number[][]): void {
    this.rebuildFromGrid(roomData);
  }

  /**
   * Rebuild all bodies from the current collisionGrid + cachedVolumes.
   * Used after gravityTick to keep polygons in sync with cell positions.
   * Preserves wave momentum by matching old bodies to new by cell overlap.
   */
  private rebuildFromGrid(roomData: number[][]): void {
    const gridH = roomData.length;
    if (!gridH) return;
    const gridW = roomData[0]?.length ?? 0;
    if (!gridW) return;
    const oldBodies = this.bodies;
    this.bodies = [];
    this.gridW = gridW;

    const visited = new Uint8Array(gridH * gridW);
    for (const { value, type: defaultType } of FLUID_CELL_TYPES) {
      for (let gy = 0; gy < gridH; gy++) {
        for (let gx = 0; gx < gridW; gx++) {
          if (visited[gy * gridW + gx]) continue;
          if (roomData[gy][gx] !== value) continue;
          const component = this.floodFill(roomData, gx, gy, gridW, gridH, visited, value);
          if (component.cells.size === 0) continue;
          const type = value === 2 ? this.resolveFluidType(component, this.cachedVolumes) : defaultType;
          this.createBody(type, component, gridW);
        }
      }
    }

    // Transfer wave state from old → new (closest-x cell overlap match)
    for (const newBody of this.bodies) {
      let bestOld: FluidBody | null = null;
      let bestOverlap = 0;
      for (const oldBody of oldBodies) {
        if (oldBody.type !== newBody.type) continue;
        let overlap = 0;
        for (const k of newBody.cells) if (oldBody.cells.has(k)) overlap++;
        if (overlap > bestOverlap) { bestOverlap = overlap; bestOld = oldBody; }
      }
      if (bestOld && bestOverlap > 0) {
        this.transferWaveState(newBody, bestOld.surface, bestOld.ambientPhase);
      }
    }

    // Draw new bodies IMMEDIATELY so the fill is present before we destroy old
    // gfx. Otherwise we get a 1-frame empty-polygon flash (alpha blink).
    for (const newBody of this.bodies) this.drawBody(newBody);

    // Now safe to destroy old graphics
    for (const oldBody of oldBodies) {
      if (oldBody.gfx.parent) oldBody.gfx.parent.removeChild(oldBody.gfx);
      oldBody.gfx.destroy();
      if (oldBody.haloGfx) {
        if (oldBody.haloGfx.parent) oldBody.haloGfx.parent.removeChild(oldBody.haloGfx);
        oldBody.haloGfx.destroy();
      }
    }
  }

  /**
   * Transfer surface column y / vy from old body's surface to new body by
   * closest x match. Preserves wave continuity across rebuild / split so
   * the surface doesn't snap back to rest position every time cells change.
   */
  private transferWaveState(
    newBody: FluidBody,
    oldSurface: SurfaceColumn[],
    oldAmbient: number,
  ): void {
    if (oldSurface.length === 0) return;
    for (const newCol of newBody.surface) {
      let best: SurfaceColumn | null = null;
      let bestDx = Infinity;
      for (const oc of oldSurface) {
        const dx = Math.abs(oc.x - newCol.x);
        if (dx < bestDx) { bestDx = dx; best = oc; }
      }
      if (best && bestDx < TILE) {
        // Preserve ABSOLUTE y so the visible surface doesn't snap when cells
        // fall. The spring force will smoothly drift y toward the new y0
        // (resting at new water level). Damping prevents overshoot.
        newCol.y = best.y;
        newCol.vy = best.vy * 0.5; // damp velocity slightly on transfer to avoid bounce
      }
    }
    newBody.ambientPhase = oldAmbient;
  }
}
