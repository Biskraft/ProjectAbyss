# System_World_ChemicalReactions_TestCases.md — 화학 반응 검증 체크리스트

> **목적:** 매트릭스 신규 반응 + 기존 반응을 *어디서 어떻게 검증할지* 단일 페이지 참조용.
> **권위 SSoT:** `System_World_ChemicalReactions.md` / `Design_ChemicalReactions_FullMatrix.md` / `Design_World_ChemicalReactions_Roadmap.md`
> **사용법:** 빌드 후 *각 케이스 체크박스* 하나씩 검증. 실패 시 *기대 vs 실제* 기록.

---

## 0. 권장 테스트 순서

**Day 1 (안전 + 큰 시그널):** §1.1 자동 작동 14개 + §1.2 EgoShard 인챈트 11개
**Day 2 (회귀):** §3 기존 11 반응 회귀 검증
**Day 3 (Scene hook):** §1.3 컨테이너 던지기 8개

각 테스트 = (a) 룸 setup → (b) 트리거 → (c) 기대 결과 비교 → (d) `- [x]` / `- [ ]` 기록.

---

## 1. 신규 반응 — 자동 발동 (코드 구현 완료)

### 1.1 Cell × Cell Passive — 9개

> *룸 셀 setup 만으로 자동 발동*. `tickPassiveInteractions` 1s tick.

- [ ] **R-NEW-001 Exothermic Steam** ⭐ — acid 풀 + water 셀 인접 → `acid → AIR 즉시 소멸 + 일반 steam + vertical steam burst(x 24px / y 64px) + camera shake 2 + 범위 내 entity 데미지 (maxHp × 5% + Burn 5s) + 플레이어/몬스터 상승 impulse + 범위 내 컨테이너 3s steam lift`
- [x] **R-NEW-002 Oil Float** — oil 1칸 + water 1칸 (water 위, oil 아래) → `oil 이 water 위로 swap (8%/s, 12-20s)`
- [x] **R-NEW-007 Steam Burst** ⭐ — water 풀 + magma 풀 인접 → `water → AIR + steam + 인접 magma 1셀 → WALL` (접촉 시 즉시)
- [ ] **R-NEW-008 Oil Acid Coag** — oil 셀 + acid 셀 인접 → `oil → 검정 WALL (sludge)` (~20s, 5%/s)
- [x] **R-NEW-009 Acid Ice Crack** — acid 풀 + ice 다리 인접 → `ice → water` (~12s, 8%/s)
- [ ] **R-NEW-016 Smelt (Forge)** ⭐ — magma 풀 + metal 다리 인접 → `metal → AIR` (~10s, 10%/s)
- [ ] **R-NEW-026 Acid Eats Wood** — acid 풀 + wood 셀 인접 → `wood → AIR` (~25s, 4%/s)
- [ ] **R-NEW-031 Slow Rust** — water 풀 + metal 셀 인접 → `metal → AIR (매우 느림)` (3-5분, 0.5%/s)
- [ ] **R-NEW-032 Wither** — acid 풀 + grass 인접 → `grass → AIR` (~12s, 8%/s)

### 1.2 EgoShard 인챈트 반응 — 11개

> *플레이어 Ego Shard 발사 → 셀 충돌*. 호출처 통합 완료.

**Fire 인챈트:**
- [x] **R-NEW-003 Toxic Acid Flash** — Fire EgoShard × acid 셀 → `acid → AIR + 녹색 PUFF_TINT_TOXIC 증기`
- [ ] **R-NEW-019 Heat Metal (Forge)** ⭐ — Fire × metal 셀 → `metal 유지 + 4s fire overlay (Player 가 위에 서면 DOT)`
- [ ] **R-NEW-020 Magma Surge (Forge)** ⭐ — Fire × magma 셀 → `인접 AIR 셀로 magma 1-tile 확장 (40%/neighbor)`

