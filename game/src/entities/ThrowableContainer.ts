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

export type ContainerKind = 'OilDrum' | 'WaterBarrel' | 'MagmaCrucible' | 'AcidVial';

export interface ContainerSpec {
  /** Pixel size of the prop. */
  width: number;
  height: number;
  /** Hit points — number of impacts before breaking. */
  hp: number;
  /** IntGrid value to paint on the surrounding cells when broken. */
  paintTile: number;
  /** Approximate radius (in cells) of the splash paint. */
  paintRadius: number;
  /** Body color for the placeholder Graphics. */
  bodyColor: number;
  /** Rim/highlight accent color. */
  accentColor: number;
}

const CATALOG: Record<ContainerKind, ContainerSpec> = {
  OilDrum:       { width: 14, height: 22, hp: 1, paintTile: 11, paintRadius: 2, bodyColor: 0x4d2e14, accentColor: 0x886633 },
  WaterBarrel:   { width: 14, height: 18, hp: 1, paintTile: 2,  paintRadius: 2, bodyColor: 0x224488, accentColor: 0x6688cc },
  MagmaCrucible: { width: 16, height: 14, hp: 1, paintTile: 6,  paintRadius: 1, bodyColor: 0x882211, accentColor: 0xff6633 },
  AcidVial:      { width: 8,  height: 10, hp: 1, paintTile: 13, paintRadius: 1, bodyColor: 0x447022, accentColor: 0x88cc44 },
};

export function getContainerSpec(kind: ContainerKind): ContainerSpec {
  return CATALOG[kind];
}

export class ThrowableContainer {
  readonly kind: ContainerKind;
  readonly spec: ContainerSpec;
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  hp: number;
  destroyed = false;
  /** True while held by the player — no gravity, follows player. */
  held = false;
  readonly container = new Container();
  private body!: Graphics;

  constructor(kind: ContainerKind, x: number, y: number) {
    this.kind = kind;
    this.spec = CATALOG[kind];
    this.x = x;
    this.y = y;
    this.hp = this.spec.hp;
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
  ): { gx: number; gy: number } | null {
    if (this.held || this.destroyed) {
      this.container.x = this.x;
      this.container.y = this.y;
      return null;
    }
    const dt = dtMs / 1000;
    this.vy += 760 * dt; // gravity
    if (this.vy > 600) this.vy = 600;
    // Substep horizontal + vertical sweep using simple AABB-vs-grid check.
    const stepX = this.vx * dt;
    const stepY = this.vy * dt;
    const nx = this.x + stepX;
    const ny = this.y + stepY;
    // Test the four corners of the new AABB for solid contact.
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
        this.destroyed = true;
        const impactGx = Math.floor((this.x + this.spec.width / 2) / 16);
        const impactGy = Math.floor((this.y + this.spec.height / 2) / 16);
        return { gx: impactGx, gy: impactGy };
      }
    }
    this.x = nx;
    this.y = ny;
    this.container.x = this.x;
    this.container.y = this.y;
    return null;
  }

  /** Set held = true. Caller positions x/y each frame to track player. */
  pickUp(): void { this.held = true; this.vx = 0; this.vy = 0; }

  /** Throw with initial velocity. */
  release(vx: number, vy: number): void {
    this.held = false;
    this.vx = vx;
    this.vy = vy;
  }

  destroy(): void {
    this.destroyed = true;
    if (this.container.parent) this.container.parent.removeChild(this.container);
    this.container.destroy({ children: true });
  }

  private draw(): void {
    this.body = new Graphics();
    const w = this.spec.width, h = this.spec.height;
    const body = this.spec.bodyColor;
    const acc = this.spec.accentColor;
    if (this.kind === 'AcidVial') {
      // Small flask: round bottle + cork
      this.body
        .rect(2, 4, w - 4, h - 4).fill(body)
        .rect(2, 4, w - 4, 1).fill(acc)
        .rect(w / 2 - 1, 0, 2, 4).fill(acc); // cork
    } else if (this.kind === 'MagmaCrucible') {
      // Open-top pot
      this.body
        .rect(0, 2, w, h - 2).fill(body)
        .rect(0, 2, w, 2).fill(acc) // glowing rim
        .rect(2, 4, w - 4, h - 6).fill(body);
    } else {
      // Standard drum/barrel: 3-band cylinder
      this.body
        .rect(0, 1, w, h - 2).fill(body)
        .rect(0, 1, w, 1).fill(acc)
        .rect(0, h - 2, w, 1).fill(acc)
        .rect(0, h / 2 - 1, w, 1).fill(acc);
    }
    this.container.addChild(this.body);
  }
}
