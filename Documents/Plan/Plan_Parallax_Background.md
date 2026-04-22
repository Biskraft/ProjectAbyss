# Parallax Background 구현 계획

> **작성일:** 2026-04-22
> **작성자:** Art Director
> **대상:** Programmer Agent
> **상태:** 확정

---

## 1. Context

ECHORIS는 실내 메가스트럭처 횡스크롤 게임이다. 현재 모든 레이어가 카메라와 동일 속도(1:1)로 스크롤되어 깊이감이 없다. 컨셉아트(The Shaft 수직 전경)에서 보이는 **끝없는 수직 구조물, 다리, 안개로 사라지는 깊이**를 3-Layer 패럴랙스로 재현한다.

### 레퍼런스 이미지

`Documents/Content/image/Content_World_Bible/Bisk_..._c8a08754..._1.png` (The Shaft 수직 전경)

핵심 요소:
- 중앙 거대 수직 구조물 (기둥/타워)
- 좌우 동굴 암벽 프레임
- 수평 다리/크레인이 구조물과 암벽을 연결
- 아래로 갈수록 안개에 사라짐
- 인물 대비로 스케일 표현

### 설계 원칙 (아트 디렉터 확정)

- **실내 타일**: LDtk Background AutoLayer. 1:1 스크롤 (패럴랙스 없음)
- **원경 배경**: 3-Layer 패럴랙스 (그라디언트 + 원경 구조물 + 근경 프레임)
- **패럴랙스 단위**: 서브 에어리어(AreaID) 단위. Overworld 내 shaft/garden/sewers 각각 다른 설정
- **이미지**: 그레이스케일 PNG. 기존 PaletteSwapFilter로 착색
- LDtk 레이어 구조 변경 없음

---

## 2. 렌더 순서

```
gameContainer (Game.ts: -camX+rtW/2, -camY+rtH/2)
│
├── parallaxContainer                     ← [신규]
│   ├── L0: gradientSprite    factor=0.0  ← CSV stops 세로 그라디언트 (고정)
│   ├── L1: farSprite         factor=0.15 ← 원경 구조물 실루엣
│   └── L2: nearSprite        factor=0.4  ← 근경 암벽/파이프 프레임
│
└── scene.container                       ← 기존 (1:1)
    ├── renderer.container
    │   ├── bgLayer     ← LDtk Background (실내 타일, PaletteSwapFilter)
    │   ├── wallLayer   ← LDtk Collisions (벽, PaletteSwapFilter)
    │   ├── specialLayer
    │   └── shadowLayer
    └── entityLayer
```

---

## 3. 데이터 테이블 설계

### 3.1 기존 CSV 변경: `Content_System_Area_Palette.csv`

**ParallaxImage, ParallaxFactor 컬럼 제거.** 패럴랙스 설정은 별도 CSV로 분리한다. 팔레트 CSV는 팔레트 전용으로 유지.

변경 후 헤더 (원복):
```
AreaID,Name,Layer,Brightness,Tint,DepthBias,DepthCenter,Stops,Description,Tileset
```

서브 에어리어 BG/WALL 행은 필요 시 추가:
```csv
world_garden_bg,정원,BG,1.00,...,정원 배경,SunnyLand_by_Ansimuz-extended
world_garden_wall,정원,WALL,1.00,...,정원 벽,world_01
world_sewers_bg,수로,BG,1.00,...,수로 배경,SunnyLand_by_Ansimuz-extended
world_sewers_wall,수로,WALL,1.00,...,수로 벽,world_01
```

### 3.2 신규 CSV: `Content_System_Parallax.csv`

패럴랙스 레이어 전용 데이터 테이블.

**헤더:**
```
AreaID,Depth,Image,Factor,TileX,TileY,Opacity,PaletteRef,Description
```

**컬럼 정의:**

