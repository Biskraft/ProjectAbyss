import {
  EGO_ANVIL,
  EGO_WEAPON_SWAP,
  EGO_WORLD_RETURN,
  EGO_EVENT,
  getEgoAnvilRetired,
  hasEgo,
} from '@data/EgoDialogue';
import { sacredSave } from '@save/PlayerSave';
import type { Player } from '@entities/Player';
import type { Anvil } from '@entities/Anvil';
import type { LoreDisplay } from '@ui/LoreDisplay';

interface WorldEgoDialogueRuntimeDeps {
  getPlayer: () => Player;
  getAnvil: () => Anvil | null;
  getLoreDisplay: () => LoreDisplay | null;
  getUnlockedEvents: () => Set<string>;
}

export class WorldEgoDialogueRuntime {
  constructor(private readonly deps: WorldEgoDialogueRuntimeDeps) {}

  update(_dtMs: number): void {
    const loreDisplay = this.deps.getLoreDisplay();
    const unlockedEvents = this.deps.getUnlockedEvents();
    if (!loreDisplay || loreDisplay.isActive || !unlockedEvents.has(EGO_EVENT.WAKE) || unlockedEvents.has(EGO_EVENT.ANVIL_HINT)) {
      return;
    }

    const anvil = this.deps.getAnvil();
    if (!anvil) return;

    const player = this.deps.getPlayer();
    const dx = (player.x + player.width / 2) - anvil.x;
    const dy = (player.y + player.height / 2) - (anvil.y - anvil.height / 2);
    if (dx * dx + dy * dy >= 60 * 60) return;

    unlockedEvents.add(EGO_EVENT.ANVIL_HINT);
    loreDisplay.showDialogue(EGO_ANVIL, false);
  }

  fireWorldReturnDialogue(weaponDefId: string): void {
    if (!hasEgo(weaponDefId)) return;

    const loreDisplay = this.deps.getLoreDisplay();
    const unlockedEvents = this.deps.getUnlockedEvents();
    const anvil = this.deps.getAnvil();

    const anvilRetiring = (
      sacredSave.isFirstItemWorldBossDefeated()
      && !unlockedEvents.has(EGO_EVENT.ANVIL_RETIRED)
      && anvil?.retireAfterFirstBoss
    );

    if (anvilRetiring) {
      unlockedEvents.add(EGO_EVENT.ANVIL_RETIRED);
      unlockedEvents.add(EGO_EVENT.WORLD_RETURN);
      setTimeout(async () => {
        if (loreDisplay && !loreDisplay.isActive) {
          await loreDisplay.showDialogue(getEgoAnvilRetired(), true);
        }
        await anvil?.setDisabled(true);
      }, 200);
      return;
    }

    if (!unlockedEvents.has(EGO_EVENT.WORLD_RETURN)) {
      unlockedEvents.add(EGO_EVENT.WORLD_RETURN);
      setTimeout(() => {
        if (!loreDisplay?.isActive) {
          void loreDisplay?.showDialogue(EGO_WORLD_RETURN, true);
        }
      }, 200);
    }
  }

  notifyWeaponSwap(previousWeaponDefId: string | null, currentWeaponDefId: string | null): void {
    if (
      !previousWeaponDefId
      || !currentWeaponDefId
      || previousWeaponDefId === currentWeaponDefId
      || !hasEgo(previousWeaponDefId)
      || hasEgo(currentWeaponDefId)
      || this.deps.getUnlockedEvents().has(EGO_EVENT.WEAPON_SWAP)
    ) return;

    this.deps.getUnlockedEvents().add(EGO_EVENT.WEAPON_SWAP);
    const loreDisplay = this.deps.getLoreDisplay();
    if (!loreDisplay || loreDisplay.isActive) return;

    loreDisplay.showDialogue(EGO_WEAPON_SWAP, false);
  }
}
