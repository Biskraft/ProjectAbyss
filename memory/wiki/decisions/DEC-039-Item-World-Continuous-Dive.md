# DEC-039: Item World Continuous Dive — Vertical Dive Graph

> 결정일: 2026-05-01 (초안) / 2026-05-02 (수직 그래프 확장)
> 상태: 확정 (Confirmed)
> 영향 범위: 아이템계 그래프 토폴로지(RoomGraph), Plaza/Boss 룸 prefab 분류(LDtk), 보스 룸 포탈 인터랙트 + 바닥 붕괴 폴 다운, StrataConfig CSV (Normal·Magic 지층 수 축소), 디자인 문서, Glossary
> 선행 결정: DEC-033 (검 Ego), DEC-036 (Memory Shard), DEC-038 (그림자 마을)
> **무효화 결정:** DEC-037 (Hub-and-Spoke 방사형 토폴로지) — 본 결정으로 전면 교체
> 선행 문서: `Documents/Design/Design_ItemWorld_DeepDive.md` (DES-IW-DIVE-01)

---

## 결정 사항

아이템계의 그래프 토폴로지를 **수직 딥 다이브 그래프(Vertical Dive Graph)** 로 재정의한다. 각 지층은 Plaza(맨 위) → 분기 가지 → Boss(맨 아래) 의 수직 그래프이며, 지층 전이는 **보스 처치 → 포탈 인터랙트 → 보스 룸 바닥 물리 붕괴 → 다음 지층 Plaza 천장 낙하**.

핵심 룰 6가지:

1. **그래프 = 수직 딥 다이브** — Plaza 1개 (맨 위, role=hub) + Boss 1개 (맨 아래, role=boss) + 사이의 분기 가지. 기존 DEC-037 hub-and-spoke 방사형 폐기. critical path 는 수직 (D 우선), 분기는 수평 (LR). **Archive(shrine) 는 critical path 외 분기 가지 끝에 배치** — Plaza 흡수 X, 옵션 안전지대.

2. **Plaza 룸 = LRD only** — Plaza 룸 prefab 은 좌·우·아래 출구만. 위(U) 출구 *없음*. 사유: 위에서 떨어져 들어왔으므로 **천장이 파괴된 상태**. LDtk Plaza prefab 분류 갱신 필수.

3. **Boss 룸 = LRU + 처치 후 D 활성** — Boss 룸 prefab 은 진입용 LRU. 처치 *전* 에는 바닥 봉인. 처치 *후* 바닥에 **Trapdoor 포탈** 활성화 (오렌지 단조열 빛기둥 + SFX). 인터랙트 시 바닥 물리 붕괴.

4. **전이 = 포탈 인터랙트 능동 발동** — 보스 처치 자동 발동 X. 플레이어가 포탈을 *능동 인터랙트* 해야 발동. 발동 시 1초 카메라 다운 패닝 + 다음 지층 Plaza 천장 낙하. DES-IW-ONB-01 의 동의·예고·문맥 3요소가 지층 간 전이까지 자연 확장.

5. **Stratum 1 진입 = 현행 페이드 유지** — 사유: 이전 빌드 *"납치되는 느낌"* 플레이테스트 피드백. 페이드 후 Plaza 에 *이미 떨어져 들어온* 상태로 시작 (천장 부서짐 시각 일관). 폴 다운 연출은 *지층 간 전이에만*.

6. **레어리티 지층 수 축소** — Normal 1지층 (단일 다이브 ≈ 5분), Magic 2지층, Rare/Legendary/Ancient 현행 유지. 마지막 지층 보스 처치 → 포탈 인터랙트 → 월드 세이브포인트 페이드 귀환. CSV `Content_StrataConfig.csv` SSoT 갱신.

> **부수 효과 (자동 충족):** 모든 Plaza 천장이 부서진 상태이므로 위 지층 그림자 parallax 가 자연 노출. "DEPTH N / MAX" 풀스크린 텍스트는 Stratum 2+ Plaza 진입 시 1초 (ULTRAKILL 패턴).

---

## 폐기 / 도입

