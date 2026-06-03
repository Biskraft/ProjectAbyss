import { EndingSequence, type EndingTrigger } from '@systems/EndingSequence';
import { SaveManager } from '@utils/SaveManager';
import type { Player } from '@entities/Player';
import type { Game } from '../../Game';
import type { LdtkLevel } from '@level/LdtkLoader';

interface WorldEndingRuntimeDeps {
  game: Game;
  getPlayer: () => Player;
}

export class WorldEndingRuntime {
  private readonly triggers: EndingTrigger[] = [];
  private readonly sequence: EndingSequence;
  private transitionStarted = false;

  constructor(private readonly deps: WorldEndingRuntimeDeps) {
    this.sequence = new EndingSequence({
      uiContainer: deps.game.legacyUIContainer,
      camera: deps.game.camera,
      input: deps.game.input,
    });
  }

  private clearTriggers(): void {
    this.triggers.length = 0;
  }

  private addTrigger(trigger: EndingTrigger): void {
    this.triggers.push(trigger);
  }

  loadLevel(level: LdtkLevel): void {
    this.clearTriggers();
    for (const entity of level.entities) {
      if (entity.type !== 'EndingTrigger') continue;
      this.addTrigger({
        x: entity.px[0],
        y: entity.px[1] - entity.height,
        w: entity.width,
        h: entity.height,
      });
    }
  }

  update(dt: number): boolean {
    if (!this.sequence.isActive) return false;

    this.sequence.update(dt);
    if (this.sequence.isDone && !this.transitionStarted) {
      this.beginEndingTransition();
      return true;
    }
    return this.transitionStarted;
  }

  checkTrigger(): void {
    if (this.sequence.isActive) return;

    const player = this.deps.getPlayer();
    const pcx = player.x + player.width / 2;
    const pcy = player.y + player.height / 2;
    this.sequence.checkTrigger(pcx, pcy, this.triggers);
    if (this.sequence.isActive) {
      player.vx = 0;
      player.vy = 0;
      player.savePrevPosition();
    }
  }

  destroy(): void {
    this.sequence.dispose();
  }

  private beginEndingTransition(): void {
    this.transitionStarted = true;
    const game = this.deps.game;
    game.camera.setZoom(1.0);
    game.camera.clearBounds();
    SaveManager.deleteSave();
    game.input.inputLocked = false;
    const endingRef = this.sequence;
    import('../EndingScene').then(async ({ EndingScene }) => {
      await game.sceneManager.replace(new EndingScene(game));
      endingRef.dispose();
    });
  }
}
