# Phase 1 MVP Prototype Design Spec

> **Date:** 2026-03-23
> **Status:** Approved
> **Scope:** Project Abyss Phase 1 - "한 판의 재미"

---

## 1. 목표

1개 구역 + 3층짜리 미니 아이템계에서 **"탐험 -> 아이템 획득 -> 아이템계 진입 -> 장비 강화"** 순환이 돌아가는지 검증한다.

### MVP 범위

| 포함 (IN) | 제외 (OUT) |
| :--- | :--- |
| 캐릭터 이동/점프/대시 | 벽 점프, 이중 점프, 변신 |
| 기본 공격 3타 콤보 (검) | 스킬 슬롯, 자동 조준 |
| 적 2종 (근접/원거리) | 보스, 상태이상, 원소 |
| 1개 구역 (5x5 Room Grid) | 7개 구역, 구역 간 이동 |
| 아이템 드랍 (검 1종, 5레어리티) | 전체 장비 슬롯, 방어구 |
| 미니 아이템계 (3층 + 보스 1개) | 100층, 이노센트, 지오 이펙트 |
| 데미지 숫자 표시 | DPS 미터, 전투 로그 |
| 키보드 조작 | 모바일, 게임패드 |
| 싱글 플레이 | 멀티플레이, 허브 |
| 로컬 세이브 (localStorage) | 서버, DB, 계정 |

---

## 2. 기술 스택

| 기술 | 용도 |
| :--- | :--- |
| PixiJS v8 | 2D 렌더링 (WebGL/WebGPU) |
| TypeScript | 메인 언어 |
| Vite | 빌드/번들러 |
| @pixi/tilemap | 타일맵 렌더링 |

MVP에서 오디오(Howler.js)는 제외한다. Phase 2에서 도입.

### 화면 해상도

GDD `System_3C_Camera.md` 기준 (SSoT):

```
내부 렌더링 해상도: 480 x 270 px (16:9)
타일 크기: 16px
가로 30타일, 세로 ~17타일
```

실제 모니터에는 정수 배율 스케일링으로 확대 표시한다:

| 모니터 해상도 | 배율 | 실제 렌더 크기 | 비고 |
| :--- | :---: | :--- | :--- |
| 1920x1080 (FHD) | x4 | 1920x1080 | 정확히 일치 |
| 2560x1440 (2K) | x5 | 2400x1350 | 레터박스 (여백 80x45px) |
| 3840x2160 (4K) | x8 | 3840x2160 | 정확히 일치 |

- 캔버스는 항상 480x270으로 렌더링 후, CSS 스케일링으로 정수 배율 확대
- `image-rendering: pixelated` 적용하여 픽셀아트 선명도 유지
- 종횡비 16:9 벗어나면 레터박스(검은 띠) 처리
- 2K 등 정수 배율에 맞지 않는 해상도는 가능한 최대 정수 배율 적용 후 중앙 정렬

---

## 3. 아키텍처

### 3.1 접근 방식: Scene 기반 구조

게임을 Scene 단위로 분리하여 관리한다. 3-Space 모델(월드/아이템계/허브)과 1:1 매핑.

```
Game
├── SceneManager (씬 전환 관리)
├── WorldScene (월드 탐험)
├── ItemWorldScene (아이템계)
├── InventoryScene (인벤토리 UI, 오버레이)
└── 공유 시스템 (Input, Physics, Camera)
```

### 3.2 코드 패턴: 클래스 상속 기반 OOP

Entity -> Player, Enemy -> Skeleton, Ghost 등 전통적 상속 구조.

### 3.3 에셋: 무료 픽셀아트 에셋팩

고딕/다크 판타지 분위기에 맞는 16px 타일 기반 오픈소스 에셋 사용.

---

## 4. 프로젝트 구조

