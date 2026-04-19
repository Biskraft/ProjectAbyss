/**
 * ItemDrop.ts — Drop rate and rarity selection loaded from CSV.
 *
 * SSoT: Sheets/Content_Item_DropRate.csv
 * CSV columns: Pool,Rarity,Weight
 */

import dropCsvText from '../../../Sheets/Content_Item_DropRate.csv?raw';
import { Container, Graphics } from 'pixi.js';
import { PRNG } from '@utils/PRNG';
import { SWORD_DEFS, STARTER_ONLY_IDS, type Rarity } from '@data/weapons';
import { createItem, RARITY_COLOR, type ItemInstance } from './ItemInstance';
import { DROP_CHANCE } from '@data/rarityConfig';

// Parse CSV into weight pools
const POOLS = new Map<string, { rarity: Rarity; weight: number }[]>();
const _dLines = dropCsvText.trim().split('\n');
for (let i = 1; i < _dLines.length; i++) {
  const cols = _dLines[i].split(',');
  if (cols.length < 3) continue;
  const pool = cols[0].trim().toLowerCase();
  if (!POOLS.has(pool)) POOLS.set(pool, []);
  POOLS.get(pool)!.push({
    rarity: cols[1].trim().toLowerCase() as Rarity,
    weight: parseFloat(cols[2]),
  });
}

const RARITY_WEIGHTS = POOLS.get('normal') ?? [];
const GOLDEN_RARITY_WEIGHTS = POOLS.get('golden') ?? [];

/** Roll whether an enemy drops an item, and if so, create it */
export function rollDrop(rng: PRNG): ItemInstance | null {
  if (rng.next() > DROP_CHANCE) return null;
  const roll = rng.next();
  let cumulative = 0;
  let rarity: Rarity = 'normal';
  for (const w of RARITY_WEIGHTS) {
    cumulative += w.weight;
    if (roll < cumulative) { rarity = w.rarity; break; }
  }
  const def = SWORD_DEFS.find(d => d.rarity === rarity && !STARTER_ONLY_IDS.has(d.id))
    ?? SWORD_DEFS.find(d => !STARTER_ONLY_IDS.has(d.id))
    ?? SWORD_DEFS[0];
  return createItem(def, rarity);
}

/** Golden Monster guaranteed drop — always rare or above */
export function rollGoldenDrop(rng: PRNG): ItemInstance {
  const roll = rng.next();
  let cumulative = 0;
  let rarity: Rarity = 'rare';
  for (const w of GOLDEN_RARITY_WEIGHTS) {
    cumulative += w.weight;
    if (roll < cumulative) { rarity = w.rarity; break; }
  }
  const def = SWORD_DEFS.find(d => d.rarity === rarity && !STARTER_ONLY_IDS.has(d.id))
    ?? SWORD_DEFS.find(d => d.rarity === 'rare' && !STARTER_ONLY_IDS.has(d.id))
    ?? SWORD_DEFS[2];
  return createItem(def, rarity);
}

// --- Drop VFX config per rarity ---

interface DropVFX {
  particleColor: number;
  particleCount: number;       // particles per spawn cycle
  spawnInterval: number;       // ms between spawns
  pulseSpeed: number;          // 0 = no pulse
  glowAlpha: number;           // 0 = no glow
  glowRadius: number;
}

// Sacred Pickup §3.2 / §3.11 — per-rarity halo + particle spawn rates.
// Normal keeps a minimal static halo only (no particles); spawnInterval=0 and
// particleCount=0 ensure the particle code path is skipped at runtime while
// the object itself remains non-null so the existing `if (!this.vfx) return;`
// guard still short-circuits only when a rarity has truly no config.
const DROP_VFX: Record<Rarity, DropVFX | null> = {
  normal:    { particleColor: 0xffffff, particleCount: 0, spawnInterval: 0,   pulseSpeed: 0,      glowAlpha: 0.10, glowRadius: 8 },
  magic:     { particleColor: 0x6969ff, particleCount: 1, spawnInterval: 500, pulseSpeed: 0.003,  glowAlpha: 0.20, glowRadius: 12 },
  rare:      { particleColor: 0xffff00, particleCount: 1, spawnInterval: 333, pulseSpeed: 0.003,  glowAlpha: 0.25, glowRadius: 16 },
  legendary: { particleColor: 0xff8000, particleCount: 1, spawnInterval: 250, pulseSpeed: 0.004,  glowAlpha: 0.30, glowRadius: 20 },
  ancient:   { particleColor: 0x00ff00, particleCount: 1, spawnInterval: 166, pulseSpeed: 0.005,  glowAlpha: 0.35, glowRadius: 24 },
};

