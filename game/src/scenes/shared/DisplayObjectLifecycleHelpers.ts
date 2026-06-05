import type { Container, ContainerChild } from 'pixi.js';

interface DestroyableDisplayObject extends ContainerChild {
  destroy: ContainerChild['destroy'];
}

type VisibleDisplayObject = ContainerChild & { visible: boolean };
type DestroyDisplayObjectOptions = Parameters<DestroyableDisplayObject['destroy']>[0];

export function destroyDisplayObject(
  displayObject: DestroyableDisplayObject,
  options?: DestroyDisplayObjectOptions,
): void {
  detachDisplayObject(displayObject);
  displayObject.destroy(options);
}

export function detachDisplayObject(displayObject: ContainerChild): void {
  if (displayObject.parent) displayObject.parent.removeChild(displayObject);
}

export function attachDisplayObjectIfMissing(
  parent: Container,
  displayObject: ContainerChild | null | undefined,
): void {
  if (displayObject && !displayObject.parent) parent.addChild(displayObject);
}

export function detachNullableDisplayObject(displayObject: ContainerChild | null | undefined): void {
  if (displayObject) detachDisplayObject(displayObject);
}

export function setDisplayObjectVisible(
  displayObject: VisibleDisplayObject | null | undefined,
  visible: boolean,
): void {
  if (displayObject) displayObject.visible = visible;
}

export function hideDisplayObject(displayObject: VisibleDisplayObject | null | undefined): void {
  setDisplayObjectVisible(displayObject, false);
}

export function destroyNullableDisplayObject<T extends DestroyableDisplayObject>(
  displayObject: T | null | undefined,
  options?: DestroyDisplayObjectOptions,
): null {
  if (displayObject) destroyDisplayObject(displayObject, options);
  return null;
}

export function detachAndClearDisplayObjects<T extends ContainerChild>(displayObjects: T[]): void {
  for (const displayObject of displayObjects) {
    detachDisplayObject(displayObject);
  }
  displayObjects.length = 0;
}

export function destroyDisplayObjectAt<T>(
  items: T[],
  index: number,
  getDisplayObject: (item: T) => DestroyableDisplayObject,
  options?: DestroyDisplayObjectOptions,
): void {
  const item = items[index];
  if (!item) return;
  destroyDisplayObject(getDisplayObject(item), options);
  items.splice(index, 1);
}
