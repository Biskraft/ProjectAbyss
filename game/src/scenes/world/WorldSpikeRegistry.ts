import type { Container } from 'pixi.js';
import { aabbOverlap } from '@core/Physics';
import type { Spike } from '@entities/Spike';
import {
  addEntityToLayer,
  destroyAndClearEntities,
} from '@scenes/shared/EntityLifecycleHelpers';

interface Aabb {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class WorldSpikeRegistry {
  readonly spikes: Spike[] = [];

  add(spike: Spike, entityLayer?: Container): void {
    addEntityToLayer(this.spikes, spike, entityLayer, { onlyAttachIfUnparented: true });
  }

  clear(): void {
    destroyAndClearEntities(this.spikes);
  }

  includes(spike: Spike): boolean {
    return this.spikes.includes(spike);
  }

  overlapsAabb(box: Aabb): boolean {
    return this.spikes.some((spike) => aabbOverlap(box, spike.getAABB()));
  }
}
