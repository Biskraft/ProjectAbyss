# System_Save_DataSchema.md — 세이브 데이터 스키마

## 구현 현황 (Implementation Status)

| 항목 | 상태 |
| :--- | :--- |
| localStorage 저장/로드 | 구현 완료 |
| 버전 검증 (v3) | 구현 완료 |
| 인벤토리 직렬화/역직렬화 | 구현 완료 |
| 능력 상태 저장 | 구현 완료 |
| 아이템계 진행 저장 (worldProgress) | 구현 완료 |
| 세이브 존재 확인 (hasSave) | 구현 완료 |
| 세이브 삭제 (deleteSave) | 구현 완료 |
| 마이그레이션 (버전 불일치 처리) | 부분 구현 (v3 불일치 시 null 반환, 자동 변환 없음) |
| 멀티 슬롯 세이브 | 미구현 |

---

## 0. 필수 참고 자료 (Mandatory References)

- Project Vision: `Documents/Terms/Project_Vision_Abyss.md`
- Writing Standards: `Documents/Terms/GDD_Writing_Rules.md`
- 아이템 인스턴스 스키마: `game/src/items/ItemInstance.ts`
- 세이브 매니저 소스: `game/src/utils/SaveManager.ts`

---

## 1. 개요 (Overview)

세이브 시스템은 플레이어의 게임 진행 상태 전체를 웹 브라우저의 `localStorage`에 JSON 형태로 직렬화하여 보존한다. 단일 슬롯 세이브 구조를 채택하며, `projectabyss_save` 키 하나에 모든 데이터를 저장한다. 버전 필드(`version: 3`)를 통해 포맷 변경을 감지하고, 버전 불일치 시 세이브를 무효화(null 반환)하여 구버전 데이터 오염을 방지한다.

---

## 2. 설계 의도 (Design Intent)

세이브 시스템은 ECHORIS의 2-Space 순환 구조(월드 탐험 → 아이템계 강화 → 재탐험)를 유지하는 인프라다. 플레이어가 세이브 포인트를 누르는 행위는 "이 장비와 강화 상태로 다음 탐험을 이어간다"는 의사 표현이며, 세이브 데이터는 그 의지를 보존한다.

- **스파이크 정렬:** 아이템계 진행 상태(`worldProgress`)를 개별 아이템마다 독립적으로 저장함으로써, "이 아이템의 기억"이 실제로 지속되는 경험을 구현한다. 아이템을 다시 들어갔을 때 이전 탐험의 흔적(방문 방, 클리어 현황, 사이클 횟수)이 남아 있어야 한다.
- **신뢰성 우선:** try/catch로 저장 실패(스토리지 용량 초과, 시크릿 모드 제한)를 무음 처리하여 크래시를 방지한다. 저장 실패는 진행 손실이지만, 게임 자체는 중단되지 않는다.
- **단순성:** 서버 없이 브라우저만으로 작동하는 Phase 1 프로토타입 제약을 반영한다. Phase 3(서버 사이드 저장)으로 전환 시 이 인터페이스 계층을 교체한다.

---

## 3. 상세 규칙 (Detailed Rules)

### 3.1 localStorage 키

```
키: projectabyss_save
타입: string (JSON 직렬화된 SaveData)
```

### 3.2 SaveData 스키마 (version: 3)

