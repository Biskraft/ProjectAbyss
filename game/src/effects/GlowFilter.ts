/**
 * GlowFilter — single-pass radial glow/bloom for small light sources.
 *
 * Samples surrounding pixels in a disc pattern, accumulates their brightness,
 * and adds it back as a colored glow. The core pixel is boosted to white-hot.
 * Designed for small Graphics lights (2-16px), not full-screen bloom.
 *
 * Usage:
 *   const glow = new GlowFilter({ color: 0xE87830, radius: 12, intensity: 1.5 });
 *   lightContainer.filters = [glow];
 */

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

uniform vec3  uGlowColor;
uniform float uRadius;
uniform float uIntensity;
uniform float uCoreBoost;

void main() {
  vec4 src = texture(uTexture, vTextureCoord);

  // Accumulate surrounding glow via disc sampling
  float total = 0.0;
  float count = 0.0;

  // 12-tap disc pattern at 3 radii
  for (float r = 1.0; r <= 3.0; r += 1.0) {
    float dist = r / 3.0 * uRadius;
    for (float a = 0.0; a < 6.2831; a += 1.5708) { // 4 angles per ring
      vec2 offset = vec2(cos(a), sin(a)) * dist * vTexelSize;
      vec4 s = texture(uTexture, vTextureCoord + offset);
      float weight = 1.0 - (r / 3.5); // falloff with distance
      total += s.a * weight;
      count += weight;
    }
  }

  float glow = (count > 0.0) ? total / count : 0.0;

  // Core boost: make bright pixels white-hot
  float luma = dot(src.rgb, vec3(0.299, 0.587, 0.114));
  float core = smoothstep(0.3, 0.8, luma) * src.a * uCoreBoost;
  vec3 coreColor = mix(src.rgb, vec3(1.0), core);

  // Combine: original + glow halo + core boost
  vec3 glowContrib = uGlowColor * glow * uIntensity;
  vec3 result = coreColor + glowContrib;

  // Alpha: original + glow spread
  float outAlpha = min(1.0, src.a + glow * uIntensity * 0.5);

  finalColor = vec4(result, outAlpha);
}
`;

export interface GlowOptions {
  /** Glow color as 0xRRGGBB. Default 0xE87830 (forge orange). */
  color?: number;
  /** Blur sample radius in pixels. Default 8. */
  radius?: number;
  /** Glow brightness multiplier. Default 1.2. */
  intensity?: number;
  /** Core white-hot boost (0=none, 1=full). Default 0.8. */
  coreBoost?: number;
}

export class GlowFilter extends Filter {
  constructor(opts: GlowOptions = {}) {
    const c = opts.color ?? 0xE87830;
    const rgb = new Float32Array([
      ((c >> 16) & 0xff) / 255,
      ((c >> 8) & 0xff) / 255,
      (c & 0xff) / 255,
    ]);
    const radius = opts.radius ?? 8;

    const glProgram = GlProgram.from({ vertex, fragment, name: 'glow' });

    const glowUniforms = new UniformGroup({
      uGlowColor: { value: rgb, type: 'vec3<f32>' },
      uRadius: { value: radius, type: 'f32' },
      uIntensity: { value: opts.intensity ?? 1.2, type: 'f32' },
      uCoreBoost: { value: opts.coreBoost ?? 0.8, type: 'f32' },
    });

    super({
      glProgram,
      resources: { glowUniforms },
      padding: radius + 2,
    });
  }

  setIntensity(v: number): void {
    (this.resources.glowUniforms as any).uniforms.uIntensity = v;
  }

  setColor(c: number): void {
    const u = (this.resources.glowUniforms as any).uniforms;
    u.uGlowColor = new Float32Array([
      ((c >> 16) & 0xff) / 255,
      ((c >> 8) & 0xff) / 255,
      (c & 0xff) / 255,
    ]);
  }
}
