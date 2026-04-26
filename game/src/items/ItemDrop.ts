/**
 * ItemDrop.ts — Drop rate and rarity selection loaded from CSV.
 *
 * SSoT: Sheets/Content_Item_DropRate.csv
 * CSV columns: Pool,Rarity,Weight
 */

import dropCsvText from '../../../Sheets/Content_Item_DropRate.csv?raw';
import { Container, Graphics, Sprite, Texture, Assets } from 'pixi.js';
import { assetPath } from '@core/AssetLoader';
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
//
// 각 드랍 아이템은 WeaponPulse 와 동일한 확장 링 펄스를 무한 반복한다.
// 주기는 전 레어리티 동일(PULSE_PERIOD); 레어리티 차이는 최대 반경과 링 개수로
// 표현한다. 색상은 RARITY_COLOR 를 그대로 사용해 인벤토리/UI 와 일관된다.

const PULSE_PERIOD = 1200; // ms — 모든 레어리티 공통

interface DropVFX {
  color: number;
  startRadius: number;
  endRadius: number;
  ringCount: 1 | 2;      // 2 → second ring offset by 0.5 phase (double pulse)
}

const DROP_VFX: Record<Rarity, DropVFX | null> = {
  normal:    { color: RARITY_COLOR.normal,    startRadius: 6, endRadius: 20, ringCount: 1 },
  magic:     { color: RARITY_COLOR.magic,     startRadius: 6, endRadius: 26, ringCount: 1 },
  rare:      { color: RARITY_COLOR.rare,      startRadius: 8, endRadius: 32, ringCount: 1 },
  legendary: { color: RARITY_COLOR.legendary, startRadius: 8, endRadius: 40, ringCount: 2 },
  ancient:   { color: RARITY_COLOR.ancient,   startRadius: 8, endRadius: 48, ringCount: 2 },
};

// Visual size of the dropped-item icon in world pixels (1.5x the original
// 24px to make floor drops more readable at typical play camera zoom).
const ICON_SIZE = 36;

/** Visual representation of a dropped item on the ground */
export class ItemDropEntity {
  x: number;
  y: number;
  item: ItemInstance;
  container: Container;
  private bobTimer = 0;
  /** Bob center Y in world coords. Kept public so entities riding a moving
   *  platform (e.g. drops attached to GiantBuilder) can keep the bob
   *  centered as the carrier moves. */
  baseY: number;
  collected = false;

  // VFX
  private vfx: DropVFX | null;
  private ringTimer = 0;
  private ringGfx: Graphics | null = null;
  private itemGfx: Graphics;

  constructor(x: number, y: number, item: ItemInstance) {
    // LDtk Item entities are authored with a bottom-center pivot, so the
    // incoming y is the floor line. Lift the visual 8px so the sprite
    // hovers above the ground instead of being half-buried by the
    // 0.5/0.5-anchored sprite. Pickup hitbox follows the visual.
    const FLOOR_LIFT = 8;
    this.x = x;
    this.y = y - FLOOR_LIFT;
    this.baseY = this.y;
    this.item = item;
    this.vfx = DROP_VFX[item.rarity];

    this.container = new Container();
    this.container.x = x;
    this.container.y = y;

    // Expanding ring pulse (behind item) — drawn each frame in update().
    if (this.vfx) {
      this.ringGfx = new Graphics();
      this.container.addChild(this.ringGfx);
    }

    // Item square (placeholder until icon loads).
    this.itemGfx = new Graphics();
    this.itemGfx.rect(-6, -6, 12, 12).fill(RARITY_COLOR[item.rarity]);
    this.itemGfx.rect(-4, -4, 9, 9).fill({ color: 0xffffff, alpha: 0.4 });
    this.container.addChild(this.itemGfx);

    // Try to load item icon sprite
    this.loadItemIcon(item);

    // Randomize the ring phase so a cluster of drops doesn't pulse in lockstep.
    this.ringTimer = Math.random() * PULSE_PERIOD;
  }

  private itemSprite: Sprite | null = null;

  private async loadItemIcon(item: ItemInstance): Promise<void> {
    try {
      const tex = await Assets.load<Texture>(assetPath(`assets/items/${item.def.id}.png`));
      tex.source.scaleMode = 'nearest';
      const sprite = new Sprite(tex);
      sprite.anchor.set(0.5, 0.5);
      sprite.width = ICON_SIZE;
      sprite.height = ICON_SIZE;
      this.itemSprite = sprite;
      // Hide placeholder, show icon
      this.itemGfx.visible = false;
      this.container.addChild(sprite);
    } catch {
      // No icon — keep placeholder square
    }
  }

  update(dt: number): void {
    // Bob up and down
    this.bobTimer += dt * 0.003;
    this.container.y = this.baseY + Math.sin(this.bobTimer) * 3;

    if (!this.vfx || !this.ringGfx) return;

    // Loop the ring phase. Modulo on PULSE_PERIOD so the ring restarts cleanly.
    this.ringTimer = (this.ringTimer + dt) % PULSE_PERIOD;
    const phase = this.ringTimer / PULSE_PERIOD;
    this.drawRings(phase);
  }

  /**
   * Draw 1 or 2 expanding rings. WeaponPulse-style: radius grows linearly,
   * alpha fades to 0, stroke width thins slightly. With ringCount=2, the
   * second ring lags by 0.5 phase so the pair feels like a "double pulse".
   */
  private drawRings(phase: number): void {
    if (!this.vfx || !this.ringGfx) return;
    const g = this.ringGfx;
    g.clear();
    this.drawRing(g, phase);
    if (this.vfx.ringCount === 2) {
      const phase2 = (phase + 0.5) % 1;
      this.drawRing(g, phase2);
    }
  }

  private drawRing(g: Graphics, phase: number): void {
    if (!this.vfx) return;
    const p = Math.max(0, Math.min(1, phase));
    const radius = this.vfx.startRadius + (this.vfx.endRadius - this.vfx.startRadius) * p;
    const alpha = 0.85 * (1 - p);
    const width = 2 * (1 - p * 0.5);
    g.circle(0, 0, radius).stroke({ color: this.vfx.color, width, alpha });
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
