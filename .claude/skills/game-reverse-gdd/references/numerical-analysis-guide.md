# 4대 수치 분석 방법론 가이드

> data-analyst 에이전트가 게임 시스템의 수치 데이터를 분석하는 4대 영역(성장 곡선, 전투 공식, 경제 순환, 확률 시뮬레이션)의 방법론을 정의한다.

---

## 개요

### 4대 분석 영역

| # | 영역 | 목적 | 적용 조건 | 주요 Chart.js 타입 |
|---|------|------|----------|-------------------|
| 1 | 성장 곡선 분석 | 레벨/강화 수치 변화 패턴 파악 | 레벨/강화 시스템 존재 시 | Line + Scatter |
| 2 | 전투 공식 역산 | 데미지 계산 공식 구조 추론 | 전투 시스템 존재 시 | Scatter + Bar |
| 3 | 경제 순환 분석 | 재화 유입/유출 흐름과 균형점 파악 | 재화 시스템 존재 시 | Stacked Bar + Doughnut + Line |
| 4 | 확률 시뮬레이션 | 가챠/강화 기대값과 비용 분포 분석 | 가챠/확률 시스템 존재 시 | Bar (히스토그램) + Line (누적) |

### 조건부 포함 규칙

- 성장 곡선: 레벨업, 강화, 진화, 초월 등 **단계적 성장 시스템**이 있을 때만
- 전투 공식: 공격력, 방어력, 데미지 등 **전투 수치 계산**이 있을 때만
- 경제 순환: 골드, 젬, 스태미나 등 **재화 시스템**이 있을 때만
- 확률 시뮬레이션: 가챠, 확률 강화, 드랍률 등 **확률 기반 시스템**이 있을 때만
- **최소 1개 영역은 반드시 분석** (해당 시스템에 가장 적합한 영역 선택)

### 분석 입력 데이터

| 입력 소스 | 제공 에이전트 | 내용 |
|----------|-------------|------|
| 수치 데이터 포인트 | web-researcher (A→C) | 확률, 비용, 레벨, 경제 수치, 공식 |
| 데이터 테이블 구조 | system-analyst (B→C) | 스키마, 밸런싱 공식, 범위/경계 정보 |

---

## 1. 성장 곡선 분석

### 목적

레벨업, 강화, 진행도에 따른 수치 변화 패턴을 파악하고, 설계 의도(선형/지수/계단식)를 추론한다.

### 데이터 수집 기준

| 데이터 유형 | 최소 포인트 | 권장 포인트 | 예시 |
|------------|-----------|-----------|------|
| 경험치 요구량 | 5개 (1, 10, 20, 50, 최대) | 10개 이상 | Lv1: 100, Lv10: 2500, ... |
| 강화 비용 | 5개 (+1, +5, +10, +15, 최대) | 전 단계 | +1: 1000골드, +5: 8000골드, ... |
| 스탯 성장 | 5개 (초기, 중반, 후반, 최대) | 10개 이상 | Lv1 ATK: 50, Lv10 ATK: 120, ... |
| 진행도 요구량 | 3개 이상 | 전 단계 | 챕터1: 1일, 챕터5: 3일, ... |

### 커브 피팅 방법론

수집된 데이터 포인트에 대해 3가지 모델을 순차 시도한다.

#### 모델 1: 선형 (Linear)

```
y = ax + b

a (기울기) = (nΣxy - ΣxΣy) / (nΣx² - (Σx)²)
b (절편) = (Σy - aΣx) / n
```

**적용 케이스**: 초반 성장, 균일한 증가 구간, 보상 스케일링
**판별 기준**: 데이터의 2차 차분이 거의 0에 가까울 때

#### 모델 2: 다항식 (Polynomial, 2차)

```
y = ax² + bx + c

연립방정식으로 a, b, c 산출:
Σy = na + bΣx + cΣx²
Σxy = aΣx + bΣx² + cΣx³
Σx²y = aΣx² + bΣx³ + cΣx⁴
```

**적용 케이스**: 점진적 가속 성장, 중후반 비용 증가
**판별 기준**: 2차 차분이 상수에 가까울 때

#### 모델 3: 지수 (Exponential)

```
y = a · b^x

양변에 ln 취해 선형 변환:
ln(y) = ln(a) + x·ln(b)
→ 선형 회귀로 ln(a), ln(b) 산출
```

**적용 케이스**: 급격한 후반 스케일링, 강화 비용 폭증
**판별 기준**: ln(y) 대 x의 관계가 선형일 때

### 최적 모델 선택

