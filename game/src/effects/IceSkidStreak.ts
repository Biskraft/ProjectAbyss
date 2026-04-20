import { Container, Graphics } from 'pixi.js';

/**
 * Ice skid streak — bluish skid mark + tiny shards that linger briefly behind
 * the player's feet while sliding on ice. Manager throttles emission via
 * emit(dt, onIce, footX, footY, vx).
 */

interface Streak {
  gfx: Graphics;
  life: number;
  maxLife: number;
}

const LIFE = 420;
const SPAWN_INTERVAL = 60;
const COLOR_LIGHT = 0xd0ecff;
const COLOR_MID = 0x7bb6da;

export class IceSkidStreakManager {
  private parent: Container;
  private streaks: Streak[] = [];
  // Per-entity timer keyed by caller. 'default' 은 기존 플레이어 단일 emitter 호환.
  private timers: Map<string, number> = new Map();

  constructor(parent: Container) { this.parent = parent; }

  emit(dt: number, onIce: boolean, footX: number, footY: number, vx: number, key = 'default'): void {
    if (!onIce || Math.abs(vx) < 20) {
      this.timers.set(key, 0);
      return;
    }
    let t = (this.timers.get(key) ?? 0) - dt;
    if (t > 0) {
      this.timers.set(key, t);
      return;
    }
    t = SPAWN_INTERVAL;
    this.timers.set(key, t);

    const gfx = new Graphics();
    const len = Math.min(18, 4 + Math.abs(vx) * 0.03);
    const dir = vx >= 0 ? -1 : 1; // streak lags behind motion
    gfx.rect(0, -1.5, len * dir, 3).fill({ color: COLOR_MID, alpha: 0.75 });
    gfx.rect(0, -0.5, len * dir, 1).fill({ color: COLOR_LIGHT, alpha: 0.9 });
    // Tiny ice shard flick
    const shardX = (Math.random() * 0.6 + 0.2) * len * dir;
    gfx.rect(shardX, -3.5, 1, 1).fill({ color: 0xffffff, alpha: 1 });
    gfx.x = footX;
    gfx.y = footY - 1;
    this.parent.addChild(gfx);
    this.streaks.push({ gfx, life: LIFE, maxLife: LIFE });
  }

  update(dt: number): void {
    for (let i = this.streaks.length - 1; i >= 0; i--) {
      const s = this.streaks[i];
      s.life -= dt;
      const t = Math.max(0, s.life / s.maxLife);
      s.gfx.alpha = t;
      if (s.life <= 0) {
        if (s.gfx.parent) s.gfx.parent.removeChild(s.gfx);
        s.gfx.destroy();
        this.streaks.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const s of this.streaks) {
      if (s.gfx.parent) s.gfx.parent.removeChild(s.gfx);
      s.gfx.destroy();
    }
    this.streaks.length = 0;
    this.timers.clear();
  }

  forgetKey(key: string): void {
    this.timers.delete(key);
  }
}
