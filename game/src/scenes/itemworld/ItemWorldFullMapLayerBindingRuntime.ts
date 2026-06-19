import type { ItemWorldFullMapLayerSet } from './ItemWorldFullMapLayerRuntime';

export interface ItemWorldFullMapLayerBindingRuntimeDeps {
  setFullMapContainer: (container: ItemWorldFullMapLayerSet['fullMapContainer']) => void;
  setBgAggregate: (container: ItemWorldFullMapLayerSet['bgAggregate']) => void;
  setInteriorAggregate: (container: ItemWorldFullMapLayerSet['interiorAggregate']) => void;
  setWallAggregate: (container: ItemWorldFullMapLayerSet['wallAggregate']) => void;
  setSpecialAggregate: (container: ItemWorldFullMapLayerSet['specialAggregate']) => void;
  setShadowAggregate: (container: ItemWorldFullMapLayerSet['shadowAggregate']) => void;
  setSealAggregate: (container: ItemWorldFullMapLayerSet['sealAggregate']) => void;
  setDecoAggregate: (container: ItemWorldFullMapLayerSet['decoAggregate']) => void;
  setArtificialDecoAggregate: (container: ItemWorldFullMapLayerSet['artificialDecoAggregate']) => void;
  setStructAggregate: (container: ItemWorldFullMapLayerSet['structAggregate']) => void;
}

export class ItemWorldFullMapLayerBindingRuntime {
  constructor(private readonly deps: ItemWorldFullMapLayerBindingRuntimeDeps) {}

  bind(layers: ItemWorldFullMapLayerSet): void {
    this.deps.setFullMapContainer(layers.fullMapContainer);
    this.deps.setBgAggregate(layers.bgAggregate);
    this.deps.setInteriorAggregate(layers.interiorAggregate);
    this.deps.setWallAggregate(layers.wallAggregate);
    this.deps.setSpecialAggregate(layers.specialAggregate);
    this.deps.setShadowAggregate(layers.shadowAggregate);
    this.deps.setSealAggregate(layers.sealAggregate);
    this.deps.setDecoAggregate(layers.decoAggregate);
    this.deps.setArtificialDecoAggregate(layers.artificialDecoAggregate);
    this.deps.setStructAggregate(layers.structAggregate);
  }
}
