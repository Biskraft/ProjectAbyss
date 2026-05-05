/**
 * AmbientLayer.ts — 3-layer ambient bed manager (§13-2.4 진척, DEC-040 정합).
 *
 * Layer model (System_Audio_Direction §3-1):
 *   Layer A: Environmental Bed     — always-on loop. Multi-asset blendable.
 *   Layer B: Distance Events       — randomized 30–90s intervals (TODO).
 *   Layer C: Proximity Triggers    — diegetic SFX with visual source (TODO).
 *
 * Phase 1 — Tier 3 데모 검증 (현재 활성):
 *   - Builder layer single asset (long static loop)
 *   - Civilization residue 3-variation sequential loop (영구 룰 #10)
 *   - Volume mix per Tier (영구 룰 #8 공간 유형):
 *       Tier 3 빌더 폐허 = builder 0.8 × civ 0.35
 *
 * Phase 2 정식 (자산 도착 후):
 *   - Layer B / C 활성
 *   - RoomNode.role 기반 자동 전환 (Plaza/Memorial/Sanctum/Lane)
 *   - 1.5초 크로스페이드 (영구 룰 #10)
 *   - #1B Natural 자산은 자연 동굴 영역 한정 분기
 *
 * 호환성: AudioBus (DEC-040) 위에서만 동작. AudioContext 공유.
 */

import { AudioBus, type AudioChannel } from './AudioBus';
import { assetPath } from '@core/AssetLoader';

// ---------------------------------------------------------------------------
// Asset registry — Phase 1 demo
// ---------------------------------------------------------------------------

const CHANNEL: AudioChannel = 'ambient';

const ASSET_BUILDER = 'amb_world_shaft_tier3_builder';
const ASSET_CIV_VARIATIONS = [
  'amb_world_civ_construction_v1',
  'amb_world_civ_construction_v2',
  'amb_world_civ_construction_v3',
] as const;

const ASSET_PATH_BASE = 'assets/audio/amb';

// TIER3_MIX 폐기 (2026-05-05): mix 값은 CSV (Sheets/Content_System_Audio_Events.csv)
// 의 mix_volume 컬럼이 SSoT. AudioBus.play 가 getEventMix() 로 자동 적용.

/** Civilization variation length (seconds). All three are 30s after ffmpeg loudnorm. */
const CIV_DURATION_S = 30;

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class AmbientLayerImpl {
  private registered = false;
  private started = false;
  private civIndex = 0;
  private civTimer: number | null = null;

  /** Lazy-register the Tier 3 demo asset set. Idempotent. */
  registerWorldTier3Demo(): void {
    if (this.registered) return;
    AudioBus.add(ASSET_BUILDER, assetPath(`${ASSET_PATH_BASE}/${ASSET_BUILDER}.ogg`), CHANNEL);
    for (const id of ASSET_CIV_VARIATIONS) {
      AudioBus.add(id, assetPath(`${ASSET_PATH_BASE}/${id}.ogg`), CHANNEL);
    }
    this.registered = true;
  }

  /**
   * Start the Tier 3 ambient bed (builder loop + civ sequential variations).
   * Call from WorldScene.init() after camera snap. Safe to call multiple times.
   */
  startWorldTier3Demo(): void {
    if (this.started) return;
    this.registerWorldTier3Demo();
    this.started = true;

    // [DEBUG] startup trace — temporary, remove after demo verification
    const ctx = AudioBus.getContext();
    console.log('[AmbientLayer] start. ctxState=', ctx?.state, 'master=', AudioBus.getMasterVolume(), 'ambientCh=', AudioBus.getChannelVolume('ambient'));
    AudioBus.resume();

    // volume 옵션 미전달 → CSV mix_volume 자동 적용 (audioEvents.ts SSoT).
    const builderInst = AudioBus.play(ASSET_BUILDER, CHANNEL, { loop: true });
    console.log('[AmbientLayer] builder play result:', builderInst ? 'instance' : 'undefined/promise');
    this.playNextCivVariation();
  }

  /** Cycle to the next civilization variation; reschedule near the end of this clip. */
  private playNextCivVariation(): void {
    const id = ASSET_CIV_VARIATIONS[this.civIndex];
    if (id) {
      const inst = AudioBus.play(id, CHANNEL, { loop: false });
      console.log('[AmbientLayer] civ', id, 'result:', inst ? 'instance' : 'undefined/promise');
    }
    this.civIndex = (this.civIndex + 1) % ASSET_CIV_VARIATIONS.length;

    // Schedule next clip slightly before this one ends so there is no audible gap.
    // Final 1.5s overlap window will become a true crossfade in the §13-2.4 정식 구현.
    if (typeof window === 'undefined') return;
    this.civTimer = window.setTimeout(
      () => this.playNextCivVariation(),
      Math.max(0, (CIV_DURATION_S - 1.5) * 1000),
    );
  }

  /** Stop all ambient assets and clear timers. */
  stopWorldTier3Demo(): void {
    if (typeof window !== 'undefined' && this.civTimer !== null) {
      window.clearTimeout(this.civTimer);
      this.civTimer = null;
    }
    AudioBus.stop(ASSET_BUILDER);
    for (const id of ASSET_CIV_VARIATIONS) AudioBus.stop(id);
    this.started = false;
    this.civIndex = 0;
  }
}

/** Global ambient layer singleton. Lazy — safe to import from anywhere. */
export const AmbientLayer = new AmbientLayerImpl();
