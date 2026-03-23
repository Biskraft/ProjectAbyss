# Portal System Design Spec

## Overview

아이템계(Item World) 진입 방식을 인벤토리 기반에서 **월드 내 포탈 시스템**으로 전면 교체한다. 플레이어는 두 가지 방법으로 아이템계에 진입한다:

1. **노란 몬스터(Golden Monster) 처치** -> 해당 위치에 포탈 생성 -> 클리어 시 새 아이템 획득
2. **제단(Altar)에 아이템 바침** -> 제단 위치에 포탈 생성 -> 클리어 시 해당 아이템 강화

기존 인벤토리 -> 아이템계 진입 흐름은 완전히 제거된다.

## Entities

### 1. GoldenMonster

기존 `Enemy`를 확장한 특수 몬스터.

- **외형:** 금색, 기존 몬스터보다 약간 큰 스케일 (1.2x)
- **스탯:** 일반 몬스터 대비 HP x2, SPD x1.5. 공격적이고 빠름
- **스폰:** 맵 당 0~1마리. 방 생성 시 일정 확률로 배치
- **처치 시:** 사망 위치에 `Portal` 생성
- **포탈 등급 결정:** 맵 난이도(시작점으로부터의 거리) 기반 가중 랜덤
  - 낮은 난이도: Common 70%, Uncommon 25%, Rare 5%
  - 중간 난이도: Common 30%, Uncommon 40%, Rare 25%, Legendary 5%
  - 높은 난이도: Uncommon 20%, Rare 40%, Legendary 30%, Mythic 10%

### 2. Portal

월드에 배치되는 상호작용 오브젝트.

- **속성:**
  - `rarity`: Common | Uncommon | Rare | Legendary | Mythic
  - `sourceType`: 'monster' | 'altar'
  - `sourceItem?`: ItemInstance (altar일 때만)
  - `x, y`: 월드 좌표
- **색상 (레어리티별):**
  - Common: 0xffffff (흰)
  - Uncommon: 0x44ff44 (초록)
  - Rare: 0x4488ff (파랑)
  - Legendary: 0xaa44ff (보라)
  - Mythic: 0xffaa00 (금)
- **Idle 애니메이션:**
  - 타원형 포탈이 맥동 (scale oscillation)
  - 주변에 파티클이 천천히 떠다님
  - 레어리티가 높을수록 파티클 많고, 맥동 강함
- **상호작용:**
  - 플레이어가 AABB 겹침 + 위쪽 키 -> 진입
  - 가까이 가면 "UP: Enter" 힌트 텍스트 표시
- **수명:** 영구 유지. 진입 시 소멸

### 3. Altar

맵에 절차적 배치되는 고정 오브젝트.

- **배치:** 전체 월드맵에 1~2개. 방 생성 시 특정 방에 배치
- **외형:** 석조 제단 (Graphics로 그린 직사각형 + 장식)
- **상호작용:**
  - 플레이어가 AABB 겹침 + 위쪽 키 -> 아이템 선택 UI 열림
  - 인벤토리에서 강화할 아이템 선택 -> 제단 위치에 해당 등급의 포탈 생성
  - 아이템은 소모되지 않음 (강화 대상이므로)
- **선택 UI:** 간단한 팝업. 인벤토리 아이템 목록 표시, 방향키로 선택, Z키로 확정

## Design Principles (ref: Sakurai Masahiro)

사쿠라이 마사히로의 연출 원칙을 포탈 시스템에 적용한다.

1. **"큰 순간에는 멈춰라" (Stop for Big Moments)**
   - 포탈 생성 시 히트스톱(프레임 정지) + 플래시 + 카메라 쉐이크
   - 높은 레어리티일수록 정지 시간 길고, 플래시 강렬
   - Mythic 포탈 = "이건 대단한 거다"를 온몸으로 느끼게

2. **"화면 전환은 가능한 한 빠르게" (Speedy Transitions)**
   - 1.8초 연출이지만 각 페이즈에 빈 시간 없이 밀도 있게 구성
   - 연출 중 ItemWorldScene init을 병렬 실행하여 체감 대기 시간 제거

3. **이펙트 명암 대비 (Pop)**
   - 파티클에 밝은 코어 + 어두운 테두리(outline) 혼합
   - 색 가산(additive)만 쓰지 않음 -- 어떤 배경에서도 눈에 띄도록

4. **플래싱 이펙트**
   - 포탈 생성/진입 시 화면 전체 플래시 (밝은 색 + 어두운 프레임 교차)
   - 레어리티별 플래시 강도 차등

5. **과장 원칙 (130~150%)**
   - 파티클 속도, 포탈 맥동, 캐릭터 흡입 스케일을 현실보다 과장

6. **진동 패턴 차별화**
   - 단순 스케일 조정이 아닌, 소/중/대/특대별 진동 패턴 자체를 다르게
   - 진폭은 처음에 강하게 -> 점차 수렴, 약간의 랜덤성 포함

## Portal Spawn Effects

포탈이 월드에 생성될 때의 연출:

### 1. Hitstop (프레임 정지)

| Rarity | Freeze Duration | Description |
|:--|:--|:--|
| Common | 0ms (없음) | 가볍게 생성 |
| Uncommon | 50ms (3f) | 짧은 정지 |
| Rare | 100ms (6f) | 눈에 띄는 정지 |
| Legendary | 150ms (9f) | 확실한 정지 |
| Mythic | 200ms (12f) | 긴 정지 + "이건 대단하다" |

