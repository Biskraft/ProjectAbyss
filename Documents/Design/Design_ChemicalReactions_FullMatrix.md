# Design_ChemicalReactions_FullMatrix.md — 화학 반응 전체 매트릭스 (1차 빌드)

> **상태:** V1 매트릭스 빌드 (2026-05-16) — 부재 칸 채움 디자인 후보 1줄씩
> **권위 SSoT:** `Documents/System/System_World_ChemicalReactions.md` (기존 54 반응) + 본 문서 (확장 매트릭스 + 부재 채움 후보)
> **다음 단계:** 이 매트릭스에서 *우선순위 높은 후보* 만 12 필드 깊은 명세 (Agent C 패턴) → Roadmap.md 의 Tier 1/2/3 갱신

> **목적:** 무반응 셀이 너무 많음을 식별 + 각 무반응 칸에 *맥락 + fun + gameplay* 가 있는 디자인 후보 1줄. 깊은 검증·구현 명세는 후속.

---

## 1. 매트릭스 정의

### 1.1 TILE 그룹화

ECHORIS 의 IntGrid 16 종 중 *화학 상호작용 가능* 한 8 종을 1차 매트릭스 축으로:

| 그룹 | TILE | 값 | 역할 |
| :--- | :--- | :-: | :--- |
| **Fluid** | water / magma / oil / acid | 2/6/11/13 | dynamic FluidSystem |
| **Flammable Solid** | wood / grass | 15/16 | TileMutator.tryIgnite |
| **Material** | metal / ice | 12/7 | acid 부식 / freeze base |

*air(0)/wall(1)/breakable(9)* 는 *반응의 결과* 또는 *target* 으로 등장. *platform(3)/updraft(4)/spike(5)/charged(8)/void(10)* 는 매트릭스 축 제외 (특수 역할).

### 1.2 매트릭스 4종

| # | 매트릭스 | 차원 | cell 수 |
| :-: | :--- | :--- | :-: |
| 1 | Tile × Tile (Passive Interaction) | 8 × 8 | 64 (self 8 제외 = 56) |
| 2 | Tile × Overlay (fire/electric/frozen) | 8 × 3 | 24 |
| 3 | Tile × Attack Enchant (Fire/Ice/Thunder/Physical) | 8 × 4 | 32 |
| 4 | Container × Tile (Wood family + MetalCrate × 8) | 2 × 8 | 16 |
| | **합계** | | **128** |

### 1.3 셀 표기 규약

- ✅ R-NNN — 코드에 *정의된* 반응 (System_World_ChemicalReactions.md §4-§6)
- 🆕 R-NEW-NNN — Agent C 가 *제안한* 신규 반응 (Roadmap §2)
- ⚪ **새 후보 +** 1-2줄 디자인 후보 (본 문서 신설)
- ⬛ — *의도된 미반응* (디자인 거절 — 1차 niche 시그널 약화 / 시각 표현 불가)
- ◻ self — 자기 자신과 반응 안 함

---

## 2. 통합 시각 매트릭스 (Visual Summary)

> *4 매트릭스 한 페이지 시각화*. 각 셀의 짧은 키워드만 표시 — 자세한 설명은 §3-§6 참조.

### 2.1 매트릭스 1 — Tile × Tile (Passive Interaction, 8×8)

> *A 셀이 트리거, B 는 인접 셀.* `TileMutator.tickPassiveInteractions` 1s tick.

