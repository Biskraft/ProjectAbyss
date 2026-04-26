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

// ── Layout constants ──────────────────────────────────────────────────────────
const PADDING = 12;
const ROW_H = 18;          // list row height
const ROW_GAP = 1;         // gap between rows
const EQUIP_AREA_H = 46;   // equipment slots area height
const EQUIP_SLOT_W = 48;   // each equipment slot width
const EQUIP_SLOTS = 6;     // Weapon, Visor, Plate, Gauntlet, Greaves, Sigil
const EQUIP_GAP = 3;

const MAX_VISIBLE_ROWS = 8;
const LIST_H = MAX_VISIBLE_ROWS * (ROW_H + ROW_GAP);
const DETAIL_H = 80;

const PANEL_W = 340;
const PANEL_H = PADDING + 16 + 4 + EQUIP_AREA_H + 6 + LIST_H + 4 + DETAIL_H + PADDING;

// Anvil mode extra
const ANVIL_SLOT_W = 64;
const ARROW_W = 24;
const PANEL_W_ANVIL = PANEL_W + ARROW_W + ANVIL_SLOT_W + 12;

const ANVIL_EQUIPPED_DIM_ALPHA = 0.15;

// ── Color tokens ──────────────────────────────────────────────────────────────
const COL_PANEL_BG = 0x1a1a2e;
const COL_BORDER = 0x4a4a6a;

// Row states
const COL_ROW_BG = 0x000000;       // transparent (alpha 0)
const COL_ROW_SELECTED = 0x2a3a5e;
const COL_ROW_EQUIPPED_BG = 0x2a1a10;
const COL_ROW_EQUIPPED_BAR = 0xff8c00;
const COL_ROW_CURSOR = 0x00ced1;    // accent cyan

// Text
const COL_TEXT = 0xcccccc;
const COL_TEXT_DIM = 0x777777;
const COL_TEXT_WHITE = 0xffffff;
const COL_DIM = 0xaaaaaa;
const COL_POSITIVE = 0x44ff44;
const COL_NEGATIVE = 0xff4444;

// Badge
const COL_DIVE = 0x00ced1;
const COL_CLEARED = 0x44ff44;
const COL_LOCKED = 0x666666;

// Equipment slot
const COL_EQUIP_EMPTY_BORDER = 0x3a3a4e;
const COL_EQUIP_FILLED_BORDER = 0x5a5a6a;
const COL_EQUIP_BG = 0x101018;

const EQUIP_SLOT_NAMES = ['WEAPON', 'VISOR', 'PLATE', 'GAUNTLET', 'GREAVES', 'SIGIL'] as const;
const EQUIP_SLOT_ICONS = ['⚔', '◇', '🛡', '✋', '▽', '◆'] as const;

export type InventoryUIMode = 'inventory' | 'anvil';

export class InventoryUI {
  container: Container;
  visible = false;
  private inventory: Inventory;
  private selectedIndex = -1;
  private scrollOffset = 0;
  private panel: Container;
  private panelBg: Graphics;
  private titleText: BitmapText;

  // Equipment slot area
  private equipArea: Container;

  // List area
  private listArea: Container;

  // Detail area
  private detailArea: Container;

  private mode: InventoryUIMode = 'inventory';
  private onSelect: ((item: ItemInstance) => void) | null = null;

  // Compare mode — now always-on when equipped item exists
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

    // Panel container
    this.panel = new Container();
    this.container.addChild(this.panel);

    // Panel background
    this.panelBg = new Graphics();
    this.panel.addChild(this.panelBg);

    // Title
    this.titleText = new BitmapText({ text: 'INVENTORY', style: { fontFamily: PIXEL_FONT, fontSize: 12, fill: COL_TEXT_WHITE } });
    this.titleText.x = PADDING;
    this.titleText.y = 6;
    this.panel.addChild(this.titleText);

    // Equipment slots area
    this.equipArea = new Container();
    this.equipArea.y = 22;
    this.panel.addChild(this.equipArea);

