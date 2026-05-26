/**
 * LegRig ??Procedural N-leg IK rig for the GiantBuilder, driven by
 * author-placed mount points and rendered with sprites from the
 * builder_leg_01 atlas.
 *
 * Each LegMount specifies:
 *   x, y     ??shoulder position in body-local pixels
 *   angle    ??radians; rotation of the leg's local "down" axis. The foot
 *              reaches in this direction from the shoulder, and the gait
 *              strides perpendicular to it (90째 CW from outward).
 *              0       ??foot reaches RIGHT, walks UP
 *              ?/2     ??foot reaches DOWN, walks RIGHT (standard side-view)
 *              ?       ??foot reaches UP, walks LEFT
 *              -?/2    ??foot reaches LEFT, walks DOWN
 *   phase    ??0..1 gait offset. Defaults to index/N, producing a wave.
 *   flipX    - flip leg sprites and reverse stride direction horizontally.
 *   flipY    - flip leg sprites vertically.
 *   kneeFlip - flip IK knee bend direction only.
 *   length   ??optional per-leg planted-foot reach (px) along local +Y.
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
 * swap is supported via onLegSheetSwap ??each sprite's texture re-binds
 * automatically on swap.
 */

import { Container, Graphics, Sprite } from 'pixi.js';
import {
  loadBuilderLegSheet,
  getLegPart,
  isBuilderLegSheetLoaded,
  onLegSheetSwap,
  type LegPartName,
} from './builderLegAtlas';

// Default proportions, sized for the 768횞1152 builder body. Sprite source
// dimensions match these defaults so a leg using `length === DEFAULT_STAND_DIST`
// renders at sprite scale 1.
const DEFAULT_UPPER_LEN = 280;
const DEFAULT_LOWER_LEN = 340;
const DEFAULT_STAND_DIST = 520;  // foot reach along leg's local +Y when planted
const DEFAULT_STRIDE = 280;      // foot travel along leg's local X per cycle
const DEFAULT_SWING_LIFT = 320;  // peak retraction along leg's local -Y during swing
const SWING_PORTION = 0.18;
const GAIT_DISTANCE = 280;       // body-px per full gait cycle
const LEG_RENDER_SCALE = 1;

// Foot brick ??the leg's lower limb attaches to the ankle (top of the brick),
// and the brick's far face rests flat on the surface point the IK targets.
// FOOT_THICKNESS is the dimension along the leg; FOOT_LENGTH is along the
// surface. Tall, narrow stance: thickness = 2 횞 length.
const FOOT_THICKNESS = 160;
const FOOT_LENGTH = 80;

export interface LegMount {
  x: number;
  y: number;
  flipX?: boolean;
  flipY?: boolean;
  kneeFlip?: boolean;
  forwardRender?: boolean;   // render in front of body (instead of behind)
  /**
   * Optional body-local foot anchor. When set, IK aims the foot at this point
   * during PLANT and overrides the authored `angle` / `length`. The leg's
   * effective angle becomes mount?뭓nchor and the reach becomes the distance.
   * Either coordinate may be set independently to lock to a wall (FootX) or
   * floor (FootY); the other axis falls back to the mount's coordinate.
   */
  footContact?: 'bottom' | 'left' | 'right';
}

interface ResolvedMount {
  x: number;
  y: number;
  angle: number;
  phase: number;
  flipX: boolean;
  flipY: boolean;
  kneeFlip: boolean;
  forwardRender: boolean;
  // Per-leg scaled IK parameters (derived from `length`).
  upperLen: number;
  lowerLen: number;
  maxReach: number;
  standDist: number;
  stride: number;
  swingLift: number;
  footContact: 'bottom' | 'left' | 'right';
  // Current IK ankle target in body-local px. setFootAnchor writes this each
  // frame; the gait's plant branch reads it directly so anchor changes apply
  // immediately even on a stationary (plant-locked) builder.
  ankleLocalX: number;
  ankleLocalY: number;
  // Debug-only ??body-local foot anchor as originally authored (FootX/Y or
  // AutoFoot resolved). Preserved so the overlay can show "target vs actual
  // foot position" side by side.
  debugAnchorX?: number;
  debugAnchorY?: number;
}

type LegFootPlantCallback = (x: number, y: number, mount: ResolvedMount) => void;

