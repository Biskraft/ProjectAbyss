---
name: game-reverse-gdd
description: >-
  출시된 게임의 특정 시스템을 역분석하여 개발자가 실제 구현 가능한 수준의
  역기획서를 4인 에이전트 팀이 웹 리서치/시스템 분석/수치 분석을 병렬 수행하여
  Chart.js+Mermaid가 통합된 단일 HTML 역기획서로 자동 생성하는 워크플로우 스킬.
  "역기획서", "역기획서 작성", "reverse GDD", "게임 역기획",
  "게임 시스템 분석 문서", "역기획 포트폴리오" 등의 요청에 사용.
args: >-
  게임명과 시스템/콘텐츠명을 인자로 받는다.
  사용법: /game-reverse-gdd <게임명> <시스템명>
  예시: /game-reverse-gdd 원신 원소반응시스템
  예시: /game-reverse-gdd "메이플스토리" "장비 강화 시스템"
  인자 없이 호출 시 AskUserQuestion으로 대화형 입력을 받는다.
---

# 게임 역기획서 자동 생성 워크플로우

## Overview

역기획서는 **분석문이나 감상문이 아닌, 구현 레시피**다.
출시된 게임의 특정 시스템을 역분석하여, 이 문서만 읽고도 개발자가 동일한 시스템을 구현할 수 있는 수준의 기획서를 자동 생성한다.

**핵심 변화:**
- 게임명 + 시스템명 입력만으로 자동 생성 (수동 데이터 수집 불필요)
- 4인 에이전트 팀이 웹 리서치/분석/수치 분석을 병렬 수행
- Chart.js 수치 시각화 + Mermaid 구조 시각화 통합
- 장르별 추가 분석 자동 적용
- 유저 인터랙션: 최초 게임/시스템/장르 확인 1회만

## 최종 산출물

단일 HTML 파일 (화이트 비즈니스 테마):
- 6개 핵심 문서 (정의서, 구조도, 플로우차트, 상세명세, 데이터테이블, 예외처리)
- 비교 분석 보고서
- 웹 리서치 브리프
- 수치 분석 결과 + Chart.js 차트
- 장르별 추가 분석 (조건부)

**HTML 필수 사항:**
- Mermaid CDN + Chart.js CDN 모두 포함 (충돌 없음: Mermaid=SVG, Chart.js=Canvas)
- 화이트 비즈니스 테마 (기업 보고서 스타일, 네이비/슬레이트 악센트)
- Source Serif 4 (제목) + Pretendard (본문) + IBM Plex Mono (코드) 폰트 조합
- 좌측 고정 사이드바 TOC로 10개 섹션 네비게이션
- 설계 의도 분석은 관점별 좌측 보더 색상 코딩 (수익화=딥로즈, 리텐션=앰버, UX=네이비, 밸런싱=포레스트, 소셜=퍼플)

## Important Principles

1. **구현 가능 수준**: "이 문서만으로 개발자가 구현할 수 있는가?"가 유일한 품질 기준
2. **범위 한정**: 하나의 시스템, 하나의 기능 단위로 깊게 파고든다 (넓고 얕은 분석 금지)
3. **데이터 기반**: 웹 리서치로 수집한 실제 데이터 기반 (출처+신뢰도 등급 표기)
4. **설계 의도 추론**: 단순 기능 나열이 아닌 "왜 이렇게 설계했는가" 포함
5. **수치 분석**: 성장곡선/전투공식/경제순환/확률 시뮬레이션으로 깊이 확보

---

## 4-Phase 워크플로우

### Phase 0: 입력 & 장르 감지

**담당**: 리더 에이전트 (본인)

**인자 파싱 규칙:**
- `$ARGUMENTS`가 제공된 경우: 첫 번째 토큰 = 게임명, 나머지 = 시스템명으로 자동 파싱
  - 예: `원신 원소반응시스템` → 게임명="원신", 시스템명="원소반응시스템"
  - 예: `"메이플스토리" "장비 강화 시스템"` → 따옴표 기준 분리
  - 예: `원신` (시스템명 누락) → 게임명="원신"으로 확정, 시스템명만 AskUserQuestion
- `$ARGUMENTS`가 비어있는 경우: AskUserQuestion으로 게임명 + 시스템명 모두 입력받기
- 유저의 자연어 메시지에 게임명/시스템명이 포함된 경우에도 자동 추출 시도

