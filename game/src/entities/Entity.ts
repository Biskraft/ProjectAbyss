import { Container } from 'pixi.js';

/**
 * Sakurai Hit Stop Techniques applied at Entity level:
 * 1. Victim vibrates large, attacker vibrates small
 * 3. Grounded = horizontal only, airborne = omnidirectional
 * 4. Amplitude converges over time
 * 7. Attacker micro-advances during hitstop
 */
export abstract class Entity {
  x = 0;
  y = 0;
  prevX = 0;
  prevY = 0;
  vx = 0;
  vy = 0;
  width = 0;
  height = 0;
  container: Container;

  // Combat
  invincible = false;
  invincibleTimer = 0;

  // Sakurai: Hit vibration (rendered even during hitstop)
  vibrateFrames = 0;        // remaining vibrate frames
  vibrateAmplitude = 0;     // current amplitude (px)
  vibrateGrounded = true;   // grounded = horizontal only
  private vibratePhase = 0; // oscillation phase

  // Sakurai: Attacker micro-advance during hitstop
  hitAdvanceX = 0;          // px to advance (set by HitManager)
  private advancedX = 0;    // accumulated advance (reset after hitstop)

  // Sakurai: White flash on hit
  flashTimer = 0;           // ms remaining
  private readonly FLASH_DURATION = 80; // ms

  /** Sub-pixel render offset (used e.g. when riding a moving platform that
   *  updates its visual position sub-pixel while physics stays tile-aligned). */
  visualYOffset = 0;

  constructor() {
    this.container = new Container();
  }

  abstract update(dt: number): void;

  /** Tick down invincibility timer */
  updateInvincibility(dt: number): void {
    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= dt;
      if (this.invincibleTimer <= 0) {
        this.invincibleTimer = 0;
        this.invincible = false;
      }
    }
  }

  /** Start hit vibration (Sakurai techniques 1, 3, 4) */
  startVibrate(amplitude: number, frames: number, grounded: boolean): void {
    this.vibrateAmplitude = amplitude;
    this.vibrateFrames = frames;
    this.vibrateGrounded = grounded;
    this.vibratePhase = 0;
  }

  /** Start micro-advance toward target (Sakurai technique 7) */
  startHitAdvance(dirX: number, distance: number): void {
    this.hitAdvanceX = dirX * distance;
    this.advancedX = 0;
  }

  /** Trigger white flash (Sakurai: hit pose emphasis) */
  triggerFlash(): void {
    this.flashTimer = this.FLASH_DURATION;
  }

  render(alpha: number): void {
    let rx = Math.round(this.prevX + (this.x - this.prevX) * alpha);
    let ry = Math.round(this.prevY + (this.y - this.prevY) * alpha);

    // Sakurai technique 4: converging vibration
    if (this.vibrateFrames > 0) {
      this.vibratePhase++;
      // Amplitude decays each frame (converges to 0)
      const decay = this.vibrateFrames / (this.vibrateFrames + this.vibratePhase);
      const amp = this.vibrateAmplitude * decay;
      const sign = (this.vibratePhase % 2 === 0) ? 1 : -1;

      // Technique 3: ground = horizontal, air = omnidirectional
      rx += Math.round(sign * amp);
      if (!this.vibrateGrounded) {
        ry += Math.round(sign * amp * 0.6 * (this.vibratePhase % 3 === 0 ? -1 : 1));
      }

      this.vibrateFrames--;
    }

    // Technique 7: attacker micro-advance
    if (this.hitAdvanceX !== 0 && this.vibrateFrames > 0) {
      const step = this.hitAdvanceX * 0.15;
      this.advancedX += step;
      rx += Math.round(this.advancedX);
    } else if (this.hitAdvanceX !== 0) {
      this.hitAdvanceX = 0;
      this.advancedX = 0;
    }

    // Flash timer ticks in render (works during hitstop)
    if (this.flashTimer > 0) {
      this.flashTimer -= 16.667; // ~1 frame
    }

    this.container.x = rx;
    this.container.y = ry + Math.round(this.visualYOffset);
  }

  savePrevPosition(): void {
    this.prevX = this.x;
    this.prevY = this.y;
  }

  destroy(): void {
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container.destroy({ children: true });
  }
}