```
1. 세 모델 각각에 대해 잔차(residual) 계산
2. 잔차 제곱합(RSS) 비교
3. R² 값 계산: R² = 1 - (RSS / TSS)
   - TSS = Σ(yi - ȳ)²
4. R²가 가장 높은 모델 채택
5. R² < 0.85이면 구간 분할 피팅 시도
```

### 구간 분할 피팅

단일 모델로 피팅이 안 될 때 (R² < 0.85):

```
1. 데이터를 시각적으로 확인하여 변곡점 탐색
2. 변곡점 기준으로 구간 분할
3. 각 구간에 별도 모델 적용
예: Lv1~50은 선형, Lv51~100은 지수
4. 구간 경계에서의 불연속성 기록
```

### Bash 계산 구현

```bash
#!/bin/bash
# 선형 회귀 간이 계산
# 입력: x_values, y_values (공백 구분)
# 출력: 기울기(a), 절편(b), R²

X=("1" "10" "20" "30" "50")
Y=("100" "1500" "5000" "12000" "45000")
n=${#X[@]}

sum_x=0; sum_y=0; sum_xy=0; sum_x2=0; sum_y2=0
for ((i=0; i<n; i++)); do
  x=${X[$i]}; y=${Y[$i]}
  sum_x=$(echo "$sum_x + $x" | bc)
  sum_y=$(echo "$sum_y + $y" | bc)
  sum_xy=$(echo "$sum_xy + $x * $y" | bc)
  sum_x2=$(echo "$sum_x2 + $x * $x" | bc)
  sum_y2=$(echo "$sum_y2 + $y * $y" | bc)
done

a=$(echo "scale=4; ($n * $sum_xy - $sum_x * $sum_y) / ($n * $sum_x2 - $sum_x * $sum_x)" | bc)
b=$(echo "scale=4; ($sum_y - $a * $sum_x) / $n" | bc)

# R² 계산
mean_y=$(echo "scale=4; $sum_y / $n" | bc)
ss_res=0; ss_tot=0
for ((i=0; i<n; i++)); do
  y_pred=$(echo "scale=4; $a * ${X[$i]} + $b" | bc)
  res=$(echo "scale=4; ${Y[$i]} - $y_pred" | bc)
  tot=$(echo "scale=4; ${Y[$i]} - $mean_y" | bc)
  ss_res=$(echo "scale=4; $ss_res + $res * $res" | bc)
  ss_tot=$(echo "scale=4; $ss_tot + $tot * $tot" | bc)
done
r2=$(echo "scale=4; 1 - $ss_res / $ss_tot" | bc)

echo "기울기(a): $a"
echo "절편(b): $b"
echo "R²: $r2"
```

### Chart.js 설정

```javascript
// 성장 곡선 차트 설정
{
  canvasId: 'growthCurveChart',
  chartType: 'scatter',  // 기본 타입: Scatter (실측 데이터)
  data: {
    datasets: [
      {
        label: '실측 데이터',
        data: [/* {x: level, y: value} */],
        backgroundColor: COLORS.blue,
        pointRadius: 5,
        pointHoverRadius: 7,
        showLine: false
      },
      {
        label: '피팅 곡선 (모델명)',
        data: [/* {x: level, y: fitted_value} */],
        borderColor: COLORS.purple,
        backgroundColor: 'transparent',
        pointRadius: 0,
        showLine: true,
        borderWidth: 2,
        tension: 0.3
      }
    ]
  },
  options: {
    ...COMMON_OPTIONS,
    plugins: {
      ...COMMON_OPTIONS.plugins,
      title: {
        display: true,
        text: '{시스템명} 성장 곡선',
        font: { family: 'Pretendard Variable', size: 14, weight: '600' }
      },
      annotation: {
        // 구간 분할 경계선 (필요 시)
      }
    },
    scales: {
      x: {
        ...COMMON_OPTIONS.scales.x,
        title: { display: true, text: '레벨 / 단계' }
      },
      y: {
        ...COMMON_OPTIONS.scales.y,
        title: { display: true, text: '요구 수치 (EXP / 재료 / 비용)' }
      }
    }
  }
}
```

### 산출물 형식

```markdown
## 성장 곡선 분석 결과

### 데이터 요약
- 데이터 포인트: N개
- 범위: Lv1 ~ Lv{max}
- 데이터 등급: {A~E} (출처: {URL})

### 피팅 결과
- 최적 모델: {선형/다항식/지수}
- 수식: y = {수식}
- R² = {값}
- 잔차 최대: {값} (Lv{X}에서)

### 설계 의도 추론
- 초반(Lv1~20): {선형} 성장 → 빠른 온보딩 유도
- 중반(Lv21~50): {다항식} 성장 → 점진적 난이도 상승
- 후반(Lv51~100): {지수} 성장 → 과금/시간 투자 유도

### Chart.js 설정 블록
{위의 JSON 블록}
```

