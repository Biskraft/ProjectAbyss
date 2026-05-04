/**
 * AudioBus.ts — Channel-based audio routing over @pixi/sound (DEC-040).
 *
 * Five logical channels (bgm / ambient / sfx / voice + master) gate every
 * sound play call. Channel volume × master volume × per-call base volume
 * collapses to the effective volume passed to @pixi/sound.
 *
 * Asset registration is lazy: nothing is loaded until `add()` is called.
 * During the demo asset generation phase (Plan_Audio_Demo §3) this module
 * stays asset-empty; the infrastructure is ready for `add()` calls the
 * moment OGG files land in `game/public/assets/audio/`.
 *
 * AudioContext is owned by @pixi/sound and shared with Sfx.ts (the legacy
 * WebAudio synth facade for upgrade / milestone100 / capture cues). One
 * context, one user-gesture unlock, one master gain ceiling.
 *
 * Usage from gameplay code:
 *   AudioBus.add('mus_iw_lane_rust', '/assets/audio/mus/...', 'bgm');
 *   AudioBus.play('mus_iw_lane_rust', 'bgm', { loop: true });
 *
 * Settings UI later writes channel/master volume; this module is the SSoT
 * for those values, and Sfx.ts reads `getChannelVolume('sfx')` to keep the
 * synth cues in sync with the UI.
 */

import { sound, type IMediaInstance, type PlayOptions, type Sound } from '@pixi/sound';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AudioChannel = 'bgm' | 'ambient' | 'sfx' | 'voice';

interface ChannelState {
  /** 0..1 user-facing channel volume. */
  volume: number;
  muted: boolean;
}

/** Default channel volumes match LUFS targets in System_Audio_Direction §11-1. */
const DEFAULT_CHANNEL_STATE: Record<AudioChannel, ChannelState> = {
  bgm:     { volume: 0.55, muted: false },
  ambient: { volume: 0.45, muted: false },
  sfx:     { volume: 0.80, muted: false },
  voice:   { volume: 0.70, muted: false },
};

const DEFAULT_MASTER_VOLUME = 0.7;

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class AudioBusImpl {
  private channels: Record<AudioChannel, ChannelState> = {
    bgm:     { ...DEFAULT_CHANNEL_STATE.bgm },
    ambient: { ...DEFAULT_CHANNEL_STATE.ambient },
    sfx:     { ...DEFAULT_CHANNEL_STATE.sfx },
    voice:   { ...DEFAULT_CHANNEL_STATE.voice },
  };
  private masterVolume = DEFAULT_MASTER_VOLUME;
  private masterMuted = false;

  /** Effective volume for a single play call. */
  private effective(channel: AudioChannel, base: number): number {
    if (this.masterMuted || this.channels[channel].muted) return 0;
    return clamp01(this.masterVolume) * clamp01(this.channels[channel].volume) * clamp01(base);
  }

  /**
   * Shared AudioContext, owned by @pixi/sound. Returns null in non-browser
   * build contexts (vitest/SSR) and before @pixi/sound has lazily created
   * its context.
   */
  getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const ctx = sound.context?.audioContext;
    return ctx ?? null;
  }

  /**
   * Resume the shared context after a user gesture. Safe to call multiple
   * times; @pixi/sound's own gesture handler also wires this internally,
   * but explicit resume helps when a synthesized cue (Sfx.ts) needs to
   * fire before any asset has been loaded.
   */
  resume(): void {
    const ctx = this.getContext();
    if (ctx?.state === 'suspended') void ctx.resume();
  }

  /**
   * Register an asset under an id. Channel routing is stored externally
   * (channel volume is applied per `play()` call rather than via a
   * shared GainNode, since @pixi/sound v6 does not expose a stable
   * external GainNode injection point).
   */
  add(id: string, url: string, _channel: AudioChannel): Sound {
    return sound.add(id, {
      url,
      preload: false,
    });
  }

  /** Play a registered sound. Returns the media instance, or undefined if muted. */
  play(
    id: string,
    channel: AudioChannel,
    options: Omit<PlayOptions, 'volume'> & { volume?: number } = {},
  ): IMediaInstance | undefined {
    const base = options.volume ?? 1.0;
    const eff = this.effective(channel, base);
    if (eff <= 0) return undefined;
    const result = sound.play(id, { ...options, volume: eff });
    return isMediaInstance(result) ? result : undefined;
  }

  /** Stop every instance of a sound by id. */
  stop(id: string): void {
    if (sound.exists(id)) sound.stop(id);
  }

  /** Stop every sound on a channel. Asset registry is unchanged. */
  stopChannel(channel: AudioChannel): void {
    // @pixi/sound v6 has no per-channel stop; iterate all registered sounds.
    // Channel metadata is not tracked yet (Phase 2); this is a placeholder
    // for when a registry is introduced. For now, callers must stop by id.
    void channel;
  }

  // -- Channel & master controls (Settings UI hooks) -----------------------

  setChannelVolume(channel: AudioChannel, volume: number): void {
    this.channels[channel].volume = clamp01(volume);
  }

  setChannelMuted(channel: AudioChannel, muted: boolean): void {
    this.channels[channel].muted = muted;
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = clamp01(volume);
  }

  setMasterMuted(muted: boolean): void {
    this.masterMuted = muted;
  }

  getChannelVolume(channel: AudioChannel): number {
    return this.channels[channel].volume;
  }

  isChannelMuted(channel: AudioChannel): boolean {
    return this.channels[channel].muted;
  }

  getMasterVolume(): number {
    return this.masterVolume;
  }

  isMasterMuted(): boolean {
    return this.masterMuted;
  }

  /**
   * Combined gain factor for legacy WebAudio synth cues (Sfx.ts).
   * Synth cues are not routed through @pixi/sound, so they multiply this
   * value into their own GainNode to stay in sync with channel + master UI.
   */
  legacySynthGain(): number {
    return this.effective('sfx', 1.0);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function isMediaInstance(value: unknown): value is IMediaInstance {
  return !!value && typeof value === 'object' && typeof (value as { set?: unknown }).set === 'function';
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

/** Global audio bus singleton. Lazy — safe to import from anywhere. */
export const AudioBus = new AudioBusImpl();
