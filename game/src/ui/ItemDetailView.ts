/**
 * ItemDetailView — Full-screen item detail overlay (Z key from inventory).
 *
 * Shows: header, meta, base vs final stats, innocents list, strata progress, flavor text.
 * Border color matches item rarity. Pattern B (Prompt): read-only, C to close.
 */

import { Container, Graphics, BitmapText } from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';
import { PIXEL_FONT } from './fonts';
import { type ItemInstance, RARITY_COLOR, calcInnocentBonus, type InnocentStatKey } from '@items/ItemInstance';
import { RARITY_DISPLAY_NAME } from '@data/weapons';
import { STRATA_BY_RARITY } from '@data/StrataConfig';
import { getPlayerBaseStats } from '@data/playerStats';
import { MODAL_BG, MODAL_BG_ALPHA, MODAL_OVERLAY, MODAL_OVERLAY_ALPHA, MODAL_BORDER, MODAL_BORDER_W, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_POSITIVE, TEXT_NEGATIVE, FONT_TITLE, FONT_HINT, TEXT_ACCENT, createModalPanel } from './ModalPanel';
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

  show(item: ItemInstance): void {
    this.visible = true;
    this.container.visible = true;
    this.draw(item);
  }

  hide(): void {
    this.visible = false;
    this.container.visible = false;
  }

  private draw(item: ItemInstance): void {
    const rarityColor = RARITY_COLOR[item.rarity] ?? COL_TEXT;
    let y = 12;
    const lines: { text: string; x: number; y: number; color: number; size: number }[] = [];

    const add = (text: string, x: number, color = COL_TEXT, size = 8) => {
      lines.push({ text, x, y, color, size });
      y += size + 4;
    };

    const addDiv = () => { y += 2; lines.push({ text: '---DIV---', x: 0, y, color: 0, size: 0 }); y += 6; };

    // Header
    add(item.def.name, 16, rarityColor, 12);

    // Meta
    const rarityName = RARITY_DISPLAY_NAME[item.rarity] ?? item.rarity;
    const cycle = item.worldProgress?.cycle ?? 0;
    const cycleTag = cycle > 0 ? ` Cycle:${cycle}` : '';
    const clearTag = item.worldProgress?.cleared ? ' CLEARED' : '';
    add(`${rarityName} Lv.${item.level}${cycleTag}${clearTag}`, 16, COL_DIM, 7);

    // Type
    add(`${item.def.type} (Weapon)`, 16, COL_DIM, 7);

    addDiv();

    // Stats
    add('STATS', 16, COL_DIM, 7);
    const base = getPlayerBaseStats(1); // TODO: pass actual player level
    const bonusAtk = calcInnocentBonus(item, 'atk' as InnocentStatKey);
    const bonusHp = calcInnocentBonus(item, 'hp' as InnocentStatKey);
    add(`ATK: ${item.finalAtk}  (Base:${base.atk} + Equip:${item.finalAtk - base.atk - bonusAtk} + Inn:${bonusAtk})`, 24, COL_TEXT, 7);
    if (bonusHp > 0) {
      add(`HP Bonus: +${bonusHp}  (from Innocents)`, 24, COL_POSITIVE, 7);
    }

    addDiv();

    // Innocents
    const maxSlots = { normal: 2, magic: 3, rare: 4, legendary: 6, ancient: 8 }[item.rarity] ?? 2;
    add(`INNOCENTS (${item.innocents.length}/${maxSlots})`, 16, COL_DIM, 7);
    for (let i = 0; i < maxSlots; i++) {
      const inn = item.innocents[i];
      if (inn) {
        const isSubdued = (inn as any).subdued;
        const symbol = isSubdued ? '[O]' : '[!]';
        const color = isSubdued ? COL_SUBDUED : COL_WILD;
        const state = isSubdued ? 'Subdued' : 'Wild';
        const statName = (inn as any).stat ?? 'atk';
        const lv = (inn as any).level ?? 1;
        add(`${symbol} ${statName.toUpperCase()} Boost Lv.${lv}  (${state})`, 24, color, 7);
      } else {
        add('[ ] Empty', 24, COL_LOCKED, 7);
      }
    }

    addDiv();

    // Strata progress
    const strata = STRATA_BY_RARITY[item.rarity];
    const totalStrata = strata?.strata.length ?? 0;
    const deepest = item.worldProgress?.deepestUnlocked ?? 0;
    const bossNames = ['Item General', 'Item King', 'Item God', 'Item Great God', 'The Abyss'];
    add(`MEMORY STRATA (${deepest}/${totalStrata})`, 16, COL_DIM, 7);
    for (let s = 0; s < totalStrata; s++) {
      const cleared = s < deepest;
      const current = s === deepest;
      const symbol = cleared ? '[V]' : current ? '[>]' : '[ ]';
      const color = cleared ? COL_SUBDUED : current ? COL_CURRENT : COL_LOCKED;
      const name = bossNames[s] ?? `Stratum ${s + 1}`;
      add(`${symbol} Stratum ${s + 1} - ${name}`, 24, color, 7);
    }

    addDiv();

    // Action hint
    add('[C] Close', Math.floor(PANEL_W / 2) - 30, 0x00ced1, 8);

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
      const t = new BitmapText({
        text: line.text,
        style: { fontFamily: PIXEL_FONT, fontSize: line.size, fill: line.color },
      });
      t.x = line.x;
      t.y = line.y;
      this.contentContainer.addChild(t);
    }
  }
}
