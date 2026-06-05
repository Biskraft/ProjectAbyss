import type { Container as PixiContainer } from 'pixi.js';
import type { ThrowableContainer } from '@entities/ThrowableContainer';

export function addContainerToRegistry(
  containers: ThrowableContainer[],
  container: ThrowableContainer,
  entityLayer?: PixiContainer,
): void {
  containers.push(container);
  if (entityLayer && !container.container.parent) entityLayer.addChild(container.container);
}

export function addContainersToRegistry(
  registryContainers: ThrowableContainer[],
  containers: Iterable<ThrowableContainer>,
  entityLayer?: PixiContainer,
): void {
  for (const container of containers) {
    addContainerToRegistry(registryContainers, container, entityLayer);
  }
}

export function removeContainerAt(containers: ThrowableContainer[], index: number): void {
  const container = containers[index];
  if (!container) return;
  container.destroy();
  containers.splice(index, 1);
}

export function clearContainers(containers: ThrowableContainer[]): void {
  for (const container of containers) container.destroy();
  containers.length = 0;
}

export function resetContainerRegistry(containers: ThrowableContainer[]): void {
  containers.length = 0;
}
