import { aabbOverlap } from '@core/Physics';
import type { Enemy } from '@entities/Enemy';
import type { Player } from '@entities/Player';
import type { HitSparkManager } from '@effects/HitSpark';
import type { ScreenFlash } from '@effects/ScreenFlash';

interface EnemyMeleeAttackDamageGame {
  hitstopFrames: number;
  camera: {
    shakeDirectional: (amount: number, dir: number, verticalBias: number) => void;
  };
}

interface ApplyEnemyMeleeAttackDamageInput {
  player: Player;
  enemies: readonly Enemy<string>[];
  game: EnemyMeleeAttackDamageGame;
  hitSparks: HitSparkManager;
  screenFlash: ScreenFlash;
  isMeleeAttacking: (enemy: Enemy<string>) => boolean;
}

export function applyEnemyMeleeAttackDamageForPlayer(input: ApplyEnemyMeleeAttackDamageInput): boolean {
  const { player } = input;
  for (const enemy of input.enemies) {
    if (!enemy.alive) continue;
    if (!input.isMeleeAttacking(enemy)) continue;
    if (player.invincible || player.hp <= 0) continue;

    const attackBox = enemy.getAttackAABB?.() ?? null;
    if (attackBox) {
      if (!aabbOverlap(
        attackBox,
        { x: player.x, y: player.y, width: player.width, height: player.height },
      )) continue;
    } else {
      const dx = Math.abs((enemy.x + enemy.width / 2) - (player.x + player.width / 2));
      const dy = Math.abs((enemy.y + enemy.height / 2) - (player.y + player.height / 2));
      if (dx >= enemy.width + player.width || dy >= Math.max(enemy.height, player.height)) continue;
    }

    const dir = enemy.facingRight ? 1 : -1;
    const dmg = Math.max(1, enemy.atk - player.def * 0.5);
    player.onHit(dir * 400, -200, 200);
    player.hp -= dmg;
    player.invincible = true;
    player.invincibleTimer = 1000;

    player.startVibrate(4, 5, player.vy === 0);
    player.triggerFlash();
    input.game.hitstopFrames = 3;
    input.game.camera.shakeDirectional(3, dir, -0.3);
    input.screenFlash.flashDamage(dmg > 20);

    const hitX = player.x + player.width / 2;
    const hitY = player.y + player.height * 0.4;
    input.hitSparks.spawn(hitX, hitY, false, -dir);

    if (player.hp <= 0) {
      player.hp = 0;
      player.onDeath();
      input.game.hitstopFrames = 8;
      input.screenFlash.flashDamage(true);
    }

    return true;
  }

  return false;
}
