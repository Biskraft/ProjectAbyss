/**
 * TileMutator — runtime mutation of the IntGrid Collisions layer.
 *
 * Owns the dynamic state introduced by Phase 1 elemental tile additions
 * (magma · charged · oil · metal · acid). The static cell values live in the
 * scene's `roomData: number[][]` array; this system layers on top of it:
 *
 *   - frozen      water/magma → temporarily transmuted to WALL, then reverted
 *   - burning     oil cells overlaid with fire (consumes oil into AIR on expiry)
 *   - electric    short-lived overlay marking cells charged by a Thunder pulse
 *   - corrosion / vapor / melt  passive cell-cell interactions ticked here
 *
 * Element attack hooks (Fire/Ice/Thunder) call:
 *   - tryIgnite(roomData, gx, gy)
 *   - tryFreeze(roomData, gx, gy) | tryMeltIce(roomData, gx, gy)
 *   - applyThunderChain(roomData, gx, gy)
 *
 * Every scene that hosts a roomData should own a single TileMutator and call
 * `mutator.tick(roomData, dtMs)` once per frame *before* hazard resolution so
 * frozen reverts are visible to physics within the same frame.
 *
 * GDD: Documents/System/System_World_TileSystem.md §2.6-2.13, §3
 */

import {
  TILE_AIR, TILE_WALL, TILE_WATER, TILE_MAGMA, TILE_ICE, TILE_OIL, TILE_METAL, TILE_ACID,
  TILE_WOOD, TILE_GRASS, TILE_CHARGED, TILE_CYRO,
  getTile, isFlammable,
} from '../core/Physics';

/**
 * Structural interface for any entity that can participate in the cell-level
 * fire propagation (`spreadOilFire`). `BurnableProp` and `BreakableProp` both
 * satisfy this so a single chain pipeline handles both. TileMutator only
 * reads/calls the members listed here; concrete classes are free to keep
 * additional state (HP, drop tables, sway timers, etc).
 */
export interface IgnitableEntity {
  readonly gx: number;
  readonly gy: number;
  readonly cellW: number;
  readonly cellH: number;
  readonly burning: boolean;
  readonly destroyed: boolean;
  readonly spec: { readonly ignitionChance: number };
  containsCell(gx: number, gy: number): boolean;
  getCells(): Array<[number, number]>;
  ignite(): boolean;
}

/**
 * Per-tile burn duration. Long durations are intentional — the elemental
 * fire propagation is a core showcase mechanic and the player should be
 * able to watch the spread + chain reactions unfold. These are SHIPPABLE
 * values, not verification multipliers.
 */
const BURN_DURATION_BY_TILE: Record<number, number> = {
  [TILE_GRASS]: 10000,
  [TILE_OIL]: 15000,
  [TILE_WOOD]: 15000,
};

interface FrozenState {
  originalTile: number;   // 2 (WATER) or 6 (MAGMA) — restored on expiry
  remainingMs: number;
}

interface BurnState {
  remainingMs: number;
  /** True = strong burn (Fire attack seed), false = weak (oil neighbor spread). */
  strong: boolean;
}

interface ElectricState {
  remainingMs: number;
}

export class TileMutator {
  // === Tunables (GDD §3.2 매트릭스) ===
  // SHIPPABLE values — 원소 메카닉(빙결 다리·화염 연쇄·뇌 도체) 시그널은
  // 플레이어가 변화를 관전할 수 있도록 의도적으로 길게 유지된다. 검증용
  // 단축 대상 아님 (2026-05-13 confirmed).
  static readonly FREEZE_DURATION_MS = 15000;
  static readonly BURN_DURATION_MS = 9000;
  static readonly ELECTRIC_DURATION_MS = 2500;

  static readonly OIL_SPREAD_INTERVAL_MS = 600;
  static readonly OIL_SPREAD_CHANCE = 0.55;

  static readonly AUTO_INTERACT_INTERVAL_MS = 1000;
  static readonly ACID_METAL_CORRODE_CHANCE = 0.06;
  static readonly ACID_MAGMA_VAPOR_CHANCE = 0.15;
  static readonly MAGMA_ICE_MELT_CHANCE = 0.04;
  static readonly ICE_WATER_FREEZE_CHANCE = 0.04;
  // ── Matrix-39 신규 chance 상수 (Design_ChemicalReactions_FullMatrix.md) ──
  static readonly MAGMA_METAL_SMELT_CHANCE = 0.10;    // R-NEW-016 Smelt
  static readonly ACID_WATER_STEAM_CHANCE = 1.0;      // R-NEW-001 Exothermic Steam: immediate acid neutralization
  static readonly WATER_MAGMA_BURST_CHANCE = 1.0;     // R-NEW-007 Steam Burst: immediate on contact
  static readonly WATER_MAGMA_SOLIDIFY_MAX_CELLS = 5; // R-NEW-007 magma → WALL, visible chunk around contact
  static readonly OIL_ACID_COAG_CHANCE = 0.05;        // R-NEW-008 Oil Acid Sludge
  static readonly ACID_ICE_MELT_CHANCE = 0.08;        // R-NEW-009 Acid Ice Crack
  static readonly ACID_WOOD_EAT_CHANCE = 0.04;        // R-NEW-026 Acid Eats Wood
  static readonly ACID_GRASS_WITHER_CHANCE = 0.08;    // R-NEW-032 Wither
  static readonly WATER_METAL_RUST_CHANCE = 0.005;    // R-NEW-031 Slow Rust
  // 2026-05-18 cyro chemistry 강화 (약 2x). Iron 룸에서 cyro 풀 주변 freeze 가
  // 빠르게 퍼져 visible 한 시그니처 가시화. 원래 0.04~0.06 / 1초 → 평균 25~17s
  // 첫 freeze 였으나 이제 평균 ~10s, 풀 크기·인접 셀에 따라 빠르게 누적.
  static readonly CYRO_WATER_FREEZE_CHANCE = 0.10;    // R-NEW-CYRO-002 Cryo Freeze (was 0.04)
  static readonly CYRO_METAL_FREEZE_CHANCE = 0.12;    // R-NEW-CYRO-003 Frozen Steel auto (was 0.06)
  static readonly CYRO_OIL_ACID_FREEZE_CHANCE = 0.08; // R-NEW-CYRO-004 Frozen Oil/Acid auto (was 0.04)
  static readonly CYRO_WOOD_FREEZE_CHANCE = 0.06;     // R-NEW-CYRO-005 Wood Frost auto (was 0.03)
  static readonly CYRO_GRASS_WITHER_CHANCE = 0.05;    // R-NEW-CYRO-006 Grass Wither cryo (was 0.02)
  static readonly CYRO_BURST_SOLIDIFY_MAX_CELLS = 8;  // R-NEW-CYRO-001 Cryo Burst

