import type { Container } from 'pixi.js';
import { Debug } from '@core/Debug';
import { BurnableProp } from '@entities/BurnableProp';
import { applyBurnableZones } from '@level/BurnableZonePass';
import type { LdtkLevel } from '@level/LdtkLoader';
import type { TileMutator } from '@systems/TileMutator';
import type { WorldBurnablePropRegistry } from './WorldBurnablePropRegistry';

interface WorldBurnablePropRuntimeDeps {
  getCollisionGrid: () => number[][];
  getEntityLayer: () => Container;
  getRegistry: () => WorldBurnablePropRegistry;
  getTileMutator: () => TileMutator;
  spawnAsh: (cx: number, baseY: number, footprintW: number) => void;
  isDebugMode: () => boolean;
}

export class WorldBurnablePropRuntime {
  constructor(private readonly deps: WorldBurnablePropRuntimeDeps) {}

  clear(): void {
    const tileMutator = this.deps.getTileMutator();
    for (const prop of this.deps.getRegistry().props) {
      tileMutator.unregisterBurnable(prop);
    }
    this.deps.getRegistry().clear();
  }

  spawnFromBurnableZones(level: LdtkLevel): void {
    const collisionGrid = this.deps.getCollisionGrid();
    const specs = applyBurnableZones(collisionGrid, level.entities);
    const registry = this.deps.getRegistry();
    const tileMutator = this.deps.getTileMutator();
    const entityLayer = this.deps.getEntityLayer();

    for (const spec of specs) {
      const prop = new BurnableProp(spec.id, spec.gx, spec.gy);
      tileMutator.registerBurnable(prop);
      registry.add(prop, entityLayer);
    }

    if (this.deps.isDebugMode()) {
      const zoneCount = level.entities.filter(entity => entity.type === 'BurnableZone').length;
      Debug.log(`[BurnableZone] level="${level.identifier}" zones=${zoneCount} props=${specs.length}`);
    }
  }

  update(dt: number): void {
    const props = this.deps.getRegistry().props;
    const tileMutator = this.deps.getTileMutator();

    for (let i = props.length - 1; i >= 0; i--) {
      const prop = props[i];
      prop.update(dt);
      if (!prop.destroyed) continue;

      if (prop.spec.anchor !== 'ceiling') {
        this.deps.spawnAsh(prop.x + prop.width / 2, prop.y + prop.height - 1, prop.width);
      }
      tileMutator.unregisterBurnable(prop);
      this.deps.getRegistry().removeAt(i);
    }
  }
}
