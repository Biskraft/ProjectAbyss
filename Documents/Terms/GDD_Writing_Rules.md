# Project Abyss: GDD 작성 표준 가이드 (GDD Writing Standards)

본 문서는 Project Abyss의 기획서가 "문서이자 데이터베이스"로 기능하기 위한 작성 규칙을 정의합니다. 레퍼런스 분석(GDC 강연, 사쿠라이 인사이트, GMTK 등)과 실전 GDD 사례를 기반으로 합니다.

---

## 0. 필수 참고 자료 (Mandatory References)

모든 기획서 작성 및 수정 시, 다음의 자료를 반드시 참고하여 문맥과 규칙을 유지해야 합니다.

* Project Vision: `Documents/Terms/Project_Vision_Abyss.md` (3대 기둥, 3-Space, 핵심 판타지, 금지 규칙)
* Writing Standards: `Documents/Terms/GDD_Writing_Rules.md` (본 문서)
* Sheets Writing Rules: `Documents/Terms/Sheets_Writing_Rules.md` (CSV 데이터 시트 작성 규칙)
* Document Index: `Documents/Terms/Document_Index.md` (전체 문서 트리 및 의존 관계)
* Glossary: `Documents/Terms/Glossary.md` (공식 용어 사전 - 폐기 용어 체크 필수)
* Game Overview: `Reference/게임 기획 개요.md` (전체 게임 설계서)

### 레퍼런스 자료

* 디스가이아 시스템 분석: `Reference/디스가이아 시스템 분석.md` (아이템계, 이노센트, 야리코미)
* 캐슬바니아 시스템 분석: `Reference/캐슬바니아 시스템 분석.md` (탐험, 맵 구조, 능력 게이트)
* 아이템계 역기획서: `Reference/Disgaea_ItemWorld_Reverse_GDD.md`
* 스펠렁키 레벨 생성 역기획서: `Reference/Spelunky-LevelGeneration-ReverseGDD.md`
* 메트로베니아 디자인 심층 분석: `Reference/Metroidvania Game Design Deep Dive.md`
* Sakurai Insights: `Reference/sakurai/` (Risk & Reward, 파라미터 설계)
* GMTK Insights: `Reference/gmtk/` (MDA, 레벨 디자인, 플레이어 유도)
* Extra Credits Insights: `Reference/extracredit/` (플레이어 심리학, 윤리적 디자인)
* Design Docs Insights: `Reference/designdocs/` (보스 디자인 프레임워크, UI/UX 원칙)
* GDC 강연: `Reference/gdc/` (절차적 생성, 소통 프로토콜, Cursed Problems)

---

## 0.5. 게임 디자인 기본 원칙 (Game Design Fundamentals)

모든 시스템 기획 시 다음의 게임 디자인 본질을 이해하고 적용해야 합니다.

### 0.5.1. 게임성의 정의: 리스크와 리턴 (Risk & Reward)

> 게임성(Game Essence) = 리스크와 리턴의 균형 = 의사결정

핵심 원칙:

* 리스크(Risk): 플레이어가 감수해야 하는 위험 (적과의 거리, 실수 가능성, 자원 소모)
* 리턴(Reward): 리스크를 감수했을 때 얻는 보상 (진행, 적 제거, 아이템 획득, 능력 해금)
* 최상의 게임성: 리스크가 최대일 때 리턴을 획득할 수 있는 구조

GDD 적용 방법:

```yaml
# 시스템 설계 시 필수 질문
risk_reward_analysis:
  risk: "플레이어가 이 행동을 할 때 감수하는 위험은 무엇인가?"
  reward: "성공 시 얻는 보상은 무엇인가?"
  balance: "리스크와 리턴의 비율이 적절한가?"
  peak_moment: "최대 리스크 = 최대 리턴인 순간이 있는가?"
```

Project Abyss 적용 예시:

* 월드 탐험: 미지의 구역 진입(리스크: 사망 시 세이브 포인트 복귀) -> 새 능력 발견(리턴)
* 아이템계: 깊은 층 도전(리스크: 탈출 실패 시 진행 손실) -> 이노센트/레어리티 승급(리턴)
* 재귀적 진입: 아이템계 내 아이템의 아이템계 진입(리스크: 전멸 시 상위 층도 손실) -> 이중 강화(리턴)

