# Plan — Ch.0 프롤로그 구현 계획

> **준거:** `Documents/Content/Content_Ch0_Prologue.md` §8 플로우차트
> **작성:** 2026-06-04 · 코드 실측 앵커링
> **위상:** 구현 작업 계획(WBS). 서사·구조 권위는 CNT-CH0, 본 문서는 실행 순서·검증 기준.

---

## 0. 실측 현황 (2026-06-04)

| 항목 | 상태 |
| :--- | :--- |
| 레벨 6종 (`Prologue_01`, `ItemStratum_Prologue_01~04`, `Start_Room_01`) | **존재** |
| `Prologue_01` | Player·**Anvil×1**·NPC×8·Container×2·Breakable×9 (P0-P1 콘텐츠 상당) · 절차 데코 제거됨 |
| `ItemStratum_Prologue_01` | 귀환 Anvil·ItemDisplay·Building·Container · **적 0** |
| `ItemStratum_Prologue_02/03` | Container×1 · **적 0** |
| `ItemStratum_Prologue_04` | ItemDisplay×1 · **트리거·말소자 0** |
| `Start_Room_01` | SecretWall×1 · **기상 상태·Player 스폰 없음** |
| Fixed dive 런타임 (`WorldFixedItemWorldFlowRuntime`, `WorldAnvilItemWorldFlowRuntime`) | 존재 — `item.fixedLevelId` 한 레벨 로드, 내부는 edge transition |
| `fixedLevelId` 값 | **미설정** (메커니즘만 존재, 휴면) |
| Edge transition (`WorldEdgeTransitionFlowRuntime`) | 존재 |
| 컷신 모델 (`EndingScene` = `extends Scene`) | 존재 |
| 줌 기법 (`ItemWorldGrowthSnapshotController` RT 캡처+스케일) | 존재 |
| 말소자 스프라이트·스폰·연출 | **전무** |
| `PrologueCutsceneScene`, `PrologueTrigger` | **미존재(신규)** |

**요약:** 골격(레벨·다이브/edge 런타임·컷신/줌 모델)은 모두 있다. 빈 곳은 ① 다이브 와이어링, ② 전투 배치, ③ 말소자(아트+트리거+연출), ④ 컷신 씬, ⑤ 기상 상태.

---

## 1. §8.5 미해결 항목 — 결정

| 질문 | 결정 | 근거 |
| :--- | :--- | :--- |
| 01→04 이동 방식 | **edge transition(인접 배치)** 1차 채택. 단 fixed 상태 유지 검증 필수(P-A3). 깨지면 trapdoor 연쇄로 폴백. | fixed flow 가 단일 레벨 진입만 검증됨. edge 런타임은 존재하나 `fixedItemWorld.isActive` 중 다지층 연쇄는 미검증. |
| 컷신 줌인 대상 아트 | **GrowthSnapshot RT 캡처+스케일** 재사용 + 와이드 소스 아트 1컷(또는 절차 합성). | 줌 기법 코드 존재. 와이드 아트는 아트트랙 의존. |
| 씬 전환 방식 | **`replace`**(LdtkWorldScene 재생성) → `loadLevel('Start_Room_01')`. | 백업 기상 = 새 게임 상태. EndingScene 도 `replace` 사용. |

---

## 2. 페이즈 WBS

### Phase A — 다이브 경로 작동 (P0-P2 진입)
의존: 없음. **선행 페이즈.**

- **A1. 랩(P0-P1) 콘텐츠 마감** — `Prologue_01`
  - NPC 8체 차등 각인 대사 연결: 러스트본(강)·이리(중)·이름없는 동료(약, 등만). 키 `prologue.rustborn.0~3`, `prologue.iri.0~3` 이미 CSV/번들 존재 → NPC `text` 열에 키 입력만.
  - 검증: 랩에서 러스트본 인터랙트 대사 출력, 이리 스침.
