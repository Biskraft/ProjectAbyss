# 사다리 시스템 (Ladder / Climb System)

## 구현 현황 (Implementation Status)

> **준거 상위 (Authority):** [RES-LAD-01](../Research/Research_Ladder_PlatformerReference.md) (레퍼런스) · [DGN-IWGEN-01](../Design/Design_ItemWorld_GenerationArchitecture.md) (사다리 코리도)
> **최근 업데이트:** 2026-06-19 (신규 기획)
> **문서 상태:** `기획 확정 · 구현 대기 (순수 추가 — 기존 climb 코드 0)`
> **2-Space:** World + 아이템계 (공통 캐릭터 시스템)
> **기둥:** 탐험가 (Explorer) — 수직 이동

| 기능 ID | 분류 | 기능명 | 우선순위 | 구현 상태 | 비고 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| LAD-01 | 충돌 | `TILE_LADDER` IntGrid 값(=14) + `isOnLadder()` | P1 | 📅 대기 | Physics.ts 신규 |
| LAD-02 | 상태 | 플레이어 `'climb'` FSM 상태 | P1 | 📅 대기 | Player.setupStates() |
| LAD-03 | 입력 | Up 홀드 잡기 · 등반 · 점프 이탈 | P1 | 📅 대기 | 달리던 중 자동흡착 금지 |
| LAD-04 | 애니메이션 | climb 5상태 태그(.ase 신규 프레임) | P1 | 📅 대기 | erda_atlas |
| LAD-05 | 규칙 | **등반 중 공격 불가**(디스마운트 필요) | P1 | 📅 대기 | School B(공격 게이팅) |
| LAD-06 | 정상/바닥 | 자동 climb-over + 바닥 step-off | P2 | 📅 대기 | `ladderTop` 플래그 |
| LAD-07 | 연동 | 일방통행 발판 관통 우선순위 | P2 | 📅 대기 | Up/Down/Down+Jump |
| LAD-08 | 테마 | 바이옴별 사다리 렌더(제너릭 마커) | P3 | 📅 대기 | 금속/해초/밧줄 등 |

---

## 0. 필수 참고 자료 (Mandatory References)

- 레퍼런스: [RES-LAD-01](../Research/Research_Ladder_PlatformerReference.md)
- 생성 연동(사다리 코리도): [DGN-IWGEN-01](../Design/Design_ItemWorld_GenerationArchitecture.md) §3.4·§4.5
- 캐릭터 물리·상수: `game/src/entities/Player.ts` · `Sheets/Content_Player.csv`
- 충돌/IntGrid: `game/src/core/Physics.ts:19-71`
- 애니메이션 아틀라스: `game/public/assets/characters/erda_atlas.json`

---

## 1. 개요 (Overview)

### 1-1. 정의
사다리는 **큰 방 내부의 수직 이동**과 **생성기의 사다리 코리도(상승 >4셀, ∞ 도달)** 를 담당하는 등반 면이다. 우리 소켓 모델은 *세로 매칭 없음(일방향 하강)* 이므로, 사다리는 *방 내부에 직접 저작*되거나 *코리도로 자동 삽입*되어 세로 복잡성을 흡수한다([[DGN-IWGEN-01]]).

### 1-2. 설계 의도
| 차원 | 의도 |
| :--- | :--- |
| **감정** | 통제된 상승의 긴장(취약함) + 도달의 안도. 짧은 수직 전환의 리듬. |
| **심리** | 역량: 수직 공간 장악. 자율성: 오를지 우회할지 선택. |
| **기둥 정렬** | 탐험가 — 수직축 탐험을 액션 손맛을 깨지 않고 보강. |
| **레퍼런스 회피** | 고전 캐슬바니아 계단 경직(점프 이탈 불가) 금지. 사다리가 *죽은 구간*이 되지 않게 짧게·이탈 자유롭게. |

---

## 2. 핵심 규칙 (Detailed Rules)

> **전투 정책 확정 = B안 "등반 중 공격 불가".** 싸우려면 디스마운트. 사유: ① 사용자 명시("동작=공격 불가") ② 우리 사다리는 *짧은 방 내부*가 주용도 → 등반 체류 짧아 전투 불필요 ③ 애니 5상태로 비용 최소 ④ "액션 바닥 사수"는 *지상*에서. (긴 사다리 코리도가 전투를 요구하면 §5-후속에서 나인솔즈 룰로 승급.)

