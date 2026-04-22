# Parallax Background 구현 계획

> **작성일:** 2026-04-22
> **작성자:** Art Director
> **대상:** Programmer Agent
> **상태:** 승인 대기

## Context

ECHORIS는 실내 메가스트럭처 횡스크롤 게임이다. 현재 모든 레이어가 카메라와 동일 속도(1:1)로 스크롤되어 깊이감이 없다. 실내 구조물 뒤로 보이는 원경(수직 대공동, 먼 구조물)에 패럴랙스를 적용하여 공간감을 확보한다.

### 설계 원칙 (아트 디렉터 확정)

- **실내 타일**: LDtk Background AutoLayer에 유저가 직접 칠함. **패럴랙스 없음** (1:1 스크롤)
- **원경 배경**: `Content_System_Area_Palette.csv`의 BG 팔레트 stops로 생성하는 **그라디언트 배경** + 선택적 패럴랙스 이미지. 패럴랙스 적용 (X+Y 모두)
- LDtk에 새 레이어를 추가하지 않음. 기존 4레이어 구조 유지
- **패럴랙스 단위**: 서브 에어리어(AreaID) 단위. Overworld 내 Garden, Sewers 등 각각 다른 패럴랙스 이미지/factor 지정 가능

### 레벨 → 에어리어 매핑

LDtk 레벨은 서브 에어리어에 속한다. 매핑은 코드 또는 LDtk 레벨 필드로 관리:

```
World_Level_0    → world_shaft (기본)
Garden, Garden2  → world_garden
Sewers1          → world_sewers
Water_supply     → world_sewers
SaveRoom*        → world_shaft
```

각 에어리어에 대응하는 CSV BG 행이 패럴랙스 설정을 포함한다.

---

## 렌더 순서 (변경 후)

```
gameContainer (Game.ts에서 -camX+rtW/2, -camY+rtH/2 오프셋)
│
├── parallaxBG        ← [신규] CSV 그라디언트 TilingSprite, 패럴랙스 스크롤
│
└── scene.container   ← 기존 (1:1 스크롤)
    ├── renderer.container
    │   ├── bgLayer       ← LDtk Background (실내 타일, 팔레트 필터)
    │   ├── wallLayer     ← LDtk Collisions (벽, 팔레트 필터)
    │   ├── specialLayer  ← 해저드 (원색 보존)
    │   └── shadowLayer   ← 그림자 오버레이
    └── entityLayer       ← 플레이어, 적, 아이템
```

---

## 패럴랙스 수학

`gameContainer`는 매 프레임 다음과 같이 위치한다 (`Game.ts:177-180`):
```
gameContainer.x = round(-camera.renderX + rtW / 2)
gameContainer.y = round(-camera.renderY + rtH / 2)
```

`parallaxBG`는 `gameContainer`의 자식이므로, 역보정으로 다른 속도를 만든다:
```
parallaxBG.x = camera.renderX * (1 - factorX)
parallaxBG.y = camera.renderY * (1 - factorY)
```

결과: `parallaxBG`의 화면 위치 = `rtW/2 - camX*factorX`, `rtH/2 - camY*factorY`
- factor=0.3이면 카메라의 30% 속도로 스크롤 (먼 배경)

---

## CSV 확장: 패럴랙스 컬럼 추가

기존 `Content_System_Area_Palette.csv`의 BG 행에 2개 컬럼을 추가한다:

### 변경 후 헤더

```
AreaID,Name,Layer,Brightness,Tint,DepthBias,DepthCenter,Stops,Description,Tileset,ParallaxImage,ParallaxFactor
```

| 신규 컬럼 | 타입 | 예시 | 설명 |
|:----------|:-----|:-----|:-----|
| `ParallaxImage` | string (경로) | `parallax/shaft.png` | 패럴랙스 이미지. 빈 값이면 그라디언트만 사용 |
| `ParallaxFactor` | float | `0.3` | 스크롤 속도 배율 (0=고정, 1=동일). 빈 값이면 패럴랙스 미적용 |

### 변경 후 CSV 예시

```csv
AreaID,Name,Layer,...,Tileset,ParallaxImage,ParallaxFactor
world_shaft_bg,거대 수직공동,BG,...,SunnyLand_by_Ansimuz-extended,parallax/shaft.png,0.3
world_shaft_wall,거대 수직공동,WALL,...,world_01,,
world_garden_bg,정원,BG,...,SunnyLand_by_Ansimuz-extended,parallax/garden.png,0.4
world_garden_wall,정원,WALL,...,world_01,,
world_sewers_bg,수로,BG,...,SunnyLand_by_Ansimuz-extended,,0.3
world_sewers_wall,수로,WALL,...,world_01,,
iw_normal_bg,기억의 지층 일반,BG,...,SunnyLand_by_Ansimuz-extended,,0.3
iw_normal_wall,기억의 지층 일반,WALL,...,world_01,,
```

- `world_shaft_bg`: 이미지(`parallax/shaft.png`) + 그라디언트 합성, factor 0.3
- `world_sewers_bg`: 이미지 없음, 그라디언트만, factor 0.3
- WALL 행: ParallaxImage/Factor 빈 값 (WALL은 패럴랙스 대상 아님)

