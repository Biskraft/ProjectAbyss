# 화학 반응 매트릭스 신규 설계 — 빠진 셀 채우기

> **문서 상태:** 설계 초안 (Systems Designer 산출)
> **작성일:** 2026-05-13
> **SSoT 상위:** `Documents/System/System_World_TileSystem.md` §3 (승인 후 병합 대상)
> **코드 대상:** `game/src/systems/TileMutator.ts`, `game/src/systems/TileHazards.ts`, `game/src/effects/FluidResidue.ts`, `game/src/entities/ThrowableContainer.ts`

---

## 설계 전제 — 코드 현실 확인

현재 `tickPassiveInteractions` 에 존재하는 4개 반응:

| 반응 | 확률/주기 | 출력 |
|:---|:---:|:---|
| magma + ice → water | 4%/1s | `maybeMutateNeighbourWithSteam` |
| ice + water → frozen | 4%/1s | `maybeFreezeNeighbour` |
| acid + metal → AIR | 6%/1s | `maybeMutateNeighbour` |
| acid + magma → AIR + steam | 15%/1s | 직접 `row[gx] = TILE_AIR` |

신규 반응은 전부 이 함수 안에 `if/else if` 블록 추가 방식으로 삽입 가능하다. 새 헬퍼 메서드 패턴은 `maybeMutateNeighbour` / `maybeMutateNeighbourWithSteam` 를 그대로 재사용하거나 확장한다.

**추가 구현 위치 기준:**
- `cell × cell passive`: `TileMutator.tickPassiveInteractions` 내부
- `cell × entity hazard`: `TileHazards.applyTileHazards` 내부 또는 새 helper
- `attack × cell`: `TileHazards.applyFireAttack / applyIceAttack / applyThunderAttack` 내부
- `container × cell 환경`: `ThrowableContainer.tickEnvironment` 내부

---

## 신규 반응 카탈로그 — 15개

---

### R-NEW-001 — 증기 희석 / Steam Dilution

**1. 반응 ID:** R-NEW-001
**2. 이름:** 증기 희석 / Steam Dilution
**3. 분류:** cell × cell passive
**4. 입력:** water (2) + acid (13) 인접
**5. 출력:** acid 셀 → water (산 희석, 영구 변환) + 거품 VFX
**6. 트리거:** 3%/1s tick (인접 water 셀 1개당 한 번 시도)
**7. 1차 niche 정렬 점수:** 4 / 5
> Noita의 "산성 물이 물에 희석된다" 동작과 직접 대응. BLAME!의 거대 시설 내 화학 냉각수 라인이 산성 오염 구역을 점진적으로 중화한다는 세계관 정당화.
**8. 5색 기질 정체성:** Rust (산성 라보) — acid 가 자연 중화되는 것을 막으려면 water 차단이 필요. Rust 룸 디자인의 핵심 변수.
**9. 시각 효과:** 변환 셀에서 작은 초록 거품 파티클 2-3개 위로 솟음 (`#88CC44` → `#7297E5` 페이드 틱). 색상 전환 자체가 시각 신호.
**10. 디자인 의도:** acid 풀이 물 소스에 인접하면 *시간이 지나면서 자연 중화*된다. 디자이너는 "acid 풀 왼쪽에 water 소스를 흘려놓으면 플레이어가 기다리거나 빠르게 통과해야 한다"는 타이밍 트랩을 설계할 수 있다. 역으로 water 흐름을 차단(ice 동결, metal 댐)하면 acid 풀이 유지된다.
**11. 구현 위치:** `TileMutator.ts:tickPassiveInteractions` — acid 블록 내 `else if (t === TILE_ACID)` 분기에 추가. `maybeMutateNeighbour(roomData, gx, gy, TILE_WATER, TILE_WATER, 0.03)` 형태 — 단, 출력이 acid → water 이므로 자기 자신 셀(`row[gx]`)을 변환하는 별도 헬퍼 필요 (8줄).
**12. 구현 비용:** LOC ~12 (헬퍼 `maybeMutateSelfIfNeighbour` 신규 ~8줄 + 호출 4줄). 자산 추가 없음. CSV 1 row 추가 (`System_World_TileSystem.md §3.2` 자동 상호작용 표).

---

### R-NEW-002 — 기름 부상 / Oil Float

**1. 반응 ID:** R-NEW-002
**2. 이름:** 기름 부상 / Oil Float
**3. 분류:** cell × cell passive
**4. 입력:** oil (11) 셀 바로 아래 = water (2)
**5. 출력:** oil ↔ water 셀 위치 교환 (oil 이 위, water 가 아래) — 영구
**6. 트리거:** 8%/1s tick (중력 FluidSystem tick 과 별개 패시브 — FluidSystem 의 실제 셀 이동과 충돌 방지를 위해 **상단 2타일 이내만** 시도)
**7. 1차 niche 정렬 점수:** 4 / 5
> Noita의 오일-물 분리 현상 직접 참조. "거대 시설의 연료 탱크 내부"에서 물 위에 기름이 뜨는 물리 현상. 아이템계의 "살아있는 세계" 신호.
**8. 5색 기질 정체성:** Shadow (기름 + 물의 혼합 공간) — Shadow 룸의 기름 풀 위에 water 소스가 흘러들어오면 oil 이 자연적으로 수면 위에 집결, 점화 트랩이 집중된다.
**9. 시각 효과:** 교환 발생 시 해당 셀 경계에서 작은 물결 파티클 (FluidSystem의 `applyImpulse` 재사용 가능). oil 셀 색상(어두운 갈색)이 water 위로 올라오는 모습이 육안으로 즉시 식별 가능.
**10. 디자인 의도:** oil 과 water 를 같은 구역에 배치하면 시간이 지나면서 oil 이 수면으로 집결한다. 플레이어가 fire 인챈트를 쓰면 수면 위 oil 층만 연쇄 발화 → water 가 아래에서 차단막 역할. "oil 화재를 water 로 진압하면 안 된다"는 현실 물리를 게임 메커닉으로 변환.
**11. 구현 위치:** `TileMutator.ts:tickPassiveInteractions` — `else if (t === TILE_OIL)` 신규 분기. 직접 상단 셀 체크 후 swap: `if (getTile(roomData, gx, gy+1) === TILE_WATER && Math.random() < 0.08)`.
**12. 구현 비용:** LOC ~10. 자산 추가 없음.

---

### R-NEW-003 — 산성 연소 / Acid Flash

