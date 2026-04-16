# 절차적 아이템 서사 생성 리서치
# Procedural Item Narrative Generation — Research Document

> **문서 ID:** RES-PRO-001
> **문서 상태:** Draft
> **작성일:** 2026-04-07
> **리서치 범위:** 절차적 서사 생성 기법, 템플릿 시스템, 서사-던전 연동, 확장성
> **적용 대상:** ECHORIS — 아이템계(Item World) 서사 생성 시스템

---

## 0. 리서치 목적

ECHORIS의 아이템계 스파이크는 **"아이템에 들어가면 그 아이템의 기억이 던전으로 나타난다"**는 것이다. 현재 기준 예시 (`GrandfatherKitchenKnife`)는 완성도가 높지만, 수작업 의존도가 극히 높다. 이 리서치는 다음 질문에 답한다.

1. 선례 게임들은 절차적 서사를 어떻게 생성했는가?
2. 어떤 기법이 PA의 구조(테마 ID × 레어리티 × 기원 4요소)에 적용 가능한가?
3. 100~1000개 아이템 규모에서 서사 품질을 유지하면서 제작 비용을 줄이는 방법은?
4. 서사 변수가 던전 생성을 어떻게 시딩(seeding)하는가?

---

## 1. 선례 게임 분석

### 1.1. Dwarf Fortress — 시뮬레이션 기반 역사 생성

**핵심 메커니즘:** Emergent History Generation (역사 시뮬레이션 → 사후 텍스트화)

Dwarf Fortress는 서사를 직접 "쓰지" 않는다. 대신 세계를 수백 년 시뮬레이션하고, 그 결과를 레전드 모드에서 텍스트로 서술한다. 아이티팩트(Artifact)는 이 과정의 산물이다.

**아티팩트 생성 파이프라인:**
```
드워프 심리 상태 (좋아하는 것, 두려움, 관계)
    → 스트레인지 무드 트리거
    → 재료 수집 행동 시뮬레이션
    → 장인 행위 → 아이티팩트 생성
    → 아이티팩트에 레전드 이벤트 연결 (누가 만들었나, 어디서 싸웠나, 누가 소유했나)
    → Legends Mode: "This is X, a cabinet made by Y in the year Z..."
```

**PA에 적용 가능한 원리:**
- 아티팩트의 서사는 **제작자의 심리 상태**에서 도출된다. PA의 Creator 필드와 직결된다.
- 아이티팩트는 **소유권 이전 히스토리**를 자동으로 누적한다. PA의 Fate 필드와 동일한 구조다.
- "스트레인지 무드" = 아이템의 특수성을 정당화하는 서사 트리거. PA의 레어리티 상승과 유사.

**한계:** DF의 방법은 전체 세계 시뮬레이션이 전제 조건이다. PA에 그대로 적용 불가. 단, **기원 4요소 (Creator / Purpose / History / Fate)가 DF의 아티팩트 메타데이터와 구조적으로 동일**하다는 점이 중요하다.

---

### 1.2. Caves of Qud — 역방향 인과 + 교체 문법

**핵심 메커니즘:** Event-First Generation + Rationalization (사후 인과 합리화)

Caves of Qud GDC 2017 발표 논문("Subverting Historical Cause & Effect")에 따르면, 이 게임은 먼저 **역사적 사건을 랜덤 생성**한 다음, 그 사건들이 왜 일어났는지를 사후에 합리화하는 텍스트를 생성한다. 이것이 기존 "원인 → 결과" 서사 생성과 다른 핵심이다.

**교체 문법 (Replacement Grammar) 구조:**
```
원본 템플릿:
  "[SULTAN]은 [ERA]에 [LOCATION]에서 태어났다.
   [EVENT]를 겪은 후 [ACHIEVEMENT]를 이루었다."

교체 변수:
  SULTAN     → [이름 생성기]
  ERA        → [세계 히스토리 타임라인]
  LOCATION   → [지역 이름 풀]
  EVENT      → [사건 카탈로그 중 SULTAN의 특성과 호환되는 것]
  ACHIEVEMENT → [EVENT에서 논리적으로 유추되는 결과]
```

**40,000단어 코퍼스:** Caves of Qud는 게임의 고유한 문체(목소리)를 정의하는 40,000단어 규모의 텍스트 코퍼스를 구축한 뒤, 교체 규칙을 통해 이 코퍼스를 재조합하여 고유한 목소리를 유지한다.

**PA에 직접 적용 가능한 기법:**
- **역방향 인과 (Event-First):** 아이템의 Fate를 먼저 결정하고, 그 Fate가 왜 발생했는지 Purpose와 History를 역방향으로 생성하는 방식. 이미 KitchenKnife에서 암묵적으로 사용 중.
- **코퍼스 구축 우선:** PA 세계관의 고유 어투(고딕, 다크 판타지 + 경쾌한 야리코미)를 먼저 코퍼스화하면, 이후 모든 교체 템플릿이 일관된 목소리를 유지할 수 있다.
- **플레이어의 조각 맞추기:** 아이템계에서 서사 조각을 순서 무관하게 발견하고, 나중에 전체 그림을 맞추는 설계. PA의 지층별 정보 공개 타임라인과 정확히 일치.

