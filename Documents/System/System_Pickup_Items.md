# System_Pickup_Items.md — 획득물 아이템 시스템

> **작성 기준:** 코드 역기획서 (Code-First Reverse GDD)
> **소스 파일:** `game/src/entities/HealingPickup.ts`, `game/src/entities/HealthShard.ts`, `game/src/entities/GoldPickup.ts`, `game/src/items/ItemDrop.ts`
> **필수 참고:** `Documents/Terms/Project_Vision_Abyss.md`, `Documents/Terms/GDD_Writing_Rules.md`

---

## 1. 개요

월드와 아이템계 전체에서 플레이어가 접촉하면 즉시 획득되는 4종의 획득물을 정의한다. HealingPickup(회복)과 HealthShard(최대 HP 증가)는 영구 배치 획득물로 1회 수집 후 재생성되지 않는다. GoldPickup(골드)도 동일하게 1회 영구 획득이다. ItemDrop(장비 드롭)만 적 처치 시 확률적으로 생성되며, 레어리티 풀 시스템과 GoldenMonster 전용 드롭 경로를 갖는다.

---

## 2. 설계 의도 (Design Intent)

**핵심 판타지:**
- HealingPickup: "위기 상황에서 발견하는 구원"
- HealthShard: "탐험의 보상 — 숨겨진 공간을 찾으면 영구적으로 강해진다" (Hollow Knight의 Mask Shard 참조)
- GoldPickup: "월드를 탐험하면 자원이 쌓인다"
- ItemDrop: "강한 적을 쓰러뜨리면 더 나은 장비가 나온다"

**MDA 설계 목표:**
- **Aesthetic (HealingPickup):** Submission(긴장 이완) — 위험 상황에서의 회복
- **Aesthetic (HealthShard):** Discovery + Achievement — 탐험 보상
- **Aesthetic (ItemDrop):** Challenge + Discovery — 강한 적 처치 후의 보상 기대감

**SDT 검증:**
- Competence: 전투 후 드롭 아이템이 성장을 눈에 보이게 확인시켜 줌
- Autonomy: HP 관리 전략 — 회복 아이템 위치를 기억하고 활용
- Relatedness: HealthShard는 "나만의 캐릭터 강화" 정체성

---

## 3. 상세 규칙 (Detailed Rules)

### 3.1 HealingPickup (회복 아이템)

**LDtk 엔티티:** `HealingPickup` (16x16 고정, pivot 좌하단)
**LDtk 필드:** `HealAmount (Int)` — 회복량 (기본값 30)

**획득 규칙:**
```
1. 플레이어 AABB와 HealingPickup AABB 겹침 감지
2. collected = false이어야 획득 가능
3. collect() 호출:
   - collected = true
   - container.visible = false
4. player.hp = min(player.maxHp, player.hp + healAmount) 적용
5. 영구 획득 — 씬 재진입 시 재생성 없음 (씬에서 저장 상태 참조)
```

**획득 수치:** 기본 30 HP (LDtk 필드로 방별 조정 가능)

**시각 효과:**
- 녹색 십자가 형상 (`#44ff44`, 흰색 중앙 코어)
- 부유 애니메이션: `y = baseY + sin(timer * 0.003) * 2` (2px 진폭, ~0.5 Hz)
- 글로우 펄스: `alpha = 0.7 + sin(timer * 0.005) * 0.3` (0→완전 불투명 사이)

**배치 컨텍스트:**
- 월드: 핸드크래프트 위치에 탐험 보상으로 배치
- 아이템계 Rest 방: `spawnEnemiesInRoom`에서 1~2개 자동 배치

### 3.2 HealthShard (HP 증가 파편)

**LDtk 엔티티:** `HealthShard` (16x16 고정, pivot 좌하단)
**LDtk 필드:** `HpBonus (Int)` — HP 증가량 (기본값 10)

**획득 규칙:**
```
1. 플레이어 AABB와 HealthShard AABB 겹침 감지
2. collected = false이어야 획득 가능
3. collect() 호출:
   - collected = true
   - container.visible = false
4. player.maxHp += hpBonus (영구 최대 HP 증가)
5. player.hp += hpBonus (현재 HP도 동일량 증가)
   (구현 확인 필요 — 코드에서 씬 담당)
6. 영구 획득 — 재생성 없음
```

**획득 수치:** 기본 +10 최대 HP (LDtk 필드로 조정 가능)

**시각 효과:**
- 분홍 다이아몬드 형상 (`#ff4488`, 흰색 내부 코어 `#ffffff` alpha 0.5)
- 부유 애니메이션: HealingPickup과 동일 패턴 (`sin(timer * 0.003) * 2`)
- 글로우 펄스: HealingPickup과 동일 패턴 (`sin(timer * 0.005) * 0.3`)

**배치 컨텍스트:** 비밀 구역, 능력 게이트 뒤 탐험 보상으로만 배치 — 월드 진행의 핵심 보상

