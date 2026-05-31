/**
 * WeatherSystem — IntGrid-aware rain & snow particles for ECHORIS.
 *
 * Tone target (Content_Direction.md / 위령):
 *   - Rain: cold blue-gray streaks, slow horizontal drift, soft splash ticks
 *           where droplets meet a solid surface. Not a "weather" gimmick — a
 *           memorial veil that hushes color and adds a ground pulse.
 *   - Snow: bone/sepia motes, sine-wobble drift, no impact splash. Falls quiet.
 *   - Stratum (Item Stratum / 아이템계): inverted, material-specific weather
 *           that runs in world-space and collides with IntGrid geometry.
 *           Profiles carry the item temperament: ash falls, cryo rises, spark
 *           jitters, rust settles, shadow drips. Full-screen fog is only used
 *           when the caller explicitly enables breathing.
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

export type WeatherMode = 'rain' | 'snow' | 'stratum';

/**
 * Stratum particle "flavor" — the World material echoed back in a drained /
 * inverted form (distortion-first). The breathing fog + color + audio carry
 * the shared "you are inside an echo" recognition; the profile only paints the
 * item's temperament onto the particles.
 *   residue — cyan motes rising + amber memory sparks (canonical echo)
 *   ash     — Forge/magma drained to cold black ash, FALLING, dying embers
 *   cryo/cyro — Iron/cyro snow with gravity inverted: pale frost RISING
 *   spark   — Spark static motes flickering, rising erratically
 *   rust    — Rust acid-green corrosion flecks settling + drifting sideways
 *   shadow  — Shadow black oil rain with faint rim light
 */
export type StratumProfile = 'residue' | 'ash' | 'cryo' | 'spark' | 'rust' | 'shadow';
export type StratumProfileInput = StratumProfile | 'cyro';

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
  // ---- Stratum (Item Stratum) mode ----
  /** Stratum density (0..1). Falls back to `intensity`. */
  stratumIntensity?: number;
  /** Stratum rise speed (0..1). Default 0.5. */
  ascendSpeed?: number;
  /** Stratum: full-screen breathing fog pulse (0.5 Hz). Default true. */
  breathing?: boolean;
  /** Stratum: amber memory sparks converging on the echo core. Default true. */
  memorySparks?: boolean;
  /** Stratum: echo-core anchor in normalized view coords [0..1]. Default {0.5, 0.32}. */
  coreAnchor?: { x: number; y: number };
  /** Stratum particle flavor (per item temperament). Default 'residue'. */
  stratumProfile?: StratumProfileInput;
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
  /** Sine-drift phase for snow-like particles. */
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
const STRATUM_MAX_DEFAULT = 190;

type PrecipKind = 'rain' | 'snow';

interface StratumProfileConfig {
  /** Item World profile is implemented as a rain or snow variant. */
  precip: PrecipKind;
  farColor: number;
  nearColor: number;
  splashColor: number;
  spawnRateScale: number;
  windScale: number;
  alphaScale: number;
  snowWobbleScale: number;
  streakLengthAdd: number;
  streakWidthAdd: number;
  splash: boolean;
  /** Multiplier on vertical speed. */
  speedScale: number;
}