| A↓ \ B→ | water | magma | oil | acid | wood | grass | metal | ice |
| :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| **water** | — | 🆕 폭발+굳음 | 🆕 부상 | 🆕 **발열증기** | ⚪ 적심 | ⚪ 성장 | ⚪ 녹 | ⚪ 결빙 |
| **magma** | 🆕 폭발+굳음 | — | ✅ 점화 | ✅ 증기 | ✅ 점화 | ✅ 점화 | ⚪ **용해** | ✅ 멜트 |
| **oil** | 🆕 부상 | ✅ 점화 | — | 🆕 응고 | ⚪ 가연↑ | ⚪ 가연↑ | ⚪ 막 형성 | 🆕 결빙 |
| **acid** | 🆕 **발열증기** | ✅ 증기 | 🆕 응고 | — | ⚪ 부식 | ⚪ 시듦 | ✅ 부식 | 🆕 균열 |
| **wood** | ⚪ 적심 | ✅ 점화 | ⚪ 가연↑ | ⚪ 부식 | — | ✅ 전파 | ⬛ | ⬛ |
| **grass** | ⚪ 성장 | ✅ 점화 | ⚪ 가연↑ | ⚪ 시듦 | ✅ 전파 | — | ⬛ | ⬛ |
| **metal** | ⚪ 녹 | ⚪ **용해** | ⚪ 막 형성 | ✅ 부식 | ⬛ | ⬛ | — | ⚪ 응결수 |
| **ice** | ✅ 결빙 | ✅ 멜트 | 🆕 결빙 | 🆕 균열 | ⬛ | ⬛ | ⚪ 응결수 | — |

### 2.2 매트릭스 2 — Tile × Overlay (8×3)

> *overlay 가 cell 위에 덮인 상태*. fire = burning state, electric = thunder pulse, frozen = temporary WALL.

| Tile \ Overlay | fire (burning) | electric | frozen |
| :-: | :-: | :-: | :-: |
| **water** | ✅ →AIR+steam | ✅ chain | ✅ freeze WALL |
| **magma** | — (self) | ⚪ Plasma chain | ✅ freeze WALL |
| **oil** | ✅ ignite | 🆕 절연 | 🆕 frozen |
| **acid** | 🆕 toxic steam | ✅ chain | 🆕 frozen |
| **wood** | ✅ burn | ⚪ 지연 점화 | ⚪ 점화 면역 |
| **grass** | ✅ burn | ⚪ 미끄럼 무효 | ⚪ 점화 면역 |
| **metal** | ⚪ 발열 DOT | ✅ chain | ⚪ **취약화 1hit** |
| **ice** | ✅ melt→water | ⚪ 약전도 50% | — (self) |

### 2.3 매트릭스 3 — Tile × Attack Enchant (8×4)

> *enchant 가 cell 에 적중*. Fire/Ice/Thunder = element. Physical = 일반 검 swing.

| Tile \ Attack | Fire | Ice | Thunder | Physical |
| :-: | :-: | :-: | :-: | :-: |
| **water** | ✅ →AIR+steam | ✅ freeze 15s | ✅ chain | ⬛ |
| **magma** | ⚪ **확장 1tile** | ✅ freeze 15s | ⚪ **격발 50%** | ⬛ |
| **oil** | ✅ ignite | 🆕 freeze 8s | 🆕 절연 | ⬛ |
| **acid** | 🆕 toxic | 🆕 freeze 5s | ✅ chain | ⬛ |
| **wood** | ✅ ignite | ⚪ frozen 10s | ⚪ 1.5s static | ⚪ **부숨** |
| **grass** | ✅ ignite | ⚪ frozen 5s | ⚪ static | ⚪ 베기+보상 |
| **metal** | ⚪ **가열 4s** | ⚪ **결빙+취약** | ✅ chain | ⬛ |
| **ice** | ✅ melt | ⚪ 강화 +5s | ⚪ **격발 30%** | ⚪ 부숨 |

### 2.4 매트릭스 4 — Container × Tile (환경 노출, 2×8)

> *컨테이너가 셀 위에 위치할 때의 환경 누적 효과*. `ThrowableContainer.tickEnvironment`.

| Container \ Tile | water | magma | oil | acid | wood | grass | metal | ice |
| :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| **Wood family** | ⚪ 방수 (fire 면역) | ✅ 1.5s 즉파 | ⚪ fire 0.5s 즉파 | ✅ 3s 즉파 | ⬛ | ⬛ | ⬛ | ⚪ 환경 면역 |
| **MetalCrate** | ⚪ 녹 1HP/30s | ✅ 2s 즉파 | ⚪ 부식 50% 감속 | ✅ 4s (1HP/s) | ⬛ | ⬛ | ⬛ | ⚪ **1hit 즉파** |

### 2.5 범례 + 합산