**Ice 인챈트:**
- [x] **R-NEW-004 Frozen Oil** — Ice × oil 셀 → `oil → 8s WALL (frozen)`
- [ ] **R-NEW-006 Frozen Acid** — Ice × acid 셀 → `acid → 5s WALL`
- [ ] **R-NEW-021 Frozen Steel (Iron)** ⭐ — Ice × metal 셀 → `metal → 15s WALL (originalTile=METAL, Brittle 준비)`

**Thunder 인챈트:**
- [ ] **R-NEW-018 Magma Detonation** ⭐ — Thunder × magma 셀 → `보라색 PUFF_TINT_PLASMA + camera shake 4 + thunder chain`
- [ ] **R-NEW-022 Shatter Pulse** — Thunder × ice 셀 → `ice → AIR + 작은 steam + camera shake 2`

**Physical (sword swing) — ⚠️ Scene hook 미통합:**
- [ ] **R-NEW-030 Chop Wood** — Physical × wood 셀 → `wood → AIR` (applyPhysicalAttack 정의 완료, 호출 미통합)
- [ ] **R-NEW-036 Cut Grass** — Physical × grass 셀 → `grass → AIR`
- [ ] **R-NEW-037 Break Ice** — Physical × ice 셀 → `ice → AIR`

### 1.3 컨테이너 던지기 & 환경 노출 — 8개

**던지기 액션:**
- [x] **R-NEW-011 Impact Solidification** ⭐ — magma 풀 + WaterBarrel 들고 풀 위에 던지기 → `인접 magma (1-tile radius) → WALL + 큰 steam + camera shake 4`
- [ ] **R-NEW-012 Acid Container Chain** — AcidVial + Wood Crate × 3 군집 + AcidVial 던지기 → `2-tile radius 안 컨테이너 acidExposureMs +1000ms 가속 (도미노 파괴)`

**환경 노출 (정지 후 관찰):**
- [ ] **R-NEW-049 Waterlogged Crate** — Wood Crate 를 water 셀 위 + 인접 burning oil → `Crate 불타지 않음 (영구 면역)`
- [ ] **R-NEW-050 Oil-Soaked Crate** — Wood Crate 를 oil 셀 위 + 인접 burning → `Crate 0.5s 만에 즉파 (기존 1.5s 의 1/3)`
- [ ] **R-NEW-051 Frozen Crate** — Wood Crate 를 ice 또는 frozen 셀 위 + 모든 hazard → `환경 카운터 정지 (영구 면역)`
- [ ] **R-NEW-052 Slowly Rusting** — MetalCrate 를 water 셀 위 (방치) → `30s 마다 1 HP, 4 HP × 30s = 2분 후 파괴`
- [ ] **R-NEW-053 Coated Metal** — MetalCrate 를 oil + acid 셀 위 → `acid 부식 1HP/s → 1HP/2s (50% 감속, 8s 후 파괴)`
- [ ] **R-NEW-054 Brittle Crate (env 정지만)** — MetalCrate 를 ice 위 → `환경 카운터 정지` (Physical 1 hit 즉파는 Scene hook 미통합)

### 1.4 emergent 자동 부산물 — 2개

- [x] **R-NEW-013 Surface Ignition** — R-NEW-002 swap 후 oil 가 fire 인챈트 또는 magma 인접 시 → `자동 점화`
- [ ] **R-NEW-014 Metal Gate Corrosion** — R-NEW-001 발열 반응으로 acid → AIR 소멸 시 acid+metal 부식 → `자연 중단 (acid 자체 소멸 → corrode source 0, 인접 metal 부식 조건 false)`

### 1.5 자동 환경 emergent — 4개

> *tryIgnite 안 환경 검사*. 별도 셀 setup 으로 검증.

