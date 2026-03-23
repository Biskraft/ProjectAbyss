# HTML 단일 파일 출력 스펙

> 역기획서를 하나의 HTML 파일로 출력할 때의 구조, 디자인 시스템, Mermaid 설정 가이드.
> **화이트 비즈니스 테마** — 기업 컨설팅 보고서/화이트페이퍼 스타일의 깔끔한 라이트 테마.

---

## 파일 구조

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[게임명] [시스템명] 역기획서</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <link rel="preconnect" href="https://cdn.jsdelivr.net">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&display=swap" rel="stylesheet">
  <style>/* 전체 CSS */</style>
</head>
<body>
  <div class="scroll-progress" id="scrollProgress"></div>
  <button class="back-to-top" id="backToTop" aria-label="맨 위로 이동">&#8593;</button>
  <nav class="toc-sidebar"><!-- 사이드바 목차 --></nav>
  <div class="main-content">
    <header class="doc-header"><!-- 제목, 메타 --></header>
    <section id="sec1"><!-- 1. 정의서 --></section>
    <section id="sec2"><!-- 2. 구조도 --></section>
    <section id="sec3"><!-- 3. 플로우차트 --></section>
    <section id="sec4"><!-- 4. 상세 명세서 --></section>
    <section id="sec5"><!-- 5. 데이터 테이블 --></section>
    <section id="sec6"><!-- 6. 예외 처리 --></section>
    <section id="sec7"><!-- 7. 비교 분석 --></section>
    <section id="sec8"><!-- 8. 리서치 브리프 --></section>
    <section id="sec9"><!-- 9. 수치 분석 --></section>
    <section id="sec10"><!-- 10. 장르별 분석 --></section>
    <footer class="doc-footer"><!-- 푸터 --></footer>
  </div>
  <script>/* Mermaid 초기화 + TOC 스크립트 */</script>
</body>
</html>
```

---

## CSS 디자인 시스템

### CSS 변수 (`:root`) — 화이트 비즈니스 테마

```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #fafbfc;
  --bg-card: #f6f8fa;
  --bg-card-alt: #f0f2f5;
  --bg-card-hover: #edf0f4;
  --bg-surface: #f8f9fb;
  --text-primary: #1a1f36;
  --text-secondary: #4a5568;
  --text-muted: #8492a6;
  --accent-blue: #1e3a5f;       /* 네이비 — 메인 악센트 */
  --accent-purple: #4a3f6b;     /* 딥 퍼플 */
  --accent-pink: #9b2c3f;       /* 딥 로즈 */
  --accent-green: #1a6b4a;      /* 포레스트 그린 */
  --accent-orange: #8b5e34;     /* 앰버 */
  --accent-cyan: #1a5c6b;       /* 틸 */
  --accent-blue-dim: rgba(30, 58, 95, 0.06);
  --accent-purple-dim: rgba(74, 63, 107, 0.06);
  --accent-pink-dim: rgba(155, 44, 63, 0.06);
  --accent-green-dim: rgba(26, 107, 74, 0.06);
  --accent-orange-dim: rgba(139, 94, 52, 0.06);
  --accent-cyan-dim: rgba(26, 92, 107, 0.06);
  --border-color: #e2e8f0;
  --border-color-strong: #cbd5e1;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 2px 8px rgba(0,0,0,0.06);
  --shadow-lg: 0 4px 16px rgba(0,0,0,0.08);
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 16px;
  --sidebar-width: 264px;
  --font-serif: 'Source Serif 4', 'Georgia', serif;
  --font-mono: 'IBM Plex Mono', 'Menlo', monospace;
}
```

### 폰트

```css
body {
  font-family: 'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  font-size: 14.5px;
  line-height: 1.75;
  background: var(--bg-primary);
  color: var(--text-primary);
}
```

| 요소 | 폰트 | 크기 | 굵기 |
|------|------|------|------|
| h1 (문서 제목) | Source Serif 4 | 34px | 700 |
| h2 (섹션 제목) | Source Serif 4 | 22px | 600 |
| h3 (하위 제목) | Source Serif 4 | 16px | 600 |
| h4 (소제목) | Pretendard | 14px | 600 |
| 본문 | Pretendard | 14.5px | 400 |
| 테이블 내부 | Pretendard | 13px | 400 |
| 캡션/태그 | Pretendard | 10-11px | 600-700 |
| 코드/수식 | IBM Plex Mono | 12-12.5px | 400-500 |

---

## Chart.js 차트 컴포넌트

### 래퍼 구조

```html
<div class="chart-wrapper">
  <div class="chart-label">차트 제목</div>
  <canvas id="chartId"></canvas>
