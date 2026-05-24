import { Container, Graphics, BitmapText } from 'pixi.js';
import { type ItemInstance, RARITY_COLOR, DEMO_BLOCK_REDIVE, getDisplayName, getIdentityCategory, getCurrentStage } from '@items/ItemInstance';
import { getStageFragment } from '@data/fragments';
import type { Inventory } from '@items/Inventory';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';
import { ItemImage } from './ItemImage';
import { PIXEL_FONT } from './fonts';
import { createUiText } from './factories';
import { t } from '@i18n';
import { RARITY_DISPLAY_NAME, STARTER_ONLY_IDS } from '@data/weapons';
import { STRATA_BY_RARITY } from '@data/StrataConfig';
import {
  create9SlicePanel, drawSelectionPulse,
  ROW_SELECTED_GLOW, ROW_SELECTED_GLOW_ALPHA, ROW_SELECTED_GLOW_INNER,
  MODAL_BG, MODAL_BORDER, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_POSITIVE, TEXT_NEGATIVE,
} from './ModalPanel';
import { GameAction, actionKey } from '@core/InputManager';
import { KeyPrompt } from './KeyPrompt';
import type { UISkin } from './UISkin';
import { sacredSave } from '@save/PlayerSave';

// ── Layout (DEC-045) ──────────────────────────────────────────────────────────
const PADDING_H = 8;
const PADDING_V = 8;
const COL_GAP = 6;

const CELL_W = 34; // 32px icon + 1px padding each side
const CELL_H = 34;
const CELL_GAP = 2;
const GRID_COLS = 4;
const GRID_ROWS = 6;

const GRID_W = GRID_COLS * CELL_W + (GRID_COLS - 1) * CELL_GAP; // 142
const INFO_W = 232;
const STATUS_W = 148;

const GRID_COL_X = PADDING_H;
const INFO_COL_X = PADDING_H + GRID_W + COL_GAP;    // 192
const STATUS_COL_X = INFO_COL_X + INFO_W + COL_GAP;  // 394

const TITLE_H = 12;
const TITLE_GAP = 2;
const TAB_H = 14;
const TAB_GAP = 2;
// y where grid / info / status content begins
const CONTENT_START_Y = PADDING_V + TITLE_H + TITLE_GAP + TAB_H + TAB_GAP; // 38

const PANEL_W = 550;
const PANEL_H = 254;

// ── Colors ────────────────────────────────────────────────────────────────────
const COL_PANEL_BG = MODAL_BG;
const COL_BORDER = MODAL_BORDER;
const COL_TEXT = TEXT_PRIMARY;
const COL_DIM = TEXT_SECONDARY;
const COL_POSITIVE = TEXT_POSITIVE;
const COL_NEGATIVE = TEXT_NEGATIVE;
const COL_DIVE = 0x00ced1;
const COL_CLEARED = 0x44ff44;
const COL_LOCKED = 0x555555;
const COL_EQUIPPED_BAR = 0xff8c00;
const COL_KEY = 0xffa41b; // brand key color

// ── Filter tabs ───────────────────────────────────────────────────────────────
type FilterTab = 'ALL' | 'WPN' | 'ARM' | 'ACC';
const FILTER_TABS: FilterTab[] = ['ALL', 'WPN', 'ARM', 'ACC'];

function itemMatchesFilter(item: ItemInstance, filter: FilterTab): boolean {
  if (filter === 'ALL' || filter === 'WPN') return true;
  return false; // ARM / ACC: future item types
}

// ── Public types ──────────────────────────────────────────────────────────────
export interface PlayerStats {
  hp: number;
  maxHp: number;
  atk: number;
  abilities: string[];
}

export type InventoryUIMode = 'inventory' | 'anvil';

export class InventoryUI {
  container: Container;
  visible = false;

  private inventory: Inventory;
  private selectedIndex = 0; // index within filteredItems()
  private scrollRowOffset = 0;
  private filter: FilterTab = 'ALL';

  private panel: Container;
  private panelBg: Graphics;
  private panelFrame: Container | null = null;
  private columnDividers: Graphics | null = null;

  private tabsArea: Container;
  private gridArea: Container;
  private infoArea: Container;
  private statusArea: Container;

  private mode: InventoryUIMode = 'inventory';
  private onSelect: ((item: ItemInstance) => void) | null = null;

  /** Open/close 시 호출 — scene 이 HUD/minimap 등을 토글하도록 위임. */
  onVisibilityChange?: (visible: boolean) => void;

  private skin: UISkin | null = null;
  private playerStats: PlayerStats | null = null;

  // Anvil 2-stage
  private anvilState: 'selecting' | 'placed' = 'selecting';
  private anvilItem: ItemInstance | null = null;
  private anvilPulseOverlay: Graphics | null = null;
  private anvilPulseRect: { w: number; h: number } | null = null;
  private anvilPulseTimer = 0;

