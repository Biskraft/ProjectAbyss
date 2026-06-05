import type { ThrowableContainer } from '@entities/ThrowableContainer';
import {
  clearContainers,
  removeContainerAt,
  resetContainerRegistry,
} from '@scenes/shared/ContainerRegistryHelpers';
import { settleContainersAtSpawn } from '@scenes/shared/ContainerSpawnSettleHelpers';

export class ItemWorldContainerRegistry {
  private readonly containers: ThrowableContainer[] = [];

  clear(): void {
    clearContainers(this.containers);
  }

  reset(): void {
    resetContainerRegistry(this.containers);
  }

  getContainers(): ThrowableContainer[] {
    return this.containers;
  }

  removeAt(index: number): void {
    removeContainerAt(this.containers, index);
  }

  settleAll(fullGrid: number[][]): void {
    settleContainersAtSpawn(this.containers, fullGrid);
  }

}
