# 아이템계 비주얼 아이덴티티 시스템 — 구현 계획서

> **작성일:** 2026-04-23
> **목적:** 300개 무기 각각의 아이템계가 고유한 시각적 정체성을 갖도록, Rain World의 팔레트/절차적 장식 시스템을 ECHORIS 기존 인프라(PaletteSwapFilter + ProceduralDecorator + Area_Palette CSV) 위에 확장한다.
> **근거 리서치:**
> - `Documents/Research/RainWorld_ArtStyle_VisualAnalysis.md` — 팔레트 시스템, 깊이 레이어, 지역별 색채
> - `Documents/Research/RainWorld_ProceduralEffects_Research.md` — 절차적 장식 Grower/Hanger/Clinger, 밀도 맵
> **기존 구현:**
> - `game/src/effects/PaletteSwapFilter.ts` — Dead Cells식 그래디언트 LUT 셰이더
> - `game/src/data/areaPalettes.ts` — CSV 기반 팔레트 DB (Stops 그래디언트)
> - `game/src/level/ProceduralDecorator.ts` — Grower/Hanger/Clinger + Structure 레이어
> - `Sheets/Content_System_Area_Palette.csv` — BG/WALL 팔레트 정의 (현재 레어리티 5쌍)

---

## 1. 현재 상태 & 문제

### 구현 완료된 것

| 컴포넌트 | 상태 | 파일 |
|:---|:---|:---|
| PaletteSwapFilter (LUT 셰이더) | 완성 | `effects/PaletteSwapFilter.ts` |
| Area Palette CSV → 런타임 팔레트 텍스처 | 완성 | `data/areaPalettes.ts` |
| ProceduralDecorator (Grower/Hanger/Clinger + Structure) | 완성 | `level/ProceduralDecorator.ts` |
| 3-Layer 패럴랙스 배경 | 완성 | `level/ParallaxBackground.ts` |
| Depth Gradient (uDepthBias/uDepthCenter) | 완성 | PaletteSwapFilter 내장 |

### 문제: 아이템계 비주얼이 레어리티 5종으로 뭉개진다

현재 `Content_System_Area_Palette.csv`에 아이템계 팔레트가 **레어리티 기준 5쌍**(iw_normal, iw_magic, iw_rare, iw_legendary, iw_ancient)만 존재한다. 300개 무기가 5가지 색감으로만 구분되어, "이 무기만의 공간"이라는 느낌이 없다.

### 문제: ProceduralDecorator가 테마를 모른다

현재 ProceduralDecorator는 **단일 프리셋**(풀/뿌리/이끼 + 철골/콘크리트/파이프)으로 모든 방을 장식한다. 테마(거주 모듈 vs 보안 구역 vs 연구소)에 따른 장식 차별화가 없다.

---

## 2. 목표 구조

```
무기 1개의 아이템계 비주얼 = ThemeID(11종) + VisualSeed(무기별) + Strata Depth(지층)
```

### 3개 축

| 축 | 역할 | 데이터 |
|:---|:---|:---|
| **ThemeID** | 공간의 성격 결정 (팔레트 + 소품 풀 + 몬스터 풀) | CSV 11행 |
| **VisualSeed** | 같은 테마 안에서의 미세 변주 (색조 편차, 소품 밀도, 노이즈 위치) | 무기 CSV 1컬럼 (또는 WeaponID 해시) |
| **Strata Depth** | 내려갈수록 팔레트 탈색 + 부식 증가 + 유기체화 | 코드 공식 (CSV 아님) |

---

## 3. 데이터 변경

### 3.1 Content_System_Area_Palette.csv — 레어리티 5쌍 → 테마 11쌍

**삭제:** `iw_normal_bg/wall`, `iw_magic_bg/wall`, `iw_rare_bg/wall`, `iw_legendary_bg/wall`, `iw_ancient_bg/wall` (10행)

**추가:** 테마별 BG/WALL 22행

