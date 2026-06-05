import { BitmapText, Container, Graphics, Text } from 'pixi.js';
import { PIXEL_FONT } from '../fonts';
import { TEXT_PRIMARY } from '../ModalPanel';
import { expFillRatio, expFlashAlpha, expLevelBounce, expLevelLabel } from './HudExp';
import {
  BASE_EXP_H,
  BASE_EXP_W,
  EXP_BAR_COLOR,
  EXP_BAR_MAX_COLOR,
  EXP_BG_COLOR,
  EXP_LEVELUP_FLASH_DURATION,
} from './HudConstants';

export interface HudItemExpDisplayParts {
  container: Container;
  gfx: Graphics;
  nameText: BitmapText;
  nameShadow: BitmapText;
  levelText: BitmapText;
  levelShadow: BitmapText;
}

interface DrawHudItemExpOptions {
  s: number;
  expFont: number;
  startX: number;
  startY: number;
  itemName: string;
  itemRarityColor: number;
  level: number;
  displayRatio: number;
  levelUpFlash: number;
  isMax: boolean;
}

export function createHudItemExpDisplay(expFont: number): HudItemExpDisplayParts {
  const container = new Container();
  container.visible = false;
  const gfx = new Graphics();
  container.addChild(gfx);
  const nameShadow = new BitmapText({ text: '', style: { fontFamily: PIXEL_FONT, fontSize: expFont, fill: 0x000000 } });
  const nameText = new BitmapText({ text: '', style: { fontFamily: PIXEL_FONT, fontSize: expFont, fill: TEXT_PRIMARY } });
  const levelShadow = new BitmapText({ text: '', style: { fontFamily: PIXEL_FONT, fontSize: expFont, fill: 0x000000 } });
  const levelText = new BitmapText({ text: '', style: { fontFamily: PIXEL_FONT, fontSize: expFont, fill: TEXT_PRIMARY } });
  container.addChild(nameShadow);
  container.addChild(nameText);
  container.addChild(levelShadow);
  container.addChild(levelText);
  return { container, gfx, nameText, nameShadow, levelText, levelShadow };
}

export function drawHudItemExpBar(parts: HudItemExpDisplayParts, options: DrawHudItemExpOptions): void {
  const { gfx } = parts;
  gfx.clear();

  const s = options.s;
  const barW = BASE_EXP_W * s;
  const barH = BASE_EXP_H * s;
  const startX = options.startX;
  const startY = options.startY;

  parts.nameText.style.fill = options.itemRarityColor;
  parts.nameText.text = options.itemName;
  parts.nameShadow.text = options.itemName;
  parts.nameText.x = startX;
  parts.nameText.y = startY;
  parts.nameShadow.x = startX + s;
  parts.nameShadow.y = startY + s;

  const lvText = expLevelLabel(options.level, options.isMax);
  parts.levelText.text = lvText;
  parts.levelShadow.text = lvText;
  parts.levelText.style.fill = options.isMax ? EXP_BAR_MAX_COLOR : TEXT_PRIMARY;
  const lvX = startX + parts.nameText.width + 4 * s;
  parts.levelText.x = lvX;
  parts.levelText.y = startY;
  parts.levelShadow.x = lvX + s;
  parts.levelShadow.y = startY + s;

  const barY = startY + options.expFont + 2 * s;
  gfx.rect(startX - s, barY - s, barW + 2 * s, barH + 2 * s).fill(0x444444);
  gfx.rect(startX, barY, barW, barH).fill(EXP_BG_COLOR);

  const fillW = barW * expFillRatio(options.displayRatio);
  const barColor = options.isMax ? EXP_BAR_MAX_COLOR : EXP_BAR_COLOR;
  if (fillW > 0) {
    gfx.rect(startX, barY, fillW, barH).fill(barColor);
  }

  if (options.levelUpFlash > 0) {
    const flashAlpha = expFlashAlpha(options.levelUpFlash, EXP_LEVELUP_FLASH_DURATION);
    gfx.rect(startX, barY, barW, barH).fill({ color: 0xffffff, alpha: flashAlpha * 0.8 });
    const bounce = expLevelBounce(flashAlpha);
    parts.levelText.scale.set(bounce);
    parts.levelShadow.scale.set(bounce);
  } else {
    parts.levelText.scale.set(1);
    parts.levelShadow.scale.set(1);
  }
}

export interface RedrawHudItemExpBarOptions {
  s: number;
  expFont: number;
  atkText: BitmapText | Text;
  itemName: string;
  itemRarityColor: number;
  level: number;
  displayRatio: number;
  levelUpFlash: number;
  isMax: boolean;
}

export function redrawHudItemExpBar(parts: HudItemExpDisplayParts, options: RedrawHudItemExpBarOptions): void {
  drawHudItemExpBar(parts, {
    s: options.s,
    expFont: options.expFont,
    startX: options.atkText.x,
    startY: options.atkText.y + (options.atkText.style.fontSize as number) + 4 * options.s,
    itemName: options.itemName,
    itemRarityColor: options.itemRarityColor,
    level: options.level,
    displayRatio: options.displayRatio,
    levelUpFlash: options.levelUpFlash,
    isMax: options.isMax,
  });
}
