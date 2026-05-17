import { Container, Graphics, Sprite, Texture, Rectangle, Assets } from 'pixi.js';
import { assetPath } from '@core/AssetLoader';

/**
 * Throwable container (Tier C volatile prop). Player picks up via GRAB,
 * carries while held, throws via second GRAB press. On impact the container
 * smashes and paints its fluid type onto the cells in a small radius.
 *
 * Catalog is intentionally narrow at Phase 2 P0:
 *   - OilDrum       — paints OIL cells around impact, breaks on first hit
 *   - WaterBarrel   — paints WATER cells
 *   - MagmaCrucible — paints MAGMA cells + steam if hits water
 *   - AcidVial      — paints ACID cells (smaller radius, sharper)
 *
 * Visual: simple Graphics primitive for now (sprite atlas swap when art lands).
 */

export type ContainerKind = 'Crate' | 'MetalCrate' | 'OilDrum' | 'WaterBarrel' | 'MagmaCrucible' | 'AcidVial';

export interface ContainerSpec {
  /** Pixel size of the prop. Uniform crate shape for all kinds. */
  width: number;
  height: number;
  /** Hit points — number of impacts before breaking. */
  hp: number;
  /**
   * IntGrid value to paint on the surrounding cells when broken.
   * 0 (= air) leaves no fluid trace — used by plain Crate.
   */
  paintTile: number;
  /**
   * Default fluid quantity (number of cells flooded) when broken. Used when
   * the LDtk entity does NOT provide a FluidVolume override. Crate = 0.
   */
  defaultFluidVolume: number;
  /** Inner fluid window color (shown through the wooden frame). */
  fluidColor: number;
  /**
   * Pixel inset from sprite frame to physical collision rect. Used by every
   * collision query (grab range, player stand-on, container ↔ container
   * stack, thrown enemy-hit). Sprite render position is unaffected.
   *
   * Per kind:
   *   - Crate (wood)  — 0 all sides (sprite fills 32×32 frame).
   *   - MetalCrate    — left/right 2 (locker body is 28 wide; sprite frame
   *                     reserves 2px gutter for hinge highlights).
   *   - Drum 4종      — left/right 1 (drum body is 30 wide; sprite frame
   *                     reserves 1px halo).
   */
  collisionInset: { top: number; bottom: number; left: number; right: number };
}

const INSET_FULL   = { top: 0, bottom: 0, left: 0, right: 0 };
const INSET_LOCKER = { top: 0, bottom: 0, left: 2, right: 2 };
const INSET_DRUM   = { top: 0, bottom: 0, left: 1, right: 1 };

// All containers share the WOOD crate exterior (placeholder until art lands).
// Per-kind variation is communicated by the colored fluid window inside.
const WOOD_BODY    = 0x8b5a2b;
const WOOD_ACCENT  = 0xc28b50;

const CATALOG: Record<ContainerKind, ContainerSpec> = {
  // 32×32 sprite-based crates. Wood family (everything except MetalCrate)
  // uses the wood slice set; MetalCrate uses the metal slice set. Variant
  // index 0~3 is randomized per spawn and fixed for the entity lifetime.
  Crate:         { width: 32, height: 32, hp: 1, paintTile: 0,  defaultFluidVolume: 0, fluidColor: WOOD_BODY,   collisionInset: INSET_FULL   },
  MetalCrate:    { width: 32, height: 32, hp: 4, paintTile: 0,  defaultFluidVolume: 0, fluidColor: 0xa0a0b0,   collisionInset: INSET_LOCKER },
  OilDrum:       { width: 32, height: 32, hp: 1, paintTile: 11, defaultFluidVolume: 6, fluidColor: 0x4d2e14,   collisionInset: INSET_DRUM   },
  WaterBarrel:   { width: 32, height: 32, hp: 1, paintTile: 2,  defaultFluidVolume: 6, fluidColor: 0x4076c8,   collisionInset: INSET_DRUM   },
  MagmaCrucible: { width: 32, height: 32, hp: 1, paintTile: 6,  defaultFluidVolume: 4, fluidColor: 0xff6633,   collisionInset: INSET_DRUM   },
  AcidVial:      { width: 32, height: 32, hp: 1, paintTile: 13, defaultFluidVolume: 4, fluidColor: 0x88cc44,   collisionInset: INSET_DRUM   },
};

/**
 * Cached slice textures from crate_01_atlas. Keys: 'wood_0'..'wood_3',
 * 'metal_0'..'metal_3'. Populated on first async load; subsequent calls
 * resolve from cache.
 */
const SLICE_TEXTURES: Record<string, Texture | null> = {};
let slicePromise: Promise<void> | null = null;