</div>
```

### CSS 규칙

```css
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
  top: 8px; right: 12px;
  font-size: 9px; font-weight: 600;
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
.chart-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 18px;
  margin: 18px 0;
}
```

### 분석 카드

```html
<div class="analysis-card">
  <div class="analysis-label">분석 영역</div>
  <div class="analysis-value">핵심 수치</div>
  <div class="analysis-desc">설명</div>
</div>
```

```css
.analysis-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 18px 22px;
  border-top: 3px solid var(--accent-blue);
}
.analysis-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  margin-bottom: 6px;
}
.analysis-value {
  font-family: var(--font-mono);
  font-size: 20px;
  font-weight: 600;
  color: var(--accent-blue);
  margin-bottom: 4px;
}
.analysis-desc {
  font-size: 12px;
  color: var(--text-secondary);
}
```

---

## 레이아웃

### 사이드바 TOC

```css
.toc-sidebar {
  position: fixed;
  left: 0; top: 0;
  width: var(--sidebar-width);  /* 264px */
  height: 100vh;
  background: var(--bg-secondary);  /* #fafbfc */
  border-right: 1px solid var(--border-color);
  overflow-y: auto;
  z-index: 100;
  padding: 24px 0 32px;
}
```

- 브랜드 아이콘: 네이비 배경(`--accent-blue`), 흰색 텍스트, 4px border-radius
- 1단계 링크: `padding: 6px 20px`, font-size 12.5px
- 2단계 링크: `padding-left: 36px`, class `depth-2`, font-size 11.5px
- hover: `background: rgba(0, 0, 0, 0.02)`
- active: 좌측 border 2px + 해당 섹션 악센트 색상 + dim 배경

### 본문 영역

```css
.main-content {
  margin-left: var(--sidebar-width);
  padding: 48px 56px 100px;
  max-width: calc(1100px + var(--sidebar-width) + 112px);
}
```

### 반응형 (모바일)

```css
@media (max-width: 900px) {
  .toc-sidebar { display: none; }
  .main-content { margin-left: 0; padding: 24px 20px 60px; }
  h1 { font-size: 26px; }
  h2 { font-size: 19px; }
}
@media (max-width: 600px) {
  .main-content { padding: 16px 14px 48px; }
  h1 { font-size: 22px; }
  .card-grid { grid-template-columns: 1fr; }
}
```

---

## 섹션별 넘버링

각 섹션 h2에 넘버 뱃지를 표시한다:

```html
<h2><span class="section-num num-def">01</span> 정의서</h2>
```

| 섹션 | 클래스 | 색상 | 배경 |
|------|--------|------|------|
| 정의서 | `num-def` | white | accent-blue (#1e3a5f) |
| 구조도 | `num-struct` | white | accent-purple (#4a3f6b) |
| 플로우차트 | `num-flow` | white | accent-green (#1a6b4a) |
| 상세 명세서 | `num-detail` | white | accent-orange (#8b5e34) |
| 데이터 테이블 | `num-data` | white | accent-cyan (#1a5c6b) |
| 예외 처리 | `num-except` | white | accent-pink (#9b2c3f) |
| 비교 분석 | `num-compare` | white | accent-purple (#4a3f6b) |
| 리서치 브리프 | `num-research` | white | accent-cyan (#1a5c6b) |
| 수치 분석 | `num-numerical` | white | accent-green (#1a6b4a) |
| 장르별 분석 | `num-genre` | white | accent-orange (#8b5e34) |

```css
.section-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px; height: 32px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  margin-right: 10px;
  vertical-align: middle;
}
/* 그라디언트 없음 — 단색 플랫 배경 사용 */
.num-def { background: var(--accent-blue); }
.num-struct { background: var(--accent-purple); }
/* ... */
```

---

## 컴포넌트

### 카드

```html
<div class="card">
  <div class="card-label label-info">시스템 설명</div>
  <p>내용</p>
