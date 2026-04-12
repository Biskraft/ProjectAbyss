# System_Player_Abilities.md — 플레이어 능력 시스템

## 구현 현황 (Implementation Status)

| 능력 | 구현 상태 | 해금 조건 |
| :--- | :--- | :--- |
| 대시 (Dash) | 구현 완료 | 기본 보유 (abilities.dash = true) |
| 벽점프 / 벽슬라이드 (Wall Jump / Slide) | 구현 완료 | 렐릭 해금 필요 (abilities.wallJump) |
| 더블점프 (Double Jump) | 구현 완료 | 렐릭 해금 필요 (abilities.doubleJump) |
| 다이브 어택 (Dive Attack) | 구현 완료 | 렐릭 해금 필요 (abilities.diveAttack) |
| 역류의 쇄도 (Counter-Current Surge) | 구현 완료 | 렐릭 해금 필요 (abilities.surge) |
| 수중 호흡 (Water Breathing) | 구현 완료 | 렐릭 해금 필요 (abilities.waterBreathing) |
| 산소 소진 시 익사 처리 | 구현 완료 | - |
| 벽슬라이드 중 더블점프 리셋 | 구현 완료 | - |
| 대시로 3타 끝 딜레이 취소 | 구현 완료 | - |
| 무적 프레임 (대시 중) | 미구현 (dash 상태에서 invincible 미설정) |
| 서지 차징 중 X키 취소 | 미구현 |

---

## 0. 필수 참고 자료 (Mandatory References)

- Project Vision: `Documents/Terms/Project_Vision_Abyss.md`
- Writing Standards: `Documents/Terms/GDD_Writing_Rules.md`
- 플레이어 소스: `game/src/entities/Player.ts`
- 콤보 데이터: `game/src/combat/CombatData.ts`
- 3C 시스템 문서: `Documents/System/System_3C_Character.md`

---

## 1. 개요 (Overview)

플레이어 능력 시스템은 탐험 게이트를 해금하는 메트로베니아 능력(벽점프, 더블점프, 수중호흡)과 전투를 강화하는 공격 능력(다이브 어택, 역류의 쇄도)으로 구성된다. 모든 능력은 월드에서 렐릭을 획득함으로써 순차적으로 해금되며, 세이브 데이터에 boolean 플래그로 저장된다. FSM(유한 상태 기계)을 통해 각 능력의 상태 전이를 관리한다.

---

## 2. 설계 의도 (Design Intent)

- **능력 게이트 (Ability Gate):** 각 능력은 단순한 파워업이 아니라 접근 불가능했던 공간을 열어주는 열쇠다. 벽점프는 수직 샤프트 진입, 더블점프는 큰 간격의 플랫폼, 수중호흡은 수중 구역의 게이트 역할을 한다. 탐험가 판타지(Core Fantasy 1)의 핵심 구현체다.
- **스파이크 정렬:** 역류의 쇄도(Surge)는 아이템계의 수직 지층 이동 메타포를 전투에 직접 연결한다. "심연을 거슬러 올라가는" 느낌의 업워드 어택이다.
- **리스크-리워드:** 다이브 어택은 공중에서 하강하는 리스크를 감수해야 강력한 타격을 얻는다. 역류의 쇄도는 1.5초의 차징 딜레이라는 리스크 대신 강력한 상승 돌격을 제공한다.

---

## 3. FSM 상태 목록 및 전이

```
PlayerState = 'idle' | 'run' | 'jump' | 'fall' | 'dash' | 'dive' |
              'surge_charge' | 'surge_fly' | 'attack' | 'hit' | 'death'
```

### 전이 다이어그램

```
[idle] ←→ [run]
  |          |
  └──→ [jump] ──→ [fall] ──→ [idle/run] (착지)
        |    |         |
        |    └──→ [dash] ──→ [fall/idle/run]
        |              |
        └──→ [dive] ──→ [idle] (착지)
        |
        └──→ [surge_charge] ──→ [surge_fly] ──→ [fall]
        |
[attack] ←→ [idle/run/fall] (콤보 윈도우 내)
[hit] ──→ [idle/run/fall] (히트스턴 종료 후)
[death] (종단 상태 — respawn()으로만 탈출)
```

---

## 4. 능력별 상세 규칙 (Detailed Rules)

### 4.1 대시 (Dash)

**해금 조건:** 기본 보유 (abilities.dash = true, 게임 시작부터 사용 가능)

