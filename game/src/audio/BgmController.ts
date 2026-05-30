/**
 * BgmController.ts — Sample-accurate gapless BGM 매니저 (crossfade-looped).
 *
 * 한 트랙은 보통 3 파일로 구성: intro (1회) → middle_loop (반복) → outro (1회).
 *
 * 왜 직접 Web Audio 인가:
 *   1) `@pixi/sound` 의 `'end'` 이벤트 + 비동기 `play()` 는 intro→loop 전환 시
 *      ~30-80ms 가청 갭 발생. AudioBufferSourceNode.start(absoluteTime) 으로
 *      직접 예약해야 sample-accurate 무중단.
 *   2) loop 원본 파일이 zero-crossing 정렬 안 되어 있으면 `loop: true` 마다
 *      click 이 들림. 수동 chain + 짧은 crossfade 로 boundary 마스킹.
 *
 * 사용:
 *   BgmController.play('mus_world_main',
 *     { intro: 'mus_world_main_intro', loop: 'mus_world_main_loop' },
 *     { fadeInMs: 5000 });
 *   BgmController.stop('mus_world_main_outro');
 *
 * 볼륨:
 *   bgm 채널 + master + mix_volume 을 AudioBus 에서 캡처해 자체 GainNode 의
 *   목표 게인으로 사용. fade-in 은 이 master gain 에 ramp.
 *   추가로 각 segment 는 자체 perSegmentGain 을 거쳐 crossfade 적용.
 */

import { assetPath } from '@core/AssetLoader';
import { AudioBus } from './AudioBus';
import { getEventMix } from '@data/audioEvents';

interface BgmTrack {
  intro?: string;
  loop: string;
}

interface PlayOpts {
  /** 시작 시 0 → baseGain 페이드 (ms). 0 이면 즉시. */
  fadeInMs?: number;
}

interface ScheduledSegment {
  node: AudioBufferSourceNode;
  gain: GainNode;
}

interface ActiveBgm {
  trackKey: string;
  mixEventId: string;
  loopBuffer: AudioBuffer;
  segments: ScheduledSegment[];
  /** 다음 loop iteration 예약 timer. */
  chainTimer: number | null;
  /** 현재 트랙의 풀게인 (channel * master * mix_volume). */
  baseGain: number;
}

/** 인접한 segment 사이 crossfade 길이 (초). 50ms — boundary click 마스킹 충분. */
const XFADE_SEC = 0.05;

class BgmControllerImpl {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private active: ActiveBgm | null = null;
  private playRequestId = 0;
  private volumeFactor = 1;
  /**
   * endTrack 으로 schedule 된 outro source. active 와 무관하게 살아있으므로
   * 새 play() 진입 시 별도 정리하지 않으면 outro 와 새 트랙이 동시 재생된다
   * (ItemWorld 왕복 시 중복 BGM 의 root cause).
   */
  private pendingOutro: { node: AudioBufferSourceNode; gain: GainNode } | null = null;

  constructor() {
    AudioBus.onSettingsChanged(() => this.refreshAudioSettings());
  }

  /**
   * 트랙 시작. 같은 trackKey 이미 활성 중이면 no-op.
   * 다른 트랙이 활성이면 즉시 stop 후 새 트랙 play.
   */
  play(trackKey: string, track: BgmTrack, opts?: PlayOpts): void {
    if (this.active && this.active.trackKey === trackKey) return;
    const requestId = ++this.playRequestId;
    void this.startTrack(trackKey, track, opts, requestId);
  }

  /** 트랙 종료. outroId 있으면 1회 재생 후 silence. */
  stop(outroId?: string): void {
    this.playRequestId++;
    if (!this.active) return;
    void this.endTrack(outroId);
  }

  /**
   * 현재 트랙의 볼륨을 baseGain × factor 로 ramp.
   *   factor=0 : 무음 (save 룸 진입 등 BGM dim 용)
   *   factor=1 : 풀 볼륨 복귀
   * ms 동안 linearRampToValueAtTime 으로 부드럽게 이동.
   */
  setVolumeFactor(factor: number, ms: number): void {
    this.volumeFactor = clamp01(factor);
    this.rampActiveGain(ms);
  }

  getActiveKey(): string | null {
    return this.active?.trackKey ?? null;
  }

  refreshAudioSettings(): void {
    if (!this.active) return;
    this.active.baseGain = this.computeBaseGain(this.active.mixEventId);
    this.rampActiveGain(30);
  }

  // ── private ────────────────────────────────────────────────────────────────

