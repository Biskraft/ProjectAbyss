# System_World_Hazards.md — 월드 위험 요소 시스템

> **작성 기준:** 코드 역기획서 (Code-First Reverse GDD)
> **소스 파일:** `game/src/entities/Spike.ts`, `game/src/entities/GrowingWall.ts`, `game/src/entities/CrackedFloor.ts`, `game/src/entities/CollapsingPlatform.ts`, `game/src/entities/Updraft.ts`
> **필수 참고:** `Documents/Terms/Project_Vision_Abyss.md`, `Documents/Terms/GDD_Writing_Rules.md`

---

## 1. 개요

월드와 아이템계 양쪽 공간에 배치되는 5종의 환경 위험 요소를 정의한다. 각 위험 요소는 LDtk 엔티티로 배치되며, 플레이어에게 특정 행동(다이브 어택, 공중 이동, 시간 압박)을 유도한다. 모든 위험 요소는 타일 충돌 그리드(`number[][]`)와 직접 연동하며, 파괴 또는 상태 변화 시 그리드를 즉시 수정한다.

---

## 2. 설계 의도 (Design Intent)

**핵심 판타지:** "수직 구조물을 탐험하는 탐험가"가 환경 자체와 싸우는 느낌. 단순한 장애물이 아니라 특정 능력을 가진 플레이어에게 "이 길을 열 수 있다"는 발견의 쾌감을 제공해야 한다.

**MDA 설계 목표:**
- **Aesthetic:** Challenge(플랫폼 퍼즐) + Discovery(CrackedFloor 숨겨진 통로) + Sensation(GrowingWall의 위협적 성장)
- **Dynamic:** 위험 요소의 조합으로 공간 탐색 패턴 다양화
- **Mechanic:** 각 위험 요소는 서로 다른 플레이어 입력(다이브, 공격, 스탠딩)에 반응

**SDT 검증:**
- Autonomy: 상승기류는 수직 이동 경로의 선택지 확장
- Competence: 붕괴 플랫폼 타이밍, GrowingWall 파괴 타이밍으로 숙련도 측정
- Relatedness: 위험 요소가 월드의 살아있는 생태계를 표현 (GrowingWall의 생물처럼 자라는 벽)

---

## 3. 상세 규칙 (Detailed Rules)

### 3.1 Spike (가시)

**LDtk 엔티티:** `Spike` (리사이즈 가능, pivot 좌하단)

**충돌 판정:**
- AABB 방식 — `getAABB()` 반환값과 플레이어 AABB의 겹침 감지
- 크기: LDtk에서 지정한 width x height (8px 단위 삼각형, spikeW = 8px)

**피격 처리 (플레이어가 닿았을 때):**
1. 플레이어 최대 HP의 20% 데미지 적용
2. 플레이어를 `lastSafeGroundPosition`으로 텔레포트
3. 카메라 쉐이크 + 화면 플래시 + 히트스탑 발동
4. 500ms 무적 프레임(i-frames) 부여

**파괴 불가:** Spike는 영구적 장애물. 파괴 메커니즘 없음.

**비주얼:**
- 색상: 기반 `#884444`, 팁 하이라이트 `#cc6666`
- 삼각형 패턴: width / 8px 개수, spikeW = 8px 간격

### 3.2 GrowingWall (증식 벽)

**LDtk 엔티티:** `GrowingWall` (리사이즈 가능, Entities 레이어)

**3가지 동시 행동:**

**행동 1 — 성장 사이클:**
```
대기 → GROW_INTERVAL(8000ms, ±50% 랜덤) 후 성장 시작
성장 활성 → GROW_DURATION(3000ms) 동안 좌우 각 1타일 확장
   확장 애니메이션: 500ms 동안 alpha 0.3→0.8 진행
성장 종료 → 확장 타일 충돌 제거, 다음 대기 시작 (GROW_INTERVAL * 0.8~1.2)
```

**행동 2 — 슬라임 스폰:**
```
SLIME_INTERVAL_MIN(10000ms) ~ SLIME_INTERVAL_MAX(18000ms) 무작위 간격
벽 표면 좌 또는 우 엣지에서 Slime 엔티티 1마리 생성
생성 위치: side > 0 → x + width + 4 / side < 0 → x - 20, y = 벽 하단
```

