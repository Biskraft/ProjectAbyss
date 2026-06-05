import type { LdtkEntity } from '@level/LdtkLoader';

export type WorldBuilderEntitySpawnHandler = (entity: LdtkEntity) => boolean;

export function dispatchBuilderEntities(
  entities: readonly LdtkEntity[],
  handlers: readonly WorldBuilderEntitySpawnHandler[],
): void {
  for (const entity of entities) {
    for (const handler of handlers) {
      if (handler(entity)) break;
    }
  }
}
