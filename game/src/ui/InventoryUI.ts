import { Container, Graphics, BitmapText } from 'pixi.js';
import { type ItemInstance } from '@items/ItemInstance';
import type { Inventory } from '@items/Inventory';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';
import { ItemImage } from './ItemImage';

const SLOT_SIZE = 20;
const SLOT_GAP = 2;
const COLS = 5;
const ROWS = 4; // 20 slots
const PADDING = 8;

const PANEL_W = COLS * (SLOT_SIZE + SLOT_GAP) + SLOT_GAP + PADDING * 2;
const PANEL_H = ROWS * (SLOT_SIZE + SLOT_GAP) + SLOT_GAP + PADDING * 2 + 40; // extra for title + info

/**
 * Anvil mode에서 장착 중인 아이템 슬롯을 dim 처리할 때 쓰는 알파.
 * 앵빌에는 "Unequip first" 룰이 있어 장착 무기는 배치 불가 → 시각적으로
 * "이건 선택해도 안 된다"를 즉각 전달하기 위해 아이콘만 흐리게 낮춘다.
 * 슬롯 배경/선택 하이라이트/border 는 그대로 남겨 키보드 네비가 헛돈다는
 * 느낌은 주지 않는다.
 */
const ANVIL_EQUIPPED_DIM_ALPHA = 0.15;

import { PIXEL_FONT } from './fonts';

/** UI mode — inventory equips selected; anvil places selected onto the anvil. */
export type InventoryUIMode = 'inventory' | 'anvil';

export class InventoryUI {
  container: Container;
  visible = false;
  private inventory: Inventory;
  private slots: Graphics[] = [];
  /** 슬롯별 ItemImage를 담는 컨테이너 (slot Graphics와 1:1, panel 좌표계). */
  private slotImageContainers: Container[] = [];
  /** 각 슬롯에 현재 그려진 ItemImage와 uid — item 변경 감지용. */
  private slotImages: (ItemImage | null)[] = [];
  private slotItemUids: (number | null)[] = [];
  private selectedIndex = -1;
  private infoText: BitmapText;
  private titleText: BitmapText;
  private panel: Graphics;

  /** Current UI mode. 'anvil' repurposes confirm (X) to call onSelect instead of equipping. */
  private mode: InventoryUIMode = 'inventory';
  /** Callback used when mode==='anvil'. Receives the selected item on confirm. */
  private onSelect: ((item: ItemInstance) => void) | null = null;

