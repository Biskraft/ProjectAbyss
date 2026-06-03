import type { GiantBuilder } from '@entities/GiantBuilder';

interface BuilderInteriorVisibilityUpdateOptions {
  builder: GiantBuilder;
  hidden: boolean;
  setEntranceGlowAlpha: (alpha: number) => void;
}

export class WorldBuilderInteriorVisibilityRuntime {
  private alpha = 1;

  reset(builder?: GiantBuilder | null): void {
    this.alpha = 1;
    if (builder) builder.builderInteriorLayer.alpha = 1;
  }

  update(options: BuilderInteriorVisibilityUpdateOptions): void {
    const targetAlpha = options.hidden ? 0 : 1;
    if (this.alpha !== targetAlpha) {
      this.alpha += (targetAlpha - this.alpha) * 0.08;
      if (Math.abs(this.alpha - targetAlpha) < 0.01) {
        this.alpha = targetAlpha;
      }
    }

    options.builder.builderInteriorLayer.alpha = this.alpha;
    options.setEntranceGlowAlpha(this.alpha);
  }
}
