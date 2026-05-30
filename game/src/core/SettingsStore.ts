/**
 * SettingsStore.ts - player options persistence (localStorage).
 *
 * Storage key stays `echoris-settings` to preserve the existing audio-only
 * settings. Missing fields are merged with defaults so older saves migrate
 * without a reset.
 *
 * Catalog: Documents/System/System_Settings_Options.md.
 */

import { AudioBus, type AudioChannel } from '@audio/AudioBus';
import { getLocale, setLocale, type Locale } from '@i18n';

export const SETTINGS_STORAGE_KEY = 'echoris-settings';
const SCHEMA_VERSION = 1;

export const AUDIO_CHANNELS = ['bgm', 'ambient', 'sfx', 'voice'] as const satisfies readonly AudioChannel[];

export type DisplayScale = 'auto' | '1x' | '2x' | '3x';
export type ScaleFilter = 'sharp' | 'smooth';
export type ShakeLevel = 'off' | 'low' | 'full';
export type WindowMode = 'windowed' | 'fullscreen';
export type MinimapMode = 'on' | 'combat' | 'off';
export type HudMode = 'full' | 'minimal' | 'off';
export type RumbleLevel = 'off' | 'low' | 'full';
export type PadGlyphMode = 'auto' | 'xbox' | 'playstation' | 'nintendo';

export interface AudioSettingsData {
  master: number;
  bgm: number;
  ambient: number;
  sfx: number;
  voice: number;
  masterMuted: boolean;
  bgmMuted: boolean;
  ambientMuted: boolean;
  sfxMuted: boolean;
  voiceMuted: boolean;
  muteUnfocus: boolean;
}

export interface GameplaySettings {
  language: Locale;
  damageNumbers: boolean;
  tutorialHints: boolean;
  minimap: MinimapMode;
  hud: HudMode;
  autoPause: boolean;
}

export interface DisplaySettings {
  windowMode: WindowMode;
  scale: DisplayScale;
  scaleFilter: ScaleFilter;
  shake: ShakeLevel;
  parallax: boolean;
  showFps: boolean;
}

export interface ControlsSettings {
  rumble: RumbleLevel;
  padGlyph: PadGlyphMode;
  deadzone: number;
}

export interface SettingsData {
  version: number;
  gameplay: GameplaySettings;
  display: DisplaySettings;
  audio: AudioSettingsData;
  controls: ControlsSettings;
}

const DEFAULT_SETTINGS: SettingsData = {
  version: SCHEMA_VERSION,
  gameplay: {
    language: getLocale(),
    damageNumbers: true,
    tutorialHints: true,
    minimap: 'on',
    hud: 'full',
    autoPause: true,
  },
  display: {
    windowMode: 'windowed',
    scale: 'auto',
    scaleFilter: 'sharp',
    shake: 'full',
    parallax: true,
    showFps: false,
  },
  audio: {
    master: 1.0,
    bgm: 0.55,
    ambient: 0.225,
    sfx: 0.80,
    voice: 0.70,
    masterMuted: false,
    bgmMuted: false,
    ambientMuted: false,
    sfxMuted: false,
    voiceMuted: false,
    muteUnfocus: true,
  },
  controls: {
    rumble: 'full',
    padGlyph: 'auto',
    deadzone: 0.20,
  },
};

export function defaultSettings(): SettingsData {
  return structuredClone(DEFAULT_SETTINGS);
}

export function loadSettings(): SettingsData {
  return normalizeSettings(readRaw());
}

export function saveSettings(settings: SettingsData): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalizeSettings(settings)));
  } catch {
    /* localStorage unavailable - keep in-memory runtime values only. */
  }
}

export function applyAudioSettings(audio: AudioSettingsData): void {
  AudioBus.setMasterVolume(audio.master);
  AudioBus.setMasterMuted(audio.masterMuted);
  for (const ch of AUDIO_CHANNELS) {
    AudioBus.setChannelVolume(ch, audio[ch]);
    AudioBus.setChannelMuted(ch, audio[`${ch}Muted`]);
  }
}

export function applyGameplaySettings(gameplay: GameplaySettings): void {
  setLocale(gameplay.language);
}

export function applySettingsData(settings: SettingsData): void {
  applyGameplaySettings(settings.gameplay);
  applyAudioSettings(settings.audio);
}

export function loadAndApplySettings(): SettingsData {
  const settings = loadSettings();
  applySettingsData(settings);
  return settings;
}

/** Backward-compatible boot hook used by older callers. */
export function loadAndApplyAudio(): void {
  applyAudioSettings(loadSettings().audio);
}

/** Backward-compatible audio-only snapshot used by older UI paths. */
export function saveAudio(): void {
  const settings = loadSettings();
  settings.audio = snapshotAudioSettings(settings.audio);
  saveSettings(settings);
}