  // Selection pulse
  private selectionPulseOverlay: Graphics | null = null;
  private selectionPulseRect: { w: number; h: number } | null = null;
  private selectionPulseTimer = 0;

  // ── Public API ───────────────────────────────────────────────────────────────
  setInventory(inventory: Inventory): void { this.inventory = inventory; }
  setSkin(skin: UISkin): void { this.skin = skin; }
  setPlayerStats(stats: PlayerStats): void { this.playerStats = stats; }

  constructor(inventory: Inventory, uiScale: number = 1) {
    this.inventory = inventory;
    this.container = new Container();
    this.container.scale.set(uiScale);
    this.container.visible = false;

    const overlay = new Graphics();
    overlay.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill({ color: 0x000000, alpha: 0.5 });
    this.container.addChild(overlay);

    this.panel = new Container();
    this.container.addChild(this.panel);

    this.panelBg = new Graphics();
    this.panel.addChild(this.panelBg);

    this.tabsArea = new Container();
    this.tabsArea.x = GRID_COL_X;
    this.tabsArea.y = PADDING_V + TITLE_H + TITLE_GAP;
    this.panel.addChild(this.tabsArea);

    this.gridArea = new Container();
    this.gridArea.x = GRID_COL_X;
    this.gridArea.y = CONTENT_START_Y;
    this.panel.addChild(this.gridArea);

    this.infoArea = new Container();
    this.infoArea.x = INFO_COL_X;
    this.infoArea.y = CONTENT_START_Y;
    this.panel.addChild(this.infoArea);

    this.statusArea = new Container();
    this.statusArea.x = STATUS_COL_X;
    this.statusArea.y = CONTENT_START_Y;
    this.panel.addChild(this.statusArea);
  }

  toggle(): void {
    if (this.visible) { this.close(); return; }
    this.open('inventory', null);
  }

  open(mode: InventoryUIMode, onSelect: ((item: ItemInstance) => void) | null): void {
    const wasVisible = this.visible;
    this.mode = mode;
    this.onSelect = onSelect;
    this.visible = true;
    this.container.visible = true;
    this.anvilState = 'selecting';
    this.anvilItem = null;
    this.scrollRowOffset = 0;
    this.filter = 'ALL';
    this.selectedIndex = this.filteredItems().length > 0 ? 0 : -1;
    this.refresh();
    if (!wasVisible) this.onVisibilityChange?.(true);
  }

  openForAnvil(onSelect: (item: ItemInstance) => void): void {
    this.open('anvil', onSelect);
  }

  close(): void {
    const wasVisible = this.visible;
    this.visible = false;
    this.container.visible = false;
    this.mode = 'inventory';
    this.onSelect = null;
    this.anvilState = 'selecting';
    this.anvilItem = null;
    if (wasVisible) this.onVisibilityChange?.(false);
  }

