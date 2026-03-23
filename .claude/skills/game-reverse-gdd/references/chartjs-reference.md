# Chart.js 차트 레퍼런스

> 역기획서 HTML 산출물에서 Chart.js 차트를 구현하기 위한 CDN 설정, 색상 테마, CSS 래퍼, 차트 타입별 코드 템플릿, Mermaid와의 공존 규칙을 정의한다.

---

## CDN 설정

### Chart.js 코어

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
```

### Chart.js 플러그인 (선택)

```html
<!-- 수직선/수평선 annotation (확률 시뮬레이션의 기대값/천장 표시에 사용) -->
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3.0.1/dist/chartjs-plugin-annotation.min.js"></script>
```

### Mermaid와의 공존

```html
<!-- Mermaid 먼저 로드 -->
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<script>mermaid.initialize({ startOnLoad: true, theme: 'neutral' });</script>

<!-- Chart.js 이후 로드 (충돌 없음) -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3.0.1/dist/chartjs-plugin-annotation.min.js"></script>
```

두 라이브러리는 서로 다른 DOM 요소를 사용하므로 충돌이 발생하지 않는다:
- Mermaid: `<div class="mermaid">` 내부 SVG 렌더링
- Chart.js: `<canvas id="...">` 내부 Canvas 렌더링

---

## 색상 테마

### CSS 변수 → JS 매핑

기존 HTML 템플릿의 CSS 변수를 Chart.js에서 사용한다.

```javascript
/**
 * CSS 변수에서 색상값을 가져오는 유틸리티 함수
 * @param {string} varName - CSS 변수명 (예: '--accent-blue')
 * @returns {string} 색상 코드 (예: '#1e3a5f')
 */
function getColor(varName) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

/**
 * Chart.js 전용 색상 팔레트
 * CSS 변수 기반으로 일관된 색상 테마를 유지
 */
const COLORS = {
  blue:   getColor('--accent-blue'),    // #1e3a5f - 기본/메인
  purple: getColor('--accent-purple'),  // #4a3f6b - 보조
  green:  getColor('--accent-green'),   // #1a6b4a - 성공/긍정
  orange: getColor('--accent-orange'),  // #8b5e34 - 경고/중간
  pink:   getColor('--accent-pink'),    // #9b2c3f - 실패/부정
  cyan:   getColor('--accent-cyan'),    // #1a5c6b - 추가 데이터
};
```

### 색상 용도 매핑

| 색상 | CSS 변수 | 코드 | 용도 | 사용 차트 |
|------|----------|------|------|----------|
| Blue | `--accent-blue` | `#1e3a5f` | 기본 데이터, 메인 라인, 1차 데이터셋 | 모든 차트의 기본 |
| Purple | `--accent-purple` | `#4a3f6b` | 보조 데이터, 피팅 라인, 2차 데이터셋 | 성장 곡선 피팅, 비교 |
| Green | `--accent-green` | `#1a6b4a` | 성공, 긍정, 예측 일치, 유입 | 전투 검증, 경제 유입 |
| Orange | `--accent-orange` | `#8b5e34` | 경고, 중간값, 소과금, 3차 데이터셋 | 경제 비교, 불운 구간 |
| Pink | `--accent-pink` | `#9b2c3f` | 실패, 부정, 천장, 유출 | 확률 천장, 경제 유출 |
| Cyan | `--accent-cyan` | `#1a5c6b` | 추가 데이터, 4차 이상 데이터셋 | 다차원 비교 |

### 투명도 변형

```javascript
/**
 * 색상에 투명도를 적용하는 유틸리티 함수
 * @param {string} hex - HEX 색상 코드 (예: '#1e3a5f')
 * @param {number} alpha - 투명도 0~1 (예: 0.2)
 * @returns {string} rgba 형식 색상
 */
function withAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// 사용 예시
withAlpha(COLORS.blue, 0.2)   // 영역 채우기용
withAlpha(COLORS.blue, 0.8)   // 호버 효과용
withAlpha(COLORS.blue, 0.1)   // 배경 그리드용
```

### 데이터셋 순서별 색상 자동 할당

