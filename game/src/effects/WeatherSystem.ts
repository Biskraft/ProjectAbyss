/**
 * WeatherSystem — IntGrid-aware rain & snow particles for ECHORIS.
 *
 * Tone target (Content_Direction.md / 위령):
 *   - Rain: cold blue-gray streaks, slow horizontal drift, soft splash ticks
 *           where droplets meet a solid surface. Not a "weather" gimmick — a
 *           memorial veil that hushes color and adds a ground pulse.
 *   - Snow: bone/sepia motes, sine-wobble drift, no impact splash. Falls quiet.
 *
 * Behaviour:
 *   - Particles spawn just above the camera viewport in world-space.
 *   - Each spawn samples the column overhead in `collisionGrid`. If a solid
 *     cell is found within `coverageCheckTiles` rows above the spawn point,
 *     the column is considered roofed (indoor) and the particle is skipped.
 *   - Particles fall under gravity (rain) or sine drift (snow). On collision
 *     with a solid cell, rain leaves a small splash; snow simply despawns.
 *
 * Use-case:
 *   - Wide open caverns where some sub-rooms have ceilings. Rain falls in
 *     the open chamber but not under built structures.
 *
 * Integration (typical):
 *   ```ts
 *   this.weather = new WeatherSystem({
 *     mode: 'rain',
 *     intensity: 0.7,
 *     wind: -0.18,
 *     collision: {
 *       grid: level.collisionGrid,
 *       tileSize: TILE_SIZE,
 *       originX: level.worldX,
 *       originY: level.worldY,
 *     },
 *   });
 *   this.weatherLayer.addChild(this.weather.container);
 *   // ...
 *   this.weather.update(dtMs, this.camera.getView());
 *   ```
 *
 * The container is camera-aware: pass the view (in world-space pixels) each
 * tick. Add the container to a world-space layer (above terrain, below HUD).
 */

import { Container, Graphics, Sprite, Texture } from 'pixi.js';

export type WeatherMode = 'rain' | 'snow';

export interface WeatherCollision {
  /** Row-major: grid[row][col]. */
  grid: number[][];
  /** Pixel size of one cell (typically TILE_SIZE). */
  tileSize: number;
  /** World-space pixel offset of grid[0][0]. Defaults to 0. */
  originX?: number;
  originY?: number;
  /**
   * Optional override for which IntGrid values count as solid.
   * Default: any non-zero value except 10 (void).
   */
  isSolid?: (v: number) => boolean;
  /** Optional per-cell exclusion. Receives grid col, row, and value. */
  ignoreCell?: (col: number, row: number, value: number) => boolean;
}

export interface WeatherDynamicCollider extends WeatherCollision {
  id?: string;
}

export interface WeatherView {
  /** World-space x of the camera's top-left. */
  x: number;
  /** World-space y of the camera's top-left. */
  y: number;
  /** Camera viewport width in world pixels. */
  width: number;
  /** Camera viewport height in world pixels. */
  height: number;
}

export interface WeatherOptions {
  mode?: WeatherMode;
  /** 0..1 — fallback density used by whichever mode lacks a per-mode value. */
  intensity?: number;
  /** Per-mode density override (0..1). Falls back to `intensity` when unset. */
  rainIntensity?: number;
  snowIntensity?: number;
  /** -1..1 — horizontal drift bias. Negative = wind to the left. */
  wind?: number;
  /** Hard cap. Default 220 (rain) / 140 (snow). */
  maxParticles?: number;
  /**
   * Rain streak length in pixels (far layer). Near layer adds +2 automatically.
   * Default 6. Higher = longer/faster-looking rain.
   */
  streakLength?: number;
  /**
   * Rain streak stroke width in pixels (far layer). Near layer adds +0.5
   * automatically for mild parallax. Default 0.8. Use 0.5–1.0 for the
   * Requiem mood (thin sleet); 1.5+ reads as a heavy downpour.
   */
  streakWidth?: number;
  /**
   * Coverage check distance: number of tiles to scan upward from each
   * spawn point. If a solid tile is found within this range, the column is
   * "roofed" and no particle spawns. Default 4. Set 0 to disable indoor
   * filtering entirely (rain falls everywhere).
   */
  coverageCheckTiles?: number;
  /** Optional collision binding (can also be set later via setCollision). */
  collision?: WeatherCollision;
  /**
   * Optional custom coverage callback. When provided, replaces the IntGrid
   * coverage scan entirely. Return true if (worldX, worldY) is "indoor" and
   * the spawn should be skipped. Useful for scripted cutscenes or tutorial
   * demos that don't have a real collision grid.
   */
  coverageMask?: (worldX: number, worldY: number) => boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  /** 0 = far/dim parallax layer, 1 = near/bright. */
  layer: 0 | 1;
  /** Sine-drift phase (snow only). */
  phase: number;
}

