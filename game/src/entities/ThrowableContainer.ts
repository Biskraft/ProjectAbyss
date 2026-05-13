import { Container, Graphics } from 'pixi.js';

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
}

// All containers share the WOOD crate exterior (placeholder until art lands).
// Per-kind variation is communicated by the colored fluid window inside.
const WOOD_BODY    = 0x8b5a2b;
const WOOD_ACCENT  = 0xc28b50;

const CATALOG: Record<ContainerKind, ContainerSpec> = {
  // Uniform 16×16 wood crate exterior. The fluid stays INSIDE the box —
  // not visible as a leaking window. Only a small sealed stamp in the
  // center hints at the contents (placeholder until art swap).
  Crate:         { width: 16, height: 16, hp: 1, paintTile: 0,  defaultFluidVolume: 0, fluidColor: WOOD_BODY },
  // Steel crate — sturdier (hp 4) and corrodes in acid over ~4 s exposure.
  MetalCrate:    { width: 16, height: 16, hp: 4, paintTile: 0,  defaultFluidVolume: 0, fluidColor: 0xa0a0b0 },
  OilDrum:       { width: 16, height: 16, hp: 1, paintTile: 11, defaultFluidVolume: 6, fluidColor: 0x4d2e14 },
  WaterBarrel:   { width: 16, height: 16, hp: 1, paintTile: 2,  defaultFluidVolume: 6, fluidColor: 0x4076c8 },
  MagmaCrucible: { width: 16, height: 16, hp: 1, paintTile: 6,  defaultFluidVolume: 4, fluidColor: 0xff6633 },
  AcidVial:      { width: 16, height: 16, hp: 1, paintTile: 13, defaultFluidVolume: 4, fluidColor: 0x88cc44 },
};