### 0.5.2. 독창성 창출: 분해-분석-재구축 (Deconstruct-Analyze-Rebuild)

단순 모방이 아닌, 재미의 본질을 이해하고 독창적으로 재구성하는 3단계 방법론:

* 1단계 분해: 어떤 요소가 재미있는가? 핵심 메커니즘 식별
* 2단계 분석: 왜 재미있는가? 재미의 본질 파악
* 3단계 재구축: 게임적으로 더 재미있게 만들려면? 본질을 유지하며 독창적 변형

GDD 적용:

```markdown
## 설계 의도 (Design Intent)

### 분해 (Deconstruct)
- 참고 게임: [게임명]
- 재미 요소: [구체적 메커니즘]

### 분석 (Analyze)
- 재미의 본질: [리스크와 리턴 분석]
- 플레이어 감정: [긴장감, 성취감 등]

### 재구축 (Rebuild)
- 독창적 변형: [본질은 유지하되 차별화 요소]
- 추가 가치: [Project Abyss만의 강점]
```

Project Abyss 적용 예시:

* 분해: "디스가이아의 아이템계는 장비 안에 100층 던전이 있다"
* 분석: "아이템에 감정적 애착 + 끝없는 성장 목표 = 야리코미의 핵심"
* 재구축: "아이템계 + 메트로베니아 탐험 능력 활용 + 온라인 협동 = 3-Space 순환"

### 0.5.3. 보상 시스템 설계 원칙

기획 초기 단계에 반드시 정의:

* 플레이어에게 무엇을 보상으로 줄 것인가?
* 보상이 없으면 진행 동기가 사라짐

Project Abyss 보상 유형:

```yaml
reward_types:
  exploration:  # 탐험 보상
    - ability_unlock: "능력 렐릭 획득 (이단 점프, 벽 타기 등)"
    - map_reveal: "새 구역 발견, 숨겨진 방"
    - lore: "세계관 단편, NPC 대화"

  yarikomi:  # 야리코미 보상
    - item_growth: "레어리티 승급, 아이템 레벨 상승"
    - innocent_capture: "이노센트 포획/복종"
    - recursive_depth: "재귀 진입으로 이중 강화"

  multiplayer:  # 멀티플레이 보상
    - party_bonus: "파티 클리어 보상 배율 증가"
    - trade: "거래소 경제 활동"
    - social: "허브 내 장비 자랑, 길드 활동"

  progression:  # 성장 보상
    - stat_gate_unlock: "스탯 게이트 해금 -> 새 구역"
    - skill_tree: "스킬 트리 확장"
    - reincarnation: "전생으로 잠재력 상승"
```

### 0.5.4. 직관적이고 일관된 규칙 (Intuitive & Consistent Rules)

* Consistency: "A는 항상 B다"라는 규칙이 상황에 따라 "C일 수도 있다"로 바뀌면 안 된다. 예외가 많을수록 학습 곡선은 가파라진다.
* Simplicity: 룰이 두 개가 충돌하거나 조건이 복잡해지면(If-Else), 과감하게 하나를 제거하거나 통합하여 단순화해야 한다.
* 3-Space 일관성: 각 공간(월드/아이템계/허브)의 규칙은 해당 공간 내에서 일관성을 유지한다. 공간 간 규칙 충돌이 발생하면 3-Space 분리 원칙으로 해결한다.

### 0.5.5. 창발적 깊이: 상호작용의 조합 (Combinatorial Depth)

개별 규칙은 단순해야(Simplicity) 하지만, 그들이 만났을 때의 결과는 다채로워야(Depth) 한다. 복잡한 조건문(If-Else)으로 깊이를 만들지 말고, 시스템 간의 화학 작용(Chemistry)으로 유도한다.

* Multiplication Rule: A와 B가 만났을 때 단순히 A+B가 아닌, A x B의 새로운 결과가 나와야 한다.
* Systemic Interaction: 모든 오브젝트는 정해진 "속성(Tag)"에 따라 일관되게 반응해야 한다.

Project Abyss 적용 예시:

* 단순 합산(Bad): "불 속성 무기로 얼음 적을 치면 데미지 10% 증가"
* 상태 변화(Good): "불 속성 무기로 얼음 적을 치면 녹아서 물 웅덩이 생성 -> 번개 스킬이 감전 범위 확대"
* 3-Space 연계: "월드에서 습득한 안개 변신 -> 아이템계의 좁은 틈새를 통과 -> 숨겨진 이노센트 방 발견"

### 0.5.6. 파라미터 설계 철학

모든 조정 대상 수치는 외부 데이터로 분리하여 빠른 반복 테스트가 가능해야 한다.

* 프로그램 코드 = 골격 (뼈대)
* 파라미터 = 근육 (조정 가능한 수치)

필수 요구사항:

```yaml
parameter_requirements:
  external_management: "CSV(Sheets/)로 관리"
  formula_support: "상대 참조 가능 (A기술 = B기술 * 0.5)"
  iteration_speed: "수정 후 즉시 테스트 가능"
  ssot_link: "GDD 본문에서 Sheets/ CSV를 참조 링크로 연결"
```

GDD 작성 시:

* 본문에 하드코딩 금지: "대미지 50" (X)
* 파라미터 참조 사용: "대미지(`Base_Damage`)" (O)
* CSV 참조: "`Sheets/Content_System_Damage_Formula.csv` 참조" (O)

---

## 1. 핵심 원칙 (Core Principles)

### 1.1. 단일 진실 공급원 (SSoT: Single Source of Truth)

* 원칙: 모든 데이터와 규칙은 단 한 곳에만 정의되어야 한다.
* 적용: 다른 문서에서 해당 정보가 필요할 경우, 내용을 복사하지 말고 반드시 링크(Link)를 통해 참조한다.
  * Bad: "이노센트 슬롯은 Common 2개, Rare 4개이다." (여러 문서에 반복 기술)
  * Good: "이노센트 슬롯 수는 `System/System_Equipment_Rarity.md`의 [Slot Rules] 섹션을 따른다."
* 수치 데이터는 `Sheets/` CSV가 SSoT이다. GDD 본문에는 규칙과 로직만 기술하고, 구체적 수치는 CSV를 참조한다.

### 1.2. 계층 평탄화 (Flattened Hierarchy)

* 원칙: 문서의 헤더(ToC) 깊이는 최대 4단계(`####`)까지만 허용한다.
* 이유: 과도한 깊이는 가독성을 해치고 Agent(AI)의 문서 파싱 효율을 떨어뜨린다. 단, `###` 하위의 개별 항목을 구분하는 `####`는 네비게이션과 검색에 유용하므로 허용한다.
* 적용: 5단계(`#####`) 이상의 세부 항목은 불릿 포인트(-) 또는 테이블로 처리한다.
  * `# 대분류 > ## 중분류 > ### 소분류 > #### 세부 항목 > - 리스트 항목`

### 1.3. 데이터 임베딩 (Data Embedding)

* 원칙: 기획서 내의 수치 데이터는 단순 텍스트가 아닌, 코드 블록(Code Block) 형태로 작성하여 추출 및 자동화가 가능하게 한다.
* 포맷: `yaml`, `json`, `csv` 사용. (주석이 필요한 설정값은 `yaml` 권장)
* 예시:

    ```yaml:skill_config
    id: SKL_FIRE_SLASH
    base_damage_ratio: 2.5
    cooldown_s: 8.0
    # 자동 조준 시 가장 가까운 적 타겟
    auto_aim: true
    aoe_radius_px: 120
    ```

### 1.4. 3대 기둥 정렬 의무 (Pillar Alignment Requirement)

* 원칙: 모든 시스템 문서는 3대 기둥(탐험 / 야리코미 / 멀티플레이) 중 최소 1개에 정렬되어야 한다.
* 적용: 어느 기둥에도 해당하지 않는 시스템은 프로젝트에 포함하지 않는다.
* 표기: 문서 상단 메타데이터에 반드시 `기둥:` 필드를 명시한다.

### 1.5. 3-Space 명시 의무 (3-Space Declaration Requirement)

* 원칙: 모든 시스템 문서는 해당 시스템이 작동하는 공간(World / Item World / Hub / 전체)을 명시해야 한다.
* 적용: 동일 시스템이라도 공간에 따라 규칙이 달라질 수 있으므로, 공간별 차이점을 명확히 기술한다.
* 표기: 문서 상단 메타데이터에 반드시 `3-Space:` 필드를 명시한다.