- **A2. 다이브 와이어링 → ✅ 완료(2026-06-04, scene 기반)**
  - 아이템에 영구 `fixedLevelId` 부여 대신 **scene 기반 라우팅** 채택(재사용 무기가 프롤로그 후 일반 다이브로 자동 복귀). `SCENE_FIXED_STRATUM = { prologue: 'ItemStratum_Prologue_01' }`. `WorldAnvilItemWorldFlowRuntime.enterFromTunnel`이 `targetItem.fixedLevelId ?? SCENE_FIXED_STRATUM[scene]`로 분기, `WorldFixedItemWorldFlowRuntime.enter(item, levelIdOverride)`로 전달.
  - 즉 scene='prologue'에서 Anvil 다이브 → `ItemStratum_Prologue_01`(고정). 이후 scene 전환 시 일반 절차 다이브.
  - 잔여(검증): 랩에서 실제 무기 배치→타격→다이브 도달은 플레이 확인 필요.
- **A3. 다지층 fixed 연쇄 → ✅ PoC PASS(§6). 잔여는 LDtk 오서링.**
  - `ItemStratum_Prologue_01→02→03→04` edge transition 이동이 `fixedItemWorld.isActive` 유지하며 작동하는지 실측.
  - 깨지면: fixed flow 에 "edge 이동 중 fixed 상태 보존" 패치 또는 trapdoor 연쇄로 변경.
  - 검증: 01에서 04까지 끊김 없이 도달, 중간 귀환/보스 로직 오발 없음.

### Phase B — P2 전투 튜토리얼
의존: A.

- **B1. 약한 적(드론) 고정 배치** — `ItemStratum_Prologue_01~03` (LDtk)
  - DEC-044: 드론(말소자 아님). 레벨당 1-2체. 기존 enemy spawn 패턴.
  - 검증: 착지 직후 검 콤보·회피로 처치 가능, 정상 결과(드롭/진행).
- **B2. 4지층 단방향화** — `ItemStratum_Prologue_04`
  - 되돌아가기 차단(Cascade 직전 긴장). edge 단방향 또는 진입 후 후방 출구 봉인.

### Phase C — 말소자 (P2.1~P3)
의존: A·B. **아트트랙 블로킹: C1.**

- **C1. 말소자 흰색 언캐니 32px 스프라이트** *(아트)* — `Design_Art_Direction §14.4` 사양. 비교전이므로 idle/등장 프레임만.
- **C2. `PrologueTrigger` (신규)** — `ItemStratum_Prologue_04` 도달 존
  - 진입 시 (a) 일반 출구/edge 비활성, (b) 말소자 스폰, (c) 비교전 위협 시퀀스 시작.
  - 패턴: 기존 `WorldDialogueTriggerRuntime`(존 진입) + `WorldBossLockRuntime`(출구 잠금) 참조.
  - LDtk: 04에 트리거 존 1 + 말소자 스폰 포인트 1.
- **C3. 위상 찢김 화면 연출(P3)** — 왜곡·조작 불능·정적/저주파/굉음 전조. 전투 AI 불필요(비교전). 종료 → Phase D 진입.

### Phase D — 컷신 (P4-P5 + 암전)
의존: C. **아트트랙 블로킹: D4.**

- **D1. `PrologueCutsceneScene` (신규 씬)** — `EndingScene` 패턴(`extends Scene`)
  - 와이드 → 줌인(메가 스트럭처 형성·Cascade) → 암전(수천 년) → 작은 공동 줌인.
  - 줌: `ItemWorldGrowthSnapshotController` RT 캡처+스케일 재사용.
- **D2. 동료 에코 산란 연출(P5 시드)** — 동료 의식이 제각기 다른 무기/잔해로 흩어짐(흩어진 에코 서브라인). 신파 차단(lament 금지, 와이드, 클로즈업 금지).
- **D3. 종료 전환** — `sceneManager.replace(new LdtkWorldScene(...))` + `loadLevel('Start_Room_01')`.
- **D4. 와이드 소스 아트** *(아트)* — 메가 스트럭처 와이드 1컷(또는 절차 합성).

