// Dead Cells-style grayscale + 1D-LUT gradient map filter (PixiJS v8).
// Input sprite is treated as grayscale (luma from red channel); output color is
// sampled from a palette texture (256 x N rows, one row per biome).
//
// Research: Documents/Research/DeadCells_GrayscalePalette_Research.md

import { Filter, GlProgram, Texture, UniformGroup } from 'pixi.js';

const vertex = /* glsl */ `
in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition() {
  vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
  position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
  return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord() {
  return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main() {
  gl_Position = filterVertexPosition();
  vTextureCoord = filterTextureCoord();
}
`;

const fragment = /* glsl */ `
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform sampler2D uPaletteTex;

uniform float uPaletteRow;
uniform float uPaletteRowCount;
uniform float uStrength;
// Dead Cells-style atmospheric depth gradient. Biases the luma lookup by
// screen Y so the SAME source pixel samples different palette positions
// at the top vs bottom of the screen -- this is what makes single-tone
// pixel art read as a smooth continuous gradient.
uniform float uDepthBias;   // magnitude (0 = disabled, ~0.25 = strong)
uniform float uDepthCenter; // screen-Y pivot (0..1, 0.5 = middle)
uniform float uBrightness;  // 1.0 = neutral, >1 brighter, <1 darker
uniform vec3  uTint;        // 1.0 = neutral, per-channel multiplier

void main() {
  vec4 src = texture(uTexture, vTextureCoord);
  float luma = dot(src.rgb, vec3(0.2126, 0.7152, 0.0722));

  // Shift luma based on vertical screen position. Negative offset above the
  // pivot -> darker palette samples, positive below -> brighter samples.
  float depthShift = (vTextureCoord.y - uDepthCenter) * uDepthBias;
  float biased = clamp(luma + depthShift, 0.0, 1.0);

  float v = (uPaletteRow + 0.5) / max(uPaletteRowCount, 1.0);
  vec3 mapped = texture(uPaletteTex, vec2(biased, v)).rgb;
  mapped = mapped * uBrightness * uTint;
  vec3 color = mix(src.rgb, mapped, uStrength);
  finalColor = vec4(color * src.a, src.a);
}
`;

export interface PaletteSwapOptions {
  /** Palette texture (width=256, height=rowCount). */
  paletteTex: Texture;
  /** Number of palette rows packed vertically. */
  rowCount: number;
  /** Initial palette row (0-indexed). */
  row?: number;
  /** Blend between source (0) and palette-mapped color (1). Default 1. */
  strength?: number;
  /**
   * Screen-Y-based luma bias magnitude. 0 disables the depth gradient;
   * ~0.25 is subtle; ~0.5 is dramatic. Default 0.35 (Dead Cells-ish).
   */
  depthBias?: number;
  /** Y pivot for the depth gradient (0..1). Default 0.5 (screen center). */
  depthCenter?: number;
  /** Multiplier applied to the palette-sampled color. Default 1.0. */
  brightness?: number;
  /** Per-channel tint 0xRRGGBB (each channel /255 becomes a multiplier). Default 0xFFFFFF. */
  tint?: number;
}

export class PaletteSwapFilter extends Filter {
  private _paletteTex: Texture;
  private _rowCount: number;

  constructor(opts: PaletteSwapOptions) {
    const glProgram = GlProgram.from({ vertex, fragment, name: 'palette-swap' });

    const tintRgb = unpackTintUniform(opts.tint ?? 0xffffff);
    const paletteUniforms = new UniformGroup({
      uPaletteRow: { value: opts.row ?? 0, type: 'f32' },
      uPaletteRowCount: { value: opts.rowCount, type: 'f32' },
      uStrength: { value: opts.strength ?? 1.0, type: 'f32' },
      uDepthBias: { value: opts.depthBias ?? 0.35, type: 'f32' },
      uDepthCenter: { value: opts.depthCenter ?? 0.5, type: 'f32' },
      uBrightness: { value: opts.brightness ?? 1.0, type: 'f32' },
      uTint: { value: tintRgb, type: 'vec3<f32>' },
    });

    super({
      glProgram,
      resources: {
        paletteUniforms,
        uPaletteTex: opts.paletteTex.source,
        uPaletteSampler: opts.paletteTex.source.style,
      },
    });

    this._paletteTex = opts.paletteTex;
    this._rowCount = opts.rowCount;
  }

  setRow(row: number): void {
    const uniforms = (this.resources.paletteUniforms as any).uniforms;
    uniforms.uPaletteRow = Math.max(0, Math.min(row, this._rowCount - 1));
  }

  setStrength(strength: number): void {
    const uniforms = (this.resources.paletteUniforms as any).uniforms;
    uniforms.uStrength = Math.max(0, Math.min(strength, 1));
  }

