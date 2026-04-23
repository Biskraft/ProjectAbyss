import { Container, Graphics, BitmapText } from 'pixi.js';
import { type ItemInstance, RARITY_COLOR, calcInnocentBonus, type InnocentStatKey } from '@items/ItemInstance';
import type { Inventory } from '@items/Inventory';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';
import { ItemImage } from './ItemImage';
import { PIXEL_FONT } from './fonts';
import { RARITY_DISPLAY_NAME } from '@data/weapons';
import { STRATA_BY_RARITY } from '@data/StrataConfig';
import { create9SlicePanel } from './ModalPanel';
import type { UISkin } from './UISkin';

const SLOT_SIZE = 32;
const SLOT_GAP = 3;
const COLS = 5;
const ROWS = 4;
const PADDING = 12;

const GRID_W = COLS * (SLOT_SIZE + SLOT_GAP) + SLOT_GAP + PADDING * 2; // 192
const INFO_W = 180;
const DIVIDER_W = 1;
const ARROW_W = 40;     // arrow area width
const ANVIL_SLOT_W = 80; // large anvil slot area
const PANEL_W = GRID_W + DIVIDER_W + INFO_W; // 373 (inventory mode)
const PANEL_W_ANVIL = PANEL_W + ARROW_W + ANVIL_SLOT_W; // 493 (anvil mode)
const PANEL_H = ROWS * (SLOT_SIZE + SLOT_GAP) + SLOT_GAP + PADDING * 2 + 48;

const ANVIL_EQUIPPED_DIM_ALPHA = 0.15;

const COL_PANEL_BG = 0x1a1a2e;
const COL_BORDER = 0x4a4a6a;
const COL_SLOT_EMPTY = 0x2a2a3e;
const COL_SLOT_SELECTED = 0x4a4a8a;
const COL_EQUIP_BORDER = 0xffffff;
const COL_TEXT = 0xcccccc;
const COL_DIM = 0xaaaaaa;
const COL_POSITIVE = 0x44ff44;
const COL_NEGATIVE = 0xff4444;

export type InventoryUIMode = 'inventory' | 'anvil';

export class InventoryUI {
  container: Container;
  visible = false;
  private inventory: Inventory;
  private slots: Graphics[] = [];
  private slotImageContainers: Container[] = [];
  private slotImages: (ItemImage | null)[] = [];
  private slotItemUids: (number | null)[] = [];
  private selectedIndex = -1;
  private panel: Graphics;
  private titleText: BitmapText;
  private infoContainer: Container;

  private mode: InventoryUIMode = 'inventory';
  private onSelect: ((item: ItemInstance) => void) | null = null;

  // Compare mode
  private compareActive = false;
  private skin: UISkin | null = null;
  private panelFrame: Container | null = null;

  // Anvil 2-stage placement
  private anvilState: 'selecting' | 'placed' = 'selecting';
  private anvilItem: ItemInstance | null = null;
  private anvilSlotContainer: Container | null = null;
  private anvilPulseTimer = 0;

  setInventory(inventory: Inventory): void {
    this.inventory = inventory;
  }

  setSkin(skin: UISkin): void {
    this.skin = skin;
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
    this.panel.x = panelX;
    this.panel.y = panelY;
    this.container.addChild(this.panel);

    // Title
    this.titleText = new BitmapText({ text: 'INVENTORY', style: { fontFamily: PIXEL_FONT, fontSize: 12, fill: 0xffffff } });
    this.titleText.x = PADDING;
    this.titleText.y = 6;
    this.panel.addChild(this.titleText);

    // Slot graphics + ItemImage containers
    for (let i = 0; i < COLS * ROWS; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const sx = PADDING + SLOT_GAP + col * (SLOT_SIZE + SLOT_GAP);
      const sy = 24 + SLOT_GAP + row * (SLOT_SIZE + SLOT_GAP);
      const slot = new Graphics();
      slot.x = sx;
      slot.y = sy;
      this.panel.addChild(slot);
      this.slots.push(slot);

      const imgHolder = new Container();
      imgHolder.x = sx + 3;
      imgHolder.y = sy + 3;
      this.panel.addChild(imgHolder);
      this.slotImageContainers.push(imgHolder);
      this.slotImages.push(null);
      this.slotItemUids.push(null);
    }

    // Info container (right side)
    this.infoContainer = new Container();
    this.infoContainer.x = GRID_W + DIVIDER_W + 6;
    this.infoContainer.y = 24;
    this.panel.addChild(this.infoContainer);
  }