- [ ] **R-NEW-023 Damp Wood** — water 셀 인접 wood + fire 인챈트 적중 → `wood 점화 안 됨 (water 면역)`
- [ ] **R-NEW-024 Oil-Soaked Wood** — oil 셀 인접 wood + fire 인챈트 → `wood 점화 + burn duration ~25s (기존 15s 의 1.67×)`
- [ ] **R-NEW-027 Oil-Soaked Grass** — oil 셀 인접 grass + fire 인챈트 → `grass 점화 + burn duration ~17s (기존 10s 의 1.67×)`
- [ ] **R-NEW-035 Frost Preservation** — frozen 셀 + fire 인챈트 → `점화 안 됨 (frozen 면역)`
- [ ] **R-NEW-042 Frozen Field** — frozen grass 셀 + fire 인챈트 → `점화 안 됨 (tryIgnite frozen 차단)`

### 1.6 Tier 3 일관성 + 콜백 시각 — 13개

> 후순위 일괄 구현 완료. 시각 검증 위주.

**Passive cell × cell:**
- [ ] **R-NEW-038 Hydration** — water + grass 인접 → `grass 확장 (0.5%/1s, 인접 AIR 셀 → GRASS)`
- [ ] **R-NEW-040 Cold Front** — water + ice 인접 → `water 자기 → freeze (1%/1s, R-002 약한 버전)`
- [ ] **R-NEW-039 Crossover** — burning wood ↔ grass 연쇄 → `이미 R-006 으로 자동 작동, 발견성 검증`

**Ice attack 확장 (tryFreeze 다중 type):**
- [ ] **R-NEW-044 Wood Frost** — Ice EgoShard × wood → `wood → 10s frozen WALL (Iron 임시 발판)`
- [ ] **R-NEW-045 Field Frost** — Ice EgoShard × grass → `grass → 5s frozen WALL`
- [ ] **R-NEW-048 Reinforced Ice** — Ice × ice → ⚠️ 시각만 (코드 변경 없음, gameplay 영향 0)

**Thunder attack 확장 (electric overlay):**
- [ ] **R-NEW-029 Plasma Channel** ⭐ — Thunder × magma → `짧은 magma chain (최대 3 tile) + 인접 conductor 풀로 전이`
- [ ] **R-NEW-043 Frozen Conductor** — Thunder × frozen water/metal/acid → `50% 약화 chain (절반만 lit)`
- [ ] **R-NEW-046 Wooden Static** — Thunder × wood → `1.5s electric overlay 부여 (만료 시 40% 점화)`
- [ ] **R-NEW-047 Grass Static** — Thunder × grass → `1.5s electric overlay`
- [ ] **R-NEW-034 Static Ignition** — wood/grass + electric 만료 → `40% 확률 자연 점화 (R-NEW-046/047 후속)`

**시각 신호 콜백 (VFX 미구현 — 시각만 부족):**
- [x] **R-NEW-005 Oil 절연** — Thunder chain BFS 가 oil 인접 시 `onElectricInsulated(gx, gy)` 콜백 발화 + scene VFX 출력
- [ ] **R-NEW-010 전도 오염** — Thunder chain 이 acid 셀 진입 시 `onElectricAcidPulse(gx, gy)` 콜백 (녹색 tinted arc VFX 추가 필요)

### 1.7 Container × Cell 추가 (Brittle Hit Hook)

- [ ] **R-NEW-054 Brittle Crate Hit** ⭐ — MetalCrate 를 ice/frozen 셀 위에 둔 상태에서 Ego Shard / 검 swing 1 hit → `즉파 (HP 4 무시)`

---

## 2. 회귀 검증 — 기존 반응 (변경 후 작동 유지)

> 본 사이클 변경이 *기존 반응을 깨뜨리지 않았는지* 검증.

### 2.1 Cell × Cell passive (4 기존)

- [ ] **R-001 magma + ice → water** — magma 옆 ice → `4%/1s 멜트 + steam`
- [ ] **R-002 ice + water → freeze** — ice 옆 water → `4%/1s freeze (15s WALL)`
- [ ] **R-003 acid + metal → AIR** — acid 옆 metal → `6%/1s 부식`
- [ ] **R-004 acid + magma → AIR + steam** — acid 옆 magma → `15%/1s acid 증발`