---

## 2. 문서 구조 포맷 (Document Structure)

모든 시스템 설계 문서는 다음 구조를 준수해야 한다.

### 2.0. 구현 현황 (Implementation Status) - 문서 최상단

모든 시스템 문서는 제목 바로 아래에 다음 메타데이터 블록을 배치한다:

```markdown
## 구현 현황 (Implementation Status)

> 최근 업데이트: [날짜]
> 문서 상태: `작성 중 (Draft)` / `검토 중 (Review)` / `확정 (Final)`
> 3-Space: [World / Item World / Hub / 전체]
> 기둥: [탐험 / 야리코미 / 멀티플레이 / 전체]

| 기능 ID | 분류 | 기능명 | 우선순위 | 구현 상태 | 비고 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| [ID] | [분류] | [기능명] | P0-P3 | [상태] | [비고] |
```

구현 상태 표기:

| 상태 | 의미 |
| :--- | :--- |
| 대기 | 미착수 |
| 진행 중 | 개발/작성 중 |
| 완료 | 구현/검증 완료 |
| 보류 | 의존성 또는 결정 대기 |

우선순위 정의:

| 등급 | 의미 | Phase |
| :--- | :--- | :--- |
| P0 | 핵심 루프 필수. 이것 없이는 게임이 성립하지 않음 | Phase 1 |
| P1 | 핵심 경험 필수. 없으면 재미가 크게 저하됨 | Phase 1-2 |
| P2 | 중요하지만 후순위. 게임 완성도에 기여 | Phase 2-3 |
| P3 | 있으면 좋음. 폴리싱/라이브 서비스 단계 | Phase 3-4 |

### 2.1. 개요 (Concept) - 필수 섹션 0-1

문서 상단에 배치하여 읽는 이(인간/AI)가 맥락을 먼저 파악하게 한다.

필수 포함 항목:

* 설계 의도 (Intent): 이 시스템이 해결하려는 문제, 핵심 재미, 한 줄 요약
* 설계 근거 (Reasoning): 주요 설계 결정과 그 이유를 테이블로 정리
* 3대 기둥 정렬 (Pillar Alignment): 각 기둥에서 이 시스템이 어떻게 기여하는지 명시
* 저주받은 문제 검증 (Cursed Problem Check): 상충하는 설계가 없는지 검증
* 위험과 보상 (Risk & Reward): 플레이어 행동별 리스크/리턴 분석

### 2.2. 메커닉 (Mechanics) - 필수 섹션 2-3

게임 내에서 발생하는 현상을 동사(Verb) 중심으로 서술한다.

* "플레이어는 [행동] 할 수 있다" 또는 "오브젝트는 [조건] 시 [반응] 한다"
* 3-Space별로 메커닉이 달라지는 경우, 공간별로 분리 기술한다.

### 2.3. 규칙 (Rules) - 필수 섹션 4-5

메커닉이 작동하기 위한 구체적인 조건(Conditions), 처리(Process), 결과(Effect)를 명시한다.

* 모호한 표현("적절히", "상당한")을 금지하고, 로직을 명확히 한다.
* 수치가 필요한 부분은 파라미터명으로 참조한다.

### 2.4. 데이터 & 파라미터 (Parameters) - 필수 섹션 6

밸런싱 대상이 되는 모든 수치는 이 섹션에 코드 블록이나 CSV 링크(`Sheets/...csv`)로 분리한다.

* 본문 규칙 섹션에 하드코딩된 숫자를 넣지 않는다.
  * Bad: "대미지를 50 준다"
  * Good: "대미지(`Base_Damage`)를 준다. 구체적 수치는 `Sheets/Content_System_Damage_Formula.csv` 참조"

### 2.5. 예외 처리 (Edge Cases) - 필수 섹션 7

네트워크 단절, 동시 입력, 자원 부족 등 실패 케이스에 대한 처리 방침을 반드시 기술한다.

Project Abyss 특수 예외:

