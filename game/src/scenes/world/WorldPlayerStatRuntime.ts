import { BASE_HITBOX_W } from '@combat/HitManager';
import type { Player } from '@entities/Player';
import type { Inventory } from '@items/Inventory';
import { calcInnocentBonus } from '@items/ItemInstance';
import { getPlayerBaseStats } from '@data/playerStats';
import { applyPlayerStatBuffs } from '@systems/PlayerBuffSystem';

interface WorldPlayerStatRuntimeDeps {
  getPlayer: () => Player;
  getInventory: () => Inventory;
  getHealthShardBonus: () => number;
}

export class WorldPlayerStatRuntime {
  constructor(private readonly deps: WorldPlayerStatRuntimeDeps) {}

  sync(): void {
    const player = this.deps.getPlayer();
    const inventory = this.deps.getInventory();

    const base = getPlayerBaseStats(1);
    const equippedItem = inventory.equipped;
    const weaponAtk = inventory.getWeaponAtk();
    const innocentAtk = equippedItem ? Math.floor(calcInnocentBonus(equippedItem, 'atk')) : 0;
    const innocentDef = equippedItem ? Math.floor(calcInnocentBonus(equippedItem, 'def')) : 0;
    const innocentHp = equippedItem ? Math.floor(calcInnocentBonus(equippedItem, 'hp')) : 0;
    const cheatBonus = player.abilities.cheat ? 99999 : 0;

    const buffedStats = applyPlayerStatBuffs({
      atk: base.atk + weaponAtk + innocentAtk + cheatBonus,
      def: base.def + innocentDef,
    });
    player.atk = buffedStats.atk;
    player.def = buffedStats.def;

    player.equippedWeaponId = equippedItem ? equippedItem.def.id : null;
    player.equippedWeaponType = equippedItem ? equippedItem.def.type : null;
    player.equippedRarity = equippedItem ? equippedItem.rarity : null;
    player.attackHitboxMul = equippedItem
      ? equippedItem.def.hitboxW / BASE_HITBOX_W
      : 1;

    const newMaxHp = base.hp + this.deps.getHealthShardBonus() + innocentHp + cheatBonus;
    if (newMaxHp === player.maxHp) return;

    const hpRatio = player.maxHp > 0 ? player.hp / player.maxHp : 1;
    player.maxHp = newMaxHp;
    player.hp = Math.round(newMaxHp * hpRatio);
  }
}