**행동 3 — 파괴 (다이브 어택):**
```
플레이어 다이브 어택이 GrowingWall AABB에 적중 →
shatter(grid) 호출:
  1. destroyed = true, container.visible = false
  2. 기본 충돌 타일 제거 (gridCells)
  3. 성장 중인 확장 충돌 타일도 제거 (growCells)
  → 파괴 영구, 재생성 없음
```

**시각 효과:**
- 호흡 펄스: `sin(pulseTimer * 0.001) * 1.5` — 미묘한 x 스케일 진동
- 먼지 입자: DUST_INTERVAL(2000ms)마다 위로 떠오르는 1~2px 파티클
- 균열 패턴: 3개의 zig-zag 균열선으로 파괴 가능성 시각적 힌트

### 3.3 CrackedFloor (균열 바닥)

**LDtk 엔티티:** `CrackedFloor` (리사이즈 가능)

**충돌 주입:**
- 생성 시 `injectCollision(grid)` 호출 → 점유 타일 전체 = 1 (솔리드)

**파괴 조건:**
- 플레이어 다이브 어택이 CrackedFloor AABB에 적중 시 `shatter(grid)` 호출

**파괴 처리:**
```
shatter(grid):
  1. destroyed = true (중복 파괴 방지)
  2. container.visible = false
  3. 모든 gridCells의 grid값 → 0 (통로 개방)
  4. gridCells = [] (cleanup)
  → 영구 파괴, 재생성 없음
```

**비주얼:**
- 색상: 기반 `#7a7a6a`, 균열 `#5a5a4a`
- 3개의 균열 패턴 (대각선 2개 + 교차 1개) — 파괴 가능성 암시

**월드 탐험 역할:**
- 숨겨진 통로의 게이트 역할 — 다이브 어택 능력 획득 후 열리는 능력 게이트
- 파괴 후 복구 불가이므로 맵 상태 변화가 영구적

### 3.4 CollapsingPlatform (붕괴 플랫폼)

**LDtk 엔티티:** `CollapsingPlatform` (리사이즈 가능, pivot 좌하단)
**LDtk 필드:**
- `Respawn (Bool)`: 재생성 여부
- `RespawnTime (Float)`: 재생성까지 대기 시간 (초, 기본 3.0)

**라이프사이클:**

```
solid → (플레이어 접촉) → shaking(500ms) → collapsed → [respawning timer] → solid
```

상태 전환 세부:

| 상태 | 진입 조건 | 시각 효과 | 충돌 |
|------|----------|----------|------|
| solid | 초기 / restore() | 불투명 정상 렌더 | 있음 |
| shaking | isPlayerOnTop() = true | ±2px 흔들림, alpha 0.5→1.0 페이드 | 있음 |
| collapsed | shakeTimer <= 0 | container.visible = false | 없음 |
| respawning | respawns = true | 비가시 | 없음 |

**접촉 감지 (`isPlayerOnTop`):**
```
playerBottom >= platform.y AND playerBottom <= platform.y + 3 (2px 허용 오차)
AND playerRight > platform.x + 2 AND playerLeft < platform.x + platform.width - 2
```

**재생성:**
- `respawns = false`: 영구 붕괴
- `respawns = true`: `respawnTimeMs` 경과 후 `restore()` 호출
  - 솔리드 복원, collision 재주입, alpha = 1

### 3.5 Updraft (상승기류)

**LDtk 엔티티:** `Updraft` (리사이즈 가능 영역)
**LDtk 필드:**
- `strength (Int)`: 1=약함, 2=중간, 3=강함

**3단계 강도:**

| 강도 | Force | MaxVy | 효과 | 파티클 수 | 파티클 색 |
|------|-------|-------|------|----------|---------|
| 1 (약함) | 중력 x 0.6 (588) | -60 px/s | 낙하 감속 | 12 | `#aabbcc` (연한 회청) |
| 2 (중간) | 중력 x 1.2 (1176) | -120 px/s | 호버 / 완만한 상승 | 20 | `#88bbee` (연한 파랑) |
| 3 (강함) | 중력 x 2.2 (2156) | -250 px/s | 빠른 상승 | 35 | `#66ddff` (밝은 시안) |

