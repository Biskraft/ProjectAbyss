import { Container, Graphics } from 'pixi.js';
import { destroyDisplayObject } from '../scenes/shared/DisplayObjectLifecycleHelpers';
import { clampEffect01 } from './EffectNumeric';

/**
 * Fluid residue ??small blots dropped on the floor by:
 *   1. Entity footsteps after leaving an oil / acid / magma pool
 *   2. Cell evaporation (FluidSystem thin-strip dry-up)
 *
 * Each blot is a per-pixel artifact (not cell-aligned). While alive, any
 * entity AABB-overlapping a blot receives the residue's effect:
 *   - oil   ??refresh slip debuff
 *   - acid  ??acid tick DOT
 *   - magma ??magma burn DOT (Burn refresh)
 *
 * Oil blots are flammable: a fire attack covering the blot ignites it; once
 * burning, it emits flame VFX + fire DOT until consumed.
 *
 * Adapted from the AshFootprint demo in docs/emergent-physics-sandbox.html.
 */

export type ResidueType = 'oil' | 'acid' | 'magma' | 'water' | 'cyro';

interface Blot {
  gfx: Graphics;
  x: number;
  y: number;
  type: ResidueType;
  age: number;
  /** Random base radius ??small variation so prints don't look stamped. */
  r: number;
  /**
   * 0..1 scalar baked at drop time. Captures how concentrated the residue
   * was: 1.0 right after touching the fluid, fading toward 0 as the
   * source debuff drains. Persists for the blot's lifetime.
   */
  intensity: number;
  /** Oil-only: ignited state. While true the blot deals fire DOT + draws flames. */
  burning: boolean;
  /** Time-to-burn-out (ms). Set to OIL_BURN_LIFE_MS on ignite. */
  burnRemaining: number;
}

// Tunables
const MIN_STEP_DIST = 6;     // pixels between drops
const LIFE_MS = 2000;        // base fade-out duration for non-burning blots (shorter so trails don't linger)
const OIL_LIFE_MS = 5000;    // oil slime matches OIL_SLIP_DURATION_MS (halved)
const MAX_BLOTS = 120;       // hard cap to keep render cheap
const OIL_BURN_LIFE_MS = 4000;

interface Palette {
  halo: number;
  outer: number;
  inner: number;
  sheen: number;
}
const PALETTE: Record<ResidueType, Palette> = {
  oil:   { halo: 0x281610, outer: 0x3a2618, inner: 0x0a0604, sheen: 0x8a6a3a },
  acid:  { halo: 0x2a4422, outer: 0x88cc44, inner: 0x2a4a1a, sheen: 0xaadd66 },
  magma: { halo: 0x551100, outer: 0xff6633, inner: 0x882211, sheen: 0xffcc66 },
  water: { halo: 0x2244aa, outer: 0x7297e5, inner: 0x1a3070, sheen: 0xd5f0ff },
  cyro:  { halo: 0x4080b0, outer: 0xa0e0f0, inner: 0x3070a0, sheen: 0xffffff },
};

/**
 * AABB hit test ??does an entity AABB cover this blot's pixel center?
 *
 * Uses INCLUSIVE bottom/right edges because blots are dropped exactly at
 * the entity's foot Y (= player.y + player.height). A strict `<` would miss
 * the foot-level pixel on every frame the player walks on flat ground, so
 * the contact effect would never fire.
 */
function aabbContainsPoint(
  ax: number, ay: number, aw: number, ah: number,
  px: number, py: number,
): boolean {
  return px >= ax && px <= ax + aw && py >= ay && py <= ay + ah;
}

function idleLifeFor(p: Blot): number {
  return p.type === 'oil' ? OIL_LIFE_MS : LIFE_MS;
}

export class FluidResidueManager {
  private parent: Container;
  private blots: Blot[] = [];
  /** Per-type last-drop pixel for distance gating. */
  private lastDrop: Record<ResidueType, { x: number; y: number }> = {
    oil:   { x: -9999, y: -9999 },
    acid:  { x: -9999, y: -9999 },
    magma: { x: -9999, y: -9999 },
    water: { x: -9999, y: -9999 },
    cyro:  { x: -9999, y: -9999 },
  };

  constructor(parent: Container) { this.parent = parent; }