/** Sprite set for one leg. */
interface LegSprites {
  shoulder: Sprite;
  upper: Sprite;
  knee: Sprite;
  lower: Sprite;
  foot: Sprite;
  /**
   * Sprite source heights (= slice frame heights). Used as the divisor when
   * computing limb scale.y so the rendered limb height equals the IK-solved
   * distance regardless of how tall the artist drew the slice. Avoids the
   * 4-8 px detachments that creep in when the slice frame doesn't exactly
   * match DEFAULT_*_LEN.
   */
  upperSourceH: number;
  lowerSourceH: number;
  footSourceW: number;
  footSourceH: number;
  footPivotX: number;
  footPivotY: number;
}

export interface LegRigSnapshot {
  phase: number;
  cumulativeDist: number;
  wasPlanted: boolean[];
  plantedFoot: Array<{ x: number; y: number } | null>;
  swingStartFoot: Array<{ x: number; y: number } | null>;
}

export class LegRig {
  /** Back layer ??sits behind the builder body tilemap. */
  readonly container: Container;
  /** Front layer ??sits in front of the body. Used by mounts with
   *  forwardRender=true so authors can show the full leg silhouette in front
   *  of the body tilemap (otherwise legs render behind it). */
  readonly frontContainer: Container;
  private mounts: ResolvedMount[];
  private legs: LegSprites[] = [];
  private ready = false;
  private phase = 0;
  private cumulativeDist = 0;
  private unsubscribeSwap: (() => void) | null = null;
  private wasPlanted: boolean[] = [];
  private plantedFoot: Array<{ x: number; y: number } | null> = [];
  private swingStartFoot: Array<{ x: number; y: number } | null> = [];
  private onFootPlant: LegFootPlantCallback | null = null;

  // Debug overlay ??toggled by GiantBuilder when ?legdebug URL flag is set.
  // Rendered in body-local coords so it inherits the same parent transform
  // as the leg sprites; no manual world?봪ocal math required.
  private debugGfx: Graphics | null = null;

  /** Atlas-derived foot sprite dimensions in body-local px.
   *  W = sole?뭓nkle distance when foot is in a "wall-ready" horizontal pose
   *      (sole at right edge, ankle at left edge).
   *  H = sole?뭓nkle distance when foot rotates to a floor pose. */
  private footSourceWPx = FOOT_THICKNESS;
  private footSourceHPx = FOOT_THICKNESS;