    // List area
    this.listArea = new Container();
    this.listArea.y = 22 + EQUIP_AREA_H + 6;
    this.panel.addChild(this.listArea);

    // Detail area
    this.detailArea = new Container();
    this.detailArea.y = 22 + EQUIP_AREA_H + 6 + LIST_H + 4;
    this.panel.addChild(this.detailArea);
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
    this.scrollOffset = 0;
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
        const item = this.inventory.items[this.selectedIndex];
        if (!item) return;
        if (this.inventory.equipped?.uid === item.uid) return;
        this.placeOnAnvil(item);
      } else if (this.anvilState === 'placed') {
        this.confirmDive();
      }
      return;
    }
    const item = this.inventory.items[this.selectedIndex];
    if (!item) return;
    this.inventory.equip(item.uid);
    this.refresh();
  }

  cancelAnvil(): void {
    if (this.anvilState === 'placed') {
      this.removeFromAnvil();
    } else {
      this.close();
    }
  }

  isAnvilMode(): boolean { return this.mode === 'anvil'; }

  toggleCompare(): void {
    const item = this.inventory.items[this.selectedIndex];
    const equipped = this.inventory.equipped;
    if (!item || !equipped || item.uid === equipped.uid) return;
    this.compareActive = !this.compareActive;
    this.refresh();
  }

  navigate(dir: 'left' | 'right' | 'up' | 'down'): void {
    if (this.mode === 'anvil' && this.anvilState === 'placed') return;
    const count = this.inventory.items.length;
    if (count === 0) return;
    if (this.selectedIndex < 0) { this.selectedIndex = 0; }
    else {
      switch (dir) {
        case 'up': this.selectedIndex = Math.max(0, this.selectedIndex - 1); break;
        case 'down': this.selectedIndex = Math.min(count - 1, this.selectedIndex + 1); break;
        case 'left': this.selectedIndex = Math.max(0, this.selectedIndex - 1); break;
        case 'right': this.selectedIndex = Math.min(count - 1, this.selectedIndex + 1); break;
      }
    }
    // Scroll to keep selected visible
    if (this.selectedIndex < this.scrollOffset) this.scrollOffset = this.selectedIndex;
    if (this.selectedIndex >= this.scrollOffset + MAX_VISIBLE_ROWS) this.scrollOffset = this.selectedIndex - MAX_VISIBLE_ROWS + 1;
    this.refresh();
  }

  equipSelected(): void {
    const item = this.inventory.items[this.selectedIndex];
    if (item) { this.inventory.equip(item.uid); this.refresh(); }
  }

  // ── Main refresh ──────────────────────────────────────────────────────────────
  refresh(): void {
    const pw = this.mode === 'anvil' ? PANEL_W_ANVIL : PANEL_W;
    this.panel.x = Math.floor((GAME_WIDTH - pw) / 2);
    this.panel.y = Math.floor((GAME_HEIGHT - PANEL_H) / 2);

    // Panel background
    this.panelBg.clear();
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
        this.panelBg.rect(0, 0, pw, PANEL_H).fill({ color: COL_PANEL_BG, alpha: 0.95 });
        this.panelBg.rect(0, 0, pw, PANEL_H).stroke({ color: COL_BORDER, width: 1 });
      }
    } else {
      this.panelBg.rect(0, 0, pw, PANEL_H).fill({ color: COL_PANEL_BG, alpha: 0.95 });
      this.panelBg.rect(0, 0, pw, PANEL_H).stroke({ color: COL_BORDER, width: 1 });
    }

    this.titleText.text = this.mode === 'anvil' ? 'FORGE' : 'INVENTORY';

    this.drawEquipmentSlots();
    this.drawList();
    this.drawDetail();

    if (this.mode === 'anvil') {
      this.clearAnvilSlot();
      this.drawAnvilArea();
    }
  }

  // ── Equipment Slots (6-slot bar) ──────────────────────────────────────────────
  private equipSlotImages: (ItemImage | null)[] = Array(EQUIP_SLOTS).fill(null);

  private drawEquipmentSlots(): void {
    for (const c of [...this.equipArea.children]) {
      this.equipArea.removeChild(c);
      c.destroy?.({ children: true });
    }
    // Clear cached images (they were destroyed with children above)
    this.equipSlotImages = Array(EQUIP_SLOTS).fill(null);

    const equipped = this.inventory.equipped;
    const totalW = EQUIP_SLOTS * EQUIP_SLOT_W + (EQUIP_SLOTS - 1) * EQUIP_GAP;
    const startX = PADDING + Math.floor((PANEL_W - PADDING * 2 - totalW) / 2);
    const iconSize = 24; // ItemImage size inside slot

    for (let i = 0; i < EQUIP_SLOTS; i++) {
      const x = startX + i * (EQUIP_SLOT_W + EQUIP_GAP);
      const slotName = EQUIP_SLOT_NAMES[i];

      // Currently only weapon slot (index 0) can be equipped
      const isWeaponSlot = i === 0;
      const equippedItem = isWeaponSlot ? equipped : null;
      const hasItem = !!equippedItem;

      const g = new Graphics();

      if (hasItem && isWeaponSlot) {
        // Filled weapon slot — orange accent
        g.rect(x, 0, EQUIP_SLOT_W, EQUIP_AREA_H).fill({ color: COL_ROW_EQUIPPED_BAR, alpha: 0.08 });
        g.rect(x, 0, EQUIP_SLOT_W, EQUIP_AREA_H).stroke({ color: COL_ROW_EQUIPPED_BAR, width: 1, alpha: 0.3 });
      } else {
        // Empty slot — dim
        g.rect(x, 0, EQUIP_SLOT_W, EQUIP_AREA_H).fill({ color: COL_EQUIP_BG, alpha: 0.3 });
        g.rect(x, 0, EQUIP_SLOT_W, EQUIP_AREA_H).stroke({ color: COL_EQUIP_EMPTY_BORDER, width: 1 });
      }
      this.equipArea.addChild(g);

      // Slot name label
      const nameLabel = new BitmapText({
        text: slotName,
        style: { fontFamily: PIXEL_FONT, fontSize: 6, fill: hasItem ? COL_DIM : COL_LOCKED }
      });
      nameLabel.x = x + Math.floor((EQUIP_SLOT_W - nameLabel.width) / 2);
      nameLabel.y = 2;
      this.equipArea.addChild(nameLabel);

      // Item icon — use ItemImage for equipped items, dash for empty
      if (hasItem && equippedItem) {
        const img = new ItemImage(equippedItem, iconSize);
        img.container.x = x + Math.floor((EQUIP_SLOT_W - iconSize) / 2);
        img.container.y = 11;
        this.equipArea.addChild(img.container);
        this.equipSlotImages[i] = img;
      } else {
        // Empty dash
        const dash = new BitmapText({
          text: '—',
          style: { fontFamily: PIXEL_FONT, fontSize: 14, fill: COL_EQUIP_EMPTY_BORDER }
        });
        dash.x = x + Math.floor((EQUIP_SLOT_W - 8) / 2);
        dash.y = 14;
        this.equipArea.addChild(dash);
      }

      // Item name or 'empty'
      const itemNameText = hasItem ? equippedItem!.def.name : 'empty';
      const itemNameColor = hasItem ? (RARITY_COLOR[equippedItem!.rarity] ?? COL_TEXT_WHITE) : COL_EQUIP_EMPTY_BORDER;
      const itemLabel = new BitmapText({
        text: itemNameText.length > 7 ? itemNameText.substring(0, 6) + '..' : itemNameText,
        style: { fontFamily: PIXEL_FONT, fontSize: 7, fill: itemNameColor }
      });
      itemLabel.x = x + Math.floor((EQUIP_SLOT_W - itemLabel.width) / 2);
      itemLabel.y = 37;
      this.equipArea.addChild(itemLabel);
    }

    // Divider below equipment
    const divG = new Graphics();
    divG.moveTo(PADDING, EQUIP_AREA_H + 2);
    divG.lineTo(PANEL_W - PADDING, EQUIP_AREA_H + 2);
    divG.stroke({ width: 1, color: COL_BORDER });
    this.equipArea.addChild(divG);
  }

  // ── Item List (scrollable) ────────────────────────────────────────────────────
  private drawList(): void {
    for (const c of [...this.listArea.children]) {
      this.listArea.removeChild(c);
      c.destroy?.({ children: true });
    }

    const items = this.inventory.items;
    const count = items.length;

    // "BACKPACK (N/20)" label
    const backpackLabel = new BitmapText({
      text: this.mode === 'anvil' ? 'SELECT WEAPON TO DIVE' : `BACKPACK (${count}/20)`,
      style: { fontFamily: PIXEL_FONT, fontSize: 7, fill: COL_LOCKED }
    });
    backpackLabel.x = PADDING;
    backpackLabel.y = 0;
    this.listArea.addChild(backpackLabel);

    const listStartY = 12;
    const visibleEnd = Math.min(count, this.scrollOffset + MAX_VISIBLE_ROWS);

    for (let vi = this.scrollOffset; vi < visibleEnd; vi++) {
      const item = items[vi];
      const rowIdx = vi - this.scrollOffset;
      const ry = listStartY + rowIdx * (ROW_H + ROW_GAP);
      const isSelected = vi === this.selectedIndex;
      const isEquipped = this.inventory.equipped?.uid === item.uid;
      const isOnAnvil = this.anvilItem?.uid === item.uid;

      this.drawRow(item, ry, isSelected, isEquipped, isOnAnvil);
    }

    // Scroll indicator
    if (count > MAX_VISIBLE_ROWS) {
      const scrollG = new Graphics();
      const barH = LIST_H - 14;
      const thumbH = Math.max(10, barH * (MAX_VISIBLE_ROWS / count));
      const thumbY = listStartY + (this.scrollOffset / (count - MAX_VISIBLE_ROWS)) * (barH - thumbH);
      scrollG.rect(PANEL_W - PADDING - 3, listStartY, 2, barH).fill({ color: COL_BORDER, alpha: 0.3 });
      scrollG.rect(PANEL_W - PADDING - 3, thumbY, 2, thumbH).fill({ color: COL_DIM, alpha: 0.6 });
      this.listArea.addChild(scrollG);
    }
  }

  private drawRow(item: ItemInstance, y: number, isSelected: boolean, isEquipped: boolean, isOnAnvil: boolean): void {
    const rowW = PANEL_W - PADDING * 2;
    const g = new Graphics();
    g.x = PADDING;
    g.y = y;

    const rarityColor = RARITY_COLOR[item.rarity] ?? COL_TEXT_WHITE;

    // Row background
    if (isSelected && isEquipped) {
      g.rect(0, 0, rowW, ROW_H).fill({ color: COL_ROW_SELECTED, alpha: 0.8 });
      g.rect(0, 0, 3, ROW_H).fill(COL_ROW_EQUIPPED_BAR); // orange left bar
      g.rect(0, 0, rowW, ROW_H).stroke({ color: COL_TEXT_WHITE, width: 1, alpha: 0.35 });
    } else if (isSelected) {
      g.rect(0, 0, rowW, ROW_H).fill({ color: COL_ROW_SELECTED, alpha: 0.8 });
      g.rect(0, 0, rowW, ROW_H).stroke({ color: COL_TEXT_WHITE, width: 1, alpha: 0.35 });
    } else if (isEquipped) {
      g.rect(0, 0, rowW, ROW_H).fill({ color: COL_ROW_EQUIPPED_BG, alpha: 0.6 });
      g.rect(0, 0, 3, ROW_H).fill(COL_ROW_EQUIPPED_BAR); // orange left bar
    } else {
      // Normal — transparent (panel bg shows through)
    }

    // Dim if on anvil
    if (isOnAnvil) {
      g.alpha = 0.3;
    }

    this.listArea.addChild(g);

    let cx = PADDING + 4;

    // Cursor (▶)
    if (isSelected) {
      const cursor = new BitmapText({ text: '▶', style: { fontFamily: PIXEL_FONT, fontSize: 10, fill: COL_ROW_CURSOR } });
      cursor.x = cx;
      cursor.y = y + 3;
      this.listArea.addChild(cursor);
    }
    cx += 14;

    // [E] badge
    if (isEquipped) {
      const badge = new Graphics();
      badge.roundRect(cx, y + 3, 12, 12, 2).fill(COL_ROW_EQUIPPED_BAR);
      this.listArea.addChild(badge);
      const eText = new BitmapText({ text: 'E', style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0x000000 } });
      eText.x = cx + 3;
      eText.y = y + 4;
      this.listArea.addChild(eText);
    }
    cx += 16;

    // Item name (rarity color, brighter if selected)
    const nameColor = isSelected ? COL_TEXT_WHITE : (isEquipped ? rarityColor : COL_DIM);
    const name = item.def.name.length > 14 ? item.def.name.substring(0, 13) + '..' : item.def.name;
    const nameText = new BitmapText({ text: name, style: { fontFamily: PIXEL_FONT, fontSize: 10, fill: nameColor } });
    nameText.x = cx;
    nameText.y = y + 3;
    this.listArea.addChild(nameText);

    // Stars (rarity)
    const starCount = { normal: 1, magic: 2, rare: 3, legendary: 4, ancient: 5 }[item.rarity] ?? 1;
    const starsText = new BitmapText({
      text: '★'.repeat(starCount),
      style: { fontFamily: PIXEL_FONT, fontSize: 7, fill: 0xffd700 }
    });
    starsText.x = PADDING + rowW - 110;
    starsText.y = y + 5;
    this.listArea.addChild(starsText);

    // ATK stat
    const atkText = new BitmapText({
      text: `ATK ${item.finalAtk}`,
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: isOnAnvil ? COL_LOCKED : COL_TEXT }
    });
    atkText.x = PADDING + rowW - 68;
    atkText.y = y + 4;
    if (isOnAnvil) atkText.text = 'ON ANVIL';
    this.listArea.addChild(atkText);

    // DIVE / CLR / 🔒 badge (right end)
    const badgeX = PADDING + rowW - 28;
    if (isEquipped) {
      // Locked — can't dive equipped weapon
      const lockBadge = new Graphics();
      lockBadge.roundRect(badgeX - 4, y + 3, 28, 12, 2).stroke({ color: COL_LOCKED, width: 1 });
      this.listArea.addChild(lockBadge);
      const lockText = new BitmapText({ text: '🔒', style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: COL_LOCKED } });
      lockText.x = badgeX + 2;
      lockText.y = y + 4;
      this.listArea.addChild(lockText);
    } else if (item.worldProgress?.cleared) {
      const clrBadge = new Graphics();
      clrBadge.roundRect(badgeX - 4, y + 3, 28, 12, 2).fill(COL_CLEARED);
      this.listArea.addChild(clrBadge);
      const clrText = new BitmapText({ text: 'CLR', style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0x000000 } });
      clrText.x = badgeX;
      clrText.y = y + 4;
      this.listArea.addChild(clrText);
    } else if (!isOnAnvil) {
      const diveBadge = new Graphics();
      diveBadge.roundRect(badgeX - 4, y + 3, 28, 12, 2).fill(COL_DIVE);
      this.listArea.addChild(diveBadge);
      const diveText = new BitmapText({ text: 'DIVE', style: { fontFamily: PIXEL_FONT, fontSize: 7, fill: 0x000000 } });
      diveText.x = badgeX - 1;
      diveText.y = y + 4;
      this.listArea.addChild(diveText);
    }
  }

  // ── Detail Panel ──────────────────────────────────────────────────────────────
  private drawDetail(): void {
    for (const c of [...this.detailArea.children]) {
      this.detailArea.removeChild(c);
      c.destroy?.({ children: true });
    }

    const item = this.inventory.items[this.selectedIndex];
    let y = 0;

    // Divider
    const divG = new Graphics();
    divG.moveTo(PADDING, y);
    divG.lineTo(PANEL_W - PADDING, y);
    divG.stroke({ width: 1, color: COL_BORDER });
    this.detailArea.addChild(divG);
    y += 6;

    if (!item) {
      const emptyText = new BitmapText({
        text: this.mode === 'anvil' ? 'No items to dive' : `${this.inventory.items.length}/20 items`,
        style: { fontFamily: PIXEL_FONT, fontSize: 10, fill: COL_DIM }
      });
      emptyText.x = PADDING;
      emptyText.y = y;
      this.detailArea.addChild(emptyText);
      return;
    }

    const equipped = this.inventory.equipped;
    const isEquipped = equipped?.uid === item.uid;
    const rarityColor = RARITY_COLOR[item.rarity] ?? COL_TEXT_WHITE;

    // Item name
    const nameText = new BitmapText({
      text: item.def.name,
      style: { fontFamily: PIXEL_FONT, fontSize: 12, fill: rarityColor }
    });
    nameText.x = PADDING;
    nameText.y = y;
    this.detailArea.addChild(nameText);
    y += 14;

    // Rarity + Level
    const rarityName = RARITY_DISPLAY_NAME[item.rarity] ?? item.rarity;
    const cycle = item.worldProgress?.cycle ?? 0;
    const cycleTag = cycle > 0 ? ` C${cycle}` : '';
    const clearTag = item.worldProgress?.cleared ? ' CLR' : '';
    const metaText = new BitmapText({
      text: `${rarityName} · Lv.${item.level}${cycleTag}${clearTag}`,
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: COL_DIM }
    });
    metaText.x = PADDING;
    metaText.y = y;
    this.detailArea.addChild(metaText);
    y += 12;

    // ATK with auto-compare (always show delta when equipped weapon exists)
    if (equipped && equipped.uid !== item.uid) {
      const deltaAtk = item.finalAtk - equipped.finalAtk;
      const deltaColor = deltaAtk > 0 ? COL_POSITIVE : deltaAtk < 0 ? COL_NEGATIVE : COL_TEXT;
      const deltaStr = deltaAtk !== 0 ? ` (${deltaAtk > 0 ? '+' : ''}${deltaAtk})` : '';
      const atkLine = new BitmapText({
        text: `ATK: ${item.finalAtk}${deltaStr} vs equipped`,
        style: { fontFamily: PIXEL_FONT, fontSize: 10, fill: deltaColor }
      });
      atkLine.x = PADDING;
      atkLine.y = y;
      this.detailArea.addChild(atkLine);
    } else {
      const atkLine = new BitmapText({
        text: `ATK: ${item.finalAtk}`,
        style: { fontFamily: PIXEL_FONT, fontSize: 10, fill: COL_TEXT }
      });
      atkLine.x = PADDING;
      atkLine.y = y;
      this.detailArea.addChild(atkLine);
    }
    y += 12;

    // Innocents + Strata
    const innocentCount = item.innocents?.length ?? 0;
    const maxSlots = { normal: 2, magic: 3, rare: 4, legendary: 6, ancient: 8 }[item.rarity] ?? 2;
    const strata = STRATA_BY_RARITY[item.rarity];
    const totalStrata = strata?.strata.length ?? 0;
    const clearedStrata = item.worldProgress?.deepestUnlocked ?? 0;
    const infoLine = new BitmapText({
      text: `Innocents: ${innocentCount}/${maxSlots} · Strata: ${clearedStrata}/${totalStrata}`,
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: COL_DIM }
    });
    infoLine.x = PADDING;
    infoLine.y = y;
    this.detailArea.addChild(infoLine);
    y += 14;

    // Action hints
    let hintText: string;
    if (this.mode === 'anvil') {
      hintText = this.anvilState === 'placed' ? '[C]DIVE  [ESC]Remove' : '[C]Place  [ESC]Back';
    } else {
      hintText = isEquipped ? '[ESC]Close' : '[C]Equip  [Z]Compare  [ESC]Close';
    }
    const hint = new BitmapText({
      text: hintText,
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: COL_DIM }
    });
    hint.x = PADDING;
    hint.y = y;
    this.detailArea.addChild(hint);
  }

  // ── Anvil 2-stage placement ───────────────────────────────────────────────────
  private placeOnAnvil(item: ItemInstance): void {
    this.anvilItem = item;
    this.anvilState = 'placed';
    this.anvilPulseTimer = 0;
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

  private drawAnvilArea(): void {
    const slot = new Container();
    const anvilSlotSize = 56;
    const hasItem = !!this.anvilItem;
    const rarityColor = hasItem ? (RARITY_COLOR[this.anvilItem!.rarity] ?? COL_TEXT_WHITE) : COL_BORDER;

    // Arrow
    const arrowX = PANEL_W - 8;
    const arrowY = Math.floor(PANEL_H / 2) - 10;
    const arrowColor = hasItem ? rarityColor : 0x444466;
    const arrow = new Graphics();
    arrow.rect(arrowX, arrowY + 6, ARROW_W - 10, 6).fill(arrowColor);
    arrow.poly([
      arrowX + ARROW_W - 10, arrowY,
      arrowX + ARROW_W, arrowY + 9,
      arrowX + ARROW_W - 10, arrowY + 18,
    ]);
    arrow.fill(arrowColor);
    slot.addChild(arrow);

    // Anvil slot
    const slotX = PANEL_W + ARROW_W - 4;
    const slotY = Math.floor((PANEL_H - anvilSlotSize) / 2) - 6;
    const bg = new Graphics();
    bg.rect(slotX, slotY, anvilSlotSize, anvilSlotSize).fill({ color: COL_EQUIP_BG, alpha: 0.5 });
    const borderColor = hasItem ? rarityColor : COL_BORDER;
    bg.rect(slotX, slotY, anvilSlotSize, anvilSlotSize).stroke({ color: borderColor, width: 2 });
    slot.addChild(bg);

    if (hasItem) {
      const img = new ItemImage(this.anvilItem!, anvilSlotSize - 8);
      img.container.x = slotX + 4;
      img.container.y = slotY + 4;
      slot.addChild(img.container);

      const label = new BitmapText({ text: 'DIVE', style: { fontFamily: PIXEL_FONT, fontSize: 10, fill: rarityColor } });
      label.x = slotX + Math.floor((anvilSlotSize - 28) / 2);
      label.y = slotY + anvilSlotSize + 4;
      slot.addChild(label);
    } else {
      const label = new BitmapText({ text: 'ANVIL', style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: COL_DIM } });
      label.x = slotX + Math.floor((anvilSlotSize - 30) / 2);
      label.y = slotY + anvilSlotSize + 4;
      slot.addChild(label);
    }

    this.panel.addChild(slot);
    this.anvilSlotContainer = slot;
  }

  /** @deprecated Use drawAnvilArea instead */
  private drawAnvilSlot(_item: ItemInstance): void { }

  private clearAnvilSlot(): void {
    if (this.anvilSlotContainer) {
      if (this.anvilSlotContainer.parent) this.anvilSlotContainer.parent.removeChild(this.anvilSlotContainer);
      this.anvilSlotContainer.destroy({ children: true });
      this.anvilSlotContainer = null;
    }
  }

  update(dt: number): void {
    if (!this.visible || this.anvilState !== 'placed' || !this.anvilSlotContainer) return;
    this.anvilPulseTimer += dt;
  }
}
