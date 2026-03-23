import { Container, Graphics, BitmapText } from 'pixi.js';
import { PIXEL_FONT } from '@ui/fonts';

export class Altar {
  container: Container;
  x: number;
  y: number;
  width = 24;
  height = 20;

  private hintText: BitmapText;
  private showHint = false;
  private timer = 0;
  private gfx: Graphics;
  used = false; // true after a portal has been spawned from this altar

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;

    this.container = new Container();
    this.container.x = x;
    this.container.y = y;

    this.gfx = new Graphics();
    this.drawAltar();
    this.container.addChild(this.gfx);

    this.hintText = new BitmapText({ text: 'UP: Offer', style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xffffff } });
    this.hintText.anchor.set(0.5);
    this.hintText.y = -16;
    this.hintText.visible = false;
    this.container.addChild(this.hintText);
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

  setShowHint(show: boolean): void {
    if (this.showHint !== show) {
      this.showHint = show;
      this.hintText.visible = show;
    }
  }

  update(dt: number): void {
    this.timer += dt;
    const t = this.timer / 1000;

    // Gentle glow pulse on top ornament
    this.gfx.alpha = 0.9 + Math.sin(t * 2) * 0.1;

    if (this.showHint) {
      this.hintText.alpha = 0.7 + Math.sin(t * 3) * 0.3;
    }
  }

  overlaps(px: number, py: number, pw: number, ph: number): boolean {
    const halfW = this.width / 2;
    return px + pw > this.x - halfW &&
           px < this.x + halfW &&
           py + ph > this.y - this.height &&
           py < this.y + 4;
  }

  destroy(): void {
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container.destroy({ children: true });
  }
}
