/**
 * VoidDrop.ts -- Void fall sequence effect.
 *
 * Triggered when the player steps onto IntGrid value 10 (void).
 * Conveys the megastructure's terrifying scale -- the abyss has no bottom.
 *
 * Timeline (~3s):
 *   Phase 0: freeze    0~200ms     Input disabled, player drops off platform edge
 *   Phase 1: fall      200~2200ms  Camera zoom out, silhouette parallax scrolls up, wind audio
 *   Phase 2: engulf    2200~2800ms Black fog rises from below, swallows player
 *   Phase 3: black     2800~3200ms Full black hold
 *   Phase 4: done      Callback fires -> respawn at save point
 *
 * All visuals are positioned relative to camera each frame (screen-space overlay).
 * No damage. Pure environmental storytelling.
 */

import { Container, Graphics } from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../Game';
import type { Camera } from '@core/Camera';

export type VoidPhase = 'idle' | 'freeze' | 'fall' | 'engulf' | 'black' | 'done';

// Phase durations (ms)
const T_FREEZE = 200;
const T_FALL = 2000;
const T_ENGULF = 600;
const T_BLACK = 400;

// Fall visual params
const ZOOM_START = 1.0;
const ZOOM_END = 0.35;
const PLAYER_FALL_SPEED = 3.5; // px per frame (visual only)
const SILHOUETTE_COUNT = 8;
const SILHOUETTE_SCROLL_SPEED = 2.5; // px per frame (upward)

interface Silhouette {
  gfx: Graphics;
  /** Offset from camera view left */
  rx: number;
  /** Offset from camera view top */
  ry: number;
  width: number;
  height: number;
  scrollSpeed: number;
}

export class VoidDrop {
  readonly container: Container;
  phase: VoidPhase = 'idle';
  private timer = 0;

  // Visual layers
  private fogOverlay: Graphics;
  private blackOverlay: Graphics;
  private silhouettes: Silhouette[] = [];
  private silhouetteContainer: Container;

  // Camera-relative viewport size (updated each frame with zoom)
  private viewW = GAME_WIDTH;
  private viewH = GAME_HEIGHT;

  // Callbacks
  onZoom: ((zoom: number) => void) | null = null;
  onPlayerFall: ((dy: number) => void) | null = null;
  onComplete: (() => void) | null = null;

  get isDone(): boolean { return this.phase === 'done'; }

  constructor() {
    this.container = new Container();
    this.container.eventMode = 'none';

    // Silhouette layer (megastructure columns/girders passing by)
    this.silhouetteContainer = new Container();
    this.container.addChild(this.silhouetteContainer);
    this.buildSilhouettes();

    // Rising black fog
    this.fogOverlay = new Graphics();
    this.fogOverlay.alpha = 0;
    this.container.addChild(this.fogOverlay);

    // Full black screen
    this.blackOverlay = new Graphics();
    this.blackOverlay.alpha = 0;
    this.container.addChild(this.blackOverlay);

    // Start hidden
    this.silhouetteContainer.alpha = 0;
  }

  private buildSilhouettes(): void {
    for (let i = 0; i < SILHOUETTE_COUNT; i++) {
      const gfx = new Graphics();
      // Varied megastructure column shapes
      const w = 20 + Math.random() * 80;
      const h = 80 + Math.random() * 200;
      const depth = 0.3 + Math.random() * 0.7;

      // Dark silhouette with slight variation
      const shade = Math.floor(0x08 + Math.random() * 0x10);
      const color = (shade << 16) | (shade << 8) | shade;
      gfx.rect(0, 0, w, h).fill(color);

      // Add structural details (girder cross-beams)
      const beamShade = Math.min(0xff, shade + 0x06);
      const beamColor = (beamShade << 16) | (beamShade << 8) | beamShade;
      const beams = 1 + Math.floor(Math.random() * 3);
      for (let b = 0; b < beams; b++) {
        const by = h * (0.2 + (b / beams) * 0.6);
        gfx.rect(-w * 0.3, by, w * 1.6, 3).fill(beamColor);
      }

      // Position in screen-relative coordinates
      const rx = Math.random() * GAME_WIDTH;
      const ry = GAME_HEIGHT + Math.random() * 200;

      this.silhouettes.push({
        gfx, rx, ry, width: w, height: h,
        scrollSpeed: SILHOUETTE_SCROLL_SPEED * depth,
      });
      this.silhouetteContainer.addChild(gfx);
    }
  }

