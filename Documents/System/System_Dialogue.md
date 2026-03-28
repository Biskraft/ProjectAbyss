# 대화 시스템 (Dialogue System) — SYS-DLG-01

## 구현 현황 (Implementation Status)

> **최근 업데이트:** 2026-03-29
> **문서 상태:** `작성 중 (Draft)`
> **3-Space:** 전체 (World / Item World / Hub)
> **기둥:** 탐험 + 야리코미 + 멀티플레이

| 기능 ID    | 분류          | 기능명                                         | 우선순위 | 구현 상태     | 비고                                               |
| :--------- | :------------ | :--------------------------------------------- | :------: | :------------ | :------------------------------------------------- |
| DLG-01-A   | 표시 UI       | 에르다 독백 — 하단 오버레이 박스                |    P0    | ⬜ 제작 필요  | Toast 시스템 확장. 화면 하단 중앙 고정             |
| DLG-01-B   | 표시 UI       | NPC 1:1 대화 — 말풍선 (Speech Bubble)          |    P0    | ⬜ 제작 필요  | NPC 머리 위 표시. 순차 진행                        |
| DLG-01-C   | 표시 UI       | 시스템 알림 — 기존 Toast 재활용                |    P0    | ✅ 기존 활용  | Toast 시스템 그대로. 우측 상단 위치                |
| DLG-02-A   | 트리거        | 위치 기반 자동 트리거                           |    P0    | ⬜ 제작 필요  | LDtk Trigger Zone 엔티티 연동                      |
| DLG-02-B   | 트리거        | 적 처치 이벤트 트리거                           |    P0    | ⬜ 제작 필요  | Combat 시스템 이벤트 훅 연동                       |
| DLG-02-C   | 트리거        | NPC 상호작용 트리거 (UP 키)                     |    P0    | ⬜ 제작 필요  | InteractionSystem 연동                             |
| DLG-02-D   | 트리거        | 1회 재생 보장 (중복 방지)                       |    P0    | ⬜ 제작 필요  | DialogueState 플래그 관리                          |
| DLG-03-A   | 입력 처리     | 대화 진행 키 (Z 키 / 탭)                        |    P0    | ⬜ 제작 필요  | Z: 다음 줄. 대화 중 이동은 독백만 허용             |
| DLG-03-B   | 입력 처리     | 필수 대화 스킵 잠금                             |    P0    | ⬜ 제작 필요  | mandatory: true인 대화는 스킵 불가                 |
| DLG-04-A   | 데이터        | YAML 대화 데이터 스키마 정의                    |    P0    | ⬜ 제작 필요  | `assets/data/dialogue/` 폴더에 분리 관리           |
| DLG-04-B   | 데이터        | LDtk NPC 엔티티 → 대화 ID 매핑                  |    P1    | ⬜ 제작 필요  | LDtk Entity 필드에 dialogue_id 직접 기입           |
| DLG-05-A   | 히트스탑 연동 | 히트스탑 중 대화 표시 차단                      |    P1    | ⬜ 제작 필요  | Game.hitstopFrames > 0이면 대화 시작 큐 대기       |

---

## 0. 필수 참고 자료 (Mandatory References)

| 문서 | 경로 | 참조 목적 |
| :--- | :--- | :--- |
| Project Vision | `Documents/Terms/Project_Vision_Abyss.md` | 3대 기둥, 에르다 캐릭터, 스토리 톤 |
| GDD Writing Rules | `Documents/Terms/GDD_Writing_Rules.md` | 문서 구조 포맷 및 파라미터 설계 |
| Glossary | `Documents/Terms/Glossary.md` | 공식 용어 (에르다, 에코, 이노센트 등) |
| 첫 30분 경험 흐름 | `Documents/Content/Content_First30Min_ExperienceFlow.md` | 모든 에르다 독백 및 NPC 대화 원본 |
| 내러티브 세계관 | `Documents/Design/Design_Narrative_Worldbuilding.md` | NPC 3문장 규칙, 서사 전달 원칙 |
| 퀘스트 서사 프레임워크 | `Documents/System/System_Quest_Narrative.md` | 퀘스트 대화 연동 구조 |
| 타격 피드백 시스템 | `Documents/System/System_Combat_HitFeedback.md` | 히트스탑과 대화 표시 호환성 |
| 세계 성경 | `Documents/Content/Content_World_Bible.md` | NPC 성격 및 말투 (오렌, 이렌 다스, 세라) |

---

## 1. 개요 (Concept)

### 1.1. 설계 의도 (Design Intent)

> **"에르다의 독백은 튜토리얼 텍스트가 아니다. 에르다가 세상을 읽는 방식이다."**

대화 시스템은 플레이어에게 게임 규칙을 설명하는 수단이 아니다. 에르다 벤-나흐트라는 한 대장장이가 세계와 부딪히며 느끼는 반응을 1인칭으로 전달하는 채널이다. 모든 대화는 다음 두 가지 기능 중 하나를 반드시 수행해야 한다.

1. **캐릭터 확립** — "에르다는 어떤 사람인가"를 보여준다. 기술 독백, 사업적 계산, 놀람의 방식이 모두 에르다의 성격을 만든다.
2. **세계 논리 전달** — 에르다의 추론을 통해 플레이어가 시스템의 작동 방식을 스스로 이해하도록 유도한다. "STR 15. 나는 아직... 아까 아이템계에서 검 수치가 올랐으니까, 더 돌면 이것도 열리겠지."

설명하지 않고 보여준다. 에르다가 말하면 플레이어도 같은 결론에 도달한다.

### 1.2. 설계 근거 (Design Reasoning)

