# 장르별 추가 섹션 HTML 블록

> html-builder가 장르에 따라 HTML에 삽입하는 추가 섹션 블록.
> 각 장르별 1-2개 추가 섹션과 전용 Chart.js 차트를 포함한다.

---

## 사용 방법

1. genre-customization.md에서 감지된 장르 확인
2. 해당 장르의 HTML 블록을 비교 분석 섹션(sec7) 뒤에 삽입
3. Chart.js canvas ID는 `genre-{장르코드}-{차트번호}` 형식
4. 다중 장르 시 모든 해당 블록 삽입
5. 섹션 넘버링은 08부터 시작, `num-genre` 클래스 사용

---

## 장르 코드 매핑

| 장르 | 코드 | 시작 섹션 번호 |
|------|------|--------------|
| RPG | rpg | 08 |
| 가챠/수집형 | gacha | 08 |
| 전략 | strategy | 08 |
| 액션/격투 | action | 08 |
| 라이브서비스 | live | 08 |
| 경제중심 | economy | 08 |
| MOBA/경쟁 | moba | 08 |
| 방치형 | idle | 08 |
| 시뮬레이션 | sim | 08 |
| 배틀로얄 | br | 08 |

---

## RPG

### 추가 섹션: 성장 밸런스 분석

```html
<section id="sec8">
  <h2><span class="section-num num-genre">08</span> 성장 밸런스 분석</h2>

  <div class="card">
    <div class="card-label label-info">RPG 성장 곡선</div>
    <p>레벨별 경험치 요구량, 스탯 성장률, 장비 강화 곡선 등 RPG 핵심 성장 메트릭을 분석한다.</p>
  </div>

  <div class="chart-grid">
    <div class="chart-wrapper">
      <div class="chart-label">경험치 성장 곡선</div>
      <canvas id="genre-rpg-growth"></canvas>
    </div>
    <div class="chart-wrapper">
      <div class="chart-label">스탯 분배 밸런스</div>
      <canvas id="genre-rpg-stats"></canvas>
    </div>
  </div>

  <div class="analysis-card">
    <div class="analysis-label">성장 곡선 유형</div>
    <div class="analysis-value">{선형/다항/지수/S곡선}</div>
    <div class="analysis-desc">레벨 {N} 구간에서 변곡점 발생, 후반 성장 둔화율 {값}%</div>
  </div>

  <script>
  // Line: 경험치 곡선 + Scatter: 실측 포인트
  new Chart(document.getElementById('genre-rpg-growth'), {
    type: 'line',
    data: {
      labels: [/* 레벨 */],
      datasets: [{
        label: '요구 경험치',
        data: [/* 값 */],
        borderColor: '#1e3a5f',
        fill: true,
        backgroundColor: 'rgba(30,58,95,0.08)',
        tension: 0.4
      }, {
        type: 'scatter',
        label: '실측 포인트',
        data: [/* {x,y} */],
        backgroundColor: '#9b2c3f',
        pointRadius: 5
      }]
    },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
  </script>
</section>
```

---

## 가챠/수집형

### 추가 섹션: 천장 시뮬레이션

