/**
 * LegRig — Procedural N-leg IK rig for the GiantBuilder, driven by
 * author-placed mount points.
 *
 * Each LegMount specifies:
 *   x, y     — shoulder position in body-local pixels
 *   angle    — radians; rotation of the leg's local "down" axis. The foot
 *              reaches in this direction from the shoulder, and the gait
 *              strides perpendicular to it (90° CW from outward).
 *              0       → foot reaches RIGHT, walks UP
 *              π/2     → foot reaches DOWN, walks RIGHT (standard side-view)
 *              π       → foot reaches UP, walks LEFT
 *              -π/2    → foot reaches LEFT, walks DOWN
 *              (Use mirror=true to reverse the stride direction.)
 *   phase    — 0..1 gait offset. Defaults to index/N, producing a wave.
 *   mirror   — flip stride X. Useful when the desired walk direction is
 *              opposite the default for the chosen angle.
 *   length   — optional per-leg planted-foot reach (px) along local +Y.
 *              All segment / stride / lift values scale proportionally with
 *              length / DEFAULT_STAND_DIST so each leg's silhouette stays in
 *              proportion. Use this to make feet contact the ground without
 *              rotating the whole leg via angle.
 *
 * Gait: each leg cycles between SWING (foot arcs forward in local +X with
 * a sin lift) and PLANT (foot drags backward in local -X). Cumulative body
 * displacement drives the cycle phase.
 *
 * IK: 2-segment chain solved in the leg's local frame by law of cosines.
 * Knee solution with smaller local X is chosen so knees bend backward
 * (AT-AT / mech silhouette) regardless of mount orientation.
 */

import { Container, Graphics } from 'pixi.js';

const COL_LIMB = 0x4a4a52;
const COL_JOINT = 0xe87830;
const COL_FOOT = 0x1a1a1a;

// Default proportions, sized for the 768×1152 builder body.
const DEFAULT_UPPER_LEN = 280;
const DEFAULT_LOWER_LEN = 340;
const DEFAULT_STAND_DIST = 520;  // foot reach along leg's local +Y when planted
const DEFAULT_STRIDE = 280;      // foot travel along leg's local X per cycle
const DEFAULT_SWING_LIFT = 200;  // peak retraction along leg's local -Y during swing
const SWING_PORTION = 0.18;
const GAIT_DISTANCE = 280;       // body-px per full gait cycle

// Foot brick — the leg's lower limb attaches to the ankle (top of the brick),
// and the brick's far face rests flat on the surface point the IK targets.
// FOOT_THICKNESS is the dimension along the leg; FOOT_LENGTH is along the
// surface. Tall, narrow stance: thickness = 2 × length.
const FOOT_THICKNESS = 160;
const FOOT_LENGTH = 80;

export interface LegMount {
  x: number;
  y: number;
  angle: number;     // radians
  phase?: number;    // 0..1
  mirror?: boolean;
  forwardRender?: boolean;   // render in front of body (instead of behind)
  length?: number;   // planted reach in px (defaults to DEFAULT_STAND_DIST)
  /**
   * Optional body-local foot anchor. When set, IK aims the foot at this point
   * during PLANT and overrides the authored `angle` / `length`. The leg's
   * effective angle becomes mount→anchor and the reach becomes the distance.
   * Either coordinate may be set independently to lock to a wall (FootX) or
   * floor (FootY); the other axis falls back to the mount's coordinate.
   */
  footAnchorX?: number;
  footAnchorY?: number;
}

interface ResolvedMount {
  x: number;
  y: number;
  angle: number;
  phase: number;
  mirror: boolean;
  forwardRender: boolean;
  // Per-leg scaled IK parameters (derived from `length`).
  upperLen: number;
  lowerLen: number;
  maxReach: number;
  standDist: number;
  stride: number;
  swingLift: number;
}

export class LegRig {
  /** Back layer — sits behind the builder body tilemap. */
  readonly container: Container;
  /** Front layer — sits in front of the body. Used by mounts with
   *  forwardRender=true so authors can show the full leg silhouette in front
   *  of the body tilemap (otherwise legs render behind it). */
  readonly frontContainer: Container;
  private mounts: ResolvedMount[];
  private gfx: Graphics[] = [];
  private phase = 0;
  private cumulativeDist = 0;

  constructor(mounts: LegMount[]) {
    this.container = new Container();
    this.frontContainer = new Container();
    const n = Math.max(1, mounts.length);
    this.mounts = mounts.map((m, i) => {
      // Resolve effective angle and reach.
      // If a foot anchor is provided, the leg aims at that body-local point
      // and the authored `angle`/`length` are ignored — the foot snaps onto
      // the surface the anchor sits on.
      let standDist: number;
      let angle: number;
      const anchorX = m.footAnchorX;
      const anchorY = m.footAnchorY;
      if (anchorX !== undefined || anchorY !== undefined) {
        const tx = anchorX ?? m.x;
        const ty = anchorY ?? m.y + DEFAULT_STAND_DIST;
        const dx = tx - m.x;
        const dy = ty - m.y;
        standDist = Math.max(1, Math.hypot(dx, dy));
        angle = Math.atan2(dy, dx);
      } else {
        standDist = m.length && m.length > 0 ? m.length : DEFAULT_STAND_DIST;
        angle = m.angle;
      }
      const scale = standDist / DEFAULT_STAND_DIST;
      const upperLen = DEFAULT_UPPER_LEN * scale;
      const lowerLen = DEFAULT_LOWER_LEN * scale;
      return {
        x: m.x,
        y: m.y,
        angle,
        phase: m.phase ?? (i / n),
        mirror: m.mirror ?? false,
        forwardRender: m.forwardRender ?? false,
        upperLen,
        lowerLen,
        maxReach: upperLen + lowerLen - 6,
        standDist,
        stride: DEFAULT_STRIDE * scale,
        swingLift: DEFAULT_SWING_LIFT * scale,
      };
    });
    for (const m of this.mounts) {
      const g = new Graphics();
      const target = m.forwardRender ? this.frontContainer : this.container;
      target.addChild(g);
      this.gfx.push(g);
    }
  }