```csv
AreaID,Name,Layer,Brightness,Tint,DepthBias,DepthCenter,Stops,Description,Tileset,...
iw_habitat_bg,거주 모듈,BG,1.00,0xFFFFFF,0.50,0.38,0.00:2a1a14|0.18:5a3828|0.38:8a6040|0.55:b88858|0.72:d8b078|0.88:e8d8a0|1.00:f0eed8,따뜻한 거주 공간 — 파이프와 조명,world_01,...
iw_habitat_wall,거주 모듈,WALL,1.00,0xFFFFFF,0.50,0.40,0.00:020506|0.15:071018|0.30:0f1e24|0.50:1a3440|0.70:284e60|1.00:407888,거주 모듈 벽,world_01,...
iw_security_bg,보안 구역,BG,0.95,0xFFFFFF,0.55,0.40,0.00:0a1420|0.18:1a2840|0.38:2a4060|0.55:3a6080|0.72:5888a8|0.88:88b0c8|1.00:c0d8e8,차가운 감시 복도,world_01,...
iw_security_wall,보안 구역,WALL,1.00,0xFFFFFF,0.50,0.40,0.00:030306|0.15:080810|0.30:10101c|0.50:1a1a30|0.70:282848|1.00:404070,보안 구역 벽,world_01,...
iw_foundry_bg,제조 플랜트,BG,1.05,0xFFFFFF,0.55,0.35,0.00:2a0a08|0.18:6a1a10|0.38:b04020|0.55:e07030|0.72:f0a050|0.88:e8d080|1.00:fff0d0,용융로의 열기,world_01,...
iw_foundry_wall,제조 플랜트,WALL,1.00,0xFFFFFF,0.50,0.40,0.00:020506|0.15:071018|0.30:0f1e24|0.50:1a3440|0.70:284e60|1.00:407888,제조 벽,world_01,...
iw_biozone_bg,생태 구역,BG,1.00,0xFFFFFF,0.50,0.35,0.00:0a1a08|0.18:1a3a14|0.38:2a5a20|0.55:4a8a38|0.72:70b858|0.88:a0d880|1.00:d8f0c0,과성장 바이오돔,world_01,...
iw_biozone_wall,생태 구역,WALL,1.00,0xFFFFFF,0.50,0.40,0.00:060302|0.15:100806|0.30:1c120a|0.50:301e14|0.70:483020|1.00:6a4830,바이오존 벽,world_01,...
iw_archive_bg,데이터 센터,BG,1.10,0xFFFFFF,0.45,0.40,0.00:0a0a18|0.18:1a1a38|0.38:2a2a58|0.55:404080|0.72:6868a8|0.88:9898c8|1.00:d0d0e8,형광등 균일광,world_01,...
iw_archive_wall,데이터 센터,WALL,1.00,0xFFFFFF,0.50,0.40,0.00:040406|0.15:0a0a10|0.30:14141c|0.50:202030|0.70:303048|1.00:4a4a68,데이터 센터 벽,world_01,...
iw_logistics_bg,물류 네트워크,BG,0.95,0xFFFFFF,0.50,0.38,0.00:1a1408|0.18:3a3018|0.38:5a4828|0.55:806840|0.72:a89060|0.88:c8b888|1.00:e8dcc0,화물 통로,world_01,...
iw_logistics_wall,물류 네트워크,WALL,1.00,0xFFFFFF,0.50,0.40,0.00:040404|0.15:0a0a0a|0.30:141412|0.50:202018|0.70:303028|1.00:484840,물류 벽,world_01,...
iw_command_bg,지휘 센터,BG,1.05,0xFFFFFF,0.50,0.42,0.00:08081a|0.18:141830|0.38:202848|0.55:304068|0.72:486090|0.88:6888b0|1.00:a0b8d0,지휘 브릿지,world_01,...
iw_command_wall,지휘 센터,WALL,1.00,0xFFFFFF,0.50,0.40,0.00:030304|0.15:08080a|0.30:101014|0.50:1a1a22|0.70:282834|1.00:3a3a50,지휘 벽,world_01,...
iw_malfunction_bg,시스템 오류,BG,0.90,0xFFFFFF,0.60,0.35,0.00:1a0810|0.18:3a1020|0.38:5a1830|0.55:802840|0.72:a84058|0.88:c86878|1.00:e0a0a8,에러 발광,world_01,...
iw_malfunction_wall,시스템 오류,WALL,1.00,0xFFFFFF,0.50,0.40,0.00:060204|0.15:100608|0.30:1c0a10|0.50:30121a|0.70:481c28|1.00:6a2c3c,오류 벽,world_01,...
iw_breach_bg,구조 붕괴,BG,0.95,0xFFFFFF,0.55,0.35,0.00:180a08|0.18:381810|0.38:5a2818|0.55:804020|0.72:a86030|0.88:c88048|1.00:e0a870,붕괴 경고등,world_01,...
iw_breach_wall,구조 붕괴,WALL,1.00,0xFFFFFF,0.50,0.40,0.00:040302|0.15:0a0806|0.30:16100c|0.50:241a14|0.70:382820|1.00:584030,붕괴 벽,world_01,...
iw_coolant_bg,냉각 인프라,BG,1.00,0xFFFFFF,0.50,0.38,0.00:081820|0.18:103038|0.38:184850|0.55:286870|0.72:408890|0.88:68a8b8|1.00:a0d0d8,냉각수 반사,world_01,...
iw_coolant_wall,냉각 인프라,WALL,1.00,0xFFFFFF,0.50,0.40,0.00:020404|0.15:060a0a|0.30:0c1414|0.50:142020|0.70:203030|1.00:304848,냉각 벽,world_01,...
iw_echo_bg,잔류 데이터,BG,0.85,0xFFFFFF,0.65,0.35,0.00:0a0414|0.18:180828|0.38:281040|0.55:401858|0.72:582878|0.88:7848a0|1.00:a878c8,에코 공명 공간,world_01,...
iw_echo_wall,잔류 데이터,WALL,1.00,0xFFFFFF,0.50,0.40,0.00:040206|0.15:0a060e|0.30:140c18|0.50:201424|0.70:301e34|1.00:4a304e,에코 벽,world_01,...
```