### 2.2 Fire/Ice/Thunder enchant 기존 (3)

- [ ] **R-023 Fire × water → steam** — Fire EgoShard × water → `water → AIR + 흰색 steam`
- [ ] **R-028 Ice × water → freeze** — Ice EgoShard × water → `water → 15s WALL`
- [ ] **R-030 Thunder × conductor** — Thunder × water 풀 → `electric chain BFS 점등`

### 2.3 컨테이너 환경 기존 (3)

- [ ] **R-045 MetalCrate acid 부식** — MetalCrate 를 acid 위 → `1 HP/s × 4 HP = 4s 파괴`
- [ ] **R-047 Wood family magma** — Wood Crate 를 magma 위 → `1.5s 즉파`
- [ ] **R-048 Wood family fire** — Wood Crate 를 burning oil 인접 → `1.5s 즉파`

### 2.4 Magma 영구 fire source 회귀 (2)

- [ ] **R-005 magma → 인접 flammable** — magma 풀 + oil 인접 → `oil 점화 600ms tick 55%`
- [ ] **R-006 burning chain** — burning oil 옆 wood/grass → `연쇄 점화 chain`

---

## 3. 미구현 / 후순위 (남은 4개)

> 본 사이클 외 별도 처리.

- [ ] **R-NEW-015 Ice Oil Slick** — Player.ts 이동 물리 변경 (리그레션 위험으로 보류, 향후 별도 검증 사이클)
- [ ] **R-NEW-025 Oil Coating cell-level** — Container 측은 R-NEW-053 완료, cell-level (metal cell 환경 영향) 만 별도 — gameplay 가치 낮음
- [ ] **R-NEW-028 Heated Metal Acid 가속 (별도 확장)** — tryIgniteOverlayOnly 자동 DOT 는 완료, *fire overlay 위 metal 인접 acid 부식 가속 2×* 분기 별도 (Tier 3)
- [ ] **R-NEW-033 Condensation** — metal+ice water droplet 잔존 (FluidResidueManager water type 미지원, 새 type 추가 필요)
- [ ] **R-NEW-048 Reinforced Ice** — Ice × ice 자기 강화 (시각만, gameplay 영향 0)

---

## 4. 테스트 룸 setup 가이드 (LDtk IntGrid 셀 배치 매크로)

> 위 검증 시 *재사용 가능한 룸 패턴* 5종.

### 4.1 Forge_Test_Room (R-NEW-007/011/016/018/019/020 검증)

```
배치:
- magma 2×2 풀 (중앙)
- water 1×4 풀 (좌측, magma 인접)
- metal 1×2 다리 (magma 위 가로)
- WaterBarrel 1 (스폰 — 플레이어 던지기용)
- OilDrum 1 (우측, magma 와 1칸 거리)
```

검증:
1. *방치* → R-NEW-007 (water+magma steam burst) + R-NEW-016 (magma+metal smelt) 자동 발동
2. *forge 무기 fire enchant + magma 명중* → R-NEW-020 Surge / R-NEW-019 Heat Metal
3. *forge 무기 thunder enchant + magma 명중* → R-NEW-018 Detonation
4. *WaterBarrel 던져 magma 풀 위* → R-NEW-011 Impact Solidification

### 4.2 Rust_Test_Room (R-NEW-003/006/009/026/032 검증)

```
- acid 3×3 풀 (중앙)
- ice 1×3 다리 (acid 옆)
- wood 셀 × 2 (acid 옆)
- grass 셀 × 2 (acid 옆)
- AcidVial × 3 군집 (우측 발판)
```