interface Particle {
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  gfx: Graphics;
}

/** Visual representation of a dropped item on the ground */
export class ItemDropEntity {
  x: number;
  y: number;
  item: ItemInstance;
  container: Container;
  private bobTimer = 0;
  private baseY: number;
  collected = false;

  // VFX
  private vfx: DropVFX | null;
  private particles: Particle[] = [];
  private spawnTimer = 0;
  private pulseTimer = 0;
  private glowGfx: Graphics | null = null;
  private itemGfx: Graphics;

  constructor(x: number, y: number, item: ItemInstance) {
    this.x = x;
    this.y = y;
    this.baseY = y;
    this.item = item;
    this.vfx = DROP_VFX[item.rarity];

    this.container = new Container();
    this.container.x = x;
    this.container.y = y;

    // Glow circle (behind item)
    if (this.vfx && this.vfx.glowAlpha > 0) {
      this.glowGfx = new Graphics();
      this.glowGfx.circle(0, 0, this.vfx.glowRadius)
        .fill({ color: this.vfx.particleColor, alpha: this.vfx.glowAlpha });
      this.container.addChild(this.glowGfx);
    }

    // Item square
    this.itemGfx = new Graphics();
    this.itemGfx.rect(-4, -4, 8, 8).fill(RARITY_COLOR[item.rarity]);
    this.itemGfx.rect(-3, -3, 6, 6).fill({ color: 0xffffff, alpha: 0.4 });
    this.container.addChild(this.itemGfx);

    // Randomize timers
    this.spawnTimer = Math.random() * (this.vfx?.spawnInterval ?? 1000);
    this.pulseTimer = Math.random() * 2000;
  }

  update(dt: number): void {
    // Bob up and down
    this.bobTimer += dt * 0.003;
    this.container.y = this.baseY + Math.sin(this.bobTimer) * 3;

    if (!this.vfx) return;

    // Pulse scale
    if (this.vfx.pulseSpeed > 0) {
      this.pulseTimer += dt;
      const scale = 1.0 + Math.sin(this.pulseTimer * this.vfx.pulseSpeed) * 0.15;
      this.itemGfx.scale.set(scale);
      if (this.glowGfx) {
        this.glowGfx.alpha = this.vfx.glowAlpha * (0.6 + Math.sin(this.pulseTimer * this.vfx.pulseSpeed * 1.5) * 0.4);
      }
    }

    // Spawn particles — skip entirely when particleCount or spawnInterval is 0
    // (normal rarity: static halo only, no particles).
    if (this.vfx.particleCount > 0 && this.vfx.spawnInterval > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = this.vfx.spawnInterval;
        for (let i = 0; i < this.vfx.particleCount; i++) {
          this.spawnParticle();
        }
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.y += p.vy * (dt / 1000);
      p.gfx.x = p.x;
      p.gfx.y = p.y;
      p.gfx.alpha = Math.max(0, p.life / p.maxLife) * 0.7;

      if (p.life <= 0) {
        if (p.gfx.parent) p.gfx.parent.removeChild(p.gfx);
        this.particles.splice(i, 1);
      }
    }
  }

  private spawnParticle(): void {
    if (!this.vfx) return;
    const gfx = new Graphics();
    const size = 1 + Math.random();
    gfx.rect(-size / 2, -size / 2, size, size).fill(this.vfx.particleColor);

    const px = (Math.random() - 0.5) * 10;
    const py = (Math.random() - 0.5) * 4;
    gfx.x = px;
    gfx.y = py;
    this.container.addChild(gfx);

    const maxLife = 800 + Math.random() * 600;
    this.particles.push({
      x: px,
      y: py,
      vy: -(10 + Math.random() * 15),
      life: maxLife,
      maxLife,
      gfx,
    });
  }

  /** Check if player overlaps this drop */
  overlapsPlayer(px: number, py: number, pw: number, ph: number): boolean {
    return (
      px < this.x + 6 &&
      px + pw > this.x - 6 &&
      py < this.y + 6 &&
      py + ph > this.y - 6
    );
  }

  destroy(): void {
    for (const p of this.particles) {
      if (p.gfx.parent) p.gfx.parent.removeChild(p.gfx);
    }
    this.particles = [];
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container.destroy();
  }
}
