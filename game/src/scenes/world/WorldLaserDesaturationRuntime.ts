import { ColorMatrixFilter, type Container, type Filter } from 'pixi.js';

interface WorldLaserDesaturationRuntimeDeps {
  getTargets: () => Container[];
}

export class WorldLaserDesaturationRuntime {
  private filter: ColorMatrixFilter | null = null;
  private readonly previousFilters = new Map<Container, Filter[] | null>();

  constructor(private readonly deps: WorldLaserDesaturationRuntimeDeps) {}

  activate(): void {
    if (!this.filter) {
      this.filter = new ColorMatrixFilter();
      this.filter.desaturate();
      this.filter.contrast(1.5, true);
    }

    for (const target of this.deps.getTargets()) {
      if (!this.previousFilters.has(target)) {
        this.previousFilters.set(target, target.filters ? [...target.filters] : null);
      }
      const previous = this.previousFilters.get(target);
      target.filters = previous ? [...previous, this.filter] : [this.filter];
    }
  }

  deactivate(): void {
    for (const [target, filters] of this.previousFilters) {
      target.filters = filters;
    }
    this.previousFilters.clear();
  }

  removeFromTargets(targets: Container[]): void {
    const filter = this.filter;
    if (!filter) {
      this.previousFilters.clear();
      return;
    }

    for (const target of targets) {
      if (!target.filters) continue;
      const next = target.filters.filter(f => f !== filter);
      target.filters = next.length ? next : null;
    }
    this.previousFilters.clear();
  }
}
