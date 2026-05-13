import { Container, Graphics } from 'pixi.js';

/**
 * Ego Shard — Hades-style cast projectile fired from the player's Ego sword.
 *
 * Lifecycle:
 *   1. Spawned at player center, moving horizontally in facing direction.
 *   2. Travels in a flat arc (slight gravity drop) for SHARD_LIFE_MS.
 *   3. On collision with wall/floor/enemy → STUCK state at impact point.
 *   4. Stuck shard remains visible for SHARD_STUCK_MS; player walking over
 *      it triggers `tryRetrieve()` (caller checks AABB overlap).
 *   5. On retrieval or expiry, shard is removed.
 *
 * Element variant:
 *   The shard's `element` decides visual + on-impact effect (Fire / Ice /
 *   Thunder). Effect application is handled by scene callbacks; manager
 *   only owns flight + render.
 */

export type ShardElement = 'fire' | 'ice' | 'thunder';

const SHARD_SPEED = 280;          // px/sec horizontal
const SHARD_GRAVITY = 240;        // px/sec² downward
// Safety only — shard finishes its parabola and lands on solid first. This
// just prevents runaway shards that fall off the world without bound.
const SHARD_LIFE_MS = 10000;
const SHARD_STUCK_MS = 60000;     // long stick — manual retrieve is best path
const TRAIL_MAX = 12;             // a bit longer for the bigger shard
const TRAIL_LIFE_MS = 280;
/** Anti-spam minimum gap between casts (ms). Recovery is queue-based, not per-cast. */
export const CAST_MIN_GAP_MS = 140;

interface ShardPalette {
  outer: number;
  core: number;
  trail: number;
}
const PALETTE: Record<ShardElement, ShardPalette> = {
  fire:    { outer: 0xff3311, core: 0xffee88, trail: 0xff7733 },
  ice:     { outer: 0x66ccff, core: 0xffffff, trail: 0xaaddee },
  thunder: { outer: 0xffee44, core: 0xffffff, trail: 0xffff88 },
};

export interface ShardImpactInfo {
  x: number; y: number;
  element: ShardElement;
}

interface TrailDot { x: number; y: number; age: number; }

export class Shard {
  gfx: Graphics;
  /** Separate gfx for trail (drawn at fixed world positions). */
  trailGfx: Graphics;
  x: number; y: number;
  /** Previous frame position — used to snap-back if shard penetrates a wall. */
  prevX: number; prevY: number;
  vx: number; vy: number;
  age = 0;
  element: ShardElement;
  /** false = flying, true = lodged in surface/wall/enemy waiting retrieval. */
  stuck = false;
  stuckAge = 0;
  /** Rotation while flying (radians). Frozen on stuck. */
  rot = 0;
  /** Last facing dir, used to anchor visual rotation when stuck. */
  facing: -1 | 1;
  /** Past world positions for trail render. */
  trail: TrailDot[] = [];
  /** Accumulator so we only push a trail dot every ~16ms. */
  trailAccum = 0;

  constructor(
    parent: Container,
    x: number, y: number,
    facing: -1 | 1,
    element: ShardElement,
  ) {
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
    this.facing = facing;
    this.element = element;
    this.vx = SHARD_SPEED * facing;
    this.vy = -40;                  // small initial up-tilt for arc
    this.trailGfx = new Graphics();
    parent.addChild(this.trailGfx);
    this.gfx = new Graphics();
    parent.addChild(this.gfx);
  }

  draw(): void {
    const g = this.gfx;
    g.clear();
    const pal = PALETTE[this.element];
    const flicker = this.stuck
      ? 0.7 + Math.sin(this.stuckAge * 0.012) * 0.3
      : 1.0;
    g.x = this.x;
    g.y = this.y;
    g.rotation = this.rot;
    // Diamond size 2× the old version (outer = 12 wide × 4.8 tall).
    // Outer diamond
    g.moveTo(12, 0).lineTo(0, -4.8).lineTo(-6, 0).lineTo(0, 4.8).closePath()
      .fill({ color: pal.outer, alpha: 0.95 });
    // Core
    g.moveTo(8, 0).lineTo(0, -2.8).lineTo(-3.2, 0).lineTo(0, 2.8).closePath()
      .fill({ color: pal.core, alpha: 0.95 * flicker });
    // White hot tip
    g.circle(6, 0, 1.6).fill({ color: 0xffffff, alpha: 0.85 * flicker });
    // Stuck halo — visible retrieval cue, 2× bigger.
    if (this.stuck) {
      g.circle(0, 0, 14 + Math.sin(this.stuckAge * 0.008) * 3)
        .stroke({ color: pal.trail, width: 2, alpha: 0.45 * flicker });
      g.circle(0, 0, 8)
        .stroke({ color: pal.core, width: 1, alpha: 0.4 * flicker });
    }
  }

  drawTrail(): void {
    const tg = this.trailGfx;
    tg.clear();
    if (this.stuck) return;
    const pal = PALETTE[this.element];
    for (const d of this.trail) {
      const k = 1 - d.age / TRAIL_LIFE_MS;
      if (k <= 0) continue;
      // Outer + inner trail dots — 2× the old size to match the bigger shard.
      tg.circle(d.x, d.y, 6 * k).fill({ color: pal.trail, alpha: 0.35 * k });
      tg.circle(d.x, d.y, 3 * k).fill({ color: pal.core,  alpha: 0.75 * k });
    }
  }

