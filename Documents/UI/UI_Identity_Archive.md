# UI_Identity_Archive.md — 인물 아카이브 UI

> **문서 ID:** UI-IDA-01
> **작성일:** 2026-05-24
> **베이스 해상도:** 640x360 (3x @1080p = 1920x1080)
> **문서 상태:** Draft (DEC-046 신규)
> **2-Space:** World (세이브 포인트) / 인벤토리 진입 가능
> **기둥:** 야리코미 (주)

---

## 구현 현황 (Implementation Status)

| 항목 | ID | 우선순위 | 상태 | 비고 |
|:---|:---|:---:|:---|:---|
| Identity Archive 화면 골격 | IDA-01 | P0 | 미구현 | 신규 화면 |
| 카테고리 그리드 (18 카테고리) | IDA-02 | P0 | 미구현 | 좌측 카테고리 리스트 |
| 인물 카드 패널 | IDA-03 | P0 | 미구현 | 우측 인물 상세 |
| Recovery 게이지 시각화 | IDA-04 | P0 | 미구현 | 인물 진행도 |
| Fragment 컬렉션 (Stage별) | IDA-05 | P0 | 미구현 | 문장 영구 보존 |
| Identity Trait 표시 | IDA-06 | P1 | 미구현 | 가동 결 목록 |
| Re-Dive 카운터 + 회차별 단편 | IDA-07 | P1 | 미구현 | 0/3 ~ 3/3 |
| Network Fragment 표시 | IDA-08 | P2 | 미구현 | 관계 단편 양방향 표시 |
| Echo Chord / Era Echo 알림 | IDA-09 | P2 | 미구현 | 카테고리 / 시대 완성 시 |
| 미발견 인물 슬롯 (`???`) | IDA-10 | P1 | 미구현 | 발견 동기 시각화 |
| 인벤토리 ↔ Archive 전환 | IDA-11 | P0 | 미구현 | Z키 진입/복귀 |

---

## 0. 필수 참고 자료 (Mandatory References)

| 문서 | 경로 | 이 문서와의 관계 |
|:---|:---|:---|
| DEC-046 | `memory/wiki/decisions/DEC-046.md` | 패러다임 전환 결정 |
| Memory Core | `Documents/System/System_Memory_Core.md` | Identity Archive 시스템 정의 §2.5 |
| Equipment Growth | `Documents/System/System_Equipment_Growth.md` | Recovery 게이지 / Stage 진행 |
| Inventory UI | `Documents/UI/UI_Inventory.md` | Z키 진입 경로, 화면 전환 동선 |
| Return Result UI | `Documents/UI/UI_ItemWorld_ReturnResult.md` | Fragment 해금 후 Archive 갱신 연동 |
| 측량사 예시 | `Documents/Content/Content_Item_Narrative_SurveyorEchoWedge.md` | 인물 데이터 모델 검증 |
| Fragment 텍스트 SSoT | `Sheets/LoreTexts/Fragments/sword_magic.md` | 데이터 소스 |

---

## 1. 개요 (Overview)

Identity Archive는 *복원된 인생들* 의 컬렉션 화면이다. 무기 인벤토리(물건 컬렉션)와 본질적으로 다른 정서를 가진다.

### 1.1. 정서적 차이

| 인벤토리 | Identity Archive |
|---------|-----------------|
| **단위:** 아이템 인스턴스 (uid 기준) | **단위:** 인물 (진명 기준) |
| **정서:** 물건 관리 | **정서:** 사람 기록 |
| **목적:** 장착 / 비교 / 다이브 대상 선택 | **목적:** 복원 진행도 확인 / 다음 인물 탐색 |
| **정렬:** 획득순 / 레어리티 / 종류 | **정렬:** 카테고리 / 발견순 / 복원도 |
| **상실 시:** 아이템 분실 → 슬롯 비움 | **상실 시:** *무기 분실해도 인물 페이지 유지* (인생은 잊혀지지 않음) |

### 1.2. ECHORIS 야리코미의 정서적 핵심

DEC-046의 핵심 약속:
> *"플레이어는 무기를 모으는 게 아니라 사람들을 모으고 있음."*