---

### 1.3. Hades — 조건부 트리거 + 대규모 대사 풀

**핵심 메커니즘:** Priority Queue Dialogue + State-Conditional Unlock

Hades는 30만 단어 스크립트를 가지고 있지만, 이를 "절차 생성"한 것이 아니라 **트리거 조건을 극도로 정밀하게 설계**하여 매 런(run)이 다른 서사 경험을 주도록 했다.

**Hades의 대사 우선순위 시스템:**
```
각 대사 노드에 부여된 속성:
  - Priority (우선순위 숫자)
  - Conditions (무기 보유, 런 횟수, 관계 레벨, 이전 대사 완료 여부)
  - Exhausted (한 번 들으면 소진, 재사용 없음)
  - Persistent (반복 허용)

런 시작 시:
  현재 조건 충족 대사 목록 수집
  → Priority 순서로 정렬
  → 상위 N개 중 랜덤 선택
  → Exhausted 처리
```

**PA에 적용 가능한 원리:**
- **이노센트(Innocent)의 대사 시스템**이 바로 이 구조다. 야생 대사 / 복종 대사 / 첫 방문 / 재방문 / 지층 클리어 후 단 1회 대사 — 이미 Hades와 동일한 구조를 쓰고 있다.
- **NPC 유령의 상태 분기** (첫 방문 / 재방문(지층3 미클리어) / 재방문(지층3 클리어 후) / 폴백)가 Hades의 조건부 트리거 정확히 일치한다.
- **Exhausted 패턴의 강화:** 각 서사 조각이 한 번 발견되면 "소진(seen)" 처리되어, 재진입 시 새로운 레이어가 노출되는 설계 — KitchenKnife에서 이미 구현. 이를 시스템 레벨로 명세화할 필요 있음.

**300,000단어 스크립트의 비결:** Hades가 반복 없이 느껴지는 이유는 각 대사가 수십 개의 조건 조합 중 정확한 상태에서만 발동하기 때문이다. 총량이 아니라 **조건 정밀도**가 반복감을 줄인다. PA도 마찬가지 — 템플릿 수보다 조건 분기 정밀도가 더 중요하다.

---

### 1.4. Wildermyth — 수작업 템플릿 + 변수 치환

**핵심 메커니즘:** Hand-Curated Templates + Dynamic Variable Substitution

Wildermyth는 **"완전 절차 생성이 아니라 완전 수작업도 아닌"** 중간 지점을 개척했다. 모든 서사 이벤트는 사람이 쓴 템플릿이지만, 캐릭터의 성격 타입, 성별, 이전 이벤트 결과에 따라 텍스트가 바뀐다.

**Wildermyth의 템플릿 분기 구조:**
```
하나의 이벤트에 대해:
  - 공통 골격 (사건의 내용)
  - 성격 타입별 반응 대사 (4~6 변형)
  - 관계 상태별 결과 텍스트 (2~3 변형)
  - 이전 이벤트 플래그별 특별 대사 (0~2 변형)

→ 조합 가능 변형 수 = 4 × 3 × 2 = 24 (실제로 작성할 텍스트는 ~15개)
```

**PA에 직접 적용 가능한 기법 (핵심):**

PA의 이노센트 대사 시스템에 즉시 적용 가능하다. 하나의 이노센트 타입에 대해:
```
야생 대사 = 이노센트 성격 × 지층 테마 조합
  예) 까다로운 요리사 이노센트 + T-WAR 지층
  → "그 칼질 솜씨로 전쟁에서 살아남았다고? 믿기 힘드네."

복종 대사 = 이노센트 성격 × (지층 테마 + 아이템 핵심 감정)
  예) 까다로운 요리사 + T-WAR + 슬픔
  → "전쟁터에서도 음식을 만들었어. 그 사람이 그랬어. 맛이 없었다고 하더군."
```

이 방식으로 **1개 이노센트 성격 템플릿 × 10 테마 × 3 감정 기조 = 30개 대사**를 15~20개 작성으로 커버할 수 있다.

---

### 1.5. Fallen London / Sunless Sea — Quality-Based Narrative (QBN)

**핵심 메커니즘:** Storylet + Quality Unlock System

Failbetter Games가 고안한 QBN(Quality-Based Narrative)은 절차적 서사 설계의 가장 실용적인 프레임워크 중 하나다. 핵심은 다음과 같다.

- **Storylet:** 짧은 독립 서사 단위 (텍스트 1~2단락 + 선택지). 순서에 의존하지 않는다.
- **Quality:** 플레이어가 축적하는 수치 변수. 어떤 Storylet이 열릴지 결정한다.
- **Free-floating access:** 선형 트리가 아니라, 현재 보유한 Quality가 조건을 충족하면 어떤 Storylet이든 접근 가능.

**Bruno Dias의 이상적 QBN 분석(2017)에 따른 핵심 패턴:**
```
Storylet 구조:
  prerequisites: [quality_A >= 2, quality_B > 0, location == "layer_2"]
  text: "..." (상황 묘사)
  options:
    - label: "..."
      effects: [quality_C += 1, quality_D = "seen_ghost"]
      outcome_text: "..."
```

