/**
 * TutorialHint.ts — One-time tutorial popups.
 *
 * Shows a semi-transparent panel at top-center, auto-dismisses after 4s or on X key.
 * Each hint ID fires at most once per session.
 */

import { Container, Graphics, BitmapText } from 'pixi.js';
import { PIXEL_FONT } from './fonts';
import type { InputManager } from '@core/InputManager';
import { trackTutorialStep } from '@utils/Analytics';
import { HudConst } from '@data/constData';

const DISPLAY_DURATION = HudConst.Tutorial.DisplayDurationMs;
const FADE_DURATION = HudConst.Tutorial.FadeDurationMs;
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';
// Lower-center placement so the hint is closer to the player and easier to
// notice without obstructing the top HUD.
const BOX_Y = GAME_HEIGHT - 64;

export class TutorialHint {
  readonly container: Container;
  private shown: Set<string> = new Set();
  private input: InputManager;

  private panel: Container | null = null;
  private panelId: string | null = null;
  private panelPersistent = false;
  private timer = 0;
  private fading = false;

  constructor(input: InputManager, parent: Container) {
    this.input = input;
    this.container = new Container();
    parent.addChild(this.container);
  }

  /**
   * Show a hint by id. Each id fires at most once per session unless dismissed.
   * If `persistent: true`, the panel stays visible until `dismiss(id)` is called
   * (no auto-fade). Useful for "press [I] to open inventory" cues that should
   * remain until the player actually performs the taught action.
   */
  tryShow(id: string, text: string, opts: { persistent?: boolean } = {}): void {
    if (this.shown.has(id)) return;
    if (this.panel) return; // one at a time
    this.shown.add(id);
    trackTutorialStep(id);

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
    this.panelId = id;
    this.panelPersistent = !!opts.persistent;
    this.timer = DISPLAY_DURATION;
    this.fading = false;
  }

  /**
   * Remove a persistent hint matching `id`. No-op for non-matching ids.
   *
   * The `shown` set is preserved so dismissed hints do not re-fire — gating
   * for re-fires (e.g. inventory cue on every IW return) lives at the call
   * sites via save-state flags, not here.
   */
  dismiss(id: string): void {
    if (this.panel && this.panelId === id) {
      this.container.removeChild(this.panel);
      this.panel = null;
      this.panelId = null;
      this.panelPersistent = false;
    }
  }

  update(dt: number): void {
    if (!this.panel) return;
    if (this.panelPersistent) return; // stays until dismiss()

    this.timer -= dt;

    if (this.timer <= FADE_DURATION) {
      this.fading = true;
      this.panel.alpha = Math.max(0, this.timer / FADE_DURATION);
    }

    if (this.timer <= 0) {
      this.container.removeChild(this.panel);
      this.panel = null;
      this.panelId = null;
    }
  }

  destroy(): void {
    if (this.panel) {
      this.container.removeChild(this.panel);
      this.panel = null;
      this.panelId = null;
    }
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
  }
}
