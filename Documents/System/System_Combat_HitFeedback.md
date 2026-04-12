# 타격 피드백 시스템 (Hit Feedback System)

## 구현 현황 (Implementation Status)

> **최근 업데이트:** 2026-03-25
> **문서 상태:** `작성 중 (Draft)`
> **2-Space:** World + Item World
> **기둥:** 탐험 + 야리코미

| 기능 ID    | 분류           | 기능명 (Feature Name)                             | 우선순위 | 구현 상태       | 비고 (Notes)                           |
| :--------- | :------------- | :------------------------------------------------ | :------: | :-------------- | :------------------------------------- |
| CMB-07-A   | 히트스탑       | 히트스탑 프레임 시스템                            |    P1    | ✅ 구현 완료    | `Game.hitstopFrames`, 콤보별 차등      |
| CMB-07-B   | 히트스탑       | 킬 보너스 히트스탑 (+5f)                          |    P1    | ✅ 구현 완료    | `HitManager.ts` isKill 분기            |
| CMB-07-C   | 바이브레이션   | 피격체 진동 (Victim Vibration)                    |    P1    | ✅ 구현 완료    | `Entity.startVibrate()`, 수렴 감쇠     |
| CMB-07-D   | 바이브레이션   | 공격자 미세 진동 (Attacker Micro-Vibration)       |    P1    | ✅ 구현 완료    | `Entity.startVibrate()`, 피격체의 26%  |
| CMB-07-E   | 바이브레이션   | 공격자 미세 전진 (Attacker Micro-Advance)         |    P1    | ✅ 구현 완료    | `Entity.startHitAdvance()`, heavy=3px  |
| CMB-07-F   | 카메라 쉐이크  | 방향성 카메라 쉐이크 (Directional Shake)          |    P1    | ✅ 구현 완료    | `Camera.shakeDirectional()`, 감쇠=0.88 |
| CMB-07-G   | 히트 스파크    | 라이트/헤비 히트 스파크 이펙트                    |    P1    | ✅ 구현 완료    | `HitSparkManager.spawn()`              |
| CMB-07-H   | 스크린 플래시  | 공격 히트 화이트 플래시                           |    P1    | ✅ 구현 완료    | `ScreenFlash.flashHit()`               |
| CMB-07-I   | 스크린 플래시  | 피격 레드 플래시                                  |    P1    | ✅ 구현 완료    | `ScreenFlash.flashDamage()`            |
| CMB-07-J   | 피격 플래시    | 피격체 개별 플래시 오버레이                       |    P1    | ✅ 구현 완료    | `Entity.triggerFlash()`, 80ms          |
| CMB-07-K   | 넉백           | 콤보 단계별 넉백 벡터                             |    P1    | ✅ 구현 완료    | `CombatData.ts` 콤보 테이블            |
| CMB-07-L   | 무게 계수      | 적 무게 클래스별 넉백 계수                        |    P2    | 📅 대기         | 현재 계수=1.0 고정                     |
| CMB-07-M   | 데미지 숫자    | 팝업 데미지 숫자 (Damage Number)                  |    P1    | ✅ 구현 완료    | `DamageNumber.ts`                      |
| CMB-07-N   | 무기 카테고리  | 무기 종류별 피드백 차이 (5종)                     |    P2    | 📅 대기         | 현재 검(Sword) 고정                    |
| CMB-07-O   | 원소 피드백    | 원소별 히트 스파크/플래시 색상 변경               |    P2    | 📅 대기         | Phase 2 연동                           |
| CMB-07-P   | 레어리티 피드백| 아이템 레어리티별 피드백 강도 가중치              |    P2    | 📅 대기         | Phase 2 연동                           |
| CMB-07-Q   | 상태이상 피드백| 상태이상 적용 시 추가 비주얼 피드백               |    P2    | 📅 대기         | Phase 2 연동                           |
| CMB-07-R   | SFX 레이어    | 임팩트 SFX 레이어 (L12)                              |    P1    | 📅 대기         | `AudioManager` 연동 필요                |
| CMB-07-S   | SFX 레이어    | 슬래시 SFX 레이어 (L13)                              |    P1    | 📅 대기         | `AudioManager` 연동 필요                |
| CMB-07-T   | SFX 레이어    | 피격 반응 SFX 레이어 (L14, +30~50ms 지연)            |    P1    | 📅 대기         | Dead Cells 3레이어 구조 참조            |
| CMB-07-U   | SFX 레이어    | 킬 사운드 SFX (L15)                                  |    P1    | 📅 대기         | 킬 판정 시에만 재생                     |
| CMB-07-V   | SFX 차별화    | 무기별 SFX 프로파일 (5종)                             |    P2    | 📅 대기         | 현재 검(Sword) 고정                     |

---

## 0. 필수 참고 자료 (Mandatory References)

* Writing Standards: `Documents/Terms/GDD_Writing_Rules.md`
* Project Vision: `Documents/Terms/Project_Vision_Abyss.md`
* 전투 설계 철학: `Documents/Design/Design_Combat_Philosophy.md`
* 전투 액션: `Documents/System/System_Combat_Action.md`
* 데미지 시스템: `Documents/System/System_Combat_Damage.md`
* 카메라 시스템: `Documents/System/System_3C_Camera.md`
* 캐릭터 설계: `Documents/System/System_3C_Character.md`
* 장비 레어리티: `Documents/System/System_Equipment_Rarity.md`
* 무기 시스템: `Documents/System/System_Combat_Weapons.md`
* Game Overview: `Reference/게임 기획 개요.md`
* Sakurai Insights: `Reference/sakurai/` (히트스탑 8기법)
* GMTK Insights: `Reference/gmtk/` (Juice, Game Feel)

