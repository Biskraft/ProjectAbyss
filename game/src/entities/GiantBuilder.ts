/**
 * GiantBuilder ??A massive Builder entity rendered from a separate LDtk level.
 *
 * Moves sub-pixel smooth along a vertical route. The scene is responsible
 * for stamping this builder's collisionGrid into the host grid each frame
 * (tile-aligned) so the player walks on it via standard tile physics.
 */

import { Container, Graphics } from 'pixi.js';
import { LdtkRenderer } from '@level/LdtkRenderer';
import type { LdtkLevel } from '@level/LdtkLoader';
import type { Texture } from 'pixi.js';
import { applyAreaTilesetToLdtkTiles } from '@data/areaPalettes';
import { ProceduralDecorator, hashString } from '@level/ProceduralDecorator';
import { LegRig, type LegMount } from './LegRig';
import { GlowFilter } from '@effects/GlowFilter';
import { LandingDustManager } from '@effects/LandingDust';
import { Debug } from '@core/Debug';

// ---------------------------------------------------------------------------
// BuilderLight ??blinking indicator on the builder body
// ---------------------------------------------------------------------------

interface BuilderLightDef {
  x: number;
  y: number;
  shape: 'Circle' | 'Rect';
  color: number;
  rate: number;
  size: number;
  glowRadius: number;
  onlyWhileMoving: boolean;
  gfx: Graphics;
  glowGfx: Graphics;
}

const TILE = 16;
// How far the foot anchor sits away from the wall face. Default 0 means the
// visible sole edge is exactly on the raycast face; LDtk can still override
// with AutoFootClearance when a specific leg needs art-directed spacing.
const AUTO_FOOT_WALL_CLEARANCE = 0;
// AutoFoot wall scan uses a vertical band instead of a 1-tile line so small
// wall holes do not make builder feet lose their wall contact.
const AUTO_FOOT_RAY_THICKNESS_TILES = 10;

function readBoolField(fields: Record<string, unknown>, ...names: string[]): boolean {
  for (const name of names) {
    if (typeof fields[name] === 'boolean') return fields[name] as boolean;
  }
  return false;
}

export interface BuilderRoutePoint {
  y: number;
  waitMs: number;
}

type BuilderState = 'moving' | 'waiting' | 'dormant';

interface HostFootAnchorContext {
  hostLevel: LdtkLevel;
  builderX: number;
  builderY: number;
}

export class GiantBuilder {
  readonly container: Container;
  readonly collisionGrid: number[][];
  readonly widthPx: number;
  readonly heightPx: number;
  readonly widthTiles: number;
  readonly heightTiles: number;

  /**
   * Sub-pixel internal position (float). container.y is always rounded to
   * integer for pixel-perfect rendering; posY retains the fractional
   * accumulator so motion speed is preserved across integer snaps.
   */
  posY = 0;

  lastDeltaY = 0;

  private route: BuilderRoutePoint[] = [];
  private routeIndex = 0;
  private state: BuilderState = 'dormant';
  private waitTimer = 0;
  private speed = 0;
  private loop = true;

  private renderer: LdtkRenderer;
  private legRig: LegRig;
  private footDust: LandingDustManager;
  private lights: BuilderLightDef[] = [];
  private lightTime = 0;

  /** Host level reference for the per-frame raycast (set in constructor when
   *  a hostFootAnchor is supplied). Null host = no AutoFoot updates. */
  private hostLevel: LdtkLevel | null = null;
  /** AutoFoot leg book-keeping. One entry per LegMount with AutoFootLeft/Right
   *  set. `smoothedX/Y` is the IK anchor actually pushed to LegRig ??lerped
   *  toward the live raycast target each frame so row-boundary jumps don't
   *  read as 16-px snaps. `lastX/Y` are the most recent successful target,
   *  used as the lerp target on frames where the ray misses. */
  private autoFootLegs: Array<{
    legIdx: number;
    shoulderLocalX: number;
    shoulderLocalY: number;
    direction: 'left' | 'right';
    clearance: number;
    smoothedX?: number;
    smoothedY?: number;
    lastX?: number;
    lastY?: number;
  }> = [];

  /** Anchor lerp rate per frame (0 = static, 1 = instant). 0.20 absorbs a
   *  16-px row-boundary snap over ~10 frames (~160 ms at 60 fps). */
  private static readonly FOOT_ANCHOR_LERP = 0.20;
  /** Unfiltered container for light graphics ??sits above palette-filtered layers
   *  so glow colors are not crushed by the dark palette swap. */
  readonly lightContainer: Container;