### 3.2 Content_Stats_Weapon_List.csv — ThemeID 컬럼 추가

기존 컬럼 끝에 `ThemeID` 1개만 추가. VisualSeed는 코드에서 `hash(WeaponID)` 자동 파생.

```csv
WeaponID,Name,Type,Rarity,BaseATK,AtkSpeed,Range,HitboxW,HitboxH,ThemeID
sword_broken,Broken Sword,Blade,normal,8,1.0,42,34,15,T-HABITAT
sword_normal,Starter Blade,Blade,normal,15,1.0,60,45,19,T-FOUNDRY
sword_magic,Steel Longblade,Blade,magic,20,1.0,70,52,22,T-SECURITY
sword_rare,Rune Blade,Blade,rare,26,1.0,80,60,25,T-ARCHIVE
sword_legendary,Abyssal Edge,Blade,legendary,33,1.05,92,70,29,T-BREACH
sword_ancient,Abyss Phantom,Blade,ancient,45,1.1,108,82,34,T-ECHO
```

### 3.3 신규 CSV: Content_ItemWorld_DecoPresets.csv

테마별 ProceduralDecorator 파라미터. 현재 하드코딩된 색상/밀도를 테마별로 분리.

```csv
ThemeID,GrowerColor,GrowerTipColor,HangerColor,HangerDripColor,ClingerColor,ClingerVineColor,StructColor1,StructColor2,DetailDensity,StructDensity,GrowerHeightMin,GrowerHeightMax,HangerLenMin,HangerLenMax
T-HABITAT,0x6a8a58,0x8aaa68,0x5a4838,0x607888,0x4a6a3a,0x3a5a2a,0x5a6068,0x787872,0.5,0.10,3,8,3,6
T-SECURITY,0x3a5a7a,0x4a6a8a,0x404858,0x506878,0x3a4a5a,0x2a3a4a,0x5a6068,0x484858,0.3,0.20,2,5,2,5
T-FOUNDRY,0x8a5a2a,0xaa7a3a,0x6a3a1a,0xa05020,0x7a5a2a,0x5a3a1a,0x6a3a2a,0x7a4a30,0.4,0.25,4,10,4,8
T-BIOZONE,0x3a7a2a,0x5a9a3a,0x2a5a2a,0x4a8a3a,0x4a6a3a,0x3a5a2a,0x5a6048,0x687860,0.8,0.05,5,14,5,10
T-ARCHIVE,0x4a4a6a,0x5a5a7a,0x3a3a5a,0x5a5a8a,0x404060,0x303050,0x5a5a68,0x686878,0.2,0.15,2,5,2,4
T-LOGISTICS,0x6a6a4a,0x8a8a5a,0x5a5a3a,0x7a7a58,0x585848,0x484838,0x6a6a58,0x7a7a68,0.4,0.30,3,7,3,6
T-COMMAND,0x3a4a6a,0x4a5a7a,0x2a3a4a,0x4a6088,0x3a4a5a,0x2a3a4a,0x5a6068,0x4a5060,0.2,0.20,2,5,2,5
T-MALFUNCTION,0x7a3a4a,0x9a4a5a,0x5a2a3a,0x8a3848,0x6a3a3a,0x4a2a2a,0x5a3038,0x6a4048,0.6,0.15,3,9,3,8
T-BREACH,0x6a4a2a,0x8a6a3a,0x5a3a1a,0x804828,0x5a4a2a,0x4a3a1a,0x6a4030,0x7a5040,0.5,0.30,3,8,3,7
T-COOLANT,0x3a6a7a,0x4a7a8a,0x2a5060,0x4a8898,0x3a5a6a,0x2a4a5a,0x4a6068,0x5a7078,0.4,0.10,4,10,4,8
T-ECHO,0x5a3a6a,0x6a4a7a,0x4a2a5a,0x6a4888,0x4a3a5a,0x3a2a4a,0x484058,0x585068,0.3,0.08,3,8,3,7
```

---

## 4. 코드 변경

### 4.1 ItemWorldScene.ts — 팔레트 조회 로직 변경