```
VibeCoding/game/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── public/
│   └── assets/
│       ├── sprites/
│       ├── tilesets/
│       └── audio/
└── src/
    ├── main.ts                 # 앱 부트스트랩
    ├── Game.ts                 # Game 클래스 (PixiJS Application 래퍼)
    ├── core/                   # 엔진 핵심 시스템
    │   ├── SceneManager.ts     # Scene 전환 관리
    │   ├── Scene.ts            # Scene 베이스 클래스
    │   ├── InputManager.ts     # 키보드 입력 관리
    │   ├── AssetLoader.ts      # 에셋 로딩 파이프라인
    │   ├── Camera.ts           # Lerp 기반 카메라
    │   ├── Physics.ts          # AABB 충돌 + 중력
    │   └── GameLoop.ts         # 고정 timestep update + render
    ├── scenes/
    │   ├── WorldScene.ts       # 월드 탐험
    │   ├── ItemWorldScene.ts   # 아이템계
    │   └── InventoryScene.ts   # 인벤토리 UI
    ├── entities/
    │   ├── Entity.ts           # 베이스 엔티티
    │   ├── Player.ts           # 플레이어 캐릭터
    │   ├── Enemy.ts            # 적 베이스
    │   ├── Skeleton.ts         # 근접 적
    │   ├── Ghost.ts            # 원거리 적
    │   └── ItemDrop.ts         # 드랍 아이템
    ├── combat/
    │   ├── HitboxSystem.ts     # 히트박스/허트박스
    │   ├── DamageCalculator.ts # 데미지 공식
    │   ├── ComboSystem.ts      # 3타 자동 콤보
    │   └── HitstopManager.ts   # 히트스탑 연출
    ├── level/
    │   ├── RoomGrid.ts         # Room Grid 생성기
    │   ├── CriticalPath.ts     # Critical Path 알고리즘
    │   ├── ChunkAssembler.ts   # Chunk 조립
    │   ├── TilemapRenderer.ts  # 타일맵 렌더링
    │   └── RoomTransition.ts   # 룸 전환
    ├── items/
    │   ├── Item.ts             # 아이템 데이터 구조
    │   ├── Equipment.ts        # 장비 장착/해제
    │   ├── Inventory.ts        # 인벤토리 관리
    │   └── ItemWorldGen.ts     # 아이템계 층 생성
    ├── data/
    │   ├── stats.ts            # 캐릭터 스탯 테이블
    │   ├── weapons.ts          # 무기 스탯 테이블
    │   └── damage.ts           # 데미지 계수 테이블
    ├── ui/
    │   ├── HUD.ts              # HP바, 데미지 숫자
    │   ├── Minimap.ts          # 미니맵
    │   └── InventoryUI.ts      # 인벤토리 화면
    └── utils/
        ├── PRNG.ts             # 시드 기반 난수 생성기
        ├── StateMachine.ts     # 범용 상태 머신
        └── SaveManager.ts      # localStorage 세이브/로드
```

---

## 5. 게임 루프 및 Scene 관리

### 5.1 Game Loop

PixiJS v8의 Ticker를 활용하되, 고정 timestep update + 가변 render 패턴을 적용한다.

```
매 프레임:
  1. deltaTime 누적
  2. while (누적 >= FIXED_STEP):
       activeScene.update(FIXED_STEP)    # 물리/로직 (60Hz 고정)
       누적 -= FIXED_STEP
  3. activeScene.render(보간값)           # 렌더링 (모니터 주사율)
```

- FIXED_STEP: 1/60초 (16.67ms)
- 물리 연산이 프레임레이트에 독립적으로 동작

### 5.2 Scene 생명주기

```typescript
abstract class Scene {
  init(): void      // 씬 초기화 (에셋 준비, 엔티티 생성)
  enter(): void     // 씬 진입 시 호출 (상태 복원)
  update(dt: number): void  // 매 고정 프레임 로직
  render(alpha: number): void // 보간 렌더링
  exit(): void      // 씬 퇴장 시 호출 (정리)
  destroy(): void   // 완전 해제
}
```

### 5.3 Scene 전환 흐름

```
WorldScene ──(아이템 선택)──> ItemWorldScene
    ^                              |
    └──(탈출/클리어)───────────────┘

WorldScene ──(인벤토리 키)──> InventoryScene (오버레이)
```

- WorldScene <-> ItemWorldScene: 전환 시 월드 상태를 스택에 보존
- InventoryScene: 오버레이 방식. 하위 Scene을 일시정지하고 위에 덮음

### 5.4 글로벌 상태 (Scene 간 공유)

```typescript
interface PlayerState {
  stats: {
    level: number;
    hp: number; maxHp: number;
    mp: number; maxMp: number;
    str: number; int: number; dex: number; vit: number; spd: number; lck: number;
    atk: number; def: number;  // 파생 스탯 (장비 포함 합산)
  }
  equipment: { weapon: Item | null }
  inventory: Item[]
  position: { zoneId: string; roomX: number; roomY: number }
}
```