| 기호 | 의미 |
| :-: | :-- |
| ✅ | 코드에 정의됨 (System_World_ChemicalReactions.md §4-§6) |
| 🆕 | Agent C 제안 R-NEW-001~015 (Roadmap.md) |
| ⚪ | 본 매트릭스 신규 후보 (§3-§6 부재 채움) |
| **굵게** | 5/5/5 강력 후보 (Tier 1) |
| ⬛ | 거절 (시각/gameplay 정당화 불가) |
| — | self (자기 자신과 반응 안 함) |

| 매트릭스 | 정의 (✅+🆕) | 신규 (⚪) | 거절 (⬛) | self (—) | 합 |
| :-- | :-: | :-: | :-: | :-: | :-: |
| M1 | 14 | 12 | 4 | 8 | 64 |
| M2 | 10 | 8 | 0 | 2 | 24 |
| M3 | 10 | 13 | 5 | 0 | 32 |
| M4 | 4 | 6 | 6 | 0 | 16 |
| **합계** | **38** | **39** | **15** | **10** | **128** |

---

## 3. 매트릭스 1 — Tile × Tile (Passive Interaction)

> **트리거:** `TileMutator.tickPassiveInteractions` (`AUTO_INTERACT_INTERVAL_MS = 1000ms`)
> **비대칭:** A→B 와 B→A 가 다를 수 있음 — 표는 *A 가 트리거* 기준

### 3.1 매트릭스 표

| A↓ \ B→ | **water** | **magma** | **oil** | **acid** | **wood** | **grass** | **metal** | **ice** |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **water** | ◻ | 🆕 R-NEW-007 | 🆕 R-NEW-002 | 🆕 R-NEW-001 희석/발열증기 | ⚪ **물 흡수** | ⚪ **수분 공급** | ⚪ **느린 녹** | ⚪ **자연 결빙** |
| **magma** | (R-NEW-007 양방) | ◻ | ✅ R-005 | ✅ R-004 | ✅ R-005 | ✅ R-005 | ⚪ **용해** | ✅ R-001 |
| **oil** | (R-NEW-002 양방) | (R-005 ↔) | ◻ | 🆕 R-NEW-008 | ⚪ **흡수 가연** | ⚪ **흡수 가연** | ⚪ **막 형성** | 🆕 R-NEW-004 |
| **acid** | (R-NEW-001 희석/발열증기 ↔) | ✅ R-004 | (R-NEW-008 ↔) | ◻ | ⚪ **wood 부식** | ⚪ **grass 시듦** | ✅ R-003 | 🆕 R-NEW-009 |
| **wood** | (water+wood ↔) | (magma+wood ↔) | (oil+wood ↔) | (acid+wood ↔) | ◻ | ⚪ **간접 점화** | ⬛ | ⬛ |
| **grass** | (water+grass ↔) | (magma+grass ↔) | (oil+grass ↔) | (acid+grass ↔) | (wood+grass ↔) | ◻ | ⬛ | ⬛ |
| **metal** | (water+metal ↔) | (magma+metal ↔) | (oil+metal ↔) | (acid+metal ↔) | ⬛ | ⬛ | ◻ | ⚪ **응결수** |
| **ice** | ✅ R-002 | (R-001 ↔) | (oil+ice ↔) | (acid+ice ↔) | ⬛ | ⬛ | (metal+ice ↔) | ◻ |

### 3.2 부재 칸 채움 — 신규 후보 (각 한 줄)

> **점수 표기:** `niche 정렬 (1-5) / fun (1-5) / gameplay 깊이 (1-5)` — 우선순위 환산용.

**water 행 (4 신규):**