  /** Procedural decoration layers, exposed so the host scene can apply
   *  the same area-palette filters used on the level body. */
  readonly decorator: ProceduralDecorator;

  /** Body tile layers (bg / wall / interior / shadow) exposed so the host
   *  scene can attach the same PaletteSwap + RimLight filters that it
   *  applies to its own renderer layers. Keeps LdtkRenderer encapsulated
   *  while still letting the scene wire shared filter instances. */
  get bodyLayers(): { bg: Container; wall: Container; interior: Container; shadow: Container } {
    return {
      bg: this.renderer.bgLayer,
      wall: this.renderer.wallLayer,
      interior: this.renderer.interiorLayer,
      shadow: this.renderer.shadowLayer,
    };
  }

  setLegFilters(filters: Container['filters']): void {
    this.legRig.container.filters = filters ? [...filters] : filters;
    this.legRig.frontContainer.filters = filters ? [...filters] : filters;
  }

  constructor(
    level: LdtkLevel,
    atlases: Record<string, Texture>,
    bgAreaId: string,
    wallAreaId: string,
    hostFootAnchor?: HostFootAnchorContext,
  ) {
    this.widthPx = level.pxWid;
    this.heightPx = level.pxHei;
    this.widthTiles = Math.ceil(level.pxWid / TILE);
    this.heightTiles = Math.ceil(level.pxHei / TILE);
    this.collisionGrid = level.collisionGrid.map(r => [...r]);

    const bgTiles = [...level.backgroundTiles];
    const wallTiles = [...level.wallTiles];
    const shadowTiles = [...level.shadowTiles];
    const defaultWallTileset = 'atlas/world_01.png';
    const defaultBgTileset = 'atlas/world_01.png';
    applyAreaTilesetToLdtkTiles(bgAreaId, bgTiles.filter(t => t.tilesetPath === defaultBgTileset));
    applyAreaTilesetToLdtkTiles(wallAreaId, wallTiles.filter(t => t.tilesetPath === defaultWallTileset));
    applyAreaTilesetToLdtkTiles(wallAreaId, shadowTiles.filter(t => t.tilesetPath === defaultWallTileset));

    const interiorTiles = [...level.interiorTiles, ...Object.values(level.extraTileLayers).flat()];

    this.renderer = new LdtkRenderer();
    this.renderer.renderLevel(bgTiles, wallTiles, shadowTiles, atlases, undefined, undefined, interiorTiles);
    this.container = this.renderer.container;

    // Procedural legs are author-driven via LDtk "LegMount" entities placed
    // in the builder level. Back-layer legs render behind the body tilemap
    // (peek out around the body); legs with ForwardRender=true render in the
    // front layer to show the full leg silhouette in front of the body.
    const mounts = GiantBuilder.extractLegMounts(level);
    this.footDust = new LandingDustManager(this.container);
    this.legRig = new LegRig(mounts, (x, y, mount) => {
      if (Math.abs(Math.cos(mount.angle)) < 0.55) return;
      this.footDust.spawnScaled(x, y, 700, 4, 'vertical');
    });
    this.container.addChildAt(this.legRig.container, 0);
    this.container.addChild(this.legRig.frontContainer);
    this.syncLegDebug();

    // Live foot raycast: track the host level + extract per-leg AutoFoot
    // settings so `updateFootAnchors()` can refresh anchors every frame.
    if (hostFootAnchor) {
      this.hostLevel = hostFootAnchor.hostLevel;
      this.autoFootLegs = GiantBuilder.extractAutoFootEntries(level);
      // Initial seed so the first rendered frame already shows the ray
      // result instead of the spawn-time fallback anchor.
      this.updateFootAnchors();
    }
    this.legRig.update(0); // initial pose (gait phase 0, no advance)

    // Procedural decorations on the builder body ??same Z layout as the host
    // level: structureLayer behind walls, naturalLayer / artificialLayer
    // between walls and shadows. Seeded by the LDtk level identifier so the
    // builder always looks the same.
    this.decorator = new ProceduralDecorator();
    this.decorator.generate(this.collisionGrid, hashString(level.identifier));
    const wallIdx = this.container.getChildIndex(this.renderer.wallLayer);
    this.container.addChildAt(this.decorator.structureLayer, wallIdx);
    const shadowIdx = this.container.getChildIndex(this.renderer.shadowLayer);
    this.container.addChildAt(this.decorator.naturalLayer, shadowIdx);
    this.container.addChildAt(this.decorator.artificialLayer, shadowIdx + 1);

    // Blinking indicator lights from BuilderLight entities.
    // Placed in a separate unfiltered container so palette swap
    // doesn't crush the glow into darkness.
    this.lightContainer = new Container();
    this.lights = GiantBuilder.extractLights(level);
    for (const light of this.lights) {
      this.lightContainer.addChild(light.glowGfx);
      this.lightContainer.addChild(light.gfx);
    }
    // Bloom shader on all lights ??makes them glow like real indicators
    if (this.lights.length > 0) {
      this.lightContainer.filters = [new GlowFilter({
        color: this.lights[0].color,
        radius: 10,
        intensity: 1.5,
        coreBoost: 0.9,
      })];
    }
    this.container.addChild(this.lightContainer);
  }