  // === State maps (cell-keyed) ===
  private frozen = new Map<number, FrozenState>();
  private burning = new Map<number, BurnState>();
  private electric = new Map<number, ElectricState>();

  // Burnable entities (Tier B) — BurnableProp (curated) and BreakableProp
  // (procedural) both register here. Stored as a flat list since N is small
  // (<~80) and we walk all of them each propagation tick anyway.
  private burnableEntities: IgnitableEntity[] = [];

  // Accumulators for discrete tick events
  private oilSpreadAccum = 0;
  private autoInteractAccum = 0;

  /**
   * Optional callback the scene registers to receive cell-level steam events
   * (magma-melts-ice, acid+magma vapor, fire-on-water by attack handlers, etc).
   * Scene maps (gx, gy) → pixel position and spawns SteamPuffManager bursts.
   */
  onSteamEvent: ((gx: number, gy: number) => void) | null = null;

  /**
   * Optional callback fired when a cell mutation visibly changes the wall
   * layer (ice→water, wood/grass burnout→air, metal corrosion→air). Scene
   * sets a dirty flag and calls rerenderTilemap once per frame to coalesce
   * multiple mutations. Magma-frozen / passive freezing don't fire — the
   * frozen overlay covers the cell visually.
   */
  /**
   * `originalTile` is the IntGrid value that occupied the cell BEFORE the
   * mutation (e.g., TILE_OIL on burnout, TILE_ICE on melt, TILE_METAL on
   * acid corrosion). Scenes use it to decide whether the cell needs a
   * paint-over mask: fluid-source tiles (OIL/WATER/ACID/MAGMA) are already
   * filtered out of the static wall sprite layer by isFluidHiddenTile, so
   * scenes can skip mask painting for those.
   */
  onWallTileChanged: ((gx: number, gy: number, originalTile: number) => void) | null = null;

  /**
   * R-NEW-005 Electric Insulation: Thunder chain BFS 가 *oil 셀 경계에 도달*
   * 했을 때 발화 (oil 자체는 non-conductor 라 chain 에 안 들어가지만, *경계
   * 시각 신호* 를 위해 scene 이 spark VFX 출력). 인자는 oil 셀 좌표.
   */
  onElectricInsulated: ((gx: number, gy: number) => void) | null = null;

  /**
   * R-NEW-010 Conductor Contamination: Thunder chain 이 *acid 셀에 진입*
   * 할 때마다 발화. scene 이 *녹색 tinted electric arc* VFX 로 시각화.
   */
  onElectricAcidPulse: ((gx: number, gy: number) => void) | null = null;

  /**
   * R-NEW-001 Exothermic Steam — acid + water 인접 시 acid 셀 → AIR 변환 후
   * scene 이 다음 효과를 처리:
   *  - 강한 SteamPuff 출력 (이미 onSteamEvent 가 1회 발화)
   *  - 1-tile radius 인접 entity (player + enemy) → maxHp × 5% damage + Burn 5s
   *  - 1-tile radius 인접 컨테이너 → vy -200 (위로 발사, 발열 상승력)
   */
  onAcidSteamBurst: ((gx: number, gy: number) => void) | null = null;

  /**
   * R-NEW-007 Steam Burst — water + magma 접촉 전용 강한 증기 반응.
   * Generic onSteamEvent 보다 큰 puff/shake 를 scene 쪽에서 출력한다.
   */
  onSteamBurst: ((gx: number, gy: number) => void) | null = null;

  /** Pack (gx,gy) → single number key. Assumes maps ≤ 4096 columns. */
  private k(gx: number, gy: number): number {
    return gy * 4096 + gx;
  }
  private unpack(key: number): { gx: number; gy: number } {
    return { gx: key % 4096, gy: Math.floor(key / 4096) };
  }

  /** Re-initialise for a new room. Clears all transient state. */
  reset(): void {
    this.frozen.clear();
    this.burning.clear();
    this.electric.clear();
    this.burnableEntities.length = 0;
    this.oilSpreadAccum = 0;
    this.autoInteractAccum = 0;
  }

  // ============================================================
  // Burnable entity registry (Tier B)
  // ============================================================

  /** Register an ignitable entity so fire spread can ignite it (and propagate from it). */
  registerBurnable(prop: IgnitableEntity): void {
    if (this.burnableEntities.indexOf(prop) >= 0) return;
    this.burnableEntities.push(prop);
  }

  /** Remove a destroyed/teleported entity from spread consideration. */
  unregisterBurnable(prop: IgnitableEntity): void {
    const i = this.burnableEntities.indexOf(prop);
    if (i >= 0) this.burnableEntities.splice(i, 1);
  }

  /** Iterate live ignitable entities (for scene update / render walkthrough). */
  forEachBurnable(cb: (prop: IgnitableEntity) => void): void {
    for (const p of this.burnableEntities) cb(p);
  }

  /** Locate an ignitable entity occupying a cell, or null. */
  private burnableAt(gx: number, gy: number): IgnitableEntity | null {
    for (const p of this.burnableEntities) {
      if (p.destroyed) continue;
      if (p.containsCell(gx, gy)) return p;
    }
    return null;
  }

