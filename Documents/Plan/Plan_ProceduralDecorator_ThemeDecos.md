# ProceduralDecorator 테마 전용 장식 59종 + 공용 확장 구현 계획

> **작성일:** 2026-04-23
> **상태:** 구현 대기
> **대상 파일:** `game/src/level/ProceduralDecorator.ts`

---

## 1. 현재 상태

### 구현 완료 (공용 11종)

| ID | 이름 | 메서드 | 비고 |
|:---|:---|:---|:---|
| base_grower | Grass Blade | `drawGrower()` | 삼각형 2-4개 |
| base_grower_flower | Stem Flower | `drawGrower()` 내 10% | 줄기+원형 |
| base_hanger | Root Strand | `drawHanger()` | 꺾인 선 1-3개 |
| base_hanger_drip | Water Drop | `drawHanger()` 내 5% | 원형 |
| base_clinger | Moss Patch | `drawClinger()` | 원형 2-5개 |
| base_clinger_vine | Vine Leaf | `drawClinger()` 내 8% | 선+잎 1개 |
| base_steel_beam | Steel I-Beam | `drawSteelBeam()` | I빔 2-4타일 |
| base_concrete | Concrete Chunk | `drawConcreteChunk()` | 불규칙 다각형 |
| base_rebar | Exposed Rebar | `drawRebar()` | 꺾인 철근 |
| base_pipe | Pipe Segment | `drawPipeSegment()` | 둥근 파이프 |
| base_girder | Girder Outline | `drawGirderOutline()` | L자 거더 |

### 미구현 (테마 전용 59종 + 공용 2종)

- 쇠사슬(Chain), 분기 덩굴(Branching Vine), 두꺼운 뿌리(Thick Root)
- 테마별 5-6종 x 11 테마 = 59종

---

## 2. 구현 구조

### 2.1 아키텍처 변경

```typescript
// generate() 내부 — 기존 공용 장식 후 테마 전용 추가

// Detail 단계
this.drawGrower(growerGfx, edge, rng);        // 기존 공용
this.drawThemeDetail(growerGfx, edge, rng);    // 신규: 테마 전용 detail

// Structure 단계
this.drawStructure(structGfx, edge, rng, grid); // 기존 공용
this.drawThemeStructure(structGfx, edge, rng);   // 신규: 테마 전용 structure
```

### 2.2 테마 분기 로직

```typescript
private drawThemeDetail(gfx: Graphics, edge: EdgeTile, rng: PRNG): void {
  const theme = this.preset?.themeId ?? '';
  switch (theme) {
    case 'T-HABITAT':   this.drawHabitatDetail(gfx, edge, rng); break;
    case 'T-SECURITY':  this.drawSecurityDetail(gfx, edge, rng); break;
    case 'T-FOUNDRY':   this.drawFoundryDetail(gfx, edge, rng); break;
    // ... 11종
  }
}
```

---

## 3. 전체 장식 목록 (70종)

### 공용 추가 (2종 신규)

| ID | 이름 | 형태 | 구현 |
|:---|:---|:---|:---|
| **base_chain** | Chain Segment | 현수선(catenary) 두 앵커 사이 체인. `cosh()` 공식 | **신규** |
| **base_branching_vine** | Branching Vine | 벽에서 2-3단계 분기하는 긴 덩굴 | **신규** |

### T-HABITAT 거주 모듈 (5종)

| ID | 패턴 | 레이어 | 형태 (Graphics API) |
|:---|:---|:---|:---|
| hab_vent_grille | floor | structure | `rect` 격자: 수평 사각형 + 내부 세로선 3-4개 |
| hab_shelf_bracket | wall | structure | `moveTo/lineTo` L자형: 수평선+수직선 |
| hab_light_frame | ceiling | structure | `rect` 사각 프레임 + `lineTo` 늘어진 선 1-2개 |
| hab_cloth_strip | hanger | detail | `bezierCurveTo` 물결 곡선 (얇은 선, 흔들림 대상) |
| hab_dust_mote | grower | detail | `circle` 반투명(alpha 0.3) 원 클러스터 3-5개 |

### T-SECURITY 보안 구역 (5종)

| ID | 패턴 | 레이어 | 형태 |
|:---|:---|:---|:---|
| sec_camera_mount | wall | structure | `rect` 사각 브래킷 + `circle` 렌즈 원 |
| sec_warning_stripe | floor | detail | `rect` 대각선 줄무늬 3-4개 (노란+검정 교대) |
| sec_sensor_line | wall | detail | `moveTo/lineTo` 수평 얇은 선 (발광 alpha 0.6) |
| sec_gate_frame | wall | structure | `rect` 두꺼운 사각 프레임 (문 크기) |
| sec_lock_panel | wall | structure | `rect` 소형 사각 + `circle` 상태 표시 원 |

