import { BitmapText, Container } from 'pixi.js';
import { t } from '@i18n';
import { createUiText } from '../factories';
import { PIXEL_FONT } from '../fonts';
import { COL_DIM, COL_KEY, COL_LOCKED } from './InventoryConstants';

const RELIC_DEFS: { key: string; icon: string; label: string }[] = [
  { key: 'dash',           icon: '>>', label: 'DASH' },
  { key: 'wallJump',       icon: '||', label: 'WALL' },
  { key: 'doubleJump',     icon: '^^', label: '2JMP' },
  { key: 'waterBreathing', icon: '~~', label: 'AQUA' },
  { key: 'surge',          icon: '##', label: 'SURG' },
];

export function drawInventoryRelicStatus(
  container: Container,
  abilities: readonly string[],
  y: number,
): void {
  const header = createUiText(t('ui.inventory.relics_header'), { fontSize: 8, fill: COL_DIM });
  header.x = 2;
  header.y = y;
  container.addChild(header);
  let nextY = y + 12;

  for (const relic of RELIC_DEFS) {
    const isUnlocked = abilities.includes(relic.key);
    const color = isUnlocked ? COL_KEY : COL_LOCKED;
    const icon = new BitmapText({ text: relic.icon, style: { fontFamily: PIXEL_FONT, fontSize: 7, fill: color } });
    icon.x = 2;
    icon.y = nextY;
    const label = createUiText(relic.label, { fontSize: 7, fill: color });
    label.x = 16;
    label.y = nextY + 1;
    container.addChild(icon);
    container.addChild(label);
    nextY += 11;
  }
}
