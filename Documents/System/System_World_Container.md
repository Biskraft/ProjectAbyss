# System_World_Container.md — Throwable Container 시스템

> **작성 기준:** 코드 reality 역추출 (2026-05-14)
> **참조 소스:** `game/src/entities/ThrowableContainer.ts` · `game/src/scenes/LdtkWorldScene.ts` (containers 통합부) · `game/public/assets/sprites/crate_01_atlas.png`
> **상위 SSoT:** `Documents/System/System_World_TileSystem.md` (§3 Damage / Passive Interaction 매트릭스)
> **자매 문서:** `Documents/System/System_World_Fluid.md` (paintTile · cellular gravity 연계)
> **상태:** V1 구현 완료 · Spawner 섹션은 신규 설계 (Implementation TBD)

---

## 1. 개요

월드 / 아이템계 룸에 배치되는 **던지기 가능 박스** 한 카테고리. 플레이어가 들고 던져 적 타격 · 환경 페인트 · 발판 적층 · 잠금 우회용으로 사용한다. 6종 catalog 로 좁게 출발하며, 모두 `crate_01_atlas.png` 단일 시트로 표현된다.

**핵심 결정:**

1. **6종 단일 catalog** — 신규 종 추가는 catalog 한 줄 + 슬라이스 한 칸만으로 끝낸다. 코드 분기 금지.
2. **32×32 균일 sprite frame + per-kind collision inset** — 외형 폭은 같고 물리 폭만 다르다 (locker / drum 모두 16-grid 정렬 유지).
3. **wood family 와 MetalCrate 두 가지 내구도 트랙** — wood 는 1 HP 즉파, metal 은 4 HP + acid 전용 부식.
4. **paint 는 BFS flood + `fluidVolume` 셀 한도** — fluid 의 양은 데이터, 코드는 한도만 안다.
5. **던진 컨테이너만 적에게 타격** — 중력 낙하·정지 컨테이너는 발판/장애물로만 작동, 적을 매장하지 않는다.

---

## 2. 설계 의도 (Design Intent)

**1차 niche 시그널:** BLAME! / Made in Abyss 페르소나 — 거대 시설 내부의 *방치된 화물 · 부식된 약품통 · 산화된 강철 보관함*. 환경에 흩어진 컨테이너는 빌더 유적 + 현 문명의 잔해 양 톤을 동시에 신호한다.

**스파이크 정렬:** 컨테이너는 *아이템 / 무기 Ego* 의 강화 루프와 직접 닿지 않는다. 그러나 다음 두 채널로 스파이크를 *간접 강화* 한다:

- (a) **아이템계 내부 단조 강판 톤** 안에서 oil/acid/magma 컨테이너는 "기억의 용기" 가 깨지며 결을 풀어놓는 시각 은유로 해석 가능.
- (b) 환경 페인트 → 적 처치 루트가 1차 niche (Hollow Knight / Sekiro) 의 "지형 무기화" 기대치를 충족.

**MDA 목표:**

- **Aesthetic:** Sensation (적중 타격감 · 충돌 산화 VFX) + Discovery (paint 결과로 만들어지는 새 fluid 흐름)
- **Dynamic:** kind × 환경 × 타격 방식 매트릭스가 emergent 전술 공간을 만든다
- **Mechanic:** 들기·던지기 단일 입력 · 1 hit per throw · 환경 노출 자동 파괴

**거절 신호:** 백팩 / 인벤토리 / 컨테이너 종류 30종 화면. 컨테이너는 *현장 도구* 이며 *수집 대상* 이 아니다.

---

## 3. Catalog (6종)

> SSoT: `ThrowableContainer.ts` 의 `CATALOG` 객체. 본 표는 그 거울이며, 수치 변경 시 양쪽 동기화.