  toggle(): void {
    if (this.visible) { this.close(); return; }
    this.open('inventory', null);
  }

  open(mode: InventoryUIMode, onSelect: ((item: ItemInstance) => void) | null): void {
    this.mode = mode;
    this.onSelect = onSelect;
    this.visible = true;
    this.container.visible = true;
    this.compareActive = false;
    this.anvilState = 'selecting';
    this.anvilItem = null;
    this.selectedIndex = this.inventory.items.length > 0 ? 0 : -1;
    this.refresh();
  }

  openForAnvil(onSelect: (item: ItemInstance) => void): void {
    this.open('anvil', onSelect);
  }

  close(): void {
    this.visible = false;
    this.container.visible = false;
    this.mode = 'inventory';
    this.onSelect = null;
    this.compareActive = false;
    this.anvilState = 'selecting';
    this.anvilItem = null;
    this.clearAnvilSlot();
  }

  confirmSelected(): void {
    if (this.mode === 'anvil') {
      if (this.anvilState === 'selecting') {
        // Stage 1: Place item on anvil
        const item = this.inventory.items[this.selectedIndex];
        if (!item) return;
        if (this.inventory.equipped?.uid === item.uid) return; // can't place equipped
        this.placeOnAnvil(item);
      } else if (this.anvilState === 'placed') {
        // Stage 2: Confirm dive
        this.confirmDive();
      }
      return;
    }
    const item = this.inventory.items[this.selectedIndex];
    if (!item) return;
    this.inventory.equip(item.uid);
    this.refresh();
  }

  /** Cancel in anvil mode — different behavior per state */
  cancelAnvil(): void {
    if (this.anvilState === 'placed') {
      this.removeFromAnvil();
    } else {
      this.close();
    }
  }

  isAnvilMode(): boolean { return this.mode === 'anvil'; }

  /** Toggle compare mode (C key) */
  toggleCompare(): void {
    const item = this.inventory.items[this.selectedIndex];
    const equipped = this.inventory.equipped;
    if (!item || !equipped || item.uid === equipped.uid) return;
    this.compareActive = !this.compareActive;
    this.refresh();
  }

  navigate(dir: 'left' | 'right' | 'up' | 'down'): void {
    // Block navigation when item is placed on anvil
    if (this.mode === 'anvil' && this.anvilState === 'placed') return;
    const count = this.inventory.items.length;
    if (count === 0) return;
    if (this.selectedIndex < 0) { this.selectedIndex = 0; }
    else {
      switch (dir) {
        case 'left': this.selectedIndex = Math.max(0, this.selectedIndex - 1); break;
        case 'right': this.selectedIndex = Math.min(count - 1, this.selectedIndex + 1); break;
        case 'up': this.selectedIndex = Math.max(0, this.selectedIndex - COLS); break;
        case 'down': this.selectedIndex = Math.min(count - 1, this.selectedIndex + COLS); break;
      }
    }
    this.refresh();
  }

  equipSelected(): void {
    const item = this.inventory.items[this.selectedIndex];
    if (item) { this.inventory.equip(item.uid); this.refresh(); }
  }

