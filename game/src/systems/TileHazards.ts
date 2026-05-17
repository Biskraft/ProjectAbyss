/**
 * TileHazards — applies elemental tile DOT/status to entities (Player, Enemy, ...).
 *
 * Stateless function: caller (scene) supplies the target's mutable state via
 * a duck-typed `HazardTarget` interface. The function reads the IntGrid +
 * the scene's `TileMutator` overlays and invokes `onDamage` callbacks.
 *
 * Damage budget per GDD §2.6-2.13:
 *   magma   2% maxHp on first contact + Burn 3s status
 *   charged 1% maxHp / 0.5s tick (체류 시간 비례)
 *   acid    1.6% maxHp / second (continuous)
 *   fire    3% maxHp / second + refresh Burn 2s (overlay from oil ignition)
 *   thunder 50% maxHp single-hit when caught in conductor flood-fill
 *   burn    2% maxHp / second for burn duration
 *
 * The Burn 3s timer + 1s tick accumulator + 0.5s charged tick accumulator
 * live on the target object so callers (Player, Enemy) only declare the
 * fields once and the helper reads/writes them in place.
 *
 * Scene wiring (per-frame, after physics resolution):
 *   ```
 *   applyTileHazards(this.player, this.roomData, this.mutator, dtMs, {
 *     onDamage: (amount, src) => {
 *       this.player.hp -= amount;
 *       this.hud.flashDamage();
 *       this.player.lastDamageSource = src;
 *     },
 *   });
 *   ```
 *
 * GDD: Documents/System/System_World_TileSystem.md §2.6-2.13, §3.2
 */

import { isInAcid, isInCharged, isInMagma, isInWater } from '../core/Physics';
import type { TileMutator } from './TileMutator';
import type { FluidSystem } from '../effects/FluidSystem';

export type HazardSource = 'magma' | 'charged' | 'acid' | 'fire' | 'thunder' | 'burn';

export interface HazardTarget {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  /** When true, hazards are skipped (i-frames after spike, dodge invuln, etc). */
  invincible?: boolean;
  /** Burn status ms remaining (set by magma/fire, ticks down each frame). */
  burnRemainingMs?: number;
  /** Accumulator for 1-second burn ticks. */
  burnTickAccum?: number;
  /** Accumulator for 0.5-second charged ticks (resets on exit). */
  chargedTickAccum?: number;
  /** Accumulator for 0.1-second acid ticks (resets on exit). */
  acidTickAccum?: number;
  /** Was overlapping an electric overlay last frame? Used so thunder damages
   *  once per pulse (on transition into overlay), not every frame. */
  prevInElectric?: boolean;
  /** Optional player hook: water clears burn/fire debuffs immediately. */
  extinguishFireDebuffs?: () => void;
  /**
   * Charged 상태 buff 잔여 ms — Arc Discharge 적중 시 ARC_CHARGED_BUFF_MS
   * (3000ms) 부여. 양수면 entity 가 *전도화 상태* — Charge Inhabit:
   *   - 다음 metal/water/acid 셀 접촉 시 보조 thunder chain trigger
   *   - 시각 sparkle overlay
   */
  chargedStateMs?: number;
}

export interface HazardCallbacks {
  /** Called once per hazard damage event. amount is in raw HP units. */
  onDamage: (amount: number, source: HazardSource) => void;
  /** Optional: triggered when the Burn status first applies (for VFX). */
  onBurnApplied?: () => void;
}

// === Tunables (mirror GDD §2 table) ===
// SHIPPABLE values — Burn DOT 지속·acid tick·magma 시그널은 원소 메카닉
// 핵심 시그널이라 출시 그대로 사용. 검증용 단축 대상 아님 (2026-05-13).
const MAGMA_FIRST_HIT_PCT = 0.10;   // 5x — heavier punishment for direct magma contact
export const MAGMA_BURN_DURATION_MS = 15000;
// Acid: tick-based (was continuous DPS — scene's Math.max(1, dmg) forced
// at-least-1-per-frame floor that vastly exceeded intended DPS).
// 0.1 s tick × 0.5% maxHp → ~5%/s nominal, scales nicely with maxHp.
const ACID_TICK_PCT = 0.005;
const ACID_TICK_MS = 100;
const CHARGED_TICK_PCT = 0.01;
const CHARGED_TICK_MS = 2500;
const FIRE_DPS_PCT = 0.03;
const FIRE_BURN_REFRESH_MS = 10000;
const THUNDER_HIT_PCT = 0.50;
const BURN_TICK_PCT = 0.02;
const BURN_TICK_MS = 5000;