| 파라미터 | 값 | 단위 |
| :--- | :--- | :--- |
| 이동 거리 | 64px (4타일) | px |
| 지속 시간 | 150ms | ms |
| 대시 속도 | 64 ÷ (150/1000) = **426.67 px/s** | px/s |
| 지상 재사용 딜레이 | 400ms | ms |
| 공중 대시 | 1회 (착지 또는 벽슬라이드 시 리셋) | 회 |
| 종료 후 잔속 | `dashDirX × MOVE_SPEED × 0.5 = ±64 px/s` | px/s |
| 무적 프레임 | **미구현** | - |
| 중력 | 대시 중 vy = 0 (중력 미적용) | - |

**입력 조건:**
- `abilities.dash = true`
- 현재 상태가 `dash`, `surge_charge`, `surge_fly`, `hit`, `death`가 아닌 경우
- 지상이면 `groundDashAvailable = true`, 공중이면 `airDashAvailable = true`

**방향 결정:**
```
1. MOVE_RIGHT 입력 중 → dashDirX = +1
2. MOVE_LEFT 입력 중 → dashDirX = -1
3. 방향 입력 없음 → facingRight에 따라 ±1
```

**3타 끝 딜레이 취소:** endLagTimer > 0인 상태에서 대시 입력 시 endLagTimer = 0으로 초기화하고 대시 실행.

---

### 4.2 벽슬라이드 / 벽점프 (Wall Slide / Wall Jump)

**해금 조건:** abilities.wallJump = true

| 파라미터 | 값 | 단위 |
| :--- | :--- | :--- |
| 벽슬라이드 하강 속도 | 50 px/s (중력 대신 고정값 적용) | px/s |
| 벽점프 수평 속도 | 140 px/s (벽 반대 방향) | px/s |
| 벽점프 수직 속도 | -sqrt(2 × 980 × 56) ≈ **-331 px/s** (약 3.5타일 상승) | px/s |
| 벽점프 쿨다운 | 200ms | ms |
| 벽 감지 거리 | 2px | px |

**벽슬라이드 발동 조건:**
```
1. 공중 상태 (!grounded)
2. abilities.wallJump = true
3. wallJumpCooldown <= 0
4. 좌측 벽: 좌측 타일이 solid AND MOVE_LEFT 입력 중
5. 우측 벽: 우측 타일이 solid AND MOVE_RIGHT 입력 중
6. vy > 0 (하강 중)
→ vy를 WALL_SLIDE_SPEED(50)으로 강제 설정
→ 벽슬라이드 시작 시 doubleJumpAvailable = true, airDashAvailable = true 리셋
```

**벽점프 입력 조건:**
```
1. wallSliding = true AND touchingWallDir !== 0
2. JUMP 키 눌림 (isJustPressed)
→ vx = -touchingWallDir × 140 (벽 반대 방향)
→ vy = WALL_JUMP_VY ≈ -331 px/s
→ facingRight = (touchingWallDir < 0) (벽 반대 방향을 바라봄)
→ wallJumpCooldown = 200ms
→ FSM → 'jump'
```

---

### 4.3 더블점프 (Double Jump)

**해금 조건:** abilities.doubleJump = true

| 파라미터 | 값 | 단위 |
| :--- | :--- | :--- |
| 더블점프 속도 | JUMP_VELOCITY × 0.75 = -sqrt(2×980×80) × 0.75 ≈ **-296 px/s** | px/s |
| 상승 높이 | 약 44.7px ≈ 2.8타일 (v²=2gh → h = 296²/(2×980)) | px |
| 총 도달 높이 | 1타점프 80px + 더블점프 44.7px ≈ **124.7px (7.8타일)** (벽슬라이드 없을 때) | px |
| 사용 횟수 | 1회 (착지 또는 벽슬라이드 시 리셋) | 회 |

**발동 조건:**
```
1. JUMP 키 눌림 (isJustPressed)
2. !grounded (공중 상태)
3. coyoteTimer <= 0 (코요테 타임 만료, 지상 점프로 오인하지 않기 위해)
4. abilities.doubleJump = true
5. doubleJumpAvailable = true
→ vy = JUMP_VELOCITY × 0.75
→ doubleJumpAvailable = false
→ FSM → 'jump'
```

**코요테 타임과의 우선순위:**
```
같은 JUMP 입력 처리 블록에서 순서대로 평가:
1. 벽점프 조건 우선 체크
2. 더블점프 조건 체크 (coyoteTimer <= 0 필수)
3. 일반 점프 버퍼 등록
```

---

### 4.4 다이브 어택 (Dive Attack)

**해금 조건:** abilities.diveAttack = true

| 파라미터 | 값 | 단위 |
| :--- | :--- | :--- |
| 하강 속도 | 900 px/s (고정, 중력 미적용) | px/s |
| 수평 속도 | 0 (수직 낙하만) | px/s |
| 히트박스 활성 | 하강 중 내내 (착지까지) | - |
| 착지 판정 | grounded = true 시점 | - |
| 낙하 거리 기록 | `diveFallDistance = max(0, y - diveStartY)` | px |
| 착지 프레임 플래그 | `diveLanded = true` (1프레임만 유효) | - |

