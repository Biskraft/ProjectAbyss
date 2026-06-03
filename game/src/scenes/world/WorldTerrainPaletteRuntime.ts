import { getAreaPalette, getAreaPaletteAtlas, getAreaPaletteRow } from '@data/areaPalettes';
import { PaletteSwapFilter } from '@effects/PaletteSwapFilter';
import { RimLightFilter } from '@effects/RimLightFilter';
import { visualBoundsBleedArea } from '@level/VisualBoundsBleed';
import type { LdtkRenderer } from '@level/LdtkRenderer';
import type { Container } from 'pixi.js';
import type { WorldProceduralDecorRuntime } from './WorldProceduralDecorRuntime';

export class WorldTerrainPaletteRuntime {
  private wallFilter: PaletteSwapFilter | null = null;
  private naturalFilter: PaletteSwapFilter | null = null;
  private wallRimFilter: RimLightFilter | null = null;

  get rimFilter(): RimLightFilter | null {
    return this.wallRimFilter;
  }

  initializeRenderer(renderer: LdtkRenderer): void {
    const atlas = getAreaPaletteAtlas();
    const bgEntry = getAreaPalette('world_shaft_bg');
    const wallEntry = getAreaPalette('world_shaft_wall');
    const bgFilter = new PaletteSwapFilter({
      paletteTex: atlas.texture,
      rowCount: atlas.rowCount,
      row: getAreaPaletteRow(bgEntry.id),
      strength: 1.0,
      depthBias: bgEntry.depthBias,
      depthCenter: bgEntry.depthCenter,
      brightness: bgEntry.brightness,
      tint: bgEntry.tint,
    });
    const wallFilter = new PaletteSwapFilter({
      paletteTex: atlas.texture,
      rowCount: atlas.rowCount,
      row: getAreaPaletteRow(wallEntry.id),
      strength: 1.0,
      depthBias: wallEntry.depthBias,
      depthCenter: wallEntry.depthCenter,
      brightness: wallEntry.brightness,
      tint: wallEntry.tint,
    });
    const naturalFilter = new PaletteSwapFilter({
      paletteTex: atlas.texture,
      rowCount: atlas.rowCount,
      row: getAreaPaletteRow(wallEntry.id),
      strength: 0.5,
      depthBias: wallEntry.depthBias,
      depthCenter: wallEntry.depthCenter,
      brightness: wallEntry.brightness,
      tint: wallEntry.tint,
    });
    const rimFilter = new RimLightFilter({ color: 0xff6633, alpha: 1.0, thickness: 3, topGuardPixels: 16 });
    const interiorFilter = new PaletteSwapFilter({
      paletteTex: atlas.texture,
      rowCount: atlas.rowCount,
      row: getAreaPaletteRow(bgEntry.id),
      strength: 1.0,
      depthBias: bgEntry.depthBias,
      depthCenter: bgEntry.depthCenter,
      brightness: (bgEntry.brightness ?? 1.0) * 0.65,
      tint: bgEntry.tint,
    });

    this.wallFilter = wallFilter;
    this.naturalFilter = naturalFilter;
    this.wallRimFilter = rimFilter;

    renderer.bgLayer.filters = [bgFilter];
    renderer.wallLayer.filters = [wallFilter, rimFilter];
    renderer.interiorLayer.filters = [interiorFilter];
    renderer.shadowLayer.filters = [wallFilter];
  }

  applyProceduralDecorFilters(decorRuntime: WorldProceduralDecorRuntime): boolean {
    if (!this.wallFilter || !this.naturalFilter) return false;
    const naturalLayer = decorRuntime.naturalLayer;
    const artificialLayer = decorRuntime.artificialLayer;
    const structureLayer = decorRuntime.structureLayer;
    if (!naturalLayer || !artificialLayer || !structureLayer) return false;

    naturalLayer.filters = [this.naturalFilter];
    artificialLayer.filters = [this.wallFilter];
    structureLayer.filters = [this.wallFilter];
    return true;
  }

  applyFilterAreas(width: number, height: number, targets: Array<Container | null | undefined>): void {
    const area = visualBoundsBleedArea(width, height);
    for (const layer of targets) {
      if (!layer) continue;
      layer.filterArea = area;
      layer.boundsArea = area;
    }
  }

  applyWorldFilterAreas(width: number, height: number, renderer: LdtkRenderer, decorRuntime: WorldProceduralDecorRuntime): void {
    this.applyFilterAreas(width, height, [
      renderer.bgLayer,
      renderer.wallLayer,
      renderer.interiorLayer,
      renderer.shadowLayer,
      decorRuntime.naturalLayer,
      decorRuntime.artificialLayer,
      decorRuntime.structureLayer,
    ]);
  }
}
