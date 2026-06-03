import { BitmapText, Container, Graphics } from 'pixi.js';
import { GameAction, actionKey } from '@core/InputManager';
import { RARITY_COLOR, getDisplayName, type ItemInstance, type ItemWorldProgress } from '@items/ItemInstance';
import type { StrataConfig } from '@data/StrataConfig';
import { t } from '@i18n';
import { PIXEL_FONT } from '@ui/fonts';
import type { UISkin } from '@ui/UISkin';
import {
  create9SlicePanel,
  drawSelectionPulse,
  drawSelectionRow,
  ROW_CHEVRON_COLOR,
  ROW_SELECTED_GLOW_ALPHA,
} from '@ui/ModalPanel';
import { GAME_HEIGHT, GAME_WIDTH, type Game } from '../../Game';

interface ItemWorldStratumPickerRuntimeOptions {
  game: Game;
  getHudSkin: () => UISkin | null;
  getItem: () => ItemInstance;
  getProgress: () => ItemWorldProgress;
  getStrataConfig: () => StrataConfig;
  getClearedStrataFlags: () => boolean[];
  onPick: (stratumIndex: number) => void;
}

const PICKER_W = 560;
const PICKER_PAD = 12;
const PICKER_ROW_H = 18;
const PICKER_ROW_GAP = 2;
const PICKER_LIST_W = 342;
const PICKER_DETAIL_W = 174;
const PICKER_HEADER_H = 32;
const PICKER_FOOTER_H = 24;
const PICKER_BADGE_W = 34;
const PICKER_RIGHT_BADGE_W = 34;
const PICKER_COL_TEXT = 0xcccccc;
const PICKER_COL_DIM = 0xaaaaaa;
const PICKER_COL_MUTED = 0x777777;
const PICKER_COL_BORDER = 0x4a4a6a;
const PICKER_COL_ACCENT = 0x00ced1;
const PICKER_COL_POSITIVE = 0x44ff44;
const PICKER_COL_LOCKED = 0x666666;
const PICKER_COL_GOLD = 0xffd700;

export class ItemWorldStratumPickerRuntime {
  private container: Container | null = null;
  private visible = false;
  private selection = 0;
  private maxSelectable = 0;
  private pulseTimer = 0;
  private pulseG: Graphics | null = null;
  private pulseRect: { w: number; h: number } | null = null;

  constructor(private readonly options: ItemWorldStratumPickerRuntimeOptions) {}

  get isVisible(): boolean {
    return this.visible;
  }

  show(maxSelectable: number): void {
    const config = this.options.getStrataConfig();
    const progress = this.options.getProgress();
    this.visible = true;
    this.maxSelectable = Math.max(1, Math.min(maxSelectable, config.strata.length));
    this.selection = Math.min(progress.deepestUnlocked, this.maxSelectable - 1);
    this.pulseTimer = 0;
    this.draw();
  }

  update(dt: number): void {
    if (!this.visible) return;
    this.pulseTimer += dt;
    this.redrawPulse();
    this.handleInput();
  }

