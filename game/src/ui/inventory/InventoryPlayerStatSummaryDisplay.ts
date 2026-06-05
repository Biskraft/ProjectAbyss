import { Container, Graphics } from 'pixi.js';
import { t } from '@i18n';
import { createUiText } from '../factories';
import {
  COL_BORDER,
  COL_DIM,
  COL_KEY,
  COL_NEGATIVE,
  COL_POSITIVE,
} from './InventoryConstants';

export interface InventoryPlayerStatSummary {
  hpText: string;
  atkText: string;
  atkDelta: number;
}

export function drawInventoryPlayerStatSummary(
  container: Container,
  summary: InventoryPlayerStatSummary,
  width: number,
): number {
  let y = 0;

  const header = createUiText(t('ui.inventory.status_header'), { fontSize: 8, fill: COL_DIM });
  header.x = 2;
  header.y = y;
  container.addChild(header);
  y += 14;

  const hpLabel = createUiText(t('ui.character.hp_label'), { fontSize: 8, fill: COL_DIM });
  const hpValue = createUiText(summary.hpText, { fontSize: 8, fill: 0xee4444 });
  hpLabel.x = 2;
  hpLabel.y = y;
  hpValue.x = width - hpValue.width;
  hpValue.y = y;
  container.addChild(hpLabel);
  container.addChild(hpValue);
  y += 12;

  const atkLabel = createUiText(t('ui.inventory.atk_label'), { fontSize: 8, fill: COL_DIM });
  const atkValue = createUiText(summary.atkText, { fontSize: 8, fill: COL_KEY });
  atkLabel.x = 2;
  atkLabel.y = y;
  atkValue.x = width - atkValue.width;
  atkValue.y = y;
  container.addChild(atkLabel);
  container.addChild(atkValue);
  y += 10;

  if (summary.atkDelta !== 0) {
    const sign = summary.atkDelta > 0 ? '+' : '';
    const deltaColor = summary.atkDelta > 0 ? COL_POSITIVE : COL_NEGATIVE;
    const deltaText = createUiText(`${sign}${summary.atkDelta}`, { fontSize: 7, fill: deltaColor });
    deltaText.x = width - deltaText.width;
    deltaText.y = y;
    container.addChild(deltaText);
  }
  y += 10;

  const divider = new Graphics();
  divider.moveTo(2, y).lineTo(width, y).stroke({ color: COL_BORDER, width: 1 });
  container.addChild(divider);
  return y + 6;
}
