import { getSpawnTable, pickWeightedEnemy } from '@data/itemWorldSpawnTable';
import type { StrataConfig } from '@data/StrataConfig';
import type { Enemy } from '@entities/Enemy';
import type { ItemInstance } from '@items/ItemInstance';
import { PRNG } from '@utils/PRNG';
import { IW_ROOM_H_PX, IW_ROOM_W_PX } from './ItemWorldMapController';
import type {
  ItemWorldEnemySpawnContext,
  ItemWorldEnemySpawnRuntime,
} from './ItemWorldEnemySpawnRuntime';
import type { ItemWorldMemoryShardSpawnRuntime } from './ItemWorldMemoryShardSpawnRuntime';
import type { ItemWorldSpawnController } from './ItemWorldSpawnController';

type CombatRoomType = 'Combat' | 'Treasure' | 'Boss' | string;

interface ItemWorldEnemyEncounterRuntimeDeps {
  getItem: () => ItemInstance;
  getCycle: () => number;
  getStrataConfig: () => StrataConfig;
  getStartRoom: () => { col: number; absoluteRow: number };
  getSpawnController: () => ItemWorldSpawnController;
  getEnemySpawnRuntime: () => ItemWorldEnemySpawnRuntime;
  getMemoryShardSpawnRuntime: () => ItemWorldMemoryShardSpawnRuntime;
}

interface SpawnEncounterArgs {
  col: number;
  absRow: number;
  stratumIndex: number;
  roomType: CombatRoomType;
  isBossRoom: boolean;
  spawnContext: ItemWorldEnemySpawnContext;
}

export class ItemWorldEnemyEncounterRuntime {
  constructor(private readonly deps: ItemWorldEnemyEncounterRuntimeDeps) {}

  spawnForRoom(args: SpawnEncounterArgs): void {
    const item = this.deps.getItem();
    const stratumDef = this.deps.getStrataConfig().strata[args.stratumIndex];
    const startRoom = this.deps.getStartRoom();
    const dist = Math.abs(args.col - startRoom.col) + Math.abs(args.absRow - startRoom.absoluteRow);
    const distScale = 1 + dist * 0.1;
    const spawnTable = getSpawnTable(item.rarity, args.stratumIndex + 1);
    const cycle = this.deps.getCycle();

    if (args.roomType === 'Treasure') {
      this.spawnTreasure(args, cycle);
      return;
    }

    if (args.isBossRoom && spawnTable.boss) {
      const bossEntry = spawnTable.boss;
      const boss = this.deps.getSpawnController().createEnemyFromType(
        bossEntry.enemyType,
        bossEntry.level + cycle,
      );
      (boss as any)._isBoss = true;
      boss.hp = boss.maxHp = Math.max(1, Math.floor(boss.hp * stratumDef.bossHpMul * distScale));
      boss.atk = Math.max(1, Math.floor(boss.atk * stratumDef.bossAtkMul * distScale));
      this.spawnBoss(args.spawnContext, boss, this.seedForRoom(item.uid, args.col, args.absRow));
      return;
    }

    const normalEntries = spawnTable.normal;
    if (normalEntries.length === 0) return;

    const pickSeed = this.seedForRoom(item.uid, args.col, args.absRow);
    const picked = pickWeightedEnemy(normalEntries, new PRNG(pickSeed).next());
    if (!picked) return;

    const countRng = new PRNG(pickSeed + picked.enemyType.charCodeAt(0) * 17);
    const range = picked.maxCount - picked.minCount;
    const rolledCount = range > 0
      ? picked.minCount + countRng.nextInt(0, range)
      : picked.minCount;

    let spawnIndex = 0;
    for (let i = 0; i < rolledCount; i++) {
      const spawnRng = new PRNG(pickSeed + spawnIndex);
      spawnIndex++;

      if (this.deps.getMemoryShardSpawnRuntime().trySpawn({
        roll: spawnRng.next(),
        seedForArchetype: item.uid + args.col * 13 + args.absRow * 7 + spawnIndex,
        stratumIndex: args.stratumIndex,
        spawnContext: args.spawnContext,
        spawnRng,
      })) {
        continue;
      }

      const enemy = this.deps.getSpawnController().createEnemyFromType(
        picked.enemyType,
        picked.level + cycle,
      );
      this.applyNormalScaling(enemy, stratumDef.hpMul, stratumDef.atkMul, distScale);
      this.deps.getEnemySpawnRuntime().spawnAt(
        enemy,
        args.spawnContext.roomKey,
        this.deps.getEnemySpawnRuntime().pickSpawn(args.spawnContext, spawnRng, enemy.height),
      );
    }
  }

  private spawnTreasure(args: SpawnEncounterArgs, cycle: number): void {
    const item = this.deps.getItem();
    const stratumDef = this.deps.getStrataConfig().strata[args.stratumIndex];
    const gold = this.deps.getSpawnController().createEnemyFromType('GoldenMonster', 1 + cycle);
    gold.hp = gold.maxHp = Math.max(1, Math.floor(gold.hp * stratumDef.hpMul));
    gold.atk = Math.max(1, Math.floor(gold.atk * stratumDef.atkMul));
    const goldRng = new PRNG(this.seedForRoom(item.uid, args.col, args.absRow) + 99);
    this.deps.getEnemySpawnRuntime().spawnAt(
      gold,
      args.spawnContext.roomKey,
      this.deps.getEnemySpawnRuntime().pickSpawn(args.spawnContext, goldRng, gold.height),
    );
  }

  private spawnBoss(context: ItemWorldEnemySpawnContext, boss: Enemy<string>, seed: number): void {
    const bossRng = new PRNG(seed);
    const flat = this.deps.getEnemySpawnRuntime().findFlatFloorCenter(context, 16);
    let position: { x: number; y: number };

    if (flat) {
      position = { x: flat.x - boss.width / 2, y: flat.y - boss.height };
    } else if (context.spawnPoints.length > 0) {
      position = this.deps.getEnemySpawnRuntime().pickSpawn(context, bossRng, boss.height);
    } else {
      position = {
        x: context.offX + IW_ROOM_W_PX / 2 - boss.width / 2,
        y: context.offY + IW_ROOM_H_PX / 2 - boss.height,
      };
    }

    this.deps.getEnemySpawnRuntime().spawnAt(boss, context.roomKey, position);
  }

  private applyNormalScaling(enemy: Enemy<string>, hpMul: number, atkMul: number, distScale: number): void {
    enemy.hp = enemy.maxHp = Math.max(1, Math.floor(enemy.hp * hpMul * distScale));
    enemy.atk = Math.max(1, Math.floor(enemy.atk * atkMul * distScale));
  }

  private seedForRoom(itemUid: number, col: number, absRow: number): number {
    return itemUid * 999 + col * 77 + absRow * 33;
  }
}