- ⚪ **water + wood = 물 흡수 (Damp Wood)** — wood 셀이 water 인접 시 *발화 면역 상태* (burning chance 0). 발화된 wood 가 water 인접하면 *진압 → AIR* (4%/1s). **3/4/5** — *Sekiro 풀 진압* 메커닉, Iron 룸의 *방어 setup*.
- ⚪ **water + grass = 수분 공급 (Hydration)** — grass 셀이 water 인접 시 *시간 경과로 추가 grass 확장* (1 cell, 30%/30s). Phase 4 생태계 시드. **2/3/3** — *Made in Abyss 의 자연 회복* 톤. 데모 우선순위 낮음.
- ⚪ **water + metal = 느린 녹 (Slow Rust)** — metal 셀이 water 인접 시 *0.5%/1s → AIR* 부식. acid 보다 12× 느림. **3/3/4** — *시간 부담 적은 환경 변형*. 보스방 출구 막힘 같은 *느린 압박*.
- ⚪ **water + ice = 자연 결빙 (Cold Front)** — water 셀이 *frozen overlay 인접* 시 자기 자신도 frozen (1%/1s, 기존 R-002 의 약한 버전). **3/3/3** — ice 영역 점진 확장. 데모 우선순위 낮음.

**magma 행 (1 신규):**

- ⚪ **magma + metal = 용해 (Smelt)** — metal 셀이 magma 인접 시 *AIR* (10%/1s, acid 부식보다 빠름). 시각: 녹은 metal 적색 빛. **5/5/5** — *BLAME! 의 거대 시설 용해 사고* 시그널. Forge 룸의 *길 트기* 도구. **Tier 1 강력 후보**.

**oil 행 (3 신규):**

- ⚪ **oil + wood = 흡수 가연 (Oil-Soaked Wood)** — wood 셀이 oil 인접 시 `tryIgnite` chance 0.30 → 0.60 + burn duration 15000 → 25000ms. **4/4/5** — *Sekiro 의 기름 흡수 무기*. Shadow 룸의 *느린 함정*.
- ⚪ **oil + grass = 흡수 가연 (Oil-Soaked Grass)** — grass 점화 chance 0.85 → 1.00 + burn duration 10000 → 18000ms. **4/4/4** — wood 유사.
- ⚪ **oil + metal = 막 형성 (Oil Coating)** — metal 셀이 oil 인접 시 *water 녹 면역* + *acid 부식 50% 감속*. 동시에 *fire 노출 시 oil 막 점화 → metal 가열 DOT*. **4/4/5** — *방어 vs 가연* 트레이드오프. Iron+Shadow 교차.

**acid 행 (2 신규):**

- ⚪ **acid + wood = 부식 (Acid Eats Wood)** — wood 셀이 acid 인접 시 *AIR* (4%/1s, 5s 만에 부식). **4/4/4** — *Made in Abyss 의 부식 시설*. Rust 룸 confined.
- ⚪ **acid + grass = 시듦 (Wither)** — grass → AIR (8%/1s, 빠른 시듦). **3/4/3** — 시각 임팩트만, 게임플레이 영향 작음.

**metal 행 (1 신규):**

- ⚪ **metal + ice = 응결수 (Condensation)** — metal 셀이 ice 인접 시 *small water droplet 잔존* (FluidResidueManager 'water' 타입 신규 — 0.2 cell 정도). Player 이동속도 -10% (얼음 미끄러움 없는데도). **3/3/4** — *물리적 디테일*, Iron 룸의 미세 위험.

**wood/grass 행 (1 신규, 1 거절):**

- ⚪ **wood + grass = 간접 점화 (Crossover Ignition)** — burning wood 가 인접 grass 점화 chance 0.85 (기존 R-006 와 동일, 명시화). 기존 코드 동작이지만 *명시적 행 추가*. **3/3/3** — 디자인 검증 / 발견성.
- ⬛ wood + metal / wood + ice / grass + metal / grass + ice — *직접 반응 없음*. wood/grass 가 solid 솔리드 이므로 metal/ice 와 인접해도 자연 반응 부재. **거절** (시각 표현 불가, gameplay 영향 0).

**거절 칸 4개 (⬛):** wood+metal, wood+ice, grass+metal, grass+ice — 시각/gameplay 정당화 불가.

### 3.3 매트릭스 1 통계

- 정의 셀 (✅ + 🆕): 14
- 신규 후보 (⚪): 12
- 거절 (⬛): 4
- self (◻): 8
- 대칭 중복 제거 후 *고유 채움 칸*: 11
- **부재 채움 완료율 = (14 + 12) / (14 + 12 + 4) = 26 / 30 = 87%**

---

## 4. 매트릭스 2 — Tile × Overlay (fire/electric/frozen)

