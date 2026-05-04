/**
 * LoreDisplay.ts — Portrait-style lore text UI with typing effect.
 *
 * Layout:
 *  ┌──────┬──────────────────────────────┐
 *  │      │  Source Name                 │
 *  │ PORT │  Lore text typing...         │
 *  │ RAIT │                           ▼  │
 *  └──────┴──────────────────────────────┘
 *
 * Used in ItemWorldScene Memory Rooms to replay an item's memory fragments.
 * This is NOT character dialogue — Erda never speaks. The text represents
 * the item's recorded memory being replayed.
 *
 * Features:
 *  - Left-side portrait (sprite or colored placeholder)
 *  - Typewriter effect with punctuation delays
 *  - Slide-in / slide-out animation
 *  - ▼ blinking advance indicator
 */

import { Container, Graphics, BitmapText, Sprite, Texture, Assets } from 'pixi.js';
import { assetPath } from '@core/AssetLoader';
import { PIXEL_FONT } from './fonts';
import { GameAction } from '@core/InputManager';
import type { InputManager } from '@core/InputManager';
import { KeyPrompt } from './KeyPrompt';

import { GAME_WIDTH, GAME_HEIGHT } from '../Game';

// Layout constants
const BOX_HEIGHT = 64;
const BOX_Y_TARGET = GAME_HEIGHT - BOX_HEIGHT - 48;  // final position (raised 3 tiles to avoid HUD overlap)
const BOX_Y_HIDDEN = GAME_HEIGHT + 4;                 // off-screen (slide-out)
const PORTRAIT_SIZE = 48;
const PORTRAIT_PAD = 6;
const TEXT_LEFT = PORTRAIT_SIZE + PORTRAIT_PAD * 2 + 4;
const SPEAKER_Y = 6;
const BODY_Y = 20;

// Timing
const TYPE_SPEED = 35;          // ms per character
const COMMA_DELAY = 100;        // extra ms on comma
const PERIOD_DELAY = 150;       // extra ms on period/!/?
const ELLIPSIS_DELAY = 200;     // extra ms on ...
const SLIDE_DURATION = 150;     // ms slide animation
const BLINK_SPEED = 500;        // ms per blink cycle

type BoxState = 'hidden' | 'slide_in' | 'typing' | 'waiting' | 'slide_out';

/** A single lore line displayed in the memory replay UI. */
export interface LoreLine {
  /** The text content of this memory fragment. */
  text: string;
  /** Optional source label (item name, fragment ID, etc.). */
  speaker?: string;
  /** Optional speaker color override (hex number). */
  speakerColor?: number;
  /** Portrait key — loads assets/portraits/{portrait}.png. Falls back to speaker. */
  portrait?: string;
  /** If set, the line auto-closes after this many milliseconds. */
  autoCloseMs?: number;
}

// Portrait cache
const portraitCache = new Map<string, Texture>();

/** Displays item memory fragment text in a slide-up panel. */
export class LoreDisplay {
  readonly container: Container;
  private boxContainer: Container;  // slides up/down
  private bg: Graphics;
  private borderTop: Graphics;
  private speakerText: BitmapText;
  private bodyText: BitmapText;
  /**
   * 진행/스킵 프롬프트 컨테이너 — `[C] ▶` 형식.
   * ui-components.html §lore-display 명세 (KeyIcon + 화살표) 일치.
   * KeyIcon 은 createKeyIconForAction 기반이라 패드 hot-swap 시 자동 글리프 갱신.
   */
  private advanceHint: Container;
  /** advanceHint 안의 ▶ 라벨 — alpha blink 토글 대상. */
  private advanceArrow: BitmapText;
  private portraitContainer: Container;
  private portraitSprite: Sprite | null = null;
  private portraitPlaceholder: Graphics;