| Kind | family | HP | paintTile | defaultFluidVolume | collisionInset (L/R) | atlas slice | 비고 |
| :--- | :--- | :-: | :-: | :-: | :-: | :--- | :--- |
| **Crate** | wood | 1 | 0 (air) | 0 | 0 / 0 | `wood_0..3` 랜덤 | 기본 나무 박스. 페인트 없음, 발판/장애물 |
| **MetalCrate** | metal | 4 | 0 (air) | 0 | 2 / 2 | `metal_0..3` 랜덤 | 강철 박스. 검·Ego Shard 면역, acid 노출 4s 만이 파괴 경로 |
| **OilDrum** | wood | 1 | 11 (oil) | 6 | 1 / 1 | `oil_0` | 기름 드럼. 깨지면 oil 셀 페인트 (불 + 미끄러짐 유발) |
| **WaterBarrel** | wood | 1 | 2 (water) | 6 | 1 / 1 | `water_0` | 물 드럼. 깨지면 water 셀 페인트 (불 진압 + magma 응고) |
| **MagmaCrucible** | wood | 1 | 6 (magma) | 4 | 1 / 1 | `magma_0` | 용암 도가니. 깨지면 magma 셀 + steam puff |
| **AcidVial** | wood | 1 | 13 (acid) | 4 | 1 / 1 | `acid_0` | 산 바이알. 좁은 페인트 + 금속 부식 / 전도체 |

**파생 관찰:**

- *Crate* 와 *MetalCrate* 는 paint 가 없으므로 발판/벽 보강 용도가 본질. 던져서 적을 칠 수 있는 운동에너지 무기로도 작동.
- *Drum 4종* 의 본질은 **환경 페인트** — 적 직접 타격은 부수 효과.
- `defaultFluidVolume` 은 LDtk entity 의 `FluidVolume` field 로 override 가능 (0..N). 예: 보스방 입구의 OilDrum 을 `FluidVolume=10` 으로 키워 전 통로 침수.

### 3.1 Atlas 슬라이스 (`crate_01_atlas.png` 32×96)

```
Row 0 (y=0):   wood_01  wood_02  wood_03  wood_04    ← Crate (variant 0..3 랜덤)
Row 1 (y=32):  metal_01 metal_02 metal_03 metal_04   ← MetalCrate (variant 0..3 랜덤)
Row 2 (y=64):  oil_01   acid_01  magma_01 water_01   ← Drum 4종 (kind-fixed 슬라이스)
```

신규 wood 컨테이너는 Row 0 의 빈 칸을 채우거나 Row 3 을 신설. 신규 fluid 컨테이너는 Row 2 의 빈 칸 + paintTile / fluidVolume 만 정의.

---

## 4. 데이터 모델

### 4.1 LDtk Entity 표현

**Entity identifier:** `Container`
**Resizable:** false (32×32 grid-cell anchored)
**Pivot:** top-left (`grid * 16` = world top-left, pivot independent)

| Field | Type | 기본값 | 비고 |
| :--- | :--- | :-: | :--- |
| `Kind` | enum `ContainerKind` | 없음 (필수) | `Crate` / `MetalCrate` / `OilDrum` / `WaterBarrel` / `MagmaCrucible` / `AcidVial` |
| `FluidVolume` | float | -1 (= spec default 사용) | 0 이상이면 paint 시 셀 한도 override. Crate / MetalCrate 는 0 = "페인트 없음" 의미로도 사용 가능 |

**Loader 흐름 (`LdtkWorldScene` `attach(level)`):**

1. `level.entities.filter(e => e.type === 'Container')`
2. `parseContainerKind(fields.Kind)` 으로 유효 검증. 실패 시 console.warn + skip.
3. `new ThrowableContainer(kind, grid[0]*16, grid[1]*16, fluidVolumeOverride)`
4. 모든 컨테이너 추가 후 `y` 내림차순 정렬 → `settleAtSpawn` 일괄 호출 (아래 컨테이너 먼저 정착 → 위에 쌓인 컨테이너가 올바른 floor 감지)
5. 콘솔 로그에 found / spawned / 좌표 출력