  confirmSelected(): void {
    if (this.mode === 'anvil') {
      if (this.anvilState === 'selecting') {
        const item = this.filteredItems()[this.selectedIndex];
        if (!item) return;
        if (STARTER_ONLY_IDS.has(item.def.id)) return;
        if (DEMO_BLOCK_REDIVE && item.worldProgress?.cleared === true) return;
        if (this.inventory.equipped?.uid === item.uid) {
          if (sacredSave.isFirstDiveDone()) return;
          // 2026-05-24: 무기 미장착 차단. fallback 무기 있을 때만 anvil 배치 허용.
          const fallback = this.inventory.items.find(i => i.uid !== item.uid);
          if (!fallback) return; // 다른 무기 없으면 anvil 배치 거부
          this.inventory.equip(fallback.uid, true);
        }
        this.placeOnAnvil(item);
      } else if (this.anvilState === 'placed') {
        this.confirmDive();
      }
      return;
    }
    const item = this.filteredItems()[this.selectedIndex];
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

  /** DEC-046: 현재 선택된 ItemInstance 반환 (Identity Archive 진입 시 사용). */
  getSelectedItem(): ItemInstance | undefined {
    return this.filteredItems()[this.selectedIndex];
  }

  cycleFilter(): void {
    if (this.anvilState === 'placed') return;
    const idx = FILTER_TABS.indexOf(this.filter);
    this.filter = FILTER_TABS[(idx + 1) % FILTER_TABS.length];
    this.scrollRowOffset = 0;
    this.selectedIndex = this.filteredItems().length > 0 ? 0 : -1;
    this.refresh();
  }

  navigate(dir: 'left' | 'right' | 'up' | 'down'): void {
    if (this.mode === 'anvil' && this.anvilState === 'placed') return;
    const count = this.filteredItems().length;
    if (count === 0) return;
    if (this.selectedIndex < 0) {
      this.selectedIndex = 0;
    } else {
      switch (dir) {
        case 'left':
          this.selectedIndex = Math.max(0, this.selectedIndex - 1);
          break;
        case 'right':
          this.selectedIndex = Math.min(count - 1, this.selectedIndex + 1);
          break;
        case 'up':
          if (this.selectedIndex >= GRID_COLS) this.selectedIndex -= GRID_COLS;
          break;
        case 'down':
          if (this.selectedIndex + GRID_COLS < count) this.selectedIndex += GRID_COLS;
          break;
      }
    }
    const row = Math.floor(this.selectedIndex / GRID_COLS);
    if (row < this.scrollRowOffset) this.scrollRowOffset = row;
    if (row >= this.scrollRowOffset + GRID_ROWS) this.scrollRowOffset = row - GRID_ROWS + 1;
    this.refresh();
  }

  equipSelected(): void {
    const item = this.filteredItems()[this.selectedIndex];
    if (item) { this.inventory.equip(item.uid); this.refresh(); }
  }

  // ── Main refresh ─────────────────────────────────────────────────────────────
  refresh(): void {
    this.panel.x = Math.floor((GAME_WIDTH - PANEL_W) / 2);
    this.panel.y = Math.floor((GAME_HEIGHT - PANEL_H) / 2);

    this.panelBg.clear();
    if (this.panelFrame) {
      if (this.panelFrame.parent) this.panelFrame.parent.removeChild(this.panelFrame);
      this.panelFrame.destroy({ children: true });
      this.panelFrame = null;
    }
    if (this.skin?.isLoaded) {
      const frame = create9SlicePanel(this.skin, PANEL_W, PANEL_H);
      if (frame) {
        this.panelFrame = frame;
        this.panel.addChildAt(frame, 0);
      } else {
        this.drawPanelBg();
      }
    } else {
      this.drawPanelBg();
    }

    this.drawTitle();
    this.drawColumnDividers();
    this.drawFilterTabs();
    this.drawGrid();
    this.drawInfo();
    this.drawRightColumn();
  }

  private drawPanelBg(): void {
    this.panelBg.rect(0, 0, PANEL_W, PANEL_H).fill({ color: COL_PANEL_BG, alpha: 0.95 });
    this.panelBg.rect(0, 0, PANEL_W, PANEL_H).stroke({ color: COL_BORDER, width: 1 });
  }

  private drawTitle(): void {
    // Remove previous title
    const old = (this.panel as any).__title;
    if (old?.parent) old.parent.removeChild(old);
    old?.destroy?.();

    const titleStr = this.mode === 'anvil' ? t('ui.inventory.title_anvil') : t('ui.inventory.title');
    const titleTxt = createUiText(titleStr, { fontSize: 9, fill: COL_DIM });
    titleTxt.x = PADDING_H;
    titleTxt.y = PADDING_V;
    this.panel.addChild(titleTxt);
    (this.panel as any).__title = titleTxt;
  }

  private drawColumnDividers(): void {
    if (this.columnDividers?.parent) {
      this.columnDividers.parent.removeChild(this.columnDividers);
    }
    this.columnDividers?.destroy();

    const g = new Graphics();
    const y0 = PADDING_V;
    const y1 = PANEL_H - PADDING_V;
    const x1 = INFO_COL_X - Math.floor(COL_GAP / 2);
    const x2 = STATUS_COL_X - Math.floor(COL_GAP / 2);
    g.moveTo(x1, y0).lineTo(x1, y1).stroke({ color: COL_BORDER, width: 1 });
    g.moveTo(x2, y0).lineTo(x2, y1).stroke({ color: COL_BORDER, width: 1 });
    this.panel.addChildAt(g, 1);
    this.columnDividers = g;
  }

  // ── Filter tabs ───────────────────────────────────────────────────────────────
  private drawFilterTabs(): void {
    for (const c of [...this.tabsArea.children]) {
      this.tabsArea.removeChild(c);
      c.destroy?.({ children: true });
    }

    const tabW = Math.floor((GRID_W - (FILTER_TABS.length - 1) * 2) / FILTER_TABS.length);
    FILTER_TABS.forEach((tab, i) => {
      const x = i * (tabW + 2);
      const isActive = tab === this.filter;

      const g = new Graphics();
      if (isActive) {
        g.rect(x, 0, tabW, TAB_H).fill({ color: COL_EQUIPPED_BAR, alpha: 0.18 });
        g.rect(x, 0, tabW, TAB_H).stroke({ color: COL_EQUIPPED_BAR, width: 1 });
      } else {
        g.rect(x, 0, tabW, TAB_H).fill({ color: 0x111111, alpha: 0.3 });
        g.rect(x, 0, tabW, TAB_H).stroke({ color: COL_BORDER, width: 1 });
      }
      this.tabsArea.addChild(g);

      const label = createUiText(tab, { fontSize: 8, fill: isActive ? COL_EQUIPPED_BAR : COL_DIM });
      label.x = x + Math.floor((tabW - label.width) / 2);
      label.y = Math.floor((TAB_H - (label.height ?? 8)) / 2) + 1;
      this.tabsArea.addChild(label);
    });
  }

  // ── Grid ─────────────────────────────────────────────────────────────────────
  private drawGrid(): void {
    for (const c of [...this.gridArea.children]) {
      this.gridArea.removeChild(c);
      c.destroy?.({ children: true });
    }
    this.selectionPulseOverlay = null;
    this.selectionPulseRect = null;

    const items = this.filteredItems();
    const startIdx = this.scrollRowOffset * GRID_COLS;
    const endIdx = Math.min(items.length, startIdx + GRID_ROWS * GRID_COLS);

    for (let i = startIdx; i < endIdx; i++) {
      const localIdx = i - startIdx;
      const col = localIdx % GRID_COLS;
      const row = Math.floor(localIdx / GRID_COLS);
      this.drawCell(items[i], col * (CELL_W + CELL_GAP), row * (CELL_H + CELL_GAP), i === this.selectedIndex);
    }

    // Empty slots
    const itemsVisible = endIdx - startIdx;
    for (let i = itemsVisible; i < GRID_ROWS * GRID_COLS; i++) {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const cx = col * (CELL_W + CELL_GAP);
      const cy = row * (CELL_H + CELL_GAP);
      const g = new Graphics();
      g.rect(cx, cy, CELL_W, CELL_H).fill({ color: 0x0a0a0a, alpha: 0.3 });
      g.rect(cx, cy, CELL_W, CELL_H).stroke({ color: 0x1e1e1e, width: 1 });
      this.gridArea.addChild(g);
    }

    // Scroll indicator
    const totalRows = Math.ceil(items.length / GRID_COLS);
    if (totalRows > GRID_ROWS) {
      const barH = GRID_ROWS * (CELL_H + CELL_GAP) - CELL_GAP;
      const thumbH = Math.max(10, barH * (GRID_ROWS / totalRows));
      const thumbY = (this.scrollRowOffset / (totalRows - GRID_ROWS)) * (barH - thumbH);
      const scrollG = new Graphics();
      scrollG.rect(GRID_W + 2, 0, 2, barH).fill({ color: COL_BORDER, alpha: 0.3 });
      scrollG.rect(GRID_W + 2, thumbY, 2, thumbH).fill({ color: COL_DIM, alpha: 0.6 });
      this.gridArea.addChild(scrollG);
    }

    // Selection pulse — added last so it renders on top of all cells
    if (this.selectedIndex >= startIdx && this.selectedIndex < endIdx) {
      const localIdx = this.selectedIndex - startIdx;
      const col = localIdx % GRID_COLS;
      const row = Math.floor(localIdx / GRID_COLS);
      const pulse = new Graphics();
      pulse.x = col * (CELL_W + CELL_GAP);
      pulse.y = row * (CELL_H + CELL_GAP);
      this.gridArea.addChild(pulse);
      this.selectionPulseOverlay = pulse;
      this.selectionPulseRect = { w: CELL_W, h: CELL_H };
      this.redrawSelectionPulse();
    }
  }

  private drawCell(item: ItemInstance, cx: number, cy: number, isSelected: boolean): void {
    const rarityColor = RARITY_COLOR[item.rarity] ?? 0xffffff;
    const isEquipped = this.inventory.equipped?.uid === item.uid;
    const isOnAnvil = this.anvilItem?.uid === item.uid;
    const isCleared = item.worldProgress?.cleared === true;
    const isStarterOnly = STARTER_ONLY_IDS.has(item.def.id);
    const isLocked = isStarterOnly || (DEMO_BLOCK_REDIVE && isCleared);

    // Cell background
    const bg = new Graphics();
    bg.rect(cx, cy, CELL_W, CELL_H).fill({ color: 0x0d0d10, alpha: isOnAnvil ? 0.2 : 1 });
    if (isSelected) {
      bg.rect(cx, cy, CELL_W, CELL_H).stroke({ color: COL_KEY, width: 2 });
    } else if (isEquipped) {
      bg.rect(cx, cy, CELL_W, CELL_H).stroke({ color: COL_EQUIPPED_BAR, width: 1 });
    } else {
      bg.rect(cx, cy, CELL_W, CELL_H).stroke({ color: rarityColor, width: 1, alpha: 0.55 });
    }
    this.gridArea.addChild(bg);

    // Item icon
    if (!isOnAnvil) {
      const iconSize = 32;
      const img = new ItemImage(item, iconSize);
      img.container.x = cx + Math.floor((CELL_W - iconSize) / 2);
      img.container.y = cy + Math.floor((CELL_H - iconSize) / 2);
      if (isLocked && this.mode === 'anvil') img.container.alpha = 0.4;
      this.gridArea.addChild(img.container);
    }

    // Top-left: [E] equipped badge
    if (isEquipped) {
      const b = new Graphics();
      b.rect(cx, cy, 8, 7).fill(COL_EQUIPPED_BAR);
      this.gridArea.addChild(b);
      const eTxt = new BitmapText({ text: 'E', style: { fontFamily: PIXEL_FONT, fontSize: 6, fill: 0x000000 } });
      eTxt.x = cx + 1; eTxt.y = cy;
      this.gridArea.addChild(eTxt);
    }

    // Bottom-right: CLR badge
    if (isCleared && !isLocked) {
      const b = new Graphics();
      b.rect(cx + CELL_W - 12, cy + CELL_H - 7, 12, 7).fill({ color: COL_CLEARED, alpha: 0.85 });
      this.gridArea.addChild(b);
      const clrTxt = new BitmapText({ text: 'CLR', style: { fontFamily: PIXEL_FONT, fontSize: 5, fill: 0x000000 } });
      clrTxt.x = cx + CELL_W - 11; clrTxt.y = cy + CELL_H - 7;
      this.gridArea.addChild(clrTxt);
    }

    // Lock icon — anvil mode only
    if (isLocked && this.mode === 'anvil') {
      const lock = new BitmapText({ text: '🔒', style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: COL_LOCKED } });
      lock.x = cx + Math.floor((CELL_W - 8) / 2);
      lock.y = cy + Math.floor((CELL_H - 8) / 2) + 2;
      this.gridArea.addChild(lock);
    }

  }

