import type { Container } from 'pixi.js';
import { ProceduralDecorator } from '@level/ProceduralDecorator';
import type { GrassClumpFireSystem } from '@effects/GrassClumpFire';
import type { TileMutator } from '@systems/TileMutator';
import { attachProceduralDecorLayers } from '@scenes/shared/ProceduralDecorLayerHelpers';

const ITEM_WORLD_SURFACE_OVERLAY_ENABLED = true;

interface ItemWorldProceduralDecorRuntimeDeps {
  getNaturalAggregate: () => Container | null;
  getArtificialAggregate: () => Container | null;
  getStructureAggregate: () => Container | null;
  getGrassClumpFire: () => GrassClumpFireSystem;
  getTileMutator: () => TileMutator;
}

interface GenerateOptions {
  enabled: boolean;
  fullGrid: number[][];
  themeId: string | undefined;
  itemUid: number;
  currentStratumIndex: number;
  depthRatio: number;
}

export class ItemWorldProceduralDecorRuntime {
  constructor(private readonly deps: ItemWorldProceduralDecorRuntimeDeps) {}

  generate(options: GenerateOptions): void {
    if (!options.enabled) return;

    const naturalAggregate = this.deps.getNaturalAggregate();
    const artificialAggregate = this.deps.getArtificialAggregate();
    const structureAggregate = this.deps.getStructureAggregate();
    if (!naturalAggregate || !artificialAggregate || !structureAggregate) return;

    const decorator = new ProceduralDecorator({
      maxDecorations: 12,
      maxStructures: 4,
      density: undefined,
      structureDensity: undefined,
      surfaceOverlayEnabled: ITEM_WORLD_SURFACE_OVERLAY_ENABLED,
    });
    decorator.setTheme(options.themeId ?? 'T-HABITAT');
    decorator.boostDensity(-0.75 * decorator.getDensity());
    decorator.boostDensity(options.depthRatio * 0.05);

    const seed = options.itemUid * 10000 + options.currentStratumIndex * 7919 + 777;
    decorator.generate(options.fullGrid, seed);
    attachProceduralDecorLayers(decorator, naturalAggregate, artificialAggregate, structureAggregate);

    for (const prop of this.deps.getGrassClumpFire().register(decorator.getGrassClumpsWithCells())) {
      this.deps.getTileMutator().registerBurnable(prop);
    }
  }
}