```javascript
const COLOR_SEQUENCE = [
  COLORS.blue,    // 1번째 데이터셋
  COLORS.purple,  // 2번째
  COLORS.green,   // 3번째
  COLORS.orange,  // 4번째
  COLORS.pink,    // 5번째
  COLORS.cyan,    // 6번째
];

function getDatasetColor(index) {
  return COLOR_SEQUENCE[index % COLOR_SEQUENCE.length];
}
```

---

## 래퍼 HTML 구조

### 기본 래퍼

```html
<div class="chart-wrapper">
  <div class="chart-label">차트 제목</div>
  <canvas id="chartId"></canvas>
</div>
```

### 설명 포함 래퍼

```html
<div class="chart-wrapper">
  <div class="chart-label">차트 제목</div>
  <div class="chart-description">차트에 대한 간략한 설명 텍스트</div>
  <canvas id="chartId"></canvas>
  <div class="chart-footnote">* 데이터 출처 또는 주석</div>
</div>
```

### 나란히 배치 (2열)

```html
<div class="chart-grid">
  <div class="chart-wrapper">
    <div class="chart-label">좌측 차트</div>
    <canvas id="chartLeft"></canvas>
  </div>
  <div class="chart-wrapper">
    <div class="chart-label">우측 차트</div>
    <canvas id="chartRight"></canvas>
  </div>
</div>
```

---

## CSS

```css
/* ============================================================
   Chart.js 래퍼 스타일
   기존 HTML 템플릿의 CSS 변수를 활용
   ============================================================ */

.chart-wrapper {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 24px;
  margin: 18px 0;
  position: relative;
}

.chart-wrapper::before {
  content: 'CHART';
  position: absolute;
  top: 8px;
  right: 12px;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 1.5px;
  color: var(--text-muted);
  opacity: 0.5;
}

.chart-label {
  font-family: var(--font-serif);
  font-size: 14px;
  font-weight: 600;
  color: var(--accent-blue);
  margin-bottom: 12px;
}

.chart-description {
  font-family: var(--font-sans);
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 16px;
  line-height: 1.5;
}

.chart-footnote {
  font-family: var(--font-sans);
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 12px;
  font-style: italic;
}

/* 2열 그리드 레이아웃 */
.chart-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin: 18px 0;
}

@media (max-width: 768px) {
  .chart-grid {
    grid-template-columns: 1fr;
  }
}

/* Canvas 크기 제어 */
.chart-wrapper canvas {
  max-height: 400px;
  width: 100% !important;
}
```

---

## 공통 옵션 (COMMON_OPTIONS)

모든 차트에 적용하는 기본 옵션이다.

```javascript
const COMMON_OPTIONS = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        font: {
          family: 'Pretendard Variable, sans-serif',
          size: 11
        },
        color: '#4a5568',
        padding: 16,
        usePointStyle: true,
        pointStyleWidth: 8
      }
    },
    tooltip: {
      backgroundColor: '#1a1f36',
      titleFont: {
        family: 'Pretendard Variable',
        size: 12,
        weight: '600'
      },
      bodyFont: {
        family: 'IBM Plex Mono',
        size: 11
      },
      cornerRadius: 4,
      padding: 10,
      displayColors: true,
      boxPadding: 4
    }
  },
  scales: {
    x: {
      ticks: {
        font: { family: 'Pretendard Variable', size: 11 },
        color: '#4a5568'
      },
      grid: {
        color: 'rgba(0,0,0,0.04)',
        drawBorder: false
      }
    },
    y: {
      ticks: {
        font: { family: 'Pretendard Variable', size: 11 },
        color: '#4a5568'
      },
      grid: {
        color: 'rgba(0,0,0,0.06)',
        drawBorder: false
      }
    }
  },
  animation: {
    duration: 800,
    easing: 'easeOutQuart'
  }
};
```

### 옵션 오버라이드 헬퍼

```javascript
/**
 * COMMON_OPTIONS에 차트별 커스텀 옵션을 병합
 * @param {Object} custom - 커스텀 옵션
 * @returns {Object} 병합된 옵션
 */
function mergeOptions(custom) {
  return {
    ...COMMON_OPTIONS,
    ...custom,
    plugins: {
      ...COMMON_OPTIONS.plugins,
      ...(custom.plugins || {})
    },
    scales: {
      ...COMMON_OPTIONS.scales,
      ...(custom.scales || {})
    }
  };
}
```

---

## 차트 타입별 코드 템플릿

