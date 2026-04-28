# ECHORIS: 무기 목록 (Weapon List)

## 구현 현황 (Implementation Status)

> **최근 업데이트:** 2026-04-18
> **문서 상태:** `작성 중 (Draft)`
> **SSoT:** `Sheets/Content_Stats_Weapon_List.csv`
> **코드:** `game/src/data/weapons.ts`
> **분류 결정:** `memory/wiki/decisions/DEC-026.md` (무기 7종 + sci-fi 리네이밍)

| 항목 | 상태 | 비고 |
|:-----|:-----|:-----|
| Blade 5종 (Normal-Ancient) | ✅ 구현 완료 | CSV + 코드 파싱 완료. 내부 WeaponID=sword_* 유지 |
| Blade 3타 콤보 | ⏳ 대기 | WPN-02-A |
| Blade 히트박스 정의 | ⏳ 대기 | WPN-02-B |
| Cleaver (격벽 파쇄도) | ⏳ 대기 | Build 1+. WPN-04-B |
| Shiv (외과 단도) | ⏳ 대기 | Build 1+. WPN-04-A |
| Harpoon (리바 장창) | ⏳ 대기 | Build 1+. WPN-04-H. 신규 카테고리 |
| Chain (강철 사슬) | ⏳ 대기 | Build 1+. WPN-04-I. 신규 카테고리 |
| Railbow (전자기 투척기) | ⏳ 대기 | Build 1+. WPN-04-F |
| Emitter (파동 방출기) | ⏳ 대기 | Build 1+. WPN-04-E |
| 무기 차별화 3축 시스템 | ⏳ 대기 | WPN-01-B |
| 시그니처 메커닉 7종 | ⏳ 대기 | WPN-01-C. Build 1+ |

---

## 0. 필수 참고 자료 (Mandatory References)

- 무기 수치 SSoT: `Sheets/Content_Stats_Weapon_List.csv`
- 무기 코드 파서: `game/src/data/weapons.ts`
- 무기 시스템 GDD: `Documents/System/System_Combat_Weapons.md`
- 레어리티 설정: `game/src/data/rarityConfig.ts`
- 애니메이션 규격: `Documents/Design/Design_Art_AnimationSpec.md`
- 데미지 시스템: `Documents/System/System_Combat_Damage.md`
- 분류 결정 로그: `memory/wiki/decisions/DEC-026.md`

---

## 1. 무기 차별화 3축

무기 카테고리 7종은 **사거리 / 공격속도 / 범위** 3축으로 차별화된다.
이 3축은 ATK/INT 수치와 독립적으로 전투 스타일을 결정하는 게임플레이 축이다.

| 내부 구분 | 무기 (표시명) | 사거리 | 공격속도 | 범위 | 특기 |
|:---------|:--------------|:------:|:-------:|:----:|:-----|
| 근접 | Blade | 중간 (64px) | 보통 (x1.0) | 중간 | 3타 피니셔 고데미지. 밸런스 기준 |
| 근접 | Cleaver | 길다 (96px 내외) | 느림 (x0.6) | 넓음 | 충격파 발사. 슈퍼아머 없음. 파워형 |
| 근접 | Shiv | 짧다 (40px 내외) | 빠름 (x1.6) | 좁음 | 배후 강타 x3.0. 포지셔닝 의존 |
| 근접 | Harpoon | 긺 (112px 내외) | 보통 (x0.8) | 직선 | 관통 최대 3체. 리치 지배형 |
| 근접 | Chain | 가변 (48~120px) | 보통 (x0.9) | 곡선 | 끝단 강타 x2.0. 범위/리치 양용 |
| 원거리 | Railbow | 원거리 (240px 내외) | 보통 (x1.0) | 점형 | 대시 직후 데미지 x1.2. 카이팅 특화 |
| 원거리 | Emitter | 중거리 (160px 내외) | 느림 (x0.7) | 넓음 | 유일 INT 스케일링. 원소 증폭 x1.5 |

**3축 트레이드오프 원칙:**
어떤 무기도 3축 모두에서 최우위일 수 없다. 사거리가 길면 속도가 느리거나 범위가 좁다. 이것이 무기 선택을 의미 있는 결정으로 만든다.

**세계관 해석 (DEC-026 기준):**