---

## 2. 전투 공식 역산

### 목적

데미지 계산 공식의 구조와 계수를 추론하여, 게임의 전투 밸런스 설계 의도를 파악한다.

### 데이터 수집 기준

| 데이터 유형 | 최소 포인트 | 측정 조건 | 예시 |
|------------|-----------|----------|------|
| 공격력 vs 데미지 | 5개 | 방어력 고정, 버프 없음 | ATK 100→DMG 80, ATK 200→DMG 160 |
| 방어력 vs 데미지 | 5개 | 공격력 고정, 버프 없음 | DEF 50→DMG 120, DEF 100→DMG 90 |
| 크리티컬 실측 | 100회 이상 | 동일 조건 반복 | 100회 중 크리 23회 (23%) |
| 버프/디버프 계수 | 3개 이상 | 단일 버프 적용 전후 | ATK+20% 버프: 100→120 확인 |
| 속성 상성 | 3쌍 이상 | 유리/불리/중립 | 불→풀: DMG×1.5, 불→물: DMG×0.5 |

### 공식 유형 판별

수집 데이터를 기반으로 3가지 주요 공식 유형 중 하나를 판별한다.

#### 유형 1: 감쇠형 (Diminishing Returns)

```
DMG = ATK × (ATK / (ATK + DEF × k))

특성:
- 방어력 증가 시 데미지 감소가 점점 완만해짐
- 방어력이 무한히 높아도 데미지가 0이 되지 않음
- k 계수가 방어력의 효율을 결정
```

**k값 역산 방법:**
```
DMG₁ = ATK × ATK / (ATK + DEF₁ × k)
DMG₂ = ATK × ATK / (ATK + DEF₂ × k)

두 식을 연립:
k = ATK × (DMG₂ × DEF₁ - DMG₁ × DEF₂) / (DMG₁ × DEF₂ × DMG₂ - DMG₂ × DEF₁ × DMG₁)

간소화 (ATK 고정):
k = ATK × (1/DMG₁ - 1/DMG₂) / (DEF₁/DMG₁ - DEF₂/DMG₂)
실제로는: ATK/DMG = 1 + DEF×k/ATK 형태로 변환 후 선형 회귀
```

#### 유형 2: 감산형 (Subtraction)

```
DMG = max(ATK - DEF × k, 1)  또는  DMG = max(ATK - DEF × k, ATK × min_ratio)

특성:
- 방어력이 충분히 높으면 데미지가 최소값(1 또는 비율)
- 방어력 관통/무시가 매우 중요
- 초반에 방어력 효율이 매우 높음
```

**k값 역산 방법:**
```
ATK - DEF₁ × k = DMG₁
ATK - DEF₂ × k = DMG₂

k = (DMG₂ - DMG₁) / (DEF₁ - DEF₂)
```

#### 유형 3: 비율형 (Percentage Reduction)

```
DMG = ATK × (1 - DEF / (DEF + c))

특성:
- 방어력에 의한 데미지 감소가 퍼센트로 표현됨
- c 상수가 방어력의 스케일링을 결정
- 많은 모던 RPG에서 사용
```

**c값 역산 방법:**
```
DMG/ATK = 1 - DEF/(DEF+c)
→ DEF/(DEF+c) = 1 - DMG/ATK
→ c = DEF × (DMG/ATK) / (1 - DMG/ATK)

복수 데이터 포인트로 c의 평균값 산출
```

### 공식 유형 판별 절차

```
1. (ATK 고정, DEF 변화) 데이터로 DEF vs DMG 그래프 생성
2. DMG 감소 패턴 확인:
   - 선형 감소 → 감산형 가능성 높음
   - 볼록 곡선 (감소 완화) → 감쇠형 또는 비율형
3. 최소 데미지 확인:
   - 최소 1 고정 → 감산형 확정
   - 최소가 ATK 비례 → 비율형 가능성
4. 각 유형별 계수 역산 후 잔차 비교
5. 잔차가 가장 작은 유형 채택
```

### 크리티컬 확률 분석

