import type { Container } from 'pixi.js';
import type { Player } from '@entities/Player';
import type { HealingPickup } from '@entities/HealingPickup';
import type { GoldPickup } from '@entities/GoldPickup';
import type { DamageNumberManager } from '@ui/DamageNumber';
import type { ItemPickupGlowManager } from '@effects/ItemPickupGlow';
import type { ScreenFlash } from '@effects/ScreenFlash';
import {
  addPickupToLayer,
  applyGoldPickupReward,
  applyHealingPickupReward,
  clearPickups,
  processPickupsForPlayerCollection,
} from '@scenes/shared/PickupCollectionHelpers';

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
    addPickupToLayer(this.healingPickups, pickup, this.deps.getEntityLayer());
  }

  addGoldPickup(pickup: GoldPickup): void {
    addPickupToLayer(this.goldPickups, pickup, this.deps.getEntityLayer());
  }

  clear(): void {
    clearPickups(this.healingPickups);
    clearPickups(this.goldPickups);
  }

  updateHealing(dtMs: number): void {
    const player = this.deps.getPlayer();
    processPickupsForPlayerCollection({
      pickups: this.healingPickups,
      player,
      dtMs,
      onPickup: pickup => {
        applyHealingPickupReward(pickup, {
          player,
          screenFlash: this.deps.getScreenFlash(),
          showToast: this.deps.showToast,
          itemPickupGlow: this.deps.getItemPickupGlow(),
          showToastOnlyWhenHealed: true,
          collectAfterFeedback: true,
        });
      },
      onCollected: pickup => {
        pickup.destroy();
      },
      removeOnCollected: true,
    });
  }

  updateGold(dtMs: number): void {
    const player = this.deps.getPlayer();
    processPickupsForPlayerCollection({
      pickups: this.goldPickups,
      player,
      dtMs,
      onPickup: pickup => {
        applyGoldPickupReward(pickup, {
          damageNumbers: this.deps.getDamageNumbers(),
          itemPickupGlow: this.deps.getItemPickupGlow(),
          addGold: this.deps.onGoldCollected,
        });
      },
    });
  }
}