/**
 * Apply all tile-based hazards to `target` for one frame.
 * Mutates `target.burnRemainingMs / burnTickAccum / chargedTickAccum` in place.
 */
export function applyTileHazards(
  target: HazardTarget,
  roomData: number[][],
  mutator: TileMutator,
  dtMs: number,
  cb: HazardCallbacks,
): void {
  if (target.hp <= 0) return;
  const x = target.x, y = target.y, w = target.width, h = target.height;
  const extinguishesFireInWater = !!target.extinguishFireDebuffs && isInWater(x, y, w, h, roomData);
  if (extinguishesFireInWater) {
    target.extinguishFireDebuffs?.();
  }
  if (target.invincible) {
    // While invincible we still cool down the burn timer so the player doesn't
    // emerge from i-frames still on fire from a brief touch.
    if ((target.burnRemainingMs ?? 0) > 0) {
      target.burnRemainingMs = Math.max(0, (target.burnRemainingMs ?? 0) - dtMs);
    }
    return;
  }

  let burnRem = target.burnRemainingMs ?? 0;
  let burnAcc = target.burnTickAccum ?? 0;
  let chargedAcc = target.chargedTickAccum ?? 0;

  // 1) Magma contact — Burn 3s + 2% maxHp immediate
  if (!extinguishesFireInWater && isInMagma(x, y, w, h, roomData)) {
    const wasBurning = burnRem > 0;
    burnRem = MAGMA_BURN_DURATION_MS;
    if (!wasBurning) {
      cb.onDamage(target.maxHp * MAGMA_FIRST_HIT_PCT, 'magma');
      if (cb.onBurnApplied) cb.onBurnApplied();
    }
  }

  // 2) Acid contact — 0.1 s tick (was continuous; Math.max(1, dmg) flooring
  //    in scene callbacks made the continuous version dump 1 hp/frame regardless
  //    of the configured DPS).
  let acidAcc = target.acidTickAccum ?? 0;
  if (isInAcid(x, y, w, h, roomData)) {
    acidAcc += dtMs;
    while (acidAcc >= ACID_TICK_MS) {
      acidAcc -= ACID_TICK_MS;
      cb.onDamage(target.maxHp * ACID_TICK_PCT, 'acid');
    }
  } else if (acidAcc !== 0) {
    acidAcc = 0;
  }

  // 3) Charged contact — 0.5s tick
  if (isInCharged(x, y, w, h, roomData)) {
    chargedAcc += dtMs;
    while (chargedAcc >= CHARGED_TICK_MS) {
      chargedAcc -= CHARGED_TICK_MS;
      cb.onDamage(target.maxHp * CHARGED_TICK_PCT, 'charged');
    }
  } else if (chargedAcc !== 0) {
    chargedAcc = 0;
  }

  // 4) Fire overlay (oil/wood/grass burning + burning BurnableProp) — DOT + Burn refresh.
  //    Expand AABB by 2 px so SOLID burning tiles (wood) adjacent to the entity
  //    register a touch (wood is solid → entity can't physically enter it, but
  //    the flames lick outward and should damage anyone right next to it).
  const fireFx = 2;
  const inTileFire = mutator.aabbHasOverlay(x - fireFx, y - fireFx, w + fireFx * 2, h + fireFx * 2, 'fire');
  const nearBurningProp = mutator.aabbNearBurningProp(x - fireFx, y - fireFx, w + fireFx * 2, h + fireFx * 2);
  if (!extinguishesFireInWater && (inTileFire || nearBurningProp)) {
    cb.onDamage(target.maxHp * FIRE_DPS_PCT * (dtMs / 1000), 'fire');
    if (burnRem < FIRE_BURN_REFRESH_MS) {
      const wasBurning = burnRem > 0;
      burnRem = FIRE_BURN_REFRESH_MS;
      if (!wasBurning && cb.onBurnApplied) cb.onBurnApplied();
    }
  }

  // 5) Thunder chain electric overlay — single big hit on transition into the
  // overlay. Re-firing while the target is still inside is suppressed so the
  // damage is per-pulse (one application per Shift+3 / enchant trigger),
  // not per-frame (which would stack to thousands over the 2.5s duration).
  const inElectric = mutator.aabbHasOverlay(x, y, w, h, 'electric');
  if (inElectric && !target.prevInElectric) {
    cb.onDamage(target.maxHp * THUNDER_HIT_PCT, 'thunder');
  }
  target.prevInElectric = inElectric;

  // 5.5) Charge Inhabit (R-NEW-021) — Arc Discharge 적중 entity 는 chargedStateMs
  //      동안 *전도화 상태*. 그 동안 water/metal/acid 셀에 AABB 접촉 시 그 셀에서
  //      thunder chain BFS 1회 trigger 후 buff 소비.
  let chargedSt = target.chargedStateMs ?? 0;
  if (chargedSt > 0) {
    chargedSt = Math.max(0, chargedSt - dtMs);
    if (chargedSt > 0) {
      const conductorCell = findCellInAABB(x, y, w, h, roomData,
        t => isWater(t) || isMetal(t) || isAcid(t));
      if (conductorCell) {
        mutator.applyThunderChain(roomData, conductorCell.gx, conductorCell.gy);
        chargedSt = 0;  // 1회 소비
      }
    }
  }
  target.chargedStateMs = chargedSt;

  // 6) Burn DOT — 2% maxHp / 1s
  if (!extinguishesFireInWater && burnRem > 0) {
    burnRem -= dtMs;
    burnAcc += dtMs;
    while (burnAcc >= BURN_TICK_MS) {
      burnAcc -= BURN_TICK_MS;
      cb.onDamage(target.maxHp * BURN_TICK_PCT, 'burn');
    }
    if (burnRem <= 0) {
      burnRem = 0;
      burnAcc = 0;
    }
  }

  target.burnRemainingMs = burnRem;
  target.burnTickAccum = burnAcc;
  target.chargedTickAccum = chargedAcc;
  target.acidTickAccum = acidAcc;
}