  private redrawSelectionPulse(): void {
    if (!this.selectionPulseOverlay || !this.selectionPulseRect) return;
    const s = this.selectionPulseTimer / 1000;
    const a = ROW_SELECTED_GLOW_ALPHA * (0.65 + 0.35 * Math.sin(s * Math.PI * 2 * 1.4));
    this.selectionPulseOverlay.clear();
    drawSelectionPulse(this.selectionPulseOverlay, this.selectionPulseRect.w, this.selectionPulseRect.h, a);
  }

  // ── Info column (middle) ─────────────────────────────────────────────────────
  private drawInfo(): void {
    for (const c of [...this.infoArea.children]) {
      this.infoArea.removeChild(c);
      c.destroy?.({ children: true });
    }
    this.anvilPulseOverlay = null;
    this.anvilPulseRect = null;

    if (this.mode === 'anvil') {
      this.drawAnvilSlot();
      return;
    }
    this.drawItemInfo(this.filteredItems()[this.selectedIndex]);
  }

  private drawItemInfo(item: ItemInstance | undefined): void {
    const W = INFO_W - 8;
    let y = 4;

    if (!item) {
      const empty = createUiText(t('ui.inventory.no_items_to_dive'), { fontSize: 9, fill: COL_DIM });
      empty.x = 4; empty.y = y;
      this.infoArea.addChild(empty);
      return;
    }

    const rarityColor = RARITY_COLOR[item.rarity] ?? 0xffffff;

    // === DEC-046 Identity Card 패러다임 ===

    // 1. 표시 이름 (Stage 진화 반영)
    const displayName = getDisplayName(item);
    const nameText = createUiText(displayName, {
      fontSize: 11, fill: rarityColor, wordWrap: true, wordWrapWidth: W,
    });
    nameText.x = 4; nameText.y = y;
    this.infoArea.addChild(nameText);
    y += 14;

    // 2. 레어리티 · 카테고리 · Recovery %
    const rarityName = RARITY_DISPLAY_NAME[item.rarity] ?? item.rarity;
    const category = getIdentityCategory(item);
    const categoryLabel = category === 'Unknown'
      ? t('ui.inventory.recovery_unknown')
      : t(`ui.category.${category.replace(/([A-Z])/g, '_$1').replace(/^_/, '').toLowerCase()}`);
    const recoveryPct = Math.floor(item.memoryRecovery);
    const meta = createUiText(
      t('ui.inventory.recovery_meta', { rarity: rarityName, category: categoryLabel, pct: recoveryPct }),
      { fontSize: 8, fill: COL_DIM },
    );
    meta.x = 4; meta.y = y;
    this.infoArea.addChild(meta);
    y += 12;

    // 3. Recovery 게이지 (시각 막대)
    const barW = W - 4;
    const barH = 4;
    const bar = new Graphics();
    bar.rect(4, y, barW, barH).fill({ color: 0x222230 });
    const fillW = Math.floor(barW * (item.memoryRecovery / 100));
    const stage = getCurrentStage(item);
    const stageColor = stage === 0 ? 0x666666 : stage === 4 ? rarityColor : 0xcccccc;
    if (fillW > 0) {
      bar.rect(4, y, fillW, barH).fill({ color: stageColor });
    }
    bar.rect(4, y, barW, barH).stroke({ color: COL_BORDER, width: 1 });
    this.infoArea.addChild(bar);
    y += 10;

    // 4. Re-Dive 카운터 (100% 도달 후만)
    if (item.memoryRecovery >= 100) {
      const reDiveTxt = createUiText(t('ui.inventory.redive_count', { count: item.reDiveCount }), { fontSize: 7, fill: COL_DIM });
      reDiveTxt.x = 4; reDiveTxt.y = y;
      this.infoArea.addChild(reDiveTxt);
      y += 10;
    }

    // Divider
    const div1 = new Graphics();
    div1.moveTo(4, y).lineTo(W, y).stroke({ color: COL_BORDER, width: 1 });
    this.infoArea.addChild(div1);
    y += 5;

    // 5. 해금된 Memory Fragment 목록 (최대 4줄)
    const totalFragmentsForRarity = { normal: 1, magic: 2, rare: 3, legendary: 4, ancient: 4 }[item.rarity] ?? 1;
    const stages = item.rarity === 'normal' ? [4]
      : item.rarity === 'magic' ? [2, 4]
      : item.rarity === 'rare' ? [1, 2, 4]
      : [1, 2, 3, 4];
    let fragmentsShown = 0;
    for (const fragStage of stages) {
      if (fragmentsShown >= 4) break;
      const f = getStageFragment(item.def.id, fragStage);
      const isUnlocked = item.unlockedFragments.includes(`${item.def.id}_stage_${fragStage}`);
      const text = isUnlocked && f
        ? `▸ "${(f.textKo || f.textEn).slice(0, 38)}${(f.textKo || f.textEn).length > 38 ? '…' : ''}"`
        : t('ui.inventory.fragment_placeholder');
      const color = isUnlocked ? 0xffffff : 0x555555;
      const fontSize = (fragStage === 4 && isUnlocked) ? 8 : 7;
      const txt = createUiText(text, { fontSize, fill: color, wordWrap: true, wordWrapWidth: W });
      txt.x = 4; txt.y = y;
      this.infoArea.addChild(txt);
      y += Math.max(10, Math.floor((txt.height ?? 10)));
      fragmentsShown++;
    }
    if (totalFragmentsForRarity === 0) {
      // 폴백 (불가능한 케이스)
      const noFrag = createUiText(t('ui.inventory.fragment_placeholder'), { fontSize: 7, fill: 0x555555 });
      noFrag.x = 4; noFrag.y = y;
      this.infoArea.addChild(noFrag);
      y += 10;
    }

    // Divider
    const div2 = new Graphics();
    div2.moveTo(4, y).lineTo(W, y).stroke({ color: COL_BORDER, width: 1 });
    this.infoArea.addChild(div2);
    y += 5;

    // 6. Hints — key glyphs
    const isEquipped = this.inventory.equipped?.uid === item.uid;
    const hintPairs = isEquipped
      ? [{ action: GameAction.MENU, label: 'Close' }]
      : [{ action: GameAction.ATTACK, label: 'Equip' }, { action: GameAction.MENU, label: 'Close' }];
    const hintRow = this.buildHintRow(hintPairs);
    hintRow.x = 4; hintRow.y = y;
    this.infoArea.addChild(hintRow);
  }