| 설계 결정 | 이유 |
| :--- | :--- |
| 에르다 독백을 하단 박스로 표시 | 화면 전체 대화창은 이동/탐험을 차단. 에르다는 이동하면서 독백하는 캐릭터 — 셀레스트의 마들렌처럼 |
| NPC 대화는 말풍선으로 표시 | NPC 위에 직접 붙어 있어야 "저 NPC가 말하는 것"이 명확. 하단 박스는 에르다 전용으로 구분 |
| 시스템 알림은 기존 Toast 재활용 | 아이템 획득, 강화 수치 등은 새 UI 불필요. 기존 시스템 최대 활용 |
| 히트스탑 중 대화 시작 차단 | 히트스탑 중 텍스트가 나타나면 타격감 연출이 깨진다. 히트스탑 종료 후 큐에서 대기하다 실행 |
| 필수 대화 스킵 잠금 | 핵심 루프 이해와 캐릭터 확립에 필수인 대사가 있다. 빠른 플레이어도 에르다의 목소리를 반드시 1회 듣는다 |
| NPC 3문장 규칙 | `Design_Narrative_Worldbuilding.md` 원칙: NPC는 1회 접촉에 최대 3문장. 독백과 반응을 포함해도 씬 전체 6줄 이내 |

### 1.3. 3대 기둥 정렬 (Pillar Alignment)

| 기둥 | 대화 시스템의 기여 |
| :--- | :--- |
| **메트로베니아 탐험** | 에르다의 위치 기반 독백이 "아직 못 가는 곳"을 심리적으로 표시. 능력 게이트와 스탯 게이트에 대한 에르다의 언어화가 탐험 동기를 설치 |
| **아이템계 야리코미** | 아이템계 착지 직후 독백이 "검 안에 있다"는 경이감을 전달. 보스 처치 후 독백이 핵심 루프를 플레이어 언어로 번역 |
| **온라인 멀티플레이** | 허브 NPC(오렌, 이렌 다스)와의 대화가 사회적 공간을 소개하고 플레이어가 이 세계에 연결되어 있다는 소속감을 형성 |

### 1.4. 저주받은 문제 검증 (Cursed Problem Check)

| 저주받은 문제 | 채택한 해결책 | 트레이드오프 |
| :--- | :--- | :--- |
| 에르다가 이동하면서 말해야 하는데, 텍스트 표시가 이동을 방해하면 안 된다 | 하단 고정 박스 + 이동 중에도 대화 박스 유지. 독백은 자동 타이머로 진행 | NPC 1:1 대화 중은 이동 차단. 에르다 독백만 이동 병행 허용 |
| 필수 대사를 보장해야 하지만 플레이어를 강제로 멈추게 하면 답답하다 | 독백은 이동 병행 허용 + 자동 타이머 진행. NPC 대화만 이동 차단 | NPC 대화 중 전투 발생 시 — 적의 근접을 감지하면 NPC 대화 즉시 종료 |
| 히트스탑 피드백과 대화 표시가 동시에 발생하면 둘 다 흐려진다 | 히트스탑 중 대화 큐 대기. 히트스탑 종료 후 0.3초 지연 후 재생 | 드물게 0.3초 지연이 어색할 수 있음. 전투 중 독백은 이 제약 적용 |

---

## 2. 대화 유형 및 표시 방식 (Display Methods)

### 2.1. 대화 유형 분류

본 시스템은 3가지 대화 유형을 정의한다. 각 유형은 UI 위치, 표시 방식, 입력 처리 방식이 모두 다르다.

| 유형 | 코드 | 발화자 | UI 위치 | 이동 병행 | 입력 방식 | 전형적 사용처 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| A | MONOLOGUE | 에르다 | 화면 하단 중앙 박스 | 허용 | 자동 타이머 또는 Z 키 | 탐험 중 독백, 전투 반응, 기술 독백 |
| B | NPC_DIALOGUE | NPC | NPC 머리 위 말풍선 | 차단 | Z 키로 수동 진행 | NPC 1:1 대화, 순차 다중 대사 |
| C | SYSTEM | 시스템 | 화면 우측 상단 (Toast) | 허용 | 자동 사라짐 | 아이템 획득, 강화 알림, 장비 스탯 상승 |

### 2.2. 유형 A: 에르다 독백 (Monologue)

에르다의 내면을 전달하는 핵심 채널. 이동과 전투 중에도 표시되는 유일한 서사 UI.

```yaml
monologue_display:
  position: "화면 하단 중앙. Y: 화면 높이의 82%. 좌우 여백 16%"
  width: "화면 너비의 68%"
  background: "반투명 검정 (alpha: 0.72). 둥근 모서리 (radius: 4px)"
  text_style:
    font: "게임 기본 폰트"
    size: 14px
    color: "#F5F0E8"   # 따뜻한 아이보리 (에르다 전용)
    align: center
  portrait: "없음 — 에르다 독백에는 초상화를 붙이지 않는다. 에르다의 목소리는 세계에 녹아 있어야 한다"
  advance_mode: "auto_timer 또는 z_key"
  auto_timer_ms: 3500   # 기본 자동 타이머. 줄 길이에 따라 조정
  z_key_override: true   # 플레이어가 Z 키를 누르면 즉시 다음 줄로 넘어감
  movement_allowed: true   # 독백 중 에르다 이동 허용
  combat_allowed: true     # 독백 중 전투 입력 허용
```

**에르다 독백 규칙:**
- 한 독백 인스턴스에 최대 3줄까지 순차 표시. 3줄 초과 시 별도 독백 ID로 분리한다.
- 줄과 줄 사이 전환 시 기존 텍스트가 0.15초 페이드 아웃 후 새 텍스트 페이드 인.
- 자동 타이머 중 Z 키를 누르면 타이머를 무시하고 즉시 다음 줄 진행.
- 마지막 줄이 끝난 후 1.0초 대기 후 박스가 페이드 아웃.

### 2.3. 유형 B: NPC 1:1 대화 (NPC Dialogue)

NPC와 에르다가 주고받는 대화. 이동이 차단되고 플레이어가 Z 키로 대사를 넘긴다.

