interface BuilderStepFeedbackOptions {
  cinematic: boolean;
  moving: boolean;
  stampDelta: number;
  shake: (strength: number) => void;
}

export class WorldBuilderStepFeedbackRuntime {
  private enabled = false;
  private wasMoving = false;
  private stepCounter = 0;

  reset(enabled = false): void {
    this.enabled = enabled;
    this.wasMoving = false;
    this.stepCounter = 0;
  }

  update(options: BuilderStepFeedbackOptions): void {
    if (!options.cinematic && !this.enabled) return;

    if (options.moving && options.stampDelta !== 0) {
      this.stepCounter++;
      if (this.stepCounter % 2 === 0) {
        options.shake(6);
      }
    }

    if (this.wasMoving && !options.moving) {
      options.shake(18);
      this.stepCounter = 0;
    }

    this.wasMoving = options.moving;
  }
}
