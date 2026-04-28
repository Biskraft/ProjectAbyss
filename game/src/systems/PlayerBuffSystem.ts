import { sacredSave } from '@save/PlayerSave';
import { BuffConst } from '@data/constData';

export interface PlayerStatBlock {
  atk: number;
  def: number;
}

export interface PlayerStatBuff {
  id: string;
  atkFlat?: number;
  atkMul?: number;
  defFlat?: number;
  defMul?: number;
}

export const BEGINNER_GRACE_BUFF: PlayerStatBuff = {
  id: 'beginner_grace',
  atkFlat: BuffConst.BeginnerGraceAtkFlat,
  defFlat: BuffConst.BeginnerGraceDefFlat,
};

export function isBeginnerGraceActive(): boolean {
  return !sacredSave.isFirstItemWorldBossDefeated();
}

export function getActivePlayerBuffs(): PlayerStatBuff[] {
  return isBeginnerGraceActive() ? [BEGINNER_GRACE_BUFF] : [];
}

export function formatActivePlayerBuffsDebug(): string {
  const buffs = getActivePlayerBuffs();
  if (buffs.length === 0) return 'buff:none';
  return `buff:${buffs.map(buff => {
    const parts = [buff.id];
    if (buff.atkFlat) parts.push(`atk+${buff.atkFlat}`);
    if (buff.atkMul && buff.atkMul !== 1) parts.push(`atk*${buff.atkMul}`);
    if (buff.defFlat) parts.push(`def+${buff.defFlat}`);
    if (buff.defMul && buff.defMul !== 1) parts.push(`def*${buff.defMul}`);
    return parts.join('/');
  }).join(',')}`;
}

export function applyPlayerStatBuffs(base: PlayerStatBlock): PlayerStatBlock {
  let atk = base.atk;
  let def = base.def;

  for (const buff of getActivePlayerBuffs()) {
    atk = (atk + (buff.atkFlat ?? 0)) * (buff.atkMul ?? 1);
    def = (def + (buff.defFlat ?? 0)) * (buff.defMul ?? 1);
  }

  return {
    atk: Math.max(1, Math.floor(atk)),
    def: Math.max(0, Math.floor(def)),
  };
}

export function removeBeginnerGraceFromStats(stats: PlayerStatBlock): PlayerStatBlock {
  const atkMul = BEGINNER_GRACE_BUFF.atkMul ?? 1;
  const defMul = BEGINNER_GRACE_BUFF.defMul ?? 1;
  return {
    atk: Math.max(1, Math.floor(stats.atk / atkMul - (BEGINNER_GRACE_BUFF.atkFlat ?? 0))),
    def: Math.max(0, Math.floor(stats.def / defMul - (BEGINNER_GRACE_BUFF.defFlat ?? 0))),
  };
}
