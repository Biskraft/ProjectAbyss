# System_World_Interactables.md — 월드 상호작용 오브젝트 시스템

> **작성 기준:** 코드 역기획서 (Code-First Reverse GDD)
> **소스 파일:** `game/src/entities/Anvil.ts`, `game/src/entities/Altar.ts`, `game/src/entities/Portal.ts`, `game/src/entities/Switch.ts`, `game/src/entities/LockedDoor.ts`
> **필수 참고:** `Documents/Terms/Project_Vision_Abyss.md`, `Documents/Terms/GDD_Writing_Rules.md`

---

## 1. 개요

월드와 아이템계 내 배치되는 5종의 상호작용 가능 오브젝트를 정의한다. 모루(Anvil)는 아이템계 진입의 핵심 의식이며, 제단(Altar)은 몬스터 드롭 포탈의 컨텍스트를 제공한다. 포탈(Portal)은 레어리티별 시각 언어로 아이템계 진입구를 표현한다. 스위치(Switch)와 잠긴 문(LockedDoor)은 공간 탐험의 퍼즐 요소를 담당한다. 모든 오브젝트는 LDtk 엔티티로 배치되며, 충돌 그리드와 직접 연동된다.

---

## 2. 설계 의도 (Design Intent)

**핵심 판타지:** "아이템에 들어가면, 그 아이템의 기억이 던전이 된다" — 모루를 통한 아이템계 진입은 ECHORIS의 스파이크 경험이다. 이 순간이 단순한 메뉴 전환이 아니라 의식(ritual)처럼 느껴져야 한다.

**MDA 설계 목표:**
- **Aesthetic (Anvil):** Fantasy(장인이 무기를 두드리는 의식) + Sensation(에코 타격 → FloorCollapse 연출)
- **Aesthetic (Portal):** Discovery(레어리티별 다른 비주얼로 아이템 가치 체감)
- **Aesthetic (LockedDoor/Switch):** Challenge(퍼즐 해결) + Expression(능력/스탯으로 장벽 돌파)

**SDT 검증:**
- Autonomy: 제단 포탈(랜덤 레어리티)과 모루 포탈(선택한 아이템) 두 가지 진입 방식 제공
- Competence: 스탯 게이트 LockedDoor는 성장이 가시화된 숙련도 표시계
- Relatedness: 모루 타격 순간의 연출이 "나만의 아이템을 강화한다"는 정체성 강화

---

## 3. 상세 규칙 (Detailed Rules)

### 3.1 Anvil (모루)

**LDtk 엔티티:** Anvil (32x16 고정 크기, pivot 하단 중앙)

> **UI/UX 연출 마스터 스펙:** `Documents/UI/UI_SacredPickup.md`
> 앵빌 전체 UX 흐름(앵빌 도달 → 대장간 UI → DIVE/BACK → 다이브 연출)은 Sacred Pickup 체계의 일부로 관리되며, 1회성(T5 풀 프리뷰 / T6 Return 아이콘) 과 다회성(S5 [E] 프롬프트 / S6 그리드 UI / S7 단축 연출)이 분리되어 있다. 본 섹션은 엔티티/AABB/충돌 측면의 계약만 정의한다.

**상호작용 흐름 (엔티티 계약):**
```
1. 플레이어 근접 → overlaps() = true
2. Anvil.setShowHint(true) → [E] 심볼 프롬프트 표시 (S5, 텍스트 "UP: Place weapon" 폐기)
3. [E] 키 누름 → InventoryUI.openForAnvil(onSelect) 호출
   (기존 drawItemSelectUI 텍스트 리스트는 폐기. 인벤토리 그리드 UI와 단일화)
4. 플레이어 그리드에서 아이템 선택 + [E] 확인:
   - firstDiveDone === false → T5 풀 프리뷰 패널 표시 (층수/적 레벨/리워드)
   - firstDiveDone === true  → S6 요약 프리뷰 (1줄) 표시
5. 프리뷰에서 [E] DIVE 확인 → placeItem(item) + 다이브 연출 트리거
   ([ESC] BACK 시 그리드로 복귀)
6. 다이브 연출(S7): diveCount[itemDefId] 기준 풀/단축/초단축 분기
7. scene: FloorCollapse + MemoryDive 시퀀스 시작
8. used = true → 재사용 불가 (씬 레벨에서 보장)
```

**장착 해제 요구사항:** 장착 중인 아이템은 DIVE 선택 불가. 그리드 내에서 장착 중 아이템 선택 시 프롬프트에 "Unequip first"가 표시된다. 근거: `Documents/System/System_ItemWorld_Core.md §2.1` — 디스가이아 원본 규칙 준수 ("무기를 가지고 그 무기의 안으로 들어갈 수 없다").

