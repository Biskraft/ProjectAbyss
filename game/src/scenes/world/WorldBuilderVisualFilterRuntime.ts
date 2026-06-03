import type { Texture } from 'pixi.js';
import type { GiantBuilder } from '@entities/GiantBuilder';
import { getAreaPalette, getAreaPaletteRow } from '@data/areaPalettes';
import { PaletteSwapFilter } from '@effects/PaletteSwapFilter';
import type { RimLightFilter } from '@effects/RimLightFilter';

interface PaletteAtlas {
  texture: Texture;
  rowCount: number;
}

export class WorldBuilderVisualFilterRuntime {
  private bgFilter: PaletteSwapFilter | null = null;
  private wallFilter: PaletteSwapFilter | null = null;
  private interiorWallFilter: PaletteSwapFilter | null = null;
  private naturalFilter: PaletteSwapFilter | null = null;

  initialize(atlas: PaletteAtlas): void {
    const builderBgEntry = getAreaPalette('world_shaft_builder_bg');
    const builderWallEntry = getAreaPalette('world_shaft_builder_wall');
    this.bgFilter = new PaletteSwapFilter({
      paletteTex: atlas.texture,
      rowCount: atlas.rowCount,
      row: getAreaPaletteRow(builderBgEntry.id),
      strength: 1.0,
      depthBias: builderBgEntry.depthBias,
      depthCenter: builderBgEntry.depthCenter,
      brightness: builderBgEntry.brightness,
      tint: builderBgEntry.tint,
    });
    this.wallFilter = new PaletteSwapFilter({
      paletteTex: atlas.texture,
      rowCount: atlas.rowCount,
      row: getAreaPaletteRow(builderWallEntry.id),
      strength: 1.0,
      depthBias: builderWallEntry.depthBias,
      depthCenter: builderWallEntry.depthCenter,
      brightness: builderWallEntry.brightness,
      tint: builderWallEntry.tint,
    });
    this.interiorWallFilter = new PaletteSwapFilter({
      paletteTex: atlas.texture,
      rowCount: atlas.rowCount,
      row: getAreaPaletteRow(builderWallEntry.id),
      strength: 1.0,
      depthBias: builderWallEntry.depthBias,
      depthCenter: builderWallEntry.depthCenter,
      brightness: builderWallEntry.brightness,
      tint: builderWallEntry.tint,
    });
    this.naturalFilter = new PaletteSwapFilter({
      paletteTex: atlas.texture,
      rowCount: atlas.rowCount,
      row: getAreaPaletteRow(builderWallEntry.id),
      strength: 0.5,
      depthBias: builderWallEntry.depthBias,
      depthCenter: builderWallEntry.depthCenter,
      brightness: builderWallEntry.brightness,
      tint: builderWallEntry.tint,
    });
  }

  apply(builder: GiantBuilder, wallRimFilter: RimLightFilter | null): void {
    if (this.wallFilter && this.naturalFilter) {
      builder.decorator.naturalLayer.filters = [this.naturalFilter];
      builder.decorator.artificialLayer.filters = [this.wallFilter];
      builder.decorator.structureLayer.filters = [this.wallFilter];
    }

    if (this.bgFilter && this.wallFilter && this.interiorWallFilter && wallRimFilter) {
      builder.bodyLayers.bg.filters = [this.bgFilter];
      builder.bodyLayers.wall.filters = [this.wallFilter, wallRimFilter];
      builder.bodyLayers.interior.filters = [this.bgFilter];
      builder.bodyLayers.shadow.filters = [this.wallFilter];
      builder.builderInteriorLayer.filters = [this.interiorWallFilter];
      builder.builderOutsideLayer.filters = [this.wallFilter, wallRimFilter];
      builder.setLegFilters([this.wallFilter, wallRimFilter]);
      builder.pinFilterBounds();
    }
  }
}
