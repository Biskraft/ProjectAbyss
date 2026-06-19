import { getBossEntry, getFamilyPool, pickWeightedEnemy } from '@data/itemWorldSpawnTable';
import { getEnemyRole, getEnemyResponse } from '@data/enemyStats';
import type { EnemyRole } from '@data/enemyStats';
import type { StrataConfig } from '@data/StrataConfig';
import type { Enemy } from '@entities/Enemy';
import type { ItemInstance } from '@items/ItemInstance';
import { PRNG } from '@utils/PRNG';
import { markBossEnemy } from '@entities/EnemyMetadata';
import type {
  ItemWorldEnemySpawnContext,
  ItemWorldEnemySpawnRuntime,
} from './ItemWorldEnemySpawnRuntime';
import type { ItemWorldMemoryShardSpawnRuntime } from './ItemWorldMemoryShardSpawnRuntime';
import type { ItemWorldSpawnController } from './ItemWorldSpawnController';

type CombatRoomType = 'Combat' | 'Treasure' | 'Boss' | string;

/**
 * Role budget ratios — RES-IWS-01 §7.1 M1 constant split
 * (Content_RoleComposition.csv weapon-type bias is an M2 work item).
 */
const ROLE_RATIOS: ReadonlyArray<{ role: EnemyRole; weight: number }> = [
  { role: 'swarmer', weight: 45 },
  { role: 'bruiser', weight: 30 },
  { role: 'ranged', weight: 20 },
  { role: 'lieutenant', weight: 5 },
];

function pickRole(roll: number): EnemyRole {
  const total = ROLE_RATIOS.reduce((s, r) => s + r.weight, 0);
  let cumulative = 0;
  for (const r of ROLE_RATIOS) {
    cumulative += r.weight;
    if (roll * total < cumulative) return r.role;
  }
  return ROLE_RATIOS[0].role;
}

interface ItemWorldEnemyEncounterRuntimeDeps {
  getItem: () => ItemInstance;
  getCycle: () => number;
  getStrataConfig: () => StrataConfig;
  getStartRoom: () => { col: number; absoluteRow: number };
  getCollisionGrid: () => number[][];
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
    const stratum = args.stratumIndex + 1;
    const cycle = this.deps.getCycle();
    const roomSeed = item.uid * 999 + args.col * 77 + args.absRow * 33;

    if (args.roomType === 'Treasure') {
      this.spawnTreasure(args, cycle, roomSeed);
      return;
    }

    if (args.isBossRoom) {
      const bossEntry = getBossEntry(stratum);
      if (!bossEntry) return;
      const boss = this.deps.getSpawnController().createEnemyFromType(
        bossEntry.enemyType,
        1 + cycle,
      );
      markBossEnemy(boss);
      boss.hp = boss.maxHp = Math.max(1, Math.floor(boss.hp * stratumDef.bossHpMul * distScale));
      boss.atk = Math.max(1, Math.floor(boss.atk * stratumDef.bossAtkMul * distScale));
      this.spawnBoss(args.spawnContext, boss, roomSeed);
      return;
    }

    // Role-budget fill loop (RES-IWS-01 §7.1 M1-B) — replaces single-pick.
    // Pool = weapon temperamentPrimary family, filtered by stratum depth window.
    const pool = getFamilyPool(item.def.temperamentPrimary, stratum);
    if (pool.length === 0) return;

    const targetCount = Math.max(1, stratumDef.baseEnemyCount + stratumDef.enemyCountBonus);
    const rng = new PRNG(roomSeed);
    const seenResponses = new Set<string>();
    let lieutenantSpawned = false;
    let spawned = 0;
    let spawnIndex = 0;
    let guard = 0;