**AABB 구조:**
```
overlaps() — 근접 감지용 (상호작용 범위)
  x: center - 16, y: top - 16, w: 32, h: 20

getHitAABB() — 공격 히트 감지용
  x: center - 16, y: top - 20, w: 32, h: 20
```

**시각 연출:**
- 모루 몸체: 청회색 계열 3단 구조 (상판 + 기둥 + 받침)
- 글로우 펄스: `alpha = 0.9 + sin(t * 2) * 0.1` (1초 주기)
- 아이템 배치 후 itemGfx 글로우: `alpha = 0.8 + sin(t * 4) * 0.2` (0.5초 주기)
- [E] 심볼 프롬프트 맥동: Sacred Pickup §3.7 기준 (레어리티 색상 동기화 포함. 기존 hintText 펄스는 제거)
- Tether 수렴 이펙트(1회성): firstPickupDone === false 인 첫 획득 이후 이 앵빌에 Tether 가 수렴할 때 0.2초 섬광. 자세한 수식은 UI_SacredPickup §3.6 참조

**상태:**
- `item = null`: 빈 모루 (무기 배치 대기)
- `item != null`: 무기 배치됨 (타격 대기)
- `used = true`: 아이템계 진입 완료 (재사용 불가)

### 3.2 Altar (제단)

**LDtk 엔티티:** Altar (24x20 고정 크기, pivot 하단 중앙)

**상호작용 흐름:**
```
1. 플레이어 근접 → overlaps() = true
2. setShowHint(true) → "UP: Offer" 힌트 텍스트 표시
3. [UP 키] 누름 → scene이 처리:
   a. 랜덤 레어리티 결정 (롤 로직은 씬 담당)
   b. Portal 엔티티 생성 (sourceType = 'altar')
   c. altar.used = true → 재사용 불가
4. 생성된 Portal 통해 해당 레어리티 아이템계 진입
```

**비주얼:**
- 베이스 플랫폼 (파랑-회색) + 기둥 + 상단 발광 오브 (흰색 코어, 파랑 헤일로)
- 발광 펄스: `alpha = 0.9 + sin(t * 2) * 0.1`

**설계 의도:** 제단은 "아이템 없이도 아이템계에 진입할 수 있는" 접근성 경로. 레어리티는 보장되지 않으므로 모루보다 위험하지만 진입 장벽이 낮다.

### 3.3 Portal (포탈)

**생성 방식:**
- `sourceType = 'monster'`: 보스 처치 시 드롭 (몬스터 위치에 생성)
- `sourceType = 'altar'`: 제단 상호작용 시 생성

**레어리티별 시각 파라미터:**

| 레어리티 | 색상 | 크기(px) | 파티클 수 | 펄스 속도 | 스폰 히트스탑(프레임) | 스폰 쉐이크(px) |
|---------|------|----------|---------|---------|-------------------|--------------|
| normal | #ffffff | 20 | 5 | 1.5 | 0 | 1 |
| magic | #6969ff | 24 | 8 | 2.0 | 3 | 2 |
| rare | #ffff00 | 28 | 12 | 2.5 | 6 | 3 |
| legendary | #ff8000 | 32 | 16 | 3.0 | 9 | 5 |
| ancient | #00ff00 | 36 | 24 | 4.0 | 12 | 8 |

**포탈 비주얼 구조:**
```
타원 구성 (매 프레임 재렌더):
  1. 검은 외곽선 타원 (size/2+2 × size/1.4+2) — 대비 강조
  2. 레어리티 색상 타원 (size/2 × size/1.4), alpha 0.7
  3. 흰색 내부 코어 (size/4 × size/2.8), alpha 0.3

펄스 수식:
  pulse = 1 + sin(t * pulseSpeed * PI * 2) * 0.15
  size = baseSize * pulse
```

**파티클:**
- 레어리티 색상의 1-3px 사각형
- 포탈 가장자리에서 스폰, 위로 부유 (vy = -(speed * 0.5-1.0))
- 생존 시간: 600-1400ms

**상호작용:**
- 플레이어가 포탈 AABB와 겹침 → setShowHint(true) → "UP: Enter"
- [UP 키] → PortalTransition 시퀀스 시작 → 아이템계 씬 전환

**info 텍스트 (PortalTransition 중):**
```
sourceType = 'monster': "??? [RARITY]"
sourceType = 'altar' + sourceItem: "ItemName LvN [RARITY]"
sourceType = 'altar' + no item: "[RARITY]"
```

### 3.4 Switch (스위치)

**LDtk 엔티티:** Switch (리사이즈 가능, pivot 하단 중앙)
**LDtk 필드:** `targetDoor (EntityRef)` — 연결된 LockedDoor의 IID