---

## 1. 개요 (Concept)

### 1.1. 설계 의도 (Design Intent)

> 타격 피드백 시스템은 **공격이 "맞았다"는 사실을 시청각·운동감각의 다층적 신호로 동시에 전달하여, 행동의 결과를 0.5초 이내에 읽을 수 있게 만드는 즉각 반응 체계**이다.

핵심은 두 가지이다. 첫째, "다층적"—단일 신호가 아닌 11개의 독립적 채널이 동시에 작동한다. 둘째, "0.5초 이내"—플로우 이론이 제시하는 마이크로 피드백의 임계점이다. 이 임계점을 넘기면 플레이어는 자신의 행동과 결과 사이의 인과관계를 잃고 전투가 무감각해진다.

### 1.2. 설계 근거 (Design Reasoning)

| 피드백 요소 | 구현된 수치 | 설계 결정 | 근거 |
| :--- | :--- | :--- | :--- |
| 히트스탑 | 1타 3f / 2타 4f / 3타 6f, 킬 +5f, 헤비 +2f | 콤보 단계에 비례하여 정지 시간 점층 증가 | 사쿠라이 기법 5: 공격 위력에 비례하는 히트스탑. 정지 길이만으로 공격의 "무게"를 직감 |
| 피격체 진동 | 헤비 5px / 라이트 3px, 감쇠 수렴 | 피격체가 공격자보다 크게 진동 | 사쿠라이 기법 1: 피격자 대진폭, 공격자 소진폭. 피격 사실의 시각적 구분 |
| 공격자 진동 | 헤비 1.5px / 라이트 0.8px | 공격자도 미세하게 진동 | 사쿠라이 기법 1 역방향: "손에 전해지는 충격" 시각 대체 |
| 진폭 감쇠 | 매 프레임 수렴 곡선 | 진동이 갑자기 멈추지 않고 자연스럽게 수렴 | 사쿠라이 기법 4: 급격한 중단보다 감쇠가 더 자연스러운 충격 표현 |
| 공격자 미세 전진 | 헤비 3px / 라이트 1.5px | 히트스탑 중 공격자가 약간 앞으로 전진 | 사쿠라이 기법 7: 타격감에 "밀어 넣는" 입체감 추가 |
| 방향성 카메라 흔들림 | 1타 1.5px / 2타 2.5px / 3타 4px, 넉백 방향 편향 | 흔들림이 넉백 방향으로 편향 | 사쿠라이 기법 8: 방향 없는 흔들림보다 타격의 벡터 정보 전달 |
| 히트 스파크 | 라이트 4개 / 헤비 7개, 중앙 플래시 + 라인 스파크, 수명 180ms | 선(Line) 기반 스파크에 어두운 외곽선 혼합 | 사쿠라이: "어두운 요소를 섞어야 밝은 이펙트가 눈에 띈다" |
| 화면 플래시 (공격) | 화이트, 헤비 α0.35 / 라이트 α0.15 | 공격 적중 시 백색 플래시 | 공격의 절정(Climax) 연출. 헤비일수록 강한 플래시 |
| 화면 플래시 (피격) | 레드, 헤비 α0.4 / 라이트 α0.2 | 피격 시 적색 플래시 | 피해 인지 우선순위: HP보다 먼저 피격 사실 전달 |
| 엔티티 플래시 | 피격 타겟에 화이트 오버레이, 80ms | 피격 대상 자체가 잠깐 번쩍임 | 원거리에서도 "저 적이 맞았다"는 즉각 인지 |
| 넉백 | 1타 120/-30 / 2타 150/-40 / 3타 240/-80 px/s | 콤보 단계에 따라 수평·수직 동시 증가 | 3타에서 수직 성분 급증(-80)으로 "날아가는" 피날레 연출 |
| 히트박스 고정 | 히트스탑 중 위치 동결 | 진동 중에도 히트박스 불변 | 사쿠라이 기법 2: 시각적 진동이 판정에 영향 주면 혼란 |

### 1.3. 3대 기둥 정렬 (Pillar Alignment)

| 기둥 | 정렬 방식 | 구체적 기여 |
| :--- | :--- | :--- |
| **메트로베니아 탐험** | 탐험 중 전투의 쾌감이 탐험 동기를 유지 | 히트 피드백의 만족감이 "다음 방에도 적이 있을 것"이라는 기대를 긍정적 감정으로 연결. 새로운 무기/적 반응이 탐험 보상의 일부 |
| **아이템계 야리코미** | 반복 전투에서 피로를 줄이고 정복감 유지 | 아이템계 수천 번의 전투에서 히트스탑은 매 타격에 물리적 존재감을 부여. 피드백이 약하면 반복 전투가 "자동 타격기" 느낌이 되어 야리코미 동기 소멸 |
| **온라인 멀티플레이** | 파티 전투에서 각자의 기여가 명확히 보임 | 방향성 카메라 흔들림과 엔티티 플래시로 "누가 피격 판정을 냈는지" 즉시 식별 가능. 역할 분담이 시각적으로 읽힘 |

### 1.4. 저주받은 문제 검증 (Cursed Problem Check)