```bash
#!/bin/bash
# 크리티컬 확률 실측 vs 표시 비교
TOTAL=100
CRIT_COUNT=23
DISPLAYED_RATE=25  # 표시 확률 25%

ACTUAL_RATE=$(echo "scale=2; $CRIT_COUNT * 100 / $TOTAL" | bc)
DIFF=$(echo "scale=2; $ACTUAL_RATE - $DISPLAYED_RATE" | bc)

# 95% 신뢰구간 계산 (정규 근사)
p=$(echo "scale=4; $CRIT_COUNT / $TOTAL" | bc)
se=$(echo "scale=4; sqrt($p * (1 - $p) / $TOTAL)" | bc)
ci_low=$(echo "scale=2; ($p - 1.96 * $se) * 100" | bc)
ci_high=$(echo "scale=2; ($p + 1.96 * $se) * 100" | bc)

echo "실측 확률: ${ACTUAL_RATE}%"
echo "표시 확률: ${DISPLAYED_RATE}%"
echo "차이: ${DIFF}%p"
echo "95% 신뢰구간: [${ci_low}%, ${ci_high}%]"
echo "표시 확률이 신뢰구간 내: $([ $(echo "$ci_low <= $DISPLAYED_RATE && $DISPLAYED_RATE <= $ci_high" | bc) -eq 1 ] && echo 'YES' || echo 'NO')"
```

### 버프/디버프 계수 추출

```
1. 버프 없는 기본 데미지 측정: DMG_base
2. 단일 버프 적용 후 데미지 측정: DMG_buffed

가산(Additive) 판별:
  ATK_buffed = ATK_base + buff_value
  DMG_buffed / DMG_base ≈ ATK_buffed / ATK_base → 가산

승산(Multiplicative) 판별:
  DMG_buffed / DMG_base ≈ (1 + buff_rate) → 승산

복합(Mixed) 판별:
  가산도 승산도 정확히 맞지 않으면
  → 가산 + 승산 혼합 구조 의심
  → 추가 데이터 포인트로 분리
```

### Chart.js 설정

```javascript
// 전투 공식 검증 차트
{
  canvasId: 'combatFormulaChart',
  chartType: 'scatter',
  data: {
    datasets: [
      {
        label: '실측 데미지',
        data: [/* {x: atk_or_def, y: damage} */],
        backgroundColor: COLORS.blue,
        pointRadius: 5
      },
      {
        label: '역산 공식 예측',
        data: [/* {x: atk_or_def, y: predicted_damage} */],
        borderColor: COLORS.green,
        backgroundColor: 'transparent',
        showLine: true,
        pointRadius: 0,
        borderWidth: 2
      }
    ]
  },
  options: {
    ...COMMON_OPTIONS,
    scales: {
      x: { title: { display: true, text: '공격력 / 방어력' } },
      y: { title: { display: true, text: '데미지' } }
    }
  }
}

// 크리티컬 확률 비교 차트
{
  canvasId: 'critRateChart',
  chartType: 'bar',
  data: {
    labels: ['표시 확률', '실측 확률'],
    datasets: [{
      data: [/* displayed_rate, actual_rate */],
      backgroundColor: [COLORS.blue, COLORS.green],
      borderRadius: 4
    }]
  }
}

// 버프 계수 비교 차트
{
  canvasId: 'buffCoeffChart',
  chartType: 'bar',
  data: {
    labels: [/* 버프 이름들 */],
    datasets: [
      { label: '버프 없음', data: [/* base values */], backgroundColor: COLORS.blue },
      { label: '버프 적용', data: [/* buffed values */], backgroundColor: COLORS.green }
    ]
  }
}
```

### 산출물 형식

```markdown
## 전투 공식 역산 결과

### 데미지 공식
- 유형: {감쇠형/감산형/비율형}
- 공식: DMG = {역산 공식}
- 계수: k={값} (또는 c={값})
- 검증: 실측 vs 예측 평균 오차 {값}%

### 크리티컬 분석
- 표시 확률: {값}%
- 실측 확률: {값}% (N회 측정)
- 95% 신뢰구간: [{하한}%, {상한}%]
- 판정: 표시 확률과 {일치/불일치}

### 버프/디버프 구조
- 유형: {가산/승산/혼합}
- 버프A: +{값} ({가산/승산})
- 버프B: ×{값} ({가산/승산})

### 속성 상성
| 공격 속성 | 방어 속성 | 배율 |
|-----------|----------|------|
| 불 | 풀 | ×1.5 |
| 불 | 물 | ×0.5 |

### Chart.js 설정 블록
{위의 JSON 블록들}
```

---

## 3. 경제 순환 분석

### 목적

게임 내 재화의 유입(Source)과 유출(Sink) 흐름을 매핑하고, 유저 유형별 경제 경험을 분석한다.

### 데이터 수집 기준

| 데이터 유형 | 단위 | 수집 방법 | 예시 |
|------------|------|----------|------|
| 유입원 (일일) | 재화/일 | 일일 콘텐츠 보상 합산 | 일일퀘 500골드, 던전 1200골드 |
| 유입원 (주간) | 재화/주 | 주간 콘텐츠 보상 합산 | 주간보스 5000골드 |
| 유입원 (월간) | 재화/월 | 월간 보상 합산 | 출석 30일 15000골드 |
| 유출처 (일상) | 재화/일 | 일상 소모 합산 | 강화 3000골드, 상점 500골드 |
| 유출처 (목표) | 재화/건 | 목표별 총 비용 | 장비 풀강화 50000골드 |
| 과금 유입 | 재화/$1 | 캐시 환율 | $1 = 60젬 = 6000골드 |