### 3.3 GoldPickup (골드)

**LDtk 엔티티:** `GoldPickup` (16x16 고정, pivot 좌하단)
**LDtk 필드:** `Amount (Int)` — 골드 양 (기본값 10)

**획득 규칙:**
```
1. 플레이어 AABB와 GoldPickup AABB 겹침 감지
2. collected = false이어야 획득 가능
3. collect() 호출:
   - collected = true
   - container.visible = false
4. player.gold += amount (즉시 골드 추가)
5. 영구 획득 — 재생성 없음
```

**시각 효과:**
- 황금 동전 형상 (원형 `#ffd700`, 내부 `#ffee88`, 테두리 `#cc9900`)
- 부유 애니메이션: HealingPickup, HealthShard와 동일 패턴
- 글로우 펄스: 동일 패턴

### 3.4 ItemDrop (장비 드롭)

**SSoT:** `Sheets/Content_Item_DropRate.csv` (Pool, Rarity, Weight 컬럼)

**드롭 풀:**
- **normal 풀:** 일반 적 처치 시 사용
- **golden 풀:** GoldenMonster 처치 시 사용 (rare 이상 보장)

**드롭 흐름 (일반 적):**
```
rollDrop(rng):
  1. rng.next() > DROP_CHANCE(30%) → null 반환 (드롭 없음)
  2. 드롭 발생: rng.next()로 RARITY_WEIGHTS 가중치 룰렛
  3. 해당 레어리티의 SWORD_DEFS에서 아이템 정의 선택
  4. createItem(def, rarity) → ItemInstance 반환
```

**드롭 흐름 (GoldenMonster):**
```
rollGoldenDrop(rng):
  1. 항상 드롭 발생 (DROP_CHANCE 체크 없음)
  2. rng.next()로 GOLDEN_RARITY_WEIGHTS 가중치 룰렛
     (rare 미만 등급은 golden 풀에 없음)
  3. createItem(def, rarity) → ItemInstance 반환
```

**레어리티별 드롭 VFX:**

| 레어리티 | 파티클 색 | 파티클 수 | 스폰 간격 | 펄스 | 글로우 반경 |
|---------|---------|---------|---------|------|-----------|
| normal | - | - | - | 없음 | 없음 |
| magic | #6969ff | 1 | 800ms | 없음 | 없음 |
| rare | #ffff00 | 1 | 600ms | 있음 | 10px |
| legendary | #ff8000 | 2 | 400ms | 있음 | 14px |
| ancient | #00ff00 | 3 | 300ms | 있음 | 18px |

**ItemDropEntity 시각 구조:**
```
글로우 서클 (rare 이상) — 레어리티 색상, 반경별 alpha
8x8px 아이템 사각형 — 레어리티 색상 기반
  내부: 흰색 6x6px alpha 0.4 하이라이트
부유: baseY + sin(bobTimer * 1.0) * 3 (3px 진폭)
펄스 스케일: scale = 1.0 + sin(pulseTimer * pulseSpeed) * 0.15 (rare+)
```

**획득 조건:**
- `overlapsPlayer(px, py, pw, ph)`: ±6px 범위 (중심 기준)
- `collected = false`이어야 획득 가능

---

## 4. 공식 (Formulas)

### HealingPickup 실제 회복량

```
actualHeal = min(player.maxHp - player.hp, healAmount)
player.hp = min(player.maxHp, player.hp + healAmount)
```

### 부유 애니메이션 Y 좌표

```
renderY = baseY + sin(timer * 0.003) * 2  [ms 기준]
주기 = 2π / 0.003 = ~2094ms (~2.1초)
진폭 = 2px
```

### ItemDrop 가중치 룰렛

```
totalWeight = sum(w.weight)
누적합 순회 → roll < cumulative이면 해당 레어리티 선택
(pickWeightedEnemy와 동일 패턴)
```

---

## 5. 엣지 케이스 (Edge Cases)

| 상황 | 처리 방식 |
|------|----------|
| HP가 이미 최대치인데 HealingPickup 획득 | `min(maxHp, hp + heal)` → 초과 회복 없음 |
| HealingPickup collected = true 상태에서 overlap | update()에서 `if (collected) return` — 시각 업데이트만 중단, 씬에서 collect 재호출 방지 필요 |
| HealthShard 획득 후 현재 HP 반영 | 코드에서 maxHp 증가만 처리 — hp 동시 증가는 씬 담당 (확인 필요) |
| rollDrop()에서 SWORD_DEFS에 해당 레어리티 없음 | `SWORD_DEFS[0]` (첫 번째 정의) 폴백 |
| rollGoldenDrop()에서 golden 풀이 비어있는 경우 | `rarity = 'rare'` 기본값 + `SWORD_DEFS[2]` 폴백 |
| RARITY_WEIGHTS / GOLDEN_RARITY_WEIGHTS가 비어있는 경우 | normal 풀 없음 → rollDrop이 null 반환 (드롭 없음) |
| ItemDropEntity 파티클 limit 초과 | particleCount 초과 시 while 루프로 계속 생성 (count cap 없음) — 성능 주의 |
| GoldPickup amount 음수 | LDtk 필드 유효성 검사 없음 — 입력 오류 시 골드 감소 가능 |