  // ── Anvil slot (anvil mode, middle column) ────────────────────────────────────
  // v2 (2026-05-24): 64px 아이콘 좌측 + 우측에 이름 / Stage 호칭 / Recovery% 메타.
  // 빈 상태/placed 상태 슬롯 위치 일관 (둘 다 좌측 정렬) — 위치 점프 방지.
  // ui-components.html #inventory "Anvil Mode v2" 카드 참조.
  private drawAnvilSlot(): void {
    const hasItem = !!this.anvilItem;
    const slotSize = 64;
    const slotX = 8;
    const slotY = 8;

    const bg = new Graphics();
    bg.rect(slotX, slotY, slotSize, slotSize).fill({ color: 0x0d0d10, alpha: 0.8 });
    const borderColor = hasItem ? (RARITY_COLOR[this.anvilItem!.rarity] ?? 0xffffff) : COL_BORDER;
    bg.rect(slotX, slotY, slotSize, slotSize).stroke({ color: borderColor, width: 2 });
    this.infoArea.addChild(bg);

    if (!hasItem) {
      const pulse = new Graphics();
      pulse.x = slotX; pulse.y = slotY;
      this.infoArea.addChild(pulse);
      this.anvilPulseOverlay = pulse;
      this.anvilPulseRect = { w: slotSize, h: slotSize };
      this.redrawAnvilPulse();

      const label = createUiText(t('ui.inventory.button_anvil'), { fontSize: 8, fill: COL_DIM });
      label.x = Math.floor((INFO_W - label.width) / 2);
      label.y = slotY + slotSize + 6;
      this.infoArea.addChild(label);
    } else {
      const item = this.anvilItem!;
      const rarityColor = RARITY_COLOR[item.rarity] ?? 0xffffff;

      // 64px 아이콘 (좌측)
      const imgSize = slotSize - 12;
      const img = new ItemImage(item, imgSize);
      img.container.x = slotX + 6;
      img.container.y = slotY + 6;
      this.infoArea.addChild(img.container);

      // 우측 메타 — 이름 + Stage 호칭 + Recovery%
      const metaX = slotX + slotSize + 8;
      const metaW = INFO_W - metaX - 4;
      let mY = slotY + 2;

      // 1. 아이템 이름 (Stage 진화 반영)
      const displayName = getDisplayName(item);
      const nameText = createUiText(displayName, {
        fontSize: 12, fill: rarityColor, wordWrap: true, wordWrapWidth: metaW,
      });
      nameText.x = metaX; nameText.y = mY;
      this.infoArea.addChild(nameText);
      mY += Math.max(16, Math.floor((nameText.height ?? 14)) + 2);

      // 2. Identity Stage 호칭
      const category = getIdentityCategory(item);
      const categoryLabel = category === 'Unknown'
        ? t('ui.inventory.recovery_unknown')
        : t(`ui.category.${category.replace(/([A-Z])/g, '_$1').replace(/^_/, '').toLowerCase()}`);
      const titleText = createUiText(categoryLabel, { fontSize: 9, fill: COL_TEXT });
      titleText.x = metaX; titleText.y = mY;
      this.infoArea.addChild(titleText);
      mY += 14;

      // 3. Recovery %
      const recoveryPct = Math.floor(item.memoryRecovery);
      const recovText = createUiText(`Recovery ${recoveryPct}%`, { fontSize: 9, fill: COL_DIM });
      recovText.x = metaX; recovText.y = mY;
      this.infoArea.addChild(recovText);

      // 하단 DIVE 라벨 (전체 폭 중앙)
      const divLabel = createUiText(t('ui.inventory.button_dive'), { fontSize: 10, fill: rarityColor });
      divLabel.x = Math.floor((INFO_W - divLabel.width) / 2);
      divLabel.y = slotY + slotSize + 4;
      this.infoArea.addChild(divLabel);
    }

    const hintPairs = hasItem
      ? [{ action: GameAction.ATTACK, label: 'Dive' }, { action: GameAction.MENU, label: 'Cancel' }]
      : [{ action: GameAction.ATTACK, label: 'Place' }, { action: GameAction.MENU, label: 'Back' }];
    const hintRow = this.buildHintRow(hintPairs);
    hintRow.x = 4;
    hintRow.y = slotY + slotSize + 22;
    this.infoArea.addChild(hintRow);
  }

