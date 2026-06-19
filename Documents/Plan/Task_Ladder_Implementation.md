# TASK-LAD-01 — 사다리/등반 구현

> **목표:** [System_Ladder](../System/System_Ladder.md) 의 LAD-01~08을 잘게·우선순위순으로 구현한다.
> **근거:** [System_Ladder](../System/System_Ladder.md) (기획·file:line 훅) · [RES-LAD-01](../Research/Research_Ladder_PlatformerReference.md) (레퍼런스) · [DGN-IWGEN-01](../Design/Design_ItemWorld_GenerationArchitecture.md) (사다리 코리도).
> **상태:** 구현 대기. **순수 추가**(기존 climb 코드 0). 페이즈마다 *실기 관측* 게이트.
> **작성:** 2026-06-19.

---

## §0. 확정 전제

- **전투 정책 = 등반 중 공격 불가(School B).** 공격/캐스트/대시 입력은 climb에서 디스마운트로 처리.
- **`TILE_LADDER = 14`**(미사용 IntGrid 값). 사다리=통과(솔리드 아님), water식 중심 겹침 감지.
- **고전 계단 경직 거부** — 점프 이탈 항상 자유.
- **제너릭 마커 + 바이옴 테마 해석**(유체 방식 동일).
- 추정 ~150–200 LOC(대부분 Player.ts) + erda.ase climb 신규 프레임(사용자 제작).
- 보존: 기존 이동/충돌/카메라 무회귀. 검증 정책상 Playwright는 *명시 요청 시만*, 기본은 개발 빌드 직접 플레이 관측.

---

## §1. 작업 티켓 (우선순위순)

### Phase 0 — 최소 등반 루프 (MVP · 핵심 먼저)
플레이스홀더 애니로 *로직부터* 돌린다.
- **T0.1** `Physics.ts`: `TILE_LADDER=14` + `isLadder()` + `isOnLadder(x,y,w,h,roomData)`(중심 겹침). *(LAD-01)*
- **T0.2** `Player.ts`: `PlayerState`에 `'climb'` 추가 + `setupStates()` enter/update/exit. *(LAD-02)*
- **T0.3** 진입 검사: 벽 감지 뒤 `onLadder` 질의 → `onLadder && Up`에서 `'climb'` 전이(점프 버퍼 앞). *(LAD-03)*
- **T0.4** `stateClimb`: 중력 off, `inputY × climbSpeed(~0.7× run)`로 vy, vx=0, Y충돌만(사다리 통과), 이단점프 리셋. 릴리스=정지.
- **T0.5** `Jump`=이탈→`'jump'`(민첩 점프). 좌우=사다리 벗어나면 `'fall'`.
- **T0.6** 임시 애니: 기존 태그(예: idle/jump) 플레이스홀더로 climb 표시.
- **게이트:** 사다리에 붙어 *오르내리고*, 중력 안 받고, *점프로 이탈*되고, 좌우로 벗어난다. (개발 빌드 직접 플레이.)

### Phase 1 — 입력·공격 게이팅
- **T1.1** 중심 X **빠른 lerp(~4프레임)** 스냅 + 부착 시 수평속도 0(입력 싸움 방지). *(LAD-03)*
- **T1.2** *공중 잡기*: 공중 `Up`+사다리 겹침(관대한 캐치) → climb. *(LAD-03)*
- **T1.3** 자동흡착 금지: 달리던 중 사다리 통과 시 명시적 `Up` 요구(R2).
- **T1.4** 공격 게이팅: `attackStateAllowed`에 `state!=='climb'`. `ATTACK`/`CAST`=무시, `DASH`=이탈→공중대시. *(LAD-05)*

### Phase 2 — 정상/바닥/일방발판/피격
- **T2.1** `ladderTop` 타일 플래그 + 정상 **자동 climb-over**(설 곳 검증, 없으면 정지 폴백). *(LAD-06)*
- **T2.2** 바닥 step-off + **점프 버퍼 ~20프레임**. *(LAD-06)*
- **T2.3** 일방발판 관통 우선순위: **`Up`=잡기 / `Down`=하강 / `Down+Jump`=관통**(데드셀 버그류 회피). *(LAD-07)*
- **T2.4** 피격: 일반타=붙은 채 hit-flash+경직(`climb_hit`), 런처/중타만 강제 이탈+낙하(R9).