### 2. Flash

| Rarity | Flash | Description |
|:--|:--|:--|
| Common | 없음 | -- |
| Uncommon | 약한 흰색 1f | 미세한 번쩍임 |
| Rare | 흰색 2f + 어두운 1f | 명암 교차 |
| Legendary | 강한 흰색 3f + 어두운 2f | 강렬한 플래시 |
| Mythic | 흰색 4f + 레어리티색 2f + 어두운 2f | 황금빛 폭발 |

### 3. Camera Shake

| Rarity | Shake Intensity | Shake Duration | Pattern |
|:--|:--|:--|:--|
| Common | 1px | 0.2s | 약한 단발 |
| Uncommon | 2px | 0.3s | 보통 수렴 |
| Rare | 3px | 0.4s | 강한 수렴 |
| Legendary | 5px | 0.5s | 강렬 + 저주파 혼합 |
| Mythic | 8px | 0.7s | 폭발적 + 저주파 + 랜덤 |

## Portal Entry Animation

### Entry Timeline (total ~1.8s)

| Time | Phase | Description |
|:--|:--|:--|
| 0.0~0.1s | Flash | 화면 플래시 (밝은 색 + 어두운 프레임 교차), 히트스톱 |
| 0.1~0.4s | Portal Pulse + Shake | 포탈이 맥동하며 1.5x로 확대, 파티클 폭발적 방출, 쉐이크 시작 |
| 0.4~0.9s | Player Absorption | 캐릭터가 포탈 중심으로 흡입 (축소 + 회전), 쉐이크 강도 증가 |
| 0.9~1.3s | Text Display | 아이템 정보 텍스트 페이드인 (center), 쉐이크 유지 |
| 1.3~1.8s | Screen Fill | 포탈 색상이 화면을 삼킴, 쉐이크 감쇠, 씬 전환 |

NOTE: 0.1~1.3s 구간에 ItemWorldScene.init()을 비동기로 병렬 실행

### Entry Camera Shake

진입 연출 중 카메라 흔들림 (레어리티에 비례, 진폭 수렴 패턴):

| Rarity | Peak Intensity | Pattern |
|:--|:--|:--|
| Common | 2px | 약한 단발 진동 |
| Uncommon | 3px | 보통 수렴 진동 |
| Rare | 5px | 강한 수렴 + 약간의 랜덤 |
| Legendary | 8px | 강렬한 수렴 + 저주파 혼합 |
| Mythic | 12px | 폭발적 수렴 + 저주파 + 랜덤 |

### Text Display Rules

- **Monster portal:** "??? [RARE]" -- 등급만 표시, 아이템 이름은 숨김 (기대감)
- **Altar portal:** "Iron Sword Lv3 [RARE]" -- 바친 아이템 정보 표시

### Rarity Intensity Scaling (Portal Idle)

| Rarity | Portal Size | Particle Count | Pulse Speed |
|:--|:--|:--|:--|
| Common | 20px | 5 | 느림 |
| Uncommon | 24px | 8 | 보통 |
| Rare | 28px | 12 | 빠름 |
| Legendary | 32px | 16 | 매우 빠름 |
| Mythic | 36px | 24 | 격렬함 |

## Item World Dungeon

포탈 진입 후 던전 구조는 기존 ItemWorldScene(5x5 그리드)과 동일.

### Monster Portal (획득 루트)

- 던전 내 몬스터 드롭 + 클리어 시 포탈 등급의 아이템 1개 확정 보상
- 드롭 테이블은 포탈 등급에 영향받음
- 클리어 실패(사망) 시: 포탈은 이미 소멸, 아이템 없이 월드로 복귀

### Altar Portal (강화 루트)

- 기존 아이템계 강화 로직 그대로 (룸 클리어 시 EXP, 보스 클리어 시 레벨업)
- 클리어 시: 아이템 강화 완료
- 클리어 실패(사망) 시: 패널티 없음, 아이템 상태 유지, 월드로 복귀

## Changes to Existing Code

### Remove

- `InventoryUI.onEnterItemWorld` callback
- `InventoryUI.enterItemWorld()` method
- `InventoryUI` info text "C:ItemWorld" hint
- `WorldScene.enterItemWorld()` method
- `WorldScene` inventory C key -> enterItemWorld binding

### Modify

- `WorldScene`: Portal/Altar/GoldenMonster entity management 추가
- `WorldScene.update()`: Portal idle animation, interaction checks
- `ItemWorldScene`: constructor에 portal source type (monster/altar) 파라미터 추가
- `ItemWorldScene`: monster 타입일 때 클리어 보상으로 아이템 생성 로직 추가

### New Files

- `src/entities/GoldenMonster.ts` -- Enemy 확장, 금색 외형, 처치 시 포탈 생성 콜백
- `src/entities/Portal.ts` -- 포탈 오브젝트, idle 애니메이션, 상호작용
- `src/entities/Altar.ts` -- 제단 오브젝트, 아이템 선택 UI
- `src/effects/PortalTransition.ts` -- 진입 연출 (타임라인 기반 애니메이션)

## Technical Notes

- 모든 애니메이션은 timer 기반 (setTimeout 사용 안 함, dt 누적)
- 파티클은 Graphics 기반 절차적 생성 (스프라이트 에셋 불필요)
- 화면 흔들림은 기존 Camera 또는 container offset으로 구현
- PortalTransition은 별도 Container로 gameContainer 위에 overlay
- 사운드는 후속 작업으로 분리 (비주얼 먼저 구현)