(GRAVITY = 980 px/s² — Player.ts와 동일값 사용)

**물리 적용:**
- 매 프레임 플레이어 `vy -= force * dtSec` (중력에 역방향)
- `vy = max(vy, maxVy)` — 최대 상승 속도 클램프
- `overlaps(px, py, pw, ph)` — AABB 겹침 여부로 영역 내 플레이어 판단

**파티클 시스템:**
- 수직 상승 라인 파티클, 하단 진입/상단 퇴장 구간에서 alpha 페이드 인/아웃
- 좌우 wobble: `sin(y * 0.05 + offset) * 1.5`

---

## 4. 공식 (Formulas)

### Spike 데미지

```
damage = player.maxHp * 0.20
```

예시: maxHp = 200 → damage = 40

### GrowingWall 성장 타이머

```
초기: GROW_INTERVAL * random(0.5, 1.0) = 4000~8000ms
재시작: GROW_INTERVAL * random(0.8, 1.2) = 6400~9600ms
```

### Updraft 속도 클램프

```
매 프레임: player.vy = player.vy - (force * dt / 1000)
클램프: player.vy = max(player.vy, maxVy)
```

예시 (strength=3, dt=16ms):
- force = 2156
- vy 감소량 = 2156 * 0.016 = 34.5 px/s per frame

### CollapsingPlatform 쉐이크 알파

```
gfx.alpha = 0.5 + (shakeTimer / SHAKE_DURATION) * 0.5
= 0.5 (붕괴 직전) ~ 1.0 (쉐이크 시작 직후)
```

---

## 5. 엣지 케이스 (Edge Cases)

| 상황 | 처리 방식 |
|------|----------|
| Spike 피격 + 무적 프레임 중 재접촉 | i-frames으로 데미지 무시 |
| GrowingWall 성장 중 파괴 | shatter()에서 growCells도 함께 제거 |
| GrowingWall 성장 시 이미 솔리드 타일이 있는 경우 | `grid[gr][ec] === 0` 조건 체크 → 0인 타일만 확장 |
| CrackedFloor 파괴 후 다이브 어택 재입력 | `destroyed` 플래그로 중복 shatter 방지 |
| CollapsingPlatform 붕괴 중 적이 위에 있는 경우 | 적 물리와 별도 처리 — 적은 타일 그리드 의존이므로 떨어질 수 있음 |
| CollapsingPlatform respawns=false 붕괴 후 restore 호출 | respawning 분기에만 restore 진입 — false이면 collapsed 상태 영구 유지 |
| Updraft 영역 밖으로 플레이어 탈출 | overlaps() = false → force 적용 중단, 중력 재개 |
| Updraft strength 범위 외 값 (0, 4 등) | `Math.max(1, Math.min(3, strength))` 클램프 |
| 타일 그리드 범위 외 좌표 | 모든 grid 접근에 bounds check (`gr >= 0 && gr < grid.length`) |
| GrowingWall 스폰한 Slime이 방 밖으로 나가는 경우 | pendingSlimes 배열 — 씬에서 수집 및 관리 책임 |

---

## 6. 의존성 (Dependencies)

| 방향 | 시스템 | 계약 |
|------|--------|------|
| 읽음 | 타일 그리드 (`number[][]`) | 솔리드(1) / 공기(0) 타일 데이터 |
| 쓰기 | 타일 그리드 | 파괴/성장 시 그리드 값 직접 수정 |
| 읽음 | `Player` | AABB(px, py, pw, ph), lastSafeGroundPosition |
| 쓰기 | `Player` | HP 감소 (Spike), vy 수정 (Updraft) |
| 호출 | `ScreenFlash` | Spike 피격 시 화면 플래시 트리거 |
| 호출 | `CameraShake` | Spike 피격, CollapsingPlatform 붕괴 시 쉐이크 트리거 |
| 제공 | `pendingSlimes[]` | GrowingWall이 씬에 넘겨주는 Slime 인스턴스 목록 |
| 읽음 | LDtk 엔티티 필드 | Respawn, RespawnTime, strength 값 로드 |

