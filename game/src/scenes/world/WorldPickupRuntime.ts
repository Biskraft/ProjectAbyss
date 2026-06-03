import { t } from '@i18n';
import type { Container } from 'pixi.js';
import type { Player } from '@entities/Player';
import { GoldPickup } from '@entities/GoldPickup';
import { HealingPickup } from '@entities/HealingPickup';
import type { DamageNumberManager } from '@ui/DamageNumber';
import type { ItemPickupGlowManager } from '@effects/ItemPickupGlow';
import type { ScreenFlash } from '@effects/ScreenFlash';
import type { LdtkLevel } from '@level/LdtkLoader';

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
    this.gold.push(pickup);
    if (!pickup.container.parent) this.deps.getEntityLayer().addChild(pickup.container);
  }

  addHealingPickup(pickup: HealingPickup): void {
    this.healing.push(pickup);
    if (!pickup.container.parent) this.deps.getEntityLayer().addChild(pickup.container);
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
        (pickup as unknown as { _key?: string })._key = key;
        this.addGoldPickup(pickup);
      } else if (entity.type === 'HealingPickup') {
        const key = `heal_${level.identifier}_${entity.px[0]}_${entity.px[1]}`;
        if (collectedItems.has(key)) continue;
        const healAmount = (entity.fields['HealAmount'] ?? entity.fields['healAmount'] ?? 30) as number;
        const pickup = new HealingPickup(entity.px[0], entity.px[1], healAmount);
        (pickup as unknown as { _key?: string })._key = key;
        this.addHealingPickup(pickup);
      }
    }
  }

  clear(): void {
    for (const pickup of this.healing) pickup.destroy();
    this.healing.length = 0;
    for (const pickup of this.gold) pickup.destroy();
    this.gold.length = 0;
  }

  update(dtMs: number): void {
    this.updateGold(dtMs);
    this.updateHealing(dtMs);
  }

  private updateGold(dtMs: number): void {
    const player = this.deps.getPlayer();
    for (let i = this.gold.length - 1; i >= 0; i--) {
      const pickup = this.gold[i];
      if (pickup.collected) continue;

      pickup.update(dtMs);
      const dx = Math.abs((player.x + player.width / 2) - (pickup.x + pickup.width / 2));
      const dy = Math.abs((player.y + player.height / 2) - (pickup.y + pickup.height / 2));
      if (dx >= 16 || dy >= 16) continue;

      const key = (pickup as unknown as { _key?: string })._key;
      if (key) this.deps.addCollectedItem(key);
      pickup.collect();
      this.deps.addGold(pickup.amount);
      this.deps.getDamageNumbers().spawnEXP(pickup.x + pickup.width / 2, pickup.y - 16, `+${pickup.amount} G`);
      this.deps.getItemPickupGlow().spawn(pickup.x + pickup.width / 2, pickup.y + pickup.height / 2, 0xffd700);
      pickup.destroy();
      this.gold.splice(i, 1);
    }
  }

  private updateHealing(dtMs: number): void {
    const player = this.deps.getPlayer();
    for (let i = this.healing.length - 1; i >= 0; i--) {
      const pickup = this.healing[i];
      if (pickup.collected) continue;

      pickup.update(dtMs);
      const dx = Math.abs((player.x + player.width / 2) - (pickup.x + pickup.width / 2));
      const dy = Math.abs((player.y + player.height / 2) - (pickup.y + pickup.height / 2));
      if (dx >= 16 || dy >= 16) continue;

      const key = (pickup as unknown as { _key?: string })._key;
      if (key) this.deps.addCollectedItem(key);
      pickup.collect();
      const healed = Math.min(pickup.healAmount, player.maxHp - player.hp);
      player.hp = Math.min(player.maxHp, player.hp + pickup.healAmount);
      this.deps.getScreenFlash().flash(0x44ff44, 0.3, 150);
      this.deps.showToast(t('toast.hp_gain', { amount: healed }), 0x44ff44);
      pickup.destroy();
      this.healing.splice(i, 1);
    }
  }
}