- Game 클래스가 소유, 각 Scene에 참조로 전달 (의존성 주입)
- 6대 기본 스탯(STR, INT, DEX, VIT, SPD, LCK)은 GDD `System_Growth_Stats.md` 기준
- MVP에서 ATK = STR * 1.0 + weaponFinalAtk, DEF = VIT * 0.5로 단순 파생
- weaponFinalAtk = weapon.baseStats.atk * rarityMultiplier * (1 + 0.05 * weapon.level)
- LCK는 드랍률 보정에 사용하지 않음 (MVP에서 고정 확률)
```

---

## 6. 캐릭터 물리 및 충돌

### 6.1 물리 파라미터

GDD `System_3C_Character.md` 기준 (SSoT):

```
이동 속도: 192 px/s (3.2 px/frame @60fps, 가속 3~4프레임)
점프 높이: 4타일 = 64px (고정 높이)
중력: 980 px/s^2
최대 낙하 속도: 576 px/s (9.6 px/frame @60fps)
대시 거리: 64px (150ms 무적, 쿨다운 2초)
Coyote Time: 150ms
Jump Buffer: 250ms
```

### 6.2 상태 머신

```
States: Idle, Run, Jump, Fall, Dash, Attack, Hit, Death

전이 규칙:
- 모든 상태에서 대시 가능 (쿨다운 중 제외)
- Attack 상태 중 이동 가능 (이동 속도 80%)
- Hit 상태는 경직 시간 후 자동 복귀 (1~2타 피격: 200ms, 3타 피격: 350ms)
- HP 0 -> Death (모든 상태에서)
```

### 6.3 AABB 충돌 처리

```
충돌 레이어:
  - Solid    : 지형 타일 (벽, 바닥)
  - OneWay   : 원웨이 플랫폼 (위에서만 착지)
  - Hitbox   : 공격 판정 영역
  - Hurtbox  : 피격 판정 영역
  - Trigger  : 룸 전환, 아이템 드랍

충돌 해결 순서:
  1. X축 이동 -> X 충돌 해결
  2. Y축 이동 -> Y 충돌 해결
  3. OneWay: 위에서 아래로 이동 중일 때만 충돌
  4. Hitbox <-> Hurtbox: 데미지 처리로 전달
```

---

## 7. 전투 시스템

### 7.1 3타 자동 콤보

GDD `System_3C_Character.md` 기준 (SSoT):

```
1타 (Slash1): 전방 수평 베기  - 히트박스 29x19px, 지속 6프레임
2타 (Slash2): 전방 상단 베기  - 히트박스 34x19px, 지속 6프레임
3타 (Slash3): 전방 강타       - 히트박스 38x24px, 지속 7프레임 (활성 4~10f)

콤보 윈도우: 각 타 종료 후 400ms 내 재입력 시 다음 타 연결
3타 후딜: 600ms - 대시로 캔슬 가능
```

### 7.2 공중 공격

```
공중 전방 공격: 점프/낙하 중 공격 -> 전방 베기 (1타만)
공중 하방 공격: 아래 키 + 공격 -> 하방 찍기, 적 히트 시 바운스
```

### 7.3 히트박스/허트박스

```
Entity: hurtbox (항상 활성, 엔티티 크기와 동일)
Attack: hitbox (공격 프레임 동안만 활성)

