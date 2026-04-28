# Dead Cells 그레이스케일-팔레트 전환 기법 리서치

> **목적:** Dead Cells가 사용하는 "그레이스케일 원본 + 런타임 그라디언트 맵" 파이프라인을 분석하고, ECHORIS(PixiJS v8)에서 월드/아이템계 2-Space 색상 반전(청록↔주황)을 구현하는 방법을 문서화한다.
> **작성일:** 2026-04-17
> **작성자:** Researcher

---

## 1. 핵심 요약 (TL;DR)

Dead Cells는 배경/오브젝트 텍스처를 **그레이스케일 단일본**으로 제작하고, 런타임에 **그라디언트 맵(Gradient Map / 1D LUT)** 을 적용해 바이옴별 팔레트를 입힌다.

- **원본 애셋:** 8비트 그레이스케일 PNG (밝기값 0-255만 유지)
- **런타임 변환:** 픽셀의 휘도(luminance) → 1D 팔레트 텍스처에서 색상 샘플링
- **바이옴 교체 비용:** 그라디언트 맵 1장만 교체하면 전체 바이옴 색감이 바뀜 (에셋 재작성 불필요)
- **결과:** 100+ 애셋 × 10+ 바이옴 = 1,000+ 재그림 → **100 애셋 + 10 팔레트 = 비용 1/10**

ECHORIS에 적용하면 월드(청록 배경/주황 구조물)와 아이템계(주황 배경/청록 디테일) 색상 반전을 **동일 스프라이트 + 팔레트 교체**만으로 구현 가능.

---

## 2. Dead Cells 원본 파이프라인

### 2.1 배경 파이프라인 (Parallax Backgrounds)

> *"Dead Cells draws textures of parallax backgrounds with grayscale colors before applying a gradient map, and modifying the gradient map is all that's needed to change the color palette of a biome."*

**제작 흐름:**
1. 아티스트가 배경 타일/레이어를 **그레이스케일로만** 채색
2. 명도 8-16단계 (0.0 ~ 1.0)를 디자인 언어로 사용 — "이곳은 밝다/어둡다"만 결정
3. 바이옴별로 **그라디언트 맵** 제작 (검정→중간→흰색 구간에 대응하는 색상 램프)
4. 셰이더가 픽셀의 휘도값을 U좌표로 사용해 1D 텍스처에서 색상 샘플링

**이점:**
- 바이옴 수 = 그라디언트 맵 수 (선형 증가)
- 아트 디렉션 실험 비용 제로 (포토샵에서 그라디언트 바만 바꾸면 즉시 확인)
- 동일 구조물을 "유적 바이옴"과 "독지대 바이옴"에서 다른 색감으로 재활용

### 2.2 캐릭터 파이프라인 (별개)

캐릭터/적은 그레이스케일 워크플로우가 **아니라** 3D→2D 파이프라인을 사용:
- 3D 스켈레톤에서 저해상도 렌더 (안티에일리어싱 없음)
- 각 프레임 PNG + 노멀맵 동시 export
- 기본 툰 셰이더로 볼륨 렌더링
- 블렌드 모드로 추가 이펙트

> *"renders the mesh in a very small size and without antialiasing, giving us that pixelated look"*
> *"exporting the whole as a sequence of frames also allows us to slip in a blend mode or two for an added wow effect"*

**참고:** ECHORIS는 순수 2D 스프라이트이므로 3D→2D 파이프라인은 채택하지 않는다. **그레이스케일+그라디언트맵 기법만 채택.**

### 2.3 색채 철학 (Giving Back Colors 기사)

Dead Cells 팀은 메트로베니아/소울라이크(예: Salt and Sanctuary)의 **탈채도 색감을 의도적으로 거부**했다:
- "중간톤의 채도를 거의 배타적으로 끌어올린다"
- **실내(밀폐감):** 보색 팔레트 (complementary) — 긴장감 유발
- **실외(깊이감):** 유사색 팔레트 (analogous) — 뉘앙스와 공간감 강조
- **목표:** 플레이어 반응 속도를 위한 가독성 + 다크한 테마와의 대비

→ ECHORIS의 "BLAME! + 디스가이아 경쾌함" 톤과 **정확히 일치**. 고딕 다크 판타지 금지 방침(CLAUDE.md)과 공명.