  setInventory(inventory: Inventory): void {
    this.inventory = inventory;
  }

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
    this.titleText = new BitmapText({ text: 'INVENTORY', style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xffffff } });
    this.titleText.x = PADDING;
    this.titleText.y = 4;
    this.panel.addChild(this.titleText);

    // Slot graphics + ItemImage 컨테이너.
    for (let i = 0; i < COLS * ROWS; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const sx = PADDING + SLOT_GAP + col * (SLOT_SIZE + SLOT_GAP);
      const sy = 16 + SLOT_GAP + row * (SLOT_SIZE + SLOT_GAP);
      const slot = new Graphics();
      slot.x = sx;
      slot.y = sy;
      this.panel.addChild(slot);
      this.slots.push(slot);

      // ItemImage는 Graphics 위에 겹쳐 표시 (slot 내부 2px 패딩 = 20 - 16).
      const imgHolder = new Container();
      imgHolder.x = sx + 2;
      imgHolder.y = sy + 2;
      this.panel.addChild(imgHolder);
      this.slotImageContainers.push(imgHolder);
      this.slotImages.push(null);
      this.slotItemUids.push(null);
    }

    // Info text
    this.infoText = new BitmapText({ text: '', style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0xcccccc } });
    this.infoText.x = PADDING;
    this.infoText.y = 16 + ROWS * (SLOT_SIZE + SLOT_GAP) + SLOT_GAP + 4;
    this.panel.addChild(this.infoText);
  }

  toggle(): void {
    if (this.visible) {
      this.close();
      return;
    }
    this.open('inventory', null);
  }

  /**
   * Open the inventory in the given mode.
   *
   * - 'inventory': normal use (equip on confirm).
   * - 'anvil': weapon-placement flow — confirm calls `onSelect(item)` instead
   *    of equipping. Used by the forge anvil so the player sees the same grid
   *    UI as the main inventory.
   */
  open(mode: InventoryUIMode, onSelect: ((item: ItemInstance) => void) | null): void {
    this.mode = mode;
    this.onSelect = onSelect;
    this.visible = true;
    this.container.visible = true;
    this.selectedIndex = this.inventory.items.length > 0 ? 0 : -1;
    this.refresh();
  }

  /** Convenience — open in anvil mode with the placement callback. */
  openForAnvil(onSelect: (item: ItemInstance) => void): void {
    this.open('anvil', onSelect);
  }

  close(): void {
    this.visible = false;
    this.container.visible = false;
    this.mode = 'inventory';
    this.onSelect = null;
  }

  /** Confirm button (X). In inventory mode equips; in anvil mode invokes onSelect. */
  confirmSelected(): void {
    const item = this.inventory.items[this.selectedIndex];
    if (!item) return;
    if (this.mode === 'anvil') {
      this.onSelect?.(item);
      return;
    }
    this.inventory.equip(item.uid);
    this.refresh();
  }

  isAnvilMode(): boolean {
    return this.mode === 'anvil';
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
    // Mode-dependent title.
    this.titleText.text = this.mode === 'anvil' ? 'PLACE ON ANVIL' : 'INVENTORY';

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

      // 슬롯이 비었으면 기존 ItemImage 제거.
      if (!item && this.slotImages[i]) {
        this.slotImages[i]?.destroy();
        this.slotImages[i] = null;
        this.slotItemUids[i] = null;
      }
      if (!item) {
        this.slotImageContainers[i].visible = false;
      }

      if (item) {
        // Item image — 이전 프레임의 sprite와 uid가 다르면 재생성.
        // 내부 크기 = SLOT_SIZE - 4 = 16px. 64px 원본을 정수 4× 축소하여
        // pixel-perfect 유지 (포트레이트 64px 1:1 과 함께 양쪽 정수 스케일).
        if (this.slotItemUids[i] !== item.uid) {
          const prev = this.slotImages[i];
          if (prev) prev.destroy();
          const img = new ItemImage(item, SLOT_SIZE - 4);
          this.slotImageContainers[i].addChild(img.container);
          this.slotImages[i] = img;
          this.slotItemUids[i] = item.uid;
        }
        this.slotImageContainers[i].visible = true;
        // Anvil 모드에서 장착 중인 아이템 → dim (배치 불가 신호).
        this.slotImageContainers[i].alpha =
          this.mode === 'anvil' && isEquipped ? ANVIL_EQUIPPED_DIM_ALPHA : 1.0;

        // Level indicator
        if (item.level > 0) {
          slot.rect(1, 1, 6, 6).fill(0x000000);
        }

        // Cleared badge (bottom-right green square)
        if (item.worldProgress?.cleared) {
          slot.rect(SLOT_SIZE - 5, SLOT_SIZE - 5, 4, 4).fill(0x44ff44);
        }

        // A4: "Dive available" pictogram — concentric portal in top-right.
        // Always shown on any weapon item since every weapon is dive-able
        // at altar/anvil. Teaches "this is not just loot — it has a world".
        const dx = SLOT_SIZE - 7;
        const dy = 1;
        slot.rect(dx, dy, 6, 6).fill({ color: 0x000000, alpha: 0.7 });
        slot.circle(dx + 3, dy + 3, 2.2).stroke({ color: 0x88ccff, width: 1, alpha: 0.9 });
        slot.circle(dx + 3, dy + 3, 1.1).fill({ color: 0xffffff, alpha: 0.9 });
      }
    }

    // Info text
    const item = this.inventory.items[this.selectedIndex];
    if (item) {
      const equipped = this.inventory.equipped?.uid === item.uid ? ' [E]' : '';
      const cycle = item.worldProgress?.cycle ?? 0;
      const cycleTag = cycle > 0 ? ` C${cycle}` : '';
      const clearTag = item.worldProgress?.cleared ? ' CLR' : '';
      const action = this.mode === 'anvil'
        ? 'X:Place on anvil  ESC:Cancel'
        : 'X:Equip  @:Dive at altar/anvil';
      this.infoText.text =
        `${item.def.name}${equipped} Lv${item.level}${cycleTag}${clearTag}\n` +
        `ATK:${item.finalAtk} ${item.rarity.toUpperCase()}\n` +
        action;
    } else {
      this.infoText.text = this.mode === 'anvil'
        ? 'No items to place'
        : `${this.inventory.items.length}/20 items`;
    }
  }
}