**현재:** 레어리티로 팔레트 조회
```typescript
// 현재 코드 (개념)
const bgId = `iw_${rarity}_bg`;
const wallId = `iw_${rarity}_wall`;
```

**변경 후:** ThemeID로 조회 + 시드 변주
```typescript
// 무기의 ThemeID로 팔레트 조회
const themeId = weapon.themeId.toLowerCase().replace('t-', '');  // "T-HABITAT" → "habitat"
const bgPalette = AREA_PALETTES.get(`iw_${themeId}_bg`);
const wallPalette = AREA_PALETTES.get(`iw_${themeId}_wall`);

// VisualSeed로 미세 변주
const seed = hashString(weapon.weaponId);
const rng = new PRNG(seed);
const brightnessShift = rng.nextFloat(-0.08, 0.08);
const depthBiasShift = rng.nextFloat(-0.05, 0.05);

bgFilter.brightness = bgPalette.brightness + brightnessShift;
bgFilter.depthBias = bgPalette.depthBias + depthBiasShift;
```

### 4.2 ProceduralDecorator.ts — 테마별 프리셋 로드

**현재:** 색상이 하드코딩 (`COLOR_GROWER = 0x3a7a2a` 등)

**변경 후:** CSV에서 테마별 프리셋 로드
```typescript
// 신규: DecoPreset 로드
import { DECO_PRESETS, DecoPreset } from '@data/decoPresets';

class ProceduralDecorator {
  private preset: DecoPreset;

  setTheme(themeId: string): void {
    this.preset = DECO_PRESETS.get(themeId) ?? DECO_PRESETS.get('T-HABITAT')!;
    this.cfg.density = this.preset.detailDensity;
    this.cfg.structureDensity = this.preset.structDensity;
  }

  // drawGrower 내부: COLOR_GROWER → this.preset.growerColor
  // drawHanger 내부: COLOR_HANGER → this.preset.hangerColor
  // ...
}
```

### 4.3 신규 파일: data/decoPresets.ts

`Content_ItemWorld_DecoPresets.csv`를 파싱하여 테마별 프리셋 Map 생성. `areaPalettes.ts`와 동일 패턴.

### 4.4 지층 깊이별 자동 변형

ItemWorldScene에서 지층 진입 시:

```typescript
function applyStrataDepth(filter: PaletteSwapFilter, basePalette: AreaPaletteEntry, stratum: number, totalStrata: number): void {
  const depth = stratum / totalStrata;  // 0.0 ~ 1.0

  // 깊을수록 어둡고 탈색
  filter.brightness = basePalette.brightness * (1.0 - depth * 0.3);

  // 깊을수록 깊이 그래디언트 강화
  filter.depthBias = basePalette.depthBias + depth * 0.15;

  // 깊을수록 부식 장식 밀도 증가 (ProceduralDecorator 전달)
  decorator.cfg.density = basePreset.detailDensity + depth * 0.2;
}
```

---

## 5. 시각 차별화 매트릭스

### 테마 × 지층 깊이 = 체감 예시

| ThemeID | 지층 1 (Surface) | 지층 2 (Mid) | 지층 3 (Deep) | 지층 4/심연 (Core) |
|:---|:---|:---|:---|:---|
| **T-HABITAT** | 따뜻한 거주 모듈. 파이프/조명 | 어두워진 모듈. 부식 시작 | 벽이 유기적 변형. 환기구 호흡 | 빈 방. 응답 없는 시스템 |
| **T-SECURITY** | 푸른빛 감시 복도. 잠금 격벽 | 오작동 보안 시스템. 노이즈 | 보안 드론이 뒤틀림. 기계-유기 | 빈 초소. 순찰 프로토콜 잔상만 |
| **T-FOUNDRY** | 주황빛 용융로. 단조 열기 | 과열된 금속. 녹아내림 | 금속이 살처럼 변형 | 꺼진 화덕. 최초의 타격 기록 |
| **T-BIOZONE** | 초록 과성장 바이오돔 | 제어 불능 식물 | 식물과 기계 융합 | 원시 생태. 최초의 씨앗 |
| **T-ARCHIVE** | 보라-회색 데이터 센터 | 손상 로그. 글리치 시각 | 데이터가 물질화 | 빈 터미널. 최초의 기록 |
| **T-BREACH** | 주황 경고등. 붕괴 격벽 | 파편 부유. 중력 불안정 | 구조물이 유기체로 | 끝없는 낙하. 구조물의 끝 |
| **T-ECHO** | 보라빛 에코 공명 | 데이터 노이즈 시각화 | 기억과 현실 경계 붕괴 | 빌더의 원점. 비유클리드 |

### 같은 테마, 다른 시드 = 미세 차이

