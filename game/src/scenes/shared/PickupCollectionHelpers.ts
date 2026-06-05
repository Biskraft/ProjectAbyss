import type { Container } from 'pixi.js';
import type { Player } from '@entities/Player';
import type { GoldPickup } from '@entities/GoldPickup';
import type { HealingPickup } from '@entities/HealingPickup';
import type { DamageNumberManager } from '@ui/DamageNumber';
import type { ItemPickupGlowManager } from '@effects/ItemPickupGlow';
import type { ScreenFlash } from '@effects/ScreenFlash';
import { t } from '@i18n';

interface PickupWithContainer {
  container: Container;
  x: number;
  y: number;
  width?: number;
  height?: number;
  destroy: () => void;
  update: (dtMs: number) => void;
  collected?: boolean;
}

interface PickupsForPlayerCollectionOptions<T extends PickupWithContainer> {
  pickups: T[];
  player: Player;
  dtMs: number;
  onPickup: (pickup: T) => boolean | void;
  onCollected?: (pickup: T) => void;
  removeOnCollected?: boolean;
  isNearPlayer?: (pickup: T, player: Player) => boolean;
}

interface GoldPickupRewardDeps {
  damageNumbers: DamageNumberManager;
  itemPickupGlow: ItemPickupGlowManager;
  addGold: (amount: number) => void;
}

interface HealingPickupRewardDeps {
  player: Player;
  screenFlash: ScreenFlash;
  showToast: (message: string, color: number) => void;
  itemPickupGlow?: ItemPickupGlowManager;
  showToastOnlyWhenHealed?: boolean;
  collectAfterFeedback?: boolean;
}

export function addPickupToLayer<T extends PickupWithContainer>(
  pickups: T[],
  pickup: T,
  entityLayer: Container,
): void {
  pickups.push(pickup);
  if (!pickup.container.parent) entityLayer.addChild(pickup.container);
}

export function clearPickups<T extends PickupWithContainer>(
  pickups: T[],
): void {
  for (const pickup of pickups) pickup.destroy();
  pickups.length = 0;
}

export function applyGoldPickupReward(pickup: GoldPickup, deps: GoldPickupRewardDeps): void {
  pickup.collect();
  deps.addGold(pickup.amount);
  deps.damageNumbers.spawnEXP(pickup.x + pickup.width / 2, pickup.y - 16, `+${pickup.amount} G`);
  deps.itemPickupGlow.spawn(pickup.x + pickup.width / 2, pickup.y + pickup.height / 2, 0xffd700);
}

export function applyHealingPickupReward(pickup: HealingPickup, deps: HealingPickupRewardDeps): void {
  if (!deps.collectAfterFeedback) pickup.collect();

  const healed = Math.min(pickup.healAmount, deps.player.maxHp - deps.player.hp);
  deps.player.hp = Math.min(deps.player.maxHp, deps.player.hp + pickup.healAmount);
  deps.screenFlash.flash(0x44ff44, 0.3, 150);

  if (!deps.showToastOnlyWhenHealed || healed > 0) {
    deps.showToast(t('toast.hp_gain', { amount: healed }), 0x44ff44);
  }

  deps.itemPickupGlow?.spawn(pickup.x + pickup.width / 2, pickup.y + pickup.height / 2, 0x44ff44);

  if (deps.collectAfterFeedback) pickup.collect();
}

export function isPickupNearPlayer(
  pickup: PickupWithContainer,
  player: Player,
  threshold = 16,
): boolean {
  return isPointNearPlayer(
    {
      x: pickup.x + (pickup.width ?? 0) / 2,
      y: pickup.y + (pickup.height ?? 0) / 2,
    },
    player,
    threshold,
  );
}

export function isPointNearPlayer(
  point: { x: number; y: number },
  player: Player,
  threshold = 16,
): boolean {
  const dx = Math.abs((player.x + player.width / 2) - point.x);
  const dy = Math.abs((player.y + player.height / 2) - point.y);
  return dx < threshold && dy < threshold;
}

export function processPickupsForPlayerCollection<T extends PickupWithContainer>(
  options: PickupsForPlayerCollectionOptions<T>,
): void {
  const {
    pickups,
    player,
    dtMs,
    onPickup,
    onCollected,
    removeOnCollected = false,
    isNearPlayer = isPickupNearPlayer,
  } = options;

  for (let i = pickups.length - 1; i >= 0; i--) {
    const pickup = pickups[i];
    if (pickup.collected) {
      if (onCollected) {
        onCollected(pickup);
      }
      if (removeOnCollected) {
        pickup.destroy();
        pickups.splice(i, 1);
      }
      continue;
    }

    pickup.update(dtMs);
    if (!isNearPlayer(pickup, player)) continue;

    const shouldCollect = onPickup(pickup);
    if (shouldCollect === false) continue;
    pickup.destroy();
    pickups.splice(i, 1);
  }
}
