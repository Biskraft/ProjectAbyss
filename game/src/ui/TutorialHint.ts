/**
 * TutorialHint.ts — One-time tutorial popups.
 *
 * Floating bottom-center panel: [s28 KEY CAP] + 14px label, orange soft pulse.
 * SSoT: game/docs/ui-components.html `.tutorial-hint`. DEC-035 키컬러 orange.
 * Each hint ID fires at most once per session; persistent hints stay until dismiss().
 */

import { Container, Graphics, BitmapText } from 'pixi.js';
import { PIXEL_FONT } from './fonts';
import { KeyPrompt } from './KeyPrompt';
import type { InputManager } from '@core/InputManager';
import { trackTutorialStep } from '@utils/Analytics';
import { HudConst } from '@data/constData';

const DISPLAY_DURATION = HudConst.Tutorial.DisplayDurationMs;
const FADE_DURATION = HudConst.Tutorial.FadeDurationMs;
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';

// Layout (mirrors `.tutorial-hint` token in ui-components.html, 0.75 scale)
const KEY_SIZE = 21;
const LABEL_FONT = 11;
const PAD_X = 14;
const PAD_Y = 9;
const GAP = 8;
const BG_COLOR = 0x000000;
const BG_ALPHA = 0.7;
const ACCENT_COLOR = 0xFF8000;     // DEC-035 키컬러 orange
const BORDER_W = 1;
const BORDER_ALPHA = 0.55;
const HALO_OFFSET = 3;             // halo extends past panel
const HALO_ALPHA_MIN = 0.20;
const HALO_ALPHA_MAX = 0.55;
const PULSE_PERIOD_MS = 1600;      // soft tier (matches ui-components.html)

const BOX_Y = GAME_HEIGHT - 48;    // bottom-center anchor

export interface TutorialHintOpts {
  keyLabel?: string;
  text: string;
  persistent?: boolean;
}

export class TutorialHint {
  readonly container: Container;
  private shown: Set<string> = new Set();
  private input: InputManager;

  private panel: Container | null = null;
  private panelHalo: Graphics | null = null;
  private panelId: string | null = null;
  private panelPersistent = false;
  private timer = 0;
  private pulseTimer = 0;
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
  tryShow(id: string, opts: TutorialHintOpts): void {
    if (this.shown.has(id)) return;
    if (this.panel) return; // one at a time
    this.shown.add(id);
    trackTutorialStep(id);

    const panel = new Container();

    const keyIcon = opts.keyLabel ? KeyPrompt.createKeyIcon(opts.keyLabel, KEY_SIZE) : null;
    const label = new BitmapText({
      text: opts.text,
      style: { fontFamily: PIXEL_FONT, fontSize: LABEL_FONT, fill: 0xffffff },
    });

    const keyW = keyIcon ? KEY_SIZE : 0;
    const innerGap = keyIcon ? GAP : 0;
    const contentW = keyW + innerGap + label.width;
    const totalW = contentW + PAD_X * 2;
    const totalH = Math.max(KEY_SIZE, label.height) + PAD_Y * 2;
    const startX = -Math.floor(totalW / 2);

    // Halo (orange soft glow, pulsed)
    const halo = new Graphics();
    halo.roundRect(
      startX - HALO_OFFSET, -HALO_OFFSET,
      totalW + HALO_OFFSET * 2, totalH + HALO_OFFSET * 2, 6,
    ).fill({ color: ACCENT_COLOR, alpha: 1 });
    halo.alpha = HALO_ALPHA_MIN;
    panel.addChild(halo);

    // Background panel
    const bg = new Graphics();
    bg.roundRect(startX, 0, totalW, totalH, 4).fill({ color: BG_COLOR, alpha: BG_ALPHA });
    bg.roundRect(startX, 0, totalW, totalH, 4)
      .stroke({ color: ACCENT_COLOR, width: BORDER_W, alpha: BORDER_ALPHA });
    panel.addChild(bg);

    if (keyIcon) {
      keyIcon.x = startX + PAD_X;
      keyIcon.y = PAD_Y;
      panel.addChild(keyIcon);
    }

    label.x = startX + PAD_X + keyW + innerGap;
    label.y = PAD_Y + Math.floor((KEY_SIZE - label.height) / 2);
    panel.addChild(label);

    panel.x = Math.floor(GAME_WIDTH / 2);
    panel.y = BOX_Y - totalH;

    this.container.addChild(panel);
    this.panel = panel;
    this.panelHalo = halo;
    this.panelId = id;
    this.panelPersistent = !!opts.persistent;
    this.timer = DISPLAY_DURATION;
    this.pulseTimer = 0;
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
      this.panelHalo = null;
      this.panelId = null;
      this.panelPersistent = false;
    }
  }

  update(dt: number): void {
    if (!this.panel) return;

    // Pulse halo regardless of persistent/fade state — keeps the eye drawn.
    this.pulseTimer = (this.pulseTimer + dt) % PULSE_PERIOD_MS;
    if (this.panelHalo) {
      const phase = (this.pulseTimer / PULSE_PERIOD_MS) * Math.PI * 2;
      const v = (Math.sin(phase) + 1) * 0.5; // 0..1
      this.panelHalo.alpha = HALO_ALPHA_MIN + v * (HALO_ALPHA_MAX - HALO_ALPHA_MIN);
    }

    if (this.panelPersistent) return; // stays until dismiss()

    this.timer -= dt;

    if (this.timer <= FADE_DURATION) {
      this.fading = true;
      this.panel.alpha = Math.max(0, this.timer / FADE_DURATION);
    }

    if (this.timer <= 0) {
      this.container.removeChild(this.panel);
      this.panel = null;
      this.panelHalo = null;
      this.panelId = null;
    }
  }

  destroy(): void {
    if (this.panel) {
      this.container.removeChild(this.panel);
      this.panel = null;
      this.panelHalo = null;
      this.panelId = null;
    }
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
  }
}
