import type { Camera } from '@core/Camera';
import { VoidFogSystem } from '@systems/VoidFogSystem';
import type { Container } from 'pixi.js';

export class WorldVoidFogRuntime {
  private system: VoidFogSystem | null = null;

  initialize(entityLayer: Container): void {
    this.destroy();
    this.system = new VoidFogSystem(entityLayer);
  }

  update(dt: number, grid: number[][], camera: Camera): void {
    this.system?.update(dt, grid, camera);
  }

  clear(): void {
    this.system?.destroy();
  }

  destroy(): void {
    this.system?.destroy();
    this.system = null;
  }
}
