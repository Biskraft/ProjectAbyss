# System_Effects_Transitions.md — 이펙트 및 씬 전환 시스템

> **작성 기준:** 코드 역기획서 (Code-First Reverse GDD)
> **소스 파일:** `game/src/effects/MemoryDive.ts`, `game/src/effects/PortalTransition.ts`, `game/src/effects/FloorCollapse.ts`, `game/src/effects/ScreenFlash.ts`, `game/src/effects/HitSpark.ts`
> **필수 참고:** `Documents/Terms/Project_Vision_Abyss.md`, `Documents/Terms/GDD_Writing_Rules.md`

---

## 1. 개요

플레이어 행동과 씬 전환에 수반되는 5종의 시각 이펙트 시스템을 정의한다. MemoryDive(3초 아이템계 진입 의식), PortalTransition(1.8초 포탈 진입), FloorCollapse(3.4초 바닥 붕괴)는 씬 전환을 동반하는 시퀀스 이펙트다. ScreenFlash와 HitSpark는 전투 피드백 이펙트다. 모든 이펙트는 사쿠라이 마사히로의 충격 표현 원칙(어두운 윤곽 + 밝은 코어, 히트스탑, 수렴하는 카메라 쉐이크)을 기반으로 설계되었다.

---

## 2. 설계 의도 (Design Intent)

**핵심 판타지:**
- MemoryDive: "무기의 기억 속으로 흡수되는" 감각 — 아이템계 진입이 게임 스파이크의 핵심 순간
- FloorCollapse: "바닥이 무너지며 심연이 열린다" — 첫 번째 아이템계 진입 경험
- HitSpark/ScreenFlash: 단조(鍛造)의 타격감 — 무거운 금속을 두드리는 임팩트

**MDA 설계 목표:**
- **Aesthetic:** Sensation(충격감, 몰입감) + Fantasy(기억의 세계로 빨려 들어가는 환상)
- **Dynamic:** 이펙트 강도가 레어리티를 시각적으로 계층화
- **Mechanic:** 콜백 패턴(onShake, onHitstop, onScreenFlash)으로 이펙트와 씬 로직 분리

**디자인 원칙 (사쿠라이 참조):**
- 밝은 플래시와 어두운 프레임을 교차 — 빛/어둠 대비로 임팩트 강조
- 쉐이크 진폭은 피크 후 점진적 수렴 (갑자기 끊기지 않음)
- 히트스탑: 레어리티/공격 강도에 비례 (ancient = 12프레임, normal 공격 = 없음)

---

## 3. 상세 규칙 (Detailed Rules)

### 3.1 MemoryDive (메모리 다이브)

**총 지속시간:** ~2500ms (2.5초) + 씬 전환

**5단계 시퀀스:**

```
Phase 0: ritual     0 ~ 400ms
Phase 1: dissolve   400 ~ 1200ms  (내부 timer 0~800ms)
Phase 2: absorb     1200 ~ 2000ms (내부 timer 0~800ms)
Phase 3: flash      2000 ~ 2500ms (내부 timer 0~500ms)
Phase 4: done       → shouldTransition = true → 씬 전환
```

**각 단계 상세:**

**Phase 0 — ritual (0~400ms):**
```
- start() 호출 시 즉시: onHitstop(8프레임), onScreenFlash(rarityColor, 0.5)
- 쇼크웨이브 링: 무기 위치에서 반경 0→120px 확장
  stroke: 레어리티 색상, 두께 3→1px, alpha 1→0
- 레어리티 색상 파티클: 40% 확률로 매 프레임 스폰, 무기 위치에서 방사 (speed 80)
- 카메라 쉐이크: intensity = 2 * progress (최대 2px)
```

**Phase 1 — dissolve (400~1200ms, 내부 0~800ms):**
```
- 균열선 8개: 무기 중심에서 방사, 길이 0→200px
  rotation += progress * 0.3 rad (천천히 회전)
  alpha: 0.8 → 0.5 (서서히 사라짐)
- 검정 오버레이: alpha 0→0.5 (세계 탈색)
- 파티클: 30% 확률, 무기 주변 ±100px 무작위 위치, speed 60
- 카메라 쉐이크: intensity = 3 * progress (최대 3px)
```

