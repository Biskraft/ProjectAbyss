import { ColorMatrixFilter, type Container, type Filter } from 'pixi.js';

interface BuilderInteriorTargets {
  builderInteriorLayer: Container;
  bodyInteriorLayer: Container;
}

interface WorldDungeonAtmosphereRuntimeDeps {
  getParallaxContainer: () => Container | null;
  getFilterTargets: () => Container[];
  getBuilderInteriorTargets: () => BuilderInteriorTargets | null;
}

export class WorldDungeonAtmosphereRuntime {
  private active = false;
  private atmosphereFilter: ColorMatrixFilter | null = null;
  private parallaxGrayFilter: ColorMatrixFilter | null = null;
  private targets: Container[] = [];
  private hiddenBuilderInteriorLayer: Container | null = null;
  private hiddenBuilderBodyInteriorLayer: Container | null = null;

  constructor(private readonly deps: WorldDungeonAtmosphereRuntimeDeps) {}

  get isActive(): boolean {
    return this.active;
  }

  get filter(): Filter | null {
    return this.atmosphereFilter;
  }

  activate(): boolean {
    if (this.active) return false;
    this.active = true;

    const atmosphereFilter = this.getOrCreateAtmosphereFilter();
    const parallax = this.deps.getParallaxContainer();
    if (parallax) {
      const parallaxFilter = this.getOrCreateParallaxGrayFilter();
      this.appendFilter(parallax, parallaxFilter);
    }

    const builderInterior = this.deps.getBuilderInteriorTargets();
    if (builderInterior) {
      builderInterior.builderInteriorLayer.visible = false;
      builderInterior.bodyInteriorLayer.visible = false;
      this.hiddenBuilderInteriorLayer = builderInterior.builderInteriorLayer;
      this.hiddenBuilderBodyInteriorLayer = builderInterior.bodyInteriorLayer;
    }

    this.targets = Array.from(new Set(this.deps.getFilterTargets()));
    for (const target of this.targets) {
      this.appendFilter(target, atmosphereFilter);
    }

    return true;
  }

  addTarget(target: Container): void {
    if (!this.targets.includes(target)) this.targets.push(target);
    if (this.active && this.atmosphereFilter) {
      this.appendFilter(target, this.atmosphereFilter);
    }
  }

  removeTarget(target: Container): void {
    this.targets = this.targets.filter(t => t !== target);
    if (this.atmosphereFilter) this.removeFilter(target, this.atmosphereFilter);
  }

  reapply(): void {
    if (!this.active || !this.atmosphereFilter) return;
    for (const target of this.targets) {
      this.appendFilter(target, this.atmosphereFilter);
    }
  }

  removeKnownFiltersFrom(targets: Container[]): void {
    for (const target of targets) {
      if (this.atmosphereFilter) this.removeFilter(target, this.atmosphereFilter);
      if (this.parallaxGrayFilter) this.removeFilter(target, this.parallaxGrayFilter);
    }
  }

  deactivate(): void {
    this.active = false;

    const parallax = this.deps.getParallaxContainer();
    if (parallax && this.parallaxGrayFilter) {
      this.removeFilter(parallax, this.parallaxGrayFilter);
    }

    if (this.atmosphereFilter) {
      for (const target of this.targets) {
        this.removeFilter(target, this.atmosphereFilter);
      }
    }

    if (this.hiddenBuilderInteriorLayer) {
      this.hiddenBuilderInteriorLayer.visible = true;
      this.hiddenBuilderInteriorLayer = null;
    }
    if (this.hiddenBuilderBodyInteriorLayer) {
      this.hiddenBuilderBodyInteriorLayer.visible = true;
      this.hiddenBuilderBodyInteriorLayer = null;
    }

    this.targets = [];
  }

  destroy(): void {
    this.deactivate();
    this.atmosphereFilter?.destroy();
    this.parallaxGrayFilter?.destroy();
    this.atmosphereFilter = null;
    this.parallaxGrayFilter = null;
  }

  private getOrCreateAtmosphereFilter(): ColorMatrixFilter {
    if (!this.atmosphereFilter) {
      this.atmosphereFilter = new ColorMatrixFilter();
      this.atmosphereFilter.desaturate();
      this.atmosphereFilter.contrast(1.5, true);
    }
    return this.atmosphereFilter;
  }

  private getOrCreateParallaxGrayFilter(): ColorMatrixFilter {
    if (!this.parallaxGrayFilter) {
      this.parallaxGrayFilter = new ColorMatrixFilter();
      this.parallaxGrayFilter.desaturate();
      this.parallaxGrayFilter.brightness(2.2, true);
    }
    return this.parallaxGrayFilter;
  }

  private appendFilter(target: Container, filter: Filter): void {
    const cur = (target.filters as Filter[] | null) ?? [];
    if (!cur.includes(filter)) target.filters = [...cur, filter];
  }

  private removeFilter(target: Container, filter: Filter): void {
    const cur = target.filters as Filter[] | null;
    if (!cur) return;
    const next = cur.filter(f => f !== filter);
    target.filters = next.length ? next : null;
  }
}