interface Splash {
  sprite: Sprite;
  life: number;
  max: number;
  baseAlpha: number;
  startX: number;
  startY: number;
  rise: number;
  anchor?: SplashAnchor;
}

interface SolidHit {
  x: number;
  surfaceY: number;
  t: number;
  anchor?: SplashAnchor;
}

interface SplashAnchor {
  collider: WeatherDynamicCollider;
  localX: number;
  localSurfaceY: number;
}

const DEFAULT_IS_SOLID = (v: number): boolean => v !== 0 && v !== 10;

const COLOR_RAIN_FAR = 0x8a98a8;
const COLOR_RAIN_NEAR = 0xc4cdd8;
const COLOR_RAIN_SPLASH = 0xb8c4d4;
const COLOR_SNOW_FAR = 0xc8bea4;
const COLOR_SNOW_NEAR = 0xe8dcc4;
const MAX_SPLASH_SPRITES = 48;
const SPLASH_LIFE_MIN = 120;
const SPLASH_LIFE_MAX = 220;

const RAIN_SPLASH_PIXELS: ReadonlyArray<ReadonlyArray<readonly [number, number, number, number?]>> = [
  [[1, 4, 2], [4, 3, 3, 0.9], [8, 4, 1, 0.75]],
  [[0, 4, 1, 0.8], [3, 3, 4], [8, 4, 2, 0.7]],
  [[2, 4, 2, 0.8], [5, 2, 2], [7, 4, 1, 0.75]],
  [[1, 3, 1, 0.75], [4, 4, 4], [9, 3, 1, 0.7]],
];

let cachedRainSplashTextures: Texture[] | null = null;

export class WeatherSystem {
  readonly container: Container = new Container();
  private readonly gfx = new Graphics();

  private mode: WeatherMode;
  private rainIntensity: number;
  private snowIntensity: number;
  private wind: number;
  private maxParticles: number;
  private coverageCheckTiles: number;
  private streakLength: number;
  private streakWidth: number;
  private coverageMask: ((x: number, y: number) => boolean) | null = null;

  private collision: WeatherCollision | null = null;
  private dynamicColliders: WeatherDynamicCollider[] = [];

  private readonly particles: Particle[] = [];
  private readonly splashes: Splash[] = [];
  private readonly splashPool: Sprite[] = [];
  private spawnAccum = 0;

  constructor(opts: WeatherOptions = {}) {
    this.mode = opts.mode ?? 'rain';
    const fallback = clamp01(opts.intensity ?? 0.6);
    this.rainIntensity = clamp01(opts.rainIntensity ?? fallback);
    this.snowIntensity = clamp01(opts.snowIntensity ?? fallback);
    this.wind = clamp(opts.wind ?? (this.mode === 'rain' ? -0.18 : 0), -1, 1);
    this.maxParticles = opts.maxParticles ?? (this.mode === 'rain' ? 220 : 140);
    this.coverageCheckTiles = Math.max(0, opts.coverageCheckTiles ?? 4);
    this.streakLength = Math.max(1, opts.streakLength ?? 6);
    this.streakWidth = Math.max(0.25, opts.streakWidth ?? 0.8);
    this.coverageMask = opts.coverageMask ?? null;
    this.container.addChild(this.gfx);
    if (opts.collision) this.setCollision(opts.collision);
  }

  /** Bind (or rebind) a collision grid. Call on level change. */
  setCollision(c: WeatherCollision): void {
    this.collision = c;
  }

  /** Drop the active collision binding. All particles will fall freely. */
  clearCollision(): void {
    this.collision = null;
  }

  setDynamicColliders(colliders: WeatherDynamicCollider[]): void {
    this.dynamicColliders = colliders;
  }

  clearDynamicColliders(): void {
    this.dynamicColliders = [];
  }

  setMode(mode: WeatherMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.particles.length = 0;
    this.clearSplashes();
  }

  /**
   * Set density for the *current* mode. To set the inactive mode's density,
   * use `setRainIntensity` / `setSnowIntensity` directly.
   */
  setIntensity(intensity: number): void {
    const v = clamp01(intensity);
    if (this.mode === 'rain') this.rainIntensity = v;
    else this.snowIntensity = v;
  }