  /**
   * Advance gait by absolute body movement (px). Direction-agnostic;
   * only travelled distance drives the cycle.
   */
  update(bodyDelta: number): void {
    this.cumulativeDist += Math.abs(bodyDelta);
    this.phase = (this.cumulativeDist / GAIT_DISTANCE) % 1;

    for (let i = 0; i < this.mounts.length; i++) {
      const m = this.mounts[i];
      const localPhase = (this.phase + m.phase) % 1;

      // Foot position in the leg's LOCAL frame (down=+Y, forward=+X).
      let lx: number;
      let ly: number;
      if (localPhase < SWING_PORTION) {
        const t = localPhase / SWING_PORTION;
        lx = -m.stride * 0.5 + m.stride * t;
        ly = m.standDist - Math.sin(t * Math.PI) * m.swingLift;
      } else {
        const t = (localPhase - SWING_PORTION) / (1 - SWING_PORTION);
        lx = m.stride * 0.5 - m.stride * t;
        ly = m.standDist;
      }
      if (m.mirror) lx = -lx;

      // Clamp foot reach in local frame so IK stays solvable.
      let d = Math.hypot(lx, ly);
      if (d > m.maxReach) {
        const k = m.maxReach / d;
        lx *= k; ly *= k; d = m.maxReach;
      }
      if (d < 1) { this.gfx[i].clear(); continue; }

      const ik = this.solveLocal(lx, ly, d, m.mirror, m.upperLen, m.lowerLen);

      // Rotate local frame so that the leg's local +Y aligns with the mount's
      // angle direction in body-local space. alpha = angle - π/2.
      const alpha = m.angle - Math.PI / 2;
      const ca = Math.cos(alpha);
      const sa = Math.sin(alpha);
      const kx = m.x + ik.kx * ca - ik.ky * sa;
      const ky = m.y + ik.kx * sa + ik.ky * ca;
      const fx = m.x + lx * ca - ly * sa;
      const fy = m.y + lx * sa + ly * ca;

      // Foot rotation is decoupled from the leg axis — the brick stays
      // axis-aligned (long axis horizontal, short axis vertical) so it
      // always lies flat on a horizontal floor regardless of how the leg
      // is tilted by FootX/FootY. Ankle is therefore directly above the
      // sole by FOOT_THICKNESS in body-local space.
      const ankleX = fx;
      const ankleY = fy - FOOT_THICKNESS;

      this.drawLeg(this.gfx[i], m.x, m.y, kx, ky, ankleX, ankleY, fx, fy);
    }
  }

  /**
   * 2-segment IK in local frame. Knees bend backward relative to the stride
   * direction: when mirror=false, stride is local +X, so the knee is placed
   * on the -X side (smaller local X). When mirror=true, stride is local -X,
   * so the knee is placed on the +X side (larger local X). Without this
   * mirror-aware selection, mirrored legs would bend their knees forward,
   * defeating the visual purpose of the mirror flag.
   */
  private solveLocal(
    lx: number, ly: number, d: number, mirror: boolean,
    upperLen: number, lowerLen: number,
  ): { kx: number; ky: number } {
    const baseAng = Math.atan2(ly, lx);
    const cosLaw = (upperLen * upperLen + d * d - lowerLen * lowerLen) / (2 * upperLen * d);
    const a = Math.acos(Math.max(-1, Math.min(1, cosLaw)));
    const k1x = Math.cos(baseAng + a) * upperLen;
    const k2x = Math.cos(baseAng - a) * upperLen;
    const pickFirst = mirror ? (k1x > k2x) : (k1x < k2x);
    const kAng = pickFirst ? (baseAng + a) : (baseAng - a);
    return {
      kx: Math.cos(kAng) * upperLen,
      ky: Math.sin(kAng) * upperLen,
    };
  }

  private drawLeg(
    g: Graphics,
    sx: number, sy: number,
    kx: number, ky: number,
    ax: number, ay: number,   // ankle (lower-limb endpoint, top of foot)
    fx: number, fy: number,   // sole midpoint (on the surface)
  ): void {
    g.clear();
    g.moveTo(sx, sy).lineTo(kx, ky).stroke({ width: 72, color: COL_LIMB });
    g.moveTo(kx, ky).lineTo(ax, ay).stroke({ width: 56, color: COL_LIMB });
    g.circle(sx, sy, 48).fill(COL_JOINT);
    g.circle(kx, ky, 40).fill(COL_JOINT);

    // Foot brick — always axis-aligned to body-local (≈ world) axes:
    // long side along X (= along the floor), short side along Y. This keeps
    // the foot flat on a horizontal surface regardless of leg tilt.
    const halfL = FOOT_LENGTH * 0.5; // along floor (X)
    const halfT = FOOT_THICKNESS * 0.5; // perpendicular to floor (Y)
    const cx = fx;
    const cy = fy - halfT; // sole sits at fy; brick center is halfT above
    g.rect(cx - halfL, cy - halfT, FOOT_LENGTH, FOOT_THICKNESS).fill(COL_FOOT);
  }
}
