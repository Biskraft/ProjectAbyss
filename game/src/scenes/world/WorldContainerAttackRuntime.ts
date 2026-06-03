import { aabbOverlap } from '@core/Physics';
import type { Player } from '@entities/Player';
import type { ThrowableContainer } from '@entities/ThrowableContainer';
import type { HitSparkManager } from '@effects/HitSpark';
import { getActivePlayerAttackHitbox } from '@systems/PlayerAttackHitbox';

interface WorldContainerAttackRuntimeDeps {
  getPlayer: () => Player;
  getContainers: () => ThrowableContainer[];
  getHitSparks: () => HitSparkManager;
  paintContainerImpact: (kind: ThrowableContainer['kind'], gx: number, gy: number, volume: number) => void;
  destroyContainerWithVFX: (container: ThrowableContainer) => void;
  removeContainerAt: (index: number) => void;
}

export class WorldContainerAttackRuntime {
  constructor(private readonly deps: WorldContainerAttackRuntimeDeps) {}

  checkAttack(): void {
    const player = this.deps.getPlayer();
    if (!player.isAttackActive()) return;

    const hitbox = getActivePlayerAttackHitbox(player);
    if (!hitbox) return;

    const damage = Math.max(1, Math.floor(player.atk));
    const containers = this.deps.getContainers();
    for (let i = containers.length - 1; i >= 0; i--) {
      const container = containers[i];
      if (container.destroyed || container.held) continue;
      const containerBox = {
        x: container.colX,
        y: container.colY,
        width: container.colW,
        height: container.colH,
      };
      if (!aabbOverlap(hitbox, containerBox)) continue;

      this.spawnHitSpark(container);
      if (container.kind === 'MetalCrate') continue;

      const impact = container.takeAttack(damage);
      if (impact) {
        this.deps.paintContainerImpact(container.kind, impact.gx, impact.gy, container.fluidVolume);
        this.deps.destroyContainerWithVFX(container);
        this.deps.removeContainerAt(i);
      }
    }
  }

  private spawnHitSpark(container: ThrowableContainer): void {
    this.deps.getHitSparks().spawn(
      container.colX + container.colW / 2,
      container.colY + container.colH / 2,
      true,
      0,
    );
  }
}
