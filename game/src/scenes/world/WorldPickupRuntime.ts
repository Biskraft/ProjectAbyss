import type { Container } from 'pixi.js';
import type { Player } from '@entities/Player';
import { GoldPickup } from '@entities/GoldPickup';
import { HealingPickup } from '@entities/HealingPickup';
import type { DamageNumberManager } from '@ui/DamageNumber';
import type { ItemPickupGlowManager } from '@effects/ItemPickupGlow';
import type { ScreenFlash } from '@effects/ScreenFlash';
import type { LdtkLevel } from '@level/LdtkLoader';
import { getPersistedKey, setPersistedKey } from '@scenes/world/PickupMetadata';
import {
  addPickupToLayer,
  applyGoldPickupReward,
  applyHealingPickupReward,
  clearPickups,
  processPickupsForPlayerCollection,
} from '@scenes/shared/PickupCollectionHelpers';

interface WorldPickupRuntimeDeps {
  getPlayer: () => Player;
  getEntityLayer: () => Container;
  getDamageNumbers: () => DamageNumberManager;
  getItemPickupGlow: () => ItemPickupGlowManager;
  getScreenFlash: () => ScreenFlash;
  showToast: (message: string, color: number) => void;
  addGold: (amount: number) => void;
  addCollectedItem: (key: string) => void;
}

export class WorldPickupRuntime {
  private readonly gold: GoldPickup[] = [];
  private readonly healing: HealingPickup[] = [];

  constructor(private readonly deps: WorldPickupRuntimeDeps) {}

  get goldPickups(): readonly GoldPickup[] {
    return this.gold;
  }

  get healingPickups(): readonly HealingPickup[] {
    return this.healing;
  }

  get goldCount(): number {
    return this.gold.length;
  }

  get healingCount(): number {
    return this.healing.length;
  }

  addGoldPickup(pickup: GoldPickup): void {
    addPickupToLayer(this.gold, pickup, this.deps.getEntityLayer());
  }

  addHealingPickup(pickup: HealingPickup): void {
    addPickupToLayer(this.healing, pickup, this.deps.getEntityLayer());
  }

  latestGoldPickup(): GoldPickup | null {
    return this.gold[this.gold.length - 1] ?? null;
  }

  latestHealingPickup(): HealingPickup | null {
    return this.healing[this.healing.length - 1] ?? null;
  }

  includesGoldPickup(pickup: GoldPickup): boolean {
    return this.gold.includes(pickup);
  }

  includesHealingPickup(pickup: HealingPickup): boolean {
    return this.healing.includes(pickup);
  }

  loadLevel(level: LdtkLevel, collisionGrid: number[][], collectedItems: ReadonlySet<string>): void {
    this.clear();
    for (const entity of level.entities) {
      if (entity.type === 'GoldPickup') {
        const key = `gold_${level.identifier}_${entity.px[0]}_${entity.px[1]}`;
        if (collectedItems.has(key)) continue;
        const amount = Math.max(1, Math.floor(((entity.fields['Amount'] ?? entity.fields['amount'] ?? 10) as number) * 0.1));
        const pickup = new GoldPickup(entity.px[0], entity.px[1], amount);
        pickup.enableTerrainPhysics(collisionGrid);
        setPersistedKey(pickup, key);
        this.addGoldPickup(pickup);
      } else if (entity.type === 'HealingPickup') {
        const key = `heal_${level.identifier}_${entity.px[0]}_${entity.px[1]}`;
        if (collectedItems.has(key)) continue;
        const healAmount = (entity.fields['HealAmount'] ?? entity.fields['healAmount'] ?? 30) as number;
        const pickup = new HealingPickup(entity.px[0], entity.px[1], healAmount);
        setPersistedKey(pickup, key);
        this.addHealingPickup(pickup);
      }
    }
  }

  clear(): void {
    clearPickups(this.healing);
    clearPickups(this.gold);
  }

  update(dtMs: number): void {
    this.updateGold(dtMs);
    this.updateHealing(dtMs);
  }

  private updateGold(dtMs: number): void {
    const player = this.deps.getPlayer();
    processPickupsForPlayerCollection({
      pickups: this.gold,
      player,
      dtMs,
      onPickup: pickup => {
        const key = getPersistedKey(pickup);
        if (key) this.deps.addCollectedItem(key);
        applyGoldPickupReward(pickup, {
          damageNumbers: this.deps.getDamageNumbers(),
          itemPickupGlow: this.deps.getItemPickupGlow(),
          addGold: this.deps.addGold,
        });
      },
    });
  }

  private updateHealing(dtMs: number): void {
    const player = this.deps.getPlayer();
    processPickupsForPlayerCollection({
      pickups: this.healing,
      player,
      dtMs,
      onPickup: pickup => {
        const key = getPersistedKey(pickup);
        if (key) this.deps.addCollectedItem(key);
        applyHealingPickupReward(pickup, {
          player,
          screenFlash: this.deps.getScreenFlash(),
          showToast: this.deps.showToast,
        });
      },
    });
  }
}
