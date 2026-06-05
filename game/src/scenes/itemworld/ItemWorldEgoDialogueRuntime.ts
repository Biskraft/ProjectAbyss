import {
  EGO_IW_ENTER,
  EGO_MONSTER_FIRST,
  EGO_FIRST_KILL,
  EGO_ROOM_CLEAR,
  EGO_INNOCENT_FOUND,
  EGO_INNOCENT_STABLE,
  EGO_PLAYER_DEATH,
  EGO_BOSS_KILLED,
  EGO_REENTRY_2,
  EGO_REENTRY_2_BOSS,
  EGO_REENTRY_3,
  EGO_SWAP_RETURN,
  EGO_AFFINITY_MAX,
  EGO_EVENT,
  egoEntryKey,
  getEgoEntryCount,
  hasEgo,
} from '@data/EgoDialogue';
import type { LoreDisplay, LoreLine } from '@ui/LoreDisplay';
import { tryShowFlaggedEgoDialogue } from '@scenes/shared/EgoDialogueRuntimeHelpers';

interface ItemWorldEgoDialogueRuntimeDeps {
  getLoreDisplay: () => LoreDisplay | null;
  getUnlockedEvents: () => Set<string>;
}

export class ItemWorldEgoDialogueRuntime {
  private active = false;
  private entryCount = 0;
  private entryDialogueStarted = false;
  private readonly flags = new Set<string>();
  private pendingEnterCompletionResolvers: Array<() => void> = [];
  private firstKillDelayMs = 0;

  constructor(private readonly deps: ItemWorldEgoDialogueRuntimeDeps) {}

  init(itemDefId: string): void {
    this.flags.clear();
    this.active = hasEgo(itemDefId);
    this.entryCount = 0;
    this.entryDialogueStarted = false;
    this.pendingEnterCompletionResolvers = [];
    this.firstKillDelayMs = 0;

    if (!this.active) return;

    const unlockedEvents = this.deps.getUnlockedEvents();
    this.entryCount = getEgoEntryCount(unlockedEvents) + 1;
    unlockedEvents.add(egoEntryKey(this.entryCount));
  }

  isActive(): boolean {
    return this.active;
  }

  getFlags(): Set<string> {
    return this.flags;
  }

  isFirstBossOnboarding(): boolean {
    return this.active && !this.deps.getUnlockedEvents().has(EGO_EVENT.BOSS_KILLED);
  }

  tryMarkEntryDialogueStarted(): boolean {
    if (this.entryDialogueStarted) return false;
    this.entryDialogueStarted = true;
    return true;
  }

  fireEnter(): void {
    const unlockedEvents = this.deps.getUnlockedEvents();
    if (this.isFirstBossOnboarding()) {
      this.fire('iw_enter', EGO_IW_ENTER, true);
    } else if (this.entryCount === 2) {
      if (
        unlockedEvents.has(EGO_EVENT.WEAPON_SWAP) &&
        !unlockedEvents.has(EGO_EVENT.SWAP_RETURN)
      ) {
        unlockedEvents.add(EGO_EVENT.SWAP_RETURN);
        this.fire('swap_return', EGO_SWAP_RETURN, false);
      } else {
        this.fire('reentry_2', EGO_REENTRY_2, false);
      }
    } else if (this.entryCount === 3) {
      this.fire('reentry_3', EGO_REENTRY_3, false);
    }
  }

  async fireEnterAsync(): Promise<void> {
    this.fireEnter();
    const loreDisplay = this.deps.getLoreDisplay();
    if (!loreDisplay?.isActive) return;

    await new Promise<void>((resolve) => {
      this.pendingEnterCompletionResolvers.push(resolve);
    });
  }

  clear(): void {
    this.pendingEnterCompletionResolvers.length = 0;
    this.firstKillDelayMs = 0;
  }

  update(dtMs: number): void {
    if (this.firstKillDelayMs > 0) {
      this.firstKillDelayMs -= dtMs;
      if (this.firstKillDelayMs <= 0) {
        this.firstKillDelayMs = 0;
        const loreDisplay = this.deps.getLoreDisplay();
        if (!loreDisplay?.isActive) {
          void loreDisplay?.showDialogue(EGO_FIRST_KILL, false);
        }
      }
    }

    if (!this.pendingEnterCompletionResolvers.length) return;

    const loreDisplay = this.deps.getLoreDisplay();
    if (!loreDisplay?.isActive) {
      const callbacks = this.pendingEnterCompletionResolvers;
      this.pendingEnterCompletionResolvers = [];
      for (const resolve of callbacks) resolve();
    }
  }

  fireMonsterVisible(): void {
    if (!this.isFirstBossOnboarding()) return;
    this.fire('monster_first', EGO_MONSTER_FIRST, false);
  }

  fireFirstKill(): void {
    if (!this.isFirstBossOnboarding()) return;
    if (this.flags.has('first_kill')) return;
    this.flags.add('first_kill');
    this.firstKillDelayMs = 1000;
  }

  fireRoomClear(roomIndex: number): void {
    if (!this.isFirstBossOnboarding()) return;
    if (roomIndex >= 2) {
      this.fire('room_clear', EGO_ROOM_CLEAR, false);
    }
  }

  fireInnocentFound(): void {
    if (!this.isFirstBossOnboarding()) return;
    this.fire('innocent_found', EGO_INNOCENT_FOUND, false);
  }

  fireInnocentStable(): void {
    if (!this.isFirstBossOnboarding()) return;
    this.fire('innocent_stable', EGO_INNOCENT_STABLE, false);
  }

  firePlayerDeath(): void {
    if (!this.isFirstBossOnboarding()) return;
    this.fire('player_death', EGO_PLAYER_DEATH, false);
  }

  fireBossKilled(): void {
    if (this.isFirstBossOnboarding()) {
      this.fire('boss_killed', EGO_BOSS_KILLED, true);
    } else if (this.entryCount === 2) {
      this.fire('reentry_2_boss', EGO_REENTRY_2_BOSS, false);
    }
  }

  fireAffinityMax(): void {
    const unlockedEvents = this.deps.getUnlockedEvents();
    if (!unlockedEvents.has(EGO_EVENT.AFFINITY_MAX)) {
      unlockedEvents.add(EGO_EVENT.AFFINITY_MAX);
      this.fire('affinity_max', EGO_AFFINITY_MAX, true);
    }
  }

  private fire(key: string, lines: LoreLine[], freeze = false): boolean {
    return tryShowFlaggedEgoDialogue({
      active: this.active,
      flags: this.flags,
      key,
      loreDisplay: this.deps.getLoreDisplay(),
      lines,
      freeze,
    });
  }
}
