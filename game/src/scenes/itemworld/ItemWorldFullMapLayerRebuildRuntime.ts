import type { Container } from 'pixi.js';
import type { PaletteSwapFilter } from '@effects/PaletteSwapFilter';
import { ItemWorldFullMapLayerBindingRuntime } from './ItemWorldFullMapLayerBindingRuntime';
import { ItemWorldFullMapLayerRuntime } from './ItemWorldFullMapLayerRuntime';

interface ItemWorldFullMapLayerRebuildRuntimeDeps {
  getPreviousContainer: () => Container | null;
  getBgPaletteFilter: () => PaletteSwapFilter;
  getWallPaletteFilter: () => PaletteSwapFilter;
  getNaturalPaletteFilter: () => PaletteSwapFilter;
  getInteriorPaletteFilter: () => PaletteSwapFilter;
}

export class ItemWorldFullMapLayerRebuildRuntime {
  constructor(
    private readonly deps: ItemWorldFullMapLayerRebuildRuntimeDeps,
    private readonly layerRuntime: ItemWorldFullMapLayerRuntime,
    private readonly bindingRuntime: ItemWorldFullMapLayerBindingRuntime,
  ) {}

  rebuild(depthRatio: number): void {
    const layers = this.layerRuntime.rebuild({
      previousContainer: this.deps.getPreviousContainer(),
      bgPaletteFilter: this.deps.getBgPaletteFilter(),
      wallPaletteFilter: this.deps.getWallPaletteFilter(),
      naturalPaletteFilter: this.deps.getNaturalPaletteFilter(),
      interiorPaletteFilter: this.deps.getInteriorPaletteFilter(),
      depthRatio,
    });
    this.bindingRuntime.bind(layers);
  }
}
