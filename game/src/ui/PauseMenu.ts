/**
 * PauseMenu — ESC key pause overlay with menu navigation.
 *
 * Menu items: CONTINUE / SETTINGS / QUIT TO TITLE
 * Pattern A (Modal): game paused, arrow nav, C confirm, ESC back.
 */

import { Container, Graphics, BitmapText } from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';
import { PIXEL_FONT } from './fonts';
import { createModalPanel } from './ModalPanel';
import type { UISkin } from './UISkin';

const PANEL_W = 200;
const PANEL_H = 120;
const PANEL_X = Math.floor((GAME_WIDTH - PANEL_W) / 2);
const PANEL_Y = Math.floor((GAME_HEIGHT - PANEL_H) / 2);
const ITEM_START_Y = 36;
const ITEM_SPACING = 18;
const CURSOR_X = 12;

const COL_BG = 0x1a1a2e;
const COL_BORDER = 0x4a4a6a;
const COL_SELECTED = 0x00ced1;
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
  private cursor: BitmapText;

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
    this.cursor = new BitmapText({ text: '>', style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: COL_SELECTED } });
  }

  /** Rebuild panel each open — ensures UISkin is loaded by the time ESC is pressed */
  private buildPanel(): void {
    // Clear previous
    this.container.removeChildren();
    this.menuTexts = [];

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

    // Menu items
    for (let i = 0; i < MENU_ITEMS.length; i++) {
      const item = MENU_ITEMS[i];
      const t = new BitmapText({
        text: item.label,
        style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: item.color ?? COL_TEXT },
      });
      t.x = CURSOR_X + 12;
      t.y = ITEM_START_Y + i * ITEM_SPACING;
      this.panel.addChild(t);
      this.menuTexts.push(t);
    }

    // Cursor
    this.cursor = new BitmapText({ text: '>', style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: COL_SELECTED } });
    this.cursor.x = CURSOR_X;
    this.panel.addChild(this.cursor);
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
    this.cursor.y = ITEM_START_Y + this.selectedIndex * ITEM_SPACING;
  }

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
    for (let b = 0; b < 2; b++) {
      const bx = b === 0 ? 20 : cw - 20 - btnW;
      const selected = b === this.confirmSelection;
      const label = b === 0 ? 'YES' : 'NO';
      const borderColor = b === 0 ? COL_DANGER : COL_SELECTED;

      const btnBg = new Graphics();
      btnBg.rect(bx, btnY, btnW, btnH).fill(selected ? 0x333355 : 0x1a1a2e);
      btnBg.rect(bx, btnY, btnW, btnH).stroke({ color: selected ? borderColor : 0x333333, width: selected ? 2 : 1 });
      this.confirmPanel.addChild(btnBg);

      const btnText = new BitmapText({
        text: label,
        style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: COL_TEXT },
      });
      btnText.x = bx + Math.floor((btnW - label.length * 6) / 2);
      btnText.y = btnY + 4;
      this.confirmPanel.addChild(btnText);
    }

    this.container.addChild(this.confirmPanel);
  }
}
