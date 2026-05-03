/**
 * RoomGraphArchetypes.ts — DEC-039 7 archetype 카탈로그.
 *
 * 5색 기질 × 부색 (DEC-036) = 25 조합 → 7 archetype 매핑. 같은 archetype 안에서는
 * RNG 시드 (itemUid) 로 placement 무한 변주. 1000+ 무기 규모 대응.
 *
 * U step 폐기 (사용자 결정 2026-05-03) — vertical dive 메타포 보존.
 *
 * Archetype 7 가지:
 *   1. direct       — D 80%, 분기 적음. 빠른 직선 다이브.
 *   2. zigzag       — D 40%, 좌우 균형. 평정.
 *   3. switchback   — D 20%, 좌우 우세. S자 / 갈지자.
 *   4. spiral       — D 25%, 한쪽 우세. 나선형 (은밀).
 *   5. wide_sprawl  — D 30%, 분기 풍부. 옆으로 펼친 미로.
 *   6. crooked      — D 35%, 분기 거의 없음. 휘어진 외길.
 *   7. branchy_maze — D 50%, 분기 매우 풍부 깊음. 끝없는 미로.
 */

export type Temperament = 'forge' | 'iron' | 'rust' | 'spark' | 'shadow';

export type Archetype =
  | 'direct'
  | 'zigzag'
  | 'switchback'
  | 'spiral'
  | 'wide_sprawl'
  | 'crooked'
  | 'branchy_maze';

export interface ArchetypeWeights {
  /** CP zigzag 가중치 — sum 은 1.0. */
  cpD: number;
  cpL: number;
  cpR: number;
  /** spokeBudget 중 branch 에 할당할 비율 (0..1). */
  branchBudgetPct: number;
  /** branch 의 최대 깊이 (1..3). */
  branchMaxDepth: number;
  /** spiral 일 때 한쪽 (L 또는 R) 우세 표시. true 면 L 우세, false 면 R 우세. spiral 외 무시. */
  spiralBiasLeft: boolean;
}

/**
 * Archetype 별 가중치 카탈로그.
 *
 * 가중치 산출 시 RNG 시드는 무기별 itemUid 가 담당 (placement 다양화).
 * 본 표는 *archetype 정체성* 만 정의 — 같은 archetype 무기들도 시드로 다름.
 */
export const ARCHETYPE_WEIGHTS: Record<Archetype, ArchetypeWeights> = {
  direct:       { cpD: 0.80, cpL: 0.10, cpR: 0.10, branchBudgetPct: 0.15, branchMaxDepth: 1, spiralBiasLeft: true },
  zigzag:       { cpD: 0.40, cpL: 0.30, cpR: 0.30, branchBudgetPct: 0.25, branchMaxDepth: 2, spiralBiasLeft: true },
  switchback:   { cpD: 0.20, cpL: 0.40, cpR: 0.40, branchBudgetPct: 0.25, branchMaxDepth: 2, spiralBiasLeft: true },
  spiral:       { cpD: 0.25, cpL: 0.50, cpR: 0.25, branchBudgetPct: 0.25, branchMaxDepth: 2, spiralBiasLeft: true },
  wide_sprawl:  { cpD: 0.30, cpL: 0.35, cpR: 0.35, branchBudgetPct: 0.40, branchMaxDepth: 2, spiralBiasLeft: true },
  crooked:      { cpD: 0.35, cpL: 0.32, cpR: 0.33, branchBudgetPct: 0.10, branchMaxDepth: 1, spiralBiasLeft: true },
  branchy_maze: { cpD: 0.50, cpL: 0.25, cpR: 0.25, branchBudgetPct: 0.50, branchMaxDepth: 3, spiralBiasLeft: true },
};

/**
 * 5색 기질 × 부색 = 25 조합 → 7 archetype 매핑 (DEC-039 사용자 결정 2026-05-03).
 *
 * 매핑 룰:
 *   - 같은 색끼리 = 그 색의 정체성을 가장 강하게 표현
 *   - 다른 색 = 두 정서의 혼합 (주색이 dominant)
 *   - 7 archetype 만 사용 — 변별 한계 + 단순성
 */
const TEMPERAMENT_PAIR_TO_ARCHETYPE: Record<string, Archetype> = {
  // Forge 주색
  'forge_forge':   'direct',        // 순수 분노, 직선
  'forge_iron':    'zigzag',        // 분노에 절제
  'forge_rust':    'switchback',    // 분노 후 후회
  'forge_spark':   'crooked',       // 들끓는 분노, 외길
  'forge_shadow':  'spiral',        // 은밀한 분노

  // Iron 주색
  'iron_iron':     'zigzag',        // 균형 그 자체
  'iron_rust':     'wide_sprawl',   // 정렬된 미로
  'iron_spark':    'crooked',       // 빠른 균형
  'iron_shadow':   'spiral',        // 냉정한 우회
  'iron_forge':    'direct',        // 결연한 직진

  // Rust 주색
  'rust_rust':     'branchy_maze',  // 깊은 체념의 미로
  'rust_iron':     'wide_sprawl',   // 단정한 미로
  'rust_spark':    'branchy_maze',  // 호기심 가득한 미로
  'rust_shadow':   'wide_sprawl',   // 어두운 미로
  'rust_forge':    'switchback',    // 후회의 갈지자

  // Spark 주색
  'spark_spark':   'crooked',       // 빠른 호기심
  'spark_iron':    'crooked',       // 절제된 호기심
  'spark_rust':    'branchy_maze',  // 길 잃은 호기심
  'spark_shadow':  'spiral',        // 비밀스런 호기심
  'spark_forge':   'direct',        // 가벼운 돌진

  // Shadow 주색
  'shadow_shadow': 'spiral',        // 짙은 은밀
  'shadow_iron':   'spiral',        // 단정한 은밀
  'shadow_rust':   'wide_sprawl',   // 깊은 어둠
  'shadow_spark':  'switchback',    // 호기심의 은밀
  'shadow_forge':  'switchback',    // 폭발적 은밀
};

/**
 * 무기의 (주색, 부색) 으로 archetype 결정. 주색만 있으면 (주색, 주색) fallback.
 * 둘 다 없으면 'zigzag' (가장 균형 잡힌 기본형) 반환.
 */
export function archetypeFor(
  primary: Temperament | undefined,
  secondary: Temperament | undefined,
): Archetype {
  if (!primary) return 'zigzag';
  const pri = primary;
  const sec = secondary ?? primary;
  return TEMPERAMENT_PAIR_TO_ARCHETYPE[`${pri}_${sec}`] ?? 'zigzag';
}

/**
 * Archetype 가중치 조회. spiral 케이스에서 itemUid 의 비트로 좌/우 우세 결정해
 * 같은 archetype 무기들도 시각 다양성 확보.
 */
export function getArchetypeWeights(arch: Archetype, itemUid: number): ArchetypeWeights {
  const base = ARCHETYPE_WEIGHTS[arch];
  if (arch === 'spiral') {
    // itemUid 의 LSB 로 spiral 의 L/R 방향 우세 결정 (deterministic per weapon).
    const biasLeft = (itemUid & 1) === 0;
    if (!biasLeft) {
      // R 우세 — L/R 가중치 swap.
      return { ...base, cpL: base.cpR, cpR: base.cpL, spiralBiasLeft: false };
    }
  }
  return base;
}
