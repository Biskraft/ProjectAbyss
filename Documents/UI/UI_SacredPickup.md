# UI_SacredPickup.md — 아이템 획득 · 앵빌 · 다이브 UX

> **작성 기준:** 설계 명세 (Spec-First GDD)
> **근거 리서치:** `Documents/Research/ItemWorldEntry_NaturalOnboarding_Research.md` §7 "Sacred Pickup" 권장안 + §8 반복 진입 단축
> **보조 리서치:** `Documents/Research/Zelda_Onboarding_Evolution_Research.md` (T-시리즈 비교 근거)
> **관련 문서:** `Documents/System/System_World_Interactables.md` §3.1 Anvil / `Documents/System/System_ItemWorld_Core.md` / `Documents/UI/UI_Inventory.md` / `Documents/UI/UI_Notifications.md`

---

## 구현 현황 (Implementation Status)

| 항목 | 상태 |
| :--- | :--- |
| 바닥 아이템 glow + 파티클 (S1) | 미구현 |
| 접근 자동 획득 (S2) | 부분 구현 (기존 드롭 자동 획득 존재) |
| Lore Popup 모달 (S3) | 미구현 |
| 무기 맥동 컷신 + 카메라 줌인 (T2) | 미구현 |
| 무기 맥동 (줌 없음, S4) | 미구현 |
| 앵빌 Tether 빛의 선 (T3, T4) | 미구현 |
| 앵빌 [E] 프롬프트 (S5) | 부분 구현 (`Anvil.setShowHint` 텍스트 기반) |
| 대장간 UI (그리드) + DIVE/BACK (S6) | 부분 구현 (텍스트 리스트 기반 → 인벤토리 그리드 통합 필요) |
| 첫 DIVE 풀 프리뷰 패널 (T5) | 미구현 |
| 2회차+ 요약 프리뷰 (S6 단축) | 미구현 |
| 다이브 연출 풀/단축/초단축 (S7) | 미구현 (기존 `FloorCollapse + MemoryDive`는 풀 시퀀스에 해당) |
| 첫 진입 Return 아이콘 표시 (T6) | 미구현 |
| 일회성 플래그 영구 저장 (seenItems, firstPickupDone, firstDiveDone, firstReturnShown) | 미구현 |

---

## 0. 필수 참고 자료 (Mandatory References)

- Project Vision: `Documents/Terms/Project_Vision_Abyss.md` (스파이크 = "아이템에 들어가면 기억이 던전이 된다")
- Writing Standards: `Documents/Terms/GDD_Writing_Rules.md`
- 코어 리서치: `Documents/Research/ItemWorldEntry_NaturalOnboarding_Research.md`
- 보조 리서치: `Documents/Research/Zelda_Onboarding_Evolution_Research.md`
- 구현 참조: `game/src/entities/Anvil.ts`, `game/src/ui/InventoryUI.ts`, `game/src/scenes/LdtkWorldScene.ts` (`placeItemOnAnvil`, `drawItemSelectUI`)

---

## 1. 개요 (Overview)

Sacred Pickup은 아이템 획득부터 아이템계 진입까지의 전 과정을 하나의 의식(ritual)으로 묶는 UX 체계다. 이 체계는 플레이어의 "납치감"(자동 전송으로 인한 에이전시 상실) 문제를 해결하고, 스파이크 판타지("아이템의 기억이 던전이 된다")를 획득의 순간부터 일관되게 전달한다. 모든 연출은 **1회성(T-)** 과 **다회성(S-)** 두 축으로 분리 설계되어, 첫 플레이에는 충분한 교수(Teaching) 정보를 제공하고 반복 플레이에는 효율적인 진입 루트를 제공한다.

### 핵심 설계 전환

