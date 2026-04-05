# Game Design Agent 일감 목록 & 레퍼런스

> **작성일:** 2026-03-29
> **목적:** 게임 디자이너 에이전트에게 할당할 GDD 설계 문서 작성 일감. 각 일감에 필요한 리서치와 참조 문서를 명시.
> **규칙:**
> - 모든 System 문서는 5단계 구조 필수 (`GDD_Writing_Rules.md` 준수)
> - 코드 수정 제안 금지. GDD 문서만 작성/수정
> - 기존 문서와 중복 금지. 의존 관계 확인 후 작성

---

## 우선순위 A: 리서치 완료 → 즉시 설계 문서 작성 가능 (5건)

---

### ~~A-1. SYS-LVL-03 — 스킬트리 시스템~~ (DEPRECATED)

> **⚠️ DEPRECATED:** 스킬 트리 시스템은 스코프 축소로 전면 삭제되었습니다. 스킬은 무기 내장 스킬로 대체됩니다. 전투 스킬 슬롯은 `System_Combat_Action.md`에서 관리합니다.

---

### A-2. SYS-IW-03 — 아이템계 보스 시스템

| 항목 | 내용 |
|:-----|:-----|
| **파일 경로** | `Documents/System/System_ItemWorld_Boss.md` |
| **3-Space** | Item World |
| **기둥** | 야리코미 |

**설계할 내용:**
- 4티어 보스 정의: 기억의 수문장(장군) → 군주(왕) → 신(신) → 핵(대신)
- 티어별 난이도 축 10가지: 패턴 수, 속도, 텔레그래프, 안전 윈도우, 동시 활성 패턴 등
- 공격 패턴 분류: 6대분류 × 25소분류 (근접/돌진/투사체/영역거부/소환/특수)
- 4-Layer 모듈러 보스 합성: Body(템플릿) + Attack Module + Modifier + Arena Variant
- 보스 AI 스테이트 머신: 페이즈 FSM + 패턴 선택 BT 하이브리드
- 페이즈 전환: HP 임계점 기반 (100%→75%→50%→25%)
- 텔레그래프 시스템: 다중 감각 레이어링, 등급별 배율 (장군 ×1.2 ~ 대신 ×0.7)
- 아레나 규격: 장군 640×360 ~ 대신 1600×800
- 멀티플레이 보스: 솔로/파티 HP 스케일링, 협동 기믹
- 보스 보상: 영구 스탯 증가, 이노센트 드랍, 레어리티 승급 기회

**필수 참조:**
| 문서 | 경로 | 읽어야 할 이유 |
|:-----|:-----|:-------------|
| 보스 디자인 리서치 | `Research/BossDesign_SideScrolling_Research.md` | §9~15 신규 섹션 (1,483줄 전체) |
| 아이템계 코어 | `System/System_ItemWorld_Core.md` | 4등급 보스 명칭, 보스 보상 규칙 |
| 전투 철학 | `Design/Design_Combat_Philosophy.md` | 보스전 철학, 타격감 원칙 |
| 적 AI | `System/System_Enemy_AI.md` | 기본 적 AI 구조 (보스 확장 기반) |
| 데미지 시스템 | `System/System_Combat_Damage.md` | 데미지 공식, 크리티컬, 원소 |
| 히트 피드백 | `System/System_Combat_HitFeedback.md` | 히트스탑, 화면흔들림 파라미터 |

---

### ~~A-3. SYS-IW-04 — 재귀적 진입 시스템~~ (DEPRECATED — 재귀적 중첩 진입 삭제, 순환 구조로 대체)

> **DEPRECATED (2026-04-05):** 재귀적(중첩) 진입은 삭제되었습니다. 아이템계 진입은 항상 월드에서만 가능합니다. 아이템계에서 획득한 아이템은 월드 귀환 후 진입하는 순환 구조로 대체되었습니다.

---

### ~~A-4. SYS-INC-02 — 이노센트 팜 시스템~~ (DEPRECATED — 스코프 축소로 삭제)

---

### A-5. D-07 — 경제 철학

| 항목 | 내용 |
|:-----|:-----|
| **파일 경로** | `Documents/Design/Design_Economy_FaucetSink.md` |
| **3-Space** | 전체 |
| **기둥** | 전체 |

**설계할 내용:**
- 자원 Faucet(생성원)/Sink(소멸원) 매핑: 3-Space별 자원 흐름
- 핵심 통화: HL, 제작 소재, 이노센트, 경험치
- 인플레이션 방지: HL 싱크 설계 (장비 강화, NPC 상점)
- 드롭 경제: 레어리티별 기대 드롭률, 보스 드롭 보너스
- 거래 제한: 최상위 장비 거래 제한 (파밍 동기 보존)
- 세션 경제: 10~15분 아이템계 런의 기대 수익
- 장기 경제: 레어리티 승급 비용이 경제 Sink 역할

**필수 참조:**
| 문서 | 경로 | 읽어야 할 이유 |
|:-----|:-----|:-------------|
| 엔드게임/경제 리서치 | `Research/EndgameLoop_Economy_Research.md` | 짧은 루프 + 명확 종료 신호 |
| 장비 드롭률 리서치 | `Research/Equipment_DropRate_Economy_Research.md` | 거래 제한과 파밍 동기 |
| 이노센트 성장/경제 | `Research/Innocent_Growth_Economy_Research.md` | 이노센트 경제 순환 |
| 깊이/보상 밸런스 | `Research/ItemWorld_DepthReward_RiskBalance_Research.md` | 보상 스케일링 수학 모델 |
| 성장/보상 철학 | `Design/Design_Progression_Reward.md` | 성장 곡선, 보상 심리 |
| 야리코미 철학 | `Design/Design_Yarikomi_Philosophy.md` | 무한 파밍 동기 구조 |
| 코어 루프 | `Design/Design_CoreLoop_Circulation.md` | 월드→아이템계 순환 (2-Space) |