**PA의 아이템계에 적용되는 QBN:**
- 각 지층의 환경 오브젝트 상호작용 = Storylet
- 플레이어가 수집하는 서사 조각 = Quality (seen_* 플래그)
- NPC 유령의 상태 분기 = Quality 조건부 해금

KitchenKnife의 NPC 유령 상태표가 이미 QBN 구조다. 이것을 시스템 전반에 표준화하면 된다.

---

### 1.6. Diablo 시리즈 — Prefix × Suffix 조합 명명 시스템

**핵심 메커니즘:** Transitive Naming via Affix Tables

Diablo의 아이템 이름 생성은 절차적 서사의 가장 단순한 형태다.

```
아이템 이름 = [Prefix] + [Base Item Type] + [Suffix]
예) "King's Sword of Haste" = "King's" (공격 계열 Prefix) + "Sword" + "of Haste" (이동 계열 Suffix)

Prefix 풀:  King's / Cruel / Blessed / Rusted / ...
Suffix 풀:  of the Leech / of Haste / of Light / of the Whale / ...
```

이름만으로 아이템의 서사 방향성을 암시한다. 플레이어는 "King's"라는 단어에서 귀족/왕권 배경을 연상하고, "of the Whale"에서 바다/항해를 연상한다.

**PA의 Flavor Text에 적용 가능한 확장:**
```
플레이버 텍스트 = [상태 형용사] + [물리적 특징 묘사] + [단서 문장]

예) T-WAR 계열:
  상태 형용사: "칼날에 녹이 슨", "손잡이가 닳은", "날이 이가 빠진"
  물리적 특징: "검은 핏자국이 남아 있는", "인장이 새겨진"
  단서 문장: "[숫자] 대의 군주를 섬긴 검이라고 한다.", "전쟁이 끝난 날 땅에 꽂힌 채 발견되었다."

조합 예:
  "칼날에 녹이 슨 [아이템명]. 7대의 군주를 섬긴 검이라고 한다."
  "손잡이가 닳은 [아이템명]. 전쟁이 끝난 날 땅에 꽂힌 채 발견되었다."
```

단 3개 슬롯(상태 × 물리특징 × 단서)에 각 10개 선택지 = **1,000개 고유 플레이버 텍스트** 조합. 실제로는 50개 작성으로 커버.

---

### 1.7. Dead Cells — 절차적 레벨 내 서사 오브젝트 배치

**핵심 메커니즘:** Procedural Room Assembly + Narrative Object Placement Rules

Dead Cells는 서사 목적의 오브젝트(비문, 일지, 시체 등)를 사전 제작된 Room Template에 고정 배치하고, Room 자체를 절차적으로 조합한다. 서사 오브젝트의 위치는 변하지 않는 반면, Room들의 순서와 연결은 매번 달라진다.

**Dead Cells의 하이브리드 접근법 (Sebastien Benard, Motion Twin):**
```
Level = procedural assembly of handcrafted rooms
Room = fixed layout + fixed narrative objects
Narrative flow = emergent from room sequence variation

핵심 규칙:
  - 플레이어가 반드시 통과하는 방(Critical Path)에는 핵심 서사 오브젝트 배치
  - 선택적 방(Optional Room)에는 보조 서사 오브젝트 배치
  - 서사 오브젝트는 텍스트가 아니라 시각적 상태(bloodstain, broken weapon, journal)로 표현
```

**PA의 4×4 지층 그리드에 적용:**

PA의 각 지층은 4×4 고정 그리드다. Dead Cells와 달리 방 배치가 절차적이 아닌 구조다. 하지만 Dead Cells의 **"오브젝트 배치 우선순위 규칙"**은 직접 적용된다.

```
PA 지층 오브젝트 배치 원칙 (Dead Cells 파생):
  Critical Path 방 (보스 방 직전 복도): 핵심 서사 오브젝트 필수 배치
  보스 방 입구 (안전 지대): NPC 유령 Fire 모멘트 배치
  선택적 방 (좌우 분기): 보조 이노센트, Ember 오브젝트 배치
  시작 방: 플레이버 텍스트와 일치하는 오브젝트 1개 필수 배치
```

---

### 1.8. Spelunky — 시스템 정합성에서 나오는 서사

**핵심 메커니즘:** Ludic Coherence as Narrative (게임 시스템 일관성 = 서사)

Derek Yu는 Spelunky를 통해 "명시적 서사 없이 시스템 일관성만으로 세계를 설명할 수 있다"는 것을 보여줬다. 티키맨이 정글에만 등장하고 카빈맨보다 희귀하다는 배치 규칙 하나가 "티키맨은 카빈맨 사회의 엘리트"라는 서사를 텍스트 없이 전달한다.

