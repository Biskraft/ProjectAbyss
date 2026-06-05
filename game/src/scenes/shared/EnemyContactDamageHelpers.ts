import { aabbOverlap } from '@core/Physics';
import type { Enemy } from '@entities/Enemy';
import type { Player } from '@entities/Player';
import type { HitSparkManager } from '@effects/HitSpark';
import type { ScreenFlash } from '@effects/ScreenFlash';
import type { HUD } from '@ui/HUD';
import type { DamageNumberManager } from '@ui/DamageNumber';

interface EnemyContactDamageGame {
  hitstopFrames: number;
  camera: {
    shakeDirectional: (amount: number, dir: number, verticalBias: number) => void;
  };
}

interface ApplyEnemyContactDamageInput {
  player: Player;
  enemies: readonly Enemy<string>[];
  game: EnemyContactDamageGame;
  hud: HUD;
  damageNumbers: DamageNumberManager;
  hitSparks: HitSparkManager;
  screenFlash: ScreenFlash;
  vibrateGrounded?: (player: Player) => boolean;
}

export function applyEnemyContactDamageForPlayer(input: ApplyEnemyContactDamageInput): boolean {
  const { player } = input;
  for (const enemy of input.enemies) {
    if (!enemy.alive) continue;
    if (player.invincible || player.hp <= 0) continue;

    const overlap = aabbOverlap(
      { x: player.x, y: player.y, width: player.width, height: player.height },
      { x: enemy.x, y: enemy.y, width: enemy.width, height: enemy.height },
    );
    if (!overlap) continue;

    const dir = enemy.x + enemy.width / 2 > player.x + player.width / 2 ? -1 : 1;
    const dmg = Math.max(1, Math.floor(enemy.atk - player.def * 0.5));
    player.onHit(dir * 100, -50, 200);
    player.lastDamageSource = enemy.constructor.name.toLowerCase();
    player.hp -= dmg;
    input.hud.flashDamage();
    player.invincible = true;
    player.invincibleTimer = 1000;

    player.startVibrate(4, 5, input.vibrateGrounded?.(player) ?? true);
    player.triggerFlash();
    input.game.hitstopFrames = 3;
    input.game.camera.shakeDirectional(3, -dir, -0.3);
    input.screenFlash.flashDamage(dmg > 20);

    const hitX = player.x + player.width / 2;
    const hitY = player.y + player.height * 0.4;
    input.damageNumbers.spawn(hitX, hitY - 8, dmg, false);
    input.hitSparks.spawn(hitX, hitY, false, dir);

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