  setRainIntensity(intensity: number): void {
    this.rainIntensity = clamp01(intensity);
  }

  setSnowIntensity(intensity: number): void {
    this.snowIntensity = clamp01(intensity);
  }

  setWind(wind: number): void {
    this.wind = clamp(wind, -1, 1);
  }

  /** Rain streak length in pixels. Near layer auto-adds +2. */
  setStreakLength(px: number): void {
    this.streakLength = Math.max(1, px);
  }

  /** Rain streak stroke width in pixels. Near layer auto-adds +0.5. */
  setStreakWidth(px: number): void {
    this.streakWidth = Math.max(0.25, px);
  }

  setCoverageCheckTiles(tiles: number): void {
    this.coverageCheckTiles = Math.max(0, tiles);
  }

  /**
   * Provide a custom coverage callback (replaces IntGrid scan). Pass `null`
   * to revert to the default grid-based check. Useful for shifting the
   * "indoor" zone around at runtime — e.g. dynamic roofs, scripted shelter
   * volumes, or interactive playground demos.
   */
  setCoverageMask(mask: ((worldX: number, worldY: number) => boolean) | null): void {
    this.coverageMask = mask;
  }

  destroy(): void {
    this.particles.length = 0;
    this.destroySplashes();
    if (this.gfx.parent) this.gfx.parent.removeChild(this.gfx);
    this.gfx.destroy();
    if (this.container.parent) this.container.parent.removeChild(this.container);
    this.container.destroy({ children: true });
  }

  /**
   * Advance the simulation and redraw.
   *
   * @param dtMs delta time in milliseconds since the last call.
   * @param view current camera viewport in world-space pixels.
   */
  update(dtMs: number, view: WeatherView): void {
    const dt = Math.min(dtMs, 50) / 1000;
    this.spawn(dt, view);
    this.step(dt, view);
    this.draw();
  }

  // ---------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------

  /**
   * Returns true if the column at (worldX) has a solid cell within
   * `coverageCheckTiles` rows above worldY — i.e. the spawn point is
   * roofed and should not produce rain/snow.
   */
  private isCoveredAbove(worldX: number, worldY: number): boolean {
    if (this.coverageMask) return this.coverageMask(worldX, worldY);
    const c = this.collision;
    if (this.coverageCheckTiles <= 0) return false;
    if (c && this.isGridCoveredAbove(c, worldX, worldY)) return true;
    for (const collider of this.dynamicColliders) {
      if (this.isGridCoveredAbove(collider, worldX, worldY)) return true;
    }
    return false;
  }

  private isGridCoveredAbove(c: WeatherCollision, worldX: number, worldY: number): boolean {
    const grid = c.grid;
    if (grid.length === 0) return false;
    const cols = grid[0]?.length ?? 0;
    const originX = c.originX ?? 0;
    const originY = c.originY ?? 0;
    const isSolidCell = c.isSolid ?? DEFAULT_IS_SOLID;
    const col = Math.floor((worldX - originX) / c.tileSize);
    if (col < 0 || col >= cols) return false;
    const rowAt = Math.floor((worldY - originY) / c.tileSize);
    const rowEnd = Math.max(0, rowAt - this.coverageCheckTiles);
    for (let r = rowAt - 1; r >= rowEnd; r--) {
      if (r < 0) break;
      const row = grid[r];
      if (!row) continue;
      const v = row[col];
      if (v != null && isSolidCell(v) && !c.ignoreCell?.(col, r, v)) return true;
    }
    return false;
  }

  private spawn(dt: number, view: WeatherView): void {
    const intensity = this.mode === 'rain' ? this.rainIntensity : this.snowIntensity;
    if (intensity <= 0) return;
    const baseRate = this.mode === 'rain' ? 480 : 110;
    const rate = baseRate * intensity;
    this.spawnAccum += rate * dt;
    const want = Math.floor(this.spawnAccum);
    this.spawnAccum -= want;
    if (want <= 0) return;

    const pad = this.mode === 'rain' ? 100 : 40;
    const yJitter = this.mode === 'rain' ? 36 : 12;
    for (let i = 0; i < want; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const x = view.x - pad + Math.random() * (view.width + pad * 2);
      const y = view.y - 16 - Math.random() * yJitter;
      if (this.isCoveredAbove(x, y)) continue;
      this.particles.push(this.makeParticle(x, y));
    }
  }

