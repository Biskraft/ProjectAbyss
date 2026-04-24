/**
 * CharacterStats — Full-screen STATUS overlay (TAB key).
 *
 * Visual style unified with InventoryUI:
 * - Same overlay alpha, panel colors, slot sizes, font sizes, padding
 * - 3-column layout: Equipment | Character | Stats
 * - Bottom: Relic bar + close hint
 */

import { Container, Graphics, BitmapText } from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';
import { PIXEL_FONT } from './fonts';
import type { Inventory } from '@items/Inventory';
import { RARITY_COLOR, calcInnocentBonus, type InnocentStatKey } from '@items/ItemInstance';
import { getPlayerBaseStats } from '@data/playerStats';
import type { UISkin } from './UISkin';

// ---- Match InventoryUI style constants ----
const SLOT_SIZE = 32;
const PADDING = 12;
const COL_PANEL_BG = 0x1a1a2e;
const COL_BORDER = 0x4a4a6a;
const COL_SLOT_BG = 0x2a2a3e;
const COL_TEXT = 0xcccccc;
const COL_DIM = 0xaaaaaa;
const COL_MUTED = 0x555566;
const COL_POSITIVE = 0x44ff44;
const COL_NEGATIVE = 0xff4444;
const COL_GOLD = 0xffd700;
const COL_ACCENT = 0xff8833;
const COL_WHITE = 0xffffff;

const F_TITLE = 16;   // title (same as base BitmapFont)
const F_LABEL = 8;    // body / labels (0.5x base — clean scaling)

// Panel sizing — nearly full-screen like InventoryUI
const PANEL_W = 560;
const PANEL_H = 300;
const PANEL_X = Math.floor((GAME_WIDTH - PANEL_W) / 2);
const PANEL_Y = Math.floor((GAME_HEIGHT - PANEL_H) / 2);

// 3-column widths
const COL1_W = 170;   // Equipment
const COL2_W = 180;   // Character
// COL3 fills remainder

export class CharacterStats {
  readonly container: Container;
  visible = false;
  private inventory: Inventory | null = null;
  private playerLevel = 1;
  private playerExp = 0;
  private playerMaxExp = 100;
  private playerHp = 100;
  private playerMaxHp = 100;
  private relics: boolean[] = [false, false, false, false, false, false];
  private skin: UISkin | null = null;

  onVisibilityChanged: ((visible: boolean) => void) | null = null;

  constructor(skin?: UISkin | null) {
    this.skin = skin ?? null;
    this.container = new Container();
    this.container.visible = false;
  }

  setData(inventory: Inventory, level: number, exp: number, maxExp: number, hp: number, maxHp: number, relics: boolean[]): void {
    this.inventory = inventory;
    this.playerLevel = level;
    this.playerExp = exp;
    this.playerMaxExp = maxExp;
    this.playerHp = hp;
    this.playerMaxHp = maxHp;
    this.relics = relics;
  }

  show(): void {
    this.visible = true;
    this.container.visible = true;
    this.draw();
    this.onVisibilityChanged?.(true);
  }

  hide(): void {
    this.visible = false;
    this.container.visible = false;
    this.onVisibilityChanged?.(false);
  }

  // =========================================================================

  private draw(): void {
    this.container.removeChildren();

    // Overlay (same as InventoryUI: 0x000000 alpha 0.5)
    const overlay = new Graphics();
    overlay.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill({ color: 0x000000, alpha: 0.5 });
    this.container.addChild(overlay);

    // Panel background
    const panel = new Container();
    panel.x = PANEL_X;
    panel.y = PANEL_Y;
    this.container.addChild(panel);

    const bg = new Graphics();
    bg.rect(0, 0, PANEL_W, PANEL_H).fill({ color: COL_PANEL_BG, alpha: 0.97 });
    bg.rect(0, 0, PANEL_W, PANEL_H).stroke({ color: COL_BORDER, width: 1 });
    panel.addChild(bg);

    // Title (same fontSize 12 as InventoryUI "INVENTORY")
    const title = new BitmapText({ text: 'STATUS', style: { fontFamily: PIXEL_FONT, fontSize: 16, fill: COL_WHITE } });
    title.x = PADDING;
    title.y = 8;
    panel.addChild(title);

    // Close hint
    const hint = new BitmapText({ text: '[TAB] Close', style: { fontFamily: PIXEL_FONT, fontSize: F_LABEL, fill: COL_DIM } });
    hint.x = PANEL_W - PADDING - hint.width;
    hint.y = 12;
    panel.addChild(hint);

    // Divider below title
    const titleDiv = new Graphics();
    titleDiv.moveTo(PADDING, 28).lineTo(PANEL_W - PADDING, 28);
    titleDiv.stroke({ width: 1, color: COL_BORDER });
    panel.addChild(titleDiv);

    // Content area
    const content = new Container();
    content.x = PADDING;
    content.y = 36;
    panel.addChild(content);

    // Column dividers
    const divs = new Graphics();
    divs.moveTo(COL1_W, 0).lineTo(COL1_W, PANEL_H - 100);
    divs.moveTo(COL1_W + COL2_W, 0).lineTo(COL1_W + COL2_W, PANEL_H - 100);
    divs.stroke({ width: 1, color: COL_BORDER, alpha: 0.4 });
    content.addChild(divs);

    this.drawEquipment(content);
    this.drawCharacter(content);
    this.drawStats(content);
    this.drawRelics(content);
  }

