# 아이템계 깊이-보상-리스크 밸런스 리서치

> **작성일:** 2026-03-29
> **목적:** 깊은/중첩 던전 시스템의 보상 스케일링, 리스크 관리, 밸런스 설계를 위한 수학적 모델과 플레이어 심리 연구
> **적용 대상:** ECHORIS 아이템계 (기억의 지층) 보상/난이도 커브 설계

---

## 목차

1. [난이도 스케일링 수학 모델](#1-난이도-스케일링-수학-모델)
2. [보상 스케일링 수학 모델](#2-보상-스케일링-수학-모델)
3. [실제 게임 시스템 분석](#3-실제-게임-시스템-분석)
4. [리스크-리워드 교차점과 긴장 곡선](#4-리스크-리워드-교차점과-긴장-곡선)
5. [탈출/추출 메커니즘과 긴장감 설계](#5-탈출추출-메커니즘과-긴장감-설계)
6. [자원 고갈과 깊이 제한자](#6-자원-고갈과-깊이-제한자)
7. [플레이어 심리학과 깊이 동기](#7-플레이어-심리학과-깊이-동기)
8. [최적 정지 이론과 "한 층 더" 결정](#8-최적-정지-이론과-한-층-더-결정)
9. [ECHORIS 적용 제안](#9-project-abyss-적용-제안)

---

## 1. 난이도 스케일링 수학 모델

### 1.1 선형 스케일링 (Linear)

```
난이도(d) = Base + (d × k)
```

- **특징:** 깊이(d)마다 일정량(k)씩 증가. 예측 가능하고 단조로움
- **장점:** 밸런싱 용이, 짧은 진행 구간에 적합
- **단점:** 긴 진행에서 "레벨업 무의미화" 발생. 100층 이후 체감 증가량이 미미
- **적합 상황:** D&D 5e 같은 20레벨 이내의 짧은 파워 커브

### 1.2 지수 스케일링 (Exponential)

```
난이도(d) = Base × (1 + r)^d
```

- **특징:** 깊이마다 일정 비율(r)로 곱셈 증가
- **핵심 사례 - 디아블로 3 상위 균열:**
  - 몬스터 HP: **매 GR 레벨당 ×1.17** (17% 복리 증가)
  - 몬스터 데미지: **매 GR 레벨당 ×1.132** (GR 1~25), ×1.07 (GR 26~70), ×1.02 (GR 71~150)
  - GR 10 → GR 150: HP가 약 **8,665,000배** 증가
- **장점:** 티어 기반 콘텐츠 게이팅 자연 형성. 장비 업그레이드의 체감 가치 극대화
- **단점:** 숫자 인플레이션 극심. 디스가이아처럼 수억~수조 단위까지 갈 수 있음
- **적합 상황:** MMO, 엔드게임 무한 던전, 야리코미 시스템

**디아블로 3 GR 스케일링 구체 수치:**

| GR 레벨 | HP 배율 (누적) | 데미지 배율 (누적) | 경험치 배율 |
| :---: | :---: | :---: | :---: |
| 1 | ×1.0 | ×1.0 | ×1.0 |
| 10 | ×4.81 | ×3.45 | 지수 증가 |
| 25 | ×50.66 | ×18.7 | 지수 증가 |
| 50 | ×2,566 | ×131 | 지수 증가 |
| 75 | ×130,000 | ×919 | 지수 증가 |
| 100 | ×6,600,000 | ×2,690 | 지수 증가 |
| 150 | ×약 8.66억 | ×9,326 | 지수 증가 |

### 1.3 계단식 스케일링 (Step-Based)

```
난이도(d) = BaseTier[floor(d / interval)]
```

- **특징:** 일정 구간마다 급격한 점프. 구간 내에서는 평탄
- **핵심 사례 - Deep Rock Galactic 해저드 레벨:**

| 해저드 레벨 | 적 데미지 배율 (4인) | 공격 속도 | 이동 속도 | 보상 보너스 |
| :---: | :---: | :---: | :---: | :---: |
| 1 | ×0.50 | ×0.80 | ×0.80 | +25% |
| 2 | ×1.00 | ×0.90 | ×0.80 | +50% |
| 3 | ×1.50 | ×1.00 | ×1.00 | +75% |
| 4 | ×2.50 | ×1.25 | ×1.00 | +100% |
| 5 | ×3.40 | ×1.50 | ×1.15 | +133% |

- **장점:** 명확한 난이도 구분. 플레이어가 "이 티어는 클리어 가능하다"고 인식 가능
- **단점:** 구간 경계에서 급격한 벽 느낌 (일명 "difficulty cliff")

### 1.4 구간별 복합 스케일링 (Piecewise)

```
난이도(d) = { 선형(d),              d ≤ T₁
            { 지수(d),              T₁ < d ≤ T₂
            { 로그(d) + offset,     d > T₂ }
```

- **특징:** 구간마다 다른 곡선 적용. 초반 선형 → 중반 지수 → 후반 감속
- **핵심 사례 - 디아블로 3 데미지 스케일링:**
  - GR 1~25: 데미지 ×1.132/레벨 (가파름)
  - GR 26~70: 데미지 ×1.07/레벨 (완화)
  - GR 71~150: 데미지 ×1.02/레벨 (거의 평탄)
- **설계 의도:** HP는 계속 지수 증가하지만 데미지는 감속 → 높은 GR에서 "한 대에 즉사"가 아닌 "DPS 체크" 중심으로 전환

### 1.5 적용 가이드라인

| 시스템 유형 | 권장 스케일링 | 이유 |
| :--- | :--- | :--- |
| 짧은 진행 (20레벨 이하) | 선형 | 밸런싱 용이, 직관적 |
| 중간 진행 (20~100) | 지수 (낮은 r) | 티어 느낌 + 성장 체감 |
| 무한 진행 | 구간별 복합 | 초반 가파름 → 후반 완화로 슬로그 방지 |
| 야리코미 | 지수 + 계단 혼합 | 보스마다 급격한 점프 + 구간 내 점진적 증가 |

---

## 2. 보상 스케일링 수학 모델

### 2.1 기본 공식 유형

#### 선형 보상 (Linear)
```
보상(d) = BaseReward + (d × k)
```
- 디아블로 3 피의 파편: **GR 레벨당 +10개** (완전 선형)
- 단순하지만 깊은 깊이에서 "보상 부족" 체감 발생

#### 지수 보상 (Exponential)
```
보상(d) = BaseReward × (1 + r)^d
```
- 디아블로 3 경험치/골드: 지수적 증가
- 야리코미 시스템의 핵심. "한 단계 더"의 보상이 이전 모든 것을 압도

#### 체감 보상 (Diminishing Returns)
```
보상(d) = Max × (1 - e^(-C×d))
```
- **Max:** 최대 보상값
- **C:** 체감 상수 (클수록 빠르게 수렴)
- **특징:** 초반 급성장 → 후반 수렴. PoE Delve 깊이 500+ 이후의 보상 패턴
- **공식 변형:** `보상(d) = Max × (1 - e^(-C×d))` 에서 C 값에 따른 차이:
  - C = 2.0: 깊이 1에서 86%, 깊이 3에서 99.7% 도달 (극빠른 수렴)
  - C = 0.5: 깊이 2에서 63%, 깊이 6에서 95% 도달 (완만한 수렴)
  - C = 0.125: 깊이 8에서 63%, 깊이 24에서 95% 도달 (매우 느린 수렴)

#### 수렴 급수 (Convergent Series)
```
f(0) = 0
f(1) = Base
f(x) = f(x-1) × Decay
총 보상 = Σ f(x) → Base / (1 - Decay) 에 수렴
```
- **예시:** Base=1, Decay=0.5 → 1 + 0.5 + 0.25 + 0.125... → 2에 수렴
- 재방문 보상 감소에 적합 (첫 클리어 100% → 두 번째 50% → 세 번째 25%...)

### 2.2 보상 유형별 최적 커브

| 보상 유형 | 권장 커브 | 이유 |
| :--- | :--- | :--- |
| 경험치/골드 (통화) | 지수 | 인플레이션과 매칭. 깊은 층 = 더 강한 적 = 더 많은 보상이 자연스러움 |
| 장비 드랍 품질 | 계단 + 확률 | 일정 깊이 구간마다 드랍 테이블 티어 상승. 구간 내에서는 확률로 차등 |
| 영구 스탯 보너스 | 선형 또는 약한 지수 | 디스가이아 보스 처치 보너스: 장군 +5%, 왕 +10%, 신 +20% (계단식 선형) |
| 희귀 아이템/소재 | 확률 기반 (변동 비율) | 변동 비율 강화 스케줄이 가장 강한 동기 유발 |
| 재방문 보상 | 체감 (수렴 급수) | 첫 클리어 100% → 반복 시 50% → 25%... 파밍 대상 자연 교체 유도 |

### 2.3 디스가이아 아이템계 보상 스케일링

| 보상 요소 | 스케일링 방식 | 구체 수치 |
| :--- | :--- | :--- |
| 아이템 레벨 | 층당 +1 (선형) | 100층 = Lv.100 |
| 보스 스탯 보너스 | 계단식 | 장군(+5%) → 왕(+10%) → 신(+20%) |
| 보스 레어리티 상승 | 계단식 | 장군(+1) → 왕(+2) → 신(+3) |
| 레벨 구슬 | 확률 기반 | 21층 이후 랜덤 출현, 접촉 시 아이템 Lv +5 |
| 이노센트 가치 | 깊이 비례 | 높은 층 = 높은 이노센트 수치 |
| 스태티스티션 | 역해적 깊이 비례 | 높은 층에서 역해적 → 높은 확률 + 높은 수치 (최대 900, +900% EXP) |
| 보너스 게이지 | 행동 비례 | 적 처치/지오 파괴로 충전 → 등급별 보상 (Mr.Gency → Legend 장비 → 이노센트) |

---

## 3. 실제 게임 시스템 분석

### 3.1 디아블로 3 — 상위 균열 (Greater Rifts)

**시스템 개요:**
- 무한 난이도 스케일링 (GR 1~150+)
- 시간 제한 15분. 제한 시간 내 완료 시 다음 티어 해금
- 보스가 보상 드랍 (피의 파편, 보석, 전설 아이템)

**난이도 공식:**
```
몬스터_HP(GR) = Base_HP × 1.17^GR
몬스터_데미지(GR) = Base_DMG × DamageMultiplier(GR)

DamageMultiplier(GR):
  GR 1~25:  1.132^GR    (가파름)
  GR 26~70: 1.07^(GR-25) × DM(25)  (완화)
  GR 71~150: 1.02^(GR-70) × DM(70) (거의 평탄)
```

**보상 공식:**
```
피의_파편(GR) = Base + GR × 10       (선형)
경험치(GR) = Base × ExpMultiplier(GR) (지수)
전설_드랍률(GR) = min(100%, f(GR))    (GR 100+ 거의 100%)
```

**리스크-리워드 구조:**
- 리스크: 15분 내 실패 → 보상 없음 (시간 투자만 손실)
- 리워드: 성공 시 대량 경험치 + 보석 업그레이드 + 장비
- **탈출 메커니즘 없음** — 완료 or 실패 이분법. 중도 포기 불가

**ECHORIS 시사점:**
- 지수 HP 스케일링은 야리코미에 적합하나, 데미지는 구간별 감속 필요
- 시간 제한 대신 자원 고갈(HP, 포션)이 자연스러운 리미터

### 3.2 Path of Exile — Delve (무한 광산)

**시스템 개요:**
- 무한 깊이의 지하 광산. 크롤러(광산 카트)를 따라 이동
- 깊이가 깊어질수록 몬스터 레벨, HP, 데미지 증가
- 어둠(Darkness)이 핵심 자원 — 빛 밖에서 지속 피해

**난이도 스케일링:**
```
몬스터_레벨(depth):
  depth 1~150: level = 33 + depth (대략 선형, depth 150에서 레벨 83 캡)
  depth 150+: 레벨 83 고정, 대신 HP/데미지 배율 증가

추가_스케일링(depth):
  depth 1~250: 기본 배율
  depth 250~1600: 점진적 HP/데미지 배율 증가
  depth 1600~2586: 추가 스케일링 (극한 엔드게임)
  depth 2586+: 캡 도달
```

**보상 구조:**
- 깊이에 비례한 아이템 레벨 (최대 83)
- 깊이 500+ 에서 특수 보석(Fossil) 노드 출현 빈도 증가
- **핵심 인사이트: 깊이 500 이후 보상 체감 시작.** 깊이 200 vs 500의 보상 차이 > 깊이 500 vs 1000의 보상 차이

**리스크-리워드 구조:**
- 리스크: 사망 시 해당 노드의 보상만 손실 (전체 진행은 유지)
- 어둠 자원(설파이트) 소모 → 탐험 범위 제한
- **탈출 자유:** 언제든 크롤러 시작점으로 복귀 가능
- **결정 포인트:** 어둠 속 옆길(Dark side passage)에 들어갈 것인가? → 추가 보상 but 어둠 피해

**ECHORIS 시사점:**
- 영구 진행 보존 + 즉시 보상 손실 = "다시 도전" 동기 부여
- 어둠 = 자연스러운 깊이 제한자. ECHORIS의 "기억의 침식" 유사 개념 가능
- 보상 체감 구간이 존재해야 무한 파밍 슬로그 방지

### 3.3 Hades — 열기(Heat) 시스템

**시스템 개요:**
- 기본 클리어 후 해금되는 난이도 조절 시스템
- 15개 조건을 자유 조합하여 총 열기(Heat) 결정
- 최대 63 Heat (Hell Mode 64)
- 무기별 독립 추적

**난이도 공식:**
```
총_열기 = Σ (각 조건의 랭크 × 해당 조건의 Heat/랭크)

조건 예시:
  Hard Labor (적 데미지 +20%/랭크): 최대 5랭크 = 5 Heat
  Forced Overtime (적 속도 +20%/랭크): 최대 2랭크 = 6 Heat (3 Heat/랭크)
  Extreme Measures (보스 강화): 최대 3랭크 = 5 Heat (1,2,2 Heat/랭크)
  Tight Deadline (시간 제한): 최대 2랭크 = 5 Heat (2,3 Heat/랭크)
```

**핵심 조건 전체 목록:**

| 조건 | 효과/랭크 | 최대 랭크 | Heat/랭크 | 총 Heat |
| :--- | :--- | :---: | :---: | :---: |
| Hard Labor | 적 데미지 +20% | 5 | 1 | 5 |
| Lasting Consequences | 힐 효과 -25% | 4 | 1 | 4 |
| Convenience Fee | 상점 가격 +40% | 2 | 1 | 2 |
| Jury Summons | 전투 적 수 +20% | 3 | 1 | 3 |
| Extreme Measures | 보스 강화 | 3 | 1,2,2 | 5 |
| Calisthenics Program | 적 HP +15% | 2 | 1 | 2 |
| Benefits Package | 갑옷 적 퍼크 +1 | 2 | 2,3 | 5 |
| Middle Management | 엘리트 적 +1 | 2 | 2 | 4 |
| Underworld Customs | 지역당 축복 1개 희생 | 2 | 2 | 4 |
| Forced Overtime | 적 속도/공격 +20% | 2 | 3 | 6 |
| Heightened Security | 함정 데미지 +400% | 1 | 1 | 1 |
| Routine Inspection | 거울 재능 3개 비활성 | 4 | 2 | 8 |
| Damage Control | 적 방패 +1 | 2 | 1 | 2 |
| Approval Process | 축복 선택지 -1 | 2 | 2,3 | 5 |
| Tight Deadline | 시간 제한 -2:00/랭크 | 2 | 2,3 | 5 |

**보상 구조:**
```
바운티 시스템:
  - 무기별 목표 Heat 추적 (0 Heat부터 시작)
  - 목표 Heat 이상 달성 시 보스별 바운티 수령:
    복수의 여신 → Titan Blood
    뼈 용 → Diamond
    테세우스 → Ambrosia
    최종 보스 → Titan Blood
  - 목표 Heat는 수령 후 +1씩 증가
  - 20 Heat까지 바운티 가능 (무기 6종 × 20 Heat = 120런 이상의 콘텐츠)
  - 8/16/32 Heat 특수 보상 (Skelly 동상, 장식용)
```

**핵심 설계 인사이트:**
1. **플레이어 선택권:** 난이도 "형태"를 플레이어가 결정. 같은 5 Heat도 완전히 다른 경험
2. **점진적 열기 상승:** +1씩 목표 올라감 → "한 단계만 더" 심리 유발
3. **무기별 독립:** 6무기 × 20+ Heat = 120+ 런의 고유 목표
4. **보상 한계 있음:** 20 Heat 이후 실질 보상 없음 → 순수 도전 영역

**ECHORIS 시사점:**
- 아이템계 내 "변이(Mutation)" 시스템으로 유사 구현 가능
- 자발적 난이도 선택 = 플레이어 에이전시 극대화
- 보상 상한선이 있어야 "의무감" 대신 "도전 욕구"로 전환

### 3.4 Deep Rock Galactic — 해저드 시스템

**난이도 스케일링:**
```
적_데미지(Hazard, Players) = BaseDamage × HazardMult[Hazard] × PlayerMult[Players]
적_저항(Hazard, Players, EnemyType) = BaseResist × ResistMult[Hazard][Players][Type]

Hazard 5 (4인):
  적 데미지: ×3.40
  적 저항 (일반): ×1.50
  적 저항 (대형): ×1.50
  적 저항 (엘리트): ×1.65
  공격 속도: ×1.50
  이동 속도: ×1.15
  투사체 속도: ×1.70
```

**보상 공식:**
```
최종_보상 = 기본_보상 × (1 + Hazard_Bonus)

Hazard_Bonus = Hazard_Base + Complexity_Bonus + Length_Bonus + Warning_Bonus

  Hazard_Base: Haz1=0.25, Haz2=0.50, Haz3=0.75, Haz4=1.00, Haz5=1.33
  Complexity(1~3): +0~+0.20
  Length(1~3): +0~+0.20
  Warning(0~2): 각 +0.30

  최대 Hazard_Bonus: +2.65 (Haz5 + 최대 경고 + 최대 복잡도/길이)
```

**핵심 인사이트:**
- **보상 증가 < 난이도 증가:** Haz4→Haz5에서 적 데미지 ×1.36 증가하지만 보상은 +33%만 증가
- **의도적 비대칭:** 최고 난이도는 "효율"이 아닌 "도전"을 위한 것
- **인원 스케일링 별도:** 4인이 1인보다 적 저항 약 1.76배 → 인원 추가 ≠ 순수 이득

### 3.5 Spelunky — 깊이와 보상의 암묵적 구조

**시스템 개요:**
- 4개 월드 × 4개 레벨 = 16레벨 구성
- 영구 사망(Permadeath). 숏컷 있지만 "진짜 런"은 처음부터
- 보상은 명시적 스케일링보다 "기회"의 확장

**난이도 스케일링:**
```
월드별 질적 변화:
  광산(1-1~1-4): 뱀, 거미, 화살 함정 → 기본 위협
  정글(2-1~2-4): 만-트랩, 토템, 피라냐 → 환경 위협 급증
  얼음동굴(3-1~3-4): 예티, UFO → 예측 불가 위협
  사원(4-1~4-4): 크러시 트랩, 매그마 → 즉사 위협
```

**보상 구조:**
- 명시적 깊이 보상 곡선 없음 (골드 스코어만)
- 대신 깊이에 따른 **비밀 경로** 해금: Jungle→Black Market, Ice Caves→Mothership, Temple→City of Gold→Hell
- **풀 런 동기:** 숏컷으로 스킵하면 초반 자원(HP, 폭탄, 로프) 없이 시작 → 풀 런이 전략적으로 유리

**핵심 인사이트:**
- "보상은 숫자가 아니라 가능성이다." 깊이가 비밀을 열어줌
- 숏컷이 있지만 의도적으로 풀 런을 더 매력적으로 설계
- "정보와 판단의 게임" — 눈앞의 상자를 열기 위해 폭탄을 쓸 것인가?

### 3.6 Dark and Darker — 추출형 던전

**시스템 개요:**
- PvPvE 추출형 던전. 입장 → 몬스터+PvP → 루팅 → 추출
- 더 깊은 층으로 내려갈 수 있음 (Red Portal = 아래로, Blue Portal = 탈출)
- 깊을수록 적 강해지고 장비 좋은 상대 플레이어 존재

**리스크-리워드:**
```
Red Portal (더 깊이):
  - 적 난이도 증가 (질적 + 양적)
  - 루트 테이블 티어 상승
  - 생존까지의 시간 투자 증가
  - 강화된 PvP 상대

Blue Portal (탈출):
  - 현재까지 획득한 루트 확보
  - 더 이상의 리스크 없음
  - 잠재적 보상 포기
```

**핵심 인사이트:**
- "Red or Blue" = 명확한 의사결정 포인트
- 인벤토리가 채워질수록 탈출 압박 증가 (손실 회피)
- 사망 = 모든 것 손실 → 극단적 긴장감

---

## 4. 리스크-리워드 교차점과 긴장 곡선

### 4.1 기본 리스크-리워드 교차 모델

```
기대값(d) = 생존확률(d) × 보상(d) - 사망확률(d) × 손실(d)

여기서:
  생존확률(d) = (1 - 사망률_per_floor)^d   (지수 감소)
  보상(d) = 누적 보상 (지수 또는 선형 증가)
  손실(d) = 사망 시 잃는 것 (누적 보상의 일부 또는 전부)
```

**교차점 (Crossover Point):**
- 기대값이 양(+)에서 음(-)으로 전환되는 깊이
- 이 지점이 "합리적 플레이어의 탈출 시점"
- **핵심:** 교차점보다 약간 앞에서 긴장감이 최대

### 4.2 긴장 곡선 (Tension Curve)

```
긴장감(d) = 누적보상(d) × 손실위험(d) × 손실회피계수

  누적보상(d): 지금까지 모은 것의 가치 (증가)
  손실위험(d): 사망/실패 확률 (증가)
  손실회피계수: 약 2.0~2.5 (Kahneman 전망 이론)
```

**전망 이론(Prospect Theory) 적용:**
- 인간은 동일한 크기의 이득보다 **약 2~2.5배** 더 크게 손실을 느낌
- 따라서 보상(d) = 100골드 획득 상황에서, 사망 시 100골드 손실의 심리적 무게는 200~250골드
- **설계 함의:** 보상이 리스크의 2.5배여야 플레이어가 "도전할 가치 있다"고 느낌

### 4.3 긴장감 곡선 유형

#### 유형 A: 선형 상승 (Linear Tension)
```
긴장감 ↗↗↗↗↗↗↗↗ (단조 증가)
```
- Tarkov/Dark and Darker 스타일. 시간이 지날수록 계속 긴장
- 문제: 후반 과부하 → 스트레스성 이탈

#### 유형 B: 톱니파 (Sawtooth Tension)
```
긴장감 ↗↗↗↘↗↗↗↘↗↗↗↘ (주기적 해소)
```
- Hades/디스가이아 스타일. 보스 처치 후 안전 구간(이노센트 타운/상점)
- **가장 지속 가능한 패턴.** 긴장-해소-긴장의 리듬

#### 유형 C: 역U자 (Inverted-U)
```
긴장감 ↗↗↗↗█↘↘↘ (정점 후 하락)
```
- 긴장 과부하 후 "어차피 죽을 것 같다" → 무감각 전환
- **피해야 할 패턴.** 과도한 난이도 스파이크가 원인

### 4.4 ECHORIS 기억의 지층에 적합한 긴장 곡선

```
이상적 긴장 패턴 (4지층 Legendary 기준):

지층 1 (3×3): ▂▃▄█▁  → 탐색-긴장-보스-안도
지층 2 (4×4): ▃▄▅▆█▁ → 더 넓은 탐색-점진적 긴장-보스-안도
지층 3 (5×5): ▅▆▇▇▇█▁ → 지속 높은 긴장-보스-안도 (그러나 안도 짧음)
지층 4 (5×5): ▇▇▇████ → 최고 긴장 유지-최종 보스-큰 해소

각 지층 내: 톱니파 (방 클리어마다 소규모 해소)
지층 간: 상승 추세 (전체적으로 긴장 증가)
보스 후: 탈출 의사결정 포인트 = 긴장의 정점
```

---

## 5. 탈출/추출 메커니즘과 긴장감 설계

### 5.1 탈출 메커니즘 유형별 비교

| 게임 | 탈출 방식 | 비용 | 제한 | 긴장감 생성 방식 |
| :--- | :--- | :--- | :--- | :--- |
| **디스가이아** | Mr. Gency Exit (소모품) | 1개/사용 | 보유량 제한 | "Mr. Gency 남아있나?" 자원 관리 |
| **디스가이아** | 10층마다 보스 후 탈출 | 무료 | 10층 간격 | "다음 10층까지 버틸 수 있나?" |
| **Tarkov** | 추출 지점 도달 | 이동 시간 + 위험 | 시간 제한 | 추출점까지의 여정 = 최고 긴장 |
| **Dark and Darker** | Blue Portal | 위치 탐색 | 랜덤 스폰 | 포탈 찾는 동안의 불확실성 |
| **PoE Delve** | 즉시 복귀 | 무료 | 없음 | 어둠 속 옆길 탐험이 유일한 리스크 |
| **Spelunky** | 출구 도달 | 레벨 완주 | 매 레벨 | 출구까지 "살아남기" |
| **ECHORIS** | 탈출 제단 (25%) + 보스 후 | 탈출 제단은 무료 | 25% 확률 스폰 | 제단 발견 불확실성 + 보스까지 생존 |

### 5.2 Tarkov식 추출 긴장감의 핵심 원리

**Escape from Tarkov 분석:**

1. **손실 회피(Gear Fear):** 모든 장비를 잃을 수 있다는 공포가 모든 결정에 무게를 부여
2. **점진적 긴장 축적:** 인벤토리가 채워질수록 "잃을 것"이 증가 → 긴장감 비례 상승
3. **정보 결핍:** 미니맵 없음, 적 위치 불명 → 불확실성이 긴장 증폭
4. **시간 압박:** 레이드 시간 제한 → "느긋하게 파밍"이 불가
5. **추출 = 최고 긴장:** 추출 지점 근처가 가장 위험 (다른 플레이어 집중)
6. **감정적 보상:** 성공적 추출 시 도파민 폭발. "지옥에서 빠져나왔다"

**게임 설계 원칙 (Tarkov에서 추출):**
> "Tarkov는 플레이어를 불편하게 만들기로 결정했다. 지속적인 도파민 대신 긴장, 인내, 결과를 넣었다."

### 5.3 ECHORIS 탈출 제단의 긴장 설계

현재 설계 (System_ItemWorld_Core.md 기반):
- 탈출 제단: 25% 확률 스폰 (방 생성 시)
- 보스 처치 후 항상 탈출 가능
- Mr. Gency 유사 소모품은 별도 미정

**긴장감 강화를 위한 추가 레이어:**

| 요소 | 기능 | 긴장 기여 |
| :--- | :--- | :--- |
| 탈출 제단 스폰 확률 | 지층이 깊을수록 하락 (25%→20%→15%→10%) | "깊을수록 빠져나가기 어렵다" |
| 보스 후 결정 시간 | 보스 처치 후 30초 내 결정 (계속/탈출) | 시간 압박 |
| 사망 시 손실 | 해당 런에서 획득한 이노센트만 손실. 아이템 레벨업은 보존 | 적절한 손실 (전부 잃지는 않음) |
| 기억의 침식 | 깊은 지층에서 시간 경과 시 지속 피해 (PoE 어둠 유사) | 자연스러운 시간 제한 |

---

## 6. 자원 고갈과 깊이 제한자

### 6.1 자원 고갈 유형

| 자원 유형 | 예시 | 고갈 패턴 | 깊이 제한 방식 |
| :--- | :--- | :--- | :--- |
| **HP/회복** | 포션, 힐 스킬 | 전투마다 소모 → 축적 | 포션 바닥 = 다음 전투 위험 |
| **탈출 수단** | Mr. Gency, 탈출 두루마리 | 사용당 1개 소모 | "남은 탈출수단 0이면 보스까지 도달해야" |
| **내구도** | 장비 내구도 | 전투/시간 비례 감소 | 장비 파괴 → 전투력 급감 |
| **환경 저항** | PoE 어둠, 독 지대 | 깊이 비례 강화 | 저항 부족 = 자연 한계 |
| **통화** | 상점 구매용 골드 | 상점 이용마다 소모 | 골드 바닥 = 보급 불가 |

### 6.2 로그라이크의 자원 관리 원칙

**핵심 원칙:**
> "소모품은 로그라이크가 단일 실수를 최후의 순간에 방지하도록 제공하는 도구이다. 그러나 많은 플레이어는 소모품을 영원히 아끼거나, 올 리 없는 더 큰 장애물을 위해 비축한다."

**소모품 역설 (Consumable Paradox):**
- 플레이어는 소모품을 아끼는 경향 → 실제로 필요한 순간에 사용하지 않음
- 해결책: 소모품에 유효기간 부여 (기억의 지층 내에서만 유효) 또는 사용 시 추가 보상

**자원 긴장 곡선:**
```
자원(d) = 초기자원 + Σ(획득(i)) - Σ(소모(i))   (i = 1 to d)

건강한 곡선:
  초반: 자원 여유 (학습 구간)
  중반: 자원 균형 (긴장 시작)
  후반: 자원 부족 (최대 긴장)
  보스 후: 자원 보충 기회 (안도)
```

### 6.3 소프트 리미터 vs 하드 리미터

| 유형 | 정의 | 예시 | 효과 |
| :--- | :--- | :--- | :--- |
| **소프트 리미터** | 점진적으로 불리해지지만 이론적으로 계속 가능 | HP 감소, 장비 열화 | "실력이면 더 갈 수 있다" 느낌 |
| **하드 리미터** | 특정 조건 미달 시 물리적으로 진행 불가 | 스탯 게이트, 키 아이템 부재 | 명확한 "여기까지" 신호 |
| **시간 리미터** | 시간 경과에 따른 강제 종료 | Hades 시간 제한, 맵 축소 | 긴장감 극대화, 파밍 방지 |

**ECHORIS 권장:**
- 지층 내: 소프트 리미터 (HP/포션 고갈)
- 지층 간: 하드 리미터 (보스 처치 필수)
- 전체: 간접 시간 제한 (기억의 침식 — 시간 경과 시 환경 피해 증가)

---

## 7. 플레이어 심리학과 깊이 동기

### 7.1 핵심 심리 메커니즘

#### 7.1.1 손실 회피 (Loss Aversion)

**전망 이론 (Kahneman & Tversky, 1979):**
```
가치 함수:
  이득 영역: v(x) = x^α        (α ≈ 0.88, 오목 = 위험 회피)
  손실 영역: v(x) = -λ|x|^β    (β ≈ 0.88, λ ≈ 2.25, 볼록 = 위험 추구)

λ ≈ 2.25: 손실이 같은 크기의 이득보다 약 2.25배 더 고통스러움
```

**게임 설계 적용:**
- 아이템계에서 3지층까지 클리어한 상태: 누적 보상의 심리적 가치 = 실제 가치 × 2.25
- 따라서 4지층 진입 보상이 충분히 커야 "위험 감수" 선택이 발생
- **공식:** `4지층 보상 ≥ 누적 보상 × 사망확률 × 2.25` 일 때 플레이어가 진입 결정

#### 7.1.2 매몰 비용 오류 (Sunk Cost Fallacy)

> "여기까지 왔는데 그냥 나갈 수는 없지."

- 이미 투자한 시간/노력이 "계속하기" 편향을 생성
- 로그라이크에서 특히 강력: 30분 런 중 25분 지점에서 "여기서 나가면 25분 낭비"
- **이중적 역할:**
  - 양: 깊은 런 동기 부여 → 만족스러운 성공 경험
  - 음: 비합리적 계속 진행 → 사망 → 좌절감 극대화
- **설계 함의:** 보스 후 탈출 포인트가 매몰 비용을 "결산"하는 자연스러운 순간

#### 7.1.3 변동 비율 강화 스케줄 (Variable Ratio Reinforcement)

**B.F. Skinner의 강화 이론:**
```
고정 비율 (FR): 정해진 횟수마다 보상 → 보상 직후 반응률 급감
변동 비율 (VR): 불확실한 횟수마다 보상 → 일정한 높은 반응률 유지

VR이 가장 소거 저항이 높음 (= 가장 오래 플레이)
```

**도파민 방출 차이:**
- 고정 비율: 보상 수령 시 도파민 방출 → 보상 이후 빠른 소멸
- 변동 비율: **보상 예측 불확실성 자체**가 도파민 방출 → 지속적 자극

**로그라이크/아이템계 적용:**
- 이노센트 드랍: 1% 확률의 희귀 이노센트 → VR 스케줄
- 미스터리 룸: 랜덤 출현 → "이번 층에 있을까?" 기대감
- 탈출 제단: 25% 확률 → 발견 시 안도감 폭발

#### 7.1.4 근접 실패 효과 (Near-Miss Effect)

> "조금만 더 했으면 보스 잡았는데..." → 재시도 동기 극대화

- 카지노 슬롯머신의 핵심 메커니즘
- 실패가 "거의 성공"으로 인식될 때 재시도율이 극적으로 상승
- **아이템계 적용:** 보스 HP가 10% 이하에서 사망 → "한 번만 더" 심리

#### 7.1.5 목표 구배 효과 (Goal Gradient Effect)

> 목표에 가까워질수록 동기 부여가 강해진다.

- 3지층 중 2지층 클리어 → "마지막 한 지층만!" 심리
- **시각적 진행 표시가 핵심:** 전체 지층 중 현재 위치를 항상 표시

### 7.2 로그라이크가 중독적인 이유 (종합)

| 심리 메커니즘 | 로그라이크에서의 구현 | 아이템계 적용 |
| :--- | :--- | :--- |
| **자기효능감** | 반복 실패 → 패턴 학습 → 성공 | 지층 구조 학습 → 효율적 공략 |
| **도파민 루프** | 예측 불가 보상 + 빈번한 소규모 보상 | 이노센트 드랍 + 보너스 게이지 |
| **메타 진행** | 런 실패해도 영구 해금 존재 | 보스 처치 시 영구 스탯 보너스 |
| **발견의 쾌감** | 시너지 발견, 비밀 경로 | 미스터리 룸, 비밀방, 이노센트 조합 |
| **몰입(Flow)** | 난이도와 실력의 균형 | 지층별 점진적 난이도 상승 |
| **자율성** | 빌드 선택, 경로 선택 | 지층 내 탐색 순서, 탈출 타이밍 결정 |

---

## 8. 최적 정지 이론과 "한 층 더" 결정

### 8.1 최적 정지 이론 (Optimal Stopping Theory) 개요

**정의:** 기대 보상을 최대화하기 위해 특정 행동을 취할 "최적의 시점"을 결정하는 수학적 이론

**비서 문제 (Secretary Problem):**
```
n명의 후보를 순차 면접. 각 후보를 즉시 채용/거절.
최적 전략: 처음 n/e명(≈37%)은 무조건 거절 후 관찰.
이후 지금까지 본 후보 중 최고보다 나은 첫 후보를 채용.
성공 확률: 약 37% (n이 무한대로 가도 동일)
```

### 8.2 Push Your Luck (운 밀어붙이기) 모델

**기본 모델:**
```
기대값(계속) = 생존확률 × (현재보상 + 추가보상) + 사망확률 × (-손실)
기대값(탈출) = 현재보상

계속이 유리한 조건:
  생존확률 × (현재보상 + 추가보상) - 사망확률 × 손실 > 현재보상

정리하면:
  추가보상 > (사망확률/생존확률) × (현재보상 + 손실)
```

**구체 예시 (ECHORIS 지층 시나리오):**
```
상황: 3지층 클리어, 누적 보상 = 100 가치 단위
4지층 생존확률: 70%
4지층 추가 보상: 60 가치 단위
사망 시 손실: 누적 보상의 50% = 50 (이노센트만 손실, 스탯은 유지)

기대값(계속) = 0.7 × (100 + 60) + 0.3 × (100 - 50) = 112 + 15 = 127
기대값(탈출) = 100

계속 > 탈출 → 4지층 진입이 합리적

그러나 손실 회피 보정 (λ=2.25):
기대값(계속)_심리 = 0.7 × (100 + 60) + 0.3 × (100 - 50×2.25) = 112 + 0.3×(-12.5) = 108.25
기대값(탈출)_심리 = 100

여전히 계속이 유리하지만 마진이 8.25로 좁아짐
→ 이것이 "머리로는 가야 하는데 마음이 불안한" 상태
```

### 8.3 최적 탈출 깊이 공식

```
최적_탈출_깊이 = argmax_d [ P_survive(d) × R_total(d) - P_die(d) × L(d) ]

여기서:
  P_survive(d) = Π(1 - p_death_i) for i=1 to d  (누적 생존 확률)
  R_total(d) = Σ R(i) for i=1 to d              (누적 보상)
  P_die(d) = 1 - P_survive(d)                    (누적 사망 확률)
  L(d) = f(R_total(d))                           (손실 함수, 보통 누적 보상의 비율)
```

### 8.4 "한 층 더" 결정을 유도하는 설계 기법

| 기법 | 메커니즘 | 효과 |
| :--- | :--- | :--- |
| **다음 보상 미리보기** | "다음 지층 보스: 기억의 왕 (ATK +10%)" 표시 | 구체적 보상이 추상적 리스크를 압도 |
| **진행률 시각화** | "2/4 지층 완료" 진행바 | 목표 구배 효과로 완주 동기 |
| **안전망 제시** | "탈출 제단이 3개 남았습니다" | 탈출 가능성을 상기시켜 불안 감소 |
| **보스 후 회복** | 보스 클리어 시 HP 30% 회복 | "한 지층 더 갈 체력이 생겼다" |
| **부분 손실만** | 사망 시 이노센트만 손실, 레벨/스탯은 유지 | 완전 손실 공포 제거 → 도전 의지 ↑ |
| **근접 실패 연출** | 보스 남은 HP 표시 + 카메라 줌 | "조금만 더였는데" → 재시도 |

---

## 9. ECHORIS 적용 제안

### 9.1 난이도 스케일링 제안

**레어리티별 지층 난이도 모델:**
```yaml
difficulty_scaling:
  # 기본 공식: MonsterPower(strata, room) = BasePower × StrataMult × RoomMult

  strata_multiplier:
    # 지층 간 계단식 점프 (보스가 경계)
    strata_1: 1.0    # 기본
    strata_2: 1.8    # 80% 증가
    strata_3: 3.0    # 67% 증가 (전 지층 대비)
    strata_4: 5.0    # 67% 증가
    strata_abyss: 8.0  # Ancient 전용, 60% 증가

  room_multiplier:
    # 지층 내 방 간 선형 미세 증가
    # 3×3 기준: 9방에 걸쳐 1.0 → 1.2 (약 2.5%/방)
    # 5×5 기준: 25방에 걸쳐 1.0 → 1.5 (약 2%/방)
    formula: "1.0 + (room_distance_from_entry / total_rooms) × 0.2~0.5"

  rarity_base_power:
    # 아이템 레어리티가 높을수록 기본 적 파워 증가
    Normal:    1.0
    Magic:     1.3
    Rare:      1.7
    Legendary: 2.2
    Ancient:   3.0
```

**HP/데미지 분리 스케일링 (디아블로 3 교훈):**
```yaml
scaling_separation:
  # HP는 지수 증가 (DPS 체크 → 야리코미 동기)
  monster_hp_per_strata: "×1.8"  # 지층당 80% 증가

  # 데미지는 완만한 증가 (즉사 방지 → 플레이 유지)
  monster_damage_per_strata: "×1.4"  # 지층당 40% 증가

  # 결과: 깊은 지층에서 "죽지는 않지만 오래 걸린다" → 포션/시간 소모 = 소프트 리미터
```

### 9.2 보상 스케일링 제안

**보상 공식:**
```yaml
reward_scaling:
  # 1. 아이템 경험치 (선형, 안정적)
  item_exp_per_room: "BaseExp × strata_number"
  # 지층 1: 10 EXP/방, 지층 4: 40 EXP/방

  # 2. 보스 스탯 보너스 (계단식, 야리코미 핵심)
  boss_stat_bonus:
    기억의_장군: "+3% 주 스탯"     # 지층 1 보스
    기억의_왕:   "+7% 주 스탯"     # 지층 2 보스
    기억의_신:   "+15% 주 스탯"    # 지층 3 보스
    기억의_대신: "+25% 주 스탯"    # 지층 4 보스 (Legendary+)
    심연의_잔상: "+40% 주 스탯"    # 심연 보스 (Ancient 전용)

  # 3. 이노센트 드랍 (변동 비율, 깊이 비례)
  innocent_drop_rate:
    strata_1: "5% per room"
    strata_2: "8% per room"
    strata_3: "12% per room"
    strata_4: "18% per room"
    abyss:    "25% per room"

  innocent_value_range:
    strata_1: "Lv 1~10"
    strata_2: "Lv 5~20"
    strata_3: "Lv 10~35"
    strata_4: "Lv 20~50"
    abyss:    "Lv 30~80"

  # 4. 장비 드랍 (깊이 비례 테이블 티어)
  equipment_drop_tier:
    strata_1: "Normal~Magic"
    strata_2: "Magic~Rare"
    strata_3: "Rare~Legendary"
    strata_4: "Legendary 확정, Ancient 1%"
    abyss:    "Legendary 확정, Ancient 5%"

  # 5. 재방문 보상 감소 (수렴 급수)
  revisit_penalty:
    formula: "BaseReward × 0.5^(visit_count - 1)"
    # 1회차: 100%, 2회차: 50%, 3회차: 25%, 4회차: 12.5%
    # 다른 아이템의 아이템계로 자연 이동 유도
```

### 9.3 리스크-리워드 밸런스 제안

**사망 시 손실 체계:**
```yaml
death_penalty:
  preserved:  # 사망해도 유지
    - "보스 처치로 얻은 영구 스탯 보너스"
    - "아이템 레벨 (클리어한 지층 기준)"
    - "지층 진행 상태 (마지막 보스 지점)"

  lost:       # 사망 시 손실
    - "현재 지층에서 획득한 미복종 이노센트"
    - "현재 지층에서 획득한 장비 아이템"
    - "보너스 게이지 진행도"

  design_intent:
    # 핵심: "지금까지의 노력은 보존되지만, 이번 지층의 수확은 잃는다"
    # 이것은 "다시 도전" 동기를 유지하면서도 과도한 좌절을 방지
    # 전망 이론 기준: 손실이 전체의 30~40% → 충분한 긴장감 + 수용 가능한 손실
```

**탈출 의사결정 포인트 설계:**
```yaml
escape_decision_points:
  # 보스 처치 후 = 핵심 의사결정 순간
  post_boss_options:
    - action: "탈출"
      result: "모든 보상 확보. 아이템계 종료."
      display: "획득 보상 요약 + '안전하게 귀환'"

    - action: "계속"
      result: "다음 지층 진입. 추가 보상 가능. 사망 리스크."
      display: "다음 지층 보스 정보 + 예상 난이도 표시"

  # 탈출 제단 = 지층 내 의사결정
  altar_decision:
    spawn_rate_by_strata:
      strata_1: 30%    # 넉넉한 안전망
      strata_2: 25%    # 기본
      strata_3: 20%    # 긴장감 증가
      strata_4: 15%    # 높은 긴장감
      abyss:    10%    # 극도의 긴장감

    discovery_reward: "발견 시 안도감 자체가 보상 (SFX + 시각 효과)"
```

### 9.4 긴장 곡선 설계 (최종 요약)

```
[Legendary 아이템 4지층 런 긴장 곡선]

긴장
 │
 │                                          ████
 │                                       ███    █
 │                                    ███       █
 │                               █████          █
 │                            ███               █
 │                    ████████                  █
 │                 ███                          █
 │          ███████                             █
 │       ███                                    █
 │   ████                                       ▼
 │███                                        (탈출/
 │                                           사망)
 └──────────────────────────────────────────────→ 깊이
  S1-진입  S1-보스  S2-탐색  S2-보스  S3-탐색  S3-보스  S4-탐색  S4-보스
           ↕안도     ↕안도              ↕안도              ↕짧은안도
         [탈출?]   [탈출?]           [탈출?]            [탈출?]

범례:
  S = Strata (지층)
  █ = 긴장감 수준
  ↕ = 톱니파 해소 구간
  [탈출?] = 의사결정 포인트
```

### 9.5 수학 공식 요약 (Quick Reference)

```
═══════════════════════════════════════════════════
[1] 몬스터 파워
MonsterPower(s, r) = RarityBase × StrataMult[s] × (1 + r/R × 0.3)
  s = 지층 번호, r = 방 거리, R = 총 방 수

[2] 기대값 판단
EV(계속) = P_surv × (Current + Next) + (1-P_surv) × (Current - Loss)
EV(탈출) = Current
→ 계속 조건: Next > (P_die/P_surv) × (Current + Loss)

[3] 심리 보정 기대값
EV_심리(계속) = P_surv × (Current + Next) + (1-P_surv) × (Current - Loss×2.25)
→ 보상이 합리적 기대값보다 2.25배 매력적이어야 도전

[4] 보상 체감 (재방문)
Reward(visit) = BaseReward × 0.5^(visit - 1)

[5] 이노센트 드랍 기대값
E[innocent_value] = drop_rate(s) × avg_value(s) × (1 + 방랑자보너스)

[6] 누적 생존 확률
P_survive(strata_n) = Π(1 - death_rate[i]) for i=1 to n
  death_rate 추정: S1=5%, S2=15%, S3=25%, S4=35%, Abyss=50%
  P(4지층 생존) = 0.95 × 0.85 × 0.75 × 0.65 ≈ 39.4%
═══════════════════════════════════════════════════
```

---

## Sources

### 난이도/보상 스케일링
- [GameDesign Math: RPG Level-based Progression](https://www.davideaversa.it/blog/gamedesign-math-rpg-level-based-progression/)
- [The Mathematics of Game Balance - Department of Play](https://departmentofplay.net/the-mathematics-of-balance/)
- [The Mathematics of Game Balance - UserWise](https://blog.userwise.io/blog/the-mathematics-of-game-balance)
- [Diminishing Returns: Exponential Decay and Convergent Series](https://blog.nerdbucket.com/diminishing-returns-in-game-design-exponential-decay-and-convergent-series/article)
- [Diminishing Returns: The Logarithm](https://blog.nerdbucket.com/diminishing-returns-in-game-design-the-logarithm/article)
- [Linear versus Exponential Progression](http://talarian.blogspot.com/2014/09/linear-versus-exponential-progression.html)

### 실제 게임 시스템
- [Diablo 3 Greater Rift Mechanics - Maxroll.gg](https://maxroll.gg/d3/resources/greater-rift-explained)
- [Greater Rift Difficulty Scaling Chart - PureDiablo](https://www.purediablo.com/greater-rift-difficulty-scaling-chart)
- [Path of Exile Delve - PoE Wiki](https://www.poewiki.net/wiki/Delve)
- [Delve Farming Guide - Maxroll.gg](https://maxroll.gg/poe/currency/delve-farming-guide)
- [Hades Pact of Punishment - RPG Site](https://www.rpgsite.net/feature/10287-hades-pact-of-punishment-heat-modifiers-and-how-to-maximize-your-rewards)
- [Deep Rock Galactic Difficulty Scaling Wiki](https://deeprockgalactic.wiki.gg/wiki/Difficulty_Scaling)
- [Deep Rock Galactic Hazard Bonus Wiki](https://deeprockgalactic.wiki.gg/wiki/Hazard_Bonus)
- [Spelunky Game Design Analysis](https://www.gamedeveloper.com/design/a-spelunky-game-design-analysis---pt-2)
- [Disgaea 5 Item World - Gamer Guides](https://www.gamerguides.com/disgaea-5-alliance-of-vengeance/guide/extras/item-world/overview)
- [Disgaea Item Bosses Wiki](https://disgaea.fandom.com/wiki/Item_Bosses)

### 추출/탈출 메커니즘
- [Tarkov Tension Design Analysis](https://lab.rosebud.ai/blog/escape-from-tarkov-the-hardcore-shooter-that-redefined-tension-in-games)
- [Psychology of Gear Fear - LinkedIn](https://www.linkedin.com/pulse/psychology-gear-fear-lessons-risk-anxiety-innovation-esteban-adrian)
- [Dark and Darker Extraction Guide](https://www.thegamer.com/dark-and-darker-extraction-guide/)

### 플레이어 심리학
- [Prospect Theory - Wikipedia](https://en.wikipedia.org/wiki/Prospect_theory)
- [Sunk Cost Fallacy in Video Game Design](https://medium.com/@milijanakomad/product-design-and-psychology-the-exploitation-of-the-sunk-cost-fallacy-in-video-game-design-d60385e39fec)
- [Why Are Roguelike Games So Addictive?](https://retrostylegames.com/blog/why-are-roguelike-games-so-engaging/)
- [Variable Reward Schedules](https://www.teachboston.org/variable-reward-schedules-gambling/)

### 최적 정지/Push Your Luck
- [Optimal Stopping - Wikipedia](https://en.wikipedia.org/wiki/Optimal_stopping)
- [Secretary Problem - Wikipedia](https://en.wikipedia.org/wiki/Secretary_problem)
- [Balancing Push Your Luck Games - BGDF](https://www.bgdf.com/forum/game-creation/design-theory/balancing-push-your-luck-games)
- [Push Your Luck Mechanic - BoardGameGeek](https://boardgamegeek.com/boardgamemechanic/2661/push-your-luck)

### 로그라이크 자원 관리
- [Roguelike Radio: Resource Management](http://www.roguelikeradio.com/2011/11/episode-14-resource-management.html)
- [Designing for Mastery in Roguelikes](https://www.gridsagegames.com/blog/2025/08/designing-for-mastery-in-roguelikes-w-roguelike-radio/)
- [Stat Balancing in Roguelikes](https://blog.roguetemple.com/articles/stat-balancing-in-roguelikes/)