</div>
```

```css
.card {
  background: var(--bg-card);        /* #f6f8fa */
  border: 1px solid var(--border-color);  /* #e2e8f0 */
  border-radius: 6px;
  padding: 20px 22px;
  margin: 12px 0;
  /* 그림자 없음 — 보더만으로 구분 */
}
.card:hover {
  border-color: var(--border-color-strong);  /* #cbd5e1 */
}
```

- `.card-alt`: 대체 배경 (`--bg-card-alt`: #f0f2f5)
- `.card-grid`: 반응형 그리드 (`grid-template-columns: repeat(auto-fit, minmax(300px, 1fr))`)
- `.card-label`: 좌측 3px 세로 바 + 대문자 라벨
  - `.label-user` (포레스트 그린), `.label-biz` (앰버), `.label-info` (네이비), `.label-warn` (딥 로즈)

### 설계 의도 카드

```html
<div class="intent-card intent-revenue">
  <div class="intent-label" style="color: var(--accent-pink);">수익화</div>
  <table>...</table>
</div>
```

```css
.intent-card {
  background: var(--bg-primary);      /* 흰 배경 */
  border-radius: 6px;
  padding: 18px 22px;
  margin: 10px 0;
  border-left: 3px solid;            /* 좌측 컬러 보더 */
  border-top: 1px solid var(--border-color);
  border-right: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
}
/* 그라디언트 배경 없음 — 깔끔한 흰 배경에 좌측 보더만 */
```

5가지 관점별 좌측 border 색상:
- `.intent-revenue` (딥 로즈 `--accent-pink`), `.intent-retention` (앰버 `--accent-orange`), `.intent-ux` (네이비 `--accent-blue`), `.intent-balance` (포레스트 `--accent-green`), `.intent-social` (퍼플 `--accent-purple`)

### 태그

```html
<span class="tag tag-pk">PK</span>
<span class="tag tag-high">높음</span>
```

```css
.tag {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  border: 1px solid;  /* 아웃라인 보더 추가 */
}
```

| 클래스 | 용도 | 텍스트 색상 | 보더/배경 |
|--------|------|-------------|-----------|
| `tag-required` | 필수 항목 | accent-pink | pink-dim + 15% pink border |
| `tag-optional` | 선택 항목 | accent-green | green-dim + 15% green border |
| `tag-pk` | Primary Key | accent-blue | blue-dim + 15% blue border |
| `tag-fk` | Foreign Key | accent-purple | purple-dim + 15% purple border |
| `tag-high` | 높은 중요도 | accent-pink | pink-dim + 15% pink border |
| `tag-mid` | 중간 | accent-orange | orange-dim + 15% orange border |
| `tag-low` | 낮음 | accent-green | green-dim + 15% green border |

### 테이블

```css
table {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
  font-size: 13px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  overflow: hidden;
}
th {
  background: var(--bg-card);          /* #f6f8fa */
  color: var(--accent-blue);           /* #1e3a5f */
  padding: 10px 14px;
  border-bottom: 2px solid var(--border-color-strong);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}