```html
<section id="sec8">
  <h2><span class="section-num num-genre">08</span> 천장 시뮬레이션</h2>

  <div class="card">
    <div class="card-label label-info">가챠 확률 분석</div>
    <p>가챠 확률 분포, 천장 시스템, 기대 비용을 시뮬레이션하여 수익화 설계를 분석한다.</p>
  </div>

  <div class="chart-grid">
    <div class="chart-wrapper">
      <div class="chart-label">시행 횟수별 확률 분포</div>
      <canvas id="genre-gacha-probability"></canvas>
    </div>
    <div class="chart-wrapper">
      <div class="chart-label">누적 비용 곡선</div>
      <canvas id="genre-gacha-cost"></canvas>
    </div>
  </div>

  <div class="analysis-card">
    <div class="analysis-label">기대 비용</div>
    <div class="analysis-value">{금액}원</div>
    <div class="analysis-desc">천장 {N}회, 50% 확률 달성 {M}회, 평균 기대값 {K}회</div>
  </div>

  <script>
  // Bar: 확률 히스토그램
  new Chart(document.getElementById('genre-gacha-probability'), {
    type: 'bar',
    data: {
      labels: [/* 시행 구간 */],
      datasets: [{
        label: '획득 확률 분포',
        data: [/* 확률 */],
        backgroundColor: 'rgba(30,58,95,0.6)'
      }]
    },
    options: { responsive: true }
  });
  // Line: 누적 확률
  new Chart(document.getElementById('genre-gacha-cost'), {
    type: 'line',
    data: {
      labels: [/* 시행 횟수 */],
      datasets: [{
        label: '누적 비용',
        data: [/* 비용 */],
        borderColor: '#9b2c3f',
        fill: true,
        backgroundColor: 'rgba(155,44,63,0.08)'
      }]
    },
    options: { responsive: true }
  });
  </script>
</section>
```

### 추가 섹션: 유닛 밸런스

```html
<section id="sec9">
  <h2><span class="section-num num-genre">09</span> 유닛 밸런스</h2>

  <div class="card">
    <div class="card-label label-info">수집 유닛 비교</div>
    <p>수집 가능한 유닛/캐릭터의 스탯 분포와 밸런스를 레이더 차트로 비교 분석한다.</p>
  </div>

  <div class="chart-wrapper">
    <div class="chart-label">유닛 스탯 비교</div>
    <canvas id="genre-gacha-balance"></canvas>
  </div>

  <script>
  // Radar: 유닛 스탯 비교
  new Chart(document.getElementById('genre-gacha-balance'), {
    type: 'radar',
    data: {
      labels: ['공격력', '방어력', 'HP', '속도', '스킬 위력', '유틸리티'],
      datasets: [{
        label: '{유닛A}',
        data: [/* 스탯 */],
        borderColor: '#1e3a5f',
        backgroundColor: 'rgba(30,58,95,0.1)'
      }, {
        label: '{유닛B}',
        data: [/* 스탯 */],
        borderColor: '#9b2c3f',
        backgroundColor: 'rgba(155,44,63,0.1)'
      }]
    },
    options: { responsive: true, scales: { r: { beginAtZero: true } } }
  });
  </script>
</section>
```

---

## 전략

### 추가 섹션: 전략 깊이 분석

```html
<section id="sec8">
  <h2><span class="section-num num-genre">08</span> 전략 깊이 분석</h2>

  <div class="card">
    <div class="card-label label-info">의사결정 트리</div>
    <p>전략 게임의 핵심 의사결정 포인트, 최적 전략 경로, 메타게임 분석을 수행한다.</p>
  </div>

  <div class="chart-wrapper">
    <div class="chart-label">전략 선택지별 승률</div>
    <canvas id="genre-strategy-winrate"></canvas>
  </div>

  <div class="mermaid-wrapper">
    <div class="mermaid">
    graph TD
      START[게임 시작] --> EARLY{초반 전략 선택}
      EARLY -->|러시| RUSH[빠른 공격]
      EARLY -->|매크로| MACRO[자원 확보]
      EARLY -->|방어| DEFENSE[터틀링]
      RUSH --> MID{중반 판단}
      MACRO --> MID
      DEFENSE --> MID
    </div>
  </div>

  <div class="analysis-card">
    <div class="analysis-label">메타 다양성 지수</div>
    <div class="analysis-value">{값}/10</div>
    <div class="analysis-desc">상위 전략 {N}개가 전체 승률의 {M}%를 점유</div>
  </div>

  <script>
  new Chart(document.getElementById('genre-strategy-winrate'), {
    type: 'bar',
    data: {
      labels: [/* 전략명 */],
      datasets: [{
        label: '승률 (%)',
        data: [/* 승률 */],
        backgroundColor: ['#1e3a5f', '#4a3f6b', '#1a6b4a', '#8b5e34', '#9b2c3f']
      }]
    },
    options: { responsive: true, indexAxis: 'y' }
  });
  </script>
</section>
```