  // ============================================================
  // Mutation API — called by element attack hooks / interactions
  // ============================================================

  /** Freeze water/magma/oil/acid → temporary WALL. Refreshes timer if already frozen.
   *  Per-fluid frozen duration:
   *    water = 15000 ms (full FREEZE_DURATION_MS)
   *    magma = 15000 ms
   *    oil   =  8000 ms (R-NEW-004 — frozen oil unstable)
   *    acid  =  5000 ms (R-NEW-006 — frozen acid most unstable)
   *  Renderer reads originalTile from FrozenState to tint the temp WALL.
   */
  tryFreeze(roomData: number[][], gx: number, gy: number): boolean {
    const tile = getTile(roomData, gx, gy);
    if (tile !== TILE_WATER && tile !== TILE_MAGMA &&
        tile !== TILE_OIL   && tile !== TILE_ACID  &&
        tile !== TILE_WOOD  && tile !== TILE_GRASS) return false;
    if (!roomData[gy]) return false;
    const duration =
      tile === TILE_OIL   ?  8000 :
      tile === TILE_ACID  ?  5000 :
      tile === TILE_WOOD  ? 10000 :   // R-NEW-044 Wood Frost: 10s 발판
      tile === TILE_GRASS ?  5000 :   // R-NEW-045 Field Frost: 5s
                            TileMutator.FREEZE_DURATION_MS;
    const key = this.k(gx, gy);
    const existing = this.frozen.get(key);
    if (existing) {
      existing.remainingMs = duration;
      return true;
    }
    this.frozen.set(key, {
      originalTile: tile,
      remainingMs: duration,
    });
    roomData[gy][gx] = TILE_WALL;
    return true;
  }

  /** Melt ice → water (permanent terrain change). */
  tryMeltIce(roomData: number[][], gx: number, gy: number): boolean {
    if (getTile(roomData, gx, gy) !== TILE_ICE) return false;
    if (!roomData[gy]) return false;
    roomData[gy][gx] = TILE_WATER;
    this.onWallTileChanged?.(gx, gy, TILE_ICE);
    return true;
  }

  /**
   * Ignite a flammable cell (oil · wood · grass) OR an IgnitableEntity occupying
   * that cell. Returns true if anything caught fire.
   *
   * 환경 검사 (Matrix-39 신규):
   *  - R-NEW-035 Frost Preservation: 셀 자체가 frozen 상태면 점화 불가
   *  - R-NEW-023 Damp Wood / Frozen Field: 인접 water 가 있으면 wood/grass/oil
   *    점화 불가 (R-NEW-042 도 frozen 인접 grass 동일 패턴 — 단순화 위해 합침)
   *  - R-NEW-024 Oil-Soaked Wood / R-NEW-027 Oil-Soaked Grass: oil 인접 시
   *    burn duration 1.67× (15s→25s, 10s→17s)
   */
  tryIgnite(roomData: number[][], gx: number, gy: number): boolean {
    // R-NEW-035: frozen cell 자체는 점화 안 됨
    if (this.frozen.has(this.k(gx, gy))) return false;
    const tile = getTile(roomData, gx, gy);
    if (isFlammable(tile)) {
      // R-NEW-023 Damp Wood: water 인접 시 wood/grass/oil 점화 면역
      if (this.hasNeighbour(roomData, gx, gy, TILE_WATER)) return false;
      let dur = BURN_DURATION_BY_TILE[tile] ?? TileMutator.BURN_DURATION_MS;
      // R-NEW-024 / R-NEW-027: oil 인접 wood/grass 의 burn duration 증가
      if ((tile === TILE_WOOD || tile === TILE_GRASS) &&
          this.hasNeighbour(roomData, gx, gy, TILE_OIL)) {
        dur = Math.floor(dur * 1.67);
      }
      this.burning.set(this.k(gx, gy), { remainingMs: dur, strong: true });
      return true;
    }
    // Fall through to entity ignition (Tier B)
    const prop = this.burnableAt(gx, gy);
    if (prop) return prop.ignite();
    return false;
  }

  /** 인접 4-neighbour 검사 — 신규 환경 인지 헬퍼. */
  private hasNeighbour(roomData: number[][], gx: number, gy: number, want: number): boolean {
    return (
      getTile(roomData, gx + 1, gy) === want ||
      getTile(roomData, gx - 1, gy) === want ||
      getTile(roomData, gx, gy + 1) === want ||
      getTile(roomData, gx, gy - 1) === want
    );
  }

  /**
   * R-NEW-019 Heat Metal: 셀 값을 바꾸지 않고 *fire overlay 만* 부여.
   * 기존 tryIgnite 는 flammable cell 만 점화 + 만료 시 AIR 로 변환하는데,
   * Heat Metal 은 cell 이 METAL 로 유지되어야 하므로 별도 진입점. burning
   * Map 에 등록되며 만료 시 tickBurning 의 분기 (TILE_OIL/WOOD/GRASS 만 AIR 화)
   * 에서 자동 제외 — METAL 셀은 burning 만료 후에도 METAL 유지.
   */
  tryIgniteOverlayOnly(gx: number, gy: number, durationMs: number): void {
    this.burning.set(this.k(gx, gy), { remainingMs: durationMs, strong: true });
  }

  /**
   * R-NEW-021 Frozen Steel: metal cell freeze. originalTile=TILE_METAL 로 저장
   * 해 isFrozenMetal 이 Brittle 검사 가능. 만료 시 (15s) METAL 로 정상 복원.
   */
  tryFreezeMetal(roomData: number[][], gx: number, gy: number): boolean {
    if (getTile(roomData, gx, gy) !== TILE_METAL) return false;
    if (!roomData[gy]) return false;
    const key = this.k(gx, gy);
    const existing = this.frozen.get(key);
    if (existing) {
      existing.remainingMs = TileMutator.FREEZE_DURATION_MS;
      return true;
    }
    this.frozen.set(key, {
      originalTile: TILE_METAL,
      remainingMs: TileMutator.FREEZE_DURATION_MS,
    });
    roomData[gy][gx] = TILE_WALL;
    return true;
  }

