/**
 * IdentityArchive.ts — DEC-046 인물 아카이브 UI
 *
 * 무기 인벤토리와 별도로 *복원된 인생들의 컬렉션* 을 표시.
 * 좌 카테고리 그리드 + 우 인물 카드 패널 구조 (UI_Identity_Archive.md 명세).
 *
 * 진입 채널:
 *   - 인벤토리에서 Z 키 (선택 아이템 인물 카드 진입)
 *   - 메인 메뉴 (카테고리 그리드 진입)
 *   - Return Result 후 A 키 (방금 복원한 인물 진입)
 *
 * 데이터 소스:
 *   - Inventory (런타임 ItemInstance 목록)
 *   - itemMaster (카테고리 / nameStages)
 *   - fragments (Fragment / Identity Trait 텍스트)
 */

import { Container, Graphics, type BitmapText, type Text } from 'pixi.js';
import {
  RARITY_COLOR,
  type ItemInstance,
  getDisplayName,
  getIdentityCategory,
  getCurrentStage,
} from '@items/ItemInstance';
import { type Inventory } from '@items/Inventory';
import { getStageFragment, getStageTrait } from '@data/fragments';
import { createModalPanel, MODAL_BORDER, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_GOLD, TEXT_ACCENT } from './ModalPanel';
import { createUiText } from './factories';
import { GameAction, actionKey } from '@core/InputManager';
import { type UISkin } from './UISkin';
import { t } from '@i18n';

const PANEL_W = 608;
const PANEL_H = 328;
const HEADER_H = 18;
const FOOTER_H = 16;
const CAT_PANEL_W = 180;
const CARD_PANEL_W = PANEL_W - CAT_PANEL_W - 24; // 좌우 패딩 + 패널 간격
const COL_BORDER = MODAL_BORDER;
const COL_TEXT = TEXT_PRIMARY;
const COL_DIM = TEXT_SECONDARY;
const COL_GOLD = TEXT_GOLD;

interface CategoryRow {
  category: string;
  characters: ItemInstance[];
  /** 100% 복원 인원 수 */
  completed: number;
  /** 발견된(획득된) 인원 수 */
  discovered: number;
  /** 표시용 총 슬롯 수 (기본 5) */
  totalSlots: number;
}

const CATEGORY_SLOT_DEFAULTS: Record<string, number> = {
  Surveyor: 5,
  BulkheadRepairman: 5,
  CableBearer: 5,
  DraftingArchivist: 5,
  AbyssDiver: 5,
  Signaller: 5,
  Tutorial: 1,
  LoreWeapon: 5,
};

// i18n 키 매핑. snake_case 변환 후 ui.category.{name} 키로 조회.
function categoryDisplayName(category: string): string {
  const key = `ui.category.${category.replace(/([A-Z])/g, '_$1').replace(/^_/, '').toLowerCase()}`;
  return t(key) || category;
}

export class IdentityArchive {
  readonly container: Container;
  visible = false;
  private panel: Container;
  private inventory: Inventory;
  private skin: UISkin | null = null;

  private selectedCategoryIdx = 0;
  private selectedCharIdxInCategory = 0;
  private rows: CategoryRow[] = [];

  onDismiss: (() => void) | null = null;

  constructor(inventory: Inventory, skin?: UISkin | null, uiScale: number = 1) {
    this.inventory = inventory;
    this.skin = skin ?? null;
    this.container = new Container();
    this.container.scale.set(uiScale);
    this.container.visible = false;

    this.panel = new Container();
    this.container.addChild(this.panel);
  }

  /** 아이템 직접 진입 (인벤토리 Z) — 해당 인물 카드 표시. */
  showForItem(item: ItemInstance): void {
    this.buildRows();
    const cat = getIdentityCategory(item);
    const catIdx = this.rows.findIndex(r => r.category === cat);
    if (catIdx >= 0) {
      this.selectedCategoryIdx = catIdx;
      const charIdx = this.rows[catIdx].characters.findIndex(c => c.uid === item.uid);
      this.selectedCharIdxInCategory = Math.max(0, charIdx);
    }
    this.show();
  }

