# ProceduralDecorator 구조적 개편 계획

> **작성일:** 2026-04-23
> **근거:** Rain World 전수 조사 (3개 리서치 문서 + 웹 기술 문서)

---

## 1. Rain World의 7가지 배치 패턴

Rain World는 장식을 **7가지 배치 영역(Zone)**에 배치한다. ECHORIS는 현재 3가지만 구현.

| # | 배치 영역 | Rain World 예시 | ECHORIS 상태 | 우선순위 |
|:--|:---------|:---------------|:------------|:---------|
| 1 | **Edge (가장자리)** | 풀, 뿌리, 이끼, 파이프 브래킷 | **구현됨** | - |
| 2 | **Spanning (공간 횡단)** | 천장→바닥 덩굴, 벽→벽 체인 | **구현됨** | - |
| 3 | **Surface Overlay (표면 변형)** | Erosion, Slime, Rust, Grime | **미구현** | P1 |
| 4 | **Void Fill (빈 공간 채움)** | 부유 먼지, 포자, 파편 | **미구현** | P1 |
| 5 | **Embedded (벽 내부 관통)** | 벽 관통 파이프, 매립 기어 | **미구현** | P2 |
| 6 | **Transition (재질 경계)** | 재질 경계에 녹/이끼 집중 | **미구현** | P2 |
| 7 | **Background Depth (원경 실루엣)** | 안개 속 거대 구조물 | **부분 구현** (패럴랙스) | P3 |

---

## 2. Rain World의 5가지 크기 카테고리

| 카테고리 | 픽셀 범위 | 예시 | ECHORIS 상태 |
|:---------|:---------|:-----|:------------|
| **Micro** | 1-4px | 녹 점, 이끼 점, 먼지 입자 | **부분 구현** (이끼 원형만) |
| **Small** | 4-16px | 풀잎, 가는 뿌리, 물방울 | **구현됨** |
| **Medium** | 16-48px | 굵은 뿌리, 파이프, 선반 | **구현됨** |
| **Large** | 48-128px | 덩굴 가지, 케이블 다발, 격벽 | **구현됨** |
| **Massive** | 128px+ | 방 전체 체인, 천장→바닥 덩굴 | **구현됨** (Spanning) |

---

## 3. generate() 구조 개편: 7-Pass 파이프라인

현재 3 패스(detail → structure → spanning)를 **7 패스**로 확장:

```typescript
generate(grid, seed, offsetX, offsetY) {
  const edges = this.scanEdges(grid);
  const voids = this.scanVoids(grid);        // 신규

  // Pass 1: Surface Overlay (Erosion/Grime)  — 타일 표면 위
  this.passSurfaceOverlay(surfaceGfx, edges, rng, grid);

  // Pass 2: Edge Detail                      — 가장자리 소형 장식
  this.passEdgeDetail(detailGfx, edges, rng);

  // Pass 3: Edge Structure                   — 가장자리 대형 구조물
  this.passEdgeStructure(structGfx, edges, rng, grid);

  // Pass 4: Embedded                         — 벽 내부 관통 요소
  this.passEmbedded(structGfx, grid, rng);

  // Pass 5: Spanning                         — 공간 횡단 요소
  this.passSpanning(spanGfx, grid, rng);

  // Pass 6: Void Fill                        — 빈 공간 부유 요소
  this.passVoidFill(voidGfx, voids, rng);

  // Pass 7: Micro (Dust/Particle hints)      — 극소형 점/입자
  this.passMicro(microGfx, edges, voids, rng);
}
```

---

## 4. 신규 스캐너: scanVoids()

빈 공간(4x4 타일 이상 연속 empty)을 감지하여 사각형 영역 목록 반환.

```typescript
interface VoidRegion {
  x: number;    // 시작 열 (타일)
  y: number;    // 시작 행 (타일)
  w: number;    // 폭 (타일)
  h: number;    // 높이 (타일)
}

scanVoids(grid: number[][]): VoidRegion[]
```

**알고리즘:**
1. 방문 마스크 초기화
2. 모든 empty 타일에서 flood-fill로 연속 empty 영역 탐색
3. 영역의 bounding box 계산
4. 최소 크기(4x4) 이상만 반환

---

## 5. Pass별 상세 구현

### Pass 1: Surface Overlay (표면 변형)

타일 가장자리에 불규칙한 침식/부식 텍스처를 오버레이.

```
알고리즘:
1. 모든 edge에 대해:
2. edge 방향에 수직으로 1-3px 오프셋된 불규칙 선 생성
3. 테마에 따라:
   - T-FOUNDRY: Rust 오버레이 (주황 점/선)
   - T-COOLANT: 결로 물줄기 (수직 선)
   - T-BREACH: 균열 (분기선)
   - T-MALFUNCTION: 글리치 노이즈 (수평 줄무늬)
4. alpha 0.3-0.5로 반투명 적용
```

**Graphics API:** `moveTo/lineTo` 불규칙 선 + `fill({ alpha: 0.3 })`

### Pass 4: Embedded (벽 내부 관통)

solid 타일 내부에 관통하는 파이프/기어/매립물.

```
알고리즘:
1. 2x2 이상 연속 solid 영역 탐색
2. solid 영역 내부의 랜덤 위치에 관통 요소 배치
3. 테마에 따라:
   - T-HABITAT: 벽 속 파이프 (수평선 관통)
   - T-FOUNDRY: 매립 기어 (원형 아웃라인)
   - T-ARCHIVE: 케이블 관통 (다발 선)
   - T-SECURITY: 감시 레일 관통
```

