/**
 * builderLegAtlas.ts — Runtime loader for the ase:watch-generated builder
 * leg sprite sheet.
 *
 * Single-sprite design (post 2026-05-08 user decision):
 *   - Each leg part is a plain Sprite — no NineSlice / 9-patch.
 *   - Length variation in LegRig is handled by `sprite.scale` at draw time.
 *   - The atlas is one PNG; the whole image can be hot-swapped at runtime
 *     via `setBuilderLegSheetSource()` to switch builder visuals (e.g. a
 *     darker / damaged variant) without re-creating sprite nodes.
 *
 * Pipeline:
 *   game/public/assets/atlas/builder_leg_01.ase   ← Aseprite source (SSoT)
 *     ↓ ase:watch (--sheet-type horizontal --split-slices --list-slices)
 *   game/public/assets/atlas/builder_leg_01_atlas.png   ← horizontal sheet
 *   game/public/assets/atlas/builder_leg_01_atlas.json  ← per-slice bounds
 *
 * Required slice names in the .ase file (managed by
 *   tools/add_builder_leg_slices.lua):
 *   shoulder, knee, upper_limb, lower_limb, foot
 */

import { Assets, Texture, Rectangle } from 'pixi.js';
import { assetPath } from '@core/AssetLoader';

const DEFAULT_PNG_PATH = assetPath('assets/atlas/builder_leg_01_atlas.png');
const DEFAULT_JSON_PATH = assetPath('assets/atlas/builder_leg_01_atlas.json');

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
  /** PIXI sub-texture; recreated whenever the atlas source is swapped. */
  texture: Texture;
}

// ---------------------------------------------------------------------------
// Aseprite JSON shape (json-array + list-slices, single-frame ASE)
// ---------------------------------------------------------------------------
interface AseSliceKey {
  frame: number;
  bounds: { x: number; y: number; w: number; h: number };
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
// Internal state
// ---------------------------------------------------------------------------
let cachedSheet: Texture | null = null;
const cachedParts: Partial<Record<LegPartName, LegPartFrame>> = {};
const swapListeners: Array<() => void> = [];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load the default atlas PNG + JSON once. Idempotent — call during boot.
 * Throws if the .ase has not yet been exported through ase:watch (the .png
 * or .json is missing).
 */
export async function loadBuilderLegSheet(): Promise<void> {
  if (cachedSheet) return;
  await applyAtlas(DEFAULT_PNG_PATH, DEFAULT_JSON_PATH);
}

/**
 * Hot-swap the atlas to a different PNG/JSON pair. After the swap each
 * cached LegPartFrame's `.texture` is replaced with a new sub-texture
 * pointing at the new sheet. Caller-owned Sprite nodes must re-bind via
 * `sprite.texture = getLegPart(name).texture` — subscribe through
 * `onLegSheetSwap()` for a single point to do that.
 *
 * Typical use: per-builder visual variant — pass paths to a different
 * exported atlas (e.g. `builder_leg_damaged_atlas.png`).
 */
export async function setBuilderLegSheetSource(
  pngPath: string,
  jsonPath: string,
): Promise<void> {
  await applyAtlas(pngPath, jsonPath);
  for (const fn of swapListeners) fn();
}

/** Subscribe to atlas swap events. Returns an unsubscribe handle. */
export function onLegSheetSwap(fn: () => void): () => void {
  swapListeners.push(fn);
  return () => {
    const i = swapListeners.indexOf(fn);
    if (i >= 0) swapListeners.splice(i, 1);
  };
}

/**
 * Synchronous accessor — call after loadBuilderLegSheet() resolves.
 * Returned object is reused across calls; the inner `texture` reference is
 * stable so Sprite nodes already pointing at it auto-refresh on swap.
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

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

async function applyAtlas(pngPath: string, jsonPath: string): Promise<void> {
  const sheet = await Assets.load<Texture>(pngPath);
  sheet.source.scaleMode = 'nearest';
  cachedSheet = sheet;

  // PIXI v8 Assets.load() detects Aseprite-style JSON and returns a wrapped
  // Spritesheet, hiding the original `meta` field. Fetch the raw JSON
  // directly so our slice parser sees the top-level shape we wrote in
  // builder_leg_01_atlas.json.
  const res = await fetch(jsonPath);
  if (!res.ok) {
    throw new Error(`[builderLegAtlas] failed to fetch ${jsonPath}: ${res.status} ${res.statusText}`);
  }
  const meta = (await res.json()) as AseAtlasJson;
  const slicesIn = meta.meta?.slices ?? [];
  console.log(
    `[builderLegAtlas] loaded ${jsonPath}: ${slicesIn.length} slices ` +
    `[${slicesIn.map((s) => s.name).join(', ')}]`,
  );
  const sliceByName = new Map<string, AseSlice>();
  for (const s of slicesIn) sliceByName.set(s.name, s);

  for (const name of LEG_PART_NAMES) {
    const slice = sliceByName.get(name);
    if (!slice || slice.keys.length === 0) {
      console.warn(`[builderLegAtlas] missing slice "${name}" in atlas JSON — skipping.`);
      continue;
    }
    const b = slice.keys[0].bounds;
    const rect = new Rectangle(b.x, b.y, b.w, b.h);
    const isJoint = name === 'shoulder' || name === 'knee';

    // Anchor convention — art must be centered inside its slice frame:
    //   joints (shoulder, knee)  → anchor (0.5, 0.5)
    //   limbs / foot             → anchor (0.5, 0)  (top-center attach)
    // No per-slice pivot lookup; if the visible art isn't centered in the
    // frame, recenter it in Aseprite — that's the convention.
    const pivotX = 0.5;
    const pivotY = isJoint ? 0.5 : 0;

    const newTex = new Texture({ source: sheet.source, frame: rect });
    const existing = cachedParts[name];
    if (existing) {
      // Replace the texture but keep the LegPartFrame object identity. PIXI
      // sprite.texture references the old Texture instance, so callers that
      // want to follow swaps can subscribe via onLegSheetSwap() and reassign
      // sprite.texture = getLegPart(...).texture inside the callback.
      existing.rect = rect;
      existing.pivotX = pivotX;
      existing.pivotY = pivotY;
      existing.texture = newTex;
    } else {
      cachedParts[name] = {
        rect,
        pivotX,
        pivotY,
        texture: newTex,
      };
    }
  }
}
