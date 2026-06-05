import type { Player } from '@entities/Player';
import type { Enemy } from '@entities/Enemy';
import { Skeleton } from '@entities/Skeleton';
import { Ghost } from '@entities/Ghost';
import { GoldenMonster, getDifficultyTier } from '@entities/GoldenMonster';
import { PRNG } from '@utils/PRNG';
import { initializeEnemySpawnedEntity } from '@scenes/shared/EnemySpawnHelpers';

export function createLegacyWorldRoomEnemies({
  currentCol,
  currentRow,
  startCol,
  startRow,
  onCriticalPath,
  roomWidth,
  roomHeight,
  tileSize,
  collisionGrid,
  player,
}: {
  currentCol: number;
  currentRow: number;
  startCol: number;
  startRow: number;
  onCriticalPath: boolean;
  roomWidth: number;
  roomHeight: number;
  tileSize: number;
  collisionGrid: number[][];
  player: Player;
}): Enemy<string>[] {
  const floorY = (roomHeight - 3) * tileSize;
  const count = onCriticalPath ? 2 : 3;
  const distanceFromStart = Math.abs(currentCol - startCol) + Math.abs(currentRow - startRow);
  const statScale = 1 + distanceFromStart * 0.15;
  const enemies: Enemy<string>[] = [];

  for (let i = 0; i < count; i += 1) {
    const spawnRng = new PRNG(currentCol * 777 + currentRow * 333 + i * 111);
    const enemy = spawnRng.next() < 0.3 ? new Ghost() : new Skeleton();
    initializeLegacyWorldEnemy(enemy, statScale, spawnRng.nextInt(4, roomWidth - 5) * tileSize, floorY, collisionGrid, player);
    enemies.push(enemy);
  }

  const goldenRng = new PRNG(currentCol * 555 + currentRow * 222 + 77);
  if (goldenRng.next() < 0.2) {
    const golden = new GoldenMonster(getDifficultyTier(distanceFromStart));
    initializeLegacyWorldEnemy(golden, statScale, goldenRng.nextInt(6, roomWidth - 7) * tileSize, floorY, collisionGrid, player);
    enemies.push(golden);
  }

  return enemies;
}

function initializeLegacyWorldEnemy(
  enemy: Enemy<string>,
  statScale: number,
  x: number,
  floorY: number,
  collisionGrid: number[][],
  player: Player,
): void {
  enemy.hp = enemy.maxHp = Math.floor(enemy.maxHp * statScale);
  enemy.atk = Math.floor(enemy.atk * statScale);
  initializeEnemySpawnedEntity(
    enemy,
    x,
    floorY - enemy.height,
    {
      getCollisionGrid: () => collisionGrid,
      getPlayer: () => player,
    },
  );
}
