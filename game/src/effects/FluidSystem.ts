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

import { Container, Graphics } from 'pixi.js';
import type { LdtkLevel, LdtkEntity } from '@level/LdtkLoader';
import { getFluidDef, type FluidType, type FluidTypeDef } from '@data/FluidTypes';

const TILE = 16;
const COLUMN_SPACING = 8;          // px per spring column (sub-tile)
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
  gfx: Graphics;
  ambientPhase: number;           // 0..1 — body 별 시간 진행
}

export class FluidSystem {
  private parent: Container;
  private bodies: FluidBody[] = [];
  /** Set to current level grid width to allow packed cell key lookup. */
  private gridW = 0;

  constructor(parent: Container) {
    this.parent = parent;
  }

  /**
   * 룸 진입 시 호출. 기존 bodies destroy 후 새 level 의 fluid 영역 추출.
   * @param level LdtkLevel — collisionGrid + entities
   */
  attach(level: LdtkLevel): void {
    this.detach();
    const grid = level.collisionGrid;
    if (!grid || grid.length === 0) return;
    const gridH = grid.length;
    const gridW = grid[0]?.length ?? 0;
    this.gridW = gridW;

    // FluidVolume entity rect 들 — 있으면 type override 용.
    const volumes = level.entities.filter(e => e.type === 'FluidVolume');

    // Flood-fill: value=2 cells → connected components.
    const visited = new Uint8Array(gridH * gridW);
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        if (visited[y * gridW + x]) continue;
        if (grid[y][x] !== 2) continue;
        const component = this.floodFill(grid, x, y, gridW, gridH, visited);
        if (component.cells.size === 0) continue;
        const type = this.resolveFluidType(component, volumes);
        this.createBody(type, component, gridW);
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
    }
    this.bodies = [];
  }

  /** Per-frame simulation step + render. dt in ms. */
  update(dt: number): void {
    for (const body of this.bodies) {
      this.stepSpring(body, dt);
      this.drawBody(body);
    }
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
  ): { cells: Set<number>; minX: number; minY: number; maxX: number; maxY: number; topRow: Map<number, number> } {
    const cells = new Set<number>();
    const topRow = new Map<number, number>();   // col → topmost row of fluid
    let minX = sx, minY = sy, maxX = sx, maxY = sy;
    const stack: Array<[number, number]> = [[sx, sy]];
    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      if (x < 0 || y < 0 || x >= gridW || y >= gridH) continue;
      const k = y * gridW + x;
      if (visited[k]) continue;
      if (grid[y][x] !== 2) continue;
      visited[k] = 1;
      cells.add(k);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      const prev = topRow.get(x);
      if (prev === undefined || y < prev) topRow.set(x, y);
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    return { cells, minX, minY, maxX, maxY, topRow };
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
    component: { cells: Set<number>; minX: number; minY: number; maxX: number; maxY: number; topRow: Map<number, number> },
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
    // Loop 은 endX 미만까지만 — endX 자체는 col=endCol+1 매핑되어 topRow 실패.
    // 마지막 col 의 right edge (=endX) 는 sentinel column 으로 별도 push 해 polygon
    // 우측이 fluid 영역 우측 edge 와 정확히 일치하게 만든다.
    for (let x = startX; x < endX; x += COLUMN_SPACING) {
      const col = Math.floor(x / TILE);
      const topRow = component.topRow.get(col);
      if (topRow === undefined) continue;
      const y0 = topRow * TILE;
      surface.push({ x, y0, y: y0, vy: 0 });
    }
    const lastTopRow = component.topRow.get(endCol);
    if (lastTopRow !== undefined) {
      const y0 = lastTopRow * TILE;
      surface.push({ x: endX, y0, y: y0, vy: 0 });
    }
    if (surface.length === 0) return;

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
      gfx,
      ambientPhase: Math.random(),
    };
    this.bodies.push(body);
    // Suppress unused-var lint: gridW kept for future packed-key APIs.
    void gridW;
  }

  private stepSpring(body: FluidBody, dt: number): void {
    const def = body.def;
    const k = def.surfaceK;
    const damp = def.surfaceDamping;
    const prop = def.propagation;
    const cols = body.surface;
    const n = cols.length;

    // Ambient wave — random column + 인접 ±2 까지 같은 방향 cluster 임펄스. 단일
    // spike 가 아닌 5 column 폭 부드러운 ripple 이 끊임없이 흐른다. propagation 으로
    // 시간 따라 옆으로 자연 전파.
    body.ambientPhase += dt / AMBIENT_PERIOD_MS;
    if (body.ambientPhase >= 1) {
      body.ambientPhase -= 1;
      const idx = Math.floor(Math.random() * n);
      const amp = (Math.random() - 0.5) * AMBIENT_AMP;
      cols[idx].vy += amp;
      if (idx - 1 >= 0) cols[idx - 1].vy += amp * 0.6;
      if (idx + 1 < n) cols[idx + 1].vy += amp * 0.6;
      if (idx - 2 >= 0) cols[idx - 2].vy += amp * 0.3;
      if (idx + 2 < n) cols[idx + 2].vy += amp * 0.3;
    }

    // Spring forces — 두 패스로 인접 전파 계산 (이전 frame y 값 보존).
    const prevY = new Float32Array(n);
    for (let i = 0; i < n; i++) prevY[i] = cols[i].y;

    for (let i = 0; i < n; i++) {
      const c = cols[i];
      let f = -k * (c.y - c.y0);
      f += -damp * c.vy;
      if (i > 0)     f += prop * (prevY[i - 1] - c.y);
      if (i < n - 1) f += prop * (prevY[i + 1] - c.y);
      c.vy += f * dt * 0.06;     // dt 스케일 조정 (게임 dt ms 단위)
      c.y  += c.vy * dt * 0.06;
    }
  }

  private drawBody(body: FluidBody): void {
    const def = body.def;
    const g = body.gfx;
    g.clear();
    const cols = body.surface;
    if (cols.length < 2) return;

    // Surface polygon: top edge (cols) + bottom edge (body.bounds.maxY straight line).
    const bottomY = body.bounds.maxY;
    g.moveTo(cols[0].x, Math.round(cols[0].y));
    for (let i = 1; i < cols.length; i++) {
      g.lineTo(cols[i].x, Math.round(cols[i].y));
    }
    g.lineTo(cols[cols.length - 1].x, bottomY);
    g.lineTo(cols[0].x, bottomY);
    g.closePath();
    g.fill({ color: def.bodyColor, alpha: 0.75 });

    // Glow overlay — lava etc.
    if (def.glowColor !== null) {
      g.moveTo(cols[0].x, Math.round(cols[0].y));
      for (let i = 1; i < cols.length; i++) {
        g.lineTo(cols[i].x, Math.round(cols[i].y));
      }
      g.lineTo(cols[cols.length - 1].x, Math.min(bottomY, Math.round(cols[cols.length - 1].y) + 4));
      g.lineTo(cols[0].x, Math.min(bottomY, Math.round(cols[0].y) + 4));
      g.closePath();
      g.fill({ color: def.glowColor, alpha: 0.35 });
    }

    // Surface highlight line — 1px stroke for readability.
    g.moveTo(cols[0].x, Math.round(cols[0].y));
    for (let i = 1; i < cols.length; i++) {
      g.lineTo(cols[i].x, Math.round(cols[i].y));
    }
    g.stroke({ color: def.surfaceColor, width: 1, alpha: 0.9 });
  }
}