**PA에 적용 가능한 원리:**
- KitchenKnife 지층 3의 "선택하지 않은 가능성" 몬스터 (반투명 환영)는 이 원리의 완벽한 응용이다.
- **"적을 쓰러뜨리는 행위 = 선택하지 않은 삶을 놓아주는 행위"** — 전투 행위가 서사 행위다.
- 모든 테마별 몬스터가 서사 일관성을 가져야 한다. T-HOME 몬스터가 왜 부엌 재료인가? → 그것이 "이 공간에서 살아있는 것들"이기 때문이다. 이 논리를 10개 테마 전체에 명시적으로 정의해야 한다.

---

## 2. 핵심 기법 분류

### 2.1. 기법 비교표

| 기법 | 대표 게임 | 원리 | PA 적용 용이성 | 적용 영역 |
| :--- | :--- | :--- | :--- | :--- |
| 교체 문법 (Replacement Grammar) | Caves of Qud | 템플릿 + 변수 치환 | 높음 | 플레이버 텍스트, 이노센트 대사 |
| 역방향 인과 (Event-First) | Caves of Qud | 결과 먼저, 원인 나중 | 높음 | 기원 4요소 생성 순서 |
| 조건부 트리거 풀 | Hades | 상태 조건 × 대사 풀 | 높음 | NPC 유령, 이노센트 대사 |
| Quality-Based Narrative | Fallen London | 수치 플래그로 콘텐츠 해금 | 중간 | 지층 탐험 진행, 서사 조각 수집 |
| 수작업 템플릿 + 변수 치환 | Wildermyth | 골격 수작업, 변수만 교체 | 높음 | 모든 텍스트 생성 |
| 시스템 정합성 서사 | Spelunky | 배치 규칙이 서사를 만듦 | 중간 | 몬스터 배치, 오브젝트 배치 |
| Affix 조합 명명 | Diablo | Prefix × Suffix 조합 | 높음 | 플레이버 텍스트 첫 줄 |
| 역사 시뮬레이션 | Dwarf Fortress | 전체 세계 시뮬레이션 | 낮음 (비용 과다) | 장기적 고려 대상 |

---

### 2.2. Tracery — 문법 기반 생성 텍스트 도구

Kate Compton이 제작한 **Tracery**는 그래머 기반 텍스트 생성 도구로, PA의 서사 생성 엔진 설계의 기술적 기반으로 고려할 만하다.

**Tracery 구조 예시 (PA 적용 버전):**
```json
{
  "flavor_text": ["#state_adj# #item_name#. #clue_sentence#"],
  "state_adj": {
    "T-WAR": ["칼날에 녹이 슨", "손잡이가 닳아빠진", "날이 이가 빠진"],
    "T-HOME": ["기름때가 깊이 밴", "손잡이가 매끄럽게 닳은", "날이 아직 반짝이는"],
    "T-FORGE": ["담금질 흔적이 선명한", "금속 냄새가 가시지 않은", "원광의 결이 남아 있는"]
  },
  "clue_sentence": {
    "T-WAR": [
      "#war_count# 대의 군주를 섬긴 검이라고 한다.",
      "전쟁이 끝난 날 땅에 꽂힌 채 발견되었다.",
      "'공훈'이라는 글자가 희미하게 새겨져 있다."
    ],
    "T-HOME": [
      "칼자국이 고르고 깊다. 오랫동안 같은 자리에서 썰었다는 뜻이다.",
      "'가족'이라는 글자가 희미하게 새겨져 있다.",
      "누군가 매일 아침 이것으로 무언가를 썰었다."
    ]
  },
  "war_count": ["3", "7", "12", "20"]
}
```

**장점:** 작은 풀로도 조합 폭발을 활용하면 큰 다양성을 확보. PA의 10 테마 × 3~5개 형용사 × 3~5개 단서 = **150~250개 고유 플레이버 텍스트**를 50~70개 작성으로 커버.

---

## 3. 테마 × 레어리티 서사 깊이 매트릭스

### 3.1. 레어리티별 서사 구조 규칙

| 레어리티 | 서사 깊이 | 템플릿 구조 | 필수 요소 | 선택 요소 |
| :--- | :--- | :--- | :--- | :--- |
| **Normal** | 기원 힌트 (1줄) | `[상태_형용사] [아이템명]. [단서_문장]` | 플레이버 텍스트 1줄 | — |
| **Magic** | 소유자 + 사건 1개 | 플레이버 1줄 + 지층별 오브젝트 오버라이드 + 이노센트 1개 | 플레이버, 지층1 오브젝트, 이노센트 야생대사 | 이노센트 복종대사 |
| **Rare** | 짧은 단락 (전체 배경) | 3막 서사 + 2개 이노센트 + NPC 유령 1회 | 3막 곡선, NPC 유령 최소 1상태 | Ember 시각 이벤트 |
| **Legendary** | 다층 스토리 (지층마다 발견) | 3막 + 정보 공개 타임라인 + NPC 유령 다상태 + Fire 모멘트 | Fire 1문장, 정보 타임라인, NPC 3상태 | 고유 보스 서사 |
| **Ancient** | 미스터리 체인 (다수 아이템 연결) | Legendary 전체 + 다른 아이템과 연결되는 단서 1개 | 아이템간 연결 단서, 월드 빌딩 레이어 | 플레이어 커뮤니티 해독 대상 |