**상호작용 흐름:**
```
1. 플레이어 공격 hitbox가 getHitAABB()와 겹침
2. activate(grid) 호출:
   - activated = true
   - container.visible = false
   - gridCells 전체 → 0 (충돌 제거)
3. 씬에서 targetDoorIid로 LockedDoor 조회
4. 해당 LockedDoor.unlock(grid) 호출 → 문 개방
```

**충돌 주입:** 생성 시 `injectCollision(grid)` — 점유 타일 전체 = 1 (솔리드)

**비주얼:**
- 갈색 블록 (`#996633`), 테두리 `#664422`
- 주황 균열선 2개 (`#ffaa44`) — "공격으로 파괴 가능" 힌트
- pivot은 하단 중앙 — LDtk 배치 시 `x - width/2`로 보정

**특이사항:**
- Switch 자체는 솔리드 장애물 — 공격 전까지 통로 차단 역할
- activate() 중복 호출 방지: `activated === true`이면 false 반환

### 3.5 LockedDoor (잠긴 문)

**LDtk 엔티티:** LockedDoor (리사이즈 가능, pivot 좌하단)
**LDtk 필드:**

| 필드 | 타입 | 용도 |
|------|------|------|
| iid | String | 엔티티 고유 ID (Switch 참조용) |
| UnlockCondition | Enum | 'event' / 'switch' / 'stat' |
| UnlockEvent | String | event 타입일 때 이벤트 이름 |
| StatType | String | stat 타입일 때 스탯 이름 (예: 'atk') |
| StatThreshold | Int | stat 타입일 때 요구 수치 |

**3가지 잠금 타입:**

| 타입 | 해제 조건 | 공격 반응 |
|------|----------|---------|
| **event** | 씬 이벤트 발생 시 `unlockDoors(eventName)` 호출 | 무반응 |
| **switch** | 연결된 Switch 파괴 시 `unlock(grid)` 호출 | 무반응 |
| **stat** | 플레이어 atk/int가 임계값 이상이고 공격 시 | 조건 충족: 개방 / 미충족: 거부 애니메이션 |

**stat 문 공격 처리 (`tryAttackUnlock`):**
```
조건 충족 (playerStats[statType] >= statThreshold):
  → unlock(grid): locked = false, 비가시, 충돌 제거
  → 반환값: 'unlocked'

조건 미충족:
  → reject(): rejectTimer = 400ms
    - 좌우 ±3px 쉐이크 (sin 기반)
    - 빨간 라벨 깜빡임 (#ff0000 ↔ #ff4444)
  → 반환값: 'rejected'
```

**비주얼 차별화:**
```
unlockCondition === 'stat': 색상 #994422 (붉은 갈색) + 균열선 + 스탯 요구치 레이블
unlockCondition === 'switch': 색상 #8b4513 + 균열선
unlockCondition === 'event': 색상 #8b4513 (균열 없음 — 직접 파괴 불가)
```

**stat 레이블:** `"ATK 40"` 형식으로 문 중앙에 표시 (빨간색, monospace 8px)

---

## 4. 공식 (Formulas)

### 포탈 펄스 크기

```
pulse = 1 + sin(elapsedMs / 1000 * pulseSpeed * PI * 2) * 0.15
renderSize = baseSize * pulse
```

예시 (legendary, t=1s): pulse = 1 + sin(3.0 * PI * 2) * 0.15 = 1.0 (최소)

### LockedDoor 거부 쉐이크

```
rejectShakeOffset = sin(rejectTimer * 0.05) * 3
container.x = door.x + rejectShakeOffset
```
rejectTimer 400ms 기준: 주파수 = 0.05 rad/ms → 0.7 내외 Hz

---

## 5. 엣지 케이스 (Edge Cases)

| 상황 | 처리 방식 |
|------|----------|
| Anvil.used = true 후 재공격 | used 체크 없음 — 씬에서 used 상태 확인 후 트리거 방지 필요 |
| Anvil에 아이템 없이 공격 | `hasItem() = false` → 씬에서 FloorCollapse 미실행 |
| 동일 Altar 중복 상호작용 | `used = true` 플래그로 포탈 재생성 방지 (씬 담당) |
| Portal sourceItem이 없는 altar 진입 | info 텍스트 "[RARITY]"만 표시 |
| Switch targetDoorIid에 해당하는 문 없음 | 씬에서 찾기 실패 — unlock 호출 없이 스위치만 파괴됨 |
| LockedDoor unlock() 후 재잠금 | `locked = false` 영구 — 재잠금 메커니즘 없음 |
| stat 문 공격 시 playerStats에 해당 statType 없음 | `playerStats[statType] ?? 0` → 0 < threshold → 항상 거부 |
| switch 타입 LockedDoor를 직접 공격 | `tryAttackUnlock` 반환값 'ignored' — 씬에서 무시 |
| 타일 그리드 범위 외 LockedDoor 좌표 | bounds check로 안전하게 처리 |
| Portal 파티클이 particleCount에 미달인 채로 update | `while (particles.length < particleCount)` 루프로 보충 |

