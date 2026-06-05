import { Graphics, Sprite, type Texture } from 'pixi.js';
import { TEXT_GOLD } from '../ModalPanel';
import {
  BOSS_HEAL_FLASH_DURATION,
  GHOST_BAR_DURATION,
  HEAL_FLASH_DURATION,
  HP_BG_COLOR,
  HP_BORDER_COLOR,
  LOW_HP_PULSE_PERIOD,
} from './HudConstants';
import { capHudRatio, hudRatio } from './HudNumeric';
import { hpBarColor, hpRatio } from './HudVitals';

export interface DrawHudHpBarOptions {
  s: number;
  width: number;
  height: number;
  currentHp: number;
  maxHp: number;
  ghostHp: number;
  ghostTimer: number;
  healFlashTimer: number;
  healFlashColor: number;
  healFlashRatio: number;
  healFlashStartRatio: number;
  lowHpTimer: number;
}

export interface UpdateSkinHudHpFillOptions {
  s: number;
  currentHp: number;
  maxHp: number;
  fillMaxW: number;
  fillMaxH: number;
  fillSlashW: number;
}

interface HudSkinBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface HudSkinCenter {
  x: number;
  w: number;
}

export interface HudSkinHpFillParts {
  fill: Sprite;
  mask: Graphics;
  fillMaxW: number;
  fillMaxH: number;
  fillSlashW: number;
}

export function createHudHpBarGraphics(x: number, y: number): Graphics {
  const gfx = new Graphics();
  gfx.x = x;
  gfx.y = y;
  return gfx;
}

export function createSkinHudHpFillParts(
  s: number,
  fillTexture: Texture,
  fillBounds: HudSkinBounds,
  fillCenter: HudSkinCenter | null | undefined,
  frameBounds: HudSkinBounds,
): HudSkinHpFillParts {
  const fill = new Sprite(fillTexture);
  fill.x = frameBounds.x * s;
  fill.y = frameBounds.y * s;
  fill.height = frameBounds.h * s;
  fill.width = frameBounds.w * s;
  fill.zIndex = 20;

  const mask = new Graphics();
  mask.x = fill.x;
  mask.y = fill.y;
  mask.zIndex = 20;
  fill.mask = mask;

  const fillSlashW = ((fillCenter)
    ? fillBounds.w - (fillCenter.x + fillCenter.w)
    : Math.round(fillBounds.h * 0.85)) * s;

  return {
    fill,
    mask,
    fillMaxW: frameBounds.w * s,
    fillMaxH: frameBounds.h * s,
    fillSlashW,
  };
}

export function updateSkinHudHpFill(
  fill: Sprite,
  mask: Graphics,
  options: UpdateSkinHudHpFillOptions,
): void {
  const ratio = hudRatio(options.currentHp, options.maxHp);
  fill.visible = ratio > 0;
  mask.clear();
  if (ratio <= 0) return;

  const slash = Math.max(options.s, options.fillSlashW);
  const front = options.fillMaxW * ratio;
  const topRight = Math.min(options.fillMaxW, front + slash * 0.5);
  const bottomRight = Math.max(0, front - slash * 0.5);

  mask
    .poly([0, 0, topRight, 0, bottomRight, options.fillMaxH, 0, options.fillMaxH])
    .fill(0xffffff);
}

export interface RedrawHudHpBarOptions extends DrawHudHpBarOptions {
  skinFill: Sprite | null;
  skinFillMask: Graphics | null;
  skinFillMaxW: number;
  skinFillMaxH: number;
  skinFillSlashW: number;
}

export function redrawHudHpBar(gfx: Graphics, options: RedrawHudHpBarOptions): void {
  drawHudHpBar(gfx, options);

  if (!options.skinFill || !options.skinFillMask) return;
  updateSkinHudHpFill(options.skinFill, options.skinFillMask, {
    s: options.s,
    currentHp: options.currentHp,
    maxHp: options.maxHp,
    fillMaxW: options.skinFillMaxW,
    fillMaxH: options.skinFillMaxH,
    fillSlashW: options.skinFillSlashW,
  });
}

