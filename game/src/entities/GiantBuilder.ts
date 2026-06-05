/**
 * GiantBuilder ??A massive Builder entity rendered from a separate LDtk level.
 *
 * Moves sub-pixel smooth along a vertical route. The scene is responsible
 * for stamping this builder's collisionGrid into the host grid each frame
 * (tile-aligned) so the player walks on it via standard tile physics.
 */

import { Container, Graphics, Rectangle } from 'pixi.js';
import { LdtkRenderer } from '@level/LdtkRenderer';
import type { LdtkLevel, LdtkTile } from '@level/LdtkLoader';
import type { Texture } from 'pixi.js';
import { applyDefaultWorldAreaRetags } from '@level/LdtkAreaRetagHelpers';
import { ProceduralDecorator, hashString } from '@level/ProceduralDecorator';
import { LegRig, type LegMount, type LegRigSnapshot } from './LegRig';
import { GlowFilter } from '@effects/GlowFilter';
import { LandingDustManager } from '@effects/LandingDust';
import { Debug } from '@core/Debug';
import { isSolid } from '@core/Physics';

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

export type BuilderState = 'moving' | 'waiting' | 'dormant';

export interface GiantBuilderSnapshot {
  posY: number;
  routeIndex: number;
  state: BuilderState;
  waitTimer: number;
  lightTime: number;
  legRig: LegRigSnapshot;
}

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
  private awakeningMode = false;
  private renderer: LdtkRenderer;
  private atlases: Record<string, Texture>;
  private wallTiles: LdtkTile[] = [];
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

  /** BuilderInterior IntGrid cells (packed row*widthTiles+col) for O(1) overlap tests. */
  private _interiorCells = new Set<number>();

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

  /** BuilderInterior dissolve layer. The scene fades this out when the player
   *  overlaps interior cells. */
  get builderInteriorLayer(): Container {
    return this.renderer.builderInteriorLayer;
  }

  /** The BuilderOutside layer, rendered after BuilderInterior and before special/shadow overlays. */
  get builderOutsideLayer(): Container {
    return this.renderer.builderOutsideLayer;
  }

  /** LegRig back-layer (legs that should peek behind the body). Externally attached. */
  get legBackLayer(): Container {
    return this.legRig.container;
  }

  /** LegRig front-layer (legs that should render in front of the body). Externally attached. */
  get legFrontLayer(): Container {
    return this.legRig.frontContainer;
  }

  /**
   * Returns true when the player AABB overlaps at least one BuilderInterior
   * IntGrid cell in builder-local space. Used each frame to drive the dissolve.
   */
  isPlayerInInteriorCells(worldX: number, worldY: number, w: number, h: number): boolean {
    if (this._interiorCells.size === 0) return false;
    const localX = worldX - this.container.x;
    const localY = worldY - this.container.y;
    const col0 = Math.floor(localX / TILE);
    const col1 = Math.floor((localX + w - 1) / TILE);
    const row0 = Math.floor(localY / TILE);
    const row1 = Math.floor((localY + h - 1) / TILE);
    for (let r = row0; r <= row1; r++) {
      for (let c = col0; c <= col1; c++) {
        if (this._interiorCells.has(r * this.widthTiles + c)) return true;
      }
    }
    return false;
  }

  setLegFilters(filters: Container['filters'] | null): void {
    this.legRig.container.filters = filters ? [...filters] : filters;
    this.legRig.frontContainer.filters = filters ? [...filters] : filters;
  }

  pinFilterBounds(): void {
    const area = new Rectangle(0, 0, this.widthPx, this.heightPx);
    const apply = (layer?: Container | null): void => {
      if (!layer) return;
      layer.filterArea = area;
      layer.boundsArea = area;
    };
    apply(this.renderer.bgLayer);
    apply(this.renderer.wallLayer);
    apply(this.renderer.interiorLayer);
    apply(this.renderer.shadowLayer);
    apply(this.renderer.specialLayer);
    apply(this.renderer.builderInteriorLayer);
    apply(this.renderer.builderOutsideLayer);
    apply(this.decorator?.naturalLayer);
    apply(this.decorator?.artificialLayer);
    apply(this.decorator?.structureLayer);
    apply(this.legRig.container);
    apply(this.legRig.frontContainer);
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
    this.atlases = atlases;
    this.widthTiles = Math.ceil(level.pxWid / TILE);
    this.heightTiles = Math.ceil(level.pxHei / TILE);
    this.collisionGrid = level.collisionGrid.map(r => [...r]);
    this.fillEnclosedAirCells();

    const bgTiles = [...level.backgroundTiles];
    const wallTiles = [...level.wallTiles];
    const shadowTiles = [...level.shadowTiles];
    applyDefaultWorldAreaRetags({
      bgAreaId,
      wallAreaId,
      bgTiles,
      wallTiles,
      shadowTiles,
    });
    this.wallTiles = wallTiles;

    // BuilderInterior tiles are handled separately (dissolve layer) — exclude
    // them from the general interiorTiles merge so they don't render twice.
    const builderInteriorTiles = level.extraTileLayers['BuilderInterior'] ?? [];
    const builderOutsideTiles = level.extraTileLayers['BuilderOutside'] ?? [];
    const otherExtraLayers = Object.entries(level.extraTileLayers)
      .filter(([k]) => k !== 'BuilderInterior' && k !== 'BuilderOutside')
      .flatMap(([, v]) => v);
    const interiorTiles = [...level.interiorTiles, ...otherExtraLayers];

    this.renderer = new LdtkRenderer();
    this.renderer.renderLevel(bgTiles, wallTiles, shadowTiles, atlases, undefined, this.collisionGrid, interiorTiles);
    this.container = this.renderer.container;

    if (builderInteriorTiles.length > 0) {
      this.renderer.renderBuilderInteriorLayer(builderInteriorTiles, atlases);
      for (const tile of builderInteriorTiles) {
        const col = Math.floor(tile.px[0] / TILE);
        const row = Math.floor(tile.px[1] / TILE);
        this._interiorCells.add(row * this.widthTiles + col);
      }
    }

    if (builderOutsideTiles.length > 0) {
      this.renderer.renderBuilderOutsideLayer(builderOutsideTiles, atlases);
    }

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
    // NOTE: legRig.container / frontContainer 는 builder.container 에 부착하지
    // 않는다. host scene 이 entityLayer + builderInterior + light 보다도 더 *앞*
    // 에 직접 add 하고 position 을 매 프레임 동기화한다. 다리가 가장 앞에 떠야
    // 거대 빌더의 실루엣이 모든 전경 위에서 읽힌다.
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

    // Procedural decorations on the builder body render behind the authored
    // builder tile layers so LDtk BuilderWall/BuilderInterior remains the
    // primary silhouette and decoration never sits on top of the body.
    this.decorator = new ProceduralDecorator();
    this.decorator.generate(this.collisionGrid, hashString(level.identifier));
    const wallIdx = this.container.getChildIndex(this.renderer.wallLayer);
    this.container.addChildAt(this.decorator.structureLayer, wallIdx);
    this.container.addChildAt(this.decorator.naturalLayer, wallIdx + 1);
    this.container.addChildAt(this.decorator.artificialLayer, wallIdx + 2);
    const interiorIdx = this.container.getChildIndex(this.renderer.interiorLayer);
    this.container.addChildAt(this.legRig.container, interiorIdx);

    // Blinking indicator lights from BuilderLight entities.
    // Placed in a separate unfiltered container so palette swap
    // doesn't crush the glow into darkness.
    // NOTE: lightContainer 는 builder.container 에 부착하지 않는다. host scene 이
    // entityLayer + builderInteriorLayer 보다 *앞* 에 직접 add 하고, position 을
    // 매 프레임 동기화한다. 광원이 builder 내부 디테일/플레이어 위에 떠야 진짜
    // indicator 처럼 읽힌다.
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
          : (typeof colorRaw === 'number' ? colorRaw : 0xFFA41B);
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

  /**
   * Skip the initial wait that setRoute() seeds. Used by helpers that want
   * the builder to start moving on the same frame as spawn (e.g. when a
   * player enters Shaft_DemoEnd the builder should be in motion immediately
   * rather than idle for the first route point's waitMs).
   */
  skipInitialWait(): void {
    if (this.route.length === 0) return;
    this.waitTimer = 0;
    this.state = 'moving';
    // Advance to the next route point so the builder targets the *second*
    // endpoint immediately (the first endpoint is already its spawn pose).
    this.routeIndex = Math.min(1, this.route.length - 1);
  }

  createSnapshot(): GiantBuilderSnapshot {
    return {
      posY: this.posY,
      routeIndex: this.routeIndex,
      state: this.state,
      waitTimer: this.waitTimer,
      lightTime: this.lightTime,
      legRig: this.legRig.createSnapshot(),
    };
  }

  restoreSnapshot(snapshot: GiantBuilderSnapshot): void {
    this.posY = snapshot.posY;
    this.container.y = Math.round(snapshot.posY);
    this.routeIndex = Math.max(0, Math.min(snapshot.routeIndex, Math.max(0, this.route.length - 1)));
    this.state = snapshot.state;
    this.waitTimer = snapshot.waitTimer;
    this.lightTime = snapshot.lightTime;
    this.lastDeltaY = 0;
    this.legRig.restoreSnapshot(snapshot.legRig);
    this.updateFootAnchors();
    this.legRig.update(0);
  }

  private syncLegDebug(): void {
    this.legRig.setDebug(Debug.visible ? this.container : null);
  }

  /**
   * Builder bodies can contain decorative sealed cavities. If those cells stay
   * passable, a moving builder can shove the player into them for one frame and
   * trap them behind the stamped collision. Keep only air connected to the
   * builder's outer boundary; all sealed air becomes solid collision.
   */
  private fillEnclosedAirCells(): void {
    const h = this.collisionGrid.length;
    const w = this.collisionGrid[0]?.length ?? 0;
    if (h === 0 || w === 0) return;

    const reachable = Array.from({ length: h }, () => Array<boolean>(w).fill(false));
    const queue: Array<{ x: number; y: number }> = [];
    const enqueue = (x: number, y: number): void => {
      if (x < 0 || x >= w || y < 0 || y >= h) return;
      if (reachable[y][x] || isSolid(this.collisionGrid[y]?.[x] ?? 1)) return;
      reachable[y][x] = true;
      queue.push({ x, y });
    };

    for (let x = 0; x < w; x++) {
      enqueue(x, 0);
      enqueue(x, h - 1);
    }
    for (let y = 0; y < h; y++) {
      enqueue(0, y);
      enqueue(w - 1, y);
    }

    for (let i = 0; i < queue.length; i++) {
      const p = queue[i];
      enqueue(p.x + 1, p.y);
      enqueue(p.x - 1, p.y);
      enqueue(p.x, p.y + 1);
      enqueue(p.x, p.y - 1);
    }

    for (let y = 0; y < h; y++) {
      const row = this.collisionGrid[y];
      for (let x = 0; x < w; x++) {
        if (row[x] === 0 && !reachable[y][x]) row[x] = 1;
      }
    }
  }

  /** True while the builder is actively traveling between route points. */
  get isMoving(): boolean {
    return this.state === 'moving';
  }

  /** Forces all lights ON at full intensity (ignores onlyWhileMoving). Used by
   *  ItemDeploymentController during the Awakening stage. */
  setAwakeningMode(on: boolean): void {
    this.awakeningMode = on;
  }

  /**
   * Ray-cast rightward from worldX and erase all tiles/collision to the
   * builder's right edge. Call site must also unstamp/restamp the builder
   * so the host collisionGrid reflects the cleared cells immediately.
   */
  digTunnel(worldX: number, worldY: number, h: number): void {
    const localX = worldX - this.container.x;
    const localY = worldY - this.container.y;

    // Sweep to builder right edge.
    const clearW = this.widthPx - localX;
    if (clearW <= 0) return;

    this.renderer.clearTilesInRect(localX, localY, clearW, h, { preserveInterior: true });

    const col0 = Math.max(0, Math.floor(localX / TILE));
    const col1 = this.widthTiles - 1;
    const row0 = Math.max(0, Math.floor(localY / TILE));
    const row1 = Math.min(this.heightTiles - 1, Math.floor((localY + h - 1) / TILE));
    for (let row = row0; row <= row1; row++) {
      const gridRow = this.collisionGrid[row];
      if (!gridRow) continue;
      for (let col = col0; col <= col1; col++) {
        if (col < gridRow.length) gridRow[col] = 0;
      }
    }
  }

  restoreTunnelCells(cells: Array<{ row: number; col: number; value: number }>): void {
    for (const cell of cells) {
      const row = this.collisionGrid[cell.row];
      if (!row || cell.col < 0 || cell.col >= row.length) continue;
      row[cell.col] = cell.value;
    }
    this.renderer.rebuildWallLayer(this.wallTiles, this.atlases, this.collisionGrid);
  }

  update(dt: number): void {
    this.syncLegDebug();
    this.lastDeltaY = 0;

    // Animate lights regardless of movement state
    this.lightTime += dt / 1000;
    const moving = this.state === 'moving';
    for (const light of this.lights) {
      if (light.onlyWhileMoving && !moving && !this.awakeningMode) {
        light.gfx.alpha = 0;
        light.glowGfx.alpha = 0;
        continue;
      }
      const phase = (this.lightTime / light.rate) % 1;
      const pulse = Math.sin(phase * Math.PI * 2) * 0.5 + 0.5;
      light.gfx.alpha = this.awakeningMode ? 1.0 : (0.3 + pulse * 0.7);
      light.glowGfx.alpha = this.awakeningMode ? 0.9 : (pulse * 0.6);
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

  destroy(): void {
    this.footDust.clear();
    this.legRig.destroy();
    this.renderer.destroy();
    this.lights.length = 0;
    this.autoFootLegs.length = 0;
  }
}
