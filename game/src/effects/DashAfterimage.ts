import { Container, Sprite, Graphics, type Texture } from 'pixi.js';

/**
 * Dash afterimage — leaves a trail of fading silhouettes behind the player
 * while the dash state is active.
 *
 * Two visual modes:
 *   1) Textured silhouette — clones the player's current erda atlas frame
 *      (Sprite) with a cyan tint + additive-like alpha fade.
 *   2) Fallback rectangle — if the atlas hasn't loaded yet (texture null),
 *      use a tinted rectangle matching the player's collision size.
 *
 * Spawn cadence is throttled by SPAWN_INTERVAL so the trail stays readable.
 */

interface Afterimage {
  node: Sprite | Graphics;
  life: number;
  maxLife: number;
}

const LIFE_MS = 220;
const SPAWN_INTERVAL = 24; // ms between spawns (~6 per dash at 150ms duration)
const TINT = 0x7fd4ff;     // pale cyan (spike: echo/trail palette)

export class DashAfterimageManager {
  private parent: Container;
  private trails: Afterimage[] = [];
  private spawnTimer = 0;

  constructor(parent: Container) {
    this.parent = parent;
  }

  /**
   * Spawn an afterimage silhouette at the player's current position.
   *
   * @param x entity.x (top-left)
   * @param y entity.y (top-left)
   * @param w entity.width
   * @param h entity.height
   * @param facingRight whether the player is facing right (for mirror)
   * @param texture optional erda atlas frame; if omitted, uses a rect fallback.
   * @param anchorX Sprite anchor.x used when texture is provided (typically 0.5).
   * @param anchorY Sprite anchor.y used when texture is provided (typically 1).
   * @param spriteCenterOffsetX offset from entity.x to sprite center (for anchoring)
   * @param spriteFootY world y of the sprite's anchor foot (entity.y + height)
   */
  spawnAt(
    x: number, y: number, w: number, h: number,
    facingRight: boolean,
    texture: Texture | null,
    spriteCenterX: number,
    spriteFootY: number,
  ): void {
    let node: Sprite | Graphics;
    if (texture) {
      const s = new Sprite(texture);
      s.anchor.set(0.5, 1);
      s.x = spriteCenterX;
      s.y = spriteFootY;
      s.scale.x = facingRight ? 1 : -1;
      s.tint = TINT;
      node = s;
    } else {
      const g = new Graphics();
      g.rect(0, 0, w, h).fill({ color: TINT, alpha: 0.6 });
      g.x = x;
      g.y = y;
      node = g;
    }
    node.alpha = 0.55;
    this.parent.addChild(node);
    this.trails.push({ node, life: LIFE_MS, maxLife: LIFE_MS });
  }

  /**
   * Call each frame. If `dashing` is true, spawns afterimages on cadence;
   * always updates existing trails regardless.
   */
  tick(
    dt: number,
    dashing: boolean,
    spawnArgs: () => {
      x: number; y: number; w: number; h: number;
      facingRight: boolean;
      texture: Texture | null;
      spriteCenterX: number;
      spriteFootY: number;
    },
  ): void {
    this.update(dt);
    if (dashing) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = SPAWN_INTERVAL;
        const a = spawnArgs();
        this.spawnAt(a.x, a.y, a.w, a.h, a.facingRight, a.texture, a.spriteCenterX, a.spriteFootY);
      }
    } else {
      this.spawnTimer = 0; // reset so the first dash frame spawns immediately
    }
  }

  update(dt: number): void {
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const t = this.trails[i];
      t.life -= dt;
      const k = Math.max(0, t.life / t.maxLife);
      t.node.alpha = k * 0.55;
      if (t.life <= 0) {
        if (t.node.parent) t.node.parent.removeChild(t.node);
        t.node.destroy();
        this.trails.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const t of this.trails) {
      if (t.node.parent) t.node.parent.removeChild(t.node);
      t.node.destroy();
    }
    this.trails.length = 0;
    this.spawnTimer = 0;
  }
}
