import type { Game } from '../../Game';
import { SFX } from '@audio/Sfx';
import type { ThrowableContainer } from '@entities/ThrowableContainer';
import type { PropShatterManager } from '@effects/PropShatter';

interface ContainerDestructionRuntimeDeps {
  game: Game;
  getPropShatter: () => PropShatterManager;
}

/**
 * Shared throwable-container destruction VFX/SFX. Identical between the world
 * and item-world scenes, so it lives in one place: shatter particles, break
 * SFX, a short hitstop, a small camera shake, then container teardown.
 */
export class ContainerDestructionRuntime {
  constructor(private readonly deps: ContainerDestructionRuntimeDeps) {}

  destroyWithVfx(container: ThrowableContainer): void {
    this.deps.getPropShatter().spawn(
      container.x,
      container.y,
      container.spec.width,
      container.spec.height,
      container.getShatterColor(),
      container.getShatterAccent(),
      container.getShatterTexture(),
    );
    SFX.play('breakable_destroy', 0, { speed: 1 / (1 + Math.random() * 0.5) });
    this.deps.game.hitstopFrames += 3;
    this.deps.game.camera.shake(2);
    container.destroy();
  }
}