| 무기 A (T-SECURITY, Seed 0x4D91) | 무기 B (T-SECURITY, Seed 0xB2E5) |
|:---|:---|
| 밝기 +0.03, 약간 밝은 복도 | 밝기 -0.05, 어두운 복도 |
| 소품 밀도 0.28, 장식 적음 | 소품 밀도 0.35, 장식 많음 |
| 깊이 편차 +0.02, 살짝 평평한 그래디언트 | 깊이 편차 -0.04, 더 극적인 그래디언트 |

---

## 6. 구현 순서

### Step 1: 데이터 준비 (CSV)
1. `Content_System_Area_Palette.csv`에서 레어리티 5쌍 삭제
2. 테마 11쌍 22행 추가
3. `Content_ItemWorld_DecoPresets.csv` 신규 생성 (11행)
4. `Content_Stats_Weapon_List.csv`에 ThemeID 컬럼 추가

### Step 2: 코드 — 팔레트 조회 변경
1. `ItemWorldScene.ts` — 레어리티 기반 팔레트 조회 → ThemeID 기반으로 변경
2. 시드 변주 로직 추가 (brightness/depthBias 미세 흔들림)
3. 지층 깊이 공식 적용

### Step 3: 코드 — ProceduralDecorator 테마화
1. `data/decoPresets.ts` 신규 생성 (CSV 파서)
2. `ProceduralDecorator.ts`에 `setTheme(themeId)` 추가
3. 하드코딩 색상 → 프리셋 참조로 교체
4. ItemWorldScene에서 방 생성 시 `decorator.setTheme(weapon.themeId)` 호출

### Step 4: 검증
1. 같은 테마 다른 무기 → 미세하게 다른 색감 확인
2. 다른 테마 → 확연히 다른 공간 확인
3. 지층 1→4 진행 → 점진적 어두워짐/부식 확인
4. 빌드 에러 없음: `pnpm run build`
5. 성능: 방 진입 <200ms 유지

---

## 7. 테마별 장식물 명세

> **SSoT:** `Sheets/Content_ItemWorld_DecorationCatalog.csv`
> 기존 8종(공용) + 테마 전용 55종 = **총 63종** 장식물

### 7.1 공용 장식물 (ALL 테마, 기존 8종)

모든 테마에서 공통으로 사용. 색상만 테마 프리셋에서 변경.

| ID | 이름 | 패턴 | 레이어 | 형태 |
|:---|:---|:---|:---|:---|
| base_grower | Grass Blade | grower | detail | 삼각형 2-4개 |
| base_grower_flower | Stem Flower | grower | detail | 줄기+원형 꽃 (10%) |
| base_hanger | Root Strand | hanger | detail | 꺾인 선 1-3개 |
| base_hanger_drip | Water Drop | hanger | detail | 물방울 원 (5%) |
| base_clinger | Moss Patch | clinger | detail | 원형 패치 2-5개 |
| base_clinger_vine | Vine Leaf | clinger | detail | 덩굴+잎 (8%) |
| base_steel_beam | Steel I-Beam | any | structure | I빔 2-4타일 |
| base_concrete | Concrete Chunk | any | structure | 불규칙 다각형+균열 |
| base_rebar | Exposed Rebar | any | structure | 꺾인 철근 2-5개 |
| base_pipe | Pipe Segment | any | structure | 둥근 파이프+조인트 |
| base_girder | Girder Outline | any | structure | L자 거더+브레이스 |

### 7.2 T-HABITAT (거주 모듈) -- 5종 추가

생활 흔적이 남은 따뜻한 공간. 환기구, 선반, 조명 잔해, 천 조각, 먼지.

| ID | 이름 | 패턴 | 레이어 | 형태 | 설명 |
|:---|:---|:---|:---|:---|:---|
| hab_vent_grille | Vent Grille | floor | structure | 수평 격자 사각형 | 바닥 위 환기구 격자 |
| hab_shelf_bracket | Shelf Bracket | wall | structure | L자형 금속 | 벽 선반 브래킷 |
| hab_light_frame | Broken Light | ceiling | structure | 사각+늘어진 선 | 천장 조명 프레임 잔해 |
| hab_cloth_strip | Cloth Strip | hanger | detail | 물결 선 (흔들림) | 천 조각이 천장에서 늘���짐 |
| hab_dust_mote | Dust Cluster | grower | detail | 희미한 원 클러스터 | 바닥 모서리 먼지 뭉치 |

### 7.3 T-SECURITY (보안 구역) -- 5종 추가

감시와 통제의 흔적. 카메라, 경고 줄무늬, 센서선, 격벽 프레임.

