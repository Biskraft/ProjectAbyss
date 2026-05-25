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
uniform float uOffsetPx;

void main() {
  vec2 off = vec2(uOffsetPx * vTexelSize.x, 0.0);
  float r = texture(uTexture, vTextureCoord + off).r;
  vec4  g = texture(uTexture, vTextureCoord);
  float b = texture(uTexture, vTextureCoord - off).b;
  finalColor = vec4(r, g.g, b, g.a);
}
`;

export class RGBSplitFilter extends Filter {
  private static readonly MAX_PADDING = 24;

  constructor() {
    const glProgram = GlProgram.from({ vertex, fragment, name: 'rgb-split' });
    const rgbUniforms = new UniformGroup({
      uOffsetPx: { value: 0, type: 'f32' },
    });
    super({ glProgram, resources: { rgbUniforms }, padding: RGBSplitFilter.MAX_PADDING });
  }

  /** Set horizontal RGB offset in pixels. */
  setOffset(px: number): void {
    (this.resources.rgbUniforms as any).uniforms.uOffsetPx = px;
  }
}
