import { t } from '@i18n';
import type { Container } from 'pixi.js';
import type { Player } from '@entities/Player';
import type { HealingPickup } from '@entities/HealingPickup';
import type { GoldPickup } from '@entities/GoldPickup';
import type { DamageNumberManager } from '@ui/DamageNumber';
import type { ItemPickupGlowManager } from '@effects/ItemPickupGlow';
import type { ScreenFlash } from '@effects/ScreenFlash';

interface ItemWorldPickupRuntimeDeps {
  getPlayer: () => Player;
  getEntityLayer: () => Container;
  getDamageNumbers: () => DamageNumberManager;
  getItemPickupGlow: () => ItemPickupGlowManager;
  getScreenFlash: () => ScreenFlash;
  showToast: (message: string, color: number) => void;
  onGoldCollected: (amount: number) => void;
}

export class ItemWorldPickupRuntime {
  private readonly healingPickups: HealingPickup[] = [];
  private readonly goldPickups: GoldPickup[] = [];

  constructor(private readonly deps: ItemWorldPickupRuntimeDeps) {}

  addHealingPickup(pickup: HealingPickup): void {
    this.healingPickups.push(pickup);
    if (!pickup.container.parent) {
      this.deps.getEntityLayer().addChild(pickup.container);
    }
  }

  addGoldPickup(pickup: GoldPickup): void {
    this.goldPickups.push(pickup);
    if (!pickup.container.parent) {
      this.deps.getEntityLayer().addChild(pickup.container);
    }
  }

  clear(): void {
    for (const pickup of this.healingPickups) pickup.destroy();
    this.healingPickups.length = 0;
    for (const pickup of this.goldPickups) pickup.destroy();
    this.goldPickups.length = 0;
  }

  updateHealing(dtMs: number): void {
    const player = this.deps.getPlayer();
    const pickups = this.healingPickups;
    for (let i = pickups.length - 1; i >= 0; i--) {
      const pickup = pickups[i];
      if (pickup.collected) {
        pickup.destroy();
        pickups.splice(i, 1);
        continue;
      }
      pickup.update(dtMs);
      const dx = Math.abs((player.x + player.width / 2) - (pickup.x + pickup.width / 2));
      const dy = Math.abs((player.y + player.height / 2) - (pickup.y + pickup.height / 2));
      if (dx < 16 && dy < 16) {
        const healed = Math.min(pickup.healAmount, player.maxHp - player.hp);
        player.hp = Math.min(player.maxHp, player.hp + pickup.healAmount);
        this.deps.getScreenFlash().flash(0x44ff44, 0.3, 150);
        if (healed > 0) this.deps.showToast(t('toast.hp_gain', { amount: healed }), 0x44ff44);
        this.deps.getItemPickupGlow().spawn(pickup.x + pickup.width / 2, pickup.y + pickup.height / 2, 0x44ff44);
        pickup.collect();
        pickup.destroy();
        pickups.splice(i, 1);
      }
    }
  }

  updateGold(dtMs: number): void {
    const player = this.deps.getPlayer();
    const pickups = this.goldPickups;
    for (let i = pickups.length - 1; i >= 0; i--) {
      const pickup = pickups[i];
      if (pickup.collected) continue;
      pickup.update(dtMs);
      const dx = Math.abs((player.x + player.width / 2) - (pickup.x + pickup.width / 2));
      const dy = Math.abs((player.y + player.height / 2) - (pickup.y + pickup.height / 2));
      if (dx < 16 && dy < 16) {
        pickup.collect();
        this.deps.onGoldCollected(pickup.amount);
        this.deps.getDamageNumbers().spawnEXP(pickup.x + pickup.width / 2, pickup.y - 16, `+${pickup.amount} G`);
        this.deps.getItemPickupGlow().spawn(pickup.x + pickup.width / 2, pickup.y + pickup.height / 2, 0xffd700);
        pickup.destroy();
        pickups.splice(i, 1);
      }
    }
  }
}
