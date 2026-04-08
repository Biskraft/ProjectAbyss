import { Container, Graphics, BitmapText } from 'pixi.js';
import { PIXEL_FONT } from './fonts';

export class HUD {
  container: Container;
  private hpBar: Graphics;
  private hpText: BitmapText;
  private goldText: BitmapText;
  private floorText: BitmapText;

  constructor() {
    this.container = new Container();

    // Gold display — top-left
    this.goldText = new BitmapText({ text: 'G 0', style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xffd700 } });
    this.goldText.x = 4;
    this.goldText.y = 4;
    this.container.addChild(this.goldText);

    // HP bar background
    this.hpBar = new Graphics();
    this.hpBar.x = 4;
    this.hpBar.y = 50;
    this.container.addChild(this.hpBar);

    this.hpText = new BitmapText({ text: '', style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xffffff } });
    this.hpText.x = 6;
    this.hpText.y = 50;
    this.container.addChild(this.hpText);

    this.floorText = new BitmapText({ text: '', style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xffffff } });
    this.floorText.x = 4;
    this.floorText.y = 62;
    this.container.addChild(this.floorText);
  }

  updateHP(hp: number, maxHp: number): void {
    this.hpBar.clear();
    const barW = 50;
    const barH = 5;
    this.hpBar.rect(0, 0, barW, barH).fill(0x333333);
    const ratio = Math.max(0, hp / maxHp);
    const color = ratio > 0.5 ? 0x22aa22 : ratio > 0.25 ? 0xaaaa22 : 0xaa2222;
    this.hpBar.rect(0, 0, barW * ratio, barH).fill(color);
    this.hpText.text = `HP ${Math.ceil(hp)}/${maxHp}`;
  }

  updateGold(gold: number): void {
    this.goldText.text = `G ${gold}`;
  }

  setFloorText(text: string): void {
    this.floorText.text = text;
  }
}
