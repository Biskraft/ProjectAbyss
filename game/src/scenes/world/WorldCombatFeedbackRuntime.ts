import type { Container } from 'pixi.js';
import type { Camera } from '@core/Camera';
import { HitSparkManager } from '@effects/HitSpark';
import { PropShatterManager } from '@effects/PropShatter';
import { ScreenFlash } from '@effects/ScreenFlash';
import { DamageNumberManager } from '@ui/DamageNumber';

interface WorldCombatFeedbackRuntimeInit {
  uiContainer: Container;
  legacyUiContainer: Container;
  camera: Camera;
  uiScale: number;
  entityLayer: Container;
}

export class WorldCombatFeedbackRuntime {
  private dmgNumbers: DamageNumberManager | null = null;
  private hitSparkManager: HitSparkManager | null = null;
  private propShatterManager: PropShatterManager | null = null;
  private flash: ScreenFlash | null = null;

  get damageNumbers(): DamageNumberManager {
    return this.require(this.dmgNumbers, 'damageNumbers');
  }

  get hitSparks(): HitSparkManager {
    return this.require(this.hitSparkManager, 'hitSparks');
  }

  get propShatter(): PropShatterManager {
    return this.require(this.propShatterManager, 'propShatter');
  }

  get screenFlash(): ScreenFlash {
    return this.require(this.flash, 'screenFlash');
  }

  initialize(config: WorldCombatFeedbackRuntimeInit): void {
    this.dmgNumbers = new DamageNumberManager(config.uiContainer, config.camera, config.uiScale);
    this.hitSparkManager = new HitSparkManager(config.entityLayer);
    this.propShatterManager = new PropShatterManager(config.entityLayer);
    this.flash = new ScreenFlash();
    config.legacyUiContainer.addChild(this.flash.overlay);
  }

  clearDamageNumbers(): void {
    this.dmgNumbers?.clear();
  }

  update(dt: number): void {
    this.dmgNumbers?.update(dt);
    this.updateImpactOnly(dt);
  }

  updateImpactOnly(dt: number): void {
    this.hitSparkManager?.update(dt);
    this.propShatterManager?.update(dt);
    this.flash?.update(dt);
  }

  private require<T>(manager: T | null, name: string): T {
    if (!manager) throw new Error(`WorldCombatFeedbackRuntime.${name} used before initialize()`);
    return manager;
  }
}