### 3.2. 레어리티별 작성 공수 추정

| 레어리티 | 예상 텍스트 노드 수 | 작성 시간 (추정) | 구성 비율 |
| :--- | :--- | :--- | :--- |
| Normal | 1 | 10분 | 고유 콘텐츠 10% / 모듈 90% |
| Magic | 8~12 | 1~2시간 | 고유 30% / 모듈 70% |
| Rare | 20~30 | 3~5시간 | 고유 50% / 모듈 50% |
| Legendary | 40~60 | 6~10시간 | 고유 70% / 모듈 30% |
| Ancient | 60~100 + 크로스 링크 | 10~20시간 | 고유 85% / 모듈 15% |

---

## 4. 서사가 던전 생성을 시딩하는 방법

### 4.1. 서사 변수 → 던전 파라미터 매핑 테이블

아이템의 기원 4요소(Creator, Purpose, History, Fate)와 테마 코드가 던전 생성 파라미터를 결정한다.

```
던전 생성 시드 구조:
  primary_theme      ← 아이템의 Purpose 또는 Fate에서 도출
  secondary_theme    ← 아이템의 Creator 또는 History에서 도출
  layer3_theme       ← T-PHANTOM + primary/secondary 혼합
  emotional_tone     ← [warm / cold / tense / melancholic / comedic]
  narrative_weight   ← rarity (1~5)
  boss_archetype     ← Purpose에서 도출 (수호자/분쟁자/증인/선택자)
```

**구체적 매핑 예시:**

| 기원 4요소 예 | 도출 파라미터 | 던전 결과 |
| :--- | :--- | :--- |
| Creator: "대장장이가 은퇴 선물로 제작" | primary=T-FORGE, secondary=T-HOME | 지층1=T-HOME, 지층2=T-FORGE |
| Purpose: "30년간 가족 식사 제조" | primary=T-HOME, emotional=warm | 환경 팔레트=주황/따뜻함, 음식 파티클 |
| History: "경비병 은퇴 후 사용" | secondary=T-MILITARY | 지층2에 T-MILITARY 요소 혼합 |
| Fate: "손녀가 생계 사정으로 판매" | layer3=crossroads, emotional=melancholic | 지층3=T-HOME+T-MILITARY 혼합, 석양 조명 |

### 4.2. 감정 기조 → 환경 파라미터 변환

```
emotional_tone → 환경 파라미터:

  warm:        색조=주황/황색, 조명강도=높음, 파티클=음식/불꽃, BGM=장조
  cold:        색조=회청/회색, 조명강도=낮음, 파티클=눈/안개, BGM=단조
  tense:       색조=적색/흑색, 조명=명암 대비 강함, 파티클=먼지/연기, BGM=긴장
  melancholic: 색조=회색/청보라, 조명=저광량 확산, 파티클=낙엽/재, BGM=느린 장조
  comedic:     색조=채도 높은 원색, 조명=균일, 파티클=별/반짝임, BGM=경쾌
```

### 4.3. 보스 아키타입 → 보스 행동 패턴 매핑

| 보스 아키타입 | Purpose 특성 | 전투 패턴 서사 | 예시 |
| :--- | :--- | :--- | :--- |
| 수호자 (Guardian) | 보호 목적의 아이템 | 방어적 AI, 공격보다 저지 | 갑주, 방패 계열 |
| 분쟁자 (Combatant) | 전투 목적의 아이템 | 공격적 AI, 높은 DPS | 검, 창 계열 |
| 증인 (Witness) | 관찰/기록 목적 | 지원형 AI, 환경 소환 | 지팡이, 서적 계열 |
| 선택자 (Crossroads) | 다중 목적의 아이템 | 위상 전환 AI, 복수 형태 | KitchenKnife의 갈림길 잔영 |
| 희생자 (Victim) | 소유자가 피해를 입은 아이템 | 약하지만 비극적, 연민을 유발 | 유물, 깨진 아이템 계열 |

---

## 5. 환경 스토리텔링 — 절차 맥락에서의 배치 원칙

### 5.1. Dead Cells 파생 배치 규칙 (PA 적용)

```
오브젝트 배치 우선순위 규칙:

  우선순위 1 (필수, Critical Path):
    위치: 보스 방 직전 방
    오브젝트: Fire 모멘트와 직결되는 고유 오브젝트 1개
    기능: 보스전 전에 핵심 서사 정보 전달

  우선순위 2 (필수, 시작 방):
    위치: 지층 입장 후 첫 번째 방
    오브젝트: 플레이버 텍스트의 물리적 특징과 일치하는 오브젝트 1개
    기능: 텍스트와 공간의 연속성 확립

  우선순위 3 (권장, 분기 방):
    위치: 선택적 탐험 분기 방 1~2개
    오브젝트: Ember(시각적 스펙터클) 오브젝트, 보조 이노센트
    기능: 탐험 보상, 비선형 서사 조각

  우선순위 4 (선택, NPC 배치):
    위치: 안전 지대 또는 특정 방
    오브젝트: NPC 유령 — 항상 움직임 없이 서 있거나 단순 동작
    기능: QBN 조건부 해금 콘텐츠
```

