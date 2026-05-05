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
import { assetPath } from '@core/AssetLoader';

type CueName = 'upgrade' | 'milestone100' | 'capture' | 'attack_hit' | 'attack_swing' | 'breakable_destroy' | 'footstep' | 'jump' | 'dash' | 'land';

/** SFX.play options — speed 등 @pixi/sound PlayOptions 일부 노출. */
interface PlayOpts {
  /** 재생 속도 (1.0=원본, <1.0=느림+길어짐, >1.0=빠름+짧아짐). 피치도 같이 변함. */
  speed?: number;
}

// OGG 자산이 도착한 cue 매핑 — `SFX.play(name, variant?)` 호출 시 합성 대신 AudioBus 경유.
// 배열: variant 인덱스로 선택 (예: combo step 0/1/2 → whoosh_01/02/03).
// CSV mix_volume 자동 적용. DEC-040 §보존 — 호출지 무수정.
const ASSET_BACKED_CUES: Partial<Record<CueName, Array<{ id: string; path: string }>>> = {
  attack_swing: [
    { id: 'sfx_combat_rustborn_whoosh_01', path: assetPath('assets/audio/sfx/sfx_combat_rustborn_whoosh_01.ogg') },
    { id: 'sfx_combat_rustborn_whoosh_02', path: assetPath('assets/audio/sfx/sfx_combat_rustborn_whoosh_02.ogg') },
    { id: 'sfx_combat_rustborn_whoosh_03', path: assetPath('assets/audio/sfx/sfx_combat_rustborn_whoosh_03.ogg') },
  ],
  attack_hit: [
    { id: 'sfx_combat_rustborn_impact_01', path: assetPath('assets/audio/sfx/sfx_combat_rustborn_impact_01.ogg') },
  ],
  breakable_destroy: [
    { id: 'sfx_world_break_01', path: assetPath('assets/audio/sfx/sfx_world_break_01.ogg') },
  ],
  // 발소리 — 현재 grass 단일 자산. 추후 metal/rust/wet 변주 추가 시 여기 배열 확장.
  footstep: [
    { id: 'sfx_player_footstep_grass_01', path: assetPath('assets/audio/sfx/sfx_player_footstep_grass_01.ogg') },
  ],
  // 점프 (지면 점프 + 더블 점프 공통).
  jump: [
    { id: 'sfx_player_jump_01', path: assetPath('assets/audio/sfx/sfx_player_jump_01.ogg') },
  ],
  // 대시 (지상 + 공중 공통, light fast wind whoosh).
  dash: [
    { id: 'sfx_player_dash_01', path: assetPath('assets/audio/sfx/sfx_player_dash_01.ogg') },
  ],
  // 착지 (body downfall thud). 낙하 속도가 LandingDust threshold 이상일 때만.
  land: [
    { id: 'sfx_player_land_01', path: assetPath('assets/audio/sfx/sfx_player_land_01.ogg') },
  ],
};

/** Static ceiling for the legacy synth chain (AudioBus channel/master applied on top). */
const SYNTH_BASE_GAIN = 0.35;

class SfxSystem {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private milestoneFired = false;
  /** AudioBus 에 등록된 asset id 트래킹 — 중복 add() 방어. */
  private registeredAssets = new Set<string>();

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

