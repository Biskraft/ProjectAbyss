import { Container } from 'pixi.js';
import type { Game } from '../Game';

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
    this.container.destroy({ children: true });
  }
}
