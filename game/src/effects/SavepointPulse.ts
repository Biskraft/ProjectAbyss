import { Container, Graphics } from 'pixi.js';

/**
 * Savepoint pulse — soft breathing aura that attaches to a savepoint marker.
 * Unlike one-shot bursts, this effect is persistent: call `attach(x, y)` when
 * a savepoint becomes active, `detach()` when leaving its zone. `pulse(x, y)`
 * adds an extra shockwave ring each time the player actually saves.
 */

interface PulseRing {
  gfx: Graphics;
  life: number;
  maxLife: number;
  startR: number;
  endR: number;
}

const AURA_BASE_R = 30;
const AURA_AMP = 6;
const AURA_PERIOD = 1400; // ms per breath cycle
const PULSE_LIFE = 520;
const COLOR = 0xa8e9ff;

export class SavepointPulseManager {
  private parent: Container;
  private aura: Graphics | null = null;
  private auraX = 0;
  private auraY = 0;
  private auraT = 0;
  private pulses: PulseRing[] = [];

  constructor(parent: Container) { this.parent = parent; }

  attach(x: number, y: number): void {
    this.detach();
    this.aura = new Graphics();
    this.aura.x = x; this.aura.y = y;
    this.auraX = x; this.auraY = y;
    this.auraT = 0;
    this.parent.addChild(this.aura);
  }

  move(x: number, y: number): void {
    this.auraX = x;
    this.auraY = y;
    if (this.aura) { this.aura.x = x; this.aura.y = y; }
  }

  detach(): void {
    if (this.aura) {
      if (this.aura.parent) this.aura.parent.removeChild(this.aura);
      this.aura.destroy();
      this.aura = null;
    }
  }

  pulse(x: number, y: number): void {
    const gfx = new Graphics();
    gfx.x = x; gfx.y = y;
    this.parent.addChild(gfx);
    this.pulses.push({ gfx, life: PULSE_LIFE, maxLife: PULSE_LIFE, startR: 8, endR: 72 });
    // double ring
    const gfx2 = new Graphics();
    gfx2.x = x; gfx2.y = y;
    this.parent.addChild(gfx2);
    this.pulses.push({ gfx: gfx2, life: PULSE_LIFE * 0.8, maxLife: PULSE_LIFE, startR: 4, endR: 52 });
  }

  update(dt: number): void {
    if (this.aura) {
      this.auraT += dt;
      const phase = (this.auraT % AURA_PERIOD) / AURA_PERIOD;
      const breath = Math.sin(phase * Math.PI * 2) * 0.5 + 0.5;
      const radius = AURA_BASE_R + breath * AURA_AMP;
      this.aura.clear();
      this.aura.ellipse(0, 0, radius, radius * 0.35).fill({ color: COLOR, alpha: 0.12 + breath * 0.12 });
      this.aura.ellipse(0, 0, radius, radius * 0.35).stroke({ color: COLOR, width: 1.5, alpha: 0.45 + breath * 0.3 });
      // small central dot
      this.aura.circle(0, 0, 2).fill({ color: 0xffffff, alpha: 0.9 });
    }

    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const p = this.pulses[i];
      p.life -= dt;
      const k = 1 - Math.max(0, p.life / p.maxLife);
      const radius = p.startR + (p.endR - p.startR) * k;
      const alpha = Math.max(0, 1 - k);
      p.gfx.clear();
      p.gfx.circle(0, 0, radius).stroke({ color: COLOR, width: 2, alpha });
      if (p.life <= 0) {
        if (p.gfx.parent) p.gfx.parent.removeChild(p.gfx);
        p.gfx.destroy();
        this.pulses.splice(i, 1);
      }
    }
  }

  clear(): void {
    this.detach();
    for (const p of this.pulses) {
      if (p.gfx.parent) p.gfx.parent.removeChild(p.gfx);
      p.gfx.destroy();
    }
    this.pulses.length = 0;
  }
}
