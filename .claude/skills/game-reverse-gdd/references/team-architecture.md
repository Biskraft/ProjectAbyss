# 에이전트 팀 아키텍처

> 4인 에이전트 팀의 역할 분담, 태스크 의존성, 데이터 핸드오프 프로토콜을 정의한다.

---

## 팀 구성

| 에이전트 | 역할 | 도구 | Phase |
|---------|------|------|-------|
| **web-researcher** | 웹 리서치 | WebSearch, WebFetch | Phase 2A |
| **system-analyst** | 시스템 분석 (6개 문서 작성) | Read, Grep, Glob | Phase 2B |
| **data-analyst** | 수치 분석 (4대 영역) | Read, Bash (계산) | Phase 2B-C |
| **html-builder** | HTML 조립 | Read, Write | Phase 3 |

### 역할 상세

#### web-researcher
- 게임명 + 시스템명에 대한 포괄적 웹 리서치 수행
- 5개 카테고리(기본 정보, 커뮤니티, 수익, 업데이트, 경쟁작)에 걸친 데이터 수집
- 신뢰도 등급(A~E)을 부여한 리서치 브리프 작성
- web-research-guide.md에 정의된 쿼리 전략 및 폴백 전략 준수

#### system-analyst
- 리서치 브리프를 기반으로 6개 핵심 문서 작성
- 각 문서에 적합한 Mermaid 다이어그램 포함
- step-guide-complete.md의 10단계 가이드 준수
- quality-checklist.md 기반 자체 품질 검증

#### data-analyst
- 수치 데이터를 기반으로 4대 영역(성장 곡선, 전투 공식, 경제 순환, 확률 시뮬레이션) 분석
- Bash를 활용한 수치 계산 및 통계 분석
- Chart.js 설정 블록 생성 (chartjs-reference.md 준수)
- numerical-analysis-guide.md의 방법론 준수

#### html-builder
- 6개 문서 + 수치 분석 결과를 단일 HTML 파일로 통합
- Mermaid 렌더링 + Chart.js 렌더링이 모두 정상 동작하도록 조립
- 장르별 추가 섹션 포함 (genre-customization.md 참조)
- validate-rgdd.sh 실행하여 산출물 검증

---

## 태스크 의존성 체인

### 의존성 다이어그램 (텍스트)

```
T1(웹 리서치)
├──→ T2(시스템 분석: 6개 문서)
└──→ T3-Phase1(수치 분석: 성장 곡선 + 전투 공식)

T2(데이터테이블 완성)
└──→ T3-Phase2(수치 분석: 경제 순환 + 확률 시뮬레이션)

T2(완료) + T3(완료)
└──→ T4(HTML 조립)

T4(완료)
└──→ T5(검증: validate-rgdd.sh)

T5(통과)
└──→ T6(유저 최종 리뷰)
```

### 의존성 규칙

| 태스크 | 선행 조건 | 시작 가능 시점 | 산출물 |
|--------|----------|--------------|--------|
| T1 | 유저 입력(게임명, 시스템명) | Phase 2A 시작 즉시 | 리서치 브리프 + 수치 데이터 |
| T2 | T1 완료 (리서치 브리프 수신) | T1 SendMessage 수신 후 | 6개 Markdown 문서 |
| T3-P1 | T1 완료 (수치 데이터 수신) | T1 SendMessage 수신 후 | 성장 곡선 + 전투 공식 분석 |
| T3-P2 | T2 데이터테이블 완료 | T2 데이터테이블 SendMessage 수신 후 | 경제 순환 + 확률 시뮬레이션 |
| T4 | T2 전체 완료 + T3 전체 완료 | 양쪽 모두 SendMessage 수신 후 | 단일 HTML 파일 |
| T5 | T4 완료 | HTML 파일 생성 후 | 검증 결과 리포트 |
| T6 | T5 통과 | 검증 통과 후 | 유저 피드백 |