function ensureSliceTextures(): Promise<void> {
  if (slicePromise) return slicePromise;
  slicePromise = (async () => {
    const sheet = await Assets.load<Texture>(assetPath('assets/sprites/crate_01_atlas.png'));
    if (sheet?.source) sheet.source.scaleMode = 'nearest';
    // Row 0 (y=0): wood_01~04 — 4 variants for plain Crate
    // Row 1 (y=32): metal_01~04 — 4 variants for MetalCrate
    // Row 2 (y=64): oil / acid / magma / water — 1 dedicated slice per fluid
    for (let i = 0; i < 4; i++) {
      SLICE_TEXTURES[`wood_${i}`]  = new Texture({ source: sheet.source, frame: new Rectangle(i * 32,  0, 32, 32) });
      SLICE_TEXTURES[`metal_${i}`] = new Texture({ source: sheet.source, frame: new Rectangle(i * 32, 32, 32, 32) });
    }
    SLICE_TEXTURES['oil_0']   = new Texture({ source: sheet.source, frame: new Rectangle( 0, 64, 32, 32) });
    SLICE_TEXTURES['acid_0']  = new Texture({ source: sheet.source, frame: new Rectangle(32, 64, 32, 32) });
    SLICE_TEXTURES['magma_0'] = new Texture({ source: sheet.source, frame: new Rectangle(64, 64, 32, 32) });
    SLICE_TEXTURES['water_0'] = new Texture({ source: sheet.source, frame: new Rectangle(96, 64, 32, 32) });
  })().catch((e) => {
    // eslint-disable-next-line no-console
    console.warn('[ThrowableContainer] crate atlas load failed', e);
  });
  return slicePromise;
}

/** Resolve which slice key (and family) to use for a given kind + variant. */
function sliceKeyForKind(kind: ContainerKind, variantIdx: number): string {
  switch (kind) {
    case 'Crate':         return `wood_${variantIdx}`;
    case 'MetalCrate':    return `metal_${variantIdx}`;
    case 'OilDrum':       return 'oil_0';
    case 'WaterBarrel':   return 'water_0';
    case 'MagmaCrucible': return 'magma_0';
    case 'AcidVial':      return 'acid_0';
  }
}

const KIND_LIST: ContainerKind[] = ['Crate', 'MetalCrate', 'OilDrum', 'WaterBarrel', 'MagmaCrucible', 'AcidVial'];
const TILE_SIZE = 16;
const GRAVITY = 760;
const MAX_FALL_SPEED = 720;
const MAX_STEP_MS = 8;
const REST_VX = 6;
const FLOOR_FRICTION = 0.80;
const WALL_BOUNCE = 0.30;
const STEAM_LIFT_DURATION_MS = 3000;
const STEAM_LIFT_INITIAL_VY = -120;
const STEAM_LIFT_MIN_VY = -90;
const STEAM_LIFT_MAX_VY = -160;
const STEAM_LIFT_ACCEL = 140;
const METAL_CHARGE_REFRESH_MS = 250;

/** Type-guard / parse for LDtk enum field. Returns null on invalid input. */
export function parseContainerKind(value: unknown): ContainerKind | null {
  if (typeof value !== 'string') return null;
  return (KIND_LIST as string[]).includes(value) ? (value as ContainerKind) : null;
}

export function getContainerSpec(kind: ContainerKind): ContainerSpec {
  return CATALOG[kind];
}

export class ThrowableContainer {
  readonly kind: ContainerKind;
  readonly spec: ContainerSpec;
  /**
   * Fluid quantity (number of cells flooded on break). Resolved from the
   * LDtk `FluidVolume` field at spawn, falling back to spec default.
   */
  readonly fluidVolume: number;
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  hp: number;
  destroyed = false;
  /** True while held by the player — no gravity, follows player. */
  held = false;
  /**
   * True after `release()` (player throw). Only thrown containers shatter
   * on hard contact — gravity-only falls (e.g., placed mid-air, settles on
   * floor) do NOT destroy. Cleared back to false when the container comes
   * to rest after a throw.
   */
  wasThrown = false;
  /** Time spent in acid. MetalCrate: 1 HP/s × 4 HP = 4 s. Wood: 3 s threshold. */
  acidExposureMs = 0;
  /** Time spent in magma (wood family). 1.5 s threshold → burn out. */
  magmaExposureMs = 0;
  /** Time spent on a burning cell (wood family). 1.5 s threshold → burn out. */
  fireExposureMs = 0;
  /** R-NEW-052 Slowly Rusting: MetalCrate on water cells. 30 s → 1 HP. */
  waterExposureMs = 0;
  /**
   * After release(), the thrower (player) is invulnerable to this
   * container for this many ms — prevents self-bonk on dropped throws.
   * 0 means the container can hit any entity (including the thrower).
   */
  selfHitInvulnMs = 0;
  /**
   * Whether this thrown container has already dealt an impact hit. Each
   * thrown container can only damage one enemy (the first contact), then
   * destroys itself. Prevents multi-hits from a single throw.
   */
  hasDealtImpact = false;
  /**
   * Skip the scene's settleAtSpawn raycast for this container. Used by
   * ContainerSpawner's `Drop` bias so the box keeps its initial spawn Y
   * and falls naturally under gravity instead of teleporting to the
   * floor on creation.
   */
  skipSettle = false;
  /** Remaining upward force time from acid+water exothermic steam. */
  private steamLiftRemainingMs = 0;
  /** MetalCrate only: temporary charge while touching TILE_CHARGED. */
  private chargedRemainingMs = 0;
  /** Random 0~3 — chosen at spawn, fixed for the lifetime of this crate. */
  readonly variantIdx: number;
  readonly container = new Container();
  private body!: Graphics;
  private chargeGfx = new Graphics();