| 저주받은 문제 | 충돌 목표 | 채택한 해결책 | 수용한 트레이드오프 |
| :--- | :--- | :--- | :--- |
| **히트스탑의 길이** | 길수록 무게감↑, 짧을수록 전투 흐름↑ | 1-6f 짧은 히트스탑 + 킬 보너스 5f. 일상 전투는 경쾌, 결정타만 극적 | 3타 외 공격은 "묵직하다"보다 "경쾌하다"에 가까움. 월하의 야상곡 레퍼런스에서 의도적 채택 |
| **카메라 흔들림의 빈도** | 자주 흔들수록 타격감↑, 과도하면 멀미 유발 | 강도 비례(1.5px → 4px) + 헤비 1.8배 증폭. 일반 공격은 미세, 헤비만 강하게 | 아이템계 장기 파밍 시 헤비 흔들림(7.2px) 누적 피로 가능. 모니터링 필요 |
| **화면 플래시의 가시성** | 강할수록 타격감↑, 강할수록 화면을 가림 | 최대 α0.6 캡핑 + 빠른 지수적 감쇠 | 빠른 연속 공격 시 플래시 겹침 현상 가능 |
| **햅틱 피드백** | 컨트롤러 럼블 활용 가능 | 화면 진동 + 화면 플래시를 시각적 햅틱 보조로 설계. 게임패드 럼블은 Gamepad Haptics API 활용 | 키보드 환경에서는 시각 피드백에 의존 |

### 1.5. 위험과 보상 (Risk & Reward Reinforcement)

| 플레이어 행동 | 리스크 | 피드백이 강화하는 리턴 | 피드백 강도 |
| :--- | :--- | :--- | :--- |
| 3타 콤보 완료 | 후딜(600ms) 무방비 | 극적 히트스탑(6f+보너스) + 대형 넉백(-80px/s)이 "리스크 보상"을 물리적으로 전달 | 최대 |
| 근접 공격 시도 | 적 반격 범위 진입 | 히트 스파크와 카메라 흔들림이 "공격이 통했다"는 즉각 확신 | 중간 |
| 킬 타격 | (리스크 해소) | 킬 보너스 히트스탑(+5f) + 강화 카메라 흔들림(+2px)이 제거 카타르시스 극대화 | 최대 |
| 피격 수용 | HP 소모, 사망 위험 | 레드 플래시(헤비 α0.4)가 "위험 상황" 경고를 즉각 전달 | 최대 |
| 대시 후 반격 | 타이밍 실패 시 피격 | 성공적 반격의 히트 피드백이 "완벽한 타이밍"의 심리적 보상 극대화 | 중간~최대 |

---

## 2. 핵심 규칙 (Core Rules)

### 2.1. 피드백 계층 구조 (Feedback Layer Architecture)

타격 피드백은 11개의 독립적 레이어로 구성된다. 각 레이어는 독립적으로 작동하며 동시 실행된다.

| 레이어 | 명칭 | 사쿠라이 기법 | 범주 | 구현 위치 |
| :--- | :--- | :--- | :--- | :--- |
| L1 | 히트스탑 | 기법 5 | 시간 조작 | `Game.ts → hitstopFrames` |
| L2 | 피격체 진동 | 기법 1 (대진폭) | 엔티티 운동 | `Entity.ts → startVibrate()` |
| L3 | 공격자 진동 | 기법 1 (소진폭) | 엔티티 운동 | `Entity.ts → startVibrate()` |
| L4 | 히트박스 위치 동결 | 기법 2 | 판정 보호 | `HitManager.ts` — 히트스탑 중 위치 갱신 정지 |
| L5 | 접지/공중 진동 방향 분리 | 기법 3 | 엔티티 운동 | `Entity.ts` — 접지 여부에 따른 진동축 전환 |
| L6 | 진폭 감쇠 수렴 | 기법 4 | 엔티티 운동 | `Entity.ts → startVibrate()` — 매 프레임 수렴 |
| L7 | 공격자 미세 전진 | 기법 7 | 엔티티 운동 | `Entity.ts → startHitAdvance()` |
| L8 | 방향성 카메라 흔들림 | 기법 8 | 카메라 | `Camera.ts → shakeDirectional()` |
| L9 | 히트 스파크 | — | 파티클 | `HitSpark.ts → HitSparkManager.spawn()` |
| L10 | 화면 플래시 | — | 화면 오버레이 | `ScreenFlash.ts → flashHit() / flashDamage()` |
| L11 | 엔티티 플래시 | — | 엔티티 오버레이 | `Entity.ts → triggerFlash()` |
| L12 | 임팩트 SFX | — | 음향 (저주파) | `AudioManager` — 피격 즉시 재생 (0ms) |
| L13 | 슬래시 SFX | — | 음향 (고주파) | `AudioManager` — 피격 즉시 재생 (0ms) |
| L14 | 피격 반응 SFX | — | 음향 (반응) | `AudioManager` — +30~50ms 지연 재생 |
| L15 | 킬 사운드 SFX | — | 음향 (특수) | `AudioManager` — 킬 판정 시에만 |

> **음향-시각 동기화 원칙:** 음향이 시각보다 30~50ms 선행해야 뇌가 "동시"로 인지한다. 이펙트와 사운드를 동시에 재생하면 사운드가 늦게 느껴진다. (Dead Cells 3-layer SFX 구조 참조: `Research/SideScrolling_Combat_System_Research.md` §1.5)

> **참고:** 사쿠라이 기법 6 "히트 포즈 블렌딩(Hit Pose Blending)"은 `System_Combat_Action.md`의 피격 상태 전환 섹션에서 관리.

### 2.2. 피드백 강도 원칙 (Intensity Scaling Rules)

피드백 강도는 **공격의 위력 계층**에 따라 세 단계로 계층화된다.

| 강도 계층 | 해당 공격 | 피드백 특성 |
| :--- | :--- | :--- |
| **라이트 (Light)** | 1타, 2타 (비킬) | 경쾌하고 빠른 피드백. 전투 흐름 유지 |
| **헤비 (Heavy)** | 3타, 또는 킬 타격 | 강조된 피드백. 눈에 띄는 강도 상승 |
| **킬 (Kill)** | 적 HP 0 타격 | 극적 카타르시스 피드백. 리스크 해소의 정점 |