td {
  padding: 9px 14px;
  border-bottom: 1px solid var(--border-color);
  vertical-align: top;
  color: var(--text-secondary);
}
tr:hover td { background: rgba(30, 58, 95, 0.02); }
tbody tr:nth-child(even) td { background: rgba(0, 0, 0, 0.01); }
```

### 수식 블록

```html
<div class="formula">수식 내용</div>
```

```css
.formula {
  background: var(--bg-card);
  font-family: var(--font-mono);  /* IBM Plex Mono */
  font-size: 12.5px;
  color: var(--accent-blue);      /* 네이비 텍스트 */
  padding: 16px 20px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  line-height: 1.9;
}
```

### 상태 전이 매트릭스

- `.matrix-possible`: 전이 가능 (포레스트 그린, font-weight 600)
- `.matrix-impossible`: 전이 불가 (text-muted, italic)

---

## Mermaid 다이어그램

### 초기화 설정

```javascript
mermaid.initialize({
  startOnLoad: true,
  theme: 'base',
  themeVariables: {
    primaryColor: '#e8edf3',
    primaryTextColor: '#1a1f36',
    primaryBorderColor: '#1e3a5f',
    lineColor: '#8492a6',
    secondaryColor: '#f0f2f5',
    tertiaryColor: '#fafbfc',
    fontFamily: 'Pretendard Variable, sans-serif',
    fontSize: '12px',
    noteBkgColor: '#f6f8fa',
    noteTextColor: '#4a5568',
    noteBorderColor: '#cbd5e1',
    /* sequence 관련 */
    actorBkg: '#e8edf3',
    actorBorder: '#1e3a5f',
    actorTextColor: '#1a1f36',
    signalColor: '#4a5568',
    activationBkgColor: '#edf0f4',
    activationBorderColor: '#1e3a5f',
    sequenceNumberColor: '#fff',
    /* pie 관련 */
    pie1: '#1e3a5f',
    pie2: '#4a3f6b',
    pie3: '#1a6b4a',
    pie4: '#8b5e34',
    pie5: '#9b2c3f',
    pie6: '#1a5c6b',
    pieStrokeColor: '#e2e8f0',
    pieTitleTextColor: '#1a1f36',
    pieStrokeWidth: '1px',
    pieSectionTextColor: '#fff',
    /* state 관련 */
    labelColor: '#1a1f36',
    altBackground: '#f0f2f5'
  },
  flowchart: { curve: 'basis', useMaxWidth: true, htmlLabels: true, padding: 16 },
  er: { useMaxWidth: true, layoutDirection: 'LR' },
  sequence: { mirrorActors: false, messageAlign: 'center', wrap: true },
  state: { useMaxWidth: true },
  pie: { useMaxWidth: true, textPosition: 0.75 },
  xyChart: { titleColor: '#1a1f36', xAxisLabelColor: '#4a5568', yAxisLabelColor: '#4a5568' },
  quadrantChart: { useMaxWidth: true },
  mindmap: { useMaxWidth: true }
});
```

**주의:** 다크테마(`theme: 'dark'`)가 아닌 `theme: 'base'`를 사용한다. 라이트 배경에 최적화된 커스텀 테마 변수를 적용한다.

### Mermaid subgraph 스타일 (화이트 테마용)

구조도에서 subgraph에 인라인 스타일을 적용할 때 라이트 톤 사용:

```
style RAW fill:#eaf5f0,stroke:#1a6b4a
style PROCESS fill:#e8edf3,stroke:#1e3a5f
style REFINE fill:#edebf3,stroke:#4a3f6b
style FORGE fill:#f3eaeb,stroke:#9b2c3f
style OUTPUT fill:#e8f0f3,stroke:#1a5c6b
```

### 래퍼 구조

```html
<!-- 일반 다이어그램 (플로우차트 등) -->
<div class="mermaid-wrapper">
  <div class="mermaid">flowchart TD ...</div>
</div>

<!-- 전폭 다이어그램 (구조도, ER) -->
<div class="mermaid-wrapper mermaid-tall">
  <div class="mermaid">graph LR ...</div>
</div>
```

### CSS 규칙

```css
.mermaid-wrapper {
  background: var(--bg-card);           /* #f6f8fa */
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 24px;
  margin: 18px 0;
  overflow-x: auto;
  text-align: center;
  position: relative;
}
.mermaid-wrapper::before {
  content: 'DIAGRAM';
  position: absolute;
  top: 8px; right: 12px;
  font-size: 9px; font-weight: 600;
  letter-spacing: 1.5px;
  color: var(--text-muted);
  opacity: 0.5;
}

