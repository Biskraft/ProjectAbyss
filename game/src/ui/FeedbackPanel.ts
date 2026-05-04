/**
 * FeedbackPanel — F-key in-game feedback channel for anonymous public testers.
 *
 * Owned by Game (single instance, mounted to legacyUIContainer). Active only
 * inside LdtkWorldScene / ItemWorldScene when the scene is not paused.
 *
 * Submission path:
 *   - Body text → Google Form (FeedbackSubmit, no-cors POST)
 *   - Counts/categories/meta → GA4 (trackFeedbackSubmitted)
 *   - User never sees the Google Form UI.
 *
 * IME safety: backed by a hidden HTMLTextAreaElement that owns input focus.
 * BitmapText mirrors textarea value. compositionstart/end gates Enter so a
 * Hangul completion press doesn't accidentally submit.
 */

import { Container, Graphics, BitmapText, Rectangle } from 'pixi.js';
import { PIXEL_FONT } from './fonts';
import { KeyPrompt } from './KeyPrompt';
import {
  MODAL_BG,
  MODAL_BG_ALPHA,
  MODAL_BORDER,
  MODAL_BORDER_W,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_WARNING,
  TEXT_POSITIVE,
  FONT_TITLE,
  FONT_BODY,
  FONT_HINT,
  ROW_SELECTED_EDGE,
  createOverlay,
} from './ModalPanel';
import {
  trackFeedbackOpened,
  trackFeedbackSubmitted,
  getRunId,
  getBuildVersion,
  getPlaytimeSec,
  getLastEvents,
  getUtmSource,
  getUtmCampaign,
} from '../utils/Analytics';
import { submitFeedback } from '../utils/FeedbackSubmit';
import {
  isFeedbackContextProvider,
  type FeedbackContext,
} from '../utils/FeedbackContext';
import { FEEDBACK_LIMITS } from '../data/feedbackConfig';
import type { Game } from '../Game';

const PANEL_W = 480;
const PANEL_H = 320;
const PAD = 16;
const INPUT_LINES = 8;
const INPUT_LINE_H = FONT_BODY + 4;
const INPUT_H = INPUT_LINES * INPUT_LINE_H + 8;
const CURSOR_BLINK_MS = 500;
const CURSOR_COLOR = 0xff8000;
const CATEGORY_BG_IDLE = 0x2a2a3e;
const CATEGORY_BG_HOVER = 0x3a3a52;
const CATEGORIES: Array<{ value: 'bug' | 'idea' | 'other'; label: string; key: string }> = [
  { value: 'bug',   label: 'Bug 버그',   key: '1' },
  { value: 'idea',  label: 'Idea 제안',  key: '2' },
  { value: 'other', label: 'Other 기타', key: '3' },
];

export class FeedbackPanel {
  private game: Game;
  private container: Container;
  private contextLine!: BitmapText;
  private inputBg!: Graphics;
  private inputText!: BitmapText;
  private counterText!: BitmapText;
  private cursorGfx!: Graphics;
  private categoryBgs: Graphics[] = [];
  private categoryLabels: BitmapText[] = [];

  private hiddenInput!: HTMLTextAreaElement;
  private isOpen = false;
  private isComposing = false;
  private cooldownUntil = 0;
  private currentCategory: 'bug' | 'idea' | 'other' | null = null;
  private currentText = '';
  private blinkTimer = 0;
  private cursorVisible = true;
  private hintText!: BitmapText;
  private hintFlashUntil = 0;
  private hoveredIndex = -1;
  private sendButtonBg!: Graphics;
  private sendLabel!: BitmapText;
  private sendKeyBg!: Graphics;
  private sendKeyText!: BitmapText;
  private sendButtonHovered = false;
  private closeButtonBg!: Graphics;
  private closeButtonHovered = false;
  private hintIndicator!: Container;
  private readonly hintDefault = 'Click or [Tab] to pick category';

