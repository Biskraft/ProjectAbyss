/**
 * LegRig — Procedural N-leg IK rig for the GiantBuilder, driven by
 * author-placed mount points and rendered with sprites from the
 * builder_leg_01 atlas.
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
 *
 * Rendering: 5 sprites per leg from builder_leg_01 atlas (shoulder, knee,
 * upper_limb, lower_limb, foot). Limb sprites scale.y with per-leg length;
 * limb rotation is recomputed each frame from the IK result. Atlas hot-
 * swap is supported via onLegSheetSwap — each sprite's texture re-binds
 * automatically on swap.
 */

import { Container, Sprite } from 'pixi.js';
import {
  loadBuilderLegSheet,
  getLegPart,
  isBuilderLegSheetLoaded,
  onLegSheetSwap,
  type LegPartName,
} from './builderLegAtlas';

// Default proportions, sized for the 768×1152 builder body. Sprite source
// dimensions match these defaults so a leg using `length === DEFAULT_STAND_DIST`
// renders at sprite scale 1.
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

/** Sprite set for one leg. */
interface LegSprites {
  shoulder: Sprite;
  upper: Sprite;
  knee: Sprite;
  lower: Sprite;
  foot: Sprite;
  /** Constant per-leg scale derived from m.upperLen / DEFAULT_UPPER_LEN. */
  upperScaleY: number;
  lowerScaleY: number;
}

export class LegRig {
  /** Back layer — sits behind the builder body tilemap. */
  readonly container: Container;
  /** Front layer — sits in front of the body. Used by mounts with
   *  forwardRender=true so authors can show the full leg silhouette in front
   *  of the body tilemap (otherwise legs render behind it). */
  readonly frontContainer: Container;
  private mounts: ResolvedMount[];
  private legs: LegSprites[] = [];
  private ready = false;
  private phase = 0;
  private cumulativeDist = 0;
  private unsubscribeSwap: (() => void) | null = null;

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

    // Atlas may already be loaded (boot preloaded) — build sprites synchronously
    // in that case so the very first update() shows full legs. Otherwise kick
    // off async load and populate when the texture arrives.
    if (isBuilderLegSheetLoaded()) {
      this.buildSprites();
      this.ready = true;
    } else {
      void this.bootstrap();
    }