  /**
   * Foot sprite anchor as a fraction of the atlas slice frame. Per user
   * direction 2026-05-17: anchor sits on the VISIBLE FOOT CENTER (mid of
   * the visible foot art), not on the ankle or sole edge. Tune the four
   * fractions below while watching the live frame; once correct the values
   * become the canonical foot anchor for this builder atlas.
   *
   *   FOOT_ANCHOR_RIGHT_X/Y  ??used for footContact='right'.
   *   FOOT_ANCHOR_LEFT_X/Y   ??used for footContact='left' (sprite flipped).
   */
  constructor(mounts: LegMount[], onFootPlant?: LegFootPlantCallback) {
    this.container = new Container();
    this.frontContainer = new Container();
    this.onFootPlant = onFootPlant ?? null;
    const n = Math.max(1, mounts.length);
    this.mounts = mounts.map((m, i) => {
      const standDist = DEFAULT_STAND_DIST;
      const angle = Math.PI / 2;
      const scale = standDist / DEFAULT_STAND_DIST;
      const upperLen = DEFAULT_UPPER_LEN * scale;
      const lowerLen = DEFAULT_LOWER_LEN * scale;
      return {
        x: m.x,
        y: m.y,
        angle,
        phase: i / n,
        flipX: m.flipX ?? false,
        flipY: m.flipY ?? false,
        kneeFlip: m.kneeFlip ?? false,
        forwardRender: m.forwardRender ?? false,
        upperLen,
        lowerLen,
        maxReach: upperLen + lowerLen - 6,
        standDist,
        stride: DEFAULT_STRIDE * scale,
        swingLift: DEFAULT_SWING_LIFT * scale,
        footContact: m.footContact ?? 'bottom',
        // Initial ankle target = standDist below the mount along +Y. Will be
        // overwritten on the first setFootAnchor() call.
        ankleLocalX: m.x,
        ankleLocalY: m.y + standDist,
      };
    });
    this.wasPlanted = this.mounts.map(() => false);
    this.plantedFoot = this.mounts.map(() => null);
    this.swingStartFoot = this.mounts.map(() => null);

    if (this.mounts.length === 0) {
      this.ready = true;
      return;
    }

    // Atlas may already be loaded (boot preloaded) ??build sprites synchronously
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
    const upperPart = getLegPart('upper_limb');
    const lowerPart = getLegPart('lower_limb');
    const footPart = getLegPart('foot');
    const upperSourceH = upperPart.rect.height;
    const lowerSourceH = lowerPart.rect.height;
    const footSourceW = footPart.rect.width;
    const footSourceH = footPart.rect.height;
    // Atlas pose is HORIZONTAL ??sole at right edge, ankle at left edge.
    // So `footSourceW` is the sole?뭓nkle distance for vertical-wall contact;
    // `footSourceH` is the sprite's thickness (toe?뭜eel vertically) and is
    // the offset used only when the foot must rotate onto a floor.
    this.footSourceWPx = footSourceW * LEG_RENDER_SCALE;
    this.footSourceHPx = footSourceH * LEG_RENDER_SCALE;
    // eslint-disable-next-line no-console
    console.log(`[LegRig] footSourceWPx=${this.footSourceWPx}, footSourceHPx=${this.footSourceHPx}`);

    for (const m of this.mounts) {
      const shoulder = this.makeSprite('shoulder');
      const upper = this.makeSprite('upper_limb');
      const knee = this.makeSprite('knee');
      const lower = this.makeSprite('lower_limb');
      const foot = this.makeSprite('foot');
      // Anchor is updated per-frame in update() because it depends on
      // footContact (right/left/bottom) ??each contact direction needs a
      // different edge of the sprite to be the "sole anchor".

      // Initial scale ??replaced on first update tick. Uses source height so
      // the pose looks right even before any motion accumulates.
      upper.scale.set(1, m.upperLen / upperSourceH);
      lower.scale.set(1, m.lowerLen / lowerSourceH);

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

      this.legs.push({
        shoulder, upper, knee, lower, foot,
        upperSourceH, lowerSourceH, footSourceW, footSourceH,
        footPivotX: footPart.pivotX,
        footPivotY: footPart.pivotY,
      });
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
      const shoulder = getLegPart('shoulder');
      const upper = getLegPart('upper_limb');
      const knee = getLegPart('knee');
      const lower = getLegPart('lower_limb');
      const foot = getLegPart('foot');
      leg.shoulder.texture = shoulder.texture;
      leg.shoulder.anchor.set(shoulder.pivotX, shoulder.pivotY);
      leg.upper.texture = upper.texture;
      leg.upper.anchor.set(upper.pivotX, upper.pivotY);
      leg.knee.texture = knee.texture;
      leg.knee.anchor.set(knee.pivotX, knee.pivotY);
      leg.lower.texture = lower.texture;
      leg.lower.anchor.set(lower.pivotX, lower.pivotY);
      leg.foot.texture = foot.texture;
      leg.foot.anchor.set(foot.pivotX, foot.pivotY);
      leg.footPivotX = foot.pivotX;
      leg.footPivotY = foot.pivotY;
    }
  }

  createSnapshot(): LegRigSnapshot {
    return {
      phase: this.phase,
      cumulativeDist: this.cumulativeDist,
      wasPlanted: [...this.wasPlanted],
      plantedFoot: this.plantedFoot.map(p => p ? { ...p } : null),
      swingStartFoot: this.swingStartFoot.map(p => p ? { ...p } : null),
    };
  }

  restoreSnapshot(snapshot: LegRigSnapshot): void {
    this.phase = snapshot.phase;
    this.cumulativeDist = snapshot.cumulativeDist;
    this.wasPlanted = snapshot.wasPlanted.map(Boolean);
    this.plantedFoot = snapshot.plantedFoot.map(p => p ? { ...p } : null);
    this.swingStartFoot = snapshot.swingStartFoot.map(p => p ? { ...p } : null);
  }

  /** Detach swap subscription. Call when the rig is destroyed. */
  destroy(): void {
    if (this.unsubscribeSwap) {
      this.unsubscribeSwap();
      this.unsubscribeSwap = null;
    }
  }