### T-FOUNDRY 제조 플랜트 (6종)

| ID | 패턴 | 레이어 | 형태 |
|:---|:---|:---|:---|
| fnd_crucible | floor | structure | `arc` 반원 용기 + `rect` 받침대 |
| fnd_mold_frame | wall | structure | `rect` 빈 사각형 (내부 투명) |
| fnd_conveyor_rail | floor | structure | `moveTo/lineTo` 수평 두꺼운 선 + 수직 침목 |
| fnd_ember_drip | hanger | detail | `circle` 발광 원 (alpha 0.7, 주황) |
| fnd_soot_patch | clinger | detail | `circle` 어두운 원 뭉치 (alpha 0.5) |
| fnd_slag_heap | grower | detail | `poly` 불규칙 다각형 (낮고 넓은 더미) |

### T-BIOZONE 생태 구역 (6종)

| ID | 패턴 | 레이어 | 형태 |
|:---|:---|:---|:---|
| bio_culture_tank | wall | structure | `rect` 세로 사각 + `circle` 상단 원형 뚜껑 |
| bio_root_thick | hanger | detail | `bezierCurveTo` 굵은(width 3-5) 곡선 뿌리 |
| bio_spore_cloud | grower | detail | `circle` 반투명(alpha 0.2) 원 7-12개 클러스터 |
| bio_overgrowth | clinger | detail | `moveTo/lineTo` 2-3단계 분기 + 끝마다 `circle` 잎 |
| bio_irrigation | ceiling | structure | `roundRect` 얇은 원형 관 + `rect` 조인트 |
| bio_seed_pod | grower | detail | `lineTo` 줄기 + `circle` 큰 원(r=3-4) |

### T-ARCHIVE 데이터 센터 (5종)

| ID | 패턴 | 레이어 | 형태 |
|:---|:---|:---|:---|
| arc_server_rack | wall | structure | `rect` 세로 큰 사각 + 내부 수평선 4-6개 |
| arc_cable_tray | ceiling | structure | `rect` 긴 수평 사각 + `lineTo` 늘어진 케이블 2-3개 |
| arc_terminal_shard | floor | structure | `poly` 각진 다각형 (깨진 모니터 파편) |
| arc_data_strand | hanger | detail | `lineTo` 얇은 발광선(alpha 0.5) 1-2개 |
| arc_screen_flicker | wall | detail | `rect` 소형 발광 사각(alpha 맥동: 0.3-0.7) |

### T-LOGISTICS 물류 네트워크 (5종)

| ID | 패턴 | 레이어 | 형태 |
|:---|:---|:---|:---|
| log_container | floor | structure | `rect` 큰 사각형 (컨테이너 파편) |
| log_rail_segment | floor | structure | `moveTo/lineTo` 수평 선 + 수직 침목 `rect` |
| log_crane_arm | ceiling | structure | `moveTo/lineTo` 두꺼운 각진 선 (꺾인 크레인 암) |
| log_label_scrap | clinger | detail | `rect` 소형 사각(2x3) 여러 개 |
| log_pallet_slat | grower | detail | `rect` 얇은 세로 사각 2-3개 (판자) |

### T-COMMAND 지휘 센터 (5종)

| ID | 패턴 | 레이어 | 형태 |
|:---|:---|:---|:---|
| cmd_console_panel | wall | structure | `rect` 사각 패널 + `circle` 원형 다이얼 열 |
| cmd_antenna_shard | ceiling | structure | `lineTo` 긴 얇은 선 (대각) |
| cmd_display_frame | wall | structure | `rect` 큰 빈 사각형 (화면 프레임) |
| cmd_indicator_dot | wall | detail | `circle` 작은 발광 원(r=1.5, alpha 0.6-0.9) |
| cmd_holo_line | hanger | detail | `lineTo` 희미한 수평선(alpha 0.25) |

### T-MALFUNCTION 시스템 오류 (5종)

| ID | 패턴 | 레이어 | 형태 |
|:---|:---|:---|:---|
| mal_twisted_panel | wall | structure | `poly` 변형 사각형 (꼭짓점 랜덤 오프셋) |
| mal_overload_cap | floor | structure | `rect` 사각 + `circle` 방사 원 (발광) |
| mal_broken_circuit | clinger | detail | `moveTo/lineTo` 지그재그 선 3-5 세그먼트 |
| mal_spark_node | any | detail | `circle` 맥동 발광 원(alpha sin파) + 방사선 4개 |
| mal_error_glyph | wall | detail | `rect` 사각 + `lineTo` X자 대각선 |

### T-BREACH 구조 붕괴 (5종)