### 5.2. Show Don't Tell — PA 환경 서사 원칙 7개

Spelunky와 Dead Cells의 접근법에서 도출한 PA 고유 원칙:

1. **물리적 흔적이 말한다:** 닳은 자국, 긁힌 자국, 얼룩이 서사다. 텍스트 설명보다 먼저.
2. **오브젝트 상태가 시간을 말한다:** "끓고 있는 솥" = 얼마 안 됐다. 방금 여기 사람이 있었다.
3. **배치 패턴이 관계를 말한다:** 두 의자가 가까이 있으면 두 사람이 자주 함께했다.
4. **대비가 충돌을 말한다:** KitchenKnife 지층 3처럼 석조 바닥과 나무 마루의 혼합이 내적 갈등.
5. **빈 공간이 부재를 말한다:** 아이용 의자에 아무도 없다 = 상실.
6. **반복이 습관을 말한다:** "같은 칼자국 패턴" = 30년의 일상.
7. **조명이 감정을 말한다:** 석양 = 끝, 화덕 = 따뜻함, 횃불 = 긴장, 안개 = 망각.

---

## 6. 플레이어 대면 서사 전달 방식

### 6.1. 전달 채널 5가지

| 채널 | 타이밍 | 정보 밀도 | 수동/능동 | 예시 |
| :--- | :--- | :--- | :--- | :--- |
| 플레이버 텍스트 | 아이템 획득 시 (인벤토리) | 낮음 (1~2줄) | 수동 | "칼날에 기름때가 깊이 밴 칼. '충성'이라는 글자가 희미하게 새겨져 있다." |
| 환경 오브젝트 상호작용 | 지층 탐험 중 | 중간 (1~3줄) | 능동 | "작은 의자. 나무가 매끄럽게 닳아 있다." |
| 이노센트 대사 | 전투 중 / 안전 구역 | 낮음 (1줄) | 수동 | "그렇게 썰면 결이 죽어!" |
| NPC 유령 (텍스트 없는 행동) | 특정 방 진입 시 | 높음 (행동으로) | 수동 | 복도 끝을 바라보고 서 있다. 플레이어를 잠시 바라본 후 다시 앞을 본다. |
| 보스 행동 + kill_drop | 보스전 중 / 클리어 시 | 높음 (비언어) | 수동 | 갑옷이 조각나 쓰러진다. 파편 사이에서 메달이 굴러 나온다. |

### 6.2. 정보 공개 타임라인 설계 원칙

KitchenKnife의 정보 공개 타임라인에서 추출한 일반 원칙:

```
타임라인 설계 규칙:
  진입 전:  아이템 정체의 물리적 특징만 (What is it?)
  지층 1:   아이템의 가장 최근 사용 맥락 (What was it used for?)
  지층 2:   소유자의 정체 드러남 (Who owned it?)
  지층 3:   핵심 선택/감정 드러남 — Fire 모멘트 (Why does it matter?)
  클리어 후: Breathing Room — 해소 또는 여운

각 지층은 이전 지층의 답을 확인하면서 새로운 질문을 제기한다.
  지층1: "기름때 밴 칼이네" → 지층2 질문 생성: "경비병인데 왜 부엌칼을?"
  지층2: "경비병이었구나" → 지층3 질문 생성: "왜 그만두었나?"
  지층3: Fire — "사람을 베는 칼이 아니라 먹이는 칼을 쥐고 싶었다"
```

---

## 7. 확장성 — 1000개 아이템 규모 설계

### 7.1. 조합 폭발 계산

**현재 PA 구조 기반 이론적 조합 수:**

```
Primary Theme:      10개
Secondary Theme:    10개 (Primary 제외)
Rarity:              5개
Narrative Archetype: 10개 (SA-01~SA-10)
Emotional Tone:      5개
Creator Type:       20개 (직업군 카탈로그)
Boss Archetype:      5개

이론적 조합 = 10 × 10 × 5 × 10 × 5 × 20 × 5 = 25,000,000

현실적 필터링 (서사 비호환 조합 제거, ~99% 제거):
유효 조합 ≈ 250,000

목표 아이템 수: 1,000개
→ 250,000개 유효 조합 중 1,000개 선택 = 충분한 고유성
```

### 7.2. 반복감 인지 임계값

인지 심리학 연구(Procedural Content Generation for Games 서베이, 2014)에 따르면 플레이어는 다음 조건에서 반복을 인지한다.

- **동일 템플릿 + 동일 변수 조합**이 2회 이상 등장할 때
- **동일 구조의 서사**가 세션 내 3회 이상 반복될 때

따라서:
```
반복감 방지 전략:
  1. 세션 내 동일 Primary Theme 아이템 최대 2개 제한
  2. 동일 보스 아키타입 연속 등장 금지
  3. 이노센트 대사 Exhausted 처리 (Hades 방식)
  4. 플레이버 텍스트 seen_* 플래그로 동일 조합 재사용 방지
```

### 7.3. 템플릿 최소 필요 수량 계산

**목표: 1000개 아이템에서 반복감 없는 서사 제공**