| 무기 | 세계관 해석 |
|:-----|:-----------|
| Blade | 단조 공방의 한손 절삭기 |
| Cleaver | 격벽/강판 파쇄도 |
| Shiv | 외과/암살용 단도 |
| Harpoon | 거대 빌더 리바(rebar) 장창 |
| Chain | 산업용 강철 사슬. 리깅/견인 기구 재활용 |
| Railbow | 전자기 가속 투척기 |
| Emitter | 파동 방출 장비 (Graviton 계열) |

---

## 2. 무기 전체 목록

### 2.1. Build 0 구현 범위: Blade (절삭기) 5종

SSoT: `Sheets/Content_Stats_Weapon_List.csv`
파서: `game/src/data/weapons.ts` — `SWORD_DEFS[]` 배열 (WeaponID 내부값은 `sword_*` 유지)

| WeaponID | Name | Type | Rarity | BaseATK | AtkSpeed | Range | HitboxW | HitboxH |
|:---------|:-----|:-----|:------:|:-------:|:--------:|:-----:|:-------:|:-------:|
| sword_normal | Starter Blade | Blade | Normal | 15 | 1.0 | 64 | 45 | 19 |
| sword_magic | Steel Longblade | Blade | Magic | 20 | 1.0 | 64 | 45 | 19 |
| sword_rare | Rune Blade | Blade | Rare | 26 | 1.0 | 68 | 47 | 20 |
| sword_legendary | Abyssal Edge | Blade | Legendary | 33 | 1.05 | 72 | 49 | 21 |
| sword_ancient | Abyss Phantom | Blade | Ancient | 45 | 1.1 | 76 | 51 | 22 |

**레어리티별 성장 배율 (기준: sword_normal = x1.0):**

| 레어리티 | BaseATK 배율 | Range 증가 | HitboxW 증가 | AtkSpeed 증가 |
|:--------|:----------:|:---------:|:-----------:|:------------:|
| Normal | x1.00 | 기준 64px | 기준 45px | 기준 x1.00 |
| Magic | x1.33 | +0px | +0px | +0.0 |
| Rare | x1.73 | +4px | +2px | +0.0 |
| Legendary | x2.20 | +8px | +4px | +0.05 |
| Ancient | x3.00 | +12px | +6px | +0.10 |

**레어리티별 아이템계 지층 수 (CLAUDE.md 정의 기준):**

| 레어리티 | 지층 수 | 기억 단편 슬롯 | 스탯 배율 |
|:--------|:------:|:----------:|:--------:|
| Normal | 2지층 | 2 | x1.0 |
| Magic | 3지층 | 3 | x1.3 |
| Rare | 3지층 | 4 | x1.7 |
| Legendary | 4지층 | 6 | x2.2 |
| Ancient | 4지층 + 심연 | 8 | x3.0 |

### 2.2. Blade 히트박스 설명