- **기존:** 아이템 획득 = 평범한 이벤트. 앵빌 상호작용과 분리됨. 자동 진입으로 인한 납치감 발생.
- **변경:** 아이템 획득 = 의식의 시작. Lore Popup → 맥동 → Tether → 앵빌 접근 → 명시적 DIVE 동의로 연결. 젤다 25년 온보딩 진화 원칙을 53초에 압축 적용.

---

## 2. 설계 의도 (Design Intent)

**MDA Aesthetic:**
- Fantasy — 장인의 의식적 손길(바닥 glow → 획득 → 앵빌 Tether → 단조 타격)
- Discovery — Lore 텍스트와 Preview 패널이 아이템계의 존재를 암시
- Sensation — 맥동 컷신과 다이브 시퀀스의 시청각 임팩트

**5조건 충족 (ItemWorldEntry 리서치 §4):**

| 조건 | 충족 수단 | 시점 |
| :--- | :--- | :--- |
| 동기 (Motivation) | 바닥 glow + Lore 텍스트(B 호기심) + ATK Gate 존재(C 장애물) | 획득 전후 |
| 동의 (Consent) | 앵빌 [E] + DIVE [E] / BACK [ESC] 2단계 확인 | 앵빌 도달 이후 |
| 예고 (Preview) | Lore Popup의 "Memory Strata: N Floors" + 풀 프리뷰 패널 | 획득 시 + 첫 DIVE 시 |
| 안전망 (Safety Net) | [ESC] BACK + 첫 진입 시 Return 아이콘 0.5초 노출 | 프리뷰 + 착지 직후 |
| 학습 (Readiness) | Broken Blade로 이동/공격 학습 완료 후 Normal Blade 등장 | 획득 이전 |

**SDT 검증:**
- Autonomy — 자동 전송 제거. 모든 진입은 [E] 입력 2회 통과.
- Competence — 대비 효과(Broken Blade ↔ Normal Blade)가 획득의 성취감을 증폭.
- Relatedness — Tether가 "내 무기와 저 앵빌이 연결되어 있다"는 공간적 소속감을 전달.

**스파이크 검증:**
- Q1 스파이크를 강화하는가? — Lore="grain hums with forgotten echoes"와 Tether가 "이 무기 안에 세계가 있다"를 획득 순간에 선언한다. 강화한다.
- Q2 이 체계가 없으면 스파이크가 약해지는가? — 현재 빌드의 납치감은 스파이크를 약화시키고 있다. 약해진다.
- Q3 희석시키는가? — 오히려 아이템 = 단순 스탯 덩어리라는 인식을 제거한다. 희석하지 않는다.

---

## 3. 상세 규칙 (Detailed Rules)

### 3.0 용어

| 용어 | 정의 |
| :--- | :--- |
| T-(Teaching) | 1회성 연출. 최초 발동 후 영구 비활성화. 뉴 게임 시에만 초기화 |
| S-(System) | 다회성 연출. 매 발동 조건 충족 시 재생. 플레이 전반에 걸쳐 유지 |
| Tether | 획득 직후 에르다에서 가장 가까운 앵빌로 뻗는 레어리티 색상 점선 |
| Lore Popup | 아이템 최초 획득 시 이름/스프라이트/로어/스탯/Memory Strata 층수를 표시하는 모달 |
| Preview Panel | 앵빌 DIVE 선택 시 대상 아이템의 층수/적 레벨/에이전시(ESC)를 표시하는 패널 |
| seenItems | 플레이어 세이브에 누적되는 "해당 itemDefId로 Lore Popup을 본 적이 있다"는 영구 플래그 |
| firstPickupDone | 첫 온전한(Normal 이상) 아이템 획득 완료 플래그 (영구) |
| firstDiveDone | 첫 아이템계 진입 완료 플래그 (영구) |
| firstReturnShown | 첫 아이템계 착지 직후 Return 아이콘 노출 완료 플래그 (영구) |

### 3.1 플로우 마스터 다이어그램

