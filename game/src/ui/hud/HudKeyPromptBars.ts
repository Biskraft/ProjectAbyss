import { BitmapText, Container, Graphics, Sprite, type Texture } from 'pixi.js';
import { GameAction, actionKey } from '@core/InputManager';
import { onDeviceChange } from '@core/input/InputDeviceTracker';
import { t } from '@i18n';
import { createUiText } from '../factories';
import { PIXEL_FONT } from '../fonts';
import { KeyPrompt } from '../KeyPrompt';
import { TEXT_PRIMARY, TEXT_SECONDARY } from '../ModalPanel';

export interface HudSideKeyBarParts {
  container: Container;
  pulseGlow: Graphics;
  itemKeyIcon: Container | null;
  itemKeyCenterX: number;
  itemKeyCenterY: number;
  itemKeySize: number;
}

export function createBoundHudKeyText(action: GameAction, fontSize: number): BitmapText {
  const text = new BitmapText({
    text: actionKey(action),
    style: { fontFamily: PIXEL_FONT, fontSize, fill: 0xffffff },
  });
  const refresh = () => { text.text = actionKey(action).toUpperCase(); };
  refresh();
  onDeviceChange(refresh);
  return text;
}

interface HudSkinBounds {
  w: number;
  h: number;
}

interface HudSkinPositionedBounds extends HudSkinBounds {
  x: number;
  y: number;
}

export function addBoundHudKeyTextAtBounds(
  container: Container,
  action: GameAction,
  bounds: HudSkinPositionedBounds,
  s: number,
  fontSize: number,
): BitmapText {
  const text = createBoundHudKeyText(action, fontSize);
  text.anchor.set(0.5, 0.5);
  text.x = (bounds.x + bounds.w / 2) * s;
  text.y = (bounds.y + bounds.h / 2) * s;
  container.addChild(text);
  return text;
}

export function addHudSkinActionKey(
  container: Container,
  texture: Texture,
  bounds: HudSkinBounds,
  s: number,
  worldX: number,
  worldY: number,
  action: GameAction,
  label: string,
  keyGlyphYOffset = 0,
  keyFontSize = 8 * s,
): void {
  const sprite = new Sprite(texture);
  sprite.x = worldX * s;
  sprite.y = worldY * s;
  sprite.width = bounds.w * s;
  sprite.height = bounds.h * s;
  container.addChild(sprite);

  const keyText = createBoundHudKeyText(action, keyFontSize);
  keyText.anchor.set(0.5, 0.5);
  keyText.x = (worldX + bounds.w / 2) * s;
  keyText.y = (worldY + bounds.h * 0.70 + 2 + keyGlyphYOffset) * s;
  container.addChild(keyText);

  const actionText = new BitmapText({
    text: label,
    style: { fontFamily: PIXEL_FONT, fontSize: 8 * s, fill: 0xaaaaaa },
  });
  actionText.anchor.set(0.5, 0);
  actionText.x = (worldX + bounds.w / 2) * s;
  actionText.y = (worldY + bounds.h + 2) * s;
  container.addChild(actionText);
}

export function createHudActionKeyBar(
  s: number,
  x: number,
  y: number,
  keyIconSize: number,
  keyFontSize: number,
): Container {
  const container = new Container();
  const actions: Array<{ action: GameAction; label: string }> = [
    { action: GameAction.JUMP, label: t('ui.hud.label_jump') },
    { action: GameAction.DASH, label: t('ui.hud.label_dash') },
    { action: GameAction.ATTACK, label: t('ui.hud.label_atk') },
  ];

  let actionX = x;
  for (const action of actions) {
    const icon = KeyPrompt.createKeyIconForAction(action.action, keyIconSize);
    icon.x = actionX;
    icon.y = y;
    container.addChild(icon);

    const text = createUiText(action.label, {
      fontFamily: PIXEL_FONT,
      fontSize: keyFontSize,
      fill: TEXT_SECONDARY,
    });
    text.x = actionX + keyIconSize + 2 * s;
    text.y = y + Math.floor((keyIconSize - text.height) / 2);
    container.addChild(text);

    actionX += keyIconSize + 2 * s + text.width + 8 * s;
  }

  return container;
}

export function createHudFlaskKeyLabel(size: number, x: number, y: number): Container {
  const label = KeyPrompt.createKeyIconForAction(GameAction.FLASK, size);
  label.pivot.set(size / 2, size / 2);
  label.x = x + size / 2;
  label.y = y + size / 2;
  return label;
}

export function createHudSideKeyBar(
  s: number,
  rightX: number,
  y: number,
  keyIconSize: number,
  keyFontSize: number,
): HudSideKeyBarParts {
  const container = new Container();
  const pulseGlow = new Graphics();
  pulseGlow.alpha = 0;
  container.addChild(pulseGlow);

  const sideActions: Array<{ label: string; action: GameAction }> = [
    { label: t('ui.hud.label_item'), action: GameAction.INVENTORY },
    { label: t('ui.hud.label_map'), action: GameAction.MAP },
  ];

  let sideX = rightX;
  let itemKeyIcon: Container | null = null;
  let itemKeyCenterX = 0;
  let itemKeyCenterY = 0;
  let itemKeySize = 0;

  for (let i = sideActions.length - 1; i >= 0; i--) {
    const action = sideActions[i];
    const label = createUiText(action.label, {
      fontFamily: PIXEL_FONT,
      fontSize: keyFontSize,
      fill: TEXT_SECONDARY,
    });
    sideX -= label.width;
    label.x = sideX;
    label.y = y + Math.floor((keyIconSize - label.height) / 2);
    container.addChild(label);

    sideX -= 2 * s + keyIconSize;
    const icon = KeyPrompt.createKeyIconForAction(action.action, keyIconSize);
    icon.x = sideX;
    icon.y = y;
    if (action.action === GameAction.INVENTORY) {
      icon.pivot.set(keyIconSize / 2, keyIconSize / 2);
      icon.x = sideX + keyIconSize / 2;
      icon.y = y + keyIconSize / 2;
      itemKeyIcon = icon;
      itemKeyCenterX = icon.x;
      itemKeyCenterY = icon.y;
      itemKeySize = keyIconSize;
    }
    container.addChild(icon);

    sideX -= 8 * s;
  }

  return { container, pulseGlow, itemKeyIcon, itemKeyCenterX, itemKeyCenterY, itemKeySize };
}

export function createHudItemExitHint(
  s: number,
  screenWidth: number,
  margin: number,
  fontSize: number,
): Container {
  const container = new Container();
  container.visible = false;

  const keySize = 14 * s;
  const labelFont = 10 * s;
  const escIcon = KeyPrompt.createKeyIconForAction(GameAction.MENU, keySize);
  const exitLabelShadow = createUiText(t('ui.hud.exit'), { fontSize: labelFont, fill: 0x000000 }, s);
  const exitLabel = createUiText(t('ui.hud.exit'), { fontSize: labelFont, fill: TEXT_PRIMARY }, s);
  const hintY = margin + fontSize + 6 * s;
  const gap = 4 * s;
  const totalW = keySize + gap + exitLabel.width;
  const startX = screenWidth - margin - totalW;

  escIcon.x = startX;
  escIcon.y = hintY;
  exitLabelShadow.x = startX + keySize + gap + s;
  exitLabelShadow.y = hintY + Math.floor((keySize - exitLabel.height) / 2) + s;
  exitLabel.x = startX + keySize + gap;
  exitLabel.y = hintY + Math.floor((keySize - exitLabel.height) / 2);

  container.addChild(escIcon);
  container.addChild(exitLabelShadow);
  container.addChild(exitLabel);

  return container;
}
