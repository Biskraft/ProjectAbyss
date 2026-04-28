import { CameraConst } from '@data/constData';

export class Camera {
  x = 0;
  y = 0;

  readonly viewportW: number;
  readonly viewportH: number;

  // Follow
  followLerp = CameraConst.FollowLerp;
  deadZoneX = CameraConst.DeadZoneX;
  deadZoneY = CameraConst.DeadZoneY;

  // Zoom (1.0 = default, 0.5 = 2x wider view, 0.01 = extreme zoom-out)
  zoom = 1.0;
  private targetZoom = 1.0;
  private zoomSpeed = CameraConst.ZoomSpeed;

  // Look Ahead (horizontal — facing direction)
  lookAheadDistance = CameraConst.LookAheadDistance;
  lookAheadLerp = CameraConst.LookAheadLerp;
  private currentLookAheadX = 0;
  private targetLookAheadX = 0;

  // Look Ahead (vertical — up/down input hold)
  lookAheadYDistance = CameraConst.LookAheadYDistance;
  lookAheadYLerp = CameraConst.LookAheadYLerp;
  private currentLookAheadY = 0;
  private targetLookAheadY = 0;
  /** Set to -1 (up), 0 (none), or 1 (down) by the scene each frame. */
  lookDirection = 0;

  // Bounds
  bounds: { left: number; top: number; right: number; bottom: number } | null = null;

  // Shake (Sakurai: directional shake sells impact direction)
  private shakeIntensity = 0;
  private shakeDecayRate = CameraConst.ShakeDecayRate;
  private shakeMinThreshold = CameraConst.ShakeMinThreshold;
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

  /** Instantly set zoom level (no lerp) */
  setZoom(value: number): void {
    const clamped = Math.max(0.01, Math.min(4.0, value));
    this.zoom = clamped;
    this.targetZoom = clamped;
  }

  /** Smoothly transition to target zoom */
  zoomTo(target: number, lerp?: number): void {
    this.targetZoom = Math.max(0.01, Math.min(4.0, target));
    if (lerp !== undefined) this.zoomSpeed = lerp;
  }

  /** Instantly set look-ahead to its final value (no lerp) */
  setLookAhead(direction: number): void {
    this.facingDirection = direction;
    this.targetLookAheadX = direction * this.lookAheadDistance;
    this.currentLookAheadX = this.targetLookAheadX;
  }

  /** Instantly snap camera to a position (no lerp, no look-ahead offset) */
  snap(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.zoom = this.targetZoom;
    this.currentLookAheadX = 0;
    this.targetLookAheadX = 0;
    this.currentLookAheadY = 0;
    this.targetLookAheadY = 0;
    this.facingDirection = 0;
    this.lookDirection = 0;
    this.shakeIntensity = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;

    // Apply bounds immediately after snap (zoom-aware)
    this.clampToBounds();
  }

  private clampToBounds(): void {
    if (!this.bounds) return;
    const halfW = (this.viewportW / 2) / this.zoom;
    const halfH = (this.viewportH / 2) / this.zoom;
    const minX = this.bounds.left + halfW;
    const maxX = this.bounds.right - halfW;
    const minY = this.bounds.top + halfH;
    const maxY = this.bounds.bottom - halfH;
    this.x = minX >= maxX ? (this.bounds.left + this.bounds.right) / 2 : Math.max(minX, Math.min(maxX, this.x));
    this.y = minY >= maxY ? (this.bounds.top + this.bounds.bottom) / 2 : Math.max(minY, Math.min(maxY, this.y));
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
      this.shakeBiasX = (dirX / len) * CameraConst.ShakeBiasScale;
      this.shakeBiasY = (dirY / len) * CameraConst.ShakeBiasScale;
    }
  }

  update(dt: number): void {
    if (!this.target) return;

    const dtFactor = dt / 16.6667;

    // Zoom lerp
    if (Math.abs(this.zoom - this.targetZoom) > 0.001) {
      this.zoom += (this.targetZoom - this.zoom) * this.zoomSpeed * dtFactor;
    } else {
      this.zoom = this.targetZoom;
    }

    // Dead zone check + Smooth Follow
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;

    if (Math.abs(dx) > this.deadZoneX) {
      this.x += (dx - Math.sign(dx) * this.deadZoneX) * this.followLerp * dtFactor;
    }
    if (Math.abs(dy) > this.deadZoneY) {
      this.y += (dy - Math.sign(dy) * this.deadZoneY) * this.followLerp * dtFactor;
    }

    // Look Ahead (horizontal)
    this.targetLookAheadX = this.facingDirection * this.lookAheadDistance;
    this.currentLookAheadX += (this.targetLookAheadX - this.currentLookAheadX) * this.lookAheadLerp * dtFactor;

    // Look Ahead (vertical — up/down hold)
    this.targetLookAheadY = this.lookDirection * this.lookAheadYDistance;
    this.currentLookAheadY += (this.targetLookAheadY - this.currentLookAheadY) * this.lookAheadYLerp * dtFactor;

    // Bounds clamping (zoom-aware)
    // IMPORTANT: clamp this.x FIRST, then adjust look-ahead based on the
    // clamped position. Otherwise the dead-zone overshoot leaks into
    // currentLookAheadX and causes the camera to drift away from walls.
    if (this.bounds) {
      const halfW = (this.viewportW / 2) / this.zoom;
      const halfH = (this.viewportH / 2) / this.zoom;
      const minX = this.bounds.left + halfW;
      const maxX = this.bounds.right - halfW;
      const minY = this.bounds.top + halfH;
      const maxY = this.bounds.bottom - halfH;

      if (minX >= maxX) {
        this.x = (this.bounds.left + this.bounds.right) / 2;
        this.currentLookAheadX = 0;
      } else {
        this.x = Math.max(minX, Math.min(maxX, this.x));
        const effectiveX = this.x + this.currentLookAheadX;
        if (effectiveX < minX) {
          this.currentLookAheadX = minX - this.x;
        } else if (effectiveX > maxX) {
          this.currentLookAheadX = maxX - this.x;
        }
      }
      if (minY >= maxY) {
        this.y = (this.bounds.top + this.bounds.bottom) / 2;
        this.currentLookAheadY = 0;
      } else {
        this.y = Math.max(minY, Math.min(maxY, this.y));
        const effectiveY = this.y + this.currentLookAheadY;
        if (effectiveY < minY) {
          this.currentLookAheadY = minY - this.y;
        } else if (effectiveY > maxY) {
          this.currentLookAheadY = maxY - this.y;
        }
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
      this.shakeBiasX *= CameraConst.ShakeBiasDecay;
      this.shakeBiasY *= CameraConst.ShakeBiasDecay;
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
    return this.y + this.currentLookAheadY + this.shakeOffsetY;
  }
}
