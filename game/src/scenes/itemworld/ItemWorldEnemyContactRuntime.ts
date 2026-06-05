import type { Player } from '@entities/Player';
import type { Enemy } from '@entities/Enemy';
import type { Game } from '../../Game';
import type { HUD } from '@ui/HUD';
import type { DamageNumberManager } from '@ui/DamageNumber';
import type { HitSparkManager } from '@effects/HitSpark';
import type { ScreenFlash } from '@effects/ScreenFlash';
import { applyEnemyContactDamageForPlayer } from '@scenes/shared/EnemyContactDamageHelpers';

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
    applyEnemyContactDamageForPlayer({
      player: this.deps.getPlayer(),
      enemies: this.deps.getEnemies(),
      game: this.deps.game,
      hud: this.deps.getHud(),
      damageNumbers: this.deps.getDamageNumbers(),
      hitSparks: this.deps.getHitSparks(),
      screenFlash: this.deps.getScreenFlash(),
    });
  }
}