**1. 반응 ID:** R-NEW-003
**2. 이름:** 산성 연소 / Acid Flash
**3. 분류:** attack × cell (fire attack on acid)
**4. 입력:** fire 공격이 acid (13) 셀에 적중
**5. 출력:** acid 셀 → 독성 증기 (AIR 전환) + 독성 연기 VFX (연두색 연기구름) + 범위 acid 데미지 (반경 1 타일 내 엔티티에게 `ACID_TICK_PCT × 8` 즉발)
**6. 트리거:** fire 공격 `applyFireAttack` 내 acid 셀 감지 시 100% 발동 (현재 water → steam 과 동등한 즉발 반응)
**7. 1차 niche 정렬 점수:** 5 / 5
> Noita의 "acid 에 불을 붙이면 독성 연기가 발생한다" 직접 대응. BLAME!의 연구 시설 화학사고 씬. "살아있는 세계" — 플레이어가 처음 실수로 acid 에 fire 를 쓸 때 독성 구름이 터지면서 위험을 학습.
**8. 5색 기질 정체성:** Rust (산성 라보의 사고 연출) — Rust 룸의 시그니처 사고. 디자이너가 의도적으로 fire trap + acid pool 조합으로 "독성 사고 룸" 을 설계할 수 있다.
**9. 시각 효과:** 연두색-황색 연기 파티클 버스트 (`#CCDD44` → fade). 2-3 프레임 flash. 기존 `SteamPuffManager` 를 색상 파라미터만 바꿔 재사용 (`tintColor: 0xCCDD44`). SFX: 산성 sizzle 2배 강도.
**10. 디자인 의도:** fire 인챈트가 acid 풀에 쓸 때 "예상치 못한 역효과" 를 연출. 플레이어가 화염 검사인 경우 acid 풀을 fire 로 태우려다 독에 당하는 서프라이즈 발생. Noita 의 "잘못된 연금술" 경험. 동시에 fire 를 acid 에 쓰면 acid 제거 효과도 있어 의도적 활용도 가능.
**11. 구현 위치:** `TileHazards.ts:applyFireAttack` — water 증기화 분기 직후. `isAcid(tile)` 체크 추가, AIR 전환 + `onSteamEvent`(green tint 파라미터) + 인접 엔티티 타격. 현재 `applyFireAttack` 은 `fluidSystem` 포인터를 받으므로 콜백 추가로 장면 측 acid 데미지 발동 가능.
**12. 구현 비용:** LOC ~18 (`applyFireAttack` 내 acid 분기 ~10줄 + `SteamPuffManager` tint 파라미터 지원 ~8줄). SFX: 기존 acid_drip sfx 재사용 + pitch shift. 자산 추가 없음.

---

### R-NEW-004 — 결빙 기름 / Frozen Oil

**1. 반응 ID:** R-NEW-004
**2. 이름:** 결빙 기름 / Frozen Oil
**3. 분류:** attack × cell (ice attack on oil)
**4. 입력:** ice 공격이 oil (11) 셀에 적중
**5. 출력:** oil 셀 → frozen oil (WALL로 임시 전환, 8s 후 복귀). 재료는 oil 이므로 복귀 후 oil 재개. 결빙 중 oil 은 불붙지 않음.
**6. 트리거:** `applyIceAttack` 내 oil 셀 감지 시 100% (현재 water/magma 만 처리)
**7. 1차 niche 정렬 점수:** 4 / 5
> "기름이 언다" — 거대 시설의 연료 라인이 빙결 구역을 지날 때 응고. BLAME! 적 산소 없는 극저온 구역 모티프. 얼어붙은 기름 위를 미끄러지며 전투하는 장면.
**8. 5색 기질 정체성:** Iron (냉각 격납고 — 응결된 연료) — Iron 룸에서 oil 이 얼어 발판이 되는 경험. Ice 인챈트로 oil 풀 위를 임시로 건너가는 활용.
**9. 시각 효과:** 기존 `frozen` 오버레이 사용 (TileMutator 가 이미 처리). originalTile = TILE_OIL 로 기록하면 복귀 시 oil 로 정상 복귀. 얼어붙은 oil 색상: 짙은 청회색 (`#2A3A40` — 얼음 아래 어두운 기름).
**10. 디자인 의도:** ice 인챈트의 활용 범위를 확장. 물 결빙(다리 만들기)과 유사하지만 oil 결빙은 "임시 발판 + 불붙으면 즉시 해빙 + 화재"의 3단 콤보 설계를 가능케 한다. 디자이너는 "oil 풀 위에 비밀 영역"을 ice 결빙으로만 접근 가능한 게이트로 쓸 수 있다.
**11. 구현 위치:** `TileHazards.ts:applyIceAttack` — `findCellInAABB(..., isOil)` 추가. `mutator.tryFreeze` 내부는 현재 `TILE_WATER || TILE_MAGMA` 만 허용. **조건 확장 필요:** `tryFreeze` 에 `TILE_OIL` 추가 (4줄). `applyIceAttack` 에 oil 분기 추가 (6줄).
**12. 구현 비용:** LOC ~10 (`tryFreeze` 조건 확장 4줄 + `applyIceAttack` 분기 6줄). 자산 없음.

---

### R-NEW-005 — 전기 기름막 절연 / Electric Insulation

**1. 반응 ID:** R-NEW-005
**2. 이름:** 전기 기름막 절연 / Electric Insulation
**3. 분류:** cell × cell passive + attack interaction
**4. 입력:** thunder 공격이 oil (11) 인접 water (2)/acid (13) 에 flood-fill 중 — oil 셀 경계 도달 시
**5. 출력:** flood-fill 이 oil 셀 경계에서 **차단** (기존 conductor flood-fill 이 oil 을 절연체로 취급). oil 셀은 electric 오버레이를 받지 않음.
**6. 트리거:** `applyThunderChain` flood-fill BFS 에서 TILE_OIL 셀을 conductor 목록에서 제외 (현재 코드는 이미 그렇게 되어 있음 — but 명시적 설계로 문서화 + 시각 신호 추가 필요)
**7. 1차 niche 정렬 점수:** 4 / 5
> "기름은 전기를 통하지 않는다" — 물리 직관. Noita 에서 플레이어가 기름으로 전기를 차단하는 전략적 활용. 거대 시설의 절연 코팅 라인 모티프.
**8. 5색 기질 정체성:** Spark (전기 회로 홀) — Spark 룸에서 oil 층이 전도 경로를 끊는 절연 퍼즐. 플레이어가 oil 을 치워야 thunder 가 연결된다.
**9. 시각 효과:** oil 셀 경계에서 flood-fill 이 차단될 때 **짧은 arc 스파크가 oil 표면을 핥으며 꺼지는 VFX** (기존 electric spark 파티클을 oil 경계에서 3px 방출 후 즉시 소멸). 시각적으로 "전기가 튕겨나갔다"는 신호.
**10. 디자인 의도:** thunder 인챈트가 water/acid 전도체를 타다가 oil 층에서 차단되는 전략적 지형 설계. 디자이너는 water 풀 사이에 oil 층을 한 줄 배치해 thunder 전파 경로를 분리할 수 있다. 반대로 플레이어가 oil 을 불태워 통로를 열면 thunder 전파가 가능해지는 2단계 퍼즐.
**11. 구현 위치:** `TileMutator.ts:applyThunderChain` — flood-fill BFS 내 도체 판별 조건 명시화. 현재 `t !== TILE_WATER && t !== TILE_METAL && t !== TILE_ACID` 조건이 이미 oil 을 차단하지만 **oil 경계 도달 시 스파크 VFX 발화 콜백** 추가 필요: `onElectricInsulated?: (gx, gy) => void` 신규 콜백 4줄 + BFS 내 oil 감지 시 콜백 호출 4줄.
**12. 구현 비용:** LOC ~12 (콜백 선언 4줄 + BFS 분기 8줄). VFX: 기존 electric spark 파티클 재사용.

