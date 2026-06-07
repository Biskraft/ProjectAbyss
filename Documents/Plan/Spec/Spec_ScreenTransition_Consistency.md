# ECHORIS 화면 전환 정합성 (Screen Transition Consistency)

> **문서 ID:** PLN-XSITION
> **준거 상위 (Authority):** T-03 (비전), DEC-043 (프롤로그 다이브), DEC-047 (톤=고독)
> **최근 업데이트:** 2026-06-06 (신규 — 전환 파편화 정리 + TransitionDirector 단일 권위 확정)
> **용도:** 모든 화면 전환의 단일 정의처. 전환의 분류·단계 계약·불변 규칙·색 의미·통합 대상을 관리한다. 깜빡임·타일 점멸 제거의 SSoT.
> **경계:** 본 문서는 **화면 전환(scene/room/cutscene swap 및 overlay)** 만 다룬다. 카메라 추종·줌의 평상시 동작은 카메라 시스템 소관. 전환 *중* 카메라 처리만 본 문서가 규정한다.
> **근거:** 코드 실측 — `game/src/scenes/world/WorldEdgeTransitionRuntime.ts`, `game/src/effects/TransitionOverlay.ts`, `game/src/scenes/shared/{TransitionFadeHelpers,WorldTransitionHelpers}.ts`, `game/src/core/SceneManager.ts`, `game/src/scenes/LdtkWorldScene.ts`(`fadeOverlay` @ `legacyUIContainer`), 스냅샷 계열(`ItemWorldGrowthSnapshotController`, `WorldFrozenSnapshotRuntime`, `Task_Scene_PrologueCutscene.md`).

---

## 0. 왜 이 문서가 필요한가 (현 상태 진단)

코드 실측 기준, 전환은 30개 이상 파일로 파편화돼 있고 **단일 권위가 없다.**

- 동일 로직의 중복: `WorldEdgeTransitionRuntime`(C2 룸 스왑) ↔ `stepLegacyWorldTransition`(`WorldTransitionHelpers`)이 같은 fade_out→fade_in 상태머신을 따로 구현.
- 커버 소유자 최소 3종: `fadeOverlay`(`legacyUIContainer`의 Graphics) · `TransitionOverlay`(별도 Container, portal cutout) · 스냅샷 RenderTexture. 부모·z가 제각각이라 플로우가 연쇄되면 커버가 충돌 → 플래시.
- 검증 프레임 부재: `WorldEdgeTransitionRuntime`은 `fade_out` 종료 틱에 `loadLevel` 후 같은 틱에 `alpha=1`로 `fade_in` 진입. 로드는 alpha=1에서 일어나지만 **로드 직후 1프레임 검증이 없어**, 카메라 추종 lerp가 reveal 첫 프레임에 이전 위치를 그린다 → 타일이 밀려 보였다 사라진다.

→ **결론:** 단일 `TransitionDirector`로 **전면 교체**한다(점진 흡수 아님, 2026-06-06 결정). 아래 계약·규칙이 그 사양이다.

---

## 1. 전환의 종류 (Taxonomy)

배경(월드 콘텐츠)을 건드리는 정도로 3분류한다. 이 분류가 규칙의 기준이다.

| 분류 | 정의 | 배경 처리 | 커버 방식 | 해당 사례 |
| :--- | :--- | :--- | :--- | :--- |
| **C1 오버레이** | 콘텐츠 교체 없음. 위에 UI만 얹음 | **절대 rebuild 안 함.** 정지 또는 디밍만 | 반투명 알파 패널/딤 | 포즈·인벤·대화·획득 토스트·맵 |
| **C2 콘텐츠 스왑** | 룸↔룸, 씬↔씬 교체 | **불투명 커버 뒤에서 파괴·재생성** | 단색 알파 커튼 (black / white / rarity) | 엣지 전환, 월드↔아이템계, →엔딩, 사망 리스폰 |
| **C3 스냅샷 전환** | 라이브 화면을 텍스처로 굳혀 조작 | 스냅샷으로 동결 후 라이브 숨김 | RenderTexture(스케일·블러) + 크로스페이드 | 프롤로그 컷신 줌, 아이템계 성장 스냅샷, 동결 |

**제1원칙:** 한 전환은 C1·C2·C3 중 **정확히 하나**다. 한 전환 안에서 커버 방식을 혼용하지 않는다. (단색 위에 스냅샷을 겹치는 혼용이 z·타이밍 충돌 → 플래시.)

---

## 2. 정규 3단계 계약 (C2·C3 공통)