```
레어리티별 분포 가정 (Diablo 방식):
  Normal:    500개 (50%)
  Magic:     300개 (30%)
  Rare:      150개 (15%)
  Legendary:  45개 (4.5%)
  Ancient:     5개 (0.5%)

템플릿 필요 수:
  Normal 플레이버:   10 테마 × 5 템플릿 = 50개 (500÷50=10회 재사용 — 허용)
  Magic 오브젝트:   10 테마 × 3 오브젝트 × 3 변형 = 90개
  Rare 서사 곡선:   10 아키타입 × 5 감정 = 50개 (뼈대)
  Legendary 고유:   45개 (대부분 수작업, 모듈 보조)
  Ancient 고유:      5개 (완전 수작업)

총 작성 텍스트 노드 수 (추정):
  Normal:    50 × 1노드 = 50
  Magic:     90 × 3노드 = 270
  Rare:      50 × 10노드 = 500
  Legendary: 45 × 50노드 = 2,250
  Ancient:    5 × 80노드 = 400

합계 ≈ 3,470 텍스트 노드
비교: Hades = 300,000 단어, Caves of Qud 코퍼스 = 40,000 단어
PA 목표 = 1000개 아이템 × 평균 3.5노드 = 적정 규모
```

### 7.4. 출시 후 확장 전략

```
새 테마 추가 (예: T-POISON — 독/연금술):
  1. MonsterPool에 T-POISON 섹션 추가 (4종 몬스터)
  2. EnvironmentPool에 T-POISON 팔레트 추가 (5요소 + 8이벤트)
  3. Flavor Text Corpus에 T-POISON 어휘 추가 (형용사 5개, 단서 5개)
  4. 기존 아이템 서사와 T-POISON 교차 조합 자동 생성
  비용: 기존 시스템 대비 약 10% 추가 작업

새 서사 아키타입 추가 (예: SA-11 복수의 서사):
  1. 아키타입 감정 곡선 정의 (3막 구조)
  2. 보스 아키타입 매핑
  3. 정보 공개 타임라인 템플릿
  4. 해당 아키타입에 맞는 기원 4요소 가이드라인
  비용: 2~4시간
```

---

## 8. PA 전용 절차적 서사 생성 프레임워크 — "기억 층위 생성 알고리즘 (Memory Strata Generation)"

### 8.1. 아이템 서사 생성 7단계 알고리즘 (의사코드)

```
function generate_item_narrative(rarity, item_category, drop_zone):

  # 단계 1: 기원 4요소 초기화
  creator_type  = sample(CREATOR_CATALOG filtered by drop_zone)
  purpose_verb  = sample(PURPOSE_VERBS filtered by item_category)
  era           = current_world_era  # 현재 PA 세계 기준
  fate_type     = sample(FATE_CATALOG)

  # 단계 2: 테마 도출 (역방향 인과 — Caves of Qud 방식)
  primary_theme   = map_theme(purpose_verb)          # 가장 최근 사용 맥락
  secondary_theme = map_theme(creator_type.context)  # 제작자 배경
  layer3_combo    = [primary_theme, secondary_theme, T_PHANTOM]

  # 단계 3: 감정 기조 결정
  emotional_tone = map_emotion(fate_type, era)  # Fate가 감정을 결정

  # 단계 4: 플레이버 텍스트 생성 (Tracery/Diablo 방식)
  flavor_text = generate_flavor(
    template = FLAVOR_TEMPLATES[primary_theme],
    state_adj = sample(STATE_ADJ[primary_theme]),
    clue = sample(CLUE_SENTENCES[primary_theme][creator_type])
  )

  # 단계 5: 서사 아키타입 선정
  archetype = select_archetype(creator_type, fate_type, rarity)

  # 단계 6: 레어리티별 서사 요소 생성
  if rarity == NORMAL:
    return {flavor_text: flavor_text}

  if rarity >= MAGIC:
    innocents  = generate_innocents(rarity, primary_theme, emotional_tone)
    objects_L1 = generate_objects(primary_theme, flavor_text)

  if rarity >= RARE:
    arc_3act   = generate_3act_arc(archetype, primary_theme, secondary_theme, emotional_tone)
    npc_ghost  = generate_ghost_states(arc_3act, rarity)
    fire_line  = generate_fire_moment(arc_3act.resolution, creator_type)

  if rarity >= LEGENDARY:
    info_timeline = generate_info_timeline(arc_3act)
    boss_override = generate_boss(arc_3act, archetype)
    breathing_room = generate_breathing_room(fire_line, emotional_tone)

  if rarity == ANCIENT:
    cross_link = generate_cross_item_link(arc_3act, world_mystery_pool)

  # 단계 7: 던전 생성 시드 패키지
  dungeon_seed = {
    layer1: {theme: primary_theme, palette: ENV_POOL[primary_theme], emotional_tone: emotional_tone},
    layer2: {theme: secondary_theme, palette: ENV_POOL[secondary_theme]},
    layer3: {theme: layer3_combo, palette: ENV_POOL["CROSSROADS"]},
    boss:   boss_override,
    npc:    npc_ghost
  }

  return {flavor_text, innocents, arc_3act, dungeon_seed, ...}
```