### 4.1 매트릭스 표

| Tile \ Overlay | **fire (burning)** | **electric** | **frozen** |
| :--- | :--- | :--- | :--- |
| **water** | ✅ R-023 (attack only) | ✅ R-030 | ✅ R-002 + R-028 |
| **magma** | ◻ (self) | ⚪ **magma 도체** | ✅ R-029 |
| **oil** | ✅ R-005/R-006/R-025 | 🆕 R-NEW-005 (insulate) | 🆕 R-NEW-004 (frozen) |
| **acid** | 🆕 R-NEW-003 (toxic) | ✅ R-030 | 🆕 R-NEW-006 (frozen) |
| **wood** | ✅ R-025 (점화) | ⚪ **정전기 점화** | ⚪ **wood 보존** |
| **grass** | ✅ R-025 (점화) | ⚪ **grass 정전기** | ⚪ **grass 보존** |
| **metal** | ⚪ **metal 발열** | ✅ R-030 (도체) | ⚪ **취약화 결빙** |
| **ice** | ✅ R-024 (멜트) | ⚪ **ice 약전도** | ◻ (self) |

### 4.2 부재 칸 채움 (10 신규)

- ⚪ **magma + electric = 마그마 도체 (Plasma Channel)** — magma 셀이 *electric overlay* 받음 (현재 isConductor 미포함). 짧은 chain (3 cells 한도). 시각: 보라 + 적 plasma. **3/4/4** — *Noita 의 플라즈마*, Spark+Forge 교차.
- ⚪ **wood + electric = 정전기 점화 (Static Ignition)** — burning electric overlay 가 wood 셀에 닿으면 *2.5s electric 지속 후* tryIgnite (chance 0.40). 즉발 아닌 *지연 점화*. **4/4/4** — *환경 트랩* 다층 setup.
- ⚪ **grass + electric = grass 정전기 (Field Charge)** — grass 위 electric overlay 시 *Player 미끄러짐 무효 + 이동속도 -20%* (정전기). **3/3/3** — 시각 강조.
- ⚪ **wood + frozen = wood 보존 (Frost Preservation)** — frozen wood 는 *점화 면역* + frozen 만료 시 정상 wood 로 복원. **3/3/4** — Iron 룸의 *시간 차단* 도구.
- ⚪ **grass + frozen = grass 보존 (Frozen Field)** — 동일 패턴, 점화 면역. **2/3/3** — 일관성 채움.
- ⚪ **metal + fire = metal 발열 (Heated Metal)** — metal 셀이 fire overlay 인접 시 *DOT 1%/1s* (Player 가 metal 위에 있을 때만). 또한 *acid 부식 가속 2×*. **4/4/5** — *Dark Souls 의 가열 발판*, Forge 룸 핵심.
- ⚪ **metal + frozen = 취약화 결빙 (Brittle Metal)** — frozen metal 은 *Physical attack 1회 → AIR* (BREAKABLE 처럼). 단 frozen 만료 후 복원. **5/5/5** — *Sekiro 의 부서지기 쉬운 빙결*, **Tier 1 강력 후보**.
- ⚪ **ice + electric = ice 약전도 (Frozen Conductor)** — frozen 셀이 *electric chain 의 약한 도체* (50% 약화). 시각: 청록 빛. **3/3/3** — 일관성.

### 4.3 매트릭스 2 통계

- 정의 셀: 10
- 신규 후보 (⚪): 8
- self (◻): 2
- **부재 채움 완료율 = (10 + 8) / 24 = 75%**

---

## 5. 매트릭스 3 — Tile × Attack Enchant

### 5.1 매트릭스 표