  show(): void {
    this.buildRows();
    this.visible = true;
    this.container.visible = true;
    this.draw();
  }

  hide(): void {
    this.visible = false;
    this.container.visible = false;
    this.onDismiss?.();
  }

  navigateCategory(dir: -1 | 1): void {
    if (this.rows.length === 0) return;
    this.selectedCategoryIdx = (this.selectedCategoryIdx + dir + this.rows.length) % this.rows.length;
    this.selectedCharIdxInCategory = 0;
    this.draw();
  }

  navigateCharacter(dir: -1 | 1): void {
    const row = this.rows[this.selectedCategoryIdx];
    if (!row || row.characters.length === 0) return;
    this.selectedCharIdxInCategory =
      (this.selectedCharIdxInCategory + dir + row.characters.length) % row.characters.length;
    this.draw();
  }

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  private buildRows(): void {
    const byCategory = new Map<string, ItemInstance[]>();
    for (const item of this.inventory.items) {
      const cat = getIdentityCategory(item);
      if (cat === 'Unknown' || cat === 'Tutorial' || cat === 'LoreWeapon') continue;
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(item);
    }

    this.rows = [];
    for (const [category, characters] of byCategory) {
      const completed = characters.filter(c => c.memoryRecovery >= 100).length;
      const totalSlots = CATEGORY_SLOT_DEFAULTS[category] ?? 5;
      this.rows.push({
        category,
        characters,
        completed,
        discovered: characters.length,
        totalSlots,
      });
    }
    // 정렬: 발견순 (discovered desc), 동률 시 알파벳
    this.rows.sort((a, b) => {
      if (b.discovered !== a.discovered) return b.discovered - a.discovered;
      return a.category.localeCompare(b.category);
    });
  }

  // ---------------------------------------------------------------------------
  // Drawing
  // ---------------------------------------------------------------------------

  private draw(): void {
    this.container.removeChildren();

    const { overlay, panel } = createModalPanel(this.skin, PANEL_W, PANEL_H);
    this.container.addChild(overlay);
    this.panel = panel;
    this.container.addChild(this.panel);

    // Header
    const title = createUiText(t('ui.archive.title'), { fontSize: 11, fill: COL_TEXT });
    title.x = Math.floor((PANEL_W - title.width) / 2);
    title.y = 4;
    this.panel.addChild(title);

    // Header divider
    const headerDiv = new Graphics();
    headerDiv.moveTo(8, HEADER_H).lineTo(PANEL_W - 8, HEADER_H).stroke({ color: COL_BORDER, width: 1 });
    this.panel.addChild(headerDiv);

    // Categories panel (left)
    this.drawCategoriesPanel(8, HEADER_H + 6);

    // Vertical divider
    const vDiv = new Graphics();
    vDiv.moveTo(8 + CAT_PANEL_W + 6, HEADER_H + 6)
      .lineTo(8 + CAT_PANEL_W + 6, PANEL_H - FOOTER_H - 6)
      .stroke({ color: COL_BORDER, width: 1 });
    this.panel.addChild(vDiv);

    // Character card (right)
    this.drawCharacterCard(8 + CAT_PANEL_W + 12, HEADER_H + 6);

    // Footer hints
    this.drawFooter();
  }

  private drawCategoriesPanel(x: number, yStart: number): void {
    let y = yStart;

    if (this.rows.length === 0) {
      const empty = createUiText(t('ui.archive.empty_categories'), { fontSize: 8, fill: COL_DIM, wordWrap: true, wordWrapWidth: CAT_PANEL_W });
      empty.x = x; empty.y = y;
      this.panel.addChild(empty);
      return;
    }

    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i];
      const isSelected = i === this.selectedCategoryIdx;
      const displayName = categoryDisplayName(row.category);
      const prefix = isSelected ? '▶ ' : '  ';
      const nameColor = isSelected ? 0xffffff : COL_DIM;
      const nameTxt = createUiText(`${prefix}${displayName}`, { fontSize: 8, fill: nameColor });
      nameTxt.x = x; nameTxt.y = y;
      this.panel.addChild(nameTxt);

