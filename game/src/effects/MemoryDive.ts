/**
 * MemoryDive.ts — Item World entry transition (replaces FloorCollapse).
 *
 * "Diving into a weapon's memory" — the weapon becomes a portal.
 *
 * Timeline (~3s):
 *   Phase 0: ritual     0~400ms    Echo strikes weapon → rarity color shockwave from weapon
 *   Phase 1: dissolve   400~1200ms World fades, rarity-colored cracks radiate from weapon
 *   Phase 2: absorb     1200~2000ms Background tiles get pulled toward weapon, player pulled in
 *   Phase 3: flash      2000~2500ms Rarity color fills screen → palette shift
 *   Phase 4: done       Scene transition
 */

import { Container, Graphics } from 'pixi.js';
import type { Rarity } from '@data/weapons';
import { RARITY_COLOR } from '@items/ItemInstance';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';

export type DivePhase = 'idle' | 'ritual' | 'dissolve' | 'absorb' | 'flash' | 'done';

/**
 * Optional dive tuning. Controls duration tiers driven by Sacred Pickup S7:
 *   diveCount (after incrementDive) ≤ 1 → full 2700ms (default when unset)
 *   diveCount 2-5                        → compressed 800ms
 *   diveCount ≥ 6                        → ultra-compressed 300ms
 *   skipDive true                        → 100ms flash-only bypass
 */
export interface MemoryDiveOptions {
  /** Post-increment dive count for this item (1 = first ever). */
  diveCount?: number;
  /** User setting — bypass ritual/dissolve/absorb; 100ms flash only. */
  skipDive?: boolean;
}

// Default (tier 1) phase timings (ms).
const T_RITUAL_DEFAULT = 400;
const T_DISSOLVE_DEFAULT = 800;  // 400~1200
const T_ABSORB_DEFAULT = 800;    // 1200~2000
const T_FLASH_DEFAULT = 500;     // 2000~2500

