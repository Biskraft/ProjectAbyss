import { BitmapText, Container } from 'pixi.js';
import { PIXEL_FONT } from '../fonts';
import { TEXT_GOLD, TEXT_PRIMARY } from '../ModalPanel';

export interface HudTextPair {
  text: BitmapText;
  shadow: BitmapText;
}

export interface HudWrappedTextPair extends HudTextPair {
  container: Container;
}

interface HudSkinBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function wrapHudTextPair(pair: HudTextPair): Container {
  const container = new Container();
  container.addChild(pair.shadow);
  container.addChild(pair.text);
  return container;
}

export function createHudHpText(
  s: number,
  fontSize: number,
  hpX: number,
  flaskY: number,
): HudTextPair {
  const shadow = new BitmapText({ text: '', style: { fontFamily: PIXEL_FONT, fontSize, fill: 0x000000 } });
  const text = new BitmapText({ text: '', style: { fontFamily: PIXEL_FONT, fontSize, fill: TEXT_PRIMARY } });
  shadow.x = hpX + 44 * s + s;
  shadow.y = flaskY + s;
  text.x = hpX + 44 * s;
  text.y = flaskY;
  return { text, shadow };
}

export function createHudAtkText(s: number, fontSize: number, hpX: number, y: number): HudTextPair {
  const shadow = new BitmapText({ text: '', style: { fontFamily: PIXEL_FONT, fontSize, fill: 0x000000 } });
  const text = new BitmapText({ text: '', style: { fontFamily: PIXEL_FONT, fontSize, fill: 0xff8833 } });
  shadow.x = hpX + s;
  shadow.y = y + s;
  text.x = hpX;
  text.y = y;
  return { text, shadow };
}

export function createHudGoldText(
  s: number,
  fontSize: number,
  screenWidth: number,
  margin: number,
): HudWrappedTextPair {
  const shadow = new BitmapText({ text: 'G 0', style: { fontFamily: PIXEL_FONT, fontSize, fill: 0x000000 } });
  const text = new BitmapText({ text: 'G 0', style: { fontFamily: PIXEL_FONT, fontSize, fill: TEXT_GOLD } });
  shadow.anchor.set(1, 0);
  text.anchor.set(1, 0);
  shadow.x = screenWidth - margin + s;
  shadow.y = margin + s;
  text.x = screenWidth - margin;
  text.y = margin;

  const container = new Container();
  container.addChild(shadow);
  container.addChild(text);
  return { text, shadow, container };
}

export function createHudFloorText(
  s: number,
  fontSize: number,
  screenHeight: number,
  margin: number,
): HudTextPair {
  const shadow = new BitmapText({ text: '', style: { fontFamily: PIXEL_FONT, fontSize, fill: 0x000000 } });
  const text = new BitmapText({ text: '', style: { fontFamily: PIXEL_FONT, fontSize, fill: TEXT_PRIMARY } });
  shadow.x = margin + s;
  shadow.y = screenHeight - margin - fontSize + s;
  text.x = margin;
  text.y = screenHeight - margin - fontSize;
  shadow.visible = false;
  text.visible = false;
  return { text, shadow };
}

export function applyHudSkinHpTextLayout(
  pair: HudTextPair,
  options: {
    s: number;
    fontSize: number;
    currentHp: number;
    hpFrameBounds: HudSkinBounds;
    portraitBounds?: HudSkinBounds | null;
  },
): void {
  pair.text.style.fontSize = options.fontSize;
  pair.shadow.style.fontSize = options.fontSize;
  pair.text.text = `${Math.ceil(options.currentHp)}`;
  pair.shadow.text = pair.text.text;
  const hpTextX = options.portraitBounds
    ? (options.portraitBounds.x + options.portraitBounds.w + 2) * options.s
    : (options.hpFrameBounds.x + options.hpFrameBounds.w + 2) * options.s;
  pair.text.x = hpTextX + 4 * options.s;
  pair.text.y = options.hpFrameBounds.y * options.s
    + (options.hpFrameBounds.h * options.s - options.fontSize) / 2
    - 1 * options.s;
  pair.shadow.x = pair.text.x + options.s;
  pair.shadow.y = pair.text.y + options.s;
}

export function applyHudSkinAtkTextLayout(
  pair: HudTextPair,
  options: {
    s: number;
    fontSize: number;
    flaskKeyBounds: HudSkinBounds;
  },
): void {
  pair.text.style.fontSize = options.fontSize;
  pair.shadow.style.fontSize = options.fontSize;
  pair.text.x = options.flaskKeyBounds.x * options.s;
  pair.text.y = (options.flaskKeyBounds.y + options.flaskKeyBounds.h + 6) * options.s;
  pair.shadow.x = pair.text.x + options.s;
  pair.shadow.y = pair.text.y + options.s;
}