* 아이템계 중 접속 끊김: 현재 층 진행 보존 여부
* 재귀적 진입 중 사망: 상위 아이템계로의 복귀 규칙
* 멀티플레이 중 파티원 이탈: 난이도 동적 조정 여부
* 월드 탐험 중 세이브 포인트 미저장 사망: 복구 규칙

---

## 3. Design & Communication (GDC Insights)

### 3.1. 저주받은 문제 확인 (Cursed Problem Check)

* 원칙: 기획 초기에 상충하는 두 가지 약속(Incompatible Player Promises)이 없는지 확인한다.
* 적용: 발견된다면, 해결하려 하지 말고(불가능함), 어느 한 쪽을 희생(Sacrifice/Weaken)하거나 제약을 두어 명시해야 한다.

Project Abyss의 핵심 Cursed Problems:

| 문제 | 해결 방향 |
| :--- | :--- |
| 메트로베니아 탐험감 vs 온라인 멀티 | 3-Space 분리: 월드는 솔로-2인, 아이템계는 1-4인 |
| 야리코미(무한 파밍) vs 탐험의 가치 보존 | 순환 구조: 깊은 아이템계를 위해 넓은 월드 탐험 필요 |
| 자동 사냥 편의성 vs 직접 플레이 유인 | 수동 정복 선행 + 자동 사냥 효율 상한(60%) |
| 솔로 재미 vs 파티 필수 콘텐츠 | "혼자서도 재미있고 함께하면 더 재미있다" 원칙 |

### 3.2. 소통 규약 (Communication Protocol)

* 용어 통일: 반드시 `Glossary.md`를 참조하여 공식 용어를 사용하고, 폐기된 용어를 확인한다.
* 명시적 우선순위: "하면 좋음"과 "필수"를 명확히 구분한다. `P0`, `P1`, `P2`, `P3` 등급을 사용한다.
* 질문법: 피드백 수용 시 "무엇을 고치려고 하는가? (What are you trying to fix?)"를 먼저 정의한다.

### 3.3. 프로토타이핑 (Prototyping)

* 복잡한 메커니즘은 장황한 텍스트보다 작동하는 프로토타입이 훨씬 강력한 기획서가 된다.
* 텍스트로 설명하기 힘든 "느낌(Feel)"이나 "타이밍"은 프로토타입 제작을 우선 과제로 설정한다.
* Project Abyss 우선 프로토타입 대상: 캐릭터 이동/점프 물리, 타격감(히트스탑/넉백), 절차적 방 생성

---

## 4. 작성 스타일 (Writing Style)

### 4.1. 능동태와 명확성

주어(Actor)를 명확히 한다.

* Bad: "공격이 되면 체력이 깎인다." (누가 공격? 무엇의 체력?)
* Good: "플레이어 캐릭터(`PlayerCharacter`)의 공격이 적(`Enemy`)에 적중하면, 적의 체력(`HP`)을 `Base_Damage` 수식에 따라 감소시킨다."

### 4.2. 시각화 (Visualization)

* 복잡한 상태 전이(State Machine)나 흐름은 Mermaid 다이어그램을 사용하여 시각화한다.
* UI 배치의 경우 와이어프레임 이미지나 텍스트 묘사를 포함한다.

### 4.3. 마크다운 형식 제한 (Markdown Format Restrictions)

* 볼드(`**`) 사용 금지:
  * 본문, 테이블 셀, 리스트 항목에서 볼드 서식을 사용하지 않는다.
  * 이유: 테이블 셀 내 볼드는 렌더러별로 패딩/공백 처리 방식이 달라 서식이 깨진다.
  * 허용 예외: `>` blockquote 내의 설계 원칙/포인트 라벨만 볼드를 허용한다.
  * 대안: 강조가 필요하면 문장 구조로 중요도를 드러내거나, 테이블의 열 제목을 활용한다.

  | 위치 | 사용 가능 여부 | 예시 |
  | :--- | :--- | :--- |
  | 본문 텍스트 | 금지 | "좀비는 환경 위협이다" (볼드 없이) |
  | 테이블 셀 | 금지 | 셀 내용은 평문으로 |
  | 리스트 항목 | 금지 | "* 이동성: 설명" (볼드 없이) |
  | blockquote 라벨 | 허용 | `> **설계 원칙:** 내용` |
  | 섹션 제목 (`#`) | 불필요 | 헤더 자체가 볼드이므로 중복 |