### Phase E — 기상 (P6) → Ch.1
의존: D.

- **E1. `Start_Room_01` 기상 상태** — 에르다 누움 스폰 포즈 → 첫 입력 시 일어섬. Player 스폰 추가(현재 없음) + 누움 포즈 상태(신규 플레이어 상태 1종).
- **E2. UI + 사운드 콜드 오픈** — "백업 복원 완료" 1줄(로케일 키 신규) + 검 속 러스트본 잔향("에르다…", 키 `ego.rustborn_awaken.0` 기존).
- **E3. Ch.1 연결** — 기상 후 침수 바닥층 진행(CNT-CH1).

### Phase F — 사운드·연출 폴리시 (횡단)
의존: 각 페이즈 병행.

- 시공 굉음 *첫 등장 = P4* → 이후 기본 사운드스케이프. 신파 차단(동료 죽음 lament 금지, 굉음+급정적). 카메라: P4-P5 와이드.

---

## 3. 순서·의존 그래프

```
A1(랩대사) ─┐
A2(다이브와이어링) ─┼─> A3(다지층검증) ─> B(전투배치) ─> C(말소자) ─> D(컷신) ─> E(기상) ─> Ch.1
            │
아트트랙: C1(말소자 스프라이트), D4(와이드 컷신 아트) ── C/D 블로킹(병행 선제작 권장)
F(사운드·카메라) ── 전 페이즈 횡단
```

---

## 4. 리스크

| # | 리스크 | 영향 | 완화 |
| :--- | :--- | :--- | :--- |
| ~~R1~~ | ~~다지층 fixed 연쇄(A3) 미검증~~ → **A3 PoC PASS (2026-06-04)** | 中→低 — 코드 메커니즘 작동 확인 | 코드 정적 추적 결과 edge 전환이 fixed 상태 보존(아래 §6). 잔여는 LDtk 오서링뿐 |
| R2 | `fixedLevelId` 와이어링 메커니즘 미정 | 中 — 다이브 진입 | A2 에서 부여 지점 확정(아이템 생성 vs LDtk 필드) |
| R3 | 말소자 스프라이트·와이드 컷신 아트 의존 | 中 — C·D 블로킹 | 아트트랙 선제작. 임시 placeholder 로 코드 선행 가능 |
| R4 | 컷신 줌 RT 기법의 월드 와이드 적용 | 中 — D1 | GrowthSnapshot 재사용 PoC 선행 |

---

## 5. 마일스톤 (검증 게이트)

- **M1 (Phase A):** 랩 → Anvil 다이브 → ItemStratum_Prologue_01~04 끊김 없이 도달.
- **M2 (Phase B):** 1~3지층 전투 튜토리얼 플레이 가능, 4지층 단방향.
- **M3 (Phase C):** 04 도달 → 말소자 비교전 등장 → 위상 찢김 연출 → 조작 불능 진입.
- **M4 (Phase D):** 컷신 재생 → 암전 → replace → Start_Room_01 로드.
- **M5 (Phase E):** 기상(누움→일어섬) + "백업 복원 완료" + Ch.1 연결. **= 프롤로그 5분 플레이 완주.**

---

## 7. 구현 진행 로그 (2026-06-04 · 자율 1차)

**완료(코드, tsc/validate 통과):**
- **씬 기반 스폰** — `Player.Scene` 필드(`prologue`/`chapter_01`) → `sacredSave.getScene()`로 스폰 선택. 신규게임=prologue→`Prologue_01`, chapter_01→`Start_Room_01`. (`WorldPlayerSpawnRuntime`, `WorldTransitionController.findPlayerSpawnLevel`, `PlayerSave.scene`)
- **A2 다이브 와이어링** — scene='prologue'에서 Anvil 다이브 → `ItemStratum_Prologue_01`(고정). 아이템 비변형. (`SCENE_FIXED_STRATUM`)
- **프롤로그-종료 spine(P2.1~P6 placeholder)** — `WorldPrologueEndRuntime`: scene=prologue로 `ItemStratum_Prologue_04` 진입 시 → (진입딜레이) → 위협 암전 → 페이드 → `setScene('chapter_01')` + `loadLevel('Start_Room_01')` + "백업 복원 완료" 토스트. `endingRuntime` 블로킹 패턴(`if(update())return`)으로 조작 잠금. LDtk 트리거 엔티티 불필요(레벨 진입이 트리거).
- **연결 진단** — 4지층 충돌 729~899셀(정상 오서링), 연결 모서리 개방 → **순방향 01→04 통행 가능 확인**.