  /**
   * Per-frame emit while a residue source is "wet" (slipping / acid-coated /
   * magma-coated). Pass `active=false` when the source is dry or in mid-air.
   *
   * `intensity` 0..1 ??pass `residueRemainingMs / sourceDurationMs` so first
   * prints right after fluid exit are vivid and later ones fade.
   */
  emit(
    type: ResidueType,
    footX: number, footY: number,
    active: boolean, grounded: boolean,
    intensity = 1.0,
  ): void {
    const last = this.lastDrop[type];
    if (!active || !grounded) {
      last.x = footX;
      last.y = footY;
      return;
    }
    const dx = footX - last.x;
    const dy = footY - last.y;
    if (dx * dx + dy * dy < MIN_STEP_DIST * MIN_STEP_DIST) return;
    this.dropAt(type, footX, footY, intensity);
    last.x = footX;
    last.y = footY;
  }

  /**
   * Direct drop ??used by FluidSystem evaporation (cell center + bottom),
   * and by `emit()` when the step distance gate clears.
   */
  dropAt(type: ResidueType, x: number, y: number, intensity = 1.0): void {
    const r = 3.0 + Math.random() * 1.6;
    const g = new Graphics();
    g.x = x;
    g.y = y;
    this.parent.addChild(g);
    this.blots.push({
      gfx: g,
      x, y,
      type,
      age: 0,
      r,
      intensity: clampEffect01(intensity),
      burning: false,
      burnRemaining: 0,
    });
    while (this.blots.length > MAX_BLOTS) {
      const old = this.blots.shift();
      if (old) {
        destroyDisplayObject(old.gfx);
      }
    }
  }

  update(dtMs: number): void {
    for (let i = this.blots.length - 1; i >= 0; i--) {
      const p = this.blots[i];
      p.age += dtMs;
      if (p.burning) {
        p.burnRemaining -= dtMs;
        this.drawBurningBlot(p);
        if (p.burnRemaining <= 0) {
          // Consumed by fire ??vanish completely.
          destroyDisplayObject(p.gfx);
          this.blots.splice(i, 1);
        }
        continue;
      }
      this.drawIdleBlot(p);
      if (p.age >= idleLifeFor(p)) {
        destroyDisplayObject(p.gfx);
        this.blots.splice(i, 1);
      }
    }
  }

  private drawIdleBlot(p: Blot): void {
    // Quick ramp-in then long fade-out.
    let alpha: number;
    if (p.age < 200) alpha = (p.age / 200) * 1.0;
    else {
      const life = idleLifeFor(p);
      alpha = 1.0 * (1 - (p.age - 200) / (life - 200));
    }
    alpha *= p.intensity;
    const pal = PALETTE[p.type];
    const r = p.r;
    p.gfx.clear();

    // Cyro: ?‘ì? 6-spoke ice ê²°ì • (puddle ?€??. ê²°ì • ??+ ë³?ëª¨ì–‘ 6 spoke.
    if (p.type === 'cyro') {
      const s = r * 0.9;
      // halo
      p.gfx.circle(0, 0, r * 0.9)
        .fill({ color: pal.halo, alpha: Math.max(0, alpha * 0.35) });
      // 6-spoke star (?˜ì§ + 2 ?€ê°ì„ )
      p.gfx.moveTo(0, -s).lineTo(0, s)
        .stroke({ color: pal.sheen, width: 0.9, alpha: Math.max(0, alpha) });
      p.gfx.moveTo(-s * 0.866, -s * 0.5).lineTo(s * 0.866, s * 0.5)
        .stroke({ color: pal.sheen, width: 0.9, alpha: Math.max(0, alpha) });
      p.gfx.moveTo(-s * 0.866, s * 0.5).lineTo(s * 0.866, -s * 0.5)
        .stroke({ color: pal.sheen, width: 0.9, alpha: Math.max(0, alpha) });
      // center dot
      p.gfx.circle(0, 0, r * 0.3)
        .fill({ color: pal.outer, alpha: Math.max(0, alpha * 0.9) });
      return;
    }

    // ê¸°ë³¸ ??water/oil/acid/magma ê³µìš© puddle.
    p.gfx.ellipse(0, 0, r * 1.6, r * 0.85)
      .fill({ color: pal.halo, alpha: Math.max(0, alpha * 0.45) });
    p.gfx.ellipse(0, 0, r, r * 0.55)
      .fill({ color: pal.outer, alpha: Math.max(0, alpha) });
    p.gfx.ellipse(0, -r * 0.05, r * 0.6, r * 0.38)
      .fill({ color: pal.inner, alpha: Math.max(0, alpha * 0.95) });
    p.gfx.circle(-r * 0.3, -r * 0.18, r * 0.22)
      .fill({ color: pal.sheen, alpha: Math.max(0, alpha * 0.9) });
  }