  // ---- Column 1: Equipment ----
  private drawEquipment(parent: Container): void {
    const x = 0;
    let y = 0;

    const header = new BitmapText({ text: 'EQUIPMENT', style: { fontFamily: PIXEL_FONT, fontSize: F_LABEL, fill: COL_DIM } });
    header.x = x;
    header.y = y;
    parent.addChild(header);
    y += 18;

    const slotNames = ['Blade', 'Visor', 'Plate', 'Gauntlet', 'Greaves', 'Rig'];
    for (let i = 0; i < slotNames.length; i++) {
      const name = slotNames[i];
      const isActive = i === 0;

      // Slot icon (32x32 same as InventoryUI)
      const icon = new Graphics();
      icon.rect(x, y, SLOT_SIZE, SLOT_SIZE).fill(isActive ? COL_SLOT_BG : 0x1a1a22);
      icon.rect(x, y, SLOT_SIZE, SLOT_SIZE).stroke({ color: isActive ? COL_BORDER : 0x222233, width: 1 });
      parent.addChild(icon);

      // Slot label
      const label = new BitmapText({
        text: name,
        style: { fontFamily: PIXEL_FONT, fontSize: F_LABEL, fill: isActive ? COL_TEXT : COL_MUTED },
      });
      label.x = x + SLOT_SIZE + 6;
      label.y = y + 4;
      parent.addChild(label);

      // Item name or LOCKED
      if (isActive && this.inventory?.equipped) {
        const eq = this.inventory.equipped;
        const itemLabel = new BitmapText({
          text: eq.def.name,
          style: { fontFamily: PIXEL_FONT, fontSize: F_LABEL, fill: RARITY_COLOR[eq.rarity] ?? COL_WHITE },
        });
        itemLabel.x = x + SLOT_SIZE + 6;
        itemLabel.y = y + 18;
        parent.addChild(itemLabel);
      } else if (!isActive) {
        const locked = new BitmapText({
          text: 'LOCKED',
          style: { fontFamily: PIXEL_FONT, fontSize: F_LABEL, fill: COL_MUTED },
        });
        locked.x = x + SLOT_SIZE + 6;
        locked.y = y + 12;
        parent.addChild(locked);
      }

      y += SLOT_SIZE + 4;
    }
  }