### 4.2 코드 측 상태 (요약)

```typescript
class ThrowableContainer {
  readonly kind: ContainerKind;
  readonly spec: ContainerSpec;       // CATALOG[kind]
  readonly fluidVolume: number;       // resolved at spawn
  readonly variantIdx: number;        // 0..3, wood/metal family 만 시각 분화
  x: number; y: number; vx: number; vy: number;
  hp: number;
  destroyed: boolean;
  held: boolean;
  wasThrown: boolean;                 // 정지 시 false
  hasDealtImpact: boolean;            // 던진 컨테이너의 1-hit-per-throw 플래그
  selfHitInvulnMs: number;            // release 후 200ms 자가 타격 면역
  acidExposureMs / magmaExposureMs / fireExposureMs: number;
}
```

**Collision rect accessor (inset-aware):**

```
colX = x + inset.left
colY = y + inset.top
colW = spec.width  - inset.left - inset.right
colH = spec.height - inset.top  - inset.bottom
```

모든 충돌 / 잡기 범위 / 적 타격 / 스택 판정은 sprite frame 이 아닌 collision rect 사용. 렌더 위치는 `container.x = x; container.y = y` (sprite frame 의 top-left).

---

## 5. 물리 (Update Loop)

### 5.1 중력 + 마찰

- gravity = **760 px/s²** (Player 와 동등 비례)
- vy 캡 = **600 px/s**
- 지면 안착 시 vx 마찰 = **0.80** (multiply per frame)
- 솔리드 충돌 시 vx 감쇠 = **0.30**
- 컨테이너-컨테이너 충돌 시 vx 감쇠 = **0.40**
- 정지 임계 = `|vx| < 6` → vx = 0 + `wasThrown = false`

### 5.2 솔리드 판정

`isContainerSolidCell(gx, gy)` 는 다음 IntGrid value 만 막는다:

```
1 (wall) · 3 (semi-solid platform) · 7 (breakable wood)
9 (breakable rock) · 12 (metal) · 15 (custom solid)
```

**관찰:** 다른 컨테이너도 `cellBlockedBy(gx, gy)` 검사를 통해 *동적 솔리드* 로 취급된다. 즉 컨테이너 위에 컨테이너를 쌓을 수 있고, 컨테이너 측면도 솔리드처럼 막는다.

### 5.3 스택 (Stacking)

- grounded 판정: 발 셀(`floor(feetY/16)`)이 솔리드 OR 다른 컨테이너 점유
- snap: 다른 컨테이너의 `colY` 가 더 높으면 그 위에 스냅 (sprite.y = `o.colY - this.colH - insetTop`)
- 컨테이너-컨테이너 overlap: `resolveContainerContainerCollision` 가 4축 최소 침투로 50/50 push apart

### 5.4 `settleAtSpawn(isSolidAt, others, maxDropPx=1024)`

스폰 직후 1회 호출. 1 px 씩 아래로 raycast 하면서 floor / 다른 컨테이너 top 충돌까지 즉시 텔레포트. LDtk 가 공중에 놓인 컨테이너도 "천천히 떨어지는" 시각 없이 자연 안착.

### 5.5 Player ↔ 컨테이너

`resolvePlayerContainerCollision` — 4축 최소 침투:

| 침투 축 | 처리 |
| :--- | :--- |
| Top (player 가 위) | `player.y = c.colY - p.height` + `vy=0` + `forceGrounded()` → 컨테이너 위에 서기 |
| Bottom (player 가 아래) | 컨테이너를 위로 push (`c.y -= overlapBottom`) — *player 매장 방지* |
| Left/Right (`|p.vx| > 20`) | 컨테이너 push + player 정렬 (밀어내기) |
| Left/Right (`|p.vx| ≤ 20`) | player 정렬만 (벽처럼 작동) |

---

## 6. 입력 — Grab / Throw / Drop