---

### R-NEW-006 — 산성 빙결 / Acid Freeze

**1. 반응 ID:** R-NEW-006
**2. 이름:** 산성 빙결 / Acid Freeze
**3. 분류:** attack × cell (ice attack on acid)
**4. 입력:** ice 공격이 acid (13) 셀에 적중
**5. 출력:** acid 셀 → 임시 결빙 (WALL 5s — water 결빙 15s 보다 빨리 녹음, 불안정한 결정 구조). 결빙된 acid 셀 위를 걷는 엔티티는 `acid` 슬릭 잔류 (얼음 위에서도 DOT 유지, 극소 0.1% 감소).
**6. 트리거:** `applyIceAttack` — oil 분기(R-NEW-004)와 동일 확장 패턴. acid 셀 감지 시 100%.
**7. 1차 niche 정렬 점수:** 4 / 5
> 산성 풀을 임시로 얼려 건너가는 전술. Made in Abyss의 "불안정한 환경을 일시적으로 안전하게 만드는 기술" 모티프. 단, 완전히 안전하지 않다 — 산이 얼어도 독성은 잔류.
**8. 5색 기질 정체성:** Rust (부식 라보) — acid 풀이 가득한 Rust 룸에서 ice 인챈트를 가진 플레이어만 임시 통로를 낼 수 있다. 능력 게이트의 연장.
**9. 시각 효과:** 결빙 셀 색상: 탁한 청록 (`#3A7A6A` — acid 녹색과 ice 파란색의 중간). 기존 frozen 오버레이 렌더러가 색상 파라미터를 받도록 경량 확장 가능. SFX: 결빙음 + 산성 sizzle 혼합.
**10. 디자인 의도:** acid 풀 위에 비밀 경로를 배치할 때 ice 인챈트 조건 게이트로 활용. water 결빙보다 지속 시간이 짧아 "빨리 건너가야 한다"는 압박. 결빙 중에도 DOT 잔류 → "안전해 보이지만 여전히 위험" 느낌.
**11. 구현 위치:** `TileHazards.ts:applyIceAttack` + `TileMutator.ts:tryFreeze` (acid 조건 추가). `FREEZE_DURATION_MS` 대신 acid 전용 5000ms 상수 `ACID_FREEZE_DURATION_MS` 신규 추가. 5줄.
**12. 구현 비용:** LOC ~14 (상수 1 + tryFreeze 조건 확장 4줄 + applyIceAttack 분기 9줄).

---

### R-NEW-007 — 마그마 수증기 폭발 / Magma Steam Burst

**1. 반응 ID:** R-NEW-007
**2. 이름:** 마그마 수증기 폭발 / Magma Steam Burst
**3. 분류:** cell × cell passive (강화판)
**4. 입력:** water (2) + magma (6) 인접 (현재 magma+ice → water 만 있음; water+magma 직접 접촉 은 코드에 없음)
**5. 출력:** water 셀 → AIR + 증기 VFX. 동시에 magma 는 온도 감소 → 50% 확률로 magma → WALL (굳은 용암, 영구). 나머지 50% 는 magma 유지.
**6. 트리거:** 6%/1s tick (magma 셀 스캔 중 인접 water 감지)
**7. 1차 niche 정렬 점수:** 5 / 5
> "마그마가 물을 만나면 수증기 폭발이 일어나고 일부 마그마가 굳는다" — Noita의 대표적 물리 반응이자 BLAME!의 거대 용암 구조물 묘사. 굳은 마그마(검은 돌)가 지형에 누적되는 시각적 역사.
**8. 5색 기질 정체성:** Forge (단조 신전) — Forge 룸에서 WaterBarrel 을 magma 풀 근처에 던지면 용암이 부분적으로 굳어 발판이 생기거나 경로가 막히는 emergent 지형 변화.
**9. 시각 효과:** 증기 폭발: 기존 `SteamPuffManager.spawn` + 강도 1.4 (현재 1.0 / 1.2 사용 중). 굳은 magma 셀: TILE_WALL 로 전환 + `onWallTileChanged` 콜백 → 장면이 검은 용암암 타일로 재렌더링 (LDtk wall 타일의 어두운 변종).
**10. 디자인 의도:** water 소스를 magma 근처에 유도하면 지형이 동적으로 변화한다. WaterBarrel 을 던지면 magma 풀이 굳어 발판이 생기는 투척 퍼즐 설계 가능. 반대로 magma 가 굳으면 더 이상 화상 위험이 없어지므로 "magma 를 제거하는 방법"으로도 작동. 순환: water → magma 부분 굳음 → 고정 지형 → 추후 acid 로 부식 가능 (R-NEW-001과 연계).
**11. 구현 위치:** `TileMutator.ts:tickPassiveInteractions` — `if (t === TILE_MAGMA)` 분기에 ice 멜트 외 water 인접 감지 추가. `maybeSolidifyMagmaOnWater` 신규 헬퍼 메서드 (~15줄). 증기: 기존 `maybeMutateNeighbourWithSteam` 활용.
**12. 구현 비용:** LOC ~22 (헬퍼 15줄 + 호출 7줄). `onWallTileChanged` 콜백은 이미 존재.

---

### R-NEW-008 — 기름 산성 응고 / Oil Acid Coagulation

**1. 반응 ID:** R-NEW-008
**2. 이름:** 기름 산성 응고 / Oil Acid Coagulation
**3. 분류:** cell × cell passive
**4. 입력:** oil (11) + acid (13) 인접
**5. 출력:** oil 셀 → 두꺼운 검은 잔존물 (TILE_WALL 영구 전환, 통과 불가 슬러지). acid 는 유지. 슬러지 셀은 산성이 아니지만 위를 걸으면 이동속도 -30% (별도 오버레이 또는 FluidResidue 재사용).
**6. 트리거:** 5%/1s tick
**7. 1차 niche 정렬 점수:** 3 / 5
> "기름과 산이 섞이면 검은 탄화 잔존물이 생긴다" — 현실 화학의 간략화. BLAME!의 "시설 바닥에 쌓인 정체불명의 검은 물질" 모티프. 다소 설명이 필요한 반응이므로 점수 3.
**8. 5색 기질 정체성:** Shadow (기름 + 산의 교차 지점) — Shadow 룸에서 acid 풀과 oil 풀이 맞닿으면 통로를 막는 검은 덩어리가 생성. 동적 미로 변화.
**9. 시각 효과:** WALL 전환 셀 색상: 짙은 검정-갈색 (`#1A1208`). `onWallTileChanged` 콜백으로 특수 슬러지 타일 렌더링. 부글거리는 작은 파티클 1-2개.
**10. 디자인 의도:** oil 과 acid 를 같은 구역에 두면 자연스럽게 경로가 막히는 현상. 디자이너가 "oil + acid 를 혼합하면 막힌다" 는 규칙을 미로 설계에 활용 가능. 플레이어가 의도적으로 oil 을 acid 에 던져 경로를 봉쇄하거나 open 상태를 유지하기 위해 acid 를 제거하는 선택을 해야 한다.
**11. 구현 위치:** `TileMutator.ts:tickPassiveInteractions` — `else if (t === TILE_OIL)` 분기 내 acid 이웃 감지. 자기 자신 셀을 WALL 로 변환하는 `maybeSolidifySelfIfNeighbour` 헬퍼 (~10줄). 슬러지 이동속도 감소는 Player.ts 의 oil slip 코드 참조 후 별도 `isSludge` 오버레이 Map 추가 가능 (Phase 2).
**12. 구현 비용:** LOC ~14 (헬퍼 10줄 + 호출 4줄). 이동속도 감소 오버레이는 Tier 2 이후 추가.

