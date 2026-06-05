/**
 * ItemDetailView — Full-screen item detail overlay (Z key from inventory).
 *
 * Shows: header, meta, base vs final stats, innocents list, strata progress, flavor text.
 * Border color matches item rarity. Pattern B (Prompt): read-only, C to close.
 */

import { Container, Graphics } from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';
import { PIXEL_FONT } from './fonts';
import { createUiText } from './factories';
import { t } from '@i18n';
import { type ItemInstance, RARITY_COLOR, calcInnocentBonus, getDisplayName, type InnocentStatKey } from '@items/ItemInstance';
import { RARITY_DISPLAY_NAME } from '@data/weapons';
import { STRATA_BY_RARITY } from '@data/StrataConfig';
import { getPlayerBaseStats } from '@data/playerStats';
import { MODAL_BG, MODAL_BG_ALPHA, MODAL_OVERLAY, MODAL_OVERLAY_ALPHA, MODAL_BORDER, MODAL_BORDER_W, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_POSITIVE, TEXT_NEGATIVE, FONT_TITLE, FONT_HINT, TEXT_ACCENT, createModalPanel } from './ModalPanel';
import { GameAction, actionKey } from '@core/InputManager';
import type { UISkin } from './UISkin';

const PANEL_W = 400;
const PANEL_MIN_H = 240;
const COL_BG = MODAL_BG;
const COL_BORDER = MODAL_BORDER;
const COL_TEXT = TEXT_PRIMARY;
const COL_DIM = TEXT_SECONDARY;
const COL_POSITIVE = TEXT_POSITIVE;
const COL_NEGATIVE = TEXT_NEGATIVE;
const COL_WILD = TEXT_NEGATIVE;
const COL_SUBDUED = TEXT_POSITIVE;
const COL_LOCKED = 0x666666;
const COL_CURRENT = 0xffff44;

export class ItemDetailView {
  readonly container: Container;
  visible = false;
  private panel: Container;
  private contentContainer: Container;
  private skin: UISkin | null = null;

  constructor(skin?: UISkin | null) {
    this.skin = skin ?? null;
    this.container = new Container();
    this.container.visible = false;

    this.panel = new Container();
    this.container.addChild(this.panel);

    this.contentContainer = new Container();
    this.panel.addChild(this.contentContainer);
  }

  show(item: ItemInstance, playerLevel = 1): void {
    this.visible = true;
    this.container.visible = true;
    this.draw(item, playerLevel);
  }

  hide(): void {
    this.visible = false;
    this.container.visible = false;
  }

