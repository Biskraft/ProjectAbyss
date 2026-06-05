import { Container, Graphics } from 'pixi.js';
import type { ItemInstance } from '@items/ItemInstance';
import { t } from '@i18n';
import { STRATA_BY_RARITY } from '@data/StrataConfig';
import { createUiText } from '../factories';
import { COL_KEY, INFO_W } from './InventoryConstants';

export interface InventoryAnvilRadialStatLine {
  label: string;
  value: string;
  key: boolean;
  alert?: boolean;
}

export interface InventoryAnvilRadialGraphLayout {
  radialRowH: number;
  graphX: number;
  labelEndX: number;
  dotsRight: number;
  cxMid: number;
  cy0: number;
  spacing: number;
  totalStrata: number;
  reached: number;
  nextStratum: number;
}

const RARITY_VISUAL_SIDE: Record<string, number> = {
  normal: 1,
  magic: 2,
  rare: 3,
  legendary: 4,
  ancient: 5,
};

export function inventoryAnvilRadialSideCounts(
  rarity: string,
  totalStrata: number,
  level: number,
): { leftN: number; rightN: number } {
  if (level > totalStrata) return { leftN: 0, rightN: 0 };
  const visualSide = RARITY_VISUAL_SIDE[rarity] ?? 1;
  return { leftN: Math.ceil(visualSide / 2), rightN: Math.floor(visualSide / 2) };
}

export function buildInventoryAnvilRadialGraphLayout(
  rarity: string,
  totalStrata: number,
  reached: number,
  nextStratum: number,
  baseY: number,
  graphX: number,
  graphW: number,
): InventoryAnvilRadialGraphLayout {
  const radialRowH = 22;
  const labelW = 14;
  const labelEndX = graphX + labelW + 2;
  const dotsRight = graphX + graphW - 4;
  const cxMid = Math.floor((labelEndX + dotsRight) / 2);
  const cy0 = baseY + Math.floor(radialRowH * 0.5) - 8;

  let maxLeft = 1;
  let maxRight = 1;
  for (let level = 1; level <= totalStrata; level++) {
    const { leftN, rightN } = inventoryAnvilRadialSideCounts(rarity, totalStrata, level);
    maxLeft = Math.max(maxLeft, leftN + 1);
    maxRight = Math.max(maxRight, rightN);
  }
  const leftSpace = cxMid - labelEndX;
  const rightSpace = dotsRight - cxMid;
  const spacing = Math.max(9, Math.min(14, Math.min(leftSpace / maxLeft, rightSpace / Math.max(1, maxRight))));

  return {
    radialRowH,
    graphX,
    labelEndX,
    dotsRight,
    cxMid,
    cy0,
    spacing,
    totalStrata,
    reached,
    nextStratum,
  };
}

export function buildInventoryAnvilRadialStatLines(
  item: ItemInstance,
  playerAtk: number,
): InventoryAnvilRadialStatLine[] {
  const lines: InventoryAnvilRadialStatLine[] = [];
  lines.push({ label: t('ui.inventory.your_atk'), value: String(playerAtk || '??'), key: false });

  const reDiveBonus = 1 + (item.reDiveCount ?? 0) * 0.05;
  const maxAtk = Math.ceil((item.def.baseAtk ?? 0) * 1.5 * reDiveBonus);
  lines.push({ label: t('ui.inventory.max_atk'), value: String(maxAtk || '??'), key: true, alert: playerAtk > 0 && playerAtk < maxAtk });

  const maxShards = ({ normal: 2, magic: 3, rare: 4, legendary: 6, ancient: 8 } as const)[item.rarity] ?? 2;
  const curShards = item.innocents?.length ?? 0;
  lines.push({ label: t('ui.inventory.mem_shard'), value: `${curShards}/${maxShards}`, key: true });

  lines.push({ label: t('ui.inventory.dives'), value: String(item.reDiveCount ?? 0), key: false });
  return lines;
}