---

## 우선순위 B: 리서치 있으나 보강 필요 / Phase 2 범위 (6건)

---

### B-1. SYS-IW-05 — 미스터리 룸 & 이벤트

| 항목 | 내용 |
|:-----|:-----|
| **파일 경로** | `Documents/System/System_ItemWorld_Events.md` |
| **리서치 기반** | `Research/Disgaea_ItemWorld_CoreMechanics.md` (미스터리 룸 섹션) |
| **추가 참조** | `System/System_ItemWorld_Core.md` |
| **범위** | 미스터리 룸 종류, 스폰 확률, 이벤트 목록, 보상 테이블 |

### ~~B-2. SYS-LVL-04 — 전��� 시스템~~ (스코프 축소로 삭제)

> 아이템 성장은 아이템계 지층 클리어(`System_ItemWorld_Core.md`)와 이노센트(`System_Innocent_Core.md`)로 관리합니다.

### B-3. SYS-MON-02 — 보스 디자인 (월드 보스)

| 항목 | 내용 |
|:-----|:-----|
| **파일 경로** | `Documents/System/System_Enemy_BossDesign.md` |
| **리서치 기반** | `Research/BossDesign_SideScrolling_Research.md` |
| **추가 참조** | `System/System_Enemy_AI.md`, `Design/Design_Combat_Philosophy.md` |
| **범위** | 월드 보스 목록, 층위별 보스 배치, 능력 게이트 보스, 보스 패턴 상세 |
| **주의** | SYS-IW-03(아이템계 보스)과 범위 구분 필수. 이 문서는 월드 보스만 |

### B-4. SYS-INC-03 — 이중 이노센트

| 항목 | 내용 |
|:-----|:-----|
| **파일 경로** | `Documents/System/System_Innocent_Dual.md` |
| **리서치 기반** | `Research/Innocent_Classification_Balance_Research.md` |
| **추가 참조** | `System/System_Innocent_Core.md` |
| **범위** | 이중 속성 이노센트 조합 규칙, 합성 레시피, 밸런스 |

### B-5. SYS-EQP-03 — 아이템 성장 경로

| 항목 | 내용 |
|:-----|:-----|
| **파일 경로** | `Documents/System/System_Equipment_Growth.md` |
| **리서치 기반** | `Research/Disgaea_ItemWorld_GrowthEconomy.md` |
| **추가 참조** | `System/System_Equipment_Rarity.md`, `System/System_ItemWorld_Core.md` |
| **범위** | 아이템 레벨, 강화 경로(보스→스탯↑), 레어리티 승급 조건/확률 |

### B-6. SYS-WLD-02 — 층위 디자인

| 항목 | 내용 |
|:-----|:-----|
| **파일 경로** | `Documents/System/System_World_ZoneDesign.md` |
| **리서치 기반** | `Research/Metroidvania_MapStructure_GateDesign.md`, `Research/LevelDesign_ProgressionShape_Research.md` |
| **추가 참조** | `System/System_World_MapStructure.md`, `System/System_World_ProcGen.md` |
| **범위** | 7개 층위별 바이옴, 난이도 곡선, 게이트 배치, 특수 지형/기믹 |

---

## 우선순위 C: 리서치 부족 / Phase 3 범위 (미할당)

| 문서 ID | 문서명 | 리서치 상태 | Phase |
|:--------|:------|:----------|:------|
| D-06 | Online Design Principles | 넷코드 1개만 | Phase 3 |
| SYS-MP-01~04 | 멀티플레이 전체 | 넷코드 1개만 | Phase 3 |
| SYS-ECO-01~03 | 경제 시스템 | D-07 선행 필요 | Phase 2+ |
| ~~SYS-HUB-01~02~~ | ~~허브 시설/NPC~~ | ~~DEPRECATED~~ | — |
| SYS-CMB-04~06 | 서브웨폰/원소/상태이상 | 전투 리서치 있음 | Phase 2 |
| SYS-WLD-06~07 | 세이브워프/비밀 | 메트로베니아 리서치 있음 | Phase 2 |
| SYS-IW-06 | 지오 이펙트 | 디스가이아 리서치 있음 | Phase 2 |
| UI-01~06 | UI 전체 | 리서치 없음 | Phase 2 |

---

## 에이전트 실행 가이드

### 사전 필수 읽기 (모든 일감 공통)

| 문서 | 경로 |
|:-----|:-----|
| Project Vision | `Documents/Terms/Project_Vision_Abyss.md` |
| GDD Writing Rules | `Documents/Terms/GDD_Writing_Rules.md` |
| Glossary | `Documents/Terms/Glossary.md` |
| Document Index | `Documents/Terms/Document_Index.md` |

### 문서 작성 순서 권장

```
1. ~~A-1 (스킬트리) — DEPRECATED~~
2. A-2 (아이템계 보스) — 아이템계 진행의 핵심 빈칸
3. A-5 (경제 철학) — 모든 보상/드롭의 기초
4. ~~A-3 (재귀적 진입) — DEPRECATED. 재귀적 중첩 진입 삭제~~
5. ~~A-4 (이노센트 팜) — DEPRECATED~~
```

### 의존 관계

```
~~A-1 (스킬트리) — DEPRECATED~~
A-2 (보스) ← 독립 (즉시 시작 가능)
A-5 (경제) ← 독립 (즉시 시작 가능)
~~A-3 (재귀) — DEPRECATED~~
~~A-4 (이노센트 팜) — DEPRECATED~~
B-1~6 ← A 시리즈 완료 후
```