interface DiveParticle {
  gfx: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export class MemoryDive {
  readonly container: Container;
  phase: DivePhase = 'idle';
  private timer = 0;

  private weaponX: number;
  private weaponY: number;
  private rarity: Rarity;
  private rarityColor: number;

  // Per-instance phase durations — scaled from defaults based on diveCount/skip.
  private T_RITUAL: number;
  private T_DISSOLVE: number;
  private T_ABSORB: number;
  private T_FLASH: number;
  private skipDive: boolean;

  // Visual layers
  private shockwaveGfx: Graphics;
  private crackGfx: Graphics;
  private overlayGfx: Graphics;
  private particles: DiveParticle[] = [];

  // Callbacks
  onShake: ((intensity: number) => void) | null = null;
  onHitstop: ((frames: number) => void) | null = null;
  onScreenFlash: ((color: number, intensity: number) => void) | null = null;

  get isDone(): boolean { return this.phase === 'done'; }
  get shouldTransition(): boolean { return this.phase === 'done'; }

  constructor(weaponX: number, weaponY: number, rarity: Rarity, options?: MemoryDiveOptions) {
    this.weaponX = weaponX;
    this.weaponY = weaponY;
    this.rarity = rarity;
    this.rarityColor = RARITY_COLOR[rarity];

    const opts = options ?? {};
    this.skipDive = opts.skipDive === true;
    const count = opts.diveCount;

    if (this.skipDive) {
      // Skip mode — only a brief flash fills the screen.
      this.T_RITUAL = 0;
      this.T_DISSOLVE = 0;
      this.T_ABSORB = 0;
      this.T_FLASH = 100;
    } else if (count === undefined || count <= 1) {
      this.T_RITUAL = T_RITUAL_DEFAULT;
      this.T_DISSOLVE = T_DISSOLVE_DEFAULT;
      this.T_ABSORB = T_ABSORB_DEFAULT;
      this.T_FLASH = T_FLASH_DEFAULT;
    } else if (count <= 5) {
      // 800ms tier — proportional split (120 / 240 / 240 / 200).
      this.T_RITUAL = 120;
      this.T_DISSOLVE = 240;
      this.T_ABSORB = 240;
      this.T_FLASH = 200;
    } else {
      // 300ms tier — 50 / 80 / 90 / 80.
      this.T_RITUAL = 50;
      this.T_DISSOLVE = 80;
      this.T_ABSORB = 90;
      this.T_FLASH = 80;
    }

    this.container = new Container();
    this.shockwaveGfx = new Graphics();
    this.crackGfx = new Graphics();
    this.overlayGfx = new Graphics();
    this.container.addChild(this.shockwaveGfx);
    this.container.addChild(this.crackGfx);
    this.container.addChild(this.overlayGfx);
    this.overlayGfx.alpha = 0;
  }

  start(): void {
    if (this.skipDive) {
      // Flash-only: skip directly to flash phase.
      this.phase = 'flash';
      this.timer = 0;
      this.onScreenFlash?.(this.rarityColor, 0.5);
      return;
    }
    this.phase = 'ritual';
    this.timer = 0;
    this.onHitstop?.(8);
    this.onScreenFlash?.(this.rarityColor, 0.5);
  }

  update(dt: number): void {
    if (this.phase === 'idle' || this.phase === 'done') return;
    this.timer += dt;

    // --- Phase 0: Ritual (0~400ms) ---
    if (this.phase === 'ritual') {
      // Expanding shockwave ring from weapon position
      const progress = this.T_RITUAL > 0 ? this.timer / this.T_RITUAL : 1;
      const radius = progress * 120;
      this.shockwaveGfx.clear();
      this.shockwaveGfx.circle(this.weaponX, this.weaponY, radius)
        .stroke({ color: this.rarityColor, width: 3 - progress * 2, alpha: 1 - progress });

      this.onShake?.(2 * progress);

      // Spawn rarity-colored particles from weapon
      if (Math.random() < 0.4) {
        this.spawnParticle(this.weaponX, this.weaponY, 80, true);
      }

      if (this.timer >= this.T_RITUAL) {
        this.phase = 'dissolve';
        this.timer = 0;
        this.shockwaveGfx.clear();
      }
    }

    // --- Phase 1: Dissolve (0~800ms) ---
    else if (this.phase === 'dissolve') {
      const progress = this.T_DISSOLVE > 0 ? this.timer / this.T_DISSOLVE : 1;

      // Rarity-colored cracks radiating from weapon center
      this.crackGfx.clear();
      const numCracks = 8;
      for (let i = 0; i < numCracks; i++) {
        const angle = (i / numCracks) * Math.PI * 2 + progress * 0.3;
        const len = progress * 200;
        const x2 = this.weaponX + Math.cos(angle) * len;
        const y2 = this.weaponY + Math.sin(angle) * len;
        this.crackGfx.moveTo(this.weaponX, this.weaponY)
          .lineTo(x2, y2)
          .stroke({ color: this.rarityColor, width: 2, alpha: 0.8 - progress * 0.3 });
      }

      // World desaturation overlay
      this.overlayGfx.clear();
      this.overlayGfx.rect(0, 0, GAME_WIDTH * 4, GAME_HEIGHT * 4)
        .fill({ color: 0x000000, alpha: progress * 0.5 });
      this.overlayGfx.x = -GAME_WIDTH * 1.5;
      this.overlayGfx.y = -GAME_HEIGHT * 1.5;

      this.onShake?.(3 * progress);

      // More particles
      if (Math.random() < 0.3) {
        this.spawnParticle(
          this.weaponX + (Math.random() - 0.5) * 200,
          this.weaponY + (Math.random() - 0.5) * 200,
          60, false,
        );
      }

      if (this.timer >= this.T_DISSOLVE) {
        this.phase = 'absorb';
        this.timer = 0;
        this.crackGfx.clear();
      }
    }

    // --- Phase 2: Absorb (0~800ms) ---
    else if (this.phase === 'absorb') {
      const progress = this.T_ABSORB > 0 ? this.timer / this.T_ABSORB : 1;

      // Dark overlay with expanding transparent portal hole in center
      this.overlayGfx.clear();
      this.overlayGfx.rect(0, 0, GAME_WIDTH * 4, GAME_HEIGHT * 4)
        .fill({ color: 0x000000, alpha: 0.5 + progress * 0.4 });
      this.overlayGfx.x = -GAME_WIDTH * 1.5;
      this.overlayGfx.y = -GAME_HEIGHT * 1.5;

      // Portal circle — cut black overlay, then fill with semi-transparent rarity color
      const portalRadius = progress * progress * 200; // accelerating growth
      const portalX = this.weaponX - this.overlayGfx.x;
      const portalY = this.weaponY - this.overlayGfx.y;
      this.overlayGfx.circle(portalX, portalY, portalRadius).cut();
      this.overlayGfx.circle(portalX, portalY, portalRadius)
        .fill({ color: this.rarityColor, alpha: 0.25 + progress * 0.15 });

      // Portal rim glow — rarity colored ring at the portal edge
      this.crackGfx.clear();
      if (portalRadius > 5) {
        this.crackGfx.circle(this.weaponX, this.weaponY, portalRadius)
          .stroke({ color: this.rarityColor, width: 2 + progress * 3, alpha: 0.6 + progress * 0.4 });
        // Inner glow ring
        this.crackGfx.circle(this.weaponX, this.weaponY, portalRadius * 0.9)
          .stroke({ color: 0xffffff, width: 1, alpha: 0.3 * (1 - progress) });
      }

      // Converging vortex lines spiraling into portal
      const numLines = 12;
      for (let i = 0; i < numLines; i++) {
        const baseAngle = (i / numLines) * Math.PI * 2;
        const spin = this.timer * 0.004 * (1 + progress); // accelerating spin
        const angle = baseAngle + spin;
        const outerR = 300 * (1 - progress * 0.5);
        const innerR = Math.max(portalRadius * 0.8, 10);
        const ox = this.weaponX + Math.cos(angle) * outerR;
        const oy = this.weaponY + Math.sin(angle) * outerR;
        // Spiral inward — offset inner angle
        const innerAngle = angle + progress * 1.5;
        const ix = this.weaponX + Math.cos(innerAngle) * innerR;
        const iy = this.weaponY + Math.sin(innerAngle) * innerR;
        this.crackGfx.moveTo(ox, oy).lineTo(ix, iy)
          .stroke({ color: this.rarityColor, width: 1 + progress * 2, alpha: 0.3 + progress * 0.5 });
      }

      // Converging particle burst
      if (Math.random() < 0.5) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 100 + Math.random() * 100;
        this.spawnConvergingParticle(
          this.weaponX + Math.cos(angle) * dist,
          this.weaponY + Math.sin(angle) * dist,
        );
      }

      this.onShake?.(5 * progress);

      if (this.timer >= this.T_ABSORB) {
        this.phase = 'flash';
        this.timer = 0;
        this.crackGfx.clear();
        this.onScreenFlash?.(this.rarityColor, 0.8);
        this.onHitstop?.(6);
      }
    }

    // --- Phase 3: Flash (0~500ms) ---
    else if (this.phase === 'flash') {
      const progress = this.T_FLASH > 0 ? this.timer / this.T_FLASH : 1;

      // Full screen rarity color → black
      this.overlayGfx.clear();
      const color = progress < 0.3 ? this.rarityColor : 0x000000;
      const alpha = progress < 0.3 ? (1 - progress / 0.3) * 0.8 : Math.min(1, (progress - 0.3) / 0.7);
      this.overlayGfx.rect(0, 0, GAME_WIDTH * 4, GAME_HEIGHT * 4)
        .fill({ color, alpha });
      this.overlayGfx.x = -GAME_WIDTH * 1.5;
      this.overlayGfx.y = -GAME_HEIGHT * 1.5;

      if (this.timer >= this.T_FLASH) {
        this.phase = 'done';
      }
    }

    // Update particles
    this.updateParticles(dt);
  }

