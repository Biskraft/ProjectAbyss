import { Container, Graphics } from 'pixi.js';
import type { GiantBuilder } from '@entities/GiantBuilder';

const EXTEND_MS = 100;
const RETRACT_MS = 100;
// Time between stroke starts (extend starts at 0, 300, 600 ms).
// WallDeployment is 1000ms, so the third impact must land before state exit.
const STROKE_INTERVAL_MS = 300;
const STRIKE_COUNT = 3;

/**
 * 3-stroke pile-driver arm that extends from the builder body toward a wall target.
 * Placeholder graphics until piledriver_01.png atlas lands.
 */
export class PileDriver {
  readonly container: Container;

  private currentStroke = 0;
  private strokeElapsed = 0;
  private readonly impactFired = [false, false, false];
  private readonly arm: Graphics;

  private readonly dirX: number;
  private readonly dirY: number;
  private readonly maxLength: number;

  get isDone(): boolean { return this.currentStroke >= STRIKE_COUNT; }

  constructor(
    builder: GiantBuilder,
    targetX: number,
    targetY: number,
    private readonly onImpact: (strikeIdx: number) => void,
  ) {
    // Attach on the right edge of the builder body, roughly mid-height.
    const originX = builder.container.x + builder.widthPx;
    const originY = builder.container.y + builder.heightPx * 0.45;

    const dx = targetX - originX;
    const dy = targetY - originY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    this.dirX = dx / dist;
    this.dirY = dy / dist;
    this.maxLength = dist * 0.85;

    this.container = new Container();
    this.container.x = originX;
    this.container.y = originY;

    this.arm = new Graphics();
    this.container.addChild(this.arm);
  }

  update(dt: number): void {
    if (this.isDone) return;

    this.strokeElapsed += dt;
    const phase = this.strokeElapsed;

    if (phase < EXTEND_MS) {
      this.drawArm((phase / EXTEND_MS) * this.maxLength);
    } else if (phase < EXTEND_MS + RETRACT_MS) {
      if (!this.impactFired[this.currentStroke]) {
        this.impactFired[this.currentStroke] = true;
        this.onImpact(this.currentStroke);
      }
      const t = 1 - (phase - EXTEND_MS) / RETRACT_MS;
      this.drawArm(Math.max(0, t) * this.maxLength);
    } else if (phase < STROKE_INTERVAL_MS) {
      this.drawArm(0);
    } else {
      this.strokeElapsed -= STROKE_INTERVAL_MS;
      this.currentStroke++;
      this.drawArm(0);
    }
  }

  private drawArm(length: number): void {
    this.arm.clear();
    if (length <= 0) return;
    this.arm
      .moveTo(0, 0)
      .lineTo(this.dirX * length, this.dirY * length)
      .stroke({ color: 0xffaa00, width: 4 });
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