export function drawInventoryAnvilRadialStats(
  container: Container,
  lines: readonly InventoryAnvilRadialStatLine[],
  x: number,
  y: number,
  width: number,
): void {
  const statRowH = 16;
  const background = new Graphics();
  const bgY = y - 3;
  const bgH = lines.length * statRowH + 5;
  background.roundRect(x, bgY, width, bgH, 3)
    .fill({ color: 0x05050a, alpha: 0.55 });
  background.roundRect(x, bgY, width, bgH, 3)
    .stroke({ color: 0x2a2a3a, width: 1, alpha: 0.5 });
  container.addChild(background);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineY = y + i * statRowH;
    const labelColor = line.key ? 0xffd470 : 0x888888;
    const labelText = createUiText(line.label, { fontSize: 8, fill: labelColor });
    labelText.x = x + 4;
    labelText.y = lineY + 2;
    container.addChild(labelText);

    const valueColor = line.alert ? 0xff6060 : (line.key ? COL_KEY : 0xcccccc);
    const valueText = createUiText(line.value, { fontSize: 10, fill: valueColor });
    valueText.x = x + width - 4 - valueText.width;
    valueText.y = lineY;
    container.addChild(valueText);
  }
}

export function drawInventoryAnvilRadialMap(
  container: Container,
  item: ItemInstance,
  baseY: number,
  playerAtk: number,
): void {
  const cfg = STRATA_BY_RARITY[item.rarity];
  const totalStrata = cfg.strata.length;
  const reached = item.worldProgress?.deepestUnlocked ?? 0;
  const nextStratum = Math.min(reached + 1, totalStrata);

  const statsX0 = 4;
  const statsW = 76;
  const graphX = statsX0 + statsW + 6;
  const graphW = INFO_W - graphX - 4;

  const lines = buildInventoryAnvilRadialStatLines(item, playerAtk);
  drawInventoryAnvilRadialStats(container, lines, statsX0, baseY, statsW);

  const layout = buildInventoryAnvilRadialGraphLayout(item.rarity, totalStrata, reached, nextStratum, baseY, graphX, graphW);
  drawInventoryAnvilRadialDivePath(container, layout.cxMid, layout.cy0, layout.radialRowH, layout.totalStrata);

  for (let level = 1; level <= 5; level++) {
    const rowY = layout.cy0 + (level - 1) * layout.radialRowH;
    const { leftN, rightN } = inventoryAnvilRadialSideCounts(item.rarity, totalStrata, level);
    drawInventoryAnvilRadialRow(container, {
      level,
      rowY,
      graphX: layout.graphX,
      labelEndX: layout.labelEndX,
      dotsRight: layout.dotsRight,
      cxMid: layout.cxMid,
      spacing: layout.spacing,
      totalStrata: layout.totalStrata,
      reached: layout.reached,
      nextStratum: layout.nextStratum,
      leftN,
      rightN,
    });
  }
}

export function drawInventoryAnvilRadialDivePath(
  container: Container,
  cxMid: number,
  cy0: number,
  radialRowH: number,
  totalStrata: number,
): void {
  const path = new Graphics();
  const drawDashed = (ya: number, yb: number): void => {
    let yy = ya;
    while (yy < yb) {
      const yEnd = Math.min(yy + 3, yb);
      path.moveTo(cxMid, yy).lineTo(cxMid, yEnd)
        .stroke({ color: COL_KEY, width: 1.5, alpha: 0.8 });
      yy += 6;
    }
  };
  const sizeAt = (level: number): number => {
    if (level > totalStrata) return 3.5 + 1;
    const isFinal = level === totalStrata;
    return (isFinal ? 6.5 : 6) + 1;
  };

  const row1Y = cy0;
  drawDashed(row1Y - sizeAt(1) - 6, row1Y - sizeAt(1));
  for (let level = 1; level < 5; level++) {
    const rowTop = cy0 + (level - 1) * radialRowH;
    const rowBottom = cy0 + level * radialRowH;
    drawDashed(rowTop + sizeAt(level), rowBottom - sizeAt(level + 1));
  }
  const row5Y = cy0 + 4 * radialRowH;
  drawDashed(row5Y + sizeAt(5), row5Y + sizeAt(5) + 6);
  container.addChild(path);
}

export interface InventoryAnvilRadialRowOptions {
  level: number;
  rowY: number;
  graphX: number;
  labelEndX: number;
  dotsRight: number;
  cxMid: number;
  spacing: number;
  totalStrata: number;
  reached: number;
  nextStratum: number;
  leftN: number;
  rightN: number;
}

