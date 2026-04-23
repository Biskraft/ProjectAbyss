/**
 * CharacterStats — STATUS tab in pause menu.
 *
 * 3-column layout: Equipment | Character | Stats
 * Shows stat decomposition: Base + Equip + Innocent = Final
 */

import { Container, Graphics, BitmapText } from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';
import { PIXEL_FONT } from './fonts';
import type { Inventory } from '@items/Inventory';
import { RARITY_COLOR, calcInnocentBonus, type InnocentStatKey } from '@items/ItemInstance';
import { getPlayerBaseStats } from '@data/playerStats';
import { createModalPanel } from './ModalPanel';
import type { UISkin } from './UISkin';

const PANEL_W = 500;
const PANEL_H = 280;
const PANEL_X = Math.floor((GAME_WIDTH - PANEL_W) / 2);
const PANEL_Y = Math.floor((GAME_HEIGHT - PANEL_H) / 2);

const COL_BG = 0x1a1a2e;
const COL_BORDER = 0x4a4a6a;
const COL_TEXT = 0xffffff;
const COL_DIM = 0xaaaaaa;
const COL_POSITIVE = 0x44ff44;
const COL_NEGATIVE = 0xff4444;
const COL_GOLD = 0xffd700;
const COL_ACTIVE_TAB = 0x4a4a8a;
const COL_INACTIVE_TAB = 0x2a2a3e;

// Column positions
const COL1_X = 8;      // Equipment (152px)
const COL2_X = 162;    // Character (158px)
const COL3_X = 322;    // Stats (172px)

