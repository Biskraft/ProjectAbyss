/**
 * TutorialHint.ts — One-time tutorial popups.
 *
 * Shows a semi-transparent panel at top-center, auto-dismisses after 4s or on X key.
 * Each hint ID fires at most once per session.
 */

import { Container, Graphics, BitmapText } from 'pixi.js';
import { PIXEL_FONT } from './fonts';
import { GameAction } from '@core/InputManager';
import type { InputManager } from '@core/InputManager';

const DISPLAY_DURATION = 8000;
const FADE_DURATION = 500;
const BOX_Y = 16;
import { GAME_WIDTH } from '../Game';

export class TutorialHint {
  readonly container: Container;
  private shown: Set<string> = new Set();
  private input: InputManager;

  private panel: Container | null = null;
  private timer = 0;
  private fading = false;

  constructor(input: InputManager, parent: Container) {
    this.input = input;
    this.container = new Container();
    parent.addChild(this.container);
  }

  tryShow(id: string, text: string): void {
    if (this.shown.has(id)) return;
    if (this.panel) return; // one at a time
    this.shown.add(id);

    const panel = new Container();

    const label = new BitmapText({
      text,
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xffffff },
    });
    label.anchor.set(0.5, 0);
    label.x = 0;
    label.y = 6;

    const padX = 12;
    const padY = 6;
    const boxW = label.width + padX * 2;
    const boxH = label.height + padY * 2;

    const bg = new Graphics();
    bg.roundRect(-boxW / 2, 0, boxW, boxH, 3).fill({ color: 0x000000, alpha: 0.7 });
    bg.roundRect(-boxW / 2, 0, boxW, boxH, 3).stroke({ color: 0xffffff, width: 1, alpha: 0.3 });

    panel.addChild(bg);
    panel.addChild(label);
    panel.x = GAME_WIDTH / 2;
    panel.y = BOX_Y;

    this.container.addChild(panel);
    this.panel = panel;
    this.timer = DISPLAY_DURATION;
    this.fading = false;
  }

  update(dt: number): void {
    if (!this.panel) return;

    this.timer -= dt;

    // Z key (jump) to dismiss immediately
    if (this.input.isJustPressed(GameAction.JUMP)) {
      this.input.consumeJustPressed(GameAction.JUMP);
      this.timer = Math.min(this.timer, FADE_DURATION);
      this.fading = true;
    }

    if (this.timer <= FADE_DURATION) {
      this.fading = true;
      this.panel.alpha = Math.max(0, this.timer / FADE_DURATION);
    }

    if (this.timer <= 0) {
      this.container.removeChild(this.panel);
      this.panel = null;
    }
  }

  destroy(): void {
    if (this.panel) {
      this.container.removeChild(this.panel);
      this.panel = null;
    }
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
  }
}
