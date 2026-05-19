# Design — PixiJS Reflection 기법 카탈로그

> **Status**: PENDING_DECISION
> **작성**: 2026-05-19
> **상태**: 다음 세션에서 (1) 시급도 결정 → (2) 노멀맵 파이프라인 도입 여부 → (3) 단조 광택 PoC 착수 순으로 진행 예정

## Next Action (다음 세션 진입점)

다음 세션에서 결정해야 할 3가지:

1. **시급 시나리오 선택**: anvil/검 광택 / 수면 / 빌더 메탈 플레이트 / UI 패널 중 1번 우선 적용 대상
2. **노멀맵 파이프라인 도입 여부**: ECHORIS atlas에 normal map 추가 vs sprite/filter 조합만 사용
3. **PoC 범위**: 단조 광택 sweep sprite 1장으로 anvil + forge UI 노란 프레임 동시 적용 PoC 착수 여부

---

## 7가지 기법 (요약 + PixiJS 코드)

### 1. Sprite Y-flip Mirror (단순 거울)

```ts
mirror.scale.y = -1;
mirror.anchor.set(0, 1);
mirror.y = surfaceY;
mirror.alpha = 0.5;
mirror.tint = 0x6688aa;
```

- **비용**: 거의 0 (스프라이트 1)
- **한계**: 동적 엔티티마다 미러 수동 관리. 깊이 정보 없음
- **적합**: 정적 배경, 1:1 거울

### 2. RenderTexture Snapshot Reflection

```ts
const rt = RenderTexture.create({ width, height });
renderer.render({ container: worldLayer, target: rt });
mirror.texture = rt;
mirror.scale.y = -1;  // + alpha mask + tint
```

- **비용**: 1-3ms / 1280×720 (추가 draw pass)
- **한계**: 카메라 외 컬링 안 되면 비용↑
- **적합**: 수면, 큰 거울, 광택 바닥

### 3. DisplacementFilter (물결 / 왜곡)

```ts
const disp = new DisplacementFilter(noiseSprite);
disp.scale.set(8, 4);
waterLayer.filters = [disp];
// 매 프레임: noiseSprite.x += scrollSpeed
```

- **비용**: 0.5-1ms, 노이즈 PNG 256×256 1장
- **PixiJS**: `pixi-filters` 빌트인
- **적합**: 수면 잔물결, 아지랑이, 포털

### 4. ColorMatrixFilter (반사 톤 시프트)

```ts
const tint = new ColorMatrixFilter();
tint.brightness(0.7, false);  // 70% darken
tint.hue(-15, true);          // cool shift
mirror.filters = [tint];
```

- **비용**: 거의 0 (4×4 행렬 곱)
- **활용**: 1·2·3 보조 필터로 합성

### 5. Pre-baked Specular Sweep (광택 메탈)

```ts
sweep.blendMode = 'add';
sweep.alpha = 0.6;
sweep.x = lerp(-w, w, t); // 좌→우 슬라이드
```

- **비용**: 0.1ms (sweep 스프라이트 1장)
- **적합**: anvil, 검 발도, 빌더 메탈 플레이트, **forge UI 노란 프레임**
- **레퍼런스**: Hades, Hyper Light Drifter 무기 광택

### 6. Normal Map + Custom Filter (실시간 광택)

```glsl
vec3 n = texture(uNormal, vUV).rgb * 2.0 - 1.0;
vec3 L = normalize(uLightDir);
float spec = pow(max(dot(n, L), 0.0), 32.0);
gl_FragColor = baseColor + vec4(spec * uLightTint, 0.0);
```

- **비용**: 1ms 미만 / entity. atlas당 normal map PNG 별도 필요
- **파이프라인**: Aseprite normalmap 플러그인 / SpriteIlluminator
- **적합**: 보스급 캐릭터, 단조 화로 광원이 캐릭터에 반응하는 장면

### 7. RenderTexture + Custom Reflection Shader