**키 매핑:** `GRAB` (PC B / Pad RB)

**1회 누름의 흐름 (`heldContainer === null` 일 때):**

```
GRAB_RANGE = 8 px
grabBox = player AABB inflated by 8 each side
candidates = containers.filter(c => !destroyed && !held && aabbOverlap(grabBox, c.collisionRect))
pick = candidates min by center-to-center sqDist
if pick: pick.pickUp() + heldContainer = pick
```

**들고 있는 동안:**

- 컨테이너 위치: `x = player.x + (player.width - h.width) / 2`, `y = player.y - h.height - 2` (어깨 위)
- `player.isLifting = true` → 이동 속도 1/2 + lift 애니메이션 (atlas idx 30-33)

**다시 누름의 흐름 (`heldContainer !== null` 일 때):**

```
facing = player.facingRight ? 1 : -1
heldContainer.release(facing * 80, -170)
heldContainer = null
```

> **던지기 사거리 결정 (2026-05-14):** vx 80 / vy -170 — 이전의 1/4 사거리. 박스 약 2-3 셀 앞 착지. 사거리 줄임 이유: 던진 박스가 화면 밖으로 사라져 결과가 안 보이는 UX 문제 해결.

**Release 시 부가 상태:**

- `wasThrown = true` (정지하면 다시 false)
- `hasDealtImpact = false` (1 hit per throw 초기화)
- `selfHitInvulnMs = 200` (자기 자신에게 200 ms 동안 안 맞음)

**Drop 케이스:** `release(0, 0)` 호출 시점은 현 코드에 없음 (제자리 내려놓기 = 미구현). 들고 잠금 해제는 항상 "던지기" 로 해결.

---

## 7. 외부 공격 — `takeAttack(damage)`

플레이어 검 / Ego Shard / 폭발 등 외부 데미지 적용 진입점.

```
hp -= damage
if (hp <= 0) {
  destroyed = true
  return { gx, gy } = 컨테이너 collision rect 중심
}
return null
```

**MetalCrate 예외:**

- 검 swing 으로는 hit spark 만 표시되고 `takeAttack` 호출이 차단된다 (검은 metal 면역). 코드상 호출처에서 `kind === 'MetalCrate'` 검사로 무효화.
- Ego Shard 도 동일하게 면역 (impact spark 만).
- **유일한 파괴 경로:** `tickEnvironment` 의 acid 노출 4초 (= 1 HP/s × 4 HP).

**Wood family 의 일반 파괴 경로:**

- 검 / Ego Shard / 던진 다른 컨테이너 충돌 / 환경 매트릭스 → 1 hit 면 즉파.

---

## 8. 환경 파괴 매트릭스 — `tickEnvironment(dtMs, env)`

매 프레임 호출. 컨테이너 collision rect 가 점유한 셀들을 스캔해 acid / magma / fire 오버레이 노출 여부 확인.

| Kind family | acid 셀 노출 | magma 셀 노출 | fire 오버레이 노출 |
| :--- | :--- | :--- | :--- |
| **Wood family** (Crate · 4 Drum) | 3.0 s → 즉파 | 1.5 s → 즉파 | 1.5 s → 즉파 |
| **MetalCrate** | 1.0 s 마다 1 HP 차감 (4초 누적 → 파괴) | 면역 | 면역 |

**자동 파괴 후 처리:**

```
if (env destruction) {
  paintContainerImpact(c.kind, gx, gy, c.fluidVolume)  // ← drum 4종이면 자기 fluid paint
  destroyContainerWithVFX(c)
  containers.splice(i, 1)
}
```

> **설계 함의:** OilDrum 이 fire 오버레이 위에 1.5 초 머무르면 자신이 깨지면서 oil 페인트 → 자기 fluid 가 다시 fire 에 점화되는 **연쇄 폭발 루프** 가 자연스럽게 형성된다. 이는 시스템 emergent, 명시적 분기 없음.

---

## 9. 파괴 — Paint + VFX

