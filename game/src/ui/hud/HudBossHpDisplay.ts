import { BitmapText, Container, Graphics, Text } from 'pixi.js';
import { createUiText } from '../factories';
import { TEXT_PRIMARY } from '../ModalPanel';
import { HP_BG_COLOR } from './HudConstants';
import { hudRatio } from './HudNumeric';

export interface HudBossHpDisplayParts {
  container: Container;
  bar: Graphics;
  nameText: BitmapText | Text;
  nameShadow: BitmapText | Text;
}

export function createHudBossHpDisplay(
  s: number,
  screenWidth: number,
  bossX: number,
  bossY: number,
  fontSize: number,
): HudBossHpDisplayParts {
  const container = new Container();
  container.visible = false;

  const bar = new Graphics();
  bar.x = bossX;
  bar.y = bossY;

  const nameShadow = createUiText('', { fontSize, fill: 0x000000 }, s);
  const nameText = createUiText('', { fontSize, fill: TEXT_PRIMARY }, s);
  nameShadow.anchor.set(0.5, 0);
  nameText.anchor.set(0.5, 0);
  nameShadow.x = screenWidth / 2 + s;
  nameShadow.y = bossY - 10 * s + s;
  nameText.x = screenWidth / 2;
  nameText.y = bossY - 10 * s;

  container.addChild(bar);
  container.addChild(nameShadow);
  container.addChild(nameText);

  return { container, bar, nameText, nameShadow };
}

export interface DrawHudBossHpOptions {
  s: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
}

export function drawHudBossHpBar(gfx: Graphics, options: DrawHudBossHpOptions): void {
  gfx.clear();

  const ratio = hudRatio(options.hp, options.maxHp);

  gfx.rect(-2 * options.s, -2 * options.s, options.width + 4 * options.s, options.height + 4 * options.s).fill(0x000000);
  gfx.rect(-options.s, -options.s, options.width + 2 * options.s, options.height + 2 * options.s).fill(0xbbbbbb);
  gfx.rect(0, 0, options.width, options.height).fill(HP_BG_COLOR);

  const fillColor = ratio > 0.5 ? 0xff3388 : ratio > 0.25 ? 0xcc2277 : 0x882266;
  const fillW = options.width * ratio;
  gfx.rect(0, 0, fillW, options.height).fill(fillColor);

  const highlight = ratio > 0.5 ? 0xffaacc : ratio > 0.25 ? 0xff88bb : 0xcc66aa;
  gfx
    .rect(0, 0, fillW, Math.max(1, Math.floor(options.s)))
    .fill({ color: highlight, alpha: 0.8 });
}
