# ECHORIS: 무기 목록 (Weapon List)

## 구현 현황 (Implementation Status)

> **최근 업데이트:** 2026-04-13
> **문서 상태:** `작성 중 (Draft)`
> **SSoT:** `Sheets/Content_Stats_Weapon_List.csv`
> **코드:** `game/src/data/weapons.ts`

| 항목 | 상태 | 비고 |
|:-----|:-----|:-----|
| Sword 5종 (Normal-Ancient) | ✅ 구현 완료 | CSV + 코드 파싱 완료 |
| Sword 3타 콤보 | ⏳ 대기 | WPN-02-A |
| Sword 히트박스 정의 | ⏳ 대기 | WPN-02-B |
| Greatsword (대검) | ⏳ 대기 | Build 1+. WPN-04-B |
| Dagger (단검) | ⏳ 대기 | Build 1+. WPN-04-A |
| Bow (활) | ⏳ 대기 | Build 1+. WPN-04-F |
| Staff (지팡이) | ⏳ 대기 | Build 1+. WPN-04-E |
| 무기 차별화 3축 시스템 | ⏳ 대기 | WPN-01-B |
| 시그니처 메커닉 5종 | ⏳ 대기 | WPN-01-C. Build 1+ |

---

## 0. 필수 참고 자료 (Mandatory References)

- 무기 수치 SSoT: `Sheets/Content_Stats_Weapon_List.csv`
- 무기 코드 파서: `game/src/data/weapons.ts`
- 무기 시스템 GDD: `Documents/System/System_Combat_Weapons.md`
- 레어리티 설정: `game/src/data/rarityConfig.ts`
- 애니메이션 규격: `Documents/Design/Design_Art_AnimationSpec.md`
- 데미지 시스템: `Documents/System/System_Combat_Damage.md`

---

## 1. 무기 차별화 3축

무기 카테고리 5종은 **사거리 / 공격속도 / 범위** 3축으로 차별화된다.
이 3축은 ATK/INT 수치와 독립적으로 전투 스타일을 결정하는 게임플레이 축이다.

| 무기 | 사거리 | 공격속도 | 범위 | 특기 |
|:-----|:------:|:-------:|:----:|:-----|
| Sword (검) | 중간 (64px) | 보통 (x1.0) | 중간 | 3타 피니셔 고데미지. 밸런스 기준 |
| Greatsword (대검) | 길다 (96px 내외) | 느림 (x0.6) | 넓음 | 충격파 발사. 슈퍼아머 없음. 파워형 |
| Dagger (단검) | 짧다 (40px 내외) | 빠름 (x1.6) | 좁음 | 배후 강타 x3.0. 포지셔닝 의존 |
| Bow (활) | 원거리 (240px 내외) | 보통 (x1.0) | 점형 | 대시 직후 데미지 x1.2. 카이팅 특화 |
| Staff (지팡이) | 중거리 (160px 내외) | 느림 (x0.7) | 넓음 | 유일 INT 스케일링. 원소 증폭 x1.5 |

**3축 트레이드오프 원칙:**
어떤 무기도 3축 모두에서 최우위일 수 없다. 사거리가 길면 속도가 느리거나 범위가 좁다. 이것이 무기 선택을 의미 있는 결정으로 만든다.

---

## 2. 무기 전체 목록

### 2.1. Build 0 구현 범위: Sword (검) 5종

SSoT: `Sheets/Content_Stats_Weapon_List.csv`
파서: `game/src/data/weapons.ts` — `SWORD_DEFS[]` 배열

| WeaponID | Name | Type | Rarity | BaseATK | AtkSpeed | Range | HitboxW | HitboxH |
|:---------|:-----|:-----|:------:|:-------:|:--------:|:-----:|:-------:|:-------:|
| sword_normal | Starter Blade | Sword | Normal | 15 | 1.0 | 64 | 45 | 19 |
| sword_magic | Steel Longsword | Sword | Magic | 20 | 1.0 | 64 | 45 | 19 |
| sword_rare | Rune Blade | Sword | Rare | 26 | 1.0 | 68 | 47 | 20 |
| sword_legendary | Abyssal Edge | Sword | Legendary | 33 | 1.05 | 72 | 49 | 21 |
| sword_ancient | Abyss Phantom | Sword | Ancient | 45 | 1.1 | 76 | 51 | 22 |

**레어리티별 성장 배율 (기준: sword_normal = x1.0):**

| 레어리티 | BaseATK 배율 | Range 증가 | HitboxW 증가 | AtkSpeed 증가 |
|:--------|:----------:|:---------:|:-----------:|:------------:|
| Normal | x1.00 | 기준 64px | 기준 45px | 기준 x1.00 |
| Magic | x1.33 | +0px | +0px | +0.0 |
| Rare | x1.73 | +4px | +2px | +0.0 |
| Legendary | x2.20 | +8px | +4px | +0.05 |
| Ancient | x3.00 | +12px | +6px | +0.10 |