| ID | 이름 | 패턴 | ��이어 | 형태 | ���명 |
|:---|:---|:---|:---|:---|:---|
| sec_camera_mount | Camera Mount | wall | structure | 사각+원 | 감시 카메라 브래킷 |
| sec_warning_stripe | Warning Stripe | floor | detail | 줄무늬 패턴 | 바닥 경고 노란-검정선 |
| sec_sensor_line | Sensor Line | wall | detail | 수평 얇은 선 | 감지 레이저선 |
| sec_gate_frame | Gate Frame | wall | structure | 두꺼운 사각 | 격벽 게이트 프레임 잔해 |
| sec_lock_panel | Lock Panel | wall | structure | 사각+상태 원 | 잠금 패널 |

### 7.4 T-FOUNDRY (제조 플랜트) -- 6종 추가

열기와 금속의 공간. 도가니, 주형, 컨베이어, 용융 방울, 그을음, 슬래그.

| ID | 이름 | 패턴 | 레이어 | 형태 | 설명 |
|:---|:---|:---|:---|:---|:---|
| fnd_crucible | Crucible Remains | floor | structure | 반원형 용기 | 도가니 잔해 |
| fnd_mold_frame | Mold Frame | wall | structure | 빈 사각형 | 주형 프레임 |
| fnd_conveyor_rail | Conveyor Rail | floor | structure | 수평 두꺼운 선 | 컨베이어 레일 |
| fnd_ember_drip | Ember Drip | hanger | detail | 발광 원 | 천장 용융 방울 |
| fnd_soot_patch | Soot Patch | clinger | detail | 어두운 원 뭉치 | 벽면 그을음 패치 |
| fnd_slag_heap | Slag Heap | grower | detail | 불규칙 다각형 | 바닥 슬래그 더미 |

### 7.5 T-BIOZONE (생태 구역) -- 6종 추가

과성장 생태계. 두꺼운 뿌리, 포자, 덩굴 분기, 관수 파이프, 씨앗 꼬투리.

| ID | 이름 | 패턴 | 레이어 | 형태 | 설명 |
|:---|:---|:---|:---|:---|:---|
| bio_culture_tank | Culture Tank | wall | structure | 사각+상단 원 | 배양 수조 파편 |
| bio_root_thick | Thick Root | hanger | detail | 굵은 곡선 | 천장 두���운 뿌리 |
| bio_spore_cloud | Spore Cloud | grower | detail | 반투명 원 클러스터 | 바닥 위 포자 구름 |
| bio_overgrowth | Overgrowth Vine | clinger | detail | 분기하는 선 | 벽 과성장 덩굴 |
| bio_irrigation | Irrigation Pipe | ceiling | structure | 얇은 둥근 관 | 천장 관수 파이프 |
| bio_seed_pod | Seed Pod | grower | detail | 줄기+큰 원 | 씨앗 꼬투리 |

### 7.6 T-ARCHIVE (데이터 센터) -- 5종 추가

데이터와 터미널의 공간. 서버 랙, 케이블 트레이, 터미널 파편, 발광 데이터 가닥.

| ID | 이름 | 패턴 | 레이어 | 형태 | 설명 |
|:---|:---|:---|:---|:---|:---|
| arc_server_rack | Server Rack | wall | structure | 세로 사각+수평 선들 | 서버 랙 잔해 |
| arc_cable_tray | Cable Tray | ceiling | structure | 긴 사각+늘어진 선 | 천장 케이블 트레이 |
| arc_terminal_shard | Terminal Shard | floor | structure | 각진 다각형 | 터미널 파편 |
| arc_data_strand | Data Strand | hanger | detail | 얇은 발광 선 | 천장 데이터 가닥 |
| arc_screen_flicker | Screen Fragment | wall | detail | 소형 발광 사각 | 화면 파편 |

### 7.7 T-LOGISTICS (물류 네트워크) -- 5종 추가

운송과 적재의 흔적. 컨테이너, 레일, 크레인, 라벨, 팔레트 판자.

| ID | 이름 | 패턴 | 레이어 | 형태 | 설명 |
|:---|:---|:---|:---|:---|:---|
| log_container | Cargo Fragment | floor | structure | 큰 사각형 | 화물 컨테이너 파편 |
| log_rail_segment | Rail Segment | floor | structure | 수평 선+침목 | 레일 세그먼트 |
| log_crane_arm | Crane Arm Shard | ceiling | structure | 두꺼운 각진 선 | 크레인 암 파편 |
| log_label_scrap | Label Scrap | clinger | detail | 소형 사각형 | 라벨 조각 |
| log_pallet_slat | Pallet Slat | grower | detail | 얇은 세로 사각 | 팔레트 판자 |

### 7.8 T-COMMAND (지휘 센터) -- 5종 추가

지휘와 통신의 공간. 계기판, 안테나, 디스플레이, 표시등, 홀로그램 잔상.

