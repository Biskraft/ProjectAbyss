import { Graphics, type Container } from 'pixi.js';

interface CaptureOrb {
  gfx: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

interface ItemWorldCaptureOrbRuntimeOptions {
  getEntityLayer: () => Container;
  getTargetCenter: () => { x: number; y: number };
  flashOnArrival: () => void;
}

const CAPTURE_ORB_LIFE_MS = 520;

export class ItemWorldCaptureOrbRuntime {
  private orbs: CaptureOrb[] = [];

  constructor(private readonly options: ItemWorldCaptureOrbRuntimeOptions) {}

  spawn(x: number, y: number): void {
    const gfx = new Graphics();
    gfx.circle(0, 0, 5).fill({ color: 0x88ddff, alpha: 0.35 });
    gfx.circle(0, 0, 3).fill({ color: 0xffffff, alpha: 0.9 });
    gfx.x = x;
    gfx.y = y;
    this.options.getEntityLayer().addChild(gfx);
    this.orbs.push({
      gfx,
      x,
      y,
      vx: 0,
      vy: -40,
      life: CAPTURE_ORB_LIFE_MS,
      maxLife: CAPTURE_ORB_LIFE_MS,
    });
  }

  update(dt: number): void {
    if (this.orbs.length === 0) return;

    const dtSec = dt / 1000;
    const target = this.options.getTargetCenter();

    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const orb = this.orbs[i];
      orb.life -= dt;
      const k = Math.max(0, orb.life / orb.maxLife);
      const homeBlend = 1 - k;
      const dx = target.x - orb.x;
      const dy = target.y - orb.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const homeSpeed = 240 * homeBlend;
      orb.vx = orb.vx * 0.9 + (dx / dist) * homeSpeed * homeBlend;
      orb.vy = orb.vy * 0.9 + (dy / dist) * homeSpeed * homeBlend - 30 * k;
      orb.x += orb.vx * dtSec;
      orb.y += orb.vy * dtSec;
      orb.gfx.x = orb.x;
      orb.gfx.y = orb.y;
      const scale = 0.6 + k * 0.4;
      orb.gfx.scale.set(scale);
      orb.gfx.alpha = k > 0.1 ? 1 : k / 0.1;
      if (orb.life <= 0 || dist < 6) {
        this.options.flashOnArrival();
        this.destroyOrb(i);
      }
    }
  }

  clear(): void {
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      this.destroyOrb(i);
    }
  }

  private destroyOrb(index: number): void {
    const orb = this.orbs[index];
    if (!orb) return;
    if (orb.gfx.parent) orb.gfx.parent.removeChild(orb.gfx);
    orb.gfx.destroy();
    this.orbs.splice(index, 1);
  }
}