    while (spawned < targetCount && guard++ < targetCount * 6) {
      let role = pickRole(rng.next());
      if (role === 'lieutenant' && lieutenantSpawned) role = 'swarmer'; // 방당 리테넌트 캡 1

      let candidates = pool.filter(e => getEnemyRole(e.enemyType) === role);
      if (candidates.length === 0) candidates = pool;

      // 대응 동사 다양성 가드 — 예산 막바지에 distinct Response < 2 면
      // 다른 Response 후보를 우선해 "단일 동사 방"을 방지한다.
      if (seenResponses.size < 2 && spawned > 0 && targetCount - spawned <= 2) {
        const alt = candidates.filter(e => {
          const r = getEnemyResponse(e.enemyType);
          return r !== undefined && !seenResponses.has(r);
        });
        if (alt.length > 0) candidates = alt;
      }

      const picked = pickWeightedEnemy(candidates, rng.next());
      if (!picked) break;

      const clusterRange = picked.clusterMax - picked.clusterMin;
      const rolledCluster = clusterRange > 0
        ? picked.clusterMin + rng.nextInt(0, clusterRange)
        : picked.clusterMin;
      const cluster = Math.max(1, Math.min(rolledCluster, targetCount - spawned));

      for (let i = 0; i < cluster && spawned < targetCount; i++) {
        const spawnRng = new PRNG(roomSeed + spawnIndex);
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
          1 + cycle,
        );
        this.applyNormalScaling(enemy, stratumDef.hpMul, stratumDef.atkMul, distScale);
        this.deps.getEnemySpawnRuntime().spawnAt(
          enemy,
          args.spawnContext.roomKey,
          this.deps.getEnemySpawnRuntime().pickSpawn(args.spawnContext, spawnRng, enemy.height),
        );
        spawned++;
      }

      if (getEnemyRole(picked.enemyType) === 'lieutenant') lieutenantSpawned = true;
      const resp = getEnemyResponse(picked.enemyType);
      if (resp !== undefined) seenResponses.add(resp);
    }
  }

  private spawnTreasure(args: SpawnEncounterArgs, cycle: number, roomSeed: number): void {
    const item = this.deps.getItem();
    const stratumDef = this.deps.getStrataConfig().strata[args.stratumIndex];
    const gold = this.deps.getSpawnController().createEnemyFromType('GoldenMonster', 1 + cycle);
    gold.hp = gold.maxHp = Math.max(1, Math.floor(gold.hp * stratumDef.hpMul));
    gold.atk = Math.max(1, Math.floor(gold.atk * stratumDef.atkMul));
    const goldRng = new PRNG(roomSeed + 99);
    this.deps.getEnemySpawnRuntime().spawnAt(
      gold,
      args.spawnContext.roomKey,
      this.deps.getEnemySpawnRuntime().pickSpawn(args.spawnContext, goldRng, gold.height),
    );
  }

  private spawnBoss(context: ItemWorldEnemySpawnContext, boss: Enemy<string>, seed: number): void {
    const bossRng = new PRNG(seed);
    const flat = this.deps.getSpawnController().findFlatFloorCenter(
      this.deps.getCollisionGrid(),
      context.roomTopCol,
      context.roomTopRow,
      16,
      context.roomWidthTiles,
      context.roomHeightTiles,
    );
    let position: { x: number; y: number };

    if (flat) {
      position = { x: flat.x - boss.width / 2, y: flat.y - boss.height };
    } else if (context.spawnPoints.length > 0) {
      position = this.deps.getEnemySpawnRuntime().pickSpawn(context, bossRng, boss.height);
    } else {
      position = {
        x: context.offX + context.roomWidthPx / 2 - boss.width / 2,
        y: context.offY + context.roomHeightPx / 2 - boss.height,
      };
    }

    this.deps.getEnemySpawnRuntime().spawnAt(boss, context.roomKey, position);
  }

  private applyNormalScaling(enemy: Enemy<string>, hpMul: number, atkMul: number, distScale: number): void {
    enemy.hp = enemy.maxHp = Math.max(1, Math.floor(enemy.hp * hpMul * distScale));
    enemy.atk = Math.max(1, Math.floor(enemy.atk * atkMul * distScale));
  }

}