  private state: BoxState = 'hidden';
  private lines: LoreLine[] = [];
  private lineIndex = 0;
  private charIndex = 0;
  private typeTimer = 0;
  private autoCloseTimer = 0;
  private blinkTimer = 0;
  private slideTimer = 0;
  private currentPortraitKey = '';
  /** Grace period (ms) after showDialogue / startLine — ignore advance input. */
  private advanceGuard = 0;

  private resolveFn: (() => void) | null = null;
  private input: InputManager;

  /** True while lore text is being displayed — blocks player movement. */
  blocksMovement = false;

  constructor(input: InputManager) {
    this.input = input;
    this.container = new Container();
    this.container.visible = false;

    this.boxContainer = new Container();
    this.boxContainer.y = BOX_Y_HIDDEN;
    this.container.addChild(this.boxContainer);

    // Background — dark with slight transparency
    this.bg = new Graphics();
    this.bg.rect(0, 0, GAME_WIDTH, BOX_HEIGHT).fill({ color: 0x0a0a0f, alpha: 0.88 });
    this.boxContainer.addChild(this.bg);

    // Top border — metallic accent line
    this.borderTop = new Graphics();
    this.borderTop.rect(0, 0, GAME_WIDTH, 1).fill({ color: 0x556677, alpha: 0.8 });
    this.borderTop.rect(0, 1, GAME_WIDTH, 1).fill({ color: 0x334455, alpha: 0.4 });
    this.boxContainer.addChild(this.borderTop);

    // Portrait area — left side
    this.portraitContainer = new Container();
    this.portraitContainer.x = PORTRAIT_PAD;
    this.portraitContainer.y = (BOX_HEIGHT - PORTRAIT_SIZE) / 2;
    this.boxContainer.addChild(this.portraitContainer);

    // Portrait border
    const portraitBorder = new Graphics();
    portraitBorder.rect(-1, -1, PORTRAIT_SIZE + 2, PORTRAIT_SIZE + 2)
      .stroke({ color: 0x556677, width: 1 });
    this.portraitContainer.addChild(portraitBorder);

    // Placeholder (colored square for sources without portrait image)
    this.portraitPlaceholder = new Graphics();
    this.portraitPlaceholder.rect(0, 0, PORTRAIT_SIZE, PORTRAIT_SIZE)
      .fill({ color: 0x334455 });
    this.portraitContainer.addChild(this.portraitPlaceholder);

    // Source label
    this.speakerText = new BitmapText({
      text: '',
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xffcc44 },
    });
    this.speakerText.x = TEXT_LEFT;
    this.speakerText.y = SPEAKER_Y;
    this.boxContainer.addChild(this.speakerText);

