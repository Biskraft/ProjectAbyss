import type { Container } from 'pixi.js';
import type { ProceduralDecorator } from '@level/ProceduralDecorator';
import { detachDisplayObject } from '@scenes/shared/DisplayObjectLifecycleHelpers';

export function getProceduralDecorLayers(decorator: ProceduralDecorator | null): Container[] {
  if (!decorator) return [];
  return [
    decorator.naturalLayer,
    decorator.artificialLayer,
    decorator.structureLayer,
  ];
}

export function detachProceduralDecorLayers(decorator: ProceduralDecorator | null): void {
  for (const layer of getProceduralDecorLayers(decorator)) {
    detachDisplayObject(layer);
  }
}

export function attachProceduralDecorLayers(
  decorator: ProceduralDecorator,
  naturalAggregate: Container,
  artificialAggregate: Container,
  structureAggregate: Container,
): void {
  naturalAggregate.addChild(decorator.naturalLayer);
  artificialAggregate.addChild(decorator.artificialLayer);
  structureAggregate.addChild(decorator.structureLayer);
}
