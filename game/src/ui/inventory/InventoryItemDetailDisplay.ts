import { Container, Graphics } from 'pixi.js';
import { getStageFragment } from '@data/fragments';
import { getCurrentStage, getDisplayName, type ItemInstance } from '@items/ItemInstance';
import { t } from '@i18n';
import { createUiText } from '../factories';
import { COL_BORDER, COL_DIM } from './InventoryConstants';
import {
  getFragmentStagesForRarity,
  getInventoryRecoveryMeta,
  getTotalFragmentsForRarity,
} from './InventoryItemInfo';

export function drawInventoryEmptyItemInfo(container: Container, y: number): void {
  const empty = createUiText(t('ui.inventory.no_items_to_dive'), { fontSize: 9, fill: COL_DIM });
  empty.x = 4;
  empty.y = y;
  container.addChild(empty);
}

export function drawInventoryItemIdentityHeader(
  container: Container,
  item: ItemInstance,
  y: number,
  width: number,
  rarityColor: number,
): number {
  const nameText = createUiText(getDisplayName(item), {
    fontSize: 11,
    fill: rarityColor,
    wordWrap: true,
    wordWrapWidth: width,
  });
  nameText.x = 4;
  nameText.y = y;
  container.addChild(nameText);
  let nextY = y + 14;

  const meta = createUiText(
    getInventoryRecoveryMeta(item),
    { fontSize: 8, fill: COL_DIM },
  );
  meta.x = 4;
  meta.y = nextY;
  container.addChild(meta);
  nextY += 12;

  return nextY;
}

export function drawInventoryDivider(container: Container, y: number, width: number): number {
  const divider = new Graphics();
  divider.moveTo(4, y).lineTo(width, y).stroke({ color: COL_BORDER, width: 1 });
  container.addChild(divider);
  return y + 5;
}

export function drawInventoryRecoveryBar(
  container: Container,
  item: ItemInstance,
  y: number,
  width: number,
  rarityColor: number,
): number {
  const barW = width - 4;
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
  container.addChild(bar);
  return y + 10;
}

export function drawInventoryRediveCounter(
  container: Container,
  item: ItemInstance,
  y: number,
): number {
  if (item.memoryRecovery < 100) return y;

  const reDiveText = createUiText(t('ui.inventory.redive_count', { count: item.reDiveCount }), { fontSize: 7, fill: COL_DIM });
  reDiveText.x = 4;
  reDiveText.y = y;
  container.addChild(reDiveText);
  return y + 10;
}

export function drawInventoryFragmentLines(
  container: Container,
  item: ItemInstance,
  y: number,
  width: number,
): number {
  const totalFragmentsForRarity = getTotalFragmentsForRarity(item);
  const stages = getFragmentStagesForRarity(item);
  let fragmentsShown = 0;
  let nextY = y;

  for (const fragStage of stages) {
    if (fragmentsShown >= 4) break;
    const fragment = getStageFragment(item.def.id, fragStage);
    const isUnlocked = item.unlockedFragments.includes(`${item.def.id}_stage_${fragStage}`);
    const fragmentText = fragment ? (fragment.textKo || fragment.textEn) : '';
    const text = isUnlocked && fragment
      ? `▸ "${fragmentText.slice(0, 38)}${fragmentText.length > 38 ? '…' : ''}"`
      : t('ui.inventory.fragment_placeholder');
    const color = isUnlocked ? 0xffffff : 0x555555;
    const fontSize = (fragStage === 4 && isUnlocked) ? 8 : 7;
    const line = createUiText(text, { fontSize, fill: color, wordWrap: true, wordWrapWidth: width });
    line.x = 4;
    line.y = nextY;
    container.addChild(line);
    nextY += Math.max(10, Math.floor((line.height ?? 10)));
    fragmentsShown++;
  }

  if (totalFragmentsForRarity === 0) {
    const fallback = createUiText(t('ui.inventory.fragment_placeholder'), { fontSize: 7, fill: 0x555555 });
    fallback.x = 4;
    fallback.y = nextY;
    container.addChild(fallback);
    nextY += 10;
  }

  return nextY;
}