**레어리티별 아이템계 지층 수 (CLAUDE.md 정의 기준):**

| 레어리티 | 지층 수 | 이노센트 슬롯 | 스탯 배율 |
|:--------|:------:|:----------:|:--------:|
| Normal | 2지층 | 2 | x1.0 |
| Magic | 3지층 | 3 | x1.3 |
| Rare | 3지층 | 4 | x1.7 |
| Legendary | 4지층 | 6 | x2.2 |
| Ancient | 4지층 + 심연 | 8 | x3.0 |

### 2.2. Sword 히트박스 설명

```
[Sword 히트박스 시각화 (지상 기준, 에르다 오른쪽 공격)]

에르다 위치: x=0, y=0 (발 기준)
히트박스 중심: x=+32 (에르다 앞쪽)
히트박스 크기: 45×19 px

     ┌─────────────────────────────────────────────┐
     │                                             │
     │   [에르다 32×48px]    [히트박스 45×19px]    │
     │                      ←────45px────→         │
     │                      ┌─────────────┐        │
     │                      │ ↕ 19px      │        │
     │                      └─────────────┘        │
     └─────────────────────────────────────────────┘
```

Rare 이상에서 히트박스 소폭 확대: 레어리티가 올라갈수록 검이 길어지는 것을 게임플레이로 체감할 수 있게 설계.

### 2.3. Sword 3타 콤보 설계 (WPN-02-A 기준)

| 타수 | 방향 | 히트박스 위치 | 데미지 배율 | 비고 |
|:-----|:-----|:----------:|:---------:|:-----|
| 1타 | 수평 (전방) | 전방 중심 | x1.0 | 기본 데미지 |
| 2타 | 대각 하향 | 전방 하단 | x1.0 | 지상 적 우선 |
| 3타 (피날레) | 대회전 | 전방 전체 | x2.0 | 1-2타 합산보다 강. 후딜 600ms |

공중 공격:
- 공중 전방: 수평 방향 히트박스
- 공중 하방: 수직 하향 히트박스 (플런지 어택)

---

## 3. Build 1+ 확장 무기 (미구현)

### 3.1. Greatsword (대검) — 파워형

> **설계 상태:** WPN-04-B 정의 완료. 구현 대기.

| 항목 | 예정 값 | 근거 |
|:-----|:------:|:-----|
| BaseATK (Normal) | 22 | Sword Normal(15)의 x1.47. 느린 속도 보상 |
| AtkSpeed | x0.6 | Sword 대비 40% 느림 |
| Range | 96px 내외 | Sword보다 1.5배 사거리 |
| 콤보 타수 | 2타 | 각 타격의 전략 가중치 최대화 |
| 시그니처 | 2타에 80px 전방 충격파 | 범위 딜. 군집 정리용 |
| 특이사항 | 슈퍼아머 없음 | 슈퍼아머 = 지배적 전략 위험 |

### 3.2. Dagger (단검) — 스피드형

> **설계 상태:** WPN-04-A 정의 완료. 구현 대기.

| 항목 | 예정 값 | 근거 |
|:-----|:------:|:-----|
| BaseATK (Normal) | 10 | Sword Normal(15)의 x0.67. 빠른 속도 페널티 |
| AtkSpeed | x1.6 | Sword 대비 60% 빠름 |
| Range | 40px 내외 | Sword보다 짧음. 근접 필수 |
| 콤보 타수 | 4타 | 연사 느낌. 배후 강타 4타에 연동 |
| 시그니처 | 배후 강타 x3.0 | 4타를 적 등 방향에서 완성 시 |
| 특이사항 | 잔상 이펙트 | 속도감 시각화 (VFX 대체) |

### 3.3. Bow (활) — 원거리 물리형

> **설계 상태:** WPN-04-F 정의 완료. 구현 대기.

| 항목 | 예정 값 | 근거 |
|:-----|:------:|:-----|
| BaseATK (Normal) | 12 | 원거리 안전성에 대한 데미지 패널티 |
| AtkSpeed | x1.0 | Sword와 동일. 화살 도달 시간 있음 |
| Range | 240px 내외 | 화면 너비(640px)의 37.5%. 실질 원거리 |
| 콤보 타수 | 3타 | 탭 기반. 대시 직후 카이팅 샷 |
| 시그니처 | 대시 직후 발사 시 x1.2 데미지 + 정확도 100% | 카이팅 보상 |
| 투사체 | 화살 스프라이트 별도 | Bow 전용 VFX 필요 |

### 3.4. Staff (지팡이) — 원소형 (유일 INT 무기)

> **설계 상태:** WPN-04-E 정의 완료. 구현 대기.