const KIND_LIST: ContainerKind[] = ['Crate', 'MetalCrate', 'OilDrum', 'WaterBarrel', 'MagmaCrucible', 'AcidVial'];

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
  /** Time spent in acid (MetalCrate only). 1 HP per second of contact. */
  acidExposureMs = 0;
  readonly container = new Container();
  private body!: Graphics;

  constructor(kind: ContainerKind, x: number, y: number, fluidVolumeOverride?: number) {
    this.kind = kind;
    this.spec = CATALOG[kind];
    this.x = x;
    this.y = y;
    this.hp = this.spec.hp;
    this.fluidVolume = fluidVolumeOverride !== undefined && fluidVolumeOverride >= 0
      ? Math.floor(fluidVolumeOverride)
      : this.spec.defaultFluidVolume;
    this.container.x = x;
    this.container.y = y;
    this.draw();
  }

  get width(): number { return this.spec.width; }
  get height(): number { return this.spec.height; }

  /** AABB used by both grab range and impact collision. */
  getAABB(): { x: number; y: number; w: number; h: number } {
    return { x: this.x, y: this.y, w: this.spec.width, h: this.spec.height };
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
      return null;
    }
    const dt = dtMs / 1000;
    // ── Combined solid check: grid cell OR another container occupying
    // the cell. Treats containers as part of the world for stacking +
    // collision purposes.
    const cellBlockedBy = (gx: number, gy: number): ThrowableContainer | null => {
      const cellPx = gx * 16, cellPy = gy * 16;
      for (const o of others) {
        if (o === this || o.destroyed || o.held) continue;
        if (o.x < cellPx + 16 && o.x + o.spec.width > cellPx &&
            o.y < cellPy + 16 && o.y + o.spec.height > cellPy) return o;
      }
      return null;
    };
    const isBlocked = (gx: number, gy: number): boolean => {
      if (isSolidAt(gx, gy)) return true;
      return cellBlockedBy(gx, gy) !== null;
    };

    // ── Grounded check (grid floor OR another container's top).
    const feetY = this.y + this.spec.height;
    const feetGy = Math.floor(feetY / 16);
    const leftGx = Math.floor(this.x / 16);
    const rightGx = Math.floor((this.x + this.spec.width - 1) / 16);
    let grounded = false;
    for (let gx = leftGx; gx <= rightGx; gx++) {
      if (isBlocked(gx, feetGy)) { grounded = true; break; }
    }
    if (grounded && this.vy >= 0) {
      // Snap to whichever floor is highest (smallest y) under our feet.
      let snapY = feetGy * 16 - this.spec.height; // grid floor candidate
      for (const o of others) {
        if (o === this || o.destroyed || o.held) continue;
        if (this.x + this.spec.width <= o.x || this.x >= o.x + o.spec.width) continue;
        const candidate = o.y - this.spec.height;
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

    // Corner-cell check. Only DESTROY if this is a thrown container that
    // hit a solid cell — gravity-only contact stops at the snap step
    // above. If a thrown container hits another container, it bounces
    // back lightly instead of breaking on it.
    const checks: Array<[number, number]> = [
      [nx, ny + this.spec.height - 1],
      [nx + this.spec.width - 1, ny + this.spec.height - 1],
      [nx, ny],
      [nx + this.spec.width - 1, ny],
    ];
    for (const [cx, cy] of checks) {
      const gx = Math.floor(cx / 16);
      const gy = Math.floor(cy / 16);
      if (isSolidAt(gx, gy)) {
        // Containers are kinetically indestructible. Throws bounce/stop on
        // walls but never shatter — only `takeAttack` (external damage) can
        // destroy them. This keeps "stack a wall of crates" gameplay viable.
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
    const leftGx = Math.floor(this.x / 16);
    const rightGx = Math.floor((this.x + this.spec.width - 1) / 16);
    let bestY = this.y;
    // Scan down 1px at a time until ANY corner overlaps a solid cell or
    // another container. Set this.y to the position just above the obstacle.
    for (let dy = 0; dy <= maxDropPx; dy++) {
      const testY = this.y + dy;
      const feetY = testY + this.spec.height;
      const feetGy = Math.floor(feetY / 16);
      let blocked = false;
      for (let gx = leftGx; gx <= rightGx; gx++) {
        if (isSolidAt(gx, feetGy)) { blocked = true; break; }
      }
      if (!blocked) {
        for (const o of others) {
          if (o === this || o.destroyed || o.held) continue;
          if (this.x + this.spec.width <= o.x) continue;
          if (this.x >= o.x + o.spec.width) continue;
          if (feetY > o.y && feetY <= o.y + o.spec.height) { blocked = true; break; }
          if (testY < o.y + o.spec.height && testY + this.spec.height > o.y) { blocked = true; break; }
        }
      }
      if (blocked) {
        bestY = testY - 1;
        // Snap to cell-aligned floor when stopped by grid (cleaner stack).
        const feetGy = Math.floor((bestY + this.spec.height) / 16);
        for (let gx = leftGx; gx <= rightGx; gx++) {
          if (isSolidAt(gx, feetGy)) {
            bestY = feetGy * 16 - this.spec.height;
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
   *  containers shatter on solid contact. */
  release(vx: number, vy: number): void {
    this.held = false;
    this.wasThrown = true;
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
        gx: Math.floor((this.x + this.spec.width / 2) / 16),
        gy: Math.floor((this.y + this.spec.height / 2) / 16),
      };
    }
    return null;
  }

  destroy(): void {
    this.destroyed = true;
    if (this.container.parent) this.container.parent.removeChild(this.container);
    this.container.destroy({ children: true });
  }

  private draw(): void {
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
   * Per-frame environmental tick — currently handles acid corrosion for
   * MetalCrate. Returns true if the container was destroyed this tick.
   * Caller must still splice + destroy on the returned true.
   */
  tickEnvironment(
    dtMs: number,
    isAcidCell: (gx: number, gy: number) => boolean,
  ): boolean {
    if (this.destroyed || this.held) return false;
    if (this.kind !== 'MetalCrate') return false;
    const lx = Math.floor(this.x / 16);
    const rx = Math.floor((this.x + this.spec.width - 1) / 16);
    const ty = Math.floor(this.y / 16);
    const by = Math.floor((this.y + this.spec.height - 1) / 16);
    let inAcid = false;
    for (let gy = ty; gy <= by && !inAcid; gy++) {
      for (let gx = lx; gx <= rx; gx++) {
        if (isAcidCell(gx, gy)) { inAcid = true; break; }
      }
    }
    if (!inAcid) { this.acidExposureMs = 0; return false; }
    this.acidExposureMs += dtMs;
    while (this.acidExposureMs >= 1000) {
      this.acidExposureMs -= 1000;
      const impact = this.takeAttack(1);
      if (impact) return true;
    }
    return false;
  }
}