**Phase 2 — absorb (1200~2000ms, 내부 0~800ms):**
```
- 검정 오버레이: alpha 0.5 → 0.9
- 포탈 원형 홀: 무기 중심, 반경 = progress² * 200 (가속 성장)
  오버레이에 cut() → 구멍이 뚫리는 효과
  레어리티 색상 반투명 충전: alpha 0.25 → 0.40
- 포탈 림 글로우: 레어리티 색상 링, 두께 2→5px
  내부 흰색 링 (alpha 0.3 → 0, 점차 소멸)
- 수렴 와선 12개: 바깥 반경 → 포탈 안쪽으로 나선형
  회전 속도 가속: timer * 0.004 * (1 + progress)
- 수렴 파티클: 50% 확률, 무기 주변 100~200px에서 스폰, 중심으로 이동
- phase 종료 시: onScreenFlash(rarityColor, 0.8), onHitstop(6프레임)
- 카메라 쉐이크: intensity = 5 * progress (최대 5px)
```

**Phase 3 — flash (2000~2500ms, 내부 0~500ms):**
```
- 전면 채우기 오버레이:
  progress < 0.3: 레어리티 색상, alpha (1 - progress/0.3) * 0.8 (빠른 소멸)
  progress >= 0.3: 검정, alpha min(1, (progress - 0.3) / 0.7) (점진 암전)
- 씬 전환 준비
```

**콜백 인터페이스:**
```
onShake: (intensity: number) => void
onHitstop: (frames: number) => void
onScreenFlash: (color: number, intensity: number) => void
```

### 3.2 PortalTransition (포탈 전환)

**총 지속시간:** 1800ms (1.8초)

**5단계 시퀀스:**

| 단계 | 시간 범위 | 내용 |
|------|---------|------|
| Phase 1: Flash | 0~100ms | 흰색/검정 교차 플래시 (33ms 주기) |
| Phase 2: Pulse | 100~400ms | 포탈 확장 + 카메라 쉐이크 감쇠 |
| Phase 3: Absorb | 400~900ms | 포탈이 화면 중앙으로 이동하며 성장 |
| Phase 4: Text | 900~1300ms | 아이템 정보 텍스트 페이드 인 |
| Phase 5: Fill | 1300~1800ms | 레어리티 색상으로 화면 채움 |

**레어리티별 쉐이크 강도:**
```
normal: 2px, magic: 3px, rare: 5px, legendary: 8px, ancient: 12px
```

**Phase 1 — Flash 상세:**
```
frame = floor(timer / 33)
짝수 프레임: 흰색 오버레이 alpha 0.8
홀수 프레임: 검정 오버레이 alpha 0.5
히트스탑: ancient=6, legendary=4, 기타=2프레임 (timer < 20ms에서 1회)
```

**Phase 2 — Pulse 상세:**
```
쉐이크: shakeIntensity * (1 - progress * 0.3) (0% 감쇠 시작)
포탈 크기: 20 → 50px (화면 좌표 기준)
```

**Phase 3 — Absorb 상세:**
```
포탈 중심 이동: portalScreenPos → 화면 중앙 (선형 보간)
포탈 크기: 50 → 130px (130% 과장 — 사쿠라이 원칙)
쉐이크 강화: shakeIntensity * (0.7 + progress * 0.3)
```

**Phase 4 — Text 상세:**
```
infoText.alpha = min(1, progress * 2) (빠른 페이드 인)
포탈 고정 크기: 130 → 150px
쉐이크: shakeIntensity * (1 - progress * 0.5)
```

**Phase 5 — Fill 상세:**
```
fillOverlay.alpha = progress (선형 증가)
infoText.alpha = 1 - max(0, (progress - 0.5) * 2) (후반부 페이드 아웃)
쉐이크: shakeIntensity * (1 - progress) (수렴하여 0 도달)
```

### 3.3 FloorCollapse (바닥 붕괴)

**총 지속시간:** 3400ms

**8단계 시퀀스:**

| 단계 | 시간 범위 | 주요 처리 |
|------|---------|---------|
| impact | 0~100ms | 히트스탑 8프레임 + 흰색 플래시 0.6 |
| rumble | 100~500ms | 균열 확산 (progress 0→1) + 쉐이크 30% |
| warning | 500~800ms | 균열 깜빡임 + 빨간 타일 틴트 + 쉐이크 30→70% |
| collapse_outer | 800~1200ms | 외곽 링부터 타일 붕괴 (RING_DELAY 60ms 간격) |
| collapse_inner | 1200~1600ms | 내부 링 붕괴 + 먼지 파티클 상승 + 쉐이크 피크 |
| anvil_fall | 1600~2800ms | 플레이어 낙하 + 쉐이크 소멸 |
| fade_out | 2800~3400ms | 검정 페이드 아웃 |
| done | - | shouldTransition = true |