### 패럴랙스 이미지 사양

| 항목 | 값 |
|:-----|:---|
| 포맷 | 그레이스케일 PNG (PaletteSwapFilter 호환) |
| 경로 | `game/public/assets/parallax/{name}.png` |
| 크기 | 자유 (TilingSprite로 반복). 권장: 640x360 (1뷰포트) 이상 |
| 내용 | 원경 실루엣 (먼 메가스트럭처, 파이프, 철골 등) |

---

## 그라디언트 텍스처 생성

CSV BG 행의 stops + depthBias + brightness를 bake하여 **세로 그라디언트 텍스처** 생성:

```
입력: world_shaft_bg 엔트리
  stops: 0.00:#10060a | 0.12:#30101a | ... | 1.00:#f8a878
  depthBias: 0.94, depthCenter: 0.37, brightness: 1.91

처리:
  1. 세로 256px 텍스처 생성 (1px 폭)
  2. 각 Y 픽셀(0~255)에 대해:
     - screenY = y / 255
     - luma = 0.5 (소스 타일 없으므로 중간값)
     - depthShift = (screenY - depthCenter) * depthBias
     - biased = clamp(luma + depthShift, 0, 1)
     - color = sampleRow(stops, biased) * brightness * tint
  3. 결과: 위=밝은 주황, 아래=어두운 진홍의 세로 그라디언트

출력: 1 x 256 Texture (nearest 필터)
```

### 패럴랙스 렌더링 합성 순서

```
1. 그라디언트 TilingSprite (항상 존재, CSV stops 기반)
2. 패럴랙스 이미지 Sprite (ParallaxImage가 있을 때만, 그라디언트 위에 합성)
   → 이미지에 PaletteSwapFilter 적용 (그레이스케일 → 에어리어 팔레트 착색)
3. 둘 다 동일 parallaxFactor로 스크롤
```

---

## 변경 대상 파일

### 1. `Sheets/Content_System_Area_Palette.csv` — 컬럼 추가

헤더에 `ParallaxImage`, `ParallaxFactor` 추가. 기존 행에 빈 값 채움. 서브 에어리어 BG/WALL 행 추가.

### 2. `game/src/data/areaPalettes.ts` — 신규 필드 파싱

`AreaPaletteEntry` 인터페이스에 추가:

```typescript
export interface AreaPaletteEntry {
  // ... 기존 필드 ...
  parallaxImage: string;   // 'parallax/shaft.png' 또는 '' (빈 값)
  parallaxFactor: number;  // 0.3 등. 0이면 패럴랙스 미적용
}
```

CSV 파싱 부분 (line ~94-107)에서 cols[10], cols[11] 읽기 추가.

### 3. `game/src/effects/PaletteSwapFilter.ts` — 유틸 함수 export

기존 `sampleRow()`, `unpack()`, `lerp()`는 모듈 내부 함수. 그라디언트 텍스처 빌더에서 재사용하려면 export 필요.

```typescript
// 현재: function sampleRow(...) (private)
// 변경: export function sampleRow(...)  ← export 추가
// 대상: sampleRow, unpack, lerp (3개)
```

**위치**: lines 186-209

### 4. `game/src/level/ParallaxBackground.ts` — [신규 파일]

패럴랙스 배경 전담 클래스.

```typescript
import { Container, Texture, TilingSprite, Sprite, Assets } from 'pixi.js';
import { sampleRow } from '../effects/PaletteSwapFilter';
import { PaletteSwapFilter } from '../effects/PaletteSwapFilter';
import type { AreaPaletteEntry } from '../data/areaPalettes';

export class ParallaxBackground {
  readonly container: Container;
  private gradientSprite: TilingSprite;   // 항상 존재 (CSV stops 기반)
  private imageSprite: TilingSprite|null; // ParallaxImage 있을 때만
  private factor: number;                 // X/Y 동일 factor

  constructor() { ... }

  /**
   * CSV BG 엔트리로부터 패럴랙스 배경 구성.
   * 1. 세로 그라디언트 텍스처 생성 (stops + depthBias bake)
   * 2. ParallaxImage 있으면 로드 + PaletteSwapFilter 적용
   * 3. factor 설정
   */
  async setup(entry: AreaPaletteEntry, levelW: number, levelH: number,
              paletteAtlas?: { texture: Texture, rowCount: number, row: number }): Promise<void> {
    this.factor = entry.parallaxFactor || 0.3;

    // 그라디언트
    this.buildGradient(entry, levelW, levelH);

    // 이미지 (있으면)
    if (entry.parallaxImage) {
      const tex = await Assets.load(assetPath(`assets/${entry.parallaxImage}`));
      this.buildImageLayer(tex, levelW, levelH, paletteAtlas);
    }
  }

  /** 매 프레임: 카메라 기반 패럴랙스 오프셋 */
  updateScroll(cameraX: number, cameraY: number): void {
    this.container.x = cameraX * (1 - this.factor);
    this.container.y = cameraY * (1 - this.factor);
  }

  /** 에어리어 전환 시 재구성 */
  async changeArea(entry: AreaPaletteEntry, levelW: number, levelH: number, ...): Promise<void> { ... }

  destroy(): void { ... }
}
```