| 구분 | 폐기 | 도입 |
|:---|:---|:---|
| 그래프 토폴로지 | DEC-037 hub-and-spoke 방사형 | 수직 딥 다이브 (Plaza top + Boss bottom) |
| 절차 알고리즘 | MST + random branch on radial graph | 수직 critical path (D) + 수평 분기 (LR) |
| Plaza 룸 prefab 출구 | LRDU 자유 | **LRD only** (U 폐기) |
| Boss 룸 prefab 출구 | 일반 룸과 동일 | **LRU + 처치 후 D 활성** |
| Stratum 간 전이 | 페이드 + 새 RoomGraph 재생성 | 포탈 인터랙트 → 바닥 붕괴 → 낙하 |
| 보스 처치 후 흐름 | StratumClearOverlay continue 분기 | Trapdoor 포탈 활성 → 능동 인터랙트 |
| Archive(shrine) 위치 | DEC-037 방사형의 분기 가지 끝 | **수직 그래프의 분기 가지 끝 유지** (Plaza 흡수 X) |
| Normal 지층 | 2지층 | 1지층 (단일 보스, 입문 다이브) |
| Magic 지층 | 3지층 | 2지층 |

---

## 결정 근거

1. **사용자 진단 누적 (2026-05-01 ~ 2026-05-02)** — 디스가이아 instance-break 단절 + DEC-037 방사형 그래프의 *수평 인지* 가 BLAME!/Made in Abyss 수직 다이브 정체성과 충돌. 다이브 감성 vs 그래프 다양성 충돌 자체를 *수직 그래프* 로 봉합.

2. **그래프 토폴로지가 톤 정합** — 수직 그래프는 BLAME!/Made in Abyss 메가스트럭처와 1:1 정합. 광장이 *맨 위* 에 놓이면 무라카미 마을의 "지표" 메타포도 자연 흡수 (다이브는 항상 광장에서 시작 → 깊이 내려감 → 보스 → 다음 광장).

3. **Plaza 천장 파괴 시각 = 다이브 누적 신호** — 모든 Plaza 천장이 부서져 위 지층 그림자 parallax 가 자연 노출. 별도 시각 룰 추가 없이 부수 충족.

4. **이전 통합 안 C "광장 의례" 자동 흡수** — 광장이 *지층 시작* 이 되므로 다음 다이브의 자연 준비 공간이 됨. 보스 후 귀환 워프 메커닉 *불필요*. 사서·문지기 회상 = 낙하 직후 의례 단계.

5. **DEC-038 그림자 마을 보존** — Plaza/Archive 안전지대 약속, Gatekeeper/Archivist 캐스팅, Memory Shard 시각 정의 모두 무수정. 그래프 노드 배치만 변경.

6. **DEC-036 시스템 보존** — 지층 보스 N회 = 핵심 기억 N회 회상. 단일 보스 안(맵 확장) 폐기. 본 결정은 지층 구조 유지 + 시각·동선 봉합.

7. **레퍼런스 강한 검증 (DeepDive 24 작품)** — Spelunky/Isaac/Disgaea/Noita 가 모두 수직 폴 다운 + 레벨 입구 = 천장 / 출구 = 바닥. ECHORIS 가 이를 잃었음. 회복 + 광장 메타포 통합.

8. **1인 개발 비용** — DEC-037 RoomGraph 자료구조 무수정 (그래프 자체는 그대로, 노드 배치 룰만 변경). LDtk Plaza prefab 분류 갱신 + Boss 룸 Trapdoor 인터랙트 + 폴 다운 시퀀스. 1.5주 폴리시.

---

## 후보 평가

| 안 | 형태 | 채택 여부 | 사유 |
|:---|:---|:---:|:---|
| A | 현행 유지 (DEC-037 방사형 + 페이드) | ✗ | 컨텍스트 단절 + 톤 부정합 누적 |
| B | DEC-037 보존 + Trapdoor 보스 룸 즉시 자동 폴 다운 | ✗ | 광장 의례·다이브 감성 충돌 미해소 |
| C | DEC-037 보존 + 보스 후 광장 워프 + Trapdoor 능동 발동 | △ | 충돌 부분 해소하나 광장 위상 모호 (지나가는 곳/체류 공간 모두 약함) |
| **D** | **수직 딥 다이브 그래프 + Plaza top + Boss bottom + 능동 포탈** | **✓** | 그래프·다이브 충돌을 토폴로지 자체로 봉합. 광장이 자연스러운 *지층 시작* 이 됨 |