| ID | 패턴 | 레이어 | 형태 |
|:---|:---|:---|:---|
| bre_shattered_wall | wall | structure | `poly` 큰 불규칙 다각형 (6-8 꼭짓점) |
| bre_hanging_slab | ceiling | structure | `rect` 사각 + `lineTo` 매달린 줄 |
| bre_rubble_pile | grower | structure | `poly` 작은 다각형 5-8개 뭉치 |
| bre_crack_line | any | detail | `moveTo/lineTo` 분기하는 균열선 (2-3 갈래) |
| bre_dust_fall | hanger | detail | `lineTo` 얇은 수직선 여러 개 (alpha 0.3) |

### T-COOLANT 냉각 인프라 (6종)

| ID | 패턴 | 레이어 | 형태 |
|:---|:---|:---|:---|
| cool_coil_segment | wall | structure | `arc` 연속 반원 2-3개 (나선 코일) |
| cool_valve_cluster | wall | structure | `circle` 원 + `moveTo/lineTo` 십자 핸들 |
| cool_condensation | clinger | detail | `circle` 작은 원(r=0.5-1.5) 8-12개 |
| cool_frost_patch | grower | detail | `poly` 반투명(alpha 0.25) 불규칙 형태 |
| cool_drip_line | hanger | detail | `lineTo` 얇은 선 + 끝 `circle` 물방울 |
| cool_tank_fragment | floor | structure | `arc` 곡면 사각 (탱크 파편) |

### T-ECHO 잔류 데이터 (6종)

| ID | 패턴 | 레이어 | 형태 |
|:---|:---|:---|:---|
| echo_resonance_crystal | grower | structure | `poly` 육각형 (정육각형 또는 약간 변형) |
| echo_float_shard | hanger | detail | `poly` 발광 삼각/사각형 (alpha 0.5) |
| echo_memory_node | wall | structure | `circle` 큰 발광 원(r=6-10) + 방사선 |
| echo_data_dust | any | detail | `circle` 반투명(alpha 0.15) 작은 원 10-20개 |
| echo_void_tendril | hanger | detail | `bezierCurveTo` 긴 곡선 (길이 20-40px) |
| echo_glitch_stripe | wall | detail | `rect` 수평 발광 얇은 사각 (alpha 랜덤 0.2-0.8) |

---

## 4. 구현 순서

### Step 1: 공용 확장 (chain + branching vine)
- `drawChain()`: 두 앵커 사이 현수선 (`y = a * cosh((x-h)/a) + k`)
- `drawBranchingVine()`: 재귀적 분기 (`depth 0-3`, 각도 +-30도)

### Step 2: 테마 분기 프레임워크
- `drawThemeDetail(gfx, edge, rng)`: 테마별 detail 장식 분기
- `drawThemeStructure(gfx, edge, rng)`: 테마별 structure 장식 분기
- `generate()` 내에서 공용 장식 후 테마 장식 추가 호출

### Step 3: 11개 테마 구현 (각 5-6 draw 메서드)
- T-HABITAT → T-ECHO 순서
- 각 테마: `drawXxxDetail()` + `drawXxxStructure()` 2개 메서드
- 내부에서 확률 분기로 5-6종 장식 선택

### Step 4: generate() 통합
- detail 루프: 공용 drawGrower/Hanger/Clinger 후 drawThemeDetail 호출
- structure 루프: 공용 drawStructure 후 drawThemeStructure 호출
- 테마 장식은 별도 확률(10-20%)로 추가 생성

---

## 5. 성능 예산

| 항목 | 현재 | 변경 후 |
|:---|:---|:---|
| detail 종류 | 6종 | 6 + 테마 2-4종 = 8-10종 |
| structure 종류 | 5종 | 5 + 테마 2-3종 = 7-8종 |
| 방당 장식 수 | ~400 detail + ~60 struct | ~500 detail + ~80 struct |
| Graphics 객체 수 | 4개 (grower/hanger/clinger/struct) | 6개 (+themeDetail/+themeStruct) |
| 생성 시간 | <120ms | <150ms (추정) |

---

## 6. 테마별 스폰 확률

각 edge에서 테마 장식이 추가로 스폰될 확률:

| 테마 | Detail 추가 확률 | Structure 추가 확률 |
|:---|:---|:---|
| T-HABITAT | 15% | 10% |
| T-SECURITY | 10% | 15% |
| T-FOUNDRY | 15% | 20% |
| T-BIOZONE | 25% | 8% |
| T-ARCHIVE | 10% | 12% |
| T-LOGISTICS | 12% | 20% |
| T-COMMAND | 8% | 15% |
| T-MALFUNCTION | 20% | 12% |
| T-BREACH | 15% | 25% |
| T-COOLANT | 15% | 10% |
| T-ECHO | 12% | 8% |
