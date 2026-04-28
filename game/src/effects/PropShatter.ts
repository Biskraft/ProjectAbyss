/**
 * PropShatter.ts — Destruction burst for breakable props.
 *
 * When a prop breaks, instead of just disappearing it spits out:
 *   1. A quick white impact ring
 *   2. Four sprite-quadrant chunks sliced from the prop's texture (artifacts only)
 *   3. Color flecks (always — sourced from the prop's palette)
 *   4. A slow-rising dust puff
 *
 * Chunks fall with gravity and rotate, giving a "thing just smashed apart"
 * feel that makes destruction satisfying.
 */

import { Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';

type Node = Container;

interface Chunk {
  node: Node;
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  rotSpeed: number;
  life: number;
  maxLife: number;
  fade: 'linear' | 'late';
  /** When set, node is a ring/puff that scales up over its lifetime. */
  scaleMaxR?: number;
}

export class PropShatterManager {
  private parent: Container;
  private chunks: Chunk[] = [];

  constructor(parent: Container) {
    this.parent = parent;
  }

  /**
   * Spawn a prop-break burst at the prop's bounding box.
   * `tex` (when provided) is sliced into 4 quadrants for sprite-chunk debris.
   */
  spawn(
    propX: number, propY: number, propW: number, propH: number,
    baseColor: number, accentColor: number,
    tex: Texture | null,
  ): void {
    const cx = propX + propW / 2;
    const cy = propY + propH / 2;

    // 1) Impact ring
    const ring = new Graphics();
    ring.circle(0, 0, 6).stroke({ color: 0xffffff, width: 2, alpha: 0.95 });
    ring.x = cx; ring.y = cy;
    this.parent.addChild(ring);
    this.chunks.push({
      node: ring, x: cx, y: cy, vx: 0, vy: 0, gravity: 0,
      rotSpeed: 0, life: 200, maxLife: 200, fade: 'linear', scaleMaxR: 22,
    });

    // 2) Sprite-quadrant chunks
    if (tex) {
      const halfW = Math.max(1, Math.floor(tex.frame.width / 2));
      const halfH = Math.max(1, Math.floor(tex.frame.height / 2));
      const fb = tex.frame;
      const quads: Array<{ fx: number; fy: number; sx: number; sy: number }> = [
        { fx: 0,     fy: 0,     sx: -1, sy: -1 },
        { fx: halfW, fy: 0,     sx:  1, sy: -1 },
        { fx: 0,     fy: halfH, sx: -1, sy:  1 },
        { fx: halfW, fy: halfH, sx:  1, sy:  1 },
      ];
      for (const q of quads) {
        const sub = new Texture({
          source: tex.source,
          frame: new Rectangle(fb.x + q.fx, fb.y + q.fy, halfW, halfH),
        });
        const sp = new Sprite(sub);
        sp.anchor.set(0.5);
        const startX = cx + q.sx * (halfW / 2);
        const startY = cy + q.sy * (halfH / 2);
        sp.x = startX; sp.y = startY;
        this.parent.addChild(sp);
        const angle = Math.atan2(q.sy, q.sx) + (Math.random() - 0.5) * 0.6;
        const speed = 110 + Math.random() * 110;
        this.chunks.push({
          node: sp, x: startX, y: startY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 90,
          gravity: 320,
          rotSpeed: (Math.random() - 0.5) * 9,
          life: 700 + Math.random() * 400,
          maxLife: 1100,
          fade: 'late',
        });
      }
    }

    // 3) Color flecks (smaller pool when sprite chunks are present)
    const fleckCount = tex ? 6 : 12;
    for (let i = 0; i < fleckCount; i++) {
      const angle = (i / fleckCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.7;
      const speed = 70 + Math.random() * 110;
      const g = new Graphics();
      const sz = 2 + Math.floor(Math.random() * 2);
      const color = Math.random() < 0.5 ? baseColor : accentColor;
      g.rect(-sz / 2, -sz / 2, sz, sz).fill(color);
      g.rect(-sz / 2, -sz / 2, sz, sz).stroke({ color: 0x000000, width: 1, alpha: 0.5 });
      g.x = cx; g.y = cy;
      this.parent.addChild(g);
      this.chunks.push({
        node: g, x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        gravity: 280,
        rotSpeed: (Math.random() - 0.5) * 10,
        life: 400 + Math.random() * 220,
        maxLife: 620,
        fade: 'late',
      });
    }

    // 4) Dust puff (slow expanding circle)
    const puff = new Graphics();
    puff.circle(0, 0, 4).fill({ color: 0xb0a090, alpha: 0.55 });
    puff.x = cx; puff.y = cy;
    this.parent.addChild(puff);
    this.chunks.push({
      node: puff, x: cx, y: cy, vx: 0, vy: -22,
      gravity: -10, rotSpeed: 0,
      life: 380, maxLife: 380, fade: 'linear', scaleMaxR: 18,
    });
  }

  update(dt: number): void {
    const dtSec = dt / 1000;
    for (let i = this.chunks.length - 1; i >= 0; i--) {
      const c = this.chunks[i];
      c.life -= dt;
      c.x += c.vx * dtSec;
      c.y += c.vy * dtSec;
      c.vy += c.gravity * dtSec;
      c.vx *= 0.97;
      c.node.x = c.x;
      c.node.y = c.y;
      if (c.rotSpeed) c.node.rotation += c.rotSpeed * dtSec;

      const k = Math.max(0, c.life / c.maxLife);
      if (c.scaleMaxR) {
        const scale = 1 + (1 - k) * (c.scaleMaxR / 6);
        c.node.scale.set(scale);
      }
      c.node.alpha = c.fade === 'linear' ? k : (k < 0.4 ? k / 0.4 : 1);

      if (c.life <= 0) {
        if (c.node.parent) c.node.parent.removeChild(c.node);
        c.node.destroy();
        this.chunks.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const c of this.chunks) {
      if (c.node.parent) c.node.parent.removeChild(c.node);
      c.node.destroy();
    }
    this.chunks = [];
  }
}