| 컬럼 | 타입 | 필수 | 설명 |
|:-----|:-----|:-----|:-----|
| `AreaID` | string | O | 에어리어 식별자. Palette CSV의 접두사와 동일 (e.g. `world_shaft`) |
| `Depth` | int | O | 렌더 순서. 0=가장 뒤 (그라디언트), 1=원경, 2=근경. 숫자가 클수록 앞 |
| `Image` | string | - | 이미지 경로 (`parallax/shaft_far.png`). 빈 값이면 그라디언트 자동 생성 |
| `Factor` | float | O | 패럴랙스 스크롤 속도 (0.0=고정, 1.0=카메라 동기). X/Y 동일 적용 |
| `TileX` | bool | O | 수평 타일 반복 여부 |
| `TileY` | bool | O | 수직 타일 반복 여부 |
| `Opacity` | float | O | 레이어 불투명도 (0.0~1.0) |
| `PaletteRef` | string | - | PaletteSwapFilter에 사용할 AreaID (e.g. `world_shaft_bg`). 빈 값이면 필터 미적용 |
| `Description` | string | - | 설명 |

**데이터:**

```csv
AreaID,Depth,Image,Factor,TileX,TileY,Opacity,PaletteRef,Description
world_shaft,0,,0.0,true,false,1.0,world_shaft_bg,세로 그라디언트 (stops에서 자동 생성)
world_shaft,1,parallax/shaft_far.png,0.15,false,true,0.7,world_shaft_bg,원경: 거대 기둥 + 먼 다리
world_shaft,2,parallax/shaft_near.png,0.4,false,true,0.9,world_shaft_bg,근경: 좌우 암벽 + 파이프
world_garden,0,,0.0,true,false,1.0,world_garden_bg,정원 그라디언트
world_garden,1,parallax/garden_far.png,0.2,true,true,0.6,world_garden_bg,원경: 이끼 낀 구조물
world_sewers,0,,0.0,true,false,1.0,world_sewers_bg,수로 그라디언트
world_sewers,1,parallax/sewers_far.png,0.2,false,true,0.8,world_sewers_bg,원경: 파손 배관
iw_normal,0,,0.0,true,false,1.0,iw_normal_bg,아이템계 노말 그라디언트
iw_normal,1,parallax/iw_damascus.png,0.15,true,true,0.5,iw_normal_bg,원경: 다마스커스 결 패턴
```

**규칙:**
- `Depth=0` + `Image` 빈 값 → 해당 AreaID의 Palette CSV BG stops로 세로 그라디언트 자동 생성
- `Depth=0` + `Image` 있음 → 이미지를 그라디언트 대신 사용
- `Depth>0` + `Image` 있음 → 그라디언트 위에 레이어 합성
- `PaletteRef` → PaletteSwapFilter 적용. 그레이스케일 이미지를 에어리어 팔레트로 착색
- 한 AreaID에 레이어 수 제한 없음 (Depth 0, 1, 2, 3, ...)

### 3.3 레벨 → 에어리어 매핑

LDtk 레벨이 어떤 에어리어에 속하는지 매핑 필요. **코드 상수**로 관리:

```typescript
// LdtkWorldScene.ts
const LEVEL_AREA_MAP: Record<string, string> = {
  'Garden':       'world_garden',
  'Garden2':      'world_garden',
  'Sewers1':      'world_sewers',
  'Water_supply': 'world_sewers',
  // 등록 안 된 레벨 → DEFAULT_AREA
};
const DEFAULT_AREA = 'world_shaft';
```

향후 LDtk 레벨 커스텀 필드(`AreaID` enum)로 이관 가능.

### 3.4 파일 경로 규칙

```
game/public/assets/
├── atlas/                          ← 기존 타일셋
│   ├── world_01.png
│   └── SunnyLand_by_Ansimuz-extended.png
├── parallax/                       ← [신규] 패럴랙스 이미지
│   ├── shaft_far.png               ← 그레이스케일, 세로 타일링
│   ├── shaft_near.png              ← 그레이스케일, 세로 타일링
│   ├── garden_far.png
│   ├── sewers_far.png
│   └── iw_damascus.png
Sheets/
├── Content_System_Area_Palette.csv ← 기존 (ParallaxImage/Factor 컬럼 제거)
└── Content_System_Parallax.csv     ← [신규] 패럴랙스 레이어 정의
```

