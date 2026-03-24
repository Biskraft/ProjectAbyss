import { Container, Graphics, BitmapText } from 'pixi.js';
import { PIXEL_FONT } from '@ui/fonts';
import type { Rarity } from '@data/weapons';
import type { ItemInstance } from '@items/ItemInstance';
import { RARITY_COLOR } from '@items/ItemInstance';

export const PORTAL_COLOR: Record<Rarity, number> = {
  normal: 0xffffff,
  magic: 0x6969ff,
  rare: 0xffff00,
  legendary: 0xff8000,
  ancient: 0x00ff00,
};

const PORTAL_SIZE: Record<Rarity, number> = {
  normal: 20,
  magic: 24,
  rare: 28,
  legendary: 32,
  ancient: 36,
};

const PARTICLE_COUNT: Record<Rarity, number> = {
  normal: 5,
  magic: 8,
  rare: 12,
  legendary: 16,
  ancient: 24,
};

const PULSE_SPEED: Record<Rarity, number> = {
  normal: 1.5,
  magic: 2.0,
  rare: 2.5,
  legendary: 3.0,
  ancient: 4.0,
};

const SPAWN_HITSTOP: Record<Rarity, number> = {
  normal: 0,
  magic: 3,
  rare: 6,
  legendary: 9,
  ancient: 12,
};

const SPAWN_SHAKE: Record<Rarity, number> = {
  normal: 1,
  magic: 2,
  rare: 3,
  legendary: 5,
  ancient: 8,
};

export type PortalSourceType = 'monster' | 'altar';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export class Portal {
  container: Container;
  x: number;
  y: number;
  width = 24;
  height = 32;
  rarity: Rarity;
  sourceType: PortalSourceType;
  sourceItem?: ItemInstance;

  private portalGfx: Graphics;
  private particleGfx: Graphics;
  private hintText: BitmapText;
  private particles: Particle[] = [];
  private timer = 0;
  private baseSize: number;
  private pulseSpeed: number;
  private particleCount: number;
  private showHint = false;

  // Spawn effect
  readonly spawnHitstop: number;
  readonly spawnShake: number;

  constructor(x: number, y: number, rarity: Rarity, sourceType: PortalSourceType, sourceItem?: ItemInstance) {
    this.x = x;
    this.y = y;
    this.rarity = rarity;
    this.sourceType = sourceType;
    this.sourceItem = sourceItem;

    this.baseSize = PORTAL_SIZE[rarity];
    this.pulseSpeed = PULSE_SPEED[rarity];
    this.particleCount = PARTICLE_COUNT[rarity];
    this.spawnHitstop = SPAWN_HITSTOP[rarity];
    this.spawnShake = SPAWN_SHAKE[rarity];

    this.container = new Container();

    this.portalGfx = new Graphics();
    this.container.addChild(this.portalGfx);

    this.particleGfx = new Graphics();
    this.container.addChild(this.particleGfx);

    this.hintText = new BitmapText({ text: 'UP: Enter', style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xffffff } });
    this.hintText.anchor.set(0.5);
    this.hintText.y = -this.baseSize / 2 - 12;
    this.hintText.visible = false;
    this.container.addChild(this.hintText);

    this.container.x = this.x;
    this.container.y = this.y;
  }

  setShowHint(show: boolean): void {
    if (this.showHint !== show) {
      this.showHint = show;
      this.hintText.visible = show;
    }
  }

  update(dt: number): void {
    this.timer += dt;
    const dtSec = dt / 1000;
    const t = this.timer / 1000;

    // Pulse
    const pulse = 1 + Math.sin(t * this.pulseSpeed * Math.PI * 2) * 0.15;
    const size = this.baseSize * pulse;
    const color = PORTAL_COLOR[this.rarity];

    // Draw portal (ellipse with dark outline)
    this.portalGfx.clear();
    // Dark outline
    this.portalGfx.ellipse(0, 0, size / 2 + 2, size / 1.4 + 2).fill(0x000000);
    // Main ellipse
    this.portalGfx.ellipse(0, 0, size / 2, size / 1.4).fill({ color, alpha: 0.7 });
    // Inner bright core
    this.portalGfx.ellipse(0, 0, size / 4, size / 2.8).fill({ color: 0xffffff, alpha: 0.3 });

    // Spawn particles
    while (this.particles.length < this.particleCount) {
      this.spawnParticle();
    }

    // Update particles
    this.particleGfx.clear();
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.life -= dt;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      const alpha = Math.max(0, p.life / p.maxLife);
      // Dark outline then bright core (Sakurai pop principle)
      this.particleGfx.rect(p.x - p.size / 2 - 0.5, p.y - p.size / 2 - 0.5, p.size + 1, p.size + 1)
        .fill({ color: 0x000000, alpha: alpha * 0.5 });
      this.particleGfx.rect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
        .fill({ color, alpha });
    }

    // Hint text pulse
    if (this.showHint) {
      this.hintText.alpha = 0.7 + Math.sin(t * 3) * 0.3;
    }
  }

  private spawnParticle(): void {
    const angle = Math.random() * Math.PI * 2;
    const dist = this.baseSize / 2 + Math.random() * 8;
    const speed = 15 + Math.random() * 25;
    this.particles.push({
      x: Math.cos(angle) * dist * 0.5,
      y: Math.sin(angle) * dist * 0.3,
      vx: Math.cos(angle) * speed * 0.3,
      vy: -speed * (0.5 + Math.random() * 0.5), // float upward
      life: 600 + Math.random() * 800,
      maxLife: 1400,
      size: 1 + Math.random() * 2,
    });
  }

  /** Check if player AABB overlaps portal */
  overlaps(px: number, py: number, pw: number, ph: number): boolean {
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    return px + pw > this.x - halfW &&
           px < this.x + halfW &&
           py + ph > this.y - halfH &&
           py < this.y + halfH;
  }

  destroy(): void {
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container.destroy({ children: true });
  }
}
