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

import { isInAcid, isInCharged, isInMagma } from '../core/Physics';
import type { TileMutator } from './TileMutator';

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
}

export interface HazardCallbacks {
  /** Called once per hazard damage event. amount is in raw HP units. */
  onDamage: (amount: number, source: HazardSource) => void;
  /** Optional: triggered when the Burn status first applies (for VFX). */
  onBurnApplied?: () => void;
}

// === Tunables (mirror GDD §2 table) ===
const MAGMA_FIRST_HIT_PCT = 0.02;
const MAGMA_BURN_DURATION_MS = 3000;
const ACID_DPS_PCT = 0.016;
const CHARGED_TICK_PCT = 0.01;
const CHARGED_TICK_MS = 500;
const FIRE_DPS_PCT = 0.03;
const FIRE_BURN_REFRESH_MS = 2000;
const THUNDER_HIT_PCT = 0.50;
const BURN_TICK_PCT = 0.02;
const BURN_TICK_MS = 1000;

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
  if (target.invincible) {
    // While invincible we still cool down the burn timer so the player doesn't
    // emerge from i-frames still on fire from a brief touch.
    if ((target.burnRemainingMs ?? 0) > 0) {
      target.burnRemainingMs = Math.max(0, (target.burnRemainingMs ?? 0) - dtMs);
    }
    return;
  }

  const x = target.x, y = target.y, w = target.width, h = target.height;
  let burnRem = target.burnRemainingMs ?? 0;
  let burnAcc = target.burnTickAccum ?? 0;
  let chargedAcc = target.chargedTickAccum ?? 0;

  // 1) Magma contact — Burn 3s + 2% maxHp immediate
  if (isInMagma(x, y, w, h, roomData)) {
    const wasBurning = burnRem > 0;
    burnRem = MAGMA_BURN_DURATION_MS;
    if (!wasBurning) {
      cb.onDamage(target.maxHp * MAGMA_FIRST_HIT_PCT, 'magma');
      if (cb.onBurnApplied) cb.onBurnApplied();
    }
  }

  // 2) Acid contact — continuous DOT
  if (isInAcid(x, y, w, h, roomData)) {
    cb.onDamage(target.maxHp * ACID_DPS_PCT * (dtMs / 1000), 'acid');
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

  // 4) Fire overlay (oil burning) — continuous DOT + refresh Burn
  if (mutator.aabbHasOverlay(x, y, w, h, 'fire')) {
    cb.onDamage(target.maxHp * FIRE_DPS_PCT * (dtMs / 1000), 'fire');
    if (burnRem < FIRE_BURN_REFRESH_MS) {
      const wasBurning = burnRem > 0;
      burnRem = FIRE_BURN_REFRESH_MS;
      if (!wasBurning && cb.onBurnApplied) cb.onBurnApplied();
    }
  }

  // 5) Thunder chain electric overlay — single big hit (recharges only when overlay refreshes)
  if (mutator.aabbHasOverlay(x, y, w, h, 'electric')) {
    cb.onDamage(target.maxHp * THUNDER_HIT_PCT, 'thunder');
  }

  // 6) Burn DOT — 2% maxHp / 1s
  if (burnRem > 0) {
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
 * Fire enchant hits an AABB. Reacts:
 *   oil → ignite (cascading spread handled by TileMutator)
 *   ice → melt to water (permanent)
 *   water → steam (the scene should also damage adjacent enemies)
 * Returns the kind of reaction triggered (or null).
 */
export function applyFireAttack(
  roomData: number[][], mutator: TileMutator,
  ax: number, ay: number, aw: number, ah: number,
): 'ignite' | 'melt' | 'steam' | null {
  const oilHit = findCellInAABB(ax, ay, aw, ah, roomData, isOil);
  if (oilHit) { mutator.tryIgnite(roomData, oilHit.gx, oilHit.gy); return 'ignite'; }
  const iceHit = findCellInAABB(ax, ay, aw, ah, roomData, isIce);
  if (iceHit) { mutator.tryMeltIce(roomData, iceHit.gx, iceHit.gy); return 'melt'; }
  const waterHit = findCellInAABB(ax, ay, aw, ah, roomData, isWater);
  if (waterHit) {
    // Scene-level effect: turn the water cell into air (steam) — emergent water removal.
    if (roomData[waterHit.gy]) roomData[waterHit.gy][waterHit.gx] = 0;
    return 'steam';
  }
  return null;
}

/**
 * Ice enchant hits an AABB. Reacts:
 *   water → freeze 3s (wall)
 *   magma → freeze 3s (wall)
 */
export function applyIceAttack(
  roomData: number[][], mutator: TileMutator,
  ax: number, ay: number, aw: number, ah: number,
): 'freeze-water' | 'freeze-magma' | null {
  const waterHit = findCellInAABB(ax, ay, aw, ah, roomData, isWater);
  if (waterHit) { mutator.tryFreeze(roomData, waterHit.gx, waterHit.gy); return 'freeze-water'; }
  const magmaHit = findCellInAABB(ax, ay, aw, ah, roomData, isMagma);
  if (magmaHit) { mutator.tryFreeze(roomData, magmaHit.gx, magmaHit.gy); return 'freeze-magma'; }
  return null;
}

/**
 * Thunder enchant hits an AABB. Reacts:
 *   water | metal | acid → flood-fill conductor chain
 * Returns number of cells lit (0 if no conductor in AABB).
 */
export function applyThunderAttack(
  roomData: number[][], mutator: TileMutator,
  ax: number, ay: number, aw: number, ah: number,
): number {
  const hit = findCellInAABB(ax, ay, aw, ah, roomData, isConductor);
  if (!hit) return 0;
  return mutator.applyThunderChain(roomData, hit.gx, hit.gy);
}

/**
 * Physical (non-elemental) attack on a breakable cell. Just provided for
 * symmetry — most scenes already handle this via Entity Breakable, but the
 * IntGrid breakable (9) can be hit directly too.
 */
export function applyPhysicalAttack(
  roomData: number[][],
  ax: number, ay: number, aw: number, ah: number,
): boolean {
  const hit = findCellInAABB(ax, ay, aw, ah, roomData, (t) => t === 9);
  if (!hit) return false;
  if (roomData[hit.gy]) roomData[hit.gy][hit.gx] = 0;
  return true;
}

// Re-export for one-import convenience at call sites
export { isMetal, isAcid, getTile };