### 1. Line Chart (성장 곡선, 시간 추이)

```javascript
// === Line Chart: 성장 곡선 ===
new Chart(document.getElementById('growthLineChart'), {
  type: 'line',
  data: {
    labels: ['Lv1', 'Lv10', 'Lv20', 'Lv30', 'Lv40', 'Lv50'],
    datasets: [
      {
        label: '경험치 요구량',
        data: [100, 1500, 5000, 12000, 28000, 65000],
        borderColor: COLORS.blue,
        backgroundColor: withAlpha(COLORS.blue, 0.1),
        fill: true,
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      },
      {
        label: '피팅 곡선',
        data: [/* 피팅 결과 값 */],
        borderColor: COLORS.purple,
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 0,
        fill: false
      }
    ]
  },
  options: mergeOptions({
    scales: {
      x: { title: { display: true, text: '레벨' } },
      y: { title: { display: true, text: '요구 경험치' } }
    }
  })
});
```

#### Line Chart 변형: Step Line (계단식)

```javascript
// 계단식 성장 (돌파/각성 등 불연속 성장)
{
  // ... 기본 설정 동일
  datasets: [{
    label: '스탯 성장',
    data: [/* 값 */],
    stepped: 'before',  // 'before', 'after', 'middle'
    borderColor: COLORS.blue,
    fill: false
  }]
}
```

### 2. Bar Chart (비교, 분포)

#### 기본 Bar

```javascript
// === Bar Chart: 재화 비교 ===
new Chart(document.getElementById('currencyBarChart'), {
  type: 'bar',
  data: {
    labels: ['일일퀘', '던전', 'PvP', '출석', '이벤트'],
    datasets: [{
      label: '일일 골드 수급량',
      data: [500, 1200, 300, 200, 150],
      backgroundColor: [
        COLORS.blue,
        COLORS.purple,
        COLORS.green,
        COLORS.orange,
        COLORS.cyan
      ],
      borderRadius: 4,
      borderSkipped: false
    }]
  },
  options: mergeOptions({
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: { title: { display: true, text: '골드' }, beginAtZero: true }
    }
  })
});
```

#### Stacked Bar

```javascript
// === Stacked Bar: 유입원별 일일 수급 ===
new Chart(document.getElementById('stackedIncomeChart'), {
  type: 'bar',
  data: {
    labels: ['골드', '젬', '스태미나'],
    datasets: [
      { label: '일일퀘', data: [500, 50, 10], backgroundColor: COLORS.blue },
      { label: '던전', data: [1200, 0, 0], backgroundColor: COLORS.purple },
      { label: 'PvP', data: [300, 0, 0], backgroundColor: COLORS.green },
      { label: '출석', data: [200, 20, 5], backgroundColor: COLORS.orange }
    ]
  },
  options: mergeOptions({
    scales: {
      x: { stacked: true },
      y: { stacked: true, title: { display: true, text: '일일 수급량' }, beginAtZero: true }
    }
  })
});
```

#### Grouped Bar

```javascript
// === Grouped Bar: 무과금 vs 과금 비교 ===
new Chart(document.getElementById('groupedCompareChart'), {
  type: 'bar',
  data: {
    labels: ['1주차', '2주차', '3주차', '4주차'],
    datasets: [
      {
        label: '무과금',
        data: [15400, 30800, 46200, 61600],
        backgroundColor: COLORS.blue,
        borderRadius: 4
      },
      {
        label: '소과금 ($10/월)',
        data: [19600, 39200, 58800, 78400],
        backgroundColor: COLORS.green,
        borderRadius: 4
      },
      {
        label: '과금 ($50/월)',
        data: [36400, 72800, 109200, 145600],
        backgroundColor: COLORS.orange,
        borderRadius: 4
      }
    ]
  },
  options: mergeOptions({
    scales: {
      y: { title: { display: true, text: '누적 재화' }, beginAtZero: true }
    }
  })
});
```

### 3. Scatter Chart (실측 데이터, 공식 검증)

