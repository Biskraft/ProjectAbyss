# Memory Room — Phase 0 구현 계획

> **문서 ID:** PLN-MR-001
> **상태:** Draft
> **작성일:** 2026-04-11
> **관련 콘텐츠:** `Content_Item_Narrative_FirstSword.md` (CNT-ITM-002)
> **관련 시스템:** `DialogueBox.ts`, `DialogueManager.ts` (재활용)

---

## 0. 목적

ECHORIS 캐치프레이즈 **"아이템에 들어가면, 그 아이템의 기억이 던전이 된다"** 가 현재 런타임 체감(전투 → 레벨업 → 전투 반복)과 정합하지 않는다.

**해결:** 전투 방 사이에 "기억을 읽는 정지 방" 1개를 삽입한다. 기존 대화 시스템과 LDtk 방 패턴을 그대로 재활용. Dead Cells의 Lore Room 구조 차용.

**원칙:**

- 신규 UI/이펙트/오디오/입력 시스템 발명 금지
- 기존 `DialogueBox`/`DialogueManager` 재활용 — X키 팝업 = 대화와 동일
- 기존 CNT-ITM-002 텍스트 그대로 사용 — 신규 글쓰기 0

---

## 1. 레퍼런스

Dead Cells — Lore Rooms. 크리티컬 패스 밖 작은 방, 단일 오브젝트, 전투 없음, 스킵 가능.

---

## 2. 구조

```
[LDtk 방] memory_first_sword_01
        └ [Memory Entity] text: "칼이 없다. 가죽이 잘 길들어 있다. ..."
              └ 플레이어 근접 + X → 대화창 (기존 DialogueBox)
```

### 2.1. 핵심 3요소

| # | 요소 | 구현 방식 |
|:---|:---|:---|
| 1 | Memory Entity (LDtk) | LDtk Entity 타입 `Memory` 추가 — 필드 `text: String` 만 |
| 2 | Memory 방 (LDtk) | 일반 방과 같은 크기. 전투 엔티티 0, Memory Entity 1 |
| 3 | 방-아이템 연결 (CSV) | 아이템별 memory room name 참조 테이블 |

### 2.2. 동작

- 플레이어가 Memory Entity에 근접 → 기존 `DialogueManager` area trigger 발동
- **기존 대화창 슬라이드 인** → 타이핑 → X키 닫기
- 전투 HUD, 입력 차단, 페이드, 오디오 — 전부 대화 시스템이 이미 처리

---

## 3. 구현 항목

### 3.1. LDtk

| # | 작업 | 규모 |
|:---|:---|:---|
| L1 | LDtk Entity 타입 `Memory` 등록 — 필드 `text: String` | 1 엔티티 |
| L2 | LDtk 방 `memory_first_sword_01` 생성 (test용 1개) | 1 레벨 |
| L3 | 방에 Memory Entity 1개 배치, `text` 필드에 CNT-ITM-002 §3.1 "빈 칼집" 텍스트 입력 | 1 인스턴스 |

### 3.2. 코드

| # | 작업 | 파일 | 규모 |
|:---|:---|:---|:---|
| C1 | `LdtkLoader.ts`가 Memory 엔티티 파싱 (기존 Dialogue 파싱 옆에 추가) | `level/LdtkLoader.ts` | ~10줄 |
| C2 | `ItemWorldScene`에서 Memory 엔티티를 area trigger dialogue로 등록 (기존 `registerLdtkDialogues` 재활용 또는 간단 래퍼) | `scenes/ItemWorldScene.ts` | ~10줄 |
| C3 | Memory 방은 `spawnEnemiesForRoom` 스킵 (RoomType == 'Memory' 체크) | `scenes/ItemWorldScene.ts` | ~3줄 |

### 3.3. 데이터 (CSV)

**신규 테이블:** `Sheets/Content_ItemWorld_MemoryRooms.csv`

```csv
WeaponID,StratumIndex,MemoryRoomName
sword_magic,0,memory_first_sword_01
```

| 컬럼 | 설명 |
|:---|:---|
| WeaponID | `Content_Stats_Weapon_List.csv`의 WeaponID 참조 |
| StratumIndex | 0-based 지층 인덱스. 해당 지층에 이 방을 삽입 |
| MemoryRoomName | LDtk 레벨 이름 |

**왜 별도 테이블인가:** `Content_Stats_Weapon_List.csv`는 레어리티별 1행만 존재 (아이템 id = weapon type). Memory room은 지층별로 달라야 하므로 정규화된 별도 테이블이 맞음.

### 3.4. 코드 — CSV 로더

| # | 작업 | 파일 | 규모 |
|:---|:---|:---|:---|
| C4 | `data/memoryRoomTable.ts` — CSV 파싱, `getMemoryRoom(weaponId, stratumIndex)` 조회 함수 | 신규 | ~30줄 |
| C5 | `ItemWorldScene` 생성 시 해당 아이템+지층의 memory room이 있으면 그 방을 지층 그리드에 삽입 | `scenes/ItemWorldScene.ts` | ~15줄 |

---

## 4. 구현 순서

1. **L1** — LDtk Entity 타입 `Memory` 등록
2. **L2-L3** — test 방 1개 생성 + Memory Entity 배치 + CNT-ITM-002 §3.1 텍스트 입력
3. **C1-C3** — 파서 + 씬 통합 + 몹 스폰 스킵
4. **C4-C5 + CSV 생성** — 테이블 로더 + First Sword sword_magic 1행 등록
5. **플레이 테스트** — sword_magic 진입 시 stratum 0에 memory 방 등장 확인
6. 동작 확인 후 지층 2/3도 추가 (L2-L3 반복, CSV에 2행 추가)

---

## 5. 수용 기준

| # | 기준 |
|:---|:---|
| AC1 | sword_magic으로 아이템계 진입 시 지층 0에 memory 방 1개 포함 |
| AC2 | Memory 방에 몹 스폰 없음 |
| AC3 | Memory Entity 근접 시 기존 대화창이 슬라이드 인 |
| AC4 | 대화 텍스트 = CNT-ITM-002 §3.1 "빈 칼집" 문장 |
| AC5 | X키로 닫기. 재근접 시 다시 열람 가능 |

---

## 6. 스코프 밖

- 신규 UI 컴포넌트 (MemoryReader 등) — 기존 DialogueBox 사용
- 전용 오디오 이벤트
- 전용 페이드/암전 효과
- 힌트 UI ("[X] Read" 별도 표시) — 기존 area trigger 자체로 충분
- 지층별 블록 팔레트 tint
- 보스 킬라인 텍스트 오버레이 (철회)
- 절차적 생성 풀 편입 — Phase 1
- 코덱스/기록 보관함

---

## 7. 참고

- `Content_Item_Narrative_FirstSword.md` (CNT-ITM-002) — 텍스트 원본
- `game/src/ui/DialogueBox.ts` — 재활용할 UI
- `game/src/systems/DialogueManager.ts` — 재활용할 trigger 로직
- `game/src/level/LdtkLoader.ts` — 엔티티 파서 추가 위치
- `game/src/scenes/ItemWorldScene.ts` — 씬 통합 위치
- `Sheets/Content_Stats_Weapon_List.csv` — WeaponID 참조
- `Sheets/Content_ItemWorld_SpawnTable.csv` — 참고할 테이블 포맷