  // Bound listeners (so they can be removed cleanly).
  private onKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e);
  private onCompStart = () => { this.isComposing = true; };
  private onCompEnd = () => { this.isComposing = false; this.syncFromHiddenInput(); };
  private onInput = () => { if (!this.isComposing) this.syncFromHiddenInput(); };

  constructor(game: Game) {
    this.game = game;
    this.container = new Container();
    this.container.visible = false;
    // Mount on the top-most overlay layer so the dim overlay covers HUD too.
    game.feedbackOverlayContainer.addChild(this.container);

    this.buildUI();
    this.buildHiddenInput();
    this.buildHintIndicator();

    // Global F key listener — fires regardless of scene focus state.
    window.addEventListener('keydown', (e) => this.handleGlobalKey(e));
  }

  /** Persistent `[F] FEEDBACK` hint shown on HUD whenever F can open the panel. */
  private buildHintIndicator(): void {
    this.hintIndicator = new Container();
    // Mounted on the same overlay layer as the panel so it sits above HUD.
    // Sibling of `this.container` — separate visibility from the panel itself.
    this.game.feedbackOverlayContainer.addChild(this.hintIndicator);

    // KeyPrompt-style: [F] FEEDBACK — full pixel-sharp size, low alpha to stay
    // present without competing with gameplay UI. Pixel fonts break at
    // fractional scales; keep scale at 1.0 and dim with alpha instead.
    const prompt = KeyPrompt.createPrompt('F', 'FEEDBACK');
    this.hintIndicator.addChild(prompt);
    this.hintIndicator.alpha = 0.5;

    // Right-middle placement — minimal gameplay-view obstruction.
    this.hintIndicator.x = 640 - prompt.width - 6;
    this.hintIndicator.y = Math.floor((360 - prompt.height) / 2);
  }

  // -------------------------------------------------------------------------
  // UI construction
  // -------------------------------------------------------------------------

  private buildUI(): void {
    // Dim overlay
    const overlay = createOverlay();
    this.container.addChild(overlay);

    // Centered panel position
    const px = Math.floor((640 - PANEL_W) / 2);
    const py = Math.floor((360 - PANEL_H) / 2);

    const panelBg = new Graphics();
    panelBg.rect(0, 0, PANEL_W, PANEL_H).fill({ color: MODAL_BG, alpha: MODAL_BG_ALPHA });
    panelBg.rect(0, 0, PANEL_W, PANEL_H).stroke({ color: MODAL_BORDER, width: MODAL_BORDER_W });
    panelBg.x = px; panelBg.y = py;
    this.container.addChild(panelBg);

    let cy = py + PAD;

    // Title
    const title = new BitmapText({
      text: 'Feedback (F)',
      style: { fontFamily: PIXEL_FONT, fontSize: FONT_TITLE, fill: TEXT_PRIMARY },
    });
    title.x = px + PAD; title.y = cy;
    this.container.addChild(title);
    cy += FONT_TITLE + 4;

    // Auto-context line
    this.contextLine = new BitmapText({
      text: '',
      style: { fontFamily: PIXEL_FONT, fontSize: FONT_HINT, fill: TEXT_SECONDARY },
    });
    this.contextLine.x = px + PAD; this.contextLine.y = cy;
    this.container.addChild(this.contextLine);
    cy += FONT_HINT + 8;

    // Input box bg
    const inputW = PANEL_W - PAD * 2;
    this.inputBg = new Graphics();
    this.inputBg.rect(0, 0, inputW, INPUT_H).fill({ color: 0x0e0e18, alpha: 1 });
    this.inputBg.rect(0, 0, inputW, INPUT_H).stroke({ color: MODAL_BORDER, width: 1 });
    this.inputBg.x = px + PAD; this.inputBg.y = cy;
    this.container.addChild(this.inputBg);

    // Input text
    this.inputText = new BitmapText({
      text: '',
      style: { fontFamily: PIXEL_FONT, fontSize: FONT_BODY, fill: TEXT_PRIMARY },
    });
    this.inputText.x = px + PAD + 4;
    this.inputText.y = cy + 4;
    this.container.addChild(this.inputText);

    // Cursor (1px vertical bar after text)
    this.cursorGfx = new Graphics();
    this.cursorGfx.rect(0, 0, 1, FONT_BODY).fill({ color: CURSOR_COLOR });
    this.cursorGfx.x = px + PAD + 4;
    this.cursorGfx.y = cy + 4;
    this.container.addChild(this.cursorGfx);

    cy += INPUT_H + 4;

    // Counter (right-aligned)
    this.counterText = new BitmapText({
      text: `0/${FEEDBACK_LIMITS.maxTextLength}`,
      style: { fontFamily: PIXEL_FONT, fontSize: FONT_HINT, fill: TEXT_SECONDARY },
    });
    this.counterText.x = px + PANEL_W - PAD - 40;
    this.counterText.y = cy;
    this.container.addChild(this.counterText);

    cy += FONT_HINT + 12;

    // Category radio (3 horizontal buttons). Clickable via PixiJS pointer events.
    const catW = (PANEL_W - PAD * 2 - 16) / 3;
    const catH = 22;
    for (let i = 0; i < CATEGORIES.length; i++) {
      const cat = CATEGORIES[i];
      const idx = i;
      const bg = new Graphics();
      bg.rect(0, 0, catW, catH).fill({ color: CATEGORY_BG_IDLE, alpha: 1 });
      bg.x = px + PAD + i * (catW + 8);
      bg.y = cy;
      bg.eventMode = 'static';
      bg.cursor = 'pointer';
      bg.hitArea = new Rectangle(0, 0, catW, catH);
      bg.on('pointerover', () => {
        this.hoveredIndex = idx;
        this.refreshCategoryDisplay();
      });
      bg.on('pointerout', () => {
        if (this.hoveredIndex === idx) this.hoveredIndex = -1;
        this.refreshCategoryDisplay();
      });
      bg.on('pointerdown', () => {
        this.currentCategory = cat.value;
        this.refreshCategoryDisplay();
        // Refocus textarea — click would otherwise blur it and break input.
        setTimeout(() => this.hiddenInput.focus(), 0);
      });
      this.container.addChild(bg);
      this.categoryBgs.push(bg);

      const label = new BitmapText({
        text: cat.label,
        style: { fontFamily: PIXEL_FONT, fontSize: FONT_HINT, fill: TEXT_SECONDARY },
      });
      label.x = bg.x + 8;
      label.y = bg.y + Math.floor((catH - FONT_HINT) / 2);
      this.container.addChild(label);
      this.categoryLabels.push(label);
    }
    cy += catH + 8;

    // Bottom row: ESC button (left) | hint (center) | SEND button (right)
    const bottomY = py + PANEL_H - PAD - 18;
    const btnW = 78;
    const btnH = 18;

    // ESC CLOSE button (bottom-left)
    const closeX = px + PAD;
    this.closeButtonBg = new Graphics();
    this.closeButtonBg.x = closeX;
    this.closeButtonBg.y = bottomY;
    this.closeButtonBg.eventMode = 'static';
    this.closeButtonBg.cursor = 'pointer';
    this.closeButtonBg.hitArea = new Rectangle(0, 0, btnW, btnH);
    this.closeButtonBg.on('pointerover', () => { this.closeButtonHovered = true; this.drawCloseButton(); });
    this.closeButtonBg.on('pointerout', () => { this.closeButtonHovered = false; this.drawCloseButton(); });
    this.closeButtonBg.on('pointerdown', () => { this.close(); });
    this.container.addChild(this.closeButtonBg);
    this.drawCloseButton();
    drawMiniKeyBox(this.container, closeX + 6, bottomY + 4, 22, 10, 'ESC');
    const closeLabel = new BitmapText({
      text: 'CLOSE',
      style: { fontFamily: PIXEL_FONT, fontSize: FONT_HINT, fill: TEXT_PRIMARY },
    });
    closeLabel.x = closeX + 34;
    closeLabel.y = bottomY + Math.floor((btnH - FONT_HINT) / 2);
    this.container.addChild(closeLabel);

    // SEND button (bottom-right)
    const sendX = px + PANEL_W - PAD - btnW;
    this.sendButtonBg = new Graphics();
    this.sendButtonBg.x = sendX;
    this.sendButtonBg.y = bottomY;
    this.sendButtonBg.eventMode = 'static';
    this.sendButtonBg.cursor = 'pointer';
    this.sendButtonBg.hitArea = new Rectangle(0, 0, btnW, btnH);
    this.sendButtonBg.on('pointerover', () => { this.sendButtonHovered = true; this.refreshSendButton(); });
    this.sendButtonBg.on('pointerout', () => { this.sendButtonHovered = false; this.refreshSendButton(); });
    this.sendButtonBg.on('pointerdown', () => {
      this.attemptSubmit();
      setTimeout(() => this.hiddenInput.focus(), 0);
    });
    this.container.addChild(this.sendButtonBg);
    this.sendLabel = new BitmapText({
      text: 'SEND',
      style: { fontFamily: PIXEL_FONT, fontSize: FONT_HINT, fill: TEXT_PRIMARY },
    });
    this.sendLabel.x = sendX + 6;
    this.sendLabel.y = bottomY + Math.floor((btnH - FONT_HINT) / 2);
    this.container.addChild(this.sendLabel);
    // ENTER mini key box (KeyPrompt-style: dark box + label)
    const { bg: enterBg, text: enterTxt } = makeMiniKeyBox(sendX + 34, bottomY + 4, 38, 10, 'ENTER');
    this.sendKeyBg = enterBg;
    this.sendKeyText = enterTxt;
    this.container.addChild(this.sendKeyBg);
    this.container.addChild(this.sendKeyText);
    this.refreshSendButton();

    // Hint between the two buttons (centered)
    const hintLeft = closeX + btnW + 8;
    const hintRight = sendX - 8;
    this.hintText = new BitmapText({
      text: this.hintDefault,
      style: { fontFamily: PIXEL_FONT, fontSize: FONT_HINT, fill: TEXT_SECONDARY },
    });
    this.hintText.x = hintLeft + Math.max(0, Math.floor(((hintRight - hintLeft) - this.hintText.width) / 2));
    this.hintText.y = bottomY + Math.floor((btnH - FONT_HINT) / 2);
    this.container.addChild(this.hintText);
  }

  /** Computed disabled state for SEND. */
  private isSendDisabled(): boolean {
    return this.currentCategory === null || this.currentText.trim() === '';
  }

  private drawCloseButton(): void {
    const w = 78;
    const h = 18;
    const fill = this.closeButtonHovered ? 0x3a3a52 : 0x2a2a3e;
    const border = this.closeButtonHovered ? 0xff8000 : 0x4a4a6a;
    this.closeButtonBg.clear();
    this.closeButtonBg.rect(0, 0, w, h).fill({ color: fill, alpha: 1 });
    this.closeButtonBg.rect(0, 0, w, h).stroke({ color: border, width: 1 });
  }

  /** Update SEND button visuals based on disabled + hover state. */
  private refreshSendButton(): void {
    if (!this.sendButtonBg) return;
    const w = 78;
    const h = 18;
    const disabled = this.isSendDisabled();
    let fill = 0x2a2a3e;
    let border = 0x4a4a6a;
    let labelColor = TEXT_PRIMARY;
    let keyBoxBorder = 0x666666;
    let keyBoxBg = 0x1a1a1a;
    let keyTextColor = 0xffffff;
    if (disabled) {
      fill = 0x1e1e2c;
      border = 0x333344;
      labelColor = 0x666677;
      keyBoxBorder = 0x333344;
      keyBoxBg = 0x141420;
      keyTextColor = 0x666677;
    } else if (this.sendButtonHovered) {
      fill = 0x3a3a52;
      border = 0xff8000;
    }
    this.sendButtonBg.clear();
    this.sendButtonBg.rect(0, 0, w, h).fill({ color: fill, alpha: 1 });
    this.sendButtonBg.rect(0, 0, w, h).stroke({ color: border, width: 1 });
    if (this.sendLabel) this.sendLabel.tint = labelColor;
    if (this.sendKeyBg) {
      this.sendKeyBg.clear();
      this.sendKeyBg.roundRect(0, 0, 38, 10, 1).fill({ color: keyBoxBg, alpha: 0.85 });
      this.sendKeyBg.roundRect(0, 0, 38, 10, 1).stroke({ color: keyBoxBorder, width: 1 });
    }
    if (this.sendKeyText) this.sendKeyText.tint = keyTextColor;
  }

  private buildHiddenInput(): void {
    // Off-screen textarea owns the actual IME-safe input. We only mirror its
    // value into BitmapText for display.
    const ta = document.createElement('textarea');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '0';
    ta.style.opacity = '0';
    ta.style.pointerEvents = 'none';
    ta.maxLength = FEEDBACK_LIMITS.maxTextLength;
    ta.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ta);
    this.hiddenInput = ta;

    ta.addEventListener('compositionstart', this.onCompStart);
    ta.addEventListener('compositionend', this.onCompEnd);
    ta.addEventListener('input', this.onInput);
    ta.addEventListener('keydown', this.onKeyDown);

    // Re-acquire focus whenever the textarea blurs while the panel is open.
    // Mouse hover/clicks on Pixi canvas (game.input refocus, etc.) can
    // silently yank focus to the canvas — without this listener, keyboard
    // input stops mid-typing.
    ta.addEventListener('blur', () => {
      if (!this.isOpen) return;
      // Defer one frame so the browser's focus transition completes before we
      // counter it; otherwise the .focus() call races with the in-flight blur.
      requestAnimationFrame(() => {
        if (this.isOpen) this.hiddenInput.focus();
      });
    });
  }

  // -------------------------------------------------------------------------
  // Open / Close
  // -------------------------------------------------------------------------

  open(): void {
    if (this.isOpen) return;

    // Cooldown check
    if (Date.now() < this.cooldownUntil) {
      this.toast('Please wait', TEXT_WARNING, FEEDBACK_LIMITS.toastWaitMs);
      return;
    }

    // Scene gate
    if (!this.canOpenInCurrentScene()) return;

    this.isOpen = true;
    this.game.feedbackOpen = true;
    this.container.visible = true;
    this.hintIndicator.visible = false;
    this.currentText = '';
    this.currentCategory = null;
    this.hiddenInput.value = '';
    this.blinkTimer = 0;
    this.cursorVisible = true;
    this.cursorGfx.visible = true;
    this.refreshContextLine();
    this.refreshInputDisplay();
    this.refreshCategoryDisplay();
    this.refreshSendButton();
    setTimeout(() => this.hiddenInput.focus(), 0);

    trackFeedbackOpened({
      area: this.getCurrentArea(),
      playtime_sec: getPlaytimeSec(),
    });
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.game.feedbackOpen = false;
    this.container.visible = false;
    this.hiddenInput.blur();
    // hintIndicator visibility restored on next update() tick (scene-gated).
  }

  // -------------------------------------------------------------------------
  // Per-frame update (cursor blink)
  // -------------------------------------------------------------------------

  update(dtMs: number): void {
    // Hint indicator visibility — show only in gameplay scenes when panel closed.
    if (this.hintIndicator) {
      this.hintIndicator.visible = !this.isOpen && this.canOpenInCurrentScene();
    }

    if (!this.isOpen) return;
    this.blinkTimer += dtMs;
    if (this.blinkTimer >= CURSOR_BLINK_MS) {
      this.cursorVisible = !this.cursorVisible;
      this.cursorGfx.visible = this.cursorVisible;
      this.blinkTimer = 0;
    }
    // Restore default hint after warning flash expires.
    if (this.hintFlashUntil > 0 && Date.now() >= this.hintFlashUntil) {
      this.hintText.text = this.hintDefault;
      this.hintText.tint = TEXT_SECONDARY;
      this.hintFlashUntil = 0;
    }
  }

  // -------------------------------------------------------------------------
  // Input handling
  // -------------------------------------------------------------------------

  private handleGlobalKey(e: KeyboardEvent): void {
    // Only F triggers open from outside. All other keys handled inside the
    // hidden textarea (keydown listener) when panel is open.
    if (e.key === 'f' || e.key === 'F') {
      if (this.isOpen) return;
      this.open();
      // Prevent F from leaking into game (e.g. as a movement modifier).
      e.preventDefault();
      e.stopPropagation();
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.isOpen) return;

    // Esc — close without submit (always works, even mid-IME).
    if (e.key === 'Escape') {
      this.close();
      e.preventDefault();
      return;
    }

    // Tab — cycle category (always, regardless of cursor or input content).
    // Default browser behavior would tab out of the textarea.
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) this.cycleCategory(-1);
      else this.cycleCategory(1);
      return;
    }

    // Enter — submit. Blocked during IME composition (Hangul completion press).
    if (e.key === 'Enter') {
      if (this.isComposing) return;
      e.preventDefault();
      this.attemptSubmit();
      return;
    }
  }

  private cycleCategory(dir: 1 | -1): void {
    const idx = this.currentCategory === null
      ? (dir > 0 ? 0 : CATEGORIES.length - 1)
      : (CATEGORIES.findIndex(c => c.value === this.currentCategory) + dir + CATEGORIES.length) % CATEGORIES.length;
    this.currentCategory = CATEGORIES[idx].value;
    this.refreshCategoryDisplay();
  }

  private flashWarning(msg: string): void {
    this.hintText.text = msg;
    this.hintText.tint = TEXT_WARNING;
    this.hintFlashUntil = Date.now() + 1500;
  }

  private syncFromHiddenInput(): void {
    let v = this.hiddenInput.value;
    if (v.length > FEEDBACK_LIMITS.maxTextLength) {
      v = v.slice(0, FEEDBACK_LIMITS.maxTextLength);
      this.hiddenInput.value = v;
    }
    this.currentText = v;
    this.refreshInputDisplay();
    this.refreshSendButton();
  }

  // -------------------------------------------------------------------------
  // Submit
  // -------------------------------------------------------------------------

  private attemptSubmit(): void {
    if (this.currentCategory === null) {
      this.flashWarning('Select a category (Tab or click)');
      return;
    }
    if (this.currentText.trim() === '') {
      this.flashWarning('Type something first');
      return;
    }

    const ctx = this.gatherContext();

    trackFeedbackSubmitted({
      area: ctx.area,
      playtime_sec: ctx.playtime_sec,
      category: this.currentCategory,
      text_length: this.currentText.length,
    });

    // Fire-and-forget. submitFeedback handles localStorage backup internally.
    void submitFeedback({
      text: this.currentText,
      category: this.currentCategory,
      context: ctx,
    });

    this.cooldownUntil = Date.now() + FEEDBACK_LIMITS.cooldownMs;
    this.toast('Sent', TEXT_POSITIVE, FEEDBACK_LIMITS.toastSentMs);
    this.close();
  }

  // -------------------------------------------------------------------------
  // Context & display refresh helpers
  // -------------------------------------------------------------------------

  private gatherContext(): FeedbackContext {
    const scene = this.game.sceneManager.active as unknown;
    const sceneCtx = isFeedbackContextProvider(scene)
      ? scene.getFeedbackContext()
      : { area: 'world' as const, room_col: 0, room_row: 0, hp_pct: 100 };

    return {
      area: sceneCtx.area,
      level_id: sceneCtx.level_id,
      room_col: sceneCtx.room_col,
      room_row: sceneCtx.room_row,
      equipped_weapon_id: sceneCtx.equipped_weapon_id,
      hp_pct: sceneCtx.hp_pct,
      playtime_sec: getPlaytimeSec(),
      last_3_events: getLastEvents(),
      utm_source: getUtmSource(),
      utm_campaign: getUtmCampaign(),
      run_id: getRunId(),
      build_version: getBuildVersion(),
      ua_short: shortUa(navigator.userAgent),
      screen_w: window.innerWidth,
      screen_h: window.innerHeight,
    };
  }

  private refreshContextLine(): void {
    const scene = this.game.sceneManager.active as unknown;
    const sceneCtx = isFeedbackContextProvider(scene) ? scene.getFeedbackContext() : null;
    const parts: string[] = [];
    if (sceneCtx) {
      parts.push(sceneCtx.area);
      if (sceneCtx.level_id) parts.push(sceneCtx.level_id);
      if (sceneCtx.room_col !== 0 || sceneCtx.room_row !== 0) {
        parts.push(`${sceneCtx.room_col},${sceneCtx.room_row}`);
      }
    } else {
      parts.push('?');
    }
    parts.push(formatTime(getPlaytimeSec()));
    this.contextLine.text = parts.join(' · ');
  }

  private refreshInputDisplay(): void {
    // Wrap text into INPUT_LINES lines max. Naive char-based wrap.
    const cols = Math.floor((PANEL_W - PAD * 2 - 8) / (FONT_BODY * 0.6)); // approximate
    const lines = wrapText(this.currentText, cols, INPUT_LINES);
    this.inputText.text = lines.join('\n');

    // Position cursor at end of last line
    const lastLine = lines[lines.length - 1] ?? '';
    const lastLineW = lastLine.length * FONT_BODY * 0.6;
    this.cursorGfx.x = this.inputText.x + lastLineW;
    this.cursorGfx.y = this.inputText.y + (lines.length - 1) * INPUT_LINE_H;

    // Counter
    const len = this.currentText.length;
    const max = FEEDBACK_LIMITS.maxTextLength;
    this.counterText.text = `${len}/${max}`;
    this.counterText.tint = len >= FEEDBACK_LIMITS.warningTextLength ? TEXT_WARNING : TEXT_SECONDARY;
  }

  private refreshCategoryDisplay(): void {
    const w = (PANEL_W - PAD * 2 - 16) / 3;
    const h = 22;
    for (let i = 0; i < CATEGORIES.length; i++) {
      const isSelected = CATEGORIES[i].value === this.currentCategory;
      const isHovered = this.hoveredIndex === i;
      const bg = this.categoryBgs[i];
      bg.clear();
      const fillColor = isHovered ? CATEGORY_BG_HOVER : CATEGORY_BG_IDLE;
      bg.rect(0, 0, w, h).fill({ color: fillColor, alpha: 1 });
      if (isSelected) {
        bg.rect(0, 0, w, h).stroke({ color: ROW_SELECTED_EDGE, width: 1 });
      } else if (isHovered) {
        bg.rect(0, 0, w, h).stroke({ color: TEXT_SECONDARY, width: 1 });
      }
      this.categoryLabels[i].tint = isSelected ? ROW_SELECTED_EDGE : TEXT_SECONDARY;
    }
    // Category change affects SEND disabled state.
    this.refreshSendButton();
  }

  // -------------------------------------------------------------------------
  // Scene gating helpers
  // -------------------------------------------------------------------------

  private canOpenInCurrentScene(): boolean {
    const scene = this.game.sceneManager.active as { constructor: { name: string }; isPaused?: boolean } | null;
    if (!scene) return false;
    const okScene = scene.constructor.name === 'LdtkWorldScene' || scene.constructor.name === 'ItemWorldScene';
    if (!okScene) return false;
    if (scene.isPaused === true) return false;
    return true;
  }

  private getCurrentArea(): 'world' | 'itemworld' {
    const name = this.game.sceneManager.active?.constructor.name ?? '';
    return name === 'ItemWorldScene' ? 'itemworld' : 'world';
  }

  // -------------------------------------------------------------------------
  // Toast helper — uses active scene's ToastManager if available.
  // -------------------------------------------------------------------------

  private toast(msg: string, color: number, durationMs: number): void {
    const scene = this.game.sceneManager.active as { toast?: { show: (m: string, c?: number, d?: number) => void } } | null;
    scene?.toast?.show(msg, color, durationMs);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Mini KeyPrompt-style key indicator (rectangular, sized for multi-char keys).
 * Returns the bg/text components so callers can update tint later.
 */
function makeMiniKeyBox(x: number, y: number, w: number, h: number, label: string): { bg: Graphics; text: BitmapText } {
  const bg = new Graphics();
  bg.roundRect(0, 0, w, h, 1).fill({ color: 0x1a1a1a, alpha: 0.85 });
  bg.roundRect(0, 0, w, h, 1).stroke({ color: 0x666666, width: 1 });
  bg.x = x; bg.y = y;
  const text = new BitmapText({
    text: label,
    style: { fontFamily: PIXEL_FONT, fontSize: 5, fill: 0xffffff },
  });
  text.x = x + Math.floor((w - text.width) / 2);
  text.y = y + Math.floor((h - text.height) / 2);
  return { bg, text };
}

/** One-shot mini key box that adds itself to a parent. Used for ESC label. */
function drawMiniKeyBox(parent: Container, x: number, y: number, w: number, h: number, label: string): void {
  const { bg, text } = makeMiniKeyBox(x, y, w, h, label);
  parent.addChild(bg);
  parent.addChild(text);
}

function shortUa(ua: string): string {
  const m = ua.match(/(Chrome|Firefox|Safari|Edge|Edg)\/(\d+)/);
  const browser = m ? `${m[1]}/${m[2]}` : 'Unknown';
  let os = 'Unknown';
  if (ua.includes('Windows NT 10.0')) os = 'Win10';
  else if (ua.includes('Windows NT 11')) os = 'Win11';
  else if (ua.includes('Windows')) os = 'Win';
  else if (ua.includes('Mac OS X')) os = 'Mac';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Linux')) os = 'Linux';
  return `${browser} ${os}`;
}

function formatTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${pad2(m)}:${pad2(s)}`;
  return `${m}:${pad2(s)}`;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Naive char-count wrap. PixiJS BitmapText doesn't auto-wrap on char width. */
function wrapText(text: string, cols: number, maxLines: number): string[] {
  if (!text) return [''];
  const lines: string[] = [];
  let buf = '';
  for (const ch of text) {
    if (ch === '\n' || buf.length >= cols) {
      lines.push(buf);
      if (lines.length >= maxLines) return lines;
      buf = ch === '\n' ? '' : ch;
    } else {
      buf += ch;
    }
  }
  lines.push(buf);
  return lines;
}
