import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import type { UISkin } from '../UISkin';
import { createOrGetHudLayoutWrapper } from './hudLayout';
import { createSkinHudDepthGaugeParts } from './HudDepthGaugeDisplay';
import { createHudFloorFill } from './HudFloorIndicatorDisplay';
import { createSkinHudHpFillParts } from './HudHpBarDisplay';
import { loadHudPortraitSprite } from './HudPortraitDisplay';
import { createHudSkinSliceSprite } from './HudSkinSliceDisplay';

export interface SkinHudFrameParts {
  mapFrame: Sprite | null;
  hpFrame: Sprite | null;
  hpFill: Sprite | null;
  hpFillMask: Graphics | null;
  hpFillMaxW: number;
  hpFillMaxH: number;
  hpFillSlashW: number;
  floorFill: Sprite | null;
  floorFillMaxH: number;
  depthFrame: Sprite | null;
  depthFill: Sprite | null;
  depthFillTexture: Texture | null;
  depthFillX: number;
  depthFillY: number;
  depthFillW: number;
  depthFillMaxH: number;
  depthTickContainer: Container | null;
  portraitSpritePromise: Promise<Sprite> | null;
}

export function createSkinHudFrameParts(
  skin: UISkin,
  s: number,
  skinLayer: Container,
  layoutWrappers: Map<string, Container>,
  minimapFrameVisible: boolean,
): SkinHudFrameParts {
  const result: SkinHudFrameParts = {
    mapFrame: null,
    hpFrame: null,
    hpFill: null,
    hpFillMask: null,
    hpFillMaxW: 0,
    hpFillMaxH: 0,
    hpFillSlashW: 0,
    floorFill: null,
    floorFillMaxH: 0,
    depthFrame: null,
    depthFill: null,
    depthFillTexture: null,
    depthFillX: 0,
    depthFillY: 0,
    depthFillW: 0,
    depthFillMaxH: 0,
    depthTickContainer: null,
    portraitSpritePromise: null,
  };

  const wrap = (id: string, parent: Container = skinLayer): Container => (
    createOrGetHudLayoutWrapper(layoutWrappers, id, parent)
  );

  const place = (name: string, into: Container = skinLayer): Sprite | null => {
    const tex = skin.getTexture(name);
    const bounds = skin.getBounds(name);
    if (!tex || !bounds) return null;

    const sprite = createHudSkinSliceSprite(s, tex, bounds);
    into.addChild(sprite);
    return sprite;
  };

  place('hud_status_frame', wrap('statusFrame'));

  const hpWrap = wrap('hpBar');
  hpWrap.zIndex = 20;
  result.hpFrame = place('hud_status_hp_frame', hpWrap);
  if (result.hpFrame) result.hpFrame.zIndex = 10;

  const portraitWrap = wrap('portraitFrame');
  place('hud_status_portrait_frame', portraitWrap);
  const portraitBounds = skin.getBounds('hud_status_portrait_frame');
  if (portraitBounds) {
    result.portraitSpritePromise = loadHudPortraitSprite(s, portraitBounds, portraitWrap);
  }

  place('hud_status_atk_frame');
  place('hud_floor_indicator');
  result.mapFrame = place('hud_map_frame', wrap('mapFrame'));
  if (result.mapFrame) result.mapFrame.visible = minimapFrameVisible;

  const depthFrameTex = skin.getTexture('hud_depth_indicator');
  const depthFrameBounds = skin.getBounds('hud_depth_indicator');
  const depthFillTex = skin.getTexture('hud_depth_indicator_fill');
  const depthFillBounds = skin.getBounds('hud_depth_indicator_fill');
  if (depthFrameTex && depthFrameBounds && depthFillTex && depthFillBounds) {
    const depthWrap = wrap('depthFrame');
    const depthParts = createSkinHudDepthGaugeParts(s, depthFrameTex, depthFrameBounds, depthFillTex, depthFillBounds);
    result.depthFrame = depthParts.frame;
    depthWrap.addChild(result.depthFrame);

    result.depthFillTexture = depthFillTex;
    result.depthFillX = depthParts.fillX;
    result.depthFillY = depthParts.fillY;
    result.depthFillW = depthParts.fillW;
    result.depthFillMaxH = depthParts.fillMaxH;
    result.depthFill = depthParts.fill;
    depthWrap.addChild(result.depthFill);

    result.depthTickContainer = depthParts.tickContainer;
    depthWrap.addChild(result.depthTickContainer);
  }

  const hpFillTex = skin.getTexture('hud_status_hp_fill');
  const hpFillBounds = skin.getBounds('hud_status_hp_fill');
  const hpFillCenter = skin.getCenter('hud_status_hp_fill');
  const hpFrameBoundsForFill = skin.getBounds('hud_status_hp_frame');
  if (hpFillTex && hpFillBounds && hpFrameBoundsForFill) {
    const hpFill = createSkinHudHpFillParts(s, hpFillTex, hpFillBounds, hpFillCenter, hpFrameBoundsForFill);
    result.hpFill = hpFill.fill;
    result.hpFillMaxW = hpFill.fillMaxW;
    result.hpFillMaxH = hpFill.fillMaxH;
    result.hpFillSlashW = hpFill.fillSlashW;
    hpWrap.addChild(result.hpFill);

    result.hpFillMask = hpFill.mask;
    hpWrap.addChild(result.hpFillMask);
  }

  const floorFillTex = skin.getTexture('hud_floor_indicator_fill');
  const floorFillBounds = skin.getBounds('hud_floor_indicator_fill');
  if (floorFillTex && floorFillBounds) {
    const floorFill = createHudFloorFill(s, floorFillTex, floorFillBounds);
    result.floorFill = floorFill.fill;
    result.floorFillMaxH = floorFill.fillMaxH;
    skinLayer.addChild(result.floorFill);
  }

  return result;
}
