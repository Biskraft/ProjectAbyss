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
  TILE_WOOD, TILE_GRASS,
  getTile, isFlammable,
} from '../core/Physics';
import type { BurnableProp } from '../entities/BurnableProp';

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

  // === State maps (cell-keyed) ===
  private frozen = new Map<number, FrozenState>();
  private burning = new Map<number, BurnState>();
  private electric = new Map<number, ElectricState>();

  // Burnable entities (Tier B) — registered by scene after BurnableZonePass.
  // Stored as a flat list since N is small (<~50) and we walk all of them
  // each propagation tick anyway for entity-to-entity / entity-to-tile spread.
  private burnableEntities: BurnableProp[] = [];

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
  onWallTileChanged: ((gx: number, gy: number) => void) | null = null;

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

  /** Register a BurnableProp so fire spread can ignite it (and it can spread fire). */
  registerBurnable(prop: BurnableProp): void {
    if (this.burnableEntities.indexOf(prop) >= 0) return;
    this.burnableEntities.push(prop);
  }

  /** Remove a destroyed/teleported BurnableProp from spread consideration. */
  unregisterBurnable(prop: BurnableProp): void {
    const i = this.burnableEntities.indexOf(prop);
    if (i >= 0) this.burnableEntities.splice(i, 1);
  }

  /** Iterate live burnable props (for scene update / render walkthrough). */
  forEachBurnable(cb: (prop: BurnableProp) => void): void {
    for (const p of this.burnableEntities) cb(p);
  }

  /** Locate a burnable entity occupying a cell, or null. */
  private burnableAt(gx: number, gy: number): BurnableProp | null {
    for (const p of this.burnableEntities) {
      if (p.destroyed) continue;
      if (p.containsCell(gx, gy)) return p;
    }
    return null;
  }

  // ============================================================
  // Mutation API — called by element attack hooks / interactions
  // ============================================================

  /** Freeze water/magma → temporary WALL. Refreshes timer if already frozen. */
  tryFreeze(roomData: number[][], gx: number, gy: number): boolean {
    const tile = getTile(roomData, gx, gy);
    if (tile !== TILE_WATER && tile !== TILE_MAGMA) return false;
    if (!roomData[gy]) return false;
    const key = this.k(gx, gy);
    const existing = this.frozen.get(key);
    if (existing) {
      existing.remainingMs = TileMutator.FREEZE_DURATION_MS;
      return true;
    }
    this.frozen.set(key, {
      originalTile: tile,
      remainingMs: TileMutator.FREEZE_DURATION_MS,
    });
    roomData[gy][gx] = TILE_WALL;
    return true;
  }

  /** Melt ice → water (permanent terrain change). */
  tryMeltIce(roomData: number[][], gx: number, gy: number): boolean {
    if (getTile(roomData, gx, gy) !== TILE_ICE) return false;
    if (!roomData[gy]) return false;
    roomData[gy][gx] = TILE_WATER;
    this.onWallTileChanged?.(gx, gy);
    return true;
  }

  /**
   * Ignite a flammable cell (oil · wood · grass) OR a BurnableProp entity
   * occupying that cell. Returns true if anything caught fire.
   */
  tryIgnite(roomData: number[][], gx: number, gy: number): boolean {
    const tile = getTile(roomData, gx, gy);
    if (isFlammable(tile)) {
      const dur = BURN_DURATION_BY_TILE[tile] ?? TileMutator.BURN_DURATION_MS;
      this.burning.set(this.k(gx, gy), { remainingMs: dur, strong: true });
      return true;
    }
    // Fall through to entity ignition (Tier B)
    const prop = this.burnableAt(gx, gy);
    if (prop) return prop.ignite();
    return false;
  }

  /**
   * Apply a Thunder pulse to (gx, gy) — flood-fills connected conductor cells
   * (water · metal · acid) and tags them as electric for ELECTRIC_DURATION_MS.
   * Returns the number of cells lit.
   */
  applyThunderChain(roomData: number[][], gx: number, gy: number): number {
    const seed = getTile(roomData, gx, gy);
    if (seed !== TILE_WATER && seed !== TILE_METAL && seed !== TILE_ACID) return 0;
    const visited = new Set<number>();
    const queue: Array<[number, number]> = [[gx, gy]];
    let count = 0;
    while (queue.length) {
      const next = queue.shift()!;
      const cx = next[0], cy = next[1];
      const key = this.k(cx, cy);
      if (visited.has(key)) continue;
      visited.add(key);
      const t = getTile(roomData, cx, cy);
      if (t !== TILE_WATER && t !== TILE_METAL && t !== TILE_ACID) continue;
      this.electric.set(key, { remainingMs: TileMutator.ELECTRIC_DURATION_MS });
      count++;
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
            // Oil cells are already hidden by isFluidHiddenTile, but firing
            // the event for oil too is harmless and keeps the contract simple.
            this.onWallTileChanged?.(gx, gy);
          }
        }
        this.burning.delete(key);
      }
    }

    // 3) Electric countdown (short overlay)
    for (const [key, state] of this.electric) {
      state.remainingMs -= dtMs;
      if (state.remainingMs <= 0) this.electric.delete(key);
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
    const newPropIgnites: BurnableProp[] = [];

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
    //     Without this, magma next to grass/wood/oil never ignites them,
    //     which is unintuitive ("lava should set the forest on fire").
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
          if (isFlammable(nt)) tryQueueTile(nx, ny, tileChance(nt));
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
        }
        // Ice freezes adjacent water (slow, natural — not the 3s temp freeze)
        else if (t === TILE_ICE) {
          this.maybeFreezeNeighbour(roomData, gx, gy, TileMutator.ICE_WATER_FREEZE_CHANCE);
        }
        // Acid corrodes adjacent metal → air ; acid+magma adjacency → acid vapor
        else if (t === TILE_ACID) {
          this.maybeMutateNeighbour(roomData, gx, gy, TILE_METAL, TILE_AIR, TileMutator.ACID_METAL_CORRODE_CHANCE);
          if (this.neighbourMatches(roomData, gx, gy, TILE_MAGMA) &&
              Math.random() < TileMutator.ACID_MAGMA_VAPOR_CHANCE) {
            row[gx] = TILE_AIR;
            this.onSteamEvent?.(gx, gy);
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
        this.onWallTileChanged?.(nx, ny);
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
        this.onWallTileChanged?.(nx, ny);
      }
    }
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
