export type DamageType = 'physical' | 'magical' | 'true';

export interface DamageParams {
  atk: number;
  def: number;
  skillMultiplier?: number;    // default 1.0
  defFactor?: number;          // default 0.5
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
    defFactor = 0.5,
    elementMultiplier = 1.0,
    criticalMultiplier = 1.0,
    levelCorrection = 1.0,
  } = params;

  const randomFactor = 0.9 + Math.random() * 0.2; // [0.9, 1.1)
  const raw = (atk * skillMultiplier - def * defFactor)
    * elementMultiplier
    * criticalMultiplier
    * levelCorrection
    * randomFactor;

  return Math.max(1, Math.floor(raw));
}