// ============================================================
// Element attack convenience — called by the scene's attack hooks
// when an elemental enchant lands on a tile or AABB.
// ============================================================

import {
  findCellInAABB, isAcid, isIce, isMagma, isMetal, isOil, isWater, getTile,
  isConductor,
} from '../core/Physics';

/**
 * Fire enchant hits an AABB. Sweeps EVERY cell in the AABB and applies the
 * appropriate reaction (priority: water > ice > flammable/entity). Without
 * the sweep, the previous "find first oil → return" logic would silently
 * skip a hitbox that contained wood/grass but no oil — confusing UX.
 *
 * Reactions:
 *   water → steam (cell → AIR + FluidSystem.removeCell so polygon updates)
 *   ice → melt to water (permanent terrain shift)
 *   oil/wood/grass / BurnableProp footprint → tryIgnite (cascading via TileMutator)
 *
 * Returns the strongest reaction observed (or null).
 */
export type FireAttackResult = 'ignite' | 'melt' | 'steam' | 'toxic' | 'magma-surge' | 'heat-metal';

export function applyFireAttack(
  roomData: number[][], mutator: TileMutator,
  ax: number, ay: number, aw: number, ah: number,
  fluidSystem?: FluidSystem,
): FireAttackResult | null {
  const TILE = 16;
  const l = Math.floor(ax / TILE);
  const r = Math.floor((ax + aw - 1) / TILE);
  const t = Math.floor(ay / TILE);
  const b = Math.floor((ay + ah - 1) / TILE);
  let result: FireAttackResult | null = null;
  const prio = (k: FireAttackResult): number =>
    ({ steam: 5, toxic: 4, 'magma-surge': 3, 'heat-metal': 3, melt: 2, ignite: 1 }[k]);
  const promote = (k: FireAttackResult): void => {
    if (!result || prio(k) > prio(result)) result = k;
  };
  for (let gy = t; gy <= b; gy++) {
    for (let gx = l; gx <= r; gx++) {
      const tile = getTile(roomData, gx, gy);
      if (isWater(tile)) {
        if (roomData[gy]) roomData[gy][gx] = 0;
        if (fluidSystem) fluidSystem.removeCell(gx, gy);
        promote('steam');
      } else if (isIce(tile)) {
        if (mutator.tryMeltIce(roomData, gx, gy)) promote('melt');
      } else if (isAcid(tile)) {
        // R-NEW-003 Acid Flash: fire on acid → toxic steam + cell removal
        if (roomData[gy]) roomData[gy][gx] = 0;
        if (fluidSystem) fluidSystem.removeCell(gx, gy);
        promote('toxic');
      } else if (isMagma(tile)) {
        // R-NEW-020 Magma Surge: fire on magma → 1-tile expansion to adjacent AIR
        const ns: Array<[number, number]> = [[gx + 1, gy], [gx - 1, gy], [gx, gy + 1], [gx, gy - 1]];
        for (const n of ns) {
          if (getTile(roomData, n[0], n[1]) === 0 && roomData[n[1]] && Math.random() < 0.40) {
            roomData[n[1]][n[0]] = tile; // magma 확장
          }
        }
        promote('magma-surge');
      } else if (isMetal(tile)) {
        // R-NEW-019 Heat Metal: fire on metal → 4s fire overlay on metal cell
        // (metal 셀 자체는 유지, fire overlay 만 부여 — DOT + acid 부식 가속 hook)
        mutator.tryIgniteOverlayOnly(gx, gy, 4000);
        promote('heat-metal');
      } else {
        // tryIgnite covers flammable tiles (oil/wood/grass) AND
        // BurnableProp entity footprints via its fallback.
        if (mutator.tryIgnite(roomData, gx, gy)) promote('ignite');
      }
    }
  }
  return result;
}