```
COVER (out)   t:0→1   커버 alpha 0→1     배경: 마지막 프레임 그대로 정지. 콘텐츠 불변.
SWAP (atomic) ────    커버 alpha == 1    배경: 파괴→생성→카메라/스케일 목표값 즉시 스냅.
                                          게임플레이 업데이트 0. 최소 1프레임 렌더(검증).
REVEAL (in)   t:1→0   커버 alpha 1→0     배경: 새 콘텐츠 정지 표시. reveal 끝 → 입력 해제.
```

- **SWAP은 반드시 alpha==1 구간 안에서만** 일어난다.
- **REVEAL은 검증 프레임 1장 이후에만** 시작한다.
- 이 두 줄이 깜빡임·타일 점멸을 제거하는 핵심이다.

---

## 3. 불변 규칙 (Invariants R1–R9)

| ID | 규칙 |
| :--- | :--- |
| **R1** | **단일 전환 권위.** 모든 C2·C3는 하나의 `TransitionDirector`를 거친다. 플로우가 자체 커버·상태머신을 만드는 것을 금지. |
| **R2** | **커버는 최상단 단일 레이어.** 모든 커버는 씬 rebuild 경계 *바깥*의 단일 최상위 `TransitionLayer`에만 그린다. HUD보다 위. `loadLevel`이 파괴하는 컨테이너 안에 절대 두지 않는다. |
| **R3** | **콘텐츠 교체는 alpha==1에서만.** 타일맵 rebuild·룸/씬 스왑·카메라·스케일 변경은 전부 SWAP 안에서. 커버가 불투명해지기 전·투명해진 후에 배경을 만지지 않는다. |
| **R4** | **SWAP 후 검증 프레임.** 새 콘텐츠 생성 후 카메라/스케일을 **lerp 아닌 즉시 스냅**으로 목표에 두고, 1프레임 렌더 뒤에 REVEAL 시작. |
| **R5** | **C1은 배경을 절대 rebuild 안 함.** 메뉴·인벤·대화·포즈는 월드 컨테이너를 parented·visible 유지(update만 정지). 디밍은 알파 패널, 콘텐츠 파괴 금지. |
| **R6** | **커버 방식 단일.** 한 전환은 단색(C2) 또는 스냅샷(C3) 하나만. 순차 연결(컷신 끝→검은 커버→로드)은 phase 분리로 허용하되 겹치지 않는다. |
| **R7** | **색의 의미 고정.** §4 색 매핑 표를 따른다. 임의 색 금지 — 색이 전환의 의미를 전달한다. |
| **R8** | **전환 전구간 입력·물리·AI 정지.** COVER 시작부터 REVEAL 종료까지 플레이어 입력·물리·적 AI 정지. reveal 완료 시점에만 해제. |
| **R9** | **duration 토큰화.** §5 토큰 표의 상수로만. 매직넘버 금지. 현 `fadeDurationMs` 산재를 한 곳으로. |

---

## 4. 색의 의미 (R7 매핑)

| 색 | 의미 | 적용 전환 |
| :--- | :--- | :--- |
| **black** | 중립 — 이동·씬 교체·**사망 리스폰** | 엣지 룸 스왑, 월드↔아이템계 일반, →엔딩, 사망 후 리스폰 |
| **white** | 서사적 단절 — 말소·다이브·각성 | 프롤로그 다이브, 말소자 이벤트, 컷신 white-out/in |
| **rarity color** | 아이템계 포탈 신호 | 아이템계 진입 signal_cut (포탈 cutout) |

> **사망 리스폰 = black** (2026-06-06 결정). 비서사 전환이므로 white(서사 단절) 의미와 분리한다. white는 말소·다이브·각성 등 *의도된 서사 단절*에만 쓴다.

---

## 5. duration 토큰 (R9)

| 토큰 | 값(초안) | 용도 |
| :--- | :--- | :--- |
| `ROOM_SWAP` | 180ms | C2 엣지 룸 스왑 (COVER·REVEAL 각각) |
| `SCENE_SWAP` | 320ms | C2 월드↔아이템계, →엔딩 |
| `DEATH_RESPAWN` | 280ms | C2 사망→리스폰 (black) |
| `CUTSCENE` | 가변 | C3 컷신 — shot별 타임라인이 정의 |
| `OVERLAY_DIM` | 120ms | C1 딤 인/아웃 |

값은 초안이며 플레이 감각으로 조정한다. SSoT는 코드 상수 한 곳(`TransitionTokens`)이며 본 표와 동기화한다.

---

## 6. TransitionDirector API (단일 진입점)