**실행 순서:**
1. `$ARGUMENTS` 파싱 → 게임명·시스템명 확정 (인자가 있으면 AskUserQuestion 생략)
2. `references/system-categories.md` 참조하여 범위 적정성 판단
3. `references/genre-customization.md` 참조하여 장르 자동 감지
4. 유저에게 감지된 장르 확인 (인자 제공 시 유일한 인터랙션 포인트)

**범위 판정 기준 (MECE 원칙):**
- Good: "원신의 원소 반응 데미지 계산 시스템"
- Bad: "원신의 전투 시스템 전체"
- 적정 단위: "하나의 팝업/화면에서 완결되는 기능" 수준

**장르 감지 프로세스:**
1. 시스템명 키워드 매칭 (최우선)
2. 게임명 키워드 매칭
3. 웹 리서치 결과에서 장르 정보 추출
4. 복수 장르 해당 시 모두 기록
5. 감지 불확실 시 유저에게 선택지 제시

**장르 감지 신뢰도:**
- 키워드 3개 이상 매칭: 자동 확정 (확인 표시만)
- 키워드 1~2개 매칭: 유저에게 확인 질문
- 키워드 0개 매칭: 웹 리서치 후 유저에게 선택지 제시

**참조:** `references/system-categories.md`, `references/genre-customization.md`

---

### Phase 1: 팀 생성 & 태스크 분배

**담당**: 리더 에이전트

**1. 팀 생성:**
```
TeamCreate(team_name: "rgdd-{game}-{system}")
```

**2. 에이전트 4인 생성:**

| 에이전트 | 역할 | 도구 |
|---------|------|------|
| web-researcher | 웹 리서치 (데이터 수집) | WebSearch, WebFetch |
| system-analyst | 시스템 분석 (6개 문서 작성) | Read, Grep, Glob |
| data-analyst | 수치 분석 (4대 영역) | Read, Bash (계산) |
| html-builder | HTML 조립 (최종 산출물) | Read, Write |

**3. 태스크 생성 & 의존성 설정:**
```
T1(웹 리서치) → owner: web-researcher
T2(시스템 분석) → depends: T1 → owner: system-analyst
T3(수치 분석)  → depends: T1, T2(partial) → owner: data-analyst
T4(HTML 조립)  → depends: T2, T3 → owner: html-builder
T5(검증)       → depends: T4
T6(유저 리뷰)  → depends: T5
```

**4. 태스크 의존성 체인:**
```
T1(웹 리서치)
├──→ T2(시스템 분석: 6개 문서)
└──→ T3-Phase1(수치 분석: 성장 곡선 + 전투 공식)

T2(데이터테이블 완성)
└──→ T3-Phase2(수치 분석: 경제 순환 + 확률 시뮬레이션)

T2(완료) + T3(완료)
└──→ T4(HTML 조립)

T4(완료) → T5(검증) → T6(유저 최종 리뷰)
```

**병렬 실행 규칙:**
- T2와 T3-Phase1은 **동시 실행** 가능 (둘 다 T1에만 의존)
- T3-Phase2는 T2의 데이터테이블 산출물이 **반드시** 필요
- T4는 T2와 T3 모두 완료된 후에만 시작 (부분 조립 불가)

**참조:** `references/team-architecture.md`

---

### Phase 2: 병렬 실행

#### 2A. 웹 리서치 (web-researcher)

**도구**: WebSearch, WebFetch
**입력**: 게임명, 시스템명, 장르
**출력**: 구조화된 리서치 브리프 + 수치 데이터 포인트

5개 카테고리 x 10개 검색 쿼리로 데이터 자동 수집:

| # | 카테고리 | 쿼리 수 | 수집 대상 |
|---|---------|---------|----------|
| 1 | 기본 정보 | 3 | 위키, 메카닉 가이드, 패치노트 |
| 2 | 커뮤니티 | 2 | Reddit 분석, 티어리스트 |
| 3 | 수익 데이터 | 2 | 매출 추정, 수익화 모델 |
| 4 | 업데이트 이력 | 1 | 시스템 변경 이력 |
| 5 | 경쟁작 | 2 | 유사 게임, 직접 비교 |