```yaml
npc_dialogue_display:
  position: "NPC 스프라이트 상단 +16px. NPC를 따라 스크롤"
  bubble:
    background: "흰색 (alpha: 0.92)"
    border: "NPC 소속 색상 1px. 기본 흰색 테두리"
    tail: "말풍선 꼬리. NPC 방향으로 하단 포인팅"
    width: "최소 80px / 최대 220px. 텍스트 길이에 자동 맞춤"
    padding: "8px 상하 / 12px 좌우"
  text_style:
    font: "게임 기본 폰트"
    size: 13px
    color: "#1A1A1A"
    align: left
  speaker_label: "말풍선 상단 소형 텍스트로 발화자 이름 표시 (NPC명 또는 '에르다')"
  portrait: "없음 — MVP 범위에서 초상화는 제외"
  advance_mode: "z_key_only"
  movement_allowed: false   # NPC 대화 중 이동 차단
  combat_interrupt: true    # 적이 NPC 반경 5타일 이내 진입 시 대화 즉시 종료
  multi_line_sequence: true  # 여러 줄 대사를 Z 키로 순차 진행
```

**NPC 대화 규칙:**
- NPC 1회 접촉 당 최대 3문장. 에르다의 반응 대사가 있으면 에르다 1~2문장 포함해 씬 전체 5줄 이내.
- 순차 대사는 동일 말풍선 위치에서 텍스트만 교체 (말풍선 재생성 없음). 발화자가 바뀌면 말풍선 위치가 해당 발화자로 이동.
- 에르다의 반응 대사는 에르다 스프라이트 위에 독립 말풍선으로 표시.
- 마지막 대사 후 Z 키 또는 NPC로부터 3타일 이상 이동 시 대화 종료.

### 2.4. 유형 C: 시스템 알림 (System Notification)

기존 Toast 시스템을 그대로 재활용한다. 신규 UI 코드 불필요.

```yaml
system_notification:
  reuse: "기존 Toast 시스템 (ItemWorldScene 구현체)"
  position: "화면 우측 상단. 기존 Toast 위치 유지"
  examples:
    - "낡은 검 — 공격력 +8 (영구 강화)"
    - "이노센트 [붉은 구체] 복종"
    - "STR +12 달성"
  duration_ms: 3000
  stack: true   # 여러 알림이 동시 발생 시 위아래로 쌓임
```

### 2.5. Toast 시스템과의 관계

| 항목 | 기존 Toast | 유형 A (독백) | 유형 B (NPC 대화) |
| :--- | :--- | :--- | :--- |
| 재활용 여부 | 그대로 유지 | Toast 표시 레이어 위에 별도 레이어 생성 | Toast와 독립적 레이어 |
| 위치 | 우측 상단 | 하단 중앙 | NPC 머리 위 |
| 발화자 | 없음 (시스템) | 에르다 | NPC 또는 에르다 |
| 이동 차단 | 없음 | 없음 | 있음 |
| 중복 표시 | 가능 | 동시 1개만 | 동시 1개만 |

---

## 3. 핵심 규칙 (Core Rules)

### 3.1. 입력 처리 규칙 (Input Handling)

```yaml
input_rules:
  advance_key:
    primary: "Z"
    secondary: "Enter"
    effect: "현재 줄 → 다음 줄 진행. 마지막 줄이면 대화 종료"

  skip_rules:
    mandatory_true:
      skip_allowed: false
      note: "Z 키를 연타해도 마지막 줄까지 전부 읽어야 한다"
    mandatory_false:
      skip_allowed: true
      method: "대화 중 Escape 키로 전체 건너뛰기"

  movement_during_dialogue:
    type_A_monologue: "이동 허용. 점프, 대시 모두 가능"
    type_B_npc: "이동 차단. WASD/방향키 입력 무효화"

  combat_during_dialogue:
    type_A_monologue: "공격 입력 허용. 독백은 전투 도중에도 흐른다"
    type_B_npc: "공격 입력 시 NPC 대화 즉시 종료. 전투 우선"

  hitstop_interaction:
    rule: "Game.hitstopFrames > 0이면 새로운 독백/NPC대화 시작 불가"
    queue: "큐에 대기. hitstopFrames == 0이 된 후 0.3초 후 실행"
    exception: "이미 진행 중인 독백은 히트스탑과 무관하게 계속 표시"
```

**입력 규칙 이유:**
- 유형 A 독백은 에르다가 달리면서 혼잣말하는 장면이다. 이동을 막으면 에르다의 캐릭터가 깨진다.
- 유형 B NPC 대화는 집중을 요하는 정보 교환이다. 이동 차단이 자연스럽다.
- 전투 중 NPC 대화는 게임의 규칙 일관성을 해친다. 전투가 항상 우선한다.

### 3.2. 다중 대사 순차 처리 규칙

하나의 씬에서 여러 화자가 대화를 주고받는 경우:

```
대사 시퀀스 처리 순서:
1. 현재 말풍선의 마지막 줄 표시
2. Z 키 입력 대기 (mandatory: false이면 Escape로 전체 스킵 가능)
3. Z 키 입력 시:
   a. 다음 대사의 발화자가 동일 → 동일 말풍선 텍스트 교체 (0.1초 페이드)
   b. 다음 대사의 발화자가 다름 → 현재 말풍선 닫힘 + 새 말풍선 발화자 위에 열림
4. 시퀀스 종료 후 일반 조작 복귀
```

### 3.3. 1회 재생 보장 규칙

동일 대화 ID가 중복 재생되지 않도록 플래그로 관리한다.

```yaml
playback_guarantee:
  storage: "클라이언트 세션 메모리 (DialogueState 객체)"
  persistence: "세션 간 저장 — 서버 플레이어 데이터에 played_dialogues: string[] 저장"
  rule: "dialogue_id가 played_dialogues에 포함되면 트리거 무시"
  exception:
    - "NPC 대화 중 type: repeatable인 대사는 매 방문마다 재생"
    - "퀘스트 진행에 따라 대사 내용이 교체되는 경우 → 교체된 대사는 별도 ID로 관리"
```