  private makeParticle(x: number, y: number): Particle {
    if (this.mode === 'rain') {
      const layer = (Math.random() < 0.65 ? 0 : 1) as 0 | 1;
      const speed = layer === 1 ? 540 + Math.random() * 140 : 380 + Math.random() * 100;
      return {
        x, y,
        vx: this.wind * speed * 0.45,
        vy: speed,
        size: layer === 1 ? 2 : 1,
        alpha: layer === 1 ? 0.55 : 0.32,
        layer,
        phase: 0,
      };
    }
    // snow
    const layer = (Math.random() < 0.55 ? 0 : 1) as 0 | 1;
    const speed = layer === 1 ? 36 + Math.random() * 22 : 20 + Math.random() * 14;
    return {
      x, y,
      vx: this.wind * speed * 2.5,
      vy: speed,
      size: layer === 1 ? 2 : 1,
      alpha: layer === 1 ? 0.78 : 0.42,
      layer,
      phase: Math.random() * Math.PI * 2,
    };
  }

  private step(dt: number, view: WeatherView): void {
    const ps = this.particles;
    const isSnow = this.mode === 'snow';
    const hasCollision = !!this.collision?.grid?.length || this.dynamicColliders.length > 0;

    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      const prevX = p.x;
      const prevY = p.y;
      if (isSnow) {
        p.phase += 1.6 * dt;
        const wob = Math.sin(p.phase) * (p.layer === 1 ? 22 : 12);
        p.x += (p.vx + wob) * dt;
        p.y += p.vy * dt;
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }

      // Cull when leaving the viewport region.
      if (p.y > view.y + view.height + 24
       || p.x < view.x - 240
       || p.x > view.x + view.width + 240) {
        ps.splice(i, 1);
        continue;
      }

      // Collision against solid IntGrid cells.
      if (hasCollision) {
        if (isSnow) {
          const hit = this.findSolidHit(prevX, prevY, p.x, p.y);
          if (hit) {
            ps.splice(i, 1);
            continue;
          }
        } else {
          const len = this.rainStreakLength(p);
          const dx = this.rainStreakDx(p, len);
          const hit = this.findSolidHit(prevX + dx, prevY + len, p.x + dx, p.y + len);
          if (hit) {
            this.spawnSplashSprite(hit.x, hit.surfaceY, hit.anchor);
            ps.splice(i, 1);
            continue;
          }
        }
      }
    }

