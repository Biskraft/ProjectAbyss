import { Container, Graphics } from 'pixi.js';

/**
 * Hollow Knight—style hit effect.
 *
 * Architecture (catalog: game/docs/ui-components.html#hit-effect):
 *   1. MAIN SLASH  — ONE continuous thick line through the hit center (no gap),
 *                    angled toward the attack direction (dirX biased).
 *   2. CROSS LINES — N thinner lines crossing the hit center, each WITH a center
 *                    gap. Cross count is dynamically capped via segLen threshold
 *                    so a too-large gap never produces invisible stubs.
 *                    Center reads as "main only" — subs approach but don't touch.
 *   3. DEBRIS      — small dark radial particles drifting outward with gravity,
 *                    plus optional bright sparks for heavy hits.
 *
 * Burst (orange forge tone) and screen-flash are intentionally NOT in this
 * effect — heavy hits route through ScreenFlash separately.
 *
 * Same API as before: spawn(x, y, heavy, dirX) and update(dt). All 30+ call
 * sites in scenes/* continue to work unchanged.
 */

type FxKind = 'main' | 'cross-seg' | 'debris';

interface Fx {
  gfx: Graphics;
  kind: FxKind;
  age: number;
  maxLife: number;
  startDelay: number;
  // debris-only
  vx: number;
  vy: number;
}

interface Variant {
  mainLen: number;
  mainThick: number;
  crossCount: number;
  crossLen: number;
  crossThick: number;
  gap: number;
  debrisCount: number;
  debrisSpread: number;
  sparkCount: number;
}

const VARIANTS: Record<'light' | 'heavy', Variant> = {
  light: {
    mainLen: 80,  mainThick: 4,
    crossCount: 2, crossLen: 36, crossThick: 2,
    gap: 8,
    debrisCount: 4, debrisSpread: 44,
    sparkCount: 0,
  },
  heavy: {
    // 2026-05-23 사용자 결정: critical/3타 hit effect 크기 2배 — 단, 두께는
    // 원본 유지(절반으로 다시 줄임). 길고 가는 라인이 더 날카로운 인상.
    // count(crossCount/debrisCount/sparkCount) 는 그대로 — 시각 노이즈 증가 회피.
    mainLen: 256, mainThick: 6,                  // len×2, thick=원본
    crossCount: 3, crossLen: 112, crossThick: 3, // len×2, thick=원본
    gap: 24,                                      // 12 × 2
    debrisCount: 8, debrisSpread: 128,            // 64 × 2
    sparkCount: 2,
  },
};

const MAIN_LIFE_MS   = 220;
const CROSS_LIFE_MS  = 180;
const DEBRIS_LIFE_MS = 320;

// Main-slash angle pool — biased toward attack direction (dirX).
// Right-facing: -30° ~ +30° (mostly horizontal, slight diagonals).
// Left-facing: 150° ~ -150° (mirror).
// Vertical (±90°) avoided — collides with character silhouette.
const RIGHT_DEG = [-30, -25, -20, -15, -5, 5, 15, 20, 25, 30];
const LEFT_DEG  = [150, 155, 160, 165, 175, -175, -165, -160, -155, -150];

function pickMainAngle(dirX: number): number {
  let pool: number[];
  if (dirX > 0.1) pool = RIGHT_DEG;
  else if (dirX < -0.1) pool = LEFT_DEG;
  else pool = RIGHT_DEG.concat(LEFT_DEG);
  const deg = pool[Math.floor(Math.random() * pool.length)]
            + (Math.random() - 0.5) * 6;
  return (deg * Math.PI) / 180;
}

// Cross-line offsets relative to main angle.
// ±45° / ±60° / ±90° / ±120° / ±135° — avoids 0/180 (same axis as main).
const CROSS_OFFSET_DEG = [-135, -120, -90, -60, -45, 45, 60, 90, 120, 135];

function pickCrossOffsets(n: number): number[] {
  const pool = CROSS_OFFSET_DEG.slice();
  const out: number[] = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(((pool[idx] + (Math.random() - 0.5) * 18) * Math.PI) / 180);
    pool.splice(idx, 1);
  }
  return out;
}

// Dynamic cap on cross count based on visible segment length.
// segLen = (crossLen/2) - gap. When the gap eats most of the cross length,
// reduce count so we don't render imperceptible stubs.
function effectiveCrossCount(v: Variant): number {
  const segLen = v.crossLen / 2 - v.gap;
  if (segLen < 1.5) return 0;
  if (segLen < 4)   return Math.min(v.crossCount, 1);
  if (segLen < 6)   return Math.min(v.crossCount, 2);
  if (segLen < 9)   return Math.min(v.crossCount, 3);
  return v.crossCount;
}

