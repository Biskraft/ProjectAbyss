import { updateContainerBodies } from './ContainerBodyUpdateHelpers';
import { resolveContainerContainerCollisions } from './ContainerContainerCollisionHelpers';
import { resolveEnemyContainerOverlaps } from './ContainerEnemyCollisionHelpers';
import { processThrownContainerEnemyHits } from './ContainerImpactHelpers';
import { resolvePlayerContainerOverlaps } from './ContainerPlayerCollisionHelpers';
import type { ContainerPhysicsRuntimeDeps } from './ContainerPhysicsRuntimeContracts';

export function updateContainerPhysicsRuntime(
  deps: ContainerPhysicsRuntimeDeps,
  dtMs: number,
): void {
  updateContainerBodies({
    containers: deps.getContainers(),
    collisionGrid: deps.getCollisionGrid(),
    tileMutator: deps.getTileMutator(),
    paintContainerImpact: deps.paintContainerImpact,
    applyContainerEffectToFluid: deps.applyContainerEffectToFluid,
    destroyContainerWithVFX: deps.destroyContainerWithVFX,
    removeContainerAt: deps.removeContainerAt,
  }, dtMs);
  processThrownContainerEnemyHits({
    containers: deps.getContainers(),
    enemies: deps.getEnemies(),
    player: deps.getPlayer(),
    damageNumbers: deps.getDamageNumbers(),
    hitSparks: deps.getHitSparks(),
    paintContainerImpact: deps.paintContainerImpact,
    destroyContainerWithVFX: deps.destroyContainerWithVFX,
    removeContainerAt: deps.removeContainerAt,
  });
  resolvePlayerContainerOverlaps({
    player: deps.getPlayer(),
    containers: deps.getContainers(),
    collisionGrid: deps.getCollisionGrid(),
  });
  resolveEnemyContainerOverlaps({
    enemies: deps.getEnemies(),
    containers: deps.getContainers(),
  });
  resolveContainerContainerCollisions({
    containers: deps.getContainers(),
    collisionGrid: deps.getCollisionGrid(),
  });
  deps.flushContainerFluidChanges();
}