---

## 액션/격투

### 추가 섹션: 프레임 데이터 분석

```html
<section id="sec8">
  <h2><span class="section-num num-genre">08</span> 프레임 데이터 분석</h2>

  <div class="card">
    <div class="card-label label-info">액션 프레임 분석</div>
    <p>공격 모션 프레임, 히트박스 판정, 콤보 연계 데이터를 분석한다.</p>
  </div>

  <div class="chart-grid">
    <div class="chart-wrapper">
      <div class="chart-label">기술별 프레임 비교</div>
      <canvas id="genre-action-frames"></canvas>
    </div>
    <div class="chart-wrapper">
      <div class="chart-label">DPS 비교</div>
      <canvas id="genre-action-dps"></canvas>
    </div>
  </div>

  <div class="analysis-card">
    <div class="analysis-label">최적 콤보 DPS</div>
    <div class="analysis-value">{값}/sec</div>
    <div class="analysis-desc">최적 콤보 루트: {기술A} → {기술B} → {기술C}, 총 {N}프레임</div>
  </div>

  <script>
  // Stacked Bar: 프레임 데이터 (선딜/지속/후딜)
  new Chart(document.getElementById('genre-action-frames'), {
    type: 'bar',
    data: {
      labels: [/* 기술명 */],
      datasets: [{
        label: '선딜 (프레임)',
        data: [/* 값 */],
        backgroundColor: '#1a6b4a'
      }, {
        label: '지속 (프레임)',
        data: [/* 값 */],
        backgroundColor: '#1e3a5f'
      }, {
        label: '후딜 (프레임)',
        data: [/* 값 */],
        backgroundColor: '#9b2c3f'
      }]
    },
    options: { responsive: true, scales: { x: { stacked: true }, y: { stacked: true } } }
  });
  </script>
</section>
```

---

## 라이브서비스

### 추가 섹션: 시즌/업데이트 분석

```html
<section id="sec8">
  <h2><span class="section-num num-genre">08</span> 시즌/업데이트 분석</h2>

  <div class="card">
    <div class="card-label label-info">라이브서비스 운영 분석</div>
    <p>시즌 주기, 콘텐츠 업데이트 패턴, 이벤트 로테이션을 분석한다.</p>
  </div>

  <div class="chart-wrapper">
    <div class="chart-label">시즌별 콘텐츠 타임라인</div>
    <canvas id="genre-live-timeline"></canvas>
  </div>

  <div class="chart-wrapper">
    <div class="chart-label">업데이트 유형별 빈도</div>
    <canvas id="genre-live-frequency"></canvas>
  </div>

  <div class="analysis-card">
    <div class="analysis-label">평균 시즌 주기</div>
    <div class="analysis-value">{값}주</div>
    <div class="analysis-desc">시즌당 평균 {N}개 신규 콘텐츠, 핫픽스 {M}회</div>
  </div>

  <script>
  // Bar: 시즌별 콘텐츠 양
  new Chart(document.getElementById('genre-live-timeline'), {
    type: 'bar',
    data: {
      labels: [/* 시즌명 */],
      datasets: [{
        label: '신규 콘텐츠',
        data: [/* 수 */],
        backgroundColor: '#1e3a5f'
      }, {
        label: '밸런스 패치',
        data: [/* 수 */],
        backgroundColor: '#8b5e34'
      }]
    },
    options: { responsive: true }
  });
  // Doughnut: 업데이트 유형 비율
  new Chart(document.getElementById('genre-live-frequency'), {
    type: 'doughnut',
    data: {
      labels: ['콘텐츠 추가', '밸런스 패치', 'QoL 개선', '버그 수정', '이벤트'],
      datasets: [{
        data: [/* 비율 */],
        backgroundColor: ['#1e3a5f', '#4a3f6b', '#1a6b4a', '#8b5e34', '#9b2c3f']
      }]
    },
    options: { responsive: true }
  });
  </script>
</section>
```

