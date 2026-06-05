import { GameAction, actionKey } from '@core/InputManager';
import { t } from '@i18n';
import type { Inventory } from '@items/Inventory';
import type { HUD } from '@ui/HUD';
import type { TutorialHint } from '@ui/TutorialHint';

const INVENTORY_KEY_HINT_ID = 'inventory_key';
const INVENTORY_KEY_AFTER_FIRST_IW_HINT_ID = 'inventory_key_after_first_item_world';
const INVENTORY_KEY_AFTER_FIRST_IW_EVENT = '__inventoryKeyAfterFirstItemWorldShown';

type PendingInventoryHint = 'first_pickup' | 'first_iw_return';

interface InventoryTutorialHintRuntimeDeps {
  tutorialHint: TutorialHint;
  getInventory: () => Inventory;
  hud: HUD;
  getUnlockedEvents: () => Set<string>;
  getRetireAfterFirstBoss: () => boolean;
  hasBlockingAnvilItem: () => boolean;
  isFirstItemWorldBossDefeated: () => boolean;
}

export class InventoryTutorialHintRuntime {
  private pendingHint: PendingInventoryHint | null = null;
  private pendingHintDelayMs = 0;
  private pendingFirstIwReturnHintHadFirstBossClear: boolean | null = null;

  constructor(private readonly deps: InventoryTutorialHintRuntimeDeps) {}

  requestFirstItemWorldReturnHint(hadFirstBossClear: boolean, delayMs = 0): void {
    const firstBossClearedThisRun =
      !hadFirstBossClear && this.deps.isFirstItemWorldBossDefeated();
    if (!firstBossClearedThisRun) return;
    if (!this.deps.getRetireAfterFirstBoss()) return;
    const unlockedEvents = this.deps.getUnlockedEvents();
    if (unlockedEvents.has(INVENTORY_KEY_AFTER_FIRST_IW_EVENT)) return;
    if (this.deps.hasBlockingAnvilItem()) {
      this.pendingFirstIwReturnHintHadFirstBossClear = hadFirstBossClear;
      return;
    }

    unlockedEvents.add(INVENTORY_KEY_AFTER_FIRST_IW_EVENT);
    this.deps.hud.setItemKeyHighlight(true);
    this.pendingHint = 'first_iw_return';
    this.pendingHintDelayMs = delayMs;
  }

  flushDeferredFirstItemWorldReturnHint(delayMs = 0): void {
    const pendingHadFirstBossClear = this.pendingFirstIwReturnHintHadFirstBossClear;
    this.pendingFirstIwReturnHintHadFirstBossClear = null;
    if (pendingHadFirstBossClear === null) return;
    this.requestFirstItemWorldReturnHint(pendingHadFirstBossClear, delayMs);
  }

  clearIfRustbornEquipped(): void {
    if (this.deps.getInventory().equipped?.def.id !== 'sword_rustborn') return;

    this.deps.tutorialHint.dismiss(INVENTORY_KEY_HINT_ID);
    this.deps.tutorialHint.dismiss(INVENTORY_KEY_AFTER_FIRST_IW_HINT_ID);
    if (this.pendingHint === 'first_pickup' || this.pendingHint === 'first_iw_return') {
      this.pendingHint = null;
      this.pendingHintDelayMs = 0;
    }
    this.pendingFirstIwReturnHintHadFirstBossClear = null;
    this.deps.hud.setItemKeyHighlight(false);
  }

  update(dt: number, cutsceneBlocking: boolean): void {
    if (!this.pendingHint) return;

    if (this.pendingHintDelayMs > 0) {
      this.pendingHintDelayMs = Math.max(0, this.pendingHintDelayMs - dt);
    }
    if (cutsceneBlocking || this.pendingHintDelayMs > 0) return;

    const hintId = this.pendingHint === 'first_pickup'
      ? INVENTORY_KEY_HINT_ID
      : INVENTORY_KEY_AFTER_FIRST_IW_HINT_ID;
    this.deps.tutorialHint.tryShow(
      hintId,
      { keyLabel: actionKey(GameAction.INVENTORY), text: t('tutorial.open_inventory'), persistent: true },
    );
    this.pendingHint = null;
    this.pendingHintDelayMs = 0;
  }
}