---

## 영향

### 코드 (즉시)

- `game/src/level/RoomGraph.ts` — 그래프 생성 알고리즘 변경: hub-and-spoke radial → vertical critical path (D) + horizontal branches (LR). Plaza 노드 = top, Boss 노드 = bottom 강제. (~80~120 line)
- `game/src/level/RoomGraphAdapter.ts` — Plaza/Boss 노드 출구 방향 룰 (Plaza = LRD only, Boss = LRU + post-clear D). (~30 line)
- `game/src/scenes/ItemWorldScene.ts` — 보스 처치 시 Trapdoor 포탈 entity spawn + 인터랙트 핸들러 + 폴 다운 카메라 패닝 + 다음 Stratum Plaza 천장 진입점. StratumClearOverlay 폐기 (포탈이 대체). (~100 line, 단 StratumClearOverlay 제거로 상쇄)
- `game/public/assets/World_ProjectAbyss.ldtk` — Plaza 룸 prefab 의 U 출구 제거 + 천장 파괴 시각, Boss 룸 prefab 의 D 출구를 Trapdoor 인터랙트 entity 로 교체 (LDtk 작업, ~5~10 룸 갱신)
- `game/src/data/StrataConfig.ts` — CSV 변경 자동 반영 (코드 무수정)

### 데이터

- `Sheets/Content_StrataConfig.csv` — Normal stratum 2 행 삭제, Magic stratum 3 행 삭제, Normal/Magic stratum 1 값 일부 강화 (단일/2지층 페이싱 보정)

### 자산

- 천장 파괴 시각 텍스처 1종 (Plaza 천장, 부서진 콘크리트/금속 + 위 지층 그림자 parallax 노출 영역)
- Boss 룸 Trapdoor 포탈 sprite 1종 (오렌지 단조열 빛기둥, 인터랙트 prompt)
- 폴 다운 SFX 1종 (저음 whoosh + 콘크리트 균열 충격음)

### 문서

- `CLAUDE.md` 레어리티 표 — Normal 1지층 / Magic 2지층 갱신
- `Documents/Design/Design_ItemWorld_DeepDive.md` § 5/6 — 안 D (수직 딥 다이브) 신규 추가 + § 6 권장 갱신
- `Documents/Design/Design_ItemWorld_Town_Shadow.md` § 2 캐스팅 (Archive 위치 갱신) + § 5 안전지대 (Plaza LRD 룰 추가)
- `Documents/System/System_ItemWorld_Core.md` — § 다이브 연속성 + § 그래프 토폴로지 (DEC-037 무효화 명기)
- `Documents/System/System_ItemWorld_FloorGen.md` — 전면 갱신: hub-and-spoke 알고리즘 → vertical dive graph 알고리즘
- `Documents/Terms/Glossary.md` — Megastructure Shaft, Trapdoor Descent, Vertical Dive Graph 추가, Hub-and-Spoke deprecate 표기

### 후속

- 안 B (Persistent Town) — 무기당 마을 영구 상태. 데이터 구조 확장 필요. Phase 2 후반.
- 안 C (Depth as Cost) — Flask·시야·Recall 비용. Phase 3 검토.

---

## DEC-037 처리

DEC-037 (Hub-and-Spoke Radial) 은 본 결정으로 **전면 무효화**. 단:

- DEC-037 §보존사항 의 "LDtk 룸 prefab 유지", "DEC-036 Memory Shard 시스템 유지", "월드(World) 절차 생성은 스펠렁키 방식 유지" 는 그대로 보존.
- DEC-037 의 *node-based 자료구조 도입* (RoomGrid → RoomGraph) 자체는 보존. 본 결정은 그래프 *위상 룰* 만 변경.
- DEC-037 문서 헤더에 "DEC-039 (2026-05-02) 으로 토폴로지 룰 무효화. 자료구조는 보존" 명기 권장.