### Phase 3 — 애니메이션 (erda.ase 신규 프레임 후)
- **T3.1** `.ase`에 climb 5+1 프레임 추가 → 재export(*사용자*). wake_up 재활용 금지.
- **T3.2** 태그: `climb_mount`·`climb_idle`·`climb_up`·`climb_down`(역재생)·`climb_over`·`climb_hit`. *(LAD-04)*
- **T3.3** `updateErdaAnimation`에 climb 분기 + `getErdaFrameRange('climb_*',…)` + **루프 속도 = Y속도 연동**.
- **게이트:** 등반/마운트/정상/피격 애니가 *상태와 일치*하게 재생.

### Phase 4 — 테마 · 생성 연동
- **T4.1** 바이옴별 사다리 렌더(`TILE_LADDER` 제너릭 → 하수도=금속/바다=해초/평원=목제). [[Content_BiomeConfig]] PaletteId 동기. *(LAD-08)*
- **T4.2** 생성기 사다리 코리도(상승 >4셀)를 `TILE_LADDER` 세로 통로로 채움 — 런타임 등반과 동일. [[DGN-IWGEN-01]] §3.4.

---

## §2. 정확한 훅 지점 (코드)

| 시스템 | 파일:라인 | 훅 |
| :--- | :--- | :--- |
| IntGrid | `Physics.ts:19-71` | `TILE_LADDER=14` + `isLadder`/`isOnLadder`. 솔리드 예외 무변경(통과) |
| FSM | `Player.ts:140, 650-720` | `'climb'` 상태 + setupStates |
| 진입/입력 | `Player.ts:~800-850, 322-332` | `onLadder && Up` 전이, `isPlayerInputDown(LOOK_UP/DOWN)` |
| 감지 | `Player.ts:~1150` | 벽 감지 뒤 `isOnLadder()` |
| 공격 게이팅 | `Player.ts:~886` | `state!=='climb'` |
| 애니 | `Player.ts:2588-2865` | climb 분기 + `getErdaFrameRange` |
| 카메라(선택) | `Camera.ts` | 긴 등반 룩어헤드 |

---

## §3. 보존 불변값

- 기존 이동·충돌·점프·대시·카메라 무회귀(climb는 *추가 상태*).
- 사다리=통과 타일 → Y충돌 해소 로직 무변경.
- 결정론·생성기 무영향(사다리 코리도는 기존 `TILE_LADDER` 재사용).

---

## §4. 검증 게이트 (실기 관측)

System_Ladder §5-1 전수 — 개발 빌드 직접 플레이로:
1. 밑/공중/정상 잡기 모두 동작.
2. 스냅이 팝도 입력싸움도 아님.
3. 정상 climb-over 끼임 0(설 곳 검증).
4. 점프 즉시 이탈 · 좌우 step-off.
5. **공격 버튼이 등반을 안 깸**.
6. 일방발판 관통 우선순위 모호성 0.
7. 피격 싸구려 넉백 이탈 없음.

(Playwright는 사용자 명시 요청 시만.)

---

## §5. 미정 · 후속

- **나인솔즈 룰 승급**(긴 코리도가 전투 요구 시): `climb_attack_side` 한 손 포즈 허용 + 원거리 강제이탈. 애니 +1~2.
- 사다리↔사다리 점프 · straddle-cap 정상 렌더(고전풍).
- climbSpeed·스냅 lerp·점프버퍼 프레임 등 수치 튜닝(플레이 후).

---

## 한 줄
> **Phase 0(최소 등반 루프)로 핵심을 먼저 세우고 — 입력·공격게이팅 → 정상/바닥/발판 → 애니 → 테마/생성 연동 순. 순수 추가라 회귀 위험 낮고, 각 페이즈는 직접 플레이로 관측 검증한다.**
