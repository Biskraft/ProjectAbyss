import type { Anvil } from '@entities/Anvil';
import type { Player } from '@entities/Player';
import type { AnvilItemWorldReturnState } from './AnvilReturnState';
import type { WorldItemWorldEntryState } from './WorldItemWorldEntryState';

interface WorldAnvilReturnFlowRuntimeDeps {
  entryState: WorldItemWorldEntryState;
  returnState: AnvilItemWorldReturnState;
  getAnvil: () => Anvil | null;
  getPlayer: () => Player;
  snapCamera: (x: number, y: number) => void;
  resetEdgeTransition: () => void;
  loadLevel: (levelId: string, enterFrom: 'down') => void;
}

export class WorldAnvilReturnFlowRuntime {
  constructor(private readonly deps: WorldAnvilReturnFlowRuntimeDeps) {}

  restoreWorldAtReturnPoint(resetAnvil: boolean): void {
    this.deps.entryState.setInTunnel(false);
    this.deps.resetEdgeTransition();

    const preservedAnvilItem = this.deps.returnState.getPreservedItem(
      this.deps.getAnvil(),
      this.deps.entryState.getEntryItem(),
    );

    const returnLevelId = this.deps.returnState.returnLevelId ?? this.deps.entryState.getPreTunnelLevelId();
    if (returnLevelId) {
      this.deps.loadLevel(returnLevelId, 'down');
      this.deps.entryState.setWorldVisualsReleased(false);
    }
    this.deps.entryState.clearPreTunnelLevelId();
    this.deps.entryState.clearItem();

    const anvil = this.deps.getAnvil();
    if (resetAnvil && anvil) {
      anvil.used = false;
      if (preservedAnvilItem) {
        const wasDisabled = anvil.disabled;
        anvil.disabled = false;
        anvil.placeItem(preservedAnvilItem);
        anvil.used = false;
        anvil.disabled = wasDisabled;
      }
    }

    this.deps.returnState.placePlayer(this.deps.getPlayer(), this.deps.getAnvil(), this.deps.snapCamera);
  }
}