---

## 6. 의존성 (Dependencies)

| 방향 | 시스템 | 계약 |
|------|--------|------|
| 읽음 | `ItemInstance` | 레어리티, 이름, 레벨, UID |
| 읽음 | `RARITY_COLOR` | 레어리티 → 색상 매핑 |
| 읽음 | 타일 그리드 (`number[][]`) | 솔리드/공기 타일 |
| 쓰기 | 타일 그리드 | Switch/LockedDoor 충돌 제거 |
| 제공 | `overlaps()` | 씬에서 플레이어 근접 감지 |
| 제공 | `getHitAABB()` | 씬에서 공격 히트 감지 |
| 트리거됨 | `FloorCollapse` | Anvil + 타격 시 씬에서 시작 |
| 트리거됨 | `MemoryDive` | Anvil + 타격 시 씬에서 시작 |
| 트리거됨 | `PortalTransition` | Portal 진입 시 씬에서 시작 |
| 읽음 | LDtk 엔티티 IID | Switch.targetDoorIid → LockedDoor 조회 |

---

## 7. 튜닝 노브 (Tuning Knobs)

| 노브 | 위치 | 범위 | 카테고리 | 기본값 | 설명 |
|------|------|------|----------|--------|------|
| Portal baseSize (레어리티별) | `Portal.ts:15-21` | 16-48px | Feel | 20-36px | 포탈 기본 크기 |
| PULSE_SPEED (레어리티별) | `Portal.ts:31-37` | 1.0-6.0 | Feel | 1.5-4.0 | 포탈 박동 속도 |
| SPAWN_HITSTOP (레어리티별) | `Portal.ts:39-45` | 0-20 프레임 | Feel | 0-12 | 포탈 생성 시 히트스탑 |
| SPAWN_SHAKE (레어리티별) | `Portal.ts:47-53` | 1-15px | Feel | 1-8px | 포탈 생성 시 쉐이크 강도 |
| rejectTimer | `LockedDoor.ts:174` | 200-600ms | Feel | 400ms | stat 문 거부 애니메이션 시간 |
| Anvil.used 재사용 방지 | `Anvil.ts:25` | bool | Gate | true | 아이템계 중복 진입 방지 |

---

## 8. 검증 체크리스트 (Acceptance Criteria)

**기능 검증:**
- [ ] Anvil에 아이템 배치 후 공격 시 FloorCollapse가 시작됨
- [ ] Anvil.used = true 후 재사용 불가 (씬 레벨에서 방지)
- [ ] Altar 사용 후 used = true, 포탈 1개 생성
- [ ] 레어리티별 Portal 색상/크기가 명세와 일치함
- [ ] Switch 공격 시 충돌 제거 + 연결 LockedDoor 개방
- [ ] stat 문: playerATK >= threshold 시 개방, 미만 시 거부 애니메이션
- [ ] event 문: unlockDoors(eventName) 호출 시 정확히 해당 문만 개방
- [ ] switch 문: 직접 공격 시 'ignored' 반환

**경험 검증:**
- [ ] Anvil 타격 + FloorCollapse 연출이 "의식(ritual)"처럼 느껴짐
- [ ] ancient 포탈이 normal 포탈보다 시각적으로 훨씬 화려하고 중요한 느낌을 줌
- [ ] stat 문의 거부 애니메이션(붉은 쉐이크)이 "아직 부족하다"는 메시지를 명확히 전달
- [ ] Switch 파괴 → 문 개방의 인과관계가 직관적으로 연결됨

---

## 구현 현황

| 기능 | 상태 | 비고 |
|------|------|------|
| Anvil 상호작용 흐름 (배치→타격) | 구현 완료 | |
| Anvil 힌트 텍스트 동적 변경 | 구현 완료 | "UP: Place weapon" → "ATK: Strike!" |
| Altar overlaps + used 플래그 | 구현 완료 | 포탈 생성 로직은 씬 담당 |
| Portal 레어리티별 비주얼 | 구현 완료 | 5등급 전체 |
| Portal 파티클 시스템 | 구현 완료 | |
| Portal PortalTransition info 텍스트 | 구현 완료 | |
| Switch 공격 파괴 + 충돌 제거 | 구현 완료 | |
| LockedDoor 3타입 분기 | 구현 완료 | |
| LockedDoor stat 거부 애니메이션 | 구현 완료 | 400ms 쉐이크 + 라벨 깜빡임 |
| Anvil.used 씬 레벨 재사용 방지 | 미확인 | 씬 코드 검토 필요 |