```javascript
// === Scatter Chart: 공격력 vs 데미지 ===
new Chart(document.getElementById('combatScatterChart'), {
  type: 'scatter',
  data: {
    datasets: [
      {
        label: '실측 데이터',
        data: [
          { x: 100, y: 80 },
          { x: 200, y: 165 },
          { x: 300, y: 248 },
          { x: 500, y: 420 },
          { x: 800, y: 670 }
        ],
        backgroundColor: COLORS.blue,
        pointRadius: 6,
        pointHoverRadius: 8
      },
      {
        label: '역산 공식 예측',
        data: [/* 공식으로 계산한 값 */],
        borderColor: COLORS.green,
        backgroundColor: 'transparent',
        showLine: true,
        pointRadius: 0,
        borderWidth: 2,
        tension: 0.1
      }
    ]
  },
  options: mergeOptions({
    scales: {
      x: { title: { display: true, text: '공격력 (ATK)' } },
      y: { title: { display: true, text: '데미지 (DMG)' } }
    }
  })
});
```

#### Scatter + 추세선 오버레이

```javascript
// 추세선을 Scatter 위에 오버레이하는 방법
{
  type: 'scatter',
  data: {
    datasets: [
      {
        // 실측 데이터 (점)
        label: '실측',
        data: [/* {x, y} 배열 */],
        backgroundColor: COLORS.blue,
        pointRadius: 5,
        showLine: false
      },
      {
        // 추세선 (선)
        label: '추세선 (y = ax² + bx + c)',
        data: [/* 연속적인 {x, y} 배열 - x를 촘촘하게 */],
        borderColor: COLORS.purple,
        backgroundColor: 'transparent',
        showLine: true,
        pointRadius: 0,
        borderWidth: 2,
        tension: 0
      }
    ]
  }
}
```

### 4. Radar Chart (다차원 비교)

```javascript
// === Radar Chart: 유닛/장비 다차원 비교 ===
new Chart(document.getElementById('unitRadarChart'), {
  type: 'radar',
  data: {
    labels: ['공격력', '방어력', 'HP', '속도', '크리율', '유틸'],
    datasets: [
      {
        label: '유닛 A',
        data: [85, 60, 75, 90, 70, 50],
        borderColor: COLORS.blue,
        backgroundColor: withAlpha(COLORS.blue, 0.2),
        borderWidth: 2,
        pointRadius: 3
      },
      {
        label: '유닛 B',
        data: [60, 85, 90, 50, 40, 80],
        borderColor: COLORS.purple,
        backgroundColor: withAlpha(COLORS.purple, 0.2),
        borderWidth: 2,
        pointRadius: 3
      }
    ]
  },
  options: {
    responsive: true,
    plugins: {
      legend: COMMON_OPTIONS.plugins.legend,
      tooltip: COMMON_OPTIONS.plugins.tooltip
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20,
          font: { family: 'Pretendard Variable', size: 10 },
          color: '#4a5568',
          backdropColor: 'transparent'
        },
        grid: { color: 'rgba(0,0,0,0.06)' },
        pointLabels: {
          font: { family: 'Pretendard Variable', size: 12 },
          color: '#4a5568'
        }
      }
    }
  }
});
```

### 5. Doughnut Chart (비율 분포)

```javascript
// === Doughnut Chart: 재화 유출처 비율 ===
new Chart(document.getElementById('expenseDoughnutChart'), {
  type: 'doughnut',
  data: {
    labels: ['강화', '가챠', '상점', '수리', '기타'],
    datasets: [{
      data: [40, 25, 15, 12, 8],
      backgroundColor: [
        COLORS.blue,
        COLORS.purple,
        COLORS.green,
        COLORS.orange,
        COLORS.cyan
      ],
      borderWidth: 2,
      borderColor: 'var(--bg-card)',
      hoverOffset: 6
    }]
  },
  options: {
    responsive: true,
    cutout: '55%',
    plugins: {
      legend: {
        ...COMMON_OPTIONS.plugins.legend,
        position: 'right'
      },
      tooltip: {
        ...COMMON_OPTIONS.plugins.tooltip,
        callbacks: {
          label: function(context) {
            return context.label + ': ' + context.parsed + '%';
          }
        }
      }
    }
  }
});
```

### 6. Mixed Chart (Line + Scatter, Stacked Bar + Line)

#### Line + Scatter (피팅 곡선 + 실측)

