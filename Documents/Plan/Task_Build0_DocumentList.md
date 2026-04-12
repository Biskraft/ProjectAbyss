# Build 0 문서 작업 통합 목록

> **작성일:** 2026-04-13
> **목적:** Build 0(내부 검증) 완성에 필요한 모든 문서 작업을 단일 목록으로 관리
> **분류:** A = 역기획 (코드 -> 문서) / B = 정합성 수정 / C = 신규 기획

---

## 범례

| 타입 | 의미 | 작업 방법 |
|:-----|:-----|:----------|
| A-역기획 | 코드에 구현되었으나 설계 문서 없음 | `/reverse-document`로 코드에서 문서 추출 |
| B-정합성 | 문서 있으나 코드/설계와 불일치 | 기존 문서 수정 |
| C-신규 | 코드도 문서도 없음, 새로 기획 필요 | `/design-system` 또는 `/metroidvania-gdd`로 작성 |

---

## 통합 목록 (우선순위순)

### Tier 1: 즉시 필수 (Build 0 블로커)

| # | 타입 | 대상 | 소스 코드 | 작업 내용 |
|:--|:-----|:-----|:----------|:----------|
| 01 | B-정합성 | **System_Growth_Stats.md** | `data/stats.ts` (7필드) | 6스탯 본문 전면 삭제 + ATK/INT/HP 3스탯 재작성. DEC-009 |
| 02 | B-정합성 | **System_Combat_Damage.md** | `data/damage.ts` | MP/회피 활성 섹션 전면 삭제. DEC-009 |
| 03 | B-정합성 | **System_World_ZoneDesign.md** | - | Concordia Hub -> Save Point Concordia 개명. DEC-009 |
| 04 | B-정합성 | **Content_Stats_Enemy.csv** | `data/enemyStats.ts` | Skeleton HP 80 vs 50, Ghost XP 8 vs 15 SSoT 확정 |
| 05 | B-정합성 | **Content_Stats_Weapon_List.csv** | `data/weapons.ts` | MPCostSkill 컬럼 삭제 |
| 06 | B-정합성 | **Document_Index.md** | - | DEPRECATED 항목 정리 + 신규 문서 ID 반영 |

### Tier 2: 역기획 - 구현 완료 / 문서 없음

| # | 타입 | 문서명 (신규) | 소스 코드 | 핵심 내용 |
|:--|:-----|:-------------|:----------|:----------|
| 07 | A-역기획 | **System_Save_DataSchema.md** | `utils/SaveManager.ts` | v3 세이브 포맷, localStorage, 마이그레이션 전략, 필드 목록 |
| 08 | A-역기획 | **UI_HUD_Layout.md** | `ui/HUD.ts` | HP바, Gold 카운터, 지층 표시기, 위치/크기/색상 |
| 09 | A-역기획 | **UI_Inventory.md** | `ui/InventoryUI.ts` | 20슬롯(5x4), 장비 비교, 레어리티 색상, 이노센트 표시 |
| 10 | A-역기획 | **System_Enemy_Spawning.md** | `data/itemWorldSpawnTable.ts`, `data/enemyStats.ts`, `ItemWorldScene.ts` | weight 기반 스폰, 리스폰 규칙, GoldenMonster 희귀도, CSV SSoT |
| 11 | A-역기획 | **System_World_Hazards.md** | `entities/Spike.ts`, `GrowingWall.ts`, `CrackedFloor.ts`, `CollapsingPlatform.ts`, `Updraft.ts` | 가시(20%HP), 증식벽, 붕괴바닥, 붕괴플랫폼, 상승기류 - 5종 환경 위험요소 |
| 12 | A-역기획 | **System_World_Interactables.md** | `entities/Anvil.ts`, `Altar.ts`, `Portal.ts`, `Switch.ts`, `LockedDoor.ts` | 모루(아이템계 진입), 제단, 포탈, 스위치, 잠긴 문 - 5종 상호작용 오브젝트 |
| 13 | A-역기획 | **System_Pickup_Items.md** | `entities/HealingPickup.ts`, `HealthShard.ts`, `GoldPickup.ts`, `items/ItemDrop.ts` | 회복(30HP), HP증가(+10), Gold, 장비 드롭 - 4종 획득물 |
| 14 | A-역기획 | **System_Effects_Transitions.md** | `effects/MemoryDive.ts`, `PortalTransition.ts`, `FloorCollapse.ts`, `ScreenFlash.ts`, `HitSpark.ts` | MemoryDive 5단계(3초), 포탈 전환 5단계(1.8초), 바닥 붕괴 8단계(3.4초), 화면 플래시, 히트 스파크 |
| 15 | A-역기획 | **System_UI_Notifications.md** | `ui/Toast.ts`, `ui/DamageNumber.ts`, `ui/TutorialHint.ts`, `ui/ControlsOverlay.ts` | 토스트 알림, 데미지 넘버(색상 3단계), 튜토리얼 힌트(4초), 조작 가이드 |
| 16 | A-역기획 | **System_Player_Abilities.md** | `entities/Player.ts` | 대시(렐릭), 벽점프/슬라이드, 더블점프, 다이브어택, 역류의 쇄도, 수중호흡 - FSM 상태 목록 + 파라미터 |