---

## 4. 트리거 시스템 (Trigger System)

### 4.1. 트리거 유형 정의

| 트리거 유형 | 코드 | 발동 조건 | 예시 |
| :--- | :--- | :--- | :--- |
| 위치 기반 자동 | ZONE_ENTER | 에르다가 지정 영역에 진입 | Screen 1 이동 독백, Screen 6.5 절벽 독백 |
| NPC 상호작용 | NPC_INTERACT | 에르다가 NPC 근처에서 UP 키 또는 Z 키 | 오렌 첫 대화, 이렌 다스 대화 |
| 적 처치 이벤트 | ENEMY_KILL | 특정 적 ID 처치 완료 | Screen 6 스켈레톤 처치 후 독백 |
| 아이템 획득 이벤트 | ITEM_PICKUP | 특정 아이템 ID 획득 | Screen 8 낡은 검 획득 독백 |
| 보스 처치 이벤트 | BOSS_CLEAR | 특정 보스 ID 처치 완료 | Screen 13 기억의 수문장 처치 후 독백 |
| 자동 시퀀스 | AUTO_SEQUENCE | 이전 대화 종료 후 자동 연결 | Screen 9 에코 공명 연출 중 순차 대사 |

### 4.2. 트리거 데이터 구조 (YAML 스키마)

모든 대화 트리거는 `assets/data/dialogue/` 하위 YAML 파일로 관리한다. 파일명 규칙: `dlg_{scene}_{id}.yaml`.

```yaml
# 트리거 데이터 스키마 예시: assets/data/dialogue/dlg_act1_screen01.yaml

trigger:
  id: "DLG_ACT1_SCR01_ERDA_WALK"         # 고유 ID. 변경 불가
  type: ZONE_ENTER                         # 트리거 유형
  zone:
    scene: "ForestEntrance"                # LDtk 씬 ID
    x: 0                                   # 트리거 영역 좌상단 타일 좌표
    y: 0
    width: 10                              # 영역 너비 (타일 단위)
    height: 8                              # 영역 높이 (타일 단위)
  dialogue_id: "MONO_ACT1_SCR01_WALK"     # 실행할 대화 ID
  one_shot: true                           # true: 1회 재생 후 비활성화
  prerequisite: null                       # 선행 조건 (null = 없음)

# ---

# 대화 데이터 스키마: assets/data/dialogue/dialogue_act1.yaml

dialogue:
  id: "MONO_ACT1_SCR01_WALK"
  type: A                                  # A: 독백 / B: NPC 대화 / C: 시스템
  speaker: "ERDA"
  lines:
    - text: "동화 30개짜리 수리 의뢰. 이번 달 임대료엔 아직 멀다."
      mandatory: true
      duration_ms: 3500                    # auto_timer 적용 시 표시 지속 시간
  # Phase 2 대비 분기 구조 (MVP에서는 미사용)
  # branches: null
```

```yaml
# NPC 다중 대사 시퀀스 예시

dialogue:
  id: "NPC_SCR18_IREN_HUB_FIRST"
  type: B
  speaker_sequence:                        # B 유형: 순서대로 발화자/대사 배열
    - speaker: "이렌 다스"
      text: "잠깐. 그 망치... 균열 제단도 아닌 곳에서 기억을 열었어? 어떤 모루를 쓴 거야?"
      mandatory: true
    - speaker: "ERDA"
      text: "그냥 제 작업대인데요. 스승님이 쓰던 모루예요."
      mandatory: true
    - speaker: "이렌 다스"
      text: "...그 모루, 한번 보여줄 수 있어? 아니, 됐어. 일단 여기서도 무기를 두드려서 들어갈 수 있어. 우리 설비를 쓰면 돼."
      mandatory: true
  one_shot: true
  trigger:
    type: NPC_INTERACT
    npc_id: "IREN_DAS_HUB"
```

### 4.3. LDtk 엔티티 연동

NPC와 트리거 존은 LDtk 에디터에서 엔티티로 배치한다.

| LDtk 엔티티 유형 | 필드명 | 설명 |
| :--- | :--- | :--- |
| `DialogueTriggerZone` | `dialogue_id: string` | 에르다가 영역에 진입하면 해당 대화 자동 실행 |
| `NPC` | `dialogue_id: string` | UP 키 상호작용 시 해당 NPC 대화 실행 |
| `NPC` | `npc_id: string` | NPC 고유 식별자. 대화 YAML의 npc_id와 매핑 |

---

## 5. 첫 30분 대화 전수 목록 (Dialogue Census)

`Documents/Content/Content_First30Min_ExperienceFlow.md`에서 추출한 전수 목록이다. 발화자·분류·트리거·필수 여부를 모두 기재한다.

### 5.1. 범례

| 열 | 설명 |
| :--- | :--- |
| Screen# | 경험 흐름 씬 번호 |
| 대화 ID | YAML 파일에서 사용할 고유 ID |
| 발화자 | 에르다 / NPC명 |
| 대사 (원문) | 원본 텍스트 |
| 유형 | A: 독백 / B: NPC 대화 / C: 시스템 알림 |
| 트리거 | ZONE_ENTER / NPC_INTERACT / ENEMY_KILL / ITEM_PICKUP / BOSS_CLEAR / AUTO_SEQUENCE |
| 필수 | Y: mandatory:true (스킵 불가) / N: mandatory:false |

### 5.2. Act 1 — 일상 세계 (Screen 0~7)