  refresh(): void {
    // Panel width depends on mode (anvil adds arrow + slot area)
    const pw = this.mode === 'anvil' ? PANEL_W_ANVIL : PANEL_W;

    // Reposition panel center
    this.panel.x = Math.floor((GAME_WIDTH - pw) / 2);
    this.panel.y = Math.floor((GAME_HEIGHT - PANEL_H) / 2);

    // Redraw panel background — prefer 9-slice when skin is loaded
    this.panel.clear();
    if (this.panelFrame) {
      this.panel.removeChild(this.panelFrame);
      this.panelFrame.destroy({ children: true });
      this.panelFrame = null;
    }
    if (this.skin?.isLoaded) {
      const frame = create9SlicePanel(this.skin, pw, PANEL_H);
      if (frame) {
        this.panelFrame = frame;
        this.panel.addChildAt(frame, 0);
      } else {
        this.panel.rect(0, 0, pw, PANEL_H).fill({ color: COL_PANEL_BG, alpha: 0.95 });
        this.panel.rect(0, 0, pw, PANEL_H).stroke({ color: COL_BORDER, width: 1 });
      }
    } else {
      this.panel.rect(0, 0, pw, PANEL_H).fill({ color: COL_PANEL_BG, alpha: 0.95 });
      this.panel.rect(0, 0, pw, PANEL_H).stroke({ color: COL_BORDER, width: 1 });
    }
    // Grid/Info divider
    this.panel.moveTo(GRID_W, 24);
    this.panel.lineTo(GRID_W, PANEL_H - PADDING);
    this.panel.stroke({ width: DIVIDER_W, color: COL_BORDER });

    this.titleText.text = this.mode === 'anvil' ? 'FORGE' : 'INVENTORY';

    // --- Slots ---
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      slot.clear();
      // Remove dynamic children (level labels, etc.) added in previous refresh
      while (slot.children.length > 0) {
        slot.removeChildAt(0).destroy();
      }

      const item = this.inventory.items[i];
      const isSelected = i === this.selectedIndex;
      const isEquipped = item && this.inventory.equipped?.uid === item.uid;

      slot.rect(0, 0, SLOT_SIZE, SLOT_SIZE).fill(isSelected ? COL_SLOT_SELECTED : COL_SLOT_EMPTY);

      if (isEquipped) {
        slot.rect(0, 0, SLOT_SIZE, SLOT_SIZE).stroke({ color: COL_EQUIP_BORDER, width: 2 });
      }

      if (!item && this.slotImages[i]) {
        this.slotImages[i]?.destroy();
        this.slotImages[i] = null;
        this.slotItemUids[i] = null;
      }
      if (!item) { this.slotImageContainers[i].visible = false; }

      if (item) {
        if (this.slotItemUids[i] !== item.uid) {
          const prev = this.slotImages[i];
          if (prev) prev.destroy();
          const img = new ItemImage(item, SLOT_SIZE - 6);
          this.slotImageContainers[i].addChild(img.container);
          this.slotImages[i] = img;
          this.slotItemUids[i] = item.uid;
        }
        this.slotImageContainers[i].visible = true;
        const isOnAnvil = this.anvilItem?.uid === item.uid;
        this.slotImageContainers[i].alpha =
          (this.mode === 'anvil' && isEquipped) ? ANVIL_EQUIPPED_DIM_ALPHA
          : isOnAnvil ? 0.3
          : 1.0;

        // Level indicator (top-left)
        if (item.level > 0) {
          slot.rect(1, 1, 10, 10).fill(0x000000);
          const lvText = new BitmapText({ text: `${item.level}`, style: { fontFamily: PIXEL_FONT, fontSize: 7, fill: 0xffffff } });
          lvText.x = 3; lvText.y = 2;
          slot.addChild(lvText);
        }

        // Cleared badge (bottom-right)
        if (item.worldProgress?.cleared) {
          slot.rect(SLOT_SIZE - 8, SLOT_SIZE - 8, 6, 6).fill(COL_POSITIVE);
        }

        // Innocent indicator (bottom-left)
        if (item.innocents && item.innocents.length > 0) {
          const hasWild = item.innocents.some((inn: any) => !inn.subdued);
          const color = hasWild ? COL_NEGATIVE : COL_EQUIP_BORDER;
          slot.rect(1, SLOT_SIZE - 8, 6, 6).fill(color);
        }

        // Dive pictogram (top-right)
        const dx = SLOT_SIZE - 11, dy = 1;
        slot.rect(dx, dy, 10, 10).fill({ color: 0x000000, alpha: 0.7 });
        slot.circle(dx + 5, dy + 5, 3.5).stroke({ color: 0x88ccff, width: 1, alpha: 0.9 });
        slot.circle(dx + 5, dy + 5, 1.5).fill({ color: 0xffffff, alpha: 0.9 });
      }
    }

    // --- Level 2 Info Box ---
    this.drawInfoBox();

