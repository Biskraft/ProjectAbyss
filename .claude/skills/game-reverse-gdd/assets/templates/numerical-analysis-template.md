# 수치 분석 결과 템플릿

> data-analyst 에이전트가 수치 분석 완료 후 작성하는 표준 산출물 형식.
> 해당되는 영역만 포함한다 (조건부 포함 규칙 참조).

---

## 조건부 포함 규칙

| 영역 | 포함 조건 | 관련 시스템 |
|------|----------|------------|
| 성장 곡선 분석 | 레벨/강화/경험치 시스템이 존재할 때 | 성장 시스템, 장비 강화 |
| 전투 공식 역산 | 전투/데미지 계산 시스템이 존재할 때 | 전투 시스템, 스킬 시스템 |
| 경제 순환 분석 | 재화/상점/거래 시스템이 존재할 때 | 경제 시스템, BM |
| 확률 시뮬레이션 | 가챠/확률/강화 확률 시스템이 존재할 때 | 가챠, 강화, 드롭 |

---

## 분석 메타데이터

| 항목 | 내용 |
|------|------|
| 게임명 | {게임명} |
| 시스템명 | {시스템명} |
| 분석 영역 | {포함된 영역 목록} |
| 데이터 소스 | {리서치 브리프 / 데이터 테이블} |
| 분석 도구 | Chart.js v4.4.0 |

---

## 영역 1: 성장 곡선 분석

> **포함 조건**: 레벨업, 강화, 경험치 테이블 등 성장 시스템이 존재할 때

### 데이터 포인트

| 레벨/단계 | 요구 수치 | 누적 수치 | 이전 대비 증가율 |
|----------|----------|----------|----------------|
| 1 | {값} | {값} | - |
| 2 | {값} | {값} | {%} |
| 3 | {값} | {값} | {%} |
| ... | ... | ... | ... |
| N | {값} | {값} | {%} |

### 커브 피팅 결과

- **최적 모델**: {선형/다항/지수/로그}
- **공식**: y = {공식}
- **R² 값**: {값}
- **해석**: {설명 -- 예: "지수 성장으로 후반 레벨링 난이도 급증"}
- **변곡점**: {레벨/단계} (성장 속도가 크게 변하는 지점)

### Chart.js 설정 블록

```html
<div class="chart-wrapper">
  <div class="chart-label">성장 곡선: 레벨별 요구 경험치</div>
  <canvas id="growth-curve-chart"></canvas>
</div>
<script>
new Chart(document.getElementById('growth-curve-chart'), {
  type: 'line',
  data: {
    labels: [/* 레벨 배열 */],
    datasets: [{
      label: '요구 수치',
      data: [/* 데이터 배열 */],
      borderColor: '#1e3a5f',
      backgroundColor: 'rgba(30, 58, 95, 0.1)',
      fill: true,
      tension: 0.4
    }, {
      label: '피팅 곡선',
      data: [/* 공식 기반 예측값 */],
      borderColor: '#9b2c3f',
      borderDash: [5, 5],
      fill: false,
      pointRadius: 0
    }]
  },
  options: {
    responsive: true,
    plugins: { legend: { position: 'top' } },
    scales: {
      x: { title: { display: true, text: '레벨' } },
      y: { title: { display: true, text: '요구 수치' } }
    }
  }
});
</script>
```

---

## 영역 2: 전투 공식 역산

> **포함 조건**: 전투 시스템에서 데미지 계산이 존재할 때

### 측정 데이터

| ATK | DEF | 실측 DMG | 공식 예측 DMG | 오차율 |
|-----|-----|---------|-------------|--------|
| {값} | {값} | {값} | {값} | {%} |
| {값} | {값} | {값} | {값} | {%} |

### 공식 추론

- **공식 유형**: {감쇠형/감산형/비율형/혼합형}
- **추정 공식**: DMG = {공식}
- **계수**: k = {값}, c = {값}
- **검증**: 오차율 평균 {값}%, 최대 {값}%

### 공식 유형별 참고