  tickTrail(dtMs: number): void {
    this.trailAccum += dtMs;
    if (this.trailAccum >= 14 && !this.stuck) {
      this.trailAccum = 0;
      this.trail.push({ x: this.x, y: this.y, age: 0 });
      if (this.trail.length > TRAIL_MAX) this.trail.shift();
    }
    for (const d of this.trail) d.age += dtMs;
    // Drop expired
    while (this.trail.length && this.trail[0].age > TRAIL_LIFE_MS) this.trail.shift();
  }

  destroy(): void {
    if (this.gfx.parent) this.gfx.parent.removeChild(this.gfx);
    this.gfx.destroy();
    if (this.trailGfx.parent) this.trailGfx.parent.removeChild(this.trailGfx);
    this.trailGfx.destroy();
  }
}

/** Retrieval ring burst — spawned when a stuck shard is absorbed. */
interface Ring {
  gfx: Graphics;
  x: number; y: number;
  age: number;
  life: number;
  element: ShardElement;
}
const RING_LIFE_MS = 260;

export class EgoShardManager {
  private parent: Container;
  private shards: Shard[] = [];
  private rings: Ring[] = [];

  constructor(parent: Container) { this.parent = parent; }

  spawn(x: number, y: number, facing: -1 | 1, element: ShardElement): void {
    this.shards.push(new Shard(this.parent, x, y, facing, element));
  }

  /**
   * Per-frame: advance flying shards, detect enemy hits, age stuck shards,
   * render, prune.
   *
   * @param onImpact   Called once when a shard becomes STUCK (wall hit, life
   *                   expiry, or enemy hit). Scene dispatches elemental
   *                   effect at the impact point.
   * @param isSolidAt  Scene's solid hit-test at world pixel (x, y).
   * @param checkEnemyHit  Scene's enemy-hit test — return true if shard at
   *                   (x, y) hit an enemy and damage was applied. Manager
   *                   then transitions shard to STUCK.
   */
  update(
    dtMs: number,
    onImpact: (info: ShardImpactInfo) => void,
    isSolidAt: (x: number, y: number) => boolean,
    checkEnemyHit?: (x: number, y: number, element: ShardElement) => boolean,
  ): void {
    const dt = dtMs / 1000;
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i];
      if (s.stuck) {
        s.stuckAge += dtMs;
        s.tickTrail(dtMs);
        s.drawTrail();
        s.draw();
        if (s.stuckAge >= SHARD_STUCK_MS) {
          s.destroy();
          this.shards.splice(i, 1);
        }
        continue;
      }
      s.age += dtMs;
      // Save previous position BEFORE moving — used for wall snap-back.
      s.prevX = s.x;
      s.prevY = s.y;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += SHARD_GRAVITY * dt;
      s.rot = Math.atan2(s.vy, s.vx);
      s.tickTrail(dtMs);
      s.drawTrail();
      s.draw();
      const hitEnemy = checkEnemyHit ? checkEnemyHit(s.x, s.y, s.element) : false;
      const hitSolid = !hitEnemy && isSolidAt(s.x, s.y);
      if (hitEnemy || hitSolid || s.age >= SHARD_LIFE_MS) {
        // Snap back to previous frame's position so the shard does NOT sit
        // inside the wall cell — that would make manual retrieval impossible.
        // For enemy hits we keep current position (enemy hitbox is the marker).
        if (hitSolid) {
          s.x = s.prevX;
          s.y = s.prevY;
        }
        s.stuck = true;
        s.stuckAge = 0;
        s.rot = 0;
        onImpact({ x: s.x, y: s.y, element: s.element });
      }
    }
    // Tick + render retrieval rings.
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.age += dtMs;
      const k = Math.min(1, r.age / r.life);
      const radius = 4 + k * 18;
      const alpha = (1 - k) * 0.9;
      const pal = PALETTE[r.element];
      r.gfx.clear();
      r.gfx.circle(0, 0, radius).stroke({ color: pal.core, width: 2, alpha });
      r.gfx.circle(0, 0, radius * 0.55).stroke({ color: pal.trail, width: 1, alpha: alpha * 0.7 });
      if (r.age >= r.life) {
        if (r.gfx.parent) r.gfx.parent.removeChild(r.gfx);
        r.gfx.destroy();
        this.rings.splice(i, 1);
      }
    }
  }

  /**
   * Return up to `maxRetrieve` stuck shards whose pixel position is inside
   * the given AABB. Each retrieved shard is destroyed and removed from the
   * pool. Spawns a retrieval ring burst per absorbed shard for clear UX
   * feedback.
   */
  retrieveInAABB(
    ax: number, ay: number, aw: number, ah: number,
    maxRetrieve = 99,
  ): number {
    let count = 0;
    for (let i = this.shards.length - 1; i >= 0 && count < maxRetrieve; i--) {
      const s = this.shards[i];
      if (!s.stuck) continue;
      if (s.x < ax || s.x > ax + aw || s.y < ay || s.y > ay + ah) continue;
      this.spawnRing(s.x, s.y, s.element);
      s.destroy();
      this.shards.splice(i, 1);
      count++;
    }
    return count;
  }

  /** Force-destroy all shards + rings — call on level reload. */
  clear(): void {
    for (const s of this.shards) s.destroy();
    this.shards.length = 0;
    for (const r of this.rings) {
      if (r.gfx.parent) r.gfx.parent.removeChild(r.gfx);
      r.gfx.destroy();
    }
    this.rings.length = 0;
  }

  private spawnRing(x: number, y: number, element: ShardElement): void {
    const g = new Graphics();
    g.x = x; g.y = y;
    this.parent.addChild(g);
    this.rings.push({ gfx: g, x, y, age: 0, life: RING_LIFE_MS, element });
  }
}
