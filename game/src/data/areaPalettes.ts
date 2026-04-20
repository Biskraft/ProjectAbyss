/**
 * areaPalettes.ts — Area palette DB loaded from CSV at build time.
 *
 * SSoT: Sheets/Content_System_Area_Palette.csv
 * CSV columns: AreaID,Name,Layer,Brightness,Tint,DepthBias,DepthCenter,Stops,Description
 *
 * Stops inline format:
 *   "0.00:3a1a28|0.20:6a2a3a|..."  (t:hex pairs separated by |)
 *
 * This lets LdtkWorldScene / ItemWorldScene resolve an AreaID to a full
 * render spec (palette stops + depth params + brightness tint), so we can
 * add new biomes by editing a single CSV row instead of touching code.
 */

import csvText from '../../../Sheets/Content_System_Area_Palette.csv?raw';
import { Assets, Texture } from 'pixi.js';
import { assetPath } from '@core/AssetLoader';
import {
  type PaletteStop,
  type PaletteDefinition,
  buildPaletteTexture,
} from '../effects/PaletteSwapFilter';

export type PaletteLayer = 'BG' | 'WALL';

export interface AreaPaletteEntry {
  id: string;
  name: string;
  layer: PaletteLayer;
  brightness: number;
  tint: number; // 0xRRGGBB
  depthBias: number;
  depthCenter: number;
  stops: PaletteStop[];
  description: string;
  /**
   * Tileset file basename (no extension, no path). e.g. "world_01".
   * Resolves to `assets/atlas/{tileset}.png` at load time. Empty string
   * means no tileset is associated with this area.
   */
  tileset: string;
}

/** Parsed area palette entries, keyed by AreaID. */
export const AREA_PALETTES: Map<string, AreaPaletteEntry> = new Map();

// ---------------------------------------------------------------------------
// CSV parser — single-line tolerant, quoted-field aware (the Stops column
// contains commas inside quotes).
// ---------------------------------------------------------------------------
function splitCsvLine(line: string): string[] {
  const cols: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuote = !inQuote;
      continue;
    }
    if (c === ',' && !inQuote) {
      cols.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  cols.push(cur);
  return cols;
}

function parseHex(s: string): number {
  const trimmed = s.trim().replace(/^0x/i, '');
  return parseInt(trimmed, 16);
}

function parseStops(raw: string): PaletteStop[] {
  const stops: PaletteStop[] = [];
  for (const pair of raw.split('|')) {
    const [tStr, hexStr] = pair.split(':');
    if (!tStr || !hexStr) continue;
    stops.push({
      t: parseFloat(tStr),
      color: parseHex(hexStr),
    });
  }
  return stops;
}

const lines = csvText.trim().split(/\r?\n/);
for (let i = 1; i < lines.length; i++) {
  const cols = splitCsvLine(lines[i]);
  if (cols.length < 9) continue;
  const entry: AreaPaletteEntry = {
    id: cols[0].trim(),
    name: cols[1].trim(),
    layer: cols[2].trim().toUpperCase() as PaletteLayer,
    brightness: parseFloat(cols[3]) || 1.0,
    tint: parseHex(cols[4]) || 0xffffff,
    depthBias: parseFloat(cols[5]) || 0,
    depthCenter: parseFloat(cols[6]) || 0.5,
    stops: parseStops(cols[7]),
    description: cols[8].trim(),
    tileset: (cols[9] ?? '').trim(),
  };
  AREA_PALETTES.set(entry.id, entry);
}

/** Lookup an area palette by ID. Throws if unknown. */
export function getAreaPalette(id: string): AreaPaletteEntry {
  const entry = AREA_PALETTES.get(id);
  if (!entry) throw new Error(`areaPalettes: unknown AreaID "${id}"`);
  return entry;
}

/** Convert an area palette entry into a PaletteDefinition for the filter. */
export function toPaletteDefinition(entry: AreaPaletteEntry): PaletteDefinition {
  return { name: entry.id, stops: entry.stops };
}

/** All entries in insertion order — useful for building a row-indexed atlas. */
export function allAreaPalettes(): AreaPaletteEntry[] {
  return Array.from(AREA_PALETTES.values());
}

// ---------------------------------------------------------------------------
// Atlas builder — one GPU texture packing every AreaID as a row.
// ---------------------------------------------------------------------------

export interface AreaPaletteAtlas {
  /** Single 256 x N palette texture. */
  texture: Texture;
  /** Row count (== number of entries in CSV). */
  rowCount: number;
  /** AreaID → row index lookup. */
  rowIndex: Map<string, number>;
}