**입력 조건:**
```
1. abilities.diveAttack = true
2. !grounded (공중 상태)
3. LOOK_DOWN 입력 중
4. ATTACK 키 눌림 (isJustPressed)
5. 현재 상태가 dive, dash, hit, death가 아닌 경우
→ FSM → 'dive'
```

**착지 시 처리:**
```
diveFallDistance 계산 후 → diveLanded = true (씬에서 이 프레임 내 읽어야 함)
attackActive = false
FSM → 'idle'
```

---

### 4.5 역류의 쇄도 (Counter-Current Surge)

**해금 조건:** abilities.surge = true

| 파라미터 | 값 | 단위 |
| :--- | :--- | :--- |
| 차징 시간 | 1,500ms | ms |
| 상승 속도 | 800 px/s | px/s |
| 비행 지속 시간 | 500ms | ms |
| 대각선 수평 속도 | 800 × 0.5 = 400 px/s | px/s |
| 최대 상승 거리 | 800 × (500/1000) = **400px (25타일)** | px |
| 차징 중 이동 | vx = 0, vy = 0 (완전 정지) | - |

**입력 조건:**
```
1. abilities.surge = true
2. DASH 키 눌림 (isJustPressed)
3. LOOK_UP 입력 중
4. grounded OR wallSliding
5. 현재 상태가 surge_charge, surge_fly, hit, death가 아닌 경우
→ FSM → 'surge_charge'
```

**서지 방향 결정:**
```
벽슬라이드 중: surgeDirX = -touchingWallDir (벽 반대 방향 대각선)
지상: surgeDirX = 0 (수직 상승)
```

**차징 연출:**
```
progress = 1 - surgeChargeTimer / SURGE_CHARGE_MS (0.0 → 1.0)
스프라이트 진동 강도: progress × 3
카메라 흔들림: progress × 2
플래시 주기: 200ms → 50ms (flashSpeed = 200 - progress × 150)
스프라이트 색조: 빨강(0xFF4444) / 흰색 교번
```

**비행 시작 시 연출:**
```
카메라 shakeDirectional(5, 0, 1) — 상향 편향
hitstopFrames = 3 — 3프레임 히트스탑
triggerFlash() — 흰색 플래시
```

**비행 종료 조건:**
```
1. surgeFlyTimer <= 0 (500ms 경과) → FSM → 'fall'
2. 천장 충돌 (y <= 0 AND vy <= 0) → FSM → 'fall'
```

---

### 4.6 수중 호흡 (Water Breathing)

**해금 조건:** abilities.waterBreathing = true

| 파라미터 | 값 | 단위 |
| :--- | :--- | :--- |
| 최대 산소량 | 20,000ms | ms |
| 산소 소모 속도 | dt per frame (1:1 실시간 소모) | ms/ms |
| 산소 회복 속도 | dt × 3 per frame (3배속 회복) | ms/ms |
| 소모 조건 | submerged = true AND waterBreathing = false | - |
| 익사 판정 | oxygen <= 0 → drowned = true | - |

**submerged(머리 잠수) 판정:**
```
headRow = floor(y / 16)
midCol = floor((x + width/2) / 16)
headInWater = roomData[headRow][midCol] === 2 (타일 타입 2 = 물)
submerged = inWater AND headInWater
```

**inWater(몸체 물 접촉):** 물리 엔진의 isInWater() 함수가 플레이어 AABB와 물 타일의 접촉을 확인.

**수중 이동 패널티:**
```
waterMult = inWater ? 0.5 : 1.0
- 중력: GRAVITY × waterMult (절반 중력)
- 수평 이동: vx × waterMult (절반 속도)
- 최대 낙하: MAX_FALL_SPEED × 0.4 = 192 px/s (40%)
```

**waterBreathing = true 시:** 산소 소모 없음. 수중에서도 무한 활동 가능. 이동 패널티(waterMult)는 여전히 적용됨.

---

## 5. 엣지 케이스 (Edge Cases)

