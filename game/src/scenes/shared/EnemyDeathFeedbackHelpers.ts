import type { Enemy } from '@entities/Enemy';
import type { DeathParticleManager } from '@effects/DeathParticles';

export function spawnEnemyDeathParticles(
  deathParticles: DeathParticleManager,
  enemy: Enemy<string>,
  heavy = false,
): void {
  deathParticles.spawn(
    enemy.x + enemy.width / 2,
    enemy.y + enemy.height / 2,
    heavy,
  );
}
