import type { UnifiedGridData } from '@level/RoomGrid';
import type { Player } from '@entities/Player';
import type { Enemy } from '@entities/Enemy';
import { GoldenMonster } from '@entities/GoldenMonster';
import { MemoryShardNPC } from '@entities/MemoryShardNPC';
import { createEmberShard, createForgeEmber, type HealingPickup } from '@entities/HealingPickup';
import { GoldPickup } from '@entities/GoldPickup';
import type { HitManager, CombatEntity } from '@combat/HitManager';
import type { HUD } from '@ui/HUD';
import type { DamageNumberManager } from '@ui/DamageNumber';
import type { HitSparkManager } from '@effects/HitSpark';
import type { DeathParticleManager } from '@effects/DeathParticles';
import type { ScreenFlash } from '@effects/ScreenFlash';
import { SFX } from '@audio/Sfx';
import type { ItemInstance } from '@items/ItemInstance';
import { addItemExp, addRecovery, EXP_PER_LEVEL } from '@items/ItemInstance';
import { trackEnemyKill, trackItemLevelUp } from '@utils/Analytics';
import {
  getEnemyRoomKey,
  isEnemyExpGranted,
  markEnemyExpGranted,
} from '@systems/EntityRuntimeMeta';

interface ItemWorldEnemyCombatRuntimeDeps {
  getPlayer: () => Player;
  getEnemies: () => Enemy<string>[];
  getHitManager: () => HitManager;
  getDamageNumbers: () => DamageNumberManager;
  getHitSparks: () => HitSparkManager;
  getScreenFlash: () => ScreenFlash;
  getDeathParticles: () => DeathParticleManager;
  getHud: () => HUD;
  getItem: () => ItemInstance;
  getExpMultiplier: () => number;
  getRoomEnemyCount: () => Map<string, number>;
  getUnifiedGrid: () => UnifiedGridData;
  getRoomData: () => number[][];
  baseExpPerKill: number;
  fireEgoFirstKill: () => void;
  addEarnedExp: (amount: number) => void;
  incrementRoomsCleared: () => void;
  persistRoomState: () => void;
  rollDrop: () => number;
  addHealingPickup: (pickup: HealingPickup) => void;
  addGoldPickup: (pickup: GoldPickup) => void;
}

export class ItemWorldEnemyCombatRuntime {
  constructor(private readonly deps: ItemWorldEnemyCombatRuntimeDeps) {}

  updatePlayerAttack(): void {
    const player = this.deps.getPlayer();
    if (!player.isAttackActive()) return;

    const targets = this.deps.getEnemies().filter(enemy => enemy.alive) as CombatEntity[];
    const hits = this.deps.getHitManager().checkHits(
      player,
      player.comboIndex,
      player.hitList,
      targets,
    );
    const damageNumbers = this.deps.getDamageNumbers();
    const hitSparks = this.deps.getHitSparks();
    const screenFlash = this.deps.getScreenFlash();
    for (const hit of hits) {
      damageNumbers.spawn(hit.hitX, hit.hitY - 8, hit.damage, hit.heavy, hit.critical);
      hitSparks.spawn(hit.hitX, hit.hitY, hit.heavy, hit.dirX);
      SFX.play('attack_hit');
      if (hit.heavy) {
        screenFlash.flashHit(true);
      }
      if (hit.damage >= 100 && SFX.fireMilestone100Once()) {
        screenFlash.flashHit(true);
        damageNumbers.spawnSpecial(hit.hitX, hit.hitY - 24, '100 DMG!', 0xffcc44);
      }
    }
  }