### 유입원 매핑

```markdown
### 일일 유입원

| # | 콘텐츠 | 재화 A | 재화 B | 재화 C | 조건 |
|---|--------|--------|--------|--------|------|
| 1 | 일일 퀘스트 | 500 | 50 | - | 매일 리셋 |
| 2 | 던전 3회 | 1200 | - | 30 | 입장권 3장/일 |
| 3 | PvP 보상 | 300 | - | - | 5전 이상 |
| 4 | 일일 출석 | 200 | 20 | 10 | 접속만 |
| **합계** | | **2200** | **70** | **40** | |

### 주간 유입원
(동일 구조)

### 월간 유입원
(동일 구조)

### 일일 총 유입량 계산
일일 유입 = 일일 합계 + (주간 합계 / 7) + (월간 합계 / 30)
```

### 유출처 매핑

```markdown
### 일상 유출처

| # | 소모처 | 재화 A 소모 | 빈도 | 비고 |
|---|--------|-----------|------|------|
| 1 | 장비 강화 | 3000/회 | 1~2회/일 | 비용 단계별 증가 |
| 2 | 가챠 | 300/회 | 1회/일(무료) | 유료 시 추가 |
| 3 | 상점 구매 | 500 | 매일 | 한정 상품 |
| **일일 합계** | | **3800~6800** | | |

### 목표별 유출 (마일스톤)

| 목표 | 총 비용 | 소요 일수 (무과금) | 소요 일수 (과금) |
|------|--------|------------------|-----------------|
| 장비 +15 달성 | 50,000 | 약 23일 | 약 5일 |
| SSR 캐릭터 1체 | 27,000 | 약 12일 | 즉시 |
| 풀 세팅 완성 | 200,000 | 약 91일 | 약 20일 |
```

### 싱크/소스 비율 분석

```
싱크/소스 비율 = 일일 유출 총량 / 일일 유입 총량

해석 기준:
- 비율 < 0.8: 재화 축적 구간 (유저 여유 있음)
- 비율 0.8~1.2: 균형 구간 (선택적 소모)
- 비율 > 1.2: 재화 부족 구간 (과금 압박)
- 비율 > 2.0: 강한 과금 유도 구간
```

### 인플레이션 포인트 분석

```
인플레이션 포인트: 일일 유입 > 일일 유출이 되는 시점

계산:
1. 레벨/진행도별 유입량 변화 추적
2. 레벨/진행도별 유출량 변화 추적
3. 유입 > 유출 구간 식별
4. 해당 구간에서의 재화 축적률 계산

결과 해석:
- 인플레이션 구간이 짧으면: 새 콘텐츠로 유출처 추가 예상
- 인플레이션 구간이 길면: 설계 의도적 여유 기간
- 인플레이션 구간 없으면: 지속적 과금 압박 구조
```

### 무과금 vs 과금 비교

```markdown
### 유저 유형별 경제 경험

| 지표 | 무과금 | 소과금 (월 $10) | 과금 (월 $50) |
|------|--------|---------------|--------------|
| 일일 재화 유입 | 2,200 | 2,200 + 600 | 2,200 + 3,000 |
| 월간 총 유입 | 66,000 | 84,000 | 156,000 |
| 핵심 목표 달성 | 91일 | 68일 | 30일 |
| 가챠 시행 횟수/월 | 22회 | 28회 | 52회 |
| SSR 기대 획득/월 | 0.35체 | 0.45체 | 0.83체 |
```

### Chart.js 설정

