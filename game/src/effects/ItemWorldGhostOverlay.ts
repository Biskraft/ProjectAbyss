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
const TILE_REVEAL_INTERVAL_MS = 36;
const SCALE_RATE_PER_MS = 1 / 400;       // 0→1 in 400ms per tile

// Wall silhouette colors — near-black, just enough hue to read as "dungeon"
const COLOR_WALL = 0x07071a;
const COLOR_PLAT = 0x0c0c24;

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
        this._addTile(c, r, t, t === 3 ? COLOR_PLAT : COLOR_WALL);
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
        this._addTile(c, r, t, t === 3 ? COLOR_PLAT : COLOR_WALL);
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

  private _addTile(col: number, row: number, value: number, color: number): void {
    const gfx = new Graphics();
    gfx.rect(0, 0, TILE_PX, TILE_PX).fill({ color });
    gfx.pivot.set(HALF_TILE, HALF_TILE);
    gfx.x = col * TILE_PX + HALF_TILE;
    gfx.y = row * TILE_PX + HALF_TILE;
    gfx.scale.set(0);
    this.container.addChild(gfx);
    this.tiles.push({
      gfx,
      col,
      row,
      value,
      cx: col * TILE_PX + HALF_TILE,
      cy: row * TILE_PX + HALF_TILE,
      fromX: -72 - (col % 6) * 6,
      fromY: ((row % 7) - 3) * 7,
      spin: ((col + row) % 2 === 0 ? 1 : -1) * (0.35 + ((col * 5 + row * 3) % 5) * 0.08),
      scale: 0,
      queued: false,
      revealed: false,
      collisionStamped: false,
    });
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

    for (const display of this.itemDisplays) {
      display.elapsedMs += dt;
      this._updateConstructionParticles(display, dt);
      if (display.sprite) {
        const phase = display.elapsedMs * 0.0025;
        const pulse = 1 + 0.1 * (Math.sin(phase) * Math.sin(phase));
        display.sprite.scale.set(display.scaleFactor * pulse);
        if (display.rotate) display.sprite.rotation += dt * 0.00015;
      }
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
        tile.gfx.alpha = 0.55 + settle * 0.45;
        tile.gfx.scale.set(tile.scale);
        if (tile.scale >= 1 && !tile.collisionStamped) {
          tile.collisionStamped = true;
          this.tileBuildCallback?.(tile.col, tile.row, tile.value);
        }
      }
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
    const colors = [0xfff1a0, 0xffb84a, 0x66d9ff, 0xffffff];
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