  private spawnParticle(x: number, y: number, speed: number, outward: boolean): void {
    const gfx = new Graphics();
    const size = 2 + Math.random() * 2;
    gfx.rect(-size / 2, -size / 2, size, size).fill(this.rarityColor);
    gfx.x = x;
    gfx.y = y;
    this.container.addChild(gfx);

    const angle = Math.random() * Math.PI * 2;
    const dir = outward ? 1 : -1;
    this.particles.push({
      gfx, x, y,
      vx: Math.cos(angle) * speed * dir,
      vy: Math.sin(angle) * speed * dir,
      life: 600 + Math.random() * 400,
    });
  }

  private spawnConvergingParticle(x: number, y: number): void {
    const gfx = new Graphics();
    const size = 1.5 + Math.random() * 2;
    gfx.rect(-size / 2, -size / 2, size, size).fill(this.rarityColor);
    gfx.x = x;
    gfx.y = y;
    this.container.addChild(gfx);

    // Move toward weapon center
    const dx = this.weaponX - x;
    const dy = this.weaponY - y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const speed = 150 + Math.random() * 100;
    this.particles.push({
      gfx, x, y,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      life: 500 + Math.random() * 300,
    });
  }

  private updateParticles(dt: number): void {
    const dtSec = dt / 1000;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.gfx.x = p.x;
      p.gfx.y = p.y;
      p.gfx.alpha = Math.max(0, p.life / 800);

      if (p.life <= 0) {
        if (p.gfx.parent) p.gfx.parent.removeChild(p.gfx);
        this.particles.splice(i, 1);
      }
    }
  }

  destroy(): void {
    for (const p of this.particles) {
      if (p.gfx.parent) p.gfx.parent.removeChild(p.gfx);
    }
    this.particles = [];
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container.destroy({ children: true });
  }
}
