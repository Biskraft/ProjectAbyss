/**
 * SaveLoadUI — 3-slot save/load selection screen.
 *
 * Modes: 'new' | 'load' | 'save'
 * Slot cards: filled/empty/corrupted/inactive
 */

import { Container, Graphics, BitmapText } from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';
import { PIXEL_FONT } from './fonts';
import { createModalPanel } from './ModalPanel';
import type { UISkin } from './UISkin';

const PANEL_W = 320;
const PANEL_H = 240;
const PANEL_X = Math.floor((GAME_WIDTH - PANEL_W) / 2);
const PANEL_Y = Math.floor((GAME_HEIGHT - PANEL_H) / 2);
const SLOT_W = 280;
const SLOT_H = 48;
const SLOT_GAP = 8;
const SLOT_START_Y = 40;

const COL_BG = 0x1a1a2e;
const COL_BORDER = 0x4a4a6a;
const COL_SELECTED = 0x00ced1;
const COL_TEXT = 0xffffff;
const COL_DIM = 0xaaaaaa;
const COL_GOLD = 0xffdd44;
const COL_DANGER = 0xff4444;
const COL_SLOT_BG = 0x0d0d1a;

export type SaveLoadMode = 'new' | 'load' | 'save';

export interface SaveSlotData {
  exists: boolean;
  level?: number;
  area?: string;
  playtime?: number; // ms
  gold?: number;
  savedAt?: string;  // ISO date
  corrupted?: boolean;
}

export class SaveLoadUI {
  readonly container: Container;
  visible = false;
  private panel: Container;
  private mode: SaveLoadMode = 'load';
  private selectedIndex = 0;
  private slots: SaveSlotData[] = [
    { exists: false },
    { exists: false },
    { exists: false },
  ];

  // Delete confirmation
  private deleteStage = 0; // 0=none, 1=first confirm, 2=second confirm
  private deletePanel: Container | null = null;
  private deleteSelection = 1; // default NO

  onAction: ((action: 'select' | 'delete', slotIndex: number) => void) | null = null;
  onCancel: (() => void) | null = null;
  private skin: UISkin | null = null;

  constructor(skin?: UISkin | null) {
    this.skin = skin ?? null;
    this.container = new Container();
    this.container.visible = false;

    this.panel = new Container();
    this.container.addChild(this.panel);
  }

  open(mode: SaveLoadMode, slots: SaveSlotData[]): void {
    this.mode = mode;
    this.slots = slots;
    this.visible = true;
    this.container.visible = true;
    this.deleteStage = 0;
    this.hideDelete();
    // Find first selectable slot
    this.selectedIndex = 0;
    if (mode === 'load') {
      const first = slots.findIndex(s => s.exists && !s.corrupted);
      if (first >= 0) this.selectedIndex = first;
    }
    this.draw();
  }

  close(): void {
    this.visible = false;
    this.container.visible = false;
    this.hideDelete();
  }

  navigate(dir: 'up' | 'down' | 'left' | 'right'): void {
    if (this.deleteStage > 0) {
      if (dir === 'left' || dir === 'right') {
        this.deleteSelection = this.deleteSelection === 0 ? 1 : 0;
        this.drawDeleteConfirm();
      }
      return;
    }
    if (dir === 'up') {
      do { this.selectedIndex = (this.selectedIndex - 1 + 3) % 3; }
      while (this.mode === 'load' && !this.slots[this.selectedIndex].exists && this.selectedIndex !== 0);
    }
    if (dir === 'down') {
      do { this.selectedIndex = (this.selectedIndex + 1) % 3; }
      while (this.mode === 'load' && !this.slots[this.selectedIndex].exists && this.selectedIndex !== 0);
    }
    this.draw();
  }

  confirm(): void {
    if (this.deleteStage > 0) {
      if (this.deleteSelection === 0) { // YES
        if (this.deleteStage === 1) {
          this.deleteStage = 2;
          this.deleteSelection = 1;
          this.drawDeleteConfirm();
        } else {
          this.hideDelete();
          this.onAction?.('delete', this.selectedIndex);
          this.draw();
        }
      } else { this.hideDelete(); }
      return;
    }
    const slot = this.slots[this.selectedIndex];
    if (this.mode === 'load' && (!slot.exists || slot.corrupted)) return;
    this.onAction?.('select', this.selectedIndex);
  }

  /** X key to delete a slot */
  requestDelete(): void {
    if (this.deleteStage > 0) return;
    if (!this.slots[this.selectedIndex].exists) return;
    this.deleteStage = 1;
    this.deleteSelection = 1;
    this.drawDeleteConfirm();
  }

  cancel(): void {
    if (this.deleteStage > 0) { this.hideDelete(); return; }
    this.close();
    this.onCancel?.();
  }

  private draw(): void {
    // Clear everything and rebuild with overlay + 9-slice panel
    this.container.removeChildren();

    const { overlay, panel } = createModalPanel(this.skin, PANEL_W, PANEL_H);
    this.container.addChild(overlay);
    this.panel = panel;
    this.container.addChild(this.panel);

    // Title
    const titles: Record<SaveLoadMode, string> = { new: 'NEW GAME', load: 'LOAD GAME', save: 'SAVE GAME' };
    const title = new BitmapText({ text: titles[this.mode], style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: COL_TEXT } });
    title.x = 12; title.y = 10;
    this.panel.addChild(title);

    // Divider
    const div = new Graphics();
    div.moveTo(12, 24); div.lineTo(PANEL_W - 12, 24);
    div.stroke({ width: 1, color: COL_BORDER });
    this.panel.addChild(div);

    // Slots
    const slotX = Math.floor((PANEL_W - SLOT_W) / 2);
    for (let i = 0; i < 3; i++) {
      const sy = SLOT_START_Y + i * (SLOT_H + SLOT_GAP);
      this.drawSlot(slotX, sy, i);
    }