```javascript
// 유입원별 일일 수급량 (Stacked Bar)
{
  canvasId: 'incomeSourceChart',
  chartType: 'bar',
  data: {
    labels: ['재화 A', '재화 B', '재화 C'],
    datasets: [
      { label: '일일퀘', data: [500, 50, 0], backgroundColor: COLORS.blue },
      { label: '던전', data: [1200, 0, 30], backgroundColor: COLORS.purple },
      { label: 'PvP', data: [300, 0, 0], backgroundColor: COLORS.green },
      { label: '출석', data: [200, 20, 10], backgroundColor: COLORS.orange }
    ]
  },
  options: {
    ...COMMON_OPTIONS,
    scales: { x: { stacked: true }, y: { stacked: true, title: { display: true, text: '일일 수급량' } } }
  }
}

// 유출처별 비율 (Doughnut)
{
  canvasId: 'expenseRatioChart',
  chartType: 'doughnut',
  data: {
    labels: ['강화', '가챠', '상점', '기타'],
    datasets: [{
      data: [3000, 300, 500, 200],
      backgroundColor: [COLORS.blue, COLORS.purple, COLORS.green, COLORS.orange]
    }]
  }
}

// 일별 순재화 변동 추이 (Line)
{
  canvasId: 'netCurrencyChart',
  chartType: 'line',
  data: {
    labels: ['1일', '7일', '14일', '21일', '28일', '30일'],
    datasets: [
      { label: '무과금', data: [/* 누적 순재화 */], borderColor: COLORS.blue },
      { label: '소과금', data: [/* 누적 순재화 */], borderColor: COLORS.green },
      { label: '과금', data: [/* 누적 순재화 */], borderColor: COLORS.orange }
    ]
  },
  options: {
    ...COMMON_OPTIONS,
    scales: {
      y: { title: { display: true, text: '누적 순재화' } }
    }
  }
}
```

### 산출물 형식

```markdown
## 경제 순환 분석 결과

### 유입/유출 요약
- 일일 총 유입: {값} (재화 A 기준)
- 일일 총 유출: {값}
- 싱크/소스 비율: {값} → {해석}

### 유입원 상세 (표)
### 유출처 상세 (표)

### 무과금 vs 과금 비교 (표)

### 인플레이션 분석
- 인플레이션 포인트: Lv{X} (약 {N}일차)
- 설계 의도: {추론}

### Chart.js 설정 블록
{위의 JSON 블록들}
```

---

## 4. 확률 시뮬레이션

### 목적

가챠, 강화, 드랍 등 확률 기반 시스템의 기대값과 비용 분포를 분석하여 유저 경험과 수익 구조를 파악한다.

### 데이터 수집 기준

| 데이터 유형 | 필수 여부 | 예시 |
|------------|----------|------|
| 등급별 확률 | 필수 | SSR 1.6%, SR 13%, R 85.4% |
| 1회 비용 | 필수 | 160젬 / 1회 |
| 천장 값 | 권장 | 소프트천장 74회, 하드천장 90회 |
| 소프트천장 확률 | 권장 | 74회부터 회당 +6%씩 증가 |
| 확정 시스템 | 권장 | 10연차 시 SR 이상 1개 확정 |
| 픽업 배율 | 권장 | 픽업 캐릭터 50% (SSR 중) |
| 중복 보상 | 선택 | 중복 시 전용 토큰 변환 |

### 기대값 계산

#### 기본 기대값 (천장 없음)

```
기하분포 기대값:
E(X) = 1 / p

예: SSR 확률 1.6%
E(X) = 1 / 0.016 = 62.5회

표준편차:
σ(X) = √((1-p) / p²) = √(0.984 / 0.000256) ≈ 62.0회

중앙값:
M(X) = ⌈-ln(2) / ln(1-p)⌉ = ⌈-0.693 / ln(0.984)⌉ ≈ 43회
```

#### 천장 반영 기대값

```
소프트천장 모델 (원신 예시):
- 기본 확률 p₀ = 0.006 (1~73회)
- 소프트천장: p_n = p₀ + 0.06 × (n - 73), n ≥ 74
- 하드천장: p₉₀ = 1.0 (90회)

기대값 계산:
E(X) = Σ(n=1~90) n × P(첫 성공이 n회째)
     = Σ(n=1~90) n × [∏(k=1~n-1)(1-p_k)] × p_n

Bash 구현으로 정확한 수치 계산
```

### 누적 확률 분포

```
천장 없는 경우:
F(x) = 1 - (1-p)^x
→ x회 이내에 최소 1번 성공할 확률

천장 있는 경우:
F(x) = 1 - ∏(k=1~x)(1-p_k), x < 천장
F(x) = 1, x ≥ 천장
```

### Bash 구현: 확률 시뮬레이션