  private redrawAnvilPulse(): void {
    if (!this.anvilPulseOverlay || !this.anvilPulseRect) return;
    const s = this.anvilPulseTimer / 1000;
    const a = ROW_SELECTED_GLOW_ALPHA * (0.55 + 0.45 * Math.sin(s * Math.PI * 2 * 1.2));
    this.anvilPulseOverlay.clear();
    this.anvilPulseOverlay
      .rect(0, 0, this.anvilPulseRect.w, this.anvilPulseRect.h)
      .stroke({ color: ROW_SELECTED_GLOW, width: 2, alpha: a });
    this.anvilPulseOverlay
      .rect(1, 1, this.anvilPulseRect.w - 2, this.anvilPulseRect.h - 2)
      .stroke({ color: ROW_SELECTED_GLOW_INNER, width: 1, alpha: Math.min(1, a * 0.85) });
  }

  // ── Right column ─────────────────────────────────────────────────────────────
  private drawRightColumn(): void {
    for (const c of [...this.statusArea.children]) {
      this.statusArea.removeChild(c);
      c.destroy?.({ children: true });
    }
    if (this.mode === 'anvil') {
      this.drawStratumMinimap();
    } else {
      this.drawPlayerStatus();
    }
  }

  private drawPlayerStatus(): void {
    let y = 0;
    const W = STATUS_W - 6;
    const stats = this.playerStats;
    const selectedItem = this.filteredItems()[this.selectedIndex];
    const equippedItem = this.inventory.equipped;

    // Header
    const header = createUiText(t('ui.inventory.status_header'), { fontSize: 8, fill: COL_DIM });
    header.x = 2; header.y = y;
    this.statusArea.addChild(header);
    y += 14;

    // HP
    const hpStr = stats ? `${stats.hp} / ${stats.maxHp}` : '—';
    const hpL = createUiText('HP', { fontSize: 8, fill: COL_DIM });
    const hpV = createUiText(hpStr, { fontSize: 8, fill: 0xee4444 });
    hpL.x = 2; hpL.y = y;
    hpV.x = W - hpV.width; hpV.y = y;
    this.statusArea.addChild(hpL);
    this.statusArea.addChild(hpV);
    y += 12;

    // ATK
    const equippedAtk = equippedItem?.finalAtk ?? stats?.atk ?? 0;
    const atkL = createUiText(t('ui.inventory.atk_label'), { fontSize: 8, fill: COL_DIM });
    const atkV = createUiText(`${equippedAtk}`, { fontSize: 8, fill: COL_KEY });
    atkL.x = 2; atkL.y = y;
    atkV.x = W - atkV.width; atkV.y = y;
    this.statusArea.addChild(atkL);
    this.statusArea.addChild(atkV);
    y += 10;

    // ATK delta vs selected
    if (selectedItem && selectedItem.uid !== equippedItem?.uid) {
      const delta = selectedItem.finalAtk - equippedAtk;
      if (delta !== 0) {
        const sign = delta > 0 ? '+' : '';
        const deltaColor = delta > 0 ? COL_POSITIVE : COL_NEGATIVE;
        const deltaTxt = createUiText(`${sign}${delta}`, { fontSize: 7, fill: deltaColor });
        deltaTxt.x = W - deltaTxt.width; deltaTxt.y = y;
        this.statusArea.addChild(deltaTxt);
      }
    }
    y += 10;

    // Divider
    const div = new Graphics();
    div.moveTo(2, y).lineTo(W, y).stroke({ color: COL_BORDER, width: 1 });
    this.statusArea.addChild(div);
    y += 6;

    // Relics
    const relicHeader = createUiText(t('ui.inventory.relics_header'), { fontSize: 8, fill: COL_DIM });
    relicHeader.x = 2; relicHeader.y = y;
    this.statusArea.addChild(relicHeader);
    y += 12;

    const RELIC_DEFS: { key: string; icon: string; label: string }[] = [
      { key: 'dash',           icon: '>>', label: 'DASH' },
      { key: 'wallJump',       icon: '||', label: 'WALL' },
      { key: 'doubleJump',     icon: '^^', label: '2JMP' },
      { key: 'waterBreathing', icon: '~~', label: 'AQUA' },
      { key: 'surge',          icon: '##', label: 'SURG' },
    ];
    const unlocked = stats?.abilities ?? [];
    for (const relic of RELIC_DEFS) {
      const isUnlocked = unlocked.includes(relic.key);
      const color = isUnlocked ? COL_KEY : COL_LOCKED;
      const icon = new BitmapText({ text: relic.icon, style: { fontFamily: PIXEL_FONT, fontSize: 7, fill: color } });
      icon.x = 2; icon.y = y;
      const lbl = createUiText(relic.label, { fontSize: 7, fill: color });
      lbl.x = 16; lbl.y = y + 1;
      this.statusArea.addChild(icon);
      this.statusArea.addChild(lbl);
      y += 11;
    }
  }