```
[Blade 히트박스 시각화 (지상 기준, 에르다 오른쪽 공격)]

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

Rare 이상에서 히트박스 소폭 확대: 레어리티가 올라갈수록 날이 길어지는 것을 게임플레이로 체감할 수 있게 설계.

### 2.3. Blade 3타 콤보 설계 (WPN-02-A 기준)

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

### 3.1. Cleaver (격벽 파쇄도) — 파워형

> **설계 상태:** WPN-04-B 정의 완료. 구현 대기.

| 항목 | 예정 값 | 근거 |
|:-----|:------:|:-----|
| BaseATK (Normal) | 22 | Blade Normal(15)의 x1.47. 느린 속도 보상 |
| AtkSpeed | x0.6 | Blade 대비 40% 느림 |
| Range | 96px 내외 | Blade보다 1.5배 사거리 |
| 콤보 타수 | 2타 | 각 타격의 전략 가중치 최대화 |
| 시그니처 | 2타에 80px 전방 충격파 | 범위 딜. 군집 정리용 |
| 특이사항 | 슈퍼아머 없음 | 슈퍼아머 = 지배적 전략 위험 |

### 3.2. Shiv (외과 단도) — 스피드형

> **설계 상태:** WPN-04-A 정의 완료. 구현 대기.

| 항목 | 예정 값 | 근거 |
|:-----|:------:|:-----|
| BaseATK (Normal) | 10 | Blade Normal(15)의 x0.67. 빠른 속도 페널티 |
| AtkSpeed | x1.6 | Blade 대비 60% 빠름 |
| Range | 40px 내외 | Blade보다 짧음. 근접 필수 |
| 콤보 타수 | 4타 | 연사 느낌. 배후 강타 4타에 연동 |
| 시그니처 | 배후 강타 x3.0 | 4타를 적 등 방향에서 완성 시 |
| 특이사항 | 잔상 이펙트 | 속도감 시각화 (VFX 대체) |

### 3.3. Harpoon (거대 빌더 리바 장창) — 리치형 (신규)

> **설계 상태:** WPN-04-H 정의 완료. 구현 대기.

| 항목 | 예정 값 | 근거 |
|:-----|:------:|:-----|
| BaseATK (Normal) | 16 | Blade Normal(15)의 x1.07. 관통 보상 고려 |
| AtkSpeed | x0.8 | Blade보다 20% 느림 |
| Range | 112px 내외 | Blade의 1.75배. Cleaver보다 김 |
| 콤보 타수 | 3타 | 찌르기-찌르기-힘찌르기 |
| 시그니처 | 관통 최대 3체 + 피해 감쇠 (2체째 -20%, 3체째 -40%) | 일렬 군집 학살 |
| 특이사항 | 좁은 종축 히트박스 (16px) | 범위는 희생. 사거리에 집중 |

### 3.4. Chain (강철 사슬) — 가변 리치형 (신규)

> **설계 상태:** WPN-04-I 정의 완료. 구현 대기.

| 항목 | 예정 값 | 근거 |
|:-----|:------:|:-----|
| BaseATK (Normal) | 14 | Blade Normal(15)의 x0.93. 유틸리티 보정 |
| AtkSpeed | x0.9 | Blade보다 10% 느림 |
| Range | 48~120px 가변 | 차징 시간에 따라 리치 확장 |
| 콤보 타수 | 3타 | 휘감기-휘감기-원심타 |
| 시그니처 | 끝단 12px 히트시 x2.0 데미지 (격간사 장착시 +4px 판정창) | 거리 관리 보상 |
| 특이사항 | 곡선 판정 (호 형상) | 수직/대각 적 커버 |

### 3.5. Railbow (전자기 투척기) — 원거리 물리형

> **설계 상태:** WPN-04-F 정의 완료. 구현 대기.

| 항목 | 예정 값 | 근거 |
|:-----|:------:|:-----|
| BaseATK (Normal) | 12 | 원거리 안전성에 대한 데미지 패널티 |
| AtkSpeed | x1.0 | Blade와 동일. 투사체 도달 시간 있음 |
| Range | 240px 내외 | 화면 너비(640px)의 37.5%. 실질 원거리 |
| 콤보 타수 | 3타 | 탭 기반. 대시 직후 카이팅 샷 |
| 시그니처 | 대시 직후 발사 시 x1.2 데미지 + 정확도 100% | 카이팅 보상 |
| 투사체 | 전자기 가속 투사체 스프라이트 별도 | Railbow 전용 VFX 필요 |

### 3.6. Emitter (파동 방출기) — 원소형 (유일 INT 무기)

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

무기를 장비하면 해당 무기의 아이템계에 진입 가능. 레어리티가 높을수록 지층 수가 많아 더 많은 기억 단편와 강화 기회를 제공.
**진입 조건:** 세이브 포인트(대장간)에서만 가능. 아이템계 내부에서 중첩 진입 불가.

---

## 5. 향후 확장 슬롯 (Build 1+ 예약)

아래 행들은 추후 추가될 무기 카테고리를 위한 예약 슬롯이다.
CSV에 행을 추가하는 것만으로 코드 변경 없이 신규 무기 정의가 가능하다.
WeaponID 내부값은 Build 0 `weapons.ts` 호환을 위해 기존 토큰(`greatsword_*`, `dagger_*`, `bow_*`, `staff_*`)을 유지하되, Type 컬럼과 표시명만 sci-fi 리네이밍을 따른다. Harpoon/Chain은 신규 토큰(`harpoon_*`, `chain_*`)을 부여한다.

| WeaponID (예약) | Name (예약) | Type | Rarity | BaseATK | AtkSpeed | Range | HitboxW | HitboxH |
|:---------------|:-----------|:-----|:------:|:-------:|:--------:|:-----:|:-------:|:-------:|
| greatsword_normal | (미정) | Cleaver | Normal | (미정) | 0.6 | (미정) | (미정) | (미정) |
| greatsword_magic | (미정) | Cleaver | Magic | (미정) | 0.6 | (미정) | (미정) | (미정) |
| greatsword_rare | (미정) | Cleaver | Rare | (미정) | 0.6 | (미정) | (미정) | (미정) |
| greatsword_legendary | (미정) | Cleaver | Legendary | (미정) | 0.63 | (미정) | (미정) | (미정) |
| greatsword_ancient | (미정) | Cleaver | Ancient | (미정) | 0.66 | (미정) | (미정) | (미정) |
| dagger_normal | (미정) | Shiv | Normal | (미정) | 1.6 | (미정) | (미정) | (미정) |
| dagger_magic | (미정) | Shiv | Magic | (미정) | 1.6 | (미정) | (미정) | (미정) |
| dagger_rare | (미정) | Shiv | Rare | (미정) | 1.6 | (미정) | (미정) | (미정) |
| dagger_legendary | (미정) | Shiv | Legendary | (미정) | 1.65 | (미정) | (미정) | (미정) |
| dagger_ancient | (미정) | Shiv | Ancient | (미정) | 1.70 | (미정) | (미정) | (미정) |
| harpoon_normal | (미정) | Harpoon | Normal | (미정) | 0.8 | 112 | (미정) | (미정) |
| harpoon_magic | (미정) | Harpoon | Magic | (미정) | 0.8 | 112 | (미정) | (미정) |
| harpoon_rare | (미정) | Harpoon | Rare | (미정) | 0.8 | 116 | (미정) | (미정) |
| harpoon_legendary | (미정) | Harpoon | Legendary | (미정) | 0.83 | 120 | (미정) | (미정) |
| harpoon_ancient | (미정) | Harpoon | Ancient | (미정) | 0.86 | 124 | (미정) | (미정) |
| chain_normal | (미정) | Chain | Normal | (미정) | 0.9 | 48~120 | (미정) | (미정) |
| chain_magic | (미정) | Chain | Magic | (미정) | 0.9 | 48~120 | (미정) | (미정) |
| chain_rare | (미정) | Chain | Rare | (미정) | 0.9 | 48~124 | (미정) | (미정) |
| chain_legendary | (미정) | Chain | Legendary | (미정) | 0.93 | 48~128 | (미정) | (미정) |
| chain_ancient | (미정) | Chain | Ancient | (미정) | 0.96 | 48~132 | (미정) | (미정) |
| bow_normal | (미정) | Railbow | Normal | (미정) | 1.0 | 240 | (미정) | (미정) |
| bow_magic | (미정) | Railbow | Magic | (미정) | 1.0 | 250 | (미정) | (미정) |
| bow_rare | (미정) | Railbow | Rare | (미정) | 1.0 | 260 | (미정) | (미정) |
| bow_legendary | (미정) | Railbow | Legendary | (미정) | 1.05 | 270 | (미정) | (미정) |
| bow_ancient | (미정) | Railbow | Ancient | (미정) | 1.10 | 280 | (미정) | (미정) |
| staff_normal | (미정) | Emitter | Normal | (미정) | 0.7 | 160 | (미정) | (미정) |
| staff_magic | (미정) | Emitter | Magic | (미정) | 0.7 | 165 | (미정) | (미정) |
| staff_rare | (미정) | Emitter | Rare | (미정) | 0.7 | 170 | (미정) | (미정) |
| staff_legendary | (미정) | Emitter | Legendary | (미정) | 0.73 | 175 | (미정) | (미정) |
| staff_ancient | (미정) | Emitter | Ancient | (미정) | 0.76 | 180 | (미정) | (미정) |

> **주의:** 위 예약 슬롯의 수치는 확정이 아닌 참고용 초안이다. Build 1 밸런싱 단계에서 `System_Combat_Weapons.md`의 공식 기반으로 검증 후 CSV에 반영한다.