---

### R-NEW-009 — 얼음 산성 균열 / Ice Acid Crack

**1. 반응 ID:** R-NEW-009
**2. 이름:** 얼음 산성 균열 / Ice Acid Crack
**3. 분류:** cell × cell passive
**4. 입력:** ice (7) + acid (13) 인접
**5. 출력:** ice 셀 → water (영구 용해). acid 는 유지 (강산이 얼음을 녹임). 용해 시 steam VFX 는 없음 — 거품 파티클만.
**6. 트리거:** 8%/1s tick (acid + metal 보다 빠름 — 얼음이 금속보다 산에 약함)
**7. 1차 niche 정렬 점수:** 4 / 5
> "산이 얼음을 녹인다" — 직관적 물리. Rust 룸에서 ice 게이트가 acid 에 의해 자연 붕괴되는 동적 지형. 플레이어가 ice 다리 근처에 acid 를 두면 다리가 무너지는 환경 함정.
**8. 5색 기질 정체성:** Rust (부식 라보) — acid 가 ice 장벽을 녹이며 경로를 열거나 닫는 시간차 트랩. R-NEW-001(acid + water 희석)과 체인 가능: ice 가 녹아 water 가 되면 → acid 가 water 에 희석되기 시작.
**9. 시각 효과:** ice → water 변환 시 작은 녹색 거품 파티클. 기존 `tryMeltIce` 의 `onWallTileChanged` 콜백 재사용. ice 셀이 acid 에 의해 녹을 때 파티클 색상을 초록으로 틴팅.
**10. 디자인 의도:** ice 발판 근처에 acid 풀을 배치하면 "시간이 지나면 ice 다리가 녹는다" 는 타임 프레셔 형성. 플레이어가 빠르게 ice 다리를 건너야 하거나, acid 를 먼저 제거해야 한다. 체인: acid 가 ice 를 녹이면 → water 가 생성 → water 가 acid 를 희석 (R-NEW-001) → acid 자연 소멸. 시스템이 스스로 균형에 도달.
**11. 구현 위치:** `TileMutator.ts:tickPassiveInteractions` — `else if (t === TILE_ACID)` 분기에 ice 이웃 멜트 추가. 기존 `maybeMutateNeighbour(roomData, gx, gy, TILE_ICE, TILE_WATER, 0.08)` 6줄.
**12. 구현 비용:** LOC ~6. 기존 헬퍼 완전 재사용. 자산 없음.

---

### R-NEW-010 — 전도 오염 / Conductor Contamination

**1. 반응 ID:** R-NEW-010
**2. 이름:** 전도 오염 / Conductor Contamination
**3. 분류:** cell × cell passive
**4. 입력:** acid (13) + water (2) 인접 (물과 산이 섞인 경계)
**5. 출력:** acid 에 인접한 water 셀이 thunder 전도 시 **acid 와 동등한 단일 conductor body** 로 취급 — 이미 `applyThunderChain` 이 water + acid 를 동일 conductor 로 처리하므로 **시각 신호 추가** 가 필요.
**6. 트리거:** thunder 공격 발동 시 즉시 (passive tick 아님 — attack interaction 시각화)
**7. 1차 niche 정렬 점수:** 3 / 5
> 이미 코드에 구현된 동작이지만 *플레이어가 모른다*는 문제. 시각 신호가 없으면 "acid + water = 더 넓은 전도 구역" 이라는 규칙을 플레이어가 발견하지 못함. 신규 VFX 추가로 발견 가능성 ↑.
**8. 5색 기질 정체성:** Spark (전기 회로 홀) — acid 가 water 풀에 섞이면 thunder 전도 범위가 확장되는 것을 시각적으로 보여줌. Spark 룸의 학습 곡선 핵심.
**9. 시각 효과:** water + acid 경계 셀에서 thunder 발동 시 **acid-tinted 전기 아크** (녹색 번개 `#66CC22`) 가 water-acid 경계를 따라 흐르는 VFX. 기존 electric 오버레이 렌더러에 tint 파라미터 추가.
**10. 디자인 의도:** 코드에 이미 구현된 동작을 *시각적으로 명확하게 전달*. "산성 풀에 물이 흘러들어오면 전기 전도 범위가 넓어진다" 는 규칙을 플레이어가 능동적으로 발견하고 활용하도록 유도. 기존 기능의 discoverability 개선 — LOC 최소, 효과 최대.
**11. 구현 위치:** `TileMutator.ts:applyThunderChain` — flood-fill 중 acid 셀 진입 시 `onElectricAcidPulse` 콜백 발화. 장면 측에서 녹색 arc VFX 생성.
**12. 구현 비용:** LOC ~8 (콜백 4줄 + 장면 측 VFX 연결 4줄). VFX는 기존 electric arc 재사용 + tint.

---

### R-NEW-011 — 마그마 굳음 충격 / Impact Solidification