| 항목 | 예정 값 | 근거 |
|:-----|:------:|:-----|
| BaseATK (Normal) | 0 | ATK 스케일링 없음 |
| BaseINT (Normal) | 18 | INT 유일 스케일링 무기 |
| AtkSpeed | x0.7 | 차징 모션으로 인한 느린 속도 |
| Range | 160px 내외 | 중거리. 투사체 기반 |
| 콤보 타수 | 3타 투사체 | 3발 차징 → 연사 |
| 시그니처 | 인챈트 효과 x1.5 원소 증폭 | INT 스탯 존재 이유 |
| 특이사항 | 원소 선택 (화/빙/번개) | Phase 2 원소 시스템 연동 |

---

## 4. 무기 시스템 핵심 규칙 (Build 0 적용)

### 4.1. 무기 슬롯 규칙

- 동시 장착: 1개만 허용 (WPN-03-A)
- 전투 중 교체: Build 0에서 불가. Build 1+에서 허용 예정 (WPN-03-B)

### 4.2. ATK 적용 공식

실제 데미지 계산은 `Documents/System/System_Combat_Damage.md` 참조.
무기 BaseATK는 최종 데미지 공식의 입력값 역할을 담당한다.

```
실질 ATK = BaseATK × RARITY_MULTIPLIER[rarity]
```

레어리티 배율은 `game/src/data/rarityConfig.ts` (CSV 기반)가 SSoT.

### 4.3. 아이템계 연동

무기를 장비하면 해당 무기의 아이템계에 진입 가능. 레어리티가 높을수록 지층 수가 많아 더 많은 이노센트와 강화 기회를 제공.
**진입 조건:** 세이브 포인트(대장간)에서만 가능. 아이템계 내부에서 중첩 진입 불가.

---

## 5. 향후 확장 슬롯 (Build 1+ 예약)

아래 행들은 추후 추가될 무기 카테고리를 위한 예약 슬롯이다.
CSV에 행을 추가하는 것만으로 코드 변경 없이 신규 무기 정의가 가능하다.

| WeaponID (예약) | Name (예약) | Type | Rarity | BaseATK | AtkSpeed | Range | HitboxW | HitboxH |
|:---------------|:-----------|:-----|:------:|:-------:|:--------:|:-----:|:-------:|:-------:|
| greatsword_normal | (미정) | Greatsword | Normal | (미정) | 0.6 | (미정) | (미정) | (미정) |
| greatsword_magic | (미정) | Greatsword | Magic | (미정) | 0.6 | (미정) | (미정) | (미정) |
| greatsword_rare | (미정) | Greatsword | Rare | (미정) | 0.6 | (미정) | (미정) | (미정) |
| greatsword_legendary | (미정) | Greatsword | Legendary | (미정) | 0.63 | (미정) | (미정) | (미정) |
| greatsword_ancient | (미정) | Greatsword | Ancient | (미정) | 0.66 | (미정) | (미정) | (미정) |
| dagger_normal | (미정) | Dagger | Normal | (미정) | 1.6 | (미정) | (미정) | (미정) |
| dagger_magic | (미정) | Dagger | Magic | (미정) | 1.6 | (미정) | (미정) | (미정) |
| dagger_rare | (미정) | Dagger | Rare | (미정) | 1.6 | (미정) | (미정) | (미정) |
| dagger_legendary | (미정) | Dagger | Legendary | (미정) | 1.65 | (미정) | (미정) | (미정) |
| dagger_ancient | (미정) | Dagger | Ancient | (미정) | 1.70 | (미정) | (미정) | (미정) |
| bow_normal | (미정) | Bow | Normal | (미정) | 1.0 | 240 | (미정) | (미정) |
| bow_magic | (미정) | Bow | Magic | (미정) | 1.0 | 250 | (미정) | (미정) |
| bow_rare | (미정) | Bow | Rare | (미정) | 1.0 | 260 | (미정) | (미정) |
| bow_legendary | (미정) | Bow | Legendary | (미정) | 1.05 | 270 | (미정) | (미정) |
| bow_ancient | (미정) | Bow | Ancient | (미정) | 1.10 | 280 | (미정) | (미정) |
| staff_normal | (미정) | Staff | Normal | (미정) | 0.7 | 160 | (미정) | (미정) |
| staff_magic | (미정) | Staff | Magic | (미정) | 0.7 | 165 | (미정) | (미정) |
| staff_rare | (미정) | Staff | Rare | (미정) | 0.7 | 170 | (미정) | (미정) |
| staff_legendary | (미정) | Staff | Legendary | (미정) | 0.73 | 175 | (미정) | (미정) |
| staff_ancient | (미정) | Staff | Ancient | (미정) | 0.76 | 180 | (미정) | (미정) |

> **주의:** 위 예약 슬롯의 수치는 확정이 아닌 참고용 초안이다. Build 1 밸런싱 단계에서 `System_Combat_Weapons.md`의 공식 기반으로 검증 후 CSV에 반영한다.