  /**
   * Read leg mount points from LDtk entities in the builder level.
   * LegMount entity contract:
   *   Pivot:  (0.5, 0.5) center
   *   Fields:
   *     - XFlip         (Bool, optional) - flip leg sprites and stride direction horizontally.
   *     - YFlip         (Bool, optional) - flip leg sprites vertically.
   *     - KneeFlip      (Bool, optional) - flip IK knee bend direction only.
   *     - ForwardRender (Bool, optional) ??render this leg in front of the
   *                       body tilemap (default: behind).
   */
  private static extractLegMounts(level: LdtkLevel): LegMount[] {
    return level.entities
      .filter((e) => e.type === 'LegMount')
      .map((e) => {
        const flipX = readBoolField(e.fields, 'XFlip', 'FlipX', 'flipX');
        const flipY = readBoolField(e.fields, 'YFlip', 'FlipY', 'flipY');
        const kneeFlip = readBoolField(e.fields, 'KneeFlip', 'kneeFlip');
        const forwardRender = typeof e.fields.ForwardRender === 'boolean' ? e.fields.ForwardRender : false;
        const footContact: LegMount['footContact'] = 'bottom';
        return {
          x: e.px[0],
          y: e.px[1],
          flipX,
          flipY,
          kneeFlip,
          forwardRender,
          footContact,
        };
      });
  }

  /**
   * Walk LegMount entities in raw LDtk order and emit one tracking entry
   * per AutoFootLeft/Right mount. Index aligns with extractLegMounts so the
   * caller can pass `legIdx` directly to LegRig.setFootAnchor.
   */
  private static extractAutoFootEntries(level: LdtkLevel): GiantBuilder['autoFootLegs'] {
    const out: GiantBuilder['autoFootLegs'] = [];
    let legIdx = 0;
    for (const e of level.entities) {
      if (e.type !== 'LegMount') continue;
      const al = e.fields.AutoFootLeft === true;
      const ar = e.fields.AutoFootRight === true;
      if (al || ar) {
        const clearanceCells = typeof e.fields.AutoFootClearance === 'number'
          ? e.fields.AutoFootClearance
          : AUTO_FOOT_WALL_CLEARANCE / TILE;
        out.push({
          legIdx,
          shoulderLocalX: e.px[0],
          shoulderLocalY: e.px[1],
          direction: al ? 'left' : 'right',
          clearance: clearanceCells * TILE,
        });
      }
      legIdx++;
    }
    return out;
  }

  /**
   * Raycast from a shoulder world coord through a thick horizontal band in
   * host IntGrid space.
   * Returns the first wall cell's *near* face (the side facing the shoulder)
   * along with the center row the ray travelled. `maxCells` caps the scan distance.
   * Returns null when no wall is encountered ??caller falls back to the
   * last successful anchor (or default pose if none).
   */
  private static raycastWallFromShoulder(
    hostLevel: LdtkLevel,
    shoulderWorldX: number,
    shoulderWorldY: number,
    direction: 'left' | 'right',
    maxCells: number = 64,
  ): { faceWorldX: number; row: number } | null {
    const row = Math.floor(shoulderWorldY / TILE);
    if (row < 0 || row >= hostLevel.gridH) return null;
    const bandBefore = Math.floor((AUTO_FOOT_RAY_THICKNESS_TILES - 1) / 2);
    const bandAfter = AUTO_FOOT_RAY_THICKNESS_TILES - 1 - bandBefore;
    const rowMin = Math.max(0, row - bandBefore);
    const rowMax = Math.min(hostLevel.gridH - 1, row + bandAfter);
    const startCol = Math.floor(shoulderWorldX / TILE);
    const step = direction === 'left' ? -1 : 1;
    let scanned = 0;
    for (let c = startCol; c >= 0 && c < hostLevel.gridW && scanned < maxCells; c += step) {
      let hitsBand = false;
      for (let r = rowMin; r <= rowMax; r++) {
        if (hostLevel.collisionGrid[r]?.[c] === 1) {
          hitsBand = true;
          break;
        }
      }
      if (hitsBand) {
        // Face = the side of this cell that points back at the shoulder.
        //   left-ray hit  ??wall is to the *left* of shoulder ??face is c+1
        //   right-ray hit ??wall is to the *right* of shoulder ??face is c
        const faceCol = direction === 'left' ? c + 1 : c;
        return { faceWorldX: faceCol * TILE, row };
      }
      scanned++;
    }
    return null;
  }