| Screen# | 대화 ID | 발화자 | 대사 | 유형 | 트리거 | 필수 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 0 | SYSTEM_ACT0_BRIEFING | 시스템 | "의뢰서: 낡은 검 수리. / 선불 30동화. / 장소: 성채 외곽 벤-나흐트 대장간. / 의뢰인 이름: 없음." | C | AUTO_SEQUENCE | Y |
| 1 | MONO_ACT1_SCR01_WALK | 에르다 | "동화 30개짜리 수리 의뢰. 이번 달 임대료엔 아직 멀다." | A | ZONE_ENTER | Y |
| 2 | — | — | 대사 없음 (조용한 이동 구간) | — | — | — |
| 3 | — | — | 대사 없음 | — | — | — |
| 4 | MONO_ACT1_SCR04_SLIME | 에르다 | "숲에 이런 게 나오기 시작한 거 언제부터지." | A | ZONE_ENTER | Y |
| 5 | — | — | 대사 없음 | — | — | — |
| 6 | MONO_ACT1_SCR06_SKELETON_HIT | 에르다 | "아야. 이건 슬라임이랑 다르잖아." | A | ENEMY_KILL (피격 시) | Y |
| 6 | MONO_ACT1_SCR06_SKELETON_KILL | 에르다 | "뼈 관절부가 이렇게 연결되는 건 말이 안 되는데..." | A | ENEMY_KILL (처치 시) | N |
| 6.5 | MONO_ACT1_SCR065_GATE | 에르다 | "저 위에 뭐가 있는 것 같은데... 올라갈 수가 없네." | A | ZONE_ENTER | Y |
| 7 | MONO_ACT1_SCR07_FORGE_ARRIVE | 에르다 | "도착. 오늘도 무사 출근." | A | ZONE_ENTER | N |

### 5.3. Act 2 — 모험의 부름 (Screen 8~9)

| Screen# | 대화 ID | 발화자 | 대사 | 유형 | 트리거 | 필수 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 8 | MONO_ACT2_SCR08_SWORD_INSPECT | 에르다 | "강철 3등급... 아니, 잠깐. 이건 3등급이 아니야. 더 깊은 결정 구조가 있어. 누가 이걸 동화 30개짜리로 맡긴 거지?" | A | ITEM_PICKUP | Y |
| 8 | MONO_ACT2_SCR08_ECHO_CALL | 에르다 | "에코, 한 번 봐줘." | A | AUTO_SEQUENCE | Y |
| 9 | MONO_ACT2_SCR09_RESONANCE | 에르다 | "ああああ—!" | A | AUTO_SEQUENCE | Y |

### 5.4. Act 3 — 시련 (Screen 10~14)

| Screen# | 대화 ID | 발화자 | 대사 | 유형 | 트리거 | 필수 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 10 | MONO_ACT3_SCR10_LAND | 에르다 | "...여기가 어디야." | A | AUTO_SEQUENCE | Y |
| 10 | MONO_ACT3_SCR10_WALL | 에르다 | "이 벽 결정 구조... 아까 그 검이랑 같아. 나 진짜 검 안에 있는 거야?" | A | ZONE_ENTER (벽 근처) | Y |
| 11 | MONO_ACT3_SCR11_INNOCENT | 에르다 | "귀여운 척 하더니 때리네. 이 안의 생태계는 어떻게 된 거야." | A | ENEMY_KILL | N |
| 12 | MONO_ACT3_SCR12_STRUCTURE | 에르다 | "이 구조물 접합부 상태가 좋은데. 누가 만들었지." | A | ZONE_ENTER | N |
| 13 | MONO_ACT3_SCR13_BOSS_ENTER | 에르다 | "문이 잠겼어?! 그리고 저건 뭐야, 왜 저렇게 커." | A | BOSS_CLEAR (진입 시) | Y |
| 13 | MONO_ACT3_SCR13_BOSS_CLEAR | 에르다 | "검이 강해졌어. 안에서 작업하면 실제 수치가 올라가는 거야? ...이거 의뢰비에 포함시킬 수 있겠는데." | A | BOSS_CLEAR (처치 후) | Y |
| 13 | SYSTEM_ACT3_SCR13_REINFORCE | 시스템 | "낡은 검 — 공격력 +8 (영구 강화)" | C | BOSS_CLEAR (처치 후 1초) | Y |

### 5.5. Act 4 — 귀환 + No.1 씨앗 (Screen 15)

| Screen# | 대화 ID | 발화자 | 대사 | 유형 | 트리거 | 필수 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 15 | MONO_ACT4_SCR15_ORB | 에르다 | "뭐지 이거. 떼어지지도 않네. 검 안에서 묻어온 건가." | A | AUTO_SEQUENCE (귀환 직후) | Y |
| 15 | MONO_ACT4_SCR15_STAT_CHECK | 에르다 | "...진짜 올라가 있어. 뭐야 이건." | A | AUTO_SEQUENCE | Y |

### 5.6. Act 5 — 거부 (Screen 15 계속)

| Screen# | 대화 ID | 발화자 | 대사 | 유형 | 트리거 | 필수 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 15 | MONO_ACT5_SCR15_REFUSAL | 에르다 | "이건 그냥 수리 작업이었는데... 일단 오늘은 끝이야." | A | AUTO_SEQUENCE | Y |
| 15 | MONO_ACT5_SCR15_INVOICE | 에르다 | "수리 완료. 의뢰비 청구서 쓰고 퇴근이다." | A | AUTO_SEQUENCE | N |

### 5.7. Act 6 — 스승 등장 (Screen 16~17)

