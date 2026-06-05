import type { Container } from 'pixi.js';

interface LayerBackedEntity {
  container: Container;
}

interface UpdatableEntity {
  update(dtMs: number): void;
}

interface DestroyableEntity {
  destroy(): void;
}

interface AddEntityToLayerOptions {
  onlyAttachIfUnparented?: boolean;
}

export function addEntityToLayer<T extends LayerBackedEntity>(
  entities: T[],
  entity: T,
  layer?: Container,
  options: AddEntityToLayerOptions = {},
): void {
  entities.push(entity);
  if (!layer) return;
  if (options.onlyAttachIfUnparented && entity.container.parent) return;
  layer.addChild(entity.container);
}

export function updateEntities<T extends UpdatableEntity>(
  entities: readonly T[],
  dtMs: number,
): void {
  for (const entity of entities) {
    entity.update(dtMs);
  }
}

export function destroyAndClearEntities<T extends DestroyableEntity>(
  entities: T[],
): void {
  for (const entity of entities) {
    entity.destroy();
  }
  entities.length = 0;
}

export function removeEntityAt<T extends DestroyableEntity>(
  entities: T[],
  index: number,
): void {
  const entity = entities[index];
  entity.destroy();
  entities.splice(index, 1);
}
