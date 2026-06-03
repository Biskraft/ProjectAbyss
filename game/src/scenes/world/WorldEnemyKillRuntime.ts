import type { ItemInstance } from '@items/ItemInstance';
import { itemLevelUp } from '@items/ItemInstance';
import { resolveBottomLeftPickupSpawn } from '@items/DropSpawn';
import type { Enemy } from '@entities/Enemy';
import { GoldenMonster } from '@entities/GoldenMonster';
import { GoldPickup } from '@entities/GoldPickup';
import { createEmberShard, createForgeEmber, type HealingPickup } from '@entities/HealingPickup';
import type { PortalSourceType } from '@entities/Portal';
import type { Rarity } from '@data/weapons';
import { trackEnemyKill, trackItemLevelUp } from '@utils/Analytics';
import { t } from '@i18n';

interface WorldEnemyKillRuntimeDeps {
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
}

type KillMetadata = {
  _isBoss?: boolean;
  _unlockTargetIids?: string[];
  _bossKey?: string;
};

export class WorldEnemyKillRuntime {
  constructor(private readonly deps: WorldEnemyKillRuntimeDeps) {}

  handle(enemy: Enemy<string>): void {
    this.deps.incrementEnemiesKilled();

    const meta = enemy as Enemy<string> & KillMetadata;
    const isGolden = enemy instanceof GoldenMonster;
    trackEnemyKill({
      area: 'world',
      enemy_type: enemy.constructor.name.toLowerCase(),
      is_boss: !!meta._isBoss,
      is_elite: isGolden,
    });

    for (const iid of meta._unlockTargetIids ?? []) {
      this.deps.unlockDoorByIid(iid);
    }

    if (meta._isBoss) {
      this.handleBossKill(enemy, meta);
    }

    this.spawnGoldDrop(enemy, isGolden);
    this.spawnHealingDrop(enemy, isGolden);
  }

  private handleBossKill(enemy: Enemy<string>, meta: KillMetadata): void {
    const bossX = enemy.x + enemy.width / 2;
    const bossY = enemy.y + enemy.height - 4;

    if (meta._bossKey) this.deps.getUnlockedEvents().add(meta._bossKey);

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

    setTimeout(() => {
      if (!this.deps.isSceneInitialized()) return;
      this.deps.spawnPortal(bossX, bossY, rarity, 'altar', sourceItem);
    }, 1500);
  }

  private spawnGoldDrop(enemy: Enemy<string>, isGolden: boolean): void {
    const baseGold = Math.floor((enemy.exp > 0 ? enemy.exp : 40) * 0.1);
    const goldAmount = isGolden ? baseGold * 3 : baseGold;
    if (goldAmount <= 0) return;

    const grid = this.deps.getCollisionGrid();
    const burst = resolveBottomLeftPickupSpawn(
      enemy.x + enemy.width / 2 - 8,
      enemy.y + enemy.height,
      grid,
    );
    for (const pickup of GoldPickup.spawnBurst(burst.x, burst.y, goldAmount)) {
      pickup.roomData = grid;
      this.deps.addGoldPickup(pickup);
    }
  }

  private spawnHealingDrop(enemy: Enemy<string>, isGolden: boolean): void {
    const grid = this.deps.getCollisionGrid();
    const drop = resolveBottomLeftPickupSpawn(
      enemy.x + enemy.width / 2 - 8,
      enemy.y + enemy.height,
      grid,
    );

    if (isGolden && this.deps.rollDrop() < 0.5) {
      this.deps.addHealingPickup(createForgeEmber(drop.x, drop.y, this.deps.getPlayerMaxHp()));
    } else if (!isGolden && this.deps.rollDrop() < 0.2) {
      this.deps.addHealingPickup(createEmberShard(drop.x, drop.y, this.deps.getPlayerMaxHp()));
    }
  }
}
