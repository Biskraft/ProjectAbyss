import { GameAction, actionKey } from '@core/InputManager';
import { t } from '@i18n';
import type { TutorialHint } from './TutorialHint';

interface LowHpHealHintRuntimeSaveAccess {
  isLowHpHealToastFired: () => boolean;
  markLowHpHealToastFired: () => void;
}

interface LowHpHealHintRuntimeDeps {
  tutorialHint: TutorialHint;
  getHp: () => { hp: number; maxHp: number };
  saveAccess: LowHpHealHintRuntimeSaveAccess;
}

export class LowHpHealHintRuntime {
  private readonly saveAccess: LowHpHealHintRuntimeSaveAccess;

  constructor(private readonly deps: LowHpHealHintRuntimeDeps) {
    this.saveAccess = deps.saveAccess;
  }

  update(): void {
    const { hp, maxHp } = this.deps.getHp();
    if (this.saveAccess.isLowHpHealToastFired() || maxHp <= 0 || hp <= 0 || hp / maxHp > 0.4) return;

    this.saveAccess.markLowHpHealToastFired();
    this.deps.tutorialHint.tryShow('low_hp_heal', {
      keyLabel: actionKey(GameAction.FLASK),
      text: t('tutorial.heal'),
    });
  }
}