    // Splash sprite lifetime
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const s = this.splashes[i];
      s.life -= dt * 1000;
      const t = 1 - Math.max(0, s.life / s.max);
      const baseX = s.anchor ? (s.anchor.collider.originX ?? 0) + s.anchor.localX : s.startX;
      const baseY = s.anchor ? (s.anchor.collider.originY ?? 0) + s.anchor.localSurfaceY : s.startY;
      s.sprite.x = Math.round(baseX);
      s.sprite.y = Math.round(baseY - s.rise * t);
      s.sprite.alpha = s.baseAlpha * Math.max(0, 1 - t);
      if (s.life <= 0) this.removeSplashAt(i);
    }
  }

  private draw(): void {
    const g = this.gfx;
    g.clear();
    const isSnow = this.mode === 'snow';
    const cFar = isSnow ? COLOR_SNOW_FAR : COLOR_RAIN_FAR;
    const cNear = isSnow ? COLOR_SNOW_NEAR : COLOR_RAIN_NEAR;

    for (const p of this.particles) {
      const color = p.layer === 1 ? cNear : cFar;
      if (isSnow) {
        g.rect(p.x | 0, p.y | 0, p.size, p.size).fill({ color, alpha: p.alpha });
      } else {
        // Streak length scales with the configured base + parallax bonus.
        const len = this.rainStreakLength(p);
        const width = p.layer === 1 ? this.streakWidth + 0.5 : this.streakWidth;
        const dx = this.rainStreakDx(p, len);
        g.moveTo(p.x | 0, p.y | 0)
         .lineTo((p.x + dx) | 0, (p.y + len) | 0)
         .stroke({ color, alpha: p.alpha, width });
      }
    }
  }

  private spawnSplashSprite(x: number, y: number, anchor?: SplashAnchor): void {
    if (this.mode !== 'rain' || this.splashes.length >= MAX_SPLASH_SPRITES) return;
    const textures = getRainSplashTextures();
    const sprite = this.splashPool.pop() ?? new Sprite();
    const life = SPLASH_LIFE_MIN + Math.random() * (SPLASH_LIFE_MAX - SPLASH_LIFE_MIN);
    const baseAlpha = 0.32 + Math.random() * 0.24;
    const flip = Math.random() < 0.5 ? -1 : 1;
    sprite.texture = textures[(Math.random() * textures.length) | 0];
    sprite.anchor.set(0.5, 1);
    sprite.position.set(Math.round(x), Math.round(y));
    sprite.scale.set(flip, 1);
    sprite.alpha = baseAlpha;
    sprite.visible = true;
    this.container.addChild(sprite);
    this.splashes.push({
      sprite,
      life,
      max: life,
      baseAlpha,
      startX: sprite.x,
      startY: sprite.y,
      rise: 1 + Math.random() * 2,
      anchor,
    });
  }

  private removeSplashAt(index: number): void {
    const s = this.splashes[index];
    if (!s) return;
    this.recycleSplashSprite(s.sprite);
    this.splashes.splice(index, 1);
  }

  private clearSplashes(): void {
    for (const s of this.splashes) {
      this.recycleSplashSprite(s.sprite);
    }
    this.splashes.length = 0;
  }

  private recycleSplashSprite(sprite: Sprite): void {
    if (sprite.parent) sprite.parent.removeChild(sprite);
    sprite.visible = false;
    sprite.alpha = 0;
    if (this.splashPool.length < MAX_SPLASH_SPRITES) this.splashPool.push(sprite);
    else sprite.destroy();
  }

  private destroySplashes(): void {
    for (const s of this.splashes) {
      if (s.sprite.parent) s.sprite.parent.removeChild(s.sprite);
      s.sprite.destroy();
    }
    this.splashes.length = 0;
    for (const sprite of this.splashPool) {
      if (sprite.parent) sprite.parent.removeChild(sprite);
      sprite.destroy();
    }
    this.splashPool.length = 0;
  }

  private rainStreakLength(p: Particle): number {
    return p.layer === 1 ? this.streakLength + 2 : this.streakLength;
  }

  private rainStreakDx(p: Particle, len: number): number {
    return p.vx * (1 / Math.max(1, p.vy)) * len;
  }

  private findSolidHit(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
  ): SolidHit | null {
    let best: SolidHit | null = null;
    if (this.collision) best = this.findGridSolidHit(this.collision, fromX, fromY, toX, toY);
    for (const collider of this.dynamicColliders) {
      const hit = this.findGridSolidHit(collider, fromX, fromY, toX, toY, collider);
      if (hit && (!best || hit.t < best.t)) best = hit;
    }
    return best;
  }

  private findGridSolidHit(
    c: WeatherCollision,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    dynamicCollider?: WeatherDynamicCollider,
  ): SolidHit | null {
    const grid = c.grid;
    if (grid.length === 0) return null;
    const ts = c.tileSize;
    const ox = c.originX ?? 0;
    const oy = c.originY ?? 0;
    const isSolidCell = c.isSolid ?? DEFAULT_IS_SOLID;
    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;
    if (cols <= 0) return null;

    const dist = Math.max(Math.abs(toX - fromX), Math.abs(toY - fromY));
    const steps = Math.max(1, Math.ceil(dist / Math.max(1, ts * 0.5)));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const x = fromX + (toX - fromX) * t;
      const y = fromY + (toY - fromY) * t;
      const col = Math.floor((x - ox) / ts);
      const row = Math.floor((y - oy) / ts);
      if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
      const v = grid[row]?.[col];
      if (v != null && isSolidCell(v) && !c.ignoreCell?.(col, row, v)) {
        const surfaceY = row * ts + oy;
        return {
          x,
          surfaceY,
          t,
          anchor: dynamicCollider ? {
            collider: dynamicCollider,
            localX: x - ox,
            localSurfaceY: row * ts,
          } : undefined,
        };
      }
    }
    return null;
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function clamp01(v: number): number {
  return clamp(v, 0, 1);
}

function getRainSplashTextures(): Texture[] {
  if (cachedRainSplashTextures) return cachedRainSplashTextures;
  cachedRainSplashTextures = RAIN_SPLASH_PIXELS.map((pixels) => {
    const canvas = document.createElement('canvas');
    canvas.width = 10;
    canvas.height = 5;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = colorToCssHex(COLOR_RAIN_SPLASH);
    for (const [x, y, w, alpha = 1] of pixels) {
      ctx.globalAlpha = alpha;
      ctx.fillRect(x, y, w, 1);
    }
    const tex = Texture.from(canvas);
    tex.source.scaleMode = 'nearest';
    tex.source.addressMode = 'clamp-to-edge';
    return tex;
  });
  return cachedRainSplashTextures;
}

function colorToCssHex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
