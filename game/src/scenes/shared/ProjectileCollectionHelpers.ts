import type { Container } from 'pixi.js';
import type { Enemy } from '@entities/Enemy';
import type { Projectile } from '@entities/Projectile';

interface AddProjectileOptions {
  onlyAttachIfUnparented?: boolean;
}

export function addProjectileToLayer(
  projectiles: Projectile[],
  projectile: Projectile,
  entityLayer: Container,
  options: AddProjectileOptions = {},
): void {
  projectiles.push(projectile);
  if (options.onlyAttachIfUnparented && projectile.container.parent) return;
  entityLayer.addChild(projectile.container);
}

export function clearProjectiles(projectiles: Projectile[]): void {
  for (const projectile of projectiles) projectile.destroy();
  projectiles.length = 0;
}

export function removeProjectileAt(projectiles: Projectile[], index: number): void {
  const projectile = projectiles[index];
  projectile.destroy();
  projectiles.splice(index, 1);
}

type ProjectileEmitterEnemy = Enemy<string> & {
  pendingProjectiles: Projectile[];
};

function hasPendingProjectiles(enemy: Enemy<string>): enemy is ProjectileEmitterEnemy {
  const candidate = enemy as Enemy<string> & { pendingProjectiles?: unknown };
  return Array.isArray(candidate.pendingProjectiles);
}

interface UpdateProjectileCollectionInput {
  projectiles: Projectile[];
  dtMs: number;
  tryDeflectProjectile?: (projectile: Projectile) => boolean;
  tryHitPlayer?: (projectile: Projectile) => boolean;
}

export function updateProjectileCollection(input: UpdateProjectileCollectionInput): void {
  const { projectiles, dtMs, tryDeflectProjectile, tryHitPlayer } = input;
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const projectile = projectiles[i];
    projectile.update(dtMs);

    if (!projectile.alive) {
      removeProjectileAt(projectiles, i);
      continue;
    }

    if (tryDeflectProjectile?.(projectile)) {
      removeProjectileAt(projectiles, i);
      continue;
    }

    if (tryHitPlayer?.(projectile)) {
      removeProjectileAt(projectiles, i);
    }
  }
}

export function collectPendingGhostProjectiles(
  enemies: readonly Enemy<string>[],
  projectiles: Projectile[],
  entityLayer: Container,
  options: AddProjectileOptions = {},
): void {
  for (const enemy of enemies) {
    if (!enemy.alive || !hasPendingProjectiles(enemy)) continue;
    for (const projectile of enemy.pendingProjectiles) {
      projectile.bindCollisionGrid(enemy.roomData);
      addProjectileToLayer(projectiles, projectile, entityLayer, options);
    }
    enemy.pendingProjectiles.length = 0;
  }
}