이 약속을 *물질화* 하는 화면이 Identity Archive다. 인벤토리만으로는 *"내가 키운 검의 컬렉션"* 으로 인식되지만, Identity Archive는 *"내가 복원한 인생의 컬렉션"* 으로 정서를 전환한다.

> **검증 트리거:** Identity Archive에서 인물 카드를 *자발적으로* 다시 열어보는지 (재방문률), 카테고리 미완성 슬롯을 보고 *다음 다이브의 동기* 가 형성되는지가 본 UI의 성공 지표.

---

## 2. 진입 동선 (Entry Flow)

### 2.1. 진입 채널

| 진입 채널 | 트리거 | 비고 |
|:---|:---|:---|
| **인벤토리에서 Z키** | 인벤토리 열림 + 아이템 선택 상태 + `Z` | 선택 아이템의 인물 페이지 직접 진입 |
| **메인 메뉴에서 진입** | `ESC` → "Identity Archive" 선택 | 카테고리 그리드 진입 |
| **Return Result에서 진입** | Stage 4 도달 직후 결과 화면 → `A` 키 | 방금 복원한 인물 카드 진입 |
| **(폐기 검토)** ~~기억의 사서 NPC~~ | ~~세이브 포인트 진입~~ | *공간적 의식* 방안. 현재 P3 보류 — 키 진입으로 단순화 |

### 2.2. 진입 시 초기 표시

| 진입 채널 | 초기 표시 |
|:---|:---|
| 인벤토리 Z | 선택 아이템의 인물 카드 페이지 |
| 메인 메뉴 | 카테고리 그리드 (가장 최근 발견 카테고리 하이라이트) |
| Return Result A | 방금 100% 복원한 인물 카드 + *축하 연출* (글로우 1회 + 부드러운 차임) |

### 2.3. 닫기

- `ESC` 또는 `Z` 또는 `I` → 진입 직전 화면 복귀 (인벤토리 ← → Archive 토글 가능)

---

## 3. 레이아웃 (Layout)

### 3.1. 전체 화면 구성 (640×360)

Identity Archive는 *전체 화면 오버레이* 다. 인벤토리(중앙 정렬 패널)와 달리 화면 전체를 사용하여 *기록의 무게* 를 표현한다.

```
←──────────────── 640px ────────────────→

+═════════[ IDENTITY ARCHIVE ]════════════════════════════+
│                                                          │
│ ┌──[CATEGORIES]──┐  ┌──[CHARACTER CARD]───────────────┐ │
│ │                 │  │                                  │ │
│ │ ► Surveyor      │  │  Surveyor's Echo Wedge           │ │
│ │   ████████░ 1/5 │  │  Bulkhead Survey Guild           │ │
│ │                 │  │  격벽 4 표면에서 발견             │ │
│ │   Bulkhead      │  │  ───────────────────────────────│ │
│ │   Repairman     │  │  Recovery: ████████████ 100%     │ │
│ │   ░░░░░░░ 0/5   │  │  Re-Dive: 1/3                    │ │
│ │                 │  │                                  │ │
│ │   Cable Bearer  │  │  ▸ "두드리고 듣는다."            │ │
│ │   ░░░░░░░ 0/5   │  │  ▸ "균열은 거짓말을 하지 않아."   │ │
│ │                 │  │  ▸ "위에 있는 사람들은 보고서를"  │ │
│ │   Drafting      │  │  ▸ "보고하지 않은 건 비밀이어서가" │ │
│ │   Archivist     │  │     아니야. 끝을 보고 싶었을 뿐"  │ │
│ │   ░░░░░░░ 0/5   │  │                                  │ │
│ │                 │  │  ◆ 공명의 결                      │ │
│ │   Abyss Diver   │  │  ◆ 끝을 보는 결                   │ │
│ │   ░░░░░░░ 0/5   │  │  ◆ 측량사의 정체성 핵              │ │
│ │                 │  │                                  │ │
│ │   [+13 more]    │  │  ☍ Network: Bulkhead Repairman   │ │
│ │                 │  │                                  │ │
│ │ Total: 1/300    │  │  [A] Re-Dive  [Z] Inventory  [ESC]│ │
│ └─────────────────┘  └──────────────────────────────────┘ │
│                                                          │
+══════════════════════════════════════════════════════════+
```