**쿼리 실행 순서:**
```
1차: Q1(위키) → 기본 정보 확보, 용어 파악
2차: Q2(가이드) + Q3(패치노트) → 상세 메커니즘 + 변경 이력
3차: Q4(Reddit) + Q5(티어) → 커뮤니티 관점
4차: Q6(매출) + Q7(수익화) → 비즈니스 관점
5차: Q8(변경이력) → 시간축 데이터 보충
6차: Q9(유사게임) + Q10(비교) → 경쟁 관점
```
각 단계에서 얻은 키워드/용어를 다음 단계 쿼리에 반영하여 정확도를 높인다.

**신뢰도 등급:**

| 등급 | 소스 유형 | 점수 | 표기 |
|------|----------|------|------|
| A | 공식 문서 / 패치노트 / 인게임 표시 | 5/5 | 그대로 사용 |
| B | 커뮤니티 위키 (나무위키, Fandom, GameWith) | 4/5 | 그대로 사용 |
| C | 유저 분석 / 가이드 (검증된 작성자) | 3/5 | 그대로 사용 |
| D | Reddit/포럼 댓글 (일반 유저) | 2/5 | 그대로 사용 |
| E | 추정 / 역산 / 간접 추론 | 1/5 | **[추정]** 필수 표기 |

**핸드오프:**
- A→B: 리서치 브리프 → system-analyst (SendMessage)
- A→C: 수치 데이터 포인트 → data-analyst (SendMessage)

**산출물**: `assets/templates/web-research-brief-template.md` 형식
**참조**: `references/web-research-guide.md`

---

#### 2B. 시스템 분석 (system-analyst)

**도구**: Read, Grep, Glob
**입력**: 리서치 브리프 (web-researcher에서)
**출력**: 6개 핵심 문서 + 비교 분석 + Mermaid 다이어그램

리서치 브리프 데이터를 기반으로 7개 문서 작성:

| # | 문서 | 필수 다이어그램 | 템플릿 |
|---|------|---------------|--------|
| 1 | 정의서 | mindmap, sequenceDiagram | `assets/templates/definition-doc-template.md` |
| 2 | 구조도 | graph LR | `assets/templates/structure-diagram-spec.md` |
| 3 | 플로우차트 | flowchart TD | `assets/templates/flowchart-spec.md` |
| 4 | 상세 명세서 | stateDiagram-v2 | `assets/templates/detail-spec-template.md` |
| 5 | 데이터 테이블 | erDiagram, pie/xychart | `assets/templates/data-table-spec.md` |
| 6 | 예외 처리 | quadrantChart, sequenceDiagram | `assets/templates/exception-handling-spec.md` |
| 7 | 비교 분석 | quadrantChart, pie | `assets/templates/review-comparison-spec.md` |

**설계 의도 5가지 관점 분석:**
1. **수익화**: 시스템이 매출에 기여하는 방식
2. **리텐션**: 유저를 계속 플레이하게 만드는 장치
3. **UX**: 유저가 시스템을 쉽게 이해/사용하게 하는 설계
4. **밸런싱**: 게임 경제/전투 균형 유지 장치
5. **소셜**: 유저 간 상호작용 유도 요소

각 관점별 최소 2개 이상 설계 의도를 "기능 → 설계 의도 → 기대 효과" 형태로 정리한다.

**핸드오프:**
- B→C: 데이터 테이블 완성 시 data-analyst에게 즉시 전달 (스키마, 밸런싱 공식, 범위/경계 정보)
- B→D: 6개 문서 전체 완료 시 html-builder에게 전달

**참조**: `references/step-guide-complete.md`, 각 템플릿 파일, `references/flowchart-notation.md`

---

#### 2C. 수치 분석 (data-analyst)

**도구**: Read, Bash (계산)
**입력**: 수치 데이터 포인트 (web-researcher) + 데이터 테이블 구조 (system-analyst)
**출력**: 4대 영역 분석 결과 + Chart.js 설정 블록