/* 전폭 다이어그램: SVG가 컨테이너 너비에 맞춤 */
.mermaid-wrapper.mermaid-tall { overflow-x: hidden; }
.mermaid-wrapper.mermaid-tall .mermaid { width: 100%; display: block; }
.mermaid-wrapper.mermaid-tall .mermaid svg {
  width: 100% !important;
  max-width: 100%;
  height: auto !important;
}
```

### 다이어그램 방향 규칙

| 다이어그램 | 방향 | 래퍼 클래스 |
|-----------|------|------------|
| 구조도 | `graph LR` | `mermaid-tall` |
| 플로우차트 | `flowchart TD` | (기본) |
| ER 다이어그램 | `erDiagram` + `layoutDirection: 'LR'` | `mermaid-tall` |
| stateDiagram-v2 | `direction LR` | `mermaid-tall` |
| sequenceDiagram | (수직 고정) | (기본) |
| mindmap | (자동) | `mermaid-tall` |
| pie | (원형 고정) | (기본) |
| xychart-beta | (수평 고정) | (기본) |
| quadrantChart | (정방형 고정) | (기본) |

- 구조도의 subgraph 내부는 반드시 `direction LR`로 통일
- 플로우차트가 노드 15개를 초과하면 서브 플로우로 분리

---

## 헤더 구성

```html
<header class="doc-header">
  <div class="game-badge">게임명</div>
  <h1>시스템명 역기획서</h1>
  <div class="doc-meta">
    <span class="meta-ver">v1.0</span>
    <span class="meta-date">작성일</span>
    <span class="meta-scope">분석 범위 요약</span>
  </div>
</header>
```

```css
.doc-header {
  padding-bottom: 28px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}
```

- `game-badge`: 네이비 배경(`--accent-blue`), 흰색 텍스트, 4px border-radius, 대문자
- `h1`: Source Serif 4, 네이비 색상(`--accent-blue`), **그라디언트 텍스트 사용하지 않음**
- `doc-meta`: 각 항목 앞 5px 컬러 도트 (ver=포레스트, date=앰버, scope=틸), `--bg-card` 배경 pill

---

## 스크롤 프로그레스 바

```css
.scroll-progress {
  position: fixed;
  top: 0; left: 0;
  width: 0%;
  height: 2px;                        /* 얇게 */
  background: var(--accent-blue);     /* 단색 네이비 — 그라디언트 없음 */
  z-index: 9999;
}
```

---

## Back to Top 버튼

```css
.back-to-top {
  position: fixed;
  bottom: 28px; right: 28px;
  width: 40px; height: 40px;
  border-radius: 6px;                /* 원형 아닌 사각형 */
  background: #fff;
  border: 1px solid var(--border-color-strong);
  color: var(--accent-blue);
  font-size: 18px;
  box-shadow: var(--shadow-md);
}
.back-to-top:hover {
  background: var(--accent-blue);
  color: #fff;
}
```

---

## 스크롤바

```css
::-webkit-scrollbar { width: 7px; }
::-webkit-scrollbar-track { background: var(--bg-primary); }
::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
```

---

## 텍스트 선택

```css
::selection {
  background: rgba(30, 58, 95, 0.15);
  color: var(--text-primary);
}
```

---

## 푸터

```html
<footer class="doc-footer">
  <p>본 문서는 역기획 학습 및 포트폴리오 목적으로 작성되었습니다.</p>
  <p>게임명 &copy; 저작권자명. All rights reserved.</p>
  <p style="margin-top: 8px; font-size: 11px;">v1.0 | 작성일 | 시스템명 역기획서 (Corporate Whitepaper Edition)</p>
