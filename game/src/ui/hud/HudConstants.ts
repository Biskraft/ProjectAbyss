import { HudConst } from '@data/constData';
import { TEXT_GOLD } from '../ModalPanel';

// Base values at 640x360. Multiplied by uiScale for native resolution.
export const BASE_W = 640;
export const BASE_H = 360;
export const BASE_MARGIN = 8;
export const BASE_HP_W = 180;
export const BASE_HP_H = 16;
export const BASE_FLASK_SIZE = 20;
export const BASE_FLASK_GAP = 3;
export const BASE_FONT = 8;
// HP text uses its own larger font (Playtest 2026-04-27: max HP visibility).
export const BASE_HP_FONT = 16;
export const BASE_BOSS_W = 140;
export const BASE_BOSS_H = 8;

export const HP_BORDER_COLOR = 0x444444;
export const HP_BG_COLOR = 0x222222;
export const FLASK_FULL_COLOR = 0xff8833;
export const FLASK_EMPTY_COLOR = 0x444444;
export const FLASK_MAX_DISPLAY = 8;

// SSoT: Sheets/Content_ConstData.csv (HUD.Timing.*)
export const GHOST_BAR_DURATION = HudConst.Timing.GhostBarFadeMs;
export const HEAL_FLASH_DURATION = HudConst.Timing.HealFlashMs;
export const BOSS_HEAL_FLASH_DURATION = HudConst.Timing.BossHealFlashMs;
export const LOW_HP_PULSE_PERIOD = HudConst.Timing.LowHpPulsePeriodMs;
export const HP_TEXT_FLASH_DURATION = HudConst.Timing.HpTextFlashMs;
/** Pulse the [R] flask prompt when HP ratio drops at or below this threshold. */
export const FLASK_LOW_HP_THRESHOLD = HudConst.Timing.FlaskLowHpThreshold;
/** One complete flask/item-key pulse period in ms. */
export const FLASK_PULSE_PERIOD = HudConst.Timing.FlaskPulsePeriodMs;

// Item EXP bar.
export const BASE_EXP_W = 60;
export const BASE_EXP_H = 4;
export const EXP_BG_COLOR = 0x222222;
export const EXP_BAR_COLOR = TEXT_GOLD;
export const EXP_BAR_MAX_COLOR = 0xff8833;
export const EXP_LERP_DURATION = HudConst.Timing.ExpLerpMs;
export const EXP_LEVELUP_FLASH_DURATION = HudConst.Timing.ExpLevelupFlashMs;
