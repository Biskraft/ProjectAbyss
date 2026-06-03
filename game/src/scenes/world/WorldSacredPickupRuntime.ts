import type { Container } from 'pixi.js';
import { GameAction } from '@core/InputManager';
import { WeaponPulse } from '@effects/WeaponPulse';
import type { Player } from '@entities/Player';
import type { ItemDropEntity } from '@items/ItemDrop';
import type { ItemInstance } from '@items/ItemInstance';
import { EGO_EVENT, EGO_RUSTBORN_AWAKEN, hasEgo } from '@data/EgoDialogue';
import { sacredSave } from '@save/PlayerSave';
import type { DivePreview } from '@ui/DivePreview';
import type { LoreDisplay } from '@ui/LoreDisplay';
import type { LorePopup } from '@ui/LorePopup';
import type { Game } from '../../Game';
import type { WorldAcquireOverlayRuntime } from './WorldAcquireOverlayRuntime';
import type { WorldSacredPickupState } from './WorldSacredPickupState';

interface WorldSacredPickupRuntimeDeps {
  game: Game;
  state: WorldSacredPickupState;
  getPlayer: () => Player;
  getEntityLayer: () => Container;
  getUnlockedEvents: () => Set<string>;
  getItemDrops: () => readonly ItemDropEntity[];
  getLoreDisplay: () => LoreDisplay | null;
  getLorePopup: () => LorePopup | null;
  getDivePreview: () => DivePreview | null;
  acquireOverlayRuntime: WorldAcquireOverlayRuntime;
  resolveAnvilTarget: (fromX: number, fromY: number) => { x: number; y: number } | null;
}

export class WorldSacredPickupRuntime {
  constructor(private readonly deps: WorldSacredPickupRuntimeDeps) {}

  startPickup(item: ItemInstance, wx: number, wy: number): void {
    const firstEver = !sacredSave.isFirstPickupDone();
    const isFirstSeen = !sacredSave.hasSeenItem(item.def.id);
    if (firstEver) {
      sacredSave.markFirstPickupDone();
    }

    const state = this.deps.state;
    state.destroyActiveEffects();

    if (isFirstSeen) {
      const unlockedEvents = this.deps.getUnlockedEvents();
      const isRustborn = item.def.id === 'sword_rustborn';
      const skipPulse = isRustborn && unlockedEvents.has(EGO_EVENT.FIRST_WALK);
      if (!skipPulse) {
        this.startPulse(
          wx,
          wy,
          item,
          isRustborn ? 'T2_FULL_CUTSCENE' : 'T2_QUICK_CUTSCENE',
        );
      }
    }

    state.lorePopupItem = item;

    const unlockedEvents = this.deps.getUnlockedEvents();
    if (!unlockedEvents.has(EGO_EVENT.WAKE) && hasEgo(item.def.id)) {
      unlockedEvents.add(EGO_EVENT.WAKE);
    }
  }

  update(dt: number): boolean {
    let blocking = false;

    this.startRustbornDiscoveryIfNeeded();
    if (this.updatePulse(dt)) blocking = true;
    this.updateAnvilTether(dt);
    this.updateLorePopupStart();
    if (this.updateLorePopup(dt)) blocking = true;
    if (this.deps.acquireOverlayRuntime.update(dt)) blocking = true;
    if (this.updateDivePreview()) blocking = true;
    if (this.updateRustbornDiscovery()) blocking = true;

    return blocking;
  }

  isInventoryHintBlocked(): boolean {
    const state = this.deps.state;
    return !!(
      state.activeWeaponPulse?.isBlocking ||
      this.deps.getLorePopup()?.isBlocking() ||
      state.lorePopupItem !== null ||
      this.deps.acquireOverlayRuntime.isBlocking ||
      this.deps.getLoreDisplay()?.isActive
    );
  }

  applyCameraZoomOverride(): void {
    const state = this.deps.state;
    if (state.activeWeaponPulse?.isBlocking) {
      this.deps.game.camera.setZoom(state.pickupZoomOverride);
    }
  }

  requestTetherFadeOut(): void {
    this.deps.state.activeAnvilTether?.requestFadeOut();
  }

