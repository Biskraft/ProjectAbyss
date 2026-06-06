# 구현 작업서: 프롤로그 컷신 씬 (PrologueCutsceneScene)

> **준거 상위 (Authority):** T-03
> **상태:** 미구현 (씬 신규 — 코드에 `PrologueCutsceneScene` 부재)
> **우선순위:** P1 (프롤로그 P3→P6 연결 필수)
> **관련 기획:** `Content_Ch0_Prologue.md` §8.3 #3 (PrologueCutsceneScene) · `EndingScene.ts` (씬 전환·페이드 패턴) · `ItemWorldGrowthSnapshotController.ts` (RenderTexture 줌)

---

## 1. 개요

프롤로그 컷신은 **두 라이브 월드 사이의 이음새**다 — 아이템계(P3 위상 찢김)에서 시작해 Start_Room 기상(P6)으로 넘긴다. 컷신의 본질은 *연출*이 아니라 **씬 핸드오프를 들키지 않게 잇는 다리**다.

> 본 작업서는 `Content_Ch0_Prologue.md` §8.1의 "월드 와이드 → 줌인 → 암전 → 줌인"을 **2026-06-06 감독 지시**로 구체화·갱신한다: 흰색 전환 → 메가 스트럭처 원경 → 캐릭터로 푸시인 → 라이브 교체 → 기상.

---

## 2. 샷 시퀀스 (감독 지시 — 권위)

| # | 샷 | 내용 | 씬 |
|:--:|:---|:---|:---|
| S0 | **트리거 + 말소자** | 아이템계(`ItemStratum_Prologue_04`)에서 PrologueTrigger 터치 → 말소자(흰색 언캐니, 비교전) 등장 | LdtkWorldScene (라이브) |
| S1 | **흰색 전환 (out→로드→in)** | 흰색으로 덮임(말소자 절멸=백색) → **흰색 아래서 시네마/베이크 로드** → 흰색 걷히며 S2 원경 드러남. 수천 년 경과 함의 흡수 | 전환 |
| S2 | **메가 스트럭처 원경** | 흰색에서 드러남 — **아주 멀리 메가 스트럭처와 빌더**. *라이브 렌더 아님* — 넓은 LDtk 공간을 **RenderTexture로 베이크한 한 장**(구운 텍스처) | 베이크 텍스처 |
| S3 | **줌인 (텍스처 스케일)** | 구운 텍스처를 **스케일로 확대** — 원경 → 에르다 누운 지점. **카메라 줌이 아니라 텍스처 스케일**(줌 한계 없음) | 베이크 텍스처 |
| S4 | **라이브 스왑(이음새)** | 스케일이 라이브 기상 프레이밍과 일치하는 순간 → 구운 텍스처 → **라이브 LDtk 맵 교체**. 구도 일치로 컷 은폐 | 베이크 → LdtkWorldScene |
| S5 | **기상 애니메이션** | 에르다가 일어나는 애니메이션 출력 (누운 포즈 → 기립) | LdtkWorldScene (라이브) |
| S6 | **이동(플레이 가능)** | 첫 입력 활성 → 이동. Ch.1 진행 | LdtkWorldScene |

---

## 3. 핵심 난제 — 카메라 줌 한계 → 베이크 텍스처 스왑

**카메라 줌은 하드 한계가 있다.** 라이브 LDtk 카메라로는 "아주 먼 원경 → 캐릭터 근접"을 못 한다. 그래서 시네마는 **별도 라이브 씬이 아니라 구운 텍스처 한 장의 스케일 연출**이다.

1. **별도 LDtk 레벨 `Prologue_Cinema_01`** 에 에르다 기상 지점 주변을 넓게 오서링(메가 스트럭처 원경 포함). **Start_Room 확장 아님 — 전용 시네마 레벨**(2026-06-06 결정).
2. `Prologue_Cinema_01` 을 **RenderTexture로 1회 베이크**(구움).
3. 구운 텍스처를 **스케일 업**(줌인) — 텍스처 스케일은 무한, 줌 한계 없음.
4. 스케일·구도가 라이브 `Start_Room_01` 기상 프레이밍과 일치하는 순간 **라이브 LDtk 맵으로 스왑**.

```
LdtkWorldScene (아이템계 04)
   │  ← 이음새 ①: S1 흰색 전환이 마스킹
   ▼
[베이크 텍스처] Prologue_Cinema_01 → RenderTexture → 스케일 줌인 (라이브 씬 아님)
   │  ← 이음새 ②: S4 스케일·구도 일치 순간 스왑
   ▼
LdtkWorldScene (Start_Room_01, S5 기상 → S6 플레이)
```

