/**
 * ProceduralPrimitives — reusable procedural drawing functions for
 * ProceduralDecorator. Each function draws directly into a PixiJS Graphics
 * object using deterministic PRNG for reproducibility.
 *
 * All functions share the pattern:
 *   (gfx: Graphics, position/size params, style params, rng: PRNG) => void
 */

import type { Graphics } from 'pixi.js';
import type { PRNG } from '@utils/PRNG';

// ---------------------------------------------------------------------------
// 1. Catenary — physically correct hanging curve (parabolic approximation)
// ---------------------------------------------------------------------------

/** Sample a parabolic catenary at parameter t in [0,1]. */
function catenarySample(
  x0: number, y0: number, x1: number, y1: number, sag: number, t: number,
): [number, number] {
  const x = x0 + (x1 - x0) * t;
  const yBase = y0 + (y1 - y0) * t;
  // Parabola: peak sag at t=0.5, zero at t=0 and t=1
  const sagOffset = sag * 4 * t * (1 - t);
  return [x, yBase + sagOffset];
}

/**
 * Draw a catenary (hanging curve) between two points.
 * @param sag - downward sag in pixels at midpoint (positive = hangs down)
 * @param segments - curve smoothness (default 12)
 */
export function catenary(
  gfx: Graphics,
  x0: number, y0: number, x1: number, y1: number,
  sag: number, color: number, width: number,
  segments = 12,
): void {
  gfx.moveTo(x0, y0);
  for (let i = 1; i <= segments; i++) {
    const [x, y] = catenarySample(x0, y0, x1, y1, sag, i / segments);
    gfx.lineTo(x, y);
  }
  gfx.stroke({ width, color });
}

// ---------------------------------------------------------------------------
// 2. Chain Links — alternating oval links along a catenary path
// ---------------------------------------------------------------------------

/**
 * Draw chain links along a catenary curve. Each link alternates orientation
 * (vertical/horizontal) for 3D depth illusion.
 * @param linkW - link width
 * @param linkH - link height
 * @param linkCount - number of links (auto from distance if 0)
 */
export function chainLinks(
  gfx: Graphics,
  x0: number, y0: number, x1: number, y1: number,
  sag: number, linkW: number, linkH: number,
  color: number, strokeWidth: number,
  linkCount = 0,
): void {
  const dist = Math.hypot(x1 - x0, y1 - y0) + sag;
  const count = linkCount > 0 ? linkCount : Math.max(3, Math.floor(dist / (linkH * 1.2)));
  const segments = count * 4; // smooth path

  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const [cx, cy] = catenarySample(x0, y0, x1, y1, sag, t);

    // Tangent for rotation
    const dt = 0.01;
    const [ax, ay] = catenarySample(x0, y0, x1, y1, sag, Math.max(0, t - dt));
    const [bx, by] = catenarySample(x0, y0, x1, y1, sag, Math.min(1, t + dt));
    const angle = Math.atan2(by - ay, bx - ax);

    // Alternate link orientation: even = flat along chain, odd = perpendicular
    const isFlat = i % 2 === 0;
    const w = isFlat ? linkW : linkW * 0.6;
    const h = isFlat ? linkH : linkH * 0.6;

    // Draw rounded rect (ellipse approximation) rotated to tangent
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const hw = w / 2, hh = h / 2;

    // 8-point ellipse approximation
    const pts = 8;
    gfx.moveTo(
      cx + hw * cos - 0 * sin,
      cy + hw * sin + 0 * cos,
    );
    for (let p = 1; p <= pts; p++) {
      const a = (p / pts) * Math.PI * 2;
      const lx = Math.cos(a) * hw;
      const ly = Math.sin(a) * hh;
      gfx.lineTo(cx + lx * cos - ly * sin, cy + lx * sin + ly * cos);
    }
    gfx.stroke({ width: strokeWidth, color });
  }
}

// ---------------------------------------------------------------------------
// 3. Vine — recursive bezier with branching
// ---------------------------------------------------------------------------

/**
 * Draw an organic vine/tendril with recursive branching.
 * @param maxDepth - recursion limit (1=stem only, 2-3=branches)
 * @param thickness - base stroke width
 * @param branchChance - probability of branch at each segment (0-1)
 * @param leafSize - size of leaf at terminal points (0=no leaves)
 */