```javascript
// === Mixed: 피팅 곡선(Line) + 실측 데이터(Scatter) ===
new Chart(document.getElementById('fittingMixedChart'), {
  type: 'scatter',
  data: {
    datasets: [
      {
        type: 'scatter',
        label: '실측 데이터',
        data: [/* {x, y} */],
        backgroundColor: COLORS.blue,
        pointRadius: 5,
        order: 1
      },
      {
        type: 'line',
        label: '선형 피팅 (y = 850x - 300)',
        data: [/* {x, y} */],
        borderColor: COLORS.green,
        pointRadius: 0,
        borderWidth: 2,
        order: 2
      },
      {
        type: 'line',
        label: '지수 피팅 (y = 50 × 1.08^x)',
        data: [/* {x, y} */],
        borderColor: COLORS.purple,
        borderDash: [5, 5],
        pointRadius: 0,
        borderWidth: 2,
        order: 3
      }
    ]
  },
  options: mergeOptions({
    scales: {
      x: { title: { display: true, text: '레벨' } },
      y: { title: { display: true, text: '경험치' } }
    }
  })
});
```

#### Stacked Bar + Line (경제 흐름)

```javascript
// === Mixed: Stacked Bar(유입) + Line(순변동) ===
new Chart(document.getElementById('economyMixedChart'), {
  type: 'bar',
  data: {
    labels: ['1일', '7일', '14일', '21일', '28일'],
    datasets: [
      {
        type: 'bar',
        label: '일일퀘 유입',
        data: [500, 3500, 7000, 10500, 14000],
        backgroundColor: COLORS.blue,
        stack: 'income',
        order: 2
      },
      {
        type: 'bar',
        label: '던전 유입',
        data: [1200, 8400, 16800, 25200, 33600],
        backgroundColor: COLORS.purple,
        stack: 'income',
        order: 2
      },
      {
        type: 'line',
        label: '누적 순재화',
        data: [700, 4900, 8400, 10500, 11200],
        borderColor: COLORS.green,
        backgroundColor: 'transparent',
        borderWidth: 3,
        pointRadius: 4,
        tension: 0.2,
        yAxisID: 'y1',
        order: 1
      }
    ]
  },
  options: mergeOptions({
    scales: {
      x: { stacked: true },
      y: { stacked: true, title: { display: true, text: '누적 유입' }, beginAtZero: true },
      y1: {
        position: 'right',
        title: { display: true, text: '순재화' },
        grid: { drawOnChartArea: false },
        ticks: { font: { family: 'Pretendard Variable', size: 11 }, color: COLORS.green }
      }
    }
  })
});
```

---

## Chart.js vs Mermaid 사용 기준

어떤 시각화를 Chart.js로, 어떤 것을 Mermaid로 구현할지의 판단 기준이다.

### 판단 매트릭스

| 시각화 대상 | Chart.js | Mermaid | 판단 근거 |
|------------|----------|---------|----------|
| 수치 데이터 (축 기반) | Line, Bar, Scatter | - | 수치는 항상 Chart.js |
| 성장 곡선 / 추세선 | Line + Scatter | - | 연속 데이터 시각화 |
| 확률 분포 | Bar (히스토그램) + Line (누적) | - | 통계 분포 시각화 |
| 경제 유입/유출 | Stacked Bar + Doughnut | - | 수치 비율 시각화 |
| 다차원 비교 | Radar | quadrantChart | Chart.js가 더 유연 |
| 시스템 구조/관계 | - | graph LR | 노드+엣지 관계 |
| 유저 행동 흐름 | - | flowchart TD | 분기 + 조건 흐름 |
| 상태 전이 | - | stateDiagram-v2 | 상태 기계 |
| 데이터 관계 | - | erDiagram | 엔티티-관계 |
| 개념 범위 시각화 | - | mindmap | 계층 구조 |
| 시간 순서 인터랙션 | - | sequenceDiagram | 메시지 교환 |
| 비율 분포 (단순) | Doughnut | pie | 상호 대체 가능 |
| 막대 비교 (단순) | Bar | xychart-beta | 상호 대체 가능 |

### 결정 규칙

