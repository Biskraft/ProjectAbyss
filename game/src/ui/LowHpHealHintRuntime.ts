import { GameAction, actionKey } from '@core/InputManager';
import { t } from '@i18n';
import { isLowHpHealToastFired, markLowHpHealToastFired } from '@save/PlayerSave';
import type { TutorialHint } from './TutorialHint';

interface LowHpHealHintRuntimeDeps {
  tutorialHint: TutorialHint;
  getHp: () => { hp: number; maxHp: number };
}

export class LowHpHealHintRuntime {
  constructor(private readonly deps: LowHpHealHintRuntimeDeps) {}

  update(): void {
    const { hp, maxHp } = this.deps.getHp();
    if (isLowHpHealToastFired() || maxHp <= 0 || hp <= 0 || hp / maxHp > 0.4) return;

    markLowHpHealToastFired();
    this.deps.tutorialHint.tryShow('low_hp_heal', {
      keyLabel: actionKey(GameAction.FLASK),
      text: t('tutorial.heal'),
    });
  }
}