`destroyContainerWithVFX` 와 `paintContainerImpact` 두 가지를 모든 파괴 경로에서 동시 호출.

### 9.1 `destroyContainerWithVFX(c)`

| 단계 | 효과 |
| :--- | :--- |
| 1 | `propShatter.spawn(x, y, w, h, shatterColor, shatterAccent, shatterTexture)` — 작은 chunk 들이 흩어짐. texture 가 있으면 슬라이스, 없으면 단색 |
| 2 | `SFX.play('breakable_destroy', 0, { speed: 1/(1+rand*0.5) })` — 0.67x ~ 1.0x speed jitter |
| 3 | `game.hitstopFrames += 3` — 3 프레임 정지 |
| 4 | `game.camera.shake(2)` — 약한 흔들림 |
| 5 | `c.destroy()` — Pixi container removal |

### 9.2 `paintContainerImpact(kind, gx, gy, quantity)`

`quantity <= 0` 또는 `tile === 0` (Crate / MetalCrate) 일 때 페인트 없이 종료.

**`paintFluidSplash(grid, sx, sy, tile, quantity)` — BFS flood:**

| 항목 | 규칙 |
| :--- | :--- |
| Seed | `(sx, sy)` |
| 덮을 수 있는 셀 | `0 (air)` · `16 (grass)` · 기존 fluid `2 / 6 / 11 / 13` |
| 막는 셀 (paint + 확장 차단) | wall / ice / breakable / metal / wood (= 솔리드 일반) |
| 한도 | `quantity` 개 셀까지 |
| 순서 | BFS — 가까운 셀 우선 |

**MagmaCrucible 만:** paint 후 `steamPuff.spawn((gx+0.5)*16, (gy+0.5)*16, 1.6)` 추가 (응고 모먼트의 증기 puff).

**Paint 직후 후속 동기화 (필수):**

```
fluidSystem.refreshFromGrid(collisionGrid)  // 새 cell → FluidBody 재구성
rerenderTilemap()                            // 정적 wall sprite 갱신
```

> **주의:** paint 가 wall sprite layer 와 fluid surface layer 양쪽에 영향을 주므로 두 단계 모두 호출하지 않으면 시각/물리 불일치가 1 프레임 발생.

### 9.3 Magma 페인트의 연쇄 점화

`paintFluidSplash` 가 magma 셀을 칠하면 **그 즉시** 인접 flammable 셀이 `tryIgnite` 로 점화된다 (코드 4498-4500 추정 — 본 검증은 향후 PR 에서 확인). 600 ms 의 passive spread tick 을 기다리지 않고 시각적으로 즉발.

---

## 10. Thrown Container × Enemy 충돌

`checkThrownContainerEnemyHit()` 매 프레임.

| 조건 | 처리 |
| :--- | :--- |
| `c.wasThrown && !c.hasDealtImpact` | 적 AABB 교차 검사 진입 |
| 교차한 적 발견 | `e.onHit(facing*220, -160, 400)` (보스: `dir*60, -40, 0`) + 데미지 |
| 데미지 계산 | `damageNumbers.spawn(..., kind === 'MetalCrate')` — MetalCrate 라벨 |
| Post | `c.hasDealtImpact = true` → 다음 프레임부터 적 타격 안 함 |
| Paint + Destroy | `paintContainerImpact + destroyContainerWithVFX` |

**1 hit per throw 의 이유:** 던진 박스가 적 위로 굴러가며 4-5 번 타격 → 즉사 콤보를 막기 위해. 박스는 *한 명* 만 친다.

**자가 타격 면역:** release 후 200 ms 동안 `selfHitInvulnMs > 0` → 던진 본인은 박스에 안 맞음. 떨어뜨리듯 짧게 던지는 패턴에서 자가 데미지 방지.

---

## 11. 외부 시스템 연계 표

