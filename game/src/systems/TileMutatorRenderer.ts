/**
 * TileMutatorRenderer — visual overlay for TileMutator state.
 *
 * The underlying LdtkRenderer paints tile sprites statically from collisionGrid,
 * so frozen/burning/electric state changes have no built-in visual. This
 * renderer queries the mutator each frame and draws semi-transparent overlays
 * on top so the player can see fire, ice and electric effects propagating.
 *
 * Z-order: parent should be a container ABOVE the tile layer but ideally BELOW
 *  entity sprites. For prototyping we just use entityLayer.
 *
 * Coordinate space: world (parent container in scene world space).
 * Tile size: hardcoded 16px (matches IntGrid).
 *
 * GDD: Documents/System/System_World_TileSystem.md §2.6-2.13
 */

import { Container, Graphics, Sprite, Texture, Rectangle, Assets, BlurFilter, DisplacementFilter } from 'pixi.js';
import { assetPath } from '@core/AssetLoader';
import type { TileMutator } from './TileMutator';
import { TILE_OIL, TILE_GRASS, TILE_WATER, TILE_ACID, TILE_CHARGED, getTile } from '../core/Physics';
import { EmberRiseManager } from '../effects/EmberRise';
import { SmokeWispManager } from '../effects/SmokeWisp';

/**
 * Build a procedural displacement map for the heat-shimmer DisplacementFilter.
 * Smooth low-frequency noise so the warping looks like rising air, not random
 * jitter. Generated once on first burning frame and cached in module scope.
 */
