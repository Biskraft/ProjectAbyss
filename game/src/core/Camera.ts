export class Camera {
  x = 0;
  y = 0;

  readonly viewportW: number;
  readonly viewportH: number;

  // Follow
  followLerp = 0.08;
  deadZoneX = 32;
  deadZoneY = 24;

  // Look Ahead
  lookAheadDistance = 64;
  lookAheadLerp = 0.05;
  private currentLookAheadX = 0;
  private targetLookAheadX = 0;

  // Bounds
  bounds: { left: number; top: number; right: number; bottom: number } | null = null;

  // Shake (Sakurai: directional shake sells impact direction)
  private shakeIntensity = 0;
  private shakeDecayRate = 0.88;
  private shakeMinThreshold = 0.5;
  private shakeOffsetX = 0;
  private shakeOffsetY = 0;
  private shakeBiasX = 0; // directional bias [-1, 1]
  private shakeBiasY = 0;

  // Target
  target: { x: number; y: number } | null = null;

  // Direction for Look Ahead
  facingDirection = 0; // -1 left, 0 none, 1 right

  constructor(viewportW: number, viewportH: number) {
    this.viewportW = viewportW;
    this.viewportH = viewportH;
  }

  setBounds(left: number, top: number, right: number, bottom: number): void {
    this.bounds = { left, top, right, bottom };
  }

  clearBounds(): void {
    this.bounds = null;
  }

  shake(intensity: number): void {
    if (intensity > this.shakeIntensity) {
      this.shakeIntensity = intensity;
      this.shakeBiasX = 0;
      this.shakeBiasY = 0;
    }
  }

  /**
   * Sakurai: Directional camera shake — biases toward knockback direction.
   * Feels like the hit pushes the camera.
   */
  shakeDirectional(intensity: number, dirX: number, dirY: number): void {
    if (intensity > this.shakeIntensity) {
      this.shakeIntensity = intensity;
      const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
      this.shakeBiasX = (dirX / len) * 0.6;
      this.shakeBiasY = (dirY / len) * 0.6;
    }
  }

  update(dt: number): void {
    if (!this.target) return;

    const dtFactor = dt / 16.6667;

    // Dead zone check + Smooth Follow
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;

    if (Math.abs(dx) > this.deadZoneX) {
      this.x += (dx - Math.sign(dx) * this.deadZoneX) * this.followLerp * dtFactor;
    }
    if (Math.abs(dy) > this.deadZoneY) {
      this.y += (dy - Math.sign(dy) * this.deadZoneY) * this.followLerp * dtFactor;
    }

    // Look Ahead
    this.targetLookAheadX = this.facingDirection * this.lookAheadDistance;
    this.currentLookAheadX += (this.targetLookAheadX - this.currentLookAheadX) * this.lookAheadLerp * dtFactor;

    // Bounds clamping
    if (this.bounds) {
      const halfW = this.viewportW / 2;
      const halfH = this.viewportH / 2;
      const minX = this.bounds.left + halfW;
      const maxX = this.bounds.right - halfW;
      const minY = this.bounds.top + halfH;
      const maxY = this.bounds.bottom - halfH;

      if (minX >= maxX) {
        this.x = (this.bounds.left + this.bounds.right) / 2;
      } else {
        this.x = Math.max(minX, Math.min(maxX, this.x));
      }
      if (minY >= maxY) {
        this.y = (this.bounds.top + this.bounds.bottom) / 2;
      } else {
        this.y = Math.max(minY, Math.min(maxY, this.y));
      }
    }

    // Shake (Sakurai: directional bias + random variation)
    if (this.shakeIntensity > this.shakeMinThreshold) {
      const randX = (Math.random() * 2 - 1);
      const randY = (Math.random() * 2 - 1);
      // Combine random with directional bias
      this.shakeOffsetX = (randX + this.shakeBiasX * 2) * this.shakeIntensity;
      this.shakeOffsetY = (randY + this.shakeBiasY * 2) * this.shakeIntensity;
      this.shakeIntensity *= this.shakeDecayRate;
      // Decay bias
      this.shakeBiasX *= 0.85;
      this.shakeBiasY *= 0.85;
    } else {
      this.shakeIntensity = 0;
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
      this.shakeBiasX = 0;
      this.shakeBiasY = 0;
    }
  }

  get renderX(): number {
    return this.x + this.currentLookAheadX + this.shakeOffsetX;
  }

  get renderY(): number {
    return this.y + this.shakeOffsetY;
  }
}