---

## 경제중심

### 추가 섹션: 재화 순환 심층 분석

```html
<section id="sec8">
  <h2><span class="section-num num-genre">08</span> 재화 순환 심층 분석</h2>

  <div class="card">
    <div class="card-label label-info">경제 시뮬레이션</div>
    <p>게임 내 재화 흐름, 인플레이션 모델, 과금/무과금 격차를 심층 분석한다.</p>
  </div>

  <div class="chart-grid">
    <div class="chart-wrapper">
      <div class="chart-label">재화 유입/유출 Sankey</div>
      <canvas id="genre-economy-flow"></canvas>
    </div>
    <div class="chart-wrapper">
      <div class="chart-label">인플레이션 추이</div>
      <canvas id="genre-economy-inflation"></canvas>
    </div>
  </div>

  <div class="mermaid-wrapper">
    <div class="mermaid">
    graph LR
      SOURCE1[일일 퀘스트] --> POOL((재화 풀))
      SOURCE2[상점 구매] --> POOL
      SOURCE3[이벤트 보상] --> POOL
      POOL --> SINK1[장비 강화]
      POOL --> SINK2[가챠]
      POOL --> SINK3[소모품]
    </div>
  </div>

  <div class="analysis-card">
    <div class="analysis-label">싱크/소스 비율</div>
    <div class="analysis-value">{값}</div>
    <div class="analysis-desc">1.0 이상 = 인플레이션 경향, 무과금 일일 순수입 {값}</div>
  </div>

  <script>
  // Line: 인플레이션 추이
  new Chart(document.getElementById('genre-economy-inflation'), {
    type: 'line',
    data: {
      labels: [/* 일수 */],
      datasets: [{
        label: '재화 보유량 (무과금)',
        data: [/* 값 */],
        borderColor: '#1a6b4a'
      }, {
        label: '재화 보유량 (과금)',
        data: [/* 값 */],
        borderColor: '#9b2c3f'
      }, {
        label: '필요 재화량',
        data: [/* 값 */],
        borderColor: '#8492a6',
        borderDash: [5, 5]
      }]
    },
    options: { responsive: true }
  });
  </script>
</section>
```

---

## MOBA/경쟁

### 추가 섹션: 매칭/랭킹 분석

```html
<section id="sec8">
  <h2><span class="section-num num-genre">08</span> 매칭/랭킹 분석</h2>

  <div class="card">
    <div class="card-label label-info">경쟁 시스템 분석</div>
    <p>매칭 알고리즘, ELO/MMR 시스템, 랭크 분포, 시즌 리셋 구조를 분석한다.</p>
  </div>

  <div class="chart-grid">
    <div class="chart-wrapper">
      <div class="chart-label">랭크 분포</div>
      <canvas id="genre-moba-rank"></canvas>
    </div>
    <div class="chart-wrapper">
      <div class="chart-label">승률 vs MMR 상관관계</div>
      <canvas id="genre-moba-mmr"></canvas>
    </div>
  </div>

  <div class="analysis-card">
    <div class="analysis-label">매칭 대기 시간 (중앙값)</div>
    <div class="analysis-value">{값}초</div>
    <div class="analysis-desc">상위 {N}% 구간 매칭 시간 {M}초, 하위 구간 {K}초</div>
  </div>

  <script>
  // Bar: 랭크 분포
  new Chart(document.getElementById('genre-moba-rank'), {
    type: 'bar',
    data: {
      labels: [/* 랭크명 */],
      datasets: [{
        label: '유저 비율 (%)',
        data: [/* 비율 */],
        backgroundColor: [
          '#1a6b4a', '#1a6b4a', '#1e3a5f', '#1e3a5f',
          '#4a3f6b', '#8b5e34', '#9b2c3f'
        ]
      }]
    },
    options: { responsive: true }
  });
  // Scatter: 승률 vs MMR
  new Chart(document.getElementById('genre-moba-mmr'), {
    type: 'scatter',
    data: {
      datasets: [{
        label: '승률 vs MMR',
        data: [/* {x: MMR, y: 승률} */],
        backgroundColor: 'rgba(30,58,95,0.5)'
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: { title: { display: true, text: 'MMR' } },
        y: { title: { display: true, text: '승률 (%)' } }
      }
    }
  });
  </script>
</section>
```

