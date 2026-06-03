import { aabbOverlap } from '@core/Physics';
import type { Player } from '@entities/Player';
import type { Enemy } from '@entities/Enemy';
import type { Game } from '../../Game';
import type { HUD } from '@ui/HUD';
import type { DamageNumberManager } from '@ui/DamageNumber';
import type { HitSparkManager } from '@effects/HitSpark';
import type { ScreenFlash } from '@effects/ScreenFlash';

interface ItemWorldEnemyContactRuntimeDeps {
  game: Game;
  getPlayer: () => Player;
  getEnemies: () => Enemy<string>[];
  getHud: () => HUD;
  getDamageNumbers: () => DamageNumberManager;
  getHitSparks: () => HitSparkManager;
  getScreenFlash: () => ScreenFlash;
}

export class ItemWorldEnemyContactRuntime {
  constructor(private readonly deps: ItemWorldEnemyContactRuntimeDeps) {}

  update(): void {
    const player = this.deps.getPlayer();
    for (const enemy of this.deps.getEnemies()) {
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
      this.deps.getHud().flashDamage();
      player.invincible = true;
      player.invincibleTimer = 1000;

      player.startVibrate(4, 5, true);
      player.triggerFlash();
      this.deps.game.hitstopFrames = 3;
      this.deps.game.camera.shakeDirectional(3, -dir, -0.3);
      this.deps.getScreenFlash().flashDamage(dmg > 20);
      const hitX = player.x + player.width / 2;
      const hitY = player.y + player.height * 0.4;
      this.deps.getDamageNumbers().spawn(hitX, hitY - 8, dmg, false);
      this.deps.getHitSparks().spawn(hitX, hitY, false, dir);

      if (player.hp <= 0) {
        player.hp = 0;
        player.onDeath();
        this.deps.game.hitstopFrames = 8;
        this.deps.getScreenFlash().flashDamage(true);
      }
      break;
    }
  }
}