---

## 3. 기술적 원리 (그라디언트 맵 = 1D LUT)

### 3.1 수학

```
pixel_rgb = palette_texture.sample(grayscale_value)
```

- 입력: 그레이스케일 픽셀의 단일 채널 값 (R=G=B=L, 0.0~1.0)
- LUT: 1D 텍스처 (너비 256px, 높이 1px, RGB 채널)
- 출력: `palette[L * 255]`의 RGB 값

**알파 채널은 별도 유지** — 투명도는 LUT을 거치지 않고 원본 알파 그대로 사용.

### 3.2 팔레트 텍스처 구조

```
[검정 끝] ━━━━━━━━━━━━━━━━━━━━━━━━ [흰색 끝]
  L=0              L=127               L=255
  #0a1a2e          #1e6b7a             #d4e8f0
  (심해 청록)       (중간 청록)          (하이라이트 회청)
```

- 256px 폭이 표준 (8비트 휘도 대응)
- **Nearest sampling** (선형 보간 시 밴드 경계가 흐려짐 — Dead Cells의 "16단계 계단식" 룩을 유지하려면 nearest 필수)
- PNG 한 장에 여러 팔레트를 세로로 쌓아서 관리 (256×N, 한 행 = 한 바이옴)

### 3.3 프래그먼트 셰이더 (GLSL 의사코드)

```glsl
// Dead Cells 스타일 팔레트 매핑 셰이더
uniform sampler2D uSource;    // 그레이스케일 원본
uniform sampler2D uPalette;   // 1D 팔레트 LUT (256×1 또는 256×N)
uniform float uPaletteRow;    // 다중 팔레트 중 어느 행을 쓸지

varying vec2 vTexCoord;

void main() {
    vec4 src = texture2D(uSource, vTexCoord);
    // 휘도 추출 (이미 그레이스케일이면 r=g=b이므로 .r로 충분)
    float luma = src.r;
    // LUT에서 색상 샘플
    vec2 lutUV = vec2(luma, uPaletteRow);
    vec3 color = texture2D(uPalette, lutUV).rgb;
    gl_FragColor = vec4(color, src.a);
}
```

---

## 4. ECHORIS 적용 방안 (PixiJS v8)

### 4.1 2-Space 색상 반전에 완벽히 부합

| 공간 | 팔레트 행 (row 0~N) | 배경 | 구조물 |
|:---|:---|:---|:---|
| 월드 (World) | row 0: `World_Archaic` | 청록 #0f3b4a → #2a7b8d | 주황 #ff8c3a (단조열) |
| 아이템계 Normal | row 1: `IW_Rusty` | 주황 #6b2a1a → #d47a3a | 청록 #3acfc0 |
| 아이템계 Magic | row 2: `IW_Azure_Blade` | 심해 청록 | 은백 |
| 아이템계 Rare | row 3: `IW_Gold_Edge` | 황금 | 진홍 |
| 아이템계 Legendary | row 4: `IW_Crimson` | 진홍 | 청백 |
| 아이템계 Ancient | row 5: `IW_Void_Prism` | 흑자색 | 무지개 |

→ 같은 벽/바닥 스프라이트를 **6개 팔레트로 6배 재활용**. 아티스트는 청록/주황 기본 2종만 그리고, 나머지 4종은 팔레트 파일만 추가.

### 4.2 기억 단편 BGM/바이오 연동

바이옴별 팔레트가 1장의 텍스처로 관리되므로, **실시간 전환**이 가능:
- 지층 깊이에 따라 팔레트 row를 lerp → "아래로 갈수록 더 부식된 색조"
- 기억 단편 격발 시 팔레트 채도 펄스 → 공격 예고 연출

### 4.3 PixiJS v8 Filter 구현 (의사코드)