### 3.2. 패널 치수

| 항목 | 값 |
|:---|:---|
| 외부 패딩 | 좌우 16px, 상하 16px |
| 좌 패널 (Categories) | 너비 180px |
| 우 패널 (Character Card) | 너비 428px |
| 패널 간 간격 | 8px |
| 패널 높이 | 312px (640 − 16×2 − 헤더 16px − 푸터 16px) |
| 배경색 | `0x0A0A14` (인벤토리보다 진함 — 기록의 무게) |
| 패널 배경 | `0x1A1A2E` alpha 0.95 |
| 패널 보더 | `0x4A4A6A` 1px |
| 헤더 타이틀 | "IDENTITY ARCHIVE" fontSize 9, `0xFFFFFF` |
| 화면 페이드 인 | 300ms |

### 3.3. 카테고리 패널 (좌 180px)

#### 카테고리 항목 구조

```
┌─────────────────┐
│ ► Surveyor      │  ← 활성 카테고리 (▶ 표시, 밝은 색)
│   ████████░ 1/5 │  ← 진행 막대 + 완성/전체
└─────────────────┘
```

| 요소 | 색상 | fontSize | 비고 |
|:---|:---|:---:|:---|
| 카테고리 이름 (활성) | `0xFFFFFF` | 8 | 좌측 ▶ 표시 |
| 카테고리 이름 (비활성) | `0xAAAAAA` | 8 | |
| 카테고리 이름 (미발견) | `0x555555` | 8 | "???" 표시 (1명도 발견 안 한 경우) |
| 진행 막대 | Stage 색 (0=회색, 4=골드) | 시각 + `1/5` 6px | 완성 명수 / 카테고리 총 명수 |
| 총합 카운터 (하단) | `0xCCCCCC` | 6 | "Total: 1/300" |

#### 카테고리 정렬

기본 정렬: *발견 순* (가장 최근 발견 카테고리가 상단). 미발견 카테고리는 *카테고리 이름 알파벳순* 으로 하단에 ???로 표시.

대안 정렬 (메뉴 선택):
- 완성도 순 (100% → 0%)
- 알파벳 순
- 발견 순 (기본)

#### 18 카테고리 풀

`Documents/System/System_Memory_Core.md` §3.1 참조. P0 작업에서는 *5개 카테고리* 만 우선 구현 (Surveyor / Bulkhead Repairman / Cable Bearer / Drafting Archivist / Abyss Diver), 나머지 13개는 `[+N more]` 로 묶어 표시.

### 3.4. 인물 카드 패널 (우 428px)

#### 카드 구조 (Stage 0 ~ Stage 4)

```
┌──[CHARACTER CARD]───────────────────────────┐
│                                              │   ← 1. 헤더 (32px)
│  Surveyor's Echo Wedge          MAGIC        │      이름 + 레어리티
│  Bulkhead Survey Guild                       │      소속
│  격벽 4 표면에서 발견                          │      발견 위치
│  ─────────────────────────────────────────  │
│  Recovery: ████████████ 100%                 │   ← 2. Recovery 게이지 (24px)
│  Re-Dive: 1/3                                │
│  ─────────────────────────────────────────  │
│                                              │   ← 3. Memory Fragments (가변)
│  ▸ "두드리고 듣는다."                         │
│  ▸ "균열은 거짓말을 하지 않아."                │
│  ▸ "위에 있는 사람들은 보고서를 원했어."        │
│  ▸ "보고하지 않은 건 비밀이어서가 아니야.        │
│     끝을 보고 싶었을 뿐이야."                  │
│  ─────────────────────────────────────────  │
│                                              │   ← 4. Identity Traits (가변)
│  ◆ 공명의 결       약점 노출 적 ATK +12%      │
│  ◆ 끝을 보는 결    처치 시 ATK 5% 누적         │
│  ◆ 측량사의 정체성 핵 격벽 인접 INT +8%        │
│  ─────────────────────────────────────────  │
│                                              │   ← 5. Network (16px)
│  ☍ Bulkhead Repairman (미발견)                │
│  ─────────────────────────────────────────  │
│  [A] Re-Dive  [Z] Inventory  [ESC] Close     │   ← 6. 푸터 (16px)
└──────────────────────────────────────────────┘
```

