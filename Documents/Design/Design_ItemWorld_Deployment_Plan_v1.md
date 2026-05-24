# Item World Deployment Sequence v1 - 개발 계획서

> **상태:** Draft / 구현 전 합의 단계
> **상위 디자인:** `ECHORIS - Item World Deployment Sequence v1` (사용자 디자인 노트, 2026-05-22)
> **스파이크 정합:** "아이템에 들어가면, 그 안에 살아있는 세계가 있다" 강화. 포탈 메타포 폐기, "압축된 세계가 빌더에 의해 전개된다"로 전환.
> **요지:** 현재의 `링 포탈 + Echo walks in` 진입 연출을 폐기하고, `빌더가 벽을 천공 → 플레이어가 직접 걸어 들어감` 으로 교체.

---

## 1. 목표 한 줄

빌더를 "건축 기계" 로 재정의해, 아이템 = 압축된 세계라는 스파이크를 진입 연출 자체로 보여주고, 플레이어 조작권을 마지막에 돌려준다.

---

## 2. 현재 시스템 진단

### 2.1 제거 (Delete)

| 대상                                                   | 위치                                                  | 사유                                                                            |
| :----------------------------------------------------- | :---------------------------------------------------- | :------------------------------------------------------------------------------ |
| `PortalRingEffect`                                     | `game/src/effects/PortalRingEffect.ts`              | "포탈" 메타포 자체가 폐기. 링/흡인 파티클은 새 컨셉에 시각적으로 충돌.          |
| `EchoPlayer` 의 `walkIntoPortal` 시퀀스               | `game/src/effects/EchoPlayer.ts` + Controller       | "플레이어가 직접 걸어 들어감" 요구와 정면 충돌. Echo 자체도 사용 안 함.         |
| `RealityPeelingEffect`                                 | `game/src/effects/RealityPeelingEffect.ts`          | 픽셀 박리 효과 = "현실이 벗겨진다" 메타. 새 컨셉(천공)과 의미 중복/충돌.        |
| `ItemWorldTransitionController` 전체 5단계 (activate to fade_out_hold) | `game/src/effects/ItemWorldTransitionController.ts` | 시퀀스 골격을 새 상태 머신으로 교체. 단, `BgmController.setVolumeFactor` 호출 패턴은 차용. |
| `triggerFloorCollapse` 의 zoomIn(2배)                  | `LdtkWorldScene.ts:9106`                            | 새 컨셉은 zoomOut. 방향 반전.                                                  |
| `FloorCollapse` 클래스                                 | `game/src/effects/FloorCollapse.ts`                 | 이미 archived 처리되어 호출되지 않음. 이번에 정식 삭제 후보 (다른 참조 없는지 grep 후 결정). |

### 2.2 유지 (Keep)

| 자산                                                         | 활용 방식                                                                       |
| :----------------------------------------------------------- | :------------------------------------------------------------------------------ |
| Anvil 상호작용 (`openAnvilUI`, `placeItemOnAnvil`)         | Stage 1 그대로. 후속 호출만 새 시퀀스 시작 함수로 교체.                         |
| `Anvil.placeItem(item)` (아이템 sprite + glow)               | Stage 1 결과물. 그대로.                                                         |
| `GiantBuilder` 인프라 (LED `BuilderLight`, `LegRig`, shake) | Stage 2 (awakening) 의 시각 신호로 직접 활용.                                  |
| `Camera.zoomTo / shake / snap`                               | Stage 3/4/6 의 모든 카메라 워크.                                                |
| `BgmController.setVolumeFactor`                              | Stage 2 hum 진입 시 dim, Stage 8 fade 시 stop.                                |
| `TransitionOverlay` (검은 화면 hold)                         | Stage 8 의 0.25s fade 만 사용. signal_cut/scanline 미사용.                     |
| `ItemWorldScene` push 경로 (`enterItemWorldFromTunnel`)      | Stage 8 최종 진입. 진입 직전 호출 site 만 새 진입 트리거로 교체.                |
| `sacredSave.incrementDive` / `sacredSave.markFirstDiveDone` | 통계/세이브 hook. 호출 위치만 새 시퀀스 onComplete 로 이동.                     |

### 2.3 신규 (Build)

