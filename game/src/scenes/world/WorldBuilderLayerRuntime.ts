import type { Container } from 'pixi.js';
import type { GiantBuilder } from '@entities/GiantBuilder';

export interface BuilderInteriorTargets {
  builderInteriorLayer: Container;
  bodyInteriorLayer: Container;
}

export class WorldBuilderLayerRuntime {
  attachBody(rendererRoot: Container, shadowLayer: Container, builder: GiantBuilder, insertBeforeShadow: boolean): void {
    if (insertBeforeShadow) {
      const insertIdx = rendererRoot.getChildIndex(shadowLayer);
      rendererRoot.addChildAt(builder.container, insertIdx);
      return;
    }

    rendererRoot.addChild(builder.container);
  }

  attach(root: Container, builder: GiantBuilder): void {
    root.addChild(builder.builderInteriorLayer);
    this.syncLayer(builder.builderInteriorLayer, builder);

    root.addChild(builder.lightContainer);
    this.syncLayer(builder.lightContainer, builder);

    root.addChild(builder.legFrontLayer);
    this.syncLayer(builder.legFrontLayer, builder);
  }

  sync(builder: GiantBuilder | null): void {
    if (!builder) return;
    this.syncLayer(builder.builderInteriorLayer, builder);
    this.syncLayer(builder.lightContainer, builder);
    this.syncLayer(builder.legFrontLayer, builder);
  }

  getAuxiliaryTargets(builder: GiantBuilder | null): Container[] {
    if (!builder) return [];
    return [
      builder.builderInteriorLayer,
      builder.lightContainer,
      builder.legBackLayer,
      builder.legFrontLayer,
    ];
  }

  getAtmosphereTargets(builder: GiantBuilder | null): Container[] {
    if (!builder) return [];
    return [
      builder.bodyLayers.bg,
      builder.bodyLayers.wall,
      builder.bodyLayers.shadow,
      builder.builderOutsideLayer,
      builder.decorator.naturalLayer,
      builder.decorator.artificialLayer,
      builder.decorator.structureLayer,
      builder.legBackLayer,
      builder.legFrontLayer,
      builder.lightContainer,
    ];
  }

  getInteriorTargets(builder: GiantBuilder | null): BuilderInteriorTargets | null {
    if (!builder) return null;
    return {
      builderInteriorLayer: builder.builderInteriorLayer,
      bodyInteriorLayer: builder.bodyLayers.interior,
    };
  }

  destroy(builder: GiantBuilder): void {
    this.destroyLayer(builder.builderInteriorLayer);
    this.destroyLayer(builder.lightContainer);
    this.destroyLayer(builder.legBackLayer);
    this.destroyLayer(builder.legFrontLayer);
  }

  private syncLayer(layer: Container, builder: GiantBuilder): void {
    layer.position.copyFrom(builder.container.position);
  }

  private destroyLayer(layer: Container): void {
    layer.parent?.removeChild(layer);
    layer.destroy({ children: true });
  }
}