```
1. 정량적 수치 데이터가 있는가?
   → YES: Chart.js (Line, Bar, Scatter, Radar, Doughnut)
   → NO: 다음 질문

2. 구조/관계/흐름을 표현하는가?
   → YES: Mermaid (graph, flowchart, stateDiagram, erDiagram)
   → NO: 다음 질문

3. 개념/범위를 표현하는가?
   → YES: Mermaid (mindmap)
   → NO: 텍스트 또는 표로 대체

4. 양쪽 모두 가능한가? (pie vs doughnut 등)
   → 수치가 5개 이상: Chart.js (인터랙티브)
   → 수치가 4개 이하: Mermaid (간결)
```

---

## Chart.js 초기화 JS 템플릿

HTML 파일 내에서 Chart.js를 초기화하는 전체 구조이다.

```html
<!-- HTML body 맨 아래, </body> 직전 -->
<script>
document.addEventListener('DOMContentLoaded', function() {
  // ============================================================
  // CSS 변수 → JS 색상 매핑
  // ============================================================
  function getColor(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  }
  function withAlpha(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const COLORS = {
    blue:   getColor('--accent-blue')   || '#1e3a5f',
    purple: getColor('--accent-purple') || '#4a3f6b',
    green:  getColor('--accent-green')  || '#1a6b4a',
    orange: getColor('--accent-orange') || '#8b5e34',
    pink:   getColor('--accent-pink')   || '#9b2c3f',
    cyan:   getColor('--accent-cyan')   || '#1a5c6b',
  };

  // ============================================================
  // 공통 옵션
  // ============================================================
  const COMMON_OPTIONS = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: { family: 'Pretendard Variable, sans-serif', size: 11 },
          color: '#4a5568',
          padding: 16,
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: '#1a1f36',
        titleFont: { family: 'Pretendard Variable', size: 12, weight: '600' },
        bodyFont: { family: 'IBM Plex Mono', size: 11 },
        cornerRadius: 4,
        padding: 10
      }
    },
    scales: {
      x: {
        ticks: { font: { family: 'Pretendard Variable', size: 11 }, color: '#4a5568' },
        grid: { color: 'rgba(0,0,0,0.04)' }
      },
      y: {
        ticks: { font: { family: 'Pretendard Variable', size: 11 }, color: '#4a5568' },
        grid: { color: 'rgba(0,0,0,0.06)' }
      }
    }
  };

  function mergeOptions(custom) {
    return {
      ...COMMON_OPTIONS,
      ...custom,
      plugins: { ...COMMON_OPTIONS.plugins, ...(custom.plugins || {}) },
      scales: { ...COMMON_OPTIONS.scales, ...(custom.scales || {}) }
    };
  }

  // ============================================================
  // 차트 1: (여기에 차트 초기화 코드)
  // ============================================================
  // new Chart(document.getElementById('chart1Id'), { ... });

  // ============================================================
  // 차트 2: (여기에 차트 초기화 코드)
  // ============================================================
  // new Chart(document.getElementById('chart2Id'), { ... });

  // ... 추가 차트들

});
</script>
```

### 중요 주의사항

1. **DOMContentLoaded 내부에서 초기화**: 모든 Canvas 요소가 로드된 후 차트 생성
2. **Mermaid 이후 실행**: Mermaid가 SVG로 변환된 후 Chart.js 실행 (DOM 순서로 자동 보장)
3. **CSS 변수 폴백**: `getColor()` 실패 시 하드코딩된 기본값 사용
4. **Canvas ID 고유성**: 각 차트의 canvas ID는 반드시 고유해야 함
5. **반응형**: `responsive: true` 유지, 부모 컨테이너 크기에 맞춤
6. **메모리**: 동일 canvas에 새 차트 생성 시 기존 차트를 먼저 `.destroy()` 호출

### Canvas ID 네이밍 컨벤션

```
{분석영역}-{차트유형}-chart

예시:
growth-line-chart          (성장 곡선 - 라인)
growth-scatter-chart       (성장 곡선 - 실측 데이터)
combat-scatter-chart       (전투 공식 - 공격력 vs 데미지)
combat-crit-bar-chart      (전투 공식 - 크리티컬 비교)
economy-income-bar-chart   (경제 - 유입원)
economy-expense-doughnut   (경제 - 유출처)
economy-net-line-chart     (경제 - 순재화 추이)
prob-dist-bar-chart        (확률 - 분포 히스토그램)
prob-cumul-line-chart      (확률 - 누적 확률)
genre-{장르}-{유형}-chart  (장르별 전용 차트)
```