**1. 반응 ID:** R-NEW-011
**2. 이름:** 마그마 굳음 충격 / Impact Solidification
**3. 분류:** container × cell
**4. 입력:** WaterBarrel 파괴 → magma (6) 셀 페인트 영역에 water 충돌
**5. 출력:** WaterBarrel 이 magma 풀 안에 착지/충돌 시 → 충돌 지점 반경 1타일 magma 셀 → WALL (굳음) + 대규모 증기 폭발 VFX (R-NEW-007보다 강도 높음)
**6. 트리거:** WaterBarrel 파괴 → `paintContainerImpact` 에서 magma 인접 감지 시 100%
**7. 1차 niche 정렬 점수:** 5 / 5
> "물 폭탄을 용암에 던지면 용암이 굳는다" — Noita의 가장 극적인 emergent 장면. BLAME!의 거대 용암 시설에서 물을 뿌려 통로를 만드는 행위. 아이템계의 "살아있는 세계" 시그널 중 가장 직관적.
**8. 5색 기질 정체성:** Forge (단조 신전) — Forge 룸에서 WaterBarrel 을 용암 풀에 던지면 즉시 발판이 생기는 emergent 지형 변화. 플레이어가 "용암 위 비밀 영역"을 WaterBarrel 으로 개척.
**9. 시각 효과:** `SteamPuffManager.spawn` 강도 2.0 (현재 최대 1.4보다 높음 — 필요 시 강도 파라미터 범위 확장). 굳은 magma: 짙은 회갈색 WALL 타일. 카메라 shake 4 (현재 container 파괴 shake 2의 2배). SFX: 마그마 냉각음 + 증기 폭발음.
**10. 디자인 의도:** WaterBarrel 을 투척 무기로 쓸 때 magma 환경에서 "지형을 만드는 폭탄"으로 역할 전환. 전략적 깊이: 한정된 WaterBarrel 을 언제 쓸 것인가의 자원 관리. Forge 룸의 MagmaCrucible(마그마 깨짐) + WaterBarrel(굳힘) 콤보로 완전한 환경 제어 가능.
**11. 구현 위치:** `ItemWorldScene.ts` / `LdtkWorldScene.ts` 의 `paintContainerImpact` 헬퍼 — WaterBarrel 파괴 후 인접 magma 셀 스캔 → WALL 전환 + SteamPuff. `ThrowableContainer.ts` 는 수정 불필요 (장면 측 처리).
**12. 구현 비용:** LOC ~20 (장면 측 magma 굳음 로직). `SteamPuffManager` 강도 파라미터 확장 ~4줄. 자산 없음.

---

### R-NEW-012 — 산성 컨테이너 연쇄 / Acid Container Chain

**1. 반응 ID:** R-NEW-012
**2. 이름:** 산성 컨테이너 연쇄 / Acid Container Chain
**3. 분류:** container × cell + entity × entity
**4. 입력:** AcidVial 파괴 → 착지점 근처 다른 컨테이너 (Crate / WaterBarrel / OilDrum 등) 존재
**5. 출력:** AcidVial 이 깨지면서 acid 페인트 → **근처 컨테이너 (2타일 이내)가 acid 노출** → Crate/WaterBarrel 3s 후 파괴 (내용물 방류) → 연쇄 파괴 + 방류 도미노
**6. 트리거:** AcidVial 파괴 → `paintContainerImpact` 후 근처 컨테이너 `acidExposureMs` 가속 (+500ms/frame, 1s 후 파괴 역치 도달)
**7. 1차 niche 정렬 점수:** 4 / 5
> "산성 바이알이 깨지면서 옆의 통 들도 차례로 녹아내린다" — 공장 사고 시나리오. 디스가이아 아이템계의 연쇄 반응 카오스 + BLAME! 폐허 시설 사고 합산.
**8. 5색 기질 정체성:** Rust (부식 라보) — Rust 룸의 AcidVial 스택 근처에 WaterBarrel 을 배치하면 AcidVial 파괴 → WaterBarrel 방류 → acid 희석 (R-NEW-001) 의 3단 체인.
**9. 시각 효과:** 각 컨테이너 파괴 시 기존 `destroyContainerWithVFX` (shatter + shake). 연쇄 파괴는 0.3초 간격 딜레이로 도미노 효과 연출.
**10. 디자인 의도:** 컨테이너 군집 배치 룸에서 하나의 AcidVial 투척이 도미노 방류를 유발. "던지기 전에 무엇이 맞는지 생각해야 한다" 는 전략 레이어. 반대로 의도적으로 연쇄를 설계해 한 던지기로 room clear 하는 보상.
**11. 구현 위치:** 장면의 `onContainerDestroyed` 콜백 — AcidVial 파괴 시 근처 컨테이너 리스트 스캔 + `acidExposureMs` 가속. `ThrowableContainer.tickEnvironment` 는 이미 `acidExposureMs` 를 처리하므로 가속 외 수정 불필요.
**12. 구현 비용:** LOC ~18 (장면 측 스캔 + 가속 로직). 자산 없음.

---

### R-NEW-013 — 기름 수면 발화 / Surface Ignition

**1. 반응 ID:** R-NEW-013
**2. 이름:** 기름 수면 발화 / Surface Ignition
**3. 분류:** cell × cell passive + attack interaction
**4. 입력:** oil (11) 셀이 water (2) 위에 R-NEW-002 에 의해 부상한 상태에서 fire 공격 적중
**5. 출력:** water 상단의 oil 층만 발화 → 수면 화재. water 는 유지 (하층). oil 이 소진되면 화재 종료 + water 노출 → 이후 thunder 전도 가능.
**6. 트리거:** R-NEW-002 결과 oil-on-water 구조가 형성된 후 fire attack 적중 — 기존 `tryIgnite` 가 자동 처리. 별도 코드 불필요 (R-NEW-002 가 선행 구현되면 자동으로 발생하는 emergent).
**7. 1차 niche 정렬 점수:** 5 / 5
> "물 위의 기름이 불타고, 불이 꺼지면 물이 남는다" — Noita의 가장 극적인 환경 체인. BLAME!의 시설 내 연료 화재 진압 장면. 아이템계 "살아있는 세계"의 3단 emergent.
**8. 5색 기질 정체성:** Forge + Shadow 교차 — Forge 의 화염 + Shadow 의 기름 교차 지점. 2차 기질 조합 emergent.
**9. 시각 효과:** oil 발화는 기존 처리. 수면 발화 특유 연출: 화염이 수면을 따라 퍼지는 모습 (oil spread 로 자연 발생). 연기가 water 반사 위에 반사되는 이미지 — 기존 VFX로 자동 표현.
**10. 디자인 의도:** R-NEW-002 의 oil 부상이 구현되면 자동으로 발생하는 emergent 체인. 별도 코드 없음 — "시스템 조합으로 emergent 가 나온다"는 설계 원칙의 정점. 디자이너는 water + oil 혼합 구역에 fire trap 을 배치하면 수면 화재 이후 thunder 전도 구역으로 변하는 다중 페이즈 룸을 설계 가능.
**11. 구현 위치:** R-NEW-002 구현 시 자동 성립. 별도 코드 없음.
**12. 구현 비용:** 0 LOC (R-NEW-002 의존). R-NEW-002 가 Tier 1 에 들어가면 이 반응도 자동 포함.

---

### R-NEW-014 — 강철 수문 부식 / Metal Gate Corrosion

