import { AudioBus, type AudioChannel } from './AudioBus';
import { assetPath } from '@core/AssetLoader';

// ---------------------------------------------------------------------------
// Ambient layer demo (3-layer concept for DEC-040)
// ---------------------------------------------------------------------------

const CHANNEL: AudioChannel = 'ambient';

const ASSET_BUILDER = 'amb_world_shaft_tier3_builder';
const ASSET_CIV_VARIATIONS = [
  'amb_world_civ_construction_v1',
  'amb_world_civ_construction_v2',
  'amb_world_civ_construction_v3',
] as const;

const ASSET_PATH_BASE = 'assets/audio/amb';

// Layer B is intentionally randomized with short overlap in this stage.
const CIV_DURATION_S = 30;

// ---------------------------------------------------------------------------

class AmbientLayerImpl {
  private registered = false;
  private started = false;
  private civIndex = 0;
  private civTimer: number | null = null;

  /** Register the Tier 3 demo ambient assets once. */
  registerWorldTier3Demo(): void {
    if (this.registered) return;
    AudioBus.add(ASSET_BUILDER, assetPath(`${ASSET_PATH_BASE}/${ASSET_BUILDER}.ogg`), CHANNEL);
    for (const id of ASSET_CIV_VARIATIONS) {
      AudioBus.add(id, assetPath(`${ASSET_PATH_BASE}/${id}.ogg`), CHANNEL);
    }
    this.registered = true;
  }

  /** Start the base loop plus sequential CIV ambience cycle. */
  startWorldTier3Demo(): void {
    if (this.started) return;
    this.registerWorldTier3Demo();
    this.started = true;

    AudioBus.resume();
    AudioBus.play(ASSET_BUILDER, CHANNEL, { loop: true });
    this.playNextCivVariation();
  }

  /** Play the next CIV variation and reschedule before clip end. */
  private playNextCivVariation(): void {
    const id = ASSET_CIV_VARIATIONS[this.civIndex];
    if (id) {
      AudioBus.play(id, CHANNEL, { loop: false });
    }
    this.civIndex = (this.civIndex + 1) % ASSET_CIV_VARIATIONS.length;

    if (typeof window === 'undefined') return;
    this.civTimer = window.setTimeout(
      () => this.playNextCivVariation(),
      Math.max(0, (CIV_DURATION_S - 1.5) * 1000),
    );
  }

  /** Stop ambient assets and clear timers. */
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

/** Global ambient layer singleton. */
export const AmbientLayer = new AmbientLayerImpl();