```
[바닥 아이템 glow + 파티클]   ─── S1 다회성 (항상)
          │
[접근 = 자동 획득]             ─── S2 다회성 (항상)
          │
[Lore Popup 모달]              ─── S3 다회성 (해당 itemDefId 최초 획득 시 1회)
          │
[맥동 컷신 + 카메라 줌인]      ─── T2 1회성 (firstPickupDone === false)
[맥동 (줌 없음)]               ─── S4 다회성 (firstPickupDone === true)
          │
[앵빌 Tether 빛의 선]          ─── T3 1회성 (firstPickupDone === false)
[Tether 생략]                   ─── (firstPickupDone === true)
          │
[Tether 점선 잔상]             ─── T4 1회성 (Tether 발사 후 앵빌 도달까지)
          │
[앵빌 48px 접근 → [E] 프롬프트] ─── S5 다회성
          │
[대장간 UI: 아이템 그리드]     ─── S6 다회성 (인벤토리와 동일 그리드 재사용)
          │
[첫 DIVE → 풀 프리뷰 패널]     ─── T5 1회성 (firstDiveDone === false)
[2회차+ → 요약 프리뷰]         ─── S6 다회성 (firstDiveDone === true)
          │
[DIVE [E] 명시적 동의]          ─── S6 다회성
          │
[다이브 연출 (풀/단축/초단축)]  ─── S7 다회성 (진입 횟수별 §3.10)
          │
[아이템계 1층 착지]
          │
[Return 아이콘 0.5초 표시]      ─── T6 1회성 (firstReturnShown === false)
```

### 3.2 S1 — 바닥 아이템 Glow + 파티클

| 항목 | 값 |
| :--- | :--- |
| 트리거 | 아이템이 월드에 배치/드롭된 상태이며 플레이어 활성 씬 내 존재 |
| Glow 반경 | 기본 16px (레어리티 보정 ±50%, §3.9 참조) |
| Glow 색상 | `RARITY_COLOR[rarity]` 참조 (Normal `#FFFFFF` ~ Ancient `#00FF00`) |
| 파티클 스폰율 | Normal 2/s, Magic 3/s, Rare 4/s, Legendary 6/s, Ancient 8/s |
| 파티클 크기 | 1–3px 사각형, 레어리티 색상 |
| 파티클 이동 | 아이템 중심에서 위로 상승. `vy = -(10 + random(0-15))` px/s |
| 파티클 생존 | 600–1400ms 랜덤 |
| PixiJS 구현 | `GlowFilter(color, outerStrength)` + 전용 `ParticleContainer` |

### 3.3 S2 — 자동 획득 (Auto Pickup)

| 항목 | 값 |
| :--- | :--- |
| 트리거 | 플레이어 AABB와 아이템 픽업 AABB(16×16)가 접촉 |
| 획득 방식 | 즉시 획득. 별도 키 입력 불필요. 흐름 유지가 최우선 |
| 인벤토리 포화 시 | 아이템 위에 "INVENTORY FULL" 토스트 3초 표시. 획득 차단 |
| 사운드 | 레어리티별 공명음 (Normal 단음 → Ancient 화음 + 섬광) |

### 3.4 S3 — Lore Popup 모달 (조건부 다회성)

| 항목 | 값 |
| :--- | :--- |
| 트리거 | S2 획득 직후 `seenItems.has(itemDefId) === false` 일 때만 표시 |
| 표시 방식 | 화면 중앙 모달. 오버레이 `#000000` alpha 0.6. 입력 일시 정지 |
| 내용 | ① 무기 스프라이트 48×48 (상단) ② 이름 12px 흰색 ③ 로어 텍스트 2줄 영문 8px (`#ccccdd`) ④ 스탯 1줄 ("ATK 12  SPD 1.0") ⑤ "Memory Strata: N Floors" 라인 ⑥ 하단 "[X] CLOSE" |
| Lore 규칙 | 모든 무기 Lore에는 "memory", "echo", "stratum", "grain", "forge" 중 1단어 이상 포함 (아이템계 암시) |
| 닫기 | [X] 키. ESC는 본 모달에서 비활성 (ESC는 앵빌 BACK 전용) |
| 재획득 시 | `seenItems.has(itemDefId) === true` 이면 모달 생략. 토스트 1줄("Got Steel Longblade") 로만 전달 |
| 옵션 | Settings → "Always show item lore" 토글 (기본 OFF). ON 시 매 획득마다 모달 강제 표시 |
| 저장 | 닫기 시 `seenItems.add(itemDefId)` → 즉시 세이브 |