---

## 4. 패럴랙스 수학

`gameContainer`는 매 프레임 (`Game.ts:177-180`):
```
gameContainer.x = round(-camera.renderX + rtW / 2)
gameContainer.y = round(-camera.renderY + rtH / 2)
```

각 패럴랙스 레이어는 `gameContainer` 자식. 역보정으로 독립 스크롤:
```
layer.x = camera.renderX * (1 - factor)
layer.y = camera.renderY * (1 - factor)
```

| factor | 결과 | 용도 |
|:-------|:-----|:-----|
| 0.0 | 고정 (스크롤 안 함) | L0 그라디언트 |
| 0.15 | 15% 속도 | L1 원경 (매우 먼 구조물) |
| 0.4 | 40% 속도 | L2 근경 (가까운 암벽) |
| 1.0 | 카메라 동기 | 실내 타일/벽/엔티티 |

---

## 5. 그라디언트 텍스처 생성 (Depth=0, Image 없음)

```
입력: world_shaft_bg (Palette CSV)
  stops, depthBias, depthCenter, brightness, tint

처리:
  1. 1 x 256 canvas 생성
  2. Y=0~255:
     screenY = y / 255
     depthShift = (screenY - depthCenter) * depthBias
     biased = clamp(0.5 + depthShift, 0, 1)
     color = sampleRow(stops, biased) * brightness * tint
  3. Texture.from(canvas), scaleMode='nearest'

적용: TilingSprite
  tileX=true (수평 무한 반복)
  tileY=false (세로 스트레치: tileScale.y = levelH * 3 / 256)
```

---

## 6. 변경 대상 파일

### 6.1 `Sheets/Content_System_Area_Palette.csv`

- `ParallaxImage`, `ParallaxFactor` 컬럼 제거 (원복)
- 서브 에어리어 행 추가 시 별도 작업

### 6.2 `Sheets/Content_System_Parallax.csv` — [신규]

위 3.2절의 테이블 데이터 작성.

### 6.3 `game/src/data/parallaxData.ts` — [신규]

Parallax CSV 파서. 기존 `areaPalettes.ts`와 동일 패턴.

```typescript
import csvText from '../../../Sheets/Content_System_Parallax.csv?raw';

export interface ParallaxLayerDef {
  areaId: string;
  depth: number;
  image: string;       // '' = 그라디언트 자동 생성
  factor: number;
  tileX: boolean;
  tileY: boolean;
  opacity: number;
  paletteRef: string;  // '' = PaletteSwapFilter 미적용
  description: string;
}

/** AreaID → depth 순 정렬된 레이어 배열 */
export const PARALLAX_LAYERS: Map<string, ParallaxLayerDef[]> = new Map();

// CSV 파싱 + PARALLAX_LAYERS 맵 구축
// ...

/** 특정 에어리어의 패럴랙스 레이어 목록 조회. 없으면 빈 배열. */
export function getParallaxLayers(areaId: string): ParallaxLayerDef[] {
  return PARALLAX_LAYERS.get(areaId) ?? [];
}
```

### 6.4 `game/src/effects/PaletteSwapFilter.ts`

`sampleRow`, `unpack`, `lerp` 3개 함수에 `export` 추가 (lines 186-209).

### 6.5 `game/src/level/ParallaxBackground.ts` — [신규]

다중 레이어 패럴랙스 배경 관리 클래스.