  start(): void {
    if (this.phase !== 'idle') return;
    this.phase = 'freeze';
    this.timer = 0;
  }

  update(dt: number, camera: Camera): void {
    if (this.phase === 'idle' || this.phase === 'done') return;
    this.timer += dt;

    // Viewport size changes with zoom
    this.viewW = GAME_WIDTH / camera.zoom;
    this.viewH = GAME_HEIGHT / camera.zoom;

    // Anchor overlay container to camera top-left (world coords)
    const camLeft = camera.renderX - this.viewW / 2;
    const camTop = camera.renderY - this.viewH / 2;
    this.container.x = camLeft;
    this.container.y = camTop;

    switch (this.phase) {
      case 'freeze':
        if (this.timer >= T_FREEZE) {
          this.phase = 'fall';
          this.timer = 0;
          this.silhouetteContainer.alpha = 1;
        }
        break;

      case 'fall': {
        const progress = Math.min(1, this.timer / T_FALL);
        // Ease-in-out zoom
        const eased = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        const zoom = ZOOM_START + (ZOOM_END - ZOOM_START) * eased;
        this.onZoom?.(zoom);

        // Player visual fall (accelerating)
        const fallAccel = 1 + progress * 2;
        this.onPlayerFall?.(PLAYER_FALL_SPEED * fallAccel * (dt / 16.6667));

        // Scroll silhouettes upward (structures passing by)
        for (const s of this.silhouettes) {
          s.ry -= s.scrollSpeed * fallAccel * (dt / 16.6667);
          // Position in world coords via camera-relative offset
          s.gfx.x = s.rx * (this.viewW / GAME_WIDTH);
          s.gfx.y = s.ry * (this.viewH / GAME_HEIGHT);
          // Recycle silhouettes that scroll off the top
          if (s.ry + s.height < -50) {
            s.ry = GAME_HEIGHT + 50 + Math.random() * 100;
            s.rx = Math.random() * GAME_WIDTH;
          }
        }

        // Slight fog buildup at the end of fall phase
        if (progress > 0.7) {
          const fogProgress = (progress - 0.7) / 0.3;
          this.drawFog(fogProgress * 0.3);
        }

        if (this.timer >= T_FALL) {
          this.phase = 'engulf';
          this.timer = 0;
        }
        break;
      }

      case 'engulf': {
        const progress = Math.min(1, this.timer / T_ENGULF);
        // Black fog rises from bottom, filling the screen
        const eased = 1 - Math.pow(1 - progress, 3);
        this.drawFog(0.3 + eased * 0.7);
        this.blackOverlay.alpha = eased * eased;

        // Continue silhouette scroll (slowing down)
        const slowdown = 1 - progress * 0.8;
        for (const s of this.silhouettes) {
          s.ry -= s.scrollSpeed * slowdown * (dt / 16.6667);
          s.gfx.x = s.rx * (this.viewW / GAME_WIDTH);
          s.gfx.y = s.ry * (this.viewH / GAME_HEIGHT);
        }

        if (this.timer >= T_ENGULF) {
          this.phase = 'black';
          this.timer = 0;
          this.blackOverlay.alpha = 1;
        }
        break;
      }

      case 'black':
        if (this.timer >= T_BLACK) {
          this.phase = 'done';
          this.onComplete?.();
        }
        break;
    }
  }

  private drawFog(intensity: number): void {
    this.fogOverlay.clear();
    const w = this.viewW;
    const h = this.viewH;
    // Darkness rises from below; lower bands are denser and more opaque.
    const bands = 8;
    const fogTop = h * (1 - intensity);
    const fogH = h - fogTop;
    for (let i = 0; i < bands; i++) {
      const t0 = i / bands;
      const t1 = (i + 1) / bands;
      const bandY = fogTop + fogH * t0;
      const bandH = Math.max(1, fogH / bands * 1.15);
      const alpha = clamp01(intensity * (0.15 + t1 * 0.85));
      this.fogOverlay.rect(0, bandY, w, bandH).fill({ color: 0x000000, alpha });
    }
    this.fogOverlay.alpha = 1;

    // Black overlay also needs to cover the zoomed-out viewport
    this.blackOverlay.clear();
    this.blackOverlay.rect(0, 0, w, h).fill(0x000000);
  }

  destroy(): void {
    for (const s of this.silhouettes) s.gfx.destroy();
    this.silhouettes = [];
    this.fogOverlay.destroy();
    this.blackOverlay.destroy();
    this.silhouetteContainer.destroy({ children: true });
    this.container.destroy({ children: true });
  }
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
