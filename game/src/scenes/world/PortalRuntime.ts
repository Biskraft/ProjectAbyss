import type { Container } from 'pixi.js';
import type { Game } from '../../Game';
import { GameAction } from '@core/InputManager';
import type { Player } from '@entities/Player';
import { Portal, type PortalSourceType } from '@entities/Portal';
import type { Rarity } from '@data/weapons';
import type { ItemInstance } from '@items/ItemInstance';
import { t } from '@i18n';
import {
  addEntityToLayer,
  destroyAndClearEntities,
} from '@scenes/shared/EntityLifecycleHelpers';
import { updatePortalInteractions } from '@scenes/shared/ProximityInteractionHelpers';

interface PortalRuntimeDeps {
  game: Game;
  getPlayer: () => Player;
  getEntityLayer: () => Container;
  showToast: (message: string, color: number) => void;
  onEnter: (portal: Portal) => void;
}

export class PortalRuntime {
  private portals: Portal[] = [];

  constructor(private readonly deps: PortalRuntimeDeps) {}

  spawn(
    x: number,
    y: number,
    rarity: Rarity,
    sourceType: PortalSourceType,
    sourceItem?: ItemInstance,
  ): void {
    const portal = new Portal(x, y, rarity, sourceType, sourceItem);
    addEntityToLayer(this.portals, portal, this.deps.getEntityLayer());

    this.deps.game.hitstopFrames += portal.spawnHitstop;
    this.deps.game.camera.shake(portal.spawnShake);

    if (rarity !== 'normal') {
      this.deps.showToast(t('toast.portal_appeared', { rarity: rarity.toUpperCase() }), 0xffcc44);
    }
  }

  update(deltaMS: number): boolean {
    const player = this.deps.getPlayer();
    return updatePortalInteractions({
      portals: this.portals,
      actor: player,
      dtMs: deltaMS,
      isInteractPressed: () => this.deps.game.input.isJustPressed(GameAction.LOOK_UP),
      onEnter: (portal) => {
        this.detach(portal);
        portal.setShowHint(false);
        this.deps.onEnter(portal);
      },
    });
  }

  detach(portal: Portal): void {
    const index = this.portals.indexOf(portal);
    if (index >= 0) this.portals.splice(index, 1);
  }

  clear(): void {
    destroyAndClearEntities(this.portals);
  }
}