let HEAT_DISP_TEX: Texture | null = null;
function getHeatDisplacementTexture(): Texture {
  if (HEAT_DISP_TEX) return HEAT_DISP_TEX;
  const cv = document.createElement('canvas');
  cv.width = 128;
  cv.height = 128;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(128, 128);
  // 2-octave value noise — coarse base (8 px cells) + finer detail (3 px).
  const baseGrid: number[] = new Array(17 * 17);
  for (let i = 0; i < baseGrid.length; i++) baseGrid[i] = Math.random();
  const detailGrid: number[] = new Array(43 * 43);
  for (let i = 0; i < detailGrid.length; i++) detailGrid[i] = Math.random();
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const smooth = (t: number) => t * t * (3 - 2 * t);
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      // Base octave (8 px)
      const bx = x / 8, by = y / 8;
      const bxi = Math.floor(bx), byi = Math.floor(by);
      const tx = smooth(bx - bxi), ty = smooth(by - byi);
      const v00 = baseGrid[byi       * 17 + bxi];
      const v10 = baseGrid[byi       * 17 + (bxi + 1)];
      const v01 = baseGrid[(byi + 1) * 17 + bxi];
      const v11 = baseGrid[(byi + 1) * 17 + (bxi + 1)];
      const base = lerp(lerp(v00, v10, tx), lerp(v01, v11, tx), ty);
      // Detail octave (3 px)
      const dx = x / 3, dy = y / 3;
      const dxi = Math.floor(dx), dyi = Math.floor(dy);
      const dtx = smooth(dx - dxi), dty = smooth(dy - dyi);
      const d00 = detailGrid[dyi       * 43 + dxi];
      const d10 = detailGrid[dyi       * 43 + (dxi + 1)];
      const d01 = detailGrid[(dyi + 1) * 43 + dxi];
      const d11 = detailGrid[(dyi + 1) * 43 + (dxi + 1)];
      const detail = lerp(lerp(d00, d10, dtx), lerp(d01, d11, dtx), dty);
      const n = base * 0.75 + detail * 0.25;
      // R, G channels carry x / y displacement (centered around 128).
      // Constant alpha 255 so the texture has solid pixels for sampling.
      const r = Math.floor(n * 255);
      const g = Math.floor((1 - n) * 255);
      const i = (y * 128 + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  HEAT_DISP_TEX = Texture.from(cv);
  if (HEAT_DISP_TEX.source) HEAT_DISP_TEX.source.scaleMode = 'linear';
  return HEAT_DISP_TEX;
}

const FIRE_ATLAS_FRAMES = 8;
const FIRE_FRAME_MS = 90;            // 8 frames × 90 ms ≈ 720 ms loop
/**
 * Two atlas categories — MAIN tall flames (fire_01 / fire_02) and FLOOR
 * flat flames (fire_03 / fire_04). Every burning cell renders BOTH:
 *
 *   - one floor sprite (flat, sits on the cell bottom) — back layer
 *   - one main sprite  (tall, rises off the cell bottom) — front layer
 *
 * Per-cell hash picks which variant within each category, so adjacent
 * cells stay visually distinct and grass / wood / oil all share the
 * same render path (no grass-special-case anymore).
 */
const MAIN_VARIANT_PATHS = [
  'assets/sprites/fire_01_atlas.png',
  'assets/sprites/fire_02_atlas.png',
];
const FLOOR_VARIANT_PATHS = [
  'assets/sprites/fire_03_atlas.png',
  'assets/sprites/fire_04_atlas.png',
];
const MAIN_FRAMES_CACHE: Texture[][] = [];  // [variantIdx][frameIdx]
const FLOOR_FRAMES_CACHE: Texture[][] = [];
let fireFramesPromise: Promise<void> | null = null;

function sliceAtlas(tex: Texture): Texture[] {
  if (tex?.source) tex.source.scaleMode = 'nearest';
  const fw = Math.floor(tex.width / FIRE_ATLAS_FRAMES);
  const fh = tex.height;
  const variant: Texture[] = [];
  for (let i = 0; i < FIRE_ATLAS_FRAMES; i++) {
    variant.push(new Texture({
      source: tex.source,
      frame: new Rectangle(i * fw, 0, fw, fh),
    }));
  }
  return variant;
}

function ensureFireFrames(): Promise<void> {
  if (fireFramesPromise) return fireFramesPromise;
  fireFramesPromise = (async () => {
    await Promise.all([
      ...MAIN_VARIANT_PATHS.map(async (path, idx) => {
        MAIN_FRAMES_CACHE[idx] = sliceAtlas(await Assets.load<Texture>(assetPath(path)));
      }),
      ...FLOOR_VARIANT_PATHS.map(async (path, idx) => {
        FLOOR_FRAMES_CACHE[idx] = sliceAtlas(await Assets.load<Texture>(assetPath(path)));
      }),
    ]);
  })().catch((e) => {
    // eslint-disable-next-line no-console
    console.warn('[TileMutatorRenderer] fire atlas load failed', e);
  });
  return fireFramesPromise;
}

export class TileMutatorRenderer {
  private gfx = new Graphics();
  /** Separate Graphics that should live ABOVE the fluid layer (oil flames). */
  private aboveFluidGfx = new Graphics();
  /**
   * Fire light-source halo — BlurFilter applied so each burning cell emits
   * a soft warm glow above the scene. Drawn on aboveFluidGfx parent (which
   * is above the fluid polygon layer) for visibility over oil pools.
   */
  private fireHaloGfx = new Graphics();
  /**
   * Container holding the per-burning-cell fire animation Sprites. Each
   * Sprite stays parented to this container and is reused frame-to-frame
   * (visible toggled + texture/position updated). Lives on the
   * aboveFluid parent so flames render over the fluid polygon.
   */
  private fireSpriteLayer: Container = new Container();
  private fireSpritePool: Sprite[] = [];
  /**
   * Rising ember particles spawned by each burning cell. Drawn on the
   * same aboveFluid parent so embers float over fluid pools.
   */
  private embers: EmberRiseManager | null = null;
  /** Dark smoke wisps drifting up — contrast against bright embers. */
  private smoke: SmokeWispManager | null = null;
  /**
   * Heat-shimmer displacement sprite (the texture sampled by the filter
   * to warp the fire layer). Stored so we can move it each frame to
   * animate the warp pattern.
   */
  private heatDispSprite: Sprite | null = null;
  /** Filter applied to fireSpriteLayer for heat shimmer. */
  private heatShimmerFilter: DisplacementFilter | null = null;

  /**
   * Dissolve-out tracking. When a cell transitions OUT of burning we keep
   * rendering its flame for a short fade-out window, shrinking scale and
   * dimming alpha so the fire doesn't "pop" off-screen.
   *
   * Key = `${gx},${gy}`. Value carries the tile classification at the
   * moment of extinction (the IntGrid may have already mutated to air,
   * so we cannot re-derive isOil/isGrass at render time).
   */
  private prevBurningCells = new Set<string>();
  private extinguishing = new Map<string, {
    gx: number;
    gy: number;
    age: number;
    isOil: boolean;
    isGrass: boolean;
  }>();
  private static readonly EXTINGUISH_MS = 450;

  constructor(parent: Container) {
    parent.addChild(this.gfx);
    // BlurFilter strength=10 — enough for ~8px feathering on 16px cells.
    const blur = new BlurFilter({ strength: 10, quality: 4 });
    this.fireHaloGfx.filters = [blur];
    // Kick off the fire atlas load. Sprites get a real texture once it lands;
    // before that the burning cells still pulse via halo + (silent) sprite
    // pool waiting for textures.
    void ensureFireFrames();
  }

  /**
   * Provide a Graphics container that sits ABOVE the fluid layer. Oil flame
   * tongues are drawn here so they aren't covered by the fluid polygon.
   * Fire halo also lives here for the same z-order reason.
   * If never called, the flames + halo still render but may be hidden by fluid.
   */
  setAboveFluidLayer(parent: Container): void {
    parent.addChild(this.fireHaloGfx);     // halo (back, blurred)
    parent.addChild(this.aboveFluidGfx);   // legacy graphics (mid)
    // Smoke wisps render BEHIND the flame sprites so they read as "smoke
    // rising past the fire", not haze covering it.
    this.smoke = new SmokeWispManager(parent);
    parent.addChild(this.fireSpriteLayer); // animated fire sprites (mid-front)
    // Embers render in front of the flame sprites so they read as
    // independent specks, not painted-on highlights.
    this.embers = new EmberRiseManager(parent);

    // Heat shimmer — DisplacementFilter on the fire sprite layer. The
    // displacement sprite is a procedural smooth-noise canvas; we scroll
    // it across the layer each frame to animate the warp.
    const dispTex = getHeatDisplacementTexture();
    const dispSprite = new Sprite(dispTex);
    // The displacement sprite must be attached to the stage so its
    // transform is included in the filter calculation. Parent it to the
    // shimmer's target layer.
    parent.addChild(dispSprite);
    dispSprite.alpha = 0; // visible only via filter sampling
    this.heatDispSprite = dispSprite;
    this.heatShimmerFilter = new DisplacementFilter({ sprite: dispSprite, scale: 4 });
    this.fireSpriteLayer.filters = [this.heatShimmerFilter];
  }

  destroy(): void {
    if (this.gfx.parent) this.gfx.parent.removeChild(this.gfx);
    this.gfx.destroy();
    if (this.aboveFluidGfx.parent) this.aboveFluidGfx.parent.removeChild(this.aboveFluidGfx);
    this.aboveFluidGfx.destroy();
    if (this.fireHaloGfx.parent) this.fireHaloGfx.parent.removeChild(this.fireHaloGfx);
    this.fireHaloGfx.destroy();
    if (this.fireSpriteLayer.parent) this.fireSpriteLayer.parent.removeChild(this.fireSpriteLayer);
    this.fireSpriteLayer.destroy({ children: true });
    this.fireSpritePool.length = 0;
    if (this.embers) { this.embers.destroy(); this.embers = null; }
    if (this.smoke)  { this.smoke.destroy();  this.smoke = null; }
    if (this.heatDispSprite) {
      if (this.heatDispSprite.parent) this.heatDispSprite.parent.removeChild(this.heatDispSprite);
      this.heatDispSprite.destroy();
      this.heatDispSprite = null;
    }
    this.heatShimmerFilter = null;
    this.fireSpriteLayer.filters = [];
  }

  /** Borrow a Sprite from the pool, growing on demand. */
  private acquireFireSprite(): Sprite {
    for (const s of this.fireSpritePool) {
      if (!s.visible) { s.visible = true; return s; }
    }
    const s = new Sprite();
    s.anchor.set(0.5, 1); // pivot = bottom-center so the flame "sits" on its cell
    this.fireSpriteLayer.addChild(s);
    this.fireSpritePool.push(s);
    return s;
  }

  /**
   * Rebuilds overlay every frame. Cheap because cell counts are small.
   *
   * @param mutator        - Current TileMutator state
   * @param collisionGrid  - Optional grid for tile-type-aware rendering
   *                         (oil flames rise above the surface, wood/grass
   *                         fill the cell). If absent, all burning cells
   *                         fill the cell.
   */
  update(mutator: TileMutator, collisionGrid?: number[][], dtMs = 16.67): void {
    const g = this.gfx;
    const af = this.aboveFluidGfx;
    const fh = this.fireHaloGfx;
    g.clear();
    af.clear();
    fh.clear();
    const t = performance.now();
    // Hide all sprites — burning loop below will re-enable + position the ones we need.
    for (const s of this.fireSpritePool) s.visible = false;
    const fireFrameIdx = Math.floor(t / FIRE_FRAME_MS) % FIRE_ATLAS_FRAMES;
    const mainVariantCount  = MAIN_FRAMES_CACHE.length;
    const floorVariantCount = FLOOR_FRAMES_CACHE.length;
    const fireReady = mainVariantCount > 0 && floorVariantCount > 0
                   && MAIN_FRAMES_CACHE[0]?.length  === FIRE_ATLAS_FRAMES
                   && FLOOR_FRAMES_CACHE[0]?.length === FIRE_ATLAS_FRAMES;

    // Heat-shimmer scroll — slow drift through the displacement texture so
    // the warp pattern animates without obvious looping. Direction = up-left
    // mirrors hot air rising and being swept by ambient draft.
    if (this.heatDispSprite) {
      this.heatDispSprite.x = (-t * 0.018) % 128;
      this.heatDispSprite.y = (-t * 0.045) % 128;
    }

    // ── Frozen cells (ice wall, water/magma → temp wall) ──────────────────
    // bluish translucent fill + bright top stripe so player sees the "ice bridge"
    mutator.forEachFrozen((gx, gy) => {
      const x = gx * 16, y = gy * 16;
      g.rect(x, y, 16, 16).fill({ color: 0x88ccff, alpha: 0.55 });
      g.rect(x, y, 16, 2).fill({ color: 0xddf0ff, alpha: 0.9 });
      g.rect(x, y + 14, 16, 2).fill({ color: 0x6fa8d4, alpha: 0.7 });
    });

    // ── Burning cells (oil/wood/grass on fire) ────────────────────────────
    // Active burning + extinguishing cells share the same render code path.
    // `fadeRatio = 1` for live cells; extinguishing cells pass 1 → 0 over
    // EXTINGUISH_MS, which scales sprite size + alpha + halo strength so
    // the fire dissolves out instead of popping.
    const renderBurningCell = (
      gx: number, gy: number,
      classifiedIsOil: boolean, classifiedIsGrass: boolean,
      fadeRatio: number,
    ) => {
      const x = gx * 16, y = gy * 16;
      const cellSeed = gx * 7 + gy * 13;
      const isOil = classifiedIsOil;
      // `isGrass` is retained for telemetry / future tuning but no longer
      // drives a separate render path — every burning cell (oil, wood,
      // grass) now anchors its flames to the cell BOTTOM. Floor sprite +
      // main sprite both anchor (0.5, 1) at flameBaseY so the visual is
      // identical across tile types.
      void classifiedIsGrass;
      const flameBaseY = y + 16;       // unified — cell floor
      const haloCy = flameBaseY - 6;   // halo just above the floor

      // ── Fire halo — radius + intensity both at 50 % of previous pass.
      // Two-tone composite sin keeps breathing across cells out of lock-step.
      const cx = x + 8;
      const haloPulse = 1.0 + Math.sin(t * 0.008 + cellSeed * 0.6) * 0.26
                            + Math.sin(t * 0.013 + cellSeed * 1.7) * 0.10;
      // Dissolve scaling — radius shrinks AND alpha drops as a cell
      // extinguishes. Sharper alpha curve (squared) so the fade visibly
      // accelerates near end-of-life.
      const fadeAlpha = fadeRatio * fadeRatio;
      const fadeScale = 0.4 + fadeRatio * 0.6;
      fh.ellipse(cx, haloCy, 16 * haloPulse * fadeScale, 12.5 * haloPulse * fadeScale)
        .fill({ color: 0xff7733, alpha: 0.35 * fadeAlpha });
      fh.ellipse(cx, haloCy - 2, 8 * haloPulse * fadeScale, 6.5 * haloPulse * fadeScale)
        .fill({ color: 0xffdd66, alpha: 0.44 * fadeAlpha });
      fh.circle(cx, haloCy, 3 * haloPulse * fadeScale)
        .fill({ color: 0xffffff, alpha: 0.36 * fadeAlpha });

      // Bottom hot-floor glow — anchored 2 px above the cell floor for
      // every tile type (was previously 2 px lower for grass).
      const floorPulse = 0.85 + Math.sin(t * 0.012 + cellSeed * 0.9) * 0.15;
      const floorY = y + 12;
      fh.rect(x + 1, floorY, 14, 4)
        .fill({ color: 0xff3300, alpha: 0.45 * floorPulse * fadeAlpha });
      fh.rect(x + 4, floorY + 1, 8, 2)
        .fill({ color: 0xffaa44, alpha: 0.85 * floorPulse * fadeAlpha });

      // In-cell base glow — unified rectangle for every non-oil tile so the
      // source reads even before the atlas finishes loading. (Oil tiles get
      // the body alpha from FluidSystem already.)
      if (!isOil) {
        g.rect(x, y, 16, 16).fill({ color: 0xff7733, alpha: 0.35 * fadeAlpha });
      }

      // ── Atlas-driven flame sprite (8-frame anim, fire_01_atlas.png).
      // Anchor = bottom-center so the flame "sits" on flameBaseY.
      //
      // Per-cell jitter breaks the obvious 16×16 grid look:
      //   - position offset (±4 px x, ±2 px y)
      //   - scale 0.80~1.20 (wide span — grid-formality is the worst tell)
      //   - rotation ±9° around the bottom-center anchor
      //   - frame index phase-shift (already in place)
      //   - alpha 0.78~1.0
      // Hash is deterministic per (gx, gy) so the jitter is steady frame-to-
      // frame — the fire stays put, just doesn't tile.
      // A subset (~30%) of cells get a SECONDARY smaller flame strand to add
      // density variation; cluster centers then read as wide fire mounds
      // rather than a uniform grid.
      if (fireReady) {
        const h1 = ((cellSeed * 9301 + 49297) % 233280) / 233280;
        const h2 = ((cellSeed * 7919 + 31337) % 233280) / 233280;
        const h3 = ((cellSeed * 5783 + 11003) % 233280) / 233280;
        const h4 = ((cellSeed * 4093 + 17389) % 233280) / 233280;
        const h5 = ((cellSeed * 3469 + 27077) % 233280) / 233280;
        const h6 = ((cellSeed * 2693 + 41011) % 233280) / 233280;
        const offX = (h1 - 0.5) * 8;             // ±4 px
        const offY = (h2 - 0.5) * 4;             // ±2 px
        const sclVar = 0.80 + h3 * 0.40;         // 0.80~1.20
        const scl = sclVar;                      // unified — no grass shrink
        const rot = (h4 - 0.5) * 0.32;           // ±0.16 rad ≈ ±9°
        const alpha = 0.78 + h2 * 0.22;          // 0.78~1.00
        // Independent variant picks for the two layers — floor flat + main
        // tall use different atlas families so they read as distinct
        // elements rather than two copies of the same flame.
        const mainIdx  = Math.floor(h5 * mainVariantCount)  % mainVariantCount;
        const floorIdx = Math.floor(h6 * floorVariantCount) % floorVariantCount;
        const mainVariant  = MAIN_FRAMES_CACHE[mainIdx];
        const floorVariant = FLOOR_FRAMES_CACHE[floorIdx];

        // Dissolve: shrink sprite scale toward 0 + drop alpha quadratically.
        const sclDissolve = scl * fadeRatio;
        const alphaDissolve = alpha * fadeRatio * fadeRatio;
        const localFrame = (fireFrameIdx + (cellSeed % FIRE_ATLAS_FRAMES)) % FIRE_ATLAS_FRAMES;

        // ── FLOOR sprite (back layer) — flat flame anchored at cell floor.
        // Less jitter than the tall main sprite so the floor flame stays
        // grounded; rotation is half the main layer's amplitude.
        const sf = this.acquireFireSprite();
        sf.texture = floorVariant[localFrame];
        sf.x = x + 8 + offX * 0.5;
        sf.y = flameBaseY + offY * 0.4;
        sf.scale.set(sclDissolve * 1.0, sclDissolve * 1.0);
        sf.rotation = rot * 0.5;
        sf.alpha = alphaDissolve * 0.9;

        // ── MAIN sprite (front layer) — tall flame rising off the floor.
        const s = this.acquireFireSprite();
        const mainPhase = (fireFrameIdx + Math.floor(h1 * FIRE_ATLAS_FRAMES)) % FIRE_ATLAS_FRAMES;
        s.texture = mainVariant[mainPhase];
        s.x = x + 8 + offX;
        s.y = flameBaseY + offY;
        s.scale.set(sclDissolve, sclDissolve);
        s.rotation = rot;
        s.alpha = alphaDissolve;

        // Secondary side strand on ~30% of cells. Pulls from the OTHER main
        // variant when 2+ exist — main + side differ in shape, the same
        // strategy as before but no longer cross-pollutes with floor.
        if (h3 > 0.7) {
          const s2 = this.acquireFireSprite();
          const sideVariant = MAIN_FRAMES_CACHE[(mainIdx + 1) % mainVariantCount];
          const sidePhase = (fireFrameIdx + Math.floor(h1 * FIRE_ATLAS_FRAMES) + 3) % FIRE_ATLAS_FRAMES;
          s2.texture = sideVariant[sidePhase];
          s2.x = x + 8 + (h1 < 0.5 ? -5 : 5) + offX * 0.4;
          s2.y = flameBaseY + 1;
          s2.scale.set(sclDissolve * 0.55, sclDissolve * 0.55);
          s2.rotation = -rot * 0.6;
          s2.alpha = alphaDissolve * 0.85;
        }
      }

      // Rising ember + smoke spawn — only for ALIVE cells (fadeRatio == 1).
      // Extinguishing cells shouldn't keep emitting new particles, otherwise
      // the dissolve never visually "ends".
      if (fadeRatio >= 1) {
        this.embers?.trySpawn(x + 8, flameBaseY - 4);
        this.smoke?.trySpawn(x + 8, flameBaseY - 14);
      }
    };

    // Collect this frame's burning cells + render them at full intensity.
    const curBurning = new Set<string>();
    mutator.forEachBurning((gx, gy) => {
      const tile = collisionGrid ? getTile(collisionGrid, gx, gy) : 0;
      const isOil = tile === TILE_OIL;
      const isGrass = tile === TILE_GRASS;
      curBurning.add(`${gx},${gy}`);
      // If this cell was previously extinguishing (e.g. fire was put out
      // then re-ignited), drop the dissolve entry — live trumps fading.
      this.extinguishing.delete(`${gx},${gy}`);
      renderBurningCell(gx, gy, isOil, isGrass, 1);
    });

    // Cells that were burning last frame but are NOT now → enter dissolve.
    // Snapshot the tile classification at the moment of extinction so the
    // fade renders with the correct geometry even after the IntGrid mutates.
    for (const key of this.prevBurningCells) {
      if (curBurning.has(key) || this.extinguishing.has(key)) continue;
      const [gxS, gyS] = key.split(',');
      const gx = +gxS, gy = +gyS;
      // Tile may have already mutated to air. Re-derive isOil/isGrass on
      // a BEST-EFFORT basis: if the cell is now air we keep the dissolve
      // visual oriented as if it were a wood cell (top-of-cell base).
      const tile = collisionGrid ? getTile(collisionGrid, gx, gy) : 0;
      this.extinguishing.set(key, {
        gx, gy, age: 0,
        isOil:   tile === TILE_OIL,
        isGrass: tile === TILE_GRASS,
      });
    }
    this.prevBurningCells = curBurning;

    // Tick + render extinguishing cells. fadeRatio drops 1 → 0 over the
    // EXTINGUISH_MS window; entries are removed when fully faded.
    for (const [key, item] of this.extinguishing) {
      item.age += dtMs;
      if (item.age >= TileMutatorRenderer.EXTINGUISH_MS) {
        this.extinguishing.delete(key);
        continue;
      }
      const fadeRatio = 1 - (item.age / TileMutatorRenderer.EXTINGUISH_MS);
      renderBurningCell(item.gx, item.gy, item.isOil, item.isGrass, fadeRatio);
    }

    // Tick particles last so motes/wisps spawned this frame draw against
    // the fresh halo + flame sprite positions.
    this.embers?.update(dtMs);
    this.smoke?.update(dtMs);

    // ── Electric cells (thunder flood-fill on water/metal/acid) ───────────
    // yellow translucent tint + zigzag arc between random edge points + bright sparks
    mutator.forEachElectric((gx, gy) => {
      const x = gx * 16, y = gy * 16;
      const tile = collisionGrid ? getTile(collisionGrid, gx, gy) : 0;
      const isFluidCell = tile === TILE_WATER || tile === TILE_ACID || tile === TILE_CHARGED;
      if (!isFluidCell) {
        g.rect(x, y, 16, 16).fill({ color: 0xffee44, alpha: 0.55 });
      }
      // ~40% chance per frame to draw an arc this cell
      if (Math.random() < 0.4) {
        const edge = (i: number): [number, number] => {
          const r = Math.random() * 16;
          switch (i) {
            case 0: return [x + r, y];        // top
            case 1: return [x + r, y + 16];   // bottom
            case 2: return [x, y + r];        // left
            default: return [x + 16, y + r];  // right
          }
        };
        const sIdx = Math.floor(Math.random() * 4);
        const eIdx = (sIdx + 1 + Math.floor(Math.random() * 3)) % 4;
        const s = edge(sIdx), e = edge(eIdx);
        const mx = (s[0] + e[0]) / 2 + (Math.random() - 0.5) * 5;
        const my = (s[1] + e[1]) / 2 + (Math.random() - 0.5) * 5;
        g.moveTo(s[0], s[1]).lineTo(mx, my).lineTo(e[0], e[1])
          .stroke({ color: 0xffffaa, width: 1, alpha: 0.9 });
      }
      // 1-pixel white spark
      if (Math.random() < 0.5) {
        g.rect((x + Math.random() * 16) | 0, (y + Math.random() * 16) | 0, 1, 1)
          .fill({ color: 0xffffff, alpha: 0.95 });
      }
    });
  }
}
