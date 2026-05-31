// Rim-light filter: detects an exposed edge of opaque pixels and adds a
// configurable bright highlight line. By default it catches top edges; callers
// can flip it to bottom edges for scenes lit from below.

import { Filter, GlProgram, UniformGroup } from 'pixi.js';

const vertex = /* glsl */ `
in vec2 aPosition;
out vec2 vTextureCoord;
out vec2 vTexelSize;

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
  vTexelSize = uInputSize.zw;
}
`;

const fragment = /* glsl */ `
in vec2 vTextureCoord;
in vec2 vTexelSize;
out vec4 finalColor;

uniform sampler2D uTexture;

uniform vec3  uRimColor;
uniform float uRimAlpha;
uniform float uRimThickness;
uniform float uEdgeGuardPixels;
uniform float uRimDirection;

void main() {
  vec4 src = texture(uTexture, vTextureCoord);
  if (src.a < 0.01) {
    finalColor = src;
    return;
  }

  float stepY = vTexelSize.y;
  float dir = uRimDirection >= 0.0 ? 1.0 : -1.0;
  float guard = stepY * max(1.0, uEdgeGuardPixels);
  if ((dir < 0.0 && vTextureCoord.y < guard) || (dir > 0.0 && vTextureCoord.y > 1.0 - guard)) {
    finalColor = src;
    return;
  }
  float rimStrength = 0.0;

  float a1 = texture(uTexture, vTextureCoord + vec2(0.0, dir * stepY)).a;
  if (a1 < 0.1) {
    rimStrength = 1.0;
  } else if (uRimThickness > 1.0) {
    float a2 = texture(uTexture, vTextureCoord + vec2(0.0, dir * 2.0 * stepY)).a;
    if (a2 < 0.1) {
      rimStrength = 0.5;
    } else if (uRimThickness > 2.0) {
      float a3 = texture(uTexture, vTextureCoord + vec2(0.0, dir * 3.0 * stepY)).a;
      if (a3 < 0.1) {
        rimStrength = 0.33;
      }
    }
  }

  finalColor = vec4(src.rgb + uRimColor * rimStrength * uRimAlpha, src.a);
}
`;

export type RimLightDirection = 'top' | 'bottom';

export interface RimLightOptions {
  /** Rim highlight color as 0xRRGGBB. Default 0xFF4422 (warm red). */
  color?: number;
  /** Rim opacity 0..1. Default 0.5. */
  alpha?: number;
  /** Rim thickness in pixels (1..3). Default 1. */
  thickness?: number;
  /** Exposed edge to highlight. Default 'top'. */
  direction?: RimLightDirection;
  /** Suppress rim detection this many input pixels from the sampled edge. Default 1. */
  edgeGuardPixels?: number;
  /** Legacy alias for edgeGuardPixels. */
  topGuardPixels?: number;
}

export class RimLightFilter extends Filter {
  constructor(opts: RimLightOptions = {}) {
    const c = opts.color ?? 0xff4422;
    const rgb: Float32Array = new Float32Array([
      ((c >> 16) & 0xff) / 255,
      ((c >> 8) & 0xff) / 255,
      (c & 0xff) / 255,
    ]);
    const direction: RimLightDirection = opts.direction ?? 'top';
    const edgeGuardPixels = opts.edgeGuardPixels ?? opts.topGuardPixels ?? 1;

    const glProgram = GlProgram.from({ vertex, fragment, name: 'rim-light' });

    const rimUniforms = new UniformGroup({
      uRimColor: { value: rgb, type: 'vec3<f32>' },
      uRimAlpha: { value: opts.alpha ?? 0.5, type: 'f32' },
      uRimThickness: { value: opts.thickness ?? 1, type: 'f32' },
      uEdgeGuardPixels: { value: Math.max(1, edgeGuardPixels), type: 'f32' },
      uRimDirection: { value: direction === 'bottom' ? 1 : -1, type: 'f32' },
    });

    super({
      glProgram,
      resources: { rimUniforms },
      padding: Math.ceil(opts.thickness ?? 1) + 1,
    });
  }

  setColor(color: number): void {
    const uniforms = (this.resources.rimUniforms as any).uniforms;
    uniforms.uRimColor = new Float32Array([
      ((color >> 16) & 0xff) / 255,
      ((color >> 8) & 0xff) / 255,
      (color & 0xff) / 255,
    ]);
  }

  setAlpha(alpha: number): void {
    const uniforms = (this.resources.rimUniforms as any).uniforms;
    uniforms.uRimAlpha = Math.max(0, Math.min(1, alpha));
  }

  setThickness(thickness: number): void {
    const uniforms = (this.resources.rimUniforms as any).uniforms;
    uniforms.uRimThickness = Math.max(1, Math.min(3, thickness));
  }

  setEdgeGuardPixels(pixels: number): void {
    const uniforms = (this.resources.rimUniforms as any).uniforms;
    uniforms.uEdgeGuardPixels = Math.max(1, pixels);
  }

  setTopGuardPixels(pixels: number): void {
    this.setEdgeGuardPixels(pixels);
  }

  setDirection(direction: RimLightDirection): void {
    const uniforms = (this.resources.rimUniforms as any).uniforms;
    uniforms.uRimDirection = direction === 'bottom' ? 1 : -1;
  }
}