export type IceAttackResult =
  | 'freeze-water' | 'freeze-magma' | 'freeze-oil' | 'freeze-acid' | 'freeze-metal';

/**
 * Ice enchant hits an AABB — sweeps EVERY cell. Reacts:
 *   water → freeze 15s (R-028)
 *   magma → freeze 15s (R-029)
 *   oil   → freeze 8s   (R-NEW-004 — frozen oil, unstable)
 *   acid  → freeze 5s   (R-NEW-006 — frozen acid, most unstable)
 *   metal → freeze 15s + brittle (R-NEW-021 — Frozen Steel, Physical 1 hit shatters)
 * Returns the strongest reaction (priority: water > magma > metal > oil > acid).
 */
export function applyIceAttack(
  roomData: number[][], mutator: TileMutator,
  ax: number, ay: number, aw: number, ah: number,
): IceAttackResult | null {
  const TILE = 16;
  const l = Math.floor(ax / TILE);
  const r = Math.floor((ax + aw - 1) / TILE);
  const t = Math.floor(ay / TILE);
  const b = Math.floor((ay + ah - 1) / TILE);
  let result: IceAttackResult | null = null;
  const prio = (k: IceAttackResult): number =>
    ({ 'freeze-water': 5, 'freeze-magma': 4, 'freeze-metal': 3, 'freeze-oil': 2, 'freeze-acid': 1 }[k]);
  const promote = (k: IceAttackResult): void => {
    if (!result || prio(k) > prio(result)) result = k;
  };
  for (let gy = t; gy <= b; gy++) {
    for (let gx = l; gx <= r; gx++) {
      const tile = getTile(roomData, gx, gy);
      if (isWater(tile))      { mutator.tryFreeze(roomData, gx, gy); promote('freeze-water'); }
      else if (isMagma(tile)) { mutator.tryFreeze(roomData, gx, gy); promote('freeze-magma'); }
      else if (isOil(tile))   { mutator.tryFreeze(roomData, gx, gy); promote('freeze-oil');   }
      else if (isAcid(tile))  { mutator.tryFreeze(roomData, gx, gy); promote('freeze-acid');  }
      else if (isMetal(tile)) { mutator.tryFreezeMetal(roomData, gx, gy); promote('freeze-metal'); }
    }
  }
  return result;
}

export interface ThunderAttackResult {
  /** Number of cells lit by conductor chain. */
  cellsLit: number;
  /** R-NEW-018: magma cell hit by Thunder — detonation flag (50% maxHp radial). */
  detonationAt: { gx: number; gy: number } | null;
  /** R-NEW-022: ice cell hit by Thunder — shatter flag (30% maxHp + cell→AIR). */
  shatterAt: { gx: number; gy: number } | null;
}