    // Anvil mode: always draw the anvil slot area (empty or filled)
    if (this.mode === 'anvil') {
      this.clearAnvilSlot();
      this.drawAnvilArea();
    }
  }

  private drawInfoBox(): void {
    // Clear previous info
    for (const child of [...this.infoContainer.children]) {
      this.infoContainer.removeChild(child);
      child.destroy?.({ children: true });
    }

    const item = this.inventory.items[this.selectedIndex];
    const maxW = this.mode === 'anvil' ? INFO_W - 60 : INFO_W - 12;
    let y = 0;

    const addLine = (text: string, color = COL_TEXT, fontSize = 12): BitmapText => {
      let displayText = text;
      if (displayText.length > 22) displayText = displayText.substring(0, 21) + '...';
      const t = new BitmapText({ text: displayText, style: { fontFamily: PIXEL_FONT, fontSize, fill: color } });
      t.y = y;
      this.infoContainer.addChild(t);
      y += fontSize + 3;
      return t;
    };

    const addDivider = (): void => {
      const g = new Graphics();
      g.moveTo(0, y + 3); g.lineTo(maxW, y + 3);
      g.stroke({ width: 1, color: COL_BORDER });
      this.infoContainer.addChild(g);
      y += 9;
    };

    if (!item) {
      addLine(this.mode === 'anvil' ? 'No items' : `${this.inventory.items.length}/20 items`, COL_DIM);
      return;
    }

    const equipped = this.inventory.equipped;
    const isEquipped = equipped?.uid === item.uid;
    const rarityColor = RARITY_COLOR[item.rarity] ?? 0xffffff;

    // Line 1: Item name + [E]
    addLine(`${item.def.name}${isEquipped ? ' [E]' : ''}`, rarityColor);

    // Line 2: RARITY Lv.N C0 CLR
    const cycle = item.worldProgress?.cycle ?? 0;
    const cycleTag = cycle > 0 ? ` C${cycle}` : '';
    const clearTag = item.worldProgress?.cleared ? ' CLR' : '';
    const rarityName = RARITY_DISPLAY_NAME[item.rarity] ?? item.rarity;
    addLine(`${rarityName} Lv.${item.level}${cycleTag}${clearTag}`, COL_TEXT, 10);

    addDivider();

    // Lines 4-5: Stats (with compare delta if active)
    if (this.compareActive && equipped && equipped.uid !== item.uid) {
      // Compare mode: show deltas
      const deltaAtk = item.finalAtk - equipped.finalAtk;
      const atkColor = deltaAtk > 0 ? COL_POSITIVE : deltaAtk < 0 ? COL_NEGATIVE : COL_TEXT;
      const atkDelta = deltaAtk !== 0 ? ` (${deltaAtk > 0 ? '+' : ''}${deltaAtk})` : '';
      addLine(`ATK:${item.finalAtk}${atkDelta}`, atkColor);
    } else {
      addLine(`ATK:${item.finalAtk}`, COL_TEXT);
    }

    // Innocent bonus
    const bonusAtk = calcInnocentBonus(item, 'atk' as InnocentStatKey);
    const bonusHp = calcInnocentBonus(item, 'hp' as InnocentStatKey);
    if (bonusAtk > 0 || bonusHp > 0) {
      const parts: string[] = [];
      if (bonusAtk > 0) parts.push(`ATK+${bonusAtk}`);
      if (bonusHp > 0) parts.push(`HP+${bonusHp}`);
      addLine(parts.join(' '), COL_POSITIVE, 10);
    }

    addDivider();

    // Innocents count
    const innocentCount = item.innocents?.length ?? 0;
    const maxSlots = { normal: 2, magic: 3, rare: 4, legendary: 6, ancient: 8 }[item.rarity] ?? 2;
    const hasWild = item.innocents?.some((inn: any) => !inn.subdued) ?? false;
    addLine(`Innocents: ${innocentCount}/${maxSlots}`, hasWild ? COL_NEGATIVE : COL_TEXT, 14);

    // Strata progress
    const strata = STRATA_BY_RARITY[item.rarity];
    const totalStrata = strata?.strata.length ?? 0;
    const clearedStrata = item.worldProgress?.deepestUnlocked ?? 0;
    addLine(`Strata: ${clearedStrata}/${totalStrata}`, COL_TEXT, 10);

    addDivider();

    // Action hints (state-dependent)
    if (this.mode === 'anvil') {
      if (this.anvilState === 'placed') {
        addLine('[C]DIVE [ESC]Remove', COL_DIM, 10);
      } else {
        addLine('[C]Place [ESC]Back', COL_DIM, 10);
      }
    } else {
      addLine('[C]Equip', COL_DIM, 10);
      if (equipped && !isEquipped) {
        addLine('[Z]Compare', COL_DIM, 10);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Anvil 2-stage placement
  // ---------------------------------------------------------------------------

  private placeOnAnvil(item: ItemInstance): void {
    this.anvilItem = item;
    this.anvilState = 'placed';
    this.anvilPulseTimer = 0;
    this.drawAnvilSlot(item);
    this.refresh();
  }

  private removeFromAnvil(): void {
    if (!this.anvilItem) return;
    const slotIdx = this.inventory.items.indexOf(this.anvilItem);
    this.anvilItem = null;
    this.anvilState = 'selecting';
    this.clearAnvilSlot();
    if (slotIdx >= 0) this.selectedIndex = slotIdx;
    this.refresh();
  }

  private confirmDive(): void {
    if (!this.anvilItem) return;
    const item = this.anvilItem;
    this.anvilItem = null;
    this.anvilState = 'selecting';
    this.onSelect?.(item);
  }

  /** Always-visible anvil area: arrow + large slot (empty or filled) */
  private drawAnvilArea(): void {
    const slot = new Container();
    const anvilSlotSize = 64;
    const hasItem = !!this.anvilItem;
    const rarityColor = hasItem ? (RARITY_COLOR[this.anvilItem!.rarity] ?? 0xffffff) : COL_BORDER;

    // Arrow (→) — dim when empty, rarity color when placed
    const arrowX = PANEL_W - 16;
    const arrowY = Math.floor(PANEL_H / 2) - 10;
    const arrowColor = hasItem ? rarityColor : 0x444466;
    const arrow = new Graphics();
    arrow.rect(arrowX, arrowY + 6, ARROW_W - 16, 8).fill(arrowColor);
    arrow.poly([
      arrowX + ARROW_W - 16, arrowY,
      arrowX + ARROW_W - 4, arrowY + 10,
      arrowX + ARROW_W - 16, arrowY + 20,
    ]);
    arrow.fill(arrowColor);
    slot.addChild(arrow);

    // Large slot frame (always visible)
    const slotX = PANEL_W + ARROW_W - 20 + Math.floor((ANVIL_SLOT_W - anvilSlotSize) / 2);
    const slotY = Math.floor((PANEL_H - anvilSlotSize) / 2) - 8;
    const bg = new Graphics();
    bg.rect(slotX, slotY, anvilSlotSize, anvilSlotSize).fill(COL_SLOT_EMPTY);
    const borderColor = hasItem ? rarityColor : COL_BORDER;
    bg.rect(slotX, slotY, anvilSlotSize, anvilSlotSize).stroke({ color: borderColor, width: 2 });
    slot.addChild(bg);

    if (hasItem) {
      // Item icon inside slot
      const img = new ItemImage(this.anvilItem!, anvilSlotSize - 8);
      img.container.x = slotX + 4;
      img.container.y = slotY + 4;
      slot.addChild(img.container);

      // "DIVE" label
      const label = new BitmapText({ text: 'DIVE', style: { fontFamily: PIXEL_FONT, fontSize: 10, fill: rarityColor } });
      label.x = slotX + Math.floor((anvilSlotSize - 28) / 2);
      label.y = slotY + anvilSlotSize + 4;
      slot.addChild(label);
    } else {
      // Empty label
      const label = new BitmapText({ text: 'ANVIL', style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: COL_DIM } });
      label.x = slotX + Math.floor((anvilSlotSize - 32) / 2);
      label.y = slotY + anvilSlotSize + 4;
      slot.addChild(label);
    }

    this.panel.addChild(slot);
    this.anvilSlotContainer = slot;
  }

  /** @deprecated Use drawAnvilArea instead */
  private drawAnvilSlot(item: ItemInstance): void {
    // Now handled by drawAnvilArea() which is called from refresh()
  }

  private clearAnvilSlot(): void {
    if (this.anvilSlotContainer) {
      if (this.anvilSlotContainer.parent) this.anvilSlotContainer.parent.removeChild(this.anvilSlotContainer);
      this.anvilSlotContainer.destroy({ children: true });
      this.anvilSlotContainer = null;
    }
  }

  /** Call from scene update for anvil slot pulse animation */
  update(dt: number): void {
    if (!this.visible || this.anvilState !== 'placed' || !this.anvilSlotContainer) return;
    this.anvilPulseTimer += dt;
    const pulse = 0.7 + 0.3 * Math.sin(this.anvilPulseTimer * 0.005);
    this.anvilSlotContainer.alpha = pulse;
  }
}
