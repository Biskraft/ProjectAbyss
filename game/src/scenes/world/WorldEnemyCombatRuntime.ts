import type { Enemy } from '@entities/Enemy';
import type { Player } from '@entities/Player';
import type { HitManager } from '@combat/HitManager';
import type { DamageNumberManager } from '@ui/DamageNumber';
import type { HitSparkManager } from '@effects/HitSpark';
import type { ScreenFlash } from '@effects/ScreenFlash';
import { applyPlayerAttackHitFeedback } from '@scenes/shared/PlayerAttackHitFeedbackHelpers';
import { getAliveEnemiesAsCombatTargets } from '@scenes/shared/EnemyRegistryHelpers';

interface WorldEnemyCombatRuntimeDeps {
  getPlayer: () => Player;
  getEnemies: () => Enemy<string>[];
  getHitManager: () => HitManager;
  getDamageNumbers: () => DamageNumberManager;
  getHitSparks: () => HitSparkManager;
  getScreenFlash: () => ScreenFlash;
  isAttackBlocked: (enemy: Enemy<string>) => boolean;
}

export class WorldEnemyCombatRuntime {
  constructor(private readonly deps: WorldEnemyCombatRuntimeDeps) {}

  updatePlayerAttack(): void {
    const player = this.deps.getPlayer();
    if (!player.isAttackActive()) return;

    const targets = getAliveEnemiesAsCombatTargets(
      this.deps.getEnemies(),
      enemy => !this.deps.isAttackBlocked(enemy),
    );
    const hits = this.deps.getHitManager().checkHits(
      player,
      player.comboIndex,
      player.hitList,
      targets,
    );

    applyPlayerAttackHitFeedback({
      hits,
      damageNumbers: this.deps.getDamageNumbers(),
      hitSparks: this.deps.getHitSparks(),
      screenFlash: this.deps.getScreenFlash(),
    });
  }
}