```bash
#!/bin/bash
# 가챠 기대값 및 누적확률 계산 (소프트천장 반영)
# 원신 캐릭터 가챠 예시

BASE_RATE=0.006       # 기본 SSR 확률
SOFT_PITY_START=74    # 소프트천장 시작
SOFT_PITY_INC=0.06    # 소프트천장 확률 증가분
HARD_PITY=90          # 하드천장
COST_PER_PULL=160     # 1회 비용 (젬)

# 기대값 계산
expected=0
cum_survive=1  # 아직 성공하지 않을 확률

for ((n=1; n<=HARD_PITY; n++)); do
  if [ $n -lt $SOFT_PITY_START ]; then
    rate=$BASE_RATE
  elif [ $n -eq $HARD_PITY ]; then
    rate=1.0
  else
    increment=$(echo "scale=6; $SOFT_PITY_INC * ($n - $SOFT_PITY_START + 1)" | bc)
    rate=$(echo "scale=6; $BASE_RATE + $increment" | bc)
    # 확률 상한 1.0
    is_over=$(echo "$rate > 1.0" | bc)
    if [ "$is_over" -eq 1 ]; then rate=1.0; fi
  fi

  prob_here=$(echo "scale=8; $cum_survive * $rate" | bc)
  contribution=$(echo "scale=8; $n * $prob_here" | bc)
  expected=$(echo "scale=4; $expected + $contribution" | bc)
  cum_survive=$(echo "scale=8; $cum_survive * (1 - $rate)" | bc)
done

expected_cost=$(echo "scale=0; $expected * $COST_PER_PULL" | bc)

echo "=== 확률 시뮬레이션 결과 ==="
echo "기대 시행 횟수: ${expected}회"
echo "기대 비용: ${expected_cost}젬"
echo ""

# 주요 누적확률 포인트 출력
echo "=== 누적 확률 분포 ==="
cum_survive=1
for ((n=1; n<=HARD_PITY; n++)); do
  if [ $n -lt $SOFT_PITY_START ]; then
    rate=$BASE_RATE
  elif [ $n -eq $HARD_PITY ]; then
    rate=1.0
  else
    increment=$(echo "scale=6; $SOFT_PITY_INC * ($n - $SOFT_PITY_START + 1)" | bc)
    rate=$(echo "scale=6; $BASE_RATE + $increment" | bc)
    is_over=$(echo "$rate > 1.0" | bc)
    if [ "$is_over" -eq 1 ]; then rate=1.0; fi
  fi

  cum_survive=$(echo "scale=8; $cum_survive * (1 - $rate)" | bc)
  cum_success=$(echo "scale=4; 1 - $cum_survive" | bc)

  # 10회 간격으로 출력 + 천장 포인트
  if [ $((n % 10)) -eq 0 ] || [ $n -eq $SOFT_PITY_START ] || [ $n -eq $HARD_PITY ]; then
    cost=$(echo "scale=0; $n * $COST_PER_PULL" | bc)
    echo "${n}회 (${cost}젬): 누적 ${cum_success} ($(echo "scale=1; $cum_success * 100" | bc)%)"
  fi
done
```

### 비용 분석

```markdown
### 비용 분석 매트릭스

| 지표 | 값 | 계산 근거 |
|------|-----|----------|
| 기대 시행 횟수 | {E(X)}회 | 소프트천장 반영 기대값 |
| 기대 비용 (게임 재화) | {E(X)×1회비용} | 기대 시행 × 1회 비용 |
| 기대 비용 (현금) | ${E(X)×1회비용÷환율} | 재화 비용 ÷ 캐시 환율 |
| 50% 확률 시행 횟수 | {중앙값}회 | 누적확률 = 0.5 되는 시점 |
| 90% 확률 시행 횟수 | {90%포인트}회 | 누적확률 = 0.9 되는 시점 |
| 천장 비용 (게임 재화) | {천장×1회비용} | 천장 × 1회 비용 |
| 천장 비용 (현금) | ${천장×1회비용÷환율} | |
```

### 분포 시각화

```markdown
구간 분할:
- 1~10회: 행운 구간 (이른 성공)
- 11~기대값: 정상 구간
- 기대값~천장: 불운 구간
- 천장: 확정 구간
```

### Chart.js 설정

