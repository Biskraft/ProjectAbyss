import type { Enemy } from '@entities/Enemy';
import type { HUD } from './HUD';

interface BossHpRuntimeDeps {
  getHud: () => HUD;
  getEnemies: () => Enemy<string>[];
  defaultBossName: string;
  isExtraEngaged?: () => boolean;
}

type BossEnemy = Enemy<string> & {
  _isBoss?: boolean;
  _bossBarShown?: boolean;
  enemyType?: string;
};

export class BossHpRuntime {
  constructor(private readonly deps: BossHpRuntimeDeps) {}

  update(): void {
    const activeBoss = this.deps.getEnemies().find((enemy): enemy is BossEnemy =>
      !!(enemy as BossEnemy)._isBoss && enemy.alive,
    );
    if (!activeBoss) return;

    const state = activeBoss.fsm.currentState;
    const fsmEngaged = state !== null && state !== 'idle' && state !== 'death';
    const wasHit = activeBoss.hp < activeBoss.maxHp;
    const engaged = fsmEngaged || wasHit || (this.deps.isExtraEngaged?.() ?? false);
    if (!engaged) return;

    const hud = this.deps.getHud();
    if (!activeBoss._bossBarShown) {
      activeBoss._bossBarShown = true;
      hud.showBossHP(
        activeBoss.enemyType ?? this.deps.defaultBossName,
        activeBoss.hp,
        activeBoss.maxHp,
      );
    }
    hud.updateBossHP(activeBoss.hp);
  }
}