  hide(): void {
    this.visible = false;
    if (this.container?.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container?.destroy({ children: true });
    this.container = null;
    this.pulseG = null;
    this.pulseRect = null;
  }

  destroy(): void {
    this.hide();
  }

  private draw(): void {
    this.hideContainerOnly();

    const config = this.options.getStrataConfig();
    const item = this.options.getItem();
    const progress = this.options.getProgress();
    const totalStrata = config.strata.length;
    const rowHeaderH = 12;
    const rowsH = totalStrata * PICKER_ROW_H + Math.max(0, totalStrata - 1) * PICKER_ROW_GAP;
    const contentH = Math.max(104, rowHeaderH + rowsH);
    const panelH = PICKER_PAD + PICKER_HEADER_H + 6 + contentH + 8 + PICKER_FOOTER_H + PICKER_PAD;

    const root = new Container();
    const dim = new Graphics();
    dim.rect(0, 0, GAME_WIDTH, GAME_HEIGHT).fill({ color: 0x000000, alpha: 0.5 });
    root.addChild(dim);

    const panel = new Container();
    panel.x = Math.floor((GAME_WIDTH - PICKER_W) / 2);
    panel.y = Math.floor((GAME_HEIGHT - panelH) / 2);
    root.addChild(panel);

    const hudSkin = this.options.getHudSkin();
    const frame = hudSkin?.isLoaded ? create9SlicePanel(hudSkin, PICKER_W, panelH) : null;
    if (frame) {
      panel.addChild(frame);
    } else {
      const bg = new Graphics();
      bg.rect(0, 0, PICKER_W, panelH).fill({ color: 0x1a1a2e, alpha: 0.96 });
      bg.rect(0, 0, PICKER_W, panelH).stroke({ color: PICKER_COL_BORDER, width: 1 });
      panel.addChild(bg);
    }

    const rarityColor = RARITY_COLOR[item.rarity] ?? 0xffffff;
    this.addText(panel, 'SELECT ITEM WORLD START', PICKER_PAD, 8, 10, 0xffffff);
    const cycleTag = progress.cycle > 0 ? ` / CYCLE ${progress.cycle}` : '';
    this.addText(
      panel,
      `${getDisplayName(item)} / ${item.rarity.toUpperCase()} / Lv.${item.level}${cycleTag}`,
      PICKER_PAD,
      23,
      7,
      rarityColor,
      360,
    );
    const depthText = this.addText(
      panel,
      `${this.maxSelectable} / ${totalStrata} STRATA`,
      0,
      23,
      7,
      PICKER_COL_ACCENT,
    );
    depthText.x = PICKER_W - PICKER_PAD - depthText.width;

    const headerLine = new Graphics();
    headerLine.moveTo(PICKER_PAD, PICKER_PAD + PICKER_HEADER_H - 1);
    headerLine.lineTo(PICKER_W - PICKER_PAD, PICKER_PAD + PICKER_HEADER_H - 1);
    headerLine.stroke({ width: 1, color: PICKER_COL_BORDER });
    panel.addChild(headerLine);

    const contentY = PICKER_PAD + PICKER_HEADER_H + 6;
    const listX = PICKER_PAD;
    const listY = contentY + rowHeaderH;
    const detailX = listX + PICKER_LIST_W + 14;

    this.addText(panel, t('iw.picker.memory_strata'), listX, contentY, 7, PICKER_COL_MUTED);
    for (let i = 0; i < totalStrata; i++) {
      const y = listY + i * (PICKER_ROW_H + PICKER_ROW_GAP);
      this.drawRow(panel, i, listX, y, PICKER_LIST_W);
    }

    const selectedY = listY + this.selection * (PICKER_ROW_H + PICKER_ROW_GAP);
    this.pulseG = new Graphics();
    this.pulseG.x = listX;
    this.pulseG.y = selectedY;
    panel.addChild(this.pulseG);
    this.pulseRect = { w: PICKER_LIST_W, h: PICKER_ROW_H };
    this.redrawPulse();

    const detailDivider = new Graphics();
    detailDivider.moveTo(detailX - 9, contentY);
    detailDivider.lineTo(detailX - 9, contentY + contentH - 2);
    detailDivider.stroke({ width: 1, color: PICKER_COL_BORDER });
    panel.addChild(detailDivider);
    this.drawDetail(panel, detailX, contentY, PICKER_DETAIL_W, contentH);

    const footerLine = new Graphics();
    const footerY = panelH - PICKER_PAD - PICKER_FOOTER_H - 2;
    footerLine.moveTo(PICKER_PAD, footerY);
    footerLine.lineTo(PICKER_W - PICKER_PAD, footerY);
    footerLine.stroke({ width: 1, color: PICKER_COL_BORDER });
    panel.addChild(footerLine);
    this.drawControls(panel, PICKER_PAD, footerY + 8);

    this.container = root;
    this.options.game.legacyUIContainer.addChild(root);
  }

  private drawRow(parent: Container, index: number, x: number, y: number, w: number): void {
    const config = this.options.getStrataConfig();
    const isSelected = index === this.selection;
    const isLocked = index >= this.maxSelectable;
    const cleared = this.options.getClearedStrataFlags()[index] ?? false;
    const stratumDef = config.strata[index];
    const row = new Graphics();
    row.x = x;
    row.y = y;

    if (isSelected) {
      drawSelectionRow(row, w, PICKER_ROW_H);
    } else if (isLocked) {
      row.rect(0, 0, w, PICKER_ROW_H).fill({ color: 0x000000, alpha: 0.18 });
      row.rect(0, 0, w, PICKER_ROW_H).stroke({ color: 0x2a2a3e, width: 1, alpha: 0.7 });
    } else if (cleared) {
      row.rect(0, 0, w, PICKER_ROW_H).fill({ color: PICKER_COL_POSITIVE, alpha: 0.05 });
    }
    parent.addChild(row);

    if (isSelected) {
      const left = new BitmapText({ text: '\u25B6', style: { fontFamily: PIXEL_FONT, fontSize: 10, fill: ROW_CHEVRON_COLOR } });
      left.x = x + 4;
      left.y = y + 4;
      parent.addChild(left);
      const right = new BitmapText({ text: '\u25C0', style: { fontFamily: PIXEL_FONT, fontSize: 10, fill: ROW_CHEVRON_COLOR } });
      right.x = x + w - 11;
      right.y = y + 4;
      parent.addChild(right);
    }

    const leftBadge = isLocked
      ? t('iw.picker.lock')
      : (isSelected ? t('iw.picker.start') : (cleared ? t('iw.picker.clear') : t('iw.picker.open')));
    const leftBadgeColor = isLocked ? PICKER_COL_LOCKED : (cleared && !isSelected ? PICKER_COL_POSITIVE : PICKER_COL_ACCENT);
    this.drawBadge(parent, x + 20, y + 3, PICKER_BADGE_W, leftBadge, leftBadgeColor, isLocked);

    const nameColor = isLocked
      ? PICKER_COL_MUTED
      : isSelected
        ? 0xffffff
        : cleared
          ? PICKER_COL_POSITIVE
          : PICKER_COL_DIM;
    const suffix = isLocked ? 'Locked' : cleared ? 'Gate Restored' : 'Open';
    this.addText(parent, `Stratum ${index + 1} - ${suffix}`, x + 60, y + 5, 8, nameColor, 150);

    this.addText(
      parent,
      `HP x${stratumDef.hpMul.toFixed(1)}`,
      x + w - 98,
      y + 5,
      7,
      isLocked ? PICKER_COL_MUTED : PICKER_COL_TEXT,
      54,
    );

    const rightBadge = isLocked ? 'LOCK' : (cleared ? 'GATE' : 'OPEN');
    const rightBadgeColor = isLocked ? PICKER_COL_LOCKED : (cleared ? PICKER_COL_POSITIVE : PICKER_COL_ACCENT);
    this.drawBadge(parent, x + w - 42, y + 3, PICKER_RIGHT_BADGE_W, rightBadge, rightBadgeColor, isLocked);
  }

  private drawDetail(parent: Container, x: number, y: number, w: number, h: number): void {
    const config = this.options.getStrataConfig();
    const progress = this.options.getProgress();
    const index = this.selection;
    const def = config.strata[index];
    const cleared = this.options.getClearedStrataFlags()[index] ?? false;
    const gateReady = cleared || !!progress.bossPortals?.[String(index)];
    const title = this.addText(parent, `STRATUM ${index + 1}`, x, y, 10, PICKER_COL_ACCENT);
    title.x = x;
    this.addText(parent, t('iw.picker.current_reentry'), x, y + 13, 7, PICKER_COL_MUTED, w);

    const line = new Graphics();
    line.moveTo(x, y + 28);
    line.lineTo(x + w, y + 28);
    line.stroke({ width: 1, color: PICKER_COL_BORDER });
    parent.addChild(line);

    let sy = y + 36;
    sy = this.drawStat(parent, x, sy, w, t('iw.picker.boss_gate'), gateReady ? t('iw.picker.ready') : t('iw.picker.uncleared'), gateReady ? PICKER_COL_POSITIVE : PICKER_COL_MUTED);
    sy = this.drawStat(parent, x, sy, w, t('iw.picker.enemy_hp'), `x${def.hpMul.toFixed(1)}`, PICKER_COL_TEXT);
    sy = this.drawStat(parent, x, sy, w, t('iw.picker.enemy_atk'), `x${def.atkMul.toFixed(1)}`, PICKER_COL_TEXT);
    this.drawStat(parent, x, sy, w, t('iw.picker.exp'), `x${def.expMultiplier.toFixed(1)}`, PICKER_COL_GOLD);

    this.drawDepthGauge(parent, x, y + h - 18, w);
  }

  private drawStat(parent: Container, x: number, y: number, w: number, label: string, value: string, valueColor: number): number {
    this.addText(parent, label, x, y, 8, PICKER_COL_DIM, Math.floor(w * 0.58));
    const valueText = this.addText(parent, value, 0, y, 8, valueColor, Math.floor(w * 0.42));
    valueText.x = x + w - valueText.width;
    return y + 13;
  }

  private drawDepthGauge(parent: Container, x: number, y: number, w: number): void {
    const total = this.options.getStrataConfig().strata.length;
    if (total <= 0) return;
    const gap = 3;
    const segW = Math.max(10, Math.floor((w - gap * (total - 1)) / total));
    const cleared = this.options.getClearedStrataFlags();
    const gauge = new Graphics();
    for (let i = 0; i < total; i++) {
      const sx = x + i * (segW + gap);
      const locked = i >= this.maxSelectable;
      const selected = i === this.selection;
      const color = selected
        ? PICKER_COL_ACCENT
        : cleared[i]
          ? PICKER_COL_POSITIVE
          : locked
            ? PICKER_COL_LOCKED
            : PICKER_COL_DIM;
      gauge.rect(sx, y, segW, 7).fill({ color, alpha: locked ? 0.42 : 0.85 });
      if (selected) {
        gauge.rect(sx - 1, y - 1, segW + 2, 9).stroke({ color: 0xffffff, width: 1, alpha: 0.75 });
      }
    }
    parent.addChild(gauge);
  }

  private drawControls(parent: Container, x: number, y: number): void {
    let cursorX = x;
    cursorX = this.drawKey(parent, cursorX, y, actionKey(GameAction.MOVE_LEFT));
    cursorX = this.drawKey(parent, cursorX, y, actionKey(GameAction.MOVE_RIGHT));
    cursorX = this.addControlText(parent, t('iw.picker.change'), cursorX + 2, y + 3) + 12;
    cursorX = this.drawKey(parent, cursorX, y, actionKey(GameAction.ATTACK));
    cursorX = this.addControlText(parent, t('iw.picker.enter'), cursorX + 2, y + 3) + 12;
    cursorX = this.drawKey(parent, cursorX, y, actionKey(GameAction.MENU));
    this.addControlText(parent, t('iw.picker.cancel'), cursorX + 2, y + 3);
  }

  private drawKey(parent: Container, x: number, y: number, label: string): number {
    const w = Math.max(14, label.length * 6 + 8);
    const keyBg = new Graphics();
    keyBg.roundRect(x, y, w, 14, 2)
      .fill({ color: 0x1a1a1a, alpha: 0.85 })
      .stroke({ color: PICKER_COL_LOCKED, width: 1 });
    parent.addChild(keyBg);
    const text = this.addText(parent, label, x, y + 3, 8, 0xffffff, w - 4);
    text.x = x + Math.floor((w - text.width) / 2);
    return x + w + 4;
  }

  private addControlText(parent: Container, text: string, x: number, y: number): number {
    const label = this.addText(parent, text, x, y, 8, PICKER_COL_DIM);
    return x + label.width;
  }

  private drawBadge(parent: Container, x: number, y: number, w: number, text: string, color: number, outlineOnly = false): void {
    const badge = new Graphics();
    if (outlineOnly) {
      badge.roundRect(x, y, w, 12, 2).stroke({ color, width: 1 });
    } else {
      badge.roundRect(x, y, w, 12, 2).fill(color);
    }
    parent.addChild(badge);

    const label = this.addText(parent, text, x, y + 2, 7, outlineOnly ? color : 0x000000, w - 4);
    label.x = x + Math.floor((w - label.width) / 2);
  }

  private addText(parent: Container, text: string, x: number, y: number, size: number, fill: number, maxW?: number): BitmapText {
    const label = new BitmapText({
      text,
      style: { fontFamily: PIXEL_FONT, fontSize: size, fill },
    });
    label.x = x;
    label.y = y;
    if (maxW && label.width > maxW) {
      const scale = Math.max(0.55, maxW / label.width);
      label.scale.set(scale, scale);
    }
    parent.addChild(label);
    return label;
  }

  private redrawPulse(): void {
    if (!this.pulseG || !this.pulseRect) return;
    const tSec = this.pulseTimer / 1000;
    const alpha = ROW_SELECTED_GLOW_ALPHA * (0.65 + 0.35 * Math.sin(tSec * Math.PI * 2 * 1.4));
    this.pulseG.clear();
    drawSelectionPulse(this.pulseG, this.pulseRect.w, this.pulseRect.h, alpha);
  }

  private handleInput(): void {
    const input = this.options.game.input;
    if (input.isJustPressed(GameAction.MOVE_LEFT) || input.isJustPressed(GameAction.LOOK_UP)) {
      this.selection = (this.selection - 1 + this.maxSelectable) % this.maxSelectable;
      this.draw();
      return;
    }
    if (input.isJustPressed(GameAction.MOVE_RIGHT) || input.isJustPressed(GameAction.LOOK_DOWN)) {
      this.selection = (this.selection + 1) % this.maxSelectable;
      this.draw();
      return;
    }
    if (input.isJustPressed(GameAction.ATTACK)) {
      const picked = this.selection;
      this.hide();
      this.options.onPick(picked);
      return;
    }
    if (input.isJustPressed(GameAction.MENU) || input.isJustPressed(GameAction.JUMP)) {
      this.hide();
    }
  }

  private hideContainerOnly(): void {
    if (this.container?.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container?.destroy({ children: true });
    this.container = null;
    this.pulseG = null;
    this.pulseRect = null;
  }
}