| 컴포넌트                                | 책임                                                                                          |
| :-------------------------------------- | :-------------------------------------------------------------------------------------------- |
| `ItemDeploymentController` (신규 클래스) | 9-state machine. 시퀀스 전체 오케스트레이션. `ItemWorldTransitionController` 자리를 대체.    |
| `WallGate` 엔티티 (신규 LDtk Entity + TS 클래스) | 빌더 레벨 내 "천공 대상 벽". 4상태 sprite (normal/crack01/crack02/hole) + 상호작용 AABB. |
| `PileDriver` (신규 컨테이너)             | 빌더 body 내부에서 돌출되는 천공 암. 3-stroke 애니메이션 + 마지막 프레임 정지.               |
| `ItemWorldLeakageLayer` (신규 컨테이너)  | 구멍 뒤에 마스크되어 보이는 "안쪽 세계" 프리뷰 (orange glow + fog + silhouette).             |
| 자산 (Stage 4-5)                        | 벽 sprite 4종 + 파일드라이버 atlas + 프리뷰 실루엣 sprite.                                  |

---

## 3. 새 아키텍처

### 3.1 상태 머신 (`ItemDeploymentController`)

```
Idle
 -> ItemInserted        (Anvil.placeItem 직후, 500 ms)
 -> Awakening           (1000 ms, builder eye/LED/hum/shake1-2)
 -> CameraPullBack      (700 ms, camera.zoomTo target)
 -> WallDeployment      (2000 ms = 3 strikes x ~650 ms + 처리)
 -> WorldLeakage        (300 ms cross-fade, Deployment 말미 overlap 가능)
 -> CameraReturn        (500 ms, camera.zoomTo 1.0)
 -> Deployed            (idle, 입력 해제. 영구 상태)
 -> EnteringWorld       (player AABB ∩ entrance AABB 트리거. 250 ms fade -> push scene)
```

- **전부 time-driven.** 외부 input 없이 elapsed 로만 분기. `Deployed` 만 player overlap event 대기.
- **재사용 단위 = item.** 시퀀스 동안 `this.item: ItemInstance` 한 개를 들고 가다 마지막 step 에서 `ItemWorldScene` 생성자에 전달.
- **scene tick** 에서 `controller?.update(dt)` 호출. controller 가 `Deployed` 직전까지 `game.input.inputLocked = true` 유지.

### 3.2 신규 컴포넌트 책임 분리

```
ItemDeploymentController
  - state machine + tick
  - input lock / unlock
  - BgmController hook
  - 자식: PileDriver, ItemWorldLeakageLayer (lifecycle 소유)
  - 외부: builder, anvil, wallGate, camera, player (참조)

WallGate
  - 4-state sprite swap (setStage 0..3)
  - 마지막 stage 에서 entrance AABB enable
  - player overlap 시 onEnter callback 발화

PileDriver
  - 빌더 body 내부 attach point 에서 spawn
  - 3 strokes 의 timeline (extend - impact - retract)
  - 각 stroke 의 impact 프레임에 onImpact(strikeIdx) callback 발화

ItemWorldLeakageLayer
  - WallGate 의 hole sprite 와 같은 영역 mask
  - 내부: 1 layer of orange radial gradient + 1 layer of drifting fog + 2-3 floating silhouettes
  - 알파 0 -> 1 페이드 (300 ms)
```

### 3.3 데이터 흐름

```
Player C(ATTACK) on Anvil
  -> openAnvilUI (기존)
  -> placeItemOnAnvil(item) (기존 검증 흐름 그대로)
  -> anvil.placeItem(item) (sprite 부착, 기존)
  -> NEW: this.itemDeployment = new ItemDeploymentController({...})
        .start(item, anvil, wallGate)
  (기존: triggerFloorCollapse() 호출 사이트 교체)
```

---

## 4. Stage 별 매핑

각 stage 의 "구현 위치" 와 "받는 입력 / 내는 출력" 만 명시. 시간 값은 디자인 노트 기준.

### S1. Anvil Interaction (500 ms)

- **트리거:** `placeItemOnAnvil` 마지막 줄에서 `controller.start(item)` 호출.
- **수행:** `inputLocked = true`, `anvil.placeItem(item)` 호출 (기존 함수 그대로), anvil halo 강조 0.5 초.
- **종료 조건:** elapsed 500 ms.

### S2. Awakening (1000 ms)

- **수행:**
  - `GiantBuilder` 의 lights 전부 `onlyWhileMoving=false` 강제 + max intensity (controller 가 builder.setForceLights(true) 같은 신규 API 호출).
  - `BgmController.setVolumeFactor(0.4, 500)` (current 0.25 보다 살짝 높게, 기계음과 공존).
  - `camera.shake(1.5)` 를 250 ms 마다 4 회 (subtle).