const STRATUM_PROFILES: Record<StratumProfile, StratumProfileConfig> = {
  residue: {
    precip: 'snow', farColor: 0x6bc8d2, nearColor: 0xb6f6ff, splashColor: 0x9beef3,
    spawnRateScale: 1.2, windScale: 0.8, alphaScale: 0.75, snowWobbleScale: 0.65,
    streakLengthAdd: 0, streakWidthAdd: 0, splash: false, speedScale: 1.0,
  },
  ash: {
    precip: 'snow', farColor: 0x2b2520, nearColor: 0x5a5048, splashColor: 0x5a5048,
    spawnRateScale: 1.8, windScale: 0.55, alphaScale: 0.9, snowWobbleScale: 0.25,
    streakLengthAdd: 0, streakWidthAdd: 0, splash: false, speedScale: 1.45,
  },
  cryo: {
    precip: 'snow', farColor: 0x7da8b8, nearColor: 0xd8f5ff, splashColor: 0xd8f5ff,
    spawnRateScale: 1.4, windScale: 0.45, alphaScale: 0.95, snowWobbleScale: 0.55,
    streakLengthAdd: 0, streakWidthAdd: 0, splash: false, speedScale: 0.7,
  },
  spark: {
    precip: 'rain', farColor: 0x6fb8ff, nearColor: 0xe8f4ff, splashColor: 0xbfe0ff,
    spawnRateScale: 0.75, windScale: 0.35, alphaScale: 0.85, snowWobbleScale: 1,
    streakLengthAdd: 5, streakWidthAdd: 0.1, splash: true, speedScale: 1.15,
  },
  rust: {
    precip: 'rain', farColor: 0x5f7f2a, nearColor: 0xb8e85a, splashColor: 0x9ed94a,
    spawnRateScale: 0.9, windScale: 0.6, alphaScale: 0.8, snowWobbleScale: 1,
    streakLengthAdd: 2, streakWidthAdd: 0.2, splash: true, speedScale: 0.85,
  },
  shadow: {
    precip: 'rain', farColor: 0x100c12, nearColor: 0x30233a, splashColor: 0x21172a,
    spawnRateScale: 0.65, windScale: 0.25, alphaScale: 0.7, snowWobbleScale: 1,
    streakLengthAdd: 7, streakWidthAdd: 0.45, splash: true, speedScale: 0.7,
  },
};
const MAX_SPLASH_SPRITES = 48;
const SPLASH_LIFE_MIN = 120;
const SPLASH_LIFE_MAX = 220;

const RAIN_SPLASH_PIXELS: ReadonlyArray<ReadonlyArray<readonly [number, number, number, number?]>> = [
  [[1, 4, 2], [4, 3, 3, 0.9], [8, 4, 1, 0.75]],
  [[0, 4, 1, 0.8], [3, 3, 4], [8, 4, 2, 0.7]],
  [[2, 4, 2, 0.8], [5, 2, 2], [7, 4, 1, 0.75]],
  [[1, 3, 1, 0.75], [4, 4, 4], [9, 3, 1, 0.7]],
];

