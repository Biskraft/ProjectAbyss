import { isFullscreenActive } from '@core/Fullscreen';
import type { PresetName } from '@core/InputManager';
import type { SettingsData } from '@core/SettingsStore';
import { t } from '@i18n';
import { PRESETS_DATA, type SettingsRow } from './PauseMenuConstants';
import {
  adjustSettingsAudioVolume,
  getSettingsAudioMuted,
  getSettingsAudioVolume,
  isSettingsAudioRow,
} from './PauseMenuAudio';

function cycle<const T extends string>(values: readonly T[], current: T, dir: number): T {
  const idx = Math.max(0, values.indexOf(current));
  return values[(idx + dir + values.length) % values.length];
}

export function adjustSettingsRowValue(settings: SettingsData, row: SettingsRow, dir: number): boolean {
  switch (row.id) {
    case 'language':
      settings.gameplay.language = cycle(['ko', 'en'] as const, settings.gameplay.language, dir);
      return true;
    case 'scale':
      settings.display.scale = cycle(['auto', '1x', '2x', '3x'] as const, settings.display.scale, dir);
      return true;
    case 'scale_filter':
      settings.display.scaleFilter = cycle(['sharp', 'smooth'] as const, settings.display.scaleFilter, dir);
      return true;
    case 'shake':
      settings.display.shake = cycle(['off', 'low', 'full'] as const, settings.display.shake, dir);
      return true;
    case 'show_fps':
      settings.display.showFps = !settings.display.showFps;
      return true;
    case 'rumble':
      settings.controls.rumble = cycle(['off', 'low', 'full'] as const, settings.controls.rumble, dir);
      return true;
    default:
      if (!isSettingsAudioRow(row.id)) return false;
      adjustSettingsAudioVolume(settings, row.id, dir);
      return true;
  }
}

export function settingsRowValue(
  settings: SettingsData,
  row: SettingsRow,
  currentPreset: PresetName | null | undefined,
): string {
  switch (row.id) {
    case 'language':
      return t(settings.gameplay.language === 'ko' ? 'ui.settings.value.ko' : 'ui.settings.value.en');
    case 'window_mode':
      return t(isFullscreenActive() ? 'ui.settings.value.fullscreen' : 'ui.settings.value.windowed');
    case 'scale':
      return t(`ui.settings.value.${settings.display.scale}`);
    case 'scale_filter':
      return t(settings.display.scaleFilter === 'sharp' ? 'ui.settings.value.sharp' : 'ui.settings.value.smooth');
    case 'shake':
      return t(`ui.settings.value.${settings.display.shake}`);
    case 'show_fps':
      return t(settings.display.showFps ? 'ui.settings.value.on' : 'ui.settings.value.off');
    case 'keyboard_preset':
      return t(PRESETS_DATA.find(p => p.name === currentPreset)?.labelKey ?? 'ui.pause.preset_modern_label');
    case 'rumble':
      return t(`ui.settings.value.${settings.controls.rumble}`);
    case 'back':
      return '';
    default:
      if (!isSettingsAudioRow(row.id)) return '';
      const pct = Math.round(getSettingsAudioVolume(settings, row.id) * 100);
      return getSettingsAudioMuted(settings, row.id) ? `${pct} ${t('ui.settings.value.muted')}` : String(pct);
  }
}
