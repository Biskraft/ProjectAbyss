import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { RARITY_COLOR, type ItemInstance } from '@items/ItemInstance';
import type { Inventory } from '@items/Inventory';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';

const SLOT_SIZE = 20;
const SLOT_GAP = 2;
const COLS = 5;
const ROWS = 4; // 20 slots
const PADDING = 8;

const PANEL_W = COLS * (SLOT_SIZE + SLOT_GAP) + SLOT_GAP + PADDING * 2;
const PANEL_H = ROWS * (SLOT_SIZE + SLOT_GAP) + SLOT_GAP + PADDING * 2 + 40; // extra for title + info

import { PIXEL_FONT } from './fonts';

const textStyle = new TextStyle({ fontSize: 8, fill: 0xffffff, fontFamily: PIXEL_FONT });
const smallStyle = new TextStyle({ fontSize: 8, fill: 0xcccccc, fontFamily: PIXEL_FONT });

export class InventoryUI {
  container: Container;
  visible = false;
  private inventory: Inventory;
  private slots: Graphics[] = [];
  private selectedIndex = -1;
  private infoText: Text;
  private titleText: Text;
  private panel: Graphics;

  constructor(inventory: Inventory) {
    this.inventory = inventory;
    this.container = new Container();
    this.container.visible = false;

    // Background overlay
    const overlay = new Graphics();
    overlay.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill({ color: 0x000000, alpha: 0.5 });
    this.container.addChild(overlay);

    // Panel
    this.panel = new Graphics();
    const panelX = Math.floor((GAME_WIDTH - PANEL_W) / 2);
    const panelY = Math.floor((GAME_HEIGHT - PANEL_H) / 2);
    this.panel.rect(0, 0, PANEL_W, PANEL_H).fill({ color: 0x1a1a2e, alpha: 0.95 });
    this.panel.rect(0, 0, PANEL_W, PANEL_H).stroke({ color: 0x4a4a6a, width: 1 });
    this.panel.x = panelX;
    this.panel.y = panelY;
    this.container.addChild(this.panel);

    // Title
    this.titleText = new Text({ text: 'INVENTORY', style: textStyle });
    this.titleText.x = PADDING;
    this.titleText.y = 4;
    this.panel.addChild(this.titleText);

    // Slot graphics
    for (let i = 0; i < COLS * ROWS; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const slot = new Graphics();
      slot.x = PADDING + SLOT_GAP + col * (SLOT_SIZE + SLOT_GAP);
      slot.y = 16 + SLOT_GAP + row * (SLOT_SIZE + SLOT_GAP);
      this.panel.addChild(slot);
      this.slots.push(slot);
    }

    // Info text
    this.infoText = new Text({ text: '', style: smallStyle });
    this.infoText.x = PADDING;
    this.infoText.y = 16 + ROWS * (SLOT_SIZE + SLOT_GAP) + SLOT_GAP + 4;
    this.panel.addChild(this.infoText);
  }

  toggle(): void {
    this.visible = !this.visible;
    this.container.visible = this.visible;
    if (this.visible) {
      this.selectedIndex = -1;
      this.refresh();
    }
  }

  close(): void {
    this.visible = false;
    this.container.visible = false;
  }

  /** Navigate selection */
  navigate(dir: 'left' | 'right' | 'up' | 'down'): void {
    const count = this.inventory.items.length;
    if (count === 0) return;

    if (this.selectedIndex < 0) {
      this.selectedIndex = 0;
    } else {
      switch (dir) {
        case 'left': this.selectedIndex = Math.max(0, this.selectedIndex - 1); break;
        case 'right': this.selectedIndex = Math.min(count - 1, this.selectedIndex + 1); break;
        case 'up': this.selectedIndex = Math.max(0, this.selectedIndex - COLS); break;
        case 'down': this.selectedIndex = Math.min(count - 1, this.selectedIndex + COLS); break;
      }
    }
    this.refresh();
  }

  /** Equip selected item */
  equipSelected(): void {
    const item = this.inventory.items[this.selectedIndex];
    if (item) {
      this.inventory.equip(item.uid);
      this.refresh();
    }
  }

  refresh(): void {
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      slot.clear();

      const item = this.inventory.items[i];
      const isSelected = i === this.selectedIndex;
      const isEquipped = item && this.inventory.equipped?.uid === item.uid;

      // Slot background
      const bgColor = isSelected ? 0x4a4a8a : 0x2a2a3e;
      slot.rect(0, 0, SLOT_SIZE, SLOT_SIZE).fill(bgColor);

      if (isEquipped) {
        slot.rect(0, 0, SLOT_SIZE, SLOT_SIZE).stroke({ color: 0xffff00, width: 1 });
      }

      if (item) {
        // Item color by rarity
        const rarityCol = RARITY_COLOR[item.rarity];
        slot.rect(3, 3, SLOT_SIZE - 6, SLOT_SIZE - 6).fill(rarityCol);

        // Level indicator
        if (item.level > 0) {
          slot.rect(1, 1, 6, 6).fill(0x000000);
        }
      }
    }

    // Info text
    const item = this.inventory.items[this.selectedIndex];
    if (item) {
      const equipped = this.inventory.equipped?.uid === item.uid ? ' [E]' : '';
      this.infoText.text =
        `${item.def.name}${equipped} Lv${item.level}\n` +
        `ATK:${item.finalAtk} ${item.rarity.toUpperCase()}\n` +
        `Z:Equip`;
    } else {
      this.infoText.text = `${this.inventory.items.length}/20 items`;
    }
  }
}