### Pass 6: Void Fill (빈 공간 부유)

VoidRegion 내부에 랜덤 좌표로 부유 요소 배치.

```
알고리즘:
1. 각 VoidRegion에 대해:
2. 면적에 비례하여 부유 요소 수 결정 (면적 * voidDensity)
3. seed 기반 랜덤 좌표로 요소 배치
4. 테마에 따라:
   - T-BIOZONE: 부유 포자 구름 (반투명 원 클러스터)
   - T-ECHO: 데이터 먼지 (미세 발광 점)
   - T-BREACH: 부유 파편 (작은 다각형)
   - T-COOLANT: 수증기 (반투명 큰 원)
   - 기본: 먼지 입자 (극소형 점)
```

### Pass 7: Micro (극소형 점/입자)

Edge와 Void 모두에 극소형(1-4px) 장식 추가.

```
알고리즘:
1. 모든 edge에서 표면 따라 micro 점 산포
2. Void 영역에서 극소형 부유 입자
3. 밀도: 0.4 (높음, 시각적 노이즈 역할)
4. 크기: 0.5-2px 원형
5. alpha: 0.2-0.5 (배경 텍스처 느낌)
```

---

## 6. 테마별 7-Pass 매핑

| 테마 | Surface | Edge Detail | Edge Struct | Embedded | Spanning | Void | Micro |
|:-----|:--------|:-----------|:-----------|:---------|:---------|:-----|:------|
| **HABITAT** | 물 얼룩 | 천조각, 먼지 | 캐비닛, 조명 | 벽 속 파이프 | 케이블 다발 | 먼지 입자 | 녹 점 |
| **SECURITY** | 스크래치 | 센서선, 줄무늬 | 카메라, 격벽 | 감시 레일 | 레이저 그리드 | 없음 (깨끗) | 없음 |
| **FOUNDRY** | 녹+그을음 | 용융방울, 슬래그 | 도가니, 레일 | 매립 기어 | 체인+후크 | 불씨 입자 | 녹 점 |
| **BIOZONE** | 이끼 막 | 풀, 포자, 씨앗 | 수조, 관수 | 벽 속 뿌리 | 덩굴(천→바) | 포자 구름 | 포자 점 |
| **ARCHIVE** | 정전기 얼룩 | 데이터선, 화면 | 서버랙, 케이블 | 케이블 관통 | 데이터 스트림 | 글리치 점 | 데이터 점 |
| **LOGISTICS** | 기름 얼룩 | 라벨, 판자 | 화물, 레일 | 컨베이어 관통 | 크레인 레일 | 없음 | 먼지 |
| **COMMAND** | 스크래치 | 표시등, 홀로 | 계기판, 안테나 | 통신선 관통 | 안테나+신호 | 없음 | 없음 |
| **MALFUNCTION** | 글리치 줄무늬 | 스파크, 회로 | 뒤틀린 패널 | 깨진 배선 | 지그재그 글리치 | 스파크 입자 | 노이즈 점 |
| **BREACH** | 균열+먼지 | 분진, 균열선 | 격벽, 슬래브 | 노출 철근 | 균열(천→바) | 부유 파편 | 먼지 |
| **COOLANT** | 결로 줄기 | 물방울, 서리 | 코일, 밸브 | 냉각관 관통 | 파이프+결로 | 수증기 | 물방울 점 |
| **ECHO** | 공명 문양 | 글리치, 촉수 | 결정, 결절 | 없음 | 공명 촉수 | 데이터 먼지 | 발광 점 |

---

## 7. 구현 순서

### Phase 1 (즉시): Pass 6 Void Fill + Pass 7 Micro
- **영향:** 빈 공간이 채워져 밀도감 대폭 상승
- **난이도:** Easy (scanVoids + 랜덤 좌표 + circle/rect)
- **시간:** 4시간

### Phase 2 (이번 주): Pass 1 Surface Overlay
- **영향:** 타일 표면이 부식/침식되어 노후감
- **난이도:** Medium (edge 방향별 불규칙 선 생성)
- **시간:** 6시간

### Phase 3 (다음 주): Pass 4 Embedded
- **영향:** 벽이 단순 사각이 아닌 구조물이 관통하는 느낌
- **난이도:** Medium (solid 영역 내부 좌표 계산)
- **시간:** 6시간

### Phase 4 (추후): Pass 개선 + 애니메이션
- Surface Overlay 셰이더 버전 (Grime 노이즈)
- 흔들림 애니메이션 (sin 파동)
- 물방울 낙하 애니메이션

---

## 8. 성능 예산 (7-Pass)

| Pass | 현재 비용 | 추가 비용 | 합계 |
|:-----|:---------|:---------|:-----|
| Edge Detail | ~60ms | - | 60ms |
| Edge Structure | ~40ms | - | 40ms |
| Spanning | ~20ms | - | 20ms |
| Surface Overlay | - | ~15ms | 15ms |
| Embedded | - | ~10ms | 10ms |
| Void Fill | - | ~10ms | 10ms |
| Micro | - | ~5ms | 5ms |
| **합계** | ~120ms | ~40ms | **~160ms** |

200ms 예산 이내.
