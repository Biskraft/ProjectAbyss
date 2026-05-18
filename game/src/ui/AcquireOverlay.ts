/**
 * AcquireOverlay.ts
 *
 * Ceremonial 1회성 모달 — Relic 획득 / Max HP 증강 시 표시.
 *
 * 가이드: game/docs/ui-components.html § AcquireOverlay
 *
 * 핵심 차이점 (vs LorePopup/Inventory/Forge):
 *   - 9-slice 패널 박스 없음. 화면 중앙에 떠 있는 요소만 (eyebrow + 아이콘 + 이름 + 본문 + 힌트).
 *   - 배경은 radial-vignette texture (중앙 22% 완전 투명 → 가장자리 0.7 alpha).
 *     게임 월드가 그대로 비치며 시선만 중앙으로 집중.
 *   - 이름은 Cinzel(TITLE_FONT) bitmap atlas. PIXEL_FONT 와 시각 격차 확보.
 *   - 두 variant (relic / hp) 는 색만 다르고 레이아웃 동일.
 *
 * 입력 잠금:
 *   - 1000ms 동안 ATTACK 입력 무시 (연타 skip 방지). [C] 프롬프트에 progress arc 표시.
 *   - LorePopup 과 동일 패턴.
 */

import { Container, Graphics, BitmapText, Text, Sprite, Texture } from 'pixi.js';
import { GameAction, actionKey } from '@core/InputManager';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';
import { GlowFilter } from '@effects/GlowFilter';
import { KeyPrompt } from './KeyPrompt';
import { createUiText } from './factories';
import { TITLE_FONT } from './fonts';
import {
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_GOLD,
  ROW_SELECTED_GLOW,
} from './ModalPanel';
import { t } from '@i18n';

// ── Public types ────────────────────────────────────────────────────────────

export type AcquireRelicIconKey =
  | 'dash'
  | 'doubleJump'
  | 'wallJump'
  | 'waterBreathing'
  | 'surge'
  | 'diveAttack';

export interface AcquireRelicConfig {
  type: 'relic';
  iconKey: AcquireRelicIconKey;
  /** Pre-localized name (e.g. "DASH"). */
  name: string;
  /** Pre-localized usage text. Must contain "{key}" placeholder if keyAction is set. */
  usage: string;
  /** Action to embed as key icon in usage text. Omit for relics without a key (Water Breathing). */
  keyAction?: GameAction;
  /** Glow tint, default ROW_SELECTED_GLOW (#FF9933 orange). */
  tint?: number;
}

export interface AcquireHpConfig {
  type: 'hp';
  /** Pre-localized name e.g. "+1 MAX HP". */
  name: string;
  /** Pre-localized description. */
  description: string;
  /** Glow tint, default TEXT_GOLD (#FFD700). */
  tint?: number;
}

export type AcquireConfig = AcquireRelicConfig | AcquireHpConfig;

// ── Tuning ──────────────────────────────────────────────────────────────────

const FADE_IN_MS = 300;
const FADE_OUT_MS = 220;
const INPUT_LOCK_MS = 1000;
const PROMPT_DIM_ALPHA = 0.3;
const PROMPT_NORMAL_ALPHA = 1.0;

const ICON_SIZE = 80;
const HALO_OUTER_PAD = 10;
const HALO_INNER_PAD = 2;

/**
 * Radial dim + vignette stops. (2026-05-18 강화 — relic/HP 획득 시 hero 영역도
 * dim 처리해 텍스트 readability 보장.) 이전엔 중앙 22% 완전 투명이라 게임 월드
 * 가 그대로 비쳤음 → 중앙도 모더레이트 dim (0.55) 적용, 가장자리로 갈수록 더 어둡게.
 */
const VIGNETTE_STOPS: Array<[number, string]> = [
  [0.00, 'rgba(0,0,0,0.55)'],
  [0.55, 'rgba(0,0,0,0.7)'],
  [1.00, 'rgba(8,8,16,0.85)'],
];

// Lazy-cached texture (single instance across all overlays).
let cachedVignetteTexture: Texture | null = null;

export class AcquireOverlay {
  readonly container: Container;

  private vignette: Sprite;
  private centerStack: Container;
  private visible_ = false;
  private onClose: (() => void) | null = null;

  private inputLockMs = 0;
  private totalLockMs = INPUT_LOCK_MS;

  private fadeT = 0;
  private closing = false;
  private closeT = 0;
  private pulseT = 0;

  private closePrompt: Container | null = null;
  private closeLabel: BitmapText | Text | null = null;
  private iconHaloOuter: Graphics | null = null;
  private iconHaloInner: Graphics | null = null;

