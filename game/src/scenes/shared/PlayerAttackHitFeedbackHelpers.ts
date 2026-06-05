import type { HitResult } from '@combat/HitManager';
import { SFX } from '@audio/Sfx';
import { t } from '@i18n';
import type { HitSparkManager } from '@effects/HitSpark';
import type { ScreenFlash } from '@effects/ScreenFlash';
import type { DamageNumberManager } from '@ui/DamageNumber';

interface ApplyPlayerAttackHitFeedbackInput {
  hits: readonly HitResult[];
  damageNumbers: DamageNumberManager;
  hitSparks: HitSparkManager;
  screenFlash: ScreenFlash;
  enableMilestone100?: boolean;
}

export function applyPlayerAttackHitFeedback(input: ApplyPlayerAttackHitFeedbackInput): void {
  const { damageNumbers, hitSparks, screenFlash } = input;
  for (const hit of input.hits) {
    damageNumbers.spawn(hit.hitX, hit.hitY - 8, hit.damage, hit.heavy, hit.critical);
    hitSparks.spawn(hit.hitX, hit.hitY, hit.heavy, hit.dirX);
    SFX.play('attack_hit');
    if (hit.heavy) {
      screenFlash.flashHit(true);
    }
    if (input.enableMilestone100 && hit.damage >= 100 && SFX.fireMilestone100Once()) {
      screenFlash.flashHit(true);
      damageNumbers.spawnSpecial(
        hit.hitX,
        hit.hitY - 24,
        t('ui.combat.milestone_100_damage'),
        0xffcc44,
      );
    }
  }
}