- **신규 API:** `GiantBuilder.setAwakeningMode(boolean)` - lights 강제 ON 토글.
- **종료 조건:** elapsed 1500 ms (S1 + S2 누적).

### S3. CameraPullBack (700 ms)

- **수행:**
  - `camera.zoomTo(target, 0.06)`. target 은 builder 전체 + 우측 wallGate 영역이 viewport 에 들어가는 값. 임시 0.55 ~ 0.65 (실측 필요).
  - 카메라 follow 대상은 잠시 builder.container 의 중심으로 이동 (player follow 해제). 신규: `camera.setTarget(staticPos)`.
- **종료 조건:** elapsed 2200 ms.

### S4. WallDeployment (2000 ms = 3 strikes)

- **수행:**
  - `PileDriver` spawn at builder local pos. extend (~150 ms) -> impact frame -> retract (~150 ms) per stroke. stroke gap 200 ms.
  - 각 impact 에 동기:
    - `camera.shake(strikeIdx === 2 ? 12 : 6)` (마지막 일격이 가장 큼)
    - `wallGate.setStage(strikeIdx + 1)` (1, 2, 3)
    - hit spark + dust at wallGate impact point (기존 `hitSparks` 재사용)
    - SFX: `pile_driver_strike` (variant 1/2/3)
  - 마지막 stroke 직후 (~50 ms 후) `wallGate.enableEntrance()` 호출 -> entrance AABB 활성.
- **종료 조건:** elapsed 4200 ms.

### S5. WorldLeakage (300 ms, S4 말미와 overlap)

- **수행:**
  - `wallGate.setStage(3)` 이 호출되는 순간 `ItemWorldLeakageLayer` 알파를 0 에서 1 로 300 ms 동안 페이드.
  - 내부 fog/실루엣 sub-anim 은 자체 update 로 계속 흐름 (controller 와 무관).
- **종료 조건:** S4 종료와 동시 (시간 누적 = 4200 ms).

### S6. CameraReturn (500 ms)

- **수행:**
  - `camera.zoomTo(1.0, 0.08)`.
  - `camera.setTarget(player.container)` (follow 복귀).
- **종료 조건:** elapsed 4700 ms.

### S7. Deployed (idle, 영구)

- **수행:**
  - `inputLocked = false`.
  - controller 는 `EnteringWorld` 전환만 대기 (매 프레임 player AABB vs wallGate entrance AABB 검사).
  - 빌더 LED 는 awakening 모드 유지 (deployed 표식). `setAwakeningMode(true)` 그대로.
- **종료 조건:** player overlap.

### S8. EnteringWorld (250 ms fade + push)

- **수행:**
  - overlap 검출 즉시 `inputLocked = true`, `player.vx = 0`.
  - `TransitionOverlay` 검은 페이드 250 ms.
  - 페이드 완료 시 `sacredSave.incrementDive`, `sacredSave.markFirstDiveDone`, `ItemWorldScene` push (기존 `enterItemWorldFromTunnel` 의 push 블록 재사용 - 함수 분리 추출).
- **종료 조건:** scene 전환 완료.

---

## 5. 마일스톤

각 마일스톤은 독립적으로 머지 가능한 단위. acceptance criteria 명시.

### M1 - 기본 카메라/시퀀스 골격 (no art)

- `ItemDeploymentController` skeleton + 9-state machine.
- placeholder: 모든 시각 효과는 디버그 사각형/색 변경으로만.
- `camera.zoomOut -> hold -> zoomIn` 까지 정상 작동.
- **Acceptance:**
  - anvil 에 아이템 넣으면 카메라가 0.6 까지 줌아웃 -> 2 초 hold -> 1.0 복귀.
  - 시퀀스 끝나면 wallGate placeholder (빨간 사각형) 가 화면에 보임.
  - 그 사각형에 걸어 들어가면 `ItemWorldScene` push.

### M2 - Builder 각성 신호

- `GiantBuilder.setAwakeningMode(boolean)` 구현.
- `BgmController` dim hook + hum SFX (audio events SSoT 에 신규 항목 등록).
- shake 4 회 micro-pulse.
- **Acceptance:** S2 단계에서 builder LED 가 전부 켜지고 hum 이 들리며, 1-2 px shake 4 회가 250 ms 간격으로 들어옴.

### M3 - 벽 천공 (PileDriver + WallGate sprite)

