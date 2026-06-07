import { BlurFilter, type Container, type Filter } from 'pixi.js';
import {
  appendFilterIfMissing,
  removeFilterAndClearIfEmpty,
} from '@scenes/shared/FilterLifecycleHelpers';
import { getProgress01 } from '@scenes/shared/NumericHelpers';

const DEPLOY_BLUR_RAMP_MS = 1200;
const DEPLOY_BLUR_MAX_STRENGTH = 10;

interface WorldDeployBlurRuntimeDeps {
  getTargets: () => Container[];
}

export class WorldDeployBlurRuntime {
  private filter: BlurFilter | null = null;
  private active = false;
  private elapsedMs = 0;
  private readonly appliedTargets = new Set<Container>();

  constructor(private readonly deps: WorldDeployBlurRuntimeDeps) {}

  update(dt: number, growing: boolean): void {
    if (growing) {
      if (!this.filter) {
        this.filter = new BlurFilter({ strength: 0, quality: 4 });
      }
      if (!this.active) {
        this.elapsedMs = 0;
        this.filter.strength = 0;
        this.active = true;
      }
      this.syncTargets();
      this.elapsedMs += dt;
      const t = getProgress01(this.elapsedMs, DEPLOY_BLUR_RAMP_MS);
      const eased = t * t * (3 - 2 * t);
      this.filter.strength = DEPLOY_BLUR_MAX_STRENGTH * eased;
      return;
    }

    if (this.active) {
      this.setOnTargets(false);
      this.active = false;
      this.elapsedMs = 0;
    }
  }

  clear(): void {
    if (this.filter) this.setOnTargets(false);
    this.active = false;
    this.elapsedMs = 0;
  }

  destroy(): void {
    this.clear();
    this.filter?.destroy();
    this.filter = null;
  }

  private setOnTargets(active: boolean): void {
    const blur = this.filter;
    if (!blur) return;

    const targets = active ? this.deps.getTargets() : [...this.appliedTargets];
    for (const target of targets) {
      if (active) {
        appendFilterIfMissing(target, blur);
        this.appliedTargets.add(target);
      } else {
        removeFilterAndClearIfEmpty(target, blur);
        this.appliedTargets.delete(target);
      }
    }
  }

  private syncTargets(): void {
    const blur = this.filter;
    if (!blur) return;

    const currentTargets = new Set(this.deps.getTargets());
    for (const target of currentTargets) {
      appendFilterIfMissing(target, blur);
      this.appliedTargets.add(target);
    }

    for (const target of [...this.appliedTargets]) {
      if (currentTargets.has(target)) continue;
      removeFilterAndClearIfEmpty(target, blur);
      this.appliedTargets.delete(target);
    }
  }
}
