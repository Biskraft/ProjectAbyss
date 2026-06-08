import type { Enemy } from '@entities/Enemy';
import type { HUD } from './HUD';
import { isBossEnemy, markBossBarShown, wasBossBarShown } from '@entities/EnemyMetadata';

interface BossHpRuntimeDeps {
  getHud: () => HUD;
  getEnemies: () => Enemy<string>[];
  defaultBossName: string;
  isExtraEngaged?: () => boolean;
}

type BossEnemy = Enemy<string> & {
  enemyType?: string;
};

export class BossHpRuntime {
  constructor(private readonly deps: BossHpRuntimeDeps) {}

  update(): void {
    const activeBoss = this.deps.getEnemies().find((enemy): enemy is BossEnemy =>
      isBossEnemy(enemy) && enemy.alive,
    );
    if (!activeBoss) return;

    const state = activeBoss.fsm.currentState;
    const fsmEngaged = state !== null && state !== 'idle' && state !== 'death';
    const wasHit = activeBoss.hp < activeBoss.maxHp;
    const extraEngaged = this.deps.isExtraEngaged?.() ?? false;
    const engaged = fsmEngaged || wasHit || extraEngaged;
    if (!engaged) return;

    const hud = this.deps.getHud();
    if (!wasBossBarShown(activeBoss)) {
      markBossBarShown(activeBoss);
      hud.showBossHP(
        activeBoss.enemyType ?? this.deps.defaultBossName,
        activeBoss.hp,
        activeBoss.maxHp,
      );
    }
    hud.updateBossHP(activeBoss.hp);
  }
}