```typescript
import { Container, Texture, TilingSprite, Assets } from 'pixi.js';
import { sampleRow } from '../effects/PaletteSwapFilter';
import { PaletteSwapFilter } from '../effects/PaletteSwapFilter';
import { getAreaPalette, getAreaPaletteAtlas, getAreaPaletteRow }
  from '../data/areaPalettes';
import type { ParallaxLayerDef } from '../data/parallaxData';
import { assetPath } from '@core/AssetLoader';

interface ActiveLayer {
  sprite: TilingSprite;
  factor: number;
}

export class ParallaxBackground {
  readonly container: Container;
  private layers: ActiveLayer[] = [];

  constructor() {
    this.container = new Container();
  }

  /**
   * 에어리어의 패럴랙스 레이어 목록으로 배경 구성.
   * @param defs     - Content_System_Parallax.csv에서 읽은 레이어 정의
   * @param levelW   - 레벨 폭 (px)
   * @param levelH   - 레벨 높이 (px)
   */
  async setup(defs: ParallaxLayerDef[], levelW: number, levelH: number): Promise<void> {
    this.clear();

    // depth 순 정렬 (0=맨 뒤)
    const sorted = [...defs].sort((a, b) => a.depth - b.depth);

    for (const def of sorted) {
      let texture: Texture;

      if (!def.image) {
        // Depth=0 그라디언트 자동 생성
        texture = this.buildGradientTexture(def.paletteRef);
      } else {
        // 이미지 로드
        texture = await Assets.load(assetPath(`assets/${def.image}`));
      }

      const sprite = new TilingSprite({
        texture,
        width: levelW + 1280,    // 패럴랙스 여유
        height: levelH + 720,
      });
      sprite.x = -640;
      sprite.y = -360;
      sprite.alpha = def.opacity;

      // 타일링 설정
      if (!def.tileX) sprite.tileScale.x = (levelW + 1280) / texture.width;
      if (!def.tileY) sprite.tileScale.y = (levelH + 720) / texture.height;

      // PaletteSwapFilter 적용 (그레이스케일 → 에어리어 팔레트)
      if (def.paletteRef && def.image) {
        const atlas = getAreaPaletteAtlas();
        const entry = getAreaPalette(def.paletteRef);
        sprite.filters = [new PaletteSwapFilter({
          paletteTex: atlas.texture,
          rowCount: atlas.rowCount,
          row: getAreaPaletteRow(def.paletteRef),
          strength: 1.0,
          depthBias: entry.depthBias,
          depthCenter: entry.depthCenter,
          brightness: entry.brightness,
          tint: entry.tint,
        })];
      }

      this.container.addChild(sprite);
      this.layers.push({ sprite, factor: def.factor });
    }
  }

  /** 매 프레임: 각 레이어에 독립 패럴랙스 오프셋 적용 */
  updateScroll(cameraX: number, cameraY: number): void {
    for (const layer of this.layers) {
      layer.sprite.x = -640 + cameraX * (1 - layer.factor);
      layer.sprite.y = -360 + cameraY * (1 - layer.factor);
    }
  }

  /** CSV BG stops → 1x256 세로 그라디언트 텍스처 */
  private buildGradientTexture(paletteRef: string): Texture { ... }

  clear(): void { ... }
  destroy(): void { ... }
}
```

### 6.6 `game/src/scenes/LdtkWorldScene.ts`

**레벨→에어리어 매핑 추가:**
```typescript
const LEVEL_AREA_MAP: Record<string, string> = {
  'Garden': 'world_garden', 'Garden2': 'world_garden',
  'Sewers1': 'world_sewers', 'Water_supply': 'world_sewers',
};
const DEFAULT_AREA = 'world_shaft';
function getAreaForLevel(levelId: string): string {
  return LEVEL_AREA_MAP[levelId] ?? DEFAULT_AREA;
}
```

**init 시** (~line 440):
```typescript
this.parallaxBG = new ParallaxBackground();
this.container.addChildAt(this.parallaxBG.container, 0);
```