| # | 규칙 | 값/동작 |
| :--- | :--- | :--- |
| R1 | **마운트** | 밑에서 `Up` · 정상에서 `Down`(위 발판 있을 때) · *공중 잡기*(`Up`+사다리 겹침, 관대한 캐치). 잡기 허용폭 = 사다리폭 ±~5px |
| R2 | **자동흡착 금지** | 좌우로 *달리던 중* 사다리 통과 시 자동 잡기 금지 — 명시적 `Up` 필요 |
| R3 | **스냅** | 부착 즉시 사다리 중심 X로 **빠른 lerp(~4프레임)**, 수평속도 0, 좌우 입력은 *디스마운트 의도*로 소비 |
| R4 | **등반** | 중력 off(대시/다이브처럼). 속도 ~0.7× 달리기. `Up/Down` 홀드로 상하, 릴리스=climb_idle 정지. 루프 속도 Y속도 연동 |
| R5 | **정상** | 위에 설 곳 있으면 **자동 climb-over**(`ladderTop` 타일 구동), 없으면 정상 정지 |
| R6 | **바닥** | 지면 있으면 step-off, 없으면 release+낙하. **바닥 점프 버퍼 ~20프레임** |
| R7 | **디스마운트** | 좌우=step-off · `Jump`=**민첩 점프로 이탈**(낙하 아님) · `Down+Jump`=일방발판 관통 |
| R8 | **등반 중 공격 불가** | `ATTACK`/`CAST`/`DASH` 입력은 climb 상태에서 *디스마운트*로 처리(대시=이탈→공중대시). 공격 버튼은 무시 또는 "내려서 공격" |
| R9 | **피격** | 일반타=**붙은 채 hit-flash + 짧은 경직**(싸구려 넉백 이탈 금지). 런처/중타만 강제 이탈+낙하 |
| R10 | **일방통행 발판** | 사다리는 발판 관통. 입력 우선순위 **`Up`=잡기 / `Down`=하강 / `Down+Jump`=관통** (데드셀 버그류 회피) |
| R11 | **이단점프 리셋** | climb 진입 시 이단점프 가용 리셋(벽슬라이드와 동일) |

---

## 3. 상태기계 · 애니메이션 (State & Animation)

### 3-1. FSM 상태
`PlayerState`에 `'climb'` 추가. 진입: `isOnLadder() && Up && state∈{idle,run,jump,fall}`. 이탈: 점프/좌우 step-off/바닥·정상 도달.

```
[idle/run]──Up+ladder──▶[climb]──Jump──▶[jump]
[jump/fall]──Up+ladder(공중잡기)──▶[climb]──좌우/바닥──▶[idle]
                                   └──정상 climb-over──▶[idle]
```
- 진입(`startClimb`): vx=0, vy=0, grounded=false, 이단점프 리셋, 중심 X 스냅.
- 업데이트(`stateClimb`): inputY×climbSpeed로 vy, vx=0, Y충돌만(사다리=통과). 공격/대시 입력→디스마운트.

### 3-2. 애니메이션 상태 (erda_atlas 신규 — School B 최소 5+1)
| 태그 | 루프 | 프레임(목표) | 비고 |
| :--- | :--- | :--- | :--- |
| `climb_mount` | 1회 | 2–4 | 잡기+중심 스냅. 짧고 스냅 |
| `climb_idle` | 홀드 | 1–2 | 그립 정지 포즈 |
| `climb_up` | 루프 | 4–6 | **프레임 진행 = Y속도 연동** |
| `climb_down` | 루프 | (up 역재생) | |
| `climb_over` | 1회 | 3–5 | 정상 발판으로 step-over |
| `climb_hit` | 1회 | 2–3 | 붙은 채 flash+경직 |

> 현재 atlas(71프레임, 태그 idle/jump/running/dash/attack1-3/attack_air/aim/aim_jump/lift/wake_up)에 climb 태그 **없음** → `.ase`에 신규 프레임 추가 후 재export. wake_up(61-70) *재활용 금지*(별 의미).

---

## 4. 데이터 · 구현 연동 (Data & Integration)