* 스마트 따옴표(Curly Quotes) 사용 금지:
  * 반드시 직선 따옴표 `"` 및 `'`를 사용한다.

* GFM Alert 문법 사용 금지:
  * `> [!NOTE]`, `> [!TIP]` 등의 구문은 사용하지 않는다.
  * 대체: 이모지 + blockquote 패턴을 사용한다.

* 숫자 범위 물결표(`~`) 사용 금지:
  * 숫자 범위를 나타낼 때 하이픈(`-`)을 사용한다.
  * Bad: `Tier 3~4 무기가 Tier 1~2 대비` (취소선 발생 위험)
  * Good: `Tier 3-4 무기가 Tier 1-2 대비`

### 4.4. 문서 버전 및 Phase 관리 전략

장기적인 라이브 서비스와 점진적 업데이트를 고려하여, 기획서는 "현재 시점에 구현되어야 할 최종 스펙"을 유지하는 것을 원칙으로 한다.

#### 4.4.1. 단일 "살아있는 문서" 유지 (Living Document) - 권장

* 원칙: 문서는 철저히 현재 목표 Phase(예: Phase 1) 스펙으로만 작성한다. 미래 Phase 내용은 구현 현황 테이블의 우선순위(P2, P3)로 표기하거나 별도 아이디어 문서로 분리한다.
* 갱신: 다음 Phase 개발이 시작되면 기존 문서를 해당 Phase 스펙으로 개정한다.
* 아카이빙: 기존 Phase 스펙 문서는 `Documents/Archive/[문서명]_vP1.md` 형태로 백업한다.

#### 4.4.2. 모듈 기반 분할 (Modularization) - 예외적용

* 조건: 단일 시스템에 새로운 룰이 대규모로 추가되면서 Flattened Hierarchy(최대 4단계)를 초과할 경우에만 사용한다.
* 관리법: 기존 뼈대 문서는 유지하고, 신규 모듈을 위한 새 문서를 작성하여 링크로 연결한다.
  * 예: `System_ItemWorld_Core.md` -> `System_ItemWorld_Recursion.md` (재귀적 진입 상세)

### 4.5. 파일 네이밍 규칙 (File Naming Convention)

모든 GDD 문서의 파일명은 `대분류_중분류_소분류.md` 3단계 구조를 따른다.

#### 4.5.1. 기본 구조

```text
대분류_중분류_소분류.md
```

* 대분류: 문서의 성격 (System / Design / UI / Content)
* 중분류: 기능 영역 또는 도메인
* 소분류: 구체적 주제

#### 4.5.2. 대분류 정의 (4종)

| 대분류 | 의미 | 저장 위치 | 예시 |
| :--- | :--- | :--- | :--- |
| System | 게임 시스템 규칙, 메커닉 | `Documents/System/` | `System_Combat_Action.md` |
| Design | 상위 설계 철학, 분석, 원칙 | `Documents/Design/` | `Design_Architecture_3Space.md` |
| UI | 사용자 인터페이스 화면/위젯 | `Documents/UI/` | `UI_HUD_Layout.md` |
| Content | 콘텐츠 목록 | `Documents/Content/` | `Content_Weapons_List.md` |

#### 4.5.3. 공인 중분류 목록

System 중분류:

| 중분류 | 범위 | 포함 소분류 예시 |
| :--- | :--- | :--- |
| 3C | 캐릭터/카메라/컨트롤 | Character, Camera, Control |
| Combat | 전투 관련 | Action, Damage, Weapons, SubWeapon, Elements, StatusEffects, HitFeedback |
| Growth | 성장 시스템 | Stats, LevelExp, SkillTree, Reincarnation |
| Equipment | 장비 시스템 | Slots, Rarity, Growth |
| World | 월드 시스템 | MapStructure, ZoneDesign, AbilityGating, StatGating, ProcGen, SaveWarp, Secrets |
| ItemWorld | 아이템계 시스템 | Core, FloorGen, Boss, Recursion, Events, GeoEffects |
| Innocent | 이노센트 시스템 | Core, Farm, Dual |
| Enemy | 적/AI 시스템 | AI, BossDesign, Spawning |
| Multi | 멀티플레이 | Architecture, Party, NetworkSync, GhostMessage |
| Economy | 경제 시스템 | Resources, Trade, AutoHunt |
| Hub | 허브 시스템 | Facilities, NPCShop |

