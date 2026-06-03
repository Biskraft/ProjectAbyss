import type { Container } from 'pixi.js';
import { LowHpVignetteManager } from '@effects/LowHpVignette';
import { SavepointPulseManager } from '@effects/SavepointPulse';

interface WorldStatusFeedbackRuntimeInit {
  entityLayer: Container;
  legacyUiContainer: Container;
  viewportWidth: number;
  viewportHeight: number;
}

export class WorldStatusFeedbackRuntime {
  private savepointPulseManager: SavepointPulseManager | null = null;
  private lowHpVignetteManager: LowHpVignetteManager | null = null;

  get savepointPulse(): SavepointPulseManager {
    return this.require(this.savepointPulseManager, 'savepointPulse');
  }

  get lowHpVignette(): LowHpVignetteManager {
    return this.require(this.lowHpVignetteManager, 'lowHpVignette');
  }

  initialize(config: WorldStatusFeedbackRuntimeInit): void {
    this.savepointPulseManager = new SavepointPulseManager(config.entityLayer);
    this.lowHpVignetteManager = new LowHpVignetteManager(config.legacyUiContainer);
    this.lowHpVignetteManager.setViewport(config.viewportWidth, config.viewportHeight);
  }

  update(dt: number, hpRatio: number): void {
    this.savepointPulseManager?.update(dt);
    this.lowHpVignetteManager?.update(dt, hpRatio);
  }

  private require<T>(manager: T | null, name: string): T {
    if (!manager) throw new Error(`WorldStatusFeedbackRuntime.${name} used before initialize()`);
    return manager;
  }
}