판정 규칙:
- 같은 공격은 같은 대상에 1회만 판정 (hitList로 중복 방지)
- 새로운 공격(콤보 다음 타) 시 hitList 초기화
```

### 7.4 데미지 계산

GDD `System_Combat_Damage.md` 전체 공식:
```
Damage = max(1, floor((ATK * Skill_Multiplier - DEF * DEF_Factor) * Element_Multiplier * Critical_Multiplier * Level_Correction * Random(0.9, 1.1)))
```

MVP 단순화 (아래 항목을 1.0으로 고정):
- Skill_Multiplier = 1.0 (기본 공격), Element_Multiplier = 1.0, Critical_Multiplier = 1.0, Level_Correction = 1.0
- DEF_Factor = 0.5

```
MVP Physical DMG = max(1, floor((ATK * 1.0 - DEF * 0.5) * random(0.9, 1.1)))
```

DamageCalculator 인터페이스는 전체 공식의 모든 인자를 받되, MVP에서는 기본값 1.0으로 처리한다. Phase 2에서 크리티컬/원소 시스템 추가 시 인터페이스 변경 없이 확장 가능.

### 7.5 피격 처리 체인

```
1. 데미지 계산
2. 히트스탑: 공격자 + 피격자 모두 정지 (1~2타=2프레임 Light, 3타=3프레임 Medium)
3. 화면 흔들림: 강도에 비례 (1~3px, 150ms)
4. 넉백: 피격 방향 반대로 밀려남
5. 경직: 피격자 Hit 상태 진입 (1~2타: 200ms, 3타: 350ms)
6. 무적: 피격 후 500ms 무적 (깜빡임 연출)
7. 데미지 숫자 팝업
```

### 7.6 적 AI (2종)

```
Skeleton (근접형):
  Idle -> Detect(160px) -> Chase -> AttackRange(32px) -> Attack -> Cooldown -> Chase
  공격: 전방 베기, 데미지 중, 느린 공격 속도

Ghost (원거리형):
  Idle -> Detect(240px) -> Retreat(거리유지 120px) -> Shoot -> Cooldown -> Retreat
  공격: 투사체 발사, 데미지 소, 빠른 공격 속도
  특수: 벽 관통 이동 (Solid 충돌 레이어 마스크 비활성화)
```

---

## 8. 맵 생성 및 룸 전환

### 8.1 Room Grid 생성 (MVP: 5x5)

```
생성 파이프라인:
  1. 5x5 빈 Grid 생성
  2. Critical Path 생성 (입구 -> 출구, Always Winnable)
  3. Room Type 배정 (경로: Type 1~2, 비경로: Type 0)
  4. 비경로 Type 0 중 20~30%를 Type 1(좌우 통로)로 승격하여 탐험 가능 분기 방으로 전환
     (분기 방에는 아이템 스폰 확률 2배 적용 = 보상 경로)
  5. 각 Room에 Chunk 조립
  6. 적/아이템 스폰 포인트 배치
```

### 8.2 Room Type

| Type | 이름 | 출입구 |
| :--: | :--- | :--- |
| 0 | Dead End | 없음 |
| 1 | LR | 좌, 우 |
| 2 | LRD | 좌, 우, 하 |
| 3 | LRU | 좌, 우, 상 |

### 8.3 Chunk 조립

```
1 Room = 60x34 타일 (960x544px)
1 Chunk = 5x3 타일 (80x48px)
1 Room = 12x11 Chunk + 경계

MVP Chunk 종류 (최소 10개):
  floor_flat, floor_step, platform_single, platform_double,
  wall_left, wall_right, ceiling, door_left, door_right, door_bottom
```

### 8.4 룸 전환

```
1. 페이드 아웃 (200ms)
2. 현재 Room 엔티티 정리
3. 다음 Room 로드 + Chunk 조립
4. 플레이어를 반대편 입구에 배치
5. 페이드 인 (200ms)

카메라: Room 단위 스냅 (Room 내부에서는 Lerp Follow)
```

### 8.5 PRNG

```
알고리즘: Mulberry32
같은 시드 -> 항상 같은 맵 보장
```

---

## 9. 아이템 시스템 및 미니 아이템계

### 9.1 아이템 데이터 구조

```typescript
interface Item {
  id: string
  name: string
  category: "sword"
  rarity: "common" | "uncommon" | "rare" | "legendary" | "mythic"
  level: number
  baseStats: { atk: number }    // 레어리티 배율 적용 전 원본 값
  itemWorldSeed: number
  itemWorldCleared: number
}

// 최종 스탯 계산: finalAtk = baseStats.atk * rarityMultiplier * (1 + 0.05 * level)
// rarityMultiplier: common=1.0, uncommon=1.3, rare=1.7, legendary=2.2, mythic=3.0
```

### 9.2 레어리티별 드랍

```
적 처치 시 드랍 확률: 15%

Common     60%   ATK x1.0
Uncommon   25%   ATK x1.3
Rare       10%   ATK x1.7
Legendary   4%   ATK x2.2
Mythic      1%   ATK x3.0
```

### 9.3 장비 시스템

```
슬롯: 무기 1개
맨손 공격력: ATK 5