**연결된 프롤로그 스파인(코드):**
`신규게임→Prologue_01(랩) → Anvil 다이브 → ItemStratum_Prologue_01 → edge 01→02→03→04 → 04 진입=종료 시퀀스 → Start_Room_01(chapter_01 기상) → "백업 복원 완료"`

**남은 것(코드 외 / 폴리시):**
- **아트:** 말소자 흰색 언캐니 스프라이트, 컷신 와이드(메가 스트럭처·Cascade). 현재 종료는 암전 placeholder.
- **연출 승격:** `WorldPrologueEndRuntime` placeholder → 정식 `PrologueCutsceneScene`(줌인/Cascade) + 말소자 등장·위상 찢김.
- **LDtk:** `ItemStratum_Prologue_01~03` 약한 적(드론) 배치(P2 전투); 4지층 단방향화(현재 모든 모서리 개방 → `04-n→01` 역방향·측면 봉인); `ItemStratum_Prologue_01`의 귀환 Anvil 조기복귀 차단; Start_Room_01 기상 포즈.
- **검증:** 런타임 스모크(랩→다이브→01→04→종료→Start_Room) 미실행(Playwright 미사용).

---

## 6. A3 PoC 검증 로그 (2026-06-04 · 코드 정적 추적)

**질문:** 아이템계 fixed 상태(`fixedItemWorld.isActive`) 중 edge transition으로 `ItemStratum_Prologue_01→02→03→04` 이동이 fixed 상태를 보존하며 작동하는가?

**검증 (코드 근거):**
1. **레벨 인접성 — PASS.** 4레벨이 2×2 배치(`01(-6912,-1280) 02(-6144,-1280) / 04(-6912,-768) 03(-6144,-768)`)로 LDtk neighbour 연결. 의도 경로 `01-e→02`, `02-s→03`, `03-w→04` 성립(시계방향). 역방향 `04-n→01` 존재 → 단방향화 시 차단 대상.
2. **edge 전환의 fixed 무관성 — PASS.** `WorldEdgeTransitionFlowRuntime`(전체)이 `fixedItemWorld`를 참조하지 않음. edge 감지 → `getNeighborInDirection` → `loadLevelForTransition`(=`loadLevel`)만 호출.
3. **loadLevel의 fixed 보존 — PASS.** `loadLevel`/`loadLevelForTransition`이 fixed 상태 미변경. `FixedItemWorldRuntime.clear()` 호출은 `LdtkWorldScene.respawnPlayer()`(사망)뿐.
4. **exit/clear 오발 없음 — PASS.** `fixedItemWorldFlow.exit()`(귀환)는 `WorldPortalItemWorldFlowRuntime`에서만 발화. edge 전환 경로엔 exit/clear 없음.

**결론:** `fixedItemWorld.isActive`(=`item !== null`)가 edge 전환을 가로질러 보존됨. **체인 메커니즘 신규 코드 불필요.** R1 강등.

**잔여(코드 아님):**
- LDtk: 연결 edge(`01-e/02-s/03-w`) passable 타일 개방 확인 + `04-n→01` 차단(단방향).
- ItemStratum_Prologue 레벨의 Anvil/귀환 엔티티가 체인 중간 조기 복귀를 허용하지 않는지 확인.
- 런타임 스모크(실제 도보 01→04 + 시각 글리치)는 플레이 검증 필요 — 미실행(Playwright 미사용).
