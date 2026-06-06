import type { Enemy } from '@entities/Enemy';
import type { Container } from 'pixi.js';
import { updateEnemies } from '@scenes/shared/EnemyRegistryHelpers';

interface WorldEnemyUpdateRuntimeDeps {
  getEnemies: () => Enemy<string>[];
  getEntityLayer: () => Container;
}

export class WorldEnemyUpdateRuntime {
  constructor(private readonly deps: WorldEnemyUpdateRuntimeDeps) {}

  update(dt: number): void {
    updateEnemies(this.deps.getEnemies(), dt, this.deps.getEntityLayer());
  }
}
