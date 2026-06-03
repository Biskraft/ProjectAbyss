import type { Container } from 'pixi.js';
import type { ThrowableContainer } from '@entities/ThrowableContainer';

export class WorldContainerRegistry {
  readonly containers: ThrowableContainer[] = [];

  add(container: ThrowableContainer, entityLayer?: Container): void {
    this.containers.push(container);
    if (entityLayer && !container.container.parent) entityLayer.addChild(container.container);
  }

  addMany(containers: Iterable<ThrowableContainer>, entityLayer?: Container): void {
    for (const container of containers) this.add(container, entityLayer);
  }

  removeAt(index: number): void {
    const container = this.containers[index];
    container.destroy();
    this.containers.splice(index, 1);
  }

  clear(): void {
    for (const container of this.containers) container.destroy();
    this.containers.length = 0;
  }
}
