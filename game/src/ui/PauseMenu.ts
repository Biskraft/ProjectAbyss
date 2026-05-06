/**
 * PauseMenu — ESC key pause overlay with menu navigation.
 *
 * Menu items: CONTINUE / SETTINGS / QUIT TO TITLE
 * Pattern A (Modal): game paused, arrow nav, C confirm, ESC back.
 */

import { Container, Graphics, BitmapText } from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';
import { PIXEL_FONT } from './fonts';
import {
  createModalPanel,
  drawSelectionRow,
  drawSelectionPulse,
  ROW_CHEVRON_COLOR,
  ROW_SELECTED_GLOW_ALPHA,
  ROW_SELECTED_EDGE,
} from './ModalPanel';
import type { UISkin } from './UISkin';
import type { InputManager, PresetName } from '@core/InputManager';

const PANEL_W = 200;
const PANEL_H = 138;
const PANEL_X = Math.floor((GAME_WIDTH - PANEL_W) / 2);
const PANEL_Y = Math.floor((GAME_HEIGHT - PANEL_H) / 2);
const ITEM_START_Y = 36;
const ITEM_SPACING = 18;
const ROW_PAD_X = 10;          // left/right padding inside the selection row
const ROW_H = 14;              // selection row height
const CHEVRON_INSET = 4;       // distance from row edge to ▶ / ◀

const COL_BG = 0x1a1a2e;
const COL_BORDER = 0x4a4a6a;
const COL_TEXT = 0xffffff;
const COL_DIM = 0xaaaaaa;
const COL_DANGER = 0xff4444;
const COL_WARNING = 0xffcc44;
const COL_ACCENT = ROW_CHEVRON_COLOR;

type MenuItem = { label: string; action: string; color?: number };

const MENU_ITEMS: MenuItem[] = [
  { label: 'CONTINUE', action: 'continue' },
  { label: 'STATUS', action: 'status' },
  { label: 'SELECT KEYBOARD', action: 'select_keyboard' },
  { label: 'QUIT TO TITLE', action: 'quit', color: COL_DANGER },
];

// 키보드 preset 카드 — `Documents/UI` (game/docs/ui-components.html line 1389) 의
// "Preset Selection (Phase 1)" 카드 스펙을 따라 라벨 + 한 줄 키 미리보기.
const PRESETS_DATA: { name: PresetName; label: string; desc: string }[] = [
  { name: 'classic', label: 'CLASSIC', desc: 'ARROW MOVE  Z JUMP  X DASH  C ATTACK' },
  { name: 'modern',  label: 'MODERN',  desc: 'ARROW MOVE  SPC JUMP  SH DASH  Z ATTACK' },
  { name: 'wasd',    label: 'WASD',    desc: 'WASD MOVE  SPC JUMP  SH DASH  J ATTACK' },
];

const PRESET_PANEL_W = 280;
const PRESET_PANEL_H = 156;
const PRESET_ROW_H = 28;
const PRESET_ROW_PAD_X = 10;
const PRESET_LIST_Y = 30;

export class PauseMenu {
  readonly container: Container;
  visible = false;
  private selectedIndex = 0;
  private panel: Container;
  private menuTexts: BitmapText[] = [];

  // Selection row layers (orange 4-layer canonical pattern)
  private selectionBg: Graphics | null = null;
  private selectionPulseG: Graphics | null = null;
  private chevronL: BitmapText | null = null;
  private chevronR: BitmapText | null = null;
  private selectionPulseTimer = 0;

  // Confirm-dialog selection pulse (YES / NO)
  private confirmPulseG: Graphics | null = null;
  private confirmPulseTimer = 0;

  // Quit confirmation
  private confirmActive = false;
  private confirmSelection = 1; // 0=YES, 1=NO (default NO)
  private confirmPanel: Container | null = null;

  // Keyboard preset selector (sub-modal)
  private presetActive = false;
  private presetIndex = 0;
  private presetPanel: Container | null = null;
  private presetPulseG: Graphics | null = null;
  private presetPulseTimer = 0;
  private presetPulseRowY = 0;
  private input: InputManager | null = null;

  /** Callback: 'continue' | 'status' | 'quit_confirmed' */
  onAction: ((action: string) => void) | null = null;

  private skin: UISkin | null = null;
  private overlay: Graphics | null = null;

  /** UI native 마이그레이션 1단계: uiContainer(scale=1) 직속 마운트용 자체 scale.
   *  inputManager 는 SELECT KEYBOARD 서브모달에서 preset 즉시 적용/현재 preset 조회용. */
  constructor(skin?: UISkin | null, uiScale: number = 1, input?: InputManager | null) {
    this.skin = skin ?? null;
    this.input = input ?? null;
    this.container = new Container();
    this.container.scale.set(uiScale);
    this.container.visible = false;
    this.panel = new Container();
  }