| 상황 | 처리 방식 |
| :--- | :--- |
| 대시 중 데미지를 받는 경우 | 현재 대시에 무적 미구현. hit 상태로 강제 전환됨. 추후 invincible 플래그 추가 필요 |
| 더블점프 후 벽슬라이드 진입 시 | 벽슬라이드 시작 시 doubleJumpAvailable = true 리셋. 따라서 더블점프를 사용했어도 벽 접촉 후 다시 더블점프 가능 |
| surge_charge 중 공격 입력 | 서지 차징 중에는 공격 입력 무시 (FSM 상태 체크로 차단) |
| surge_charge 중 취소 불가 | X키 취소 미구현. 1.5초 동안 완전 정지 상태 유지. 위험 상황에서 취소 수단 없음 |
| 다이브 어택 중 스파이크에 착지 | diveLanded = true와 함께 스파이크 데미지 동시 발생 가능. 씬에서 순서 처리 필요 |
| 수중에서 벽점프 시 | waterMult = 0.5가 중력에 적용되나, 벽점프 vx/vy는 waterMult 미적용. 공중 이동 속도만 감속됨 |
| oxygen이 회복 중 maxOxygen 초과 | `min(OXYGEN_MAX, oxygen + dt * 3)`로 상한 클램프. 정상 처리 |
| 코요테 타임 150ms 내에 더블점프 시도 | coyoteTimer > 0이면 더블점프 조건 불충족. jumpBufferTimer에 등록되어 일반 점프로 처리 |
| 벽점프 직후 200ms 내 재벽점프 시도 | wallJumpCooldown > 0이면 wallSliding 감지 비활성. 벽에 붙어도 슬라이드 미발동 |
| surge_fly 중 천장 충돌 후 상태 | `y <= 0` 조건으로 early exit. 그러나 roomData 기반 천장 충돌은 Physics.resolveY()가 처리하므로 y <= 0 조건은 월드 바운더리 경계 케이스 |

---

## 6. 공식 요약 (Formulas)

### 점프 속도

```
JUMP_VELOCITY = -sqrt(2 × GRAVITY × JUMP_HEIGHT)
              = -sqrt(2 × 980 × 80)
              = -sqrt(156800)
              ≈ -396 px/s
```

### 더블점프 상승 높이

```
doubleJump_vy = JUMP_VELOCITY × 0.75 ≈ -297 px/s
doubleJump_height = vy² / (2 × GRAVITY) = 297² / (2 × 980) ≈ 45px (2.8타일)
```

### 벽점프 수직 속도

```
WALL_JUMP_VY = -sqrt(2 × GRAVITY × 56) = -sqrt(109760) ≈ -331 px/s
(= 일반 점프의 약 70%, 상승 높이 56px ≈ 3.5타일)
```

### 대시 속도

```
dashSpeed = DASH_DISTANCE / (DASH_DURATION / 1000) = 64 / 0.15 ≈ 427 px/s
```

### 서지 최대 상승 거리

```
surgeDist = SURGE_SPEED × (SURGE_DURATION / 1000) = 800 × 0.5 = 400px (25타일)
```

---

## 7. 검증 체크리스트 (Acceptance Criteria)

### 기능 검증

- [ ] 대시가 64px(4타일) 거리를 150ms 안에 완료됨
- [ ] 지상 대시 후 400ms 내에 다시 대시할 수 없음
- [ ] 공중 대시가 1회만 가능하고, 착지 후 리셋됨
- [ ] 벽슬라이드 중 JUMP 입력으로 벽 반대 방향으로 점프됨
- [ ] 벽슬라이드 진입 시 더블점프와 공중 대시가 리셋됨
- [ ] 더블점프가 공중에서 1회만 가능하고, 착지 후 리셋됨
- [ ] 더블점프가 일반 점프보다 낮은 높이로 상승함 (약 2.8타일)
- [ ] 다이브 어택이 공중에서 ↓+X 입력으로 발동하고 착지 시 종료됨
- [ ] 서지 차징이 1.5초 진행되고 비행이 500ms 지속됨
- [ ] 서지 차징 중 플레이어가 완전히 정지함
- [ ] 벽슬라이드 중 서지 발동 시 대각선 방향으로 상승함
- [ ] 수중에서 이동 속도가 50%로 감소함
- [ ] waterBreathing 없이 머리가 잠수 시 20초 후 익사 처리됨
- [ ] waterBreathing 해금 후 수중에서 무한 활동 가능함
- [ ] 능력 해금 전에는 해당 입력이 무시됨

### 경험 검증

- [ ] 벽점프 + 더블점프 조합으로 접근 불가했던 높은 곳에 도달할 수 있음
- [ ] 서지 발동 시 카메라 흔들림과 히트스탑으로 강력한 상승감이 느껴짐
- [ ] 다이브 어택이 강하한 거리에 비례하는 임팩트를 줌 (씬 연출 연동 시)
- [ ] 대시가 단조 타격감과 어울리는 빠르고 직접적인 이동으로 느껴짐

---

*소스 참조: `game/src/entities/Player.ts`, `game/src/combat/CombatData.ts`*
