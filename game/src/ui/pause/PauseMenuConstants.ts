import { GAME_HEIGHT, GAME_WIDTH } from '../../Game';
import type { PresetName } from '@core/InputManager';
import type { AudioChannel } from '@audio/AudioBus';
import {
  MODAL_BG,
  MODAL_BORDER,
  ROW_CHEVRON_COLOR,
  TEXT_NEGATIVE,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_WARNING,
} from '../ModalPanel';

export const PANEL_W = 200;
export const PANEL_H = 174;
export const PANEL_X = Math.floor((GAME_WIDTH - PANEL_W) / 2);
export const PANEL_Y = Math.floor((GAME_HEIGHT - PANEL_H) / 2);
export const ITEM_START_Y = 36;
export const ITEM_SPACING = 18;
export const ROW_PAD_X = 10;
export const ROW_H = 14;
export const CHEVRON_INSET = 4;

export const COL_BG = MODAL_BG;
export const COL_BORDER = MODAL_BORDER;
export const COL_TEXT = TEXT_PRIMARY;
export const COL_DIM = TEXT_SECONDARY;
export const COL_DANGER = TEXT_NEGATIVE;
export const COL_WARNING = TEXT_WARNING;
export const COL_ACCENT = ROW_CHEVRON_COLOR;

export type MenuItem = { labelKey: string; action: string; color?: number };

export const MENU_ITEMS: MenuItem[] = [
  { labelKey: 'ui.pause.continue', action: 'continue' },
  { labelKey: 'ui.pause.settings', action: 'settings' },
  { labelKey: 'ui.pause.status', action: 'status' },
  { labelKey: 'ui.pause.quit_to_title', action: 'quit', color: COL_DANGER },
];

export const PRESETS_DATA: { name: PresetName; labelKey: string; descKey: string }[] = [
  { name: 'classic', labelKey: 'ui.pause.preset_classic_label', descKey: 'ui.pause.preset_classic_desc' },
  { name: 'modern', labelKey: 'ui.pause.preset_modern_label', descKey: 'ui.pause.preset_modern_desc' },
  { name: 'wasd', labelKey: 'ui.pause.preset_wasd_label', descKey: 'ui.pause.preset_wasd_desc' },
];

export const PRESET_PANEL_W = 280;
export const PRESET_PANEL_H = 156;
export const PRESET_ROW_H = 28;
export const PRESET_ROW_PAD_X = 10;
export const PRESET_LIST_Y = 30;

export type AudioRow =
  | { kind: 'master'; labelKey: string }
  | { kind: 'channel'; channel: AudioChannel; labelKey: string };

export const AUDIO_ROWS: AudioRow[] = [
  { kind: 'master', labelKey: 'ui.settings.audio.master' },
  { kind: 'channel', channel: 'bgm', labelKey: 'ui.settings.audio.bgm' },
  { kind: 'channel', channel: 'ambient', labelKey: 'ui.settings.audio.ambient' },
  { kind: 'channel', channel: 'sfx', labelKey: 'ui.settings.audio.sfx' },
  { kind: 'channel', channel: 'voice', labelKey: 'ui.settings.audio.voice' },
];

export const AUDIO_PANEL_W = 240;
export const AUDIO_PANEL_H = 178;
export const AUDIO_ROW_H = 22;
export const AUDIO_ROW_PAD_X = 12;
export const AUDIO_LIST_Y = 30;

export type SettingsTab = 'gameplay' | 'display' | 'audio' | 'controls';
export type SettingsRowId =
  | 'language'
  | 'window_mode'
  | 'scale'
  | 'scale_filter'
  | 'shake'
  | 'show_fps'
  | 'audio_master'
  | 'audio_bgm'
  | 'audio_ambient'
  | 'audio_sfx'
  | 'audio_voice'
  | 'keyboard_preset'
  | 'rumble'
  | 'back';

export interface SettingsRow {
  id: SettingsRowId;
  labelKey: string;
}

export const SETTINGS_TABS: Array<{ id: SettingsTab; labelKey: string }> = [
  { id: 'gameplay', labelKey: 'ui.settings.tab.gameplay' },
  { id: 'display', labelKey: 'ui.settings.tab.display' },
  { id: 'audio', labelKey: 'ui.settings.tab.audio' },
  { id: 'controls', labelKey: 'ui.settings.tab.controls' },
];

export const SETTINGS_PANEL_W = 300;
export const SETTINGS_PANEL_H = 226;
export const SETTINGS_ROW_H = 18;
export const SETTINGS_ROW_PAD_X = 12;
export const SETTINGS_TAB_Y = 30;
export const SETTINGS_LIST_Y = 56;

export const GAMEPLAY_ROWS: SettingsRow[] = [
  { id: 'language', labelKey: 'ui.settings.gameplay.language' },
  { id: 'back', labelKey: 'ui.settings.back' },
];

export const DISPLAY_ROWS: SettingsRow[] = [
  { id: 'window_mode', labelKey: 'ui.settings.display.window_mode' },
  { id: 'scale', labelKey: 'ui.settings.display.scale' },
  { id: 'scale_filter', labelKey: 'ui.settings.display.scale_filter' },
  { id: 'shake', labelKey: 'ui.settings.display.shake' },
  { id: 'show_fps', labelKey: 'ui.settings.display.show_fps' },
  { id: 'back', labelKey: 'ui.settings.back' },
];

export const SETTINGS_AUDIO_ROWS: SettingsRow[] = [
  { id: 'audio_master', labelKey: 'ui.settings.audio.master' },
  { id: 'audio_bgm', labelKey: 'ui.settings.audio.bgm' },
  { id: 'audio_ambient', labelKey: 'ui.settings.audio.ambient' },
  { id: 'audio_sfx', labelKey: 'ui.settings.audio.sfx' },
  { id: 'audio_voice', labelKey: 'ui.settings.audio.voice' },
  { id: 'back', labelKey: 'ui.settings.back' },
];

export const CONTROLS_ROWS: SettingsRow[] = [
  { id: 'keyboard_preset', labelKey: 'ui.settings.controls.keyboard_preset' },
  { id: 'rumble', labelKey: 'ui.settings.controls.rumble' },
  { id: 'back', labelKey: 'ui.settings.back' },
];