플로우는 아래 세 동사 외의 경로로 전환을 일으킬 수 없다.

| 동사 | 분류 | 시그니처(개념) | 보장 |
| :--- | :--- | :--- | :--- |
| `coverSwapReveal` | C2 | `{ cover, durationOut, durationIn, onSwap }` | `onSwap`을 alpha==1에서 **동기** 실행 + 검증 프레임 1장 + 입력 잠금(R8) |
| `overlay` | C1 | `enter() / exit()` | 배경 rebuild 없음 보장만. 딤·정지만. |
| `snapshotTransition` | C3 | `{ capture, manipulate, swapAt }` | 캡처→라이브 숨김 순서 보장 + **복귀 시 크로스페이드 강제** |

- `onSwap`은 콜백 안에서 룸/씬 파괴·생성·카메라 스냅을 **동기로** 끝낸다. 비동기 텍스처 로드가 있으면 로드 완료를 await한 뒤 검증 프레임을 센다.
- **C3 복귀 = 크로스페이드 강제** (2026-06-06 결정, 퀄리티 우선). 스냅샷과 라이브를 동시 표시한 뒤 알파를 교차해 복귀한다. 프레이밍이 픽셀 단위로 일치하더라도 하드 스왑을 쓰지 않는다 — 1프레임 불일치 리스크를 원천 제거.

---

## 7. 기존 시스템 → 분류 매핑·통합 대상 (전면 교체)

| 현재 파일 | 분류 | 조치 |
| :--- | :--- | :--- |
| `WorldEdgeTransitionRuntime` | C2 | `coverSwapReveal()`로 흡수 (현 phase 계약에 가장 근접) |
| `stepLegacyWorldTransition` (`WorldTransitionHelpers`) | C2 중복 | **제거** (R1) |
| `TransitionFadeHelpers` | 보조 | Director 내부 보간 유틸로 흡수 |
| `TransitionOverlay` (signal_cut) | C2 (다이제틱 cutout) | Director cover 스킨으로 편입 (rarity color) |
| `ItemWorldGrowthSnapshotController` | C3 | `snapshotTransition()`로 편입 |
| `WorldFrozenSnapshotRuntime` / `WorldFrozenReturnRuntime` | C3 | `snapshotTransition()`로 편입 |
| 프롤로그 컷신 (`Task_Scene_PrologueCutscene.md`) | C3 | `snapshotTransition()` 위에 shot 타임라인 |
| `PortalTransition` / `WorldPullIn(TransitionController)` | C3 다이제틱 | 편입 또는 폐기 판정(후속) |
| `ItemWorldReturnFadeRuntime` / `ItemWorldExitFadeRuntime` | C2 | `coverSwapReveal()`로 흡수 |
| 각종 `*FlowRuntime` (Anvil/Edge/Portal/Fixed/ItemWorldScene) | C2 오케스트레이션 | 자체 커버·타이머 제거, Director 호출만 남김 |
| Pause / Inventory / Acquire / Dialogue 오버레이 | C1 | 배경 rebuild 없음 검증만 (대개 이미 준수) |

---

## 8. 인수 기준 (Acceptance)

- [ ] 모든 C2·C3 전환이 `TransitionDirector` 단일 경로를 거친다 (R1). 자체 fade 상태머신 0개.
- [ ] 커버 Graphics/RenderTexture 소유자가 `TransitionLayer` 하나로 통일 (R2).
- [ ] 엣지 룸 스왑에서 타일 점멸·카메라 슬라이드 미발생 — SWAP 후 카메라 즉시 스냅 + 검증 프레임 (R3·R4).
- [ ] `stepLegacyWorldTransition` 및 중복 fade 헬퍼 삭제, 참조 0.
- [ ] 색 매핑(black/white/rarity) 위반 0 — 사망 리스폰 black 확인 (R7).
- [ ] 전환 전구간 입력·적 AI 정지, reveal 종료 시 해제 (R8).
- [ ] duration 매직넘버 0, `TransitionTokens` 단일 소스 (R9).
- [ ] C3 복귀 크로스페이드 적용 — 프롤로그 컷신 라이브 복귀에서 하드 컷 프레임 미발생.

---

## 9. 후속 (별도 Task)

본 문서는 **사양**이다. 구현(Director 신설 + 30+ 파일 전면 흡수)은 별도 Task로 분리한다 — 범위가 크므로 단일 PR이 아닌 단계 커밋(Director 골격 → C2 흡수 → C3 흡수 → 레거시 제거)로 진행하되, 각 단계가 본 §8 인수 기준의 부분집합을 만족하도록 한다.
