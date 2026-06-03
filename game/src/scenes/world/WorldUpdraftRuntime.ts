import type { Camera } from '@core/Camera';
import type { GiantBuilder } from '@entities/GiantBuilder';
import type { Player } from '@entities/Player';
import { UpdraftSystem, type UpdraftChannel } from '@systems/UpdraftSystem';
import type { Container } from 'pixi.js';

interface WorldUpdraftUpdateOptions {
  dt: number;
  player: Player;
  baseGrid: number[][];
  camera: Camera;
  activeBuilder: GiantBuilder | null;
}

export class WorldUpdraftRuntime {
  private system: UpdraftSystem | null = null;

  initialize(entityLayer: Container): void {
    this.destroy();
    this.system = new UpdraftSystem(entityLayer);
  }

  update(options: WorldUpdraftUpdateOptions): void {
    this.system?.update(
      options.dt,
      options.player,
      options.baseGrid,
      options.camera,
      this.getBuilderChannels(options.activeBuilder),
    );
  }

  clear(): void {
    this.system?.clear();
  }

  destroy(): void {
    this.system?.destroy();
    this.system = null;
  }

  private getBuilderChannels(activeBuilder: GiantBuilder | null): UpdraftChannel[] {
    if (!activeBuilder) return [];
    return [{
      grid: activeBuilder.collisionGrid,
      x: activeBuilder.container.x,
      y: activeBuilder.container.y,
    }];
  }
}