  /**
   * @param uiScale  Native pixel scale (1=640, 2=1280, 3=1920) — InventoryUI
   *                 동일 패턴. uiContainer(native) 직속 마운트.
   */
  constructor(uiScale: number = 1) {
    this.container = new Container();
    this.container.scale.set(uiScale);
    this.container.visible = false;

    // Radial vignette — single canvas-generated texture, cached.
    this.vignette = new Sprite(getVignetteTexture());
    this.container.addChild(this.vignette);

    this.centerStack = new Container();
    this.container.addChild(this.centerStack);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  isBlocking(): boolean {
    return this.visible_;
  }

  /** Returns true once initial input-lock has elapsed and the user can dismiss. */
  canConfirm(): boolean {
    return this.visible_ && !this.closing && this.inputLockMs <= 0;
  }

  show(config: AcquireConfig, onClose?: () => void): void {
    this.onClose = onClose ?? null;
    this.draw(config);
    this.visible_ = true;
    this.container.visible = true;
    this.container.alpha = 0;
    this.inputLockMs = INPUT_LOCK_MS;
    this.totalLockMs = INPUT_LOCK_MS;
    this.fadeT = 0;
    this.closing = false;
    this.closeT = 0;
    this.pulseT = 0;
    this.refreshPromptVisuals();
  }

  /** Begin fade-out close. Call from input handler when canConfirm() is true. */
  confirm(): void {
    if (!this.visible_ || this.closing) return;
    this.closing = true;
    this.closeT = 0;
  }

  /** Force immediate close (no fade). Used for scene teardown. */
  close(): void {
    if (!this.visible_) return;
    this.visible_ = false;
    this.closing = false;
    this.container.visible = false;
    const cb = this.onClose;
    this.onClose = null;
    if (cb) cb();
  }

  update(dt: number): void {
    if (!this.visible_) return;
    this.pulseT += dt;

    // Fade-in / Fade-out alpha
    if (this.closing) {
      this.closeT += dt;
      const k = Math.min(1, this.closeT / FADE_OUT_MS);
      this.container.alpha = 1 - easeOutCubic(k);
      if (this.closeT >= FADE_OUT_MS) {
        this.close();
        return;
      }
    } else if (this.fadeT < FADE_IN_MS) {
      this.fadeT += dt;
      const k = Math.min(1, this.fadeT / FADE_IN_MS);
      this.container.alpha = easeOutCubic(k);
    } else {
      this.container.alpha = 1;
    }

    // Input lock countdown
    if (this.inputLockMs > 0) {
      this.inputLockMs -= dt;
      if (this.inputLockMs < 0) this.inputLockMs = 0;
    }

    // Halo pulse (1.4 Hz sin — anvil/selection 통일)
    if (this.iconHaloOuter && this.iconHaloInner) {
      const ph = Math.sin((this.pulseT / 1000) * Math.PI * 2 * 1.4);
      this.iconHaloOuter.alpha = 0.55 + ph * 0.25;
      this.iconHaloInner.alpha = 0.30 + ph * 0.15;
    }

    this.refreshPromptVisuals();
  }

  destroy(): void {
    if (this.container.parent) this.container.parent.removeChild(this.container);
    this.container.destroy({ children: true });
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private refreshPromptVisuals(): void {
    const locked = this.inputLockMs > 0;
    const labelAlpha = locked ? PROMPT_DIM_ALPHA : PROMPT_NORMAL_ALPHA;
    if (this.closeLabel) this.closeLabel.alpha = labelAlpha;
    if (this.closePrompt) this.closePrompt.alpha = PROMPT_NORMAL_ALPHA;
    if (!this.closePrompt) return;
    const progress = locked && this.totalLockMs > 0
      ? 1 - this.inputLockMs / this.totalLockMs
      : 0;
    KeyPrompt.setKeyIconProgress(this.closePrompt, progress);
  }

  private draw(config: AcquireConfig): void {
    // Reset center stack
    for (const c of [...this.centerStack.children]) {
      this.centerStack.removeChild(c);
      c.destroy?.({ children: true });
    }
    this.iconHaloOuter = null;
    this.iconHaloInner = null;
    this.closePrompt = null;
    this.closeLabel = null;

    const tint = config.tint ?? (config.type === 'hp' ? TEXT_GOLD : ROW_SELECTED_GLOW);

    // ── Eyebrow ───────────────────────────────────────────────────────────
    const eyebrowKey = config.type === 'relic' ? 'ui.acquire.eyebrow_relic' : 'ui.acquire.eyebrow_hp';
    const eyebrow = createUiText(t(eyebrowKey), {
      fontSize: 8,
      fill: tint,
      letterSpacing: 4,
    });
    eyebrow.x = -Math.floor(eyebrow.width / 2);
    eyebrow.y = -88;
    this.centerStack.addChild(eyebrow);

    // ── Icon + halo rings ─────────────────────────────────────────────────
    const iconC = new Container();
    iconC.x = 0;
    iconC.y = -42;
    this.centerStack.addChild(iconC);

    const haloOuter = new Graphics();
    haloOuter.circle(0, 0, ICON_SIZE / 2 + HALO_OUTER_PAD).stroke({
      color: tint, width: 1, alpha: 0.55,
    });
    iconC.addChild(haloOuter);
    this.iconHaloOuter = haloOuter;

    const haloInner = new Graphics();
    haloInner.circle(0, 0, ICON_SIZE / 2 + HALO_INNER_PAD).stroke({
      color: tint, width: 1, alpha: 0.30,
    });
    iconC.addChild(haloInner);
    this.iconHaloInner = haloInner;

    const iconSymbol = buildIconSymbol(config, tint, ICON_SIZE);
    iconC.addChild(iconSymbol);

    // GPU glow filter on the whole icon container (halo rings + symbol)
    iconC.filters = [new GlowFilter({
      color: tint, radius: 18, intensity: 1.0, coreBoost: 0.6,
    })];

    // ── Name (display font: Cinzel atlas in EN, Noto Sans KR in KO) ─────
    const nameText = createUiText(
      config.name,
      {
        fontSize: 18,
        fill: TEXT_PRIMARY,
        letterSpacing: 6,
      },
      undefined,
      TITLE_FONT,
    );
    nameText.x = -Math.floor(nameText.width / 2);
    nameText.y = 14;
    this.centerStack.addChild(nameText);

    // ── Body: usage (relic) or description (hp) ─────────────────────────
    const BODY_Y = 44;
    if (config.type === 'relic') {
      if (config.keyAction !== undefined && config.usage.includes('{key}')) {
        this.layoutUsageWithKey(config.usage, config.keyAction, BODY_Y);
      } else {
        const usage = createUiText(config.usage, {
          fontSize: 10,
          fill: TEXT_SECONDARY,
          wordWrap: true,
          wordWrapWidth: 300,
          align: 'center',
        });
        usage.x = -Math.floor(usage.width / 2);
        usage.y = BODY_Y;
        this.centerStack.addChild(usage);
      }
    } else {
      const desc = createUiText(config.description, {
        fontSize: 10,
        fill: TEXT_SECONDARY,
        wordWrap: true,
        wordWrapWidth: 300,
        align: 'center',
      });
      desc.x = -Math.floor(desc.width / 2);
      desc.y = BODY_Y;
      this.centerStack.addChild(desc);
    }

    // ── [C] CONTINUE prompt (with progress arc during input lock) ───────
    const promptC = new Container();
    promptC.y = 84;
    this.centerStack.addChild(promptC);

    const closePrompt = KeyPrompt.createKeyIcon(actionKey(GameAction.ATTACK), 10);
    promptC.addChild(closePrompt);
    const closeLabel = createUiText(t('ui.acquire.continue'), {
      fontSize: 8,
      fill: TEXT_SECONDARY,
      letterSpacing: 2,
    });
    closeLabel.x = closePrompt.width + 6;
    closeLabel.y = 1;
    promptC.addChild(closeLabel);

    const promptW = closePrompt.width + 6 + closeLabel.width;
    promptC.x = -Math.floor(promptW / 2);

    this.closePrompt = closePrompt;
    this.closeLabel = closeLabel;

    // Stack centered on screen
    this.centerStack.x = Math.floor(GAME_WIDTH / 2);
    this.centerStack.y = Math.floor(GAME_HEIGHT / 2);
  }

  private layoutUsageWithKey(usage: string, keyAction: GameAction, y: number): void {
    const idx = usage.indexOf('{key}');
    const before = usage.slice(0, idx);
    const after = usage.slice(idx + 5);

    const fontSize = 10;
    const beforeText = createUiText(before, { fontSize, fill: TEXT_SECONDARY });
    const keyIcon = KeyPrompt.createKeyIconForAction(keyAction, 10);
    const afterText = createUiText(after, { fontSize, fill: TEXT_SECONDARY });

    const gap = 4;
    const totalW = beforeText.width + gap + keyIcon.width + gap + afterText.width;
    let cx = -Math.floor(totalW / 2);

    beforeText.x = cx;
    beforeText.y = y;
    this.centerStack.addChild(beforeText);
    cx += beforeText.width + gap;

    keyIcon.x = cx;
    keyIcon.y = y - 1;
    this.centerStack.addChild(keyIcon);
    cx += keyIcon.width + gap;

    afterText.x = cx;
    afterText.y = y;
    this.centerStack.addChild(afterText);
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function easeOutCubic(k: number): number {
  return 1 - Math.pow(1 - k, 3);
}

function getVignetteTexture(): Texture {
  if (cachedVignetteTexture) return cachedVignetteTexture;
  const w = GAME_WIDTH;
  const h = GAME_HEIGHT;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.sqrt((w / 2) ** 2 + (h / 2) ** 2);
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  for (const [stop, color] of VIGNETTE_STOPS) gradient.addColorStop(stop, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  cachedVignetteTexture = Texture.from(canvas);
  return cachedVignetteTexture;
}

/**
 * Draw a distinct geometric symbol per acquire icon key.
 * v1: Graphics primitives (no sprite assets). Replace with sprite atlas when
 * relic icons are produced.
 */
function buildIconSymbol(config: AcquireConfig, tint: number, size: number): Graphics {
  const g = new Graphics();
  const r = size / 2;

  if (config.type === 'hp') {
    // Heart — two bezier lobes meeting at a downward point
    const s = r * 0.55;
    g.moveTo(0, s * 0.55);
    g.bezierCurveTo(s * 1.25, -s * 0.55, s * 0.45, -s * 1.25, 0, -s * 0.28);
    g.bezierCurveTo(-s * 0.45, -s * 1.25, -s * 1.25, -s * 0.55, 0, s * 0.55);
    g.fill({ color: tint, alpha: 0.95 });
    // Specular highlight
    g.circle(-s * 0.42, -s * 0.58, s * 0.16).fill({ color: 0xFFFFFF, alpha: 0.55 });
    return g;
  }

  switch (config.iconKey) {
    case 'dash': {
      // Right chevron + 3 trailing motion lines
      g.poly([-r * 0.05, -r * 0.5, r * 0.55, 0, -r * 0.05, r * 0.5]).fill({ color: tint, alpha: 1 });
      for (let i = 0; i < 3; i++) {
        const x0 = -r * 0.9 + i * 8;
        g.rect(x0, -2, 10, 4).fill({ color: tint, alpha: 0.55 - i * 0.15 });
      }
      break;
    }
    case 'doubleJump': {
      const drawChevron = (yOffset: number, alpha: number) => {
        g.poly([
          -r * 0.55, yOffset + 4,
          -r * 0.35, yOffset + 4,
          0, yOffset - 2,
          r * 0.35, yOffset + 4,
          r * 0.55, yOffset + 4,
          0, yOffset - 8,
        ]).fill({ color: tint, alpha });
      };
      drawChevron(-r * 0.22, 1.0);
      drawChevron(r * 0.22, 0.55);
      break;
    }
    case 'wallJump': {
      // Vertical wall bar + diagonal arrow leaving the wall
      g.rect(-r * 0.7, -r * 0.6, 6, r * 1.2).fill({ color: tint, alpha: 0.9 });
      g.poly([
        -r * 0.35, r * 0.45,
         r * 0.55, -r * 0.35,
         r * 0.55, -r * 0.05,
         r * 0.20, -r * 0.05,
         r * 0.20,  r * 0.45,
      ]).fill({ color: tint, alpha: 1 });
      break;
    }
    case 'waterBreathing': {
      const drop = (cx: number, cy: number, alpha: number) => {
        g.circle(cx, cy, r * 0.18).fill({ color: tint, alpha });
        g.poly([cx - r * 0.18, cy - 1, cx, cy - r * 0.42, cx + r * 0.18, cy - 1])
          .fill({ color: tint, alpha });
      };
      drop(0, -r * 0.35, 1.0);
      drop(-r * 0.42, r * 0.18, 0.85);
      drop(r * 0.42, r * 0.18, 0.85);
      break;
    }
    case 'surge': {
      // Lightning bolt zigzag
      g.poly([
        -r * 0.10, -r * 0.70,
         r * 0.40, -r * 0.10,
         r * 0.05, -r * 0.10,
         r * 0.30,  r * 0.70,
        -r * 0.30,  r * 0.00,
         r * 0.05,  r * 0.00,
      ]).fill({ color: tint, alpha: 1 });
      break;
    }
    case 'diveAttack': {
      // Down-pointing arrow (shaft + arrowhead)
      g.rect(-r * 0.15, -r * 0.70, r * 0.30, r * 0.85).fill({ color: tint, alpha: 0.95 });
      g.poly([0, r * 0.65, r * 0.55, -r * 0.05, -r * 0.55, -r * 0.05]).fill({ color: tint, alpha: 1 });
      break;
    }
  }
  return g;
}
