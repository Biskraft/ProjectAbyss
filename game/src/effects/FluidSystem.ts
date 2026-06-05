import { clampEffect01 } from './EffectNumeric';
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
import { destroyDisplayObject } from '../scenes/shared/DisplayObjectLifecycleHelpers';

/**
 * IntGrid cell value → default FluidType id. Each value flood-fills into
 * its own bodies (water never merges with magma even if adjacent).
 * Values must match Physics.ts TILE_* constants.
 */
const FLUID_CELL_TYPES: Array<{ value: number; type: FluidType }> = [
  { value: 2,  type: 'water'   },
  { value: 6,  type: 'magma'   },
  { value: 8,  type: 'charged' },
  { value: 11, type: 'oil'     },
  { value: 13, type: 'acid'    },
  { value: 20, type: 'cyro'    },
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

/**
 * Arc Scan Cycle 의 한 연결 — charged body 의 origin 에서 target 으로 그어지는
 * 전기 선. 씬이 discharge 시 ref/kind 로 적절한 동작을 한다.
 */
export interface ArcLink {
  worldX: number;
  worldY: number;
  kind: 'entity' | 'container' | 'fluid' | 'cell';
  /** Scene 이 쓰는 reference (player/enemy/container instance / FluidBody / 셀 좌표). */
  ref?: unknown;
  /**
   * Pre-computed zigzag jitter offsets (segment - 1 pair × 2 numbers, alternating dx/dy).
   * Set by startArcScan so the arc line is *visually stable across frames* instead of
   * recomputing random per frame (was the source of the "불안정" look).
   */
  zigzagSeed?: number[];
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
  /**
   * Wet-Conductor Spread (R-NEW-025). water body 가 charged body 와 4-인접 시
   * true. attachGrid 직후 markElectrifiedBodies 가 마크. Arc Scan + Charge
   * Multiplier 가 이 flag 를 source pool 로 사용한다.
   */
  isElectrified: boolean;
  /**
   * Arc Scan Cycle (R-NEW-031 v2) — charged body 의 사이클 페이즈.
   * water + isElectrified 도 동일 사이클 진행 (wet-conductor 도 자체 arc 방출).
   */
  arcPhase: 'scan' | 'hold' | 'recover';
  arcPhaseMs: number;
  arcLinks: ArcLink[];
  /** Arc 시작점 — body 의 어느 surface column 좌표에서 발화 (world px). */
  arcOriginX: number;
  arcOriginY: number;
  /** Arc VFX gfx. 사이클마다 link 들 새로 그림. */
  arcGfx: Graphics | null;
}

export interface FluidCellBounds {
  minGx: number;
  minGy: number;
  maxGx: number;
  maxGy: number;
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
   * Arc Scan Cycle (R-NEW-031 v2) — charged body 가 주변 conductor 를 검색하여
   * 전기선을 그은 후 일정 시간 뒤 일제히 방전. 4 페이즈 사이클:
   *   scan 1500ms     : onArcScanRequest 콜백 → arcLinks 셋업. arc line 천천히 자라남.
   *   hold 1500ms     : arc 가 완전히 연결. 깜빡임 강화 (warning).
   *   discharge (즉시): onArcDischarge 콜백 → entity damage + charged buff + thunder chain.
   *   recover 3000ms  : 사이클 휴식. 끝나면 다시 scan.
   */
  static ARC_SCAN_DURATION_MS = 800;
  static ARC_HOLD_DURATION_MS = 400;
  static ARC_RECOVER_DURATION_MS = 1800;
  /** Discharge 직후 arc VFX 가 부드럽게 fade-out 되는 시간 (recovery 페이즈 초기). */
  static ARC_FADE_OUT_MS = 280;
  /** Arc 검색 반경 (px). 1 tile = 16 px → 10 tile = 160 px (V2.2 2026-05-17 — Spark
   *  primary signature charged 강화. 기존 80px 5-tile 에서 2배 확장. 메가스트럭처
   *  광역 위협 톤 + Spark 룸 시그니처 wow 강도 ↑.) */
  static ARC_SCAN_RADIUS_PX = 160;
  /** Discharge 시 entity 별 maxHp 비율 피해. */
  static ARC_DAMAGE_PCT = 0.05;
  /** Discharge 적중 entity 에게 부여되는 charged 상태 buff (ms). */
  static ARC_CHARGED_BUFF_MS = 3000;
  /** Arc zigzag segment 수 — frame-fixed seed 길이 결정. */
  static ARC_ZIGZAG_SEGMENTS = 6;

  /**
   * Arc 가 닿은 1 개 target. discharge 시 씬이 이 ref/kind/좌표로 적절히
   * damage / chain trigger / charged buff 를 적용한다.
   */

  /**
   * Arc Scan Cycle 의 페이즈가 'scan' 으로 진입할 때 호출. 씬은 (originX, originY)
   * 반경 ARC_SCAN_RADIUS_PX 안의 conductor (player / enemies / metal containers /
   * water fluid) 를 검색해 ArcLink[] 로 반환한다.
   */
  onArcScanRequest: ((originX: number, originY: number, radiusPx: number) => ArcLink[]) | null = null;
  /**
   * Discharge 페이즈 도달 시 호출. 씬은 각 ArcLink 에 대해:
   *   - entity (player/enemy): thunder damage + charged buff 부여
   *   - metal container: charged 마크 + 다음 thunder 적중 시 강화
   *   - fluid (water): isElectrified=true 보강
   *   - cell (water/metal/acid): applyThunderChain trigger
   */
  onArcDischarge: ((originX: number, originY: number, links: ArcLink[]) => void) | null = null;

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
  attachGrid(grid: number[][], volumes: LdtkEntity[] = [], bounds?: FluidCellBounds): void {
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
    const scan = this.clampBounds(bounds, gridW, gridH);
    for (const { value, type: defaultType } of FLUID_CELL_TYPES) {
      for (let y = scan.minGy; y <= scan.maxGy; y++) {
        for (let x = scan.minGx; x <= scan.maxGx; x++) {
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
    // Wet-Conductor Spread (R-NEW-025) — charged body 와 4-인접 water body 마크.
    this.markElectrifiedBodies();
    // 첫 프레임 지연 제거 — attach 직후 mesh polygon 즉시 그려 룸 자산과 동시 표시.
    for (const body of this.bodies) this.drawBody(body);
  }

  /**
   * Wet-Conductor Spread (R-NEW-025) — charged FluidBody 의 cells 중 하나라도
   * water FluidBody 의 cells 와 4-인접 시 그 water body 를 전도화(영구) 마크.
   * attachGrid / rebuildFromGrid 직후 1회 호출. 비용: 인접 검사라 O(charged_cells × 4).
   */
  private markElectrifiedBodies(): void {
    const chargedBodies = this.bodies.filter(b => b.type === 'charged');
    if (chargedBodies.length === 0) return;
    const waterBodies = this.bodies.filter(b => b.type === 'water');
    if (waterBodies.length === 0) return;
    const gridW = this.gridW;
    for (const cb of chargedBodies) {
      for (const key of cb.cells) {
        const gx = key % gridW;
        const gy = Math.floor(key / gridW);
        const neighborKeys = [
          (gy - 1) * gridW + gx,
          (gy + 1) * gridW + gx,
          gy * gridW + (gx - 1),
          gy * gridW + (gx + 1),
        ];
        for (const nkey of neighborKeys) {
          for (const wb of waterBodies) {
            if (!wb.isElectrified && wb.cells.has(nkey)) {
              wb.isElectrified = true;
              // Arc 사이클 시작 시점 분산 — 여러 electrified body 가 동시 발현
              // 되어 화면이 항상 arc 로 가득 차는 현상 방지.
              wb.arcPhase = 'recover';
              wb.arcPhaseMs = FluidSystem.ARC_RECOVER_DURATION_MS * Math.random();
            }
          }
        }
      }
    }
  }

  /** 룸 떠날 때 호출. 모든 body 의 mesh 제거. */
  detach(): void {
    for (const body of this.bodies) {
      destroyDisplayObject(body.gfx);
      if (body.haloGfx) {
        destroyDisplayObject(body.haloGfx);
      }
      if (body.arcGfx) {
        destroyDisplayObject(body.arcGfx);
      }
    }
    this.bodies = [];
    // Also clean up any in-flight evaporation droplets so they don't dangle
    // across level reloads.
    for (const d of this.evaporatingDrops) {
      destroyDisplayObject(d.gfx);
    }
    this.evaporatingDrops.length = 0;
  }

  /** Per-frame simulation step + render. dt in ms. */
  update(dt: number, bounds?: FluidCellBounds): void {
    for (const body of this.bodies) {
      const active = this.bodyIntersectsBounds(body, bounds);
      body.gfx.visible = active;
      if (body.haloGfx) body.haloGfx.visible = active;
      if (body.arcGfx) body.arcGfx.visible = active;
      if (!active) continue;
      this.stepSpring(body, dt);
      // Advance halo pulse phase for emissive fluids — slow ~1.8 s period.
      if (body.haloGfx) body.haloPhaseMs += dt;
      // Arc Scan Cycle — charged body 와 electrified water body 모두 사이클 진행.
      if (body.type === 'charged' || (body.type === 'water' && body.isElectrified)) {
        this.tickArcCycle(body, dt);
      }
      this.drawBody(body);
    }
    this.updateEvaporatingDrops(dt);
  }

  /**
   * Arc Scan Cycle tick — 페이즈 머신 (총 3초 사이클).
   *   scan (0.8s):  arcLinks 셋업, arc 자라남.
   *   hold (0.4s):  arc 완전 연결 + 강 깜빡임 (warning).
   *   discharge:    hold 종료 순간 onArcDischarge 호출. arc 시각 유지 (fade-out 대기).
   *   recover (1.8s):
   *     첫 ARC_FADE_OUT_MS (0.28s): arcGfx.alpha 1 → 0 부드러운 fade.
   *     이후: arc 완전히 비움. 휴식.
   */
  private tickArcCycle(body: FluidBody, dt: number): void {
    body.arcPhaseMs += dt;
    if (body.arcPhase === 'recover') {
      // Fade-out: discharge 직후 arc 가 부드럽게 사라짐.
      if (body.arcGfx) {
        if (body.arcPhaseMs < FluidSystem.ARC_FADE_OUT_MS) {
          body.arcGfx.alpha = 1 - body.arcPhaseMs / FluidSystem.ARC_FADE_OUT_MS;
        } else if (body.arcGfx.alpha !== 0) {
          body.arcGfx.alpha = 0;
          body.arcGfx.clear();
          body.arcLinks = [];
        }
      }
      if (body.arcPhaseMs >= FluidSystem.ARC_RECOVER_DURATION_MS) {
        body.arcPhase = 'scan';
        body.arcPhaseMs = 0;
        if (body.arcGfx) body.arcGfx.alpha = 1;
        this.startArcScan(body);
      }
      return;
    }
    if (body.arcPhase === 'scan') {
      if (body.arcPhaseMs >= FluidSystem.ARC_SCAN_DURATION_MS) {
        body.arcPhase = 'hold';
        body.arcPhaseMs = 0;
      }
      this.drawArcLinks(body);
      return;
    }
    // hold
    if (body.arcPhaseMs >= FluidSystem.ARC_HOLD_DURATION_MS) {
      // Discharge! arc 는 마지막 frame 그대로 유지 → recover 단계 fade-out 에서 사라짐.
      if (this.onArcDischarge && body.arcLinks.length > 0) {
        this.onArcDischarge(body.arcOriginX, body.arcOriginY, body.arcLinks);
      }
      body.arcPhase = 'recover';
      body.arcPhaseMs = 0;
      // arcGfx.alpha 는 1 그대로 — recover 페이즈 첫 ARC_FADE_OUT_MS 동안 0 으로 감.
      return;
    }
    this.drawArcLinks(body);
  }

  /**
   * Scan 페이즈 시작 — origin 좌표 결정 + 콜백으로 도체 검색 → arcLinks 셋업.
   * 각 link 마다 zigzag pattern 을 *미리 1회 random 화* 해 cycle 동안 안정 시각.
   */
  private startArcScan(body: FluidBody): void {
    if (body.surface.length === 0) {
      body.arcLinks = [];
      return;
    }
    const idx = Math.floor(Math.random() * body.surface.length);
    const col = body.surface[idx];
    body.arcOriginX = col.x;
    body.arcOriginY = col.y;
    body.arcLinks = this.onArcScanRequest
      ? this.onArcScanRequest(body.arcOriginX, body.arcOriginY, FluidSystem.ARC_SCAN_RADIUS_PX)
      : [];
    // Frame-fixed zigzag seed — cycle 동안 jitter 안정.
    const segs = FluidSystem.ARC_ZIGZAG_SEGMENTS;
    for (const link of body.arcLinks) {
      const seeds: number[] = [];
      for (let i = 0; i < segs - 1; i++) {
        seeds.push((Math.random() - 0.5) * 6);
        seeds.push((Math.random() - 0.5) * 6);
      }
      link.zigzagSeed = seeds;
    }
    if (body.arcLinks.length > 0 && !body.arcGfx) {
      body.arcGfx = new Graphics();
      this.parent.addChild(body.arcGfx);
    }
    if (body.arcGfx) body.arcGfx.alpha = 1;
  }

  /**
   * Arc VFX 그리기 — scan 페이즈 동안 길이가 자라남 (0..1), hold 페이즈 동안
   * 완전 연결 + 깜빡임. zigzag pattern 은 cycle 동안 *고정* (link.zigzagSeed).
   */
  private drawArcLinks(body: FluidBody): void {
    if (!body.arcGfx || body.arcLinks.length === 0) return;
    const g = body.arcGfx;
    g.clear();
    let growT = 1;
    let flicker = 1;
    if (body.arcPhase === 'scan') {
      growT = Math.min(1, body.arcPhaseMs / FluidSystem.ARC_SCAN_DURATION_MS);
      flicker = 0.6 + 0.3 * Math.sin(body.arcPhaseMs / 80);
    } else if (body.arcPhase === 'hold') {
      const holdT = body.arcPhaseMs / FluidSystem.ARC_HOLD_DURATION_MS;
      flicker = 0.55 + 0.45 * Math.abs(Math.sin(holdT * Math.PI * 8));
    }
    const tintGlow = 0xFFF080;
    const tintCore = 0xffffff;
    for (const link of body.arcLinks) {
      const tx = body.arcOriginX + (link.worldX - body.arcOriginX) * growT;
      const ty = body.arcOriginY + (link.worldY - body.arcOriginY) * growT;
      const seeds = link.zigzagSeed ?? [];
      this.drawZigzagSegment(g, body.arcOriginX, body.arcOriginY, tx, ty, tintGlow, 6, 0.30 * flicker, seeds, growT);
      this.drawZigzagSegment(g, body.arcOriginX, body.arcOriginY, tx, ty, tintCore, 1.5, 0.85 * flicker, seeds, growT);
    }
  }

  /**
   * zigzag stroke — segment 마다 seed[] 의 미리 계산된 offset 적용.
   * growT < 1 이면 *마지막 segment* 만 *t 비율* 까지 그려 자라나는 듯한 효과.
   */
  private drawZigzagSegment(
    g: Graphics, x0: number, y0: number, x1: number, y1: number,
    color: number, width: number, alpha: number,
    seeds: number[], growT: number,
  ): void {
    const segments = FluidSystem.ARC_ZIGZAG_SEGMENTS;
    const dx = (x1 - x0) / segments;
    const dy = (y1 - y0) / segments;
    g.moveTo(x0, y0);
    for (let s = 1; s <= segments; s++) {
      const seedIdx = (s - 1) * 2;
      const offX = (s < segments && seedIdx     < seeds.length) ? seeds[seedIdx]     : 0;
      const offY = (s < segments && seedIdx + 1 < seeds.length) ? seeds[seedIdx + 1] : 0;
      const nx = x0 + dx * s + offX;
      const ny = y0 + dy * s + offY;
      g.lineTo(nx, ny);
    }
    g.stroke({ color, width, alpha });
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
    if (type === 'magma' || type === 'lava' || type === 'acid' || type === 'charged' || type === 'cyro') {
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
      isElectrified: false,
      // Arc Scan Cycle — charged body 만 recover 페이즈에서 시작 (다양한 시점 분산).
      // water body 는 markElectrifiedBodies 후 isElectrified=true 가 되면 동일하게 시작.
      arcPhase: 'recover',
      arcPhaseMs: type === 'charged'
        ? FluidSystem.ARC_RECOVER_DURATION_MS * Math.random()
        : 0,
      arcLinks: [],
      arcOriginX: 0,
      arcOriginY: 0,
      arcGfx: null,
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
    const sizeFactor = clampEffect01((n - 4) / 8); // 0 for n≤4, 1 for n≥12
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

    // ─── Cyro cold mist drift — haloGfx (BlurFilter) 위에 부드러운 안개 띠 3겹.
    //     각 layer 가 다른 속도로 횡 드리프트 + Y 파동 → 떠다니는 한기 인상.
    //     (2026-05-18 사용자 요청 — water 와 차별화).
    if (body.type === 'cyro' && body.haloGfx) {
      const h = body.haloGfx;
      const driftBase = body.ambientPhase * Math.PI * 2;
      for (let layer = 0; layer < 3; layer++) {
        const lift = 5 + layer * 6;
        const pad = 6 + layer * 5;
        const drift = Math.sin(driftBase + layer * 1.3) * (3 + layer * 2);
        const alpha = 0.14 - layer * 0.035;
        const waveAmp = 1.4 + layer * 0.8;
        const wave = (i: number) =>
          Math.sin(driftBase * 1.4 + i * 0.55 + layer * 2.1) * waveAmp;
        h.moveTo(cols[0].x - pad + drift, cols[0].y - lift + wave(0));
        for (let i = 0; i < cols.length - 1; i++) {
          const mx = (cols[i].x + cols[i + 1].x) / 2 + drift;
          const my = (cols[i].y + cols[i + 1].y) / 2 - lift + wave(i + 0.5);
          h.quadraticCurveTo(cols[i].x + drift, cols[i].y - lift + wave(i), mx, my);
        }
        h.lineTo(
          cols[cols.length - 1].x + pad + drift,
          cols[cols.length - 1].y - lift + wave(cols.length - 1),
        );
        // 안개 두께 — 위 윤곽 ~ surface 약간 위 (밴드 형태 닫기)
        h.lineTo(cols[cols.length - 1].x + pad + drift, cols[cols.length - 1].y - lift + 4);
        h.lineTo(cols[0].x - pad + drift, cols[0].y - lift + 4);
        h.closePath();
        h.fill({ color: 0xE0F8FF, alpha });
      }
    }

    // Surface highlight line — 1px stroke for readability.
    traceSmoothSurface(g, 0);
    g.stroke({ color: def.surfaceColor, width: 1, alpha: 0.9 });

    // ─── Wet-Conductor Spread (R-NEW-025) — water 풀 위에 자주 sparkle 점 산발.
    //     영구 마크된 water body 에만 적용.
    if (body.type === 'water' && body.isElectrified) {
      const sparkleColor = 0xFFE033;
      // 표면 column 마다 30% 확률로 1점. 시각 sparkle 효과는 ambientPhase 로 미세 시프트.
      for (let i = 0; i < cols.length; i++) {
        const phase = (body.ambientPhase + i * 0.137) % 1;
        if (phase < 0.30) {
          const sx = cols[i].x;
          const sy = cols[i].y - 1.5;
          g.circle(sx, sy, 0.9).fill({ color: sparkleColor, alpha: 0.55 + phase * 1.4 });
        }
      }
    }

    // ─── Cyro frost — 6-spoke ice 결정 surface 산발 + frost shimmer + 내부 specks.
    //     water 와 외관 차별화를 위해 Iron primary signature 시각 마커. (2026-05-18)
    if (body.type === 'cyro') {
      const crystalColor = 0xE0F8FF;  // foam_color — 가장 밝은 ice white
      const frostColor   = 0xFFFFFF;

      // 표면 ice crystal — column 마다 18% 확률로 6-spoke 별 결정.
      // ambientPhase 로 size 가 미세 호흡 (얼음이 굳었다 풀렸다).
      for (let i = 0; i < cols.length; i++) {
        const phase = (body.ambientPhase + i * 0.211) % 1;
        if (phase < 0.18) {
          const cx = cols[i].x;
          const cy = cols[i].y - 1;
          const s = 1.4 + Math.sin(phase * Math.PI * 10) * 0.5;
          const alpha = 0.55 + phase * 2.0;
          // 6-spoke (vertical + 2 diagonals = 6각형 효과)
          g.moveTo(cx, cy - s).lineTo(cx, cy + s)
            .stroke({ color: crystalColor, width: 0.7, alpha });
          g.moveTo(cx - s * 0.866, cy - s * 0.5).lineTo(cx + s * 0.866, cy + s * 0.5)
            .stroke({ color: crystalColor, width: 0.7, alpha });
          g.moveTo(cx - s * 0.866, cy + s * 0.5).lineTo(cx + s * 0.866, cy - s * 0.5)
            .stroke({ color: crystalColor, width: 0.7, alpha });
        }
      }

      // 표면 frost shimmer — 흰 highlight 한 줄을 surface 위로 살짝 띄워 결빙 광택.
      traceSmoothSurface(g, -0.5);
      g.stroke({ color: frostColor, width: 0.5, alpha: 0.35 });

      // 내부 frost specks — bodyCols 표본 추출해 column 당 0~1점, 천천히 떠다님.
      // 매 frame 새로 그려지므로 ambientPhase 가 위치를 결정해 floaty 한 인상.
      for (const gx of bodyCols) {
        const phase = (body.ambientPhase + gx * 0.073) % 1;
        if (phase < 0.12) {
          const surfaceCol = cols.find(c => Math.abs(c.x - (gx + 0.5) * TILE) < TILE * 0.6);
          const topY = surfaceCol ? surfaceCol.y : null;
          const botY = (body.bottomRow.get(gx)! + 1) * TILE;
          if (topY !== null && botY > topY + 4) {
            const t = phase / 0.12;
            const speckY = topY + 3 + t * (botY - topY - 6);
            const speckX = (gx + 0.5) * TILE;
            g.circle(speckX, speckY, 0.6).fill({ color: frostColor, alpha: 0.45 });
          }
        }
      }
    }

    // ─── Arc Scan Cycle warning glow — hold 페이즈 동안 surface 강하게 깜빡임
    //     (discharge 직전 1.5초). scan 페이즈는 약한 ambient.
    if (body.arcPhase === 'hold') {
      const holdT = body.arcPhaseMs / FluidSystem.ARC_HOLD_DURATION_MS;
      const intensity = 0.4 + 0.6 * Math.abs(Math.sin(holdT * Math.PI * 12));
      traceSmoothSurface(g, 0);
      g.stroke({
        color: 0xFFF080,
        width: 2 + intensity * 1.8,
        alpha: 0.50 + intensity * 0.45,
      });
    } else if (body.arcPhase === 'scan' && body.arcLinks.length > 0) {
      const scanT = body.arcPhaseMs / FluidSystem.ARC_SCAN_DURATION_MS;
      traceSmoothSurface(g, 0);
      g.stroke({
        color: 0xFFE033,
        width: 1.2,
        alpha: 0.30 + 0.20 * scanT,
      });
    }
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
      destroyDisplayObject(body.gfx);
      if (body.haloGfx) {
        destroyDisplayObject(body.haloGfx);
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
    destroyDisplayObject(body.gfx);
    if (body.haloGfx) {
      destroyDisplayObject(body.haloGfx);
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
      destroyDisplayObject(body.gfx);
      if (body.haloGfx) {
        destroyDisplayObject(body.haloGfx);
      }
      this.bodies = this.bodies.filter(b => b !== body);
      return;
    }
    // newBody was pushed to this.bodies; remove old, transfer wave state.
    destroyDisplayObject(body.gfx);
    if (body.haloGfx) {
      destroyDisplayObject(body.haloGfx);
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
    bounds?: FluidCellBounds,
  ): void {
    if (!roomData || !roomData.length) return;
    this.gravityAccum += dtMs;
    if (this.gravityAccum < FluidSystem.GRAVITY_TICK_MS) return;
    this.gravityAccum -= FluidSystem.GRAVITY_TICK_MS;

    const gridH = roomData.length;
    const gridW = roomData[0]?.length ?? 0;
    if (!gridW) return;
    const scan = this.clampBounds(bounds, gridW, gridH);

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

    // Collect locked cells — thin strips that already sit on a fully-solid
    // floor stay put. If their sides are not wall-braced they still evaporate
    // below, but they should not pop left/right while waiting to dry up.
    //
    // Without the solid-floor gate, every flat puddle was locked — including
    // the half-formed pool below a mid-air spawner — and gravity couldn't
    // pull cells downward, leaving fluid floating in place.
    const lockedCells = new Set<number>();
    for (const body of this.bodies) {
      if (!this.bodyIntersectsBounds(body, scan)) continue;
      if (!this.isThinStrip(body)) continue;
      if (!this.hasSolidFloorUnderBottomRow(body, roomData)) continue;
      for (const k of body.cells) lockedCells.add(k);
    }

    // Bottom-up with alternating row direction to avoid bias
    for (let gy = Math.min(gridH - 2, scan.maxGy); gy >= scan.minGy; gy--) {
      const ltr = (gy & 1) === 0;
      const xStart = ltr ? scan.minGx : scan.maxGx;
      const xEnd   = ltr ? scan.maxGx + 1 : scan.minGx - 1;
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

    if (moved) this.rebuildFromGrid(roomData, scan);

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
        if (!this.bodyIntersectsBounds(body, scan)) continue;
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
      if (evaporated) this.rebuildFromGrid(roomData, scan);
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
        destroyDisplayObject(d.gfx);
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
  private clampBounds(bounds: FluidCellBounds | undefined, gridW: number, gridH: number): FluidCellBounds {
    if (!bounds) return { minGx: 0, minGy: 0, maxGx: gridW - 1, maxGy: gridH - 1 };
    const minGx = Math.max(0, Math.min(gridW - 1, Math.floor(bounds.minGx)));
    const minGy = Math.max(0, Math.min(gridH - 1, Math.floor(bounds.minGy)));
    const maxGx = Math.max(0, Math.min(gridW - 1, Math.ceil(bounds.maxGx)));
    const maxGy = Math.max(0, Math.min(gridH - 1, Math.ceil(bounds.maxGy)));
    return {
      minGx: Math.min(minGx, maxGx),
      minGy: Math.min(minGy, maxGy),
      maxGx: Math.max(minGx, maxGx),
      maxGy: Math.max(minGy, maxGy),
    };
  }

  private bodyIntersectsBounds(body: FluidBody, bounds?: FluidCellBounds): boolean {
    if (!bounds) return true;
    const minX = bounds.minGx * TILE;
    const minY = bounds.minGy * TILE;
    const maxX = (bounds.maxGx + 1) * TILE;
    const maxY = (bounds.maxGy + 1) * TILE;
    return body.bounds.minX < maxX &&
      body.bounds.maxX > minX &&
      body.bounds.minY < maxY &&
      body.bounds.maxY > minY;
  }

  refreshFromGrid(roomData: number[][], bounds?: FluidCellBounds): void {
    this.rebuildFromGrid(roomData, bounds);
  }

  /**
   * Rebuild all bodies from the current collisionGrid + cachedVolumes.
   * Used after gravityTick to keep polygons in sync with cell positions.
   * Preserves wave momentum by matching old bodies to new by cell overlap.
   */
  private rebuildFromGrid(roomData: number[][], bounds?: FluidCellBounds): void {
    const gridH = roomData.length;
    if (!gridH) return;
    const gridW = roomData[0]?.length ?? 0;
    if (!gridW) return;
    const oldBodies = this.bodies;
    this.bodies = [];
    this.gridW = gridW;

    const visited = new Uint8Array(gridH * gridW);
    const scan = this.clampBounds(bounds, gridW, gridH);
    for (const { value, type: defaultType } of FLUID_CELL_TYPES) {
      for (let gy = scan.minGy; gy <= scan.maxGy; gy++) {
        for (let gx = scan.minGx; gx <= scan.maxGx; gx++) {
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
        // Wet-Conductor 영구 마크 + Arc Cycle 페이즈 보존 — 풀이 흘러
        // 위치가 바뀌어도 전도화·사이클 상태 유지.
        newBody.isElectrified = bestOld.isElectrified;
        newBody.arcPhase = bestOld.arcPhase;
        newBody.arcPhaseMs = bestOld.arcPhaseMs;
      }
    }

    // Wet-Conductor Spread 재마크 — 풀 위치 변경으로 새로 인접해진 water body
    // 도 전도화.
    this.markElectrifiedBodies();

    // Draw new bodies IMMEDIATELY so the fill is present before we destroy old
    // gfx. Otherwise we get a 1-frame empty-polygon flash (alpha blink).
    for (const newBody of this.bodies) this.drawBody(newBody);

    // Now safe to destroy old graphics
    for (const oldBody of oldBodies) {
      destroyDisplayObject(oldBody.gfx);
      if (oldBody.haloGfx) {
        destroyDisplayObject(oldBody.haloGfx);
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
