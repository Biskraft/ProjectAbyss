import type { Enemy } from '@entities/Enemy';
import { Debug } from '@core/Debug';

interface WorldEnemyRenderRuntimeDeps {
  getEnemies: () => Enemy<string>[];
}

export class WorldEnemyRenderRuntime {
  constructor(private readonly deps: WorldEnemyRenderRuntimeDeps) {}

  render(alpha: number): void {
    for (const enemy of this.deps.getEnemies()) {
      enemy.setDebugMonsterTypeVisible(Debug.infoVisible);
      enemy.render(alpha);
    }
  }
}
