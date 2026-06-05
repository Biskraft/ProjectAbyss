import type { Container } from 'pixi.js';
import type { GiantBuilder } from '@entities/GiantBuilder';
import { destroyDisplayObject } from '@scenes/shared/DisplayObjectLifecycleHelpers';

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
    builder.builderInteriorLayer.position.copyFrom(builder.container.position);

    root.addChild(builder.lightContainer);
    builder.lightContainer.position.copyFrom(builder.container.position);

    root.addChild(builder.legFrontLayer);
    builder.legFrontLayer.position.copyFrom(builder.container.position);
  }

  sync(builder: GiantBuilder | null): void {
    if (!builder) return;
    builder.builderInteriorLayer.position.copyFrom(builder.container.position);
    builder.lightContainer.position.copyFrom(builder.container.position);
    builder.legFrontLayer.position.copyFrom(builder.container.position);
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
    destroyDisplayObject(builder.builderInteriorLayer, { children: true });
    destroyDisplayObject(builder.lightContainer, { children: true });
    destroyDisplayObject(builder.legBackLayer, { children: true });
    destroyDisplayObject(builder.legFrontLayer, { children: true });
  }

}