| 유형 | 일반 형태 | 대표 게임 |
|------|----------|----------|
| 감산형 | DMG = ATK - DEF | 메이플스토리 |
| 감쇠형 | DMG = ATK × (ATK / (ATK + k×DEF)) | 리그 오브 레전드 |
| 비율형 | DMG = ATK × (1 - DEF/(DEF + c)) | 원신 |
| 혼합형 | DMG = (ATK - DEF×k) × 배율 | 디아블로 |

### 크리티컬/버프 분석

- 크리티컬 확률: 표시 {값}% vs 실측 {값}%
- 크리티컬 배율: {값}배
- 버프 적용 방식: {가산/승산}
- 버프 계수: {값}
- 디버프 중첩: {가능/불가} (최대 {N}중첩)

### Chart.js 설정 블록

```html
<div class="chart-grid">
  <div class="chart-wrapper">
    <div class="chart-label">ATK vs DMG 상관관계</div>
    <canvas id="combat-atk-dmg-chart"></canvas>
  </div>
  <div class="chart-wrapper">
    <div class="chart-label">DEF 감쇠 곡선</div>
    <canvas id="combat-def-reduction-chart"></canvas>
  </div>
</div>
<script>
// ATK vs DMG 산점도
new Chart(document.getElementById('combat-atk-dmg-chart'), {
  type: 'scatter',
  data: {
    datasets: [{
      label: '실측 데이터',
      data: [/* {x: ATK, y: DMG} */],
      backgroundColor: '#1e3a5f'
    }, {
      label: '공식 예측',
      data: [/* {x: ATK, y: predicted DMG} */],
      backgroundColor: '#9b2c3f',
      pointStyle: 'triangle'
    }]
  },
  options: {
    responsive: true,
    scales: {
      x: { title: { display: true, text: 'ATK' } },
      y: { title: { display: true, text: 'DMG' } }
    }
  }
});
</script>
```

---

## 영역 3: 경제 순환 분석

> **포함 조건**: 재화 시스템, 상점, 거래소 등 경제 시스템이 존재할 때

### 유입원 매핑

| 유입원 | 일일 수급량 | 주간 수급량 | 비율 | 접근 조건 |
|--------|-----------|-----------|------|----------|
| {유입원} | {값} | {값} | {%} | {무과금/과금/조건} |
| {유입원} | {값} | {값} | {%} | {무과금/과금/조건} |

### 유출처 매핑

| 유출처 | 평균 소모량 | 비율 | 필수 여부 |
|--------|-----------|------|----------|
| {유출처} | {값} | {%} | {필수/선택} |
| {유출처} | {값} | {%} | {필수/선택} |

### 순환 분석

- **일일 순유입**: +{값} (유입 {값} - 유출 {값})
- **싱크/소스 비율**: {값} (1.0 이상이면 인플레이션 경향)
- **인플레이션 포인트**: 약 {일}일 후 (재화 축적이 소모를 초과하는 시점)
- **무과금 주요 목표 달성 소요 시간**: {값}일
- **과금 주요 목표 달성 소요 시간**: {값}일
- **과금 효율**: {값}배 (과금 대비 무과금 소요 시간 비율)

### Chart.js 설정 블록

```html
<div class="chart-grid">
  <div class="chart-wrapper">
    <div class="chart-label">재화 유입/유출 비율</div>
    <canvas id="economy-flow-chart"></canvas>
  </div>
  <div class="chart-wrapper">
    <div class="chart-label">누적 재화 추이 (무과금 vs 과금)</div>
    <canvas id="economy-accumulation-chart"></canvas>
  </div>
</div>
<script>
// 재화 유입/유출 비율 (Doughnut)
new Chart(document.getElementById('economy-flow-chart'), {
  type: 'doughnut',
  data: {
    labels: [/* 유입원/유출처 이름 */],
    datasets: [{
      data: [/* 비율 데이터 */],
      backgroundColor: ['#1e3a5f', '#4a3f6b', '#1a6b4a', '#8b5e34', '#9b2c3f', '#1a5c6b']
    }]
  },
  options: { responsive: true }
});

// 누적 재화 추이 (Line)
new Chart(document.getElementById('economy-accumulation-chart'), {
  type: 'line',
  data: {
    labels: [/* 일수 배열 */],
    datasets: [{
      label: '무과금',
      data: [/* 누적 재화 */],
      borderColor: '#1a6b4a'
    }, {
      label: '소과금',
      data: [/* 누적 재화 */],
      borderColor: '#8b5e34'
    }, {
      label: '고래',
      data: [/* 누적 재화 */],
      borderColor: '#9b2c3f'
    }]
  },
  options: {
    responsive: true,
    scales: {
      x: { title: { display: true, text: '경과일' } },
      y: { title: { display: true, text: '누적 재화' } }
    }
  }
});
</script>
```

