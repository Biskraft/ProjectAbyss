/**
 * TutorialHint.ts — One-time tutorial popups.
 *
 * Floating bottom-center panel: [s28 KEY CAP] + 14px label, orange soft pulse.
 * SSoT: game/docs/ui-components.html `.tutorial-hint`. DEC-035 키컬러 orange.
 * Each hint ID fires at most once per session; persistent hints stay until dismiss().
 */

import { Container, Graphics } from 'pixi.js';
import { createUiText } from './factories';
import { KeyPrompt } from './KeyPrompt';
import type { InputManager } from '@core/InputManager';
import type { GameAction } from '@core/InputManager';
import { trackTutorialStep } from '@utils/Analytics';
import { HudConst } from '@data/constData';
import { create9SlicePanel } from './ModalPanel';
import { applyLayoutToContainer } from './HUD';
import type { UISkin } from './UISkin';

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
const ACCENT_COLOR = 0xFFA41B;     // DEC-035 키컬러 orange (brand #FFA41B 2026-05-20)
const BORDER_W = 1;
const BORDER_ALPHA = 0.55;
const HALO_OFFSET = 3;             // halo extends past panel
const HALO_ALPHA_MIN = 0.20;
const HALO_ALPHA_MAX = 0.55;
const PULSE_PERIOD_MS = 1600;      // soft tier (matches ui-components.html)

const BOX_Y = GAME_HEIGHT - 48;    // bottom-center anchor

export interface TutorialHintOpts {
  /** 레거시 단일 키 라벨 — 정적, 표시 시점 글리프. */
  keyLabel?: string;
  /** GameAction 다중 키 — KeyPrompt.createKeyIconForAction 으로 디바이스 hot-swap 자동 갱신. */
  actions?: GameAction[];
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

  constructor(input: InputManager, parent: Container, private readonly skin: UISkin | null = null) {
    this.input = input;
    this.container = new Container();
    // Layout-editable wrapper (HUD tool, id 'tutorialHint'). parent is the
    // uiScale-scaled legacyUIContainer, so override units are base-640 (mult 1).
    const layoutWrap = new Container();
    layoutWrap.addChild(this.container);
    parent.addChild(layoutWrap);
    applyLayoutToContainer(layoutWrap, 'tutorialHint', 1);
  }

  /**
   * Restore the set of already-shown hint ids from a save load. Once an id
   * is in `shown`, `tryShow` is a no-op — so previously-displayed hints
   * never re-appear after loading the game.
   */
  hydrate(ids: readonly string[] | undefined): void {
    if (!ids?.length) return;
    for (const id of ids) this.shown.add(id);
  }

  /** Serialize the shown set for SaveManager. Order doesn't matter. */
  getCompletedIds(): string[] {
    return [...this.shown];
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

    // Build key row — actions 우선(hot-swap), fallback to keyLabel (정적).
    // 다중 키는 사이에 "+" glyph 로 콤보 표시.
    const keyRow = new Container();
    const keyIcons: Container[] = [];
    if (opts.actions && opts.actions.length > 0) {
      for (const a of opts.actions) keyIcons.push(KeyPrompt.createKeyIconForAction(a, KEY_SIZE));
    } else if (opts.keyLabel) {
      keyIcons.push(KeyPrompt.createKeyIcon(opts.keyLabel, KEY_SIZE));
    }
    let rowX = 0;
    const PLUS_PAD = 3;
    for (let i = 0; i < keyIcons.length; i++) {
      if (i > 0) {
        const plus = createUiText('+', { fontSize: LABEL_FONT, fill: 0xffffff });
        plus.x = rowX + PLUS_PAD;
        plus.y = Math.floor((KEY_SIZE - plus.height) / 2);
        keyRow.addChild(plus);
        rowX += plus.width + PLUS_PAD * 2;
      }
      keyIcons[i].x = rowX;
      keyIcons[i].y = 0;
      keyRow.addChild(keyIcons[i]);
      rowX += KEY_SIZE;
    }
    const keyRowW = rowX;

    const label = createUiText(opts.text, { fontSize: LABEL_FONT, fill: 0xffffff });

    const innerGap = keyRowW > 0 ? GAP : 0;
    const contentW = keyRowW + innerGap + label.width;
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

    // Background panel: use the shared UISkin 9-slice frame when available.
    const frame = this.skin?.isLoaded ? create9SlicePanel(this.skin, totalW, totalH) : null;
    if (frame) {
      frame.x = startX;
      frame.y = 0;
      panel.addChild(frame);
    } else {
      const bg = new Graphics();
      bg.roundRect(startX, 0, totalW, totalH, 4).fill({ color: BG_COLOR, alpha: BG_ALPHA });
      bg.roundRect(startX, 0, totalW, totalH, 4)
        .stroke({ color: ACCENT_COLOR, width: BORDER_W, alpha: BORDER_ALPHA });
      panel.addChild(bg);
    }

    if (keyRowW > 0) {
      keyRow.x = startX + PAD_X;
      keyRow.y = PAD_Y;
      panel.addChild(keyRow);
    }

    label.x = startX + PAD_X + keyRowW + innerGap;
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

  /** True while a hint with the given id is currently displayed. */
  isShowing(id: string): boolean {
    return this.panel !== null && this.panelId === id;
  }

  /**
   * 학습 완료 신호 후 즉시 사라지지 않고 `delayMs` 동안 유지 후 자동 fade.
   * 실수 입력으로 hint 가 사용자 인지 전에 사라지는 케이스 방지. persistent 해제 +
   * 잔여 timer 를 delayMs 로 reset — update() 가 timer 진행 + fade 처리.
   */
  dismissAfter(id: string, delayMs: number): void {
    if (this.panel && this.panelId === id) {
      this.panelPersistent = false;
      this.timer = delayMs;
      this.fading = false;
    }
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