export function drawInventoryAnvilRadialRow(
  container: Container,
  options: InventoryAnvilRadialRowOptions,
): void {
  const {
    level,
    rowY,
    graphX,
    labelEndX,
    dotsRight,
    cxMid,
    spacing,
    totalStrata,
    reached,
    nextStratum,
    leftN,
    rightN,
  } = options;

  const isAvailable = level <= totalStrata;
  const isReached = level <= reached;
  const isNext = isAvailable && level === nextStratum && !isReached;
  const isFinal = isAvailable && level === totalStrata;
  const baseAlpha = isAvailable ? (isReached ? 1 : (isNext ? 0.95 : 0.55)) : 0.32;

  const label = createUiText(`S${level}`, {
    fontSize: 9,
    fill: isNext ? COL_KEY : (isReached ? 0xddddee : (isAvailable ? 0x888888 : 0x555555)),
  });
  label.x = graphX;
  label.y = rowY - 4;
  container.addChild(label);

  const hubX = cxMid - (leftN + 1) * spacing;
  const path = new Graphics();
  const pathColor = isAvailable ? 0x6a4a20 : 0x3a3a44;
  const pathAlpha = baseAlpha * 0.7;
  const drawHSeg = (xa: number, xb: number): void => {
    if (xb > xa) {
      path.moveTo(xa, rowY).lineTo(xb, rowY)
        .stroke({ color: pathColor, width: 1, alpha: pathAlpha });
    }
  };
  const zones: { x: number; sz: number }[] = [];
  if (isAvailable) {
    zones.push({ x: hubX, sz: 3 + 1 });
    for (let i = 1; i <= leftN; i++) zones.push({ x: cxMid - i * spacing, sz: 4 + 1 });
    zones.push({ x: cxMid, sz: (isFinal ? 6.5 : 6) + 1 });
    for (let i = 1; i <= rightN; i++) zones.push({ x: cxMid + i * spacing, sz: 4 + 1 });
    zones.sort((a, b) => a.x - b.x);
  } else {
    zones.push({ x: cxMid, sz: 3.5 + 1 });
  }
  let x = labelEndX - 2;
  for (const zone of zones) {
    drawHSeg(x, zone.x - zone.sz);
    x = zone.x + zone.sz;
  }
  drawHSeg(x, dotsRight);
  container.addChild(path);

  if (!isAvailable) {
    const lock = new Graphics();
    const sz = 3.5;
    lock.poly([cxMid, rowY - sz, cxMid + sz, rowY, cxMid, rowY + sz, cxMid - sz, rowY])
      .stroke({ color: 0x666677, width: 1.2, alpha: baseAlpha });
    container.addChild(lock);
    return;
  }

  const nodes = new Graphics();
  const hubSize = 3;
  nodes.poly([hubX, rowY - hubSize, hubX + hubSize, rowY, hubX, rowY + hubSize, hubX - hubSize, rowY])
    .fill({ color: 0xcccccc, alpha: baseAlpha });

  for (let i = 1; i <= leftN; i++) {
    const bx = cxMid - i * spacing;
    const sz = 4;
    const diamond = [bx, rowY - sz, bx + sz, rowY, bx, rowY + sz, bx - sz, rowY];
    nodes.poly(diamond).fill({ color: COL_KEY, alpha: baseAlpha });
  }

  const centerSize = isFinal ? 6.5 : 6;
  const centerDiamond = [cxMid, rowY - centerSize, cxMid + centerSize, rowY, cxMid, rowY + centerSize, cxMid - centerSize, rowY];
  if (isNext) {
    nodes.poly(centerDiamond).stroke({ color: COL_KEY, width: 2, alpha: 1 });
  } else {
    const bossColor = isFinal ? 0xff4d4d : COL_KEY;
    nodes.poly(centerDiamond).fill({ color: bossColor, alpha: baseAlpha });
    nodes.poly([cxMid, rowY - 2, cxMid + 2, rowY, cxMid, rowY + 2, cxMid - 2, rowY])
      .fill({ color: 0x1a1a1a, alpha: baseAlpha });
  }

  for (let i = 1; i <= rightN; i++) {
    const bx = cxMid + i * spacing;
    const sz = 4;
    const diamond = [bx, rowY - sz, bx + sz, rowY, bx, rowY + sz, bx - sz, rowY];
    nodes.poly(diamond).stroke({ color: COL_KEY, width: 1.2, alpha: baseAlpha * 0.75 });
  }

  container.addChild(nodes);
}