```javascript
// 시행 횟수별 성공 분포 (Histogram)
{
  canvasId: 'pullDistributionChart',
  chartType: 'bar',
  data: {
    labels: [/* '1-5', '6-10', '11-15', ... */],
    datasets: [{
      label: '구간별 성공 확률',
      data: [/* 각 구간의 확률 */],
      backgroundColor: function(context) {
        // 구간별 색상: 행운(초록), 정상(파랑), 불운(주황), 천장(빨강)
        const idx = context.dataIndex;
        const thresholds = [/* 구간 경계 인덱스 */];
        if (idx < thresholds[0]) return COLORS.green;
        if (idx < thresholds[1]) return COLORS.blue;
        if (idx < thresholds[2]) return COLORS.orange;
        return COLORS.pink;
      },
      borderRadius: 2
    }]
  },
  options: {
    ...COMMON_OPTIONS,
    scales: {
      x: { title: { display: true, text: '시행 횟수' } },
      y: { title: { display: true, text: '확률 (%)' } }
    }
  }
}

// 누적 확률 곡선 (Line)
{
  canvasId: 'cumulativeProbChart',
  chartType: 'line',
  data: {
    labels: [/* 1, 2, 3, ..., 천장 */],
    datasets: [
      {
        label: '누적 확률',
        data: [/* F(1), F(2), ..., F(천장) */],
        borderColor: COLORS.blue,
        backgroundColor: COLORS.blue + '20',
        fill: true,
        tension: 0.1
      }
    ]
  },
  options: {
    ...COMMON_OPTIONS,
    plugins: {
      ...COMMON_OPTIONS.plugins,
      annotation: {
        annotations: {
          expectedLine: {
            type: 'line',
            xMin: /* 기대값 */, xMax: /* 기대값 */,
            borderColor: COLORS.green,
            borderWidth: 2,
            borderDash: [5, 5],
            label: { content: '기대값', display: true, position: 'start' }
          },
          pityLine: {
            type: 'line',
            xMin: /* 천장 */, xMax: /* 천장 */,
            borderColor: COLORS.pink,
            borderWidth: 2,
            label: { content: '천장', display: true, position: 'start' }
          },
          medianLine: {
            type: 'line',
            xMin: /* 중앙값 */, xMax: /* 중앙값 */,
            borderColor: COLORS.orange,
            borderWidth: 2,
            borderDash: [3, 3],
            label: { content: '중앙값 (50%)', display: true, position: 'start' }
          }
        }
      }
    },
    scales: {
      x: { title: { display: true, text: '시행 횟수' } },
      y: { title: { display: true, text: '누적 확률 (%)' }, max: 100 }
    }
  }
}
```

### 산출물 형식

```markdown
## 확률 시뮬레이션 결과

### 기본 정보
- 대상: {가챠/강화/드랍} 시스템
- 기본 확률: {값}%
- 천장: {값}회 (소프트: {값}회)
- 1회 비용: {값} {재화명}

### 기대값 분석
- 기대 시행 횟수: {값}회
- 중앙값: {값}회
- 90% 포인트: {값}회
- 기대 비용: {값} {재화명} (약 ${현금})

### 비용 분포
| 확률 | 시행 횟수 | 재화 비용 | 현금 비용 |
|------|----------|----------|----------|
| 25% (행운) | {값}회 | {값} | ${값} |
| 50% (중앙) | {값}회 | {값} | ${값} |
| 75% (보통) | {값}회 | {값} | ${값} |
| 90% (불운) | {값}회 | {값} | ${값} |
| 100% (천장) | {값}회 | {값} | ${값} |

### Chart.js 설정 블록
{위의 JSON 블록들}
```

---

## 공통: Chart.js 색상 매핑

기존 HTML 템플릿의 CSS 변수를 Chart.js에서 일관되게 사용한다.

| CSS 변수 | 색상 코드 | Chart.js 용도 | 의미 |
|----------|----------|-------------|------|
| `--accent-blue` | `#1e3a5f` | 기본 데이터, 메인 라인 | 주요 데이터 |
| `--accent-purple` | `#4a3f6b` | 보조 데이터, 피팅 라인 | 부가 정보 |
| `--accent-green` | `#1a6b4a` | 성공, 긍정, 예측 일치 | 긍정적 결과 |
| `--accent-orange` | `#8b5e34` | 경고, 중간값, 소과금 | 주의 사항 |
| `--accent-pink` | `#9b2c3f` | 실패, 부정, 천장 | 부정적 결과 |
| `--accent-cyan` | `#1a5c6b` | 추가 데이터, 3번째 시리즈 | 보충 데이터 |

### 투명도 변형

```javascript
// 영역 채우기용 (20% 투명도)
COLORS.blue + '33'     // #1e3a5f33
COLORS.purple + '33'   // #4a3f6b33

// 호버 효과용 (80% 투명도)
COLORS.blue + 'CC'     // #1e3a5fCC
```

---

## 공통: 산출물 전달 형식

data-analyst → html-builder로 전달하는 최종 산출물은 다음 구조를 따른다.

```markdown
# 수치 분석 결과 ({게임명} - {시스템명})

## 분석 요약
- 수행 영역: {성장 곡선 / 전투 공식 / 경제 순환 / 확률 시뮬레이션}
- 데이터 등급: {A~E 범위}
- 분석 신뢰도: {높음/중간/낮음}

## 1. {분석 영역명}
### 분석 결과 요약
(위의 각 영역별 산출물 형식 참조)

### Chart.js 설정 블록
```json
{
  "charts": [
    { "canvasId": "...", "chartType": "...", "data": {...}, "options": {...} },
    { "canvasId": "...", "chartType": "...", "data": {...}, "options": {...} }
  ]
}
```

## 2. {다음 분석 영역명}
(반복)
```
