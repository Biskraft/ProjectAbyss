import { GameAction } from '@core/InputManager';
import { t } from '@i18n';
import type { Container } from 'pixi.js';
import type { Player } from '@entities/Player';
import { ThrowableContainer, type ContainerKind } from '@entities/ThrowableContainer';
import type { Game } from '../../Game';
import { addEntityToLayer } from '@scenes/shared/EntityLifecycleHelpers';

interface ItemWorldDebugInputRuntimeDeps {
  game: Game;
  getPlayer: () => Player;
  getEntityLayer: () => Container;
  getContainers: () => ThrowableContainer[];
  showToast: (message: string, color: number) => void;
  onDebugIgniteAtPlayer: () => void;
  onDebugFreezeAtPlayer: () => void;
  onDebugThunderAtPlayer: () => void;
}

export class ItemWorldDebugInputRuntime {
  constructor(private readonly deps: ItemWorldDebugInputRuntimeDeps) {}

  update(): void {
    const input = this.deps.game.input;
    const player = this.deps.getPlayer();

    if (new URLSearchParams(window.location.search).has('debug') && input.shiftDown) {
      if (input.isJustPressed(GameAction.DEBUG_FIRE)) this.deps.onDebugIgniteAtPlayer();
      if (input.isJustPressed(GameAction.DEBUG_ICE)) this.deps.onDebugFreezeAtPlayer();
      if (input.isJustPressed(GameAction.DEBUG_THUNDER)) this.deps.onDebugThunderAtPlayer();
      if (input.isJustPressed(GameAction.DEBUG_CHEAT)) {
        if (player.debugCheatActive) {
          player.disableCheatBundle();
          this.deps.showToast(t('toast.cheat_off'), 0x44ff44);
        } else {
          player.enableCheatBundle();
          this.deps.showToast(t('toast.cheat_on'), 0xffaa00);
        }
      }
      if (input.isJustPressedKeyCode('KeyG')) this.spawnDebugContainers();
    }

    if (!input.shiftDown) {
      if (input.isJustPressed(GameAction.DEBUG_FIRE)) player.activeEnchant = 'fire';
      else if (input.isJustPressed(GameAction.DEBUG_ICE)) player.activeEnchant = 'ice';
      else if (input.isJustPressed(GameAction.DEBUG_THUNDER)) player.activeEnchant = 'thunder';
    }
  }

  private spawnDebugContainers(): void {
    const player = this.deps.getPlayer();
    const baseX = Math.floor(player.x / 16) * 16 + 32;
    const baseY = Math.floor(player.y / 16) * 16;
    const kinds: ContainerKind[] = ['OilDrum', 'WaterBarrel', 'MagmaCrucible', 'AcidVial'];
    for (let i = 0; i < kinds.length; i++) {
      const container = new ThrowableContainer(kinds[i], baseX + i * 20, baseY);
      addEntityToLayer(this.deps.getContainers(), container, this.deps.getEntityLayer());
    }
  }
}