export class HitSparkManager {
  private parent: Container;
  private fx: Fx[] = [];

  constructor(parent: Container) {
    this.parent = parent;
  }

  /**
   * Spawn a hit burst at (x, y).
   * @param heavy true for 3—/critical/heavy attacks (larger slash, more debris).
   * @param dirX  knockback direction (-1, 0, +1) — biases the main slash angle.
   */
  spawn(x: number, y: number, heavy: boolean, dirX: number): void {
    const v = VARIANTS[heavy ? 'heavy' : 'light'];

    // — Main slash — continuous line through hit center, attack-direction biased.
    const mainAngle = pickMainAngle(dirX);
    const mainLen = v.mainLen * (1 + (Math.random() - 0.5) * 0.2);  // ±10%
    this.spawnMain(x, y, mainAngle, mainLen, v.mainThick);

    // — Cross lines — with center gap, dynamically-capped count, per-cross clamp.
    // — Debris — dark radial particles + optional yellow sparks for heavy.
    for (let i = 0; i < v.debrisCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = v.debrisSpread * (0.5 + Math.random() * 0.8);
      this.spawnDebris(x, y, ang, dist, false);
    }
    for (let i = 0; i < v.sparkCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = v.debrisSpread * 0.7 * (0.6 + Math.random() * 0.5);
      this.spawnDebris(x, y, ang, dist, true);
    }
  }

  // ────────── Spawn helpers ──────────

  private spawnMain(cx: number, cy: number, ang: number, L: number, T: number): void {
    const gfx = new Graphics();
    // Lens-shaped slash — pointy tips, fat middle (Dead Cells / HK style).
    // 6-point poly: tapered 20% on each end, 60% flat in the middle.
    const Tout = T + 1;
    const Tin = T * 0.7;
    gfx.poly([
      -L / 2,     0,
      -L * 0.30, -Tout / 2,
       L * 0.30, -Tout / 2,
       L / 2,     0,
       L * 0.30,  Tout / 2,
      -L * 0.30,  Tout / 2,
    ]).fill({ color: 0xffffff, alpha: 0.32 });
    gfx.poly([
      -L / 2,     0,
      -L * 0.30, -Tin / 2,
       L * 0.30, -Tin / 2,
       L / 2,     0,
       L * 0.30,  Tin / 2,
      -L * 0.30,  Tin / 2,
    ]).fill({ color: 0xffffff, alpha: 0.95 });
    gfx.x = cx;
    gfx.y = cy;
    gfx.rotation = ang;
    gfx.scale.set(0.05, 2.4);
    gfx.alpha = 0;
    this.parent.addChild(gfx);
    this.fx.push({
      gfx, kind: 'main',
      age: 0, maxLife: MAIN_LIFE_MS, startDelay: 0,
      vx: 0, vy: 0,
    });
  }

  private spawnCrossLine(cx: number, cy: number, ang: number,
                          totalLen: number, T: number, gap: number,
                          delay: number): void {
    const segLen = totalLen / 2 - gap;
    if (segLen < 1.5) return;
    this.spawnCrossSegment(cx, cy, ang,            segLen, T, gap, delay);
    this.spawnCrossSegment(cx, cy, ang + Math.PI,  segLen, T, gap, delay);
  }

  private spawnCrossSegment(cx: number, cy: number, ang: number,
                             L: number, T: number, gap: number,
                             delay: number): void {
    const cos = Math.cos(ang);
    const sin = Math.sin(ang);
    const gfx = new Graphics();
    // Origin at inner (gap) edge: draw from x=0 to x=L. Lens shape — both ends taper.
    // 6-point poly: tapered 15% on each end, 70% flat in the middle.
    const Tout = T + 0.6;
    const Tin = T * 0.7;
    gfx.poly([
      0,          0,
      L * 0.15, -Tout / 2,
      L * 0.85, -Tout / 2,
      L,          0,
      L * 0.85,  Tout / 2,
      L * 0.15,  Tout / 2,
    ]).fill({ color: 0xffffff, alpha: 0.28 });
    gfx.poly([
      0,          0,
      L * 0.15, -Tin / 2,
      L * 0.85, -Tin / 2,
      L,          0,
      L * 0.85,  Tin / 2,
      L * 0.15,  Tin / 2,
    ]).fill({ color: 0xffffff, alpha: 0.9 });
    gfx.x = cx + cos * gap;
    gfx.y = cy + sin * gap;
    gfx.rotation = ang;
    gfx.scale.set(0.05, 1.6);
    gfx.alpha = 0;
    this.parent.addChild(gfx);
    this.fx.push({
      gfx, kind: 'cross-seg',
      age: 0, maxLife: CROSS_LIFE_MS, startDelay: delay,
      vx: 0, vy: 0,
    });
  }

