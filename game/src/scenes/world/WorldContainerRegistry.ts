import type { Container } from 'pixi.js';
import type { ThrowableContainer } from '@entities/ThrowableContainer';
import {
  addContainersToRegistry,
  addContainerToRegistry,
  clearContainers,
  removeContainerAt,
} from '@scenes/shared/ContainerRegistryHelpers';

export class WorldContainerRegistry {
  private readonly containers: ThrowableContainer[] = [];

  add(container: ThrowableContainer, entityLayer?: Container): void {
    addContainerToRegistry(this.containers, container, entityLayer);
  }

  addMany(containers: Iterable<ThrowableContainer>, entityLayer?: Container): void {
    addContainersToRegistry(this.containers, containers, entityLayer);
  }

  getContainers(): ThrowableContainer[] {
    return this.containers;
  }

  removeAt(index: number): void {
    removeContainerAt(this.containers, index);
  }

  clear(): void {
    clearContainers(this.containers);
  }
}
