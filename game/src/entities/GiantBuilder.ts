/**
 * GiantBuilder — A massive Builder entity rendered from a separate LDtk level.
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

// ---------------------------------------------------------------------------
// BuilderLight — blinking indicator on the builder body
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

export interface BuilderRoutePoint {
  y: number;
  waitMs: number;
}

type BuilderState = 'moving' | 'waiting' | 'dormant';

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
  private lights: BuilderLightDef[] = [];
  private lightTime = 0;
  /** Unfiltered container for light graphics — sits above palette-filtered layers
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

  constructor(
    level: LdtkLevel,
    atlases: Record<string, Texture>,
    bgAreaId: string,
    wallAreaId: string,
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
    const defaultBgTileset = 'atlas/SunnyLand_by_Ansimuz-extended.png';
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
    this.legRig = new LegRig(mounts);
    this.container.addChildAt(this.legRig.container, 0);
    this.container.addChild(this.legRig.frontContainer);
    this.legRig.update(0); // initial pose (gait phase 0, no advance)

    // Procedural decorations on the builder body — same Z layout as the host
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
    // Bloom shader on all lights — makes them glow like real indicators
    if (this.lights.length > 0) {
      this.lightContainer.filters = [new GlowFilter({
        color: 0xE87830,
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
   *     - Angle  (Float, degrees) — direction from shoulder to foot.
   *                0 = right, 90 = down, 180 = left, -90 = up.
   *     - Phase  (Float, optional, 0..1) — gait offset; auto-distributed if null.
   *     - Mirror        (Bool, optional) — flip stride direction.
   *     - ForwardRender (Bool, optional) — render this leg in front of the
   *                       body tilemap (default: behind).
   *     - Length (Float, optional, cells) — planted-foot reach (×16 → px).
   *                Scales the whole leg so the foot can rest on a specific
   *                surface without tilting the mount via Angle.
   *     - FootX  (Float, optional, body-local cells) — lock foot to this
   *                column (×16 → px). Use to snap feet to a vertical wall.
   *                Overrides Angle/Length when set.
   *     - FootY  (Float, optional, body-local cells) — lock foot to this
   *                row (×16 → px). Use to snap feet to a horizontal floor.
   *                Overrides Angle/Length when set.
   */
  private static extractLegMounts(level: LdtkLevel): LegMount[] {
    return level.entities
      .filter((e) => e.type === 'LegMount')
      .map((e) => {
        const angleDeg = typeof e.fields.Angle === 'number' ? e.fields.Angle : 90;
        const phase = typeof e.fields.Phase === 'number' ? e.fields.Phase : undefined;
        const mirror = typeof e.fields.Mirror === 'boolean' ? e.fields.Mirror : false;
        const forwardRender = typeof e.fields.ForwardRender === 'boolean' ? e.fields.ForwardRender : false;
        // Length is authored in cells (×16 → px) for editor-friendly sizing.
        const length = typeof e.fields.Length === 'number' && e.fields.Length > 0
          ? e.fields.Length * TILE
          : undefined;
        // FootX / FootY are authored in cells for editor-friendly snapping;
        // convert to body-local pixels for the IK anchor.
        const footAnchorX = typeof e.fields.FootX === 'number' ? e.fields.FootX * TILE : undefined;
        const footAnchorY = typeof e.fields.FootY === 'number' ? e.fields.FootY * TILE : undefined;
        return {
          x: e.px[0],
          y: e.px[1],
          angle: (angleDeg * Math.PI) / 180,
          phase,
          mirror,
          forwardRender,
          length,
          footAnchorX,
          footAnchorY,
        };
      });
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

  /** True while the builder is actively traveling between route points. */
  get isMoving(): boolean {
    return this.state === 'moving';
  }

  update(dt: number): void {
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

    if (this.state === 'dormant' || this.route.length === 0) return;

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