### 추가 섹션: 캐릭터/챔피언 밸런스

```html
<section id="sec9">
  <h2><span class="section-num num-genre">09</span> 캐릭터/챔피언 밸런스</h2>

  <div class="chart-wrapper">
    <div class="chart-label">픽률 vs 승률 분포</div>
    <canvas id="genre-moba-balance"></canvas>
  </div>

  <script>
  // Scatter: 픽률 vs 승률
  new Chart(document.getElementById('genre-moba-balance'), {
    type: 'scatter',
    data: {
      datasets: [{
        label: '캐릭터별',
        data: [/* {x: 픽률, y: 승률, r: 밴율} */],
        backgroundColor: 'rgba(30,58,95,0.4)'
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: { title: { display: true, text: '픽률 (%)' } },
        y: { title: { display: true, text: '승률 (%)' }, min: 40, max: 60 }
      }
    }
  });
  </script>
</section>
```

---

## 방치형

### 추가 섹션: 오프라인 보상 & 시간 효율 분석

```html
<section id="sec8">
  <h2><span class="section-num num-genre">08</span> 오프라인 보상 & 시간 효율 분석</h2>

  <div class="card">
    <div class="card-label label-info">방치 효율 분석</div>
    <p>오프라인 보상 효율, 시간당 재화 획득량, 최적 접속 주기를 분석한다.</p>
  </div>

  <div class="chart-grid">
    <div class="chart-wrapper">
      <div class="chart-label">시간별 오프라인 보상 효율</div>
      <canvas id="genre-idle-efficiency"></canvas>
    </div>
    <div class="chart-wrapper">
      <div class="chart-label">접속 주기별 일일 획득량</div>
      <canvas id="genre-idle-cycle"></canvas>
    </div>
  </div>

  <div class="analysis-card">
    <div class="analysis-label">최적 접속 주기</div>
    <div class="analysis-value">{값}시간</div>
    <div class="analysis-desc">오프라인 보상 캡 {N}시간, 효율 감쇠 시작 {M}시간</div>
  </div>

  <script>
  // Line: 시간별 효율 (체감 곡선)
  new Chart(document.getElementById('genre-idle-efficiency'), {
    type: 'line',
    data: {
      labels: [/* 시간 */],
      datasets: [{
        label: '시간당 보상 효율',
        data: [/* 값 */],
        borderColor: '#1e3a5f',
        fill: true,
        backgroundColor: 'rgba(30,58,95,0.08)'
      }, {
        label: '누적 보상',
        data: [/* 값 */],
        borderColor: '#1a6b4a',
        yAxisID: 'y1'
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { position: 'left', title: { display: true, text: '시간당 효율' } },
        y1: { position: 'right', title: { display: true, text: '누적 보상' }, grid: { drawOnChartArea: false } }
      }
    }
  });
  </script>
</section>
```

---

## 시뮬레이션

### 추가 섹션: 시스템 상호작용 분석

