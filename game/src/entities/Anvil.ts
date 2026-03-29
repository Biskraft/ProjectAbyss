/**
 * Anvil.ts
 *
 * A forge anvil where the player places a weapon and strikes it to trigger
 * floor collapse, opening a passage into the Item World below.
 *
 * Design ref: Prototype_ItemWorldEntry_FloorCollapse.md
 */

import { Container, Graphics, BitmapText } from 'pixi.js';
import { PIXEL_FONT } from '@ui/fonts';
import type { ItemInstance } from '@items/ItemInstance';
import { RARITY_COLOR } from '@items/ItemInstance';

export class Anvil {
  container: Container;
  x: number;
  y: number;
  width = 32;
  height = 16;

  /** The weapon placed on this anvil (null = empty). */
  item: ItemInstance | null = null;

  /** True once the floor collapse has been triggered (prevents re-use). */
  used = false;

  private hintText: BitmapText;
  private showHint = false;
  private timer = 0;
  private gfx: Graphics;
  private itemGfx: Graphics | null = null;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;

    this.container = new Container();
    this.container.x = x;
    this.container.y = y;

    this.gfx = new Graphics();
    this.drawAnvil();
    this.container.addChild(this.gfx);

    this.hintText = new BitmapText({
      text: 'UP: Place weapon',
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xffffff },
    });
    this.hintText.anchor.set(0.5);
    this.hintText.y = -24;
    this.hintText.visible = false;
    this.container.addChild(this.hintText);
  }

  private drawAnvil(): void {
    this.gfx.rect(-this.width / 2, -2, this.width, 6).fill(0x444455);
    this.gfx.rect(-this.width / 2, -2, this.width, 6).stroke({ color: 0x333344, width: 1 });
    this.gfx.rect(-10, -this.height, 20, this.height - 2).fill(0x555566);
    this.gfx.rect(-10, -this.height, 20, this.height - 2).stroke({ color: 0x444455, width: 1 });
    this.gfx.rect(-14, -this.height - 3, 28, 4).fill(0x777788);
    this.gfx.rect(-14, -this.height - 3, 28, 4).stroke({ color: 0x555566, width: 1 });
    this.gfx.rect(-18, -this.height - 1, 5, 2).fill(0x666677);
  }

  /** Place a weapon on the anvil. Shows a small colored rect on top. */
  placeItem(item: ItemInstance): void {
    this.item = item;

    if (this.itemGfx) {
      this.container.removeChild(this.itemGfx);
      this.itemGfx.destroy();
    }

    const color = RARITY_COLOR[item.rarity];
    this.itemGfx = new Graphics();
    this.itemGfx.rect(-6, -this.height - 8, 12, 5).fill(color);
    this.itemGfx.rect(-4, -this.height - 11, 2, 4).fill(color);
    this.container.addChild(this.itemGfx);

    // Update hint text
    this.hintText.text = 'ATK: Strike!';
    this.hintText.style.fill = 0xffcc44;
  }

  hasItem(): boolean {
    return this.item !== null;
  }

  setShowHint(show: boolean): void {
    if (this.showHint !== show) {
      this.showHint = show;
      this.hintText.visible = show && !this.used;
    }
  }

  update(dt: number): void {
    this.timer += dt;
    const t = this.timer / 1000;

    // Gentle glow pulse
    this.gfx.alpha = 0.9 + Math.sin(t * 2) * 0.1;

    // Item glow when placed
    if (this.itemGfx) {
      this.itemGfx.alpha = 0.8 + Math.sin(t * 4) * 0.2;
    }

    if (this.showHint) {
      this.hintText.alpha = 0.7 + Math.sin(t * 3) * 0.3;
    }
  }

  /** AABB overlap check (same pattern as Altar). */
  overlaps(px: number, py: number, pw: number, ph: number): boolean {
    const halfW = this.width / 2;
    return (
      px + pw > this.x - halfW &&
      px < this.x + halfW &&
      py + ph > this.y - this.height &&
      py < this.y + 4
    );
  }

  /** Returns the AABB for attack hit detection in world coordinates. */
  getHitAABB(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height - 4,
      width: this.width,
      height: this.height + 4,
    };
  }

  destroy(): void {
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container.destroy({ children: true });
  }
}