  /** Rebuild panel each open — ensures UISkin is loaded by the time ESC is pressed */
  private buildPanel(): void {
    // Clear previous
    this.container.removeChildren();
    this.menuTexts = [];
    this.selectionBg = null;
    this.selectionPulseG = null;
    this.chevronL = null;
    this.chevronR = null;

    // Overlay
    this.overlay = new Graphics();
    this.overlay.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill({ color: 0x000000, alpha: 0.6 });
    this.container.addChild(this.overlay);

    // Panel with 9-slice or fallback
    const { panel } = createModalPanel(this.skin, PANEL_W, PANEL_H);
    this.panel = panel;
    this.container.addChild(this.panel);

    // Title
    const title = new BitmapText({ text: 'PAUSED', style: { fontFamily: PIXEL_FONT, fontSize: 10, fill: COL_TEXT } });
    title.x = Math.floor((PANEL_W - 48) / 2);
    title.y = 10;
    this.panel.addChild(title);

    // Divider
    const divider = new Graphics();
    divider.moveTo(12, 28); divider.lineTo(PANEL_W - 12, 28);
    divider.stroke({ width: 1, color: COL_BORDER });
    this.panel.addChild(divider);

    // Selection row background (drawn beneath labels). Position updated in updateCursor.
    const rowW = PANEL_W - ROW_PAD_X * 2;
    this.selectionBg = new Graphics();
    this.selectionBg.x = ROW_PAD_X;
    drawSelectionRow(this.selectionBg, rowW, ROW_H, 'soft');
    this.panel.addChild(this.selectionBg);

    // Menu items (drawn on top of selection bg)
    for (let i = 0; i < MENU_ITEMS.length; i++) {
      const item = MENU_ITEMS[i];
      const t = new BitmapText({
        text: item.label,
        style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: item.color ?? COL_TEXT },
      });
      // Center label horizontally inside the selection row band
      t.x = Math.floor((PANEL_W - t.width) / 2);
      t.y = ITEM_START_Y + i * ITEM_SPACING;
      this.panel.addChild(t);
      this.menuTexts.push(t);
    }

    // Symmetric chevrons — orange accent
    this.chevronL = new BitmapText({
      text: '\u25B6',
      style: { fontFamily: PIXEL_FONT, fontSize: 9, fill: ROW_CHEVRON_COLOR },
    });
    this.chevronR = new BitmapText({
      text: '\u25C0',
      style: { fontFamily: PIXEL_FONT, fontSize: 9, fill: ROW_CHEVRON_COLOR },
    });
    this.panel.addChild(this.chevronL);
    this.panel.addChild(this.chevronR);

