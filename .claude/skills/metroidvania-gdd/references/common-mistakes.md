# 흔한 실수 목록 (Common Mistakes)

이 문서는 GDD 작성 시 자주 발생하는 실수를 정리하고, 올바른 작성 방법을 안내합니다.

---

## CM-01: 범위 과대 (Scope Creep)

설명: 하나의 문서에 너무 많은 하위 시스템을 포함
감지: 하위 시스템이 3개 이상이면 경고
수정: 각 하위 시스템을 별도 문서로 분리하고 상호참조

Bad:
```
# 전투 시스템
(데미지, 스킬, 버프, 디버프, 원소 상성, PvP, 파티 시너지를 모두 한 문서에)
```

Good:
```
# SYS_Combat_Damage.md  → 데미지 계산
# SYS_Combat_Skill.md   → 스킬 시스템
# SYS_Combat_Element.md → 원소 상성
(각각 상호참조 링크)
```

---

## CM-02: 주관적 서술 (Subjective Writing)

설명: 객관적 사실 대신 감정/의견을 기술
감지: "재미있다", "좋다", "멋진", "완벽한" 등의 형용사 사용

Bad: "이 시스템은 매우 재미있고 플레이어들이 좋아할 것이다"
Good: "10층마다 보스를 배치하여 중간 목표를 제공하고, 보스 처치 시 Innocent 드롭을 보장한다"

---

## CM-03: 모호한 표현 (Vague Language)

설명: 구체적 수치나 조건 없이 "적절히", "충분히" 등 사용
감지 키워드: "아마도", "할 수도 있다", "적절히", "대략", "보통", "어느 정도", "때에 따라"

Bad: "적절한 시간 후에 보스가 등장한다"
Good: "10층 클리어 후 11층 진입 시 보스가 등장한다"

---

## CM-04: 수치 하드코딩 (Hardcoded Values)

설명: 본문에 직접 수치를 기재
감지: 본문 내 naked number (1.5배, 300%, 50골드 등)

Bad: "보스는 일반 몬스터보다 3.5배 높은 HP를 가진다"
Good: "보스의 HP는 Boss_HP_Multiplier를 적용한다" + YAML에 `Boss_HP_Multiplier: 3.5  # _x`

---

## CM-05: Edge Case 누락 (Missing Edge Cases)

설명: 예외 상황을 고려하지 않음
필수 3개: 네트워크 지연, 동시 입력, 자원 부족
게임 특화 추가:
- 재귀 진입 한계 (Item World)
- 파티 인원 변동 (멀티플레이)
- 자동사냥 중 이벤트 (자동사냥)
- 게이트 해제 후 스탯 감소 (장비 변경)
- 시드 충돌

---

## CM-06: 3대 기둥 미연결 (Unlinked to Pillars)

설명: 시스템이 3대 기둥 중 어디에도 연결되지 않음
감지: Reasoning 섹션에 기둥 언급 없음

Bad: (기둥 언급 없이 시스템만 설명)
Good: "> Metroidvania 탐험: 새로운 능력으로 이전 맵의 잠긴 영역을 해제"

---

## CM-07: 3-Space 분류 누락 (Missing 3-Space Classification)

설명: 시스템이 어떤 공간에서 작동하는지 명시하지 않음
감지: "적용 공간" 테이블 누락

수정: 모든 문서에 적용 공간 테이블 추가

---

## CM-08: 스마트 따옴표 사용 (Smart Quotes)

설명: 워드프로세서에서 복사한 스마트 따옴표 사용
감지: 유니코드 U+201C, U+201D, U+2018, U+2019

Bad: "이것은 스마트 따옴표입니다"
Good: "이것은 직선 따옴표입니다"

---

## CM-09: 테이블 내 Bold (Bold in Tables)

설명: 테이블 셀에서 **Bold** 마크다운 사용
이유: 자동 정렬 후 trailing space로 인해 렌더러별 깨짐

Bad: `| **중요** | 내용 |`
Good: `| 중요 | 내용 |` (열 제목으로 중요도를 표현)

---

## CM-10: 헤더 5단계 이상 (Deep Headers)

설명: `#####` 이상의 깊은 헤더 사용
감지: 5개 이상의 `#` 시작

수정: 4단계까지만 사용. 더 세분화가 필요하면 별도 문서로 분리하거나 리스트로 대체.

---

## CM-11: Mermaid 다이어그램 누락 (Missing Diagrams)

설명: 시스템 문서에 다이어그램이 하나도 없음
필수 조건: SYS 문서는 최소 1개 Mermaid 다이어그램 필수

권장 다이어그램:
- SYS: flowchart TD, stateDiagram-v2
- WLD: graph LR (존 연결도), mindmap
- IW: flowchart TD (층 진행)
- MP: sequenceDiagram (클라이언트-서버)
- BAL: 수치 테이블 (다이어그램 대체 가능)

---

## CM-12: CSV SSoT 미연결 (Missing CSV Links)

설명: 파라미터가 있지만 CSV SSoT 경로를 연결하지 않음
감지: YAML 블록 아래에 SSoT 링크 없음

Bad: (YAML만 있고 CSV 참조 없음)
Good: `> SSoT: Content_Stats_IW_BossReward.csv`

---

## CM-13: 게이트 대체 수단 미제공 (No Gate Alternatives)

설명: Metroidvania 게이트에 단일 해제 조건만 제공
원칙: 모든 게이트는 최소 2가지 해제 방법을 가져야 함

Bad: "이 문은 Double Jump가 있어야 통과 가능"
Good: "이 문은 Double Jump 또는 STR >= 50으로 통과 가능"

---

## CM-14: 솔로/파티 밸런스 미고려 (Solo/Party Balance Missing)

설명: 멀티플레이 연동 시스템에서 솔로 플레이를 고려하지 않음
원칙: "혼자서도 재미있고 함께하면 더 재미있다"

Bad: (파티 기준으로만 설계, 솔로 불가)
Good: 솔로/파티 양쪽의 경험을 별도 명시하고 스케일링 규칙 정의