| ID | 이름 | 패턴 | 레이어 | 형태 | 설명 |
|:---|:---|:---|:---|:---|:---|
| cmd_console_panel | Console Panel | wall | structure | 사각+원형 열 | 계기판 잔해 |
| cmd_antenna_shard | Antenna Shard | ceiling | structure | 긴 얇은 선 | 안테나 파편 |
| cmd_display_frame | Display Frame | wall | structure | 큰 빈 사각형 | 디스플레이 프레임 |
| cmd_indicator_dot | Indicator Light | wall | detail | 작은 발광 원 | 표시등 |
| cmd_holo_line | Holo Residue | hanger | detail | 희미한 선 | 홀로그램 잔상 |

### 7.9 T-MALFUNCTION (시스템 오류) -- 5종 추가

오작동과 부식의 공간. 뒤틀린 패널, 과부하 콘덴서, 깨진 회로, 스파크, 오류 문양.

| ID | 이름 | 패턴 | 레이어 | 형태 | 설명 |
|:---|:---|:---|:---|:---|:---|
| mal_twisted_panel | Twisted Panel | wall | structure | 변형 다각형 | 뒤틀린 패널 |
| mal_overload_cap | Overload Capacitor | floor | structure | 사각+방사 원 | 과부하 콘덴서 |
| mal_broken_circuit | Broken Circuit | clinger | detail | 지그재그 선 | 깨진 ��로 패턴 |
| mal_spark_node | Spark Node | any | detail | 맥동 발광 원 | 스파크 노드 |
| mal_error_glyph | Error Glyph | wall | detail | 사각+X선 | 오류 문양 |

### 7.10 T-BREACH (구조 붕괴) -- 5종 추가

붕괴와 파괴의 공간. 파쇄 격벽, 매달린 슬래브, 잔해 더미, 구조 균열, 분진.

| ID | 이름 | 패턴 | 레이어 | 형태 | 설명 |
|:---|:---|:---|:---|:---|:---|
| bre_shattered_wall | Shattered Bulkhead | wall | structure | 큰 불규칙 다각형 | 파쇄된 격벽 |
| bre_hanging_slab | Hanging Slab | ceiling | structure | 사각+줄 | 매달린 슬래브 |
| bre_rubble_pile | Rubble Pile | grower | structure | 작은 다각형 여럿 | 잔해 더미 |
| bre_crack_line | Structural Crack | any | detail | 분기하는 선 | 구조 균열 |
| bre_dust_fall | Dust Fall | hanger | detail | 얇은 선 여러 개 | 분진 낙하 |

### 7.11 T-COOLANT (냉각 인프라) -- 6종 추가

냉각수와 응결의 공간. 냉각 코일, 밸브, 결로, 서리, 물방울, 탱크 파편.

| ID | 이름 | 패턴 | 레이어 | 형태 | 설명 |
|:---|:---|:---|:---|:---|:---|
| cool_coil_segment | Cooling Coil | wall | structure | 나선 선 | 냉각 코일 |
| cool_valve_cluster | Valve Cluster | wall | structure | 원+십자 선 | 밸브 클러스터 |
| cool_condensation | Condensation | clinger | detail | 작은 원 여러 개 | 벽면 결로 |
| cool_frost_patch | Frost Patch | grower | detail | 반투명 불규칙 형태 | 바닥 서리 패치 |
| cool_drip_line | Drip Line | hanger | detail | 얇은 선+끝 원 | 물방울 줄 |
| cool_tank_fragment | Tank Fragment | floor | structure | 곡면 사각 | 저수 탱크 파편 |

### 7.12 T-ECHO (잔류 데이터) -- 6종 추가

기억과 공명의 추상 공간. 공명 결정, 부유 파편, 기억 결절, 데이터 먼지, 공허 촉수.

| ID | 이름 | 패턴 | 레이��� | 형태 | ���명 |
|:---|:---|:---|:---|:---|:---|
| echo_resonance_crystal | Resonance Crystal | grower | structure | 육각형 | 바닥 공명 결정 |
| echo_float_shard | Floating Shard | hanger | detail | 발광 다각형 | 부유 파편 |
| echo_memory_node | Memory Node | wall | structure | 큰 발광 �� | 기억 결절 |
| echo_data_dust | Data Dust | any | detail | 반투명 작은 원 다수 | 데이터 먼지 |
| echo_void_tendril | Void Tendril | hanger | detail | 긴 곡선 | 공허 촉수 |
| echo_glitch_stripe | Glitch Stripe | wall | detail | 수평 발광 얇은 사각 | 글리치 줄무늬 |

### 7.13 통계 요약

