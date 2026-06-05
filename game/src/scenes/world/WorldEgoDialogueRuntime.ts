import {
  EGO_ANVIL,
  EGO_WEAPON_SWAP,
  EGO_WORLD_RETURN,
  EGO_EVENT,
  getEgoAnvilRetired,
  hasEgo,
} from '@data/EgoDialogue';
import type { Player } from '@entities/Player';
import type { Anvil } from '@entities/Anvil';
import type { LoreDisplay } from '@ui/LoreDisplay';
import { getDistanceSquared } from '@scenes/shared/DistanceHelpers';

const WORLD_RETURN_DIALOGUE_DELAY_MS = 200;

interface PendingWorldReturn {
  remainingMs: number;
  action: () => void | Promise<void>;
}

interface WorldEgoDialogueRuntimeDeps {
  getPlayer: () => Player;
  getAnvil: () => Anvil | null;
  getLoreDisplay: () => LoreDisplay | null;
  getUnlockedEvents: () => Set<string>;
  isFirstItemWorldBossDefeated: () => boolean;
}

export class WorldEgoDialogueRuntime {
  private pendingWorldReturnActions: PendingWorldReturn[] = [];
  private runningAsyncReturnAction = false;
  private pendingReturnActionToken = 0;

  constructor(private readonly deps: WorldEgoDialogueRuntimeDeps) {}

  update(dtMs: number): void {
    if (this.runningAsyncReturnAction) return;

    const loreDisplay = this.deps.getLoreDisplay();
    const unlockedEvents = this.deps.getUnlockedEvents();
    if (loreDisplay && !loreDisplay.isActive && !unlockedEvents.has(EGO_EVENT.ANVIL_HINT)) {
      const anvil = this.deps.getAnvil();
      if (anvil && unlockedEvents.has(EGO_EVENT.WAKE)) {
        const player = this.deps.getPlayer();
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;
        const anvilPromptX = anvil.x;
        const anvilPromptY = anvil.y - anvil.height / 2;
        if (getDistanceSquared(playerCenterX, playerCenterY, anvilPromptX, anvilPromptY) < 60 * 60) {
          unlockedEvents.add(EGO_EVENT.ANVIL_HINT);
          loreDisplay.showDialogue(EGO_ANVIL, false);
        }
      }
    }

    if (this.pendingWorldReturnActions.length === 0) return;

    const pending = this.pendingWorldReturnActions[0];
    pending.remainingMs -= dtMs;
    if (pending.remainingMs > 0) return;

    this.pendingWorldReturnActions.shift();

    const result = pending.action();
    if (!result || typeof (result as Promise<unknown>).then !== 'function') return;

    const token = this.pendingReturnActionToken;
    this.runningAsyncReturnAction = true;
    void Promise.resolve(result).finally(() => {
      if (token !== this.pendingReturnActionToken) return;
      this.runningAsyncReturnAction = false;
    });
  }

  fireWorldReturnDialogue(weaponDefId: string): void {
    if (!hasEgo(weaponDefId)) return;

    const unlockedEvents = this.deps.getUnlockedEvents();
    const anvil = this.deps.getAnvil();

    const anvilRetiring = (
      this.deps.isFirstItemWorldBossDefeated()
      && !unlockedEvents.has(EGO_EVENT.ANVIL_RETIRED)
      && anvil?.retireAfterFirstBoss
    );

    if (anvilRetiring) {
      unlockedEvents.add(EGO_EVENT.ANVIL_RETIRED);
      unlockedEvents.add(EGO_EVENT.WORLD_RETURN);
      this.queueReturnAction(async () => {
        const loreDisplay = this.deps.getLoreDisplay();
        if (loreDisplay && !loreDisplay.isActive) {
          await loreDisplay.showDialogue(getEgoAnvilRetired(), true);
        }
        await this.deps.getAnvil()?.setDisabled(true);
      });
      return;
    }

    if (!unlockedEvents.has(EGO_EVENT.WORLD_RETURN)) {
      unlockedEvents.add(EGO_EVENT.WORLD_RETURN);
      this.queueReturnAction(() => {
        const loreDisplay = this.deps.getLoreDisplay();
        if (!loreDisplay?.isActive) {
          void loreDisplay?.showDialogue(EGO_WORLD_RETURN, true);
        }
      });
    }
  }

  clear(): void {
    this.pendingWorldReturnActions.length = 0;
    this.runningAsyncReturnAction = false;
    this.pendingReturnActionToken += 1;
  }

  private queueReturnAction(action: () => void | Promise<void>): void {
    this.pendingWorldReturnActions.length = 0;
    this.pendingWorldReturnActions.push({
      remainingMs: WORLD_RETURN_DIALOGUE_DELAY_MS,
      action,
    });
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
