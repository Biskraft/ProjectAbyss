import { CombatConst } from '@data/constData';

export type DamageType = 'physical' | 'magical' | 'true';

export interface DamageParams {
  atk: number;
  def: number;
  skillMultiplier?: number;    // default 1.0
  defFactor?: number;          // default from CombatConst.DefFactor
  elementMultiplier?: number;  // default 1.0 (Phase 2)
  criticalMultiplier?: number; // default 1.0 (Phase 2)
  levelCorrection?: number;    // default 1.0 (Phase 2)
}

/** GDD System_Combat_Damage.md full formula, MVP defaults to 1.0 for Phase 2 params */
export function calculateDamage(params: DamageParams): number {
  const {
    atk,
    def,
    skillMultiplier = 1.0,
    defFactor = CombatConst.DefFactor,
    elementMultiplier = 1.0,
    criticalMultiplier = 1.0,
    levelCorrection = 1.0,
  } = params;

  const randomFactor = CombatConst.DamageRandomMin + Math.random() * (CombatConst.DamageRandomMax - CombatConst.DamageRandomMin);
  const raw = (atk * skillMultiplier - def * defFactor)
    * elementMultiplier
    * criticalMultiplier
    * levelCorrection
    * randomFactor;

  return Math.max(CombatConst.MinDamage, Math.floor(raw));
}