  // ── Collision rect (physical body) accessors — sprite render is offset
  // by collisionInset.left / collisionInset.top from this rect.
  get colX(): number { return this.x + this.spec.collisionInset.left; }
  get colY(): number { return this.y + this.spec.collisionInset.top; }
  get colW(): number { return this.spec.width - this.spec.collisionInset.left - this.spec.collisionInset.right; }
  get colH(): number { return this.spec.height - this.spec.collisionInset.top - this.spec.collisionInset.bottom; }

  constructor(kind: ContainerKind, x: number, y: number, fluidVolumeOverride?: number) {
    this.kind = kind;
    this.spec = CATALOG[kind];
    this.x = x;
    this.y = y;
    this.hp = this.spec.hp;
    this.fluidVolume = fluidVolumeOverride !== undefined && fluidVolumeOverride >= 0
      ? Math.floor(fluidVolumeOverride)
      : this.spec.defaultFluidVolume;
    this.variantIdx = Math.floor(Math.random() * 4);
    this.container.x = x;
    this.container.y = y;
    this.draw();
    this.container.addChild(this.chargeGfx);
  }

  get width(): number { return this.spec.width; }
  get height(): number { return this.spec.height; }

  applySteamLift(durationMs = STEAM_LIFT_DURATION_MS): void {
    if (this.destroyed || this.held) return;
    this.steamLiftRemainingMs = Math.max(this.steamLiftRemainingMs, durationMs);
    this.vy = Math.min(this.vy, STEAM_LIFT_INITIAL_VY);
    this.wasThrown = false;
  }

  applyCharge(durationMs = METAL_CHARGE_REFRESH_MS): void {
    if (this.destroyed || this.held || this.kind !== 'MetalCrate') return;
    this.chargedRemainingMs = Math.max(this.chargedRemainingMs, durationMs);
    this.wasThrown = false;
  }

  isCharged(): boolean {
    return this.kind === 'MetalCrate' && this.chargedRemainingMs > 0 && !this.destroyed && !this.held;
  }

  /** Physical AABB (inset-aware) used by grab range, stacking, enemy hit. */
  getAABB(): { x: number; y: number; w: number; h: number } {
    return { x: this.colX, y: this.colY, w: this.colW, h: this.colH };
  }

  private boundsAt(x = this.x, y = this.y): { x: number; y: number; w: number; h: number } {
    return {
      x: x + this.spec.collisionInset.left,
      y: y + this.spec.collisionInset.top,
      w: this.colW,
      h: this.colH,
    };
  }

  private overlapsSolidTilesAt(
    x: number,
    y: number,
    isSolidAt: (gx: number, gy: number) => boolean,
  ): boolean {
    const b = this.boundsAt(x, y);
    const left = Math.floor(b.x / TILE_SIZE);
    const right = Math.floor((b.x + b.w - 1) / TILE_SIZE);
    const top = Math.floor(b.y / TILE_SIZE);
    const bottom = Math.floor((b.y + b.h - 1) / TILE_SIZE);
    for (let gy = top; gy <= bottom; gy++) {
      for (let gx = left; gx <= right; gx++) {
        if (isSolidAt(gx, gy)) return true;
      }
    }
    return false;
  }

  private overlapsContainerAt(x: number, y: number, other: ThrowableContainer): boolean {
    const a = this.boundsAt(x, y);
    return (
      a.x < other.colX + other.colW &&
      a.x + a.w > other.colX &&
      a.y < other.colY + other.colH &&
      a.y + a.h > other.colY
    );
  }

  private overlapsAnyContainerAt(
    x: number,
    y: number,
    others: readonly ThrowableContainer[],
  ): ThrowableContainer | null {
    for (const o of others) {
      if (o === this || o.destroyed || o.held) continue;
      if (this.overlapsContainerAt(x, y, o)) return o;
    }
    return null;
  }

  private blockedAt(
    x: number,
    y: number,
    isSolidAt: (gx: number, gy: number) => boolean,
    others: readonly ThrowableContainer[],
  ): boolean {
    return this.overlapsSolidTilesAt(x, y, isSolidAt) || this.overlapsAnyContainerAt(x, y, others) !== null;
  }

  private supportYAt(
    x: number,
    y: number,
    isSolidAt: (gx: number, gy: number) => boolean,
    others: readonly ThrowableContainer[],
  ): number | null {
    const b = this.boundsAt(x, y);
    const bottom = b.y + b.h;
    const footRow = Math.floor(bottom / TILE_SIZE);
    const left = Math.floor(b.x / TILE_SIZE);
    const right = Math.floor((b.x + b.w - 1) / TILE_SIZE);
    let best: number | null = null;

    for (let gx = left; gx <= right; gx++) {
      if (!isSolidAt(gx, footRow)) continue;
      const candidate = footRow * TILE_SIZE - this.spec.collisionInset.top - b.h;
      best = best === null ? candidate : Math.min(best, candidate);
    }

    for (const o of others) {
      if (o === this || o.destroyed || o.held) continue;
      if (b.x + b.w <= o.colX || b.x >= o.colX + o.colW) continue;
      if (bottom < o.colY || b.y >= o.colY) continue;
      const candidate = o.colY - this.spec.collisionInset.top - b.h;
      best = best === null ? candidate : Math.min(best, candidate);
    }

    return best;
  }