  // ---- Column 2: Character ----
  private drawCharacter(parent: Container): void {
    const x = COL1_W + 12;
    const colW = COL2_W - 24;
    let y = 0;

    // Name
    const name = new BitmapText({ text: 'Erda', style: { fontFamily: PIXEL_FONT, fontSize: F_TITLE, fill: COL_WHITE } });
    name.x = x + Math.floor((colW - name.width) / 2);
    name.y = y;
    parent.addChild(name);
    y += 26;

    // Silhouette (same 32px grid alignment)
    const silW = 48, silH = 64;
    const silX = x + Math.floor((colW - silW) / 2);
    const sil = new Graphics();
    sil.rect(silX, y, silW, silH).fill(COL_SLOT_BG);
    sil.rect(silX, y, silW, silH).stroke({ color: COL_BORDER, width: 1 });
    parent.addChild(sil);
    const qMark = new BitmapText({ text: '?', style: { fontFamily: PIXEL_FONT, fontSize: F_TITLE, fill: COL_MUTED } });
    qMark.x = silX + Math.floor((silW - qMark.width) / 2);
    qMark.y = y + Math.floor((silH - 16) / 2);
    parent.addChild(qMark);
    y += silH + 12;

    // Level
    const lvText = `Lv.${this.playerLevel}`;
    const lv = new BitmapText({ text: lvText, style: { fontFamily: PIXEL_FONT, fontSize: F_TITLE, fill: COL_WHITE } });
    lv.x = x + Math.floor((colW - lv.width) / 2);
    lv.y = y;
    parent.addChild(lv);
    y += 24;

    // EXP bar
    const barW = 100, barH = 6;
    const barX = x + Math.floor((colW - barW) / 2);
    const expRatio = this.playerMaxExp > 0 ? Math.min(1, this.playerExp / this.playerMaxExp) : 0;
    const expBar = new Graphics();
    expBar.rect(barX, y, barW, barH).fill(0x222233);
    if (expRatio > 0) expBar.rect(barX, y, barW * expRatio, barH).fill(COL_GOLD);
    expBar.rect(barX, y, barW, barH).stroke({ color: COL_BORDER, width: 1 });
    parent.addChild(expBar);
    y += barH + 8;

    const expStr = `${this.playerExp} / ${this.playerMaxExp}`;
    const expText = new BitmapText({ text: expStr, style: { fontFamily: PIXEL_FONT, fontSize: F_LABEL, fill: COL_DIM } });
    expText.x = x + Math.floor((colW - expText.width) / 2);
    expText.y = y;
    parent.addChild(expText);
    y += 20;

    // HP
    const hpStr = `HP  ${this.playerHp} / ${this.playerMaxHp}`;
    const hpLabel = new BitmapText({ text: hpStr, style: { fontFamily: PIXEL_FONT, fontSize: F_LABEL, fill: COL_TEXT } });
    hpLabel.x = x + Math.floor((colW - hpLabel.width) / 2);
    hpLabel.y = y;
    parent.addChild(hpLabel);
    y += 16;

    const hpBarW = 100, hpBarH = 5;
    const hpBarX = x + Math.floor((colW - hpBarW) / 2);
    const hpRatio = this.playerMaxHp > 0 ? Math.min(1, this.playerHp / this.playerMaxHp) : 0;
    const hpColor = hpRatio > 0.5 ? 0x22aa22 : hpRatio > 0.25 ? 0xaaaa22 : 0xaa2222;
    const hpBar = new Graphics();
    hpBar.rect(hpBarX, y, hpBarW, hpBarH).fill(0x222233);
    if (hpRatio > 0) hpBar.rect(hpBarX, y, hpBarW * hpRatio, hpBarH).fill(hpColor);
    hpBar.rect(hpBarX, y, hpBarW, hpBarH).stroke({ color: COL_BORDER, width: 1 });
    parent.addChild(hpBar);
  }