export function vine(
  gfx: Graphics,
  x0: number, y0: number, x1: number, y1: number,
  color: number, leafColor: number,
  maxDepth: number, thickness: number,
  branchChance: number, leafSize: number,
  rng: PRNG, _depth = 0,
): void {
  if (_depth > maxDepth) return;

  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len < 3) return;

  // Main stem: bezier with organic wobble
  const midX = (x0 + x1) / 2 + rng.nextFloat(-len * 0.2, len * 0.2);
  const midY = (y0 + y1) / 2 + rng.nextFloat(-len * 0.2, len * 0.2);

  const sw = Math.max(0.5, thickness * (1 - _depth * 0.35));

  gfx.moveTo(x0, y0);
  gfx.quadraticCurveTo(midX, midY, x1, y1);
  gfx.stroke({ width: sw, color });

  // Subdivide for branches
  const segs = Math.max(2, Math.ceil(len / 16));
  for (let i = 1; i < segs; i++) {
    if (rng.next() > branchChance) continue;

    const t = i / segs;
    // Point on bezier: B(t) = (1-t)^2*P0 + 2(1-t)t*Mid + t^2*P1
    const u = 1 - t;
    const bx = u * u * x0 + 2 * u * t * midX + t * t * x1;
    const by = u * u * y0 + 2 * u * t * midY + t * t * y1;

    // Branch direction: perpendicular + random
    const tang = Math.atan2(y1 - y0, x1 - x0);
    const side = rng.next() < 0.5 ? 1 : -1;
    const branchAngle = tang + side * rng.nextFloat(0.4, 1.2);
    const branchLen = len * rng.nextFloat(0.2, 0.45) * (1 - _depth * 0.3);

    const ex = bx + Math.cos(branchAngle) * branchLen;
    const ey = by + Math.sin(branchAngle) * branchLen;

    vine(gfx, bx, by, ex, ey, color, leafColor,
      maxDepth, thickness, branchChance * 0.6, leafSize,
      rng, _depth + 1);
  }

  // Leaf at terminal
  if (_depth >= maxDepth - 1 && leafSize > 0 && rng.next() < 0.7) {
    gfx.circle(x1, y1, leafSize * rng.nextFloat(0.6, 1.2));
    gfx.fill({ color: leafColor, alpha: rng.nextFloat(0.4, 0.8) });
  }
}

// ---------------------------------------------------------------------------
// 4. Crack — branching fracture network
// ---------------------------------------------------------------------------

/**
 * Draw a natural-looking crack with stochastic branching.
 * @param angle - initial direction in radians
 * @param length - total crack length
 * @param maxBranches - maximum branch count
 * @param baseWidth - starting stroke width (tapers to 0)
 */
export function crack(
  gfx: Graphics,
  x0: number, y0: number,
  angle: number, length: number,
  color: number, baseWidth: number,
  maxBranches: number, rng: PRNG,
  _depth = 0, _maxDepth = 3,
): void {
  if (_depth > _maxDepth || length < 2) return;

  const segments = Math.max(3, Math.ceil(length / 6));
  const segLen = length / segments;
  let cx = x0, cy = y0, dir = angle;
  let branches = 0;

  gfx.moveTo(cx, cy);

  for (let i = 0; i < segments; i++) {
    // Jitter direction
    dir += rng.nextFloat(-0.4, 0.4);
    cx += Math.cos(dir) * segLen;
    cy += Math.sin(dir) * segLen;
    gfx.lineTo(cx, cy);

    // Taper width
    const t = i / segments;
    const w = Math.max(0.3, baseWidth * (1 - t * 0.8));

    // Branch?
    if (branches < maxBranches && _depth < _maxDepth && rng.next() < 0.25) {
      branches++;
      const bDir = dir + rng.nextFloat(-0.6, 0.6);
      const bLen = length * rng.nextFloat(0.2, 0.4);
      // Stroke current segment before branching
      gfx.stroke({ width: w, color });
      crack(gfx, cx, cy, bDir, bLen, color, w * 0.7, 1, rng, _depth + 1, _maxDepth);
      gfx.moveTo(cx, cy);
    }
  }

  const finalW = Math.max(0.3, baseWidth * 0.2);
  gfx.stroke({ width: finalW, color });
}

// ---------------------------------------------------------------------------
// 5. Moss Cluster — Poisson-ish disc packing with falloff
// ---------------------------------------------------------------------------

/**
 * Draw a cluster of translucent circles simulating moss/lichen growth.
 * @param radius - cluster radius
 * @param density - number of circles to attempt
 * @param falloff - alpha reduction toward edges (0=none, 1=full)
 */
export function mossCluster(
  gfx: Graphics,
  cx: number, cy: number,
  radius: number, density: number,
  color: number, falloff: number,
  rng: PRNG,
): void {
  for (let i = 0; i < density; i++) {
    // Reject sampling within radius
    const angle = rng.nextFloat(0, Math.PI * 2);
    const dist = radius * Math.sqrt(rng.next()); // sqrt for uniform disc
    const px = cx + Math.cos(angle) * dist;
    const py = cy + Math.sin(angle) * dist;

    const r = rng.nextFloat(1, radius * 0.3);
    const distRatio = dist / radius;
    const alpha = Math.max(0.05, (1 - distRatio * falloff) * rng.nextFloat(0.15, 0.5));

    gfx.circle(px, py, r);
    gfx.fill({ color, alpha });
  }
}

