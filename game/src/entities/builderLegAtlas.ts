/**
 * builderLegAtlas.ts — Runtime loader for the ase:watch-generated builder
 * leg sprite sheet.
 *
 * Pipeline:
 *   game/public/assets/atlas/builder_leg_01.ase   ← Aseprite source (SSoT)
 *     ↓ ase:watch (--sheet-type horizontal --split-slices --list-slices)
 *   game/public/assets/atlas/builder_leg_01_atlas.png   ← horizontal sheet
 *   game/public/assets/atlas/builder_leg_01_atlas.json  ← frame + slice meta
 *
 * Each Aseprite slice becomes a frame. Slice 9-patch `center` field carries
 * the NineSlice cap definitions so we don't have to hardcode borders here.
 *
 * Required slice names in the .ase file:
 *   shoulder, knee, upper_limb, lower_limb, foot
 *
 * The two limb slices SHOULD have 9-patch enabled with the top/bottom caps
 * marked; that's what drives NineSliceSprite cap regions in LegRig.
 */

import { Assets, Texture, Rectangle } from 'pixi.js';
import { assetPath } from '@core/AssetLoader';

const ATLAS_PNG_PATH = assetPath('assets/atlas/builder_leg_01_atlas.png');
const ATLAS_JSON_PATH = assetPath('assets/atlas/builder_leg_01_atlas.json');

/** Names matching the Aseprite slices. Order is irrelevant in the JSON. */
export const LEG_PART_NAMES = [
  'shoulder',
  'knee',
  'upper_limb',
  'lower_limb',
  'foot',
] as const;
export type LegPartName = typeof LEG_PART_NAMES[number];

export interface LegPartFrame {
  /** Sub-texture rectangle inside the atlas PNG. */
  rect: Rectangle;
  /** Pivot anchor (0..1). Joints = center, limbs/foot = top-center. */
  pivotX: number;
  pivotY: number;
  /**
   * NineSlice cap borders [top, right, bottom, left] in source-frame pixels.
   * Defined for limb segments that get stretched; undefined for joints/foot.
   */
  nineSlice?: [number, number, number, number];
  /** Cached PIXI sub-texture; populated once the sheet is loaded. */
  texture?: Texture;
}

// ---------------------------------------------------------------------------
// Aseprite JSON shape (json-array + list-slices)
// ---------------------------------------------------------------------------
interface AseSliceKey {
  frame: number;
  bounds: { x: number; y: number; w: number; h: number };
  /** Present when the slice has 9-patch enabled. */
  center?: { x: number; y: number; w: number; h: number };
}

interface AseSlice {
  name: string;
  keys: AseSliceKey[];
}

interface AseAtlasJson {
  meta: {
    image: string;
    size: { w: number; h: number };
    slices?: AseSlice[];
  };
}

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------
let cachedSheet: Texture | null = null;
const cachedParts: Partial<Record<LegPartName, LegPartFrame>> = {};

/**
 * Load the atlas PNG + JSON once. Idempotent — call during boot, then read
 * frames synchronously via getLegPart().
 *
 * Throws if the .ase has not yet been exported through ase:watch (the .png
 * or .json is missing). Surface the error to the caller so the user knows
 * to run ase:watch / re-save the source.
 */
export async function loadBuilderLegSheet(): Promise<void> {
  if (cachedSheet) return;
  const sheet = await Assets.load<Texture>(ATLAS_PNG_PATH);
  sheet.source.scaleMode = 'nearest';
  cachedSheet = sheet;

  const meta = await Assets.load<AseAtlasJson>(ATLAS_JSON_PATH);
  parseAtlasMeta(meta, sheet);
}

function parseAtlasMeta(meta: AseAtlasJson, sheet: Texture): void {
  // Single-frame ASE + --split-slices outputs the full canvas as one frame
  // and lists per-slice bounds in meta.slices. We read slices directly
  // since they carry both the rect and the 9-patch center for NineSlice.
  const sliceByName = new Map<string, AseSlice>();
  for (const s of meta.meta.slices ?? []) sliceByName.set(s.name, s);

  for (const name of LEG_PART_NAMES) {
    const slice = sliceByName.get(name);
    if (!slice || slice.keys.length === 0) {
      console.warn(`[builderLegAtlas] missing slice "${name}" in atlas JSON — skipping.`);
      continue;
    }
    const key = slice.keys[0];
    const b = key.bounds;
    const rect = new Rectangle(b.x, b.y, b.w, b.h);

    // Joints (shoulder, knee) anchor at center. Limbs and foot anchor at top
    // so they hang from the joint above.
    const isJoint = name === 'shoulder' || name === 'knee';
    const pivotX = 0.5;
    const pivotY = isJoint ? 0.5 : 0;

    let nineSlice: [number, number, number, number] | undefined;
    if (key.center) {
      const top = key.center.y;
      const bottom = b.h - (key.center.y + key.center.h);
      const left = key.center.x;
      const right = b.w - (key.center.x + key.center.w);
      nineSlice = [top, right, bottom, left];
    }

    const tex = new Texture({ source: sheet.source, frame: rect });
    cachedParts[name] = { rect, pivotX, pivotY, nineSlice, texture: tex };
  }
}

/**
 * Synchronous accessor — call after loadBuilderLegSheet() resolves.
 */
export function getLegPart(name: LegPartName): LegPartFrame {
  const part = cachedParts[name];
  if (!part) {
    throw new Error(
      `getLegPart("${name}") called before loadBuilderLegSheet() resolved, ` +
      `or the slice is missing from builder_leg_01.ase. ` +
      `Required slices: ${LEG_PART_NAMES.join(', ')}.`,
    );
  }
  return part;
}

/** True once the sheet + meta are loaded and frames are usable. */
export function isBuilderLegSheetLoaded(): boolean {
  return cachedSheet !== null;
}