/**
 * Thunder enchant hits an AABB. Reacts:
 *   water | metal | acid → flood-fill conductor chain
 *   magma → R-NEW-018 detonation flag (scene handles entity damage + VFX)
 *   ice   → R-NEW-022 shatter flag (cell → AIR + 30% maxHp)
 * Returns structured result with chain count + detonation/shatter coords.
 */
export function applyThunderAttack(
  roomData: number[][], mutator: TileMutator,
  ax: number, ay: number, aw: number, ah: number,
): ThunderAttackResult {
  const result: ThunderAttackResult = { cellsLit: 0, detonationAt: null, shatterAt: null };
  // Magma detonation — first magma cell in AABB
  const magmaHit = findCellInAABB(ax, ay, aw, ah, roomData, isMagma);
  if (magmaHit) result.detonationAt = { gx: magmaHit.gx, gy: magmaHit.gy };
  // Ice shatter — first ice cell in AABB
  const iceHit = findCellInAABB(ax, ay, aw, ah, roomData, isIce);
  if (iceHit) {
    result.shatterAt = { gx: iceHit.gx, gy: iceHit.gy };
    if (roomData[iceHit.gy]) roomData[iceHit.gy][iceHit.gx] = 0; // ice → AIR
  }
  // Conductor chain — first conductor in AABB
  const conductorHit = findCellInAABB(ax, ay, aw, ah, roomData, isConductor);
  if (conductorHit) {
    result.cellsLit = mutator.applyThunderChain(roomData, conductorHit.gx, conductorHit.gy);
  }
  return result;
}

export type PhysicalAttackResult = 'break-breakable' | 'break-ice' | 'chop-wood' | 'cut-grass' | 'shatter-frozen-metal';

/**
 * Physical (non-elemental) attack on AABB. Sweeps cells. Reacts:
 *   breakable (9)            → AIR (R-034 기존)
 *   ice                      → AIR (R-NEW-037 Break Ice)
 *   wood                     → AIR (R-NEW-030 Chop Wood)
 *   grass                    → AIR (R-NEW-036 Cut Grass — 보상 hook scene 측)
 *   frozen metal (WALL+meta) → AIR (R-NEW-017 Brittle Metal — 1 hit shatter)
 */
export function applyPhysicalAttack(
  roomData: number[][], mutator: TileMutator,
  ax: number, ay: number, aw: number, ah: number,
): PhysicalAttackResult | null {
  const TILE = 16;
  const l = Math.floor(ax / TILE);
  const r = Math.floor((ax + aw - 1) / TILE);
  const t = Math.floor(ay / TILE);
  const b = Math.floor((ay + ah - 1) / TILE);
  let result: PhysicalAttackResult | null = null;
  const prio = (k: PhysicalAttackResult): number =>
    ({ 'shatter-frozen-metal': 5, 'break-breakable': 4, 'break-ice': 3, 'chop-wood': 2, 'cut-grass': 1 }[k]);
  const promote = (k: PhysicalAttackResult): void => {
    if (!result || prio(k) > prio(result)) result = k;
  };
  for (let gy = t; gy <= b; gy++) {
    for (let gx = l; gx <= r; gx++) {
      const tile = getTile(roomData, gx, gy);
      // R-NEW-017 Brittle Metal: WALL 인데 frozen 이고 originalTile 이 METAL 이면 1 hit 즉파
      if (tile === 1 /*WALL*/ && mutator.isFrozenMetal(gx, gy)) {
        if (roomData[gy]) roomData[gy][gx] = 0;
        mutator.clearFrozen(gx, gy);
        promote('shatter-frozen-metal');
      } else if (tile === 9 /*BREAKABLE*/) {
        if (roomData[gy]) roomData[gy][gx] = 0;
        promote('break-breakable');
      } else if (isIce(tile)) {
        if (roomData[gy]) roomData[gy][gx] = 0;
        promote('break-ice');
      } else if (tile === 15 /*WOOD*/) {
        if (roomData[gy]) roomData[gy][gx] = 0;
        promote('chop-wood');
      } else if (tile === 16 /*GRASS*/) {
        if (roomData[gy]) roomData[gy][gx] = 0;
        promote('cut-grass');
      }
    }
  }
  return result;
}

// Re-export for one-import convenience at call sites
export { isMetal, isAcid, getTile };