- `WallGate` 엔티티 (LDtk Entity 정의 + TS class) + 4 sprite stage.
- `PileDriver` 컨테이너 + 3-stroke 타임라인 + impact callback.
- impact 마다 wallGate stage advance + shake + spark.
- **Acceptance:**
  - 3 회 타격이 화면에 보이고, 각 타격마다 벽 sprite 가 교체됨 (normal -> crack01 -> crack02 -> hole).
  - 마지막 타격 shake 가 가장 큼.
  - 모든 impact frame 에서 hitSparks + dust 발생.

### M4 - Item World Leakage 프리뷰

- `ItemWorldLeakageLayer` 구현 (mask + glow + fog + 2 silhouette).
- M3 의 hole stage 와 알파 cross-fade.
- **Acceptance:**
  - hole 안쪽에 orange radial glow 가 보임.
  - fog 가 천천히 좌우로 움직임.
  - 작은 platform 실루엣 1-2 개가 부유.
  - 30 fps 환경에서 60 fps 유지 (성능 budget).

### M5 - Player Entry + Scene Push

- `WallGate.entrance` AABB + overlap 검사 + `EnteringWorld` 상태.
- 기존 `enterItemWorldFromTunnel` 의 push 코드 추출해 controller 가 호출.
- 250 ms fade.
- **Acceptance:**
  - Deployed 상태 진입 후 inputLocked false 확인.
  - 플레이어가 직접 걸어/점프해서 hole 안에 들어가면 fade -> ItemWorldScene 로딩.
  - 의도하지 않은 자동 텔레포트 0 건.

---

## 6. 자산 요구

### 6.1 스프라이트

| 자산                         | 크기 가이드               | 비고                                              |
| :--------------------------- | :------------------------ | :------------------------------------------------ |
| `wall_normal_01.png`       | 1 셀 (32x32) 또는 2 셀 폭 | wallGate 가 차지하는 영역 기준. 빌더 톤과 정합.  |
| `wall_crack_01.png`        | 동일                      | 균열 약                                          |
| `wall_crack_02.png`        | 동일                      | 균열 강                                          |
| `wall_hole.png`            | 동일                      | 알파 마스크 (hole 영역이 cut-out)                |
| `piledriver_01.png` (atlas) | 헤드 16x16, 샤프트 가변   | 3-frame extend/impact/retract                    |
| `iw_silhouette_platform.png` | 16x8 기준                 | 2-3 종. leakage layer 부유용                    |

### 6.2 오디오 (SSoT: `Sheets/Content_System_Audio_Events.csv`)

신규 등록 필요:

| 이벤트 ID                  | 트리거                  | 비고                |
| :------------------------- | :---------------------- | :------------------ |
| `builder_awaken_hum`     | S2 진입                 | loop, S6 종료 시 stop |
| `pile_driver_extend`     | 각 stroke extend frame  | one-shot            |
| `pile_driver_strike_1/2/3` | 각 impact frame         | 마지막은 크게        |
| `wall_breach`            | stage 3 sprite 교체     | one-shot, 가장 큼   |
| `iw_leak_ambient`        | S5 진입                 | loop, S8 fade 시 stop |
| `iw_entry_step`          | S8 overlap 첫 frame     | one-shot, 짧게      |

---

## 7. 리스크 & 미해결 질문

### 7.1 리스크

- **WallGate 위치:** 빌더의 어떤 벽인가? 빌더 LDtk 레벨 안에 새 엔티티를 추가해야 하므로 LDtk 작업이 선행되어야 함. 빌더-attached 형태로 만들면 anvil 과 동일하게 builder 이동에 따라옴 (좌표 이슈 회피).
- **Leakage 마스크 성능:** PixiJS 마스크 + 자식 컨테이너 + 필터 조합이 모바일/저사양에서 부담. silhouette/fog 는 sprite 기반으로 가볍게, glow 는 GlowFilter 1 회 (기존 anvil halo 패턴 차용).
- **Anvil 1회용 vs 재사용:** 현재 `anvil.used = true` 가 일회성을 강제하지만, 새 시퀀스에서는 wallGate 가 hole 상태로 영구 노출되면 두 번째 진입에서 어떤 UX 인가? "wallGate.hole 이 열린 동안은 anvil 시퀀스 스킵 가능, 다른 아이템 들어가면 다시 닫힘" 식 규칙 정의 필요.
- **이미 hole 인 상태 저장:** 세이브/리로드 시 wallGate 상태 보존 여부. v1 은 비보존 (레벨 재진입 시 reset) 로 시작 권장.

### 7.2 미해결 질문