---

## 보존 사항

- DEC-038 그림자 마을 캐스팅 (Gatekeeper / Archivist / Ambient Shadow / Memory Shard / Boss) **무수정**
- DEC-038 §5 광장 안전지대 약속 (Plaza/Archive 적 spawn 0) **무수정**
- DEC-038 § 메모리 코어 펄스 메커닉 **무수정**
- DEC-036 Memory Shard 위계/슬롯/상태 모델 **무수정**
- DEC-033 검 Ego 단독 화자 + 에르다 0줄 원칙 **무수정**
- District 매퍼 (`game/src/data/itemWorldDistricts.ts`) **무수정**

---

## 차별화

ECHORIS 의 다이브는 다음 5 요소의 조합:

| 요소 | 출처 | ECHORIS 고유성 |
|:---|:---|:---|
| 절차 다이브 | Spelunky / Noita / Disgaea | + |
| 단일 메가스트럭처 정체성 | BLAME! / Hollow Knight | + |
| 거주자 = 잔류 그림자 | DEC-038 (무라카미 + BLAME!) | + |
| 검 Ego 단독 화자 | DEC-033 (Transistor) | + |
| **수직 딥 다이브 그래프 + 천장 파괴 광장** | DEC-039 (본 결정) | **= ECHORIS 만의 합** |

> "한 자아의 메가스트럭처를 깊이 내려가며, 부서진 천장의 광장에서 떠난 자들의 그림자에게 검 Ego 가 말을 걸고, 잊혀진 단편을 회상시킨다."

---

## 검증

플레이테스트 검증 항목 (1차 빌드 후):

1. Stratum N → N+1 전이가 *연속* 으로 인지되는가? (페이드/씬 점프 인상 0)
2. Plaza 의 부서진 천장이 *다이브 결과* 로 즉시 인지되는가? (위에서 떨어져 들어왔다는 시각 신호)
3. Boss 처치 후 Trapdoor 포탈 인터랙트가 *능동* 으로 인지되는가? (자동 폴 다운 인상 0 = "납치 느낌" 없음)
4. Normal 단일 지층이 너무 짧지 않은가? (5분 미만이면 강화)
5. 수직 그래프가 길 잃기 좌절을 유발하지 않는가? (critical path = D 인지 명확)
6. Plaza/Archive 가 같은 *지층 시작 영역* 으로 자연 인지되는가? (DEC-038 캐스팅 보존 검증)

---

## 결정된 세부 사항 (2026-05-02 확정)

1. **마지막 지층 보스 처치 후 월드 귀환 연출 = 페이드.** Stratum 1 진입과 대칭. 즉시 세이브포인트로 페이드 귀환. 별도 상승 컷 없음.
2. **Boss 룸 Trapdoor 포탈 인터랙트 키 = 기존 공격 키.** 별도 인터랙트 키 신설 X. 포탈 위에서 공격 키 입력 = 활성화. ECHORIS 공격 키 일관성 유지.
3. **Plaza 천장 시각 변주 = 1차 모든 Plaza 동일.** 지층별 부식 차등은 폴리시 단계 후속. 1차 구현은 결정론 단일 천장 텍스처.
4. **Archive(shrine) 위치 = Plaza 와 분리된 분기 가지 끝.** Plaza 흡수 X. critical path (D) 가 아닌 옵션 분기 가지 끝에 배치. 플레이어가 다이브 중 LR 분기로 발견. DEC-038 안전지대 약속 (적 spawn 0) 보존. DEC-037 의 *shrine = 가지 끝* 패턴은 *수직 그래프 컨텍스트에서* 유지.

### 영향 갱신

- **§결정 사항 룰 1** — Archive(shrine) 흡수 표현 정정: "Archive 는 critical path 외 분기 가지 끝에 배치"
- **§폐기/도입** — Archive 위치 행 갱신
- **§영향 코드** — RoomGraph 알고리즘에 *shrine 노드 = 분기 가지 끝* 룰 명시