  private startRustbornDiscoveryIfNeeded(): void {
    const state = this.deps.state;
    const unlockedEvents = this.deps.getUnlockedEvents();
    const loreDisplay = this.deps.getLoreDisplay();
    if (
      state.discoveryActive ||
      unlockedEvents.has(EGO_EVENT.FIRST_WALK) ||
      !loreDisplay ||
      loreDisplay.isActive ||
      state.activeWeaponPulse
    ) {
      return;
    }

    const player = this.deps.getPlayer();
    const proximityPx = 80;
    const proxSq = proximityPx * proximityPx;
    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;
    for (const drop of this.deps.getItemDrops()) {
      if (drop.item.def.id !== 'sword_rustborn') continue;
      const dx = px - drop.x;
      const dy = py - drop.y;
      if (dx * dx + dy * dy > proxSq) continue;

      state.discoveryActive = true;
      state.discoveryDialoguePending = true;
      unlockedEvents.add(EGO_EVENT.FIRST_WALK);
      this.startPulse(drop.x, drop.y, drop.item, 'T2_QUICK_CUTSCENE');
      break;
    }
  }

  private startPulse(
    x: number,
    y: number,
    item: ItemInstance,
    mode: 'T2_FULL_CUTSCENE' | 'T2_QUICK_CUTSCENE',
  ): void {
    const pulse = new WeaponPulse(x, y, item.rarity, mode);
    this.deps.getEntityLayer().addChild(pulse.container);
    pulse.onZoom = (scale) => { this.deps.state.pickupZoomOverride = scale; };
    pulse.start();
    this.deps.state.activeWeaponPulse = pulse;
  }

  private updatePulse(dt: number): boolean {
    const state = this.deps.state;
    const pulse = state.activeWeaponPulse;
    if (!pulse) return false;

    pulse.update(dt);
    const blocking = pulse.isBlocking;
    if (pulse.isDone) {
      state.clearWeaponPulse();
    }
    return blocking;
  }

  private updateAnvilTether(dt: number): void {
    const state = this.deps.state;
    const tether = state.activeAnvilTether;
    if (!tether) return;

    const player = this.deps.getPlayer();
    const fx = player.x + player.width / 2;
    const fy = player.y + player.height / 2;
    const target = this.deps.resolveAnvilTarget(fx, fy);
    if (target) {
      tether.setEndpoints(fx, fy, target.x, target.y);
    }
    tether.update(dt);
    if (tether.isDone) {
      state.clearAnvilTether();
    }
  }

  private updateLorePopupStart(): void {
    const state = this.deps.state;
    const lorePopup = this.deps.getLorePopup();
    if (!state.lorePopupItem || state.activeWeaponPulse || !lorePopup) return;

    const item = state.lorePopupItem;
    const shown = lorePopup.showIfNew(item, () => {
      state.activeLorePopupItem = null;
    });
    if (shown) {
      state.activeLorePopupItem = item;
    } else {
      sacredSave.markItemSeen(item.def.id);
      state.activeLorePopupItem = null;
    }
    state.lorePopupItem = null;
  }

  private updateLorePopup(dt: number): boolean {
    const lorePopup = this.deps.getLorePopup();
    if (!lorePopup?.isBlocking()) return false;

    lorePopup.update(dt);
    const input = this.deps.game.input;
    if (lorePopup.canConfirm() && input.isJustPressed(GameAction.ATTACK)) {
      input.consumeJustPressed(GameAction.ATTACK);
      const item = this.deps.state.activeLorePopupItem;
      if (item) lorePopup.confirm(item);
      else lorePopup.close();
    } else if (!lorePopup.canConfirm() && input.isJustPressed(GameAction.ATTACK)) {
      input.consumeJustPressed(GameAction.ATTACK);
    }
    return true;
  }

  private updateDivePreview(): boolean {
    const divePreview = this.deps.getDivePreview();
    if (!divePreview?.isBlocking()) return false;

    const input = this.deps.game.input;
    if (input.isJustPressed(GameAction.ATTACK)) {
      input.consumeJustPressed(GameAction.ATTACK);
      divePreview.confirm();
    } else if (input.isJustPressed(GameAction.MENU) || input.isJustPressed(GameAction.DASH)) {
      divePreview.cancel();
    }
    return true;
  }

  private updateRustbornDiscovery(): boolean {
    const state = this.deps.state;
    if (state.discoveryDialoguePending && !state.activeWeaponPulse) {
      state.discoveryDialoguePending = false;
      this.deps.getLoreDisplay()?.showDialogue(EGO_RUSTBORN_AWAKEN, true);
    }

    if (!state.discoveryActive) return false;

    const dialogueDone = !state.discoveryDialoguePending && !this.deps.getLoreDisplay()?.isActive;
    if (state.activeWeaponPulse || !dialogueDone) {
      return true;
    }
    state.discoveryActive = false;
    return false;
  }
}
