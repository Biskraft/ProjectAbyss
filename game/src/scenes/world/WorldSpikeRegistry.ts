import type { Container } from 'pixi.js';
import { aabbOverlap } from '@core/Physics';
import type { Spike } from '@entities/Spike';

interface Aabb {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class WorldSpikeRegistry {
  readonly spikes: Spike[] = [];

  add(spike: Spike, entityLayer?: Container): void {
    this.spikes.push(spike);
    if (entityLayer && !spike.container.parent) entityLayer.addChild(spike.container);
  }

  clear(): void {
    for (const spike of this.spikes) spike.destroy();
    this.spikes.length = 0;
  }

  includes(spike: Spike): boolean {
    return this.spikes.includes(spike);
  }

  overlapsAabb(box: Aabb): boolean {
    return this.spikes.some((spike) => aabbOverlap(box, spike.getAABB()));
  }
}