**불변 규칙:** 피드백 강도는 항상 **라이트 < 헤비 < 킬** 순서를 유지해야 한다. 튜닝 과정에서 이 순서가 역전되면 플레이어의 위력 직감이 붕괴한다.

### 2.3. 피드백 타이밍 원칙 (Execution Order)

`HitManager.checkHits()` 내부에서 AABB 겹침 감지 후 실행되는 순서:

```
피격 판정 성공
│
├─ [즉시, 동일 프레임 — HitManager 내부]
│   ├─ HP 감소 처리
│   ├─ onHit() → 넉백 속도 벡터 할당
│   ├─ 무적 타이머 설정 (hitstun ms)
│   ├─ hitstopFrames 설정                ← L1
│   ├─ 피격체 startVibrate() + triggerFlash()  ← L2, L5, L6, L11
│   ├─ 공격자 startVibrate()            ← L3
│   ├─ 공격자 startHitAdvance()         ← L7
│   ├─ camera.shakeDirectional()        ← L8
│   └─ onDeath() (킬인 경우)
│
├─ [동일 프레임 — HitResult 반환 후 호출자에서]
│   ├─ HitSparkManager.spawn()          ← L9
│   ├─ ScreenFlash.flashHit()           ← L10
│   └─ DamageNumber.spawn()             ← CMB-07-M
│
├─ [동일 프레임 — SFX 레이어]
│   ├─ L12 임팩트 SFX: 즉시 (0ms)       ← 저주파 충격음
│   ├─ L13 슬래시 SFX: 즉시 (0ms)       ← 고주파 절삭음
│   ├─ L14 피격 반응 SFX: +30~50ms      ← "맞았다" 확인음
│   └─ L15 킬 사운드: 킬 판정 시에만      ← 별도 레이어
│
└─ [이후 매 프레임 update() 루프]
    ├─ hitstopFrames > 0 → 물리 업데이트 정지  ← L1 유지
    ├─ 진동 진폭 감쇠                          ← L4, L6
    ├─ 카메라 흔들림 감쇠 (×0.88/프레임)       ← L8
    ├─ 스파크 위치/알파 업데이트                ← L9
    └─ 화면 플래시 지수 감쇠                    ← L10
```

**타이밍 제약:** 히트스탑 중 물리 업데이트(이동, 중력, 넉백 반영)는 정지. 단, 쿨다운 타이머, 버프 지속 시간, 무적 타이머는 독립 진행. (`Design_Combat_Philosophy.md` 3.1절 "로직 분리" 원칙)

### 2.4. 2-Space별 피드백 차이

| 항목 | 월드 (World) | 아이템계 (Item World) | 허브 (Hub) |
| :--- | :--- | :--- | :--- |
| **전투 맥락** | 탐험 중 산발적 전투 | 반복적·집중적 파밍 전투 | 전투 없음 (PvP 예외) |
| **피드백 강도** | 기준값 ×1.0 | 기준값 ×0.85 (장기 피로 방지) | 기준값 ×0.7 |
| **카메라 흔들림** | 표준 | 최대 강도 ×0.8 캡핑 | 비활성화 |
| **화면 플래시** | 표준 알파 | 라이트 최대 α0.10 감소 | 비활성화 |
| **히트스탑** | 표준 | 표준 유지 (리듬이 파밍 핵심) | 1f 고정 |
| **보스 처치** | 강한 카메라 줌인 + 강렬한 흔들림 | 보스 등급별 차등 연출 | 해당 없음 |

**아이템계 지층별 피드백 강화:**

| 지층 | 히트스탑 배율 | 스파크 수 배율 | 근거 |
| :--- | :---: | :---: | :--- |
| 1지층 | ×1.0 | ×1.0 | 표준 전투 감각 |
| 2지층 | ×1.0 | ×1.1 | 미세 강도 상승 |
| 3지층 | ×1.1 (+1f) | ×1.2 | 위험 증가를 피드백으로 전달 |
| 4지층 (레전더리/에인션트) | ×1.2 (+1~2f) | ×1.4 | 최심층 긴박감·카타르시스 극대화 |

### 2.5. (삭제됨 — 모바일 대응은 PC 전용으로 삭제)

---

## 3. 수치 설계 (Numerical Design)

### 3.1. 히트스탑 프레임 테이블

**히트스탑 계산 공식:**

```
hitstopTotal = step.hitstopFrames + bonusFrames
bonusFrames  = isKill ? 5 : (heavy ? 2 : 0)
heavy        = (comboIndex >= 2) || isKill
```

| 시나리오 | 기본 (base) | 보너스 (bonus) | 총 히트스탑 | 총 시간 @ 60fps |
| :--- | :---: | :---: | :---: | :---: |
| 1타 일반 | 3f | +0 | **3f** | 50ms |
| 2타 일반 | 4f | +0 | **4f** | 66.7ms |
| 3타 일반 | 6f | +2 (heavy) | **8f** | 133.3ms |
| 1타 킬 | 3f | +5 (kill) | **8f** | 133.3ms |
| 2타 킬 | 4f | +5 (kill) | **9f** | 150ms |
| 3타 킬 | 6f | +5 (kill) +2 (heavy) | **13f** | 216.7ms |

> **설계 의도:** 3타 킬은 프로젝트 내 최대 히트스탑(13f)으로 클라이막스 연출.

**히트스탑 적용 범위:**
- 정지: 게임 로직 전체 (물리, AI, 애니메이션)
- 예외: 진동(startVibrate), 플래시(triggerFlash), 카메라 쉐이크는 히트스탑 중에도 작동

### 3.2. 넉백 벡터 테이블