  /**
   * Play a named gameplay cue. No-op if audio is unavailable.
   *
   * @param variant 다중 자산 cue 의 인덱스 (예: attack_swing 의 combo step 0/1/2).
   *   범위 밖 값은 마지막 자산으로 클램프. 단일 자산 cue 에선 무시.
   * @param opts speed 등 추가 재생 옵션. 미지정 시 자산 원본대로 재생.
   */
  play(name: CueName, variant = 0, opts?: PlayOpts): void {
    // OGG asset 이 등록된 cue 는 AudioBus 경유 (CSV mix_volume + 채널 라우팅).
    const variants = ASSET_BACKED_CUES[name];
    if (variants && variants.length > 0) {
      const idx = Math.max(0, Math.min(variant, variants.length - 1));
      const asset = variants[idx];
      AudioBus.resume();
      if (!this.registeredAssets.has(asset.id)) {
        // Race fallback: preload=false. preloadAssets() 가 boot 시 호출되어
        // 정상 케이스에선 이 경로 진입 안 함. preload=true + 즉시 play 는
        // @pixi/sound 의 audioBufferReadyFn race 를 유발 (InvalidStateError).
        AudioBus.add(asset.id, asset.path, 'sfx', false);
        this.registeredAssets.add(asset.id);
      }
      AudioBus.play(asset.id, 'sfx', opts?.speed !== undefined ? { speed: opts.speed } : undefined);
      return;
    }

    // Synth 큐 — WebAudio 직접 합성.
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    switch (name) {
      case 'upgrade':      this.playUpgrade(ctx, this.master); break;
      case 'milestone100': this.playMilestone(ctx, this.master); break;
      case 'capture':      this.playCapture(ctx, this.master); break;
      case 'attack_hit':   this.playAttackHit(ctx, this.master); break;
      case 'attack_swing': this.playAttackSwing(ctx, this.master); break; // synth fallback
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

  /**
   * Eagerly register + preload all OGG-backed cues. main.ts boot 시 1회 호출.
   *
   * 부팅 시 preload=true 로 등록하면 decode 는 비동기 진행되고, 첫 play 호출은
   * 그 이후 시점에 일어나므로 @pixi/sound 의 audioBufferReadyFn race
   * (InvalidStateError) 가 발생하지 않는다.
   *
   * 호출지가 SFX.play 에서 lazy register 도 가능하지만, 그 경로는 race
   * 위험이 있어 fallback 으로만 쓰임.
   */
  preloadAssets(): void {
    for (const variants of Object.values(ASSET_BACKED_CUES)) {
      if (!variants) continue;
      for (const asset of variants) {
        if (this.registeredAssets.has(asset.id)) continue;
        AudioBus.add(asset.id, asset.path, 'sfx', true);
        this.registeredAssets.add(asset.id);
      }
    }
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
   * Attack swing — short whoosh of sword cutting air. Plays on every attack
   * state entry (Player.startAttack), regardless of whether the swing lands.
   *
   * 구성:
   *   - 80ms 화이트 노이즈 + bandpass 600→2400Hz exp sweep (Q=1.5)
   *   - Volume 0.35 — 매번 울리므로 임팩트(0.55) 보다 낮게
   *
   * DEC-040 Phase 2 자산 도착 시 sfx_combat_rustborn_whoosh_01.ogg 로 교체 예정.
   */
  private playAttackSwing(ctx: AudioContext, dest: AudioNode): void {
    const t0 = ctx.currentTime;

    const bufferSize = Math.floor(ctx.sampleRate * 0.08);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.5;
    bp.frequency.setValueAtTime(600, t0);
    bp.frequency.exponentialRampToValueAtTime(2400, t0 + 0.08);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.85, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1);

    noise.connect(bp).connect(gain).connect(dest);
    noise.start(t0);
    noise.stop(t0 + 0.12);
  }

  /**
   * Basic attack hit — short percussive thwack. Plays per landed hit in the
   * scene's hits loop (ItemWorldScene / WorldScene).
   *
   * 구성:
   *   - Body : 180Hz → 80Hz exp ramp 의 짧은 sine 펀치 (~120ms)
   *   - Noise: 1.5kHz highpass 화이트 노이즈 60ms — 금속 스파크 transient
   *
   * milestone100 (anvil thud) 보다 가볍고 빠른 톤. heavy / crit 변주는 차후
   * 분리 (DEC-040 Phase 2 자산 도착 시 OGG 로 교체 예정 — sfx_combat_rustborn_impact_*).
   */
  private playAttackHit(ctx: AudioContext, dest: AudioNode): void {
    const t0 = ctx.currentTime;

    // Body — short low sine punch
    const body = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    body.type = 'sine';
    body.frequency.setValueAtTime(180, t0);
    body.frequency.exponentialRampToValueAtTime(80, t0 + 0.08);
    bodyGain.gain.setValueAtTime(0, t0);
    bodyGain.gain.linearRampToValueAtTime(0.9, t0 + 0.005);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);
    body.connect(bodyGain).connect(dest);
    body.start(t0);
    body.stop(t0 + 0.15);

    // Hi-noise transient — metallic clang
    const bufferSize = Math.floor(ctx.sampleRate * 0.04);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1500;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.7, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06);
    noise.connect(hp).connect(noiseGain).connect(dest);
    noise.start(t0);
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
