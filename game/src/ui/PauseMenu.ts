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

const PANEL_W = 200;
const PANEL_H = 120;
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

type MenuItem = { label: string; action: string; color?: number };

const MENU_ITEMS: MenuItem[] = [
  { label: 'CONTINUE', action: 'continue' },
  { label: 'STATUS', action: 'status' },
  { label: 'QUIT TO TITLE', action: 'quit', color: COL_DANGER },
];

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

  /** Callback: 'continue' | 'settings' | 'quit_confirmed' */
  onAction: ((action: string) => void) | null = null;

  private skin: UISkin | null = null;
  private overlay: Graphics | null = null;

  constructor(skin?: UISkin | null) {
    this.skin = skin ?? null;
    this.container = new Container();
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
  }

  navigate(dir: 'up' | 'down' | 'left' | 'right'): void {
    if (this.confirmActive) {
      if (dir === 'left' || dir === 'right') {
        this.confirmSelection = this.confirmSelection === 0 ? 1 : 0;
        this.drawConfirm();
      }
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

    const action = MENU_ITEMS[this.selectedIndex].action;
    if (action === 'quit') {
      this.showConfirm();
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
}