| 시스템 | 연계 방향 | 호출처 / 효과 |
| :--- | :--- | :--- |
| **FluidSystem** | Container → Fluid | `paintContainerImpact` 후 `fluidSystem.refreshFromGrid` 호출. fire-on-water 페인트는 `fluidSystem.removeCell` 도 호출 |
| **TileMutator** | Container ← Mutator | `tickEnvironment` 의 `isFireCell` 이 `mutator.aabbHasOverlay` 호출. magma paint 후 인접 flammable `tryIgnite` |
| **TileHazards** | Container 영향 없음 | Hazards 는 entity 대상 — 컨테이너는 자체 `tickEnvironment` 가 환경 파괴 처리 |
| **PropShatter** | Container → VFX | `destroyContainerWithVFX` 가 chunk 자산으로 호출. metal 은 단색 chunk |
| **SteamPuff** | MagmaCrucible 한정 | paint 직후 1 puff |
| **EgoShard** | Shard → Container | `checkShardContainerHit` 가 `takeAttack(damage)` 호출. MetalCrate 면역 처리는 호출처 분기 |

---

## 12. Container Spawner (신규 설계 — Implementation TBD)

> **목적:** LDtk 핸드크래프트 룸의 *명시적 1개씩 배치* 를 보완하여, 절차적 아이템계 룸 / 월드 무작위 구역에 컨테이너를 자동 배치하는 시스템. 룸 디자이너가 entity 100개를 손으로 깔지 않아도 의도된 밀도와 분포를 강제.

### 12.1 두 가지 spawn 모드

| 모드 | 트리거 | 사용처 |
| :--- | :--- | :--- |
| **Explicit** (현행) | LDtk `Container` entity (좌표 + Kind 명시) | 월드 핸드크래프트 룸 · 보스방 입구 · 튜토리얼 |
| **Spawner** (신규) | LDtk `ContainerSpawner` entity (rect + 정책) | 아이템계 절차적 룸 · 월드 sub-room · 광역 창고/시설 모티프 |

두 모드는 같은 룸에 공존 가능. Spawner 결과는 explicit 컨테이너와 동등하게 `containers` 배열에 들어간다.

### 12.2 LDtk Entity `ContainerSpawner` 스펙

**Identifier:** `ContainerSpawner`
**Resizable:** true (rect 영역 안에 spawn)
**Pivot:** top-left

| Field | Type | 기본값 | 설명 |
| :--- | :--- | :-: | :--- |
| `Pool` | string[] (Kind 가중치) | `["Crate:6", "OilDrum:2", "WaterBarrel:2"]` | `"Kind:weight"` 형식 배열. 빈 배열이면 spawn 없음 |
| `MinCount` | int | 1 | 최소 spawn 개수 |
| `MaxCount` | int | 3 | 최대 spawn 개수 (실제는 `[Min..Max]` uniform sample) |
| `Bias` | enum `SpawnBias` | `Floor` | `Floor` / `Stack` / `Cluster` — 아래 12.3 참조 |
| `Seed` | int | -1 (= random) | 결정론적 spawn 용. -1 이면 매 룸 진입마다 다름. 룸 ID + seed → PRNG 시드 |
| `AvoidEntity` | bool | true | 다른 entity (Container, Enemy, Door 등) 가 점유한 셀 회피 |
| `FluidVolumeOverride` | float | -1 | drum 4종에만 적용. -1 이면 spec default |

### 12.3 Bias 별 배치 알고리즘

| Bias | 후보 셀 | 패턴 |
| :--- | :--- | :--- |
| **Floor** | rect 안에서 *바로 아래 셀이 솔리드* 인 셀 | 바닥에 한 줄 늘어선 박스 |
| **Stack** | Floor 후보 1개 선택 후 그 위로 1~3 칸 누적 | 적층 박스 더미 (창고 모티프) |
| **Cluster** | Floor 후보 중 N개 선택, 인접 셀에 0~2 추가 | 부근에 무리지어 흩어진 배치 (광역 시설 모티프) |