### 4-1. 정확한 훅 지점 (코드 그라운딩)
| 시스템 | 파일:라인 | 훅 |
| :--- | :--- | :--- |
| IntGrid 값 | `Physics.ts:19-60` | `TILE_LADDER=14`(미사용 값) + `isLadder()`/`isOnLadder()`(water식 중심 겹침) |
| 솔리드 예외 | `Physics.ts:62-71` | 사다리=통과(솔리드 아님). Y충돌 해소 무변경 |
| FSM 상태 | `Player.ts:140, 650-720` | `PlayerState`에 `'climb'` + `setupStates()`에 enter/update/exit |
| 진입 검사 | `Player.ts:~800-850` | 점프 버퍼 앞에 `onLadder && Up` 전이 |
| 사다리 감지 | `Player.ts:~1150` | 벽 감지 뒤 `isOnLadder()` 질의 |
| 입력 | `Player.ts:322-332` | `isPlayerInputDown(LOOK_UP/LOOK_DOWN)` 홀드 |
| 공격 게이팅 | `Player.ts:~886` | `attackStateAllowed`에 `state!=='climb'` 추가 |
| 애니 재생 | `Player.ts:2588-2865` | `updateErdaAnimation`에 climb 분기 + `getErdaFrameRange('climb',…)` |
| 카메라(선택) | `Camera.ts` | 긴 등반 시 `lookDirection`=inputY 룩어헤드 |

추정 추가량 ~150–200 LOC(대부분 Player.ts), 신규 자산 1(erda.ase climb 프레임).

### 4-2. 바이옴별 테마 (LAD-08)
`TILE_LADDER`는 *제너릭 마커* — 렌더는 바이옴 해석(유체 방식 동일): 하수도=금속 사다리, 바다=해초/밧줄, 평원=목제, 마그마=식은 지각 발판열. [[Content_BiomeConfig]] `PaletteId`와 동기.

### 4-3. 생성 연동
[[DGN-IWGEN-01]] 사다리 코리도(상승 >4셀)가 `TILE_LADDER`로 채워진 세로 통로 = 런타임 등반과 동일 메커니즘. 큰 방 내부 사다리는 LDtk에 직접 저작(저작 가이드: 내부 사다리).

---

## 5. 검증 · 엣지케이스 (Verification & Edge Cases)

### 5-1. 통과 게이트 (실기 관측 — 렌더러에서 확인)
1. 밑 Up 잡기 · 공중 Up 잡기 · 정상 Down 잡기 모두 동작.
2. 중심 스냅이 *팝*도 *입력 싸움*도 아니다(빠른 lerp).
3. 정상 자동 climb-over가 *끼임 없이* 발판에 안착(설 곳 검증, 없으면 정지 폴백).
4. `Jump`로 즉시 민첩 이탈, 좌우로 step-off.
5. **공격 버튼이 등반을 깨지 않는다**(무시 또는 디스마운트).
6. 일방발판 관통 우선순위(Up/Down/Down+Jump) 모호성 0.
7. 피격 시 싸구려 넉백 이탈 없음(붙은 채 경직).

### 5-2. 회피할 Jank (RES-LAD-01 §3-12)
- 고전 계단 경직(점프 이탈 불가) **금지**.
- 스냅이 live 수평입력과 싸우지 않게(부착 시 수평속도 0).
- 정상 climb-over 목적지 검증(끼임 방지).
- 사다리/발판 겹침 다운입력 모호성(데드셀 버그류) — 우선순위 고정.
- 바닥 데드입력 — 점프 버퍼.

### 5-3. 후속 옵션 (범위 밖)
- **나인솔즈 룰 승급:** 긴 사다리 코리도가 전투를 요구하면 — 근접 `climb_attack_side` 허용(한 손 포즈) + 원거리/차지=강제이탈. 애니 +1~2상태.
- 사다리↔사다리 점프, straddle-cap 정상 렌더(고전풍).

---

## 한 줄
> **사다리는 짧고·이탈 자유로운 수직 전환. 등반 중엔 무방비(공격 불가)이고, 큰 방 내부 저작과 생성기 사다리 코리도가 같은 `TILE_LADDER` 메커니즘을 공유한다. 고전 계단의 경직은 거부한다.**
