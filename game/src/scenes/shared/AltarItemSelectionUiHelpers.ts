import { BitmapText, Container, Graphics } from 'pixi.js';
import { t } from '@i18n';
import { getDisplayName, type ItemInstance } from '@items/ItemInstance';
import { PIXEL_FONT } from '@ui/fonts';
import { GAME_HEIGHT, GAME_WIDTH } from '../../Game';

export interface AltarItemSelectionShell {
  container: Container;
  rowX: number;
  rowY: number;
  rowHeight: number;
}

export function createAltarItemSelectionShell({
  itemCount,
  titleText,
  titleFill,
  backgroundFill,
  backgroundAlpha,
  borderFill,
}: {
  itemCount: number;
  titleText: string;
  titleFill: number;
  backgroundFill: number;
  backgroundAlpha: number;
  borderFill: number;
}): AltarItemSelectionShell {
  const container = new Container();
  const panelW = 260;
  const panelH = 20 + itemCount * 12;
  const px = Math.floor((GAME_WIDTH - panelW) / 2);
  const py = Math.floor((GAME_HEIGHT - panelH) / 2);

  const bg = new Graphics();
  bg.rect(0, 0, panelW, panelH).fill({ color: backgroundFill, alpha: backgroundAlpha });
  bg.rect(0, 0, panelW, panelH).stroke({ color: borderFill, width: 1 });
  bg.x = px;
  bg.y = py;
  container.addChild(bg);

  const title = new BitmapText({
    text: titleText,
    style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: titleFill },
  });
  title.x = px + 6;
  title.y = py + 4;
  container.addChild(title);

  return {
    container,
    rowX: px + 6,
    rowY: py + 16,
    rowHeight: 12,
  };
}

export interface AltarItemRowsOptions {
  container: Container;
  items: ItemInstance[];
  selectedIndex: number;
  equippedUid?: number;
  x: number;
  y: number;
  rowHeight: number;
  selectedFill: number;
  normalFill: number;
}

export function addAltarItemRows(options: AltarItemRowsOptions): void {
  const {
    container,
    items,
    selectedIndex,
    equippedUid,
    x,
    y,
    rowHeight,
    selectedFill,
    normalFill,
  } = options;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const selected = i === selectedIndex;
    const prefix = selected ? '> ' : '  ';
    const equipped = equippedUid === item.uid ? t('ui.altar.equipped_suffix') : '';
    const label = `${prefix}${t('ui.altar.item_row', {
      name: getDisplayName(item),
      level: item.level,
      rarity: item.rarity.toUpperCase(),
      equipped,
    })}`;
    const row = new BitmapText({
      text: label,
      style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: selected ? selectedFill : normalFill },
    });
    row.x = x;
    row.y = y + i * rowHeight;
    container.addChild(row);
  }
}