  /**
   * Advance gait by absolute body movement (px). Direction-agnostic;
   * only travelled distance drives the cycle.
   */
  update(bodyDelta: number): void {
    this.cumulativeDist += Math.abs(bodyDelta);
    this.phase = (this.cumulativeDist / GAIT_DISTANCE) % 1;
    if (!this.ready) return;

    if (this.debugGfx) {
      this.debugGfx.clear();
      // Reseat to the top of the parent every frame so later addChild()
      // calls on the same container can't bury the overlay behind body
      // sprites / decorations / attached entities.
      const dp = this.debugGfx.parent;
      if (dp && dp.children.length > 1) {
        dp.setChildIndex(this.debugGfx, dp.children.length - 1);
      }
    }

    for (let i = 0; i < this.mounts.length; i++) {
      const m = this.mounts[i];
      const sprites = this.legs[i];
      if (!sprites) continue;
      const localPhase = (this.phase + m.phase) % 1;

      // Foot position in the leg's LOCAL frame (down=+Y, forward=+X).
      let lx: number;
      let ly: number;
      const isSwing = localPhase < SWING_PORTION;
      const isPlanted = !isSwing;
      const alpha = m.angle - Math.PI / 2;
      const ca = Math.cos(alpha);
      const sa = Math.sin(alpha);
      const sx = m.x;
      const sy = m.y;
      const anchorDx = m.ankleLocalX - m.x;
      const anchorDy = m.ankleLocalY - m.y;
      const anchorLocalX = anchorDx * ca + anchorDy * sa;
      const anchorLocalY = -anchorDx * sa + anchorDy * ca;
      if (isSwing) {
        const t = localPhase / SWING_PORTION;
        const planted = this.plantedFoot[i];
        if (planted && !this.swingStartFoot[i]) {
          planted.y -= bodyDelta;
          const dx = planted.x - m.x;
          const dy = planted.y - m.y;
          this.swingStartFoot[i] = {
            x: dx * ca + dy * sa,
            y: -dx * sa + dy * ca,
          };
        }
        const start = this.swingStartFoot[i];
        const endX = anchorLocalX;
        const endY = anchorLocalY;
        if (start) {
          lx = start.x + (endX - start.x) * t;
          ly = start.y + (endY - start.y) * t - Math.sin(t * Math.PI) * m.swingLift;
        } else {
          lx = (m.flipX ? 1 : -1) * m.stride * 0.5 + (m.flipX ? -m.stride : m.stride) * t;
          ly = m.standDist - Math.sin(t * Math.PI) * m.swingLift;
        }
        this.plantedFoot[i] = null;
      } else {
        this.swingStartFoot[i] = null;
        let plantedFoot = this.plantedFoot[i];
        if (!plantedFoot || !this.wasPlanted[i]) {
          plantedFoot = { x: m.ankleLocalX, y: m.ankleLocalY };
          this.plantedFoot[i] = plantedFoot;
        } else if (bodyDelta !== 0) {
          plantedFoot.y -= bodyDelta;
        }
        const dx = plantedFoot.x - m.x;
        const dy = plantedFoot.y - m.y;
        lx = dx * ca + dy * sa;
        ly = -dx * sa + dy * ca;
      }

      /*
        // Plant ??read the live ankle target directly from the mount so any
        // setFootAnchor() update (anchor const change, raycast row shift) is
        // reflected this frame. The stale `plantedFoot` snapshot is ignored
        // here; it remains for swing-start interpolation only.
      */

      // Clamp foot reach in local frame so IK stays solvable.
      let d = Math.hypot(lx, ly);
      if (isPlanted && d > m.maxReach) {
        const scale = Math.max(d + 6, DEFAULT_STAND_DIST) / DEFAULT_STAND_DIST;
        m.upperLen = DEFAULT_UPPER_LEN * scale;
        m.lowerLen = DEFAULT_LOWER_LEN * scale;
        m.maxReach = m.upperLen + m.lowerLen - 6;
      }
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

      const ik = this.solveLocal(lx, ly, d, m.flipX !== m.kneeFlip, m.upperLen, m.lowerLen);

      // Rotate local frame so that the leg's local +Y aligns with the mount's
      // angle direction in body-local space. alpha = angle - ?/2.
      const kx = m.x + ik.kx * ca - ik.ky * sa;
      const ky = m.y + ik.kx * sa + ik.ky * ca;
      const fx = m.x + lx * ca - ly * sa;
      const fy = m.y + lx * sa + ly * ca;
      const legScale = LEG_RENDER_SCALE;
      const renderScaleX = m.flipX ? -legScale : legScale;
      const renderScaleY = m.flipY ? -legScale : legScale;
      const planted = localPhase >= SWING_PORTION;
      if (planted && !this.wasPlanted[i]) {
        this.plantedFoot[i] = { x: fx, y: fy };
        const contactX = fx;
        const contactY = fy;
        if (Math.abs(bodyDelta) > 0.01) this.onFootPlant?.(contactX, contactY, m);
      }
      this.wasPlanted[i] = planted;

      // Atlas pose horizontal: visible sole sits at VISIBLE_SOLE_FRAC_X of
      // the slice width, visible ankle at VISIBLE_ANKLE_FRAC_X. Anchor is
      // chosen so the *visible* sole lands exactly on the raycast point.
      const ankleX = fx;
      const ankleY = fy;
      // Sprite anchor sits at the VISIBLE FOOT CENTER (user direction
      // 2026-05-17). For vertical-wall contact, sprite.position equals the
      // IK ankle world coord ??the sprite naturally extends to the wall
      // on +X and to the lower-limb attach point on -X.
      let footAnchorX = sprites.footPivotX;
      let footAnchorY = sprites.footPivotY;
      let footPosX = fx;
      let footPosY = fy;
      let footRotation = 0;
      const footScaleX = renderScaleX;
      const footScaleY = renderScaleY;
      if (m.footContact === 'right') {
        footAnchorX = sprites.footPivotX;
        footAnchorY = sprites.footPivotY;
        footPosX = fx;
        footPosY = fy;
      } else if (m.footContact === 'left') {
        footAnchorX = sprites.footPivotX;
        footAnchorY = sprites.footPivotY;
        footPosX = fx;
        footPosY = fy;
      }
      sprites.foot.anchor.set(footAnchorX, footAnchorY);

      // Sprite layout:
      //   shoulder centered on (sx, sy)
      //   upper limb anchored top-center at (sx, sy), rotated to point at knee
      //   knee centered on (kx, ky)
      //   lower limb anchored top-center at (kx, ky), rotated to point at ankle
      //   foot anchored top-center at (ankleX, ankleY) ??axis-aligned, no rotation
      //
      // PIXI rotation is clockwise from +X. With anchor (0.5, 0) the sprite's
      // default "down" direction is +Y, so atan2(dx, dy) maps that down vector
      // to the IK chain segment direction.
      //
      // Per-frame scale.y is rendered-distance / sprite-source-height.
      // We use the *actual* distance the sprite has to span ??not the IK
      // constraint length ??because the lower limb's IK target is the foot
      // pivot but the rendered endpoint is the ankle (which sits
      // FOOT_THICKNESS above the foot). Without this the lower sprite
      // detaches from the ankle / foot brick.
      //
      // Joints, foot, and limb width are all left at sprite-source size
      // (legScale=1) ??Victor wants the silhouette to read as a chunky mech
      // leg even on per-leg short-Length mounts. Only limb height tracks
      // the rendered distance.
      const upperActualLen = Math.hypot(kx - sx, ky - sy);
      const lowerActualLen = Math.hypot(ankleX - kx, ankleY - ky);
      // FlipX/FlipY apply the artist-authored LDtk booleans to every leg part.
      const limbRotationOffset = m.flipY ? Math.PI : 0;
      sprites.shoulder.position.set(sx, sy);
      sprites.shoulder.scale.set(renderScaleX, renderScaleY);

      // PIXI applies rotation as a standard CCW matrix in math space; with
      // anchor (0.5, 0) the sprite's default "down" vector (0, 1) becomes
      // (-sin 罐, cos 罐) after rotation in screen coords. Solving
      //   (-sin 罐, cos 罐) = (vx, vy) / |v|
      // gives 罐 = atan2(-vx, vy). Earlier code dropped the negation on vx
      // and produced a horizontally flipped leg silhouette ??limb
      // endpoints met the joints but the limb rotated the wrong way.
      sprites.upper.position.set(sx, sy);
      sprites.upper.rotation = Math.atan2(sx - kx, ky - sy) + limbRotationOffset;
      sprites.upper.scale.set(renderScaleX, renderScaleY * upperActualLen / sprites.upperSourceH);

      sprites.knee.position.set(kx, ky);
      sprites.knee.scale.set(renderScaleX, renderScaleY);

      sprites.lower.position.set(kx, ky);
      sprites.lower.rotation = Math.atan2(kx - ankleX, ankleY - ky) + limbRotationOffset;
      sprites.lower.scale.set(renderScaleX, renderScaleY * lowerActualLen / sprites.lowerSourceH);

      sprites.foot.position.set(footPosX, footPosY);
      sprites.foot.rotation = footRotation;
      sprites.foot.scale.set(footScaleX, footScaleY);

      if (this.debugGfx) {
        this.drawDebugForLeg(m, fx, fy, kx, ky, ankleX, ankleY);
      }
    }
  }