| 카테고리 | Detail | Structure | 합계 |
|:---|:---:|:---:|:---:|
| 공용 (ALL) | 6 | 5 | **11** |
| T-HABITAT | 2 | 3 | 5 |
| T-SECURITY | 2 | 3 | 5 |
| T-FOUNDRY | 3 | 3 | 6 |
| T-BIOZONE | 4 | 2 | 6 |
| T-ARCHIVE | 2 | 3 | 5 |
| T-LOGISTICS | 2 | 3 | 5 |
| T-COMMAND | 2 | 3 | 5 |
| T-MALFUNCTION | 3 | 2 | 5 |
| T-BREACH | 2 | 3 | 5 |
| T-COOLANT | 3 | 3 | 6 |
| T-ECHO | 3 | 2 | 5 (+1 any) |
| **합계** | **30** | **33** | **63** |

**방 1개의 장식 구성:** 공용 11종에서 밀도에 따라 선별 + 해당 테마 5-6종 전부 사용 = **16-17종**이 혼합된 방

### 7.14 장식물 카탈로그 CSV

> **SSoT:** `Sheets/Content_ItemWorld_DecorationCatalog.csv`

| 컬럼 | 설명 |
|:---|:---|
| DecoID | 고유 식별자 |
| Name | 영문 이름 |
| Pattern | grower/hanger/clinger/floor/wall/ceiling/any |
| Layer | detail/structure |
| ThemeID | ALL 또는 특정 테마 |
| Shape | 그리기 형태 코드 (poly_triangle, line_bent, circle_glow 등) |
| Description | 한글 설명 |
| MinPerRoom / MaxPerRoom | 방당 최소/최대 개수 |
| SpawnChance | 가장자리 1개당 스폰 확률 |

### 7.15 구현 방식: ProceduralDecorator 확장

기존 `drawGrower`, `drawHanger`, `drawClinger`, `drawStructure` 메서드에 **테마 전용 드로잉 함수를 분기 추가**:

```typescript
private drawGrower(gfx: Graphics, edge: EdgeTile, rng: PRNG): void {
  // 1. 기존 공용 풀잎 (base_grower)
  this.drawBaseGrower(gfx, edge, rng);

  // 2. 테마 전용 grower
  for (const deco of this.preset.themeDecos.filter(d => d.pattern === 'grower')) {
    if (rng.next() < deco.spawnChance) {
      this.drawThemeDeco(gfx, edge, rng, deco);
    }
  }
}

private drawThemeDeco(gfx: Graphics, edge: EdgeTile, rng: PRNG, deco: DecoEntry): void {
  // Shape 코드에 따라 분기
  switch (deco.shape) {
    case 'rect_grid': this.drawVentGrille(gfx, edge, rng); break;
    case 'line_L': this.drawShelfBracket(gfx, edge, rng); break;
    case 'poly_bowl': this.drawCrucible(gfx, edge, rng); break;
    case 'line_spiral': this.drawCoolingCoil(gfx, edge, rng); break;
    case 'poly_hexagon': this.drawResonanceCrystal(gfx, edge, rng); break;
    // ... 63종 전체
  }
}
```

**각 Shape 코드는 PixiJS Graphics API로 구현.** 새 스프라이트 에셋 0장.

---

## 8. 확장 경로 (Phase 3+)

### 8.1 Grime 오버레이 셰이더
Rain World의 `_Grime` 유니폼 재현. 퍼린 노이즈 기반 표면 오염:
- 테마별 Grime 색조 (T-FOUNDRY: 그을음, T-COOLANT: 수분 얼룩, T-MALFUNCTION: 오류 패턴)
- 지층 깊이에 따라 Grime 강도 자동 증가

### 8.2 BlackGoo 비네팅
Rain World식 방 경계 어둡게 처리:
- 방 크기에 맞는 방사형 ���래디언트 마스크
- 테마별 비네팅 강도 (T-ECHO: 강함, T-FOUNDRY: 약함)

### 8.3 흔들림 애니메이션
detail 장식 중 hanger/clinger에 sin 파동 회전 적용:
- `rotation = sin(time * swaySpeed + phaseOffset) * swayAmount`
- T-BIOZONE: 강한 흔들림 (swayAmount=0.08)
- T-ARCHIVE: 없음 (기계적 정지)
- T-COOLANT: 중간 (수류 효과)

---

## 8. 성능 예산

| 항목 | 예산 | 현재 | 변경 후 |
|:---|:---|:---|:---|
| 팔레트 조회 | <1ms | CSV 파싱 빌드 타임 | 동일 (Map 조회) |
| 방 장식 생성 | <200ms | ~120ms (400 detail + 60 struct) | 동일 (프리셋만 교체) |
| 시드 변주 계산 | <0.1ms | 없음 | hash + 4회 RNG |
| 지층 변형 | <0.1ms | 없음 | 곱셈 3회 |
| 메모리 | +0KB | 팔레트 5쌍 | 팔레트 11쌍 (+6쌍, 각 256B = +1.5KB) |

**결론:** 성능 영향 무시 가능.