| 영역 | 적용 조건 | Chart.js 타입 | Phase |
|------|----------|--------------|-------|
| 성장 곡선 | 레벨/강화 시스템 존재 시 | Line (추세선) + Scatter (실측치) | T3-P1 |
| 전투 공식 역산 | 전투 시스템 존재 시 | Scatter (데이터) + Bar (비교) | T3-P1 |
| 경제 순환 | 재화 시스템 존재 시 | Stacked Bar + Doughnut + Line | T3-P2 |
| 확률 시뮬레이션 | 가챠/확률 시스템 존재 시 | Bar (히스토그램) + Line (누적) | T3-P2 |

**조건부 포함 규칙:**
- 4대 영역 중 해당 시스템에 적합한 것만 수행
- **최소 1개 영역은 반드시 분석**
- 해당 없는 영역은 건너뛴다

**T3-Phase1** (T1 완료 후 즉시 시작):
- 성장 곡선 분석: 커브 피팅 (선형/다항식/지수) → 최적 모델 선택 (R² 비교)
- 전투 공식 역산: 데미지 공식 구조 추론 + 계수 역산

**T3-Phase2** (T2 데이터테이블 수신 후 시작):
- 경제 순환 분석: 유입/유출 매핑 + 싱크/소스 비율
- 확률 시뮬레이션: 기대값 + 누적확률 + 비용 분석

**Chart.js 설정 블록 형식:**
각 차트는 canvasId, chartType, data (labels+datasets), options (COMMON_OPTIONS 기반)를 포함해야 한다.
색상 테마: 기존 CSS 변수 (--accent-blue, --accent-purple, --accent-green, --accent-orange, --accent-pink, --accent-cyan) 활용.

**핸드오프:**
- C→D: 수치 분석 결과 4종 → html-builder (SendMessage)

**산출물**: `assets/templates/numerical-analysis-template.md` 형식
**참조**: `references/numerical-analysis-guide.md`, `references/chartjs-reference.md`

---

### Phase 3: 조립 & 리뷰

#### 3A. HTML 조립 (html-builder)

**도구**: Read, Write
**입력**: 6개 문서 (system-analyst) + 수치 분석 결과 (data-analyst) + 장르 섹션
**출력**: 단일 HTML 파일 `{game}-{system}-reverse-gdd.html`

**조립 순서:**
1. `assets/templates/html-output-spec.md` 기반 HTML 골격 생성
2. system-analyst의 7개 문서를 sec1~sec7에 배치
3. 리서치 브리프를 sec8에 배치
4. 수치 분석 결과 + Chart.js 차트를 sec9에 배치
5. 장르별 추가 섹션을 sec10에 배치 (조건부)
6. Mermaid CDN + Chart.js CDN 모두 포함
7. 화이트 비즈니스 테마 적용

**CDN 로드 순서:**
```html
<!-- Mermaid 먼저 -->
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<script>mermaid.initialize({ startOnLoad: true, theme: 'neutral' });</script>
<!-- Chart.js 이후 -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3.0.1/dist/chartjs-plugin-annotation.min.js"></script>
```

**참조**: `assets/templates/html-output-spec.md`, `references/chartjs-reference.md`

#### 3B. 검증

1. `scripts/validate-rgdd.sh` 자동 실행
2. `references/quality-checklist.md` 기반 품질 점검
3. Chart.js canvas 렌더링 확인
4. Mermaid 다이어그램 렌더링 확인
5. 실패 시: html-builder에게 수정 요청 → 재조립 → 재검증

#### 3C. 유저 리뷰

HTML 파일 경로를 유저에게 전달하고 최종 피드백 수렴.
필요 시 수정 사항 반영.

---

## 에이전트 간 데이터 핸드오프 요약

| 경로 | 전달 방법 | 전달 내용 | 형식 |
|------|----------|----------|------|
| A→B | SendMessage | 리서치 브리프 | `web-research-brief-template.md` 준수 |
| A→C | SendMessage | 수치 데이터 포인트 (확률/비용/레벨/경제/공식) | 구조화된 데이터 블록 |
| B→C | SendMessage | 데이터 테이블 구조 (스키마, 밸런싱 공식, 범위) | Markdown 테이블 |
| B→D | SendMessage | 6개 문서 완성본 (Markdown + Mermaid) | 문서별 분리 전송 |
| C→D | SendMessage | 수치 분석 결과 + Chart.js 설정 JSON 블록 | 영역별 분석 보고서 |

---

## 시각화 사용 기준