  /**
   * Attach (or detach) the debug overlay. Caller passes the parent container ??   * usually the same body-local layer that holds the leg sprites so coords
   * match without conversion. Pass `null` to remove and destroy.
   *
   * Markers:
   *   ??Yellow filled circle ??shoulder (mount.x/y, what LDtk authored)
   *   ??Red X cross         ??authored foot anchor target (FootX/Y 쨌 AutoFoot)
   *   ??Green filled circle ??IK-solved foot end point (lx/ly rotated)
   *   ??Cyan small circle    ??IK knee joint
   *   ??Magenta filled dot   ??sprite ankle (where the foot sprite anchors)
   *   ??Cyan thin lines      ??shoulder?뭟nee?뭚oot bones
   *   ??Faint white line     ??direct shoulder?뭚oot (target vector)
   */
  /**
   * Update a leg's foot anchor at runtime. Caller (GiantBuilder) raycasts the
   * host IntGrid every frame and pushes the resulting body-local foot target
   * here; the IK params (standDist, angle, limb lengths, maxReach) are
   * recomputed so the gait re-aims at the new anchor smoothly.
   *
   * No-op if the leg index is out of range. `contact` defaults to 'bottom'
   * when omitted ??passing 'left'/'right' lets the foot sprite hug a vertical
   * wall face the way `AutoFootLeft/Right` does at spawn.
   */
  setFootAnchor(legIdx: number, ax: number, ay: number, contact: 'bottom' | 'left' | 'right' = 'bottom'): void {
    const m = this.mounts[legIdx];
    if (!m) return;
    // Anchor = visible foot center. So the IK target (where the sprite
    // anchor lands) is offset from the raycast sole by the distance from
    // the visible foot CENTER to the sole edge. For an anchor of (1.0, *)
    // that distance is 0 ??the visible sole edge IS the anchor.
    // The constants below tune how far inward from the wall the visible
    // center sits along each contact axis.
    let ankleX = ax;
    let ankleY = ay;
    const footPivotX = this.legs[legIdx]?.footPivotX ?? 0.5;
    const footPivotY = this.legs[legIdx]?.footPivotY ?? 0.5;
    if (contact === 'right') {
      ankleX = ax - this.footSourceWPx * (1 - footPivotX);
    } else if (contact === 'left') {
      ankleX = ax + this.footSourceWPx * footPivotX;
    } else {
      ankleY = ay - this.footSourceHPx * (1 - footPivotY);
    }

    const dx = ankleX - m.x;
    const dy = ankleY - m.y;
    const newStandDist = Math.max(1, Math.hypot(dx, dy));
    m.angle = Math.atan2(dy, dx) + Math.PI / 2;
    m.standDist = newStandDist;
    // Save the absolute ankle target so the plant branch can read it each
    // frame, bypassing the stale plantedFoot snapshot.
    m.ankleLocalX = ankleX;
    m.ankleLocalY = ankleY;
    if (newStandDist > m.maxReach) {
      const scale = newStandDist / DEFAULT_STAND_DIST;
      m.upperLen = DEFAULT_UPPER_LEN * scale;
      m.lowerLen = DEFAULT_LOWER_LEN * scale;
      m.maxReach = m.upperLen + m.lowerLen - 6;
    }
    m.footContact = contact;
    m.debugAnchorX = ax;
    m.debugAnchorY = ay;
    // NOTE ??earlier code reset `plantedFoot` here so a stationary builder
    // would track anchor changes. That caused a per-frame fight with the
    // gait's `planted.y -= bodyDelta` line: the plant branch advances the
    // snapshot by bodyDelta and the next setFootAnchor() overwrites it.
    // The two systems racing produced large rotation/scale swings the user
    // perceived as a Y-axis flip every frame. We let the gait own the plant
    // snapshot; standDist/angle updates take effect at the next swing?뭦lant
    // transition.
  }