| Q   | 질문                                                                                            | 기본 답안 (사용자 확정 전)                                          |
| :-- | :---------------------------------------------------------------------------------------------- | :------------------------------------------------------------------ |
| Q1  | wallGate 는 빌더 본체의 벽인가, 빌더 옆 host level 의 벽인가?                                   | 빌더 본체 (attachToBuilder 패턴 재사용)                            |
| Q2  | 1 회 시퀀스 후 wallGate 상태는 같은 세션 내 영구인가, 다른 아이템 넣으면 reset 인가?            | 영구 (다른 아이템도 같은 hole 로 진입). v2 에서 분기 검토.         |
| Q3  | 두 번째 아이템부터는 시퀀스 전체 스킵 + 즉시 hole 사용 가능인가?                                | 그렇다. anvil.used 의미 폐기, hole 유무가 진입 게이트.              |
| Q4  | 빌더가 이동 중이거나 cinematic 모드일 때 anvil 입력 차단 정책은?                                | 현재 anvil.disabled 정책 유지. 빌더 정지 상태에서만 허용.           |
| Q5  | 진입 후 ItemWorld 에서 돌아왔을 때 wallGate hole 은 보이는가?                                   | 보임 (영구). 같은 hole 로 재진입 가능.                              |
| Q6  | Anvil 한 번 사용으로 시퀀스 시작되면, 시퀀스 중 cancel 가능한가?                                | 불가. 한 번 시작되면 Deployed 까지 강제.                            |
| Q7  | "걸어 들어감" 트리거는 overlap 즉시인가, 또는 player input (DOWN/ENTER) 필요인가?               | overlap 즉시. 의도성은 hole 의 시각 분명함으로 보장.                |

---

## 8. 코드 터치 리스트 (구현 시작 시 참조)

### 신규 파일

- `game/src/effects/ItemDeploymentController.ts`
- `game/src/entities/WallGate.ts`
- `game/src/effects/PileDriver.ts`
- `game/src/effects/ItemWorldLeakageLayer.ts`

### 수정 파일

- `game/src/scenes/LdtkWorldScene.ts`
  - `triggerFloorCollapse()` 본문 교체 (전체 삭제 후 controller.start 호출 1 라인).
  - `runDiveTransition` 삭제.
  - `completeFloorCollapseEntry` 의 ItemWorldScene push 블록을 controller 가 호출 가능한 헬퍼로 추출.
  - WallGate 스폰: 기존 `spawnAnvilFromLdtk` 옆에 `spawnWallGateFromLdtk` 추가.
  - update tick 에 `itemDeployment?.update(dt)` 추가.
- `game/src/entities/GiantBuilder.ts`
  - `setAwakeningMode(boolean)` 추가 (lights 강제 ON).
- `game/src/entities/Anvil.ts`
  - `placeItem` 종료 시점에서 호출되는 `triggerFloorCollapse` 의존 제거 (시퀀스 시작은 scene 측에서).
- `Sheets/Content_System_Audio_Events.csv`
  - 6.2 표의 신규 이벤트 추가.

### 삭제 후보 (참조 정리 후)

- `game/src/effects/PortalRingEffect.ts`
- `game/src/effects/RealityPeelingEffect.ts`
- `game/src/effects/EchoPlayer.ts` (다른 호출 없으면)
- `game/src/effects/ItemWorldTransitionController.ts`
- `game/src/effects/FloorCollapse.ts` (이미 archived)

### LDtk 변경

- `game/public/assets/World_ProjectAbyss.ldtk` Builder 월드의 Builder_Level_1 (및 추후 다른 빌더 레벨) 에 `WallGate` 엔티티 정의 + 인스턴스 1 개 배치.

---

## 9. 결정 기록 (DEC 추후 등록)

본 계획이 사용자 승인을 받으면 다음 DEC 발행 권장:

- **DEC-042 (가제):** Item World 진입 연출 = 빌더 천공 모델. 포탈 메타포 폐기. ItemWorldTransitionController 5 단계 및 PortalRing/EchoPlayer/RealityPeeling 자산 삭제.

---

## 10. 다음 액션

1. **사용자 결정 필요:** 7.2 의 Q1 ~ Q7 답안 확정.
2. **자산 발주:** 6.1 의 6 종 sprite. PixelLab 또는 외주.
3. **오디오 발주:** 6.2 의 6 종 SFX. ElevenLabs 우선.
4. **LDtk 작업:** WallGate 엔티티 정의 + Builder_Level_1 배치.
5. **M1 부터 순차 구현:** 마일스톤 acceptance 통과 시점에만 다음 진행.