장비 스탯은 가산이 아닌 실시간 파생 계산:
  Player.stats.atk = baseAtk(레벨 기반) + weaponFinalAtk
  weaponFinalAtk = weapon.baseStats.atk * rarityMultiplier * (1 + 0.05 * weapon.level)
  weapon이 null이면 weaponFinalAtk = 0, 맨손 보정 +5

장착/해제 시 atk를 직접 가감하지 않고, 파생 스탯 재계산 함수를 호출한다.
```

### 9.4 미니 아이템계

```
MVP 고정값 (GDD의 동적 Grid 공식을 3층 한정으로 오버라이드):
1층: 3x3 Room Grid (적 밀도 낮음)
2층: 3x3 Room Grid (적 밀도 중간)
3층: 3x3 Room Grid (적 밀도 높음) + 출구에 보스

보스 (아이템 장군): 강화 Skeleton (HP x3, ATK x2, 크기 x1.5)

탈출: 아무 때나 가능 / 클리어 시 자동 / 월드 복귀
```

### 9.5 아이템 성장

```
아이템 성장 흐름:
  층 클리어 -> 아이템 경험치 +100
  경험치 300 누적 -> 아이템 레벨 +1 -> finalAtk 재계산 (level 항 반영)
  보스(아이템 장군) 처치 -> 아이템 레벨 +1 (경험치 무관, 즉시 레벨업)

레벨업 효과: finalAtk = baseStats.atk * rarityMultiplier * (1 + 0.05 * level)
  - 레벨 0: x1.00, 레벨 5: x1.25, 레벨 10: x1.50

MVP 최대 레벨: 10
```

---

## 10. HUD/UI

### 10.1 HUD 레이아웃

```
좌상단: HP바, MP바
우상단: 미니맵 (5x5 Room Grid, 현재/방문/미방문 표시)
하단:   장비 정보 + 대시 쿨다운
중앙:   데미지 팝업 (위로 떠오름 + 페이드, 800ms)
```

### 10.2 인벤토리 UI

```
장착 중 무기 표시
소지품 목록 (최대 20개)
액션: 장착 / 아이템계 진입 / 버리기
아이템계 진입 조건: 인벤토리 내 미장착 아이템도 진입 가능. 월드 내 어디서든 진입 가능 (MVP 한정).
인벤토리 가득 참(20개) 시: 드랍 아이템 위에 "인벤토리 가득 참" 알림 표시, 픽업 불가.
조작: 키보드 방향키 + Enter, 마우스 클릭
```

---

## 11. 세이브/로드

```
저장 방식: localStorage
자동 저장: 룸 전환 시마다
수동 저장: 인벤토리 화면

저장 데이터:
  - playerStats
  - equipment
  - inventory
  - worldState (seed, currentRoom, visitedRooms, defeatedEnemies)
  - playtime
```

---

## 12. 마일스톤

| 마일스톤 | 기간 | 핵심 산출물 |
| :--- | :--- | :--- |
| M1.1 엔진 기반 | 1주 | Vite+PixiJS 보일러플레이트, 게임루프, 입력, 타일맵, 카메라, 에셋로더 |
| M1.2 캐릭터 물리 | 1.5주 | 이동, 점프, 대시, 충돌, 상태머신 |
| M1.3 전투 시스템 | 1.5주 | 히트박스, 콤보, 데미지, 피격, 히트스탑, 적AI, 스폰 |
| M1.4 맵 생성 | 1.5주 | Room Grid, Critical Path, Chunk, 오브젝트 배치, 룸 전환 |
| M1.5 미니 아이템계 | 1.5주 | 아이템 구조, 장비, 아이템계 진입/탈출, 3층 생성, 보스 |
| M1.6 통합 루프 | 1주 | 순환 연결, HUD, 인벤토리UI, 세이브, 밸런스 |

---

## 13. 완료 기준 (Go/No-Go)

- [ ] 캐릭터가 월드를 탐험하며 적을 처치할 수 있다
- [ ] 적 처치 시 장비 아이템이 드랍된다
- [ ] 드랍된 아이템의 아이템계(3층)에 진입할 수 있다
- [ ] 아이템계 층 클리어로 장비가 강해진다
- [ ] 강해진 장비로 더 어려운 적을 처치할 수 있다
- [ ] 위 순환을 반복하고 싶은 동기가 발생한다