  setDebug(parent: Container | null): void {
    if (parent) {
      if (!this.debugGfx) this.debugGfx = new Graphics();
      parent.addChild(this.debugGfx);
    } else if (this.debugGfx) {
      if (this.debugGfx.parent) this.debugGfx.parent.removeChild(this.debugGfx);
      this.debugGfx.destroy();
      this.debugGfx = null;
    }
  }

  private drawDebugForLeg(
    m: ResolvedMount, fx: number, fy: number, kx: number, ky: number,
    ankleX: number, ankleY: number,
  ): void {
    const g = this.debugGfx;
    if (!g) return;

    // Shoulder ??knee ??foot bones (cyan)
    g.moveTo(m.x, m.y).lineTo(kx, ky)
      .stroke({ color: 0x40c0ff, width: 1.2, alpha: 0.85 });
    g.moveTo(kx, ky).lineTo(fx, fy)
      .stroke({ color: 0x40c0ff, width: 1.2, alpha: 0.85 });

    // Direct shoulder?뭚oot vector for comparison (faint white)
    g.moveTo(m.x, m.y).lineTo(fx, fy)
      .stroke({ color: 0xffffff, width: 0.6, alpha: 0.25 });

    // Authored anchor target (red X) ??only present for FootX/Y or AutoFoot.
    if (m.debugAnchorX !== undefined && m.debugAnchorY !== undefined) {
      const ax = m.debugAnchorX, ay = m.debugAnchorY;
      g.moveTo(ax - 5, ay - 5).lineTo(ax + 5, ay + 5);
      g.moveTo(ax + 5, ay - 5).lineTo(ax - 5, ay + 5);
      g.stroke({ color: 0xff4040, width: 1.4, alpha: 0.95 });
      // Connector from shoulder to anchor (red dashed-ish)
      g.moveTo(m.x, m.y).lineTo(ax, ay)
        .stroke({ color: 0xff4040, width: 0.6, alpha: 0.4 });
    }

    // IK-solved foot endpoint (green)
    g.circle(fx, fy, 3).fill({ color: 0x40ff40, alpha: 0.95 });

    // Sprite ankle (magenta) ??shows where the foot sprite is actually drawn,
    // which may differ from `fx,fy` because footContact='left'/'right' offsets it.
    g.circle(ankleX, ankleY, 2).fill({ color: 0xff40c0, alpha: 0.95 });

    // Knee joint (cyan)
    g.circle(kx, ky, 2.4).fill({ color: 0x40c0ff, alpha: 0.95 });

    // Shoulder (yellow, drawn last so it sits on top)
    g.circle(m.x, m.y, 4).fill({ color: 0xffe040, alpha: 0.95 });
    g.circle(m.x, m.y, 4).stroke({ color: 0x000000, width: 0.5, alpha: 0.6 });
  }

  /**
   * 2-segment IK in local frame with a fixed bend side. This avoids the
   * frame-to-frame candidate switching that looked like Y-flip flicker.
   */
  private solveLocal(
    lx: number, ly: number, d: number, bendFlip: boolean,
    upperLen: number, lowerLen: number,
  ): { kx: number; ky: number } {
    const ux = lx / d;
    const uy = ly / d;
    const along = Math.max(0, Math.min(upperLen, (upperLen * upperLen + d * d - lowerLen * lowerLen) / (2 * d)));
    const hSq = Math.max(0, upperLen * upperLen - along * along);
    const height = Math.sqrt(hSq);
    const bend = bendFlip ? -1 : 1;
    const px = -uy;
    const py = ux;
    return {
      kx: ux * along + px * height * bend,
      ky: uy * along + py * height * bend,
    };
  }
}

// FOOT_LENGTH retained as exported metadata in case other systems need to
// query the foot footprint along the surface (collision, particles).
export { FOOT_LENGTH, FOOT_THICKNESS };