### 3.5 T2 / S4 — 무기 맥동 컷신

두 버전이 존재하며 `firstPickupDone` 플래그로 분기한다.

**T2 — 1회성 (첫 온전한 아이템 획득 후 1회)**

| 항목 | 값 |
| :--- | :--- |
| 트리거 | Lore Popup 닫기 직후 + `firstPickupDone === false` |
| 시퀀스 | ① 카메라 에르다 새 무기로 줌인 (0.3초, 스케일 1.0 → 1.5) ② 무기 다마스커스 결에 레어리티 색상 glow pulse 2회 (0.5초) ③ 맥동 정점에서 Tether 발사 (T3 연쇄) ④ 카메라 줌아웃 (0.3초) |
| 총 지속 | 약 1.5초. 이 시간 동안 플레이어 이동/공격 입력 봉쇄 |
| 종료 시 | `firstPickupDone = true` 저장 |

**S4 — 다회성 (2번째 아이템 획득부터 영구)**

| 항목 | 값 |
| :--- | :--- |
| 트리거 | Lore Popup 닫기 직후 또는 `seenItems` 재획득 토스트 직후 + `firstPickupDone === true` |
| 시퀀스 | 에르다 제자리에서 무기 맥동 glow pulse 2회 (0.4초). 카메라 줌 없음. 입력 봉쇄 없음 |
| 총 지속 | 0.4초 |

### 3.6 T3 / T4 — 앵빌 Tether (1회성)

| 항목 | 값 |
| :--- | :--- |
| 트리거 | T2 맥동 정점에서 발사. `firstPickupDone === false` 조건과 연동 |
| 선 시각 | 레어리티 색상, 두께 1–2px, 반투명 `alpha 0.8` |
| 방향 | 에르다 중심 → 현재 씬에서 가장 가까운 앵빌 엔티티 중심 |
| 앵빌이 시야 밖일 때 | 화면 가장자리로 뻗어 나감. 점선이 화면 경계에서 끊기며 방향 표시 역할 |
| 발사 이펙트 | 0.4초간 실선 밝음 → 점선 잔상으로 감쇄 (T4로 전환) |
| T4 잔상 | 점선 형태로 앵빌 도달까지 화면에 유지. 에르다 이동에 따라 시점 갱신. alpha 0.35 |
| 소멸 조건 | ① 플레이어가 해당 앵빌 48px 이내 접근 → 수렴 이펙트(0.2초) 후 소멸 ② 씬 전환 시 즉시 소멸. 다음 씬에서 재발사 없음 ③ 다른 앵빌이 더 가까워지면 대상 전환 (가장 가까운 앵빌을 항상 지정) |
| 재발동 | 없음. `firstPickupDone === true` 이후 모든 획득에서 Tether 생략 |
| PixiJS 구현 | `Graphics.moveTo/lineTo` + alpha tween + 점선 패턴 (예: `[4, 3]`) |

### 3.7 S5 — 앵빌 접근 프롬프트 (다회성)

| 항목 | 값 |
| :--- | :--- |
| 트리거 | 플레이어와 앵빌 중심 거리 ≤ 48px |
| 프롬프트 심볼 | [E] 아이콘. 앵빌 상단 +18px에 부유 |
| 맥동 | 레어리티-불문 흰색 기본. 단 Tether가 해당 앵빌에 수렴 중이면 Tether 색상과 동기화 |
| 텍스트 | 없음 (대사 0줄 원칙). 심볼만 사용 |
| 부가 힌트 | 기존 `Anvil.setShowHint` 흐름 대체. 텍스트 "UP: Place weapon"은 제거 |
| 기존 코드 접점 | `Anvil.ts` 의 hintText 제거, [E] 심볼 스프라이트 교체 |

