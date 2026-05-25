import { Container, Graphics, BitmapText } from 'pixi.js';
import { type ItemInstance, RARITY_COLOR, DEMO_BLOCK_REDIVE, getDisplayName, getCurrentStage, getIdentityCategory } from '@items/ItemInstance';
import { getStageFragment } from '@data/fragments';
import type { Inventory } from '@items/Inventory';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';
import { ItemImage } from './ItemImage';
import { PIXEL_FONT } from './fonts';
import { createUiText } from './factories';
import { t } from '@i18n';
import { STARTER_ONLY_IDS } from '@data/weapons';
import { STRATA_BY_RARITY } from '@data/StrataConfig';
import { generateRoomGraph, type RoomGraphData } from '@level/RoomGraph';
import { archetypeFor } from '@level/RoomGraphArchetypes';
import { generateUnifiedGridFromGraph } from '@level/RoomGraphAdapter';
import type { UnifiedGridData } from '@level/RoomGrid';
import { pickTemplate, TEMPLATE_W, TEMPLATE_H, type ExitDir } from '@level/ItemWorldTemplates';
import { PRNG } from '@utils/PRNG';
import { getItemWorldTemplatesIfReady, prepareItemWorldTemplates } from '@level/ItemWorldTemplatePool';
import type { LdtkLevel } from '@level/LdtkLoader';
import {
  create9SlicePanel, drawSelectionPulse,
  ROW_SELECTED_GLOW, ROW_SELECTED_GLOW_ALPHA, ROW_SELECTED_GLOW_INNER,
  MODAL_BG, MODAL_BORDER, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_POSITIVE, TEXT_NEGATIVE,
} from './ModalPanel';
import { GameAction, actionKey } from '@core/InputManager';
import { KeyPrompt } from './KeyPrompt';
import type { UISkin } from './UISkin';
import { sacredSave } from '@save/PlayerSave';
import {
  FILTER_TABS,
  itemMatchesFilter,
  moveGridSelection,
  nextFilterTab,
  type FilterTab,
  type GridDirection,
} from './inventory/InventorySelection';
import {
  getFragmentStagesForRarity,
  getInventoryRecoveryMeta,
  getTotalFragmentsForRarity,
} from './inventory/InventoryItemInfo';
import { centeredPanelPosition, scrollThumbMetrics } from './inventory/InventoryLayout';

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
// spec.png 재측정 (2109x1183 / native 640x360):
//   INVENTORY 152, ANVIL 198 (가장 넓음), STRATUM 150
//   합: 8 + 142 + 6 + 200 + 6 + 150 + 8 = 520 (PANEL_W).
const INFO_W = 200;
const STATUS_W = 150;

const GRID_COL_X = PADDING_H;
const INFO_COL_X = PADDING_H + GRID_W + COL_GAP;    // 192
const STATUS_COL_X = INFO_COL_X + INFO_W + COL_GAP;  // 394

const TITLE_H = 12;
const TITLE_GAP = 2;
const TAB_H = 14;
const TAB_GAP = 2;
// y where grid / info / status content begins
const CONTENT_START_Y = PADDING_V + TITLE_H + TITLE_GAP + TAB_H + TAB_GAP; // 38