  /** True if (gx, gy) is frozen AND originalTile is METAL. Used by Brittle check. */
  isFrozenMetal(gx: number, gy: number): boolean {
    const f = this.frozen.get(this.k(gx, gy));
    return !!f && f.originalTile === TILE_METAL;
  }

  /**
   * Force-clear a frozen state without restoring originalTile. Used by
   * R-NEW-017 Brittle Metal — Physical attack shatters the frozen WALL into
   * AIR, bypassing the normal 15s revert path.
   */
  clearFrozen(gx: number, gy: number): void {
    this.frozen.delete(this.k(gx, gy));
  }

  /**
   * R-NEW-046 Wooden Static / R-NEW-047 Grass Static: 임의 셀에 electric overlay
   * 부여 (conductor 검사 우회). 만료 시점에 tick() 의 electric countdown 분기에서
   * wood/grass 면 R-NEW-034 Static Ignition (40% chance).
   */
  giveElectricOverlay(gx: number, gy: number, durationMs: number): void {
    this.electric.set(this.k(gx, gy), { remainingMs: durationMs });
  }

  /**
   * Apply a Thunder pulse to (gx, gy) — flood-fills connected conductor cells
   * (water · metal · acid) and tags them as electric for ELECTRIC_DURATION_MS.
   *
   * 확장 (Matrix-39):
   *  - R-NEW-029 Plasma Channel: seed 가 magma 면 *짧은 magma chain* 허용
   *    (최대 3 tile, 인접 conductor 로 전이 시 chain 길이 무한 — 즉 magma
   *    경계가 conductor 풀로 이어지면 plasma 가 도화선처럼 점화 후 풀 전체 점등).
   *  - R-NEW-043 Frozen Conductor: seed/통과 셀 이 *frozen* 이면 chain 길이의
   *    *절반만 lit* (랜덤 카운트 ↓).
   *  - R-NEW-005 Oil Insulation: BFS 가 oil 셀 인접 시 onElectricInsulated 콜백.
   *  - R-NEW-010 Acid Pulse Tint: chain 안 acid 셀 진입 시 onElectricAcidPulse.
   *
   * Returns the number of cells lit.
   */
  applyThunderChain(roomData: number[][], gx: number, gy: number): number {
    const seed = getTile(roomData, gx, gy);
    const isMagmaSeed = seed === TILE_MAGMA;
    if (
      seed !== TILE_WATER && seed !== TILE_METAL && seed !== TILE_ACID &&
      seed !== TILE_CHARGED && !isMagmaSeed
    ) return 0;
    const visited = new Set<number>();
    const queue: Array<[number, number]> = [[gx, gy]];
    let count = 0;
    let magmaChain = 0;
    while (queue.length) {
      const next = queue.shift()!;
      const cx = next[0], cy = next[1];
      const key = this.k(cx, cy);
      if (visited.has(key)) continue;
      visited.add(key);
      const t = getTile(roomData, cx, cy);
      const isCharged = (t === TILE_CHARGED);
      const isStandardConductor = (
        t === TILE_WATER || t === TILE_METAL || t === TILE_ACID || isCharged
      );
      const isMagma = (t === TILE_MAGMA);
      if (!isStandardConductor && !isMagma) {
        // R-NEW-005: oil 경계 spark
        if (t === TILE_OIL) this.onElectricInsulated?.(cx, cy);
        continue;
      }
      // R-NEW-029 Plasma Channel chain length cap (magma 만)
      if (isMagma) {
        if (magmaChain >= 3) continue;
        magmaChain++;
      }
      // R-NEW-043 Frozen Conductor: frozen 이면 50% 만 lit
      if (this.frozen.has(key) && Math.random() < 0.5) {
        // skip lighting but continue chain
      } else {
        // R-NEW-028 Charge Multiplier — charged 풀 안에서는 electric overlay
        // duration 2배. DOT 가 더 오래 적용된다.
        const duration = isCharged
          ? TileMutator.ELECTRIC_DURATION_MS * 2
          : TileMutator.ELECTRIC_DURATION_MS;
        this.electric.set(key, { remainingMs: duration });
        count++;
      }
      // R-NEW-010 Acid pulse tint
      if (t === TILE_ACID) this.onElectricAcidPulse?.(cx, cy);
      queue.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
    return count;
  }

  // ============================================================
  // Tick — call once per frame from the scene
  // ============================================================

  /** Advance all dynamic state by dtMs. Mutates roomData on expiry/spread/corrosion. */
  tick(roomData: number[][], dtMs: number): void {
    // 1) Frozen countdown → revert
    for (const [key, state] of this.frozen) {
      state.remainingMs -= dtMs;
      if (state.remainingMs <= 0) {
        const { gx, gy } = this.unpack(key);
        if (roomData[gy] && roomData[gy][gx] === TILE_WALL) {
          roomData[gy][gx] = state.originalTile;
        }
        this.frozen.delete(key);
      }
    }

    // 2) Burning countdown → consume flammable tile to AIR on expiry.
    //    All flammable tile types (oil · wood · grass) leave AIR after burnout.
    for (const [key, state] of this.burning) {
      state.remainingMs -= dtMs;
      if (state.remainingMs <= 0) {
        const { gx, gy } = this.unpack(key);
        if (roomData[gy]) {
          const t = roomData[gy][gx];
          if (t === TILE_OIL || t === TILE_WOOD || t === TILE_GRASS) {
            roomData[gy][gx] = TILE_AIR;
            // Wood/Grass have static tile sprites — wall layer must refresh.
            // Oil cells were never baked into the wall sprite (isFluidHiddenTile
            // filtered them out at bake time), so the scene uses `originalTile`
            // to decide whether to paint a burnout mask.
            this.onWallTileChanged?.(gx, gy, t);
          }
        }
        this.burning.delete(key);
      }
    }

    // 3) Electric countdown (short overlay)
    //    R-NEW-034 Static Ignition: electric 만료 시점에 wood/grass cell 이면
    //    40% 확률로 자연 점화 — 정전기 누적이 가연성 셀에 발화.
    for (const [key, state] of this.electric) {
      state.remainingMs -= dtMs;
      if (state.remainingMs <= 0) {
        const { gx, gy } = this.unpack(key);
        const cell = getTile(roomData, gx, gy);
        if ((cell === TILE_WOOD || cell === TILE_GRASS) && Math.random() < 0.40) {
          this.tryIgnite(roomData, gx, gy);
        }
        this.electric.delete(key);
      }
    }

    // 4) Oil fire spread
    this.oilSpreadAccum += dtMs;
    while (this.oilSpreadAccum >= TileMutator.OIL_SPREAD_INTERVAL_MS) {
      this.oilSpreadAccum -= TileMutator.OIL_SPREAD_INTERVAL_MS;
      this.spreadOilFire(roomData);
    }

    // 5) Passive cell-cell interactions (corrosion / vapor / melt / freeze)
    this.autoInteractAccum += dtMs;
    while (this.autoInteractAccum >= TileMutator.AUTO_INTERACT_INTERVAL_MS) {
      this.autoInteractAccum -= TileMutator.AUTO_INTERACT_INTERVAL_MS;
      this.tickPassiveInteractions(roomData);
    }
  }

  /**
   * Spread fire across any flammable neighbour:
   *   - tile (oil/wood/grass) → tile (existing chance table)
   *   - tile → entity (BurnableProp.ignitionChance from catalog)
   *   - entity → tile (entity radiates fire to adjacent flammable cells, 0.50)
   *   - entity → entity (entity adjacency, 0.40)
   * Grass has higher spread chance (dry foliage), wood lower (dense fuel),
   * oil baseline. Entity chances come from each BurnableSpec.
   */
  private spreadOilFire(roomData: number[][]): void {
    const newBurns: Array<[number, number]> = [];
    const newPropIgnites: IgnitableEntity[] = [];

    const tryQueueTile = (nx: number, ny: number, chance: number) => {
      const nt = getTile(roomData, nx, ny);
      if (!isFlammable(nt)) return;
      const nk = this.k(nx, ny);
      if (this.burning.has(nk)) return;
      if (Math.random() < chance) newBurns.push([nx, ny]);
    };
    const tryQueueProp = (nx: number, ny: number) => {
      const prop = this.burnableAt(nx, ny);
      if (!prop || prop.burning || prop.destroyed) return;
      if (Math.random() < prop.spec.ignitionChance) {
        if (newPropIgnites.indexOf(prop) < 0) newPropIgnites.push(prop);
      }
    };
    const tileChance = (t: number): number =>
      t === TILE_GRASS ? 0.85 :
      t === TILE_WOOD ? 0.30 :
      TileMutator.OIL_SPREAD_CHANCE;

    // 1) Spread from burning tile cells
    for (const key of this.burning.keys()) {
      const { gx, gy } = this.unpack(key);
      const ns: Array<[number, number]> = [
        [gx + 1, gy], [gx - 1, gy], [gx, gy + 1], [gx, gy - 1],
      ];
      for (const n of ns) {
        const nx = n[0], ny = n[1];
        const nt = getTile(roomData, nx, ny);
        if (isFlammable(nt)) tryQueueTile(nx, ny, tileChance(nt));
        tryQueueProp(nx, ny);
      }
    }

    // 1b) Magma cells act as permanent fire sources — every magma tile
    //     radiates to 4-neighbour flammable cells and BurnableProps.
    //     Wood adjacent to magma ignites *instantly* on contact (chance 1.0)
    //     — lava is hot enough; the slow 30% tile-to-tile spread chance is
    //     for wood→wood propagation, not for a magma fire source. Matrix
    //     R-005 (Design_ChemicalReactions_FullMatrix.md §3) marks this ✅.
    const rows = roomData.length;
    const cols = roomData[0]?.length ?? 0;
    for (let gy = 0; gy < rows; gy++) {
      const row = roomData[gy];
      if (!row) continue;
      for (let gx = 0; gx < cols; gx++) {
        if (row[gx] !== TILE_MAGMA) continue;
        const ns: Array<[number, number]> = [
          [gx + 1, gy], [gx - 1, gy], [gx, gy + 1], [gx, gy - 1],
        ];
        for (const n of ns) {
          const nx = n[0], ny = n[1];
          const nt = getTile(roomData, nx, ny);
          if (isFlammable(nt)) {
            const chance = nt === TILE_WOOD ? 1.0 : tileChance(nt);
            tryQueueTile(nx, ny, chance);
          }
          tryQueueProp(nx, ny);
        }
      }
    }

    // 2) Spread from burning entities (entity → tile + entity → entity)
    for (const prop of this.burnableEntities) {
      if (!prop.burning || prop.destroyed) continue;
      const cells = prop.getCells();
      for (const cell of cells) {
        const cgx = cell[0], cgy = cell[1];
        const ns: Array<[number, number]> = [
          [cgx + 1, cgy], [cgx - 1, cgy], [cgx, cgy + 1], [cgx, cgy - 1],
        ];
        for (const n of ns) {
          const nx = n[0], ny = n[1];
          // Skip self-cells (multi-tile prop)
          if (prop.containsCell(nx, ny)) continue;
          tryQueueTile(nx, ny, 0.50); // entity radiates strong fire
          // entity → other entity (chance 0.40 modulated by target spec)
          const other = this.burnableAt(nx, ny);
          if (other && !other.burning && !other.destroyed) {
            if (Math.random() < 0.40 * other.spec.ignitionChance) {
              if (newPropIgnites.indexOf(other) < 0) newPropIgnites.push(other);
            }
          }
        }
      }
    }

    // 3) Apply
    for (const b of newBurns) {
      const t = getTile(roomData, b[0], b[1]);
      const dur = BURN_DURATION_BY_TILE[t] ?? TileMutator.BURN_DURATION_MS;
      this.burning.set(this.k(b[0], b[1]), { remainingMs: dur, strong: false });
    }
    for (const p of newPropIgnites) p.ignite();
  }

  private tickPassiveInteractions(roomData: number[][]): void {
    const rows = roomData.length;
    if (!rows) return;
    const cols = roomData[0]?.length ?? 0;
    if (!cols) return;
    for (let gy = 0; gy < rows; gy++) {
      const row = roomData[gy];
      for (let gx = 0; gx < cols; gx++) {
        const t = row[gx];

        // Magma melts adjacent ice → water (emit steam at the mutated cell)
        if (t === TILE_MAGMA) {
          this.maybeMutateNeighbourWithSteam(roomData, gx, gy, TILE_ICE, TILE_WATER, TileMutator.MAGMA_ICE_MELT_CHANCE);
          // R-NEW-016 Smelt: magma + metal → AIR (Forge 시그니처)
          this.maybeMutateNeighbour(roomData, gx, gy, TILE_METAL, TILE_AIR, TileMutator.MAGMA_METAL_SMELT_CHANCE);
        }
        // Ice freezes adjacent water (slow, natural — not the 3s temp freeze)
        else if (t === TILE_ICE) {
          this.maybeFreezeNeighbour(roomData, gx, gy, TileMutator.ICE_WATER_FREEZE_CHANCE);
        }
        // Acid corrodes adjacent metal → air ; acid+magma adjacency → acid vapor
        else if (t === TILE_ACID) {
          // R-NEW-001 Exothermic Steam: water 인접 시 acid 셀 → AIR + 강한
          // 증기 + 1-tile radius 데미지 + 컨테이너 위로 상승 (scene 콜백 위임)
          if (this.hasNeighbour(roomData, gx, gy, TILE_WATER) &&
              Math.random() < TileMutator.ACID_WATER_STEAM_CHANCE) {
            row[gx] = TILE_AIR;
            this.onSteamEvent?.(gx, gy);
            this.onAcidSteamBurst?.(gx, gy);
            this.onWallTileChanged?.(gx, gy, TILE_ACID);
            continue;
          }
          this.maybeMutateNeighbour(roomData, gx, gy, TILE_METAL, TILE_AIR, TileMutator.ACID_METAL_CORRODE_CHANCE);
          if (this.neighbourMatches(roomData, gx, gy, TILE_MAGMA) &&
              Math.random() < TileMutator.ACID_MAGMA_VAPOR_CHANCE) {
            row[gx] = TILE_AIR;
            this.onSteamEvent?.(gx, gy);
            this.onWallTileChanged?.(gx, gy, TILE_ACID);
            continue;
          }
          // R-NEW-009 Acid Ice Crack: 인접 ice → water (산이 얼음 녹임)
          this.maybeMutateNeighbour(roomData, gx, gy, TILE_ICE, TILE_WATER, TileMutator.ACID_ICE_MELT_CHANCE);
          // R-NEW-026 Acid Eats Wood: 인접 wood → AIR
          this.maybeMutateNeighbour(roomData, gx, gy, TILE_WOOD, TILE_AIR, TileMutator.ACID_WOOD_EAT_CHANCE);
          // R-NEW-032 Wither: 인접 grass → AIR
          this.maybeMutateNeighbour(roomData, gx, gy, TILE_GRASS, TILE_AIR, TileMutator.ACID_GRASS_WITHER_CHANCE);
        }
        // R-NEW-007 Steam Burst: water 가 magma 인접 시 자기 → AIR + steam + 주변 magma → WALL
        else if (t === TILE_WATER) {
          if (this.neighbourMatches(roomData, gx, gy, TILE_MAGMA) &&
              Math.random() < TileMutator.WATER_MAGMA_BURST_CHANCE) {
            row[gx] = TILE_AIR;
            this.onSteamEvent?.(gx, gy);
            this.onSteamBurst?.(gx, gy);
            this.onWallTileChanged?.(gx, gy, TILE_WATER);
            const magmaCells: Array<[number, number]> = [
              [gx + 1, gy], [gx - 1, gy], [gx, gy + 1], [gx, gy - 1],
              [gx + 1, gy + 1], [gx - 1, gy + 1], [gx + 1, gy - 1], [gx - 1, gy - 1],
            ];
            let solidified = 0;
            for (const [mx, my] of magmaCells) {
              if (solidified >= TileMutator.WATER_MAGMA_SOLIDIFY_MAX_CELLS) break;
              if (getTile(roomData, mx, my) === TILE_MAGMA && roomData[my]) {
                roomData[my][mx] = TILE_WALL;
                this.onWallTileChanged?.(mx, my, TILE_MAGMA);
                solidified++;
              }
            }
            continue;
          }
          // R-NEW-031 Slow Rust: 인접 metal 매우 느리게 부식
          this.maybeMutateNeighbour(roomData, gx, gy, TILE_METAL, TILE_AIR, TileMutator.WATER_METAL_RUST_CHANCE);
          // R-NEW-040 Cold Front: water 가 ice 인접 시 자연 freeze (1%/1s, R-002 의 약한 버전)
          if (this.hasNeighbour(roomData, gx, gy, TILE_ICE) && Math.random() < 0.01) {
            this.tryFreeze(roomData, gx, gy);
          }
          // R-NEW-038 Hydration: water 가 grass 인접 시 빈 AIR 셀로 grass 확장 (Phase 4 시드)
          if (this.hasNeighbour(roomData, gx, gy, TILE_GRASS) && Math.random() < 0.005) {
            const airNs: Array<[number, number]> = [[gx + 1, gy], [gx - 1, gy], [gx, gy - 1]];
            for (const a of airNs) {
              if (getTile(roomData, a[0], a[1]) === TILE_AIR && roomData[a[1]]) {
                roomData[a[1]][a[0]] = TILE_GRASS;
                this.onWallTileChanged?.(a[0], a[1], TILE_AIR);
                break;
              }
            }
          }
        }
        // R-NEW-008 Oil Acid Coagulation: oil 이 acid 인접 시 자기 → WALL (sludge)
        // R-NEW-002 Oil Float: 바로 위 water 면 위치 교환 (oil 이 water 위로 부상)
        else if (t === TILE_CYRO) {
          if (this.neighbourMatches(roomData, gx, gy, TILE_MAGMA)) {
            row[gx] = TILE_AIR;
            this.onSteamEvent?.(gx, gy);
            this.onSteamBurst?.(gx, gy);
            this.onWallTileChanged?.(gx, gy, TILE_CYRO);
            const magmaCells: Array<[number, number]> = [
              [gx + 1, gy], [gx - 1, gy], [gx, gy + 1], [gx, gy - 1],
              [gx + 1, gy + 1], [gx - 1, gy + 1], [gx + 1, gy - 1], [gx - 1, gy - 1],
              [gx + 2, gy], [gx - 2, gy], [gx, gy + 2], [gx, gy - 2],
            ];
            let solidified = 0;
            for (const [mx, my] of magmaCells) {
              if (solidified >= TileMutator.CYRO_BURST_SOLIDIFY_MAX_CELLS) break;
              if (getTile(roomData, mx, my) === TILE_MAGMA && roomData[my]) {
                roomData[my][mx] = TILE_WALL;
                this.onWallTileChanged?.(mx, my, TILE_MAGMA);
                solidified++;
              }
            }
            continue;
          }
          // R-NEW-CYRO-002 v2 (2026-05-18): cyro + water 즉시 *영구* TILE_ICE 변환.
          // 이전 temp-freeze (15s WALL revert) 는 "얼음이 안 생긴다" 인식 — water+magma
          // burst (R-NEW-007) 와 대칭으로 instant permanent terrain change.
          // chance 1.0 + steam puff (얼음 격렬한 hiss 시각).
          this.maybeMutateNeighbourWithSteam(roomData, gx, gy, TILE_WATER, TILE_ICE, 1.0);
          this.maybeFreezeMetalNeighbour(roomData, gx, gy, TileMutator.CYRO_METAL_FREEZE_CHANCE);
          this.maybeFreezeNeighbourByTile(roomData, gx, gy, TILE_OIL, TileMutator.CYRO_OIL_ACID_FREEZE_CHANCE);
          this.maybeFreezeNeighbourByTile(roomData, gx, gy, TILE_ACID, TileMutator.CYRO_OIL_ACID_FREEZE_CHANCE);
          this.maybeFreezeNeighbourByTile(roomData, gx, gy, TILE_WOOD, TileMutator.CYRO_WOOD_FREEZE_CHANCE);
          this.maybeMutateNeighbour(roomData, gx, gy, TILE_GRASS, TILE_AIR, TileMutator.CYRO_GRASS_WITHER_CHANCE);
        }
        else if (t === TILE_OIL) {
          const coagulated =
            this.maybeMutateSelfIfNeighbour(roomData, gx, gy, TILE_ACID, TILE_WALL, TileMutator.OIL_ACID_COAG_CHANCE);
          if (!coagulated && gy > 0 &&
              getTile(roomData, gx, gy - 1) === TILE_WATER &&
              Math.random() < 0.08) {
            // R-NEW-002 Oil Float — oil rises through water. R-NEW-013
            // (Surface Ignition) 은 swap 결과 자동 emergent.
            roomData[gy - 1][gx] = TILE_OIL;
            roomData[gy][gx] = TILE_WATER;
            this.onWallTileChanged?.(gx, gy, TILE_OIL);
            this.onWallTileChanged?.(gx, gy - 1, TILE_WATER);
          }
        }
      }
    }
  }

  private maybeMutateNeighbour(
    roomData: number[][], gx: number, gy: number, want: number, to: number, chance: number,
  ): void {
    const ns: Array<[number, number]> = [[gx + 1, gy], [gx - 1, gy], [gx, gy + 1], [gx, gy - 1]];
    for (const n of ns) {
      const nx = n[0], ny = n[1];
      if (getTile(roomData, nx, ny) === want && roomData[ny] && Math.random() < chance) {
        roomData[ny][nx] = to;
        this.onWallTileChanged?.(nx, ny, want);
      }
    }
  }

  /** Same as maybeMutateNeighbour but emits a steam event at the mutated cell. */
  private maybeMutateNeighbourWithSteam(
    roomData: number[][], gx: number, gy: number, want: number, to: number, chance: number,
  ): void {
    const ns: Array<[number, number]> = [[gx + 1, gy], [gx - 1, gy], [gx, gy + 1], [gx, gy - 1]];
    for (const n of ns) {
      const nx = n[0], ny = n[1];
      if (getTile(roomData, nx, ny) === want && roomData[ny] && Math.random() < chance) {
        roomData[ny][nx] = to;
        this.onSteamEvent?.(nx, ny);
        this.onWallTileChanged?.(nx, ny, want);
      }
    }
  }

  /**
   * Variant of maybeMutateNeighbour that converts SELF (gx, gy) instead of the
   * neighbour. Used by R-NEW-001 (water + acid → acid becomes water), R-NEW-008
   * (oil + acid → oil becomes sludge WALL), and similar self-target mutations.
   * Returns true on success (stops checking other neighbours).
   */
  private maybeMutateSelfIfNeighbour(
    roomData: number[][], gx: number, gy: number, neighborWant: number, selfTo: number, chance: number,
  ): boolean {
    const ns: Array<[number, number]> = [[gx + 1, gy], [gx - 1, gy], [gx, gy + 1], [gx, gy - 1]];
    for (const n of ns) {
      const nx = n[0], ny = n[1];
      if (getTile(roomData, nx, ny) === neighborWant && Math.random() < chance) {
        const originalTile = roomData[gy][gx];
        roomData[gy][gx] = selfTo;
        this.onWallTileChanged?.(gx, gy, originalTile);
        return true;
      }
    }
    return false;
  }

  private maybeFreezeNeighbour(roomData: number[][], gx: number, gy: number, chance: number): void {
    const ns: Array<[number, number]> = [[gx + 1, gy], [gx - 1, gy], [gx, gy + 1], [gx, gy - 1]];
    for (const n of ns) {
      const nx = n[0], ny = n[1];
      if (getTile(roomData, nx, ny) === TILE_WATER && Math.random() < chance) {
        this.tryFreeze(roomData, nx, ny);
      }
    }
  }

  private maybeFreezeNeighbourByTile(
    roomData: number[][], gx: number, gy: number, want: number, chance: number,
  ): void {
    const ns: Array<[number, number]> = [[gx + 1, gy], [gx - 1, gy], [gx, gy + 1], [gx, gy - 1]];
    for (const n of ns) {
      const nx = n[0], ny = n[1];
      if (getTile(roomData, nx, ny) === want && Math.random() < chance) {
        this.tryFreeze(roomData, nx, ny);
      }
    }
  }

  private maybeFreezeMetalNeighbour(roomData: number[][], gx: number, gy: number, chance: number): void {
    const ns: Array<[number, number]> = [[gx + 1, gy], [gx - 1, gy], [gx, gy + 1], [gx, gy - 1]];
    for (const n of ns) {
      const nx = n[0], ny = n[1];
      if (getTile(roomData, nx, ny) === TILE_METAL && Math.random() < chance) {
        this.tryFreezeMetal(roomData, nx, ny);
      }
    }
  }

  private neighbourMatches(roomData: number[][], gx: number, gy: number, want: number): boolean {
    return (
      getTile(roomData, gx + 1, gy) === want ||
      getTile(roomData, gx - 1, gy) === want ||
      getTile(roomData, gx, gy + 1) === want ||
      getTile(roomData, gx, gy - 1) === want
    );
  }

  // ============================================================
  // Query API
  // ============================================================

  isOnFire(gx: number, gy: number): boolean {
    return this.burning.has(this.k(gx, gy));
  }
  isElectric(gx: number, gy: number): boolean {
    return this.electric.has(this.k(gx, gy));
  }

  /**
   * Transfer the electric overlay from one cell to another. Called by
   * FluidSystem.gravityTick when a water cell moves so the thunder pulse
   * state follows the cell instead of staying at the old position (which
   * becomes AIR after the move).
   */
  transferElectricOverlay(fromGx: number, fromGy: number, toGx: number, toGy: number): void {
    const fromKey = this.k(fromGx, fromGy);
    const state = this.electric.get(fromKey);
    if (!state) return;
    this.electric.delete(fromKey);
    this.electric.set(this.k(toGx, toGy), state);
  }
  isFrozen(gx: number, gy: number): boolean {
    return this.frozen.has(this.k(gx, gy));
  }

  /** True if any cell overlapped by AABB has the given overlay. */
  aabbHasOverlay(
    x: number, y: number, w: number, h: number,
    type: 'fire' | 'electric' | 'frozen',
  ): boolean {
    const TILE = 16;
    const l = Math.floor(x / TILE);
    const r = Math.floor((x + w - 1) / TILE);
    const t = Math.floor(y / TILE);
    const b = Math.floor((y + h - 1) / TILE);
    const map = type === 'fire' ? this.burning : type === 'electric' ? this.electric : this.frozen;
    for (let gy = t; gy <= b; gy++) {
      for (let gx = l; gx <= r; gx++) {
        if (map.has(this.k(gx, gy))) return true;
      }
    }
    return false;
  }

  /**
   * True if (x, y, w, h) AABB overlaps any cell currently occupied by a
   * burning BurnableProp (Tier B). Used by TileHazards to dispatch fire DOT
   * for entities standing next to / inside a burning prop (the prop itself
   * is also solid for collision so adjacency is the common case).
   */
  aabbNearBurningProp(x: number, y: number, w: number, h: number): boolean {
    const TILE = 16;
    const l = Math.floor(x / TILE);
    const r = Math.floor((x + w - 1) / TILE);
    const t = Math.floor(y / TILE);
    const b = Math.floor((y + h - 1) / TILE);
    for (const p of this.burnableEntities) {
      if (p.destroyed || !p.burning) continue;
      // Inflate prop footprint by 1 cell on each side to catch adjacency.
      const pl = p.gx - 1;
      const pr = p.gx + p.cellW;
      const pt = p.gy - 1;
      const pb = p.gy + p.cellH;
      if (r < pl || l > pr || b < pt || t > pb) continue;
      return true;
    }
    return false;
  }

  // ============================================================
  // Iteration (for renderer overlays)
  // ============================================================

  forEachBurning(cb: (gx: number, gy: number, strong: boolean, remainingMs: number) => void): void {
    for (const [key, state] of this.burning) {
      const { gx, gy } = this.unpack(key);
      cb(gx, gy, state.strong, state.remainingMs);
    }
  }
  forEachElectric(cb: (gx: number, gy: number, remainingMs: number) => void): void {
    for (const [key, state] of this.electric) {
      const { gx, gy } = this.unpack(key);
      cb(gx, gy, state.remainingMs);
    }
  }
  forEachFrozen(cb: (gx: number, gy: number, remainingMs: number) => void): void {
    for (const [key, state] of this.frozen) {
      const { gx, gy } = this.unpack(key);
      cb(gx, gy, state.remainingMs);
    }
  }

  // For HUD / debug
  get frozenCount(): number { return this.frozen.size; }
  get burningCount(): number { return this.burning.size; }
  get electricCount(): number { return this.electric.size; }
}