### 3.8 S6 — 대장간 UI (다회성) + T5 풀 프리뷰 패널 (1회성)

#### 3.8.1 대장간 UI 진입

| 항목 | 값 |
| :--- | :--- |
| 트리거 | 앵빌 48px 이내에서 [E] 입력 |
| 레이아웃 | 현재 `InventoryUI` 5×4 그리드를 **그대로 재사용**. 타이틀만 "FORGE — SELECT WEAPON"으로 교체 |
| 모드 | `InventoryUI.open('anvil', onSelect)` (이미 존재하는 anvil 모드 경로 사용) |
| 차이점 제거 | 기존 텍스트 기반 `drawItemSelectUI`는 폐기. 인벤토리 UI와 일관된 그리드로 통일 (`LdtkWorldScene.drawItemSelectUI` 제거, `InventoryUI.openForAnvil` 경로로 단일화) |

#### 3.8.2 T5 — 첫 DIVE 풀 프리뷰 패널 (1회성)

| 항목 | 값 |
| :--- | :--- |
| 트리거 | 대장간 UI에서 아이템 선택 후 [E] 입력 + `firstDiveDone === false` |
| 표시 방식 | 대장간 UI 위에 중앙 모달. 배경 오버레이 alpha 0.75 |
| 내용 | ① 무기 이름 + 레어리티 배지 ② "Memory Stratum Lv.1" ③ "Floors: N" ④ "Enemies: Lv.A–B" ⑤ "Rewards: XP, Memory Shards, Fragments" ⑥ 구분선 ⑦ "[E] DIVE   [ESC] BACK" |
| 지속 | 입력 시까지 무기한 |
| 종료 시 | `firstDiveDone = true` 저장 |

#### 3.8.3 S6 요약 프리뷰 (다회성)

| 항목 | 값 |
| :--- | :--- |
| 트리거 | 대장간 UI에서 아이템 선택 후 [E] 입력 + `firstDiveDone === true` |
| 표시 방식 | 대장간 UI 하단 정보 영역에 1줄 요약 추가 (별도 모달 없음) |
| 내용 | "DIVE → Mem.Lv.1  Floors:N  Enemies:Lv.A-B   [E]OK [ESC]BACK" |
| 지속 | 입력 시까지 |

#### 3.8.4 진입 횟수 카운터

동일 `itemDefId`에 대한 누적 DIVE 횟수(`diveCount[itemDefId]`)를 세이브에 저장. §3.10 스킵 규칙 분기에 사용.

### 3.9 S7 — 다이브 연출 (다회성, 진입 횟수별 단축)

| 진입 횟수 | 연출 단계 | 총 지속 |
| :--- | :--- | :--- |
| 1회차 | 풀 시퀀스: 무기 클로즈업 → 리플 디스토션 → 아이리스 와이프 → 낙하 페이드 | 3.0초 |
| 2–5회차 | 단축: 리플 디스토션 → 아이리스 와이프 (무기 클로즈업 및 낙하 페이드 생략) | 0.8초 |
| 6회+ | 초단축: 아이리스 와이프만 | 0.3초 |
| 스킵 설정 ON | 화면 페이드 아웃/인만 | 0.1초 |

**카운터 기준:** `diveCount[itemDefId]`는 **해당 아이템당** 카운트. 다른 아이템으로 교체 시 해당 아이템 카운터는 그대로 유지. 즉, 새 아이템 첫 DIVE는 풀 시퀀스로 재생된다 (스파이크 재각인).