---

## 영역 4: 확률 시뮬레이션

> **포함 조건**: 가챠, 확률 강화, 드롭률 등 확률 시스템이 존재할 때

### 확률 테이블

| 등급 | 표시 확률 | 천장 | 기대 시행 | 기대 비용 |
|------|----------|------|----------|----------|
| {등급} | {%} | {회} | {값}회 | {금액}원 |
| {등급} | {%} | {회} | {값}회 | {금액}원 |

### 시뮬레이션 결과

- **기대값 (천장 없이)**: {값}회
- **기대값 (천장 포함)**: {값}회
- **기대 비용**: {금액}원
- **50% 확률 도달 시행 수**: {값}회
- **90% 확률 도달 시행 수**: {값}회
- **99% 확률 도달 시행 수**: {값}회

### 비용 분석

| 단계 | 누적 시행 | 누적 비용 | 누적 확률 |
|------|----------|----------|----------|
| 10회 | 10 | {금액}원 | {%} |
| 20회 | 20 | {금액}원 | {%} |
| 50회 | 50 | {금액}원 | {%} |
| 천장 | {회} | {금액}원 | 100% |

### 확률 함정 분석

- **표시 확률 vs 실효 확률**: {차이 설명}
- **천장 이월 여부**: {이월/리셋}
- **확정 구간 (Pity 시스템)**: {설명}
- **50/50 메커니즘**: {설명, 해당 시}

### Chart.js 설정 블록

```html
<div class="chart-grid">
  <div class="chart-wrapper">
    <div class="chart-label">시행 횟수별 누적 확률</div>
    <canvas id="gacha-probability-chart"></canvas>
  </div>
  <div class="chart-wrapper">
    <div class="chart-label">시행 횟수별 누적 비용</div>
    <canvas id="gacha-cost-chart"></canvas>
  </div>
</div>
<script>
// 누적 확률 곡선
new Chart(document.getElementById('gacha-probability-chart'), {
  type: 'line',
  data: {
    labels: [/* 시행 횟수 배열 */],
    datasets: [{
      label: '누적 확률 (천장 포함)',
      data: [/* 확률 데이터 */],
      borderColor: '#1e3a5f',
      fill: true,
      backgroundColor: 'rgba(30, 58, 95, 0.1)'
    }, {
      label: '누적 확률 (천장 없이)',
      data: [/* 확률 데이터 */],
      borderColor: '#8492a6',
      borderDash: [5, 5],
      fill: false
    }]
  },
  options: {
    responsive: true,
    scales: {
      x: { title: { display: true, text: '시행 횟수' } },
      y: { title: { display: true, text: '누적 확률 (%)' }, max: 100 }
    }
  }
});

// 누적 비용 차트
new Chart(document.getElementById('gacha-cost-chart'), {
  type: 'bar',
  data: {
    labels: [/* 단계 배열 */],
    datasets: [{
      label: '누적 비용 (원)',
      data: [/* 비용 데이터 */],
      backgroundColor: '#9b2c3f'
    }]
  },
  options: {
    responsive: true,
    scales: {
      x: { title: { display: true, text: '시행 단계' } },
      y: { title: { display: true, text: '누적 비용 (원)' } }
    }
  }
});
</script>
```

---

## 분석 요약 & 인사이트

### 핵심 발견

- **핵심 발견 1**: {설명}
- **핵심 발견 2**: {설명}
- **핵심 발견 3**: {설명}

### 설계 의도 추론

- **수익화 관점**: {설명}
- **리텐션 관점**: {설명}
- **밸런싱 관점**: {설명}

### 분석 한계 & 추가 조사 필요 사항

- {한계점 1}
- {한계점 2}
- {추가 조사 필요 사항}