### 병렬 실행 규칙
- T2와 T3-Phase1은 **동시 실행** 가능 (둘 다 T1에만 의존)
- T3-Phase2는 T2의 데이터테이블 산출물이 **반드시** 필요 (스키마, 밸런싱 공식 참조)
- T4는 T2와 T3 모두 완료된 후에만 시작 (부분 조립 불가)

---

## 에이전트 간 데이터 핸드오프

### A→B: 리서치 브리프 (web-researcher → system-analyst)

**전달 방법**: SendMessage
**형식**: web-research-brief-template.md 준수

포함 항목:

1. **게임 개요**
   - 장르 (감지된 장르 포함)
   - 개발사 / 배급사
   - 출시일 / 서비스 상태
   - 플랫폼 (PC, 모바일, 콘솔)
   - 현재 버전 / 최근 업데이트 날짜

2. **시스템 공식 설명**
   - 공식 문서/위키 기반 시스템 설명
   - 패치노트에서 발견된 변경 이력
   - 공식 가이드/튜토리얼 내용

3. **커뮤니티 반응**
   - Reddit 분석글 요약 (핵심 인사이트)
   - 포럼/커뮤니티 의견 (긍정/부정 분류)
   - 유저 발견 히든 메커니즘

4. **경쟁작 정보**
   - 유사 시스템을 가진 게임 (2~3개)
   - 차별점 / 공통점

5. **핵심 수치 데이터**
   - 확률 데이터 (가챠율, 강화 성공률, 드랍률)
   - 비용 데이터 (재화 가격, 강화 비용)
   - 레벨 데이터 (경험치 테이블, 스탯 성장)

### A→C: 수치 데이터 포인트 (web-researcher → data-analyst)

**전달 방법**: SendMessage
**형식**: 구조화된 데이터 블록

포함 항목:

1. **확률 데이터**
   - 가챠 등급별 확률 (예: SSR 1.5%, SR 10%, R 88.5%)
   - 강화 성공/실패/파괴 확률 (단계별)
   - 드랍 확률 (보스/던전/필드별)
   - 천장 시스템 정보 (천장값, 소프트/하드 천장)

2. **비용 데이터**
   - 1회 가챠 비용 (무료 재화, 유료 재화)
   - 강화 비용 곡선 (단계별 재화/재료 소모량)
   - 캐시 → 재화 환율 (예: $1 = 60 젬)

3. **레벨 데이터**
   - 경험치 요구량 테이블 (레벨별)
   - 스탯 성장 계수 (레벨당 공격력/HP 증가량)
   - 한계돌파/초월 후 성장 변화

4. **경제 수치**
   - 일일 재화 수급량 (소스별: 일일퀘, 던전, 출석 등)
   - 주간/월간 고정 수입 (주간보스, 월간보상 등)
   - 주요 소모처별 비용 (강화, 가챠, 상점 등)

5. **공식/계산 정보**
   - 데미지 공식 (공개된 경우)
   - 버프/디버프 계수 (가산/승산 구분)
   - 스탯 계산 공식 (기본스탯 + 장비 + 버프)

### B→C: 데이터 테이블 구조 (system-analyst → data-analyst)

**전달 방법**: SendMessage
**전달 시점**: 데이터테이블 문서 완성 시 (T2 부분 완료)

포함 항목:

1. **스키마 정보**
   - 테이블명 / 컬럼 정의 (이름, 타입, 설명)
   - 기본키(PK) / 외래키(FK) 관계
   - 필수/선택 컬럼 구분

2. **밸런싱 공식**
   - 수식 (예: `exp_required = base × level^1.5`)
   - 계수 값 (기울기, 절편, 지수 등)
   - 적용 범위 (레벨 1~50, 강화 +1~+15 등)

3. **범위/경계 정보**
   - 최대값 / 최소값 (스탯 상한/하한)
   - 소프트캡 / 하드캡 존재 여부 및 수치
   - 단계별 구간 (예: 일반 1~10, 고급 11~20)

### B→D: 6개 문서 완성본 (system-analyst → html-builder)

