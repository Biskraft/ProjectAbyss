# GDD 5단계 작성 규칙 (Writing Rules)

## 1. 5단계 필수 구조

### Stage 1: 개요 (Concept)
필수 항목 4가지:
- Intent (의도): 이 시스템이 존재하는 이유. "왜 이것을 만드는가?"
- Reasoning (근거): 3대 기둥(Metroidvania 탐험, Item World 야리코미, Online 멀티플레이) 중 어디에 기여하는가
- Cursed Problem Check (저주받은 문제 점검): 이 시스템이 야기할 수 있는 설계 딜레마. CP-1~CP-7 참조
- Risk & Reward (위험과 보상): 실패 시나리오와 성공 시나리오

Bad/Good 예시:
- Bad: "이 시스템은 재미있을 것이다" → 주관적, 의도 불명확
- Good: "Item World 10층마다 보스를 배치하여, 반복 탐색에 중간 목표와 성취감을 부여한다. (기둥: 야리코미)"

### Stage 2: 메커닉 (Mechanics)
- Action → Reaction → Effect 형식으로 서술
- 플레이어의 행동(Verb) 중심
- 3-Space 분류 필수: 이 메카닉이 World / Item World / Hub 중 어디서 작동하는가

Bad/Good 예시:
- Bad: "플레이어가 적을 공격하면 데미지를 입는다"
- Good: "플레이어가 [공격 버튼]을 누르면(Action) → 장착 무기의 공격 모션이 재생되고(Reaction) → 히트박스 판정에 성공하면 Base_Damage * Weapon_Multiplier의 데미지가 적용된다(Effect). [공간: World, Item World]"

### Stage 3: 규칙 (Rules)
- Condition → Process → Result 형식
- 우선순위 정렬 (Priority 1부터 기술)
- 게이트 조건 3종 명시:
  - 스탯 게이트 (STR, INT, DEX, VIT, SPD, LCK)
  - 능력 게이트 (Double Jump, Wall Cling, Mist Transform 등)
  - 진행도 게이트 (특정 보스 처치, 퀘스트 완료 등)

Bad/Good 예시:
- Bad: "문이 잠겨있으면 열 수 없다"
- Good: "P1: 플레이어의 STR >= Gate_Required_STR일 때(Condition) → 게이트 해제 애니메이션 재생(Process) → 해당 구역 접근 가능(Result). P2: STR 부족 시 → '힘이 부족합니다' UI 표시 + 필요 스탯 안내"

### Stage 4: 파라미터 (Parameters)
- YAML 코드 블록으로 분리
- Snake_Case 네이밍
- 단위 필수 (접미사: _m, _s, _deg, _%, _dmg)
- 본문에서는 변수명으로만 참조
- CSV SSoT 링크 포함

예시:
```yaml
# Item World 보스 파라미터
Boss_Spawn_Interval: 10        # _floor (10층마다)
Boss_HP_Multiplier: 3.5        # _x (일반 몬스터 대비)
Boss_Reward_EXP_Bonus: 200     # _%
Boss_Guaranteed_Drop: true     # Innocent 드롭 보장
Max_Recursive_Depth: 3         # 재귀 진입 최대 깊이
```

### Stage 5: 예외 처리 (Edge Cases)
- 최소 3개 필수
- 기본 3개: 네트워크 지연, 동시 입력, 자원 부족
- 게임 특화 예외:
  - 재귀 진입 한계 (Item World 안의 Item World)
  - 파티 인원 변동 (멀티플레이 중 접속 해제)
  - 자동사냥 중 이벤트 발생
  - 시드 충돌 (동일 시드에서 다른 결과)
  - 게이트 해제 후 스탯 감소 (장비 변경)

## 2. 3-Space 분류 규칙

모든 시스템 문서의 개요 섹션에 다음 테이블을 포함:

```markdown
### 적용 공간 (Applicable Space)
| 공간 | 적용 여부 | 비고 |
| :--- | :---: | :--- |
| World | O/X | [설명] |
| Item World | O/X | [설명] |
| Hub | O/X | [설명] |
```

## 3. 헤더 형식 규칙

- 최대 4단계: #, ##, ###, ####
- 형식: 한글 + 괄호 영문
  - 예: `## 전투 시스템 (Combat System)`
  - 예: `### 데미지 계산 (Damage Calculation)`
- 5단계 이상 금지

## 4. 마크다운 형식 제한

- 직선 따옴표만 사용 (`"`, `'`). 스마트 따옴표 금지
- 테이블 셀 내 `**Bold**` 금지 (blockquote 내에서만 허용)
- 모호한 표현 절대 금지: "아마도", "할 수도 있다", "적절히", "대략", "보통"
- 참조 링크: 상대 경로 사용
- 다이어그램: Mermaid 형식
- 파라미터: 본문 수치 하드코딩 금지

## 5. 필수 참고 자료 섹션

모든 GDD 문서 상단에 포함:

```markdown
## 0. 필수 참고 자료 (Mandatory References)
* Project Overview: `Reference/게임 기획 개요.md`
* Writing Rules: `.claude/skills/metroidvania-gdd/references/writing-rules.md`
* [관련 시스템]: `[관련 문서 경로]`
```

## 6. 구현 현황 테이블

```markdown
## 구현 현황 (Implementation Status)

> 최근 업데이트: YYYY-MM-DD
> 문서 상태: `작성 중 (Draft)` / `진행 중 (Living)` / `완료 (Stable)`

| 기능 ID | 분류 | 기능명 (Feature Name) | 우선순위 | 구현 상태 | 비고 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| IW-01-A | 시스템 | 아이템월드 진입 | P1 | 작성 중 | 시드 기반 |
```

## 7. 검증 체크리스트 (문서 하단)

모든 System 문서 하단에 포함:

```markdown
## 검증 기준 (Verification Checklist)
* [ ] 3대 기둥 중 최소 1개 정렬 확인
* [ ] 3-Space 분류 명시 확인
* [ ] Edge Case 최소 3개 기술
* [ ] YAML 파라미터 분리 (하드코딩 없음)
* [ ] Mermaid 다이어그램 최소 1개
* [ ] [추가 검증 항목]
```