    // Hints
    const hint = new BitmapText({
      text: '[C]Select  [X]Delete  [ESC]Back',
      style: { fontFamily: PIXEL_FONT, fontSize: 6, fill: COL_DIM },
    });
    hint.x = 12; hint.y = PANEL_H - 16;
    this.panel.addChild(hint);
  }

  private drawSlot(x: number, y: number, index: number): void {
    const slot = this.slots[index];
    const selected = index === this.selectedIndex;
    const inactive = this.mode === 'load' && !slot.exists;

    const g = new Graphics();
    const alpha = inactive ? 0.3 : slot.exists ? 0.8 : 0.5;
    g.rect(x, y, SLOT_W, SLOT_H).fill({ color: COL_SLOT_BG, alpha });

    const borderColor = slot.corrupted ? COL_DANGER : selected ? COL_SELECTED : inactive ? 0x222233 : COL_BORDER;
    const borderWidth = selected ? 2 : 1;
    g.rect(x, y, SLOT_W, SLOT_H).stroke({ color: borderColor, width: borderWidth });
    this.panel.addChild(g);

    // Header
    const header = new BitmapText({
      text: `SLOT ${index + 1}`,
      style: { fontFamily: PIXEL_FONT, fontSize: 6, fill: COL_DIM },
    });
    header.x = x + 6; header.y = y + 3;
    this.panel.addChild(header);

    if (slot.corrupted) {
      const corr = new BitmapText({ text: '[!] CORRUPTED DATA', style: { fontFamily: PIXEL_FONT, fontSize: 7, fill: COL_DANGER } });
      corr.x = x + 6; corr.y = y + 16;
      this.panel.addChild(corr);
      return;
    }

    if (!slot.exists) {
      const empty = new BitmapText({
        text: '- EMPTY -',
        style: { fontFamily: PIXEL_FONT, fontSize: 7, fill: inactive ? 0x333333 : 0x666666 },
      });
      empty.x = x + Math.floor((SLOT_W - 60) / 2);
      empty.y = y + 18;
      this.panel.addChild(empty);
      return;
    }

    // Filled slot info
    const info = [
      { text: `Erda  Lv.${slot.level ?? '?'}`, color: COL_TEXT, size: 7, dy: 12 },
      { text: slot.area ?? 'Unknown Area', color: 0xaaaacc, size: 6, dy: 22 },
      { text: `Play: ${this.formatTime(slot.playtime ?? 0)}  Gold: ${(slot.gold ?? 0).toLocaleString()}`, color: COL_GOLD, size: 6, dy: 32 },
      { text: slot.savedAt ?? '', color: 0x666688, size: 5, dy: 40 },
    ];
    for (const line of info) {
      const t = new BitmapText({ text: line.text, style: { fontFamily: PIXEL_FONT, fontSize: line.size, fill: line.color } });
      t.x = x + 6; t.y = y + line.dy;
      this.panel.addChild(t);
    }
  }

  private drawDeleteConfirm(): void {
    this.hideDelete();
    const cw = 200, ch = 80;
    const cx = Math.floor((GAME_WIDTH - cw) / 2);
    const cy = Math.floor((GAME_HEIGHT - ch) / 2);

    this.deletePanel = new Container();
    this.deletePanel.x = cx; this.deletePanel.y = cy;

    const bg = new Graphics();
    bg.rect(0, 0, cw, ch).fill({ color: COL_BG, alpha: 0.97 });
    bg.rect(0, 0, cw, ch).stroke({ color: COL_DANGER, width: 1 });
    this.deletePanel.addChild(bg);

    const msg = this.deleteStage === 1
      ? `Delete Slot ${this.selectedIndex + 1}?`
      : 'ARE YOU SURE?';
    const sub = this.deleteStage === 1
      ? 'This cannot be undone.'
      : 'Data will be permanently deleted.';

    const t1 = new BitmapText({ text: msg, style: { fontFamily: PIXEL_FONT, fontSize: 7, fill: COL_DANGER } });
    t1.x = Math.floor((cw - msg.length * 5) / 2); t1.y = 10;
    this.deletePanel.addChild(t1);

    const t2 = new BitmapText({ text: sub, style: { fontFamily: PIXEL_FONT, fontSize: 6, fill: COL_DIM } });
    t2.x = Math.floor((cw - sub.length * 4) / 2); t2.y = 24;
    this.deletePanel.addChild(t2);

    const btnW = 50, btnH = 16, btnY = 48;
    for (let b = 0; b < 2; b++) {
      const bx = b === 0 ? 30 : cw - 30 - btnW;
      const sel = b === this.deleteSelection;
      const label = b === 0 ? 'YES' : 'NO';
      const borderCol = b === 0 ? COL_DANGER : COL_SELECTED;

      const btn = new Graphics();
      btn.rect(bx, btnY, btnW, btnH).fill(sel ? 0x333355 : COL_BG);
      btn.rect(bx, btnY, btnW, btnH).stroke({ color: sel ? borderCol : 0x333333, width: sel ? 2 : 1 });
      this.deletePanel.addChild(btn);

      const bt = new BitmapText({ text: label, style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: COL_TEXT } });
      bt.x = bx + Math.floor((btnW - label.length * 6) / 2); bt.y = btnY + 4;
      this.deletePanel.addChild(bt);
    }

    this.container.addChild(this.deletePanel);
  }

  private hideDelete(): void {
    this.deleteStage = 0;
    if (this.deletePanel) {
      this.container.removeChild(this.deletePanel);
      this.deletePanel.destroy({ children: true });
      this.deletePanel = null;
    }
  }

  private formatTime(ms: number): string {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }
}