**레벨 로드 시** (~line 1845):
```typescript
const areaId = getAreaForLevel(level.identifier);
const bgEntry = getAreaPalette(`${areaId}_bg`);
const wallEntry = getAreaPalette(`${areaId}_wall`);
// 팔레트 필터 전환
this.bgFilter.setRow(getAreaPaletteRow(bgEntry.id));
this.wallFilter.setRow(getAreaPaletteRow(wallEntry.id));
// 패럴랙스 갱신
const plxDefs = getParallaxLayers(areaId);
await this.parallaxBG.setup(plxDefs, level.pxWid, level.pxHei);
```

**render(alpha) 시:**
```typescript
this.parallaxBG.updateScroll(
  this.game.camera.renderX,
  this.game.camera.renderY
);
```

---

## 7. 패럴랙스 이미지 사양

| 항목 | 값 |
|:-----|:---|
| 포맷 | 그레이스케일 PNG (PaletteSwapFilter 호환) |
| 경로 | `game/public/assets/parallax/{name}.png` |
| 내용 | 구조물 실루엣. 투명 영역은 뒤 레이어가 비침 |

### L1 원경 (`shaft_far.png`)
```
권장 크기: 320 x 720 (세로 타일링)
내용: 거대 수직 기둥, 수평 다리, 케이블
배치: 화면 중앙. 좌우 여백 투명
세로 타일 이음새가 자연스럽도록 제작
```

### L2 근경 (`shaft_near.png`)
```
권장 크기: 640 x 480 (세로 타일링)
내용: 좌우 암벽 + 파이프/크레인
배치: 화면 좌우 가장자리. 중앙 투명 (게임플레이 시야 확보)
```

---

## 8. 엣지 케이스

| 케이스 | 처리 |
|:-------|:-----|
| CSV에 AreaID 미등록 | `getParallaxLayers()` 빈 배열 반환 → 패럴랙스 없이 검정 배경 |
| Palette CSV에 서브에어리어 미등록 | `getAreaPalette()` fallback 필요. world_shaft_bg 기본값 |
| 줌 변경 | TilingSprite 크기를 충분히 크게 생성하여 별도 처리 불필요 |
| 카메라 셰이크 | `camera.renderX/Y`에 포함 → 패럴랙스도 약하게 흔들림 (자연스러움) |
| 레벨 경계 | 카메라 bounds 클램프 후 renderX/Y 사용 → 자동 처리 |
| 이미지 로드 실패 | `Assets.load` catch → 해당 레이어 스킵, 콘솔 경고 |
| 에어리어 전환 (같은 에어리어 내 레벨 이동) | areaId 동일하면 `setup()` 스킵 (불필요한 재로드 방지) |

---

## 9. 구현 순서

1. `Content_System_Area_Palette.csv` — ParallaxImage/Factor 컬럼 제거
2. `Content_System_Parallax.csv` — 신규 CSV 작성
3. `parallaxData.ts` — CSV 파서 + `PARALLAX_LAYERS` 맵
4. `PaletteSwapFilter.ts` — `sampleRow`, `unpack`, `lerp` export
5. `ParallaxBackground.ts` — 다중 레이어 클래스
6. `LdtkWorldScene.ts` — 레벨→에어리어 매핑 + init/loadLevel/render 통합
7. `parallax/` 디렉토리 + 테스트용 placeholder 이미지
8. 빌드 + 테스트

---

## 10. 검증

1. `pnpm dev` → 게임 시작 → 월드 진입
2. 좌우 이동: L1(원경)이 L2(근경)보다 느리게, L2가 벽보다 느리게 스크롤
3. 상하 이동: Y축 패럴랙스도 동일하게 동작
4. 실내 타일(LDtk Background): 벽과 동일 속도(1:1)로 스크롤 확인
5. 레벨 전환(Garden→Sewers): 에어리어별 패럴랙스 이미지/팔레트 자동 전환
6. CSV 팔레트 색상이 그라디언트 + 이미지 착색에 정확히 반영
7. 패럴랙스 이미지 없는 에어리어: 그라디언트만 표시 (에러 없음)
