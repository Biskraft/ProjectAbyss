import type { AnvilTether } from '@effects/AnvilTether';
import type { WeaponPulse } from '@effects/WeaponPulse';
import type { ItemInstance } from '@items/ItemInstance';

export class WorldSacredPickupState {
  lorePopupItem: ItemInstance | null = null;
  activeLorePopupItem: ItemInstance | null = null;
  activeWeaponPulse: WeaponPulse | null = null;
  activeAnvilTether: AnvilTether | null = null;
  pickupZoomOverride = 1.0;
  discoveryActive = false;
  discoveryDialoguePending = false;

  destroyActiveEffects(): void {
    this.clearWeaponPulse();
    this.clearAnvilTether();
  }

  clearWeaponPulse(): void {
    this.activeWeaponPulse?.destroy();
    this.activeWeaponPulse = null;
    this.pickupZoomOverride = 1.0;
  }

  clearAnvilTether(): void {
    this.activeAnvilTether?.destroy();
    this.activeAnvilTether = null;
  }
}