**1. 반응 ID:** R-NEW-014
**2. 이름:** 강철 수문 부식 / Metal Gate Corrosion
**3. 분류:** container × cell
**4. 입력:** MetalCrate 가 acid (13) 셀 안에 있는 상태에서 WaterBarrel 파괴 → 근처 물 흘러 들어옴
**5. 출력:** acid 가 희석되면서 (R-NEW-001) MetalCrate 의 부식 속도 감소 → 선택: 플레이어가 water 를 acid 에 붓는 타이밍으로 MetalCrate 생존 시간 제어.
**6. 트리거:** R-NEW-001 이 발동해 acid → water 전환 시 MetalCrate 의 `acidExposureMs` 증가 정지 (acid 셀 판별 조건 재확인).
**7. 1차 niche 정렬 점수:** 3 / 5
> 시스템 상호작용의 복합성. 단독으로는 발견하기 어려운 반응이라 점수 3. 하지만 "부식 속도를 물로 늦출 수 있다" 는 전략 선택지는 고도 플레이어에게 meaningful.
**8. 5색 기질 정체성:** Iron (강철의 견고함을 지키는 의지) — acid 에 노출된 금속 컨테이너를 water 로 보호하는 전략. Iron 의 "끊어지지 않는다" 내러티브와 일치.
**9. 시각 효과:** 부식 속도 감소 시 MetalCrate 표면의 acid 부식 파티클 감소. 특별한 VFX 불필요 — 파티클 빈도가 자연스럽게 줄어드는 것으로 표현.
**10. 디자인 의도:** 이미 구현된 두 반응(acid 부식 + water 희석) 의 자연스러운 상호작용. 별도 코드 없이 R-NEW-001 구현으로 자동 성립. "시스템이 시스템을 만드는" 설계.
**11. 구현 위치:** R-NEW-001 구현 시 자동 성립. acid 셀이 water 로 전환되면 `ThrowableContainer.tickEnvironment` 의 `isAcidCell` 판별이 false 가 되어 자동으로 부식 정지.
**12. 구현 비용:** 0 LOC (R-NEW-001 의존).

---

### R-NEW-015 — 얼음 위 기름 슬릭 / Ice Oil Slick

**1. 반응 ID:** R-NEW-015
**2. 이름:** 얼음 위 기름 슬릭 / Ice Oil Slick
**3. 분류:** cell × cell passive + entity hazard 확장
**4. 입력:** oil (11) 셀이 ice (7) 셀 위에 놓인 상태 (겹친 레이어 — ice 는 solid, oil 은 passable)
**5. 출력:** ice 위의 oil 구역에서 플레이어 이동 마찰 = 0 (ice 마찰 0) + oil 슬릭 (이동속도 추가 가속). 이 조합에서 발화 시 *ice 가 oil 발화를 5s 만큼 지연* (ice 가 기름 아래에서 온도를 낮춤).
**6. 트리거:** TileHazards 의 oil slick 판별 + ice 솔리드 위 여부 체크. 기존 Player oil slip 로직 확장 (~8줄).
**7. 1차 niche 정렬 점수:** 4 / 5
> "얼음 위에 기름이 깔리면 더 미끄럽다" + "차가운 기름은 더 잘 타지 않는다" — 두 가지 직관. Iron 룸의 냉각 격납고에서 oil 이 흘러 ice 발판에 깔리는 상황.
**8. 5색 기질 정체성:** Iron (냉각 격납고) — Ice + Oil 의 교차가 Iron 룸의 이동 위험으로 작동. 아무도 예상 못한 미끄럼 + 발화 지연의 조합.
**9. 시각 효과:** ice 위 oil 셀에서 기름의 무지개 반사 (`#8a6a3a` sheen) 가 ice 파란색 위에 겹쳐지는 색상 조합. 발화 지연 중 oil 셀이 낮은 빈도의 작은 불꽃만 표시.
**10. 디자인 의도:** ice + oil 조합 구역을 "극도로 위험한 이동 환경"으로 설정. 플레이어가 ice 구역을 건너다 oil 에 미끄러지고, 불까지 붙으면 발화 지연 덕분에 탈출 시간이 생긴다. 다층 위험의 동시 표현.
**11. 구현 위치:** `TileHazards.ts` oil slip 관련 플레이어 처리 — ice 솔리드 아래 검사 후 마찰 배율 누적. `Player.ts` 의 oil 관련 speed modifier 에 ice-under-oil 판별 분기 추가.
**12. 구현 비용:** LOC ~12. 자산 없음.

---

## 구현 계획 — 3단계 Tier 분류

---

### Tier 1 — 데모 V1 (가장 작은 비용 + 가장 큰 시그널)

**대상 반응: R-NEW-003, R-NEW-004, R-NEW-007, R-NEW-009, R-NEW-011**

| 반응 ID | 이름 | LOC 추정 | 구현 시간 | 5색 기질 |
|:---|:---|:---:|:---:|:---:|
| R-NEW-003 | 산성 연소 | ~18 | 2h | Rust |
| R-NEW-004 | 결빙 기름 | ~10 | 1h | Iron |
| R-NEW-007 | 마그마 수증기 폭발 | ~22 | 2h | Forge |
| R-NEW-009 | 얼음 산성 균열 | ~6 | 0.5h | Rust |
| R-NEW-011 | 마그마 굳음 충격 | ~20 | 2h | Forge |

**5색 기질 분포 (Tier 1):**
- Forge: R-NEW-007, R-NEW-011 (2개)
- Iron: R-NEW-004 (1개)
- Rust: R-NEW-003, R-NEW-009 (2개)
- Spark: R-NEW-005 를 Tier 1에 추가 권장 (하단 참조)
- Shadow: R-NEW-002 를 Tier 1에 추가 권장 (하단 참조)

> **5색 균형 조정:** Tier 1 에 Spark(R-NEW-005), Shadow(R-NEW-002) 각 1개를 추가하면 5색 전부 포함. R-NEW-005 는 기존 코드 변경 최소 (~12 LOC), R-NEW-002 는 ~10 LOC.
> 수정 Tier 1: R-NEW-002, R-NEW-003, R-NEW-004, R-NEW-005, R-NEW-007, R-NEW-009, R-NEW-011 (7개)

#### 의존성 그래프 (Tier 1)

```
R-NEW-009  (단독)
R-NEW-004  → tryFreeze 확장 → R-NEW-006 (Tier 2) 기반
R-NEW-007  → maybeSolidifyMagmaOnWater 신규 헬퍼
R-NEW-011  → R-NEW-007 헬퍼 재사용 (동일 패턴, 별도 구현)
R-NEW-003  → applyFireAttack 확장 → SteamPuffManager tint 지원
R-NEW-005  → applyThunderChain BFS 확장 (콜백 추가)
R-NEW-002  → tickPassiveInteractions oil 분기 신규
R-NEW-013  → R-NEW-002 완료 시 자동 성립 (0 LOC)
```

#### 자산 필요 목록 (Tier 1)

| 자산 | 종류 | 우선순위 |
|:---|:---|:---:|
| acid flash green smoke 파티클 | VFX (SteamPuffManager tint 파라미터) | Must |
| magma solidify SFX | SFX (기존 `steam_burst` + pitch down 변형) | Must |
| electric insulated arc VFX | VFX (기존 electric spark + 소멸 애니) | Nice-to-have |
| frozen oil 셀 색상 오버레이 | 코드 색상 상수 (`#2A3A40`) | Must |

#### 디자이너 작업 (Tier 1 테스트 룸)

1. `Forge_Test_Room`: magma 풀 + WaterBarrel 1개 배치 → R-NEW-007, R-NEW-011 검증
2. `Rust_Test_Room`: acid 풀 + ice 셀 인접 + fire trap → R-NEW-003, R-NEW-009 검증
3. `Iron_Test_Room`: oil 풀 위에 ice 인챈트 사용 시나리오 → R-NEW-004 검증