| Tile \ Attack | **Fire** | **Ice** | **Thunder** | **Physical** |
| :--- | :--- | :--- | :--- | :--- |
| **water** | ✅ R-023 (→AIR+steam) | ✅ R-028 (freeze) | ✅ R-030 (chain) | ⬛ |
| **magma** | ⚪ **자극 확장** | ✅ R-029 (freeze) | ⚪ **magma 격발** | ⬛ |
| **oil** | ✅ R-025 (ignite) | 🆕 R-NEW-004 | 🆕 R-NEW-005 (insulate) | ⬛ |
| **acid** | 🆕 R-NEW-003 (toxic) | 🆕 R-NEW-006 | ✅ R-030 (chain) | ⬛ |
| **wood** | ✅ R-025 | ⚪ **wood 결빙** | ⚪ **wood 정전기** | ⚪ **wood 부숨** |
| **grass** | ✅ R-025 | ⚪ **grass 결빙** | ⚪ **grass 정전기** | ⚪ **grass 베기** |
| **metal** | ⚪ **metal 가열** | ⚪ **metal 결빙** | ✅ R-030 (chain) | ⬛ |
| **ice** | ✅ R-024 (멜트) | ⚪ **ice 강화** | ⚪ **ice 격발** | ⚪ **ice 부숨** |

### 5.2 부재 칸 채움 (10 신규)

- ⚪ **Fire × magma = 자극 확장 (Magma Surge)** — magma 셀에 Fire 적중 시 *1-tile radius magma 확장* (인접 AIR 셀로). 디자이너의 *경로 동적 확장*. **4/5/5** — Forge 무기의 *지형 무기화*. **Tier 1 강력 후보**.
- ⚪ **Thunder × magma = magma 격발 (Magma Detonation)** — magma + Thunder = *2-tile radius 충격파 + 인접 entity 50% maxHp* (THUNDER_HIT_PCT 와 동일). 시각: 폭발. **5/5/5** — *Noita 의 폭발 magma*. 데모 *주요 와우 모먼트*.
- ⚪ **Ice × wood = wood 결빙 (Wood Frost)** — wood → frozen WALL (10s). 점화 면역 + 통행. **3/3/4** — Iron 무기의 *임시 발판*.
- ⚪ **Thunder × wood = wood 정전기 (Wooden Static)** — wood 가 electric 1.5s 보유 (점화 안 됨, *charged 펄스만*). **3/3/3** — 변형 trap.
- ⚪ **Physical × wood = wood 부숨 (Chop Wood)** — wood → AIR 1 hit. *대장간 톤*, 자연. **4/4/5** — *Hollow Knight 의 부수기 가능 wood*. **Tier 1 후보**.
- ⚪ **Ice × grass = grass 결빙 (Field Frost)** — grass → frozen WALL (5s). 시각만, 짧음. **2/3/3** — 일관성 채움.
- ⚪ **Thunder × grass = grass 정전기** — 위 wood 패턴 동일, 작용 다름. **2/3/3** — 일관성.
- ⚪ **Physical × grass = grass 베기 (Cut Grass)** — grass → AIR 1 hit. 보상: 소량 골드/씨앗. **3/4/4** — *Zelda 의 grass 베기*. 일상감.
- ⚪ **Fire × metal = metal 가열 (Heat Metal)** — metal 셀 → 4s 동안 *fire overlay* 부여 (셀은 metal 유지). 위에 있는 entity DOT + acid 부식 가속. **5/5/5** — *DnD 의 가열 무기*. **Tier 1 강력 후보**.
- ⚪ **Ice × metal = metal 결빙 (Frozen Steel)** — metal → frozen + 매트릭스 2 의 *취약화 결빙* (Physical 1 hit). **4/4/5** — *Sekiro 의 빙결 분쇄*. **Tier 1 후보**.
- ⚪ **Ice × ice = ice 강화 (Reinforced Ice)** — ice 셀에 Ice 재타격 시 *지속 +5s* + *Physical 면역 5s*. **3/3/4** — Iron 무기의 자기 강화.
- ⚪ **Thunder × ice = ice 격발 (Shatter Pulse)** — ice + Thunder = 즉시 ice → AIR + 인접 entity 30% maxHp 한방. **4/4/5** — *얼음 폭발*, 환경 무기화.
- ⚪ **Physical × ice = ice 부숨 (Break Ice)** — ice → AIR 1 hit (BREAKABLE 처럼). **3/4/4** — 일관성, *Zelda 의 얼음 부수기*.

**거절 (⬛):** Physical × water/magma/oil/acid/metal — fluid/metal 은 검으로 안 부서짐 (직관 반대). Physical × fluid 는 의미 없음.

