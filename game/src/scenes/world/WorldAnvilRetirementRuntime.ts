import type { Anvil } from '@entities/Anvil';
import type { LdtkEntity } from '@level/LdtkLoader';
import { EGO_EVENT } from '@data/EgoDialogue';

interface WorldAnvilRetirementRuntimeDeps {
  getUnlockedEvents: () => Set<string>;
  isFirstItemWorldBossDefeated: () => boolean;
  getAnvil: () => Anvil | null;
  getReturnRetireAfterFirstBoss: () => boolean;
  clearReturnItem: () => void;
  hidePrompts: () => void;
  closeAnvilInventoryIfOpen: () => void;
  flushInventoryHint: () => void;
}

export class WorldAnvilRetirementRuntime {
  constructor(private readonly deps: WorldAnvilRetirementRuntimeDeps) {}

  readRetireAfterBossFlag(ent: LdtkEntity): boolean {
    return (ent.fields['RetireAfterFirstBoss'] as boolean | undefined) ?? false;
  }

  shouldSpawnDisabled(retireAfterFirstBoss: boolean): boolean {
    if (!retireAfterFirstBoss) return false;
    return this.hasBossClearForRetire();
  }

  hasBossClearForRetire(): boolean {
    const unlockedEvents = this.deps.getUnlockedEvents();
    if (unlockedEvents.has(EGO_EVENT.ANVIL_RETIRED)) return true;
    if (this.deps.isFirstItemWorldBossDefeated()) return true;
    for (const event of unlockedEvents) {
      if (event.startsWith('boss_')) return true;
    }
    return false;
  }

  isRetiredByBossClear(anvil: Anvil | null): boolean {
    return !!anvil?.retireAfterFirstBoss && this.hasBossClearForRetire();
  }

  retireAfterBossClear(hadFirstBossClear: boolean): void {
    if (!this.hasBossClearForRetire()) return;
    if (!this.deps.getReturnRetireAfterFirstBoss()) return;

    const anvil = this.deps.getAnvil();
    if (!anvil) return;

    if (!hadFirstBossClear) {
      const unlockedEvents = this.deps.getUnlockedEvents();
      unlockedEvents.add(EGO_EVENT.ANVIL_RETIRED);
      unlockedEvents.add(EGO_EVENT.WORLD_RETURN);
    }

    anvil.used = false;
    anvil.item = null;
    anvil.retireAfterFirstBoss = true;
    void anvil.setDisabled(true);
    this.deps.clearReturnItem();
    this.deps.hidePrompts();
    this.deps.closeAnvilInventoryIfOpen();
    this.deps.flushInventoryHint();
  }
}