</footer>
```

---

## 인쇄(Print) 지원

```css
@media print {
  .toc-sidebar, .scroll-progress, .back-to-top { display: none; }
  .main-content { margin-left: 0; padding: 20px; }
  body { background: #fff; color: #111; font-size: 11px; }
  h1, h2, h3, h4 { color: #111; }
  h1 { font-size: 24px; }
  .card, .intent-card, .mermaid-wrapper, .formula {
    border: 1px solid #ccc;
    box-shadow: none;
    background: #fafafa;
  }
  table { border: 1px solid #ccc; }
  th { background: #f0f0f0; color: #222; }
  td { color: #333; }
  section { animation: none; }
  a { color: inherit; }
}
```

---

## JavaScript

### TOC 하이라이팅 + 스크롤 프로그레스

```javascript
document.addEventListener('DOMContentLoaded', function() {
  const tocLinks = document.querySelectorAll('.toc-sidebar a');
  const progressBar = document.getElementById('scrollProgress');
  const backToTop = document.getElementById('backToTop');
  const sections = [];

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  tocLinks.forEach(link => {
    const id = link.getAttribute('href');
    if (id && id.startsWith('#')) {
      const el = document.querySelector(id);
      if (el) sections.push({ el, link });
    }
  });

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      progressBar.style.width = progress + '%';
      backToTop.classList.toggle('visible', scrollTop > 600);

      let current = null;
      for (let i = sections.length - 1; i >= 0; i--) {
        if (sections[i].el.getBoundingClientRect().top <= 100) {
          current = sections[i];
          break;
        }
      }
      tocLinks.forEach(l => l.classList.remove('active'));
      if (current) {
        current.link.classList.add('active');
        const sidebar = document.querySelector('.toc-sidebar');
        const linkRect = current.link.getBoundingClientRect();
        const sidebarRect = sidebar.getBoundingClientRect();
        if (linkRect.top < sidebarRect.top + 60 || linkRect.bottom > sidebarRect.bottom - 60) {
          current.link.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }
      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  tocLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.pushState(null, '', this.getAttribute('href'));
      }
    });
  });
});
```

### Chart.js 초기화

```javascript
// Chart.js 초기화는 Mermaid 렌더링 완료 후 실행
// 각 canvas에 대해 new Chart() 호출
// 차트 데이터는 각 섹션의 data-chart 속성에서 읽거나 인라인 스크립트로 처리
document.addEventListener('DOMContentLoaded', function() {
  // Chart.js 글로벌 기본값 설정
  if (typeof Chart !== 'undefined') {
    Chart.defaults.font.family = "'Pretendard Variable', 'Pretendard', sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = '#4a5568';
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
  }
  // 각 섹션의 인라인 스크립트에서 개별 차트 초기화
});
```

---

## 디자인 원칙 요약

| 원칙 | 적용 |
|------|------|
| **단색 플랫** | 그라디언트 없음. 섹션 넘버, 뱃지, 버튼 모두 단색 배경 |
| **최소 그림자** | shadow-sm/md만 사용. 카드는 보더만으로 구분 |
| **세리프 제목** | h1~h3에 Source Serif 4로 격식 있는 문서 느낌 |
| **억제된 악센트** | 네온 컬러 대신 네이비, 딥 퍼플, 포레스트 그린 등 채도 낮은 톤 |
| **보더 기반 태그** | 태그에 outline border 추가로 가독성 확보 |
| **깔끔한 테이블** | collapse 보더, 얇은 구분선, uppercase 헤더 |
| **인쇄 친화적** | @media print로 사이드바/애니메이션 제거, 그레이스케일 최적화 |

---

## 체크리스트

- [ ] 단일 HTML 파일 (외부 의존성: Mermaid CDN + Google Fonts CDN)
- [ ] `lang="ko"` 설정
- [ ] CSS 변수로 색상 일원 관리 (화이트 비즈니스 테마)
- [ ] 사이드바 TOC: 모든 섹션 + 주요 하위 항목 링크
- [ ] 7개 섹션 (정의서 ~ 비교 분석) 모두 포함
- [ ] 구조도: `graph LR`, subgraph `direction LR`
- [ ] 플로우차트: `flowchart TD`
- [ ] ER 다이어그램: `layoutDirection: 'LR'`
- [ ] Mermaid `theme: 'base'` + 라이트 테마 themeVariables 설정
- [ ] 전폭 다이어그램에 `mermaid-tall` 클래스 적용
- [ ] stateDiagram-v2, mindmap에 `mermaid-tall` 클래스 적용
- [ ] sequenceDiagram에 `mirrorActors: false` 설정 적용
- [ ] pie 차트 색상이 화이트 비즈니스 테마 악센트와 일치
- [ ] xychart-beta, quadrantChart가 정상 렌더링됨
- [ ] 반응형: 900px 이하에서 사이드바 숨김
- [ ] 인쇄 스타일: 사이드바/프로그레스 바/애니메이션 제거
- [ ] 스크롤 프로그레스 바 (네이비 단색)
- [ ] Back to Top 버튼 (사각형, 네이비)
- [ ] 푸터에 저작권 고지
- [ ] Chart.js CDN (v4.4.0) 포함
- [ ] Chart.js와 Mermaid CDN 공존 확인
- [ ] .chart-wrapper 스타일 적용
- [ ] .analysis-card 스타일 적용
- [ ] 리서치 브리프 섹션 (sec8) 포함
- [ ] 수치 분석 섹션 (sec9) 포함
- [ ] 장르별 분석 섹션 (sec10, 조건부) 포함
- [ ] Chart.js 차트가 정상 렌더링됨
