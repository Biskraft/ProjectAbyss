import { getAttackHitbox, type ComboStep } from '@combat/CombatData';

export interface PlayerAttackSource {
  x: number;
  y: number;
  width: number;
  height: number;
  facingRight?: boolean;
  comboIndex: number;
  isAttackActive(): boolean;
  getAttackStep(comboIndex: number): ComboStep | null;
}

export interface AttackAabb {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getActivePlayerAttackHitbox(player: PlayerAttackSource): AttackAabb | null {
  if (!player.isAttackActive()) return null;
  const step = player.getAttackStep(player.comboIndex);
  if (!step) return null;
  return getAttackHitbox(
    player.x,
    player.y,
    player.width,
    player.height,
    player.facingRight ?? true,
    step,
  );
}
