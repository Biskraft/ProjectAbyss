import { TransitionTokens } from '@effects/TransitionDirector';
import type { Scene } from '@core/Scene';
import type { Game } from '../../Game';

interface ItemWorldPrologueDeathRestartRuntimeDeps {
  game: Game;
  isRestarting: () => boolean;
  markRestarting: () => void;
  firePlayerDeathDialogue: () => void;
  resetRunProgress: () => void;
  respawnSourcePlayer: () => void;
  createRestartedScene: () => Scene;
}

export class ItemWorldPrologueDeathRestartRuntime {
  constructor(private readonly deps: ItemWorldPrologueDeathRestartRuntimeDeps) {}

  restart(): void {
    if (this.deps.isRestarting()) return;
    this.deps.markRestarting();

    this.deps.firePlayerDeathDialogue();
    this.deps.resetRunProgress();
    this.deps.respawnSourcePlayer();

    const restarted = this.deps.createRestartedScene();
    const started = this.deps.game.transitionDirector.startCoverSwapReveal({
      cover: 'black',
      durationOutMs: TransitionTokens.DEATH_RESPAWN,
      durationInMs: TransitionTokens.DEATH_RESPAWN,
      onSwap: () => this.deps.game.sceneManager.replace(restarted),
    });
    if (!started) void this.deps.game.sceneManager.replace(restarted);
  }
}
