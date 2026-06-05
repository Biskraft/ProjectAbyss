import type { Container } from 'pixi.js';
import { ProceduralDecorator } from '@level/ProceduralDecorator';
import {
  detachProceduralDecorLayers,
  getProceduralDecorLayers,
} from '@scenes/shared/ProceduralDecorLayerHelpers';

export class WorldProceduralDecorRuntime {
  private primaryDecorator: ProceduralDecorator | null = null;
  private extraDecorators: ProceduralDecorator[] = [];

  get primary(): ProceduralDecorator | null {
    return this.primaryDecorator;
  }

  get hasPrimary(): boolean {
    return !!this.primaryDecorator;
  }

  get naturalLayer(): Container | null {
    return this.primaryDecorator?.naturalLayer ?? null;
  }

  get artificialLayer(): Container | null {
    return this.primaryDecorator?.artificialLayer ?? null;
  }

  get structureLayer(): Container | null {
    return this.primaryDecorator?.structureLayer ?? null;
  }

  get layers(): Container[] {
    return getProceduralDecorLayers(this.primaryDecorator);
  }

  preparePrimary(): ProceduralDecorator {
    detachProceduralDecorLayers(this.primaryDecorator);
    this.clearExtras();
    this.primaryDecorator ??= new ProceduralDecorator();
    return this.primaryDecorator;
  }

  clearAll(): void {
    detachProceduralDecorLayers(this.primaryDecorator);
    this.primaryDecorator?.clear();
    this.clearExtras();
  }

  registerExtra(decorator: ProceduralDecorator): void {
    this.extraDecorators.push(decorator);
  }

  update(dt: number): void {
    this.primaryDecorator?.update(dt);
    for (const decorator of this.extraDecorators) {
      decorator.update(dt);
    }
  }

  private clearExtras(): void {
    for (const decorator of this.extraDecorators) {
      detachProceduralDecorLayers(decorator);
      decorator.clear();
    }
    this.extraDecorators = [];
  }
}