### Tier 3: 역기획 - 좀비 코드 (삭제 대상 문서화)

| # | 타입 | 대상 | 소스 코드 | 작업 내용 |
|:--|:-----|:-----|:----------|:----------|
| 17 | A-역기획 -> 삭제 | **DialogueManager / dialogues.ts / DialogueBox.ts** | `systems/DialogueManager.ts`, `data/dialogues.ts`, `ui/DialogueBox.ts` | 코드 삭제 전 의존성 기록. import 참조 목록 작성 후 제거 |
| 18 | A-역기획 -> 삭제 | **stats.ts 레거시 필드** | `data/stats.ts` | mp/str/dex/vit/spd/lck 7필드 삭제. #01과 연동 |
| 19 | A-역기획 -> 삭제 | **ThoughtBubble.ts** | `ui/ThoughtBubble.ts` | 에르다 독백 UI. 침묵 공리(DEC-009)에 의해 삭제 대상. 사용처 확인 후 제거 |
| 20 | A-역기획 -> 삭제 | **VirtualPad.ts** | `ui/VirtualPad.ts` | 모바일 가상패드. 모바일 미지원으로 삭제됨. 코드 잔재 제거 |

### Tier 4: 신규 기획 (코드 없음)

| # | 타입 | 문서명 (신규) | 빌드 | 작업 내용 |
|:--|:-----|:-------------|:-----|:----------|
| 21 | C-신규 | **Design_Art_AnimationSpec.md** | B0 | 스프라이트 크기 규격, 키프레임 원칙, 프레임수 표. 리서치: `PixelArt_Animation_Principles_Research.md` |
| 22 | C-신규 | **Content_Weapon_List.md** | B0 | 검 1종 x 5레어리티 상세 (MVP). 이후 대검/단검/활/지팡이 추가 |
| 23 | C-신규 | **Content_Monster_Bestiary.md** | B0 | Slime/Skeleton/Ghost/GoldenMonster/Guardian 5종 문서화. CSV 기반 |

---

## 작업 순서 권고

```
Phase A: 정합성 수정 (Tier 1: #01-06)
 ├─ 문서 SSoT 확정이 모든 후속 작업의 기반
 └─ 예상: 1 세션

Phase B: 좀비 코드 제거 (Tier 3: #17-20)
 ├─ 삭제 전 의존성 기록 -> 코드 삭제 -> import 정리
 └─ 예상: 1 세션

Phase C: 역기획 (Tier 2: #07-16)
 ├─ 병렬 가능: 독립적인 문서끼리 동시 작성
 ├─ 우선: #07 Save, #08 HUD, #10 Spawning (게임 핵심)
 ├─ 다음: #11 Hazards, #12 Interactables, #16 Abilities
 └─ 나중: #09 Inventory, #13 Pickups, #14 Effects, #15 Notifications
 └─ 예상: 2-3 세션

Phase D: 신규 기획 (Tier 4: #21-23)
 ├─ #21 애니메이션 스펙 (에셋 제작 전 필수)
 ├─ #22 무기 목록 (밸런스 기준점)
 └─ #23 몬스터 도감 (적 밸런스 기준점)
 └─ 예상: 1 세션
```

---

## 통계

| 타입 | 건수 | 세션 |
|:-----|:----:|:----:|
| B-정합성 수정 | 6 | 1 |
| A-역기획 (문서화) | 10 | 2-3 |
| A-역기획 -> 삭제 (좀비 코드) | 4 | 1 |
| C-신규 기획 | 3 | 1 |
| **합계** | **23** | **5-6** |

---

## 코드-문서 매핑 전체표

어떤 코드 파일이 어떤 문서에 대응하는지 전수 매핑.