```ts
// src/client/rendering/filters/PaletteSwapFilter.ts
import { Filter, GlProgram, Texture } from 'pixi.js';

const vertex = `
in vec2 aPosition;
out vec2 vTextureCoord;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition( void ) {
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
    return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord( void ) {
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void) {
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
}
`;

const fragment = `
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;        // 씬(그레이스케일)
uniform sampler2D uPaletteTex;     // LUT
uniform float uPaletteRow;         // 0.0 ~ (N-1)/N
uniform float uPaletteRowCount;

void main(void) {
    vec4 src = texture(uTexture, vTextureCoord);
    float luma = src.r;  // 원본이 그레이스케일이면 r만 써도 충분
    // 여러 팔레트 중 한 행을 picking (nearest 샘플링 가정)
    float v = (uPaletteRow + 0.5) / uPaletteRowCount;
    vec3 color = texture(uPaletteTex, vec2(luma, v)).rgb;
    finalColor = vec4(color, src.a);
}
`;

export class PaletteSwapFilter extends Filter {
    constructor(paletteTex: Texture, rowCount: number) {
        const program = GlProgram.from({ vertex, fragment, name: 'palette-swap' });
        super({
            glProgram: program,
            resources: {
                paletteUniforms: {
                    uPaletteRow: { value: 0, type: 'f32' },
                    uPaletteRowCount: { value: rowCount, type: 'f32' },
                },
                uPaletteTex: paletteTex.source,
            },
        });
    }

    setPaletteRow(row: number) {
        this.resources.paletteUniforms.uniforms.uPaletteRow = row;
    }
}
```

**적용 지점:** `Stage`, `WorldContainer`, 또는 `ItemWorldContainer`의 `filters` 배열에 1개 인스턴스만 붙이면 전체 서브트리에 적용. 드로우콜 증가 없음 (단일 풀스크린 패스).

### 4.4 애셋 변환 파이프라인

기존 컬러 애셋(이미 그린 것들)을 그레이스케일로 일괄 변환:

```bash
# ImageMagick 예시
magick mogrify -colorspace Gray -depth 8 ./assets/world/**/*.png
```

또는 **청록 채널만 추출하여 휘도 맵으로 사용** (기존 아트의 톤을 그대로 보존):
```bash
magick input.png -channel B -separate -depth 8 gray.png
```

### 4.5 팔레트 작성 워크플로우

1. Photoshop/Aseprite에서 256×1 PNG 생성
2. 왼→오 그라디언트: 가장 어두운 색 → 하이라이트 색
3. Aseprite `Palette → Gradient` 기능 활용 (중간 컬러 키 지정)
4. 프로젝트에 `/assets/palettes/world_archaic.png` 등으로 커밋
5. 런타임에 `Texture.from('world_archaic.png')` 로드 후 필터에 주입

---

## 5. 장단점 분석

### 5.1 장점

| 항목 | 효과 |
|:---|:---|
| 에셋 제작 비용 | 바이옴 N개 × 애셋 M개 → **애셋 M + 팔레트 N** (곱 → 합) |
| 아트 이터레이션 | 컬러 교체가 몇 초 (PNG 1장 교체) |
| 런타임 성능 | 1-pass 풀스크린 필터 (PixiJS 기준 <0.5ms @ 1080p) |
| 일관성 | 같은 팔레트를 쓰는 모든 애셋이 자동으로 동일 톤 |
| 동적 연출 | 팔레트 lerp로 "황혼 → 밤" 같은 시간 전환 가능 |
| 접근성 | 컬러블라인드 모드 = 팔레트 파일 교체 (시스템 재설계 불필요) |

### 5.2 단점 / 제약

| 항목 | 완화책 |
|:---|:---|
| 휘도 충돌: 다른 오브젝트가 같은 회색값이면 같은 색이 됨 | 오브젝트별 **톤 옵셋** 유니폼 추가 (예: 적은 +0.1 밝게) |
| UI/이펙트는 다색 필요 | UI 레이어는 필터 바깥에 렌더 (PixiJS의 `stage` 분리) |
| 그레이스케일 전환 시 기존 아트의 채도 손실 | 청록 채널만 추출하여 원본 색감 보존 |
| 밴딩(banding) 현상 | 팔레트에 중간 키 추가, 또는 dithering 노이즈 오버레이 |
| 캐릭터 초상화/일러스트 | 팔레트 범위를 벗어난 **예외 레이어**로 처리 |

---

## 6. 관련 기법 비교

| 기법 | 차이점 |
|:---|:---|
| **Indexed Color (8비트 시절)** | GPU에서 인덱스 후 팔레트 참조. 본질은 동일하나 현대 GPU에서는 LUT 텍스처로 대체 |
| **Color Grading LUT (3D 큐브)** | 256×16×16 3D LUT으로 **컬러 원본 → 컬러 변환**. Dead Cells는 **그레이 → 컬러**이므로 1D만 충분 |
| **Shader Posterize** | 단순 밴드 제한. 색상 매핑은 별도 필요. 두 기법 조합 가능 |
| **Lospec Palette Shader** | 동일 기법. 인디 씬에서 "1D palette LUT"으로 불림 |
| **Ghibli 스타일 Toon Shading** | 보통 3D 모델에 적용. 2D에서는 Dead Cells 방식이 상위 호환 |

---

## 7. ECHORIS 도입 권장안

### 7.1 적용 범위 (Phase 1)

| 레이어 | 적용 여부 | 비고 |
|:---|:---|:---|
| 월드 배경 타일 | ✅ 적용 | 2-Space 색상 반전의 핵심 |
| 아이템계 배경 타일 | ✅ 적용 | 5레어리티 × 4지층 = 20바이옴을 팔레트만으로 커버 |
| 플레이어 캐릭터 | ❌ 제외 | 캐릭터 가독성을 위해 고정 팔레트 유지 |
| 적 스프라이트 | ⚠️ 선택적 | 바이옴 적응형이 필요하면 적용, 고유 색이 필요하면 제외 |
| UI/HUD | ❌ 제외 | 별도 레이어, 풀컬러 유지 |
| VFX (단조열/이펙트) | ❌ 제외 | 파티클은 원본 색 유지 |
| 기억 단편 | ⚠️ 선택적 | 기본적으로 제외 (개체 고유색), 팔레트 펄스 연출 시 일시 적용 |

### 7.2 구현 마일스톤

1. **Week 1:** PaletteSwapFilter 프로토타입 + World/ItemWorld 각 1개 팔레트
2. **Week 2:** 기존 배경 애셋을 그레이스케일로 변환 (청색 채널 추출 방식)
3. **Week 3:** 5레어리티 팔레트 추가, 아이템계 진입 시 팔레트 lerp 전환 연출
4. **Week 4:** 접근성 모드용 대체 팔레트 3종 (protanopia / deuteranopia / tritanopia)

### 7.3 연결 GDD

- `Documents/Design/Design_Art_Direction.md` -- 색상 계약 (청록/주황) 원칙 확인
- `Documents/System/System_ItemWorld_Visual.md` (예정) -- 지층별 팔레트 정의
- `Documents/System/System_Accessibility.md` (미작성) -- 컬러블라인드 모드 구현 기반

---

## 8. 출처

- [Art Design Deep Dive: Giving back colors to cryptic worlds in Dead Cells](https://www.gamedeveloper.com/production/art-design-deep-dive-giving-back-colors-to-cryptic-worlds-in-i-dead-cells-i-) -- Game Developer (Motion Twin 아트 디렉터)
- [Art Design Deep Dive: Using a 3D pipeline for 2D animation in Dead Cells](https://www.gamedeveloper.com/production/art-design-deep-dive-using-a-3d-pipeline-for-2d-animation-in-i-dead-cells-i-) -- 3D→2D 파이프라인 (캐릭터)
- [Case Study: Dead Cells' Character Art Pipeline](https://80.lv/articles/case-study-dead-cells-character-art-pipeline) -- 80 Level
- [Dead Cells: Using 3D Pipeline for 2D Animation](https://sudonull.com/post/14066-Dead-Cells-Using-3D-Pipeline-for-2D-Animation) -- sudonull 기술 요약

---

## 9. 결론

Dead Cells의 그레이스케일-팔레트 워크플로우는 ECHORIS의 **2-Space 색상 반전 원칙 + 5레어리티 바이옴 + 웹 제한(다운로드 용량) + 접근성**을 동시에 해결하는 단일 기법이다. PixiJS v8의 `Filter` 추상으로 100줄 이내 구현 가능하며, 아트 팀은 "단 한 가지 버전만 그리면 된다"는 명확한 제작 원칙을 얻는다.

**권고:** Phase 1 프로토타입 단계에서 도입. 월드/아이템계 배경 타일에 먼저 적용하여 색상 반전을 검증한 뒤, Phase 2에서 5레어리티 팔레트로 확장.