### 5.3 매트릭스 3 통계

- 정의 셀: 10
- 신규 후보 (⚪): 13
- 거절 (⬛): 5 (Physical × fluid/metal)
- **부재 채움 완료율 = (10 + 13) / (10 + 13 + 5) = 82%**

---

## 6. 매트릭스 4 — Container × Tile (환경 노출)

### 6.1 매트릭스 표

| Container \ Tile | **water** | **magma** | **oil** | **acid** | **wood** | **grass** | **metal** | **ice** |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Wood family** | ⚪ **방수** | ✅ R-047 (1.5s) | ⚪ **흡수** | ✅ R-049 (3s) | ⬛ | ⬛ | ⬛ | ⚪ **결빙 보존** |
| **MetalCrate** | ⚪ **녹** | ✅ R-046 (2s) | ⚪ **막 형성** | ✅ R-045 (4s) | ⬛ | ⬛ | ⬛ | ⚪ **취약화** |

### 6.2 부재 칸 채움 (8 신규)

- ⚪ **Wood + water = 방수 (Waterlogged Crate)** — water 셀 위 wood crate 가 *fire 노출 면역* (1.5s threshold 무한 연장). **4/4/5** — Iron+Shadow 교차, *전략 방어*.
- ⚪ **Wood + oil = 흡수 가연 (Oil-Soaked Crate)** — oil 셀 위 wood crate 가 *fire 노출 0.5s → 즉파* (1.5s → 0.5s). **4/4/5** — *고위험 setup* (디스가이아 야리코미 사슬).
- ⚪ **Wood + ice = 결빙 보존 (Frozen Crate)** — ice 또는 frozen overlay 셀 위 wood crate 가 *모든 환경 노출 정지* (acid/magma/fire 카운터 0 고정). **3/3/4** — Iron 룸의 영구 안전 발판.
- ⚪ **MetalCrate + water = 녹 (Slowly Rusting)** — water 셀 위 MetalCrate 가 *4 HP 중 1 HP* 잃음 (30s 후). 4/4 → 3/4. **3/3/3** — 장기 도전.
- ⚪ **MetalCrate + oil = 막 형성 (Coated Metal)** — oil 셀 위 MetalCrate 가 *acid 부식 50% 감속* (4s → 8s). **3/4/4** — 자기 강화 setup.
- ⚪ **MetalCrate + ice = 취약화 (Brittle Metal)** — ice 또는 frozen 셀 위 MetalCrate 가 *Physical 1 hit 즉파* (4 HP → 1 hit). **5/5/5** — *Sekiro 빙결 분쇄*, Tier 1 강력.

**거절 (⬛):** wood crate × wood / grass / metal — *솔리드 동위* 충돌 없음.

### 6.3 매트릭스 4 통계

- 정의 셀: 4
- 신규 후보 (⚪): 6
- 거절 (⬛): 6
- **부재 채움 완료율 = (4 + 6) / (4 + 6 + 6) = 63%**

---

## 7. 종합 통계

| 매트릭스 | 정의 (✅ + 🆕) | 신규 (⚪) | 거절 (⬛) | self (◻) | 채움률 |
| :--- | :-: | :-: | :-: | :-: | :-: |
| 1. Tile × Tile | 14 | 12 | 4 | 8 | 87% |
| 2. Tile × Overlay | 10 | 8 | 0 | 2 | 75% |
| 3. Tile × Attack | 10 | 13 | 5 | 0 | 82% |
| 4. Container × Tile | 4 | 6 | 6 | 0 | 63% |
| **합계** | **38** | **39** | **15** | **10** | **80%** |

**핵심 발견:**

- **기존 정의 38 + 신규 후보 39 = 77 반응** — 매트릭스를 *2배* 확장. Agent C 의 15개 (이미 매트릭스에 🆕 표시) 외 *24 추가 후보* 신설.
- **거절 15** — 시각/gameplay 정당화 불가로 의식적 배제 (대부분 solid solid 또는 Physical × fluid).
- **채움률 80%** — 무반응 비율이 5분의 1 수준으로 감소.

---

## 8. 우선순위 — Tier 1 강력 후보 (니치 5/5)