| 필드 | 타입 | 설명 |
| :--- | :--- | :--- |
| `version` | `3` (리터럴) | 포맷 버전. 반드시 숫자 `3`이어야 함. |
| `player.hp` | `number` | 세이브 시점의 현재 HP |
| `player.maxHp` | `number` | 최대 HP |
| `player.atk` | `number` | 플레이어 기본 ATK 스탯 |
| `player.def` | `number` | 플레이어 DEF 스탯 |
| `levelId` | `string` | 리스폰 기준이 되는 레벨 식별자 (LDtk 레벨 ID) |
| `inventory.items` | `SerializedItem[]` | 인벤토리 아이템 목록 (최대 20개) |
| `inventory.equippedUid` | `number \| null` | 현재 장착 중인 아이템의 UID. 없으면 null |
| `abilities.dash` | `boolean` | 대시 능력 해금 여부 |
| `abilities.diveAttack` | `boolean` | 다이브 어택 능력 해금 여부 |
| `abilities.surge` | `boolean` | 역류의 쇄도 능력 해금 여부 |
| `abilities.waterBreathing` | `boolean` | 수중 호흡 능력 해금 여부 |
| `abilities.wallJump` | `boolean` | 벽점프 능력 해금 여부 |
| `abilities.doubleJump` | `boolean` | 더블점프 능력 해금 여부 |
| `abilities.cheat` | `boolean?` | 치트 모드 플래그 (선택적, DEBUG 전용) |
| `unlockedEvents` | `string[]` | 해금된 문/스위치 IID 또는 이벤트 이름 목록 |
| `collectedRelics` | `string[]` | 수집된 렐릭 키 목록 |
| `collectedItems` | `string[]` | 수집된 아이템 키 목록 |
| `visitedLevels` | `string[]` | 방문한 레벨 식별자 목록 (안개 제거용) |
| `clearedLevels` | `string[]` | 클리어된 레벨 식별자 목록 |
| `gold` | `number` | 보유 골드 |
| `playtime` | `number` | 총 플레이타임 (밀리초) |

### 3.3 SerializedItem 스키마

아이템 인스턴스를 직렬화할 때 런타임 전용 필드(def 객체 전체, uid 재사용 불가)를 배제하고, 재구성에 필요한 최소 필드만 저장한다.

| 필드 | 타입 | 설명 |
| :--- | :--- | :--- |
| `defId` | `string` | `SWORD_DEFS`에서 무기 정의를 조회할 키 |
| `rarity` | `Rarity` | 아이템 레어리티 |
| `level` | `number` | 현재 아이템 레벨 (0~MAX_ITEM_LEVEL) |
| `exp` | `number` | 다음 레벨까지 누적된 경험치 |
| `uid` | `number` | 런타임 고유 ID (인벤토리 내 equip 참조에 사용) |
| `worldProgress` | `ItemWorldProgress?` | 아이템계 탐험 진행 데이터 (선택적) |

`worldProgress`가 없으면(undefined) 해당 아이템의 아이템계를 아직 한 번도 진입하지 않은 상태다.

### 3.4 ItemWorldProgress 스키마

| 필드 | 타입 | 설명 |
| :--- | :--- | :--- |
| `deepestUnlocked` | `number` | 해금된 최대 지층 인덱스 (보스 격파 기준) |
| `visitedRooms` | `string[]` | 방문한 방 좌표 ("col,absoluteRow" 형식) |
| `clearedRooms` | `string[]` | 클리어한 방 좌표 |
| `spawnedRooms` | `string[]` | 적 스폰이 한 번이라도 발생한 방 좌표 (킬 지속성) |
| `lastSafeStratum` | `number` | 마지막으로 안전하게 탈출한 지층 인덱스 |
| `cleared` | `boolean` | 모든 지층을 최소 1회 클리어 완료 여부 |
| `cycle` | `number` | 재진입 사이클 카운터 (0 = 첫 회차, 1+ = 재진입) |

### 3.5 저장 타이밍

- **세이브 포인트 상호작용 시:** 플레이어가 월드의 세이브 포인트(대장간/상점 포함)를 활성화할 때 저장
- **아이템계 탈출 시:** 플레이어가 아이템계를 탈출하여 월드로 귀환할 때 저장
- **게임 자동 저장 없음:** 전투 도중, 이동 중에는 저장하지 않음. 수동 세이브 포인트가 SSoT

### 3.6 로드 타이밍

- **게임 시작 시:** `SaveManager.hasSave()`로 세이브 존재 확인 후, 있으면 타이틀 화면에서 "Continue" 옵션 표시
- **게임 씬 초기화 시:** `SaveManager.load()`로 데이터를 읽고, `loadInventory()`로 인벤토리를 재구성