    // Outer pulse halo — drawn last so it sits above the selection fill
    this.selectionPulseG = new Graphics();
    this.selectionPulseG.x = ROW_PAD_X;
    this.panel.addChild(this.selectionPulseG);
  }

  open(): void {
    this.buildPanel(); // Rebuild with latest skin state
    this.visible = true;
    this.container.visible = true;
    this.selectedIndex = 0;
    this.confirmActive = false;
    this.hideConfirm();
    this.updateCursor();
  }

  close(): void {
    this.visible = false;
    this.container.visible = false;
    this.hideConfirm();
    this.hidePresetSelector();
  }

  navigate(dir: 'up' | 'down' | 'left' | 'right'): void {
    if (this.confirmActive) {
      if (dir === 'left' || dir === 'right') {
        this.confirmSelection = this.confirmSelection === 0 ? 1 : 0;
        this.drawConfirm();
      }
      return;
    }
    if (this.presetActive) {
      if (dir === 'up') this.presetIndex = (this.presetIndex - 1 + PRESETS_DATA.length) % PRESETS_DATA.length;
      if (dir === 'down') this.presetIndex = (this.presetIndex + 1) % PRESETS_DATA.length;
      this.drawPresetSelector();
      return;
    }
    if (dir === 'up') this.selectedIndex = (this.selectedIndex - 1 + MENU_ITEMS.length) % MENU_ITEMS.length;
    if (dir === 'down') this.selectedIndex = (this.selectedIndex + 1) % MENU_ITEMS.length;
    this.updateCursor();
  }

  confirm(): void {
    if (this.confirmActive) {
      if (this.confirmSelection === 0) {
        // YES — quit
        this.close();
        this.onAction?.('quit_confirmed');
      } else {
        // NO — cancel
        this.hideConfirm();
      }
      return;
    }

    if (this.presetActive) {
      // 현재 선택한 preset 즉시 적용 + ACTIVE 뱃지 갱신. 모달은 ESC 로 닫는 흐름.
      const sel = PRESETS_DATA[this.presetIndex];
      this.input?.applyPreset(sel.name);
      this.drawPresetSelector();
      return;
    }

    const action = MENU_ITEMS[this.selectedIndex].action;
    if (action === 'quit') {
      this.showConfirm();
      return;
    }
    if (action === 'select_keyboard') {
      this.showPresetSelector();
      return;
    }
    if (action === 'continue') {
      this.close();
    }
    this.onAction?.(action);
  }

  cancel(): void {
    if (this.confirmActive) {
      this.hideConfirm();
      return;
    }
    if (this.presetActive) {
      this.hidePresetSelector();
      return;
    }
    this.close();
    this.onAction?.('continue');
  }

  private updateCursor(): void {
    if (!this.selectionBg || !this.selectionPulseG || !this.chevronL || !this.chevronR) return;
    // Vertically center the row band on the active label baseline
    const labelY = ITEM_START_Y + this.selectedIndex * ITEM_SPACING;
    const rowY = labelY - 3;
    this.selectionBg.y = rowY;
    this.selectionPulseG.y = rowY;
    // Chevrons align to row, sit at row edges
    const rowW = PANEL_W - ROW_PAD_X * 2;
    this.chevronL.x = ROW_PAD_X + CHEVRON_INSET;
    this.chevronL.y = rowY + 3;
    this.chevronR.x = ROW_PAD_X + rowW - CHEVRON_INSET - 7;
    this.chevronR.y = rowY + 3;
    // Highlight the selected label, dim the rest
    for (let i = 0; i < this.menuTexts.length; i++) {
      const t = this.menuTexts[i];
      const item = MENU_ITEMS[i];
      const isSel = i === this.selectedIndex;
      t.style.fill = isSel ? COL_TEXT : (item.color ?? COL_DIM);
    }
    this.redrawSelectionPulse();
  }

  private redrawSelectionPulse(): void {
    if (!this.selectionPulseG) return;
    const t = this.selectionPulseTimer / 1000;
    // Soft, slow breathing: 0.8 Hz, 0.50..1.00 of base alpha
    const a = ROW_SELECTED_GLOW_ALPHA * (0.75 + 0.25 * Math.sin(t * Math.PI * 2 * 0.8));
    const rowW = PANEL_W - ROW_PAD_X * 2;
    this.selectionPulseG.clear();
    drawSelectionPulse(this.selectionPulseG, rowW, ROW_H, a, 'soft');
  }

  /** Per-frame pulse driver — call from the scene update loop while visible. */
  update(dt: number): void {
    if (!this.visible) return;
    this.selectionPulseTimer += dt;
    this.redrawSelectionPulse();
    if (this.confirmActive && this.confirmPulseG) {
      this.confirmPulseTimer += dt;
      this.redrawConfirmPulse();
    }
    if (this.presetActive && this.presetPulseG) {
      this.presetPulseTimer += dt;
      this.redrawPresetPulse();
    }
  }

  private redrawConfirmPulse(): void {
    if (!this.confirmPulseG) return;
    const t = this.confirmPulseTimer / 1000;
    const a = ROW_SELECTED_GLOW_ALPHA * (0.75 + 0.25 * Math.sin(t * Math.PI * 2 * 0.8));
    this.confirmPulseG.clear();
    drawSelectionPulse(this.confirmPulseG, this.confirmPulseRect.w, this.confirmPulseRect.h, a, 'soft');
  }

  private confirmPulseRect = { w: 0, h: 0 };

  private showConfirm(): void {
    this.confirmActive = true;
    this.confirmSelection = 1; // Default NO
    this.drawConfirm();
  }

  private hideConfirm(): void {
    this.confirmActive = false;
    if (this.confirmPanel) {
      this.container.removeChild(this.confirmPanel);
      this.confirmPanel.destroy({ children: true });
      this.confirmPanel = null;
    }
    this.confirmPulseG = null; // destroyed with confirmPanel
    if (this.selectionPulseG) this.selectionPulseG.alpha = 1;
  }

  private drawConfirm(): void {
    if (this.confirmPanel) {
      this.container.removeChild(this.confirmPanel);
      this.confirmPanel.destroy({ children: true });
    }

    const cw = 160, ch = 60;
    const cx = Math.floor((GAME_WIDTH - cw) / 2);
    const cy = Math.floor((GAME_HEIGHT - ch) / 2);

    this.confirmPanel = new Container();
    this.confirmPanel.x = cx;
    this.confirmPanel.y = cy;

    const bg = new Graphics();
    bg.rect(0, 0, cw, ch).fill({ color: COL_BG, alpha: 0.97 });
    bg.rect(0, 0, cw, ch).stroke({ color: COL_DANGER, width: 1 });
    this.confirmPanel.addChild(bg);

    const warning = new BitmapText({
      text: 'Quit to title?',
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: COL_WARNING },
    });
    warning.x = Math.floor((cw - 90) / 2);
    warning.y = 10;
    this.confirmPanel.addChild(warning);

    const sub = new BitmapText({
      text: 'Unsaved progress lost.',
      style: { fontFamily: PIXEL_FONT, fontSize: 7, fill: COL_DIM },
    });
    sub.x = Math.floor((cw - 130) / 2);
    sub.y = 24;
    this.confirmPanel.addChild(sub);

    // YES / NO buttons
    const btnW = 50, btnH = 16;
    const btnY = 38;
    let selectedBtnX = 0;
    for (let b = 0; b < 2; b++) {
      const bx = b === 0 ? 20 : cw - 20 - btnW;
      const selected = b === this.confirmSelection;
      const label = b === 0 ? 'YES' : 'NO';

      const btnBg = new Graphics();
      btnBg.x = bx;
      btnBg.y = btnY;
      if (selected) {
        // Orange canonical selection (soft tier — confirm dialog is ambient)
        drawSelectionRow(btnBg, btnW, btnH, 'soft');
        selectedBtnX = bx;
      } else {
        btnBg.rect(0, 0, btnW, btnH).fill(0x1a1a2e);
        btnBg.rect(0, 0, btnW, btnH).stroke({ color: 0x333333, width: 1 });
      }
      this.confirmPanel.addChild(btnBg);

      const btnText = new BitmapText({
        text: label,
        style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: selected ? COL_TEXT : COL_DIM },
      });
      btnText.x = bx + Math.floor((btnW - label.length * 6) / 2);
      btnText.y = btnY + 4;
      this.confirmPanel.addChild(btnText);
    }

    // YES (left) gets a danger-tinted edge accent over the orange base, since
    // it is destructive. The NO (right) button uses pure orange selection.
    if (this.confirmSelection === 0) {
      const dangerEdge = new Graphics();
      dangerEdge.rect(selectedBtnX, btnY, btnW, btnH).stroke({ color: COL_DANGER, width: 2, alpha: 0.6 });
      this.confirmPanel.addChild(dangerEdge);
    }

    // Pulse halo overlay, positioned over the selected button
    this.confirmPulseG = new Graphics();
    this.confirmPulseG.x = selectedBtnX;
    this.confirmPulseG.y = btnY;
    this.confirmPulseRect = { w: btnW, h: btnH };
    this.confirmPanel.addChild(this.confirmPulseG);
    this.confirmPulseTimer = 0;
    this.redrawConfirmPulse();

    // Mute the suppressed-by-confirm-dialog ambient row pulse so the eye
    // jumps to the confirm choice instead of the menu underneath.
    if (this.selectionPulseG) this.selectionPulseG.alpha = 0.15;

    this.container.addChild(this.confirmPanel);
  }

  // ── Keyboard preset selector ────────────────────────────────────────────────

  private showPresetSelector(): void {
    this.presetActive = true;
    // 현재 활성 preset 으로 커서 초기화 — 사용자가 즉시 비교 가능.
    const cur = this.input?.currentPreset ?? 'classic';
    const idx = PRESETS_DATA.findIndex(p => p.name === cur);
    this.presetIndex = idx >= 0 ? idx : 0;
    this.drawPresetSelector();
  }

  private hidePresetSelector(): void {
    this.presetActive = false;
    if (this.presetPanel) {
      this.container.removeChild(this.presetPanel);
      this.presetPanel.destroy({ children: true });
      this.presetPanel = null;
    }
    this.presetPulseG = null;
    if (this.selectionPulseG) this.selectionPulseG.alpha = 1;
  }

  private drawPresetSelector(): void {
    if (this.presetPanel) {
      this.container.removeChild(this.presetPanel);
      this.presetPanel.destroy({ children: true });
    }

    const cw = PRESET_PANEL_W;
    const ch = PRESET_PANEL_H;
    const cx = Math.floor((GAME_WIDTH - cw) / 2);
    const cy = Math.floor((GAME_HEIGHT - ch) / 2);

    this.presetPanel = new Container();
    this.presetPanel.x = cx;
    this.presetPanel.y = cy;

    // 9-slice 패널 — Pause/Inventory 와 동일 카논 (createModalPanel).
    const { panel } = createModalPanel(this.skin, cw, ch);
    this.presetPanel.addChild(panel);

    // Title
    const title = new BitmapText({
      text: 'CONTROLS',
      style: { fontFamily: PIXEL_FONT, fontSize: 10, fill: COL_TEXT },
    });
    title.x = Math.floor((cw - title.width) / 2);
    title.y = 8;
    panel.addChild(title);

    // Divider
    const divider = new Graphics();
    divider.moveTo(12, 22); divider.lineTo(cw - 12, 22);
    divider.stroke({ width: 1, color: COL_BORDER });
    panel.addChild(divider);

    const cur = this.input?.currentPreset ?? 'classic';
    const rowW = cw - PRESET_ROW_PAD_X * 2;
    let selectedRowY = 0;

    for (let i = 0; i < PRESETS_DATA.length; i++) {
      const p = PRESETS_DATA[i];
      const isSel = i === this.presetIndex;
      const isActive = p.name === cur;
      const rowY = PRESET_LIST_Y + i * (PRESET_ROW_H + 2);

      // Selection background — 선택 row 만 orange canonical (soft tier).
      if (isSel) {
        const rowBg = new Graphics();
        rowBg.x = PRESET_ROW_PAD_X;
        rowBg.y = rowY;
        drawSelectionRow(rowBg, rowW, PRESET_ROW_H, 'soft');
        panel.addChild(rowBg);
        selectedRowY = rowY;
      }

      // Chevron — 선택 row 에만 좌측 ▶
      const chevron = new BitmapText({
        text: isSel ? '▶' : ' ',
        style: { fontFamily: PIXEL_FONT, fontSize: 9, fill: COL_ACCENT },
      });
      chevron.x = PRESET_ROW_PAD_X + 4;
      chevron.y = rowY + 5;
      panel.addChild(chevron);

      // Label (CLASSIC / MODERN / WASD)
      const label = new BitmapText({
        text: p.label,
        style: { fontFamily: PIXEL_FONT, fontSize: 9, fill: isSel ? COL_TEXT : COL_DIM },
      });
      label.x = PRESET_ROW_PAD_X + 18;
      label.y = rowY + 4;
      panel.addChild(label);

      // ACTIVE badge — 현재 적용된 preset 만 우측에 노란 라벨.
      if (isActive) {
        const badge = new BitmapText({
          text: 'ACTIVE',
          style: { fontFamily: PIXEL_FONT, fontSize: 7, fill: COL_WARNING },
        });
        badge.x = PRESET_ROW_PAD_X + rowW - badge.width - 6;
        badge.y = rowY + 5;
        panel.addChild(badge);
      }

      // Description (한 줄 키 미리보기)
      const desc = new BitmapText({
        text: p.desc,
        style: { fontFamily: PIXEL_FONT, fontSize: 7, fill: isSel ? COL_DIM : 0x666677 },
      });
      desc.x = PRESET_ROW_PAD_X + 18;
      desc.y = rowY + 16;
      panel.addChild(desc);
    }

    // Bottom hint
    const hint = new BitmapText({
      text: '[↑↓] NAVIGATE  [C] APPLY  [ESC] BACK',
      style: { fontFamily: PIXEL_FONT, fontSize: 7, fill: COL_DIM },
    });
    hint.x = Math.floor((cw - hint.width) / 2);
    hint.y = ch - 12;
    panel.addChild(hint);

    // Pulse halo on the selected row (last child so it overlays)
    this.presetPulseG = new Graphics();
    this.presetPulseG.x = PRESET_ROW_PAD_X;
    this.presetPulseG.y = selectedRowY;
    panel.addChild(this.presetPulseG);
    this.presetPulseRowY = selectedRowY;
    this.presetPulseTimer = 0;
    this.redrawPresetPulse();

    // 메뉴 row pulse 음소거 (confirm 처럼).
    if (this.selectionPulseG) this.selectionPulseG.alpha = 0.15;

    this.container.addChild(this.presetPanel);
  }

  private redrawPresetPulse(): void {
    if (!this.presetPulseG) return;
    const t = this.presetPulseTimer / 1000;
    const a = ROW_SELECTED_GLOW_ALPHA * (0.75 + 0.25 * Math.sin(t * Math.PI * 2 * 0.8));
    const rowW = PRESET_PANEL_W - PRESET_ROW_PAD_X * 2;
    this.presetPulseG.clear();
    drawSelectionPulse(this.presetPulseG, rowW, PRESET_ROW_H, a, 'soft');
  }
}