    // Re-bind sprite textures whenever the atlas swaps to a variant sheet.
    this.unsubscribeSwap = onLegSheetSwap(() => this.refreshTextures());
  }

  private async bootstrap(): Promise<void> {
    await loadBuilderLegSheet();
    if (this.legs.length === 0) {
      this.buildSprites();
      this.ready = true;
    }
  }

  private buildSprites(): void {
    for (const m of this.mounts) {
      const upperScaleY = m.upperLen / DEFAULT_UPPER_LEN;
      const lowerScaleY = m.lowerLen / DEFAULT_LOWER_LEN;

      const shoulder = this.makeSprite('shoulder');
      const upper = this.makeSprite('upper_limb');
      const knee = this.makeSprite('knee');
      const lower = this.makeSprite('lower_limb');
      const foot = this.makeSprite('foot');

      // Per-leg constant scales (length variations baked once). Frame-to-frame
      // we only mutate position + rotation.
      upper.scale.set(1, upperScaleY);
      lower.scale.set(1, lowerScaleY);

      // Z-order: limb shafts and foot in the back, joint pads on top so the
      // joint art covers the limb's top cap seam.
      const legContainer = new Container();
      legContainer.addChild(upper);
      legContainer.addChild(lower);
      legContainer.addChild(foot);
      legContainer.addChild(shoulder);
      legContainer.addChild(knee);

      const target = m.forwardRender ? this.frontContainer : this.container;
      target.addChild(legContainer);

      this.legs.push({ shoulder, upper, knee, lower, foot, upperScaleY, lowerScaleY });
    }
  }

  private makeSprite(name: LegPartName): Sprite {
    const part = getLegPart(name);
    const s = new Sprite(part.texture);
    s.anchor.set(part.pivotX, part.pivotY);
    return s;
  }

  /** Re-bind sprite textures after a hot atlas swap. */
  private refreshTextures(): void {
    for (const leg of this.legs) {
      leg.shoulder.texture = getLegPart('shoulder').texture;
      leg.upper.texture    = getLegPart('upper_limb').texture;
      leg.knee.texture     = getLegPart('knee').texture;
      leg.lower.texture    = getLegPart('lower_limb').texture;
      leg.foot.texture     = getLegPart('foot').texture;
    }
  }

  /** Detach swap subscription. Call when the rig is destroyed. */
  destroy(): void {
    if (this.unsubscribeSwap) {
      this.unsubscribeSwap();
      this.unsubscribeSwap = null;
    }
  }

  private firstUpdateLogged = false;

  /**
   * Advance gait by absolute body movement (px). Direction-agnostic;
   * only travelled distance drives the cycle.
   */
  update(bodyDelta: number): void {
    this.cumulativeDist += Math.abs(bodyDelta);
    this.phase = (this.cumulativeDist / GAIT_DISTANCE) % 1;
    if (!this.ready) return;

    // One-shot debug — dumps the body-local positions / rotations / scales
    // for every leg on the first ready frame so visual mismatches can be
    // diagnosed against the IK math.
    const debug = !this.firstUpdateLogged;
    if (debug) this.firstUpdateLogged = true;

    for (let i = 0; i < this.mounts.length; i++) {
      const m = this.mounts[i];
      const sprites = this.legs[i];
      if (!sprites) continue;
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
      if (d < 1) {
        sprites.shoulder.visible = false;
        sprites.upper.visible = false;
        sprites.knee.visible = false;
        sprites.lower.visible = false;
        sprites.foot.visible = false;
        continue;
      }
      sprites.shoulder.visible = true;
      sprites.upper.visible = true;
      sprites.knee.visible = true;
      sprites.lower.visible = true;
      sprites.foot.visible = true;

      const ik = this.solveLocal(lx, ly, d, m.mirror, m.upperLen, m.lowerLen);

      // Rotate local frame so that the leg's local +Y aligns with the mount's
      // angle direction in body-local space. alpha = angle - π/2.
      const alpha = m.angle - Math.PI / 2;
      const ca = Math.cos(alpha);
      const sa = Math.sin(alpha);
      const sx = m.x;
      const sy = m.y;
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

      // Sprite layout:
      //   shoulder centered on (sx, sy)
      //   upper limb anchored top-center at (sx, sy), rotated to point at knee
      //   knee centered on (kx, ky)
      //   lower limb anchored top-center at (kx, ky), rotated to point at ankle
      //   foot anchored top-center at (ankleX, ankleY) — axis-aligned, no rotation
      //
      // PIXI rotation is clockwise from +X. With anchor (0.5, 0) the sprite's
      // default "down" direction is +Y, so atan2(dx, dy) maps that down vector
      // to the IK chain segment direction.
      sprites.shoulder.position.set(sx, sy);

      // Per-frame scale.y is rendered-distance / sprite-source-height.
      // We use the *actual* distance the sprite has to span — not the IK
      // constraint length — because the lower limb's IK target is the foot
      // pivot but the rendered endpoint is the ankle (which sits
      // FOOT_THICKNESS above the foot). Without this the lower sprite
      // detaches from the ankle / foot brick. Upper limb's rendered length
      // equals upperLen exactly (IK enforces that), so scaling either way
      // is fine — we recompute it for symmetry.
      const upperActualLen = Math.hypot(kx - sx, ky - sy);
      const lowerActualLen = Math.hypot(ankleX - kx, ankleY - ky);

      sprites.upper.position.set(sx, sy);
      sprites.upper.rotation = Math.atan2(kx - sx, ky - sy);
      sprites.upper.scale.set(1, upperActualLen / DEFAULT_UPPER_LEN);

      sprites.knee.position.set(kx, ky);

      sprites.lower.position.set(kx, ky);
      sprites.lower.rotation = Math.atan2(ankleX - kx, ankleY - ky);
      sprites.lower.scale.set(1, lowerActualLen / DEFAULT_LOWER_LEN);

      sprites.foot.position.set(ankleX, ankleY);

      if (debug) {
        console.log(
          `[LegRig#${i}] mount=(${m.x.toFixed(0)},${m.y.toFixed(0)}) angle=${(m.angle * 180 / Math.PI).toFixed(0)}° ` +
          `standDist=${m.standDist.toFixed(0)} upperLen=${m.upperLen.toFixed(0)} lowerLen=${m.lowerLen.toFixed(0)}\n` +
          `  shoulder=(${sx.toFixed(0)},${sy.toFixed(0)}) knee=(${kx.toFixed(0)},${ky.toFixed(0)}) ankle=(${ankleX.toFixed(0)},${ankleY.toFixed(0)}) foot=(${fx.toFixed(0)},${fy.toFixed(0)})\n` +
          `  upperRot=${(sprites.upper.rotation * 180 / Math.PI).toFixed(1)}° upperScaleY=${sprites.upper.scale.y.toFixed(3)} ` +
          `lowerRot=${(sprites.lower.rotation * 180 / Math.PI).toFixed(1)}° lowerScaleY=${sprites.lower.scale.y.toFixed(3)}\n` +
          `  spriteSizes: shoulder=${sprites.shoulder.width.toFixed(0)}x${sprites.shoulder.height.toFixed(0)} ` +
          `upper=${sprites.upper.width.toFixed(0)}x${sprites.upper.height.toFixed(0)} ` +
          `lower=${sprites.lower.width.toFixed(0)}x${sprites.lower.height.toFixed(0)} ` +
          `foot=${sprites.foot.width.toFixed(0)}x${sprites.foot.height.toFixed(0)}`,
        );
      }
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
}

// FOOT_LENGTH retained as exported metadata in case other systems need to
// query the foot footprint along the surface (collision, particles).
export { FOOT_LENGTH, FOOT_THICKNESS };
