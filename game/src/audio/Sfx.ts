/**
 * Sfx.ts — WebAudio synth facade for legacy gameplay cues (DEC-040 phase 1).
 *
 * Playtest 2026-04-17 (A2): upgrade success + milestone (100 DMG) crossing
 * sounds are required to pair the numeric feedback with an auditory reward.
 *
 * Migration status (DEC-040):
 *   - Phase 1 (now): cues stay synthesized via OscillatorNode/GainNode.
 *     AudioContext is shared with @pixi/sound through AudioBus, so the
 *     gesture-unlock and gain ceiling collapse to a single chain. Master
 *     gain multiplies AudioBus.legacySynthGain() so Settings UI sliders
 *     (master + sfx channel) move these cues in lockstep with asset SFX.
 *   - Phase 2 (after demo asset generation): swap each cue body for a
 *     `AudioBus.play('sfx_*', 'sfx')` call. `SFX.play(name)` facade and
 *     the five call sites stay untouched (DEC-040 §보존).
 *
 * Non-browser build contexts (vitest/SSR) fall through to no-op via the
 * `typeof window === 'undefined'` guards.
 */

import { AudioBus } from './AudioBus';

type CueName = 'upgrade' | 'milestone100' | 'capture';

/** Static ceiling for the legacy synth chain (AudioBus channel/master applied on top). */
const SYNTH_BASE_GAIN = 0.35;

class SfxSystem {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private milestoneFired = false;

  /** Shared AudioContext from @pixi/sound; falls back to a self-owned context only in legacy paths. */
  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    // Prefer the shared @pixi/sound context (DEC-040). One unlock for both systems.
    const sharedCtx = AudioBus.getContext();
    if (sharedCtx) {
      if (this.ctx !== sharedCtx) {
        this.ctx = sharedCtx;
        this.master = sharedCtx.createGain();
        this.master.connect(sharedCtx.destination);
      }
      AudioBus.resume();
      this.applyMasterGain();
      return sharedCtx;
    }

    // Fallback: self-owned context for environments where @pixi/sound is not yet ready.
    if (!this.ctx) {
      const Ctor = (window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) as typeof AudioContext | undefined;
      if (!Ctor) return null;
      try {
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    this.applyMasterGain();
    return this.ctx;
  }

  /** Combine static synth ceiling with AudioBus channel + master volumes. */
  private applyMasterGain(): void {
    if (!this.master) return;
    this.master.gain.value = SYNTH_BASE_GAIN * AudioBus.legacySynthGain();
  }

  /** Play a named gameplay cue. No-op if audio is unavailable. */
  play(name: CueName): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    switch (name) {
      case 'upgrade':      this.playUpgrade(ctx, this.master); break;
      case 'milestone100': this.playMilestone(ctx, this.master); break;
      case 'capture':      this.playCapture(ctx, this.master); break;
    }
  }

  /**
   * Play the milestone-100 cue at most once per session. Returns true if
   * it fired (so callers can also attach visual feedback). Intended for
   * the first time any single hit deals >=100 damage.
   */
  fireMilestone100Once(): boolean {
    if (this.milestoneFired) return false;
    this.milestoneFired = true;
    this.play('milestone100');
    return true;
  }

  /** Reset per-session milestone flags (e.g. on new game). */
  resetMilestones(): void {
    this.milestoneFired = false;
  }

  // --- Cue implementations ----------------------------------------------

  /** Upgrade success: a short ascending three-note triad chime. */
  private playUpgrade(ctx: AudioContext, dest: AudioNode): void {
    const t0 = ctx.currentTime;
    // C5, E5, G5 (major triad), staggered
    const notes: Array<[number, number]> = [
      [523.25, 0.00],
      [659.25, 0.06],
      [783.99, 0.12],
    ];
    for (const [freq, delay] of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t0 + delay);
      gain.gain.setValueAtTime(0, t0 + delay);
      gain.gain.linearRampToValueAtTime(0.5, t0 + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + delay + 0.35);
      osc.connect(gain).connect(dest);
      osc.start(t0 + delay);
      osc.stop(t0 + delay + 0.4);
    }
  }

  /**
   * Milestone 100 DMG: heavier anvil-style thud (low tonal punch + short
   * filtered-noise burst) followed by a high 'ping' that reads as a reward.
   */
  private playMilestone(ctx: AudioContext, dest: AudioNode): void {
    const t0 = ctx.currentTime;

    // Low body: descending sine thud
    const body = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    body.type = 'sine';
    body.frequency.setValueAtTime(180, t0);
    body.frequency.exponentialRampToValueAtTime(60, t0 + 0.25);
    bodyGain.gain.setValueAtTime(0, t0);
    bodyGain.gain.linearRampToValueAtTime(0.7, t0 + 0.01);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
    body.connect(bodyGain).connect(dest);
    body.start(t0);
    body.stop(t0 + 0.4);

    // Transient noise burst (filtered) — simulates anvil strike attack
    const bufferSize = Math.floor(ctx.sampleRate * 0.08);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1200;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1);
    noise.connect(hp).connect(noiseGain).connect(dest);
    noise.start(t0);

    // High reward ping (delayed)
    const ping = ctx.createOscillator();
    const pingGain = ctx.createGain();
    ping.type = 'triangle';
    ping.frequency.setValueAtTime(1046.5, t0 + 0.18); // C6
    pingGain.gain.setValueAtTime(0, t0 + 0.18);
    pingGain.gain.linearRampToValueAtTime(0.45, t0 + 0.20);
    pingGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.65);
    ping.connect(pingGain).connect(dest);
    ping.start(t0 + 0.18);
    ping.stop(t0 + 0.7);
  }

  /**
   * A15 (playtest 2026-04-17) — Innocent capture. Readable as "something got
   * sealed into a container": a rising airy glissando (wind) + a soft crystal
   * ping at the landing. Distinct from 'upgrade' (which is triumphant triad)
   * and 'milestone100' (anvil thud).
   */
  private playCapture(ctx: AudioContext, dest: AudioNode): void {
    const t0 = ctx.currentTime;

    // Rising sweep: 300Hz -> 1200Hz over 0.28s
    const sweep = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    sweep.type = 'sine';
    sweep.frequency.setValueAtTime(300, t0);
    sweep.frequency.exponentialRampToValueAtTime(1200, t0 + 0.28);
    sweepGain.gain.setValueAtTime(0, t0);
    sweepGain.gain.linearRampToValueAtTime(0.4, t0 + 0.04);
    sweepGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32);
    sweep.connect(sweepGain).connect(dest);
    sweep.start(t0);
    sweep.stop(t0 + 0.35);

    // Crystal ping at landing (E6)
    const ping = ctx.createOscillator();
    const pingGain = ctx.createGain();
    ping.type = 'triangle';
    ping.frequency.setValueAtTime(1318.5, t0 + 0.24);
    pingGain.gain.setValueAtTime(0, t0 + 0.24);
    pingGain.gain.linearRampToValueAtTime(0.35, t0 + 0.26);
    pingGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55);
    ping.connect(pingGain).connect(dest);
    ping.start(t0 + 0.24);
    ping.stop(t0 + 0.6);
  }
}

/** Global SFX singleton. Lazy — safe to import from anywhere. */
export const SFX = new SfxSystem();