const cachedRainSplashTextures = new Map<number, Texture[]>();

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

  private stratumIntensity: number;
  private stratumProfile: StratumProfile;
  private profileCfg: StratumProfileConfig;

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
    this.wind = clamp(opts.wind ?? (this.mode === 'rain' ? -0.18 : this.mode === 'stratum' ? -0.12 : 0), -1, 1);
    this.maxParticles = opts.maxParticles
      ?? (this.mode === 'rain' ? 220 : this.mode === 'snow' ? 140 : STRATUM_MAX_DEFAULT);
    this.coverageCheckTiles = Math.max(0, opts.coverageCheckTiles ?? 4);
    this.streakLength = Math.max(1, opts.streakLength ?? 6);
    this.streakWidth = Math.max(0.25, opts.streakWidth ?? 0.8);
    this.coverageMask = opts.coverageMask ?? null;
    this.stratumIntensity = clamp01(opts.stratumIntensity ?? fallback);
    this.stratumProfile = normalizeStratumProfile(opts.stratumProfile ?? 'residue');
    this.profileCfg = STRATUM_PROFILES[this.stratumProfile];
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
    else if (this.mode === 'snow') this.snowIntensity = v;
    else this.stratumIntensity = v;
  }

  setRainIntensity(intensity: number): void {
    this.rainIntensity = clamp01(intensity);
  }

  setSnowIntensity(intensity: number): void {
    this.snowIntensity = clamp01(intensity);
  }

  setStratumIntensity(intensity: number): void {
    this.stratumIntensity = clamp01(intensity);
  }

  /** Stratum: rise speed (0..1). Higher = faster ascent + spark convergence. */
  setAscendSpeed(v: number): void {
    void v;
  }

  /** Stratum: toggle the full-screen breathing fog pulse. */
  setBreathing(on: boolean): void {
    void on;
  }

  /** Stratum: toggle amber memory sparks. */
  setMemorySparks(on: boolean): void {
    void on;
  }

  /** Stratum: echo-core anchor in normalized view coords [0..1]. */
  setCoreAnchor(x: number, y: number): void {
    void x;
    void y;
  }

  /** Stratum: switch particle flavor. Clears live particles for a clean swap. */
  setStratumProfile(profile: StratumProfileInput): void {
    this.stratumProfile = normalizeStratumProfile(profile);
    this.profileCfg = STRATUM_PROFILES[this.stratumProfile];
    if (this.mode === 'stratum') {
      this.particles.length = 0;
      this.clearSplashes();
    }
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
    this.draw(view);
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

  private activePrecipKind(): PrecipKind {
    if (this.mode === 'stratum') return this.profileCfg.precip;
    return this.mode === 'snow' ? 'snow' : 'rain';
  }

  private activeIntensity(): number {
    if (this.mode === 'stratum') return this.stratumIntensity;
    return this.mode === 'snow' ? this.snowIntensity : this.rainIntensity;
  }

  private activeSpawnRateScale(): number {
    return this.mode === 'stratum' ? this.profileCfg.spawnRateScale : 1;
  }

  private activeSpeedScale(): number {
    return this.mode === 'stratum' ? this.profileCfg.speedScale : 1;
  }

  private activeWindScale(): number {
    return this.mode === 'stratum' ? this.profileCfg.windScale : 1;
  }

  private activeAlphaScale(): number {
    return this.mode === 'stratum' ? this.profileCfg.alphaScale : 1;
  }

  private activeSnowWobbleScale(): number {
    return this.mode === 'stratum' ? this.profileCfg.snowWobbleScale : 1;
  }

  private activeColors(kind: PrecipKind): { far: number; near: number } {
    if (this.mode === 'stratum') {
      return { far: this.profileCfg.farColor, near: this.profileCfg.nearColor };
    }
    return kind === 'snow'
      ? { far: COLOR_SNOW_FAR, near: COLOR_SNOW_NEAR }
      : { far: COLOR_RAIN_FAR, near: COLOR_RAIN_NEAR };
  }

  private activeSplashColor(): number {
    return this.mode === 'stratum' ? this.profileCfg.splashColor : COLOR_RAIN_SPLASH;
  }

  private activeRainSplashEnabled(): boolean {
    return this.mode !== 'stratum' || this.profileCfg.splash;
  }

  private spawn(dt: number, view: WeatherView): void {
    const kind = this.activePrecipKind();
    const intensity = this.activeIntensity();
    if (intensity <= 0) return;
    const baseRate = kind === 'rain' ? 480 : 110;
    const rate = baseRate * intensity * this.activeSpawnRateScale();
    this.spawnAccum += rate * dt;
    const want = Math.floor(this.spawnAccum);
    this.spawnAccum -= want;
    if (want <= 0) return;

    const pad = kind === 'rain' ? 100 : 40;
    const yJitter = kind === 'rain' ? 36 : 12;
    for (let i = 0; i < want; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const x = view.x - pad + Math.random() * (view.width + pad * 2);
      const y = view.y - 16 - Math.random() * yJitter;
      if (this.isCoveredAbove(x, y)) continue;
      this.particles.push(this.makeParticle(x, y, kind));
    }
  }

  private makeParticle(x: number, y: number, kind = this.activePrecipKind()): Particle {
    const speedScale = this.activeSpeedScale();
    const windScale = this.activeWindScale();
    const alphaScale = this.activeAlphaScale();
    if (kind === 'rain') {
      const layer = (Math.random() < 0.65 ? 0 : 1) as 0 | 1;
      const speed = (layer === 1 ? 540 + Math.random() * 140 : 380 + Math.random() * 100) * speedScale;
      return {
        x, y,
        vx: this.wind * speed * 0.45 * windScale,
        vy: speed,
        size: layer === 1 ? 2 : 1,
        alpha: (layer === 1 ? 0.55 : 0.32) * alphaScale,
        layer,
        phase: 0,
      };
    }
    // snow
    const layer = (Math.random() < 0.55 ? 0 : 1) as 0 | 1;
    const speed = (layer === 1 ? 36 + Math.random() * 22 : 20 + Math.random() * 14) * speedScale;
    return {
      x, y,
      vx: this.wind * speed * 2.5 * windScale,
      vy: speed,
      size: layer === 1 ? 2 : 1,
      alpha: (layer === 1 ? 0.78 : 0.42) * alphaScale,
      layer,
      phase: Math.random() * Math.PI * 2,
    };
  }

  private step(dt: number, view: WeatherView): void {
    const ps = this.particles;
    const kind = this.activePrecipKind();
    const isSnow = kind === 'snow';
    const snowWobbleScale = this.activeSnowWobbleScale();
    const hasCollision = !!this.collision?.grid?.length || this.dynamicColliders.length > 0;

    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      const prevX = p.x;
      const prevY = p.y;
      if (isSnow) {
        p.phase += 1.6 * dt;
        const wob = Math.sin(p.phase) * (p.layer === 1 ? 22 : 12) * snowWobbleScale;
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
            if (this.activeRainSplashEnabled()) {
              this.spawnSplashSprite(hit.x, hit.surfaceY, hit.anchor);
            }
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

  private draw(view: WeatherView): void {
    const g = this.gfx;
    g.clear();
    const kind = this.activePrecipKind();
    const isSnow = kind === 'snow';
    const colors = this.activeColors(kind);
    const cFar = colors.far;
    const cNear = colors.near;

    for (const p of this.particles) {
      const color = p.layer === 1 ? cNear : cFar;
      if (isSnow) {
        g.rect(p.x | 0, p.y | 0, p.size, p.size).fill({ color, alpha: p.alpha });
      } else {
        // Streak length scales with the configured base + parallax bonus.
        const len = this.rainStreakLength(p);
        const width = this.rainStreakWidth(p);
        const dx = this.rainStreakDx(p, len);
        g.moveTo(p.x | 0, p.y | 0)
         .lineTo((p.x + dx) | 0, (p.y + len) | 0)
         .stroke({ color, alpha: p.alpha, width });
      }
    }
  }

  private spawnSplashSprite(x: number, y: number, anchor?: SplashAnchor): void {
    if (this.activePrecipKind() !== 'rain' || this.splashes.length >= MAX_SPLASH_SPRITES) return;
    const textures = getRainSplashTextures(this.activeSplashColor());
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
    const profileAdd = this.mode === 'stratum' ? this.profileCfg.streakLengthAdd : 0;
    return (p.layer === 1 ? this.streakLength + 2 : this.streakLength) + profileAdd;
  }

  private rainStreakWidth(p: Particle): number {
    const profileAdd = this.mode === 'stratum' ? this.profileCfg.streakWidthAdd : 0;
    return (p.layer === 1 ? this.streakWidth + 0.5 : this.streakWidth) + profileAdd;
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

function normalizeStratumProfile(profile: StratumProfileInput): StratumProfile {
  return profile === 'cyro' ? 'cryo' : profile;
}

function getRainSplashTextures(color = COLOR_RAIN_SPLASH): Texture[] {
  const cached = cachedRainSplashTextures.get(color);
  if (cached) return cached;
  const textures = RAIN_SPLASH_PIXELS.map((pixels) => {
    const canvas = document.createElement('canvas');
    canvas.width = 10;
    canvas.height = 5;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = colorToCssHex(color);
    for (const [x, y, w, alpha = 1] of pixels) {
      ctx.globalAlpha = alpha;
      ctx.fillRect(x, y, w, 1);
    }
    const tex = Texture.from(canvas);
    tex.source.scaleMode = 'nearest';
    tex.source.addressMode = 'clamp-to-edge';
    return tex;
  });
  cachedRainSplashTextures.set(color, textures);
  return textures;
}

function colorToCssHex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