  /** Set the Dead Cells-style depth gradient magnitude (0 = off, ~0.35 = default). */
  setDepthBias(bias: number): void {
    const uniforms = (this.resources.paletteUniforms as any).uniforms;
    uniforms.uDepthBias = bias;
  }

  /** Scale the palette-sampled color (>1 brightens, <1 darkens). */
  setBrightness(brightness: number): void {
    const uniforms = (this.resources.paletteUniforms as any).uniforms;
    uniforms.uBrightness = brightness;
  }

  /** Per-channel tint multiplier from a 0xRRGGBB constant. */
  setTint(tint: number): void {
    const uniforms = (this.resources.paletteUniforms as any).uniforms;
    uniforms.uTint = unpackTintUniform(tint);
  }

  /** Swap the palette atlas at runtime (e.g. accessibility / biome change). */
  setPalette(paletteTex: Texture, rowCount: number): void {
    this._paletteTex = paletteTex;
    this._rowCount = rowCount;
    (this.resources as any).uPaletteTex = paletteTex.source;
    (this.resources as any).uPaletteSampler = paletteTex.source.style;
    const uniforms = (this.resources.paletteUniforms as any).uniforms;
    uniforms.uPaletteRowCount = rowCount;
  }

  get rowCount(): number {
    return this._rowCount;
  }
}

// ---------------------------------------------------------------------------
// Procedural palette texture generator
// ---------------------------------------------------------------------------
//
// Generates a 256 x rows palette atlas from a list of stop arrays — no PNG
// asset shipping required for the prototype. Each row is a single biome; each
// stop is { t: 0..1, color: 0xRRGGBB }. Values are linearly interpolated
// between stops, then rendered as a canvas texture with nearest filtering to
// preserve the 16-step banding look that Dead Cells relies on.

export interface PaletteStop {
  t: number; // 0..1 (mapped to luma 0..255)
  color: number; // 0xRRGGBB
}

export interface PaletteDefinition {
  name: string;
  stops: PaletteStop[];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function sampleRow(stops: PaletteStop[], t: number): [number, number, number] {
  const sorted = [...stops].sort((a, b) => a.t - b.t);
  if (t <= sorted[0].t) return unpack(sorted[0].color);
  if (t >= sorted[sorted.length - 1].t) return unpack(sorted[sorted.length - 1].color);
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (t >= a.t && t <= b.t) {
      const localT = (t - a.t) / Math.max(b.t - a.t, 1e-6);
      const [ar, ag, ab] = unpack(a.color);
      const [br, bg, bb] = unpack(b.color);
      return [lerp(ar, br, localT), lerp(ag, bg, localT), lerp(ab, bb, localT)];
    }
  }
  return unpack(sorted[sorted.length - 1].color);
}

function unpack(rgb: number): [number, number, number] {
  return [(rgb >> 16) & 0xff, (rgb >> 8) & 0xff, rgb & 0xff];
}

/**
 * Parse the inline stops string used in Content_System_Area_Palette.csv:
 *   "0.00:3a1a28|0.20:6a2a3a|..."
 */
export function parsePaletteStopsString(raw: string): PaletteStop[] {
  const stops: PaletteStop[] = [];
  for (const pair of raw.split('|')) {
    const [tStr, hexStr] = pair.split(':');
    if (!tStr || !hexStr) continue;
    stops.push({
      t: parseFloat(tStr),
      color: parseInt(hexStr.trim().replace(/^0x/i, ''), 16),
    });
  }
  return stops;
}

/** Per-channel [0..1] multiplier tuple used as a vec3 shader uniform. */
function unpackTintUniform(rgb: number): Float32Array {
  return new Float32Array([
    ((rgb >> 16) & 0xff) / 255,
    ((rgb >> 8) & 0xff) / 255,
    (rgb & 0xff) / 255,
  ]);
}

export function buildPaletteTexture(palettes: PaletteDefinition[]): Texture {
  const W = 256;
  const H = palettes.length;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('PaletteSwapFilter: 2D context unavailable');

  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    const stops = palettes[y].stops;
    for (let x = 0; x < W; x++) {
      const t = x / (W - 1);
      const [r, g, b] = sampleRow(stops, t);
      const i = (y * W + x) * 4;
      img.data[i] = Math.round(r);
      img.data[i + 1] = Math.round(g);
      img.data[i + 2] = Math.round(b);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = Texture.from(canvas);
  // Linear sampling on the palette produces Dead Cells-style smooth hue
  // transitions across the source's discrete luma steps. The source pixel art
  // stays crisp because we only smooth the palette LUT, not the tile texture.
  tex.source.scaleMode = 'linear';
  return tex;
}

// ---------------------------------------------------------------------------
// ECHORIS palette DB
// ---------------------------------------------------------------------------
// The palette atlas is now defined in Sheets/Content_System_Area_Palette.csv
// and loaded by game/src/data/areaPalettes.ts. Use `getAreaPaletteAtlas()` +
// `getAreaPaletteRow(id)` from that module to drive this filter.

