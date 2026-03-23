# GDC 인사이트 요약 (GDC Insights Summary)

Damion Schubert (BioWare Austin)의 GDC 2007/2008 강연 "How to Write a Great Design Document"에서 추출한 핵심 원칙과 이 프로젝트에의 적용 방법을 정리합니다.

> 전문: `Reference/게임 기획서 작성법 (Damion Schubert GDC).md`

---

## 1. 기획서 작성 12가지 규칙

### Rule 1: 독자를 파악하라 (Know Your Target)

원칙: 프로그래머가 가장 중요한 독자. 실제 게임을 구현하는 사람이기 때문.

적용:
- 모든 GDD는 "구현 가능한 수준"으로 작성
- Action → Reaction → Effect 형식으로 메커닉 서술
- 프로그래머에게 필요한 정보: 조건, 수치, 예외 처리
- 불필요한 배경 설명보다 규칙과 파라미터에 집중

### Rule 2: 짧게 써라 (Keep It Short)

원칙: 짧은 문서는 읽기 쉽고, 관리하기 편하고, 모순이 적다.

적용:
- 5단계 구조로 핵심만 간결하게
- 범위 과대(CM-01) 시 하위 시스템 분리
- 한 문서에 한 시스템
- 파라미터는 YAML/CSV로 분리하여 본문 간결 유지

### Rule 3: 우선순위를 정하라 (Prioritize)

원칙: 5단계 구현 우선순위 - Must Have, Should Have, Could Have, Won't Have, Wish List

적용:
- 기능 ID에 우선순위 P1/P2/P3 명시
- 구현 현황 테이블로 진행 상태 추적
- MVP 먼저 정의, 확장 기능은 별도 섹션

### Rule 4: 그림으로 설명하라 (Illustrate)

원칙: 그림 한 장이 천 마디보다 낫다. UI는 그림 필수.

적용:
- Mermaid 다이어그램 필수 (SYS: flowchart + stateDiagram)
- WLD: 존 연결도 (graph LR)
- UI: 레이아웃 다이어그램 + 상태 전이도
- ASCII 와이어프레임으로 빠른 레이아웃 스케치

### Rule 5: 남의 일을 지시하지 마라 (Don't Tell Others How to Do Their Jobs)

원칙: 기획서는 "무엇을(What)"을 정의하지, "어떻게(How)"는 각 팀의 영역.

적용:
- 구현 세부사항 (렌더링 방식, 데이터 구조 등) 지정 금지
- "빨간 파티클이 위로 솟구친다" (O) vs "GPU 파티클 시스템으로 구현한다" (X)
- 기획 의도와 플레이어 경험에 집중

### Rule 6: 유저 스토리를 활용하라 (Use User Stories)

원칙: INVEST - Independent, Negotiable, Valuable, Estimable, Small, Testable

적용:
- "플레이어는 [상황]에서 [행동]하여 [결과]를 얻는다" 형식
- 각 메커닉에 최소 1개 유저 스토리
- 테스트 가능한 수준으로 구체적 작성

예시:
- "플레이어는 Item World 10층 보스를 처치하면(상황), 세이브포인트가 활성화되고(행동/결과), 계속 진행하거나 귀환을 선택할 수 있다(선택)"

### Rule 7: 코드와 콘텐츠를 분리하라 (Separate Code from Content)

원칙: 시스템(코드)과 데이터(콘텐츠)를 분리하면 변경이 쉬워진다.

적용:
- System_*.md: 시스템 로직 (코드)
- Content_*.md + CSV: 데이터 (콘텐츠)
- 수치는 YAML/CSV로 분리 (SSoT 원칙)
- 데이터 변경만으로 밸런스 조정 가능하도록 설계

### Rule 8: 형식을 갖춰라 (Good Formatting)

원칙: 일관된 형식은 검색과 참조를 쉽게 한다.

적용:
- 헤더: 한글 + 괄호 영문
- 헤더 깊이: 최대 4단계
- 테이블, 코드 블록, Mermaid 일관 사용
- 기능 ID: [PREFIX]-[NUMBER]-[LETTER]
- 구현 현황 테이블 표준화

### Rule 9: 용어를 명확히 하라 (Clear Terminology)

원칙: 같은 것을 여러 이름으로 부르면 혼란. 용어집 필수.

적용:
- 공식 용어 고정: Item World, Innocent, Wild/Tamed, 3-Space
- 모호한 표현 금지: "아마도", "할 수도 있다", "적절히"
- 새 용어 도입 시 첫 등장에서 정의

### Rule 10: 중복을 없애라 (Kill Redundancy)

원칙: 같은 내용이 여러 곳에 있으면 업데이트 시 모순 발생.

적용:
- SSoT (Single Source of Truth) 원칙
- 수치 데이터는 CSV에만 존재, 문서는 링크로 참조
- 시스템 간 중복 설명 → 상호참조 링크로 대체