| Screen# | 대화 ID | 발화자 | 대사 | 유형 | 트리거 | 필수 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 16 | MONO_ACT6_SCR16_MARTA_1 | 에르다 | "...스승님." | A | ITEM_PICKUP (쪽지 발견) | Y |
| 16 | MONO_ACT6_SCR16_MARTA_2 | 에르다 | "10년 전에 사라지고. 남긴 건 이 대장간이랑 에코뿐이었는데." | A | AUTO_SEQUENCE | Y |
| 16 | MONO_ACT6_SCR16_MARTA_3 | 에르다 | "에코가 원래 그런 망치라고? 그러면 스승님도..." | A | AUTO_SEQUENCE | Y |
| 16 | SYSTEM_ACT6_SCR16_NOTE | 시스템 (쪽지 텍스트) | "에르다야. / 에코가 처음 울렸다면 이 글이 보일 거다. / 놀라지 마. 에코는 원래 그런 망치야. / 네가 준비되면 다시 울릴 수 있어. / — 마르타" | C | AUTO_SEQUENCE | Y |
| 17 | MONO_ACT6_SCR17_SELA | 에르다 | "...누구지." | A | AUTO_SEQUENCE (에코 진동 후) | Y |

### 5.8. Act 7 — 첫 관문 돌파 (Screen 18~22)

| Screen# | 대화 ID | 발화자 | 대사 | 유형 | 트리거 | 필수 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 18 | NPC_SCR18_IREN_1 | 이렌 다스 | "잠깐. 그 망치... 균열 제단도 아닌 곳에서 기억을 열었어? 어떤 모루를 쓴 거야?" | B | NPC_INTERACT | Y |
| 18 | NPC_SCR18_ERDA_1 | 에르다 | "그냥 제 작업대인데요. 스승님이 쓰던 모루예요." | B | AUTO_SEQUENCE | Y |
| 18 | NPC_SCR18_IREN_2 | 이렌 다스 | "...그 모루, 한번 보여줄 수 있어? 아니, 됐어. 일단 여기서도 무기를 두드려서 들어갈 수 있어. 우리 설비를 쓰면 돼." | B | AUTO_SEQUENCE | Y |
| 19 | NPC_SCR19_OREN_1 | 오렌 | "벤-나흐트 대장간? 최근에 아이템계 들어가봤다며요." | B | NPC_INTERACT | Y |
| 19 | NPC_SCR19_ERDA_1 | 에르다 | "소문이 벌써..." | B | AUTO_SEQUENCE | N |
| 19 | NPC_SCR19_OREN_2 | 오렌 | "정보가 직업이에요. 그 안에서 만난 빛나는 구체들, 이노센트라고 합니다. 아이템의 기억이 응결된 존재." | B | AUTO_SEQUENCE | Y |
| 19 | NPC_SCR19_ERDA_2 | 에르다 | "아이템의 기억...?" | B | AUTO_SEQUENCE | Y |
| 19 | NPC_SCR19_OREN_3 | 오렌 | "복종시키면 장비에 영구 보너스. 관심 있으면 제가 의뢰 하나 소개할게요. 지하 균열 구역 소재 회수. 80동화." | B | AUTO_SEQUENCE | Y |
| 19 | NPC_SCR19_ERDA_3 | 에르다 | "80동화... 임대료 절반이잖아." | B | AUTO_SEQUENCE | Y |
| 20~21 | MONO_ACT7_SCR20_STR_GATE | 에르다 | "STR 15. 나는 아직... 아까 아이템계에서 검 수치가 올랐으니까, 더 돌면 이것도 열리겠지." | A | ZONE_ENTER (STR 게이트 앞) | Y |
| 22 | NPC_SCR22_OREN_END_1 | 오렌 | "내일 더 좋은 의뢰 올릴게요." | B | NPC_INTERACT | N |
| 22 | NPC_SCR22_ERDA_END_1 | 에르다 | "이미 나를 굴리기 시작했네." | B | AUTO_SEQUENCE | N |
| 22 | NPC_SCR22_OREN_END_2 | 오렌 | "도움이 되는 한은요." | B | AUTO_SEQUENCE | N |
| 22 | MONO_ACT7_SCR22_ENDING_1 | 에르다 | "스승님이 남긴 쪽지... 에코가 원래 그런 망치라고 했지." | A | AUTO_SEQUENCE (광장에 서면) | Y |
| 22 | MONO_ACT7_SCR22_ENDING_2 | 에르다 | "한 번만 더 들어가볼까. 이번엔 내가 직접." | A | AUTO_SEQUENCE | Y |

### 5.9. 전체 집계

| 유형 | 필수 대사 수 | 선택 대사 수 | 합계 |
| :--- | :--- | :--- | :--- |
| A (에르다 독백) | 18 | 7 | 25 |
| B (NPC 대화) | 12 | 4 | 16 |
| C (시스템 알림) | 3 | 0 | 3 |
| **합계** | **33** | **11** | **44** |

---

## 6. NPC 성격과 말투 일관성 검증 (NPC Consistency)

`Documents/Content/Content_World_Bible.md` Layer 4 기준으로 각 NPC의 말투 규칙을 정의한다.

### 6.1. 이렌 다스 (Iren Das) — 심연 학회장

| 항목 | 규칙 |
| :--- | :--- |
| 말투 스타일 | 열정적이고 빠름. 혼자 생각하면서 중간에 방향을 바꾼다 ("그 모루, 한번 보여줄 수 있어? 아니, 됐어.") |
| 문장 수 규칙 | 1회 접촉 최대 3문장. 단, 방향 전환 대사는 1문장으로 간주 |
| 금지 표현 | 가르치는 말투, 천천히 설명하는 말투. 이렌은 항상 이미 알고 있다는 전제로 말한다 |
| 핵심 기능 | "기억을 열었다", "균열 제단", "우리 설비" — 아이템계 관련 공식 용어를 자연스럽게 흘린다 |

### 6.2. 오렌 (Oren) — 정보상

| 항목 | 규칙 |
| :--- | :--- |
| 말투 스타일 | 중간 높임말. 비즈니스 톤. 정보를 상품처럼 제시한다. 에르다에게 경어를 쓰지만 실은 조종하려 한다 |
| 문장 수 규칙 | 1회 접촉 최대 3문장. 오렌의 대사는 항상 정보 → 제안 → 조건 구조 |
| 금지 표현 | 감정적 표현, 에르다를 진심으로 걱정하는 말. (Act 1에서는 아직 그런 오렌이 아님) |
| 핵심 기능 | "이노센트"라는 용어를 게임 내에서 처음으로 공식 소개하는 NPC |