---

## 7. 튜닝 노브 (Tuning Knobs)

| 노브 | 위치 | 범위 | 카테고리 | 기본값 | 설명 |
|------|------|------|----------|--------|------|
| Spike 데미지 비율 | `Spike.ts` 처리 로직 | 5%~50% | Feel | 20% | 낮을수록 패널티 가벼움 |
| GROW_INTERVAL | `GrowingWall.ts:20` | 3000~15000ms | Gate | 8000ms | 성장 주기 |
| GROW_DURATION | `GrowingWall.ts:21` | 1000~6000ms | Gate | 3000ms | 확장 지속 시간 |
| SLIME_INTERVAL_MIN/MAX | `GrowingWall.ts:25~26` | 5000~30000ms | Gate | 10000~18000ms | 슬라임 스폰 주기 |
| SHAKE_DURATION | `CollapsingPlatform.ts:16` | 100~1000ms | Feel | 500ms | 붕괴 경고 시간 |
| SHAKE_INTENSITY | `CollapsingPlatform.ts:17` | 1~5px | Feel | 2px | 쉐이크 진폭 |
| Updraft STRENGTH_FORCE | `Updraft.ts:19~22` | 중력 x 0.3~3.0 | Feel | 0.6/1.2/2.2 | 강도별 부력 |
| Updraft MAX_UPDRAFT_VY | `Updraft.ts:25~29` | -30~-400 px/s | Gate | -60/-120/-250 | 최대 상승 속도 |

---

## 8. 검증 체크리스트 (Acceptance Criteria)

**기능 검증:**
- [ ] Spike 접촉 시 정확히 maxHp의 20% 데미지가 적용됨
- [ ] Spike 접촉 후 500ms 동안 재피격 없음
- [ ] GrowingWall 다이브 어택 후 충돌이 즉시 제거됨 (좌우 확장 타일 포함)
- [ ] GrowingWall 성장 중 충돌 타일이 추가되고, 성장 종료 후 제거됨
- [ ] CrackedFloor 다이브 어택 후 아래 통로 진입 가능 (그리드 0으로 변경)
- [ ] CollapsingPlatform respawns=true 시 RespawnTime 후 솔리드 복원 및 충돌 재주입
- [ ] CollapsingPlatform respawns=false 시 붕괴 후 영구 제거
- [ ] Updraft strength=1/2/3에서 각 MaxVy 값이 클램프로 작동함
- [ ] Updraft 영역 벗어나면 상승 력 즉시 중단

**경험 검증:**
- [ ] Spike는 "실수하면 크게 손해" 느낌으로 플레이어가 조심스럽게 접근함
- [ ] GrowingWall의 호흡 펄스가 "살아있는 벽"처럼 느껴짐
- [ ] CollapsingPlatform 쉐이크 500ms가 "점프해서 피할 시간이 있다"는 인식을 줌
- [ ] Updraft strength=3에서 "빠르게 솟구치는" 감각이 확실히 전달됨
- [ ] CrackedFloor 파괴 후 숨겨진 통로가 열렸다는 발견의 쾌감이 있음

---

## 구현 현황

| 기능 | 상태 | 비고 |
|------|------|------|
| Spike AABB 충돌 + 20% HP 데미지 | 구현 완료 | |
| Spike i-frames 500ms | 구현 완료 | |
| GrowingWall 성장 사이클 (8s 주기) | 구현 완료 | |
| GrowingWall 슬라임 스폰 | 구현 완료 | pendingSlimes 배열 |
| GrowingWall 다이브 어택 파괴 | 구현 완료 | |
| CrackedFloor 다이브 어택 파괴 | 구현 완료 | 영구 파괴 |
| CollapsingPlatform 4단계 라이프사이클 | 구현 완료 | |
| CollapsingPlatform 재생성 (Respawn/RespawnTime) | 구현 완료 | |
| Updraft 3단계 강도 | 구현 완료 | |
| Updraft 파티클 시스템 | 구현 완료 | wobble + fade |
| Spike 위치 텔레포트 | 구현 완료 | lastSafeGroundPosition 필요 |