function readRaw(): unknown {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function normalizeSettings(raw: unknown): SettingsData {
  const source = isRecord(raw) ? raw : {};
  const settings = defaultSettings();
  settings.version = SCHEMA_VERSION;

  const gameplay = isRecord(source.gameplay) ? source.gameplay : {};
  settings.gameplay.language = pick(gameplay.language, ['en', 'ko'], settings.gameplay.language);
  settings.gameplay.damageNumbers = boolOr(gameplay.damageNumbers, settings.gameplay.damageNumbers);
  settings.gameplay.tutorialHints = boolOr(gameplay.tutorialHints, settings.gameplay.tutorialHints);
  settings.gameplay.minimap = pick(gameplay.minimap, ['on', 'combat', 'off'], settings.gameplay.minimap);
  settings.gameplay.hud = pick(gameplay.hud, ['full', 'minimal', 'off'], settings.gameplay.hud);
  settings.gameplay.autoPause = boolOr(gameplay.autoPause, settings.gameplay.autoPause);

  const display = isRecord(source.display) ? source.display : {};
  settings.display.windowMode = pick(display.windowMode, ['windowed', 'fullscreen'], settings.display.windowMode);
  settings.display.scale = pick(display.scale, ['auto', '1x', '2x', '3x'], settings.display.scale);
  settings.display.scaleFilter = pick(display.scaleFilter, ['sharp', 'smooth'], settings.display.scaleFilter);
  settings.display.shake = normalizeShake(display.shake, settings.display.shake);
  settings.display.parallax = boolOr(display.parallax, settings.display.parallax);
  settings.display.showFps = boolOr(display.showFps, settings.display.showFps);

  const audio = isRecord(source.audio) ? source.audio : {};
  settings.audio.master = volumeOr(audio.master, settings.audio.master);
  settings.audio.bgm = volumeOr(audio.bgm, settings.audio.bgm);
  settings.audio.ambient = volumeOr(audio.ambient, settings.audio.ambient);
  settings.audio.sfx = volumeOr(audio.sfx, settings.audio.sfx);
  settings.audio.voice = volumeOr(audio.voice, settings.audio.voice);
  settings.audio.masterMuted = boolOr(audio.masterMuted ?? audio.muted, settings.audio.masterMuted);
  settings.audio.bgmMuted = boolOr(audio.bgmMuted, settings.audio.bgmMuted);
  settings.audio.ambientMuted = boolOr(audio.ambientMuted, settings.audio.ambientMuted);
  settings.audio.sfxMuted = boolOr(audio.sfxMuted, settings.audio.sfxMuted);
  settings.audio.voiceMuted = boolOr(audio.voiceMuted, settings.audio.voiceMuted);
  settings.audio.muteUnfocus = boolOr(audio.muteUnfocus, settings.audio.muteUnfocus);

  const controls = isRecord(source.controls) ? source.controls : {};
  settings.controls.rumble = normalizeRumble(controls.rumble, settings.controls.rumble);
  settings.controls.padGlyph = pick(controls.padGlyph, ['auto', 'xbox', 'playstation', 'nintendo'], settings.controls.padGlyph);
  settings.controls.deadzone = clampNumber(controls.deadzone, 0, 0.4, settings.controls.deadzone);

  return settings;
}

function snapshotAudioSettings(fallback: AudioSettingsData): AudioSettingsData {
  return {
    ...fallback,
    master: AudioBus.getMasterVolume(),
    bgm: AudioBus.getChannelVolume('bgm'),
    ambient: AudioBus.getChannelVolume('ambient'),
    sfx: AudioBus.getChannelVolume('sfx'),
    voice: AudioBus.getChannelVolume('voice'),
    masterMuted: AudioBus.isMasterMuted(),
    bgmMuted: AudioBus.isChannelMuted('bgm'),
    ambientMuted: AudioBus.isChannelMuted('ambient'),
    sfxMuted: AudioBus.isChannelMuted('sfx'),
    voiceMuted: AudioBus.isChannelMuted('voice'),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function boolOr(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function pick<const T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? value as T : fallback;
}

function volumeOr(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  const normalized = value > 1 ? value / 100 : value;
  return clamp01(normalized);
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function normalizeShake(value: unknown, fallback: ShakeLevel): ShakeLevel {
  if (value === 0 || value === 'off') return 'off';
  if (value === 0.5 || value === 'low') return 'low';
  if (value === 1 || value === 'full') return 'full';
  return fallback;
}

function normalizeRumble(value: unknown, fallback: RumbleLevel): RumbleLevel {
  if (value === 0 || value === 'off') return 'off';
  if (value === 0.5 || value === 'low') return 'low';
  if (value === 1 || value === 'full') return 'full';
  return fallback;
}
