import type { LdtkLevel } from '@level/LdtkLoader';
import type { ExitDir } from '@level/ItemWorldTemplates';
import type { PRNG } from '@utils/PRNG';

/**
 * LDtk pool 에서 exits + roomType 매칭. ItemWorldScene.pickTemplateForCell 의
 * 단순화 버전: exits 정확 매칭 + type 정확 매칭 우선, 그 다음 exits 만,
 * 그 다음 type 만, 모두 실패 시 null.
 */
export function findInventoryLdtkTemplate(
  pool: LdtkLevel[],
  exits: ExitDir[],
  desiredType: string,
  rng: PRNG,
): LdtkLevel | null {
  const memFiltered = pool.filter(t => !/^memory_/i.test(t.identifier));
  const sortedExits = [...exits].sort().join('');
  const matchExit = (lvl: LdtkLevel): boolean => [...lvl.exits].sort().join('') === sortedExits;

  const byTypeAndExit = memFiltered.filter(t => t.roomType === desiredType && matchExit(t));
  if (byTypeAndExit.length > 0) return byTypeAndExit[rng.nextInt(0, byTypeAndExit.length - 1)];

  const byExit = memFiltered.filter(matchExit);
  if (byExit.length > 0) return byExit[rng.nextInt(0, byExit.length - 1)];

  const byType = memFiltered.filter(t => t.roomType === desiredType);
  if (byType.length > 0) return byType[rng.nextInt(0, byType.length - 1)];

  if (memFiltered.length > 0) return memFiltered[rng.nextInt(0, memFiltered.length - 1)];
  return null;
}
