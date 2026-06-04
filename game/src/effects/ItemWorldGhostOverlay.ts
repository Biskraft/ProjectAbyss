import { Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { generateItemWorldGrid } from '@level/ItemWorldGridGen';
import { resolveTiles, TEMPLATE_W, TEMPLATE_H } from '@level/ItemWorldTemplates';
import { PRNG } from '@utils/PRNG';
import type { ItemInstance } from '@items/ItemInstance';
import { assetPath } from '@core/AssetLoader';

const TILE_PX = 16;
const HALF_TILE = TILE_PX / 2;
const REVEAL_RADIUS = 6 * TILE_PX;       // 6 tiles
const REVEAL_RADIUS_SQ = REVEAL_RADIUS * REVEAL_RADIUS;
const TILE_REVEAL_INTERVAL_MS = 18;      // 조립 속도 2배 (구 36)
const SCALE_BIRTH_START_SCALE = 1 / 16;  // 1px cells grow into final 16px cells.
const SCALE_BIRTH_ITEM_FINAL_SCALE = 64;
const SCALE_BIRTH_TILE_ALPHA_FULL_SCALE = 0.18;
const SCALE_BIRTH_TILE_VISIBILITY_DELAY_MS = 1000;
const SCALE_RATE_PER_MS = 1 / 200;       // 0→1 in 200ms per tile (조립 속도 2배, 구 1/400)

// Wall silhouette colors — near-black, just enough hue to read as "dungeon"
export interface GhostTilePalette {
  wall: number;
  platform: number;
  highlight: number;
  rim: number;
  particle: number;
}

const DEFAULT_TILE_PALETTE: GhostTilePalette = {
  wall: 0x07071a,
  platform: 0x0c0c24,
  highlight: 0x4499ff,
  rim: 0x4499ff,
  particle: 0xffb84a,
};

type TileKind = 'wall' | 'platform';

interface Rgb {
  r: number;
  g: number;
  b: number;
}

interface TileEntry {
  gfx: Graphics;
  col: number;
  row: number;
  value: number;
  cx: number;  // tile center x in container-local space
  cy: number;  // tile center y in container-local space
  fromX: number;
  fromY: number;
  spin: number;
  kind: TileKind;
  scale: number;
  queued: boolean;
  revealed: boolean;
  collisionStamped: boolean;
}

interface GhostItemDisplay {
  container: Container;
  particleLayer: Container;
  sprite: Sprite | null;
  particles: GhostItemParticle[];
  scaleFactor: number;
  rotate: boolean;
  elapsedMs: number;
}

interface GhostItemParticle {
  gfx: Graphics;
  angle: number;
  radius: number;
  speed: number;
  size: number;
  phase: number;
  color: number;
}

interface ScaleBirthState {
  finalX: number;
  finalY: number;
  originX: number;
  originY: number;
  pivotLocalX: number;
  pivotLocalY: number;
  elapsedMs: number;
  durationMs: number;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function growthScaleCurve(value: number): number {
  const t = clamp01(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function grayTint(value: number): number {
  const v = Math.round(255 * (1 - clamp01(value)));
  return (v << 16) | (v << 8) | v;
}

function toRgb(color: number): Rgb {
  return {
    r: (color >> 16) & 0xff,
    g: (color >> 8) & 0xff,
    b: color & 0xff,
  };
}

function fromRgb({ r, g, b }: Rgb): number {
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

function mixColor(a: number, b: number, t: number): number {
  const ca = toRgb(a);
  const cb = toRgb(b);
  return fromRgb({
    r: ca.r + (cb.r - ca.r) * t,
    g: ca.g + (cb.g - ca.g) * t,
    b: ca.b + (cb.b - ca.b) * t,
  });
}

function scaleColor(color: number, scale: number): number {
  const c = toRgb(color);
  return fromRgb({
    r: Math.max(0, Math.min(255, c.r * scale)),
    g: Math.max(0, Math.min(255, c.g * scale)),
    b: Math.max(0, Math.min(255, c.b * scale)),
  });
}

function luma(c: Rgb): number {
  return c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722;
}

function saturation(c: Rgb): number {
  const max = Math.max(c.r, c.g, c.b);
  const min = Math.min(c.r, c.g, c.b);
  return max <= 0 ? 0 : (max - min) / max;
}

function paletteFromMaterial(material: number): GhostTilePalette {
  const sat = saturation(toRgb(material));
  const wall = mixColor(scaleColor(material, 0.28), 0x03040a, 0.42);
  const platform = mixColor(scaleColor(material, 0.38), 0x050512, 0.28);
  const highlight = mixColor(scaleColor(material, 0.95), 0xffffff, sat < 0.12 ? 0.28 : 0.18);
  const rim = mixColor(highlight, 0xffffff, 0.16);
  return {
    wall,
    platform,
    highlight,
    rim,
    particle: mixColor(highlight, 0xffb84a, 0.25),
  };
}

async function extractItemPalette(item: ItemInstance): Promise<GhostTilePalette | null> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') return null;
  const image = await loadPaletteImage(assetPath(`assets/items/${item.def.id}.png`));
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (width <= 0 || height <= 0) return null;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, width, height).data;
  const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();

  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3];
    if (alpha < 64) continue;
    const color = { r: pixels[i], g: pixels[i + 1], b: pixels[i + 2] };
    const lum = luma(color);
    if (lum < 24 || lum > 246) continue;
    const key = `${color.r >> 4},${color.g >> 4},${color.b >> 4}`;
    const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, count: 0 };
    const weight = alpha / 255;
    bucket.r += color.r * weight;
    bucket.g += color.g * weight;
    bucket.b += color.b * weight;
    bucket.count += weight;
    buckets.set(key, bucket);
  }

  let best: { color: number; score: number } | null = null;
  for (const bucket of buckets.values()) {
    if (bucket.count <= 0) continue;
    const avg = {
      r: bucket.r / bucket.count,
      g: bucket.g / bucket.count,
      b: bucket.b / bucket.count,
    };
    const lum = luma(avg);
    const sat = saturation(avg);
    const score = bucket.count * (0.75 + sat * 0.85) * (lum > 220 ? 0.55 : 1);
    if (!best || score > best.score) best = { color: fromRgb(avg), score };
  }

  return best ? paletteFromMaterial(best.color) : null;
}

function loadPaletteImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load ${src}`));
    image.src = src;
  });
}

/**
 * Item-world entry omen: renders the first stratum's start room as a dark
 * dungeon silhouette blended over the current world.
 *
 * Tiles are invisible (scale=0) until the player walks within 4 tiles of them,
 * at which point they pop in (scale 0→1 over 400ms) individually.
 *
 * Lifecycle:
 *   1. new ItemWorldGhostOverlay()
 *   2. ghost.build(item, stratumIndex)                          — template generator
 *      OR ghost.buildFromGrid(collisionGrid, gridW, gridH)      — LDtk collisionGrid
 *   3. parent.addChild(ghost.container)       — attach at desired world coords
 *   4. ghost.fadeTo(targetAlpha, durationMs)  — overall container alpha
 *   5. ghost.update(dt, playerLocalX, playerLocalY) each frame
 *   6. ghost.destroy()                        — on cleanup
 */
export class ItemWorldGhostOverlay {
  readonly container: Container;
  readonly itemContainer: Container;

  /** Full pixel width of the rendered room (TEMPLATE_W × TILE_PX). */
  static readonly ROOM_PX_W = TEMPLATE_W * TILE_PX; // 768
  /** Full pixel height of the rendered room (TEMPLATE_H × TILE_PX). */
  static readonly ROOM_PX_H = TEMPLATE_H * TILE_PX; // 512

  /** Actual pixel width after build — may differ from static defaults. */
  builtPxW = ItemWorldGhostOverlay.ROOM_PX_W;
  /** Actual pixel height after build — may differ from static defaults. */
  builtPxH = ItemWorldGhostOverlay.ROOM_PX_H;

  private _targetAlpha = 0;
  private _fadeSpeed   = 0;
  private tiles: TileEntry[] = [];
  private itemDisplays: GhostItemDisplay[] = [];
  private collisionGrid: number[][] = [];
  private buildQueue: TileEntry[] = [];
  private buildQueueElapsed = 0;
  private tileBuildCallback: ((col: number, row: number, value: number) => void) | null = null;
  private scaleBirth: ScaleBirthState | null = null;
  private tilePalette: GhostTilePalette = DEFAULT_TILE_PALETTE;
  private paletteRequestId = 0;

  constructor() {
    this.container = new Container();
    this.container.alpha = 0;
    this.itemContainer = new Container();
    this.itemContainer.alpha = 0;
  }

  /**
   * Builds from a raw LDtk collisionGrid.
   * Values: 0=air (transparent), 1=solid wall, 2=water, 3=platform, others=wall.
   */
  buildFromGrid(grid: number[][], gridW: number, gridH: number): void {
    this._clearItemDisplays();
    this.container.removeChildren();
    this.tiles = [];
    this.buildQueue = [];
    this.buildQueueElapsed = 0;
    this.collisionGrid = [];
    this.builtPxW = gridW * TILE_PX;
    this.builtPxH = gridH * TILE_PX;

    for (let r = 0; r < gridH; r++) {
      const sourceRow: number[] = [];
      for (let c = 0; c < gridW; c++) {
        const t = grid[r]?.[c] ?? 0;
        sourceRow.push(t);
        if (t === 0) continue;
        this._addTile(c, r, t, t === 3 ? 'platform' : 'wall');
      }
      this.collisionGrid.push(sourceRow);
    }
  }

  /**
   * Builds from the legacy template generator (fallback when no LDtk level available).
   */
  build(item: ItemInstance, stratumIndex = 0): void {
    this._clearItemDisplays();
    this.container.removeChildren();
    this.tiles = [];
    this.buildQueue = [];
    this.buildQueueElapsed = 0;
    this.collisionGrid = [];

    const seed = (item.uid * 1000 + stratumIndex * 7919) >>> 0;
    const iwGrid = generateItemWorldGrid(3, 3, seed);
    const startCell = iwGrid.startCell;
    if (!startCell.template) return;

    const rng = new PRNG(seed ^ 0x9E3779B9);
    const tiles = resolveTiles(startCell.template.grid, rng);
    this.collisionGrid = tiles.map(row => [...row]);

    this.builtPxW = TEMPLATE_W * TILE_PX;
    this.builtPxH = TEMPLATE_H * TILE_PX;

    for (let r = 0; r < TEMPLATE_H; r++) {
      for (let c = 0; c < TEMPLATE_W; c++) {
        const t = tiles[r]?.[c] ?? 1;
        if (t === 0) continue;
        this._addTile(c, r, t, t === 3 ? 'platform' : 'wall');
      }
    }
  }

  setShardSourceWorld(worldX: number, worldY: number): void {
    const sourceX = worldX - this.container.x;
    const sourceY = worldY - this.container.y;
    for (const tile of this.tiles) {
      const scatterX = ((tile.col * 37 + tile.row * 11) % 17 - 8) * 5;
      const scatterY = ((tile.col * 13 + tile.row * 29) % 13 - 6) * 4;
      tile.fromX = sourceX - tile.cx + scatterX;
      tile.fromY = sourceY - tile.cy + scatterY;
      tile.spin = ((tile.col + tile.row) % 2 === 0 ? 1 : -1) *
        (0.5 + ((tile.col * 5 + tile.row * 3) % 7) * 0.1);
    }
  }

  setTileBuildCallback(callback: ((col: number, row: number, value: number) => void) | null): void {
    this.tileBuildCallback = callback;
  }

  getCollisionGrid(): number[][] {
    return this.collisionGrid;
  }

  applyItemPalette(item: ItemInstance, onPalette?: (palette: GhostTilePalette) => void): void {
    const requestId = ++this.paletteRequestId;
    void extractItemPalette(item).then((palette) => {
      if (!palette || requestId !== this.paletteRequestId || this.container.destroyed) return;
      this.tilePalette = palette;
      this.redrawAllTiles();
      this.redrawAllParticles();
      onPalette?.(palette);
    }).catch(() => {
      // Missing or unreadable item art should keep the default ghost palette.
    });
  }

  getTilePalette(): GhostTilePalette {
    return this.tilePalette;
  }

  revealTilesNear(playerLocalX: number, playerLocalY: number, radiusPx = REVEAL_RADIUS, immediate = false): void {
    const radiusSq = radiusPx * radiusPx;
    for (const tile of this.tiles) {
      const dx = playerLocalX - tile.cx;
      const dy = playerLocalY - tile.cy;
      if (dx * dx + dy * dy > radiusSq) continue;
      tile.queued = false;
      tile.revealed = true;
      tile.collisionStamped = true;
      if (immediate) {
        tile.scale = 1;
        tile.gfx.x = tile.cx;
        tile.gfx.y = tile.cy;
        tile.gfx.rotation = 0;
        tile.gfx.alpha = 1;
        tile.gfx.scale.set(1);
      }
    }
    if (this.buildQueue.length > 0) {
      this.buildQueue = this.buildQueue.filter(tile => !tile.revealed);
    }
  }

  revealAllTiles(): void {
    this.buildQueue = [];
    this.buildQueueElapsed = 0;
    for (const tile of this.tiles) {
      tile.queued = false;
      tile.revealed = true;
      tile.collisionStamped = true;
      tile.scale = 1;
      tile.gfx.x = tile.cx;
      tile.gfx.y = tile.cy;
      tile.gfx.rotation = 0;
      tile.gfx.alpha = 1;
      tile.gfx.scale.set(1);
    }
  }

  beginScaleBirth(originWorldX: number, originWorldY: number, durationMs: number): void {
    this.beginScaleBirthFromPivot(originWorldX, originWorldY, durationMs);
  }

  beginScaleBirthFromPivot(
    pivotWorldX: number,
    pivotWorldY: number,
    durationMs: number,
    revealAll = true,
  ): void {
    // revealAll=false 면 바닥을 미리 조립하지 않고, 플레이어가 다가가며
    // proximity 로 타일이 조립된다.
    if (revealAll) this.revealAllTiles();
    for (const display of this.itemDisplays) {
      display.scaleFactor = Math.max(display.scaleFactor, SCALE_BIRTH_ITEM_FINAL_SCALE);
    }
    this.scaleBirth = {
      finalX: this.container.x,
      finalY: this.container.y,
      originX: pivotWorldX,
      originY: pivotWorldY,
      pivotLocalX: pivotWorldX - this.container.x,
      pivotLocalY: pivotWorldY - this.container.y,
      elapsedMs: 0,
      durationMs: Math.max(1, durationMs),
    };
    this.applyScaleBirthTransform(0);
    const initialTileAlpha = this.getScaleBirthTileAlpha();
    for (const tile of this.tiles) tile.gfx.alpha = initialTileAlpha;
  }

  projectFinalWorldPointToCurrentBirth(finalWorldX: number, finalWorldY: number): { x: number; y: number } {
    if (!this.scaleBirth) return { x: finalWorldX, y: finalWorldY };
    const birth = this.scaleBirth;
    const localX = finalWorldX - birth.finalX;
    const localY = finalWorldY - birth.finalY;
    const scale = this.container.scale.x;
    return {
      x: birth.originX + (localX - birth.pivotLocalX) * scale,
      y: birth.originY + (localY - birth.pivotLocalY) * scale,
    };
  }

  private _addTile(col: number, row: number, value: number, kind: TileKind): void {
    const gfx = new Graphics();
    gfx.pivot.set(HALF_TILE, HALF_TILE);
    gfx.x = col * TILE_PX + HALF_TILE;
    gfx.y = row * TILE_PX + HALF_TILE;
    gfx.scale.set(0);
    this.container.addChild(gfx);
    const entry: TileEntry = {
      gfx,
      col,
      row,
      value,
      cx: col * TILE_PX + HALF_TILE,
      cy: row * TILE_PX + HALF_TILE,
      fromX: -72 - (col % 6) * 6,
      fromY: ((row % 7) - 3) * 7,
      spin: ((col + row) % 2 === 0 ? 1 : -1) * (0.35 + ((col * 5 + row * 3) % 5) * 0.08),
      kind,
      scale: 0,
      queued: false,
      revealed: false,
      collisionStamped: false,
    };
    this.drawTile(entry);
    this.tiles.push(entry);
  }

  addItemDisplay(x: number, y: number, item: ItemInstance, scaleFactor = 4, rotate = false): void {
    const display: GhostItemDisplay = {
      container: new Container(),
      particleLayer: new Container(),
      sprite: null,
      particles: [],
      scaleFactor,
      rotate,
      elapsedMs: 0,
    };
    display.container.x = x;
    display.container.y = y;
    display.container.addChild(display.particleLayer);
    this.itemDisplays.push(display);
    this.itemContainer.addChild(display.container);
    this._createConstructionParticles(display);

    const iconPath = assetPath(`assets/items/${item.def.id}.png`);
    void Assets.load<Texture>(iconPath).then(tex => {
      if (!this.itemDisplays.includes(display) || display.container.destroyed) return;
      tex.source.scaleMode = 'nearest';
      const sprite = new Sprite(tex);
      sprite.anchor.set(0.5, 0.5);
      sprite.scale.set(scaleFactor);
      display.sprite = sprite;
      display.container.addChild(sprite);
    }).catch(() => {
      // Missing item art should not break the ghost overlay.
    });
  }

  /**
   * Begin linearly fading container alpha to `target` over `durationMs` ms.
   * Pass durationMs = 0 for an instant snap.
   */
  fadeTo(target: number, durationMs: number): void {
    if (durationMs <= 0) {
      this.container.alpha = target;
      this.itemContainer.alpha = target;
      this._targetAlpha   = target;
      this._fadeSpeed     = 0;
      return;
    }
    const delta = target - this.container.alpha;
    this._targetAlpha = target;
    this._fadeSpeed   = delta / durationMs;
  }

  /**
   * Call every frame with elapsed ms.
   * playerLocalX/Y: player position in this container's local space.
   * Tiles within 4 tiles of the player reveal themselves (scale 0→1).
   */
  update(dt: number, playerLocalX?: number, playerLocalY?: number, revealEnabled = true): void {
    // Container alpha fade
    if (this.container.alpha !== this._targetAlpha) {
      const next = this.container.alpha + this._fadeSpeed * dt;
      this.container.alpha = this._fadeSpeed > 0
        ? Math.min(this._targetAlpha, next)
        : Math.max(this._targetAlpha, next);
      this.itemContainer.alpha = this.container.alpha;
    }

    this.updateScaleBirth(dt);

    for (const display of this.itemDisplays) {
      display.elapsedMs += dt;
      this._updateConstructionParticles(display, dt);
      if (display.sprite) {
        const phase = display.elapsedMs * 0.0025;
        const pulse = this.scaleBirth ? 1 : 1 + 0.1 * (Math.sin(phase) * Math.sin(phase));
        display.sprite.scale.set(display.scaleFactor * pulse);
        if (display.rotate) display.sprite.rotation += dt * 0.00015;
      }
      this.applyScaleBirthItemTint(display);
    }

    // Per-tile proximity reveal + scale animation
    if (revealEnabled && playerLocalX !== undefined && playerLocalY !== undefined) {
      let queuedAny = false;
      for (const tile of this.tiles) {
        if (tile.revealed || tile.queued) continue;
        const dx = playerLocalX - tile.cx;
        const dy = playerLocalY - tile.cy;
        if (dx * dx + dy * dy <= REVEAL_RADIUS_SQ) {
          tile.queued = true;
          this.buildQueue.push(tile);
          queuedAny = true;
        }
      }
      if (queuedAny) {
        this.buildQueue.sort((a, b) =>
          this._tileRevealPriority(a, playerLocalX, playerLocalY) -
          this._tileRevealPriority(b, playerLocalX, playerLocalY)
        );
        if (this.buildQueueElapsed <= 0) this.buildQueueElapsed = TILE_REVEAL_INTERVAL_MS;
      }
      this.buildQueueElapsed += dt;
      if (this.buildQueueElapsed >= TILE_REVEAL_INTERVAL_MS && this.buildQueue.length > 0) {
        this.buildQueueElapsed = 0;
        this._revealNextQueuedTile();
      }
    }

    const step = SCALE_RATE_PER_MS * dt;
    for (const tile of this.tiles) {
      if (tile.revealed && tile.scale < 1) {
        tile.scale = Math.min(1, tile.scale + step);
      }
      if (tile.revealed) {
        const settle = tile.scale * tile.scale * (3 - 2 * tile.scale);
        const inv = 1 - settle;
        tile.gfx.x = tile.cx + tile.fromX * inv;
        tile.gfx.y = tile.cy + tile.fromY * inv;
        tile.gfx.rotation = tile.spin * inv;
        tile.gfx.alpha = this.scaleBirth
          ? this.getScaleBirthTileAlpha()
          : 0.55 + settle * 0.45;
        tile.gfx.scale.set(tile.scale);
        if (tile.scale >= 1 && !tile.collisionStamped) {
          tile.collisionStamped = true;
          this.tileBuildCallback?.(tile.col, tile.row, tile.value);
        }
      }
    }
  }

  private updateScaleBirth(dt: number): void {
    if (!this.scaleBirth) return;
    this.scaleBirth.elapsedMs += dt;
    const t = clamp01(this.scaleBirth.elapsedMs / this.scaleBirth.durationMs);
    this.applyScaleBirthTransform(t);
    if (t >= 1) {
      const birth = this.scaleBirth;
      this.scaleBirth = null;
      this.container.pivot.set(0, 0);
      this.container.scale.set(1);
      this.container.position.set(birth.finalX, birth.finalY);
      this.itemContainer.pivot.set(0, 0);
      this.itemContainer.scale.set(1);
      this.itemContainer.position.set(birth.finalX, birth.finalY);
      this.itemContainer.visible = false;
    }
  }

  private applyScaleBirthTransform(t: number): void {
    if (!this.scaleBirth) return;
    const birth = this.scaleBirth;
    const scale = SCALE_BIRTH_START_SCALE + growthScaleCurve(t) * (1 - SCALE_BIRTH_START_SCALE);
    this.container.pivot.set(birth.pivotLocalX, birth.pivotLocalY);
    this.container.position.set(birth.originX, birth.originY);
    this.container.scale.set(scale);
    this.itemContainer.pivot.set(birth.pivotLocalX, birth.pivotLocalY);
    this.itemContainer.position.set(birth.originX, birth.originY);
    this.itemContainer.scale.set(scale);
  }

  private getScaleBirthTileAlpha(): number {
    if (!this.scaleBirth) return 1;
    const visibleElapsed = this.scaleBirth.elapsedMs - SCALE_BIRTH_TILE_VISIBILITY_DELAY_MS;
    if (visibleElapsed <= 0) return 0;
    const visibleDuration = Math.max(1, this.scaleBirth.durationMs - SCALE_BIRTH_TILE_VISIBILITY_DELAY_MS);
    const t = clamp01(visibleElapsed / visibleDuration);
    const groupScale = SCALE_BIRTH_START_SCALE + growthScaleCurve(t) * (1 - SCALE_BIRTH_START_SCALE);
    return clamp01((groupScale - SCALE_BIRTH_START_SCALE) /
      (SCALE_BIRTH_TILE_ALPHA_FULL_SCALE - SCALE_BIRTH_START_SCALE));
  }

  private applyScaleBirthItemTint(display: GhostItemDisplay): void {
    if (!this.scaleBirth) return;
    const t = clamp01(this.scaleBirth.elapsedMs / this.scaleBirth.durationMs);
    const darkT = clamp01((t - 0.62) / 0.38);
    display.container.alpha = 1 - darkT * 0.85;
    display.particleLayer.alpha = (1 - darkT) * 0.22;
    if (display.sprite) {
      display.sprite.tint = grayTint(darkT);
    }
  }

  private _tileRevealPriority(tile: TileEntry, playerLocalX: number, playerLocalY: number): number {
    const ahead = Math.max(0, tile.cx - playerLocalX);
    const behindPenalty = tile.cx < playerLocalX - TILE_PX ? 180 : 0;
    return behindPenalty + ahead * 0.35 + Math.abs(tile.cy - playerLocalY) * 0.65 + tile.row * 0.02;
  }

  private _revealNextQueuedTile(): void {
    const tile = this.buildQueue.shift();
    if (!tile) return;
    tile.revealed = true;
  }

  destroy(): void {
    this._clearItemDisplays();
    this.tiles = [];
    this.buildQueue = [];
    this.tileBuildCallback = null;
    this.itemContainer.parent?.removeChild(this.itemContainer);
    this.itemContainer.destroy({ children: true });
    this.container.parent?.removeChild(this.container);
    this.container.destroy({ children: true });
  }

  private _createConstructionParticles(display: GhostItemDisplay): void {
    const colors = [this.tilePalette.highlight, this.tilePalette.particle, this.tilePalette.rim, 0xffffff];
    const count = 56;
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const size = 1.5 + (i % 4) * 0.8;
      const gfx = new Graphics();
      gfx.circle(0, 0, size).fill({ color: colors[i % colors.length], alpha: 1 });
      display.particleLayer.addChild(gfx);
      display.particles.push({
        gfx,
        angle: t * Math.PI * 2 + ((i * 37) % 19) * 0.018,
        radius: 20 + (i % 9) * 7,
        speed: 0.035 + (i % 7) * 0.008,
        size,
        phase: (i * 53) % 1000,
        color: colors[i % colors.length],
      });
    }
  }

  private redrawAllTiles(): void {
    for (const tile of this.tiles) this.drawTile(tile);
  }

  private drawTile(tile: TileEntry): void {
    const base = tile.kind === 'platform' ? this.tilePalette.platform : this.tilePalette.wall;
    tile.gfx.clear();
    tile.gfx.rect(0, 0, TILE_PX, TILE_PX).fill({ color: base, alpha: 1 });
  }

  private redrawAllParticles(): void {
    for (const display of this.itemDisplays) {
      const colors = [this.tilePalette.highlight, this.tilePalette.particle, this.tilePalette.rim, 0xffffff];
      for (let i = 0; i < display.particles.length; i++) {
        const particle = display.particles[i];
        particle.color = colors[i % colors.length];
        particle.gfx.clear();
        particle.gfx.circle(0, 0, particle.size).fill({ color: particle.color, alpha: 1 });
      }
    }
  }

  private _updateConstructionParticles(display: GhostItemDisplay, dt: number): void {
    const buildPulse = 1 + 0.12 * Math.sin(display.elapsedMs * 0.006);
    for (let i = 0; i < display.particles.length; i++) {
      const p = display.particles[i];
      p.radius += p.speed * dt;
      if (p.radius > 150) p.radius = 22 + (i % 5) * 5;
      const wobble = Math.sin((display.elapsedMs + p.phase) * 0.004) * 8;
      const radius = (p.radius + wobble) * buildPulse;
      p.gfx.x = Math.cos(p.angle) * radius;
      p.gfx.y = Math.sin(p.angle) * radius;
      const fade = 1 - Math.max(0, p.radius - 90) / 60;
      p.gfx.alpha = Math.max(0.18, Math.min(0.95, fade));
      p.gfx.scale.set(1 + 0.45 * Math.sin((display.elapsedMs + p.phase) * 0.009));
    }
    display.particleLayer.rotation += dt * 0.00018;
  }

  private _clearItemDisplays(): void {
    for (const display of this.itemDisplays) {
      display.container.parent?.removeChild(display.container);
      display.container.destroy({ children: true });
    }
    this.itemDisplays = [];
  }
}