검증:
1. *방치* → R-NEW-009 (acid+ice melt) / R-NEW-026 (acid eat wood) / R-NEW-032 (wither)
2. *fire enchant × acid* → R-NEW-003 Toxic Flash
3. *ice enchant × acid* → R-NEW-006 Frozen Acid
4. *AcidVial 1 던지기* → R-NEW-012 도미노 (다른 AcidVial 가속)

### 4.3 Iron_Test_Room (R-NEW-017/021/049-054 검증)

```
- ice 2×4 발판
- water 풀 (좌측)
- oil 풀 (우측)
- Wood Crate × 3 (각각 water/oil/ice 위)
- MetalCrate × 2 (water/acid 위)
```

검증:
1. *방치* → R-NEW-049 (Waterlogged 면역) / R-NEW-050 (Oil-Soaked 0.5s) / R-NEW-051 (Frozen 면역) / R-NEW-052 (Slowly Rust)
2. *ice enchant × metal cell* → R-NEW-021 Frozen Steel → (Brittle 검증은 Phase B 후)

### 4.4 Spark_Test_Room (R-NEW-018/022 검증)

```
- water 풀 5×2 (전도 chain 검증용)
- metal 다리 (water 위 가로)
- ice 셀 3개 (단독 배치)
- magma 1×1 (단독)
```

검증:
1. *thunder × water* → R-030 회귀 (chain)
2. *thunder × ice* → R-NEW-022 Shatter Pulse (ice → AIR)
3. *thunder × magma* → R-NEW-018 Detonation

### 4.5 Shadow_Test_Room (R-NEW-002/008 검증)

```
- oil 풀 3×2 (상단)
- water 풀 3×2 (oil 아래 — swap 검증용)
- oil 풀 인접 acid 풀 (sludge 검증)
```

검증:
1. *방치* → R-NEW-002 Oil Float (oil 가 water 위로 swap) → R-NEW-013 emergent (fire 인챈트 시 수면 발화)
2. *방치* → R-NEW-008 Oil Acid Sludge (oil → WALL)

---

## 5. 검증 결과 기록 양식

각 케이스 실패 시 다음 양식으로 기록:

```
ID: R-NEW-XXX
룸: {Forge/Rust/Iron/Spark/Shadow}_Test_Room
기대: <위 표의 "기대 결과">
실제: <관찰 결과>
재현: <100% / 간헐적 / 0%>
스크린샷: <path or screenshot key>
원인 추정: <코드 분기 또는 시각 누락>
```

---

## 6. 빌드 + 검증 체크리스트

- [ ] `/build` 0 에러
- [ ] `/deploy` 또는 `npm run dev` 후 게임 진입
- [ ] forge 무기로 아이템계 다이브
- [ ] §1.1 자동 작동 9개 — 룸 setup 후 1-2분 관찰
- [ ] §1.2 EgoShard 11개 — forge/iron/rust/spark 무기로 시도
- [ ] §1.3 컨테이너 던지기 8개 — Forge/Iron/Rust 룸
- [ ] §1.5 환경 emergent 4개
- [ ] §2 회귀 11개
- [ ] 실패 케이스 §5 양식으로 기록
- [ ] *후속 작업 우선순위* 결정

---

## 7. 외부 의존 / 자산 부족 시 검증 제한

다음 자산 부족 시 *시각 검증 제한* (코드 작동 자체는 검증 가능):

- Acid green smoke 자산 (R-NEW-003) — 현재 PUFF_TINT_TOXIC color 만, 입자 텍스처 없음 → *연두색 fade* 만 확인
- Plasma purple 자산 (R-NEW-018) — 현재 PUFF_TINT_PLASMA color 만 → *보라색 fade* 확인
- Frozen oil/acid/metal 색상 (`#2A3A40` / `#3A7A6A` / `#3a4868`) — renderer 측 originalTile 분기 미통합 시 *기존 frozen 색* 으로 표시될 수 있음 (별도 후속)
- Sludge WALL sprite (`#1A1208`) — 현재 일반 WALL 톤. 시각 차별 미적용