let _cachedAtlas: AreaPaletteAtlas | null = null;

/**
 * Build (or return cached) palette atlas covering every entry in
 * Content_System_Area_Palette.csv. Scenes pass this single texture to any
 * PaletteSwapFilter, then select the row via `getAreaPaletteRow(id)`.
 */
export function getAreaPaletteAtlas(): AreaPaletteAtlas {
  if (_cachedAtlas) return _cachedAtlas;
  const entries = allAreaPalettes();
  const defs: PaletteDefinition[] = entries.map(e => ({ name: e.id, stops: e.stops }));
  const texture = buildPaletteTexture(defs);
  const rowIndex = new Map<string, number>();
  entries.forEach((e, i) => rowIndex.set(e.id, i));
  _cachedAtlas = { texture, rowCount: entries.length, rowIndex };
  return _cachedAtlas;
}

/** Row index of an AreaID in the shared atlas. */
export function getAreaPaletteRow(id: string): number {
  const atlas = getAreaPaletteAtlas();
  const row = atlas.rowIndex.get(id);
  if (row === undefined) throw new Error(`areaPalettes: unknown AreaID "${id}"`);
  return row;
}

// ---------------------------------------------------------------------------
// Per-area tileset loading
// ---------------------------------------------------------------------------

/**
 * Convert a tileset basename (from CSV `Tileset` column) to the LDtk
 * __tilesetRelPath the renderer uses as the atlas map key.
 *   "world_01"  →  "atlas/world_01.png"
 */
export function tilesetRelPath(tilesetName: string): string {
  return `atlas/${tilesetName}.png`;
}

/**
 * Ensure the tilesets required by the given AreaIDs are loaded into the
 * provided atlas map (keyed by LDtk __tilesetRelPath).  Idempotent — skips
 * already-loaded entries.  Scenes call this lazily when they enter a new
 * area so we only pay I/O for tilesets the player actually encounters.
 */
export async function ensureAreaTilesetsLoaded(
  areaIds: string[],
  atlases: Record<string, Texture>,
): Promise<void> {
  const tasks: Promise<void>[] = [];
  const seen = new Set<string>();
  for (const id of areaIds) {
    const entry = AREA_PALETTES.get(id);
    if (!entry?.tileset) continue;
    const relPath = tilesetRelPath(entry.tileset);
    if (seen.has(relPath) || atlases[relPath]) continue;
    seen.add(relPath);
    tasks.push(
      Assets.load(assetPath(`assets/${relPath}`))
        .then((tex) => {
          atlases[relPath] = tex as Texture;
        })
        .catch((e) => {
          console.warn(`[areaPalettes] failed to load tileset "${entry.tileset}" (${relPath}):`, e);
        }),
    );
  }
  await Promise.all(tasks);
}

/**
 * Retag each tile's `tilesetPath` so it points at the CSV-declared tileset
 * for this AreaID. CSV (`Sheets/Content_System_Area_Palette.csv`) is the
 * single source of truth — LDtk's `__tilesetRelPath` is ignored after this
 * call.
 *
 * Why this exists: LDtk stores one `__tilesetRelPath` per layer at authoring
 * time (e.g. `atlas/world_01.png`). The CSV often specifies different tilesets
 * for BG vs WALL (e.g. BG=world_01, WALL=SunnyLand). Without retag, BG and
 * WALL collide on the same LDtk key and the renderer resolves both to
 * whichever atlas was registered first. Retag moves the lookup from LDtk's
 * path to the CSV-derived path so each layer picks its own atlas.
 *
 * Hazard "color region" tiles (src[0] >= 160 && src[1] >= 208) are left
 * untouched — they're raw color swatches baked into the LDtk source atlas
 * (world_01), and the CSV-specified replacement tileset (e.g. SunnyLand)
 * would have different pixels at those coordinates.
 *
 * Scenes must still call `ensureAreaTilesetsLoaded` beforehand so the
 * CSV-keyed atlas textures exist in the atlases map.
 */
export function applyAreaTilesetToLdtkTiles(
  areaId: string,
  tiles: ReadonlyArray<{ tilesetPath: string | null; src: [number, number] }>,
): void {
  const entry = AREA_PALETTES.get(areaId);
  if (!entry?.tileset) return;
  const csvKey = tilesetRelPath(entry.tileset);
  for (const t of tiles) {
    // Preserve hazard/color-region tiles on their authored atlas.
    if (t.src[0] >= 160 && t.src[1] >= 208) continue;
    (t as { tilesetPath: string | null }).tilesetPath = csvKey;
  }
}