#### 테스트 시나리오 (Tier 1)

- `R-NEW-007`: magma 2×2 풀 옆에 water 1×2 배치 → 30초 관찰 → magma 가 부분 굳는지 확인
- `R-NEW-011`: magma 풀 위 WaterBarrel 투척 → 즉시 굳음 + 증기 버스트 확인
- `R-NEW-003`: acid 풀에 fire 인챈트 사용 → acid 제거 + 독성 연기 VFX 확인
- `R-NEW-009`: acid 풀 옆 ice 셀 배치 → 30초 후 ice → water 전환 확인
- `R-NEW-004`: oil 풀에 ice 인챈트 사용 → 결빙 8s 후 oil 복귀 확인

---

### Tier 2 — V1.0 정식 (중간 비용 + 깊이 추가)

**대상 반응: R-NEW-001, R-NEW-002(미포함 시), R-NEW-005(미포함 시), R-NEW-006, R-NEW-008, R-NEW-010, R-NEW-012**

| 반응 ID | 이름 | LOC 추정 | 구현 시간 | 5색 기질 |
|:---|:---|:---:|:---:|:---:|
| R-NEW-001 | 증기 희석 | ~12 | 1.5h | Rust |
| R-NEW-006 | 산성 빙결 | ~14 | 1.5h | Rust |
| R-NEW-008 | 기름 산성 응고 | ~14 | 1.5h | Shadow |
| R-NEW-010 | 전도 오염 | ~8 | 1h | Spark |
| R-NEW-012 | 산성 컨테이너 연쇄 | ~18 | 2h | Rust |

#### 의존성 그래프 (Tier 2)

```
R-NEW-001  (단독) → R-NEW-014 자동 성립
R-NEW-006  → R-NEW-004 (tryFreeze 확장) 의존. Tier 1 완료 후 구현
R-NEW-008  (단독)
R-NEW-010  → R-NEW-005 (콜백 인프라) 의존. Tier 1 완료 후 구현
R-NEW-012  → 장면 측 onContainerDestroyed 훅 존재 여부 확인 필요
```

#### 자산 필요 목록 (Tier 2)

| 자산 | 종류 | 우선순위 |
|:---|:---|:---:|
| acid-ice frozen 셀 색상 (`#3A7A6A`) | 코드 상수 | Must |
| oil-acid sludge 셀 색상 (`#1A1208`) | 코드 상수 | Must |
| green electric arc VFX | VFX (기존 arc tint) | Nice-to-have |
| container chain destroy SFX 딜레이 | SFX 타이밍 로직 | Nice-to-have |

#### 디자이너 작업 (Tier 2 테스트 룸)

1. `Rust_Deep_Room`: acid + ice + water 3종 혼합 → R-NEW-001, R-NEW-006, R-NEW-009 체인 검증
2. `Shadow_Room`: oil + acid 혼합 → R-NEW-008 슬러지 생성 + 경로 봉쇄 확인
3. `Spark_Room`: water + acid 혼합 풀 + MetalCrate → thunder 전도 범위 확인
4. `Rust_Container_Room`: AcidVial + Crate 스택 → 연쇄 파괴 도미노 확인

#### 테스트 시나리오 (Tier 2)

- `R-NEW-001`: acid 풀 옆 water 배치 → 60초 후 acid 일부 → water 전환 확인
- `R-NEW-006`: acid 풀에 ice 인챈트 → 5s 결빙 → 복귀 후 acid 유지 확인
- `R-NEW-008`: oil + acid 인접 배치 → 30초 후 슬러지 wall 생성 확인
- `R-NEW-012`: AcidVial 3개 스택 → 하나 파괴 → 도미노 파괴 타이밍 확인

---

### Tier 3 — V2+ (큰 비용 또는 별도 시스템 필요)

**대상 반응: R-NEW-015 (+ R-NEW-013, R-NEW-014 는 의존 Tier 완료 시 자동)**

| 반응 ID | 이름 | LOC 추정 | 의존성 | 비고 |
|:---|:---|:---:|:---:|:---|
| R-NEW-015 | 얼음 위 기름 슬릭 | ~12 | Player oil slip 시스템 리팩터링 | Player.ts 변경 범위 검토 필요 |
| R-NEW-013 | 기름 수면 발화 | 0 | R-NEW-002 완료 | 자동 emergent |
| R-NEW-014 | 강철 수문 부식 | 0 | R-NEW-001 완료 | 자동 emergent |

**Tier 3 설명:**
- R-NEW-015 는 `Player.ts` 의 이동 물리 코드 수정이 필요하여 리그레션 위험이 다른 반응보다 높음.
- R-NEW-013, R-NEW-014 는 0 LOC — Tier 1/2 완료 시 자동 성립하는 emergent. 문서화가 목적.

---

## 자체 검증

### 검증 1 — 디자인 원칙 6항 통과 여부

| 반응 ID | 원칙 1 (niche) | 원칙 2 (스파이크) | 원칙 3 (시각) | 원칙 4 (기질) | 원칙 5 (양산성) | 원칙 6 (구현비용) | 결과 |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| R-NEW-001 | ✓ | ✓ | ✓ (거품 파티클) | ✓ Rust | ✓ | ✓ 12 LOC | 통과 |
| R-NEW-002 | ✓ | ✓ | ✓ (셀 교환) | ✓ Shadow | ✓ | ✓ 10 LOC | 통과 |
| R-NEW-003 | ✓ | ✓ | ✓ (독성 연기) | ✓ Rust | ✓ | ✓ 18 LOC | 통과 |
| R-NEW-004 | ✓ | ✓ | ✓ (결빙 색상) | ✓ Iron | ✓ | ✓ 10 LOC | 통과 |
| R-NEW-005 | ✓ | ✓ | ✓ (절연 arc) | ✓ Spark | ✓ | ✓ 12 LOC | 통과 |
| R-NEW-006 | ✓ | ✓ | ✓ (탁한 청록) | ✓ Rust | ✓ | ✓ 14 LOC | 통과 |
| R-NEW-007 | ✓ | ✓ | ✓ (증기+굳음) | ✓ Forge | ✓ | ✓ 22 LOC | 통과 |
| R-NEW-008 | △(3점) | ✓ | ✓ (검은 슬러지) | ✓ Shadow | ✓ | ✓ 14 LOC | **조건부 통과** |
| R-NEW-009 | ✓ | ✓ | ✓ (거품) | ✓ Rust | ✓ | ✓ 6 LOC | 통과 |
| R-NEW-010 | △(3점) | ✓ | ✓ (녹색 arc) | ✓ Spark | ✓ | ✓ 8 LOC | **조건부 통과** |
| R-NEW-011 | ✓ | ✓ | ✓ (굳음+증기) | ✓ Forge | ✓ | ✓ 20 LOC | 통과 |
| R-NEW-012 | ✓ | ✓ | ✓ (도미노 파괴) | ✓ Rust | ✓ | ✓ 18 LOC | 통과 |
| R-NEW-013 | ✓ | ✓ | ✓ (수면 화재) | Forge/Shadow | ✓ | ✓ 0 LOC | 통과 |
| R-NEW-014 | △(3점) | ✓ | △(파티클 감소) | ✓ Iron | △(발견 어려움) | ✓ 0 LOC | **조건부 통과** |
| R-NEW-015 | ✓ | ✓ | ✓ (무지개 반사) | ✓ Iron | ✓ | △(리팩터 필요) | **조건부 통과** |