> **두 레벨:** 베이크 소스 = `Prologue_Cinema_01`(시네마 전용, 라이브로 안 들어감) / 스왑 대상 = `Start_Room_01`(라이브 기상·플레이).

> `PrologueCutsceneScene` 은 독립 "씬"이 아니라 **베이크 텍스처 + 흰색 + 스왑을 제어하는 컨트롤러**다(EndingScene 골격 위 RenderTexture 연출).

---

## 4. 이음새 전략

### 이음새 ① (아이템계 → 베이크 텍스처) — White-out → 로드 → White-in
- **① White-out (아이템계):** 말소자 등장 후 전체 화면 흰색 오버레이 alpha 0→1 트윈(EndingScene `fadeRoot` 패턴, 색만 백색 `0xffffff`).
- **② 흰색 절정(alpha 1) *아래에서* 시네마 로드:** 컨트롤러 진입 + `Prologue_Cinema_01` → **RenderTexture 베이크** + 줌아웃 시작 프레임 세팅. **베이크 비용·씬 로드 끊김이 흰색에 가려 불가시**(여기가 무거운 작업을 숨기는 자리).
- **③ White-in (시네마):** 흰색 alpha 1→0 트윈 → 메가 스트럭처 원경(S2)이 **드러남**. 이어서 S3 줌인 시작.
- 결과: **white-out → (로드/베이크) → white-in** 사이클이 아이템계→시네마 컷을 완전 은폐. (수천 년 경과 함의도 이 흰색 구간에 흡수.)

### 이음새 ② (베이크 텍스처 → 라이브 LDtk) — 스케일·구도 일치 스왑
- **가장 어려운 컷.** 카메라가 아니라 **구운 텍스처를 스케일**해 원경→근접을 만든다(줌 한계 회피).
- 구운 텍스처 줌인의 *최종 스케일·구도* = 라이브 Start_Room 기상 프레이밍과 **정확히 일치**(에르다 누운 위치·줌·구도).
- 일치 순간 `loadLevel('Start_Room_01')` 라이브 맵으로 스왑, 구운 텍스처 제거.
- **구도 일치 앵커(P0) = `chapter_01` Player 스폰 엔티티.** 기상 위치는 `Start_Room_01` 안의 `Player` 엔티티 중 **scene=`chapter_01`** 로 선택되는 스폰이다(`WorldPrologueEndRuntime`·`WorldPlayerSpawnRuntime`). `Prologue_Cinema_01` 줌인의 *최종 프레임* = 이 Player 엔티티 위치·줌과 동일하게 맞춘다. 두 레벨이 어긋나면 컷이 드러난다.
- **스왑 = 기존 코드 경로 재사용.** `LdtkWorldScene.enterChapter1FromPrologue` 가 이미 `saveAccess.setScene('chapter_01')` + `loadLevel('Start_Room_01','down')` 를 수행한다. 컷신은 이 호출 *직전*에 베이크 줌을 끼우고, 줌 종료 프레임이 `chapter_01` Player 스폰과 일치하면 이 경로를 호출해 라이브로 넘긴다.
- **스왑이 안 보이는 이유:** 구운 텍스처는 최대 줌에서 픽셀이 커지고 흐려진다(베이크 해상도 한계) → 라이브 맵이 **같은 프레임을 네이티브 선명도**로 렌더 → *구도 일치 + 해상도 업그레이드*가 컷을 은폐. 큰 픽셀 블러 마스킹 = `ItemWorldGrowthSnapshotController` 기법.
- 메커니즘 = `ItemWorldGrowthSnapshotController` 의 RenderTexture 캡처 + `root.scale` 재사용(nearest + blur).

---

## 5. 깨어남 핸드오프 (S5→S6)

- 교체 직후 `Start_Room_01` (scene=`chapter_01`): 에르다가 **`chapter_01` Player 스폰**에 누운 포즈(P6). 입력 잠금.
- **기상 애니메이션** 재생 → 종료 시 첫 입력 활성 → 이동 가능.
- 옵션 B(사운드 콜드 오픈, `Content_Ch1` §1): 기상 직전 검 속 러스트본 잔향 한 마디.
- 에르다 아틀라스(`erda_atlas`)에 **`wake_up` 프레임 존재 (39–48, 10프레임)** → 기상 애니 **재사용**. 신규 제작 불필요. (참고: `Design_Art_Direction.md` §0.3은 38프레임까지만 기록 — desync. 아틀라스 JSON이 truth source.)

---

## 6. 자산 — 재사용 vs 신규