| 시각화 대상 | Chart.js | Mermaid |
|------------|----------|---------|
| 수치 데이터 (축 있음) | Line, Bar, Scatter | - |
| 성장 곡선 / 추세선 | Line + Scatter | - |
| 확률 분포 | Bar, Line (누적) | - |
| 경제 유입/유출 | Stacked Bar, Doughnut | - |
| 다차원 비교 | Radar | quadrantChart |
| 시스템 구조 | - | graph LR |
| 유저 행동 흐름 | - | flowchart TD |
| 상태 전이 | - | stateDiagram-v2 |
| 데이터 관계 | - | erDiagram |
| 범위 시각화 | - | mindmap |
| 시간 순서 / 처리 흐름 | - | sequenceDiagram |

---

## Quick Reference: 다이어그램 매핑

| 문서 | 다이어그램 | 유형 | 필수 | 핵심 제약 |
|------|----------|------|------|----------|
| 정의서 | `mindmap` | 범위 & 관련 시스템 | 필수 | 깊이 3단계, 루트=시스템명 |
| 정의서 | `sequenceDiagram` | 핵심 인터랙션 | 필수 | 3~5 액션, Happy Path만 |
| 구조도 | `graph LR` | 시스템 구조도 | 필수 | 노드 15개 이하, subgraph `direction LR` |
| 플로우차트 | `flowchart TD` | 유저 액션 플로우 | 필수 | 노드 15개 이하, 조건 분기 포함 |
| 상세명세 | `stateDiagram-v2` | 상태 전이 | 필수 | 노드 12개 이하, `direction LR` |
| 상세명세 | `sequenceDiagram` | 연출 레이어 타이밍 | 조건부 | 주요 연출이 있을 때만 |
| 데이터테이블 | `erDiagram` | 테이블 관계 | 필수 | `layoutDirection: 'LR'`, `mermaid-tall` |
| 데이터테이블 | `pie` | 확률/분포 시각화 | 조건부 | 확률 컬럼 있을 때만, 6세그먼트 이하 |
| 데이터테이블 | `xychart-beta` | 밸런싱 곡선 | 조건부 | 밸런싱 공식 있을 때만 |
| 예외처리 | `sequenceDiagram` | 에러 처리 시퀀스 | 필수 | 시나리오별 분리, `+`/`-` 단축 |
| 예외처리 | `quadrantChart` | 예외 우선순위 | 필수 | 사분면 `"따옴표"`, 데이터=영문ID |
| 예외처리 | `flowchart TD` | 예외 플로우 | 필수 | 핵심 예외만 |
| 비교분석 | `quadrantChart` | 설계 포지셔닝 | 필수 | 게임명=영문ID (Game-A) |
| 비교분석 | `pie` | 분포 비교 | 조건부 | 보상/확률 분포 있을 때만 |

---

## 장르 커스터마이징

시스템명에서 장르 자동 감지 → 유저 확인 후 장르별 추가 섹션 자동 적용:

| 장르 | 감지 키워드 (1차) | 추가 분석 | 전용 Chart.js |
|------|-----------------|----------|--------------|
| RPG | 레벨, 스킬, 장비, 강화 | 성장 밸런스 | 경험치 곡선 (Line) |
| 가챠/수집형 | 가챠, 뽑기, 소환, 천장 | 천장 시뮬레이션 | 확률 분포 (Bar+Line) |
| 전략 | 자원, 건설, 병력, 전략 | 자원 균형 | 생산/소비 (Stacked Bar) |
| 액션/격투 | 콤보, 프레임, 히트박스 | 프레임 데이터 | 프레임 비교 (Bar) |
| 라이브서비스 | 시즌, 배틀패스, 이벤트 | 시즌 순환 | 보상 가치 (Line) |
| 경제중심 | 거래소, 경매, 마켓, 시세 | 경제 순환 심층 | 유입/유출 (Stacked Bar) |
| MOBA/경쟁 | 매칭, MMR, 랭크, 밴픽 | 밸런스 메타 | 승률/픽률 (Scatter) |
| 방치형 | 방치, 오프라인, idle, AFK | 시간효율 | 시간당 효율 (Line) |
| 시뮬레이션 | 경영, 타이쿤, 시뮬레이션 | 변수 분석 | 영향도 (Radar) |
| 배틀로얄 | 배틀로얄, 서바이벌, 서클 | 전투 밀도 | 생존 곡선 (Line) |