#### 섹션별 사양

**1. 헤더 (32px):**

| 요소 | 위치 | 형식 | 색상 |
|:---|:---|:---|:---|
| 표시 이름 (Stage 4 진명) | 좌상단 | fontSize 9 | 레어리티 색 |
| 레어리티 배지 | 우상단 정렬 | fontSize 7 | 레어리티 색 |
| 직업/소속 | 이름 아래 | fontSize 7 | `0xFFFFFF` |
| 발견 위치 | 소속 아래 | fontSize 6 | `0xAAAAAA` |

> **Stage 0 (Unknown) 표시:** 이름 `[Unknown] {Category Type}` (예: `[Unknown] Bulkhead Wedge`), 소속 미표시, 발견 위치만 표시 (`아이템계 접근 가능 — 다이브로 정체 확인`)

**2. Recovery 게이지 (24px):**

- 시각 막대 (380px 너비) + `XXX%` 텍스트 우측 정렬
- Stage 색 (0=회색, 1=흰색, 2=파란, 3=노란, 4=레어리티 색)
- Re-Dive 카운터: 100% 도달 후만 표시. `0/3` ~ `3/3`. Re-Dive 회차마다 *작은 보석* 아이콘 (◇ → ◈)

**3. Memory Fragments (가변 높이):**

- 해금된 Fragment 전체 표시 (Stage별)
- 미해금 Fragment는 `▸ ???` 회색 placeholder
- Fire 모멘트 (Stage 4) Fragment는 *글로우 효과 + 1px 두꺼운 인덴트*
- Re-Dive Fragment는 *별도 그룹* 으로 하단에 표시:
  ```
  --- Re-Dive 1 (Cyan) ---
  ▸ "측량의 본질은 보고가 아니라 답이야..."
  --- Re-Dive 2 (Magenta) ---
  ▸ "그날 일지에는 안 적었지만..."
  ```
- 색상: 1차=`#88FFFF`, 2차=`#FF88FF`, 3차=`#888888`
- 길면 자동 줄바꿈, 인용 들여쓰기

**4. Identity Traits (가동 결 목록, 가변 높이):**

- 해금된 결 전부 표시
- 형식: `◆ {결 이름}      {효과 요약}`
- 결 이름 색: `#FFD700` (골드)
- 효과 요약 색: `0xAAAAAA`
- Re-Dive로 *효과 변형* 된 결은 우측에 `→` 변형 후 효과 추가 표시:
  ```
  ◆ 측량사의 정체성 핵   격벽 인접 INT +8%
                       → (Re-Dive 1) 격벽 인접 ATK +8%
  ```

**5. Network (관계 단편, 16px+):**

- `☍ {연결 인물 카테고리}` 형식
- 미발견 인물: `(미발견)` 회색 표시 — *동기 시각화*
- 발견 + 100% 복원 인물: 클릭/Enter 시 해당 인물 카드로 즉시 전환 (양방향 이동)
- 해금된 Network Fragment 텍스트는 그 아래 인용 표시

**6. 푸터 (16px):**

| 키 | 동작 | 표시 조건 |
|:---|:---|:---|
| `A` Re-Dive | 100% 복원 + Re-Dive < 3 시 활성. 인벤토리에서 해당 아이템 자동 선택 + Anvil 모드 진입 | 100% 도달 후 |
| `Z` Inventory | 인벤토리 화면으로 복귀 (또는 진입 직전 화면) | 항상 |
| `←` `→` | 이전/다음 인물 (같은 카테고리 내) | 카테고리에 2명 이상 시 |
| `↑` `↓` | 카테고리 변경 | 항상 |
| `ESC` | Archive 닫기 | 항상 |

### 3.5. Stage 0 (Unknown) 인물 카드

미복원 인물도 *발견* 단계가 있다. 아이템을 획득한 순간 `[Unknown]` 으로 등록되어 *Archive에 슬롯이 생긴다*.