  processDefeatedEnemies(): void {
    const enemies = this.deps.getEnemies();
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      if (!enemy.alive && !isEnemyExpGranted(enemy)) {
        markEnemyExpGranted(enemy);
        this.processNewDefeat(enemy);
      }
      if (enemy.shouldRemove) {
        if (enemy.container.parent) enemy.container.parent.removeChild(enemy.container);
        enemies.splice(i, 1);
      }
    }
  }

  private processNewDefeat(enemy: Enemy<string>): void {
    const isMemoryShard = enemy instanceof MemoryShardNPC;
    const isBoss = !!(enemy as { _isBoss?: boolean })._isBoss;

    if (!isMemoryShard && !isBoss) {
      this.deps.fireEgoFirstKill();
    }

    if (!isMemoryShard) {
      trackEnemyKill({
        area: 'itemworld',
        enemy_type: enemy.constructor.name.toLowerCase(),
        is_boss: isBoss,
        is_elite: enemy instanceof GoldenMonster,
      });

      this.deps.getDeathParticles().spawn(
        enemy.x + enemy.width / 2,
        enemy.y + enemy.height / 2,
        isBoss,
      );
    }

    this.markRoomEnemyDefeated(enemy);

    if (!isMemoryShard) {
      this.grantKillRewards(enemy, isBoss);
    }
  }

  private markRoomEnemyDefeated(enemy: Enemy<string>): void {
    const roomKey = getEnemyRoomKey(enemy);
    if (!roomKey) return;

    const roomEnemyCount = this.deps.getRoomEnemyCount();
    const remaining = (roomEnemyCount.get(roomKey) ?? 1) - 1;
    if (remaining > 0) {
      roomEnemyCount.set(roomKey, remaining);
      return;
    }

    roomEnemyCount.delete(roomKey);
    const [colStr, rowStr] = roomKey.split(',');
    const col = parseInt(colStr, 10);
    const row = parseInt(rowStr, 10);
    const clearedCell = this.deps.getUnifiedGrid().cells[row]?.[col];
    if (clearedCell && !clearedCell.cleared) {
      clearedCell.cleared = true;
      this.deps.incrementRoomsCleared();
      this.deps.persistRoomState();
    }
  }

  private grantKillRewards(enemy: Enemy<string>, isBoss: boolean): void {
    const item = this.deps.getItem();
    const baseExp = enemy.exp > 0 ? enemy.exp : this.deps.baseExpPerKill;
    const killExp = Math.floor(baseExp * this.deps.getExpMultiplier());
    const leveled = addItemExp(item, killExp);

    if (!isBoss) {
      addRecovery(item, 0.1);
    }

    this.deps.addEarnedExp(killExp);
    this.deps.getDamageNumbers().spawnEXP(
      enemy.x + enemy.width / 2,
      enemy.y - 16,
      `+${killExp} EXP`,
    );
    this.deps.getHud().updateItemExp(item.level, item.exp, EXP_PER_LEVEL, leveled);

    if (leveled) {
      SFX.play('upgrade');
      trackItemLevelUp({
        source: 'itemworld_exp',
        item_rarity: item.rarity,
        new_level: item.level,
      });
    }

    this.spawnDrops(enemy);
  }

  private spawnDrops(enemy: Enemy<string>): void {
    const dropX = enemy.x + enemy.width / 2 - 8;
    const dropY = enemy.y + enemy.height;
    const player = this.deps.getPlayer();
    const isGolden = enemy instanceof GoldenMonster;

    if (isGolden && this.deps.rollDrop() < 0.5) {
      this.deps.addHealingPickup(createForgeEmber(dropX, dropY, player.maxHp));
    } else if (!isGolden && this.deps.rollDrop() < 0.2) {
      this.deps.addHealingPickup(createEmberShard(dropX, dropY, player.maxHp));
    }

    const baseGold = Math.floor((enemy.exp > 0 ? enemy.exp : 40) * 0.1);
    const goldAmount = isGolden ? baseGold * 3 : baseGold;
    if (goldAmount <= 0) return;

    const roomData = this.deps.getRoomData();
    for (const pickup of GoldPickup.spawnBurst(dropX, dropY, goldAmount)) {
      pickup.roomData = roomData;
      this.deps.addGoldPickup(pickup);
    }
  }
}