| 소스 파일 | 기존 GDD | 상태 |
|:----------|:---------|:-----|
| `core/Scene.ts` | - | 엔진 내부, 문서 불필요 |
| `core/SceneManager.ts` | - | 엔진 내부, 문서 불필요 |
| `core/InputManager.ts` | System_3C_Control.md | Done |
| `core/Physics.ts` | System_3C_Character.md | Done |
| `core/Camera.ts` | System_3C_Camera.md | Done |
| `core/AssetLoader.ts` | - | 엔진 내부, 문서 불필요 |
| `Game.ts` | - | 엔진 내부, 문서 불필요 |
| `scenes/TitleScene.ts` | - | 엔진 내부, 문서 불필요 |
| `scenes/LdtkWorldScene.ts` | System_World_MapStructure.md | Done |
| `scenes/WorldScene.ts` | System_World_ProcGen.md | Done |
| `scenes/ItemWorldScene.ts` | System_ItemWorld_Core.md | Done |
| `scenes/EndScene.ts` | - | 엔진 내부, 문서 불필요 |
| `entities/Player.ts` | System_3C_Character.md | Done (렐릭 부분 보강 -> **#16**) |
| `entities/Enemy.ts` | System_Enemy_AI.md | Done |
| `entities/Skeleton.ts` | System_Enemy_AI.md | Done |
| `entities/Ghost.ts` | System_Enemy_AI.md | Done |
| `entities/Slime.ts` | System_Enemy_AI.md | Done |
| `entities/Guardian.ts` | System_ItemWorld_Boss.md | Done |
| `entities/GoldenMonster.ts` | System_Enemy_AI.md | Done |
| `entities/InnocentNPC.ts` | System_Innocent_Core.md | Done |
| `entities/Projectile.ts` | System_Enemy_AI.md | Done |
| `entities/Spike.ts` | 없음 | **#11 역기획** |
| `entities/GrowingWall.ts` | 없음 | **#11 역기획** |
| `entities/CrackedFloor.ts` | 없음 | **#11 역기획** |
| `entities/CollapsingPlatform.ts` | 없음 | **#11 역기획** |
| `entities/Updraft.ts` | 없음 | **#11 역기획** |
| `entities/Anvil.ts` | 없음 (System_ItemWorld_Core에 부분 언급) | **#12 역기획** |
| `entities/Altar.ts` | 없음 | **#12 역기획** |
| `entities/Portal.ts` | 없음 | **#12 역기획** |
| `entities/Switch.ts` | 없음 | **#12 역기획** |
| `entities/LockedDoor.ts` | System_World_StatGating.md | Done (부분) |
| `entities/HealingPickup.ts` | 없음 | **#13 역기획** |
| `entities/HealthShard.ts` | 없음 | **#13 역기획** |
| `entities/GoldPickup.ts` | 없음 | **#13 역기획** |
| `combat/CombatData.ts` | System_Combat_Action.md | Done |
| `combat/HitManager.ts` | System_Combat_HitFeedback.md | Done |
| `items/ItemInstance.ts` | System_Equipment_Growth.md | Done |
| `items/Inventory.ts` | System_Equipment_Slots.md | Done |
| `items/ItemDrop.ts` | 없음 | **#13 역기획** |
| `level/RoomGrid.ts` | System_ItemWorld_FloorGen.md | Done |
| `level/ChunkAssembler.ts` | System_ItemWorld_FloorGen.md | Done |
| `level/ItemWorldTemplates.ts` | System_ItemWorld_FloorGen.md | Done |
| `level/ItemWorldGridGen.ts` | System_ItemWorld_FloorGen.md | Done |
| `level/LdtkLoader.ts` | System_World_TileSystem.md | Done |
| `level/LdtkRenderer.ts` | System_World_TileSystem.md | Done |
| `level/TilemapRenderer.ts` | - | 엔진 내부, 문서 불필요 |
| `ui/HUD.ts` | 없음 | **#08 역기획** |
| `ui/InventoryUI.ts` | 없음 | **#09 역기획** |
| `ui/DialogueBox.ts` | DEPRECATED | **#17 삭제** |
| `ui/DamageNumber.ts` | 없음 | **#15 역기획** |
| `ui/Toast.ts` | 없음 | **#15 역기획** |
| `ui/ThoughtBubble.ts` | DEPRECATED | **#19 삭제** |
| `ui/TutorialHint.ts` | 없음 | **#15 역기획** |
| `ui/ControlsOverlay.ts` | 없음 | **#15 역기획** |
| `ui/WorldMapOverlay.ts` | System_UI_Minimap.md | Done |
| `ui/VirtualPad.ts` | DEPRECATED | **#20 삭제** |
| `ui/fonts.ts` | - | 엔진 내부, 문서 불필요 |
| `effects/MemoryDive.ts` | 없음 | **#14 역기획** |
| `effects/PortalTransition.ts` | 없음 | **#14 역기획** |
| `effects/FloorCollapse.ts` | 없음 | **#14 역기획** |
| `effects/ScreenFlash.ts` | System_Combat_HitFeedback.md | Done (부분) |
| `effects/HitSpark.ts` | System_Combat_HitFeedback.md | Done |
| `data/weapons.ts` | System_Combat_Weapons.md | Done |
| `data/enemyStats.ts` | System_Enemy_AI.md | Done |
| `data/innocents.ts` | System_Innocent_Core.md | Done |
| `data/damage.ts` | System_Combat_Damage.md | **#02 정합성** |
| `data/stats.ts` | System_Growth_Stats.md | **#01 정합성 + #18 삭제** |
| `data/dialogues.ts` | DEPRECATED | **#17 삭제** |
| `data/itemWorldSpawnTable.ts` | 없음 | **#10 역기획** |
| `data/memoryRoomTable.ts` | System_ItemWorld_Events.md | Done |
| `data/StrataConfig.ts` | System_ItemWorld_FloorGen.md | Done (필드명 불일치 수정 필요) |
| `systems/DialogueManager.ts` | DEPRECATED | **#17 삭제** |
| `utils/SaveManager.ts` | 없음 | **#07 역기획** |
| `utils/StateMachine.ts` | - | 엔진 내부, 문서 불필요 |
| `utils/PRNG.ts` | - | 엔진 내부, 문서 불필요 |
| `utils/Analytics.ts` | System_Analytics_Telemetry.md | Done (stub) |
| `main.ts` | - | 엔진 내부, 문서 불필요 |