// ---------------------------------------------------------------------------
// 6. Drip Trail — vertical liquid/rust stain with irregular width
// ---------------------------------------------------------------------------

/**
 * Draw a vertical drip trail (water stain, rust run, condensation).
 * Width varies organically along the path. Ends with a droplet.
 * @param maxWidth - maximum trail width
 * @param dropletSize - size of terminal droplet (0=none)
 */
export function dripTrail(
  gfx: Graphics,
  x: number, y0: number, y1: number,
  color: number, maxWidth: number, dropletSize: number,
  alpha: number, rng: PRNG,
): void {
  const len = Math.abs(y1 - y0);
  if (len < 4) return;
  const dir = y1 > y0 ? 1 : -1;
  const segments = Math.max(4, Math.ceil(len / 4));
  const segH = len / segments;

  // Build width profile with organic variation
  const widths: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    // Base: thin at top, wider in middle, thin at bottom
    const base = Math.sin(t * Math.PI) * maxWidth;
    widths.push(base * rng.nextFloat(0.3, 1.0));
  }

  // Draw as filled polygon (left edge + right edge)
  const leftPts: number[] = [];
  const rightPts: number[] = [];
  let cx = x;
  for (let i = 0; i <= segments; i++) {
    const y = y0 + i * segH * dir;
    cx += rng.nextFloat(-0.5, 0.5); // horizontal drift
    const hw = widths[i] / 2;
    leftPts.push(cx - hw, y);
    rightPts.push(cx + hw, y);
  }

  // Combine into closed polygon
  const pts = [...leftPts, ...rightPts.reverse()];
  gfx.poly(pts);
  gfx.fill({ color, alpha });

  // Terminal droplet
  if (dropletSize > 0) {
    const endY = y0 + len * dir;
    gfx.circle(cx, endY + dropletSize * 0.5 * dir, dropletSize);
    gfx.fill({ color, alpha: alpha * 1.2 });
  }
}

// ---------------------------------------------------------------------------
// 7. Rivet Line — evenly spaced bolt/rivet pattern with weathering
// ---------------------------------------------------------------------------

/**
 * Draw a line of rivets/bolts with optional weathering (missing rivets).
 * @param spacing - distance between rivets
 * @param rivetR - rivet radius
 * @param missingChance - probability each rivet is missing (weathered away)
 * @param jitter - positional jitter in pixels
 */
export function rivetLine(
  gfx: Graphics,
  x0: number, y0: number, x1: number, y1: number,
  spacing: number, rivetR: number,
  color: number, highlightColor: number,
  missingChance: number, jitter: number,
  rng: PRNG,
): void {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len < spacing) return;
  const count = Math.floor(len / spacing);
  const nx = dx / len, ny = dy / len;

  for (let i = 0; i <= count; i++) {
    if (rng.next() < missingChance) continue;

    const t = i / count;
    const px = x0 + nx * t * len + rng.nextFloat(-jitter, jitter);
    const py = y0 + ny * t * len + rng.nextFloat(-jitter, jitter);
    const r = rivetR * rng.nextFloat(0.8, 1.1);

    // Rivet body
    gfx.circle(px, py, r);
    gfx.fill(color);

    // Highlight dot (top-left light source)
    if (r > 1) {
      gfx.circle(px - r * 0.3, py - r * 0.3, r * 0.3);
      gfx.fill({ color: highlightColor, alpha: 0.4 });
    }
  }
}

// ---------------------------------------------------------------------------
// 8. Rust Bloom — spreading corrosion stain
// ---------------------------------------------------------------------------

/**
 * Draw a rust bloom: layered translucent irregular polygons spreading
 * from a center point, elongated downward (gravity + rain runoff).
 * @param radius - maximum bloom radius
 * @param layers - number of overlapping shapes (3-5 typical)
 */
export function rustBloom(
  gfx: Graphics,
  cx: number, cy: number,
  radius: number, layers: number,
  color: number, rng: PRNG,
): void {
  for (let l = 0; l < layers; l++) {
    const layerR = radius * (1 - l * 0.15);
    const pts: number[] = [];
    const verts = rng.nextInt(5, 8);

    for (let v = 0; v < verts; v++) {
      const angle = (v / verts) * Math.PI * 2 + rng.nextFloat(-0.3, 0.3);
      // Elongate downward: stretch Y for angles pointing down
      const yStretch = 1 + Math.max(0, Math.sin(angle)) * 0.6;
      const dist = layerR * rng.nextFloat(0.5, 1.0);

      pts.push(
        cx + Math.cos(angle) * dist,
        cy + Math.sin(angle) * dist * yStretch,
      );
    }

    gfx.poly(pts);
    gfx.fill({ color, alpha: rng.nextFloat(0.08, 0.2) });
  }

  // Dark center spot
  gfx.circle(cx + rng.nextFloat(-1, 1), cy + rng.nextFloat(-1, 1), radius * 0.2);
  gfx.fill({ color, alpha: 0.35 });
}