  private spawnDebris(cx: number, cy: number, ang: number, dist: number,
                       isSpark: boolean): void {
    const cos = Math.cos(ang);
    const sin = Math.sin(ang);
    const size = isSpark ? 3 : 2.4 + Math.random() * 1.6;
    const gfx = new Graphics();
    const color = isSpark ? 0xfff2c4 : 0x0a0a14;
    gfx.circle(0, 0, size).fill({ color, alpha: 1 });
    gfx.x = cx;
    gfx.y = cy;
    this.parent.addChild(gfx);
    // Outward velocity sized so particle reaches ~dist over its lifetime.
    const life = DEBRIS_LIFE_MS * (0.7 + Math.random() * 0.4);
    const speed = (dist / life) * 1000;
    this.fx.push({
      gfx, kind: 'debris',
      age: 0, maxLife: life, startDelay: 0,
      vx: cos * speed,
      vy: sin * speed + 24,  // slight downward bias (gravity hint)
    });
  }

  // ────────── Per-frame update ──────────

  update(dt: number): void {
    const dtSec = dt / 1000;
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      // startDelay defers the visual but the slot stays reserved.
      if (f.startDelay > 0) {
        f.startDelay -= dt;
        if (f.startDelay > 0) continue;
      }
      f.age += dt;
      const t = Math.min(1, f.age / f.maxLife);

      if (f.kind === 'main') {
        this.applyMainAnim(f.gfx, t);
      } else if (f.kind === 'cross-seg') {
        this.applyCrossAnim(f.gfx, t);
      } else {
        // debris
        f.gfx.x += f.vx * dtSec;
        f.gfx.y += f.vy * dtSec;
        f.vx *= 0.92;
        f.vy = f.vy * 0.94 + 220 * dtSec;
        f.gfx.alpha = 1 - t;
        f.gfx.scale.set(0.9 - t * 0.4);
      }

      if (f.age >= f.maxLife) {
        if (f.gfx.parent) f.gfx.parent.removeChild(f.gfx);
        f.gfx.destroy();
        this.fx.splice(i, 1);
      }
    }
  }

  // Mirrors CSS keyframe `he-main-slash-anim` from the catalog.
  // scaleX 0.05 — 1.0 — 1.04 — 1.08 — 1.12
  // scaleY 2.4  — 1.3 — 1.0  — 0.55 — 0.15
  // alpha  0    — 1   — 1    — 0.75 — 0
  private applyMainAnim(gfx: Graphics, t: number): void {
    let sx: number, sy: number, a: number;
    if (t < 0.13) {
      const k = t / 0.13;
      sx = 0.05 + 0.95 * k; sy = 2.4 - 1.1 * k; a = k;
    } else if (t < 0.45) {
      const k = (t - 0.13) / 0.32;
      sx = 1.0 + 0.04 * k;  sy = 1.3 - 0.3 * k; a = 1;
    } else if (t < 0.75) {
      const k = (t - 0.45) / 0.30;
      sx = 1.04 + 0.04 * k; sy = 1.0 - 0.45 * k; a = 1 - 0.25 * k;
    } else {
      const k = (t - 0.75) / 0.25;
      sx = 1.08 + 0.04 * k; sy = 0.55 - 0.40 * k; a = 0.75 - 0.75 * k;
    }
    gfx.scale.set(sx, sy);
    gfx.alpha = Math.max(0, a);
  }

  // Mirrors `he-segment-cross-anim`. Inner-edge anchored sweep.
  private applyCrossAnim(gfx: Graphics, t: number): void {
    let sx: number, sy: number, a: number;
    if (t < 0.20) {
      const k = t / 0.20;
      sx = 0.08 + 0.92 * k; sy = 1.6 - 0.6 * k; a = k;
    } else if (t < 0.65) {
      const k = (t - 0.20) / 0.45;
      sx = 1.0 + 0.04 * k;  sy = 1.0 - 0.3 * k; a = 1 - 0.2 * k;
    } else {
      const k = (t - 0.65) / 0.35;
      sx = 1.04 + 0.06 * k; sy = 0.7 - 0.55 * k; a = 0.8 - 0.8 * k;
    }
    gfx.scale.set(sx, sy);
    gfx.alpha = Math.max(0, a);
  }
}