### 5. `game/src/scenes/LdtkWorldScene.ts` — 패럴랙스 통합

**레벨→에어리어 매핑 (신규 상수 또는 LDtk 필드):**
```typescript
// 레벨 identifier → AreaID prefix 매핑
const LEVEL_AREA_MAP: Record<string, string> = {
  'Garden': 'world_garden',
  'Garden2': 'world_garden',
  'Sewers1': 'world_sewers',
  'Water_supply': 'world_sewers',
  // 매핑 없는 레벨은 기본값 'world_shaft' 사용
};
const DEFAULT_AREA = 'world_shaft';

function getAreaForLevel(levelId: string): string {
  return LEVEL_AREA_MAP[levelId] ?? DEFAULT_AREA;
}
```

**init 시** (line ~440):
```typescript
this.parallaxBG = new ParallaxBackground();
this.container.addChildAt(this.parallaxBG.container, 0);
```

**레벨 로드 시** (line ~1845):
```typescript
const areaId = getAreaForLevel(level.identifier);
const bgEntry = getAreaPalette(`${areaId}_bg`);
const wallEntry = getAreaPalette(`${areaId}_wall`);
// 팔레트 필터도 에어리어별로 전환
this.bgFilter.setRow(getAreaPaletteRow(bgEntry.id));
this.wallFilter.setRow(getAreaPaletteRow(wallEntry.id));
// 패럴랙스 갱신
await this.parallaxBG.setup(bgEntry, level.pxWid, level.pxHei, ...);
```

**render(alpha) 시:**
```typescript
this.parallaxBG.updateScroll(
  this.game.camera.renderX,
  this.game.camera.renderY
);
```

---

## TilingSprite 크기/위치 계산

```
레벨: pxWid x pxHei (예: 1152 x 384)
뷰포트: 640 x 360 (zoom=1 기준)
factor: 0.3

카메라 이동 범위: 0 ~ pxWid
패럴랙스 이동 범위: 0 ~ pxWid * (1 - 0.3) = 0 ~ pxWid * 0.7

TilingSprite 필요 크기:
  폭 = 뷰포트W + pxWid * (1 - factor)   ← 보장 최소 크기
  높 = 뷰포트H + pxHei * (1 - factor)

→ TilingSprite는 수평 무한 반복이므로 폭은 문제없음 (1px 텍스처 타일링)
→ 세로도 텍스처가 스트레치되므로 충분히 큰 height 설정

실제 구현:
  sprite.width = viewportW / zoom + pxWid  (넉넉한 여유)
  sprite.height = viewportH / zoom + pxHei
  sprite.x = -pxWid / 2   (센터링 오프셋)
  sprite.y = -pxHei / 2
```

---

## 엣지 케이스

| 케이스 | 처리 |
|:-------|:-----|
| 줌 변경 | `updateScroll`에서 `rtW/rtH` 고려. TilingSprite 크기 재조정 불필요 (충분히 크게 생성) |
| 카메라 셰이크 | `camera.renderX/Y`에 이미 포함 → 패럴랙스도 자연스럽게 흔들림 (약하게) |
| 에어리어 전환 | `changeArea()` 호출 → 그라디언트 + 이미지 재구성 |
| 이미지 없는 에어리어 | ParallaxImage 빈 값 → 그라디언트만 표시 (정상 동작) |
| 서브 에어리어 CSV 미등록 | `getAreaPalette()` fallback → `world_shaft_bg` 기본값 |
| 아이템계 | ItemWorldScene에도 동일 패턴 적용 가능 (별도 결정 필요) |
| 레벨 경계 클램프 | 카메라 bounds 클램프 후의 renderX/Y 사용하므로 자동 처리 |

---

## 구현 순서

1. `Content_System_Area_Palette.csv` — `ParallaxImage`, `ParallaxFactor` 컬럼 추가 + 서브 에어리어 행 추가
2. `areaPalettes.ts` — `AreaPaletteEntry`에 신규 필드 추가 + CSV 파싱 확장
3. `PaletteSwapFilter.ts` — `sampleRow`, `unpack`, `lerp` export 추가
4. `ParallaxBackground.ts` — 신규 클래스 작성 (그라디언트 + 이미지 + 스크롤)
5. `LdtkWorldScene.ts` — 레벨→에어리어 매핑 + init/loadLevel/render 통합
6. 빌드 + 테스트

---

## 검증

1. `pnpm dev`로 개발 서버 실행
2. 게임 시작 → 월드 진입
3. 좌우 이동 시 **배경 그라디언트가 벽/플레이어보다 느리게 스크롤**되는지 확인
4. 상하 이동 시 **세로 패럴랙스**도 동작하는지 확인
5. 실내 타일(LDtk Background)은 벽과 동일 속도(1:1)로 스크롤되는지 확인
6. CSV 팔레트 색상이 그라디언트에 정확히 반영되는지 확인
