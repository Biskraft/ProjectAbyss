import { Container } from 'pixi.js';
import { GameAction } from '@core/InputManager';
import type { UISkin } from '../UISkin';
import { createOrGetHudLayoutWrapper } from './hudLayout';
import { createHudSkinSliceSprite } from './HudSkinSliceDisplay';
import { createSkinHudFlaskIconMetrics } from './HudFlaskDisplay';
import { addBoundHudKeyTextAtBounds, addHudSkinActionKey } from './HudKeyPromptBars';

export interface SkinHudKeyPromptParts {
  skinFlaskCx: number;
  skinFlaskCy: number;
  skinFlaskR: number;
  skinFlaskFillTex: import('pixi.js').Texture | null;
  skinFlaskEmptyTex: import('pixi.js').Texture | null;
  skinFlaskIconW: number;
  skinFlaskIconH: number;
  skinFlaskGap: number;
  skinFlaskStartX: number;
  skinFlaskStartY: number;
  flaskIconLayer: Container | null;
  skinItemKeyCx: number;
  skinItemKeyCy: number;
  skinItemKeyR: number;
}

export function createSkinHudKeyPromptParts(
  skin: UISkin,
  s: number,
  skinLayer: Container,
  layoutWrappers: Map<string, Container>,
): SkinHudKeyPromptParts {
  const result: SkinHudKeyPromptParts = {
    skinFlaskCx: 0,
    skinFlaskCy: 0,
    skinFlaskR: 0,
    skinFlaskFillTex: null,
    skinFlaskEmptyTex: null,
    skinFlaskIconW: 0,
    skinFlaskIconH: 0,
    skinFlaskGap: 0,
    skinFlaskStartX: 0,
    skinFlaskStartY: 0,
    flaskIconLayer: null,
    skinItemKeyCx: 0,
    skinItemKeyCy: 0,
    skinItemKeyR: 0,
  };

  const wrap = (id: string, parent: Container = skinLayer): Container => (
    createOrGetHudLayoutWrapper(layoutWrappers, id, parent)
  );

  const place = (name: string, into: Container = skinLayer) => {
    const tex = skin.getTexture(name);
    const bounds = skin.getBounds(name);
    if (!tex || !bounds) return null;

    const sprite = createHudSkinSliceSprite(s, tex, bounds);
    into.addChild(sprite);
    return sprite;
  };

  const placeKey = (name: string, action: GameAction, into: Container = skinLayer) => {
    const sprite = place(name, into);
    if (!sprite) return;
    const bounds = skin.getBounds(name)!;
    addBoundHudKeyTextAtBounds(into, action, bounds, s, 8 * s);
  };

  const flaskKeyWrap = wrap('flaskKey');
  const flaskKeySprite = place('hud_status_key_flask', flaskKeyWrap);
  const flaskKeyBounds = skin.getBounds('hud_status_key_flask');
  if (flaskKeySprite && flaskKeyBounds) {
    const txt = addBoundHudKeyTextAtBounds(flaskKeyWrap, GameAction.FLASK, flaskKeyBounds, s, 10 * s);
    result.skinFlaskCx = txt.x;
    result.skinFlaskCy = txt.y;
    result.skinFlaskR = Math.max(flaskKeyBounds.w, flaskKeyBounds.h) / 2 * s;
  }

  const fillTex = skin.getTexture('hud_status_flask_fill');
  const emptyTex = skin.getTexture('hud_status_flask_empty');
  const fillBounds = skin.getBounds('hud_status_flask_fill');
  if (fillTex && emptyTex && fillBounds && flaskKeyBounds) {
    const flaskMetrics = createSkinHudFlaskIconMetrics(s, fillTex, emptyTex, fillBounds, flaskKeyBounds);
    result.skinFlaskFillTex = flaskMetrics.fillTexture;
    result.skinFlaskEmptyTex = flaskMetrics.emptyTexture;
    result.skinFlaskIconW = flaskMetrics.iconW;
    result.skinFlaskIconH = flaskMetrics.iconH;
    result.skinFlaskGap = flaskMetrics.gap;
    result.skinFlaskStartX = flaskMetrics.startX;
    result.skinFlaskStartY = flaskMetrics.startY;
    result.flaskIconLayer = wrap('flaskIcons');
  }

  placeKey('hud_map_key_item_normal', GameAction.INVENTORY, wrap('itemKey'));
  const itemBounds = skin.getBounds('hud_map_key_item_normal');
  if (itemBounds) {
    result.skinItemKeyCx = (itemBounds.x + itemBounds.w / 2) * s;
    result.skinItemKeyCy = (itemBounds.y + itemBounds.h / 2) * s;
    result.skinItemKeyR = Math.max(itemBounds.w, itemBounds.h) / 2 * s;
  }

  placeKey('hud_map_key_inv_normal', GameAction.MAP, wrap('mapKey'));

  const actionKeysWrap = createOrGetHudLayoutWrapper(layoutWrappers, 'actionKeys', skinLayer);
  placeActionKey(skin, s, actionKeysWrap, 'hud_action_key', 9, 300, GameAction.JUMP, 'JUMP');
  placeActionKey(skin, s, actionKeysWrap, 'hud_action_key', 51, 300, GameAction.DASH, 'DASH');
  placeActionKey(skin, s, actionKeysWrap, 'hud_action_key', 93, 300, GameAction.ATTACK, 'ATK');

  return result;
}

function placeActionKey(
  skin: UISkin,
  s: number,
  into: Container,
  sliceName: string,
  worldX: number,
  worldY: number,
  action: GameAction,
  label: string,
): void {
  const tex = skin.getTexture(sliceName);
  const bounds = skin.getBounds(sliceName);
  if (!tex || !bounds) return;
  addHudSkinActionKey(into, tex, bounds, s, worldX, worldY, action, label, 0, 8 * s);
}