**조건부 통과 이유:**
- R-NEW-008: niche 점수 3점 (화학 응고는 BLAME!/Noita 팬에게는 친숙하나 설명 없이 발견하기 어려움). 첫 발견 시 VFX 신호로 보완 가능. 포함 이유: Shadow 룸의 유일한 "동적 경로 봉쇄" 반응으로 콘텐츠 양산성이 높음.
- R-NEW-010: 기존 코드 동작의 시각화이므로 새 게임플레이보다 discoverability 개선에 가깝다. 포함 이유: 기존 mechanics 의 명확한 시각 신호가 없으면 Spark 룸 설계 의도가 전달 안 됨.
- R-NEW-014: discoverability 낮음 + 시각 신호 약함. 포함 이유: R-NEW-001 의 자동 부산물이며 0 LOC. 제거할 이유가 없음.
- R-NEW-015: Player.ts 리팩터 리스크. 포함 이유: Iron 룸 고유 환경 위험 — Tier 3 배치로 리스크 격리.

---

### 검증 2 — 1차 niche 정렬 점수 합산

| 반응 ID | 점수 |
|:---|:---:|
| R-NEW-001 | 4 |
| R-NEW-002 | 4 |
| R-NEW-003 | 5 |
| R-NEW-004 | 4 |
| R-NEW-005 | 4 |
| R-NEW-006 | 4 |
| R-NEW-007 | 5 |
| R-NEW-008 | 3 |
| R-NEW-009 | 4 |
| R-NEW-010 | 3 |
| R-NEW-011 | 5 |
| R-NEW-012 | 4 |
| R-NEW-013 | 5 |
| R-NEW-014 | 3 |
| R-NEW-015 | 4 |
| **합계** | **61** |
| **평균** | **4.07 / 5** |

> 3.5 기준치를 크게 초과. 시그널 강함. 최저점 3점 반응(R-NEW-008, R-NEW-010, R-NEW-014) 3개도 전체 평균을 끌어내리지 않음.

---

### 검증 3 — 콘텐츠 양산성 (룸 1개에 4-5개 활용 가능한가)

**Forge 룸 예시 (4개 활용):**
1. magma 2×4 풀 중앙 배치
2. WaterBarrel × 2 스폰 (플레이어 투척 가능)
3. OilDrum × 1 옆에 배치
4. 구성: WaterBarrel → magma 굳음(R-NEW-011) + 증기(R-NEW-007) → 굳은 발판 위에 OilDrum → OilDrum 파괴 시 oil → magma 에 발화 → fire chain
그림: "물 폭탄으로 용암을 굳혀 발판 만들기 → 기름통을 넘어뜨려 화재 → 화재로 적 처리"

**Rust 룸 예시 (5개 활용):**
1. acid 3×3 풀
2. ice 발판이 acid 풀 위에 걸쳐 있음
3. water 소스(WaterBarrel × 1) 우측에 배치
4. metal 다리가 acid 풀 위를 가로지름
5. 구성: acid+ice → ice 균열(R-NEW-009) → 다리 녹아 water 생성 → water+acid → 희석(R-NEW-001) → metal 부식 속도 변화(기존 acid+metal) → AcidVial 투척 → MetalCrate 연쇄(R-NEW-012)
그림: "얼음 다리가 산에 녹아내리고, 물이 들어오면 산이 희석되며, 그 틈에 금속이 부식된다"

**두 룸 모두 4-5개 반응을 자연스럽게 조합 가능. 검증 통과.**

---

### 검증 4 — 5색 기질 균형 (Tier 1에 5색 전부 1개씩)

조정된 Tier 1 (7개) 기준:

| 기질 | Tier 1 반응 |
|:---|:---|
| Forge | R-NEW-007 (마그마 수증기 폭발), R-NEW-011 (마그마 굳음 충격) |
| Iron | R-NEW-004 (결빙 기름) |
| Rust | R-NEW-003 (산성 연소), R-NEW-009 (얼음 산성 균열) |
| Spark | R-NEW-005 (전기 기름막 절연) |
| Shadow | R-NEW-002 (기름 부상) |

5색 전부 Tier 1에 최소 1개 이상 분포. **검증 통과.**

---

## 코드 구현 시 주의사항

### TileMutator.tickPassiveInteractions 확장 패턴

신규 passive 반응은 모두 기존 `if/else if (t === TILE_XXX)` 체인에 추가한다. 각 반응이 같은 셀에 중복 발동하지 않도록 `else if` 구조를 유지한다. 단, R-NEW-001 (acid → water) 과 기존 acid 분기(acid + metal, acid + magma)는 같은 `else if (t === TILE_ACID)` 블록 안에 순차 실행 가능 — 서로 다른 이웃 타입을 보기 때문에 충돌 없음.

### tryFreeze 확장 시 originalTile 타입 안전성

`tryFreeze` 내부의 `FrozenState.originalTile` 이 현재 `TILE_WATER || TILE_MAGMA` 만 허용한다고 가정하는 코드가 없으므로 TILE_OIL, TILE_ACID 추가는 안전하다. 단, frozen 오버레이 렌더러가 `originalTile` 로 색상을 결정할 경우 새 타입별 색상 분기 추가 필요.

### applyFireAttack 내 acid 분기 우선순위

현재 `applyFireAttack` 의 우선순위는 `water > ice > flammable`. acid 분기는 water 다음, ice 이전에 삽입 (`acid → 독성 증기` 는 `water → 일반 증기` 보다 약한 우선순위로 처리):

```
water  → steam (prio 3)
acid   → toxic steam (prio 2.5 — 신규)
ice    → melt (prio 2)
other  → ignite (prio 1)
```

이 순서대로 `promote` 함수에 prio 값 추가하면 된다.

---

## 문서 병합 안내 (승인 후)

이 문서가 승인되면 다음 위치에 병합한다:

1. `Documents/System/System_World_TileSystem.md §3.2` 자동 상호작용 표 — 신규 반응 행 추가
2. `Documents/System/System_World_TileSystem.md §3.3` 상호작용 상세 — 각 반응 설명 추가
3. `Documents/System/System_World_TileSystem.md §3.4` VFX 트리거 SSoT — 신규 VFX 이벤트 행 추가
4. `Documents/Design/Design_ItemWorld_Themes.md §2.3` Emergent 상호작용 표 — 5기질 시그니처 emergent 갱신
5. 이 임시 문서 삭제