`HitManager.checkHits()`에서 `step.knockbackX * dirX`, `step.knockbackY`를 대상의 `vx`, `vy`에 직접 대입.

| 콤보 단계 | knockbackX (px/s) | knockbackY (px/s) | 궤적 특성 |
| :--- | :---: | :---: | :--- |
| 1타 | ±120 | -30 | 수평 지배적, 거의 직선 |
| 2타 | ±150 | -40 | 완만한 포물선 |
| 3타 | ±240 | -80 | 급격한 포물선, 적이 뜨며 날아감 |

> `knockbackY < 0` = 위쪽. 카메라 쉐이크 상향 바이어스 조건: `knockbackY < -40` (2타, 3타 해당).

**무게 클래스별 넉백 계수 [미구현 — P2]:**

현재 계수=1.0 고정. Phase 2에서 적 데이터에 `weightClass` 필드 추가 예정.

| 무게 클래스 | 계수 | 대상 예시 |
| :--- | :---: | :--- |
| 경량 (Light) | 1.3x | 소형 몬스터, 임프, 고스트 |
| 중량 (Medium) | 1.0x | 스켈레톤, 좀비, 인간형 |
| 중장 (Heavy) | 0.6x | 오거, 골렘, 대형 언데드 |
| 보스 (Boss) | 0.2x | 아이템 장군, 아이템 왕 이상 |

### 3.3. 카메라 쉐이크 파라미터

**쉐이크 강도 계산 공식:**

```
shakeIntensity = step.shakeIntensity * (heavy ? 1.8 : 1.0) + (isKill ? 2.0 : 0)
dirX = facingRight ? 1 : -1
dirY = step.knockbackY < -40 ? -0.3 : 0
```

| 시나리오 | base | 계수 | 킬 보너스 | 최종 강도 |
| :--- | :---: | :---: | :---: | :---: |
| 1타 일반 | 1.5 | ×1.0 | +0 | **1.5** |
| 2타 일반 | 2.5 | ×1.0 | +0 | **2.5** |
| 3타 일반 (heavy) | 4.0 | ×1.8 | +0 | **7.2** |
| 1타 킬 | 1.5 | ×1.0 | +2 | **3.5** |
| 2타 킬 | 2.5 | ×1.0 | +2 | **4.5** |
| 3타 킬 (heavy+kill) | 4.0 | ×1.8 | +2 | **9.2** |

**감쇠:** 매 프레임 `shakeIntensity *= 0.88`. 0.5px 미만 시 즉시 리셋.

### 3.4. 바이브레이션 파라미터

| 역할 | 히트 종류 | 초기 진폭 | 진동 프레임 수 | 방향성 |
| :--- | :--- | :---: | :---: | :--- |
| 피격체 | 라이트 | **3px** | hitstopTotal | 지상=수평, 공중=전방향 |
| 피격체 | 헤비 | **5px** | hitstopTotal | 지상=수평, 공중=전방향 |
| 공격자 | 라이트 | **0.8px** | hitstopTotal | 지상=수평, 공중=전방향 |
| 공격자 | 헤비 | **1.5px** | hitstopTotal | 지상=수평, 공중=전방향 |

> 공격자 진폭은 피격체의 약 27% 수준.

**진폭 감쇠 공식:**

```
decay = vibrateFrames / (vibrateFrames + vibratePhase)
amp   = vibrateAmplitude * decay
```

첫 프레임 최대 진폭, 마지막 프레임 ≈ 0 수렴.

**공격자 미세 전진:**

| 히트 종류 | 전진 거리 | 방향 |
| :--- | :---: | :--- |
| 라이트 | **1.5px** | facingRight 기반 |
| 헤비 | **3px** | facingRight 기반 |

프레임당 15%씩 분배. 히트스탑 종료 후 리셋.

### 3.5. 히트 스파크 파라미터

**기본 상수:**

```
SPARK_COUNT_LIGHT = 4     SPARK_COUNT_HEAVY = 7
SPARK_SPEED = 180 px/s    SPARK_LIFE = 180 ms
```

