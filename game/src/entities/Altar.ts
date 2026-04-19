/**
 * Altar.ts — Stat-upgrade altar.
 *
 * Playtest 2026-04-17 (A3 / T1): the previous altar was too quiet — players
 * walked past it. This revision adds:
 *   1. Ambient halo ring that pulses continuously (visible even at rest)
 *   2. Rising spark particles from the orb (idle emitter)
 *   3. Symbol prompt (key icon + hammer pictogram, no language text) on approach
 *
 * The symbol prompt is the GDD-sanctioned exception to the dialogue-zero rule
 * (Design_Tutorial_EnvironmentalTeaching §Symbol Prompt).
 */

import { Container, Graphics } from 'pixi.js';
import { KeyPrompt } from '@ui/KeyPrompt';

interface Spark {
  gfx: Graphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

const SPARK_SPAWN_INTERVAL = 180; // ms between idle sparks
const MAX_SPARKS = 8;

export class Altar {
  container: Container;
  x: number;
  y: number;
  width = 24;
  height = 20;

  private hintContainer: Container;
  private showHint = false;
  private timer = 0;
  private gfx: Graphics;
  private halo: Graphics;
  private particleLayer: Container;
  private sparks: Spark[] = [];
  private sparkCooldown = 0;
  used = false; // true after a portal has been spawned from this altar

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;

    this.container = new Container();
    this.container.x = x;
    this.container.y = y;

    // Halo (drawn first so it sits behind the stone)
    this.halo = new Graphics();
    this.container.addChild(this.halo);

    this.gfx = new Graphics();
    this.drawAltar();
    this.container.addChild(this.gfx);

    this.particleLayer = new Container();
    this.container.addChild(this.particleLayer);

    // Symbol prompt: [UP] key icon + hammer pictogram, no language text.
    this.hintContainer = this.buildSymbolPrompt();
    this.hintContainer.visible = false;
    // Anchor prompt so its horizontal center sits above the orb
    this.hintContainer.y = -this.height - 16;
    this.container.addChild(this.hintContainer);
  }

  private drawAltar(): void {
    // Base (stone platform)
    this.gfx.rect(-this.width / 2, -4, this.width, 8).fill(0x555566);
    this.gfx.rect(-this.width / 2, -4, this.width, 8).stroke({ color: 0x333344, width: 1 });
    // Pillar
    this.gfx.rect(-4, -this.height, 8, this.height - 4).fill(0x666677);
    this.gfx.rect(-4, -this.height, 8, this.height - 4).stroke({ color: 0x444455, width: 1 });
    // Top ornament (glowing)
    this.gfx.circle(0, -this.height - 2, 3).fill(0xaaccff);
    this.gfx.circle(0, -this.height - 2, 2).fill(0xffffff);
  }

  /** Build the symbol prompt: [UP] key icon + small hammer pictogram. */
  private buildSymbolPrompt(): Container {
    const c = new Container();

    // Up-arrow key icon (UP key). Using KeyPrompt helper for consistency.
    const keyIcon = KeyPrompt.createKeyIcon('\u2191', 9);
    c.addChild(keyIcon);

    // Hammer pictogram (handle + head), drawn at world scale to match key icon
    const hammer = new Graphics();
    // Handle (diagonal)
    hammer.rect(5, 3, 8, 2).fill(0xc8854a);
    hammer.rect(5, 3, 8, 2).stroke({ color: 0x5a3a1a, width: 1 });
    // Head
    hammer.rect(11, 0, 5, 5).fill(0xcfd6dd);
    hammer.rect(11, 0, 5, 5).stroke({ color: 0x444b55, width: 1 });
    hammer.x = 11;
    hammer.y = 0;
    c.addChild(hammer);

    // Horizontally center the composite above the altar
    c.pivot.x = Math.floor(c.width / 2);

    return c;
  }

  setShowHint(show: boolean): void {
    if (this.showHint !== show) {
      this.showHint = show;
      this.hintContainer.visible = show;
    }
  }

  update(dt: number): void {
    this.timer += dt;
    const t = this.timer / 1000;

    // Orb + ornament gentle glow
    this.gfx.alpha = 0.9 + Math.sin(t * 2) * 0.1;

    // --- Halo pulse (A3 affordance) --------------------------------------
    // A slow outer ring + a faster inner shimmer. Strengthens on approach.
    this.halo.clear();
    const strongMul = this.showHint && !this.used ? 1.6 : 1.0;
    const outerR = 10 + Math.sin(t * 1.5) * 2.5;
    const outerA = (0.18 + Math.sin(t * 1.5) * 0.12) * strongMul;
    const innerR = 6 + Math.sin(t * 3.2) * 1.5;
    const innerA = (0.25 + Math.sin(t * 3.2) * 0.15) * strongMul;
    this.halo
      .circle(0, -this.height - 2, outerR)
      .fill({ color: 0xaaccff, alpha: Math.max(0, outerA) });
    this.halo
      .circle(0, -this.height - 2, innerR)
      .fill({ color: 0xffffff, alpha: Math.max(0, innerA) });

    // --- Spark emitter ---------------------------------------------------
    if (!this.used) {
      this.sparkCooldown -= dt;
      const interval = this.showHint ? SPARK_SPAWN_INTERVAL * 0.4 : SPARK_SPAWN_INTERVAL;
      if (this.sparkCooldown <= 0 && this.sparks.length < MAX_SPARKS) {
        this.sparkCooldown = interval;
        this.spawnSpark();
      }
    }

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= dt;
      s.gfx.x += s.vx * (dt / 16.67);
      s.gfx.y += s.vy * (dt / 16.67);
      s.vy += 0.02 * dt / 16.67; // slight upward decel
      const k = s.life / s.maxLife;
      s.gfx.alpha = Math.max(0, Math.min(1, k));
      if (s.life <= 0) {
        this.particleLayer.removeChild(s.gfx);
        s.gfx.destroy();
        this.sparks.splice(i, 1);
      }
    }

    // --- Approach prompt pulse ------------------------------------------
    if (this.showHint) {
      this.hintContainer.alpha = 0.7 + Math.sin(t * 3) * 0.3;
    }
  }

  private spawnSpark(): void {
    const g = new Graphics();
    const color = Math.random() < 0.3 ? 0xffffff : 0xaaccff;
    g.rect(0, 0, 1, 1).fill(color);
    g.x = (Math.random() - 0.5) * 4;
    g.y = -this.height - 2;
    this.particleLayer.addChild(g);
    const maxLife = 500 + Math.random() * 300;
    this.sparks.push({
      gfx: g,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -0.6 - Math.random() * 0.4,
      life: maxLife,
      maxLife,
    });
  }

  overlaps(px: number, py: number, pw: number, ph: number): boolean {
    const halfW = this.width / 2;
    return px + pw > this.x - halfW &&
           px < this.x + halfW &&
           py + ph > this.y - this.height &&
           py < this.y + 4;
  }

  destroy(): void {
    for (const s of this.sparks) {
      s.gfx.destroy();
    }
    this.sparks = [];
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container.destroy({ children: true });
  }
}