### Rule 11: 약한 표현을 쓰지 마라 (No Weak Language)

원칙: "~일 수 있다", "~해야 할 것이다" 같은 표현은 불확실성을 만든다.

적용:
- "플레이어는 점프할 수 있을 것이다" (X)
- "플레이어는 스페이스바를 눌러 점프한다" (O)
- 확정되지 않은 사항은 "미정(TBD)" 또는 "논의 필요"로 명시

### Rule 12: 결정의 이유를 남겨라 (Capture Reasoning)

원칙: "무엇을"만 적으면 나중에 "왜"를 몰라 잘못 수정한다.

적용:
- Stage 1 Concept의 Intent / Reasoning 섹션
- Cursed Problem Check으로 트레이드오프 기록
- Risk & Reward로 양면 분석
- 기각된 대안도 간략히 기록 (반복 논의 방지)

---

## 2. 리드를 위한 10가지 조언

### Tip 1: 반복 설계를 수용하라 (Embrace Iterative Design)

적용: 문서 상태를 `작성 중 (Draft)` → `진행 중 (Living)` → `완료 (Stable)`로 관리. 처음부터 완벽하지 않아도 됨.

### Tip 2: 검색 가능하게 만들어라 (Make It Searchable)

적용: 일관된 헤더 형식, 기능 ID, 태그로 빠른 검색. Grep으로 검색 가능한 구조.

### Tip 3: 자동화하라 (Automate)

적용: validator가 자동 품질 검증. CSV 스캐폴더가 데이터 스켈레톤 자동 생성.

### Tip 4: 협업 프로세스를 만들라 (Collaborative Process)

적용: 설계 코칭으로 의도 검증 → 작성 → 리뷰. 후속 질문 Q1/Q2/Q3로 깊은 논의 유도.

### Tip 5: 킥오프 미팅의 3가지 질문 (Kickoff Meeting)

원칙: 새 시스템 시작 시 3가지 질문
1. "이 기능의 목표는 무엇인가?"
2. "이 기능이 플레이어에게 주는 감정은?"
3. "이 기능의 MVP는?"

적용: Stage A 의도 검증에서 이 3가지 질문 활용.

### Tip 6: 승인 프로세스 (Approval Process)

적용: L1 필수 체크리스트 통과 → L2 권장 확인 → 리뷰 제안 → 승인.

### Tip 7: 전문가 자문 (Expert Consultation)

적용: reference-scout가 관련 레퍼런스 자동 매칭. 코칭 질문 뱅크로 다각도 검증.

### Tip 8: 진행 상황 시각화 (Visual Progress Tracking)

적용: 구현 현황 테이블의 상태 컬럼 (작성 중 / 진행 중 / 완료 / 개선 필요).

### Tip 9: 변경 프로세스 (Change Process)

적용: 문서 상태 관리, 메타데이터의 최근 업데이트 날짜, 변경 이력.

### Tip 10: 주기적 감사 (Audit Periodically)

적용: quality-checklist로 정기 검증. L1/L2/L3 등급 추적.

---

## 3. 이 프로젝트 특화 적용 매트릭스

| GDC 규칙 | 스킬 적용 위치 | 구현 방법 |
| :--- | :--- | :--- |
| Rule 1 (독자 파악) | 5단계 구조 Stage 2-3 | Action/Reaction/Effect, Condition/Process/Result |
| Rule 2 (짧게) | common-mistakes CM-01 | 범위 과대 감지 + 분리 제안 |
| Rule 3 (우선순위) | 구현 현황 테이블 | P1/P2/P3 + 기능 ID |
| Rule 4 (그림) | mermaid-guide | 문서 유형별 필수 다이어그램 |
| Rule 5 (남의 일 금지) | writing-rules | "What" 정의, "How" 배제 |
| Rule 6 (유저 스토리) | quality-checklist L2 | INVEST 형식 유저 스토리 |
| Rule 7 (코드/콘텐츠 분리) | SSoT 원칙 | System_*.md + Content_*.csv 분리 |
| Rule 8 (형식) | writing-rules | 헤더/테이블/코드블록 표준 |
| Rule 9 (용어) | common-mistakes CM-03 | 모호한 표현 금지, 용어 고정 |
| Rule 10 (중복 제거) | SSoT + 상호참조 | CSV는 한 곳, 문서는 링크 |
| Rule 11 (약한 표현 금지) | common-mistakes CM-03 | 금지어 목록 자동 감지 |
| Rule 12 (이유 기록) | Stage 1 Concept | Intent, Reasoning, Cursed Problem |
| Tip 1 (반복 설계) | 문서 상태 관리 | Draft → Living → Stable |
| Tip 3 (자동화) | validator | 자동 품질 검증 |
| Tip 5 (킥오프 3질문) | design-coaching Q1-Q5 | 의도 검증 코칭 |
| Tip 10 (감사) | quality-checklist | L1/L2/L3 정기 검증 |
