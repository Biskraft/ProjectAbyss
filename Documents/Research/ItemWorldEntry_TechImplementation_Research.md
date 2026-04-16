# 아이템계 진입 연출 — 기술 구현 리서치

> **작성일:** 2026-04-06
> **담당:** 게임 디자이너 (기술 연출 연구)
> **목적:** "바닥 붕괴 → 아이템 속으로 다이빙" 진입 시퀀스의 **PixiJS v8 WebGL 기술 구현**을 구체화한다.
>   기존 설계 개념 문서(`ItemWorld_EntryTransition_Research.md`)의 후속 기술 문서.
> **참조 문서:**
> - `Documents/Research/ItemWorld_EntryTransition_Research.md` — 설계 개념 및 레퍼런스
> - `game/src/effects/FloorCollapse.ts` — 기존 바닥 붕괴 구현
> - `game/src/effects/PortalTransition.ts` — 기존 포탈 전환 구현
> - `game/src/Game.ts` — RenderTexture 파이프라인 (worldRT)
> - `game/src/core/SceneManager.ts` — 씬 전환 구조

---

## 목차

1. [현재 구현 상태 분석](#1-현재-구현-상태-분석)
2. [PixiJS v8 Filter 및 셰이더 시스템](#2-pixijs-v8-filter-및-셰이더-시스템)
3. [RenderTexture 기반 전환 패턴](#3-rendertexture-기반-전환-패턴)
4. [게임별 기술 분석 — Dead Cells, Hollow Knight, Hades](#4-게임별-기술-분석)
5. [14가지 픽셀아트 전환 기법 — GLSL 구현](#5-14가지-픽셀아트-전환-기법--glsl-구현)
6. [전체 시퀀스 체이닝: 바닥 붕괴 → 다크닝 → 와이프 → 씬 로드](#6-전체-시퀀스-체이닝)
7. [성능 고려사항 — GC 스톨 방지](#7-성능-고려사항--gc-스톨-방지)
8. [ECHORIS 권장 구현 설계](#8-project-abyss-권장-구현-설계)
9. [출처](#9-출처)

---

## 1. 현재 구현 상태 분석

### 1-1. 기존 코드베이스 현황

ECHORIS는 이미 두 개의 전환 이펙트 클래스를 보유하고 있다.

| 파일 | 역할 | 현재 상태 |
|:-----|:-----|:---------|
| `FloorCollapse.ts` | 8페이즈 바닥 붕괴 시퀀스 (~3.4초) | 구현 완료. `Graphics` 기반, 셰이더 없음 |
| `PortalTransition.ts` | 포탈 진입 전환 (~1.8초) | 구현 완료. `Graphics` 기반, 셰이더 없음 |
| `ScreenFlash.ts` | 단순 전체화면 플래시 | 구현 완료 |

**현재 파이프라인 구조:**

```
gameContainer (Container)
  └─ scene.container
       └─ [tilemap, entities, effects, HUD]

Game.ts:
  renderer.render(gameContainer → worldRT)  // 640×360 RenderTexture
  renderer.render(worldSprite → screen)      // 픽셀 스케일링
```

`Game.ts`는 `worldRT`라는 `RenderTexture`에 게임 월드를 렌더링한 뒤, `worldSprite`를 통해 화면에 최종 출력한다. 이 구조는 **전환 셰이더 삽입에 매우 유리**하다: `worldSprite.filters`에 필터를 붙이면 전체 게임 화면에 셰이더가 적용된다.

### 1-2. 기술적 갭 (Missing Pieces)

기존 구현이 `Graphics` 드로우콜 기반이기 때문에 다음이 없다:

1. **GLSL 셰이더 기반 전환 필터** — 원형 와이프, 픽셀 디졸브, 색상 흡수 등
2. **씬 스냅샷 패턴** — 이전 씬을 RenderTexture에 고정(freeze)하고 새 씬 위에서 전환
3. **필터 자원 풀링** — 전환 중 셰이더 객체 생성/소멸을 막는 풀
4. **체이닝 오케스트레이터** — `FloorCollapse → 셰이더 전환 → ItemWorldScene 로드` 순서 제어

---

## 2. PixiJS v8 Filter 및 셰이더 시스템

### 2-1. v8 Filter API — v7과의 주요 차이

PixiJS v8은 GLSL ES 3.0을 사용한다. v7과의 핵심 차이점:

| 항목 | v7 (구) | v8 (현재) |
|:-----|:--------|:---------|
| Varying | `varying vec2 vTextureCoord` | `in vec2 vTextureCoord` (fragment) |
| Attribute | `attribute vec2 aVertexPosition` | `in vec2 aPosition` |
| Output | `gl_FragColor = ...` | `out vec4 finalColor; finalColor = ...` |
| 텍스처 샘플링 | `texture2D(uSampler, uv)` | `texture(uTexture, uv)` |
| Uniform 등록 | `new Filter(vert, frag, uniforms)` | `resources: { group: { uVar: { value, type } } }` |
| Uniform 업데이트 | `filter.uniforms.uTime = val` | `filter.resources.groupName.uniforms.uTime = val` |

### 2-2. Fragment-Only Filter 패턴 (권장)

PixiJS v8은 기본 버텍스 셰이더를 제공한다. 전환 이펙트는 대부분 fragment-only 방식으로 충분하다.

```typescript
import { Filter, GlProgram } from 'pixi.js';

// Fragment 셰이더만 작성하면 되는 패턴
const irisFilter = new Filter({
  glProgram: new GlProgram({
    vertex: undefined,   // 기본 버텍스 셰이더 사용
    fragment: IRIS_WIPE_FRAG,
  }),
  resources: {
    transitionUniforms: {
      uProgress:    { value: 0.0, type: 'f32' },
      uCenter:      { value: [0.5, 0.5], type: 'vec2<f32>' },
      uEdgeSoftness: { value: 0.02, type: 'f32' },
    },
  },
});

// 매 프레임 업데이트
irisFilter.resources.transitionUniforms.uniforms.uProgress = currentProgress;
```

### 2-3. worldSprite.filters 를 이용한 전체 화면 셰이더

`Game.ts`의 `worldSprite`는 이미 전체 게임 화면을 덮는 Sprite이다.
여기에 필터를 붙이면 별도의 RenderTexture 없이 전체 화면에 셰이더가 적용된다.

```typescript
// Game.ts 또는 TransitionController에서
game.worldSprite.filters = [transitionFilter];

// 전환 완료 후 반드시 제거 (메모리 누수 방지)
game.worldSprite.filters = null;
```

**주의:** `worldSprite.filters`를 사용하면 PixiJS가 내부적으로 임시 RenderTexture를 생성한다.
`padding` 속성을 0으로 설정하면 불필요한 여백 렌더링을 방지한다.

```typescript
irisFilter.padding = 0;
```

---

## 3. RenderTexture 기반 전환 패턴

### 3-1. 씬 스냅샷 패턴 (Scene Snapshot Pattern)

전환 셰이더가 "이전 씬 → 새 씬" 두 장의 텍스처를 필요로 할 때 사용한다.

```
[전환 시작]
  1. renderer.render(currentScene → snapshotRT)  // 이전 씬 고정
  2. SceneManager.replace(newScene)               // 새 씬 로드 시작
  3. newScene.init() 동안 스냅샷 표시

[전환 실행]
  4. 매 프레임: renderer.render(newScene → liveRT)
  5. 전환 필터: mix(snapshotRT, liveRT, progress)
  6. worldSprite = liveRT + filter

[전환 완료]
  7. snapshotRT.destroy() — 스냅샷 해제
  8. filter = null
```

### 3-2. 스냅샷 RT 생성 — 크기 최적화

전환용 스냅샷은 게임 해상도(640×360)로 충분하다. 고해상도 RT는 불필요하다.

```typescript
export class SceneTransitionManager {
  private snapshotRT: RenderTexture | null = null;

  /** 현재 화면을 스냅샷으로 고정 */
  captureSnapshot(renderer: WebGLRenderer, source: Container): void {
    // 기존 RT 재사용 (신규 할당 방지 — GC 절약)
    if (!this.snapshotRT) {
      this.snapshotRT = RenderTexture.create({
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        resolution: 1,
        antialias: false,
      });
    }
    renderer.render({ container: source, target: this.snapshotRT });
  }

  /** 스냅샷 텍스처를 셰이더 uniform으로 전달 */
  getSnapshotTexture(): RenderTexture | null {
    return this.snapshotRT;
  }

  /** 전환 완료 후 호출 — destroy 대신 내부 보관 (풀링) */
  releaseSnapshot(): void {
    // snapshotRT를 destroy하지 않고 보관해 다음 전환에 재사용
    // GC 스톨 방지
  }
}
```

### 3-3. Two-Texture 전환 셰이더 패턴

```glsl
// GLSL ES 3.0 — 이전 씬과 새 씬을 blending
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;        // 현재 씬 (live)
uniform sampler2D uPreviousScene;  // 이전 씬 (snapshot)
uniform float uProgress;           // 0.0 (이전) → 1.0 (새 씬)

void main() {
  vec4 from = texture(uPreviousScene, vTextureCoord);
  vec4 to   = texture(uTexture, vTextureCoord);
  // 각 전환 기법은 여기서 mix 방식만 달라진다
  finalColor = mix(from, to, uProgress);
}
```

---

## 4. 게임별 기술 분석

### 4-1. Dead Cells — 바이옴 간 전환

**엔진:** 커스텀 C++ (Haxe 랩핑)
**기술적 접근:**
- 씬 전환 자체는 **비교적 단순한 페이드/컷** 방식이다.
- 핵심은 **팔레트 시프트(color grading)** + **환경 변화(배경, 타일셋 교체)**의 조합.
- 전환 효과보다 **입장 직후의 환경 극변**이 임팩트를 담당한다.

**ECHORIS 적용:**
- 아이템계 각 지층 진입 시 `ColorMatrixFilter`로 색조를 변경.
- 전환 셰이더 자체에는 큰 투자 불필요 — 착지 후 타일셋/배경 색상 변화가 핵심.

```typescript
import { ColorMatrixFilter } from 'pixi.js';

// 지층별 색조 프리셋
const STRATA_COLOR_PRESETS: Record<number, number[]> = {
  1: [1, 0, 0, 0, 0,   0, 0.9, 0, 0, 0.05,   0, 0, 0.8, 0, 0.1,   0, 0, 0, 1, 0], // 따뜻
  2: [0.8, 0, 0, 0, 0.1, 0, 0.7, 0, 0, 0.05, 0, 0, 1.1, 0, 0.1,   0, 0, 0, 1, 0], // 냉각
  3: [0.6, 0, 0, 0, 0.2, 0, 0.5, 0, 0, 0.1,  0, 0, 1.3, 0, 0.2,   0, 0, 0, 1, 0], // 추상
};

const colorFilter = new ColorMatrixFilter();
colorFilter.matrix = STRATA_COLOR_PRESETS[strataDepth];
scene.container.filters = [colorFilter];
```

### 4-2. Hollow Knight — Dream Nail 진입

**엔진:** Unity 2D
**기술적 접근:**
- Dream Nail 사용 시 **화면 전체 Ripple Distortion** 셰이더 적용.
- Unity의 `ScreenSpaceOverlay` Canvas에 full-screen quad를 배치, 커스텀 material 적용.
- Ripple은 `sin(dist * freq - time * speed) * amplitude`로 UV를 변위.
- 색상 전환은 동시에 적용되는 **ColorGrading Post-Process**.
- 전환은 약 0.6초 — 시간이 짧아 간결하게 느껴진다.

**핵심 인사이트:** "연출에 드는 프레임이 짧을수록 충격이 더 크다." 1프레임 플래시 + 0.5초 전환이 2초짜리 긴 연출보다 강렬할 수 있다.

**ECHORIS 적용:**
- `FloorCollapse`의 `fade_out` 페이즈 진입 직전 — 0.3초 Ripple 셰이더 삽입.
- Ripple은 `worldSprite.filters`에 임시 적용 후 완료 시 제거.

### 4-3. Hades — 방 간 이동

**엔진:** 자체 C++ 엔진 (Supergiant)
**기술적 접근:**
- 방 출구 문 통과 시 **암전(fade to black)** + **방 즉시 전환** + **페이드인**.
- VFX 아티스트 Josh Barnett의 작업: 셰이더 노드(Shader Graph 유사)로 **절차적 형태 전환**. 메뉴 UI에서 box→circle→diamond star 전환이 관찰된다.
- 씬 전환 자체는 **단순 페이드**이지만, 방마다 **도착 연출(arrival effect)**이 화려하다.

**핵심 인사이트:** "전환 셰이더 자체보다 도착 후의 '착지 연출'이 플레이어 기억에 남는다."

**ECHORIS 적용:**
- 아이템계 첫 진입: `FloorCollapse` → 암전 → `ItemWorldScene.init()` → **플레이어 착지 충격파** 이펙트.
- 착지 충격파가 "전환이 완료되었다"는 신호를 강하게 전달.

### 4-4. 공통 패턴 요약

| 게임 | 전환 방식 | 핵심 기술 | 전환 시간 |
|:-----|:---------|:---------|:---------|
| Dead Cells | 페이드 + 환경 극변 | ColorMatrix + 타일셋 교체 | 0.2초 |
| Hollow Knight | Ripple + 색상 전환 | UV 변위 셰이더 | 0.5~0.8초 |
| Hades | 암전 + 착지 연출 | 단순 Alpha Fade + VFX | 0.3초 암전 |

세 게임 모두 전환 자체는 **0.2~0.8초로 짧게** 유지하고, 임팩트는 **도착 후 연출**에 집중한다.

---

## 5. 14가지 픽셀아트 전환 기법 — GLSL 구현

모든 셰이더는 **PixiJS v8 GLSL ES 3.0** 기준으로 작성되었다.
변수 `uProgress`: `0.0` = 이전 씬 표시, `1.0` = 새 씬 표시.

---

### T-01. 원형 아이리스 와이프 (Circular Iris Wipe)

젤다 A Link to the Past 스타일. `uProgress=0` → 원이 닫힘(암전), `uProgress=1` → 원이 열림.

```glsl
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uProgress;   // 0.0 = closed, 1.0 = open
uniform vec2  uCenter;     // normalized (0.5, 0.5) = screen center
uniform float uEdge;       // softness: 0.0 = sharp, 0.05 = soft

void main() {
  vec2 uv = vTextureCoord;
  // 화면 종횡비 보정 — 픽셀아트는 640x360이므로 x를 조정
  vec2 aspect = vec2(640.0 / 360.0, 1.0);
  float dist = length((uv - uCenter) * aspect);

  // uProgress=0 → radius=0 (전부 검정), uProgress=1 → radius=1 (전부 표시)
  float radius = uProgress * 0.9;
  float mask = smoothstep(radius - uEdge, radius + uEdge, dist);

  vec4 scene = texture(uTexture, uv);
  finalColor = mix(scene, vec4(0.0, 0.0, 0.0, 1.0), mask);
}
```

**TypeScript 래퍼:**
```typescript
export class IrisWipeFilter extends Filter {
  constructor() {
    super({
      glProgram: new GlProgram({ fragment: IRIS_WIPE_FRAG, vertex: undefined }),
      resources: {
        u: {
          uProgress: { value: 0.0, type: 'f32' },
          uCenter:   { value: [0.5, 0.5], type: 'vec2<f32>' },
          uEdge:     { value: 0.02, type: 'f32' },
        },
      },
    });
    this.padding = 0;
  }

  set progress(v: number) {
    this.resources.u.uniforms.uProgress = Math.max(0, Math.min(1, v));
  }

  setCenter(nx: number, ny: number): void {
    this.resources.u.uniforms.uCenter = [nx, ny];
  }
}
```

---

### T-02. 리플 디스토션 (Ripple Distortion)

Hollow Knight Dream Nail 스타일. 씬이 물결처럼 왜곡된다.

```glsl
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uTime;       // seconds elapsed (0 → duration)
uniform float uStrength;   // 0.01 = subtle, 0.05 = strong
uniform float uFrequency;  // 파동 주파수 (8.0 ~ 20.0)
uniform float uDecay;      // 시간에 따른 감쇠 계수

void main() {
  vec2 uv = vTextureCoord;
  vec2 centered = uv - 0.5;
  float dist = length(centered);

  // 중심에서 바깥으로 퍼지는 사인파 변위
  float wave = sin(dist * uFrequency - uTime * 6.0) * uStrength;
  float decay = exp(-uTime * uDecay); // 시간에 따라 감쇠
  vec2 offset = normalize(centered + 0.001) * wave * decay;

  finalColor = texture(uTexture, uv + offset);
}
```

**용도:** `FloorCollapse`의 impact 페이즈(0~100ms)에 동시 적용.
`uTime`을 경과 시간(초)으로 업데이트, `uDecay=3.0`으로 0.5초 내 자연 감쇠.

---

### T-03. 소용돌이 보텍스 (Vortex Swirl)

Psychonauts 스타일. 캐릭터가 중심으로 빨려 들어가는 감각.

```glsl
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uProgress;      // 0.0 → 1.0
uniform float uSpiralStrength; // 회전 강도 (3.0 ~ 8.0)
uniform vec2  uCenter;

void main() {
  vec2 uv = vTextureCoord;
  vec2 centered = uv - uCenter;
  float dist = length(centered);
  float angle = atan(centered.y, centered.x);

  // 중심에 가까울수록 더 많이 회전 (역제곱 근사)
  float swirl = uProgress * uSpiralStrength / (dist * 8.0 + 1.0);
  angle += swirl;

  vec2 newUV = vec2(cos(angle), sin(angle)) * dist + uCenter;
  // UV 범위 밖이면 검정 처리
  if (newUV.x < 0.0 || newUV.x > 1.0 || newUV.y < 0.0 || newUV.y > 1.0) {
    finalColor = vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    finalColor = texture(uTexture, newUV);
  }
}
```

**주의사항:** `dist`가 0에 가까울 때 divide-by-zero 방지를 위해 `+ 1.0` 보정 포함.
소용돌이 진행에 따라 UV가 화면 밖을 벗어나므로 경계 처리 필수.

---

### T-04. 픽셀화 디졸브 (Pixelate Dissolve)

현실이 "디지털 분해"되는 감각. Normal 레어리티 진입에 적합.

```glsl
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uProgress;       // 0.0 = 원본, 1.0 = 최대 픽셀화 후 암전
uniform vec2  uResolution;     // vec2(640.0, 360.0)
uniform float uMaxBlockSize;   // 최대 블록 크기 (픽셀 단위, 16.0 ~ 32.0)

void main() {
  vec2 uv = vTextureCoord;

  // progress에 따라 블록 크기 증가
  float blockSize = mix(1.0, uMaxBlockSize, uProgress);
  vec2 blockUV = floor(uv * uResolution / blockSize) * blockSize / uResolution;
  vec4 color = texture(uTexture, blockUV);

  // 후반부(progress > 0.7)에서 알파 페이드
  float fade = 1.0 - smoothstep(0.7, 1.0, uProgress);
  finalColor = vec4(color.rgb, color.a * fade);
}
```

---

### T-05. 베이어 디더링 전환 (Bayer Dither Transition)

레트로 감성. 기억이 점점이 사라지는 느낌. Dead Cells/GB 게임 스타일.

```glsl
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uProgress;  // 0.0 = 전부 표시, 1.0 = 전부 소멸

// 4×4 Bayer 매트릭스 (정규화된 값)
const float bayer[16] = float[16](
   0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
  12.0/16.0,  4.0/16.0, 14.0/16.0,  6.0/16.0,
   3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
  15.0/16.0,  7.0/16.0, 13.0/16.0,  5.0/16.0
);

void main() {
  vec2 uv = vTextureCoord;
  vec4 color = texture(uTexture, uv);

  // 픽셀 좌표 기반 Bayer 인덱스
  ivec2 pixelCoord = ivec2(gl_FragCoord.xy);
  int x = int(mod(float(pixelCoord.x), 4.0));
  int y = int(mod(float(pixelCoord.y), 4.0));
  float threshold = bayer[y * 4 + x];

  // progress가 threshold를 넘은 픽셀은 소멸
  float visible = step(uProgress, threshold);
  finalColor = vec4(color.rgb, color.a * visible);
}
```

**픽셀아트 적합성:** Bayer 디더링은 저해상도에서 자연스럽다. 640×360 기준 4×4 블록이 명확하게 보여 레트로 감성을 강화한다.

---

### T-06. 그래디언트 노이즈 디졸브 (Noise Texture Dissolve)

노이즈 텍스처 기반 유기적 소멸. 화염 테두리 변형도 가능.

```glsl
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform sampler2D uNoiseTexture;  // 그레이스케일 노이즈 (별도 텍스처)
uniform float uProgress;
uniform float uEdgeWidth;         // 0.05 = 얇은 테두리, 0.15 = 두꺼운 테두리
uniform vec3  uEdgeColor;         // 테두리 색상 (레어리티 색상 사용)

void main() {
  vec2 uv = vTextureCoord;
  vec4 color = texture(uTexture, uv);
  float noiseVal = texture(uNoiseTexture, uv).r;

  float threshold = uProgress;

  if (noiseVal < threshold - uEdgeWidth) {
    // 완전 소멸
    finalColor = vec4(0.0, 0.0, 0.0, 1.0);
  } else if (noiseVal < threshold) {
    // 테두리 — 레어리티 색상 발광
    float edgeT = (noiseVal - (threshold - uEdgeWidth)) / uEdgeWidth;
    finalColor = vec4(mix(uEdgeColor, vec3(0.0), edgeT), 1.0);
  } else {
    finalColor = color;
  }
}
```

**레어리티 색상 매핑:**
```typescript
const RARITY_EDGE_COLOR: Record<Rarity, [number, number, number]> = {
  normal:    [1.0, 1.0, 1.0],
  magic:     [0.41, 0.41, 1.0],
  rare:      [1.0, 1.0, 0.0],
  legendary: [1.0, 0.5, 0.0],
  ancient:   [0.0, 1.0, 0.0],
};
```

---

### T-07. Mode 7 줌 다이브 (Zoom Dive)

앤트맨 스타일. 아이템 방향으로 급속 줌인.

```glsl
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uProgress;   // 0.0 = 원본, 1.0 = 완전 줌인
uniform vec2  uFocusPoint; // 줌 중심 (정규화 좌표)

void main() {
  vec2 uv = vTextureCoord;

  // 줌인: 텍스처 좌표를 focusPoint 방향으로 수축
  float zoomFactor = 1.0 + uProgress * 4.0; // 1x → 5x
  vec2 zoomedUV = (uv - uFocusPoint) / zoomFactor + uFocusPoint;

  // 범위 밖 처리
  if (zoomedUV.x < 0.0 || zoomedUV.x > 1.0 ||
      zoomedUV.y < 0.0 || zoomedUV.y > 1.0) {
    finalColor = vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    vec4 color = texture(uTexture, zoomedUV);
    // 후반부 알파 감쇠
    float fade = 1.0 - smoothstep(0.8, 1.0, uProgress);
    finalColor = vec4(color.rgb, fade);
  }
}
```

---

### T-08. 색상 팔레트 드레인 (Color Drain)

색이 빠지며 단색으로 수렴 후 암전. Ancient 레어리티 진입 전용.

```glsl
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uProgress;    // 0.0 = 원색, 1.0 = 단색 + 암전
uniform vec3  uTargetColor; // 수렴 목표 색상 (레어리티 색상)

void main() {
  vec2 uv = vTextureCoord;
  vec4 color = texture(uTexture, uv);

  // 단계 1: 0.0 ~ 0.6 — 색상이 targetColor로 수렴
  float colorProgress = smoothstep(0.0, 0.6, uProgress);
  vec3 drainedColor = mix(color.rgb, uTargetColor, colorProgress);

  // 단계 2: 0.6 ~ 1.0 — 밝기가 0으로 수렴 (암전)
  float fadeProgress = smoothstep(0.6, 1.0, uProgress);
  vec3 finalRgb = mix(drainedColor, vec3(0.0), fadeProgress);

  finalColor = vec4(finalRgb, color.a);
}
```

---

### T-09. 파편화 (Voronoi Shatter)

바스티온 스타일. 화면이 조각나며 떨어짐.

```glsl
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uProgress;
uniform float uCellCount;   // 보로노이 셀 수 (8.0 ~ 24.0)
uniform float uFallSpeed;   // 낙하 속도 배율 (2.0 ~ 5.0)

// 간단한 해시 함수
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)),
           dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

// 보로노이 셀 ID 계산
vec2 voronoiId(vec2 uv, float cells) {
  vec2 scaled = uv * cells;
  vec2 cell = floor(scaled);
  return cell / cells; // 정규화된 셀 식별자
}

void main() {
  vec2 uv = vTextureCoord;
  vec2 cellId = voronoiId(uv, uCellCount);
  vec2 rng = hash2(cellId);

  // 각 셀마다 다른 타이밍에 떨어짐
  float fallDelay = rng.x * 0.4;
  float fallProgress = max(0.0, (uProgress - fallDelay) / (1.0 - fallDelay));
  float fallOffset = fallProgress * fallProgress * uFallSpeed;

  // 각 셀마다 다른 X 분산
  float xDrift = (rng.y - 0.5) * 0.1 * fallProgress;

  vec2 sampleUV = uv + vec2(xDrift, fallOffset);

  // 셀이 화면 밖으로 나가면 검정
  if (sampleUV.y > 1.0 || sampleUV.x < 0.0 || sampleUV.x > 1.0) {
    finalColor = vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    finalColor = texture(uTexture, sampleUV);
  }
}
```

---

### T-10. 잔상 트레일 (Disco Trail)

앤트맨 스타일. 캐릭터 스프라이트에 잔상을 추가. 셰이더 불필요 — PixiJS 오브젝트 복제로 구현.

```typescript
/**
 * 잔상 시스템 — 셰이더 없이 스프라이트 복제로 구현
 * GC 부담 최소화를 위해 풀링(pool) 사용
 */
export class DiscoTrail {
  private pool: Sprite[] = [];
  private active: Array<{ sprite: Sprite; alpha: number; life: number }> = [];
  private readonly maxTrails = 6;
  private readonly trailLifeMs = 200;

  constructor(private parent: Container, private sourceSprite: Sprite) {
    // 풀 사전 생성 (전환 중 신규 할당 방지)
    for (let i = 0; i < this.maxTrails; i++) {
      const s = new Sprite(sourceSprite.texture);
      s.anchor.copyFrom(sourceSprite.anchor);
      s.visible = false;
      parent.addChild(s);
      this.pool.push(s);
    }
  }

  /** 매 프레임 호출 — dt: ms */
  update(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const t = this.active[i];
      t.life -= dt;
      t.alpha = Math.max(0, t.life / this.trailLifeMs) * 0.6;
      t.sprite.alpha = t.alpha;
      if (t.life <= 0) {
        t.sprite.visible = false;
        this.pool.push(t.sprite);
        this.active.splice(i, 1);
      }
    }
  }

  /** 현재 캐릭터 위치에서 잔상 스폰 */
  spawn(x: number, y: number, scaleX: number): void {
    const s = this.pool.pop();
    if (!s) return; // 풀 소진 시 스킵
    s.x = x;
    s.y = y;
    s.scale.x = scaleX;
    s.alpha = 0.6;
    s.visible = true;
    this.active.push({ sprite: s, alpha: 0.6, life: this.trailLifeMs });
  }

  destroy(): void {
    for (const s of this.pool) s.destroy();
    for (const t of this.active) t.sprite.destroy();
    this.pool.length = 0;
    this.active.length = 0;
  }
}
```

---

### T-11. 패럴랙스 줌 다이브 (Parallax Zoom Dive)

셰이더 없이 `Container.scale` 조작으로 구현. 깊이감 연출.

```typescript
/**
 * 레이어별 다른 스케일로 줌인 — 패럴랙스 효과
 * 배경은 느리게, 전경은 빠르게 확대
 */
export class ParallaxZoomDive {
  private layers: Array<{ container: Container; depth: number }> = [];
  private progress = 0;
  private active = false;

  addLayer(container: Container, depth: number): void {
    // depth: 0.0 = 가장 뒤 (느림), 1.0 = 가장 앞 (빠름)
    this.layers.push({ container, depth });
  }

  start(): void {
    this.progress = 0;
    this.active = true;
  }

  update(dt: number, durationMs: number): boolean {
    if (!this.active) return false;
    this.progress = Math.min(1, this.progress + dt / durationMs);

    for (const { container, depth } of this.layers) {
      // 깊이에 따라 다른 스케일 배율 (1x → 1.5x ~ 4x)
      const maxScale = 1 + depth * 3;
      const scale = 1 + (maxScale - 1) * this.progress;
      container.scale.set(scale);

      // 스케일 중심을 화면 중앙에 고정
      container.pivot.set(GAME_WIDTH / 2, GAME_HEIGHT / 2);
      container.position.set(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    }

    if (this.progress >= 1) {
      this.active = false;
      return true; // 완료 신호
    }
    return false;
  }
}
```

---

### T-12. 포탈 보텍스 (Portal Vortex)

원형 포탈이 화면 전체를 삼키는 고급 효과. 기존 `PortalTransition.ts`를 셰이더로 대체.

```glsl
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform sampler2D uNoiseTexture;  // 소용돌이 테두리에 노이즈 사용
uniform float uProgress;
uniform vec2  uCenter;
uniform float uRotationSpeed;     // 4.0 ~ 8.0
uniform vec3  uPortalColor;       // 레어리티 색상

void main() {
  vec2 uv = vTextureCoord;
  vec2 centered = uv - uCenter;
  vec2 aspect = vec2(640.0 / 360.0, 1.0);
  float dist = length(centered * aspect);
  float angle = atan(centered.y, centered.x);

  // 포탈 반경 (progress에 따라 확대)
  float portalRadius = uProgress * 0.8;
  float edgeWidth = 0.04;

  vec4 sceneColor = texture(uTexture, uv);

  if (dist < portalRadius - edgeWidth) {
    // 포탈 내부 — 암전 (새 씬 로드 후 여기에 새 씬 색상)
    finalColor = vec4(0.0, 0.0, 0.0, 1.0);
  } else if (dist < portalRadius + edgeWidth) {
    // 테두리 — 레어리티 색상 발광 + 소용돌이
    float t = (dist - (portalRadius - edgeWidth)) / (edgeWidth * 2.0);
    // 테두리에 회전하는 노이즈 적용
    float noiseAngle = angle + uProgress * uRotationSpeed;
    vec2 noiseUV = vec2(cos(noiseAngle), sin(noiseAngle)) * 0.5 + 0.5;
    float noise = texture(uNoiseTexture, noiseUV * 0.5).r;
    vec3 edgeColor = uPortalColor * (0.8 + noise * 0.4);
    finalColor = vec4(mix(edgeColor, sceneColor.rgb, t), 1.0);
  } else {
    // 포탈 외부 — 원본 씬, 약간 왜곡
    float distortion = 0.01 * uProgress / (dist + 0.1);
    vec2 distortUV = uv + normalize(centered) * distortion;
    finalColor = texture(uTexture, distortUV);
  }
}
```

---

### T-13. VHS 글리치 (VHS Rewind / Glitch)

Ancient 레어리티 전용. "기억이 왜곡"되는 감각.

```glsl
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uTime;        // 경과 시간 (초)
uniform float uIntensity;   // 0.0 ~ 1.0
uniform float uScanlineAlpha; // 스캔라인 강도

// 간단한 해시 — 랜덤 글리치 타이밍
float hash(float n) {
  return fract(sin(n) * 43758.5453);
}

void main() {
  vec2 uv = vTextureCoord;

  // 수평 글리치 라인
  float glitchLine = hash(floor(uv.y * 40.0) + floor(uTime * 8.0));
  float glitchOffset = (glitchLine > 0.92) ? (glitchLine - 0.92) * uIntensity * 0.08 : 0.0;

  // RGB 채널 분리 (색수차)
  float caOffset = uIntensity * 0.006;
  vec4 r = texture(uTexture, uv + vec2(caOffset + glitchOffset, 0.0));
  vec4 g = texture(uTexture, uv + vec2(glitchOffset, 0.0));
  vec4 b = texture(uTexture, uv + vec2(-caOffset + glitchOffset, 0.0));

  vec3 color = vec3(r.r, g.g, b.b);

  // 스캔라인
  float scanline = mod(gl_FragCoord.y, 3.0) < 1.0 ? (1.0 - uScanlineAlpha) : 1.0;
  color *= scanline;

  finalColor = vec4(color, 1.0);
}
```

---

### T-14. 디지털 레인 (Digital Rain)

매트릭스 스타일. 아이템 속 세계가 "데이터로 구성"임을 암시. 선택적으로 사용.

이 효과는 **PixiJS BitmapText + 스크롤**로 CPU 측에서 구현하는 편이 픽셀아트 해상도에서 더 자연스럽다.

```typescript
export class DigitalRainOverlay {
  readonly container: Container;
  private columns: Array<{ texts: BitmapText[]; y: number; speed: number }> = [];
  private readonly colWidth = 8;  // 픽셀 단위
  private readonly numCols: number;

  constructor(private color: number) {
    this.container = new Container();
    this.numCols = Math.ceil(GAME_WIDTH / this.colWidth);

    for (let i = 0; i < this.numCols; i++) {
      const speed = 60 + Math.random() * 120; // 픽셀/초
      const texts: BitmapText[] = [];
      // 열당 4~6개의 문자 스택
      for (let j = 0; j < 5; j++) {
        const t = new BitmapText({
          text: String.fromCharCode(0x30A0 + Math.floor(Math.random() * 96)),
          style: { fontFamily: PIXEL_FONT, fontSize: 8, fill: color },
        });
        t.x = i * this.colWidth;
        t.y = j * 10 - 50; // 화면 위에서 시작
        this.container.addChild(t);
        texts.push(t);
      }
      this.columns.push({ texts, y: -50 - Math.random() * 200, speed });
    }
  }

  update(dt: number): void {
    const dtSec = dt / 1000;
    for (const col of this.columns) {
      col.y += col.speed * dtSec;
      col.texts.forEach((t, i) => {
        t.y = col.y + i * 10;
        // 주기적으로 문자 변경
        if (Math.random() < 0.03) {
          t.text = String.fromCharCode(0x30A0 + Math.floor(Math.random() * 96));
        }
      });
      // 화면 아래로 나가면 위로 리셋
      if (col.y > GAME_HEIGHT + 50) {
        col.y = -60 - Math.random() * 100;
      }
    }
  }
}
```

---

## 6. 전체 시퀀스 체이닝

### 6-1. 시퀀스 다이어그램

```
[플레이어가 모루(Anvil)에 상호작용]
    ↓
[FloorCollapse.start()]
    ↓ (impact ~ collapse_inner: 0 ~ 1600ms)
    ├─ 타일 크랙, 진동, 붕괴 파편
    ├─ onShake → Camera.shake()
    └─ onScreenFlash → ScreenFlash.flash()

[FloorCollapse.phase === 'anvil_fall' (1600ms~)]
    ├─ 플레이어 낙하 애니메이션 시작
    ├─ RippleFilter 활성화 (worldSprite.filters에 추가)
    │   └─ uTime 증가로 리플 자연 감쇠
    └─ ColorDrainFilter 활성화 (레어리티 색상으로 수렴)

[FloorCollapse.phase === 'fade_out' (2400ms~)]
    ├─ IrisWipeFilter 활성화 (uProgress: 0 → 1)
    │   └─ 중심: 플레이어 발 위치
    ├─ SceneTransitionManager.captureSnapshot() 호출
    └─ 스냅샷 RT 생성 (이전 씬 고정)

[FloorCollapse.phase === 'done' (3400ms)]
    ├─ ItemWorldScene 초기화 시작 (비동기)
    │   └─ 초기화 완료 전까지 스냅샷 + IrisWipe 표시
    ├─ SceneManager.replace(itemWorldScene)
    └─ 필터 순차 제거 (done 콜백에서)

[ItemWorldScene 진입 완료]
    ├─ 플레이어 착지 충격파 이펙트 (LandingShockwave)
    ├─ worldSprite.filters = null (모든 전환 필터 해제)
    └─ 스냅샷 RT 풀 반환
```

### 6-2. TransitionOrchestrator 설계

```typescript
/**
 * 바닥 붕괴 → 씬 전환 체이닝 오케스트레이터
 * FloorCollapse 완료 후 셰이더 전환을 자동 처리
 */
export class ItemWorldEntryOrchestrator {
  private phase: 'idle' | 'collapse' | 'shader' | 'load' | 'done' = 'idle';
  private shaderProgress = 0;
  private readonly shaderDurationMs = 600;

  private irisFilter: IrisWipeFilter | null = null;
  private rippleFilter: RippleFilter | null = null;
  private colorDrainFilter: ColorDrainFilter | null = null;

  constructor(
    private game: Game,
    private collapse: FloorCollapse,
    private rarity: Rarity,
  ) {
    // 필터 사전 생성 (전환 시작 전에 미리 — 전환 중 할당 방지)
    this.irisFilter = new IrisWipeFilter();
    this.rippleFilter = new RippleFilter();
    this.colorDrainFilter = new ColorDrainFilter(RARITY_COLOR[rarity]);
  }

  start(anvilScreenX: number, anvilScreenY: number): void {
    this.phase = 'collapse';
    this.irisFilter!.setCenter(
      anvilScreenX / GAME_WIDTH,
      anvilScreenY / GAME_HEIGHT,
    );
    this.collapse.start();
  }

  update(dt: number): void {
    switch (this.phase) {
      case 'collapse':
        this.updateCollapse(dt);
        break;
      case 'shader':
        this.updateShader(dt);
        break;
    }
  }

  private updateCollapse(dt: number): void {
    // anvil_fall 페이즈 진입 시 리플 시작
    if (this.collapse.phase === 'anvil_fall') {
      if (!this.game.worldSprite.filters?.includes(this.rippleFilter!)) {
        this.game.worldSprite.filters = [this.rippleFilter!];
      }
      this.rippleFilter!.resources.u.uniforms.uTime += dt / 1000;
    }

    // fade_out 페이즈 진입 시 아이리스 추가
    if (this.collapse.phase === 'fade_out') {
      this.game.worldSprite.filters = [this.rippleFilter!, this.irisFilter!];
    }

    // 붕괴 완료 → 셰이더 페이즈
    if (this.collapse.isDone) {
      this.phase = 'shader';
      this.shaderProgress = 0;
      this.startSceneLoad();
    }
  }

  private updateShader(dt: number): void {
    this.shaderProgress += dt / this.shaderDurationMs;
    const p = Math.min(1, this.shaderProgress);

    this.irisFilter!.progress = p;

    if (p >= 1) {
      this.clearFilters();
      this.phase = 'done';
    }
  }

  private startSceneLoad(): void {
    // ItemWorldScene을 비동기 로드 — 셰이더 전환 중에 백그라운드에서 준비
    const scene = new ItemWorldScene(this.game, /* params */);
    this.game.sceneManager.replace(scene);
  }

  private clearFilters(): void {
    this.game.worldSprite.filters = null;
    // 필터 destroy — 재사용하지 않으므로 해제
    this.irisFilter?.destroy();
    this.rippleFilter?.destroy();
    this.colorDrainFilter?.destroy();
    this.irisFilter = null;
    this.rippleFilter = null;
    this.colorDrainFilter = null;
  }
}
```

### 6-3. 레어리티별 전환 구성

| 레어리티 | 셰이더 조합 | 총 전환 시간 | 추가 요소 |
|:---------|:-----------|:-----------|:---------|
| Normal | T-01 아이리스 와이프 | 3.4 + 0.4s | 없음 |
| Magic | T-01 + T-02 리플 | 3.4 + 0.6s | 파란 팔레트 시프트 |
| Rare | T-01 + T-02 + T-08 색상 드레인 | 3.4 + 0.8s | 노란 테두리 |
| Legendary | T-01 + T-03 소용돌이 + T-12 보텍스 | 3.4 + 1.0s | 폭발적 파티클 |
| Ancient | T-03 + T-08 + T-13 VHS | 3.4 + 1.5s | 슬로모션 + 글리치 |

**반복 진입 단축:**
```typescript
const ENTRY_COUNT_KEY = `itemworld_entry_${itemId}`;
const entryCount = parseInt(localStorage.getItem(ENTRY_COUNT_KEY) ?? '0');

let shaderDuration: number;
if (entryCount === 0) shaderDuration = fullDuration[rarity];
else if (entryCount < 5) shaderDuration = 800;
else shaderDuration = 300;  // 최소 — 아이리스 와이프만
```

---

## 7. 성능 고려사항 — GC 스톨 방지

### 7-1. 주요 위험 시나리오

전환 중 GC 스톨이 발생하면 1프레임 이상의 히칭(hitching)이 생겨 연출이 끊긴다.

| 위험 | 원인 | 해결책 |
|:-----|:-----|:-------|
| 필터 신규 생성 | 전환 시작 시 `new Filter()` 호출 | 씬 로드 시 필터 사전 생성 후 재사용 |
| RenderTexture 반복 생성 | 매 전환마다 `RenderTexture.create()` | RT 풀(2개) 유지, 재사용 |
| 텍스처 일괄 소멸 | `scene.destroy()` 시 수십 개 텍스처 동시 해제 | 랜덤 딜레이 분산 또는 `setTimeout` 분할 해제 |
| Debris 오브젝트 | `FloorCollapse`에서 매 프레임 `new Graphics()` | 기존 코드 이미 pooling 없음 — 리팩토링 필요 |

### 7-2. 텍스처 GC 설정

```typescript
// Game.ts 초기화 시
import { TextureGCSystem } from 'pixi.js';

// 자동 GC 비활성화 (수동 관리)
// PixiJS v8에서는 renderer.textureGC.mode로 접근
renderer.textureGC.maxIdle = 3600;     // 3600프레임 미사용 후 GC
renderer.textureGC.checkCountMax = 600; // 600프레임마다 체크
```

### 7-3. RenderTexture 풀링

```typescript
/**
 * RenderTexture 풀 — 전환 중 신규 할당 방지
 */
export class RTPool {
  private pool: RenderTexture[] = [];

  constructor(private size: number) {
    for (let i = 0; i < size; i++) {
      this.pool.push(RenderTexture.create({
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        resolution: 1,
        antialias: false,
      }));
    }
  }

  acquire(): RenderTexture | null {
    return this.pool.pop() ?? null;
  }

  release(rt: RenderTexture): void {
    this.pool.push(rt);
  }

  destroy(): void {
    for (const rt of this.pool) rt.destroy();
    this.pool.length = 0;
  }
}

// 사용 예
const transitionRTPool = new RTPool(2);  // 2개면 일반적으로 충분
```

### 7-4. Filter 객체 풀링

전환 필터는 씬 생성 시 미리 만들어두고, 전환 완료 시 destroy가 아닌 pool에 반환한다.

```typescript
// ItemWorldScene.init() 에서
this.entryFilter = filterPool.acquire('iris_wipe') ?? new IrisWipeFilter();

// ItemWorldScene.destroy() 에서
filterPool.release('iris_wipe', this.entryFilter);
```

### 7-5. FloorCollapse Debris 풀링 권장사항

현재 `FloorCollapse.ts`는 `spawnDebris()` 내에서 `new Graphics()`를 반복 생성한다.
전환 품질이 높은 레어리티(Legendary, Ancient)에서 debris 수가 많아지면 GC 스톨이 발생할 수 있다.

**개선 방향 (디자이너 제안, 구현자 판단 필요):**
- `Graphics` 대신 사전 생성된 `Sprite` 풀 사용
- 동일한 1~2개의 `Graphics` 객체를 재사용하며 위치만 변경하는 방식도 고려 가능

---

## 8. ECHORIS 권장 구현 설계

### 8-1. 권장 전환 스택 (구현 난이도 순)

**Phase 1 프로토타입 (즉시 구현 가능):**
- T-01 아이리스 와이프 + T-08 색상 드레인 조합
- 셰이더 2개만으로 모든 레어리티 대응 가능
- 기존 `FloorCollapse.ts` + `PortalTransition.ts`와 명확히 분리

**Phase 2 품질 향상:**
- T-02 리플 디스토션 추가 (Hollow Knight 감각)
- T-13 VHS 글리치 (Ancient 전용)
- `DiscoTrail` 시스템 추가 (플레이어 잔상)

**Phase 3 야리코미 감성:**
- T-12 포탈 보텍스 (Legendary/Ancient 풀 시퀀스)
- `ParallaxZoomDive`로 지층 간 이동 강화

### 8-2. 파일 구조 제안

```
game/src/effects/
  ├── FloorCollapse.ts         [기존] 바닥 붕괴
  ├── PortalTransition.ts      [기존] 포탈 전환
  ├── ScreenFlash.ts           [기존] 화면 플래시
  ├── DiscoTrail.ts            [신규] 잔상 시스템
  ├── transition/
  │   ├── IrisWipeFilter.ts    [신규] T-01 셰이더 필터
  │   ├── RippleFilter.ts      [신규] T-02 셰이더 필터
  │   ├── VortexFilter.ts      [신규] T-03 셰이더 필터
  │   ├── PixelateFilter.ts    [신규] T-04 셰이더 필터
  │   ├── DitherFilter.ts      [신규] T-05 셰이더 필터
  │   ├── ColorDrainFilter.ts  [신규] T-08 셰이더 필터
  │   ├── ShatterFilter.ts     [신규] T-09 셰이더 필터
  │   ├── VHSGlitchFilter.ts   [신규] T-13 셰이더 필터
  │   └── FilterPool.ts        [신규] 필터 풀링 관리
  └── ItemWorldEntryOrchestrator.ts  [신규] 전환 체이닝 제어
```

### 8-3. 착지 연출 (Hades 교훈 적용)

Hades 분석에서 확인된 것처럼, 전환 이후의 **착지 연출**이 기억에 남는다.
`ItemWorldScene`의 첫 번째 프레임에서 다음을 실행해야 한다:

```typescript
// ItemWorldScene.ts — enter() 또는 init() 말미에서
private playLandingEffect(): void {
  // 1. 착지 충격파 원 (플레이어 발 위치에서 확산)
  this.landingShockwave.trigger(player.x, player.y, this.rarity);

  // 2. 먼지 파티클 스폰

  // 3. 카메라 하강 충격 (아래→위 짧은 shake)
  this.game.camera.shake(SHAKE_INTENSITY[this.rarity] * 0.5);

  // 4. 착지 순간 히트스탑 (2~4 프레임)
  this.game.hitstopFrames = this.rarity === 'ancient' ? 4 : 2;

  // 5. 지층 색조 필터 적용 (Dead Cells 교훈)
  this.applyStrataColorGrading(this.currentStrata);
}
```

### 8-4. 통합 인터페이스 요약

```typescript
// 진입 연출 전체를 한 번의 호출로 시작
const orchestrator = new ItemWorldEntryOrchestrator(game, collapse, rarity);
orchestrator.start(anvilScreenX, anvilScreenY);

// 게임 루프에서
orchestrator.update(dt);

// 완료 콜백 (선택적)
orchestrator.onComplete = () => {
  // ItemWorldScene이 활성화된 이후 실행할 추가 로직
};
```

---

## 9. 출처

- [PixiJS v8 Migration Guide — Filters](https://pixijs.com/8.x/guides/migrations/v8) — v7 vs v8 셰이더 문법 차이
- [PixiJS v8 Filters & Blend Modes Guide](https://pixijs.com/8.x/guides/components/filters) — Filter API 공식 문서
- [PixiJS v8 Filter API Reference](https://pixijs.download/v8.14.3/docs/filters.Filter.html) — GlProgram, resources 구조
- [Custom Filters with PixiJS — cjgammon](https://blog.cjgammon.com/custom-filters-with-pixi-js-using-glsl-shaders/) — v8 커스텀 필터 실용 가이드
- [GLSL shader syntax in V8 Discussion](https://github.com/pixijs/pixijs/discussions/11027) — v8 GLSL ES 3.0 마이그레이션 이슈
- [PixiJS Garbage Collection Guide](https://pixijs.com/8.x/guides/concepts/garbage-collection) — TextureGCSystem 설정
- [PixiJS Performance Tips](https://pixijs.com/8.x/guides/production/performance-tips) — 오브젝트 풀링, 텍스처 관리
- [GL Transitions — Open Collection](https://gl-transitions.com/) — GLSL 전환 셰이더 카탈로그
- [WebGL Shader Techniques for Dynamic Transitions — Codrops 2025](https://tympanus.net/codrops/2025/01/22/webgl-shader-techniques-for-dynamic-image-transitions/) — 최신 WebGL 전환 기법
- [DDRKirby — Shader-based Transitions](https://ddrkirby.com/articles/shader-based-transitions/shader-based-transitions.html) — 게임 전환 셰이더 원리
- [GL Transitions GitHub](https://github.com/gl-transitions/gl-transitions) — 100+ 오픈소스 GLSL 전환 코드
- [Hades VFX Behind the Scenes — 80.lv](https://80.lv/articles/a-behind-the-scenes-look-at-the-effects-in-hades) — Hades 이펙트 기술 분석
- [Extra texture uniform — PixiJS Discussion](https://github.com/pixijs/pixijs/discussions/10358) — 다중 텍스처 uniform 전달 방법
- `Documents/Research/ItemWorld_EntryTransition_Research.md` — 설계 개념 및 게임/영화 레퍼런스
- `game/src/effects/FloorCollapse.ts` — 기존 바닥 붕괴 구현 (8페이즈, ~3.4초)
- `game/src/effects/PortalTransition.ts` — 기존 포탈 전환 구현 (사쿠라이 플래시 원리)
- `game/src/Game.ts` — worldRT RenderTexture 파이프라인
