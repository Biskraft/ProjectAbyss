import type { ItemInstance } from '@items/ItemInstance';
import { itemLevelUp } from '@items/ItemInstance';
import { resolveBottomLeftPickupSpawn } from '@items/DropSpawn';
import { type GoldPickup } from '@entities/GoldPickup';
import { type HealingPickup } from '@entities/HealingPickup';
import type { Enemy } from '@entities/Enemy';
import { GoldenMonster } from '@entities/GoldenMonster';
import type { PortalSourceType } from '@entities/Portal';
import type { Rarity } from '@data/weapons';
import { trackItemLevelUp } from '@utils/Analytics';
import { t } from '@i18n';
import { trackEnemyKillForArea } from '@scenes/shared/EnemyCombatAnalyticsHelpers';
import {
  getEnemyBottomLeftDropCoordinates,
  spawnEnemyDrops,
} from '@scenes/shared/EnemyCombatDropHelpers';
import {
  getBossKey,
  getUnlockTargetIids,
  isBossEnemy,
} from '@entities/EnemyMetadata';
import { processEnemyPostDefeats } from '@scenes/shared/EnemyDefeatProcessingHelpers';

const BOSS_PORTAL_DELAY_MS = 1500;

interface BossPortalSpawn {
  remainingMs: number;
  x: number;
  y: number;
  rarity: Rarity;
  sourceType: PortalSourceType;
  sourceItem?: ItemInstance;
}

interface WorldEnemyKillRuntimeDeps {
  getEnemies: () => Enemy<string>[];
  incrementEnemiesKilled: () => void;
  unlockDoorByIid: (iid: string) => void;
  getUnlockedEvents: () => Set<string>;
  flashBossKill: () => void;
  setHitstopFrames: (frames: number) => void;
  deactivateBossLock: () => void;
  getFixedItemWorldItem: () => ItemInstance | null;
  isFirstItemWorldBossDefeated: () => boolean;
  markFirstItemWorldBossDefeated: () => void;
  syncPlayerStats: () => void;
  showBigToast: (message: string, color: number) => void;
  isSceneInitialized: () => boolean;
  spawnPortal: (x: number, y: number, rarity: Rarity, sourceType: PortalSourceType, sourceItem?: ItemInstance) => void;
  getCollisionGrid: () => number[][];
  getPlayerMaxHp: () => number;
  rollDrop: () => number;
  addGoldPickup: (pickup: GoldPickup) => void;
  addHealingPickup: (pickup: HealingPickup) => void;
  removeEnemyAt: (index: number) => void;
}

export class WorldEnemyKillRuntime {
  private pendingPortalSpawns: BossPortalSpawn[] = [];

  constructor(private readonly deps: WorldEnemyKillRuntimeDeps) {}

  handle(enemy: Enemy<string>): void {
    this.deps.incrementEnemiesKilled();

    const isGolden = enemy instanceof GoldenMonster;
    trackEnemyKillForArea('world', enemy);

    for (const iid of getUnlockTargetIids(enemy)) {
      this.deps.unlockDoorByIid(iid);
    }

    if (isBossEnemy(enemy)) {
      this.handleBossKill(enemy);
    }

    const collisionGrid = this.deps.getCollisionGrid();
    const bottomLeftDrop = getEnemyBottomLeftDropCoordinates(enemy);
    const drop = resolveBottomLeftPickupSpawn(
      bottomLeftDrop.dropX,
      bottomLeftDrop.dropY,
      collisionGrid,
    );
    const exp = enemy.exp;
    spawnEnemyDrops(
      {
        baseExp: exp,
        isGolden,
        dropX: drop.x,
        dropY: drop.y,
        collisionGrid,
        dropOrder: ['gold', 'healing'],
      },
      {
        addGoldPickup: this.deps.addGoldPickup,
        rollDrop: this.deps.rollDrop,
        getPlayerMaxHp: this.deps.getPlayerMaxHp,
        addHealingPickup: this.deps.addHealingPickup,
      },
    );
  }

  update(dtMs: number): void {
    if (this.pendingPortalSpawns.length === 0) return;

    for (let i = 0; i < this.pendingPortalSpawns.length; i += 1) {
      const pending = this.pendingPortalSpawns[i];
      pending.remainingMs -= dtMs;

      if (pending.remainingMs > 0) continue;

      this.pendingPortalSpawns.splice(i, 1);
      i -= 1;

      if (this.deps.isSceneInitialized()) {
        this.deps.spawnPortal(
          pending.x,
          pending.y,
          pending.rarity,
          pending.sourceType,
          pending.sourceItem,
        );
      }
    }
  }

  processDefeatedEnemies(): void {
    processEnemyPostDefeats({
      enemies: this.deps.getEnemies(),
      processNewDefeat: enemy => this.handle(enemy),
      removeEnemyAt: this.deps.removeEnemyAt,
    });
  }

  clear(): void {
    this.pendingPortalSpawns.length = 0;
  }

  private handleBossKill(enemy: Enemy<string>): void {
    const bossX = enemy.x + enemy.width / 2;
    const bossY = enemy.y + enemy.height - 4;

    const bossKey = getBossKey(enemy);
    if (bossKey) this.deps.getUnlockedEvents().add(bossKey);

    this.deps.flashBossKill();
    this.deps.setHitstopFrames(12);
    this.deps.deactivateBossLock();

    const fixedItemWorldItem = this.deps.getFixedItemWorldItem();
    if (!fixedItemWorldItem) {
      this.deps.showBigToast(t('toast.boss_defeated_excl'), 0xffd700);
      return;
    }

    if (!this.deps.isFirstItemWorldBossDefeated()) {
      this.deps.markFirstItemWorldBossDefeated();
    }

    const rarity = fixedItemWorldItem.rarity;
    const sourceItem = fixedItemWorldItem;
    const prevAtk = fixedItemWorldItem.finalAtk;
    itemLevelUp(fixedItemWorldItem);
    trackItemLevelUp({
      source: 'itemworld_boss',
      item_rarity: rarity,
      new_level: fixedItemWorldItem.level,
    });
    this.deps.syncPlayerStats();
    const atkGain = fixedItemWorldItem.finalAtk - prevAtk;
    if (atkGain > 0) {
      this.deps.showBigToast(t('toast.atk_gain', { amount: atkGain }), 0xffd700);
    }

    this.pendingPortalSpawns.push({
      remainingMs: BOSS_PORTAL_DELAY_MS,
      x: bossX,
      y: bossY,
      rarity,
      sourceType: 'altar',
      sourceItem,
    });
  }

}