**스킵 설정:** Settings → "Skip dive cinematic" 토글. 기본 OFF. ON 시 모든 아이템/모든 횟수에서 0.1초 페이드만 재생.

**기존 코드 접점:** `MemoryDive`와 `FloorCollapse`를 풀 시퀀스 정의로 유지. 단축/초단축은 동일 파이프라인의 스킵 파라미터로 제어.

### 3.10 T6 — Return 아이콘 (1회성)

| 항목 | 값 |
| :--- | :--- |
| 트리거 | 아이템계 1층 첫 착지 + `firstReturnShown === false` |
| 표시 위치 | 화면 좌상단 (x: 8, y: 8) |
| 아이콘 | [ESC] 심볼 + 작은 위쪽 화살표. 크기 24×24 |
| 텍스트 | "Return to Surface" 영문 8px, 아이콘 우측. 대사 규칙 예외: **영문 1줄 2초 노출 허용** |
| 지속 | 0.5초 풀사이즈 → 1.5초 축소(12×12) → 유지 (HUD로 전환) |
| 종료 시 | `firstReturnShown = true` 저장 |
| 2회차+ | 표시 없음. 아이콘만 HUD 기본 크기(12×12)로 상시 노출 |

### 3.11 S8 — 레어리티 시각 위계 (다회성, 레퍼런스)

| 레어리티 | Glow 강도 | 파티클 | 추가 이펙트 |
| :--- | :--- | :--- | :--- |
| Normal | 약 (8px halo) | 2/s | 없음 |
| Magic | 중 (12px halo) | 3/s | 펄스 1.5s 주기 |
| Rare | 강 (16px halo) | 4/s | 펄스 1.0s 주기 |
| Legendary | 강 (20px halo) | 6/s | 1s 간격 섬광 |
| Ancient | 최강 (24px halo) | 8/s | 공간 왜곡 (chromatic aberration 2px) |

---

## 4. 공식 (Formulas)

### Glow halo 크기 (S1)

```
haloSize = baseHalo[rarity] + sin(t * pulseSpeed) * haloAmplitude
```

Ancient 기준: `baseHalo=24, haloAmplitude=4, pulseSpeed=3π` → 20–28px 진동

### Tether 점선 감쇄 (T4)

```
alpha = lerp(0.8, 0.35, min(1, elapsedMs / 400))
dashOffset = (elapsedMs * 0.02) % (dashLength + gapLength)   // 흐름 효과
```

### 다이브 연출 지속시간 (S7)

```
diveDuration = lookup[ min(diveCount[itemDefId], 6) ]
// 1: 3000ms, 2–5: 800ms, 6+: 300ms, skipOption: 100ms
```

---

## 5. 엣지 케이스 (Edge Cases)

| 상황 | 처리 방식 |
| :--- | :--- |
| 첫 아이템이 Normal이 아니라 Magic+ (랜덤 시드 상황) | T2/T3 규칙은 "첫 온전한 아이템" 기준이므로 Magic+ 에서도 동일 발동. Normal 고정은 튜토리얼 스크립팅으로 보장 |
| Tether 발사 시점에 앵빌이 존재하지 않는 씬 | T3/T4 생략. 맥동 컷신만 재생. 다음 앵빌 포함 씬 진입 시 재발사 없음 (1회성 플래그는 "첫 맥동 컷신"에 바인딩) |
| Lore Popup 도중 씬 전환 (포탈 등) | 모달 강제 닫기. `seenItems` 추가는 **하지 않음** (미완료 획득). 다음 획득 시 재표시 |
| 인벤토리 포화 상태에서 획득 시도 | S1/S2만 유지, S3 이후 전 연출 스킵. "INVENTORY FULL" 토스트 |
| 다이브 연출 중 게임 창 비활성화 | `requestAnimationFrame` 일시 정지. 복귀 시 이어서 재생. 카운터 증가는 착지 시점에만 수행 |
| 스킵 설정 ON + 첫 진입 | T5 프리뷰 패널은 **유지**(정보 전달). S7 연출만 단축. 첫 진입에서 교습 의무는 보존 |
| 동일 아이템을 버리고 재획득 | `seenItems`에 이미 있으므로 Lore Popup 스킵. 토스트만 표시 |
| Broken Blade 획득 | T1 튜토리얼 아이템 — 바닥 배치 아님 (시작 시 소지). S1~S3 발동 안 함. 첫 Normal Blade 획득 시에만 T2/T3 발동 |
| 같은 씬에 앵빌 2개 이상 | T3 Tether는 "가장 가까운 1개"만 선택. 플레이어 이동으로 다른 앵빌이 더 가까워지면 대상 전환 |
| 세이브 로드 직후 미완 획득 재현 | 세이브 시점에 아이템이 인벤토리 있음 + `seenItems`에 없음 → 로드 후 Lore Popup 재표시 (안전 리커버리) |

