import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { PIXEL_FONT } from './fonts';

const barStyle = new TextStyle({ fontSize: 8, fill: 0xffffff, fontFamily: PIXEL_FONT });

export class HUD {
  container: Container;
  private hpBar: Graphics;
  private hpText: Text;
  private floorText: Text;

  constructor() {
    this.container = new Container();

    // HP bar background
    this.hpBar = new Graphics();
    this.hpBar.x = 4;
    this.hpBar.y = 50; // below minimap area
    this.container.addChild(this.hpBar);

    this.hpText = new Text({ text: '', style: barStyle });
    this.hpText.x = 6;
    this.hpText.y = 50;
    this.container.addChild(this.hpText);

    this.floorText = new Text({ text: '', style: barStyle });
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

  setFloorText(text: string): void {
    this.floorText.text = text;
  }
}