**레어리티별 붕괴 반경 (X축):**
```
normal: 3타일, magic: 4타일, rare: 5타일, legendary: 6타일, ancient: 12타일
```

**레어리티별 쉐이크 강도:**
```
normal: 2px, magic: 3px, rare: 4px, legendary: 6px, ancient: 10px
```

**링 붕괴 알고리즘 (collapseRing):**
```
Chebyshev 거리 기반 링 순서로 외곽→내부 순차 붕괴
|dx| 또는 |dy| === ring인 타일만 처리 (정확히 해당 링 레이어만)
isPreserved() — 앤빌 주변 2x2 타일은 phase 7까지 보존
preserved 타일은 collapse_inner 종료 시 collapsePreservedTiles() 호출
```

**보존 타일 범위:**
```
col: [anvilCol-1, anvilCol]
row: [anvilRow, anvilRow+1]
```

**데브리(파편) 물리:**
```
스폰: 각 타일 붕괴마다 2~4개
초기 속도: vx = ±40px/s, vy = -(50~130)px/s (위로 튀어오름)
중력: +400 px/s² (적용됨)
수명: 800~1200ms
alpha: life / 800 (선형 감쇠)
```

**먼지 파티클 (collapse_inner 중):**
```
30% 확률로 매 프레임 스폰
위치: (anvilCol ± radiusX/2) * TILE_SIZE
속도: vx = ±10px/s, vy = -(30~70)px/s (위로 상승)
중력 없음 (데브리와 다름)
```

### 3.4 ScreenFlash (화면 플래시)

**용도:**
- `flashHit(heavy)`: 플레이어의 강한 공격이 적중 시 (흰색)
- `flashDamage(heavy)`: 플레이어가 데미지를 받을 때 (빨간색)

**파라미터:**

| 메서드 | 색상 | 강도(alpha) | 지속시간 |
|--------|------|------------|---------|
| `flashHit(false)` | #ffffff | 0.15 | 60ms |
| `flashHit(true)` | #ffffff | 0.35 | 100ms |
| `flashDamage(false)` | #ff0000 | 0.20 | 80ms |
| `flashDamage(true)` | #ff0000 | 0.40 | 150ms |

**페이드 아웃 방식:**
```
매 프레임: overlay.alpha *= (timer / duration)  // 지수적 감쇠
timer <= 0: overlay.alpha = 0
```

**최대 alpha 클램프:**
```
overlay.alpha = min(0.6, intensity)  // 0.6 하드 상한
```

**외부 호출:**
```
flash(color, intensity, durationMs):  // 임의 색상/강도/시간
```

### 3.5 HitSpark (히트 스파크)

**용도:** 적에게 피격 시 히트 포인트에서 발생하는 불꽃 이펙트

**파라미터:**
- `heavy = false`: 일반 공격 (1~3콤보)
- `heavy = true`: 강공격 (3타 또는 크리티컬)

**생성 구조:**

**중심 플래시 (항상 생성 1개):**
```
원형 그래픽
heavy=false: 반경 8px
heavy=true:  반경 12px
색상: 흰색 외곽 + 노란색 코어 (#ffffaa)
수명: SPARK_LIFE * 0.5 = 90ms
```

**라인 스파크:**
```
heavy=false: 4개 (SPARK_COUNT_LIGHT)
heavy=true:  7개 (SPARK_COUNT_HEAVY)

각 스파크:
  각도 = (i / count) * 2π + 노이즈 ±0.8rad
  속도 = SPARK_SPEED * speedMult * 0.6~1.4 (= 108~252 / 151~353 px/s)
  knockback 방향 바이어스: angle += dirX * 0.4

시각 구조 (사쿠라이 원칙):
  검정 외곽선: 두께 3px, 길이 size * 1.5 (heavy: 9px / normal: 6px)
  밝은 코어: heavy=#ffff44, normal=#ffffff, 두께 1.5px, 길이 size (heavy: 6px / normal: 4px)
```

**파티클 물리:**
```
매 프레임:
  vx *= 0.92, vy *= 0.92  (감속)
  x += vx * dtSec, y += vy * dtSec
  alpha = life / maxLife (선형 감쇠)
  scale = 0.5 + (life / maxLife) * 0.5 (수축)
수명: SPARK_LIFE * 0.7~1.6 = 126~288ms
```

