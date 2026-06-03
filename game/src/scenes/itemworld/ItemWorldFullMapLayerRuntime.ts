import { Container, Graphics } from 'pixi.js';
import type { PaletteSwapFilter } from '@effects/PaletteSwapFilter';
import { RimLightFilter } from '@effects/RimLightFilter';

export interface ItemWorldFullMapLayerSet {
  fullMapContainer: Container;
  bgAggregate: Container;
  interiorAggregate: Container;
  wallAggregate: Container;
  specialAggregate: Container;
  shadowAggregate: Container;
  sealAggregate: Container;
  decoAggregate: Container;
  artificialDecoAggregate: Container;
  structAggregate: Container;
}

interface RebuildOptions {
  previousContainer: Container | null;
  bgPaletteFilter: PaletteSwapFilter;
  wallPaletteFilter: PaletteSwapFilter;
  naturalPaletteFilter: PaletteSwapFilter;
  depthRatio: number;
}

export class ItemWorldFullMapLayerRuntime {
  private mutationMaskGfx: Graphics | null = null;
  private readonly mutatedCells = new Set<string>();
  private solidifiedWallGfx: Graphics | null = null;
  private readonly solidifiedWallCells = new Set<string>();

  rebuild(options: RebuildOptions): ItemWorldFullMapLayerSet {
    this.destroyPrevious(options.previousContainer);

    const fullMapContainer = new Container();
    const bgAggregate = new Container();
    const interiorAggregate = new Container();
    const wallAggregate = new Container();
    const specialAggregate = new Container();
    const shadowAggregate = new Container();
    const sealAggregate = new Container();
    const decoAggregate = new Container();
    const artificialDecoAggregate = new Container();
    const structAggregate = new Container();
    this.mutationMaskGfx = this.reusableGraphics(this.mutationMaskGfx);
    this.solidifiedWallGfx = this.reusableGraphics(this.solidifiedWallGfx);

    this.mutationMaskGfx.clear();
    this.solidifiedWallGfx.clear();
    this.mutatedCells.clear();
    this.solidifiedWallCells.clear();

    fullMapContainer.addChild(bgAggregate);
    fullMapContainer.addChild(interiorAggregate);
    fullMapContainer.addChild(structAggregate);
    fullMapContainer.addChild(wallAggregate);
    fullMapContainer.addChild(this.mutationMaskGfx);
    fullMapContainer.addChild(this.solidifiedWallGfx);
    fullMapContainer.addChild(specialAggregate);
    fullMapContainer.addChild(decoAggregate);
    fullMapContainer.addChild(artificialDecoAggregate);
    fullMapContainer.addChild(shadowAggregate);
    fullMapContainer.addChild(sealAggregate);

    bgAggregate.filters = [options.bgPaletteFilter];
    const wallFilters: any[] = [options.wallPaletteFilter];
    wallFilters.push(new RimLightFilter({ color: 0xff6633, alpha: 0.8, thickness: 2, topGuardPixels: 16, direction: 'bottom' }));
    wallAggregate.filters = wallFilters;
    decoAggregate.filters = [options.naturalPaletteFilter];
    artificialDecoAggregate.filters = [options.wallPaletteFilter];
    structAggregate.filters = [options.wallPaletteFilter];
    shadowAggregate.filters = [options.wallPaletteFilter];
    sealAggregate.filters = [options.wallPaletteFilter];

    this.applyDepthTransform(options.bgPaletteFilter, options.wallPaletteFilter, options.depthRatio);

    bgAggregate.cullableChildren = true;
    interiorAggregate.cullableChildren = true;
    wallAggregate.cullableChildren = true;
    specialAggregate.cullableChildren = true;
    shadowAggregate.cullableChildren = true;

    return {
      fullMapContainer,
      bgAggregate,
      interiorAggregate,
      wallAggregate,
      specialAggregate,
      shadowAggregate,
      sealAggregate,
      decoAggregate,
      artificialDecoAggregate,
      structAggregate,
    };
  }

  markAirMutation(gx: number, gy: number): void {
    this.mutatedCells.add(`${gx},${gy}`);
    this.rebuildMutationMask();
  }

  markSolidifiedWall(gx: number, gy: number, fullGrid: number[][], wallTile: number): void {
    this.solidifiedWallCells.add(`${gx},${gy}`);
    this.rebuildSolidifiedWallOverlay(fullGrid, wallTile);
  }

  private destroyPrevious(container: Container | null): void {
    if (!container) return;
    if (container.parent) container.parent.removeChild(container);
    container.destroy({ children: true });
  }

  private reusableGraphics(gfx: Graphics | null): Graphics {
    if (!gfx) return new Graphics();
    const maybeDestroyed = (gfx as Graphics & { destroyed?: boolean }).destroyed ?? false;
    return maybeDestroyed ? new Graphics() : gfx;
  }

  private applyDepthTransform(
    bgPaletteFilter: PaletteSwapFilter,
    wallPaletteFilter: PaletteSwapFilter,
    depthRatio: number,
  ): void {
    bgPaletteFilter.setBrightness(
      (bgPaletteFilter as any).resources.paletteUniforms.uniforms.uBrightness * (1.0 - depthRatio * 0.3),
    );
    wallPaletteFilter.setBrightness(
      (wallPaletteFilter as any).resources.paletteUniforms.uniforms.uBrightness * (1.0 - depthRatio * 0.25),
    );
    bgPaletteFilter.setDepthBias(
      (bgPaletteFilter as any).resources.paletteUniforms.uniforms.uDepthBias + depthRatio * 0.15,
    );
  }

  private rebuildMutationMask(): void {
    const gfx = this.mutationMaskGfx;
    if (!gfx) return;
    gfx.clear();
    for (const key of this.mutatedCells) {
      const ix = key.indexOf(',');
      const gx = +key.slice(0, ix);
      const gy = +key.slice(ix + 1);
      gfx.rect(gx * 16, gy * 16, 16, 16).fill({ color: 0x1f1a16, alpha: 0.92 });
    }
  }

  private rebuildSolidifiedWallOverlay(fullGrid: number[][], wallTile: number): void {
    const gfx = this.solidifiedWallGfx;
    if (!gfx) return;
    gfx.clear();
    for (const key of this.solidifiedWallCells) {
      const ix = key.indexOf(',');
      const gx = +key.slice(0, ix);
      const gy = +key.slice(ix + 1);
      if (fullGrid[gy]?.[gx] !== wallTile) continue;
      const x = gx * 16;
      const y = gy * 16;
      gfx.rect(x, y, 16, 16).fill({ color: 0x2b2520, alpha: 1 });
      gfx.rect(x, y, 16, 2).fill({ color: 0x7a4a2a, alpha: 0.95 });
      gfx.rect(x + 2, y + 4, 12, 1).fill({ color: 0x4a3528, alpha: 0.8 });
    }
  }
}
