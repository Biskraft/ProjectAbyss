import type { Enemy } from '@entities/Enemy';
import { isBossEnemy } from '@entities/EnemyMetadata';
import type { Player } from '@entities/Player';
import type { ThrowableContainer } from '@entities/ThrowableContainer';
import type { HitSparkManager } from '@effects/HitSpark';
import type { DamageNumberManager } from '@ui/DamageNumber';

interface ProcessThrownContainerEnemyHitsInput {
  containers: readonly ThrowableContainer[];
  enemies: readonly Enemy<string>[];
  player: Player;
  damageNumbers: DamageNumberManager;
  hitSparks: HitSparkManager;
  paintContainerImpact: (kind: ThrowableContainer['kind'], gx: number, gy: number, volume: number) => void;
  destroyContainerWithVFX: (container: ThrowableContainer) => void;
  removeContainerAt: (index: number) => void;
}

export function processThrownContainerEnemyHits(input: ProcessThrownContainerEnemyHitsInput): void {
  const { containers, enemies, player } = input;
  for (let i = containers.length - 1; i >= 0; i--) {
    const container = containers[i];
    if (container.destroyed || container.held) continue;
    if (!container.wasThrown || container.hasDealtImpact) continue;
    if (Math.abs(container.vx) < 60 && container.vy < 80) continue;

    const ax = container.colX;
    const ay = container.colY;
    const aw = container.colW;
    const ah = container.colH;
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      if (ax + aw <= enemy.x || ax >= enemy.x + enemy.width) continue;
      if (ay + ah <= enemy.y || ay >= enemy.y + enemy.height) continue;

      const baseDmg = Math.max(2, Math.floor(player.atk));
      const mult = container.kind === 'MetalCrate' ? 1.8 : 1.0;
      const dmg = Math.max(1, Math.floor(baseDmg * mult));
      enemy.hp -= dmg;

      const dir = container.vx >= 0 ? 1 : -1;
      const isBoss = isBossEnemy(enemy);
      if (isBoss) enemy.onHit(dir * 60, -40, 0);
      else enemy.onHit(dir * 220, -160, 400);

      input.damageNumbers.spawn(enemy.x + enemy.width / 2, enemy.y - 8, dmg, container.kind === 'MetalCrate');
      input.hitSparks.spawn(ax + aw / 2, ay + ah / 2, true, 0);
      if (enemy.hp <= 0) {
        enemy.hp = 0;
        enemy.onDeath();
      }

      container.hasDealtImpact = true;
      const impactGx = Math.floor((ax + aw / 2) / 16);
      const impactGy = Math.floor((ay + ah / 2) / 16);
      if (container.spec.paintTile !== 0 && container.fluidVolume > 0) {
        input.paintContainerImpact(container.kind, impactGx, impactGy, container.fluidVolume);
      }
      input.destroyContainerWithVFX(container);
      input.removeContainerAt(i);
      break;
    }
  }
}
