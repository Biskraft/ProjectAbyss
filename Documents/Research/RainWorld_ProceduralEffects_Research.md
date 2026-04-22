# Rain World 절차적 이펙트 시스템 분석 + ECHORIS 적용 방안

> **작성일:** 2026-04-22
> **목적:** Rain World의 에디터 기반 절차적 환경 장식(풀, 부식, 뿌리, 체인 등) 시스템을 분석하고, ECHORIS 아이템계(기억의 지층)의 실시간 절차적 장식 생성에 적용할 방안을 도출한다.
> **Sources:**
> - [Rain World Devlog Archive](https://candlesign.github.io/Rain-World-Devlog/Pages/001)
> - [Effects Editor (Fandom Wiki)](https://rain-world-modding.fandom.com/wiki/Effects_Editor)
> - [Tile Editor (Fandom Wiki)](https://rain-world-modding.fandom.com/wiki/Tile_Editor)
> - [Creating Custom Effects (Miraheze)](https://rainworldmodding.miraheze.org/wiki/Creating_Custom_Effects)
> - [Rain World Shader Documentation (GitHub Gist)](https://gist.github.com/EtiTheSpirit/655d8e81732ba516ca768dbd7410ddf4)
> - [Custom Palettes, Tiles and Props (GitHub)](https://github.com/Rain-World-Modding/Rain-World-Modding.github.io)
> - [Drizzle Renderer (GitHub)](https://github.com/PJB3005/Drizzle)
> - [Rained Level Editor (GitHub)](https://github.com/pkhead/rained)
> - [Road to the IGF: Rain World (Game Developer)](https://www.gamedeveloper.com/business/road-to-the-igf-videocult-s-i-rain-world-i-)
> - [Rain World Animation Process (YouTube)](https://www.youtube.com/watch?v=-iXwvoFhPuU)
> - [Unity Blog: Procedural Design in Rain World: The Watcher](https://unity.com/blog/exploring-procedural-design-rain-world)

---

## 1. Rain World 레벨 에디터 파이프라인

### 1.1 개요

Rain World(Videocult, 2017)은 Joar Jakobsson이 단독으로 구축한 독립형 레벨 에디터를 사용한다. 핵심 철학은 **"콜라주(Collage) 방식"** — 손으로 그린 타일 요소들을 절차적 이펙트와 필터로 녹여 하나의 일관된 그래픽으로 만든다.

> *"게임과 함께 독립형 레벨 에디터를 만들고 있다. 복셀과 유사한 방식으로 그래픽을 생성한다."* — Joar Jakobsson

### 1.2 에디터 7단계 파이프라인

| 순서 | 에디터 | 역할 | ECHORIS 대응 |
|:-----|:-------|:-----|:-------------|
| 1 | **Geometry Editor** | 충돌 지오메트리 (Wall/Slope/Pole) | LDtk IntGrid |
| 2 | **Tile Editor** | 시각적 타일/머티리얼 배치 | LDtk AutoTile |
| 3 | **Effects Editor** | 절차적 이펙트 페인팅 (침식/식물/슬라임) | **신규 필요** |
| 4 | **Light Editor** | 빛/그림자 영역 페인팅 | PixiJS 라이팅 |
| 5 | **Prop Editor** | 수작업 장식물 배치 | LDtk Entity |
| 6 | **Camera Editor** | 카메라 뷰포트 배치 | 카메라 시스템 |
| 7 | **Render** | 최종 PNG 베이킹 출력 | **실시간 생성 (차이점)** |

**핵심 차이:** Rain World는 에디터 시점에 PNG로 **베이킹**한다 (렌더 시간 1-7분). ECHORIS 아이템계는 **절차적 생성이므로 실시간 생성이 필수.**

---

## 2. Rain World 이펙트 시스템 상세

### 2.1 이펙트 작동 원리

1. 이펙트 라이브러리에서 이펙트를 선택하여 방에 추가
2. **브러시로 영향 영역을 페인팅** (좌클릭=적용, 우클릭=제거, R/F=브러시 크기)
3. 이펙트는 **가변 강도의 그래디언트**로 적용 — "페이딩 밀도가 자연스럽게 보인다"
4. **적용 순서가 중요** — 이펙트는 순차적으로 합성
5. **Seed 값**이 모든 무작위 요소를 결정 — 같은 seed로 다시 렌더하면 동일 결과

### 2.2 이펙트 전체 목록

#### 필수 이펙트 (거의 모든 방에 사용)

| 이펙트 | 기능 | 특이점 |
|:-------|:-----|:-------|
| **BlackGoo** | 방 외곽 그림자 형성 | **역동작**: 전체 방에 기본 적용 → 우클릭으로 지우는 방식 |
| **Slime** | 모든 타일을 "끈적이고 흘러내리는" 모양으로 변형 | 표면 텍스처 변형 |

#### 환경 변형 이펙트

| 이펙트 | 기능 | 타일 관계 |
|:-------|:-----|:---------|
| **Erosion** | 지형 선택적 노후화 | solid 타일 가장자리 침식 |
| **Corrosion** | 금속/구조물 부식 | solid 타일 표면 변질 |
| **Rust** | 녹 | 금속 타일 표면 |
| **Rubble** | 잔해 파편 | **식물 코드를 재사용하여 구현** |

#### 식물/유기체 이펙트

| 이펙트 | 성장 방향 | 기능 |
|:-------|:---------|:-----|
| **Grass** | Grower (바닥→위) | 풀잎 생성 |
| **Seed Pods** | Grower | 씨앗 꼬투리 |
| **Cacti** | Grower | 선인장 |
| **Rain Moss** | Clinger (벽) | 비이끼 |
| **Horse Tails** | Grower | 쇠뜨기 |
| **Circuit Plants** | Grower | 회로 식물 |
| **Feather Plants** | Grower | 깃털 식물 |
| **Thick Roots** | Hanger (천장→아래) | 두꺼운 뿌리 |
| **Shadow Plants** | Hanger | 그림자 식물 |
| **Fungi** | Clinger | 균류 |
| **SlimeMold** | Clinger | 점액질 곰팡이 |

#### 구조물/기계 이펙트

| 이펙트 | 기능 |
|:-------|:-----|
| **Chains** | 배경 분할용 체인 |
| **Giant Signs** | 거대 표지판 |

#### 특수 이펙트

| 이펙트 | 기능 |
|:-------|:-----|
| **DaddyCorruption** | 크리처(Daddy Long Legs) 관련 벽 오염 |
| **Distortions** | 공간 왜곡 |

### 2.3 식물 이펙트의 3대 성장 패턴

모든 식물류 이펙트는 **동일한 코드 베이스**를 공유하며, **성장 방향만 다르다:**

| 패턴 | 방향 | 앵커 위치 | 대표 이펙트 |
|:-----|:-----|:---------|:-----------|
| **Grower** | 바닥 → 위로 자람 | solid 타일 상단 가장자리 | Grass, Cacti, Seed Pods, Horse Tails |
| **Hanger** | 천장 → 아래로 자람 | solid 타일 하단 가장자리 | Thick Roots, Shadow Plants, Hang Roots |
| **Clinger** | 벽 → 수평으로 자람 | solid 타일 좌/우 가장자리 | Rain Moss, Fungi, SlimeMold |

**핵심 인사이트:** Rubble(잔해) 같은 **비식물 이펙트도 동일한 Grower 코드를 재사용**한다. 성장 방향 + 스프라이트 + 파라미터만 변경하면 완전히 다른 시각적 결과를 만든다.

### 2.4 이펙트 컬러 시스템

이펙트는 팔레트의 **Color1**과 **Color2**를 참조한다. 팔레트를 변경하면 동일한 이펙트가 완전히 다른 색조로 렌더링된다.

---

## 3. Rain World 렌더링 파이프라인

### 3.1 3개 기하학 레이어 + 30개 서브레이어

| 레이어 | 역할 | 에디터 색상 |
|:-------|:-----|:-----------|
| **Layer 1** | 전경 (충돌 O) | 검은색 |
| **Layer 2** | 중경 (방 뒷벽) | 초록색 |
| **Layer 3** | 원경 (뒷벽 뒤, 하늘) | 빨간색 |

**30개 서브레이어:** 팔레트 이미지의 각 행에서 30개 열이 하나의 깊이 색상을 정의. 안개(Fog)가 먼 서브레이어일수록 강하게 적용되어 깊이감을 만든다.

### 3.2 팔레트 색상 인코딩

타일 스프라이트의 RGB 채널이 각각 다른 의미를 가진다:
- **Blue**: 빛 받은(lit) 색상
- **Green**: 기본(neutral) 색상
- **Red**: 그림자(shaded) 색상

**Grime 행:** 32픽셀 그래디언트 → 펄린 노이즈 마스크에 적용 → 전체적인 오염/노후 색조 부여

### 3.3 타일 복셀 구조

타일 하나 = **20x20x10 픽셀**의 반복셀(semi-voxel). `#repeatL` 속성으로 각 레이어의 반복 횟수를 정의한다. "box" 버전(6 텍스처, 빠른 렌더)과 "voxel" 버전(복잡한 3D 구조)이 존재한다.

### 3.4 실시간 셰이더 유니폼

| 유니폼 | 역할 |
|:-------|:-----|
| `_RAIN` | 전역 타이머 |
| `_Grime` | 오염도 % |
| `_WetTerrain` | 습기 % |
| `_windAngle` | 바람 각도 |
| `_NoiseTex` | 펄린 노이즈 텍스처 |
| `_PalTex` | 팔레트 텍스처 |

---

## 4. ECHORIS 적용 방안

### 4.1 핵심 차이: 베이킹 vs 실시간

| 항목 | Rain World | ECHORIS |
|:-----|:-----------|:--------|
| 생성 시점 | 에디터 시점 베이킹 (1-7분) | **실시간** (방 진입 시 <500ms) |
| 결과물 | PNG 이미지 | PixiJS DisplayObject 트리 |
| 변동성 | 동일 seed = 동일 결과 | 동일 seed = 동일 결과 (유지) |
| 레이어 | 30 서브레이어 | **3-5 패럴랙스 레이어** (성능 제약) |
| 팔레트 | 팔레트 이미지 30열 | **LUT 팔레트 스왑** (DEC-022) |

### 4.2 3-패턴 절차적 장식 시스템 (Grower/Hanger/Clinger)

Rain World의 3대 성장 패턴을 ECHORIS 실시간 시스템으로 변환:

#### 4.2.1 Grower (바닥에서 자라는 장식)

```
알고리즘:
1. 방 타일맵에서 "상단이 빈 solid 타일" 가장자리를 스캔
2. 각 가장자리 타일에 대해 seed + 위치로 스폰 확률 계산
3. 확률 통과 시 Grower 스프라이트 배치
   - 스프라이트 선택: seed % growerPool.length
   - 높이: baseHeight + noise(x, seed) * heightVariance
   - 기울기: noise(x+1, seed) * tiltRange
   - 색상: 팔레트 Color1/Color2 보간
```

**ECHORIS 적용:**
- 아이템계 T-NATURE: 풀, 덩굴, 포자
- 아이템계 T-FORGE: 불꽃 파티클, 용암 기포 (Grower 패턴을 비식물에 재사용)
- 월드: 층위별 바닥 식생

#### 4.2.2 Hanger (천장에서 내려오는 장식)

```
알고리즘:
1. "하단이 빈 solid 타일" 가장자리를 스캔
2. 각 가장자리 타일에서 seed 기반 스폰 확률 계산
3. Hanger 스프라이트 배치 (뒤집어서 아래로)
   - 길이: baseLength + noise(x, seed) * lengthVariance
   - 흔들림: sin(time + x * freq) * swayAmount (실시간 애니메이션)
```

**ECHORIS 적용:**
- 아이템계 T-TOMB: 거미줄, 매달린 뼈
- 아이템계 T-CRAFT: 체인, 톱니바퀴 배선
- 아이템계 T-ARCANE: 부유 룬 결정

#### 4.2.3 Clinger (벽에서 자라는 장식)

```
알고리즘:
1. "좌/우가 빈 solid 타일" 가장자리를 스캔
2. 벽면 방향 판정 (좌측 벽 vs 우측 벽)
3. Clinger 스프라이트 배치 (벽 반대 방향으로 뻗음)
   - 깊이: baseDepth + noise(y, seed) * depthVariance
```

**ECHORIS 적용:**
- 아이템계 T-NATURE: 이끼, 균류
- 아이템계 T-FORGE: 녹은 금속 흘러내림
- 월드: 층위 벽면 식생/침식

### 4.3 표면 변형 이펙트 시스템 (Erosion/Slime/Rust)

Rain World의 Erosion/Slime은 타일 표면 자체를 변형한다. PixiJS에서는 두 가지 접근이 가능:

#### 접근 A: 오버레이 스프라이트 방식 (Easy, 권장)

```
알고리즘:
1. 타일맵의 가장자리 타일을 스캔
2. 가장자리 방향(상/하/좌/우)에 따라 오버레이 스프라이트 선택
3. seed 기반으로 침식 강도(alpha) 결정
4. 오버레이 스프라이트를 타일 위에 배치 (blend mode: multiply 또는 normal)
```

- 구현 난이도: **Easy**
- 성능: 스프라이트 수만큼 DrawCall 증가 → BatchRenderer로 최적화 가능
- 시각 품질: 중간 (스프라이트 해상도에 의존)

#### 접근 B: 셰이더 방식 (Hard, 고품질)

```
PixiJS Filter:
- 입력: 타일맵 텍스처 + 노이즈 텍스처 + 침식 마스크
- 펄린 노이즈로 가장자리를 불규칙하게 깎음
- Grime 그래디언트로 색조 변형
- _Grime 유니폼으로 전체 오염도 제어
```

- 구현 난이도: **Hard**
- 성능: GPU 단일 패스 → 매우 효율적
- 시각 품질: 높음 (Rain World 원본에 근접)

### 4.4 테마별 이펙트 프리셋 (10개 테마)

Rain World의 이펙트를 ECHORIS의 10개 아이템계 테마에 매핑:

| 테마 | Grower | Hanger | Clinger | Surface | 고유 이펙트 |
|:-----|:-------|:-------|:--------|:--------|:-----------|
| T-FORGE | 불꽃 파티클 | 용암 방울 | 녹은 금속 흘러내림 | Rust | 단조 불꽃 (파티클) |
| T-WAR | 부서진 깃발 | 매달린 방패 | 화살 박힘 | Erosion | 혈흔 스플래터 |
| T-NATURE | 풀, 꽃, 포자 | 덩굴, 뿌리 | 이끼, 균류 | SlimeMold | 떨어지는 잎 (파티클) |
| T-ARCANE | 룬 결정(성장) | 부유 룬 | 마법 균열 | 마법 문양 | 에너지 파티클 |
| T-TOMB | 뼈 파편 | 거미줄, 매달린 뼈 | 지의류 | Erosion+Slime | 안개 (파티클) |
| T-VOYAGE | 산호 | 해초 (흔들림) | 따개비 | 소금 결정 | 물방울 (파티클) |
| T-HUNT | 풀, 가시덤불 | 매달린 함정 | 발톱 자국 | 흙 | 먼지 파티클 |
| T-FAITH | 촛불 | 현수막 | 성화 | 금박 | 빛 파티클 |
| T-CRAFT | 톱니바퀴 | 체인, 배선 | 나사/볼트 | 기름때 | 증기 (파티클) |
| T-SHADOW | 없음 (텅 빈 느낌) | 그림자 촉수 | 눈 (벽에서 관찰) | 어둠 침식 | 그림자 파티클 |

### 4.5 이펙트 밀도 맵 (Density Map)

Rain World의 핵심 메커닭 중 하나인 **영역 기반 밀도 페인팅**을 절차적으로 대체:

```
절차적 밀도 맵 생성:
1. 방의 4x4 그리드에서 각 셀의 "장식 밀도"를 seed로 결정
2. 밀도 값 0.0-1.0 (0=없음, 1=최대)
3. 펄린 노이즈로 밀도 그래디언트 생성 → 자연스러운 분포
4. 밀도가 높은 영역에 더 많은 Grower/Hanger/Clinger 스폰
5. 지층 깊이에 따라 기본 밀도 증가 (깊을수록 침식/식물 증가)
```

**레어리티 연동:**
```
effectDensity = baseDensity[theme]
              * stratumDepthMultiplier[stratum]  // 지층 깊이
              * rarityMultiplier[rarity]         // 레어리티
              + noise(x, y, seed) * variance     // 펄린 노이즈
```

---

## 5. 페인트 툴 제안 — 월드 에디터용

### 5.1 LDtk 확장 vs 커스텀 페인트 툴

| 옵션 | 장점 | 단점 |
|:-----|:-----|:-----|
| **LDtk IntGrid 활용** | 기존 파이프라인 유지 | 이펙트 밀도 그래디언트 불가 |
| **커스텀 페인트 툴 (웹)** | 밀도 브러시, 실시간 프리뷰 | 개발 공수, LDtk와 동기화 필요 |
| **하이브리드: LDtk + 이펙트 레이어 JSON** | LDtk 지오메트리 유지 + 별도 이펙트 데이터 | 중간 공수, 유연성 확보 |

### 5.2 하이브리드 방식 상세 (권장)

```
파이프라인:
1. LDtk에서 지오메트리 + AutoTile 작업 (기존 유지)
2. LDtk의 IntGrid에 "이펙트 힌트 레이어" 추가
   - 값 1: 식물 영역
   - 값 2: 침식 영역
   - 값 3: 기계 영역
   - 값 4: 유기체 영역
3. 게임 로드 시 IntGrid 값을 읽어 해당 영역에 절차적 장식 생성
4. seed + IntGrid 값 + 테마 프리셋 → 자동 장식 배치
```

**월드 전용 (핸드크래프트 맵):**
- LDtk IntGrid에 이펙트 힌트 레이어를 추가하여, 디자이너가 "여기에 식물", "여기에 침식"을 페인팅
- 게임이 힌트를 읽고 실시간으로 장식을 생성

**아이템계 전용 (절차적 생성 맵):**
- 이펙트 힌트도 절차적으로 생성
- 테마 프리셋 + 지층 깊이 + seed로 자동 밀도 맵 생성
- 디자이너 개입 없이 완전 자동

### 5.3 커스텀 페인트 툴 (Phase 3+ 선택)

Rain World의 Effects Editor를 웹 기반으로 재현:

```
기능:
- 브러시 크기 조절 (R/F 키)
- 이펙트 밀도 페인팅 (0.0-1.0 그래디언트)
- 실시간 PixiJS 프리뷰 (페인팅 즉시 장식 생성)
- LDtk 맵 불러오기/저장
- 이펙트 레이어 JSON 내보내기

구현:
- HTML5 Canvas + PixiJS 프리뷰 패널
- 이펙트 라이브러리 UI (좌측 패널)
- 브러시 → Float32Array 밀도 맵에 기록
- 밀도 맵 → JSON 직렬화 → 게임 로드 시 역직렬화
```

---

## 6. PixiJS 실시간 구현 가이드

### 6.1 성능 예산

| 항목 | 예산 | 근거 |
|:-----|:-----|:-----|
| 방 진입 시 장식 생성 | **<200ms** | 프레임 드롭 없는 전환 |
| 방당 최대 장식 스프라이트 | **200개** | BatchRenderer 최적화 범위 |
| 패럴랙스 레이어 | **3개** (전경/중경/원경) | PixiJS 컨테이너 3개 |
| 텍스처 아틀라스 | **1장** (2048x2048) | 모든 장식 스프라이트 통합 |

### 6.2 구현 구조

```typescript
// 절차적 장식 생성기 (개념 코드)
class ProceduralDecorator {
  // 방 진입 시 호출
  generate(tilemap: Tilemap, theme: ThemeID, seed: number, stratum: number): Container {
    const container = new Container();
    const rng = new SeededRNG(seed);
    const densityMap = this.generateDensityMap(tilemap, rng, stratum);

    // 1. 가장자리 스캔
    const edges = this.scanEdges(tilemap);

    // 2. Grower (바닥 가장자리)
    for (const edge of edges.top) {
      if (rng.next() < densityMap.get(edge.x, edge.y)) {
        const sprite = this.spawnGrowerSprite(theme, rng);
        sprite.position.set(edge.x * TILE_SIZE, edge.y * TILE_SIZE);
        container.addChild(sprite);
      }
    }

    // 3. Hanger (천장 가장자리)
    for (const edge of edges.bottom) {
      if (rng.next() < densityMap.get(edge.x, edge.y)) {
        const sprite = this.spawnHangerSprite(theme, rng);
        sprite.position.set(edge.x * TILE_SIZE, (edge.y + 1) * TILE_SIZE);
        container.addChild(sprite);
      }
    }

    // 4. Clinger (벽 가장자리)
    for (const edge of edges.left.concat(edges.right)) {
      if (rng.next() < densityMap.get(edge.x, edge.y) * 0.5) {
        const sprite = this.spawnClingerSprite(theme, rng, edge.side);
        sprite.position.set(edge.x * TILE_SIZE, edge.y * TILE_SIZE);
        container.addChild(sprite);
      }
    }

    // 5. Surface 변형 (오버레이)
    this.applySurfaceOverlays(container, tilemap, theme, rng, stratum);

    return container;
  }
}
```

### 6.3 가장자리 스캔 알고리즘

```
scanEdges(tilemap):
  for each (x, y) in tilemap:
    if tilemap[x][y] == SOLID:
      if tilemap[x][y-1] == EMPTY:  // 상단 가장자리 → Grower 후보
        edges.top.push({x, y, normal: UP})
      if tilemap[x][y+1] == EMPTY:  // 하단 가장자리 → Hanger 후보
        edges.bottom.push({x, y, normal: DOWN})
      if tilemap[x-1][y] == EMPTY:  // 좌측 가장자리 → Clinger 후보 (좌벽)
        edges.left.push({x, y, side: LEFT})
      if tilemap[x+1][y] == EMPTY:  // 우측 가장자리 → Clinger 후보 (우벽)
        edges.right.push({x, y, side: RIGHT})
```

### 6.4 실시간 흔들림 애니메이션

Rain World의 식물은 바람에 흔들린다. PixiJS에서 저비용 구현:

```typescript
// 매 프레임 update
for (const deco of activeDecorations) {
  if (deco.type === 'grower' || deco.type === 'hanger') {
    // sin 파동으로 기울기 애니메이션
    deco.sprite.rotation =
      Math.sin(time * deco.swaySpeed + deco.phaseOffset) * deco.swayAmount;
  }
}
```

- `swaySpeed`: 0.5-2.0 (느린 풀 ~ 빠른 덩굴)
- `swayAmount`: 0.02-0.1 rad (미세한 흔들림)
- `phaseOffset`: seed 기반 (동기화 방지)

---

## 7. Phase별 구현 로드맵

| Phase | 구현 항목 | 난이도 |
|:------|:---------|:-------|
| **Phase 2** | 가장자리 스캔 + Grower/Hanger/Clinger 3패턴 기본 구현 | Medium |
| **Phase 2** | 테마별 스프라이트 프리셋 3종 (T-FORGE/T-NATURE/T-TOMB) | Easy |
| **Phase 2** | seed 기반 밀도 맵 절차 생성 | Medium |
| **Phase 2** | LDtk IntGrid 이펙트 힌트 레이어 (월드 전용) | Easy |
| Phase 3 | Surface 변형 오버레이 (Erosion/Slime/Rust) | Medium |
| Phase 3 | 실시간 흔들림 애니메이션 | Easy |
| Phase 3 | 나머지 7개 테마 프리셋 | Easy (에셋 작업) |
| Phase 3 | 셰이더 기반 Grime/습기 효과 | Hard |
| Phase 4 | 커스텀 페인트 툴 (월드 에디터) | Hard |

---

## 8. 교훈 요약

1. **3-패턴 재사용이 핵심이다.** Rain World의 Grower/Hanger/Clinger 세 패턴은 거의 동일한 코드로 동작하며, 비식물 이펙트(Rubble)까지 동일 코드를 재사용한다. ECHORIS도 3패턴 코드 하나로 10개 테마 전체를 커버할 수 있다.

2. **밀도 맵 + seed = 베이킹 없는 절차적 장식.** Rain World는 디자이너가 브러시로 밀도를 칠하지만, ECHORIS 아이템계는 seed + 펄린 노이즈로 밀도 맵 자체를 절차적으로 생성하면 디자이너 개입 없이 완전 자동화된다.

3. **팔레트 연동이 테마 정체성을 만든다.** Rain World의 Color1/Color2 시스템처럼, ECHORIS의 LUT 팔레트 스왑(DEC-022)과 장식 색상을 연동하면 동일한 풀 스프라이트가 테마에 따라 초록(T-NATURE) / 주황(T-FORGE) / 보라(T-ARCANE)로 변한다.

4. **BlackGoo 역발상: 기본=가득 참, 디자이너=지우기.** Rain World의 BlackGoo는 전체 방에 기본 적용되어 있고, 디자이너가 지우는 방식이다. ECHORIS에서도 "기본 침식 100% → 깨끗한 영역을 지정"하는 방식을 적용하면 자연스러운 노후감이 기본이 된다.

5. **200ms 예산 안에서 200개 장식은 현실적이다.** 가장자리 스캔 + seed 기반 스폰은 O(타일맵 크기) 복잡도. 4x4 방(64x64 타일 가정)에서 최대 256개 가장자리 검사 + 200개 스프라이트 생성은 PixiJS BatchRenderer로 1프레임 내 처리 가능하다.

---

## Sources

### Rain World 공식/개발자
- [Rain World Devlog Archive (TIGSource)](https://candlesign.github.io/Rain-World-Devlog/Pages/001)
- [Road to the IGF: Rain World (Game Developer)](https://www.gamedeveloper.com/business/road-to-the-igf-videocult-s-i-rain-world-i-)
- [Unity Blog: Procedural Design in Rain World: The Watcher](https://unity.com/blog/exploring-procedural-design-rain-world)
- [Rain World Animation Process (YouTube)](https://www.youtube.com/watch?v=-iXwvoFhPuU)

### 모딩/기술 문서
- [Effects Editor (Fandom Wiki)](https://rain-world-modding.fandom.com/wiki/Effects_Editor)
- [Tile Editor (Fandom Wiki)](https://rain-world-modding.fandom.com/wiki/Tile_Editor)
- [Creating Custom Effects (Miraheze)](https://rainworldmodding.miraheze.org/wiki/Creating_Custom_Effects)
- [Rain World Shader Documentation (GitHub Gist)](https://gist.github.com/EtiTheSpirit/655d8e81732ba516ca768dbd7410ddf4)
- [Custom Palettes, Tiles and Props (GitHub)](https://github.com/Rain-World-Modding/Rain-World-Modding.github.io)
- [Drizzle Renderer (GitHub)](https://github.com/PJB3005/Drizzle)
- [Rained Level Editor (GitHub)](https://github.com/pkhead/rained)
- [RWEditor JS (GitHub)](https://github.com/mevvern/RWEditor)
- [Region From The Ground Up (Miraheze)](https://rainworldmodding.miraheze.org/wiki/Region_From_The_Ground_Up)

### ECHORIS 내부 참조
- `Documents/Research/DeadCells_GrayscalePalette_Research.md` — 팔레트 스왑 파이프라인
- `Documents/Research/ItemWorldVisual_MemoryTheme_Research.md` — 10개 테마 비주얼
- `Documents/System/System_ItemWorld_FloorGen.md` — 아이템계 지층 생성
- `Documents/Research/RoomComposition_ThemeLayerCount_Research.md` — 방 시각 레이어 구성
