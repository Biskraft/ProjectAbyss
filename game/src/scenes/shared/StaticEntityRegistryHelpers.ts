export interface DestroyableStaticEntity {
  destroy: () => void;
}

export function destroyAndClearStaticEntities(items: DestroyableStaticEntity[]): void {
  for (const item of items) item.destroy();
  items.length = 0;
}