| 파라미터 | 라이트 | 헤비 |
| :--- | :--- | :--- |
| 라인 스파크 수 | 4 | 7 |
| 속도 | 180 × [0.6~1.4] px/s | 180 × 1.4 × [0.6~1.4] px/s |
| 수명 | 180ms × [0.7~1.3] | 180ms × [0.7~1.3] |
| 라인 길이 | 4px (굵기 1.5px) | 6px (굵기 1.5px) |
| 외곽선 | 6px (검정 #000000, 굵기 3px) | 9px (검정 #000000, 굵기 3px) |
| 색상 | 흰색 `#FFFFFF` | 노란색 `#FFFF44` |

**중앙 플래시 버스트:**

| 파라미터 | 라이트 | 헤비 |
| :--- | :--- | :--- |
| 외곽 원 반경 | 8px (흰색 α0.9) | 12px (흰색 α0.9) |
| 내부 원 반경 | 4.8px (옅은 노랑 α1.0) | 7.2px (옅은 노랑 α1.0) |
| 수명 | 90ms | 90ms |

**방향성:** `biasAngle = baseAngle + dirX * 0.4` (라디안)

**감쇠:** 속도 매 프레임 ×0.92, 알파 `life/maxLife` 선형, 스케일 `0.5 + (life/maxLife) * 0.5`

### 3.6. 스크린 플래시 파라미터

| 트리거 | 색상 | 초기 알파 | 지속 시간 | 함수 |
| :--- | :--- | :---: | :---: | :--- |
| 라이트 공격 | 흰색 `0xFFFFFF` | 0.15 | 60ms | `flashHit(false)` |
| 헤비 공격 | 흰색 `0xFFFFFF` | 0.35 | 100ms | `flashHit(true)` |
| 라이트 피격 | 빨강 `0xFF0000` | 0.20 | 80ms | `flashDamage(false)` |
| 헤비 피격 | 빨강 `0xFF0000` | 0.40 | 150ms | `flashDamage(true)` |

**최대 알파 캡:** `Math.min(0.6, intensity)`

**감쇠 공식:** `overlay.alpha *= (timer / duration)` — 지수 감쇠. 초반 급감, 종료 시 부드러운 소멸.

**피격체 개별 플래시:** 80ms, 빨강 `0xFF4444` / `min(0.7, flashTimer/40)`, 히트스탑 중에도 작동.

### 3.7. 피드백 강도 매트릭스 (Master Table)

| 시나리오 | hitstop | 피격 진폭 | 공격자 진폭 | 전진 | 쉐이크 | 스파크 | 플래시 α | 플래시 시간 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 1타 일반 | 3f | 3px | 0.8px | 1.5px | 1.5 | Light(4) | 0.15 | 60ms |
| 2타 일반 | 4f | 3px | 0.8px | 1.5px | 2.5 | Light(4) | 0.15 | 60ms |
| 3타 일반 | 8f | 5px | 1.5px | 3px | 7.2 | Heavy(7) | 0.35 | 100ms |
| 1타 킬 | 8f | 5px | 1.5px | 3px | 3.5 | Heavy(7) | 0.35 | 100ms |
| 2타 킬 | 9f | 5px | 1.5px | 3px | 4.5 | Heavy(7) | 0.35 | 100ms |
| 3타 킬 | 13f | 5px | 1.5px | 3px | 9.2 | Heavy(7) | 0.35 | 100ms |
| 라이트 피격 | — | — | — | — | — | — | Red 0.20 | 80ms |
| 헤비 피격 | — | — | — | — | — | — | Red 0.40 | 150ms |

### 3.8. 무기 카테고리별 피드백 차이 [미구현 — P2]

현재 검(Sword) 단일 프로파일 고정. `System_Combat_Weapons.md` 5종 무기 확정 후 적용.

| 무기 | 히트스탑 계수 | 넉백 계수 | 스파크 색상 | 쉐이크 스타일 | 설계 의도 |
| :--- | :---: | :---: | :--- | :--- | :--- |
| 검 (Sword) | 1.0x | 1.0x | 흰색/노란색 | 수평 지향 | 기준. 균형 타격감 |
| 대검 (Greatsword) | 1.5x | 1.3x | 주황 `#FF8800` | 수직 하향 | 무거운 타격, 긴 정지 |
| 단검 (Dagger) | 0.6x | 0.7x | 흰색/밝은 파랑 | 가벼운 진동 | 빠른 다중 히트 |
| 활 (Bow) | 0.5x | 0.6x | 흰색 | 미약한 수평 | 원거리, 약한 피드백 |
| 지팡이 (Staff) | 0.8x | 0.5x | 보라 `#AA44FF` | 방사형 | 마법 충격 |

**무기별 SFX 프로파일 [미구현 — P2]:**

| 무기 | 임팩트 (L12) | 슬래시 (L13) | 피격 반응 (L14) | 설계 의도 |
| :--- | :--- | :--- | :--- | :--- |
| 검 (Sword) | 중간 금속 충돌음 | 높은 슬래시 | 표준 피격 반응 | 기준 사운드 프로파일 |
| 대검 (Greatsword) | 강한 저주파 둔탁음 | 낮은 슬래시 + 바람소리 | 무거운 반응 + 여운 | 무게감 극대화 |
| 단검 (Dagger) | 약한 금속음 | 높고 빠른 슬래시 | 빠른 반응 | 속도감 강조 |
| 활 (Bow) | 화살 충돌음 | 없음 | 관통 반응 (약) | 원거리 피드백 |
| 지팡이 (Staff) | 마법 공명음 | 없음 | 마법 폭발 반응 | 원소 색상 연동 |

---

## 4. 흐름 (Flow)

### 4.1. 히트 피드백 실행 순서

```
[HitManager.checkHits() 호출]
        │
        ▼
[1] AABB 충돌 감지 (aabbOverlap)
        │
        ▼
[2] hitList / invincible / hp <= 0 사전 체크
        │
        ▼
[3] calculateDamage(atk, def, skillMultiplier=1.0)
        │
        ▼
[4] target.hp -= damage
    isKill = (target.hp <= 0)
    heavy  = (comboIndex >= 2) || isKill
        │
        ▼
[5] target.onHit(knockbackX * dirX, knockbackY, hitstun)
    target.invincible = true, invincibleTimer = step.hitstun
        │
        ▼
[6] isKill → target.onDeath()
        │
        ▼
[7] hitstopFrames = base + bonus
[8] 피격체 startVibrate() + triggerFlash()
[9] 공격자 startVibrate()
[10] 공격자 startHitAdvance()
[11] camera.shakeDirectional()
        │
        ▼
[12] HitResult 반환 → 호출자에서:
    hitSparkManager.spawn()
    damageNumber.spawn()
    screenFlash.flashHit()
```

### 4.2. 프레임별 타임라인 (3타 일반, hitstop=8f 기준)

| 프레임 | 경과 | hitstop | 피격 진동 | 공격자 진동 | 카메라 쉐이크 | 플래시 | 스파크 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| F+0 | 0ms | 8f | ±5.0px | ±1.5px | 7.2px | α0.35 | 생성 |
| F+1 | 16.7ms | 7f | ±4.4px | ±1.3px | 6.3px | 감쇠 | 이동 |
| F+2 | 33.3ms | 6f | ±3.9px | ±1.2px | 5.6px | 감쇠 | 이동 |
| F+3 | 50ms | 5f | ±3.4px | ±1.0px | 4.9px | 감쇠 | 이동 |
| F+4 | 66.7ms | 4f | ±2.9px | ±0.9px | 4.3px | ≈0 | 소멸 시작 |
| F+5 | 83.3ms | 3f | ±2.4px | ±0.7px | 3.8px | 0 | 소멸 중 |
| F+6 | 100ms | 2f | ±1.9px | ±0.6px | 3.3px | 0 | 소멸 중 |
| F+7 | 116.7ms | 1f | ±1.4px | ±0.4px | 2.9px | 0 | 소멸 중 |
| F+8 | 133.3ms | 해제 | 종료 | 종료 | 2.6px→감쇠 | 0 | 잔여 소멸 |

### 4.3. 다중 히트 처리

| 상황 | 처리 규칙 |
| :--- | :--- |
| 동일 공격으로 A, B 연속 히트 | `hitstopFrames`는 마지막 히트가 덮어씀 |
| 동일 타겟 중복 히트 | `hitList` Set으로 차단, 동일 공격 내 1회 제한 |
| 카메라 쉐이크 | 더 강한 값만 업데이트 (`if intensity > current`) |

**Phase 2 개선 방향 [미구현]:**
- 히트스탑: 복수 히트 시 최대값(max) 채택
- 카메라 쉐이크: 복수 히트 시 +30% per additional hit 누적 검토

### 4.4. 킬 연출 플로우

```
[isKill = true]
  ├─ target.hp = 0 (클램프)
  ├─ target.onDeath() → FSM 'death' 전환
  ├─ heavy = true 강제
  ├─ hitstopBonus = +5
  ├─ 피격체 진동 5px + 공격자 진동 1.5px + 전진 3px
  ├─ 카메라 쉐이크: base * 1.8 + 2.0
  ├─ 스파크 Heavy (7개, 노란색, ×1.4 속도)
  ├─ 스크린 플래시: 흰색 α0.35 / 100ms
  └─ 데스 애니메이션 (800ms 페이드)
```

> 킬 히트스탑 중에도 피격체 진동이 렌더링되어 "박살 나며 흔들리는" 시각 효과가 자연스럽게 연출.

### 4.5. 웹 환경 히트스탑 구현 가이드

웹 브라우저 환경(PixiJS + requestAnimationFrame)에서 히트스탑 구현 시 주의사항.

**1. 프레임 → 밀리초 기반 전환 권장**

`requestAnimationFrame`은 정확한 60fps를 보장하지 않는다. 현재 코드는 `hitstopFrames` (프레임 카운트 기반)이지만, 향후 `hitstopRemaining` (ms 기반)으로 전환을 권장한다.

| 현재 방식 | 권장 방식 |
| :--- | :--- |
| `hitstopFrames--` (매 프레임 감산) | `hitstopRemaining -= deltaMS` (실제 경과 시간 감산) |
| fps 드랍 시 히트스탑이 과도하게 길어짐 | fps와 무관하게 일정한 히트스탑 체감 |

**2. 히트스탑 중 서버 이벤트 큐잉 (멀티플레이)**

히트스탑 동안 수신된 서버 이벤트(다른 플레이어의 행동)를 큐에 쌓고, 해제 후 200ms에 걸쳐 보간 적용한다. 즉시 적용하면 "텔레포트" 현상이 발생한다.

**3. 저사양 환경 프레임 드랍 대응**

30fps 환경에서도 최소 1프레임 히트스탑이 보장되어야 한다: `hitstopRemaining = Math.max(hitstopMS, deltaTime)`

**4. 권장 구현 패턴:**

```
// ms 기반 히트스탑 (권장 전환 패턴)
const HITSTOP_MS = { light: 50, heavy: 133, kill: 217 };

if (this.hitstopRemaining > 0) {
  this.hitstopRemaining -= deltaMS;
  // 물리 업데이트 스킵
  // 진동(L2-L7), 플래시(L10-L11), SFX(L12-L15)는 계속 실행
  return;
}
```

---

## 5. 연동 (Integration)

### 5.1. System_Combat_Action 연동

| 연동 항목 | 방향 | 설명 |
| :--- | :--- | :--- |
| comboIndex | Action → HitFeedback | 콤보 단계(0/1/2)가 hitstop, heavy, 넉백 강도 결정 |
| hitList | Action → HitFeedback | 동일 스윙 내 중복 히트 방지 Set |
| attackActive | Action → HitFeedback | true인 프레임에서만 checkHits() 실행 |
| COMBO_WINDOW (400ms) | Action ↔ HitFeedback | 히트스탑 중 콤보 윈도우 타이머 정지 (실질적 연장) |
| COMBO3_END_LAG (600ms) | Action ↔ HitFeedback | 3타 히트스탑 종료 후 endLagTimer 시작 |
| INVINCIBILITY_ON_HIT (500ms) | HitFeedback → Action | 피격 후 무적 시간 = step.hitstun |

### 5.2. System_Combat_Damage 연동

| 연동 항목 | 방향 | 설명 |
| :--- | :--- | :--- |
| calculateDamage() | Damage → HitFeedback | 데미지 값은 DamageNumber에만 사용. 피드백 강도는 comboStep 기준 |
| isKill (hp <= 0) | Damage → HitFeedback | HitManager 내에서 hp 차감 직후 킬 판정 |
| skillMultiplier | Damage → HitFeedback [미구현] | Phase 2: 스킬 배율에 따른 피드백 보너스 예정 |
| criticalMultiplier | Damage → HitFeedback [미구현] | 크리티컬 히트 시 별도 피드백 프로파일 예정 |

### 5.3. System_3C_Camera 연동

| 연동 항목 | 방향 | 설명 |
| :--- | :--- | :--- |
| shakeDirectional() | HitFeedback → Camera | HitManager에서 직접 호출 |
| shakeDecayRate (0.88) | Camera 내부 | 쉐이크 매 프레임 12% 감쇠 |
| deadZoneX/Y (32/24px) | Camera → HitFeedback | 소규모 진동(최대 5px)은 데드존 이내라 카메라 미추적 |
| bounds 클램핑 | Camera 내부 | 쉐이크 오프셋이 월드 경계 초과해도 bounds 내 유지 |

### 5.4. System_3C_Character 연동

| 연동 항목 | 방향 | 설명 |
| :--- | :--- | :--- |
| FSM 상태 동결 | HitFeedback → Character | 히트스탑 중 Character.update() 미실행 → FSM 전환 없음 |
| startVibrate() | HitFeedback → Character | Player, Enemy 공통 Entity 메서드 |
| startHitAdvance() | HitFeedback → Character | 공격자(Player)만 해당 |
| grounded 상태 | Character → HitFeedback | grounded=true → 수평 진동, false → 수직 추가 |
| PlayerState 'hit' | Character ↔ HitFeedback | onHit() → fsm 'hit' 전환, 히트스탑 종료 후 반영 |

### 5.5. System_Equipment_Rarity 연동 [미구현 — P2]

| 레어리티 | 피드백 가중치 | 스파크 추가 색상 | 쉐이크 가중치 |
| :--- | :---: | :--- | :---: |
| Normal | ×1.0 | 흰색 (기본) | ×1.0 |
| Magic | ×1.1 | 파랑 `#6969FF` 보조 | ×1.1 |
| Rare | ×1.2 | 노랑 `#FFFF00` 보조 | ×1.2 |
| Legendary | ×1.4 | 주황 `#FF8000` 불꽃 | ×1.4 |
| Ancient | ×1.7 | 초록 `#00FF00` 광폭 + 잔상 | ×1.7 |

### 5.6. System_Combat_Elements 연동 [미구현 — P2]

| 원소 | 스파크 색상 | 플래시 색상 | 추가 이펙트 |
| :--- | :--- | :--- | :--- |
| 화염 | 빨강 `#FF4400` | 주황 `#FF6600` | 잔불 파티클 |
| 냉기 | 하늘 `#88CCFF` | 청백 `#CCEEFF` | 결빙 파편 |
| 번개 | 노랑 `#FFFF00` | 흰색 `#FFFFFF` | 번개 라인 |
| 독 | 연두 `#88FF44` | 보라 `#884488` | 독 안개 |
| 성스러운 | 흰금 `#FFFFAA` | 순백 `#FFFFFF` | 십자 광선 |
| 암흑 | 어두운 보라 `#220022` | 검정 `#000000` | 암흑 구체 |

### 5.7. System_Combat_StatusEffects 연동 [미구현 — P2]

| 상태이상 | 적중 피드백 | 지속 피드백 | 해제 피드백 |
| :--- | :--- | :--- | :--- |
| 기절 | 별 모양 스파크 + 노랑 플래시 | 머리 위 별 파티클 | — |
| 빙결 | 결빙 파편 + 청색 플래시 | 파란 외곽선 | 얼음 부서지는 스파크 |
| 연소 | 불꽃 스파크 + 빨강 플래시 | 주기적 빨강 플래시 | 연기 파티클 |
| 독 | 독 방울 스파크 + 보라 플래시 | 주기적 녹색 플래시 | — |
| 슬로우 | 파란 파동 + 청색 플래시 | 파란 틴트 | — |

---

## 6. 예외 처리 (Edge Cases)

| 상황 | 처리 |
|:-----|:-----|
| 다중 히트 동시 발생 (1프레임 내 2체 이상 피격) | 히트스탑은 최대값(`max`)만 채택한다. 카메라 쉐이크는 더 강한 값으로 덮어쓴다. 히트 스파크와 데미지 넘버는 각 피격체마다 독립 생성 |
| 히트스탑 중첩 (히트스탑 진행 중 새 피격 판정) | 기존 히트스탑 잔여 프레임과 새 히트스탑 중 큰 값을 채택한다 (`hitstopFrames = max(remaining, newHitstop)`). 진동과 플래시는 새 값으로 리셋 |
| 넉백으로 벽 충돌 | 넉백 벡터의 수평 성분이 벽 충돌 시 0으로 클램핑된다. 수직 성분은 유지한다. 벽 충돌 시 추가 카메라 쉐이크(강도 ×0.3)를 발생시켜 "벽에 부딪힘" 피드백을 제공 |
| 히트스탑 중 서버 이벤트 수신 (멀티플레이) | 히트스탑 동안 수신된 서버 이벤트는 큐에 적재한다. 히트스탑 해제 후 200ms에 걸쳐 보간 적용하여 텔레포트 현상을 방지한다 |
| 30fps 이하 저사양 환경 | `hitstopRemaining = Math.max(hitstopMS, deltaTime)`으로 최소 1프레임 히트스탑을 보장한다. 진동 감쇠와 스파크 수명은 deltaTime 기반으로 정규화 |

---

**관련 코드 (SSoT):**
- `game/src/combat/HitManager.ts` — 히트 판정 및 피드백 트리거
- `game/src/combat/CombatData.ts` — 콤보 스텝 수치 테이블
- `game/src/entities/Entity.ts` — 진동/전진/플래시 렌더 로직
- `game/src/core/Camera.ts` — 카메라 쉐이크 계산
- `game/src/effects/HitSpark.ts` — 스파크 이펙트
- `game/src/effects/ScreenFlash.ts` — 스크린 플래시