---

## 4. 공식 (Formulas)

### MemoryDive 포탈 반경 (Phase 2)

```
portalRadius = progress² * 200  [px]
progress = elapsed / 800
```

예시: 400ms 경과 → progress = 0.5 → radius = 0.25 * 200 = 50px

### FloorCollapse 데브리 α

```
alpha = max(0, debrisLife / 800)
```

### ScreenFlash 지수적 감쇠

```
alpha(t) = initialAlpha * (t / duration)^k   (k ≈ 1, 근사적으로 지수)
실제 코드: alpha *= (timer / duration)  [매 프레임]
```

### HitSpark 속도

```
speedBase = 180 px/s
speedMultHeavy = 1.4
velocityRange = [0.6, 1.4]
lightRange: 108~252 px/s
heavyRange: 151~353 px/s
```

---

## 5. 엣지 케이스 (Edge Cases)

| 상황 | 처리 방식 |
|------|----------|
| MemoryDive.start() 전 update() 호출 | phase = 'idle' → 즉시 반환 |
| MemoryDive phase = 'done' 후 update() | 즉시 반환 (shouldTransition = true 유지) |
| FloorCollapse anvil이 타일 그리드 경계에 있는 경우 | collapseRing의 bounds check로 안전 처리 |
| FloorCollapse collapse 중 씬 전환 강제 호출 | isDone이 true가 아니면 씬 전환 불가 (guard 필요) |
| PortalTransition timer가 TOTAL_DURATION 초과 | done = true + fillOverlay.alpha = 1 강제 설정 |
| ScreenFlash 중 새 flash 호출 | timer/duration 재설정 — 이전 플래시 덮어씀 |
| ScreenFlash intensity > 0.6 입력 | min(0.6, intensity) 클램프 |
| HitSpark spawn 위치가 화면 밖 | 파티클이 화면 밖으로 이동 후 수명 만료 — 문제없음 |
| HitSpark dirX가 0이 아닌 경우 | biasAngle = angle + dirX * 0.4 — 넉백 방향으로 파티클 편향 |
| FloorCollapse onTilesRemoved 콜백 없음 (null) | ?. 연산자로 안전 호출 |
| MemoryDive 파티클 수 제한 없음 | dissolve 단계에서 매 프레임 확률 생성 — 800ms × 60fps × 30% = ~14개 |

---

## 6. 의존성 (Dependencies)

| 방향 | 시스템 | 계약 |
|------|--------|------|
| 읽음 | `ItemInstance.rarity` | 이펙트 강도 결정 (RARITY_COLOR 포함) |
| 읽음 | `GAME_WIDTH, GAME_HEIGHT` | 전면 오버레이 크기 |
| 쓰기 | 타일 그리드 (`number[][]`) | FloorCollapse에서 타일 0으로 수정 |
| 콜백 제공 | `onShake(intensity)` | 씬에서 카메라 쉐이크 적용 |
| 콜백 제공 | `onHitstop(frames)` | 씬에서 게임 루프 일시 정지 |
| 콜백 제공 | `onScreenFlash(color, intensity)` | 씬의 ScreenFlash.flash() 호출 |
| 콜백 제공 | `onTilesRemoved()` | FloorCollapse에서 타일 뷰 갱신 요청 |
| 제공 | `isDone`, `shouldTransition` | 씬에서 전환 타이밍 감지 |
| 호출됨 | 씬의 update 루프 | 매 프레임 `effect.update(dt)` 필요 |

---

## 7. 튜닝 노브 (Tuning Knobs)