  /**
   * Per-frame raycast for every AutoFoot leg, pushing a smoothed anchor
   * into LegRig.
   *
   * Smoothing rationale: the raycast snaps to 16-px cells, so when the
   * builder crosses a row boundary the raw target jumps by a full cell.
   * Without smoothing the foot pops; with lerp the IK eases over ~10 frames.
   * The first frame seeds smoothedX/Y to the target (no startup interpolation
   * from origin).
   */
  private updateFootAnchors(): void {
    if (!this.hostLevel || this.autoFootLegs.length === 0) return;
    const RATE = GiantBuilder.FOOT_ANCHOR_LERP;
    for (const entry of this.autoFootLegs) {
      const sx = this.container.x + entry.shoulderLocalX;
      const sy = this.container.y + entry.shoulderLocalY;
      const hit = GiantBuilder.raycastWallFromShoulder(this.hostLevel, sx, sy, entry.direction);
      let targetX: number | undefined;
      let targetY: number | undefined;
      if (hit) {
        // Convert host-world ??builder-local before handing to LegRig
        // (mount coords live in body-local space).
        const localFaceX = hit.faceWorldX - this.container.x;
        const localFootY = (hit.row + 0.5) * TILE - this.container.y;
        // Sign points away from the wall toward the shoulder.
        const sign = entry.direction === 'left' ? 1 : -1;
        targetX = localFaceX + sign * entry.clearance;
        targetY = localFootY;
        entry.lastX = targetX;
        entry.lastY = targetY;
      } else if (entry.lastX !== undefined && entry.lastY !== undefined) {
        // Fallback (c) ??hold the last successful target so a momentary
        // miss (host edge, wall-less row) doesn't snap to default pose.
        targetX = entry.lastX;
        targetY = entry.lastY;
      }
      if (targetX === undefined || targetY === undefined) continue;
      // Smoothing temporarily disabled during the sole-anchor diagnosis ??      // any stale lastSuccess value lerping in would obscure whether the
      // IK target itself is correct. Re-enable once visuals are confirmed.
      entry.smoothedX = targetX;
      entry.smoothedY = targetY;
      void RATE;
      this.legRig.setFootAnchor(entry.legIdx, entry.smoothedX, entry.smoothedY, entry.direction);
    }
  }