---

## 6. 의존성 (Dependencies)

| 방향 | 대상 | 계약 |
| :--- | :--- | :--- |
| 읽음 | `ItemInstance` | itemDefId, rarity, name, lore, stats, 층수 |
| 읽음 | `PlayerSave` | seenItems, firstPickupDone, firstDiveDone, firstReturnShown, diveCount, settings(skipDive, alwaysShowLore) |
| 쓰기 | `PlayerSave` | 위 플래그/카운터 갱신 |
| 제공 | 1회성 플래그 API | `hasSeenItem(id)`, `markItemSeen(id)`, `markFirstPickupDone()` 등 |
| 트리거 | `FloorCollapse + MemoryDive` | 풀 다이브 시퀀스 |
| 트리거 | `InventoryUI.openForAnvil` | 대장간 UI 그리드 진입 경로 (`drawItemSelectUI` 폐기) |
| 제공 | S1 Glow 이펙트 | 월드 배치 아이템 엔티티에서 소비 |

---

## 7. 튜닝 노브 (Tuning Knobs)

| 노브 | 위치 | 범위 | 카테고리 | 기본값 | 설명 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| S1 haloSize (레어리티별) | SacredPickup 설정 | 4–32px | Feel | 8–24px | 바닥 glow 반경 |
| S1 particleRate | SacredPickup 설정 | 1–12/s | Feel | 2–8/s | 파티클 스폰율 |
| T2 zoomDuration | 컷신 | 0.2–0.6초 | Feel | 0.3초 | 카메라 줌 시간 |
| T3 tetherLength | Tether | 제한 없음–화면 대각 | Feel | 씬 끝까지 | 시야 밖 처리 |
| T4 tetherAlphaDecay | Tether | 200–800ms | Feel | 400ms | 실선 → 점선 감쇄 시간 |
| S7 duration[tier] | 다이브 연출 | 0.1–4.0초 | Feel | 0.1/0.3/0.8/3.0 | 진입 횟수 티어별 지속 |
| S3 alwaysShowLore | Settings | bool | UX | false | 옵션 강제 |
| S7 skipDive | Settings | bool | UX | false | 옵션 강제 |
| T6 returnIconHoldMs | 안전망 | 0.3–2초 | UX | 500+1500ms | 첫 진입 Return 아이콘 풀사이즈/축소 지속 |

---

## 8. 검증 체크리스트 (Acceptance Criteria)