본 매트릭스에서 *5/5/5 또는 5/5/4* 평가받은 *Tier 1 후보 8개*:

| ID | 반응 | 위치 | 5색 매핑 |
| :-: | :--- | :--- | :-: |
| ⚪ M1-magma+metal | **용해 (Smelt)** | 매트릭스 1 | Forge |
| ⚪ M2-metal+frozen | **취약화 결빙 (Brittle Metal)** | 매트릭스 2 | Iron |
| ⚪ M3-Fire+magma | **자극 확장 (Magma Surge)** | 매트릭스 3 | Forge |
| ⚪ M3-Thunder+magma | **magma 격발 (Detonation)** | 매트릭스 3 | Forge+Spark |
| ⚪ M3-Fire+metal | **metal 가열 (Heat Metal)** | 매트릭스 3 | Forge+Iron |
| ⚪ M3-Ice+metal | **metal 결빙 (Frozen Steel)** | 매트릭스 3 | Iron |
| ⚪ M3-Physical+wood | **wood 부숨 (Chop)** | 매트릭스 3 | (탐험) |
| ⚪ M4-MetalCrate+ice | **취약화 (Brittle Container)** | 매트릭스 4 | Iron |

이 8 후보는 *기존 Agent C Tier 1 (7개)* 외 *추가* 강력 후보. **사용자 컨펌 후** 깊은 12 필드 명세 (Agent C 패턴) 작성 + Roadmap.md Tier 1 갱신 가능.

---

## 9. 다음 단계

1. **사용자 검토** — 매트릭스 + ⚪ 신규 후보 39개 + 거절 15개 + Tier 1 강력 후보 8개에 대한 채택/조정 의견
2. **승인 후 깊은 명세** — 채택된 후보별 12 필드 명세 (Agent C 의 R-NEW-001~015 패턴 동일) → Roadmap.md 의 Tier 1/2/3 갱신
3. **System_World_ChemicalReactions.md §4-§6 표 확장** — 채택된 신규 ID 부여 (R-NEW-016 부터 연속)
4. **Design_ItemWorld_Themes.md §2.3** — 새 emergent 추가 시 5 테마 시그니처 갱신
5. **gdd-integrity-checker §16** — 신규 반응 ID 자동 검증 룰 갱신

---

## 10. 디자인 가이드 — 매트릭스 채움 원칙

본 매트릭스의 ⚪ 칸을 채울 때 사용한 *판단 기준* (후속 매트릭스 빌드에도 적용):

1. **niche 정렬:** BLAME!/Made in Abyss (거대 시설 + 정적 위협) + Noita (cell-based emergent) + Sekiro/Hollow Knight (환경 무기화). 4 톤 중 *2 톤 이상* 충족해야 채택.
2. **fun:** 첫 발견 시 *놀라움* + 의도 활용 시 *전략적 만족*. *예측 가능한 평범한 반응* (예: water가 wood를 단순 적심) 은 fun 점수 낮음 → 보류.
3. **gameplay 깊이:** 디자이너가 *룸 안 4-5개 활용* 가능한가? *체인* 으로 다른 반응과 결합 가능한가?
4. **시각 임팩트:** 화면에서 *반응을 알아챌 정도* 의 변화. *작은 색 변화* 만 있는 반응은 점수 낮음.
5. **5색 기질 정체성:** 신규 반응이 *어느 기질 룸* 의 시그니처가 되는가? 정체성 흐릿한 반응은 보류.
6. **구현 비용:** TileMutator/TileHazards 의 *if/else if* 한 줄 추가 수준. 큰 리팩터 필요한 반응은 Tier 3.

거절 (⬛) 사례:
- *솔리드 동위* (wood + metal 등): 인접해도 화학 반응 없음. 실제 물리 정합 + 시각 표현 불가.
- *Physical × fluid* (Physical × water 등): 검으로 물 못 부수는 게 정상. *마법 무기* 의 영역.
- *마음에 들지 않는 직관* (water + fire 자연 진압 등): Agent A 가 *코드 부재* 명시했으나 *attack-only 패턴* 으로 충분 (R-023). 자연 진압 추가 = 시각 노이즈.