const PANEL_W = 520; // spec.png native 519 (모달 외곽 측정)
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
  // Dive prompt pulse — placed 상태에서 Dive 키 + 라벨 alpha sin 변동.
  private divePromptIcon: Container | null = null;
  private divePromptLabel: Container | null = null;

  // Selection pulse
  private selectionPulseOverlay: Graphics | null = null;
  private selectionPulseRect: { w: number; h: number } | null = null;
  private selectionPulseTimer = 0;

  // 심연 노이즈 글리치 (지지직 효과) — 2026-05-25.
  //   layers: drawStratumMinimap 가 카드별 noise Graphics 등록.
  //   tick 이 증가하면 각 layer 의 seed 가 변경되어 noise 재롤.
  private abyssNoiseLayers: Array<{
    graphics: Graphics;
    cardY: number; cardH: number; cardW: number;
    top: number; bot: number;
    baseSeed: number;
  }> = [];
  private abyssNoiseTimer = 0;
  private abyssNoiseTick = 0;

  // ITEM MAP — generated room graphs, keyed by `${item.uid}:${stratumIndex}`.
  // Item 별로 시드 결정적이라 한 번 계산 후 캐시.
  private roomGraphCache = new Map<string, RoomGraphData | null>();
  // Unified grid (실제 dive 좌표 col/absRow) 캐시. 동일 키.
  private unifiedGridCache = new Map<string, UnifiedGridData | null>();

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
    // Anvil 모드 진입 시 LDtk template pool 비동기 preload. 로드 완료 후
    // 다음 refresh() 에서 LDtk 다운샘플 사용 — 그 전엔 코드 RoomTemplate fallback.
    if (mode === 'anvil') {
      void prepareItemWorldTemplates().then(() => {
        if (this.visible && this.mode === 'anvil') this.refresh();
      });
    }
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
    this.filter = nextFilterTab(this.filter);
    this.scrollRowOffset = 0;
    this.selectedIndex = this.filteredItems().length > 0 ? 0 : -1;
    this.refresh();
  }

  navigate(dir: GridDirection): void {
    if (this.mode === 'anvil' && this.anvilState === 'placed') return;
    const count = this.filteredItems().length;
    if (count === 0) return;
    const next = moveGridSelection(
      { selectedIndex: this.selectedIndex, scrollRowOffset: this.scrollRowOffset },
      dir,
      count,
      GRID_COLS,
      GRID_ROWS,
    );
    this.selectedIndex = next.selectedIndex;
    this.scrollRowOffset = next.scrollRowOffset;
    this.refresh();
  }

  equipSelected(): void {
    const item = this.filteredItems()[this.selectedIndex];
    if (item) { this.inventory.equip(item.uid); this.refresh(); }
  }

  // ── Main refresh ─────────────────────────────────────────────────────────────
  refresh(): void {
    const panelPos = centeredPanelPosition(GAME_WIDTH, GAME_HEIGHT, PANEL_W, PANEL_H);
    this.panel.x = panelPos.x;
    this.panel.y = panelPos.y;

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
    // Remove previous title(s)
    const old = (this.panel as any).__title;
    if (old) {
      const arr = Array.isArray(old) ? old : [old];
      for (const t of arr) { if (t?.parent) t.parent.removeChild(t); t?.destroy?.(); }
    }

    if (this.mode === 'anvil') {
      // 3-column headers (spec.png): INVENTORY · ANVIL · STRATUM aligned to each column x.
      const headers: { key: string; x: number }[] = [
        { key: 'ui.inventory.title_anvil', x: GRID_COL_X },
        { key: 'ui.inventory.button_anvil', x: INFO_COL_X },
        { key: 'ui.inventory.stratum_header', x: STATUS_COL_X },
      ];
      const created: any[] = [];
      for (const h of headers) {
        const txt = createUiText(t(h.key), { fontSize: 9, fill: COL_DIM });
        txt.x = h.x;
        txt.y = PADDING_V;
        this.panel.addChild(txt);
        created.push(txt);
      }
      (this.panel as any).__title = created;
      return;
    }

    const titleTxt = createUiText(t('ui.inventory.title'), { fontSize: 9, fill: COL_DIM });
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
    const thumb = scrollThumbMetrics(items.length, GRID_COLS, GRID_ROWS, CELL_H, CELL_GAP, this.scrollRowOffset);
    if (thumb) {
      const scrollG = new Graphics();
      scrollG.rect(GRID_W + 2, 0, 2, thumb.barH).fill({ color: COL_BORDER, alpha: 0.3 });
      scrollG.rect(GRID_W + 2, thumb.thumbY, 2, thumb.thumbH).fill({ color: COL_DIM, alpha: 0.6 });
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
    const meta = createUiText(
      getInventoryRecoveryMeta(item),
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
    const totalFragmentsForRarity = getTotalFragmentsForRarity(item);
    const stages = getFragmentStagesForRarity(item);
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
      ? [{ action: GameAction.MENU, label: t('ui.inventory.action_close') }]
      : [{ action: GameAction.ATTACK, label: t('ui.inventory.action_equip') }, { action: GameAction.MENU, label: t('ui.inventory.action_close') }];
    const hintRow = this.buildHintRow(hintPairs);
    hintRow.x = 4; hintRow.y = y;
    this.infoArea.addChild(hintRow);
  }

  // ── Anvil slot (anvil mode, middle column) ────────────────────────────────────
  // v3 (2026-05-24): spec.png 픽셀 단위 정렬. slot 48px (구 64), 좌측 padding 4 (구 8).
  // 빈 상태/placed 상태 슬롯 위치 일관 (둘 다 좌측 정렬) — 위치 점프 방지.
  // 선택 변경 시 active item 으로 메타 + RadialMap 자동 갱신 (selecting 단계에도 preview).
  // ui-components.html #inventory "Anvil Mode v3" 카드 참조.
  private drawAnvilSlot(): void {
    const hasItem = !!this.anvilItem;
    // anvil 에 placed 된 아이템 우선, 없으면 그리드 선택 아이템 (preview).
    const activeItem = this.anvilItem ?? this.filteredItems()[this.selectedIndex] ?? null;
    const slotSize = 48; // spec.png native 42 ≈ 48 (cell 비례 유지)
    const slotX = 4;
    const slotY = 4;

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

      // 선택 아이템 preview 메타 (selecting 단계에도 우측에 표시).
      if (activeItem) {
        const rarityColor = RARITY_COLOR[activeItem.rarity] ?? 0xffffff;
        const metaX = slotX + slotSize + 8;
        const metaW = INFO_W - metaX - 4;
        let mY = slotY + 2;
        const displayName = getDisplayName(activeItem);
        const nameText = createUiText(displayName, {
          fontSize: 9, fill: rarityColor, wordWrap: true, wordWrapWidth: metaW, breakWords: true,
        });
        nameText.x = metaX; nameText.y = mY;
        this.infoArea.addChild(nameText);
        mY += Math.max(16, Math.floor((nameText.height ?? 14)) + 2);

        const category = getIdentityCategory(activeItem);
        const categoryLabel = category === 'Unknown'
          ? t('ui.inventory.recovery_unknown')
          : t(`ui.category.${category.replace(/([A-Z])/g, '_$1').replace(/^_/, '').toLowerCase()}`);
        const titleText = createUiText(categoryLabel, { fontSize: 9, fill: COL_TEXT });
        titleText.x = metaX; titleText.y = mY;
        this.infoArea.addChild(titleText);
        mY += 14;

        const recoveryPct = Math.floor(activeItem.memoryRecovery);
        const recovText = createUiText(t('ui.inventory.recovery_line', { pct: recoveryPct }), { fontSize: 9, fill: COL_DIM });
        recovText.x = metaX; recovText.y = mY;
        this.infoArea.addChild(recovText);
      }
      // (ANVIL column header is now drawn by drawTitle in anvil mode.)
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
      const recovText = createUiText(t('ui.inventory.recovery_line', { pct: recoveryPct }), { fontSize: 9, fill: COL_DIM });
      recovText.x = metaX; recovText.y = mY;
      this.infoArea.addChild(recovText);
      // (중앙 "다이브/DIVE" 라벨 제거 — 사용자 결정 2026-05-24. RadialMap 시각 노이즈 방지.)
    }

    // spec.png 정렬: prompts 는 ANVIL 컬럼 *바닥* 에 위치.
    // 사용자 결정 2026-05-24: 버튼 1.5배 (iconSize 15, fontSize 10) + Dive 노란 펄스.
    const hintPairs = hasItem
      ? [
          { action: GameAction.ATTACK, label: t('ui.inventory.action_dive'), labelColor: COL_KEY },
          { action: GameAction.MENU,   label: t('ui.inventory.action_cancel') },
        ]
      : [
          { action: GameAction.ATTACK, label: t('ui.inventory.action_place') },
          { action: GameAction.MENU,   label: t('ui.inventory.action_back') },
        ];
    const hintRow = this.buildHintRow(hintPairs, 15, 10);
    hintRow.x = 4;
    hintRow.y = PANEL_H - CONTENT_START_Y - PADDING_V - 16; // 1.5배라 y 보정
    this.infoArea.addChild(hintRow);
    // Dive 펄스 — placed 상태에서 첫 두 자식 (icon + label) alpha sin 변동.
    if (hasItem) {
      this.divePromptIcon = hintRow.children[0] as Container;
      this.divePromptLabel = hintRow.children[1] as Container;
    } else {
      this.divePromptIcon = null;
      this.divePromptLabel = null;
    }

    // RadialMap (Shift+2 의 단계형 다이브 뷰) 임베드 — active item 있으면 항상.
    // selecting 단계의 preview 도 포함 (사용자 결정 2026-05-24: 선택 변경 시 갱신).
    if (activeItem) {
      this.drawAnvilRadialMap(activeItem, slotY + slotSize + 12);
    }
  }

  /**
   * 컴팩트 RadialMap — ui-components.html #radial-map 사양의 INFO 영역 축약판.
   * 좌(stats 5종) + 우(단계형 graph). HERE 커서로 진행 stratum 강조.
   */
  private drawAnvilRadialMap(item: ItemInstance, baseY: number): void {
    const cfg = STRATA_BY_RARITY[item.rarity];
    const totalStrata = cfg.strata.length;
    const reached = item.worldProgress?.deepestUnlocked ?? 0;
    const nextStratum = Math.min(reached + 1, totalStrata); // 1-based

    // 영역: 좌 stats 박스 (slot 과 좌측 정렬) + 우 graph (나머지).
    // 사용자 결정 2026-05-24: 박스 폭 컴팩트, 위 ANVIL slot (x=4) 과 좌측 정렬.
    const statsX0 = 4;
    const statsW = 76; // MEM SHARD + 0/8 겹침 방지 (2026-05-24)
    const graphX = statsX0 + statsW + 6;
    const graphW = INFO_W - graphX - 4;
    const rowH = 14;

    // === Left: stats panel (★ 핵심 2 + ◦ 보조 2) ===
    // 2026-05-24 사용자 결정:
    //   YOUR ATK   = 현재 내(플레이어) 공격력
    //   MAX ATK    = 이 무기의 최대 공격력 추정치 (Recovery 100% + 현재 reDive 보너스)
    //   MEM SHARD  = 회상된 메모리 단편 수 / 최대 슬롯
    //   DIVES      = 재진입 횟수 (보조)
    const lines: Array<{ label: string; value: string; key: boolean; alert?: boolean }> = [];
    // YOUR ATK = 현재 장착 무기 finalAtk (setPlayerStats 미주입 시에도 동작).
    const playerAtk = this.inventory.getWeaponAtk() || (this.playerStats?.atk ?? 0);
    lines.push({ label: t('ui.inventory.your_atk'), value: String(playerAtk || '—'), key: false });

    // MAX ATK — Recovery 100% 가정 + 현재 reDive 보너스 (recalcItemAtk 공식 미러)
    const reDiveBonus = 1 + (item.reDiveCount ?? 0) * 0.05;
    const maxAtk = Math.ceil((item.def.baseAtk ?? 0) * 1.5 * reDiveBonus);
    lines.push({ label: t('ui.inventory.max_atk'), value: String(maxAtk || '—'), key: true, alert: playerAtk > 0 && playerAtk < maxAtk });

    // MEMORY SHARD — 현재 / 최대 (rarity 별 slot 수)
    const maxShards = ({ normal: 2, magic: 3, rare: 4, legendary: 6, ancient: 8 } as const)[item.rarity] ?? 2;
    const curShards = item.innocents?.length ?? 0;
    lines.push({ label: t('ui.inventory.mem_shard'), value: `${curShards}/${maxShards}`, key: true });

    lines.push({ label: t('ui.inventory.dives'), value: String(item.reDiveCount ?? 0), key: false });

    // 4-stat row: 라벨 좌측 정렬 + 값 우측 정렬, baseline 동일, 행간 16.
    // label fontSize 8 / value fontSize 10 — 사용자 결정 2026-05-24 (겹침 방지).
    const statRowH = 16;
    // 4-stat 영역 dim 반투명 배경 — slot 과 좌측 정렬, stratum graph 와 시각 분리.
    const statsBgG = new Graphics();
    const bgX = statsX0;
    const bgY = baseY - 3;
    const bgW = statsW;
    const bgH = lines.length * statRowH + 5;
    statsBgG.roundRect(bgX, bgY, bgW, bgH, 3)
      .fill({ color: 0x05050a, alpha: 0.55 });
    statsBgG.roundRect(bgX, bgY, bgW, bgH, 3)
      .stroke({ color: 0x2a2a3a, width: 1, alpha: 0.5 });
    this.infoArea.addChild(statsBgG);
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      const ly = baseY + i * statRowH;
      const labelColor = ln.key ? 0xffd470 : 0x888888;
      const labelText = createUiText(ln.label, { fontSize: 8, fill: labelColor });
      labelText.x = statsX0 + 4;
      labelText.y = ly + 2; // value baseline 과 정렬 (10px - 8px = 2px 보정)
      this.infoArea.addChild(labelText);
      const valColor = ln.alert ? 0xff6060 : (ln.key ? COL_KEY : 0xcccccc);
      const valText = createUiText(ln.value, { fontSize: 10, fill: valColor });
      valText.x = statsX0 + statsW - 4 - valText.width;
      valText.y = ly;
      this.infoArea.addChild(valText);
    }

    // === Right: spec image 패턴 + 큰 사이즈 (이전 디자인 크기). ===
    //   - 5 row 모두 표시 (S1-S5), graphRowH 22 (이전 디자인 사이즈)
    //   - 각 row: [S라벨] [hub ⋄] [좌N 진행 ◆] [보스/HERE ◈] [우N 미진행 ◇]
    //   - 보스 = 진짜 중앙 cxMid 고정 (사용자 결정 2026-05-25)
    //   - 좌우 노드 수는 stratum.nodeCount 에 비례 (맵 크기 = 노드 수)
    //   - 중앙 수직 dashed = DIVE path (S1→S5 전체)
    const radialRowH = 22;
    const labelW = 14;
    const labelEndX = graphX + labelW + 2;     // S 라벨 우측 끝 (path 시작점)
    const dotsRight = graphX + graphW - 4;
    const cxMid = Math.floor((labelEndX + dotsRight) / 2);  // 진짜 중앙 = 보스 라인
    // 사용자 결정 2026-05-24: stratum layout 8px 위로 (YOUR ATK 라인과 정렬).
    const cy0 = baseY + Math.floor(radialRowH * 0.5) - 8;

    // 사용자 결정 2026-05-25 v2: 5등급 모두 시각적으로 명확히 차별화.
    //   실제 nodeCount (7~20) 는 차이가 미미해 sqrt 압축 후 다 cap 에 걸려 동일했음.
    //   레어리티 → visualSide 직매핑으로 단순화. 행은 등급 내 stratum 모두 동일 길이.
    //     Normal=1 / Magic=2 / Rare=3 / Legendary=4 / Ancient=5
    //   총 노드 = hub + visualSide + boss → 3/4/5/6/7 노드
    const RARITY_VISUAL_SIDE: Record<string, number> = {
      normal: 1, magic: 2, rare: 3, legendary: 4, ancient: 5,
    };
    const visualSide = RARITY_VISUAL_SIDE[item.rarity] ?? 1;
    const sideFor = (L: number): { leftN: number; rightN: number } => {
      if (L > totalStrata) return { leftN: 0, rightN: 0 };
      return { leftN: Math.ceil(visualSide / 2), rightN: Math.floor(visualSide / 2) };
    };
    // spacing 동적: 가장 긴 행이 좌·우 가용 공간 안에 들어오도록.
    let maxLeft = 1;   // 최소 hub 1칸
    let maxRight = 1;  // 우측 outline 최소 여백
    for (let L = 1; L <= totalStrata; L++) {
      const { leftN, rightN } = sideFor(L);
      maxLeft = Math.max(maxLeft, leftN + 1);  // +1 = hub
      maxRight = Math.max(maxRight, rightN);
    }
    const leftSpace = cxMid - labelEndX;
    const rightSpace = dotsRight - cxMid;
    const spacing = Math.max(9, Math.min(14, Math.min(leftSpace / maxLeft, rightSpace / Math.max(1, maxRight))));

    // 1) 중앙 수직 DIVE 점선 — 행 사이 빈 공간만 그림 (마름모 영역 skip).
    //    사용자 결정 2026-05-24: 마름모 안쪽으로 점선 투과 금지.
    {
      const diveG = new Graphics();
      const drawDashed = (ya: number, yb: number) => {
        let yy = ya;
        while (yy < yb) {
          const yEnd = Math.min(yy + 3, yb);
          diveG.moveTo(cxMid, yy).lineTo(cxMid, yEnd)
            .stroke({ color: COL_KEY, width: 1.5, alpha: 0.8 });
          yy += 6;
        }
      };
      // 각 row 의 중심 마름모 size (lock=3.5, 보스=6, final=6.5)
      const szAt = (L: number): number => {
        if (L > totalStrata) return 3.5 + 1;
        const isFinal = L === totalStrata;
        return (isFinal ? 6.5 : 6) + 1;
      };
      // S1 위쪽 약간
      const ry1 = cy0;
      drawDashed(ry1 - szAt(1) - 6, ry1 - szAt(1));
      // 행 사이 (L → L+1)
      for (let L = 1; L < 5; L++) {
        const ryTop = cy0 + (L - 1) * radialRowH;
        const ryBot = cy0 + L * radialRowH;
        drawDashed(ryTop + szAt(L), ryBot - szAt(L + 1));
      }
      // S5 아래쪽 약간
      const ry5 = cy0 + 4 * radialRowH;
      drawDashed(ry5 + szAt(5), ry5 + szAt(5) + 6);
      this.infoArea.addChild(diveG);
    }

    // 2) 5 stratum rows
    for (let L = 1; L <= 5; L++) {
      const ry = cy0 + (L - 1) * radialRowH;
      const isAvail = L <= totalStrata;
      const isReached = L <= reached;
      const isNext = isAvail && L === nextStratum && !isReached;
      const isFinal = isAvail && L === totalStrata;
      const baseAlpha = isAvail ? (isReached ? 1 : (isNext ? 0.95 : 0.55)) : 0.32;

      // 좌측 라벨 S1
      const sLabel = createUiText(`S${L}`, {
        fontSize: 9,
        fill: isNext ? COL_KEY : (isReached ? 0xddddee : (isAvail ? 0x888888 : 0x555555)),
      });
      sLabel.x = graphX;
      sLabel.y = ry - 4;
      this.infoArea.addChild(sLabel);

      // stratum 별 좌·우 노드 수 (사용자 결정 2026-05-25: nodeCount 비례)
      const { leftN, rightN } = sideFor(L);
      const hubX_L = cxMid - (leftN + 1) * spacing;  // 행별 hub 위치

      // 가로 path line — 마름모 영역 skip (사용자 결정 2026-05-24: outline 안쪽 투과 방지).
      const pathG = new Graphics();
      const pathColor = isAvail ? 0x6a4a20 : 0x3a3a44;
      const pathAlpha = baseAlpha * 0.7;
      const drawHSeg = (xa: number, xb: number) => {
        if (xb > xa) {
          pathG.moveTo(xa, ry).lineTo(xb, ry)
            .stroke({ color: pathColor, width: 1, alpha: pathAlpha });
        }
      };
      const isFinalRow = isAvail && L === totalStrata;
      const zones: { x: number; sz: number }[] = [];
      if (isAvail) {
        zones.push({ x: hubX_L, sz: 3 + 1 });
        for (let i = 1; i <= leftN; i++) zones.push({ x: cxMid - i * spacing, sz: 4 + 1 });
        zones.push({ x: cxMid, sz: (isFinalRow ? 6.5 : 6) + 1 });
        for (let i = 1; i <= rightN; i++) zones.push({ x: cxMid + i * spacing, sz: 4 + 1 });
        // zones 가 x 오름차순이 되도록 좌측 노드는 역순으로 들어갔으므로 정렬.
        zones.sort((a, b) => a.x - b.x);
      } else {
        zones.push({ x: cxMid, sz: 3.5 + 1 });
      }
      let xs = labelEndX - 2;
      for (const z of zones) {
        drawHSeg(xs, z.x - z.sz);
        xs = z.x + z.sz;
      }
      drawHSeg(xs, dotsRight);
      this.infoArea.addChild(pathG);

      if (!isAvail) {
        // 잠금 stratum — 중앙에 outline ◇ 만 (크게).
        const lockG = new Graphics();
        const sz = 3.5;
        lockG.poly([cxMid, ry - sz, cxMid + sz, ry, cxMid, ry + sz, cxMid - sz, ry])
          .stroke({ color: 0x666677, width: 1.2, alpha: baseAlpha });
        this.infoArea.addChild(lockG);
        continue;
      }

      const nodeG = new Graphics();
      // (a) Hub — 좌측 끝, 작은 흰색 ◆ (spawn)
      const hubSz = 3;
      nodeG.poly([hubX_L, ry - hubSz, hubX_L + hubSz, ry, hubX_L, ry + hubSz, hubX_L - hubSz, ry])
        .fill({ color: 0xcccccc, alpha: baseAlpha });

      // (b) 좌측 leftN 노드 — fill orange (path 마커)
      for (let i = 1; i <= leftN; i++) {
        const bx = cxMid - i * spacing;
        const sz = 4;
        const diamond = [bx, ry - sz, bx + sz, ry, bx, ry + sz, bx - sz, ry];
        nodeG.poly(diamond).fill({ color: COL_KEY, alpha: baseAlpha });
      }

      // (c) 중앙 = 보스 (또는 HERE 커서) — 큼
      const centerSz = isFinal ? 6.5 : 6;
      const centerD = [cxMid, ry - centerSz, cxMid + centerSz, ry, cxMid, ry + centerSz, cxMid - centerSz, ry];
      if (isNext) {
        // HERE — outline (밝게, 두껍게)
        nodeG.poly(centerD).stroke({ color: COL_KEY, width: 2, alpha: 1 });
      } else {
        const bossColor = isFinal ? 0xff4d4d : COL_KEY;
        nodeG.poly(centerD).fill({ color: bossColor, alpha: baseAlpha });
        // 보스 안쪽 어두운 점 (강조)
        nodeG.poly([cxMid, ry - 2, cxMid + 2, ry, cxMid, ry + 2, cxMid - 2, ry])
          .fill({ color: 0x1a1a1a, alpha: baseAlpha });
      }

      // (d) 우측 rightN 노드 — 미진행 outline
      for (let i = 1; i <= rightN; i++) {
        const bx = cxMid + i * spacing;
        const sz = 4;
        const diamond = [bx, ry - sz, bx + sz, ry, bx, ry + sz, bx - sz, ry];
        nodeG.poly(diamond).stroke({ color: COL_KEY, width: 1.2, alpha: baseAlpha * 0.75 });
      }

      this.infoArea.addChild(nodeG);
    }
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
    const hpL = createUiText(t('ui.character.hp_label'), { fontSize: 8, fill: COL_DIM });
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

  /**
   * 시작 룸의 collisionGrid 를 다운샘플하여 *실제 던전 타일* 미니맵 생성.
   * 1 mini-pixel = `tilesPerPx` × `tilesPerPx` 타일 블록의 majority vote.
   *
   * @param exits 시작 룸의 출입 방향 (RoomGraph hub 노드에서 추출)
   * @param tilesPerPx 다운샘플 비율 (4 = 1px당 4×4 tiles, 4tile/px)
   * @param seed PRNG 시드 (decision template variant)
   */
  private renderStartRoomTiles(
    card: Graphics,
    exits: ExitDir[],
    seed: number,
    targetX: number,
    targetY: number,
    tilesPerPx: number,
    fillColor: number,
    bgColor: number,
    alpha: number,
  ): void {
    if (exits.length === 0) return;
    const rng = new PRNG(seed);
    let template: { grid: number[][] };
    try {
      template = pickTemplate(exits, rng, false);
    } catch {
      return;
    }
    const grid = template.grid;
    const targetW = Math.max(1, Math.ceil(TEMPLATE_W / tilesPerPx));
    const targetH = Math.max(1, Math.ceil(TEMPLATE_H / tilesPerPx));

    // BG 한 번에 채움 — 픽셀 단위 fill 호출 최소화
    card.rect(targetX, targetY, targetW, targetH).fill({ color: bgColor, alpha });

    for (let r = 0; r < targetH; r++) {
      for (let c = 0; c < targetW; c++) {
        // *Any wall* 룰 — 블록에 벽이 *하나라도* 있으면 벽으로 표시.
        // majority vote 는 외곽 1-tile 벽을 *공기로* 삼킴 → 룸 모양 사라짐.
        // 외곽 벽 보존이 *맵 인지* 의 핵심이므로 보수적 룰.
        let hasWall = false;
        const r0 = Math.floor(r * tilesPerPx);
        const r1 = Math.min(TEMPLATE_H, Math.floor((r + 1) * tilesPerPx));
        const c0 = Math.floor(c * tilesPerPx);
        const c1 = Math.min(TEMPLATE_W, Math.floor((c + 1) * tilesPerPx));
        outer: for (let sr = r0; sr < r1; sr++) {
          for (let sc = c0; sc < c1; sc++) {
            if (grid[sr][sc] === 1) { hasWall = true; break outer; }
          }
        }
        if (hasWall) {
          card.rect(targetX + c, targetY + r, 1, 1).fill({ color: fillColor, alpha });
        }
      }
    }
  }

  /**
   * LDtk pool 에서 exits + roomType 매칭. ItemWorldScene.pickTemplateForCell 의
   * 단순화 버전 — exits 정확 매칭 + type 정확 매칭 우선, 그 다음 exits 만, 그 다음
   * type 만, 모두 실패 시 null.
   */
  private findLdtkTemplate(
    pool: LdtkLevel[],
    exits: ExitDir[],
    desiredType: string,
    rng: PRNG,
  ): LdtkLevel | null {
    const memFiltered = pool.filter(t => !/^memory_/i.test(t.identifier));
    const sortedExits = [...exits].sort().join('');
    const matchExit = (lvl: LdtkLevel): boolean => [...lvl.exits].sort().join('') === sortedExits;

    // 1) type + exits 정확 매칭
    const byTypeAndExit = memFiltered.filter(t => t.roomType === desiredType && matchExit(t));
    if (byTypeAndExit.length > 0) return byTypeAndExit[rng.nextInt(0, byTypeAndExit.length - 1)];

    // 2) exits 만 정확 매칭
    const byExit = memFiltered.filter(matchExit);
    if (byExit.length > 0) return byExit[rng.nextInt(0, byExit.length - 1)];

    // 3) type 만 매칭
    const byType = memFiltered.filter(t => t.roomType === desiredType);
    if (byType.length > 0) return byType[rng.nextInt(0, byType.length - 1)];

    // 4) 임의 (pool 자체)
    if (memFiltered.length > 0) return memFiltered[rng.nextInt(0, memFiltered.length - 1)];
    return null;
  }

  /**
   * Stratum 픽셀 미니맵 viewport (2026-05-25 사용자 결정).
   *   *전체 stratum 을 보여주려 하지 않고*, hub(시작 위치) 를 카드 좌측에 고정한 후
   *   카드 viewport 안에 들어가는 룸들만 *실제 스케일* 로 그림. rarity 와 무관하게
   *   고정 스케일 → "이게 아이템의 맵의 시작 부분이구나" 인지 강화.
   *
   *   - 스케일 고정: 1px = 2 tiles → 룸 1개 = 24×16 px
   *   - hub 위치: 카드 좌측 padding 내. 다른 룸은 hub 기준 (tx-hubTx, ty-hubTy) 오프셋
   *   - 클리핑: 픽셀 좌표가 카드 viewport 밖이면 그리지 않음 (수동 mask)
   *   - 색: 벽 검정, 공기 어두운 청회색, hub 외곽 흰색
   */
  private renderStratumPixelMap(
    card: Graphics,
    item: ItemInstance,
    stratumIndex: number,
    cardY: number,
    cardH: number,
    cardW: number,
    isReached: boolean,
    isNext: boolean,
  ): void {
    const itemUid = item.uid;
    // 실제 dive 좌표 (col, absRow) 기반 unified grid — *진짜 메가스트럭처 배치*
    const unified = this.buildStratumUnified(item, stratumIndex);
    if (!unified) return;

    // 2) 고정 스케일 — 1.5배 확대 (2026-05-25). 룸 36×24 px.
    const roomMiniW = 36;  // 48 / 1.333
    const roomMiniH = 24;  // 32 / 1.333

    // 3) Hub 위치 — *해당 stratum* 의 startRoom (plaza top).
    //    unified grid 가 모든 stratum 통합이라 stratumStartRooms[stratumIndex] 사용.
    const startRoom = unified.stratumStartRooms[stratumIndex] ?? unified.stratumStartRooms[0];
    if (!startRoom) return;
    const hubCol = startRoom.col;
    const hubAbsRow = startRoom.absoluteRow;

    // 이 stratum 의 row 범위 (rowOffset ~ rowOffset+height)
    const stratumBound = unified.strataOffsets[stratumIndex];
    const stratumRowMin = stratumBound?.rowOffset ?? 0;
    const stratumRowMax = stratumBound ? stratumBound.rowOffset + stratumBound.height : unified.totalHeight;

    // Viewport — 카드 전체 영역 (border 제거됨)
    const vpX0 = 0;
    const vpY0 = cardY;
    const vpX1 = cardW;
    const vpY1 = cardY + cardH;

    // Hub 위치 = viewport 좌상단에서 *우측으로 1 룸 칸* 이동 (2026-05-25 사용자 결정).
    //   좌측 1칸 공간 확보 → CP 좌측 분기 / 좌측 spoke 도 viewport 안에 보임.
    //   상단은 그대로 — hub 가 stratum 시작점 (plaza, 위로는 없음).
    const hubScreenX = vpX0 + roomMiniW;
    const hubScreenY = vpY0;

    // 4) 색 (사용자 명시 2026-05-25): 벽 #161515 / 공기 #595959.
    //    BG 는 벽과 동일 (#161515) — 룸 사이가 벽으로 자연 연결.
    const baseAlpha = 1;
    const wallC = 0x161515;  // 어두운 — 벽
    const airC = 0x595959;   // 중간 회색 — 공기 (룸 내부)

    // LDtk pool 로딩 완료면 LDtk template 우선, 아니면 코드 RoomTemplate fallback
    const ldtkPool = getItemWorldTemplatesIfReady();

    // 5) 이 stratum 영역의 cell 만 순회 (다른 stratum 제외).
    //    Transpose 제거 (2026-05-25): 사용자 정합성 요청 — *실제 게임 좌표 그대로*.
    //    cell.col → screen X (수평), cell.absoluteRow - hubAbsRow → screen Y (수직 dive 진행).
    //    카드 가로 underuse 일지언정 *연결 구조 = ItemWorldScene 와 1:1 동일*.
    for (let r = stratumRowMin; r < stratumRowMax && r < unified.cells.length; r++) {
      const row = unified.cells[r];
      for (let c = 0; c < row.length; c++) {
        const cell = row[c];
        if (!cell) continue;

        // 실제 게임 좌표 그대로: col → X, absRow → Y
        const roomOffX = hubScreenX + (cell.col - hubCol) * roomMiniW;
        const roomOffY = hubScreenY + (cell.absoluteRow - hubAbsRow) * roomMiniH;

        // Viewport 클리핑
        if (roomOffX + roomMiniW < vpX0 || roomOffX > vpX1) continue;
        if (roomOffY + roomMiniH < vpY0 || roomOffY > vpY1) continue;

        // exits — cell.exits 에서 직접. 시각 회전 적용 후에도 도어 carve 가 *맵 구조* 와 일관:
        //   원래 down (dive 진행) → 시각적으로 right
        //   원래 up (역방향) → 시각적으로 left
        //   원래 left/right (수평 분기) → 시각적으로 up/down
        // 그러나 룸 grid 자체는 비회전이라 룸 외곽 도어 위치는 원래대로. 사용자 인지엔 영향 미미.
        const exits: ExitDir[] = [];
        if (cell.exits.left) exits.push('L');
        if (cell.exits.right) exits.push('R');
        if (cell.exits.up) exits.push('U');
        if (cell.exits.down) exits.push('D');
        if (exits.length === 0) exits.push('D');

        const rng = new PRNG(itemUid * 1000 + stratumIndex * 7919 + cell.col * 31 + cell.absoluteRow * 17);

      // LDtk 우선 — 정확 exit 매칭. 없으면 superset 또는 임의. 최종 폴백: 코드 RoomTemplate
      let grid: number[][];
      if (ldtkPool && ldtkPool.length > 0) {
        const isStartCell = cell.col === hubCol && cell.absoluteRow === hubAbsRow;
        const desiredType = cell.role === 'boss' ? 'Boss'
          : (cell.role === 'hub' || isStartCell) ? 'Start'
          : cell.role === 'shrine' ? 'Rest'
          : cell.kind === 'corridor' ? 'Corridor'
          : 'Combat';
        const ldtkMatch = this.findLdtkTemplate(ldtkPool, exits, desiredType, rng);
        if (ldtkMatch) {
          grid = ldtkMatch.collisionGrid;
        } else {
          let tplFallback: { grid: number[][] };
          try { tplFallback = pickTemplate(exits, rng, false); }
          catch { continue; }
          grid = tplFallback.grid;
        }
      } else {
        let tplFallback: { grid: number[][] };
        try { tplFallback = pickTemplate(exits, rng, false); }
        catch { continue; }
        grid = tplFallback.grid;
      }
      const gridH = grid.length;
      const gridW = grid[0]?.length ?? 0;

      // BG 일괄 (공기 색) — 클리핑된 영역만
      const bgX = Math.max(roomOffX, vpX0);
      const bgY = Math.max(roomOffY, vpY0);
      const bgW = Math.min(roomOffX + roomMiniW, vpX1 + 1) - bgX;
      const bgH = Math.min(roomOffY + roomMiniH, vpY1 + 1) - bgY;
      if (bgW > 0 && bgH > 0) {
        card.rect(bgX, bgY, bgW, bgH).fill({ color: airC, alpha: baseAlpha });
      }

      // 벽 픽셀 stamp — any-wall 룰 + viewport 클리핑
      // gridW/gridH 는 LDtk 의 룸 크기 (보통 TEMPLATE_W/H 와 동일 48×32, 다를 수도)
      const srcTilesPerPxX = gridW / roomMiniW;
      const srcTilesPerPxY = gridH / roomMiniH;
      for (let r = 0; r < roomMiniH; r++) {
        const py = roomOffY + r;
        if (py < vpY0 || py > vpY1) continue;
        for (let c = 0; c < roomMiniW; c++) {
          const px = roomOffX + c;
          if (px < vpX0 || px > vpX1) continue;
          const r0 = Math.floor(r * srcTilesPerPxY);
          const r1 = Math.min(gridH, Math.floor((r + 1) * srcTilesPerPxY));
          const c0 = Math.floor(c * srcTilesPerPxX);
          const c1 = Math.min(gridW, Math.floor((c + 1) * srcTilesPerPxX));
          let hasWall = false;
          outer: for (let sr = r0; sr < r1; sr++) {
            for (let sc = c0; sc < c1; sc++) {
              if (grid[sr][sc] === 1) { hasWall = true; break outer; }
            }
          }
          if (hasWall) {
            card.rect(px, py, 1, 1).fill({ color: wallC, alpha: baseAlpha });
          }
        }
      }
      } // close inner cells `for c`
    } // close outer cells `for r`

    // 6) Hub 외곽 강조 폐기 (2026-05-25 사용자 결정) — border 전혀 없음.
  }

  /**
   * 아이템의 *전체 dive unified grid* 생성 (캐시) — ItemWorldScene 의 생성 원리와 동일.
   *
   *   모든 strata 를 *함께* generateUnifiedGridFromGraph 에 전달해야 plaza-align
   *   col offset 이 ItemWorldScene 과 일치한다. 단일 stratum 호출은 colOffset 계산이
   *   달라져 실제 dive 의 룸 연결 구조와 불일치 (사용자 지적 2026-05-25).
   *
   *   topologyOverride 도 weaponDef 에서 가져와 동일 결과 보장.
   *   캐시 키 = item.uid (모든 stratum 통합이므로 stratumIndex 무관).
   */
  private buildStratumUnified(item: ItemInstance, _stratumIndex: number): UnifiedGridData | null {
    const key = `${item.uid}`;
    if (this.unifiedGridCache.has(key)) return this.unifiedGridCache.get(key) ?? null;
    const cfg = STRATA_BY_RARITY[item.rarity];
    if (!cfg?.strata?.length) { this.unifiedGridCache.set(key, null); return null; }
    try {
      const arch = archetypeFor(item.def.temperamentPrimary, item.def.temperamentSecondary);
      const { unifiedGrid } = generateUnifiedGridFromGraph(
        cfg.strata,                       // 모든 strata — ItemWorldScene 과 동일
        item.uid,
        item.def.topologyOverride,        // weaponDef 의 override 적용
        arch,
      );
      this.unifiedGridCache.set(key, unifiedGrid);
      return unifiedGrid;
    } catch {
      this.unifiedGridCache.set(key, null);
      return null;
    }
  }

  /**
   * 아이템 + stratum 의 RoomGraph 생성 (캐시). ItemWorldScene 과 동일 시드/archetype
   * 으로 *결정적* 결과 — anvil 에서 보이는 미니맵 = dive 후 실제 룸 배치.
   */
  private buildStratumGraph(item: ItemInstance, stratumIndex: number): RoomGraphData | null {
    const key = `${item.uid}:${stratumIndex}`;
    if (this.roomGraphCache.has(key)) return this.roomGraphCache.get(key) ?? null;
    const cfg = STRATA_BY_RARITY[item.rarity];
    const def = cfg.strata[stratumIndex];
    if (!def) { this.roomGraphCache.set(key, null); return null; }
    try {
      const arch = archetypeFor(item.def.temperamentPrimary, item.def.temperamentSecondary);
      const graph = generateRoomGraph(def, item.uid, stratumIndex, undefined, arch);
      this.roomGraphCache.set(key, graph);
      return graph;
    } catch {
      this.roomGraphCache.set(key, null);
      return null;
    }
  }

  /**
   * ITEM MAP — L1~L5 stratum 미니맵 5단 스택 (위=L5, 아래=L1).
   * v2 (2026-05-24): placeholder 폐기, 단계별 mini-map cards 구현.
   *
   * 가시 정책:
   *   - 아이템 rarity 별 stratum 수만 *활성* (Normal=1, Magic=2, ..., Ancient=5)
   *   - 도달한 stratum (deepestUnlocked) = 진하게 + room mock 표시
   *   - 다음 진행 stratum (= deepestUnlocked+1) = 골드 outline 강조
   *   - 미도달/미보유 = 옅음 + outline 만
   *
   * 향후 후속 단계: RoomGraph 실제 데이터로 mock 교체. 현재는 시각 위계만.
   */
  private drawStratumMinimap(): void {
    // STRATUM column header is now drawn by drawTitle in anvil mode (spec.png 3-column layout).
    // statusArea 가 drawRightColumn 에서 매번 clear 되므로 layers 도 reset.
    this.abyssNoiseLayers = [];
    let y = 0;
    const W = STATUS_W - 6;

    // 선택된 아이템 (anvil placed 우선, 그 외 grid 선택)
    const item = this.anvilItem ?? this.filteredItems()[this.selectedIndex];
    if (!item) {
      const ph = createUiText('—', { fontSize: 8, fill: COL_LOCKED });
      ph.x = 2 + Math.floor((W - ph.width) / 2);
      ph.y = y + 20;
      this.statusArea.addChild(ph);
      return;
    }

    // Stratum 수 — Ancient 는 4 + ABYSS 라 5 단으로 표시
    const totalStrata = ({
      normal: 1, magic: 2, rare: 3, legendary: 4, ancient: 5,
    } as const)[item.rarity] ?? 1;
    const reached = item.worldProgress?.deepestUnlocked ?? 0;
    const next = Math.min(reached + 1, totalStrata); // 다음 진행 대상 L

    // 2.5 카드 viewport (2026-05-25 사용자 결정).
    //   - 슬롯 0/1 = 풀 카드, 슬롯 2 = 절반 카드 (다음 stratum 있음 힌트)
    //   - 풀 카드 높이 = totalH * 0.4 (2.5 카드 fit)
    //   - firstVisibleIdx = reached — 클리어 완료 시 다음 stratum 이 slot 0 으로 올라옴.
    //     (사용자 결정 2026-05-25 v2: "층 클리어하면 다음 층이 slot 0")
    //     S1 클리어(reached=1) → S2=slot0/S3=slot1/S4=slot2
    //     S5까지 점진 이동 (reached=4 → S5=slot0)
    const totalH = PANEL_H - CONTENT_START_Y - 20;
    const cardGap = 4;
    const cardHFull = Math.floor((totalH - cardGap * 2) * 0.4);
    const cardHHalf = Math.floor(cardHFull * 0.5);
    const cardW = W;

    const firstVisibleIdx = Math.max(0, Math.min(totalStrata - 1, reached));
    const slotHeights = [cardHFull, cardHFull, cardHHalf];

    let cardY = y;
    for (let slot = 0; slot < slotHeights.length; slot++) {
      const cardH = slotHeights[slot];
      const stratumIdx = firstVisibleIdx + slot;
      const L = stratumIdx + 1;
      const isAvailable = stratumIdx < totalStrata;
      const isReached = stratumIdx < reached;
      const isNext = isAvailable && L === next && !isReached;

      const card = new Graphics();
      let pendingNoise: { top: number; bot: number } | null = null;
      // 2026-05-25 사용자 결정: 카드 내부 border 전혀 없게 — 단 *현재 층(isNext)* 만 예외.
      //   BG = #161515 (벽과 동일) — 룸 사이가 벽으로 자연 연결.
      card.rect(0, cardY, cardW, cardH).fill({ color: 0x161515, alpha: isAvailable ? 1 : 0.6 });

      // 실제 RoomGraph 데이터 → topology 미니맵 (수직/수평 무관 가로 펼침).
      // 사용자 결정 2026-05-24: 공간 좌표(layout.x/y) 대신 *연결 구조* 기반.
      //   x = depth (왼→오), y = branchIndex (CP=중앙, L=위, R=아래, dead=±2)
      if (isAvailable) {
        this.renderStratumPixelMap(card, item, L - 1, cardY, cardH, cardW, isReached, isNext);
      }

      // 사용자 결정 2026-05-25 v4: 슬롯별 top/bottom intensity 매핑.
      //   slot 0 = 위 0 / 아래 0          (클린)
      //   slot 1 = 위 0.1 / 아래 0.8     (점진 증가)
      //   slot 2 = 위 0.8 / 아래 1.0     (가득)
      //   → 카드 경계에서 연속 (0.8 → 0.8). 세로 전체가 부드러운 그라디언트.
      // v5 (2026-05-25): noise 를 별도 Graphics layer 로 분리해 *지지직 글리치* 애니메이션.
      //   update() 의 abyssNoiseTick 가 증가하면 각 layer 의 seed 가 바뀌어 패턴 재롤.
      {
        const SLOT_INTENSITY: Array<{ top: number; bot: number }> = [
          { top: 0,   bot: 0   },
          { top: 0.1, bot: 0.8 },
          { top: 0.8, bot: 1.0 },
        ];
        const { top, bot } = SLOT_INTENSITY[slot] ?? { top: 0, bot: 0 };
        if (top > 0.001 || bot > 0.001) {
          pendingNoise = { top, bot };
        }
      }

      // 다음 층 outline — isAvailable 카드 회색 1px (룸 픽셀 위에 그림).
      if (isAvailable && !isNext) {
        card.rect(0, cardY, cardW, cardH).stroke({ color: 0x555555, width: 1 });
      }
      // 현재 층 (isNext) outline — key color 2px, 위에 덮음 (2026-05-25).
      if (isNext) {
        card.rect(0, cardY, cardW, cardH).stroke({ color: COL_KEY, width: 2 });
      }
      this.statusArea.addChild(card);

      // noise layer — card *위* 에 (지지직 글리치가 outline 까지 살짝 덮음).
      if (pendingNoise) {
        const noiseG = new Graphics();
        const baseSeed = (item.uid ?? 0) * 257 + stratumIdx;
        this.drawAbyssNoise(noiseG, cardY, cardH, cardW, pendingNoise.top, pendingNoise.bot, baseSeed + this.abyssNoiseTick * 7919);
        this.statusArea.addChild(noiseG);
        this.abyssNoiseLayers.push({ graphics: noiseG, cardY, cardH, cardW, top: pendingNoise.top, bot: pendingNoise.bot, baseSeed });
      }

      // L 라벨 — 우상단 (좌상단은 hub 룸이 차지). 카드 border 제거된 상태에서
      // 맵 위에 작은 overlay 로 표시. 절반 카드는 라벨만 보임 (clipped 효과).
      const labelColor = isNext ? COL_KEY : (isAvailable ? COL_DIM : COL_LOCKED);
      const label = createUiText(`S${L}`, { fontSize: 8, fill: labelColor });
      label.x = cardW - label.width - 4;
      label.y = cardY + 2;
      this.statusArea.addChild(label);

      // 다음 슬롯 y 누적
      cardY += cardH + cardGap;
    }
  }

  /**
   * 심연 노이즈 — 카드 위에 픽셀 점 + 짧은 가로 글리치 흩뿌림.
   * intensity 0~1 비례. seed 로 deterministic (같은 카드 = 같은 패턴).
   *   - 점: 1×1 어두운 회색 ~ 약간 따뜻한 톤
   *   - 가끔 1×2 가로 글리치 (스캔라인 단편)
   */
  private drawAbyssNoise(card: Graphics, cardY: number, cardH: number, cardW: number, topI: number, botI: number, seed: number): void {
    let s = seed >>> 0;
    const rand = (): number => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xFFFFFFFF;
    };
    const area = cardW * cardH;
    // 사용자 결정 2026-05-25 v4: 카드 내부 top→bot intensity 그라디언트.
    //   각 점의 yNorm 위치에서 locI = lerp(top, bot, yNorm) → reject 샘플링.
    const dotMax = Math.floor(area * 0.5);
    for (let i = 0; i < dotMax; i++) {
      const px = Math.floor(rand() * cardW);
      const yNorm = rand();
      const locI = topI + (botI - topI) * yNorm;
      if (rand() > locI) continue;
      const py = cardY + Math.floor(yNorm * cardH);
      const r = rand();
      const color = r < 0.7 ? 0x2a2828 : (r < 0.9 ? 0x3a302a : 0x4a3020);
      const alpha = 0.5 + rand() * 0.4;
      card.rect(px, py, 1, 1).fill({ color, alpha });
    }
    // 가로 글리치 — 짧은 1×N 선 (스캔라인 단편)
    const glitchMax = Math.floor(area * 0.25);
    for (let i = 0; i < glitchMax; i++) {
      const px = Math.floor(rand() * cardW);
      const yNorm = rand();
      const locI = topI + (botI - topI) * yNorm;
      if (rand() > locI) continue;
      const py = cardY + Math.floor(yNorm * cardH);
      const w = 2 + Math.floor(rand() * 4);
      const color = rand() < 0.5 ? 0x3a3838 : 0x4a3a2a;
      card.rect(px, py, w, 1).fill({ color, alpha: 0.45 + rand() * 0.35 });
    }
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
  private buildHintRow(
    pairs: Array<{ action: GameAction; label: string; labelColor?: number }>,
    iconSize = 10,
    fontSize = 7,
  ): Container {
    const row = new Container();
    let x = 0;
    for (const { action, label, labelColor } of pairs) {
      const icon = KeyPrompt.createKeyIcon(actionKey(action), iconSize);
      icon.x = x;
      row.addChild(icon);
      x += iconSize + 4;
      const txt = createUiText(label, { fontSize, fill: labelColor ?? COL_DIM });
      txt.x = x;
      txt.y = Math.floor((iconSize - (txt.height ?? fontSize)) / 2);
      row.addChild(txt);
      x += (txt.width ?? 20) + 10;
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
      // Dive prompt 노란 펄스 — placed 상태에서만 icon + label alpha sin 변동.
      if (this.divePromptIcon && this.divePromptLabel) {
        const t = this.anvilPulseTimer / 1000;
        const pulse = 0.55 + 0.45 * Math.sin(t * Math.PI * 2 * 1.2);
        this.divePromptIcon.alpha = pulse;
        this.divePromptLabel.alpha = pulse;
      }
      // 심연 노이즈 지지직 글리치 — 60ms 마다 패턴 재롤.
      this.abyssNoiseTimer += dt;
      if (this.abyssNoiseTimer >= 60 && this.abyssNoiseLayers.length > 0) {
        this.abyssNoiseTimer = 0;
        this.abyssNoiseTick++;
        for (const layer of this.abyssNoiseLayers) {
          layer.graphics.clear();
          this.drawAbyssNoise(layer.graphics, layer.cardY, layer.cardH, layer.cardW, layer.top, layer.bot, layer.baseSeed + this.abyssNoiseTick * 7919);
        }
      }
    }
  }
}