  private draw(item: ItemInstance, playerLevel: number): void {
    const rarityColor = RARITY_COLOR[item.rarity] ?? COL_TEXT;
    let y = 12;
    const lines: { text: string; x: number; y: number; color: number; size: number }[] = [];

    const add = (text: string, x: number, color = COL_TEXT, size = 8) => {
      lines.push({ text, x, y, color, size });
      y += size + 4;
    };

    const addDiv = () => { y += 2; lines.push({ text: '---DIV---', x: 0, y, color: 0, size: 0 }); y += 6; };

    // Header
    add(getDisplayName(item), 16, rarityColor, 12);

    // Meta
    const rarityName = RARITY_DISPLAY_NAME[item.rarity] ?? item.rarity;
    const cycle = item.worldProgress?.cycle ?? 0;
    const cycleTag = cycle > 0 ? ` ${t('ui.detail.cycle_tag', { n: cycle })}` : '';
    const clearTag = item.worldProgress?.cleared ? ` ${t('ui.detail.cleared_tag')}` : '';
    add(t('ui.detail.meta', { rarity: rarityName, level: item.level, cycleTag, clearTag }), 16, COL_DIM, 7);

    // Type
    add(t('ui.detail.type_line', { type: item.def.type }), 16, COL_DIM, 7);

    addDiv();

    // Stats
    add(t('ui.detail.stats'), 16, COL_DIM, 7);
    const base = getPlayerBaseStats(playerLevel);
    const bonusAtk = calcInnocentBonus(item, 'atk' as InnocentStatKey);
    const bonusHp = calcInnocentBonus(item, 'hp' as InnocentStatKey);
    add(t('ui.detail.atk_full', {
      final: item.finalAtk,
      base: base.atk,
      equip: item.finalAtk - base.atk - bonusAtk,
      inn: bonusAtk,
    }), 24, COL_TEXT, 7);
    if (bonusHp > 0) {
      add(t('ui.detail.hp_bonus', { bonus: bonusHp }), 24, COL_POSITIVE, 7);
    }

    addDiv();

    // Innocents
    const maxSlots = { normal: 2, magic: 3, rare: 4, legendary: 6, ancient: 8 }[item.rarity] ?? 2;
    add(t('ui.detail.innocents_header', { count: item.innocents.length, max: maxSlots }), 16, COL_DIM, 7);
      for (let i = 0; i < maxSlots; i++) {
        const inn = item.innocents[i];
        if (inn) {
          const innocence = inn as {
            subdued?: boolean;
            stat?: InnocentStatKey;
            level?: number;
          };
          const isSubdued = innocence.subdued;
          const symbol = isSubdued ? '[O]' : '[!]';
          const color = isSubdued ? COL_SUBDUED : COL_WILD;
          const state = isSubdued ? t('ui.detail.subdued') : t('ui.detail.wild');
          const statName = innocence.stat ?? 'atk';
          const lv = innocence.level ?? 1;
          add(t('ui.detail.innocent_row', { symbol, stat: statName.toUpperCase(), lv, state }), 24, color, 7);
        } else {
          add(t('ui.detail.empty_slot'), 24, COL_LOCKED, 7);
        }
      }

    addDiv();

    // Strata progress
    const strata = STRATA_BY_RARITY[item.rarity];
    const totalStrata = strata?.strata.length ?? 0;
    const deepest = item.worldProgress?.deepestUnlocked ?? 0;
    const bossKeys = ['boss.item_general', 'boss.item_king', 'boss.item_god', 'boss.item_great_god', 'boss.the_abyss'];
    add(t('ui.detail.strata_header', { deepest, total: totalStrata }), 16, COL_DIM, 7);
    for (let s = 0; s < totalStrata; s++) {
      const cleared = s < deepest;
      const current = s === deepest;
      const symbol = cleared ? '[V]' : current ? '[>]' : '[ ]';
      const color = cleared ? COL_SUBDUED : current ? COL_CURRENT : COL_LOCKED;
      const name = bossKeys[s] ? t(bossKeys[s]) : t('boss.fallback_stratum', { n: s + 1 });
      add(t('ui.detail.stratum_row', { symbol, n: s + 1, boss: name }), 24, color, 7);
    }

    addDiv();

    // Action hint
    add(t('ui.detail.close_hint', { key: actionKey(GameAction.ATTACK) }), Math.floor(PANEL_W / 2) - 30, 0x00ced1, 8);

    // Calculate panel height, then build overlay + 9-slice panel
    const panelH = Math.max(PANEL_MIN_H, y + 12);

    // Clear everything and rebuild
    this.container.removeChildren();

    const { overlay, panel } = createModalPanel(this.skin, PANEL_W, panelH);
    this.container.addChild(overlay);
    this.panel = panel;
    this.container.addChild(this.panel);

    this.contentContainer = new Container();
    this.panel.addChild(this.contentContainer);

    // Render all lines
    for (const line of lines) {
      if (line.text === '---DIV---') {
        const g = new Graphics();
        g.moveTo(12, line.y); g.lineTo(PANEL_W - 12, line.y);
        g.stroke({ width: 1, color: COL_BORDER });
        this.contentContainer.addChild(g);
        continue;
      }
      // Width budget — panel width minus the column inset (line.x) and a
      // 12-px right gutter. KO Noto Sans KR is wider per-char than the EN
      // BitmapText pixel atlas, so long boss / state lines can overflow at
      // their authored fixed indents; wordWrap absorbs the difference and
      // keeps layout inside the panel.
      const node = createUiText(line.text, {
        fontSize: line.size,
        fill: line.color,
        wordWrap: true,
        wordWrapWidth: Math.max(60, PANEL_W - line.x - 12),
      });
      node.x = line.x;
      node.y = line.y;
      this.contentContainer.addChild(node);
    }
  }
}