  private static extractLights(level: LdtkLevel): BuilderLightDef[] {
    return level.entities
      .filter((e) => e.type === 'BuilderLight')
      .map((e) => {
        const shape = (e.fields.Shape === 'Rect' ? 'Rect' : 'Circle') as 'Circle' | 'Rect';
        const colorRaw = e.fields.LightColor;
        const color = typeof colorRaw === 'string'
          ? parseInt(colorRaw.replace(/^#/, ''), 16)
          : (typeof colorRaw === 'number' ? colorRaw : 0xE87830);
        const rate = typeof e.fields.Rate === 'number' ? e.fields.Rate : 2.0;
        const glowRadius = typeof e.fields.GlowRadius === 'number' ? e.fields.GlowRadius : 6;
        const onlyWhileMoving = e.fields.OnlyWhileMoving === true;

        // Entity width/height from LDtk resize (px)
        const w = e.width;
        const h = e.height;
        const hw = w / 2;
        const hh = h / 2;
        const size = Math.max(hw, hh);

        // Core light: colored body + white-hot center
        const gfx = new Graphics();
        if (shape === 'Circle') {
          gfx.circle(0, 0, Math.min(hw, hh));
          gfx.fill(color);
          gfx.circle(0, 0, Math.min(hw, hh) * 0.5);
          gfx.fill({ color: 0xffffff, alpha: 0.8 });
        } else {
          gfx.rect(-hw, -hh, w, h);
          gfx.fill(color);
          const ihw = hw * 0.4, ihh = hh * 0.4;
          gfx.rect(-ihw, -ihh, ihw * 2, ihh * 2);
          gfx.fill({ color: 0xffffff, alpha: 0.8 });
        }
        gfx.x = e.px[0];
        gfx.y = e.px[1];

        // Multi-layer glow halo
        const glowGfx = new Graphics();
        if (glowRadius > 0) {
          const grW = hw + glowRadius;
          const grH = hh + glowRadius;
          if (shape === 'Circle') {
            glowGfx.circle(0, 0, Math.min(grW, grH));
            glowGfx.fill({ color, alpha: 0.35 });
            glowGfx.circle(0, 0, Math.min(grW, grH) * 0.6);
            glowGfx.fill({ color, alpha: 0.25 });
          } else {
            glowGfx.rect(-grW, -grH, grW * 2, grH * 2);
            glowGfx.fill({ color, alpha: 0.3 });
            const mrW = grW * 0.6, mrH = grH * 0.6;
            glowGfx.rect(-mrW, -mrH, mrW * 2, mrH * 2);
            glowGfx.fill({ color, alpha: 0.2 });
          }
        }
        glowGfx.x = e.px[0];
        glowGfx.y = e.px[1];

        return { x: e.px[0], y: e.px[1], shape, color, rate, size, glowRadius, onlyWhileMoving, gfx, glowGfx };
      });
  }

  placeInLevel(pixelX: number, pixelY: number): void {
    this.container.x = pixelX;
    this.posY = pixelY;
    this.container.y = Math.round(pixelY);
  }

  setRoute(route: BuilderRoutePoint[], speed: number, loop = true): void {
    this.route = route;
    this.speed = speed;
    this.loop = loop;
    this.routeIndex = 0;
    this.state = 'waiting';
    this.waitTimer = route[0]?.waitMs ?? 0;
  }

  activate(): void {
    if (this.state === 'dormant' && this.route.length > 0) {
      this.state = 'moving';
    }
  }

  private syncLegDebug(): void {
    this.legRig.setDebug(Debug.visible ? this.container : null);
  }

  /** True while the builder is actively traveling between route points. */
  get isMoving(): boolean {
    return this.state === 'moving';
  }

  update(dt: number): void {
    this.syncLegDebug();
    this.lastDeltaY = 0;

    // Animate lights regardless of movement state
    this.lightTime += dt / 1000;
    const moving = this.state === 'moving';
    for (const light of this.lights) {
      if (light.onlyWhileMoving && !moving) {
        light.gfx.alpha = 0;
        light.glowGfx.alpha = 0;
        continue;
      }
      const phase = (this.lightTime / light.rate) % 1;
      const pulse = Math.sin(phase * Math.PI * 2) * 0.5 + 0.5;
      light.gfx.alpha = 0.3 + pulse * 0.7;
      light.glowGfx.alpha = pulse * 0.6;
    }
    this.footDust.update(dt);

    // Per-frame leg raycast ??anchors track the host wall as the builder
    // moves. Done before any state early-return so dormant / waiting
    // builders still adapt (e.g. cracked floor breaks under a stopped leg).
    this.updateFootAnchors();

    if (this.state === 'dormant' || this.route.length === 0) {
      // Even dormant, push anchor changes into IK so sprite reflects ray.
      this.legRig.update(0);
      return;
    }

    if (this.state === 'waiting') {
      this.waitTimer -= dt;
      if (this.waitTimer <= 0) {
        const next = this.routeIndex + 1;
        if (next >= this.route.length) {
          if (this.loop) {
            this.routeIndex = 0;
            this.state = 'moving';
          } else {
            // One-shot: end of route, go permanently dormant.
            this.state = 'dormant';
          }
        } else {
          this.routeIndex = next;
          this.state = 'moving';
        }
      }
      this.legRig.update(0);
      return;
    }

    const target = this.route[this.routeIndex];
    const dirSign = Math.sign(target.y - this.posY);
    if (dirSign === 0) {
      this.state = 'waiting';
      this.waitTimer = target.waitMs;
      return;
    }

    // Sub-pixel smooth motion in posY (float). container.y snaps to integer
    // each frame to avoid nearest-filter shimmer at X.5 positions. Physics
    // stamp quantization to whole tiles is handled by the scene.
    let step = dirSign * this.speed * (dt / 1000);

    // Do not overshoot the target.
    const remaining = target.y - this.posY;
    if (dirSign > 0 && step > remaining) step = remaining;
    else if (dirSign < 0 && step < remaining) step = remaining;

    const prevRenderY = this.container.y;
    this.posY += step;
    this.container.y = Math.round(this.posY);
    this.lastDeltaY = this.container.y - prevRenderY;

    if (Math.abs(target.y - this.posY) < 0.01) {
      this.posY = target.y;
      this.container.y = Math.round(target.y);
      this.state = 'waiting';
      this.waitTimer = target.waitMs;
    }

    // Advance procedural leg gait by the body movement this frame.
    this.legRig.update(this.lastDeltaY);

    // (Light animation handled above, before dormant early-return)
  }
}
