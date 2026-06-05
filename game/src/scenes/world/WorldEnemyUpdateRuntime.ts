import type { Enemy } from '@entities/Enemy';

interface WorldEnemyUpdateRuntimeDeps {
  getEnemies: () => Enemy<string>[];
}

export class WorldEnemyUpdateRuntime {
  constructor(private readonly deps: WorldEnemyUpdateRuntimeDeps) {}

  update(dt: number): void {
    const enemies = this.deps.getEnemies();
    for (let i = enemies.length - 1; i >= 0; i--) {
      enemies[i].update(dt);
    }
  }
}