```ts
const reflectionFilter = new Filter({
  glProgram: GlProgram.from({ vertex, fragment }),
  resources: {
    uSource: snapshotTexture,
    uTime: { value: 0, type: 'f32' },
  },
});
```

- **비용**: 2-4ms (2번 + 1 fragment pass)
- **유연성**: 최상. fresnel, 깊이 흐림, 그라디언트 자유
- **적합**: 보스룸 신성 수면, 메이드 인 어비스 톤

---

## 비교 표

| 기법                    | 비용             | 동적 반응 | 셰이더 작업  | 자산 추가        | ECHORIS 적합도         |
| :---------------------- | :--------------- | :-------- | :----------- | :--------------- | :--------------------- |
| 1. Y-flip Mirror        | 거의 0           | 수동      | 없음         | 없음             | 정적 거울              |
| 2. RT Snapshot          | 1-3ms            | 자동      | 없음         | 없음             | 수면, 큰 거울          |
| 3. DisplacementFilter   | 0.5-1ms          | 시간 기반 | 없음         | 노이즈 PNG 1장   | 물결, 아지랑이         |
| 4. ColorMatrix Tint     | 거의 0           | -         | 없음         | 없음             | 1·2·3 보조 필터        |
| 5. Specular Sweep       | 0.1ms            | 시간 기반 | 없음         | sweep 스프라이트 | **anvil, 검, 메탈, UI** |
| 6. Normal Map Filter    | 0.5-1ms / entity | 광원 위치 | GLSL 한 번   | normal map atlas | **빌더 플레이트**      |
| 7. Custom RT Shader     | 2-4ms            | 시간/광원 | GLSL 많음    | 없음             | 보스룸 신성 수면       |

---

## ECHORIS 시나리오별 권장

| 시나리오                              | 권장 조합         | 근거                                                      |
| :------------------------------------ | :---------------- | :-------------------------------------------------------- |
| **단조 모루/검 광택**                 | 5 + 4             | 단조열 톤. sweep 1장이면 anvil + 검 + forge UI 재사용     |
| **메가스트럭처 수면/물웅덩이**        | 2 + 3 + 4         | 메이드 인 어비스 톤. RT + 잔물결 + 차가운 톤              |
| **수중 호흡 렐릭 후 수면 위 반사**    | 7                 | 의례적 모먼트. fresnel + 시간 왜곡                        |
| **빌더 메탈 플레이트 (보스급)**       | 6                 | 광원 반응 specular. atlas에 normal map 추가 필요          |
| **포털/거울 차원 효과**               | 2 + 7             | 풀스크린 효과, 비용 허용                                  |
| **UI 패널 광택 (forge 노란 프레임)**  | 5                 | sweep sprite 1장. 비용 0                                  |

---

## 권장 진행 순서 (ROI 기준)

1. **단조 광택 PoC (5번)** — 0.5일. anvil 광택 sweep 1장 → forge UI 노란 프레임 재사용. ROI 최대
2. **수면 반사 (2 + 3 + 4)** — 1.5일. 수중 호흡 렐릭 출시 시점에 맞춤 (Phase 2 후반 또는 Phase 3)
3. **노멀맵 파이프라인 (6번)** — 보스급 캐릭터에만 한정. 파이프라인 도입 결정 필요. 미정

---

## 참고

- **PixiJS v8 기준**: Filter API는 `GlProgram.from({ vertex, fragment })` + `UniformGroup` 패턴 (`game/src/effects/GlowFilter.ts` 참조)
- **기존 사용 예**:
  - `GlowFilter.ts` — 단일 패스 radial glow (anvil halo, AcquireOverlay 아이콘 광채)
  - `ParallaxBackground.ts:259` — `Texture.from(canvas)` 패턴 (캔버스 기반 텍스처 생성)
  - `PaletteSwapFilter.ts` — 색 교체 필터 (RT 기반)
- **노이즈 텍스처 후보**: PixelLab 생성 또는 procedural perlin (런타임 캔버스 생성)
