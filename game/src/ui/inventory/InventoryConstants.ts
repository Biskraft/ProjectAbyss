import {
  MODAL_BG,
  MODAL_BORDER,
  TEXT_NEGATIVE,
  TEXT_POSITIVE,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '../ModalPanel';

export const PADDING_H = 8;
export const PADDING_V = 8;
export const COL_GAP = 6;

export const CELL_W = 34;
export const CELL_H = 34;
export const CELL_GAP = 2;
export const GRID_COLS = 4;
export const GRID_ROWS = 6;

export const GRID_W = GRID_COLS * CELL_W + (GRID_COLS - 1) * CELL_GAP;
export const INFO_W = 200;
export const STATUS_W = 150;

export const GRID_COL_X = PADDING_H;
export const INFO_COL_X = PADDING_H + GRID_W + COL_GAP;
export const STATUS_COL_X = INFO_COL_X + INFO_W + COL_GAP;

export const TITLE_H = 12;
export const TITLE_GAP = 2;
export const TAB_H = 14;
export const TAB_GAP = 2;
export const CONTENT_START_Y = PADDING_V + TITLE_H + TITLE_GAP + TAB_H + TAB_GAP;

export const PANEL_W = 520;
export const PANEL_H = 254;

export const COL_PANEL_BG = MODAL_BG;
export const COL_BORDER = MODAL_BORDER;
export const COL_TEXT = TEXT_PRIMARY;
export const COL_DIM = TEXT_SECONDARY;
export const COL_POSITIVE = TEXT_POSITIVE;
export const COL_NEGATIVE = TEXT_NEGATIVE;
export const COL_DIVE = 0x00ced1;
export const COL_CLEARED = 0x44ff44;
export const COL_LOCKED = 0x555555;
export const COL_EQUIPPED_BAR = 0xff8c00;
export const COL_KEY = 0xffa41b;