### 3.7 역직렬화 프로세스

```
1. localStorage.getItem(SAVE_KEY) 호출
2. JSON.parse로 파싱
3. data.version === 3 검증 → 불일치 시 null 반환
4. SaveData 타입으로 캐스팅 반환
5. loadInventory() 호출 시:
   - SerializedItem 각각에 대해 SWORD_DEFS에서 defId로 무기 정의 조회
   - createItem()으로 ItemInstance 생성
   - level, exp, worldProgress 복원
   - recalcItemAtk() 호출로 finalAtk 재계산
   - equippedUid가 있으면 해당 아이템을 equipped로 지정
```

---

## 4. 엣지 케이스 (Edge Cases)

| 상황 | 처리 방식 |
| :--- | :--- |
| localStorage 미지원 환경 (Safari 시크릿 모드 등) | try/catch로 예외 포획, 저장 실패 무음 처리. 게임은 계속 실행되나 진행은 저장되지 않음 |
| 저장 용량 초과 (QuotaExceededError) | try/catch로 포획. 저장 실패. 사용자에게 별도 알림 없음 (현재 구현) |
| version !== 3인 세이브 데이터 감지 | load()가 null 반환. 타이틀 화면에서 "New Game"만 표시. 기존 세이브는 덮어쓰이지 않음 |
| defId에 해당하는 SWORD_DEFS 항목이 없는 경우 | deserializeItem()이 null 반환. 해당 아이템은 인벤토리에 추가되지 않음. 게임 데이터에서 무기 ID가 삭제되면 해당 아이템은 소실됨 |
| equippedUid가 인벤토리에 없는 경우 | Inventory.equip()이 조회 실패. equipped = null. 장착 해제 상태로 로드됨 |
| worldProgress 신규 필드 (cleared, cycle, spawnedRooms) 미존재 | getOrCreateWorldProgress()의 backfill 로직이 기본값으로 채움 |
| 인벤토리 20개 초과 SerializedItem | Inventory.add()가 isFull 검사로 21번째부터 거부. 초과 아이템 소실 |
| JSON 파싱 오류 (손상된 데이터) | try/catch로 포획, null 반환 |
| playtime이 Number.MAX_SAFE_INTEGER를 초과 | 현재 방어 코드 없음 (약 285년 플레이 시 발생, 실용적으로 무시) |

---

## 5. 검증 체크리스트 (Acceptance Criteria)

### 기능 검증

- [ ] 세이브 포인트 활성화 후 브라우저를 완전히 닫고 재시작해도 동일 레벨, 동일 인벤토리로 복원됨
- [ ] 장착 아이템이 로드 후에도 장착 상태를 유지함
- [ ] 능력(대시, 더블점프 등) 해금 상태가 로드 후 동일하게 복원됨
- [ ] 아이템계 진행(방문 방, 클리어 여부, 사이클)이 로드 후 보존됨
- [ ] version이 다른 데이터가 있을 때 로드 시 null을 반환하고 게임이 크래시되지 않음
- [ ] localStorage가 없는 환경에서도 게임이 실행됨 (저장만 불가)
- [ ] 저장된 골드 값이 로드 후 HUD에 정확히 표시됨
- [ ] 방문 레벨 목록이 복원되어 안개 제거 상태가 유지됨

### 경험 검증

- [ ] 세이브-로드 사이클이 체감상 즉각적임 (저장/로드 딜레이 없음)
- [ ] 아이템계를 탈출했을 때 해당 아이템의 진행 상태가 다음 진입 시에도 그대로 남아 있음 ("이 아이템의 기억"이 지속되는 경험)
- [ ] 로드 후 플레이어 스탯(ATK, HP)이 세이브 시점과 동일함

---

*소스 참조: `game/src/utils/SaveManager.ts`, `game/src/items/ItemInstance.ts`*
