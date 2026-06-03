import { BlurFilter, type Container, type Filter } from 'pixi.js';

const DEPLOY_BLUR_RAMP_MS = 1200;
const DEPLOY_BLUR_MAX_STRENGTH = 10;

interface WorldDeployBlurRuntimeDeps {
  getTargets: () => Container[];
}

export class WorldDeployBlurRuntime {
  private filter: BlurFilter | null = null;
  private active = false;
  private elapsedMs = 0;

  constructor(private readonly deps: WorldDeployBlurRuntimeDeps) {}

  update(dt: number, growing: boolean): void {
    if (growing) {
      if (!this.filter) {
        this.filter = new BlurFilter({ strength: 0, quality: 4 });
      }
      if (!this.active) {
        this.elapsedMs = 0;
        this.filter.strength = 0;
        this.setOnTargets(true);
        this.active = true;
      }
      this.elapsedMs += dt;
      const t = Math.min(1, this.elapsedMs / DEPLOY_BLUR_RAMP_MS);
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

    for (const target of this.deps.getTargets()) {
      const cur = (target.filters as Filter[] | null) ?? [];
      const arr: Filter[] = Array.isArray(cur) ? [...cur] : [cur];
      if (active) {
        if (!arr.includes(blur)) target.filters = [...arr, blur];
      } else {
        const next = arr.filter(f => f !== blur);
        target.filters = next.length ? next : null;
      }
    }
  }
}
