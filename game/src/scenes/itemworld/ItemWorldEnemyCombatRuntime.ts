import type { UnifiedGridData } from '@level/RoomGrid';
import type { Player } from '@entities/Player';
import type { Enemy } from '@entities/Enemy';
import { GoldenMonster } from '@entities/GoldenMonster';
import { MemoryShardNPC } from '@entities/MemoryShardNPC';
import { type GoldPickup } from '@entities/GoldPickup';
import type { HealingPickup } from '@entities/HealingPickup';
import type { HitManager, CombatEntity } from '@combat/HitManager';
import type { HUD } from '@ui/HUD';
import type { DamageNumberManager } from '@ui/DamageNumber';
import type { HitSparkManager } from '@effects/HitSpark';
import type { DeathParticleManager } from '@effects/DeathParticles';
import type { ScreenFlash } from '@effects/ScreenFlash';
import { SFX } from '@audio/Sfx';
import type { ItemInstance } from '@items/ItemInstance';
import { addItemExp, addRecovery, EXP_PER_LEVEL } from '@items/ItemInstance';
import { trackItemLevelUp } from '@utils/Analytics';
import { trackEnemyKillForArea } from '@scenes/shared/EnemyCombatAnalyticsHelpers';
import {
  getEnemyRoomKey,
  isBossEnemy,
} from '@entities/EnemyMetadata';
import { processEnemyPostDefeats } from '@scenes/shared/EnemyDefeatProcessingHelpers';
import {
  getEnemyBottomLeftDropCoordinates,
  spawnEnemyDrops,
} from '@scenes/shared/EnemyCombatDropHelpers';
import { spawnEnemyDeathParticles } from '@scenes/shared/EnemyDeathFeedbackHelpers';
import { applyPlayerAttackHitFeedback } from '@scenes/shared/PlayerAttackHitFeedbackHelpers';

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
  removeEnemyAt: (index: number) => void;
  rollDrop: () => number;
  addHealingPickup: (pickup: HealingPickup) => void;
  addGoldPickup: (pickup: GoldPickup) => void;
  onBossDefeated: (enemy: Enemy<string>) => void;
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
    applyPlayerAttackHitFeedback({
      hits,
      damageNumbers: this.deps.getDamageNumbers(),
      hitSparks: this.deps.getHitSparks(),
      screenFlash: this.deps.getScreenFlash(),
      enableMilestone100: true,
    });
  }

  processDefeatedEnemies(): void {
    processEnemyPostDefeats({
      enemies: this.deps.getEnemies(),
      processNewDefeat: enemy => this.processNewDefeat(enemy),
      removeEnemyAt: this.deps.removeEnemyAt,
    });
  }

  private processNewDefeat(enemy: Enemy<string>): void {
    const isMemoryShard = enemy instanceof MemoryShardNPC;
    const isBoss = isBossEnemy(enemy);

    if (!isMemoryShard && !isBoss) {
      this.deps.fireEgoFirstKill();
    }

    if (!isMemoryShard) {
      trackEnemyKillForArea('itemworld', enemy);

      spawnEnemyDeathParticles(this.deps.getDeathParticles(), enemy, isBoss);
    }

    this.markRoomEnemyDefeated(enemy);

    if (isBoss) {
      this.deps.onBossDefeated(enemy);
    }

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
    const { dropX, dropY } = getEnemyBottomLeftDropCoordinates(enemy);
    const player = this.deps.getPlayer();
    const isGolden = enemy instanceof GoldenMonster;
    const roomData = this.deps.getRoomData();
    spawnEnemyDrops(
      {
        baseExp: enemy.exp,
        isGolden,
        dropX,
        dropY,
        collisionGrid: roomData,
        dropOrder: ['healing', 'gold'],
      },
      {
        rollDrop: this.deps.rollDrop,
        getPlayerMaxHp: () => player.maxHp,
        addHealingPickup: this.deps.addHealingPickup,
        addGoldPickup: this.deps.addGoldPickup,
      },
    );
  }
}
