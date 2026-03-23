import type { Game } from '../Game';
import type { Scene } from './Scene';

export class SceneManager {
  private game: Game;
  private stack: Scene[] = [];

  constructor(game: Game) {
    this.game = game;
  }

  get active(): Scene | null {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
  }

  async push(scene: Scene, overlay = false): Promise<void> {
    const current = this.active;
    if (current && !overlay) {
      current.exit();
      current.container.visible = false;
    }

    this.stack.push(scene);
    this.game.gameContainer.addChild(scene.container);
    await scene.init();
    scene.enter();
  }

  pop(): void {
    const current = this.active;
    if (!current) return;

    current.exit();
    this.game.gameContainer.removeChild(current.container);
    current.destroy();
    this.stack.pop();

    const prev = this.active;
    if (prev) {
      prev.container.visible = true;
      prev.enter();
    }
  }

  async replace(scene: Scene): Promise<void> {
    const current = this.active;
    if (current) {
      current.exit();
      this.game.gameContainer.removeChild(current.container);
      current.destroy();
      this.stack.pop();
    }

    this.stack.push(scene);
    this.game.gameContainer.addChild(scene.container);
    await scene.init();
    scene.enter();
  }

  update(dt: number): void {
    this.active?.update(dt);
  }

  render(alpha: number): void {
    this.active?.render(alpha);
  }
}
