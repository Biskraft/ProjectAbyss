import { Graphics } from 'pixi.js';
import { PRNG } from '@utils/PRNG';
import { SWORD_DEFS, type Rarity } from '@data/weapons';
import { createItem, RARITY_COLOR, type ItemInstance } from './ItemInstance';

const DROP_CHANCE = 0.15;

const RARITY_WEIGHTS: { rarity: Rarity; weight: number }[] = [
  { rarity: 'normal', weight: 0.60 },
  { rarity: 'magic', weight: 0.25 },
  { rarity: 'rare', weight: 0.10 },
  { rarity: 'legendary', weight: 0.04 },
  { rarity: 'ancient', weight: 0.01 },
];

/** Roll whether an enemy drops an item, and if so, create it */
export function rollDrop(rng: PRNG): ItemInstance | null {
  if (rng.next() > DROP_CHANCE) return null;

  // Pick rarity
  const roll = rng.next();
  let cumulative = 0;
  let rarity: Rarity = 'normal';
  for (const w of RARITY_WEIGHTS) {
    cumulative += w.weight;
    if (roll < cumulative) {
      rarity = w.rarity;
      break;
    }
  }

  // Pick weapon def matching rarity (or fallback to common)
  const def = SWORD_DEFS.find(d => d.rarity === rarity) ?? SWORD_DEFS[0];
  return createItem(def, rarity);
}

const GOLDEN_RARITY_WEIGHTS: { rarity: Rarity; weight: number }[] = [
  { rarity: 'rare', weight: 0.50 },
  { rarity: 'legendary', weight: 0.35 },
  { rarity: 'ancient', weight: 0.15 },
];

/** Golden Monster guaranteed drop — always rare or above */
export function rollGoldenDrop(rng: PRNG): ItemInstance {
  const roll = rng.next();
  let cumulative = 0;
  let rarity: Rarity = 'rare';
  for (const w of GOLDEN_RARITY_WEIGHTS) {
    cumulative += w.weight;
    if (roll < cumulative) {
      rarity = w.rarity;
      break;
    }
  }

  const def = SWORD_DEFS.find(d => d.rarity === rarity) ?? SWORD_DEFS[2]; // fallback to rare
  return createItem(def, rarity);
}

/** Visual representation of a dropped item on the ground */
export class ItemDropEntity {
  x: number;
  y: number;
  item: ItemInstance;
  container: Graphics;
  private bobTimer = 0;
  private baseY: number;
  collected = false;

  constructor(x: number, y: number, item: ItemInstance) {
    this.x = x;
    this.y = y;
    this.baseY = y;
    this.item = item;

    // Small colored square
    this.container = new Graphics();
    this.container.rect(-4, -4, 8, 8).fill(RARITY_COLOR[item.rarity]);
    this.container.rect(-3, -3, 6, 6).fill({ color: 0xffffff, alpha: 0.4 });
    this.container.x = x;
    this.container.y = y;
  }

  update(dt: number): void {
    // Bob up and down
    this.bobTimer += dt * 0.003;
    this.container.y = this.baseY + Math.sin(this.bobTimer) * 3;
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
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container.destroy();
  }
}