export class CharacterStats {
  readonly container: Container;
  visible = false;
  private panel: Container;
  private contentContainer: Container;
  private inventory: Inventory | null = null;
  private playerLevel = 1;
  private playerExp = 0;
  private playerMaxExp = 100;
  private playerHp = 100;
  private playerMaxHp = 100;
  private relics: boolean[] = [false, false, false, false, false, false];
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
  }

  hide(): void {
    this.visible = false;
    this.container.visible = false;
  }

  private draw(): void {
    // Clear everything and rebuild with overlay + 9-slice panel
    this.container.removeChildren();

    const { overlay, panel } = createModalPanel(this.skin, PANEL_W, PANEL_H);
    this.container.addChild(overlay);
    this.panel = panel;
    this.container.addChild(this.panel);

    this.contentContainer = new Container();
    this.panel.addChild(this.contentContainer);

    // Tab bar
    const tabBg = new Graphics();
    tabBg.rect(0, 0, PANEL_W, 14).fill(COL_ACTIVE_TAB);
    this.contentContainer.addChild(tabBg);
    const tabLabel = new BitmapText({ text: 'STATUS', style: { fontFamily: PIXEL_FONT, fontSize: 7, fill: COL_TEXT } });
    tabLabel.x = 8; tabLabel.y = 3;
    this.contentContainer.addChild(tabLabel);

    // Column dividers
    const divs = new Graphics();
    divs.moveTo(COL2_X - 2, 16); divs.lineTo(COL2_X - 2, PANEL_H - 44);
    divs.moveTo(COL3_X - 2, 16); divs.lineTo(COL3_X - 2, PANEL_H - 44);
    divs.stroke({ width: 1, color: COL_BORDER });
    this.contentContainer.addChild(divs);

    this.drawEquipmentColumn();
    this.drawCharacterColumn();
    this.drawStatsColumn();
    this.drawRelicBar();
  }

  private drawEquipmentColumn(): void {
    const x = COL1_X, startY = 20;
    const header = new BitmapText({ text: 'EQUIPMENT', style: { fontFamily: PIXEL_FONT, fontSize: 7, fill: COL_DIM } });
    header.x = x; header.y = startY;
    this.contentContainer.addChild(header);

    const slotNames = ['Blade', 'Visor', 'Plate', 'Gauntlet', 'Greaves', 'Rig'];
    let y = startY + 14;

    for (let i = 0; i < slotNames.length; i++) {
      const name = slotNames[i];
      const isActive = i === 0; // Phase 1: only Blade

      // Slot icon placeholder
      const icon = new Graphics();
      icon.rect(x, y, 16, 16).fill(isActive ? 0x2a2a3e : 0x1a1a1a);
      icon.rect(x, y, 16, 16).stroke({ color: isActive ? COL_BORDER : 0x222222, width: 1 });
      this.contentContainer.addChild(icon);

      // Slot label
      const label = new BitmapText({
        text: name,
        style: { fontFamily: PIXEL_FONT, fontSize: 7, fill: isActive ? COL_DIM : 0x444444 },
      });
      label.x = x + 20; label.y = y + 1;
      this.contentContainer.addChild(label);

      // Item name or LOCKED
      if (isActive && this.inventory?.equipped) {
        const eq = this.inventory.equipped;
        const itemLabel = new BitmapText({
          text: eq.def.name,
          style: { fontFamily: PIXEL_FONT, fontSize: 7, fill: RARITY_COLOR[eq.rarity] ?? COL_TEXT },
        });
        itemLabel.x = x + 20; itemLabel.y = y + 9;
        this.contentContainer.addChild(itemLabel);
      } else if (!isActive) {
        const locked = new BitmapText({
          text: 'LOCKED',
          style: { fontFamily: PIXEL_FONT, fontSize: 6, fill: 0x444444 },
        });
        locked.x = x + 20; locked.y = y + 5;
        this.contentContainer.addChild(locked);
      }

      y += 20;
    }
  }

  private drawCharacterColumn(): void {
    const x = COL2_X + 4, startY = 20;

    // Character name
    const name = new BitmapText({ text: 'Erda', style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: COL_TEXT } });
    name.x = x; name.y = startY;
    this.contentContainer.addChild(name);

    // Character silhouette placeholder
    const silhouette = new Graphics();
    silhouette.rect(x + 40, startY + 20, 48, 72).fill(0x2a2a3e);
    silhouette.rect(x + 40, startY + 20, 48, 72).stroke({ color: COL_BORDER, width: 1 });
    this.contentContainer.addChild(silhouette);
    const silLabel = new BitmapText({ text: '?', style: { fontFamily: PIXEL_FONT, fontSize: 24, fill: 0x444444 } });
    silLabel.x = x + 56; silLabel.y = startY + 42;
    this.contentContainer.addChild(silLabel);

    // Level
    const level = new BitmapText({
      text: `Lv.${this.playerLevel}`,
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: COL_TEXT },
    });
    level.x = x; level.y = startY + 100;
    this.contentContainer.addChild(level);

    // EXP bar
    const barX = x, barY = startY + 112;
    const barW = 100, barH = 4;
    const expRatio = this.playerMaxExp > 0 ? this.playerExp / this.playerMaxExp : 0;
    const expBar = new Graphics();
    expBar.rect(barX, barY, barW, barH).fill(0x222222);
    expBar.rect(barX, barY, barW * expRatio, barH).fill(COL_GOLD);
    expBar.rect(barX, barY, barW, barH).stroke({ color: COL_BORDER, width: 1 });
    this.contentContainer.addChild(expBar);

    const expText = new BitmapText({
      text: `${this.playerExp} / ${this.playerMaxExp}`,
      style: { fontFamily: PIXEL_FONT, fontSize: 7, fill: COL_DIM },
    });
    expText.x = barX; expText.y = barY + 6;
    this.contentContainer.addChild(expText);
  }

  private drawStatsColumn(): void {
    const x = COL3_X + 4, startY = 20;

    const header = new BitmapText({ text: 'STATS', style: { fontFamily: PIXEL_FONT, fontSize: 7, fill: COL_DIM } });
    header.x = x; header.y = startY;
    this.contentContainer.addChild(header);

    const base = getPlayerBaseStats(this.playerLevel);
    const eq = this.inventory?.equipped;
    const eqAtk = eq?.finalAtk ?? 0;
    const eqBonus = eq ? calcInnocentBonus(eq, 'atk' as InnocentStatKey) : 0;

    const stats = [
      { label: 'ATK', base: base.atk, equip: eqAtk, innocent: eqBonus, isPrimary: true },
      { label: 'HP', base: base.hp, equip: 0, innocent: eq ? calcInnocentBonus(eq, 'hp' as InnocentStatKey) : 0, isPrimary: true },
    ];

    let y = startY + 14;
    for (const stat of stats) {
      const final = stat.base + stat.equip + stat.innocent;
      const line = `${stat.label}: ${final}`;
      const t = new BitmapText({
        text: line,
        style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: COL_TEXT },
      });
      t.x = x; t.y = y;
      this.contentContainer.addChild(t);

      // Decomposition
      const decomp = `  ${stat.base} + ${stat.equip} + ${stat.innocent}`;
      const d = new BitmapText({
        text: decomp,
        style: { fontFamily: PIXEL_FONT, fontSize: 6, fill: COL_DIM },
      });
      d.x = x; d.y = y + 10;
      this.contentContainer.addChild(d);

      y += 24;
    }

    // Derived stats
    const finalAtk = base.atk + eqAtk + eqBonus;
    const def = Math.floor(finalAtk * 0.3);
    y += 4;
    const divider = new Graphics();
    divider.moveTo(x, y); divider.lineTo(x + 160, y);
    divider.stroke({ width: 1, color: COL_BORDER });
    this.contentContainer.addChild(divider);
    y += 6;

    const derived = new BitmapText({
      text: `DEF: ${def}`,
      style: { fontFamily: PIXEL_FONT, fontSize: 7, fill: COL_DIM },
    });
    derived.x = x; derived.y = y;
    this.contentContainer.addChild(derived);

    // Gate status
    y += 20;
    const gateDiv = new Graphics();
    gateDiv.moveTo(x, y); gateDiv.lineTo(x + 160, y);
    gateDiv.stroke({ width: 1, color: COL_BORDER });
    this.contentContainer.addChild(gateDiv);
    y += 6;

    const gateHeader = new BitmapText({
      text: 'STAT GATE',
      style: { fontFamily: PIXEL_FONT, fontSize: 7, fill: COL_DIM },
    });
    gateHeader.x = x; gateHeader.y = y;
    this.contentContainer.addChild(gateHeader);
    y += 12;

    // Example gate check (ATK >= 100)
    const gates = [
      { label: 'ATK Gate', current: finalAtk, required: 100 },
    ];
    for (const gate of gates) {
      const ok = gate.current >= gate.required;
      const status = ok ? '[OK]' : `[!!] need +${gate.required - gate.current}`;
      const color = ok ? COL_POSITIVE : COL_NEGATIVE;
      const gt = new BitmapText({
        text: `${gate.label}: ${status}`,
        style: { fontFamily: PIXEL_FONT, fontSize: 7, fill: color },
      });
      gt.x = x; gt.y = y;
      this.contentContainer.addChild(gt);
      y += 12;
    }
  }

  private drawRelicBar(): void {
    const barY = PANEL_H - 42;
    const divider = new Graphics();
    divider.moveTo(8, barY); divider.lineTo(PANEL_W - 8, barY);
    divider.stroke({ width: 1, color: COL_BORDER });
    this.contentContainer.addChild(divider);

    const relicHeader = new BitmapText({
      text: 'RELICS',
      style: { fontFamily: PIXEL_FONT, fontSize: 7, fill: COL_DIM },
    });
    relicHeader.x = 8; relicHeader.y = barY + 4;
    this.contentContainer.addChild(relicHeader);

    const relicNames = ['Dash', 'Wall Climb', 'Double Jump', 'Fog Form', 'Water Breath', 'Anti-Gravity'];
    const blockW = 76;
    const startX = 8;
    const relicY = barY + 14;

    for (let i = 0; i < 6; i++) {
      const rx = startX + (i % 6) * blockW;
      const acquired = this.relics[i] ?? false;

      // Icon box
      const icon = new Graphics();
      icon.rect(rx, relicY, 12, 12).fill(acquired ? 0x2a2a3e : 0x1a1a1a);
      icon.rect(rx, relicY, 12, 12).stroke({ color: acquired ? COL_BORDER : 0x222222, width: 1 });
      this.contentContainer.addChild(icon);

      if (!acquired) {
        const q = new BitmapText({ text: '?', style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: 0x444444 } });
        q.x = rx + 3; q.y = relicY + 2;
        this.contentContainer.addChild(q);
      } else {
        const v = new BitmapText({ text: 'V', style: { fontFamily: PIXEL_FONT, fontSize: 7, fill: COL_POSITIVE } });
        v.x = rx + 3; v.y = relicY + 2;
        this.contentContainer.addChild(v);
      }

      // Name (truncated)
      const name = relicNames[i];
      const displayName = name.length > 8 ? name.substring(0, 7) + '.' : name;
      const label = new BitmapText({
        text: displayName,
        style: { fontFamily: PIXEL_FONT, fontSize: 5, fill: acquired ? COL_TEXT : 0x444444 },
      });
      label.x = rx + 14; label.y = relicY + 3;
      this.contentContainer.addChild(label);
    }
  }
}