**전달 방법**: SendMessage
**형식**: Markdown + Mermaid 코드 블록 포함

| 문서 | Mermaid 다이어그램 | 용도 |
|------|-------------------|------|
| 정의서 | mindmap + sequenceDiagram | 시스템 개념 구조 + 핵심 인터랙션 |
| 구조도 | graph LR | 시스템 컴포넌트 관계 |
| 플로우차트 | flowchart TD | 유저 행동 흐름 |
| 상세명세서 | stateDiagram-v2 | 상태 전이 |
| 데이터테이블 | erDiagram + pie/xychart | 데이터 관계 + 분포 |
| 예외처리 | quadrantChart + sequenceDiagram | 우선순위 매핑 + 처리 흐름 |

### C→D: 수치 분석 결과 (data-analyst → html-builder)

**전달 방법**: SendMessage
**형식**: 분석 요약 Markdown + Chart.js 설정 JSON 블록

| 분석 영역 | 포함 내용 | Chart.js 타입 |
|-----------|----------|--------------|
| 성장 곡선 | 커브 피팅 결과 + 모델 수식 + R² 값 | Line (추세선) + Scatter (실측치) |
| 전투 공식 | 역산 공식 + 계수 + 검증 결과 | Scatter (데이터) + Bar (비교) |
| 경제 순환 | 유입/유출 맵핑 + 싱크/소스 비율 | Stacked Bar + Doughnut + Line |
| 확률 시뮬레이션 | 기대값 + 누적확률 + 비용 분석 | Bar (히스토그램) + Line (누적) |

각 Chart.js 설정 블록은 다음을 포함해야 한다:
- `canvasId`: HTML canvas 요소 ID
- `chartType`: Chart.js 차트 타입
- `data`: labels + datasets (chartjs-reference.md 색상 테마 준수)
- `options`: COMMON_OPTIONS 기반 커스터마이징

---

## Phase별 실행 흐름

### Phase 0: 입력 & 장르 감지 (리더)

1. **유저 입력 수집** (AskUserQuestion)
   - 게임명 확인
   - 시스템명 확인
   - 추가 요구사항 (선택)

2. **장르 자동 감지** (genre-customization.md 참조)
   - 게임명/시스템명 키워드 매칭
   - 10개 장르 중 해당 장르 식별
   - 다중 장르 해당 시 모두 기록

3. **유저 확인** (AskUserQuestion)
   - 감지된 장르 표시
   - 유저 승인 또는 수정
   - **이 시점이 유일한 유저 인터랙션 포인트** (이후 자동 진행)

### Phase 1: 팀 생성 & 태스크 분배 (리더)

1. **팀 생성**
   ```
   TeamCreate(team_name: "rgdd-{game}-{system}")
   ```

2. **에이전트 4인 생성**
   ```
   AgentCreate × 4 (general-purpose)
   - web-researcher
   - system-analyst
   - data-analyst
   - html-builder
   ```

3. **태스크 생성 & 의존성 설정**
   ```
   TaskCreate: T1 (웹 리서치) → owner: web-researcher
   TaskCreate: T2 (시스템 분석) → depends: T1 → owner: system-analyst
   TaskCreate: T3 (수치 분석) → depends: T1, T2(partial) → owner: data-analyst
   TaskCreate: T4 (HTML 조립) → depends: T2, T3 → owner: html-builder
   TaskCreate: T5 (검증) → depends: T4
   TaskCreate: T6 (유저 리뷰) → depends: T5
   ```

4. **작업 시작 신호**
   ```
   TaskUpdate(T1, status: in_progress)
   SendMessage(to: web-researcher, "작업을 시작하세요")
   ```

### Phase 2: 병렬 실행

#### 2A: 웹 리서치 (web-researcher)
- T1 실행: web-research-guide.md 방법론에 따른 리서치
- 산출물: 리서치 브리프 + 수치 데이터 포인트
- 완료 시:
  ```
  SendMessage(to: system-analyst, 리서치 브리프)
  SendMessage(to: data-analyst, 수치 데이터 포인트)
  TaskUpdate(T1, status: completed)
  ```