  // ---- Column 3: Stats ----
  private drawStats(parent: Container): void {
    const x = COL1_W + COL2_W + 12;
    let y = 0;

    const header = new BitmapText({ text: 'STATS', style: { fontFamily: PIXEL_FONT, fontSize: F_LABEL, fill: COL_DIM } });
    header.x = x;
    header.y = y;
    parent.addChild(header);
    y += 18;

    const base = getPlayerBaseStats(this.playerLevel);
    const eq = this.inventory?.equipped;
    const eqAtk = eq?.finalAtk ?? 0;
    const eqBonus = eq ? calcInnocentBonus(eq, 'atk' as InnocentStatKey) : 0;

    const stats = [
      { label: 'ATK', base: base.atk, equip: eqAtk, innocent: eqBonus },
      { label: 'HP', base: base.hp, equip: 0, innocent: eq ? calcInnocentBonus(eq, 'hp' as InnocentStatKey) : 0 },
    ];

    for (const stat of stats) {
      const final = stat.base + stat.equip + stat.innocent;

      // Main stat line
      const t = new BitmapText({
        text: `${stat.label}: ${final}`,
        style: { fontFamily: PIXEL_FONT, fontSize: F_TITLE, fill: COL_WHITE },
      });
      t.x = x;
      t.y = y;
      parent.addChild(t);
      y += 22;

      // Decomposition
      const decomp = new BitmapText({
        text: `${stat.base} + ${stat.equip} + ${stat.innocent}`,
        style: { fontFamily: PIXEL_FONT, fontSize: F_LABEL, fill: COL_DIM },
      });
      decomp.x = x;
      decomp.y = y;
      parent.addChild(decomp);
      y += 14;

      const decompLabel = new BitmapText({
        text: 'base   equip   innocent',
        style: { fontFamily: PIXEL_FONT, fontSize: F_LABEL, fill: COL_MUTED },
      });
      decompLabel.x = x;
      decompLabel.y = y;
      parent.addChild(decompLabel);
      y += 20;
    }

    // Divider
    const finalAtk = base.atk + eqAtk + eqBonus;
    const def = Math.floor(finalAtk * 0.3);
    const div1 = new Graphics();
    div1.moveTo(x, y).lineTo(x + 160, y);
    div1.stroke({ width: 1, color: COL_BORDER, alpha: 0.4 });
    parent.addChild(div1);
    y += 10;

    const derived = new BitmapText({
      text: `DEF: ${def}`,
      style: { fontFamily: PIXEL_FONT, fontSize: F_LABEL, fill: COL_DIM },
    });
    derived.x = x;
    derived.y = y;
    parent.addChild(derived);
    y += 22;

    // Gate section
    const div2 = new Graphics();
    div2.moveTo(x, y).lineTo(x + 160, y);
    div2.stroke({ width: 1, color: COL_BORDER, alpha: 0.4 });
    parent.addChild(div2);
    y += 10;

    const gateHeader = new BitmapText({
      text: 'STAT GATE',
      style: { fontFamily: PIXEL_FONT, fontSize: F_LABEL, fill: COL_DIM },
    });
    gateHeader.x = x;
    gateHeader.y = y;
    parent.addChild(gateHeader);
    y += 16;

    const gates = [{ label: 'ATK Gate', current: finalAtk, required: 100 }];
    for (const gate of gates) {
      const ok = gate.current >= gate.required;
      const status = ok ? '[OK]' : `[!!] need +${gate.required - gate.current}`;
      const gt = new BitmapText({
        text: `${gate.label}: ${status}`,
        style: { fontFamily: PIXEL_FONT, fontSize: F_LABEL, fill: ok ? COL_POSITIVE : COL_NEGATIVE },
      });
      gt.x = x;
      gt.y = y;
      parent.addChild(gt);
      y += 16;
    }
  }

  // ---- Bottom: Relics ----
  private drawRelics(parent: Container): void {
    const barY = PANEL_H - 36 - 44;  // above bottom padding

    const div = new Graphics();
    div.moveTo(0, barY).lineTo(PANEL_W - PADDING * 2, barY);
    div.stroke({ width: 1, color: COL_BORDER, alpha: 0.4 });
    parent.addChild(div);

    const header = new BitmapText({ text: 'RELICS', style: { fontFamily: PIXEL_FONT, fontSize: F_LABEL, fill: COL_DIM } });
    header.x = 0;
    header.y = barY + 8;
    parent.addChild(header);

    const relicNames = ['Dash', 'Wall Climb', 'Double Jump', 'Mist Form', 'Water Breath', 'Rev. Gravity'];
    const totalW = PANEL_W - PADDING * 2;
    const blockW = Math.floor(totalW / 6);
    const relicY = barY + 24;

    for (let i = 0; i < 6; i++) {
      const rx = i * blockW;
      const acquired = this.relics[i] ?? false;

      // Icon (same 32x size family — use 16x16 for compactness)
      const icon = new Graphics();
      icon.rect(rx, relicY, 16, 16).fill(acquired ? COL_SLOT_BG : 0x1a1a22);
      icon.rect(rx, relicY, 16, 16).stroke({ color: acquired ? COL_ACCENT : 0x222233, width: 1 });
      parent.addChild(icon);

      if (acquired) {
        const v = new BitmapText({ text: 'V', style: { fontFamily: PIXEL_FONT, fontSize: F_LABEL, fill: COL_POSITIVE } });
        v.x = rx + 4;
        v.y = relicY + 4;
        parent.addChild(v);
      } else {
        const q = new BitmapText({ text: '?', style: { fontFamily: PIXEL_FONT, fontSize: F_LABEL, fill: COL_MUTED } });
        q.x = rx + 4;
        q.y = relicY + 4;
        parent.addChild(q);
      }

      const label = new BitmapText({
        text: relicNames[i],
        style: { fontFamily: PIXEL_FONT, fontSize: F_LABEL, fill: acquired ? COL_TEXT : COL_MUTED },
      });
      label.x = rx + 20;
      label.y = relicY + 4;
      parent.addChild(label);
    }
  }
}
