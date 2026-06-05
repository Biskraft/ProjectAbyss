import type { Enemy } from '@entities/Enemy';
import { GoldenMonster } from '@entities/GoldenMonster';
import { isBossEnemy } from '@entities/EnemyMetadata';
import { trackEnemyKill } from '@utils/Analytics';

type EnemyKillArea = 'world' | 'itemworld';

export function trackEnemyKillForArea(area: EnemyKillArea, enemy: Enemy<string>): void {
  trackEnemyKill({
    area,
    enemy_type: enemy.constructor.name.toLowerCase(),
    is_boss: isBossEnemy(enemy),
    is_elite: enemy instanceof GoldenMonster,
  });
}