#### 2B: 시스템 분석 + 수치 분석 Phase1 (동시 시작)

**system-analyst (T2):**
- 리서치 브리프 수신 후 6개 문서 순차 작성
- 데이터테이블 완성 시 data-analyst에게 즉시 전달:
  ```
  SendMessage(to: data-analyst, 데이터 테이블 구조)
  ```
- 6개 문서 전체 완료 시:
  ```
  SendMessage(to: html-builder, 6개 문서 완성본)
  TaskUpdate(T2, status: completed)
  ```

**data-analyst (T3-Phase1):**
- 수치 데이터 수신 후 즉시 시작 가능한 분석 수행
- 성장 곡선 분석 (레벨/경험치 데이터만으로 가능)
- 전투 공식 역산 (공격력/데미지 데이터만으로 가능)

#### 2C: 수치 분석 Phase2 (data-analyst)

**data-analyst (T3-Phase2):**
- B→C 데이터 테이블 구조 수신 후 시작
- 경제 순환 분석 (유입/유출 스키마 필요)
- 확률 시뮬레이션 (확률 테이블 + 천장 정보 필요)
- 전체 완료 시:
  ```
  SendMessage(to: html-builder, 수치 분석 결과 4종)
  TaskUpdate(T3, status: completed)
  ```

### Phase 3: 조립 & 리뷰

#### 3A: HTML 조립 (html-builder)
- T2(6개 문서) + T3(수치 분석 결과) 수신 확인
- 단일 HTML 파일로 통합 조립
- Mermaid 다이어그램 렌더링 확인
- Chart.js 차트 렌더링 확인
- 장르별 추가 섹션 삽입 (genre-customization.md 참조)

#### 3B: 검증 (T5)
- validate-rgdd.sh 실행
- quality-checklist.md 기반 자동 검증
- 실패 시: html-builder에게 수정 요청 → 재조립 → 재검증

#### 3C: 유저 최종 리뷰 (T6)
- 산출물 경로 안내
- 유저 피드백 수집
- 필요 시 수정 사항 반영

---

## 에러 처리 & 폴백

### 웹 리서치 실패 시

| 실패 유형 | 폴백 전략 | 최종 대안 |
|-----------|----------|----------|
| 검색 결과 부족 | 쿼리 변형 (영문↔한글, 약어↔풀네임) | [추정] 표기 후 진행 |
| WebFetch 실패 | URL 대안 시도 (공식 위키 → 나무위키 → Fandom → GameWith) | 검색 결과 스니펫만으로 진행 |
| 수치 데이터 부족 | 유튜브/커뮤니티 데이터마이닝 사이트 검색 | system-analyst에게 부족 항목 목록 전달 |
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
| 수치 분석 | data-analyst | 4대 영역 중 2개 이상 분석 완료 | 전체 영역 + Chart.js 시각화 포함 |
| HTML 산출물 | html-builder | Mermaid + Chart.js 렌더링 정상 | 장르별 추가 섹션 + 반응형 레이아웃 |

### 산출물 파일 구조

```
output/
├── {game}-{system}-reverse-gdd.html    ← 최종 산출물 (단일 HTML)
├── research-brief.md                    ← 리서치 브리프 (중간 산출물)
├── docs/
│   ├── 01-definition.md                 ← 정의서
│   ├── 02-structure.md                  ← 구조도
│   ├── 03-flowchart.md                  ← 플로우차트
│   ├── 04-specification.md              ← 상세명세서
│   ├── 05-data-table.md                 ← 데이터테이블
│   └── 06-exception.md                  ← 예외처리
└── analysis/
    ├── growth-curve.json                ← 성장 곡선 분석 결과
    ├── combat-formula.json              ← 전투 공식 역산 결과
    ├── economy-cycle.json               ← 경제 순환 분석 결과
    └── probability-sim.json             ← 확률 시뮬레이션 결과
```
