import { BitmapText, Container } from 'pixi.js';
import { PIXEL_FONT } from '../fonts';

export function createHudDebugLabel(
  s: number,
  screenWidth: number,
  screenHeight: number,
  margin: number,
): Container {
  const container = new Container();
  const dbgShadow = new BitmapText({
    text: 'DEBUG',
    style: { fontFamily: PIXEL_FONT, fontSize: 16 * s, fill: 0x000000 },
  });
  const dbgText = new BitmapText({
    text: 'DEBUG',
    style: { fontFamily: PIXEL_FONT, fontSize: 16 * s, fill: 0xff2222 },
  });
  dbgShadow.anchor.set(1, 0);
  dbgText.anchor.set(1, 0);
  dbgShadow.x = screenWidth - margin + s;
  dbgShadow.y = screenHeight - margin - 16 * s + s;
  dbgText.x = screenWidth - margin;
  dbgText.y = screenHeight - margin - 16 * s;
  dbgText.alpha = 0.7;
  dbgShadow.alpha = 0.7;
  container.addChild(dbgShadow);
  container.addChild(dbgText);
  return container;
}
