import { PaletteSwapFilter } from '@effects/PaletteSwapFilter';
import {
  getAreaPalette,
  getAreaPaletteAtlas,
  getAreaPaletteRow,
} from '@data/areaPalettes';
import { hashString } from '@level/ProceduralDecorator';
import { PRNG } from '@utils/PRNG';

export interface ItemWorldPaletteFilters {
  bgPaletteFilter: PaletteSwapFilter;
  wallPaletteFilter: PaletteSwapFilter;
  naturalPaletteFilter: PaletteSwapFilter;
  interiorPaletteFilter: PaletteSwapFilter;
}

export function createItemWorldPaletteFilters(themeSlug: string, visualSeedId: string): ItemWorldPaletteFilters {
  const bgId = `iw_${themeSlug}_bg`;
  const wallId = `iw_${themeSlug}_wall`;
  const paletteAtlas = getAreaPaletteAtlas();
  const bgEntry = getAreaPalette(
    paletteAtlas.rowIndex.has(bgId) ? bgId : 'iw_foundry_bg',
  );
  const wallEntry = getAreaPalette(
    paletteAtlas.rowIndex.has(wallId) ? wallId : 'iw_foundry_wall',
  );

  const bgPaletteFilter = new PaletteSwapFilter({
    paletteTex: paletteAtlas.texture,
    rowCount: paletteAtlas.rowCount,
    row: getAreaPaletteRow(bgEntry.id),
    strength: 1.0,
    depthBias: bgEntry.depthBias,
    depthCenter: bgEntry.depthCenter,
    brightness: bgEntry.brightness,
    tint: bgEntry.tint,
  });
  const wallPaletteFilter = new PaletteSwapFilter({
    paletteTex: paletteAtlas.texture,
    rowCount: paletteAtlas.rowCount,
    row: getAreaPaletteRow(wallEntry.id),
    strength: 1.0,
    depthBias: wallEntry.depthBias,
    depthCenter: wallEntry.depthCenter,
    brightness: wallEntry.brightness,
    tint: wallEntry.tint,
  });
  const naturalPaletteFilter = new PaletteSwapFilter({
    paletteTex: paletteAtlas.texture,
    rowCount: paletteAtlas.rowCount,
    row: getAreaPaletteRow(wallEntry.id),
    strength: 0.5,
    depthBias: wallEntry.depthBias,
    depthCenter: wallEntry.depthCenter,
    brightness: wallEntry.brightness,
    tint: wallEntry.tint,
  });
  const interiorPaletteFilter = new PaletteSwapFilter({
    paletteTex: paletteAtlas.texture,
    rowCount: paletteAtlas.rowCount,
    row: getAreaPaletteRow(bgEntry.id),
    strength: 1.0,
    depthBias: bgEntry.depthBias,
    depthCenter: bgEntry.depthCenter,
    brightness: (bgEntry.brightness ?? 1.0) * 0.65,
    tint: bgEntry.tint,
  });

  const visualRng = new PRNG(hashString(visualSeedId));
  const brightnessShift = visualRng.nextFloat(-0.08, 0.08);
  const depthBiasShift = visualRng.nextFloat(-0.05, 0.05);
  bgPaletteFilter.setBrightness((bgEntry.brightness ?? 1.0) + brightnessShift);
  bgPaletteFilter.setDepthBias((bgEntry.depthBias ?? 0.35) + depthBiasShift);
  wallPaletteFilter.setBrightness((wallEntry.brightness ?? 1.0) + brightnessShift * 0.5);
  interiorPaletteFilter.setBrightness(((bgEntry.brightness ?? 1.0) + brightnessShift) * 0.65);
  interiorPaletteFilter.setDepthBias((bgEntry.depthBias ?? 0.35) + depthBiasShift);

  return {
    bgPaletteFilter,
    wallPaletteFilter,
    naturalPaletteFilter,
    interiorPaletteFilter,
  };
}
