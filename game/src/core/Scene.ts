import { Container } from 'pixi.js';
import type { Game } from '../Game';
import { destroyDisplayObject } from '../scenes/shared/DisplayObjectLifecycleHelpers';

export abstract class Scene {
  protected game: Game;
  container: Container;

  constructor(game: Game) {
    this.game = game;
    this.container = new Container();
  }

  abstract init(): void | Promise<void>;
  abstract enter(): void;
  abstract update(dt: number): void;
  abstract render(alpha: number): void;
  abstract exit(): void;

  destroy(): void {
    destroyDisplayObject(this.container, { children: true });
  }
}