export interface AdvanceHudHpBarTimersOptions {
  dt: number;
  currentHp: number;
  maxHp: number;
  ghostHp: number;
  ghostTimer: number;
  healFlashTimer: number;
  lowHpTimer: number;
}

export interface AdvanceHudHpBarTimersResult {
  ghostHp: number;
  ghostTimer: number;
  healFlashTimer: number;
  lowHpTimer: number;
  shouldRedraw: boolean;
}

export function advanceHudHpBarTimers(options: AdvanceHudHpBarTimersOptions): AdvanceHudHpBarTimersResult {
  let ghostHp = options.ghostHp;
  let ghostTimer = options.ghostTimer;
  let healFlashTimer = options.healFlashTimer;
  let lowHpTimer = options.lowHpTimer;
  let shouldRedraw = false;

  if (ghostTimer > 0) {
    ghostTimer -= options.dt;
    if (ghostTimer <= 0) {
      ghostHp = 0;
      ghostTimer = 0;
    }
    shouldRedraw = true;
  }

  if (healFlashTimer > 0) {
    healFlashTimer -= options.dt;
    if (healFlashTimer <= 0) healFlashTimer = 0;
    shouldRedraw = true;
  }

  const ratio = hpRatio(options.currentHp, options.maxHp);
  if (ratio > 0 && ratio < 0.25) {
    lowHpTimer = (lowHpTimer + options.dt) % LOW_HP_PULSE_PERIOD;
    shouldRedraw = true;
  } else {
    lowHpTimer = 0;
  }

  return {
    ghostHp,
    ghostTimer,
    healFlashTimer,
    lowHpTimer,
    shouldRedraw,
  };
}

export function drawHudHpBar(gfx: Graphics, options: DrawHudHpBarOptions): void {
  gfx.clear();

  const maxHp = options.maxHp || 1;
  const ratio = hpRatio(options.currentHp, maxHp);

  gfx
    .rect(-options.s, -options.s, options.width + 2 * options.s, options.height + 2 * options.s)
    .fill(HP_BORDER_COLOR);
  gfx.rect(0, 0, options.width, options.height).fill(HP_BG_COLOR);

  if (options.ghostTimer > 0 && options.ghostHp > options.currentHp) {
    const ghostRatio = capHudRatio(options.ghostHp / maxHp);
    const ghostAlpha = options.ghostTimer / GHOST_BAR_DURATION;
    gfx.rect(0, 0, options.width * ghostRatio, options.height).fill({ color: 0xaa2222, alpha: ghostAlpha * 0.8 });
  }

  if (options.healFlashTimer > 0) {
    const duration = options.healFlashColor === TEXT_GOLD ? BOSS_HEAL_FLASH_DURATION : HEAL_FLASH_DURATION;
    const flashAlpha = options.healFlashTimer / duration;
    const x0 = options.width * Math.max(0, options.healFlashStartRatio);
    const x1 = options.width * capHudRatio(options.healFlashRatio);
    if (x1 > x0) {
      gfx.rect(x0, 0, x1 - x0, options.height).fill({ color: options.healFlashColor, alpha: flashAlpha * 0.9 });
    }
  }

  const hpColor = hpBarColor(ratio, options.lowHpTimer, LOW_HP_PULSE_PERIOD);
  let fillAlpha = 1;
  if (ratio > 0 && ratio < 0.25 && options.lowHpTimer > 0) {
    const pulse = Math.sin((options.lowHpTimer / LOW_HP_PULSE_PERIOD) * Math.PI * 2);
    fillAlpha = 0.7 + 0.3 * ((pulse + 1) / 2);
  }
  gfx.rect(0, 0, options.width * ratio, options.height).fill({ color: hpColor, alpha: fillAlpha });
}