---

## 6. 의존성 (Dependencies)

| 방향 | 시스템 | 계약 |
|------|--------|------|
| 읽음 | `Player` | AABB(px, py, pw, ph), hp, maxHp |
| 쓰기 | `Player` | hp 증가 (HealingPickup), maxHp 증가 (HealthShard), gold 증가 (GoldPickup) |
| 읽음 | `Content_Item_DropRate.csv` | Pool별 Rarity Weight 데이터 |
| 읽음 | `SWORD_DEFS` | 레어리티별 아이템 정의 |
| 읽음 | `RARITY_COLOR` | 레어리티 → 색상 매핑 |
| 읽음 | `DROP_CHANCE` | 일반 드롭 기본 확률 (30%) |
| 읽음 | `PRNG` | 결정론적 난수 (씨드 기반) |
| 호출됨 | `ItemWorldScene.spawnEnemiesInRoom` | Rest 방에서 HealingPickup 1~2개 자동 배치 |
| 제공 | `overlapsPlayer()` | ItemDropEntity 획득 범위 판정 |
| 제공 | `collected` 플래그 | 씬에서 재획득 방지 |

---

## 7. 튜닝 노브 (Tuning Knobs)

| 노브 | 위치 | 범위 | 카테고리 | 기본값 | 설명 |
|------|------|------|----------|--------|------|
| HealAmount | LDtk 필드 / `HealingPickup.ts:8` | 5~100 | Gate | 30 | 회복 HP |
| HpBonus | LDtk 필드 / `HealthShard.ts:9` | 5~50 | Curve | 10 | 최대 HP 증가량 |
| GoldAmount | LDtk 필드 / `GoldPickup.ts:8` | 1~1000 | Gate | 10 | 획득 골드량 |
| DROP_CHANCE | `rarityConfig.ts` / CSV | 0.0~1.0 | Gate | 0.30 (30%) | 일반 드롭 확률 |
| RARITY_WEIGHTS | `Content_Item_DropRate.csv` | 각 0~1 (합산 1.0) | Curve | 풀별 상이 | 레어리티별 드롭 비율 |
| 부유 진폭 | `HealingPickup.ts:53` | 0~8px | Feel | 2px | 부유 높이 |
| 부유 주기 계수 | `HealingPickup.ts:53` | 0.001~0.01 | Feel | 0.003 | 부유 속도 |
| Drop VFX particleCount | `ItemDrop.ts:72~76` | 0~10 | Feel | 1~3 | 레어리티별 파티클 수 |

---

## 8. 검증 체크리스트 (Acceptance Criteria)

**기능 검증:**
- [ ] HealingPickup 획득 시 정확히 healAmount만큼 HP 회복 (최대 HP 초과 없음)
- [ ] HealingPickup 1회 획득 후 씬 재진입 시 재생성되지 않음
- [ ] HealthShard 획득 시 maxHp가 hpBonus만큼 영구 증가
- [ ] GoldPickup 획득 시 player.gold가 amount만큼 즉시 증가
- [ ] GoldenMonster 처치 시 항상 rare 이상 아이템 드롭
- [ ] 일반 적 처치 시 30% 확률로 아이템 드롭 (100회 샘플 기준 25~35%)
- [ ] ancient 레어리티 드롭 시 글로우 반경 18px, 파티클 3개 확인

**경험 검증:**
- [ ] HealingPickup의 녹색 십자가가 "회복 아이템"임을 즉시 인식 가능
- [ ] HealthShard의 분홍 다이아몬드가 HealingPickup과 명확히 구별됨
- [ ] legendary/ancient 드롭 아이템이 글로우와 파티클로 "특별한 것"처럼 느껴짐
- [ ] Rest 방의 HealingPickup 배치가 "보상 공간"임을 전달함

---

## 구현 현황

| 기능 | 상태 | 비고 |
|------|------|------|
| HealingPickup AABB + 수집 + 시각 효과 | 구현 완료 | |
| HealingPickup 영구 수집 (저장) | 씬 담당 | 씬에서 collected 상태 persist 필요 |
| HealthShard maxHp 영구 증가 | 구현 완료 (maxHp만) | hp 동시 증가는 씬 담당 |
| GoldPickup 수집 | 구현 완료 | |
| ItemDrop CSV SSoT 드롭 풀 | 구현 완료 | |
| rollDrop() 일반 드롭 30% | 구현 완료 | |
| rollGoldenDrop() 보장 드롭 | 구현 완료 | rare 이상 보장 |
| ItemDropEntity 레어리티별 VFX | 구현 완료 | normal은 VFX 없음 |
| ItemDropEntity 파티클 상한 | 미처리 | 성능 최적화 가능 |
