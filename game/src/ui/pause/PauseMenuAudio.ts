import { AudioBus } from '@audio/AudioBus';
import type { SettingsData } from '@core/SettingsStore';
import type { AudioRow, SettingsRowId } from './PauseMenuConstants';

export type SettingsAudioRowId = Extract<
  SettingsRowId,
  'audio_master' | 'audio_bgm' | 'audio_ambient' | 'audio_sfx' | 'audio_voice'
>;

export function getAudioRowVolume(row: AudioRow): number {
  return row.kind === 'master' ? AudioBus.getMasterVolume() : AudioBus.getChannelVolume(row.channel);
}

export function setAudioRowVolume(row: AudioRow, value: number): void {
  if (row.kind === 'master') AudioBus.setMasterVolume(value);
  else AudioBus.setChannelVolume(row.channel, value);
}

export function adjustAudioRowVolume(row: AudioRow, dir: number): void {
  setAudioRowVolume(row, nextSnappedAudioVolume(getAudioRowVolume(row), dir));
}

export function isSettingsAudioRow(id: SettingsRowId): id is SettingsAudioRowId {
  return id === 'audio_master'
    || id === 'audio_bgm'
    || id === 'audio_ambient'
    || id === 'audio_sfx'
    || id === 'audio_voice';
}

export function getSettingsAudioVolume(settings: SettingsData, id: SettingsAudioRowId): number {
  switch (id) {
    case 'audio_master': return settings.audio.master;
    case 'audio_bgm': return settings.audio.bgm;
    case 'audio_ambient': return settings.audio.ambient;
    case 'audio_sfx': return settings.audio.sfx;
    case 'audio_voice': return settings.audio.voice;
  }
}

export function getSettingsAudioMuted(settings: SettingsData, id: SettingsAudioRowId): boolean {
  switch (id) {
    case 'audio_master': return settings.audio.masterMuted;
    case 'audio_bgm': return settings.audio.bgmMuted;
    case 'audio_ambient': return settings.audio.ambientMuted;
    case 'audio_sfx': return settings.audio.sfxMuted;
    case 'audio_voice': return settings.audio.voiceMuted;
  }
}

export function setSettingsAudioVolume(
  settings: SettingsData,
  id: SettingsAudioRowId,
  value: number,
): void {
  switch (id) {
    case 'audio_master': settings.audio.master = value; break;
    case 'audio_bgm': settings.audio.bgm = value; break;
    case 'audio_ambient': settings.audio.ambient = value; break;
    case 'audio_sfx': settings.audio.sfx = value; break;
    case 'audio_voice': settings.audio.voice = value; break;
  }
}

export function toggleSettingsAudioMute(settings: SettingsData, id: SettingsAudioRowId): void {
  switch (id) {
    case 'audio_master': settings.audio.masterMuted = !settings.audio.masterMuted; break;
    case 'audio_bgm': settings.audio.bgmMuted = !settings.audio.bgmMuted; break;
    case 'audio_ambient': settings.audio.ambientMuted = !settings.audio.ambientMuted; break;
    case 'audio_sfx': settings.audio.sfxMuted = !settings.audio.sfxMuted; break;
    case 'audio_voice': settings.audio.voiceMuted = !settings.audio.voiceMuted; break;
  }
}

export function adjustSettingsAudioVolume(
  settings: SettingsData,
  id: SettingsAudioRowId,
  dir: number,
): void {
  setSettingsAudioVolume(settings, id, nextSnappedAudioVolume(getSettingsAudioVolume(settings, id), dir));
}

function nextSnappedAudioVolume(currentVolume: number, dir: number): number {
  const curPct = Math.round(currentVolume * 100);
  const snapped = Math.round(curPct / 10) * 10;
  const nextPct = Math.max(0, Math.min(100, snapped + dir * 10));
  return nextPct / 100;
}