  private drawStratumMinimap(): void {
    let y = 0;
    const W = STATUS_W - 6;

    const header = createUiText(t('ui.inventory.stratum_header'), { fontSize: 8, fill: COL_DIM });
    header.x = 2; header.y = y;
    this.statusArea.addChild(header);
    y += 14;

    const mapH = PANEL_H - CONTENT_START_Y - 20;
    const mapG = new Graphics();
    mapG.rect(2, y, W, mapH).fill({ color: 0x0a0a12, alpha: 0.8 });
    mapG.rect(2, y, W, mapH).stroke({ color: COL_BORDER, width: 1 });
    this.statusArea.addChild(mapG);

    const ph = createUiText('—', { fontSize: 8, fill: COL_LOCKED });
    ph.x = 2 + Math.floor((W - ph.width) / 2);
    ph.y = y + Math.floor(mapH / 2) - 4;
    this.statusArea.addChild(ph);
  }

  // ── Anvil internal ────────────────────────────────────────────────────────────
  private filteredItems(): ItemInstance[] {
    return this.inventory.items.filter(item => itemMatchesFilter(item, this.filter));
  }

  private placeOnAnvil(item: ItemInstance): void {
    this.anvilItem = item;
    this.anvilState = 'placed';
    this.anvilPulseTimer = 0;
    this.refresh();
  }