| 노브 | 위치 | 범위 | 카테고리 | 기본값 | 설명 |
|------|------|------|----------|--------|------|
| T_RITUAL | `MemoryDive.ts:22` | 200~600ms | Feel | 400ms | ritual 단계 지속 시간 |
| T_DISSOLVE | `MemoryDive.ts:23` | 400~1200ms | Feel | 800ms | dissolve 단계 지속 시간 |
| T_ABSORB | `MemoryDive.ts:24` | 400~1200ms | Feel | 800ms | absorb 단계 지속 시간 |
| T_FLASH | `MemoryDive.ts:25` | 200~800ms | Feel | 500ms | flash 단계 지속 시간 |
| TOTAL_DURATION (PortalTransition) | `PortalTransition.ts:19` | 1000~3000ms | Feel | 1800ms | 포탈 전환 총 길이 |
| SHAKE_INTENSITY (Portal, 레어리티별) | `PortalTransition.ts:27~34` | 1~20px | Feel | 2~12px | 레어리티별 쉐이크 강도 |
| COLLAPSE_RADIUS_X (레어리티별) | `FloorCollapse.ts:37~44` | 2~20타일 | Gate | 3~12 | 붕괴 폭 |
| RING_DELAY | `FloorCollapse.ts:34` | 30~150ms | Feel | 60ms | 링 간격 — 빠를수록 빠른 붕괴 |
| flashHit 강도/지속 | `ScreenFlash.ts:33~34` | 0.1~0.6 / 40~200ms | Feel | 0.15~0.35 / 60~100ms | 공격 플래시 강도 |
| flashDamage 강도/지속 | `ScreenFlash.ts:37~38` | 0.1~0.6 / 40~200ms | Feel | 0.2~0.4 / 80~150ms | 데미지 플래시 강도 |
| SPARK_COUNT_LIGHT/HEAVY | `HitSpark.ts:19~20` | 2~12 / 4~16 | Feel | 4 / 7 | 스파크 라인 수 |
| SPARK_SPEED | `HitSpark.ts:22` | 100~300 px/s | Feel | 180 | 스파크 초기 속도 |
| SPARK_LIFE | `HitSpark.ts:23` | 100~400ms | Feel | 180ms | 스파크 수명 |

---

## 8. 검증 체크리스트 (Acceptance Criteria)

**기능 검증:**
- [ ] MemoryDive: start() 호출 후 정확히 2500ms에 shouldTransition = true
- [ ] MemoryDive: Phase 0에서 히트스탑 8프레임 콜백 발동
- [ ] MemoryDive: Phase 2 종료 시 히트스탑 6프레임 + 레어리티 색상 플래시 발동
- [ ] PortalTransition: 1800ms에 fillOverlay.alpha = 1, isDone = true
- [ ] PortalTransition: ancient 포탈 진입 시 쉐이크 12px 발동
- [ ] FloorCollapse: normal 레어리티 반경 3타일, ancient 12타일 붕괴 확인
- [ ] FloorCollapse: 앤빌 주변 2x2 타일이 phase 7까지 보존됨
- [ ] FloorCollapse: 3400ms에 shouldTransition = true
- [ ] ScreenFlash: 최대 alpha 0.6 클램프
- [ ] ScreenFlash: flashDamage() 후 빨간 오버레이, flashHit() 후 흰색 오버레이
- [ ] HitSpark: heavy=true 시 7개 라인, heavy=false 시 4개 라인
- [ ] HitSpark: 스파크가 dirX 방향으로 편향되어 발사됨

**경험 검증:**
- [ ] MemoryDive 전체 2.5초가 "무기 속으로 빨려 들어가는" 감각을 충분히 전달함
- [ ] MemoryDive의 레어리티 색상이 진입 아이템의 가치를 시각적으로 표현함
- [ ] FloorCollapse의 경고 단계(500~800ms)가 "피해야 한다"는 긴장감을 줌
- [ ] ScreenFlash 빨간 오버레이가 데미지를 "몸으로 느끼는" 피드백을 제공함
- [ ] HitSpark의 어두운 윤곽 + 밝은 코어 구조가 "단조 타격감"을 강화함

---

## 구현 현황

| 기능 | 상태 | 비고 |
|------|------|------|
| MemoryDive 5단계 시퀀스 | 구현 완료 | FloorCollapse 대체 |
| MemoryDive 수렴 와선 (Phase 2) | 구현 완료 | 12개 스파이럴 라인 |
| PortalTransition 5단계 시퀀스 | 구현 완료 | |
| PortalTransition 레어리티별 쉐이크 강도 | 구현 완료 | |
| FloorCollapse 8단계 (pause 단계 제거됨) | 구현 완료 | 실제 단계 수 7개 |
| FloorCollapse 레어리티별 붕괴 반경 | 구현 완료 | |
| FloorCollapse 앤빌 2x2 타일 보존 | 구현 완료 | |
| ScreenFlash 흰색/빨간 히트 피드백 | 구현 완료 | |
| HitSpark 중심 플래시 + 라인 스파크 | 구현 완료 | |
| HitSpark 사쿠라이 원칙 (어둠+밝음) | 구현 완료 | 검정 3px + 밝은 1.5px |
| MemoryDive와 FloorCollapse의 사용 분기 | 확인 필요 | 씬에서 어떤 이펙트를 사용하는지 검토 필요 |
