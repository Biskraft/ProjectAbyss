import type { Enemy } from '@entities/Enemy';

interface WorldEnemyRenderRuntimeDeps {
  getEnemies: () => Enemy<string>[];
}

export class WorldEnemyRenderRuntime {
  constructor(private readonly deps: WorldEnemyRenderRuntimeDeps) {}

  render(alpha: number): void {
    for (const enemy of this.deps.getEnemies()) {
      enemy.render(alpha);
    }
  }
}
