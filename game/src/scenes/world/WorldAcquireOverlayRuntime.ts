import type { Container } from 'pixi.js';
import { GameAction } from '@core/InputManager';
import { AcquireOverlay, type AcquireConfig } from '@ui/AcquireOverlay';
import { detachDisplayObject, destroyDisplayObject } from '@scenes/shared/DisplayObjectLifecycleHelpers';
import { consumeJustPressedAction } from '@scenes/shared/InputPressHelpers';
import type { Game } from '../../Game';

interface WorldAcquireOverlayRuntimeDeps {
  game: Game;
  getHudContainer: () => Container;
  getMinimapContainer: () => Container | null;
  isInItemTunnel: () => boolean;
}

export class WorldAcquireOverlayRuntime {
  private overlay: AcquireOverlay | null = null;

  constructor(private readonly deps: WorldAcquireOverlayRuntimeDeps) {}

  get isBlocking(): boolean {
    return this.overlay?.isBlocking() ?? false;
  }

  show(config: AcquireConfig): void {
    const overlay = this.ensureOverlay();
    const overlayContainer = overlay.container;
    const uiContainer = this.deps.game.uiContainer;
    if (overlayContainer.parent !== uiContainer) {
      detachDisplayObject(overlayContainer);
      uiContainer.addChild(overlayContainer);
    }
    uiContainer.setChildIndex(overlayContainer, uiContainer.children.length - 1);

    this.deps.getHudContainer().visible = false;
    const minimap = this.deps.getMinimapContainer();
    if (minimap) minimap.visible = false;

    overlay.show(config, () => {
      if (!this.deps.game.hudReady) return;
      this.deps.getHudContainer().visible = true;
      const currentMinimap = this.deps.getMinimapContainer();
      if (currentMinimap && !this.deps.isInItemTunnel()) currentMinimap.visible = true;
    });
  }

  update(dt: number): boolean {
    if (!this.overlay?.isBlocking()) return false;
    this.overlay.update(dt);
    if (consumeJustPressedAction(this.deps.game.input, GameAction.ATTACK)) {
      if (this.overlay.canConfirm()) {
        this.overlay.confirm();
      }
    }
    return true;
  }

  destroy(): void {
    if (!this.overlay) return;
    destroyDisplayObject(this.overlay.container, { children: true });
    this.overlay = null;
  }

  private ensureOverlay(): AcquireOverlay {
    if (!this.overlay) {
      this.overlay = new AcquireOverlay(this.deps.game.uiScale);
      this.deps.game.uiContainer.addChild(this.overlay.container);
    }
    return this.overlay;
  }
}
