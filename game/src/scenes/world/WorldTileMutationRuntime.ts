import type { Container } from 'pixi.js';
import { TileMutator } from '@systems/TileMutator';
import { TileMutatorRenderer } from '@systems/TileMutatorRenderer';

export class WorldTileMutationRuntime {
  private readonly tileMutator = new TileMutator();
  private renderer: TileMutatorRenderer | null = null;
  private wallLayerDirty = false;

  get mutator(): TileMutator {
    return this.tileMutator;
  }

  initializeRenderer(entityLayer: Container): void {
    this.renderer = new TileMutatorRenderer(entityLayer);
  }

  setAboveFluidLayer(layer: Container): void {
    this.renderer?.setAboveFluidLayer(layer);
  }

  reset(): void {
    this.tileMutator.reset();
    this.wallLayerDirty = false;
  }

  markWallLayerDirty(): void {
    this.wallLayerDirty = true;
  }

  consumeWallLayerDirty(): boolean {
    const dirty = this.wallLayerDirty;
    this.wallLayerDirty = false;
    return dirty;
  }

  updateRenderer(tileGrid: number[][], dt: number): void {
    this.renderer?.update(this.tileMutator, tileGrid, dt);
  }
}
