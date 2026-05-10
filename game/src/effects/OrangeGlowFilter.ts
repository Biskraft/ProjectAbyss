/**
 * OrangeGlowFilter — chromatic-mask variant of GlowFilter.
 *
 * Only pixels matching a "warm orange" signature (high R, low B, mid G)
 * contribute to and receive the glow. The rest of the sprite renders
 * unchanged. Used by Ghost so its eyes + booster flame glow without
 * casting a halo around the cool-toned body.
 *
 * Usage:
 *   sprite.filters = [new OrangeGlowFilter({ color: 0xFF7000, intensity: 2.0 })];
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

// Eye/ember mask. 1.0 = saturated bright orange (eye glow / booster fire),
// 0 = bone-warm desaturated body / cool body / dark areas.
// Two gates: warm-orange chromaticity AND high saturation. Saturation gate
// rejects warm-but-desaturated pixels (skeleton bones, leather etc.) while
// still passing the vivid orange light pixels we actually want to glow.
float orangeMask(vec3 c) {
  float warm = clamp(c.r * 1.6 - c.b * 2.2 - c.g * 0.2, 0.0, 1.0);
  float maxC = max(max(c.r, c.g), c.b);
  float minC = min(min(c.r, c.g), c.b);
  float sat  = maxC - minC;
  float satGate = smoothstep(0.4, 0.7, sat);
  return warm * satGate;
}

void main() {
  vec4 src = texture(uTexture, vTextureCoord);

  // Glow halo — only orange pixels contribute via the chromatic mask.
  float total = 0.0;
  float count = 0.0;
  for (float r = 1.0; r <= 3.0; r += 1.0) {
    float dist = r / 3.0 * uRadius;
    for (float a = 0.0; a < 6.2831; a += 1.5708) {
      vec2 offset = vec2(cos(a), sin(a)) * dist * vTexelSize;
      vec4 s = texture(uTexture, vTextureCoord + offset);
      float weight = 1.0 - (r / 3.5);
      float mask = orangeMask(s.rgb);
      total += s.a * weight * mask;
      count += weight;
    }
  }
  float glow = (count > 0.0) ? total / count : 0.0;

  // Core white-hot — gated to orange pixels only so the cool-toned body
  // doesn't bloom out.
  float srcMask = orangeMask(src.rgb);
  float luma = dot(src.rgb, vec3(0.299, 0.587, 0.114));
  float core = smoothstep(0.3, 0.8, luma) * src.a * uCoreBoost * srcMask;
  vec3 coreColor = mix(src.rgb, vec3(1.0), core);

  vec3 glowContrib = uGlowColor * glow * uIntensity;
  vec3 result = coreColor + glowContrib;

  float outAlpha = min(1.0, src.a + glow * uIntensity * 0.5);
  finalColor = vec4(result, outAlpha);
}
`;

export interface OrangeGlowOptions {
  /** Glow color as 0xRRGGBB. Default 0xFF7000 (booster orange). */
  color?: number;
  /** Blur sample radius in pixels. Default 8. */
  radius?: number;
  /** Glow brightness multiplier. Default 1.6 — tuned strong since only
   *  orange pixels contribute. */
  intensity?: number;
  /** Core white-hot boost (0=none, 1=full). Default 1.0. */
  coreBoost?: number;
}

export class OrangeGlowFilter extends Filter {
  constructor(opts: OrangeGlowOptions = {}) {
    const c = opts.color ?? 0xFF7000;
    const rgb = new Float32Array([
      ((c >> 16) & 0xff) / 255,
      ((c >> 8) & 0xff) / 255,
      (c & 0xff) / 255,
    ]);
    const radius = opts.radius ?? 8;

    const glProgram = GlProgram.from({ vertex, fragment, name: 'orange-glow' });

    const glowUniforms = new UniformGroup({
      uGlowColor: { value: rgb, type: 'vec3<f32>' },
      uRadius: { value: radius, type: 'f32' },
      uIntensity: { value: opts.intensity ?? 1.6, type: 'f32' },
      uCoreBoost: { value: opts.coreBoost ?? 1.0, type: 'f32' },
    });

    super({
      glProgram,
      resources: { glowUniforms },
      padding: radius + 2,
    });
  }

  /** Mutate intensity at runtime — used for slow pulse animation. */
  setIntensity(v: number): void {
    (this.resources.glowUniforms as any).uniforms.uIntensity = v;
  }
}