```
┌──[CHARACTER CARD]──────────────────────────┐
│                                             │
│  [Unknown] Wedge                  MAGIC     │
│  ???                                        │
│  격벽 4 표면 (지하 수로)                     │
│  ─────────────────────────────────────────│
│  Recovery: ░░░░░░░░░░░░ 0%                  │
│  ─────────────────────────────────────────│
│                                             │
│  ▸ ???                                      │
│  ▸ ???                                      │
│  ▸ ???                                      │
│  ▸ ???                                      │
│  ─────────────────────────────────────────│
│                                             │
│  ◆ ??? (다이브로 깨어남)                     │
│  ─────────────────────────────────────────│
│  [X] Dive in this item                      │
│  [Z] Inventory  [ESC] Close                 │
└─────────────────────────────────────────────┘
```

> **설계 의도:** *미발견* 자체가 동기. Archive에서 *비어있는 슬롯* 을 보는 것이 다음 다이브 동기로 자연 전환되어야 한다.

---

## 4. 시각 효과 (Visual Effects)

### 4.1. 카테고리 완성 시 (Echo Chord 해금)

카테고리 5명 전원 100% 복원 시:
1. 해당 카테고리 항목 *골드 글로우* (1.0초)
2. 화면 상단에 *Echo Chord 알림* 토스트 (3초)
3. Echo Chord 텍스트가 카테고리 헤더 하단에 *영구 표시*

### 4.2. Era Echo 해금 시

30명 이상 100% 복원 시:
1. Archive 진입 시 *Era Echo* 알림 모달 (1회만)
2. Era Echo 텍스트가 화면 하단에 *영구 띠* 로 표시 (스크롤)

### 4.3. Stage 진화 직후 첫 Archive 방문

방금 Stage 진화한 인물 카드를 방문 시:
- 카드 보더가 *레어리티 색으로 0.8초 펄스* (1회)
- 새 Fragment에 *타자기 등장 연출* (이미 본 Fragment는 즉시 표시)

---

## 5. 미발견 인물 처리 (Discovery Design)

### 5.1. 카테고리 자체 미발견

해당 카테고리의 무기를 1개도 획득하지 못한 경우.

- 카테고리 이름: `???` (회색)
- 진행 막대: 빈 막대 + `? / ?`
- 클릭/Enter 시: *"아직 발견되지 않은 카테고리"* 토스트 + 진입 차단

### 5.2. 카테고리 발견됨 + 특정 인물 미발견

같은 카테고리의 *다른 인물* 은 발견했지만 이 슬롯은 아직 없는 경우.

- 슬롯에 `[Unknown] Slot {N}` 표시 + 회색 외곽선
- 클릭 시: 발견 가능 지역 *힌트* (예: *"지하 수로의 깊은 곳에서 발견 가능"*) — 동기 부여

### 5.3. 인물 발견됨 + Stage 0

획득은 했지만 아직 한 번도 다이브 안 한 인물.

- §3.5 Stage 0 카드 표시
- 푸터에 `[X] Dive in this item` 활성 — 즉각 다이브 동기 제공

---

## 6. 데이터 구조 (Data Model)

### 6.1. Identity Archive 저장 데이터

```typescript
interface IdentityArchive {
  characters: Record<string, CharacterRecord>;   // itemUid → record
  categoryProgress: Record<string, CategoryProgress>;  // category → 진행도
  echoChords: string[];                          // 해금된 Echo Chord ID
  eraEchoes: string[];                           // 해금된 Era Echo ID
}

interface CharacterRecord {
  itemUid: number;
  itemDefId: string;                             // 무기 ID (예: sword_magic)
  category: string;                              // Surveyor / BulkheadRepairman / ...
  rarity: Rarity;
  recovery: number;                              // 0.0 ~ 100.0
  reDiveCount: number;                           // 0 ~ 3
  unlockedFragmentIds: string[];                 // Stage 1~4 Fragment ID
  reDiveFragmentIds: string[];                   // Re-Dive 회차별 Fragment ID
  unlockedTraitIds: string[];                    // 가동된 결 ID
  discoveredAt: number;                          // 발견 timestamp
  networkConnections: string[];                  // 해금된 Network Fragment ID
}

interface CategoryProgress {
  category: string;
  totalSlots: number;                            // 카테고리 총 명수 (보통 5)
  discoveredCount: number;
  completedCount: number;                        // 100% 복원 인원
  echoChordUnlocked: boolean;
}
```