**알고리즘 의사코드 (Floor 예시):**

```
candidates = []
for (gy, gx) in rect.cells:
    if collisionGrid[gy][gx] !== 0: continue                  // 비어야 함
    if collisionGrid[gy+1]?[gx] not in SOLID_VALUES: continue  // 아래는 솔리드
    if AvoidEntity && cellHasEntity(gx, gy): continue
    candidates.push([gx, gy])

shuffle(candidates, rng)
count = clamp(rng.intRange(MinCount, MaxCount), 0, candidates.length)
for i in 0..count-1:
    kind = weightedPick(Pool, rng)
    spawn ThrowableContainer(kind, candidates[i] * 16, ...)
```

### 12.4 Pool 가중치 표 (시드 라이브러리)

룸 타입별 권장 Pool. 디자이너가 매번 손으로 짜지 않고 미리 정의된 프리셋을 LDtk enum 으로 선택 가능.

| Pool ID | 권장 룸 타입 | Pool 정의 |
| :--- | :--- | :--- |
| `Warehouse_Generic` | 빌더 시설 창고 | `Crate:6, MetalCrate:2, OilDrum:1, WaterBarrel:1` |
| `Workshop_Hazard` | 작업장 / 단조 시설 | `Crate:3, OilDrum:3, MagmaCrucible:2, MetalCrate:2` |
| `Lab_Acid` | 실험실 / 부식 구역 | `Crate:2, AcidVial:5, MetalCrate:3` |
| `ItemWorld_Forge` | 아이템계 Forge 기질 룸 | `MagmaCrucible:4, OilDrum:2, Crate:1, MetalCrate:3` |
| `ItemWorld_Rust` | 아이템계 Rust 기질 룸 | `AcidVial:4, MetalCrate:5, Crate:2` |
| `ItemWorld_Spark` | 아이템계 Spark 기질 룸 | `WaterBarrel:4, MetalCrate:3, Crate:3` (전도체 함정 setup) |
| `Empty_Decor` | 장식용 (전투 없음) | `Crate:10` (오직 박스) |

> Pool ID 는 `Sheets/Content_System_ContainerPools.csv` (신규) 에 정의 — Spawner entity 의 `Pool` field 와 ID 매칭 또는 인라인 `["Kind:w", ...]` 형식 둘 다 허용.

### 12.5 결정론적 시드 정책

`Seed = -1` (default) 의 경우:

- 월드 / 핸드크래프트 룸: 룸 진입마다 다른 분포 (탐험 재플레이 가치)
- 아이템계 절차적 룸: 룸 ID + 다이브 회차 + 글로벌 시드 조합으로 자동 결정 → **같은 무기의 같은 지층은 항상 동일** (Disgaea 아이템계 규칙 일치)

`Seed >= 0` 의 경우:

- 명시적 결정론. 튜토리얼 / 스토리 룸에서 컨테이너 분포 보존 필요할 때 사용.

### 12.6 Spawner 와 절차적 룸 생성 통합

아이템계 절차적 룸 (Phase 2 후속) 은 *Room Template* 단위로 LDtk 에 정의되어 있다. Template 내부에 1~3 개의 ContainerSpawner entity 를 미리 깔아두면, 룸이 인스턴스화될 때마다 Spawner 가 자동 발화되어 *같은 template 도 매번 다른 컨테이너 분포* 를 얻는다.

기존 절차적 시스템과의 책임 분리:

- 절차적 시스템: Room Template 선택 / 연결 / 큰 chunk 배치
- ContainerSpawner: 선택된 룸 안 의 props (컨테이너) 미세 배치
- 두 레이어 결정론적 시드는 동일한 PRNG 트리에서 분기

### 12.7 V1 스코프 (구현 시)