| 항목 | 처리 |
|:---|:---|
| 씬 전환(`replace`)·페이드(alpha 트윈) | **재사용** — EndingScene 패턴 |
| 줌/푸시인·이음새 캡처 | **재사용** — ItemWorldGrowthSnapshotController RenderTexture + scale |
| `PrologueCutsceneScene` | **신규 씬** (EndingScene 을 골격 모델로) |
| 흰색 오버레이 | 신규(간단 — 전체화면 백색 Graphics + alpha 트윈) |
| `Prologue_Cinema_01` (S2 베이크 소스) | **신규 LDtk 레벨** — 메가 스트럭처 원경 + 에르다 기상 지점, 넓게. 시네마 전용(라이브 진입 안 함). parallax far/mid/near §0.6 포함 가능 |
| RenderTexture 베이크·스케일 | **재사용** — ItemWorldGrowthSnapshotController |
| 에르다 기상 애니메이션 (S5) | **재사용** — `erda_atlas` `wake_up` 39–48 |
| `Start_Room_01` 누운 스폰 상태 (S5 스왑 대상) | 신규 상태(기존 레벨 + 기상 플래그). 기상 지점 구도 = `Prologue_Cinema_01` 과 일치 |

---

## 7. 구현 체크리스트

- [ ] **흰색 전환(S1) — out→로드→in** — 백색 alpha 0→1(아이템계) → 절정 *아래서* `Prologue_Cinema_01` 베이크 + 컨트롤러 진입 → alpha 1→0(시네마 원경 드러남)
- [ ] **PrologueCutsceneScene(신규 컨트롤러)** — EndingScene 골격. S2 베이크 텍스처 → S3 스케일 줌인 타임라인
- [ ] **`Prologue_Cinema_01`(신규 LDtk 레벨)** — 메가 스트럭처 원경 + 에르다 기상 지점, 넓게 오서링. Start_Room 확장 아님·라이브 진입 안 함
- [ ] **베이크(S2)** — `Prologue_Cinema_01` → RenderTexture(1회)
- [ ] **스케일 줌 + 이음새 ②** — 베이크 텍스처 `root.scale` 줌인, 최종 스케일·구도 = `Start_Room_01` 기상 구도 일치, 일치점에서 `loadLevel('Start_Room_01')` 스왑
- [ ] **구도 일치 오서링(P0)** — 앵커 = `chapter_01` Player 스폰 엔티티(`Start_Room_01` 내). `Prologue_Cinema_01` 줌인 최종 프레임 = 이 Player 엔티티 위치·줌과 동일
- [ ] **스왑 경로 재사용** — `LdtkWorldScene.enterChapter1FromPrologue`(setScene('chapter_01')+loadLevel('Start_Room_01')) 직전에 베이크 줌 삽입
- [ ] **`Start_Room_01` 누운 스폰(S5)** — 입력 잠금 + 누운 포즈
- [ ] **기상 애니메이션** — `wake_up`(39–48) 재생, 종료 시 입력 활성
- [ ] **사운드** — 흰색 전환음/급정적 + (옵션) 기상 직전 검 잔향
- [ ] **입력 핸드오프(S6)** — 기상 종료 → 이동 가능, Ch.1 진행

---

## 8. 인수 기준

1. 아이템계에서 말소자 등장 후 흰색 전환으로 시네마 씬에 진입하며, 그 컷이 보이지 않는다.
2. 구운 텍스처가 메가 스트럭처·빌더 원경을 보여주고 텍스처 스케일로 캐릭터까지 천천히 줌인한다(카메라 줌 한계 회피).
3. 줌인 도중 베이크 텍스처 → 라이브 LDtk 맵 스왑이 스케일·구도 일치로 **들키지 않게** 일어난다.
4. 교체 후 에르다 기상 애니메이션이 재생되고, 종료 시 입력이 활성화된다.
5. 플레이어가 이동을 시작하며 Ch.1 으로 매끄럽게 이어진다.

---

## 9. 미해결 / 확인 필요

- **스왑 타이밍 튜닝:** 베이크 텍스처가 해상도 한계로 흐려지는 줌 깊이 = 라이브 스왑 시점. 너무 이르면 라이브 맵 경계가 보이고, 너무 늦으면 큰 픽셀이 노출 — 실측으로 스윗스폿.
- **베이크 공간 범위 vs 해상도:** 에르다 주변을 넓게 오서링할수록 원경 스케일은 커지나 베이크 텍스처 1장당 픽셀 밀도는 낮아짐(줌인 시 더 흐림). RenderTexture 해상도 vs 줌 깊이 tradeoff — 실측 후 범위·해상도 확정.
- **수천 년 경과 표현:** 흰색(S1)에 흡수 vs 별도 암전 비트 — 현재 안 = 흰색에 흡수(간결).
