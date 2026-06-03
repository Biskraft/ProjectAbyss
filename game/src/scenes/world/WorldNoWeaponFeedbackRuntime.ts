import type { Player } from '@entities/Player';
import { t } from '@i18n';

const NO_WEAPON_TOAST_COOLDOWN_MS = 1500;
const NO_WEAPON_TOAST_COLOR = 0xffa41b;

interface WorldNoWeaponFeedbackRuntimeDeps {
  getPlayer: () => Player;
  showToast: (message: string, color: number) => void;
}

export class WorldNoWeaponFeedbackRuntime {
  private cooldownMs = 0;

  constructor(private readonly deps: WorldNoWeaponFeedbackRuntimeDeps) {}

  update(dt: number): void {
    const player = this.deps.getPlayer();
    if (player.attackBlockedNoWeaponPulse) {
      player.attackBlockedNoWeaponPulse = false;
      if (this.cooldownMs <= 0) {
        this.deps.showToast(t('toast.no_weapon'), NO_WEAPON_TOAST_COLOR);
        this.cooldownMs = NO_WEAPON_TOAST_COOLDOWN_MS;
      }
    }

    if (this.cooldownMs > 0) {
      this.cooldownMs = Math.max(0, this.cooldownMs - dt);
    }
  }
}
