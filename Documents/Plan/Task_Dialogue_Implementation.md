# 대화 시스템 구현 태스크 — Programmer Agent Brief

> **태스크 ID:** TASK-DLG-IMPL
> **우선순위:** P0 (MVP 필수)
> **의존성:** 없음 (기존 시스템만으로 구현 가능)
> **참조 스펙:** `Documents/Content/Content_First30Min_ExperienceFlow.md`
> **산출물:** `game/src/ui/DialogueBox.ts`, `game/src/data/dialogues.ts`, 기존 씬 연동

---

## 0. 배경

첫 30분 경험(22개 스크린)에 에르다 독백 20줄+, NPC 대화 10줄+가 필요하다. 현재 텍스트 표시는 `Toast`(짧은 알림)만 존재하며, 캐릭터 대사를 표시하는 시스템이 없다.

---

## 1. 구현 범위

### 1-A. 대사 유형 3종

| 유형 | 예시 | UI 형태 | 입력 |
|:--|:--|:--|:--|
| **에르다 독백** | "동화 30개짜리 수리 의뢰." | 화면 하단 반투명 박스, 이름 없음 | 자동 진행 (3초) 또는 Z키로 스킵 |
| **NPC 대화** | 이렌: "균열 제단도 아닌 곳에서?" | 화면 하단 박스 + 화자 이름 표시 | Z키로 다음 줄 진행 |
| **시스템 알림** | "공격력 +8 (영구 강화)" | 기존 Toast 활용 | 자동 소멸 |

### 1-B. 트리거 유형 4종

| 트리거 | 조건 | 예시 |
|:--|:--|:--|
| `area` | 플레이어가 특정 좌표 영역 진입 | Screen 1: 숲 입구 진입 시 독백 |
| `interact` | NPC 근접 + ↑키 | Screen 18: 이렌 다스에게 말 걸기 |
| `event` | 특정 게임 이벤트 발생 | Screen 13: 보스 처치 후 대사 |
| `auto` | 씬 로드 직후 | Screen 0: 의뢰서 텍스트 |

---

## 2. 파일 구조

### 2-A. `game/src/ui/DialogueBox.ts` (신규)

```
DialogueBox
├── container: Container (화면 하단 고정, 카메라 무관)
├── background: Graphics (반투명 검정 박스)
├── speakerText: BitmapText (화자 이름, 컬러 구분)
├── bodyText: BitmapText (대사 본문)
├── advanceHint: BitmapText ("Z" 아이콘, 깜빡임)
└── state: 'hidden' | 'typing' | 'waiting' | 'closing'
```

**핵심 메서드:**

```typescript
// 한 줄 표시 (독백용)
showMonologue(text: string, autoCloseMs?: number): Promise<void>

// 연속 대화 표시 (NPC용)
showDialogue(lines: DialogueLine[]): Promise<void>

// 즉시 닫기
close(): void

// 매 프레임 호출
update(dt: number): void
```

**동작 규칙:**
- `typing` 상태에서 Z키 → 텍스트 즉시 완성
- `waiting` 상태에서 Z키 → 다음 줄 또는 닫기
- 독백의 `autoCloseMs` 기본값: 3000ms
- 대화 표시 중 플레이어 이동 **불가** (NPC 대화), **가능** (독백)
- `showMonologue`/`showDialogue`는 Promise 반환 → 대사 완료 후 다음 로직 진행 가능

### 2-B. `game/src/data/dialogues.ts` (신규)

```typescript
export interface DialogueLine {
  speaker?: string;        // 없으면 독백
  speakerColor?: number;   // 이름 색상 (기본: 0xffffff)
  text: string;
  autoCloseMs?: number;    // 독백용 자동 닫힘
}

export interface DialogueTrigger {
  id: string;              // 고유 ID (중복 재생 방지)
  type: 'area' | 'interact' | 'event' | 'auto';
  once: boolean;           // true면 1회만 재생
  lines: DialogueLine[];
  // area 트리거 전용
  area?: { x: number; y: number; width: number; height: number };
  // event 트리거 전용
  eventName?: string;
}
```

**MVP 대사 데이터:** 첫 30분 스크린별 대사를 이 포맷으로 정의. `Content_First30Min_ExperienceFlow.md`의 모든 "(필수)" 대사를 여기에 등록.

### 2-C. `game/src/systems/DialogueManager.ts` (신규)

```typescript
export class DialogueManager {
  private box: DialogueBox;
  private firedTriggers: Set<string>;  // 1회 트리거 추적

  // area 트리거 체크 (매 프레임, LdtkWorldScene.update에서 호출)
  checkAreaTriggers(playerX: number, playerY: number, levelId: string): void

  // event 트리거 발화 (보스 처치, 아이템 획득 등에서 호출)
  fireEvent(eventName: string): Promise<void>

  // NPC 상호작용 대화 시작
  startInteraction(npcId: string): Promise<void>

  // 진행 중 여부
  isActive(): boolean
}
```

