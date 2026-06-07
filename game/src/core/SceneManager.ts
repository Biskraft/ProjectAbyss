import type { Game } from '../Game';
import type { Scene } from './Scene';
import { detachDisplayObject } from '@scenes/shared/DisplayObjectLifecycleHelpers';

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
    this.debugLogSceneChange('push:start', scene);
    const current = this.active;
    if (current && !overlay) {
      current.exit();
      current.container.visible = false;
    }

    this.stack.push(scene);
    this.game.gameContainer.addChild(scene.container);
    await scene.init();
    scene.enter();
    this.debugLogSceneChange('push:entered', scene);
  }

  pop(): void {
    const current = this.active;
    if (!current) return;
    this.debugLogSceneChange('pop:start', current);

    current.exit();
    detachDisplayObject(current.container);
    current.destroy();
    this.stack.pop();

    const prev = this.active;
    if (prev) {
      prev.container.visible = true;
      prev.enter();
      this.debugLogSceneChange('pop:resumed', prev);
    }
  }

  async replace(scene: Scene): Promise<void> {
    this.debugLogSceneChange('replace:start', scene);
    const current = this.active;

    if (current) {
      current.exit();
      detachDisplayObject(current.container);
      current.destroy();
      this.stack.pop();
    }

    this.stack.push(scene);
    this.game.gameContainer.addChild(scene.container);
    await scene.init();
    scene.enter();
    this.debugLogSceneChange('replace:entered', scene);
  }

  update(dt: number): void {
    this.active?.update(dt);
  }

  render(alpha: number): void {
    this.active?.render(alpha);
  }

  private debugLogSceneChange(phase: string, scene: Scene): void {
    if (!new URLSearchParams(window.location.search).has('debug')) return;
    console.log(`[SceneManager ${phase}] next=${scene.constructor.name} active=${this.active?.constructor.name ?? 'none'} stack=${this.stack.map(s => s.constructor.name).join('>') || '(empty)'}`);
  }

}