### 6.2. Archive 영속성 규칙

- **아이템 분실/판매:** Archive 항목 *유지*. *"인생은 잊혀지지 않는다"*
- **동일 정의 무기 중복 획득:** 신규 *인스턴스* 로 등록 (절차 시드 다름 = 다른 인물). 단, 첫 등록 인물의 발견 데이터는 *카테고리* 에 귀속
- **Re-Dive 단편:** 회차별로 영구 보존
- **세이브 마이그레이션:** 기존 세이브의 아이템 → `recovery = level × 10` 으로 환산하여 Archive 초기 등록

---

## 7. 엣지 케이스 (Edge Cases)

| 상황 | 처리 |
|:---|:---|
| Archive 진입 시 발견 인물 0명 | 빈 화면 + 안내: *"세계에서 첫 무기를 발견하면 여기에 기록됩니다."* + `[ESC] Close` 만 활성 |
| 카테고리에 발견 인물 5명 초과 | 스크롤. 카테고리 진행 막대는 5명 기준 (`5/5` 도달 후 추가 인물은 *보너스* 로 표시) |
| Fragment 텍스트가 매우 김 | 자동 줄바꿈 + 카드 내부 스크롤 (Fragment 영역만) |
| Re-Dive 3 도달 + 새 회차 시도 | 토스트: *"이 인생의 모든 면을 보았습니다."* |
| 인물 카드 좌우 네비게이션 중 발견되지 않은 슬롯 | 스킵 (발견 인물만 순회) — `↑↓` 키로 카테고리 이동 |
| Network 연결 인물이 100% 미만 | 회색 표시 + 클릭 시 *"이 인물을 먼저 복원해야 관계가 드러납니다"* |
| LoreTexts/Fragments/{itemId}.md 미존재 | placeholder Fragment 표시 (`▸ "..."` ) + 콘솔 경고 |

---

## 8. 검증 체크리스트 (Acceptance Criteria)

### 기능 검증

- [ ] 인벤토리에서 `Z` 키 → Archive 진입, 선택 아이템의 인물 카드 표시
- [ ] 메인 메뉴 → Archive 진입, 카테고리 그리드 표시
- [ ] Return Result 화면에서 `A` 키 → Archive 진입, 방금 복원한 인물 카드 + 글로우 연출
- [ ] 카테고리 진행 막대가 발견/복원 인원 정확 반영
- [ ] 인물 카드의 Recovery / Fragment / Trait / Re-Dive 모두 최신 상태 반영
- [ ] 미발견 인물은 `???` 또는 `[Unknown]` 표시
- [ ] Stage 0 카드에서 `X` 키로 즉시 다이브 가능
- [ ] 100% Recovery 인물 카드에서 `A` 키로 Re-Dive 진입
- [ ] Network Fragment가 양 인물 카드에 양방향 표시
- [ ] 아이템 분실/판매 후 Archive 항목 유지

### 경험 검증

- [ ] Archive를 *자발적으로 다시 열어보는가* (세션 중 2회 이상)
- [ ] 카테고리 미완성 슬롯을 보고 *다음 다이브 동기* 가 형성되는가
- [ ] 100% 복원 직후 *축하 연출* 이 보상으로 느껴지는가
- [ ] Fragment 컬렉션이 *수치 컬렉션* 보다 *서사 컬렉션* 으로 인식되는가
- [ ] Network Fragment 해금 시 *발견의 기쁨* 이 있는가

---

## 9. 다음 작업

1. 인물 카테고리 데이터 시트 (`Sheets/Content_IdentityCategories.csv`) 신규 작성
2. 18 카테고리 모두 정의 (현재 5개 P0 + 13개 P1)
3. Echo Chord / Era Echo 텍스트 작성 (`Sheets/LoreTexts/EchoChords/`)
4. Identity Archive 코드 구현 (`game/src/ui/IdentityArchive.ts` 신규)
5. SaveManager 확장 (IdentityArchive 영속성)

---

## 10. 변경 이력 (Changelog)

| 날짜 | 버전 | 변경 사항 |
|:---|:---|:---|
| 2026-05-24 | 1.0 | DEC-046 신규 화면. Identity Archive 명세 초안. |
