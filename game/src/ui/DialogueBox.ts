/**
 * DialogueBox.ts — Bottom-screen dialogue UI with typing effect.
 *
 * Supports monologue (auto-close) and NPC dialogue (Z-key advance).
 * Returns a Promise that resolves when all lines are finished.
 */

import { Container, Graphics, BitmapText } from 'pixi.js';
import { PIXEL_FONT } from './fonts';
import { GameAction } from '@core/InputManager';
import type { InputManager } from '@core/InputManager';
import type { DialogueLine } from '@data/dialogues';

import { GAME_WIDTH, GAME_HEIGHT } from '../Game';
const BOX_HEIGHT = 60;
const BOX_Y = GAME_HEIGHT - BOX_HEIGHT;
const PADDING_X = 10;
const SPEAKER_Y = 6;
const BODY_Y = 20;
const HINT_X = GAME_WIDTH - 20;
const HINT_Y = BOX_HEIGHT - 14;

const TYPE_SPEED = 40; // ms per character
const BLINK_SPEED = 500; // ms per blink cycle

type BoxState = 'hidden' | 'typing' | 'waiting' | 'closing';

export class DialogueBox {
  readonly container: Container;
  private bg: Graphics;
  private speakerText: BitmapText;
  private bodyText: BitmapText;
  private advanceHint: BitmapText;

  private state: BoxState = 'hidden';
  private lines: DialogueLine[] = [];
  private lineIndex = 0;
  private charIndex = 0;
  private typeTimer = 0;
  private autoCloseTimer = 0;
  private blinkTimer = 0;

  private resolveFn: (() => void) | null = null;
  private input: InputManager;

  /** True during NPC dialogue — blocks player movement. */
  blocksMovement = false;

  constructor(input: InputManager) {
    this.input = input;
    this.container = new Container();
    this.container.visible = false;

    this.bg = new Graphics();
    this.bg.rect(0, 0, GAME_WIDTH, BOX_HEIGHT).fill({ color: 0x000000, alpha: 0.75 });
    this.bg.y = BOX_Y;
    this.container.addChild(this.bg);

    this.speakerText = new BitmapText({
      text: '',
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xffffff },
    });
    this.speakerText.x = PADDING_X;
    this.speakerText.y = BOX_Y + SPEAKER_Y;
    this.container.addChild(this.speakerText);

    this.bodyText = new BitmapText({
      text: '',
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xffffff },
    });
    this.bodyText.x = PADDING_X;
    this.bodyText.y = BOX_Y + BODY_Y;
    this.container.addChild(this.bodyText);

    this.advanceHint = new BitmapText({
      text: 'X',
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xaaaaaa },
    });
    this.advanceHint.x = HINT_X;
    this.advanceHint.y = BOX_Y + HINT_Y;
    this.advanceHint.visible = false;
    this.container.addChild(this.advanceHint);
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

    // freezePlayer explicit override, otherwise block if any line has a speaker
    this.blocksMovement = freezePlayer ?? lines.some(l => l.speaker !== undefined);

    this.container.visible = true;
    this.startLine();

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

    if (this.state === 'typing') {
      this.typeTimer += dt;
      const line = this.lines[this.lineIndex];
      const fullText = line.text;

      // Advance characters by elapsed time
      while (this.typeTimer >= TYPE_SPEED && this.charIndex < fullText.length) {
        this.typeTimer -= TYPE_SPEED;
        this.charIndex++;
        this.bodyText.text = fullText.substring(0, this.charIndex);
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
    } else if (this.state === 'waiting') {
      const line = this.lines[this.lineIndex];

      // Auto-close for monologue
      if (line.autoCloseMs) {
        this.autoCloseTimer -= dt;
        if (this.autoCloseTimer <= 0 || zPressed) {
          this.advanceLine();
          return;
        }
      } else {
        // Z key — advance to next line
        if (zPressed) {
          this.advanceLine();
          return;
        }
      }

      // Blink the Z hint
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
      this.speakerText.style.fill = line.speakerColor ?? 0xffffff;
      this.speakerText.visible = true;
    } else {
      this.speakerText.visible = false;
    }

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
      this.close();
    }
  }
}