    // Body text
    this.bodyText = new BitmapText({
      text: '',
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xdddddd },
    });
    this.bodyText.x = TEXT_LEFT;
    this.bodyText.y = BODY_Y;
    this.boxContainer.addChild(this.bodyText);

    // Advance hint ▼
    // Advance / skip prompt \u2014 [C] \u25B6 (ui-components \u00A7lore-display \uBA85\uC138 \uC77C\uCE58).
    // KeyIcon \uC740 ATTACK \uC561\uC158 \uC790\uB3D9 \uD45C\uAE30 \u2014 \uD328\uB4DC \uC7A1\uC73C\uBA74 [A]/[X] \uB4F1\uC73C\uB85C hot-swap.
    this.advanceHint = new Container();
    const KEY_SIZE = 8;
    const ARROW_GAP = 2;
    const keyIcon = KeyPrompt.createKeyIconForAction(GameAction.ATTACK, KEY_SIZE);
    keyIcon.x = 0;
    keyIcon.y = 0;
    this.advanceHint.addChild(keyIcon);
    this.advanceArrow = new BitmapText({
      text: '\u25B6',
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xaaaaaa },
    });
    this.advanceArrow.x = KEY_SIZE + ARROW_GAP;
    this.advanceArrow.y = 0;
    this.advanceHint.addChild(this.advanceArrow);
    // \uC6B0\uD558\uB2E8 \uC815\uB82C.
    const totalW = KEY_SIZE + ARROW_GAP + this.advanceArrow.width;
    this.advanceHint.x = GAME_WIDTH - 8 - totalW;
    this.advanceHint.y = BOX_HEIGHT - 6 - KEY_SIZE;
    this.advanceHint.visible = false;
    this.boxContainer.addChild(this.advanceHint);
  }

  /** True when the display is visible (not in 'hidden' state). */
  get isActive(): boolean {
    return this.state !== 'hidden';
  }

  /** Show a sequence of lore lines. Resolves when all lines are dismissed. */
  showDialogue(lines: LoreLine[], freezePlayer?: boolean): Promise<void> {
    this.lines = lines;
    this.lineIndex = 0;

    this.blocksMovement = freezePlayer ?? lines.some(l => l.speaker !== undefined);
    this.container.visible = true;

    // Consume any lingering ATTACK press so it doesn't immediately advance
    // the first line (e.g. player pressed C to pick up an item, then dialogue opens).
    this.input.consumeJustPressed(GameAction.ATTACK);
    this.advanceGuard = 300; // 300ms grace — ignore input while box slides in + first typing

    // Start slide-in
    this.state = 'slide_in';
    this.slideTimer = SLIDE_DURATION;
    this.boxContainer.y = BOX_Y_HIDDEN;

    this.preparePortrait(lines[0]);

    return new Promise<void>((resolve) => {
      this.resolveFn = resolve;
    });
  }

  /** Immediately hide the display and resolve any pending promise. */
  close(): void {
    this.state = 'hidden';
    this.container.visible = false;
    this.blocksMovement = false;
    this.lines = [];
    if (this.resolveFn) {
      this.resolveFn();
      this.resolveFn = null;
    }
  }

  /** Must be called every frame while the display may be active. */
  update(dt: number): void {
    if (this.state === 'hidden') return;

    // Grace period — ignore advance input briefly after dialogue opens / line starts
    if (this.advanceGuard > 0) {
      this.advanceGuard -= dt;
      // Consume any presses during guard so they don't queue up
      if (this.input.isJustPressed(GameAction.ATTACK)) {
        this.input.consumeJustPressed(GameAction.ATTACK);
      }
    }

    // Pattern B(Prompt): C(ATTACK) = 진행/스킵. Z/X 는 UI 에서 사용 금지
    const advance = this.advanceGuard <= 0 && this.input.isJustPressed(GameAction.ATTACK);
    if (advance) this.input.consumeJustPressed(GameAction.ATTACK);

    // --- Slide In ---
    if (this.state === 'slide_in') {
      this.slideTimer -= dt;
      const t = Math.max(0, this.slideTimer / SLIDE_DURATION);
      this.boxContainer.y = BOX_Y_TARGET + (BOX_Y_HIDDEN - BOX_Y_TARGET) * t * t;

      if (this.slideTimer <= 0) {
        this.boxContainer.y = BOX_Y_TARGET;
        this.startLine();
      }
      return;
    }

    // --- Slide Out ---
    if (this.state === 'slide_out') {
      this.slideTimer -= dt;
      const t = 1 - Math.max(0, this.slideTimer / SLIDE_DURATION);
      this.boxContainer.y = BOX_Y_TARGET + (BOX_Y_HIDDEN - BOX_Y_TARGET) * t * t;

      if (this.slideTimer <= 0) {
        this.close();
      }
      return;
    }

    // --- Typing ---
    if (this.state === 'typing') {
      this.typeTimer += dt;
      const line = this.lines[this.lineIndex];
      const fullText = line.text;

      while (this.typeTimer >= 0 && this.charIndex < fullText.length) {
        this.charIndex++;
        this.bodyText.text = fullText.substring(0, this.charIndex);

        // Punctuation delays
        const ch = fullText[this.charIndex - 1];
        if (ch === '.' || ch === '!' || ch === '?') {
          this.typeTimer -= TYPE_SPEED + PERIOD_DELAY;
        } else if (ch === ',') {
          this.typeTimer -= TYPE_SPEED + COMMA_DELAY;
        } else if (ch === '…' || (ch === '.' && fullText[this.charIndex] === '.')) {
          this.typeTimer -= TYPE_SPEED + ELLIPSIS_DELAY;
        } else {
          this.typeTimer -= TYPE_SPEED;
        }
      }

      // C key — skip to full text
      if (advance && this.charIndex < fullText.length) {
        this.charIndex = fullText.length;
        this.bodyText.text = fullText;
      }

      // Typing complete
      if (this.charIndex >= fullText.length) {
        this.state = 'waiting';
        this.autoCloseTimer = line.autoCloseMs ?? 0;
        // 사용자 결정 2026-05-04: autoClose 여부 무관하게 prompt 항상 표시.
        // 일반 dialogue 와 동일한 [C] ▶ / [A] ▶ 시그널 — 첫 사용자도 어떤 키로
        // 진행 가능한지 즉시 인지. autoClose 는 그대로 작동 (대기 중 입력 가능).
        this.advanceHint.visible = true;
      }
    }

    // --- Waiting ---
    else if (this.state === 'waiting') {
      const line = this.lines[this.lineIndex];

      if (line.autoCloseMs) {
        this.autoCloseTimer -= dt;
        if (this.autoCloseTimer <= 0 || advance) {
          this.advanceLine();
          return;
        }
      } else {
        if (advance) {
          this.advanceLine();
          return;
        }
      }

      // Blink ▼
      this.blinkTimer += dt;
      if (this.blinkTimer > BLINK_SPEED) this.blinkTimer -= BLINK_SPEED;
      this.advanceHint.alpha = this.blinkTimer < BLINK_SPEED / 2 ? 1 : 0.3;
    }
  }

  private startLine(): void {
    const line = this.lines[this.lineIndex];

    if (line.speaker) {
      this.speakerText.text = line.speaker;
      this.speakerText.style.fill = line.speakerColor ?? 0xffcc44;
      this.speakerText.visible = true;
    } else {
      this.speakerText.visible = false;
    }

    this.preparePortrait(line);

    this.bodyText.text = '';
    this.charIndex = 0;
    this.typeTimer = 0;
    this.blinkTimer = 0;
    this.advanceHint.visible = false;
    this.state = 'typing';
  }

  private advanceLine(): void {
    this.lineIndex++;
    if (this.lineIndex < this.lines.length) {
      this.startLine();
    } else {
      this.state = 'slide_out';
      this.slideTimer = SLIDE_DURATION;
    }
  }

  private preparePortrait(line: LoreLine): void {
    const key = line.portrait ?? line.speaker ?? '';
    if (key === this.currentPortraitKey) return;
    this.currentPortraitKey = key;

    if (this.portraitSprite) {
      this.portraitContainer.removeChild(this.portraitSprite);
      this.portraitSprite = null;
    }

    if (!key) {
      this.portraitPlaceholder.visible = true;
      return;
    }

    const cached = portraitCache.get(key);
    if (cached) {
      this.setPortraitTexture(cached);
      return;
    }

    const path = assetPath(`assets/portraits/${key}.png`);
    Assets.load(path).then((tex: Texture) => {
      portraitCache.set(key, tex);
      if (this.currentPortraitKey === key) {
        this.setPortraitTexture(tex);
      }
    }).catch(() => {
      this.portraitPlaceholder.visible = true;
      this.portraitPlaceholder.clear();
      const color = line.speakerColor ?? 0x556677;
      this.portraitPlaceholder.rect(0, 0, PORTRAIT_SIZE, PORTRAIT_SIZE).fill({ color, alpha: 0.5 });
    });
  }

  private setPortraitTexture(tex: Texture): void {
    this.portraitPlaceholder.visible = false;
    const sprite = new Sprite(tex);
    sprite.width = PORTRAIT_SIZE;
    sprite.height = PORTRAIT_SIZE;
    this.portraitSprite = sprite;
    this.portraitContainer.addChild(sprite);
  }
}
