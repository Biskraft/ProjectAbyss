/**
 * DialogueBox.ts — Portrait-style dialogue UI with typing effect.
 *
 * Layout:
 *  ┌──────┬──────────────────────────────┐
 *  │      │  Speaker Name                │
 *  │ PORT │  Dialogue text typing...     │
 *  │ RAIT │                           ▼  │
 *  └──────┴──────────────────────────────┘
 *
 * Features:
 *  - Left-side portrait (sprite or colored placeholder)
 *  - Typewriter effect with punctuation delays
 *  - Slide-in / slide-out animation
 *  - ▼ blinking advance indicator
 *  - Silent protagonist: Erda never appears in dialogue UI
 */

import { Container, Graphics, BitmapText, Sprite, Texture, Assets } from 'pixi.js';
import { PIXEL_FONT } from './fonts';
import { GameAction } from '@core/InputManager';
import type { InputManager } from '@core/InputManager';
import type { DialogueLine } from '@data/dialogues';

import { GAME_WIDTH, GAME_HEIGHT } from '../Game';

// Layout constants
const BOX_HEIGHT = 64;
const BOX_Y_TARGET = GAME_HEIGHT - BOX_HEIGHT;  // final position
const BOX_Y_HIDDEN = GAME_HEIGHT + 4;            // off-screen (slide-out)
const PORTRAIT_SIZE = 48;
const PORTRAIT_PAD = 6;
const TEXT_LEFT = PORTRAIT_SIZE + PORTRAIT_PAD * 2 + 4;
const SPEAKER_Y = 6;
const BODY_Y = 20;
const BODY_MAX_W = GAME_WIDTH - TEXT_LEFT - 12;

// Timing
const TYPE_SPEED = 35;          // ms per character
const COMMA_DELAY = 100;        // extra ms on comma
const PERIOD_DELAY = 150;       // extra ms on period/!/?
const ELLIPSIS_DELAY = 200;     // extra ms on ...
const SLIDE_DURATION = 150;     // ms slide animation
const BLINK_SPEED = 500;        // ms per blink cycle

type BoxState = 'hidden' | 'slide_in' | 'typing' | 'waiting' | 'slide_out';

// Portrait cache
const portraitCache = new Map<string, Texture>();

export class DialogueBox {
  readonly container: Container;
  private boxContainer: Container;  // slides up/down
  private bg: Graphics;
  private borderTop: Graphics;
  private speakerText: BitmapText;
  private bodyText: BitmapText;
  private advanceHint: BitmapText;
  private portraitContainer: Container;
  private portraitSprite: Sprite | null = null;
  private portraitPlaceholder: Graphics;

  private state: BoxState = 'hidden';
  private lines: DialogueLine[] = [];
  private lineIndex = 0;
  private charIndex = 0;
  private typeTimer = 0;
  private autoCloseTimer = 0;
  private blinkTimer = 0;
  private slideTimer = 0;
  private currentPortraitKey = '';

  private resolveFn: (() => void) | null = null;
  private input: InputManager;

  /** True during NPC dialogue — blocks player movement. */
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

    // Placeholder (colored square for NPCs without portrait image)
    this.portraitPlaceholder = new Graphics();
    this.portraitPlaceholder.rect(0, 0, PORTRAIT_SIZE, PORTRAIT_SIZE)
      .fill({ color: 0x334455 });
    this.portraitContainer.addChild(this.portraitPlaceholder);

    // Speaker name
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
    // BitmapText doesn't support maxWidth — manual line breaks in text data
    this.boxContainer.addChild(this.bodyText);

    // Advance hint ▼
    this.advanceHint = new BitmapText({
      text: '\u25BC',
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0x888888 },
    });
    this.advanceHint.anchor.set(1, 1);
    this.advanceHint.x = GAME_WIDTH - 8;
    this.advanceHint.y = BOX_HEIGHT - 6;
    this.advanceHint.visible = false;
    this.boxContainer.addChild(this.advanceHint);
  }

  get isActive(): boolean {
    return this.state !== 'hidden';
  }

  /** Show a single monologue line (auto-close, doesn't block movement). */
  showMonologue(text: string, autoCloseMs = 3000): Promise<void> {
    return this.showDialogue([{ text, autoCloseMs }]);
  }

  /** Show a sequence of dialogue lines. Resolves when all lines are done. */
  showDialogue(lines: DialogueLine[], freezePlayer?: boolean): Promise<void> {
    this.lines = lines;
    this.lineIndex = 0;

    this.blocksMovement = freezePlayer ?? lines.some(l => l.speaker !== undefined);
    this.container.visible = true;

    // Start slide-in
    this.state = 'slide_in';
    this.slideTimer = SLIDE_DURATION;
    this.boxContainer.y = BOX_Y_HIDDEN;

    this.preparePortrait(lines[0]);

    return new Promise<void>((resolve) => {
      this.resolveFn = resolve;
    });
  }

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

  update(dt: number): void {
    if (this.state === 'hidden') return;

    const zPressed = this.input.isJustPressed(GameAction.JUMP);
    if (zPressed) this.input.consumeJustPressed(GameAction.JUMP);

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

      // Z key — skip to full text
      if (zPressed && this.charIndex < fullText.length) {
        this.charIndex = fullText.length;
        this.bodyText.text = fullText;
      }

      // Typing complete
      if (this.charIndex >= fullText.length) {
        this.state = 'waiting';
        this.autoCloseTimer = line.autoCloseMs ?? 0;
        this.advanceHint.visible = !line.autoCloseMs;
      }
    }

    // --- Waiting ---
    else if (this.state === 'waiting') {
      const line = this.lines[this.lineIndex];

      if (line.autoCloseMs) {
        this.autoCloseTimer -= dt;
        if (this.autoCloseTimer <= 0 || zPressed) {
          this.advanceLine();
          return;
        }
      } else {
        if (zPressed) {
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

    // Speaker name
    if (line.speaker) {
      this.speakerText.text = line.speaker;
      this.speakerText.style.fill = line.speakerColor ?? 0xffcc44;
      this.speakerText.visible = true;
    } else {
      this.speakerText.visible = false;
    }

    // Portrait
    this.preparePortrait(line);

    // Reset typing state
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
      // Slide out
      this.state = 'slide_out';
      this.slideTimer = SLIDE_DURATION;
    }
  }

  private preparePortrait(line: DialogueLine): void {
    const key = line.portrait ?? line.speaker ?? '';
    if (key === this.currentPortraitKey) return;
    this.currentPortraitKey = key;

    // Remove old sprite
    if (this.portraitSprite) {
      this.portraitContainer.removeChild(this.portraitSprite);
      this.portraitSprite = null;
    }

    if (!key) {
      this.portraitPlaceholder.visible = true;
      return;
    }

    // Try cached texture
    const cached = portraitCache.get(key);
    if (cached) {
      this.setPortraitTexture(cached);
      return;
    }

    // Try loading from assets/portraits/{key}.png
    const path = `assets/portraits/${key}.png`;
    Assets.load(path).then((tex: Texture) => {
      portraitCache.set(key, tex);
      if (this.currentPortraitKey === key) {
        this.setPortraitTexture(tex);
      }
    }).catch(() => {
      // No portrait file — show colored placeholder with initial
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