### 6.3. 세라 (Sela) — 심연 전쟁 생존자

| 항목 | 규칙 |
| :--- | :--- |
| 말투 스타일 | 극도로 짧음. 1~2단어 혹은 최대 1문장. 이유를 설명하지 않는다 |
| 문장 수 규칙 | 1회 접촉 최대 1문장 (첫 30분에서는 대사 없음 — 실루엣만 등장) |
| 금지 표현 | 설명, 힌트, 안내. 세라는 정보를 주지 않는다 |
| 핵심 기능 | 첫 30분에서는 존재만 암시. 에코가 먼저 반응한다는 사실만 보여줌 |

---

## 7. 연동 명세 (System Dependencies)

### 7.1. 의존 시스템

| 시스템 | 의존 방향 | 계약 내용 |
| :--- | :--- | :--- |
| `System_Combat_HitFeedback.md` | DLG → HitFeedback | `Game.hitstopFrames` 값을 읽어 0이 되기까지 대화 시작 큐 대기 |
| `System_Combat_Action.md` | DLG ← CombatAction | 적 처치 이벤트(ENEMY_KILL), 보스 처치 이벤트(BOSS_CLEAR)를 구독 |
| `System_ItemWorld_Core.md` | DLG ← ItemWorld | 아이템계 귀환 이벤트를 구독. Screen 15 귀환 후 독백 트리거 |
| `System_Quest_Narrative.md` | DLG ↔ QuestNarrative | 퀘스트 상태에 따라 NPC 대사 내용 교체. dialogue_id는 DLG가 소유, 퀘스트 완료 조건은 QuestNarrative가 관리 |
| LDtk 맵 에디터 | DLG ← LDtk | DialogueTriggerZone 엔티티와 NPC 엔티티의 `dialogue_id` 필드를 런타임에 로드 |
| Toast 시스템 | DLG → Toast | 시스템 알림(유형 C)은 Toast 시스템의 `show(text, duration)` 메서드를 직접 호출 |

### 7.2. DLG가 외부에 제공하는 인터페이스

```typescript
// 대화 시스템이 외부에 노출하는 API (구현 명세 아님 — 설계 계약)

interface DialogueSystem {
  // 대화 ID로 직접 실행 (Combat, ItemWorld 시스템에서 호출)
  play(dialogueId: string): void;

  // 현재 대화가 진행 중인지 확인 (이동 차단 여부 판단에 사용)
  isBlocking(): boolean;

  // 해당 대화가 이미 재생되었는지 확인
  hasPlayed(dialogueId: string): boolean;

  // 이벤트 구독 (트리거 시스템용)
  onTrigger(triggerType: TriggerType, callback: (id: string) => void): void;
}
```

---

## 8. 수치 파라미터 (Tuning Knobs)

```yaml
# assets/data/dialogue/dialogue_config.yaml

dialogue_config:

  # --- Feel Knobs (체감 조정) ---
  monologue_fade_in_ms: 200          # 독백 박스 등장 페이드 인 시간
  monologue_fade_out_ms: 300         # 독백 박스 퇴장 페이드 아웃 시간
  monologue_line_transition_ms: 150  # 독백 줄 교체 시 페이드 시간
  monologue_end_hold_ms: 1000        # 마지막 줄 이후 박스가 사라지기 전 대기 시간
  bubble_fade_in_ms: 120             # NPC 말풍선 등장 시간
  bubble_fade_out_ms: 180            # NPC 말풍선 퇴장 시간
  hitstop_post_delay_ms: 300         # 히트스탑 종료 후 대화 시작 지연 시간

  # --- Gate Knobs (게이팅 조정) ---
  monologue_auto_timer_default_ms: 3500   # 독백 자동 타이머 기본값
  monologue_auto_timer_short_ms: 2500     # 짧은 대사(15자 이하) 타이머
  monologue_auto_timer_long_ms: 4500      # 긴 대사(40자 이상) 타이머
  npc_combat_interrupt_radius_tiles: 5   # NPC 대화 중 전투 강제 종료 반경 (타일)
  npc_exit_distance_tiles: 3             # NPC 대화 중 이 거리 이상 이동 시 종료

  # --- Display Knobs ---
  monologue_box_alpha: 0.72              # 독백 박스 배경 불투명도
  monologue_box_y_ratio: 0.82            # 독백 박스 Y 위치 (화면 높이 대비)
  monologue_box_width_ratio: 0.68        # 독백 박스 너비 (화면 너비 대비)
  monologue_text_color: "#F5F0E8"        # 에르다 독백 텍스트 색상
  npc_bubble_max_width_px: 220           # NPC 말풍선 최대 너비
  npc_bubble_alpha: 0.92                 # NPC 말풍선 배경 불투명도
```

---

## 9. 예외 처리 (Edge Cases)

| 상황 | 처리 방침 |
| :--- | :--- |
| 독백 진행 중 NPC 대화 트리거 발동 | 독백 즉시 종료 후 NPC 대화 시작. NPC 대화가 독백보다 우선순위 높음 |
| NPC 대화 중 에르다 사망 | 대화 즉시 종료. 세이브 포인트 복귀 시 해당 NPC 대화 is_played 플래그 초기화 (재진입 시 다시 볼 수 있음) |
| 히트스탑 중 여러 대화 트리거 동시 발동 | 큐에 순서대로 쌓임. 히트스탑 종료 후 0.3초 간격으로 순차 실행 |
| mandatory: true 대화 중 게임 일시정지 | 대화 타이머 일시정지. 재개 시 이어서 진행 |
| 네트워크 단절 (멀티 세션 중 NPC 대화) | 대화 진행은 로컬에서 계속. 서버 동기화는 대화 종료 후 played_dialogues 업로드 |
| 같은 ZONE_ENTER 트리거 영역을 빠르게 반복 진입/퇴장 | 최소 재진입 쿨다운 적용 (`zone_reenter_cooldown_ms: 500`). one_shot이면 무관 |
| 대화 YAML 파일 로드 실패 | 해당 dialogue_id 무시. 에러 로그 기록. 게임 진행 중단 없음 |
| Screen 9 에코 공명 연출 중 독백 | 히트스탑 10프레임(0.17초) 중 독백 큐 대기. 히트스탑 종료 후 공명음이 사그라드는 타이밍에 독백 시작 |