```html
<section id="sec8">
  <h2><span class="section-num num-genre">08</span> 시스템 상호작용 분석</h2>

  <div class="card">
    <div class="card-label label-info">시뮬레이션 변수 분석</div>
    <p>시뮬레이션 게임의 다중 변수 상호작용, 최적화 경로, 병목 지점을 분석한다.</p>
  </div>

  <div class="chart-wrapper">
    <div class="chart-label">변수 간 상관관계 매트릭스</div>
    <canvas id="genre-sim-correlation"></canvas>
  </div>

  <div class="mermaid-wrapper">
    <div class="mermaid">
    graph TD
      VAR_A[변수 A] -->|+영향| VAR_B[변수 B]
      VAR_B -->|+영향| VAR_C[변수 C]
      VAR_C -->|-영향| VAR_A
      VAR_A -->|+영향| OUTPUT[결과]
      VAR_B -->|+영향| OUTPUT
    </div>
  </div>

  <div class="analysis-card">
    <div class="analysis-label">핵심 병목 변수</div>
    <div class="analysis-value">{변수명}</div>
    <div class="analysis-desc">전체 시스템 효율의 {N}%를 좌우하는 핵심 변수</div>
  </div>

  <script>
  // Bubble: 변수 상관관계
  new Chart(document.getElementById('genre-sim-correlation'), {
    type: 'bubble',
    data: {
      datasets: [{
        label: '양의 상관',
        data: [/* {x, y, r} */],
        backgroundColor: 'rgba(26,107,74,0.4)'
      }, {
        label: '음의 상관',
        data: [/* {x, y, r} */],
        backgroundColor: 'rgba(155,44,63,0.4)'
      }]
    },
    options: { responsive: true }
  });
  </script>
</section>
```

---

## 배틀로얄

### 추가 섹션: 생존 곡선 & 맵 분석

```html
<section id="sec8">
  <h2><span class="section-num num-genre">08</span> 생존 곡선 & 맵 분석</h2>

  <div class="card">
    <div class="card-label label-info">배틀로얄 메타 분석</div>
    <p>생존 곡선, 자기장/안전구역 수축 패턴, 인기 랜딩 포인트, 무기 밸런스를 분석한다.</p>
  </div>

  <div class="chart-grid">
    <div class="chart-wrapper">
      <div class="chart-label">시간별 생존자 수 곡선</div>
      <canvas id="genre-br-survival"></canvas>
    </div>
    <div class="chart-wrapper">
      <div class="chart-label">무기 카테고리별 킬 점유율</div>
      <canvas id="genre-br-weapons"></canvas>
    </div>
  </div>

  <div class="analysis-card">
    <div class="analysis-label">평균 매치 시간</div>
    <div class="analysis-value">{값}분</div>
    <div class="analysis-desc">50% 탈락 시점 {N}분, 자기장 {M}페이즈에서 교전 집중</div>
  </div>

  <script>
  // Line: 생존 곡선
  new Chart(document.getElementById('genre-br-survival'), {
    type: 'line',
    data: {
      labels: [/* 시간(분) */],
      datasets: [{
        label: '생존자 수',
        data: [/* 값 */],
        borderColor: '#1e3a5f',
        fill: true,
        backgroundColor: 'rgba(30,58,95,0.08)',
        stepped: false
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: { title: { display: true, text: '경과 시간 (분)' } },
        y: { title: { display: true, text: '생존자 수' }, beginAtZero: true }
      }
    }
  });
  // Polar Area: 무기 카테고리별 킬 점유율
  new Chart(document.getElementById('genre-br-weapons'), {
    type: 'polarArea',
    data: {
      labels: [/* 무기 카테고리 */],
      datasets: [{
        data: [/* 킬 비율 */],
        backgroundColor: [
          'rgba(30,58,95,0.6)', 'rgba(74,63,107,0.6)',
          'rgba(26,107,74,0.6)', 'rgba(139,94,52,0.6)',
          'rgba(155,44,63,0.6)'
        ]
      }]
    },
    options: { responsive: true }
  });
  </script>
</section>
```