Design 중분류:

| 중분류 | 범위 | 포함 소분류 예시 |
| :--- | :--- | :--- |
| Architecture | 전체 구조 | 3Space |
| CoreLoop | 순환 구조 | Circulation |
| Difficulty | 난이도 철학 | Progression |
| Metroidvania | 메트로베니아 철학 | Philosophy |
| Yarikomi | 야리코미 철학 | Philosophy |
| Online | 온라인 설계 | Principles |
| Economy | 경제 설계 | FaucetSink |
| Season | 시즌/라이브 서비스 | LiveService |

UI 중분류:

| 중분류 | 범위 | 포함 소분류 예시 |
| :--- | :--- | :--- |
| HUD | 인게임 HUD | Layout |
| Inventory | 인벤토리 | (단일 문서) |
| Map | 맵 UI | (단일 문서) |
| ItemWorld | 아이템계 UI | (단일 문서) |
| InnocentFarm | 이노센트 목장 UI | (단일 문서) |
| PartyMatching | 파티/매칭 UI | (단일 문서) |

Content 중분류:

| 중분류 | 범위 | 포함 소분류 예시 |
| :--- | :--- | :--- |
| Weapons | 무기 목록 | List |
| Armor | 방어구/악세서리 | List |
| Innocent | 이노센트 카탈로그 | Catalog |
| Monster | 몬스터 도감 | Bestiary |
| Zone | 구역/바이옴 | List |
| Skill | 스킬 목록 | List |
| Boss | 보스 목록 | List |
| RoomTemplate | 룸 템플릿 | Catalog |

#### 4.5.4. 작성 규칙

1. 3단계 필수: 모든 신규 문서는 반드시 `대분류_중분류_소분류.md` 형태로 작성한다.
2. PascalCase: 각 단어의 첫 글자를 대문자로, 단어 구분은 `_` (언더스코어).
3. 중분류 신설: 위 목록에 없는 중분류가 필요하면 이 문서에 먼저 등록한 뒤 사용한다.
4. Document_Index 동기화: 새 문서를 추가하면 반드시 `Document_Index.md`에도 등록한다.

---

## 5. 검증 체크리스트 (Verification Checklist)

문서 작성 완료 전, 다음 항목을 스스로 점검한다.

### 5.1. 기본 구조 (Basic Structure)

1. [ ] Intent: "무엇을 해결하려고 하는가"가 명확한가?
2. [ ] Cursed Problem: 상충하는 플레이어 약속이 없는가? (있다면 타협점이 명시되었는가?)
3. [ ] SSoT: 다른 문서와 중복된 데이터가 없는가? (Link 사용)
4. [ ] Data Extraction: 숫자가 본문에 하드코딩되지 않고 `yaml`/`csv`로 분리되었는가?
5. [ ] Vocabulary: 용어가 `Glossary.md`의 공식 명칭과 일치하며, 폐기 용어가 사용되지 않았는가?
6. [ ] Edge Cases: 예외 상황(네트워크, 리소스 부족 등) 처리가 명시되었는가?
7. [ ] Implementation Status: 문서 상단에 구현 현황 테이블이 존재하는가?

### 5.2. Project Abyss 정렬 (Project Alignment)

1. [ ] 3대 기둥 정렬: 이 시스템이 탐험/야리코미/멀티플레이 중 최소 1개에 기여하는가?
   * 정렬 기둥: [탐험 / 야리코미 / 멀티플레이]
   * 구체적 기여: [기둥별 기여 내용]

2. [ ] 3-Space 명시: 이 시스템이 작동하는 공간이 명확히 정의되었는가?
   * 작동 공간: [World / Item World / Hub / 전체]
   * 공간별 규칙 차이가 기술되었는가?

3. [ ] 순환 구조 강화: 이 시스템이 핵심 루프(탐험 -> 획득 -> 강화 -> 해금 -> 탐험)의 어느 단계를 지원하는가?