---

## 10. 구현 비용 및 우선순위 (Implementation Cost)

| 기능 ID | 기능명 | 복잡도 | 우선순위 | Phase | 비고 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| DLG-01-A | 에르다 독백 UI 박스 | 낮음 | P0 | Phase 1 | Canvas 고정 레이어에 텍스트 박스 추가. Toast 레이어 참조 |
| DLG-01-B | NPC 말풍선 | 중간 | P0 | Phase 1 | NPC 엔티티 월드 좌표 추적 필요. 카메라 변환 적용 |
| DLG-01-C | 시스템 알림 | 없음 | P0 | Phase 1 | 기존 Toast 재사용 |
| DLG-02-A | ZONE_ENTER 트리거 | 낮음 | P0 | Phase 1 | AABB 충돌 검사. LDtk 엔티티 로드 |
| DLG-02-B | ENEMY_KILL / BOSS_CLEAR 이벤트 훅 | 낮음 | P0 | Phase 1 | CombatSystem 이벤트 리스너 등록 |
| DLG-02-C | NPC 상호작용 트리거 | 낮음 | P0 | Phase 1 | InteractionSystem의 Z 키 핸들러 확장 |
| DLG-02-D | 1회 재생 보장 플래그 | 낮음 | P0 | Phase 1 | Set<string> 메모리 관리. 서버 저장은 Phase 2 |
| DLG-03-A | 대화 진행 키 처리 | 낮음 | P0 | Phase 1 | 기존 키 입력 시스템에 상태 추가 |
| DLG-03-B | 필수 대화 스킵 잠금 | 낮음 | P0 | Phase 1 | mandatory 플래그 확인 로직 |
| DLG-04-A | YAML 데이터 스키마 | 낮음 | P0 | Phase 1 | 파싱 로직. JSON 변환 후 런타임 사용 가능 |
| DLG-04-B | LDtk 엔티티 매핑 | 낮음 | P1 | Phase 1 | LDtk 로더에 dialogue_id 필드 추가 |
| DLG-05-A | 히트스탑 연동 | 낮음 | P1 | Phase 1 | Game.hitstopFrames 폴링. 큐 관리 |
| — | 분기 대화 (Phase 2) | 높음 | P2 | Phase 2 | 퀘스트 상태에 따른 대사 교체. YAML branches 필드 활성화 |
| — | 초상화 시스템 (Phase 2) | 중간 | P2 | Phase 2 | NPC별 초상화 스프라이트. MVP 제외 |
| — | 대화 재생 서버 동기화 | 중간 | P2 | Phase 2 | played_dialogues 서버 저장/불러오기 |

---

## 11. 수용 기준 (Acceptance Criteria)

### 11.1. 기능 검증 기준

- [ ] Screen 1 숲 입구 진입 시 에르다 독백이 화면 하단에 표시되고, 에르다가 이동 중에도 독백 박스가 유지된다.
- [ ] Screen 6 스켈레톤 피격 시 "아야. 이건 슬라임이랑 다르잖아." 대사가 mandatory:true로 스킵 없이 표시된다.
- [ ] Screen 13 기억의 수문장 처치 후 1초 내에 "낡은 검 — 공격력 +8 (영구 강화)" Toast가 표시되고, 이어서 에르다 독백이 재생된다.
- [ ] Screen 18 이렌 다스 NPC에게 UP 키 상호작용 시 3문장 순차 대화가 Z 키 입력으로 진행된다. 대화 중 에르다 이동이 차단된다.
- [ ] 이미 재생된 대화 ID는 동일 트리거가 재발동해도 다시 재생되지 않는다.
- [ ] 히트스탑(Game.hitstopFrames > 0) 중에는 새 독백이 시작되지 않으며, 히트스탑 종료 후 0.3초 후에 재생된다.
- [ ] 전투 중 NPC 반경 5타일 이내에 적이 접근하면 NPC 대화가 즉시 종료된다.
- [ ] mandatory:false 대화는 Escape 키로 즉시 건너뛸 수 있다.

### 11.2. 경험 검증 기준 (플레이테스트)

- [ ] 에르다 독백이 "튜토리얼 텍스트처럼" 느껴지지 않아야 한다. 테스터가 "에르다가 혼잣말하네"라고 느껴야 성공이다.
- [ ] Screen 13 보스 처치 후 에르다의 "이거 의뢰비에 포함시킬 수 있겠는데" 대사가 코미디로 받아들여져야 한다. 핵심 루프 이해와 웃음이 동시에 발생하는지 확인.
- [ ] Screen 20~21 STR 15 게이트 앞 에르다 독백 후, 테스터가 "아이템계를 더 해야겠다"는 결론에 스스로 도달하는지 확인. 힌트 UI 없이 에르다 독백만으로 루프 이해가 이루어지는지 검증.
- [ ] NPC 대화 중 이동 차단이 답답하게 느껴지지 않아야 한다. 대사 3문장 이내의 길이가 이를 보장하는지 확인.
- [ ] 첫 플레이 후 테스터가 오렌, 이렌 다스를 서로 다른 성격의 NPC로 구분할 수 있어야 한다.