### 8.2. 검증 체크리스트 자동화

기존 수동 체크리스트(F-01~F-10)를 알고리즘으로 자동 검증하는 항목들:

```
AUTO-CHECKABLE:
  F-01: 기원 4요소 전부 작성       → 필드 null 체크
  F-03: 테마 ID가 기원과 논리 일치  → map_theme() 결과 검증
  F-08: 이노센트 수 = 레어리티 슬롯 → rarity.innocent_slots 비교

HUMAN-REQUIRED:
  F-02: 플레이버 텍스트가 보여주는가 → 리뷰 필요
  F-05: Fire 모멘트가 구체적 1문장인가 → 리뷰 필요
  F-07: 이노센트 대사가 Fire와 연결되는가 → 리뷰 필요
  F-09: kill_drop이 서사적 의미 있는가 → 리뷰 필요
```

---

## 9. 결론 및 PA 즉시 적용 권고사항

### 9.1. 즉시 적용 (현재 시스템에 통합 가능)

| 우선순위 | 기법 | 적용 위치 | 예상 효과 |
| :--- | :--- | :--- | :--- |
| P1 | Tracery 교체 문법 | 플레이버 텍스트 생성 | Normal 500개 텍스트 = 50개 템플릿으로 커버 |
| P1 | Hades Exhausted 패턴 | 이노센트 대사 시스템 | 반복감 0% |
| P1 | 역방향 인과 (Event-First) | 기원 4요소 작성 순서 가이드 | 작성 병목 해소 |
| P2 | QBN seen_* 플래그 | NPC 유령 상태 시스템 | 재방문 보상 구조화 |
| P2 | Dead Cells 배치 우선순위 | 오브젝트 배치 규칙 | 서사 핵심 보장 |
| P3 | 감정 기조 → 환경 파라미터 | 던전 생성 시드 | 테마-감정 자동 연결 |

### 9.2. 중기 적용 (시스템 구축 필요)

- **아키타입 카탈로그(SA-01~SA-10) 완성:** 현재 미완성 상태. 각 아키타입의 3막 서사 곡선 뼈대 정의 필요.
- **Creator Type 카탈로그(20종):** 기원 4요소의 Creator를 표준화하면 테마 도출이 자동화된다.
- **Fate Type 카탈로그(10종):** 아이템의 최종 상태 분류 (버려짐/상속/파손/전승/봉인 등) — 감정 기조 결정에 직접 연결.

### 9.3. 장기 고려 (Phase 3 이후)

- **Ancient 아이템 크로스 링크 시스템:** 여러 아이템의 서사가 같은 세계 이벤트를 공유하는 "미스터리 체인". 플레이어 커뮤니티의 집단 탐구 동기를 자극.
- **월드 히스토리 시뮬레이션 경량화 버전:** Dwarf Fortress 방식을 대폭 축소하여, 아이템의 Era 태깅이 세계관 타임라인과 연결되는 미니 역사 레이어 추가.

---

## 10. 참고 자료

- [Caves of Qud — Tapping into Procedural Generation (Game Developer)](https://www.gamedeveloper.com/design/tapping-into-the-potential-of-procedural-generation-in-caves-of-qud)
- [Caves of Qud — Generation of Mythic Biographies (PCG Workshop PDF)](https://www.pcgworkshop.com/archive/grinblat2017subverting.pdf)
- [Hades Dialogue System Analysis (Toolify)](https://www.toolify.ai/ai-news/unveiling-the-secrets-of-hades-dialogue-system-104463)
- [Wildermyth — Balancing Procedural and Intimate Storytelling (AIAS Podcast)](https://gamemakersnotebook.libsyn.com/balancing-procedural-and-intimate-storytelling-in-wildermyth)
- [Sunless Sea, 80 Days and the Rise of Modular Storytelling (Game Developer)](https://www.gamedeveloper.com/design/-i-sunless-sea-i-i-80-days-i-and-the-rise-of-modular-storytelling)
- [Beyond Branching: Quality-Based Narrative (Emily Short's Blog)](https://emshort.blog/2016/04/12/beyond-branching-quality-based-and-salience-based-narrative-structures/)
- [Dead Cells Level Design: A Hybrid Approach (Game Developer)](https://www.gamedeveloper.com/design/building-the-level-design-of-a-procedurally-generated-metroidvania-a-hybrid-approach-)
- [Attempted: Building a QBN System (Bruno Dias)](https://brunodias.dev/2017/05/30/an-ideal-qbn-system.html)
- [Sculpting Generative Text with Tracery (Andrew Zigler)](https://www.andrewzigler.com/blog/sculpting-generative-text-with-tracery/)
- [Legendary artifact — Dwarf Fortress Wiki](https://dwarffortresswiki.org/index.php/Legendary_artifact)
- [Procedural Storytelling in Game Design (Wiley Wiggins)](https://wileywiggins.com/documents/dorf/Short%20and%20Adams%20-%202019%20-%20Procedural%20storytelling%20in%20game%20design.pdf)