**다중 장르 처리:**
- 키워드 매칭 점수 3점 이상인 장르를 모두 포함 (1차=3점, 2차=2점, 3차=1점)
- 시스템과 가장 직접 관련된 장르의 섹션을 먼저 배치
- 유사한 차트가 있으면 통합

**참조**: `references/genre-customization.md`, `assets/templates/genre-sections-template.md`

---

## Quick Reference: 필수 구성 체크리스트

| # | 산출물 | 필수 여부 | 담당 에이전트 | HTML 배치 |
|---|--------|-----------|-------------|----------|
| 1 | 정의서 | 필수 | system-analyst | sec1 |
| 2 | 구조도 (Mermaid) | 필수 | system-analyst | sec2 |
| 3 | 플로우차트 (Mermaid) | 필수 | system-analyst | sec3 |
| 4 | 상세 명세서 | 필수 | system-analyst | sec4 |
| 5 | 데이터 테이블 | 필수 | system-analyst | sec5 |
| 6 | 예외 처리 명세 | 필수 | system-analyst | sec6 |
| 7 | 비교 분석 보고서 | 권장 | system-analyst | sec7 |
| 8 | 리서치 브리프 | 필수 | web-researcher | sec8 |
| 9 | 수치 분석 + Chart.js | 필수 | data-analyst | sec9 |
| 10 | 장르별 추가 분석 | 조건부 | data-analyst | sec10 |

---

## 에러 처리 & 폴백

### 웹 리서치 실패 시

| 실패 유형 | 폴백 전략 | 최종 대안 |
|-----------|----------|----------|
| 검색 결과 부족 | 쿼리 변형 (한글↔영문, 약어↔풀네임) | [추정] 표기 후 진행 |
| WebFetch 실패 | URL 대안 시도 (공식위키→나무위키→Fandom→GameWith) | 검색 결과 스니펫만으로 진행 |
| 수치 데이터 부족 | 유튜브/데이터마이닝 사이트 검색 | system-analyst에게 부족 항목 전달 |
| 경쟁작 정보 부재 | 장르 키워드로 확장 검색 | 생략 후 진행 (필수 아님) |

### 에이전트 간 통신 실패 시

| 실패 유형 | 대응 방법 |
|-----------|----------|
| SendMessage 미수신 | TaskUpdate로 상태 확인 후 재전송 (최대 2회) |
| 데이터 형식 불일치 | 템플릿 기반 표준 형식으로 재구조화 후 재전송 |
| 부분 데이터만 수신 | 수신된 부분 먼저 처리 + 미수신 항목 재요청 |
| 에이전트 응답 지연 | 타임아웃 후 가용 데이터로 진행 + [미완] 표기 |

### 문서 작성 실패 시

| 실패 유형 | 대응 방법 |
|-----------|----------|
| Mermaid 구문 에러 | 구문 검증 후 수정, 최대 3회 재시도 |
| Chart.js 데이터 부족 | 해당 차트 생략 + HTML 주석으로 사유 기록 |
| 품질 기준 미달 | quality-checklist.md L1 재검증 → 미달 항목 보완 |
| HTML 렌더링 에러 | 브라우저 콘솔 에러 확인 → 해당 블록 수정 |

---

## 산출물 품질 기준

| 산출물 | 담당 에이전트 | 최소 기준 | 우수 기준 |
|--------|-------------|----------|----------|
| 리서치 브리프 | web-researcher | 5개 카테고리 중 3개 이상 데이터 수집 | 전체 카테고리 + 신뢰도 등급 부여 |
| 6개 핵심 문서 | system-analyst | 모든 필수 항목 충족 (L1 체크리스트) | L2 품질 체크리스트 80% 이상 통과 |
| 수치 분석 | data-analyst | 4대 영역 중 1개 이상 분석 완료 | 해당 전체 영역 + Chart.js 시각화 |
| HTML 산출물 | html-builder | Mermaid + Chart.js 렌더링 정상 | 장르별 추가 섹션 + 반응형 레이아웃 |

**산출물 파일:** `output/{game}-{system}-reverse-gdd.html` (최종 단일 HTML) + 중간 산출물 (`research-brief.md`, `docs/01~06-*.md`, `analysis/*.json`)

---