- [ ] LDtk `ContainerSpawner` entity 정의 + Loader 통합
- [ ] `SpawnBias` 3종 (Floor / Stack / Cluster) 알고리즘
- [ ] Pool 가중치 파싱 (인라인 `"Kind:w"` 형식만, CSV 는 V2)
- [ ] 결정론적 PRNG (룸 ID + seed)
- [ ] 디버그 시각화: `?debug` 게이트 + Spawner rect 외곽선 + 후보 셀 점

### 12.8 V2+ 확장

- Pool CSV 로 분리 (`Content_System_ContainerPools.csv`)
- `OnHitEvent` field: 특정 컨테이너 파괴 시 룸 이벤트 트리거 (예: AcidVial 4개 모두 파괴 → 문 열림)
- 적과 같은 셀 회피 (충돌 회피)
- `Cluster` bias 의 클러스터 반경 / 중심 가중치 튜닝 파라미터

---

## 13. 리스크 & 미해결

| 리스크 | 영향 | 대응 |
| :--- | :--- | :--- |
| Drum 자기 fluid 가 자기를 파괴하는 연쇄 (OilDrum on fire) 가 의도된 emergent 인지 버그인지 모호 | 디자이너 의도 불분명 | 본 문서 §8 의 "설계 함의" 로 *의도된* emergent 로 명시 |
| 던진 박스가 화면 밖으로 사라져 결과 안 보임 | UX 불만 | 2026-05-14 vx 80 / vy -170 으로 사거리 1/4 축소 — 후속 플레이테스트 검증 필요 |
| Spawner 도입 후 명시 entity 와 절차 spawn 의 결정론 충돌 | 같은 룸 다른 컨테이너 분포 | LDtk explicit 가 항상 우선, Spawner 는 *그 외* 셀에서만 후보 산출 |
| MetalCrate 면역 분기가 호출처 (Scene / EgoShard) 양쪽에 분산 | 면역 누락 회귀 | `ThrowableContainer.takeAttack` 안에서 일괄 처리하도록 리팩터 후보 |
| Magma paint 의 즉시 인접 점화는 패시브 spread 와 다른 코드 경로 | 코드 중복 / 동기화 누락 가능 | TileMutator 의 `ignite from magma` 단일 함수로 통합 (후속 PR) |

---

## 14. 결정 기록 (Decision Log)

| 항목 | 결정 | 이유 |
| :--- | :--- | :--- |
| Catalog 6종 고정 | wood 1종 + metal 1종 + drum 4종 | 1차 niche 시그널 (창고 + 실험실 + 단조) 모두 커버, 인지 부담 적음 |
| 32×32 균일 sprite frame | inset 으로 물리 폭만 분화 | 16-grid 정렬 + atlas 슬라이스 단순화 |
| Wood 1HP 즉파 | metal 4HP 만 차등 | 게임플레이 단순함 + metal 의 *acid 의존* 특수 정체성 부각 |
| Paint = BFS flood | 단순 radius 가 아님 | 솔리드 셀이 자연스럽게 paint 를 막아 "흘러내림" 시각 |
| 1 hit per throw | wasThrown + hasDealtImpact 플래그 | 굴러가는 박스 다단 히트 방지 (즉사 콤보 차단) |
| Spawner 별도 entity 도입 | explicit Container 와 공존 | 핸드크래프트 / 절차 룸 양쪽 지원, surgical 변경 |

---

## 15. 다음 단계

1. **§12 Container Spawner 검토 + 컨펌:** Pool 가중치 프리셋 / Bias 3종이 충분한가? 추가 필요?
2. **LDtk Editor 정의 추가:** `ContainerSpawner` entity + `SpawnBias` enum + `Pool` (string array)
3. **Loader 통합:** `LdtkWorldScene.attach` 의 `Container` 처리 다음에 Spawner 발화 추가
4. **PRNG 라이브러리 선택:** 결정론적 mulberry32 또는 splitmix64 (Phase 3 멀티 동기화 고려)
5. **디버그 시각화:** `?debug` 게이트 안에서 Spawner rect + 후보 셀 표시
