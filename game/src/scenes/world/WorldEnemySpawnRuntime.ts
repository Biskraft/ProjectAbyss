import { Boss01 } from '@entities/Boss01';
import type { Enemy } from '@entities/Enemy';
import { createEnemy } from '@entities/EnemyFactory';
import type { Player } from '@entities/Player';
import { Slime } from '@entities/Slime';
import type { LdtkLevel } from '@level/LdtkLoader';

interface WorldEnemySpawnRuntimeDeps {
  getPlayer: () => Player;
  getCollisionGrid: () => number[][];
  getUnlockedEvents: () => Set<string>;
  addEnemy: (enemy: Enemy<string>) => void;
  activateBossLock: (level: LdtkLevel, bossKey: string) => void;
}

export class WorldEnemySpawnRuntime {
  constructor(private readonly deps: WorldEnemySpawnRuntimeDeps) {}

  spawnFromLevel(level: LdtkLevel): void {
    this.spawnDirectSlimes(level);
    this.spawnDirectBosses(level);
    this.spawnEnemySpawners(level);
  }

  private spawnDirectSlimes(level: LdtkLevel): void {
    const directEnemies = level.entities.filter((entity) => entity.type === 'Slime');
    for (const entity of directEnemies) {
      const enemy = new Slime();
      this.placeEnemy(enemy, entity.px[0], entity.px[1] - enemy.height);
      this.deps.addEnemy(enemy);
    }
  }

  private spawnDirectBosses(level: LdtkLevel): void {
    const bossEntities = level.entities.filter((entity) => entity.type === 'Boss');
    for (const entity of bossEntities) {
      const bossKey = `boss_${level.identifier}_${entity.px[0]}_${entity.px[1]}`;
      if (this.deps.getUnlockedEvents().has(bossKey)) continue;

      const boss = new Boss01();
      (boss as any)._isBoss = true;
      (boss as any)._bossKey = bossKey;
      this.placeEnemy(boss, entity.px[0] - boss.width / 2, entity.px[1] - boss.height);
      this.deps.addEnemy(boss);
      this.deps.activateBossLock(level, bossKey);
    }
  }

  private spawnEnemySpawners(level: LdtkLevel): void {
    const spawners = level.entities.filter((entity) => entity.type === 'Enemy_Spawn');
    for (const spawner of spawners) {
      const enemyType = (spawner.fields['type'] as string) ?? 'Skeleton';
      const enemyLevel = (spawner.fields['level'] as number) ?? 1;
      const enemy = this.createSpawnerEnemy(level, spawner, enemyType, enemyLevel);
      if (!enemy) continue;

      this.placeEnemy(enemy, spawner.px[0], spawner.px[1] - enemy.height);
      this.linkTargetDoors(enemy, spawner.fields['TargetDoor'] ?? spawner.fields['targetDoor']);
      this.deps.addEnemy(enemy);
    }
  }

  private createSpawnerEnemy(
    level: LdtkLevel,
    spawner: LdtkLevel['entities'][number],
    enemyType: string,
    enemyLevel: number,
  ): Enemy<string> | null {
    if (enemyType !== 'Boss') return createEnemy(enemyType, enemyLevel);

    const bossKey = `boss_${level.identifier}_${spawner.px[0]}_${spawner.px[1]}`;
    if (this.deps.getUnlockedEvents().has(bossKey)) return null;

    const enemy = createEnemy('Boss', enemyLevel);
    (enemy as any)._bossKey = bossKey;
    this.deps.activateBossLock(level, bossKey);
    return enemy;
  }

  private placeEnemy(enemy: Enemy<string>, x: number, y: number): void {
    enemy.x = x;
    enemy.y = y;
    enemy.roomData = this.deps.getCollisionGrid();
    enemy.target = this.deps.getPlayer();
  }

  private linkTargetDoors(enemy: Enemy<string>, targetField: unknown): void {
    const targetRefs: string[] = [];
    if (Array.isArray(targetField)) {
      for (const ref of targetField) {
        if (ref?.entityIid) targetRefs.push(ref.entityIid);
      }
    } else if (targetField && typeof targetField === 'object' && 'entityIid' in targetField) {
      targetRefs.push((targetField as { entityIid: string }).entityIid);
    }
    if (targetRefs.length > 0) {
      (enemy as any)._unlockTargetIids = targetRefs;
    }
  }
}