      // 진행 막대
      const barY = y + 11;
      const barW = CAT_PANEL_W - 16;
      const barH = 3;
      const bar = new Graphics();
      bar.rect(x + 8, barY, barW, barH).fill({ color: 0x222230 });
      const progressW = Math.floor(barW * (row.completed / row.totalSlots));
      if (progressW > 0) {
        bar.rect(x + 8, barY, progressW, barH).fill({ color: row.completed >= row.totalSlots ? 0xffd700 : 0xcccccc });
      }
      this.panel.addChild(bar);

      // 진행 카운트
      const countTxt = createUiText(`${row.completed}/${row.totalSlots}`, { fontSize: 6, fill: COL_DIM });
      countTxt.x = x + CAT_PANEL_W - countTxt.width - 8;
      countTxt.y = barY - 1;
      this.panel.addChild(countTxt);

      y += 22;
    }

    // 전체 카운트
    const total = this.rows.reduce((s, r) => s + r.completed, 0);
    const totalSlots = this.rows.reduce((s, r) => s + r.totalSlots, 0);
    const totalTxt = createUiText(t('ui.archive.total', { done: total, total: totalSlots }), { fontSize: 7, fill: COL_DIM });
    totalTxt.x = x; totalTxt.y = PANEL_H - FOOTER_H - 16;
    this.panel.addChild(totalTxt);
  }

  private drawCharacterCard(x: number, yStart: number): void {
    let y = yStart;

    if (this.rows.length === 0) {
      const empty = createUiText(t('ui.archive.empty'), {
        fontSize: 8, fill: COL_DIM, wordWrap: true, wordWrapWidth: CARD_PANEL_W,
      });
      empty.x = x; empty.y = y;
      this.panel.addChild(empty);
      return;
    }

    const row = this.rows[this.selectedCategoryIdx];
    const char = row.characters[this.selectedCharIdxInCategory];
    if (!char) {
      const empty = createUiText(t('ui.archive.empty_category'), {
        fontSize: 8, fill: COL_DIM, wordWrap: true, wordWrapWidth: CARD_PANEL_W,
      });
      empty.x = x; empty.y = y;
      this.panel.addChild(empty);
      return;
    }

    const rarityColor = RARITY_COLOR[char.rarity] ?? COL_TEXT;
    const displayName = getDisplayName(char);

    // 1. 헤더: 이름 + 레어리티
    const nameTxt = createUiText(displayName, { fontSize: 10, fill: rarityColor });
    nameTxt.x = x; nameTxt.y = y;
    this.panel.addChild(nameTxt);

    const rarityBadge = createUiText(char.rarity.toUpperCase(), { fontSize: 7, fill: rarityColor });
    rarityBadge.x = x + CARD_PANEL_W - rarityBadge.width - 4;
    rarityBadge.y = y + 2;
    this.panel.addChild(rarityBadge);
    y += 14;

    // 2. 카테고리
    const categoryDisplay = categoryDisplayName(row.category);
    this.addCardText(`${categoryDisplay}`, x, y, COL_TEXT, 7);
    y += 11;

    // 3. Recovery 게이지
    const recoveryPct = Math.floor(char.memoryRecovery);
    this.addCardText(t('ui.return.recovery_current', { curr: recoveryPct }), x, y, COL_DIM, 7);
    const barY = y + 9;
    const barW = CARD_PANEL_W - 8;
    const barH = 4;
    const bar = new Graphics();
    bar.rect(x, barY, barW, barH).fill({ color: 0x222230 });
    const fillW = Math.floor(barW * (recoveryPct / 100));
    const stage = getCurrentStage(char);
    const stageColor = stage === 0 ? 0x666666 : stage === 4 ? rarityColor : 0xcccccc;
    if (fillW > 0) bar.rect(x, barY, fillW, barH).fill({ color: stageColor });
    bar.rect(x, barY, barW, barH).stroke({ color: COL_BORDER, width: 1 });
    this.panel.addChild(bar);
    y += 16;

    // 4. Re-Dive 카운터 (100% 도달 후만)
    if (recoveryPct >= 100) {
      this.addCardText(t('ui.inventory.redive_count', { count: char.reDiveCount }), x, y, COL_DIM, 7);
      y += 11;
    }

    // Divider
    const div1 = new Graphics();
    div1.moveTo(x, y).lineTo(x + CARD_PANEL_W, y).stroke({ color: COL_BORDER, width: 1 });
    this.panel.addChild(div1);
    y += 5;

    // 5. Memory Fragments
    const stagesForRarity =
      char.rarity === 'normal' ? [4]
      : char.rarity === 'magic' ? [2, 4]
      : char.rarity === 'rare' ? [1, 2, 4]
      : [1, 2, 3, 4];

    for (const stageN of stagesForRarity) {
      const fragId = `${char.def.id}_stage_${stageN}`;
      const isUnlocked = char.unlockedFragments.includes(fragId);
      const f = getStageFragment(char.def.id, stageN);
      const isFire = stageN === 4 && isUnlocked;

      if (isUnlocked && f) {
        const text = `▸ "${(f.textKo || f.textEn).slice(0, 64)}${(f.textKo || f.textEn).length > 64 ? '…' : ''}"`;
        const txt = createUiText(text, {
          fontSize: isFire ? 8 : 7,
          fill: isFire ? COL_GOLD : COL_TEXT,
          wordWrap: true,
          wordWrapWidth: CARD_PANEL_W - 4,
        });
        txt.x = x; txt.y = y;
        this.panel.addChild(txt);
        y += Math.max(12, Math.floor((txt.height ?? 12)));
      } else {
        this.addCardText(t('ui.inventory.fragment_placeholder'), x, y, 0x555555, 7);
        y += 11;
      }
    }

    y += 4;

    // Divider
    const div2 = new Graphics();
    div2.moveTo(x, y).lineTo(x + CARD_PANEL_W, y).stroke({ color: COL_BORDER, width: 1 });
    this.panel.addChild(div2);
    y += 5;

    // 6. Identity Traits
    for (const stageN of stagesForRarity) {
      const traitId = `${char.def.id}_trait_${stageN}`;
      const fragId = `${char.def.id}_stage_${stageN}`;
      const isUnlocked = char.unlockedFragments.includes(fragId);
      if (!isUnlocked) continue;
      const trait = getStageTrait(char.def.id, stageN);
      if (!trait) continue;

      const traitName = createUiText(`◆ ${trait.name}`, { fontSize: 7, fill: COL_GOLD });
      traitName.x = x; traitName.y = y;
      this.panel.addChild(traitName);

      if (trait.effect) {
        const effectText = createUiText(trait.effect, {
          fontSize: 6, fill: COL_DIM, wordWrap: true, wordWrapWidth: CARD_PANEL_W - 4,
        });
        effectText.x = x + 12; effectText.y = y + 8;
        this.panel.addChild(effectText);
        y += 8 + Math.max(8, Math.floor((effectText.height ?? 8)));
      } else {
        y += 10;
      }
    }
  }

  private drawFooter(): void {
    const y = PANEL_H - FOOTER_H + 2;
    const hintParts: string[] = [
      t('ui.archive.hint_category'),
      t('ui.archive.hint_character'),
      t('ui.archive.hint_close', { key: actionKey(GameAction.MENU) }),
    ];
    const hintText = createUiText(hintParts.join('   '), { fontSize: 7, fill: TEXT_ACCENT });
    hintText.x = Math.floor((PANEL_W - hintText.width) / 2);
    hintText.y = y;
    this.panel.addChild(hintText);
  }

  private addCardText(text: string, x: number, y: number, color: number, fontSize: number): BitmapText | Text {
    const node = createUiText(text, {
      fontSize,
      fill: color,
      wordWrap: true,
      wordWrapWidth: CARD_PANEL_W - 4,
    });
    node.x = x; node.y = y;
    this.panel.addChild(node);
    return node;
  }
}