**기능 검증:**
- [ ] 바닥 아이템이 레어리티 색상 halo로 glow한다 (S1)
- [ ] 접근 시 자동 획득된다 (S2)
- [ ] 첫 획득 시 Lore Popup이 표시되고 [X]로만 닫힌다 (S3)
- [ ] 동일 `itemDefId` 재획득 시 Lore Popup이 생략된다 (S3 재획득 규칙)
- [ ] 첫 온전한 아이템 획득 시 카메라 줌인 + Tether가 발동한다 (T2/T3)
- [ ] 두 번째 아이템 획득 시 맥동만 발동하고 줌/Tether는 생략된다 (S4)
- [ ] Tether가 가장 가까운 앵빌로 뻗고, 앵빌 도달 시 수렴 소멸한다 (T3/T4)
- [ ] 앵빌 48px 이내에서 [E] 프롬프트가 표시된다 (S5)
- [ ] [E] → 대장간 UI가 인벤토리와 동일한 5×4 그리드로 열린다 (S6)
- [ ] 첫 DIVE 시 풀 프리뷰 패널이 표시된다 (T5)
- [ ] 2회차 이후 DIVE는 요약 프리뷰로 전환된다 (S6)
- [ ] 아이템별 `diveCount`에 따라 다이브 연출이 풀/단축/초단축으로 전환된다 (S7)
- [ ] 첫 아이템계 착지 시 Return 아이콘이 0.5초 풀사이즈로 표시된다 (T6)
- [ ] 플래그는 모두 세이브에 영구 저장되며 로드 시 복원된다
- [ ] 옵션 "Skip dive cinematic" ON 시 모든 진입에서 0.1초 페이드만 재생된다 (T5 패널은 유지)

**경험 검증:**
- [ ] 플레이어가 "왜 거기에 들어갔는지" 스스로 설명할 수 있다 (에이전시 확보)
- [ ] Lore 텍스트만으로 "이 안에 뭔가 있다"를 플레이어가 감지한다 (예고)
- [ ] Tether가 앵빌의 존재와 위치를 **대사 없이** 전달한다 (공간적 유도)
- [ ] 2번째 아이템 획득 시 플레이어가 "아까처럼 앵빌에 가면 되겠지"라고 스스로 연결한다 (교습 → 시스템 전환)
- [ ] Broken Blade → Normal Blade 대비로 "온전한 아이템은 특별하다"를 체험으로 전달한다
- [ ] 10회차 이후 반복 진입이 답답하지 않다 (0.3초 초단축)

---

## 구현 우선순위

| 단계 | 작업 | 의존성 |
| :--- | :--- | :--- |
| P0 | PlayerSave 플래그 확장 (seenItems, firstPickupDone, firstDiveDone, firstReturnShown, diveCount) | PlayerSave 시스템 |
| P0 | `drawItemSelectUI` 제거 → `InventoryUI.openForAnvil` 단일화 | InventoryUI |
| P1 | S3 Lore Popup 모달 구현 | PixiJS 모달 기반 |
| P1 | T6 Return 아이콘 (1회성) | HUD |
| P2 | S1 Glow + 파티클 이펙트 | GlowFilter |
| P2 | T2/S4 맥동 컷신 | 카메라 제어 |
| P2 | T3/T4 Tether | Graphics 점선 |
| P3 | S7 진입 횟수 티어별 연출 | MemoryDive 파이프라인 |
| P3 | T5 풀 프리뷰 패널 | 대장간 UI 위 모달 |
| P4 | Settings 옵션 (alwaysShowLore, skipDive) | 설정 시스템 |

---

## 참조

- `Documents/Research/ItemWorldEntry_NaturalOnboarding_Research.md` §7 (Sacred Pickup) / §7.8 (1회성/다회성 분류) / §8 (스킵 반복 진입)
- `Documents/Research/Zelda_Onboarding_Evolution_Research.md` §6 (ECHORIS 적용 매핑) — 특히 "아이템 메시지 1회 제한" (SS HD 개선 교훈)
- `Documents/Feedback/Playtest_2026-04-17.md` — 납치감 3요소 문제 정의
- `Documents/System/System_World_Interactables.md` §3.1 — Anvil 엔티티 기반 명세
- `Documents/System/System_ItemWorld_Core.md` — 아이템계 진입 규칙 (장착 해제 필수 포함)
- `Documents/UI/UI_Inventory.md` — 재사용되는 그리드 UI
- `Documents/UI/UI_Notifications.md` — 토스트/힌트와의 경계