---

## 3. 기존 코드 연동

### 3-A. `LdtkWorldScene.ts` 수정

```
// update() 안에서:
if (!this.dialogueManager.isActive()) {
  // 기존 플레이어 입력 처리
} else {
  // 대화 중에는 Z키를 대화 진행에 사용
  this.dialogueManager.update(dt);
}

// NPC 엔티티 근접 + ↑키 시:
this.dialogueManager.startInteraction(npc.dialogueId);
```

### 3-B. `ItemWorldScene.ts` 수정

- 보스 처치 후 `dialogueManager.fireEvent('boss_clear')` 호출
- "+8 ATK" 알림은 기존 Toast 유지 (대화 시스템과 별도)

### 3-C. `Player.ts` 수정

- `DialogueManager.isActive()` 시 공격/대시 입력 무시 (NPC 대화)
- 독백 중에는 입력 허용

---

## 4. UI 레이아웃 명세

```
게임 화면 (480 x 270)
┌─────────────────────────────────────┐
│                                     │
│          (게임 플레이 영역)           │
│                                     │
│                                     │
├─────────────────────────────────────┤
│ [에르다]                             │  ← speakerText (y: 210)
│ "동화 30개짜리 수리 의뢰.            │  ← bodyText (y: 225)
│  이번 달 임대료엔 아직 멀다."     [Z] │  ← advanceHint (우하단)
└─────────────────────────────────────┘
  ↑ background: 반투명 검정 (alpha 0.75)
  ↑ 높이: 60px, 하단 고정
  ↑ 좌우 패딩: 8px
```

**화자 이름 색상:**

| 화자 | 색상 | Hex |
|:--|:--|:--|
| 에르다 (독백) | 표시 안 함 | — |
| 이렌 다스 | 하늘색 | 0x88ccff |
| 오렌 | 연두색 | 0xaaff88 |
| 마르타 (쪽지) | 보라색 | 0xcc88ff |

---

## 5. 구현 순서

| 순서 | 작업 | 산출물 | 검증 |
|:--:|:--|:--|:--|
| 1 | `DialogueBox.ts` UI 컴포넌트 | 화면 하단 텍스트 박스 표시/숨김 | 하드코딩 텍스트로 표시 테스트 |
| 2 | 타이핑 효과 + Z키 진행 | 글자 단위 표시 + 스킵 + 다음 줄 | 3줄 연속 대화 테스트 |
| 3 | `DialogueManager.ts` 트리거 시스템 | area/event/interact 트리거 | 특정 좌표 진입 시 대사 자동 재생 |
| 4 | `dialogues.ts` MVP 대사 데이터 | Screen 1~22 필수 대사 전체 | 첫 30분 플로우 통과 |
| 5 | `LdtkWorldScene.ts` 연동 | 대화 중 입력 분기 | NPC 근접 → ↑ → 대화 시작 → 완료 |
| 6 | `ItemWorldScene.ts` 연동 | 보스 처치 이벤트 발화 | 보스 처치 후 에르다 대사 재생 |

---

## 6. 참조 파일

| 파일 | 참조 이유 |
|:--|:--|
| `game/src/ui/Toast.ts` | 기존 텍스트 표시 패턴 참고 (BitmapText, PIXEL_FONT) |
| `game/src/ui/HUD.ts` | 화면 고정 UI 패턴 참고 |
| `game/src/ui/fonts.ts` | PIXEL_FONT 정의 |
| `game/src/core/InputManager.ts` | GameAction 열거형, 입력 처리 방식 |
| `game/src/entities/Altar.ts` | 상호작용 트리거 패턴 (overlaps + setShowHint) |
| `Content_First30Min_ExperienceFlow.md` | 모든 대사 원문 |

---

## 7. 제약 조건

- PixiJS v8 BitmapText 사용 (PIXEL_FONT)
- 게임 해상도 480×270 기준
- 대화 데이터는 코드 내 정적 배열 (외부 JSON 로딩 불필요, MVP 범위)
- 분기 대화/선택지는 MVP 제외 (구조적으로 차단하지 않되 구현하지 않음)
- NPC 초상화/일러스트는 MVP 제외 (이름 텍스트만으로 구분)

---

## 8. 완료 기준

- [ ] 에르다 독백이 화면 하단에 표시되고 3초 후 자동 소멸
- [ ] NPC 대화가 Z키로 줄 단위 진행되고, 대화 중 플레이어 이동 불가
- [ ] area 트리거로 특정 좌표 진입 시 대사 자동 재생 (1회만)
- [ ] event 트리거로 보스 처치 후 대사 재생
- [ ] `Content_First30Min_ExperienceFlow.md`의 모든 "(필수)" 대사가 데이터에 등록됨
- [ ] 대화 중 Z키가 공격이 아닌 대사 진행으로 동작
- [ ] TypeScript 타입 체크 통과 (`npx tsc --noEmit`)
- [ ] Vite 빌드 성공 (`npx vite build`)