  private drawBurningBlot(p: Blot): void {
    // Lifetime alpha (4s linear fade).
    const lifeRatio = Math.max(0, p.burnRemaining / OIL_BURN_LIFE_MS);
    const r = p.r;
    p.gfx.clear();
    // Charred base (always visible while burning)
    p.gfx.ellipse(0, 0, r * 1.3, r * 0.6)
      .fill({ color: 0x0a0604, alpha: 0.95 });
    // ?€?€ Teardrop flame above the blot, single strand (small blot footprint) ?€?€
    const phase = p.age * 0.018;
    const wobble = 0.85 + Math.sin(phase) * 0.25;
    const flameH = r * 3.0 * wobble * lifeRatio;
    const flameW = r * 0.9 * (0.9 + Math.sin(phase * 1.4) * 0.18);
    const swayX = Math.sin(phase * 0.7) * 0.6;
    const cx = swayX;
    const baseY = 0;
    const drawTeardrop = (halfW: number, hScale: number, color: number, alpha: number) => {
      const hh = flameH * hScale;
      const tipY = baseY - hh;
      const midY = baseY - hh * 0.45;
      p.gfx.moveTo(cx - halfW, baseY);
      p.gfx.quadraticCurveTo(cx - halfW * 1.4, midY, cx, tipY);
      p.gfx.quadraticCurveTo(cx + halfW * 1.4, midY, cx + halfW, baseY);
      p.gfx.closePath();
      p.gfx.fill({ color, alpha: alpha * lifeRatio });
    };
    drawTeardrop(flameW * 1.20, 1.00, 0xff3311, 0.55);
    drawTeardrop(flameW * 0.85, 0.92, 0xff7722, 0.78);
    drawTeardrop(flameW * 0.55, 0.80, 0xffcc44, 0.85);
    drawTeardrop(flameW * 0.30, 0.62, 0xffffaa, 0.85);
    // Embers
    if (Math.random() < 0.5) {
      const ex = (Math.random() - 0.5) * r * 2;
      const ey = -flameH - Math.random() * 3;
      p.gfx.rect(ex | 0, ey | 0, 1, 1).fill({ color: 0xffee88, alpha: 0.95 });
    }
  }

  /**
   * Per-frame: scan all blots vs entity AABB and dispatch effects via cb.
   * `refreshOilSlip(ms)` is called once if any oil blot is touched; same
   * for acid/magma DOT callbacks.
   *
   * Burning oil blots emit fire DOT instead of slip refresh.
   */
  applyEffects(
    ax: number, ay: number, aw: number, ah: number,
    cb: {
      refreshOilSlip: (remainingMs: number) => void;
      onAcidContact: () => void;
      onMagmaContact: () => void;
      onFireContact: () => void;
    },
  ): void {
    let touchedOilRemaining = 0;
    let touchedAcid = false;
    let touchedMagma = false;
    let touchedFire = false;
    for (const p of this.blots) {
      if (!aabbContainsPoint(ax, ay, aw, ah, p.x, p.y)) continue;
      if (p.burning) { touchedFire = true; continue; }
      if (p.type === 'oil')   touchedOilRemaining = Math.max(touchedOilRemaining, idleLifeFor(p) - p.age);
      else if (p.type === 'acid')  touchedAcid = true;
      else if (p.type === 'magma') touchedMagma = true;
    }
    if (touchedOilRemaining > 0) cb.refreshOilSlip(touchedOilRemaining);
    if (touchedAcid)  cb.onAcidContact();
    if (touchedMagma) cb.onMagmaContact();
    if (touchedFire)  cb.onFireContact();
  }

  /**
   * Ignite oil blots whose pixel center falls inside the given AABB.
   * Used by fire attack handlers. Returns the number of blots ignited.
   */
  ignite(ax: number, ay: number, aw: number, ah: number): number {
    let n = 0;
    for (const p of this.blots) {
      if (p.type !== 'oil' || p.burning) continue;
      if (!aabbContainsPoint(ax, ay, aw, ah, p.x, p.y)) continue;
      p.burning = true;
      p.burnRemaining = OIL_BURN_LIFE_MS;
      n++;
    }
    return n;
  }

  clear(): void {
    for (const p of this.blots) {
      destroyDisplayObject(p.gfx);
    }
    this.blots.length = 0;
    for (const k of Object.keys(this.lastDrop) as ResidueType[]) {
      this.lastDrop[k] = { x: -9999, y: -9999 };
    }
  }
}


