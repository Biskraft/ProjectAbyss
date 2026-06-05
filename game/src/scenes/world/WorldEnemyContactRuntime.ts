import type { Enemy } from '@entities/Enemy';
import type { Player } from '@entities/Player';
import type { ScreenFlash } from '@effects/ScreenFlash';
import type { Game } from '../../Game';
import type { HUD } from '@ui/HUD';
import type { DamageNumberManager } from '@ui/DamageNumber';
import type { HitSparkManager } from '@effects/HitSpark';
import { applyEnemyContactDamageForPlayer } from '@scenes/shared/EnemyContactDamageHelpers';

interface WorldEnemyContactRuntimeDeps {
  game: Game;
  getPlayer: () => Player;
  getEnemies: () => readonly Enemy<string>[];
  getHud: () => HUD;
  getDamageNumbers: () => DamageNumberManager;
  getHitSparks: () => HitSparkManager;
  getScreenFlash: () => ScreenFlash;
}

export class WorldEnemyContactRuntime {
  constructor(private readonly deps: WorldEnemyContactRuntimeDeps) {}

  update(): void {
    applyEnemyContactDamageForPlayer({
      player: this.deps.getPlayer(),
      enemies: this.deps.getEnemies(),
      game: this.deps.game,
      hud: this.deps.getHud(),
      damageNumbers: this.deps.getDamageNumbers(),
      hitSparks: this.deps.getHitSparks(),
      screenFlash: this.deps.getScreenFlash(),
      vibrateGrounded: player => player.vy === 0,
    });
  }
}