4. [ ] 이중 게이트 검증: 이 시스템이 능력 게이트/스탯 게이트와 어떤 관계인가?
   * 해당 없음 / 능력 게이트 관련 / 스탯 게이트 관련 / 양쪽 모두

5. [ ] 금지 규칙 준수: Project Vision의 핵심 금지 규칙(Pay-to-Win 금지, PvP 강제 금지, 에너지 시스템 금지 등)을 위반하지 않는가?

### 5.3. 게임 디자인 본질 (Game Design Fundamentals)

1. [ ] Risk & Reward: 플레이어가 감수하는 리스크와 얻는 리턴이 명확히 정의되었는가?
   * 리스크: [플레이어가 감수하는 위험 요소]
   * 리턴: [성공 시 얻는 보상]
   * 최대 리스크 = 최대 리턴 순간이 존재하는가?

2. [ ] Design Methodology: 분해-분석-재구축 과정을 거쳤는가?
   * 참고한 메커니즘의 본질을 이해했는가?
   * 단순 모방이 아닌 독창적 재구성인가?

3. [ ] Reward System: 플레이어 동기를 유지할 보상이 설계되었는가?
   * 즉각적 보상 (전투, 아이템 드랍)
   * 중기적 보상 (장비 강화, 스킬 해금)
   * 장기적 보상 (스탯 게이트 해금, 레어리티 승급, 전생)

4. [ ] Parameter Design: 조정 대상 수치가 CSV로 분리 가능한가?
    * `Sheets/` CSV 관리 가능
    * 상대 참조 및 수식 활용 가능

5. [ ] MDA Framework: Mechanics-Dynamics-Aesthetics가 명확히 정의되었는가?
    * Mechanics: 플레이어가 할 수 있는 행동
    * Dynamics: Mechanics의 상호작용으로 발생하는 패턴
    * Aesthetics: 플레이어가 느끼는 감정적 경험

6. [ ] Combinatorial Depth: 시스템 간 상호작용이 단순 수치 합산이 아닌 창발적 결과를 만드는가?

7. [ ] Cross-Platform: PC와 모바일 모두에서 동일한 경험을 제공하는가? (터치 입력, 가상 패드 고려)

---

## 6. 참고 자료 & 더 읽기 (References & Further Reading)

### 게임 디자인 이론

Sakurai Masahiro Insights (`Reference/sakurai/`)

* Risk & Reward 이론 상세 해설
* 점프 물리, 튜토리얼 설계 등 세부 사례
* 파라미터 설계 철학

GMTK (Game Maker's Toolkit) (`Reference/gmtk/`)

* MDA Framework (Mechanics-Dynamics-Aesthetics)
* 4단계 레벨 디자인 (기승전결)
* 퍼즐 설계 및 플레이어 유도

Extra Credits (`Reference/extracredit/`)

* Bartle's Taxonomy (Achievers/Explorers/Socializers/Killers)
* Intrinsic vs Extrinsic Rewards
* Humane Design 윤리 (Skinner Box 지양, 플레이어 시간 존중)

Design Docs (`Reference/designdocs/`)

* Boss Design Framework (Test/Narrative/Pace 3가지 역할)
* UI/UX Principles (Clarity, Theming, Diegetic UI)

### 역기획서 & 시스템 분석

* 디스가이아 아이템계 역기획서: `Reference/Disgaea_ItemWorld_Reverse_GDD.md`
* 스펠렁키 레벨 생성 역기획서: `Reference/Spelunky-LevelGeneration-ReverseGDD.md`
* 데드셀 레벨 생성 역기획서: `Reference/DeadCells-LevelGeneration-ReverseGDD.md`
* 메트로베니아 디자인 심층 분석: `Reference/Metroidvania Game Design Deep Dive.md`
* 디스가이아 시스템 분석: `Reference/디스가이아 시스템 분석.md`
* 캐슬바니아 시스템 분석: `Reference/캐슬바니아 시스템 분석.md`

### GDC 강연 분석

* Cursed Problems in Game Design (`Reference/gdc/`)
* The Spelunky HD Postmortem - 절차적 생성과 일관성
* Designers Are from Saturn... - 소통 프로토콜

---

문서 버전: v4.0 (Project Abyss 전용 개조)
마지막 업데이트: 2026-03-23
작성자: Project Abyss Team