  private isGroundedOnSupport(
    isSolidAt: (gx: number, gy: number) => boolean,
    others: readonly ThrowableContainer[],
  ): boolean {
    return this.supportYAt(this.x, this.y + 1, isSolidAt, others) === this.y;
  }

  private resolveInitialOverlap(
    isSolidAt: (gx: number, gy: number) => boolean,
    others: readonly ThrowableContainer[],
  ): void {
    if (!this.blockedAt(this.x, this.y, isSolidAt, others)) return;
    const maxPush = TILE_SIZE * 3;
    let bestX = this.x;
    let bestY = this.y;
    let bestDist = Infinity;
    for (let radius = 1; radius <= maxPush; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          const nx = this.x + dx;
          const ny = this.y + dy;
          if (this.blockedAt(nx, ny, isSolidAt, others)) continue;
          const dist = dx * dx + dy * dy;
          if (dist < bestDist) {
            bestX = nx;
            bestY = ny;
            bestDist = dist;
          }
        }
      }
      if (bestDist < Infinity) break;
    }
    if (bestDist === Infinity) return;
    this.x = bestX;
    this.y = bestY;
    this.vx = 0;
    this.vy = Math.max(0, this.vy);
  }

  private moveX(
    dx: number,
    isSolidAt: (gx: number, gy: number) => boolean,
    others: readonly ThrowableContainer[],
  ): void {
    if (dx === 0) return;
    const dir = Math.sign(dx);
    let remaining = Math.abs(dx);
    while (remaining > 0) {
      const step = Math.min(1, remaining) * dir;
      const nx = this.x + step;
      if (this.blockedAt(nx, this.y, isSolidAt, others)) {
        this.vx = -this.vx * WALL_BOUNCE;
        if (Math.abs(this.vx) < REST_VX) this.vx = 0;
        return;
      }
      this.x = nx;
      remaining -= Math.abs(step);
    }
  }

  private moveY(
    dy: number,
    isSolidAt: (gx: number, gy: number) => boolean,
    others: readonly ThrowableContainer[],
  ): boolean {
    if (dy === 0) return false;
    const dir = Math.sign(dy);
    let remaining = Math.abs(dy);
    while (remaining > 0) {
      const step = Math.min(1, remaining) * dir;
      const ny = this.y + step;
      if (this.blockedAt(this.x, ny, isSolidAt, others)) {
        if (dy > 0) {
          const supportY = this.supportYAt(this.x, ny, isSolidAt, others);
          if (supportY !== null) this.y = supportY;
          this.vy = 0;
          return true;
        }
        this.vy = Math.max(0, -this.vy * 0.20);
        return false;
      }
      this.y = ny;
      remaining -= Math.abs(step);
    }
    return false;
  }

  /**
   * Simple gravity + horizontal motion. Returns the impact info if this
   * frame the container collided with a solid surface; null otherwise.
   * Caller (scene) decides paint behaviour from the kind/spec.
   */
  update(
    dtMs: number,
    isSolidAt: (gx: number, gy: number) => boolean,
    others: readonly ThrowableContainer[] = [],
  ): { gx: number; gy: number } | null {
    if (this.held || this.destroyed) {
      this.container.x = this.x;
      this.container.y = this.y;
      if (this.selfHitInvulnMs > 0) this.selfHitInvulnMs -= dtMs;
      if (this.held) this.steamLiftRemainingMs = 0;
      if (this.held) this.chargedRemainingMs = 0;
      this.updateChargeVisual(dtMs);
      return null;
    }
    if (this.selfHitInvulnMs > 0) this.selfHitInvulnMs = Math.max(0, this.selfHitInvulnMs - dtMs);
    this.resolveInitialOverlap(isSolidAt, others);
    let remainingMs = Math.min(dtMs, 100);
    while (remainingMs > 0) {
      const stepMs = Math.min(MAX_STEP_MS, remainingMs);
      const dt = stepMs / 1000;
      const groundedBefore = this.isGroundedOnSupport(isSolidAt, others);

      if (groundedBefore && this.vy >= 0) {
        const supportY = this.supportYAt(this.x, this.y + 1, isSolidAt, others);
        if (supportY !== null) this.y = supportY;
        this.vy = 0;
        this.vx *= FLOOR_FRICTION;
        if (Math.abs(this.vx) < REST_VX) {
          this.vx = 0;
          this.wasThrown = false;
        }
      } else {
        this.vy = Math.min(MAX_FALL_SPEED, this.vy + GRAVITY * dt);
      }
      if (this.steamLiftRemainingMs > 0) {
        this.steamLiftRemainingMs = Math.max(0, this.steamLiftRemainingMs - stepMs);
        this.vy = Math.max(
          STEAM_LIFT_MAX_VY,
          Math.min(this.vy, STEAM_LIFT_MIN_VY) - STEAM_LIFT_ACCEL * dt,
        );
      }

      this.moveX(this.vx * dt, isSolidAt, others);
      const landed = this.moveY(this.vy * dt, isSolidAt, others);
      if (landed) {
        this.vx *= FLOOR_FRICTION;
        if (Math.abs(this.vx) < REST_VX) {
          this.vx = 0;
          this.wasThrown = false;
        }
      }
      remainingMs -= stepMs;
    }
    this.container.x = this.x;
    this.container.y = this.y;
    this.updateChargeVisual(dtMs);
    return null;

    const dt = dtMs / 1000;
    // ── Combined solid check: grid cell OR another container occupying
    // the cell. Treats containers as part of the world for stacking +
    // collision purposes. Uses each container's collision rect (inset-aware).
    const cellBlockedBy = (gx: number, gy: number): ThrowableContainer | null => {
      const cellPx = gx * 16, cellPy = gy * 16;
      for (const o of others) {
        if (o === this || o.destroyed || o.held) continue;
        if (o.colX < cellPx + 16 && o.colX + o.colW > cellPx &&
            o.colY < cellPy + 16 && o.colY + o.colH > cellPy) return o;
      }
      return null;
    };
    const isBlocked = (gx: number, gy: number): boolean => {
      if (isSolidAt(gx, gy)) return true;
      return cellBlockedBy(gx, gy) !== null;
    };

    // ── Grounded check (grid floor OR another container's top).
    // All cell math uses the collision rect (sprite frame minus inset).
    const insetTop = this.spec.collisionInset.top;
    const insetBot = this.spec.collisionInset.bottom;
    const feetY = this.colY + this.colH; // physical bottom
    const feetGy = Math.floor(feetY / 16);
    const leftGx = Math.floor(this.colX / 16);
    const rightGx = Math.floor((this.colX + this.colW - 1) / 16);
    let grounded = false;
    for (let gx = leftGx; gx <= rightGx; gx++) {
      if (isBlocked(gx, feetGy)) { grounded = true; break; }
    }
    if (grounded && this.vy >= 0) {
      // Snap so physical bottom rests on the highest floor under feet.
      // sprite.y = floorY - spec.height + insetBot  (because physical bottom = sprite.y + spec.height - insetBot)
      let snapY = feetGy * 16 - this.spec.height + insetBot;
      for (const o of others) {
        if (o === this || o.destroyed || o.held) continue;
        if (this.colX + this.colW <= o.colX || this.colX >= o.colX + o.colW) continue;
        // Stack onto o's collision top: physical bottom = o.colY → sprite.y = o.colY - colH - insetTop
        const candidate = o.colY - this.colH - insetTop;
        if (candidate >= this.y && candidate < snapY) snapY = candidate;
      }
      this.y = snapY;
      this.vy = 0;
      this.vx *= 0.80;
      if (Math.abs(this.vx) < 6) {
        this.vx = 0;
        // Came to rest — clear throw flag so this container is now treated
        // as a passive prop. Future impacts (e.g. from another container
        // landing on it) will be evaluated as gravity, not throw, and
        // therefore won't shatter.
        this.wasThrown = false;
      }
      this.container.x = this.x;
      this.container.y = this.y;
      return null;
    }

    // ── Gravity + motion sweep ──
    this.vy += 760 * dt;
    if (this.vy > 600) this.vy = 600;
    const stepX = this.vx * dt;
    const stepY = this.vy * dt;
    const nx = this.x + stepX;
    const ny = this.y + stepY;

    // Corner-cell check — sample 4 corners of the *collision rect* at the
    // candidate sprite position. Containers are kinetically indestructible;
    // throws bounce/stop on walls but never shatter.
    const ncolX = nx + this.spec.collisionInset.left;
    const ncolY = ny + insetTop;
    const checks: Array<[number, number]> = [
      [ncolX,                ncolY + this.colH - 1],
      [ncolX + this.colW - 1, ncolY + this.colH - 1],
      [ncolX,                ncolY],
      [ncolX + this.colW - 1, ncolY],
    ];
    for (const [cx, cy] of checks) {
      const gx = Math.floor(cx / 16);
      const gy = Math.floor(cy / 16);
      if (isSolidAt(gx, gy)) {
        this.vx *= 0.3;
        this.vy = 0;
        return null;
      }
      const blocker = cellBlockedBy(gx, gy);
      if (blocker) {
        this.vx *= 0.4;
        this.vy = 0;
        return null;
      }
    }
    this.x = nx;
    this.y = ny;
    this.container.x = this.x;
    this.container.y = this.y;
    return null;
  }

  /**
   * Immediately raycast down + AABB-stack until the container rests on the
   * first solid floor or another container. Called once at spawn so a
   * LDtk-placed container above empty space doesn't "fall slowly" — it
   * teleports to its natural resting place.
   */
  settleAtSpawn(
    isSolidAt: (gx: number, gy: number) => boolean,
    others: readonly ThrowableContainer[],
    maxDropPx = 1024,
  ): void {
    this.resolveInitialOverlap(isSolidAt, others);
    for (let dy = 0; dy <= maxDropPx; dy++) {
      const testY = this.y + dy;
      if (!this.blockedAt(this.x, testY + 1, isSolidAt, others)) continue;
      const supportY = this.supportYAt(this.x, testY + 1, isSolidAt, others);
      if (supportY !== null) this.y = supportY;
      break;
    }
    this.vx = 0;
    this.vy = 0;
    this.container.x = this.x;
    this.container.y = this.y;
    return;

    const insetTop = this.spec.collisionInset.top;
    const insetBot = this.spec.collisionInset.bottom;
    const colW = this.colW;
    const colH = this.colH;
    // Collision rect's left edge in pixel coords (constant during drop).
    const colX0 = this.x + this.spec.collisionInset.left;
    const leftGx = Math.floor(colX0 / 16);
    const rightGx = Math.floor((colX0 + colW - 1) / 16);
    let bestY = this.y;
    for (let dy = 0; dy <= maxDropPx; dy++) {
      const testY = this.y + dy;
      const colTop = testY + insetTop;
      const colBot = colTop + colH;
      const feetGy = Math.floor(colBot / 16);
      let blocked = false;
      for (let gx = leftGx; gx <= rightGx; gx++) {
        if (isSolidAt(gx, feetGy)) { blocked = true; break; }
      }
      if (!blocked) {
        for (const o of others) {
          if (o === this || o.destroyed || o.held) continue;
          if (colX0 + colW <= o.colX) continue;
          if (colX0 >= o.colX + o.colW) continue;
          if (colBot > o.colY && colBot <= o.colY + o.colH) { blocked = true; break; }
          if (colTop < o.colY + o.colH && colTop + colH > o.colY) { blocked = true; break; }
        }
      }
      if (blocked) {
        bestY = testY - 1;
        // Snap so physical bottom = floor cell top (cleaner stack).
        const feetGy = Math.floor((bestY + insetTop + colH) / 16);
        for (let gx = leftGx; gx <= rightGx; gx++) {
          if (isSolidAt(gx, feetGy)) {
            bestY = feetGy * 16 - this.spec.height + insetBot;
            break;
          }
        }
        break;
      }
    }
    this.y = bestY;
    this.vx = 0;
    this.vy = 0;
    this.container.x = this.x;
    this.container.y = this.y;
  }

  /** Set held = true. Caller positions x/y each frame to track player. */
  pickUp(): void { this.held = true; this.vx = 0; this.vy = 0; }

  /** Throw with initial velocity. Marks container as "thrown" — only thrown
   *  containers shatter on solid contact, and only thrown containers deal
   *  impact damage to enemies on first contact.
   *  Sets self-hit invuln so the thrower (player) is protected from the
   *  container's first 200 ms of flight (anti self-bonk on drop throws). */
  release(vx: number, vy: number): void {
    this.held = false;
    this.wasThrown = true;
    this.hasDealtImpact = false;
    this.selfHitInvulnMs = 200;
    this.vx = vx;
    this.vy = vy;
  }

  /**
   * Apply an external attack (player sword swing, Ego Shard impact, etc).
   * Subtracts HP and returns an impact point if destroyed. Scene paints
   * fluid using this impact location, the same as a thrown impact.
   */
  takeAttack(damage: number): { gx: number; gy: number } | null {
    if (this.destroyed) return null;
    this.hp -= damage;
    if (this.hp <= 0) {
      this.destroyed = true;
      return {
        gx: Math.floor((this.colX + this.colW / 2) / 16),
        gy: Math.floor((this.colY + this.colH / 2) / 16),
      };
    }
    return null;
  }

  destroy(): void {
    this.destroyed = true;
    if (this.container.parent) this.container.parent.removeChild(this.container);
    this.container.destroy({ children: true });
  }

  private spriteLoaded = false;
  private draw(): void {
    // Try sprite path first (sync — if atlas already loaded, instant).
    const key = sliceKeyForKind(this.kind, this.variantIdx);
    if (SLICE_TEXTURES[key]) {
      this.applySprite(SLICE_TEXTURES[key]!);
      return;
    }
    void ensureSliceTextures().then(() => {
      if (this.destroyed) return;
      const t = SLICE_TEXTURES[key];
      if (t) this.applySprite(t);
    });
    // ── Fallback Graphics path — runs when the atlas hasn't loaded yet.
    this.body = new Graphics();
    const w = this.spec.width, h = this.spec.height;

    if (this.kind === 'MetalCrate') {
      // Steel crate — cold gray plate with rivets, no center stamp. Reads
      // distinctly from the wood family at a glance.
      const STEEL_BODY   = 0x7a7a88;
      const STEEL_LIGHT  = 0xb0b0c0;
      const STEEL_SHADOW = 0x3e3e48;
      const RIVET        = 0x222230;
      this.body
        .rect(0, 0, w, h).fill(STEEL_BODY)
        .rect(0, 0, w, 1).fill(STEEL_LIGHT)
        .rect(0, 0, 1, h).fill(STEEL_LIGHT)
        .rect(0, h - 1, w, 1).fill(STEEL_SHADOW)
        .rect(w - 1, 0, 1, h).fill(STEEL_SHADOW)
        .rect(2, Math.floor(h / 2) - 1, w - 4, 2).fill(STEEL_SHADOW)
        .rect(2, 2, 2, 2).fill(RIVET)
        .rect(w - 4, 2, 2, 2).fill(RIVET)
        .rect(2, h - 4, 2, 2).fill(RIVET)
        .rect(w - 4, h - 4, 2, 2).fill(RIVET);
    } else {
      // Wood crate exterior. Fluid kinds get a small color stamp center.
      this.body
        .rect(0, 0, w, h).fill(WOOD_BODY)
        .rect(0, 0, w, 1).fill(WOOD_ACCENT)
        .rect(0, 0, 1, h).fill(WOOD_ACCENT)
        .rect(0, h - 1, w, 1).fill(0x5a3a1d)
        .rect(w - 1, 0, 1, h).fill(0x5a3a1d)
        .rect(0, Math.floor(h / 2), w, 1).fill(0x6e4823);
      if (this.kind !== 'Crate' && this.fluidVolume > 0) {
        const sw = 4;
        this.body
          .rect((w - sw) / 2, (h - sw) / 2, sw, sw)
          .fill({ color: this.spec.fluidColor, alpha: 1 });
      }
    }

    this.container.addChild(this.body);
  }

  /**
   * Texture used for shatter chunks — the loaded sprite slice if available,
   * else null (PropShatterManager falls back to solid-color chunks).
   */
  getShatterTexture(): Texture | null {
    return SLICE_TEXTURES[sliceKeyForKind(this.kind, this.variantIdx)] ?? null;
  }
  /** Primary debris color — wood brown for wood family, steel for metal. */
  getShatterColor(): number {
    return this.kind === 'MetalCrate' ? 0x7a7a88 : WOOD_BODY;
  }
  getShatterAccent(): number {
    return this.kind === 'MetalCrate' ? 0xb0b0c0 : WOOD_ACCENT;
  }

  /**
   * Swap the Graphics fallback out for the atlas Sprite once textures load.
   * Adds the fluid color stamp overlay for fluid-bearing wood crates.
   */
  private applySprite(tex: Texture): void {
    if (this.spriteLoaded) return;
    this.spriteLoaded = true;
    this.container.removeChildren();
    const sprite = new Sprite(tex);
    sprite.x = 0;
    sprite.y = 0;
    this.container.addChild(sprite);
    if (this.kind !== 'Crate' && this.kind !== 'MetalCrate' && this.fluidVolume > 0) {
      const stampW = 8;
      const stamp = new Graphics();
      stamp
        .rect((this.spec.width - stampW) / 2, (this.spec.height - stampW) / 2, stampW, stampW)
        .fill({ color: this.spec.fluidColor, alpha: 0.95 });
      this.container.addChild(stamp);
    }
    this.body = new Graphics(); // unused placeholder for type safety
    this.container.addChild(this.chargeGfx);
  }

  private updateChargeVisual(dtMs: number): void {
    if (this.chargedRemainingMs > 0) {
      this.chargedRemainingMs = Math.max(0, this.chargedRemainingMs - dtMs);
    }
    this.chargeGfx.clear();
    if (!this.isCharged()) return;
    const phase = Date.now() * 0.018;
    const alpha = 0.42 + Math.sin(phase) * 0.18;
    this.chargeGfx
      .rect(-1, -1, this.spec.width + 2, this.spec.height + 2)
      .stroke({ color: 0xffee55, alpha, width: 2 });
    const y1 = 4 + (Math.sin(phase * 1.7) + 1) * 10;
    const y2 = 5 + (Math.cos(phase * 1.3) + 1) * 9;
    this.chargeGfx
      .moveTo(3, y1).lineTo(9, y1 - 4).lineTo(7, y1 + 3).lineTo(14, y1 - 2)
      .stroke({ color: 0xffffff, alpha: 0.7, width: 1 })
      .moveTo(this.spec.width - 4, y2).lineTo(this.spec.width - 10, y2 + 4).lineTo(this.spec.width - 8, y2 - 3).lineTo(this.spec.width - 15, y2 + 2)
      .stroke({ color: 0xfff28a, alpha: 0.75, width: 1 });
  }

  /**
   * Per-frame environmental tick. Per kind:
   *   MetalCrate  — acid only (1 HP/s × 4 HP = 4 s to dissolve).
   *   Wood family — magma 1.5 s / fire (burning cell overlay) 1.5 s /
   *                 acid 3 s. On threshold, instantly destroys (HP 1) and
   *                 returns impact coords so the scene can paint fluid.
   * Returns {gx, gy} impact when destroyed this tick, else null.
   */
  tickEnvironment(
    dtMs: number,
    env: {
      isAcidCell:  (gx: number, gy: number) => boolean;
      isMagmaCell: (gx: number, gy: number) => boolean;
      isFireCell:  (gx: number, gy: number) => boolean;
      /** R-NEW-049/052: water 셀 인접 검사. 미제공 시 false. */
      isWaterCell?: (gx: number, gy: number) => boolean;
      /** R-NEW-050/053: oil 셀 인접 검사. 미제공 시 false. */
      isOilCell?: (gx: number, gy: number) => boolean;
      /** R-NEW-051/054: frozen 또는 ice 셀 검사. Brittle/Preserve 분기. */
      isFrozenOrIceCell?: (gx: number, gy: number) => boolean;
      /** Charged hazard cell. MetalCrate becomes an electrified conductor. */
      isChargedCell?: (gx: number, gy: number) => boolean;
    },
  ): { gx: number; gy: number } | null {
    if (this.destroyed || this.held) return null;
    const lx = Math.floor(this.colX / 16);
    const rx = Math.floor((this.colX + this.colW - 1) / 16);
    const ty = Math.floor(this.colY / 16);
    const by = Math.floor((this.colY + this.colH - 1) / 16);
    let inAcid = false, inMagma = false, inFire = false;
    let inWater = false, inOil = false, inFrozenOrIce = false, inCharged = false;
    for (let gy = ty; gy <= by; gy++) {
      for (let gx = lx; gx <= rx; gx++) {
        if (!inAcid  && env.isAcidCell (gx, gy)) inAcid  = true;
        if (!inMagma && env.isMagmaCell(gx, gy)) inMagma = true;
        if (!inFire  && env.isFireCell (gx, gy)) inFire  = true;
        if (!inWater && env.isWaterCell?.(gx, gy)) inWater = true;
        if (!inOil   && env.isOilCell?.(gx, gy))   inOil   = true;
        if (!inFrozenOrIce && env.isFrozenOrIceCell?.(gx, gy)) inFrozenOrIce = true;
        if (!inCharged && env.isChargedCell?.(gx, gy)) inCharged = true;
      }
    }

    // R-NEW-051 Frozen Crate (Wood family) / R-NEW-054 Brittle (MetalCrate):
    // ice/frozen 위에 있으면 모든 환경 노출 정지. Wood family = 영구 면역;
    // MetalCrate = Brittle 처리는 takeAttack 측 검사 (외부 Physical attack 시).
    if (inFrozenOrIce) {
      this.acidExposureMs = 0;
      this.magmaExposureMs = 0;
      this.fireExposureMs = 0;
      this.waterExposureMs = 0;
      return null;
    }

    if (this.kind === 'MetalCrate') {
      // Acid corrosion: 1 HP/s × 4 HP = 4 s.
      // R-NEW-053 Coated Metal: oil 위면 acid 부식 50% 감속 (1 HP/2s).
      // Magma melt:    2 HP/s × 4 HP = 2 s — molten heat liquefies steel.
      // R-NEW-052 Slowly Rusting: water 위 30 s → 1 HP (장기 압박).
      const acidTickMs = inOil ? 2000 : 1000;
      if (!inAcid)  this.acidExposureMs  = 0;
      if (!inMagma) this.magmaExposureMs = 0;
      if (!inWater) this.waterExposureMs = 0;
      if (inCharged) this.applyCharge();
      if (inAcid) {
        this.acidExposureMs += dtMs;
        while (this.acidExposureMs >= acidTickMs) {
          this.acidExposureMs -= acidTickMs;
          const impact = this.takeAttack(1);
          if (impact) return impact;
        }
      }
      if (inMagma) {
        this.magmaExposureMs += dtMs;
        while (this.magmaExposureMs >= 500) {
          this.magmaExposureMs -= 500;
          const impact = this.takeAttack(1);
          if (impact) return impact;
        }
      }
      if (inWater) {
        this.waterExposureMs += dtMs;
        while (this.waterExposureMs >= 30000) {
          this.waterExposureMs -= 30000;
          const impact = this.takeAttack(1);
          if (impact) return impact;
        }
      }
      return null;
    }
    // Wood family
    // R-NEW-049 Waterlogged Crate: water 위면 fire 노출 카운터 정지 (immune).
    // R-NEW-050 Oil-Soaked Crate: oil 위면 fire threshold 1.5s → 0.5s.
    const fireThresholdMs = inOil ? 500 : 1500;
    if (inMagma) {
      this.magmaExposureMs += dtMs;
      if (this.magmaExposureMs >= 1500) return this.takeAttack(this.hp);
    } else this.magmaExposureMs = 0;
    if (inFire && !inWater) {
      this.fireExposureMs += dtMs;
      if (this.fireExposureMs >= fireThresholdMs) return this.takeAttack(this.hp);
    } else this.fireExposureMs = 0;
    if (inAcid) {
      this.acidExposureMs += dtMs;
      if (this.acidExposureMs >= 3000) return this.takeAttack(this.hp);
    } else this.acidExposureMs = 0;
    return null;
  }

  /**
   * R-NEW-054 Brittle Crate hook — MetalCrate 가 frozen/ice 셀 위에 있을 때
   * Physical attack 1 hit 면 즉파. 호출처 (Scene 측 sword swing → container hit)
   * 가 `mutator.isFrozen / cell value` 검사 후 본 메서드 호출.
   * Wood family 는 이미 검 1 hit 면 깨지므로 본 hook 은 MetalCrate 전용.
   */
  shatterBrittle(): { gx: number; gy: number } | null {
    if (this.destroyed || this.held) return null;
    if (this.kind !== 'MetalCrate') return null;
    this.hp = 0;
    this.destroyed = true;
    return {
      gx: Math.floor((this.colX + this.colW / 2) / 16),
      gy: Math.floor((this.colY + this.colH / 2) / 16),
    };
  }
}