## Common Mistakes (핵심 경고)

1. **범위 과대**: "전투 시스템 전체" 대신 "스킬 쿨타임 시스템"처럼 좁혀라
2. **감상문 작성**: "재미있다" 대신 구현 스펙을 적어라
3. **데이터 없는 명세**: "확률이 낮다" 대신 "확률 0.6%"로 적어라
4. **예외 처리 누락**: Happy Path만 적으면 기획서가 아닌 튜토리얼이다
5. **추정 미표기**: 웹 리서치 데이터에 출처/신뢰도 미표기 시 신뢰 불가
6. **수치 분석 누락**: Chart.js 시각화 없이 텍스트만으로 수치 설명하면 깊이 부족

**상세:** `references/common-mistakes.md`

---

## Resources

| 리소스 | 경로 | 용도 |
|--------|------|------|
| 팀 아키텍처 | `references/team-architecture.md` | 에이전트 팀 조율 프로토콜 |
| 웹 리서치 가이드 | `references/web-research-guide.md` | 웹 리서치 방법론 |
| 수치 분석 가이드 | `references/numerical-analysis-guide.md` | 4대 수치 분석 방법론 |
| 장르 커스터마이징 | `references/genre-customization.md` | 장르 감지 & 추가 섹션 |
| Chart.js 레퍼런스 | `references/chartjs-reference.md` | Chart.js 설정/템플릿 |
| 에이전트 태스크 가이드 | `references/step-guide-complete.md` | 각 태스크별 작성 방법 |
| 시스템 분류표 | `references/system-categories.md` | 범위 선정 + 장르 매핑 |
| 흔한 실수 | `references/common-mistakes.md` | 품질 경고 |
| 품질 체크리스트 | `references/quality-checklist.md` | 검증 |
| 다이어그램 표기법 | `references/flowchart-notation.md` | Mermaid 표기법 |
| 리서치 브리프 템플릿 | `assets/templates/web-research-brief-template.md` | web-researcher 산출물 |
| 수치 분석 템플릿 | `assets/templates/numerical-analysis-template.md` | data-analyst 산출물 |
| 장르 섹션 템플릿 | `assets/templates/genre-sections-template.md` | 장르별 HTML 블록 |
| 정의서 템플릿 | `assets/templates/definition-doc-template.md` | 정의서 |
| 구조도 스펙 | `assets/templates/structure-diagram-spec.md` | 구조도 |
| 플로우차트 스펙 | `assets/templates/flowchart-spec.md` | 플로우차트 |
| 상세 명세서 템플릿 | `assets/templates/detail-spec-template.md` | 상세 명세서 |
| 데이터 테이블 스펙 | `assets/templates/data-table-spec.md` | 데이터 테이블 |
| 예외 처리 스펙 | `assets/templates/exception-handling-spec.md` | 예외 처리 |
| 비교 분석 스펙 | `assets/templates/review-comparison-spec.md` | 비교 분석 |
| HTML 출력 스펙 | `assets/templates/html-output-spec.md` | HTML 단일파일 출력 |
| PPT 구성 가이드 | `assets/ppt-structure.md` | 발표 자료 |
| 검증 스크립트 | `scripts/validate-rgdd.sh` | 완성도 검증 |

---

## Troubleshooting

### "범위를 어떻게 좁혀야 할지 모르겠어요"
→ `references/system-categories.md`의 하위 시스템 목록 참조. "하나의 팝업/화면에서 완결되는 기능" 수준이 적정.

### "웹 리서치로 데이터를 충분히 못 구했어요"
→ `references/web-research-guide.md`의 폴백 전략 참조. 한글→영문, 약어→정식명칭 교차, 나무위키→Fandom→GameWith 순 탐색. 부족한 데이터는 [추정] 표기.

### "수치 분석이 해당 시스템에 맞지 않아요"
→ 4대 영역 중 해당되는 것만 수행. 최소 1개 영역은 반드시 분석. 해당 없는 영역은 건너뛴다.

### "장르를 모르겠어요"
→ `references/genre-customization.md`의 키워드 매칭으로 자동 감지. 불확실하면 유저에게 확인.

### "문서가 너무 길어지는데?"
→ 범위가 넓을 가능성이 높다. Phase 0으로 돌아가 범위를 재조정한다.