  private rampActiveGain(ms: number): void {
    if (!this.active || !this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const target = this.active.baseGain * this.volumeFactor;
    const cur = this.masterGain.gain.value;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(cur, now);
    this.masterGain.gain.linearRampToValueAtTime(target, now + Math.max(0, ms) / 1000);
  }

  private async startTrack(trackKey: string, track: BgmTrack, opts: PlayOpts | undefined, requestId: number): Promise<void> {
    // 진행 중인 segments 와 pending outro 모두 즉시 끊는다. outro 까지 청소하지
    // 않으면 endTrack 가 schedule 한 outro source 가 새 트랙과 동시에 들린다.
    if (this.active) this.stopActiveImmediate();
    this.stopPendingOutro();

    AudioBus.resume();
    if (!this.ensureCtx()) return;
    const ctx = this.ctx!;
    const master = this.masterGain!;

    // 버퍼 디코드 (캐시).
    const [introBuf, loopBuf] = await Promise.all([
      track.intro ? this.loadBuffer(track.intro) : Promise.resolve(null),
      this.loadBuffer(track.loop),
    ]);

    // 도중 다른 play() 가 끼어들었으면 폐기.
    if (requestId !== this.playRequestId) return;

    // 디코드 await 동안 또 다른 startTrack 이 active 를 채웠을 수 있다 — 덮어쓰면
    // 그 segments 가 추적 불능이 되어 영원히 재생됨. 강제로 다시 청소한다.
    if (this.active) this.stopActiveImmediate();
    this.stopPendingOutro();

    const baseGain = this.computeBaseGain(track.loop);
    const startTime = ctx.currentTime + 0.05;

    this.active = {
      trackKey,
      mixEventId: track.loop,
      loopBuffer: loopBuf,
      segments: [],
      chainTimer: null,
      baseGain,
    };

    // master gain ramp — fadeInMs.
    const targetGain = baseGain * this.volumeFactor;
    master.gain.cancelScheduledValues(ctx.currentTime);
    if (opts?.fadeInMs && opts.fadeInMs > 0) {
      master.gain.setValueAtTime(0, startTime);
      master.gain.linearRampToValueAtTime(targetGain, startTime + opts.fadeInMs / 1000);
    } else {
      master.gain.setValueAtTime(targetGain, startTime);
    }

    // intro 스케줄 (있으면). intro 끝부분 XFADE 만큼 fade-out 으로 다음 loop 와 crossfade.
    let nextSegmentStart = startTime;
    if (introBuf) {
      this.scheduleSegment(introBuf, startTime, 0, XFADE_SEC);
      // 다음 loop 시작 = intro 끝 - XFADE (overlap).
      nextSegmentStart = startTime + introBuf.duration - XFADE_SEC;
    }

    // 첫 loop iteration — 이전 segment 와 crossfade.
    this.scheduleLoopIteration(nextSegmentStart, trackKey);
  }

  /**
   * loop iteration 1 회 스케줄 + 다음 iteration 도 setTimeout 으로 chain.
   * 각 iteration 은 시작/끝 XFADE 만큼 fade-in/out → 인접 iteration 과 overlap 에서
   * 진폭이 보존되며 boundary click 이 들리지 않음.
   */
  private scheduleLoopIteration(startTime: number, trackKey: string): void {
    if (!this.active || this.active.trackKey !== trackKey) return;
    const ctx = this.ctx!;
    const buffer = this.active.loopBuffer;

    this.scheduleSegment(buffer, startTime, XFADE_SEC, XFADE_SEC);

    // 다음 iteration 예약 — segment 끝 - XFADE 부터 overlap.
    const nextStart = startTime + buffer.duration - XFADE_SEC;
    // 다음 iteration 시작 ~200ms 전에 setTimeout 발사 — Web Audio 스케줄이 항상
    // 미리 들어가야 sample-accurate 보장. setTimeout jitter 가 200ms 안에 흡수됨.
    const triggerAt = nextStart - 0.2;
    const msUntilTrigger = Math.max(0, (triggerAt - ctx.currentTime) * 1000);

    this.active.chainTimer = window.setTimeout(() => {
      if (!this.active || this.active.trackKey !== trackKey) return;
      this.scheduleLoopIteration(nextStart, trackKey);
    }, msUntilTrigger);
  }

  /**
   * 한 segment 스케줄 — buffer 를 startTime 에 시작, fadeIn/fadeOut 적용.
   * 등록된 segment 는 active.segments 에 추가되어 stop 시 일괄 정리.
   */
  private scheduleSegment(
    buffer: AudioBuffer,
    startTime: number,
    fadeInSec: number,
    fadeOutSec: number,
  ): void {
    if (!this.active || !this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const master = this.masterGain;

    const node = ctx.createBufferSource();
    node.buffer = buffer;
    const segGain = ctx.createGain();
    node.connect(segGain);
    segGain.connect(master);

    const endTime = startTime + buffer.duration;

    if (fadeInSec > 0) {
      segGain.gain.setValueAtTime(0, startTime);
      segGain.gain.linearRampToValueAtTime(1, startTime + fadeInSec);
    } else {
      segGain.gain.setValueAtTime(1, startTime);
    }

    if (fadeOutSec > 0) {
      segGain.gain.setValueAtTime(1, endTime - fadeOutSec);
      segGain.gain.linearRampToValueAtTime(0, endTime);
    }

    try { node.start(startTime); } catch { /* ctx state edge */ }
    try { node.stop(endTime + 0.02); } catch { /* ok */ }

    this.active.segments.push({ node, gain: segGain });
    // 메모리 누수 방지 — 이미 종료한 segment 는 endTime 직후 정리.
    node.onended = () => {
      if (!this.active) return;
      const idx = this.active.segments.findIndex(s => s.node === node);
      if (idx >= 0) this.active.segments.splice(idx, 1);
      try { segGain.disconnect(); } catch { /* ok */ }
      try { node.disconnect(); } catch { /* ok */ }
    };
  }

  private async endTrack(outroId?: string): Promise<void> {
    if (!this.active || !this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const master = this.masterGain;

    // 짧은 master 페이드아웃 (200ms) 후 노드 정지.
    const fadeOutSec = 0.2;
    const now = ctx.currentTime;
    const currentVal = master.gain.value;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(currentVal, now);
    master.gain.linearRampToValueAtTime(0, now + fadeOutSec);

    const stopAt = now + fadeOutSec + 0.05;
    if (this.active.chainTimer !== null) {
      clearTimeout(this.active.chainTimer);
      this.active.chainTimer = null;
    }
    for (const seg of this.active.segments) {
      try { seg.node.stop(stopAt); } catch { /* ok */ }
    }
    this.active = null;

    if (outroId) {
      const buffer = await this.loadBuffer(outroId);
      if (this.active) return; // 새 트랙이 끼어들었으면 outro 폐기
      const outroBaseGain = this.computeBaseGain(outroId);
      const outroStart = stopAt;
      master.gain.setValueAtTime(0, outroStart);
      master.gain.linearRampToValueAtTime(outroBaseGain, outroStart + 0.1);
      const node = ctx.createBufferSource();
      node.buffer = buffer;
      const segGain = ctx.createGain();
      segGain.gain.setValueAtTime(1, outroStart);
      node.connect(segGain);
      segGain.connect(master);
      try { node.start(outroStart); } catch { /* ok */ }
      // outro 가 살아있는 동안 startTrack 이 끊을 수 있도록 추적.
      this.pendingOutro = { node, gain: segGain };
      node.onended = () => {
        if (this.pendingOutro && this.pendingOutro.node === node) {
          this.pendingOutro = null;
        }
        try { segGain.disconnect(); } catch { /* ok */ }
        try { node.disconnect(); } catch { /* ok */ }
      };
    }
  }

  /** endTrack 가 schedule 한 outro source 강제 종료. play 직전에 호출. */
  private stopPendingOutro(): void {
    if (!this.pendingOutro || !this.ctx) return;
    const now = this.ctx.currentTime;
    const { node, gain } = this.pendingOutro;
    try { node.stop(now); } catch { /* already stopped */ }
    try { gain.disconnect(); } catch { /* ok */ }
    try { node.disconnect(); } catch { /* ok */ }
    this.pendingOutro = null;
  }

  private stopActiveImmediate(): void {
    if (!this.active || !this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.active.chainTimer !== null) {
      clearTimeout(this.active.chainTimer);
      this.active.chainTimer = null;
    }
    for (const seg of this.active.segments) {
      try { seg.node.stop(now); } catch { /* ok */ }
      try { seg.gain.disconnect(); } catch { /* ok */ }
      try { seg.node.disconnect(); } catch { /* ok */ }
    }
    this.active = null;
    if (this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(0, now);
    }
  }

  private ensureCtx(): boolean {
    if (this.ctx && this.masterGain) return true;
    const ctx = AudioBus.getContext();
    if (!ctx) return false;
    this.ctx = ctx;
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0;
    this.masterGain.connect(ctx.destination);
    return true;
  }

  private async loadBuffer(id: string): Promise<AudioBuffer> {
    const cached = this.buffers.get(id);
    if (cached) return cached;
    const url = assetPath(`assets/audio/mus/${id}.ogg`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`BGM fetch failed: ${id} (${res.status})`);
    const ab = await res.arrayBuffer();
    if (!this.ctx) throw new Error('AudioContext missing');
    const buffer = await this.ctx.decodeAudioData(ab);
    this.buffers.set(id, buffer);
    return buffer;
  }

  private computeBaseGain(eventId: string): number {
    if (AudioBus.isMasterMuted() || AudioBus.isChannelMuted('bgm')) return 0;
    const ch = AudioBus.getChannelVolume('bgm');
    const master = AudioBus.getMasterVolume();
    const mix = getEventMix(eventId);
    return clamp01(ch) * clamp01(master) * clamp01(mix);
  }
}

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

export const BgmController = new BgmControllerImpl();