  private removeFromAnvil(): void {
    if (!this.anvilItem) return;
    const idx = this.filteredItems().indexOf(this.anvilItem);
    this.anvilItem = null;
    this.anvilState = 'selecting';
    if (idx >= 0) this.selectedIndex = idx;
    this.refresh();
  }

  private confirmDive(): void {
    if (!this.anvilItem) return;
    const item = this.anvilItem;
    this.anvilItem = null;
    this.anvilState = 'selecting';
    this.onSelect?.(item);
  }

  // ── Update loop ───────────────────────────────────────────────────────────────
  private buildHintRow(pairs: Array<{ action: GameAction; label: string }>, iconSize = 10): Container {
    const row = new Container();
    let x = 0;
    for (const { action, label } of pairs) {
      const icon = KeyPrompt.createKeyIcon(actionKey(action), iconSize);
      icon.x = x;
      row.addChild(icon);
      x += iconSize + 3;
      const txt = createUiText(label, { fontSize: 7, fill: COL_DIM });
      txt.x = x;
      txt.y = Math.floor((iconSize - (txt.height ?? 7)) / 2);
      row.addChild(txt);
      x += (txt.width ?? 20) + 8;
    }
    return row;
  }

  update(dt: number): void {
    if (!this.visible) return;
    if (this.selectionPulseOverlay) {
      this.selectionPulseTimer += dt;
      this.redrawSelectionPulse();
    }
    if (this.mode === 'anvil') {
      this.anvilPulseTimer += dt;
      this.redrawAnvilPulse();
    }
  }
}
