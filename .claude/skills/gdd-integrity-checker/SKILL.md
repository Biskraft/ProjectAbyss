---
name: gdd-integrity-checker
description: ProjectZ GDD 문서의 정합성(무결성)을 검증하는 스킬. CSV↔GDD 수치 동기화, 교차 참조 유효성, 5단계 구조 준수, 용어 일관성을 체계적으로 스캔하고 보고합니다. 사용자가 "정합성", "무결성", "체크", "검증", "sync", "동기화" 등의 키워드를 사용하거나, `/sync-check` 워크플로우를 실행할 때 이 스킬을 활용합니다.
---

# GDD Integrity Checker

ProjectZ의 GDD 문서 체계가 건강한 상태인지 **5개 레이어**로 검증하고, 발견된 이슈를 분류·보고합니다.

## 트리거 조건

다음 상황에서 이 스킬을 활성화합니다:

- 사용자가 "정합성", "무결성", "체크", "검증", "sync", "동기화" 키워드를 사용할 때
- `/sync-check` 워크플로우 실행 시 (Layer 1만 실행)
- CSV 파일 또는 GDD 문서 수정 직후 사용자가 검증을 요청할 때
- 주간 디자인 미팅 전 사전 점검 시

## 검증 5개 레이어

### Layer 1 — 수치 동기화 (CSV ↔ GDD)

CSV(SSoT)의 핵심 수치가 GDD 문서 본문/테이블에 정확히 반영되었는지 비교합니다.

- 검증 매핑: `references/csv_gdd_mapping.md` 참조
- 파생 계산값도 포함 (TTK, DPS, 헤드샷 원킬 등)
- CSV 값을 SSoT로 간주하여 불일치 시 GDD 수정을 제안

### Layer 2 — 교차 참조 유효성

문서 간 링크와 섹션 참조가 유효한지 검증합니다.

- GDD 문서 내 `[링크](대상)` 형식의 내부 링크가 실제 파일로 연결되는지 확인
- "§N.N" 형식 섹션 참조가 대상 문서에 실제 존재하는지 확인
- `Document_Index.md`에 모든 `Documents/` 폴더 내 `.md` 파일이 등록되어 있는지 확인
- CSV의 ID 컬럼 값이 GDD에서 참조하는 ID와 일치하는지 확인

### Layer 3 — 필수 항목 점검 (GDD 구조 준수)

`GDD_Writing_Rules.md`의 5단계 구조를 각 `System_*.md` 문서가 준수하는지 탐지합니다.

- 5단계 섹션 존재 확인: Concept(개요), Mechanics(메커닉), Rules(규칙), Parameters(파라미터), Edge Cases(예외)
- 파라미터가 YAML/CSV 코드 블록으로 분리되었는지 (하드코딩 수치 탐지)
- 변경 이력(Changelog) 섹션 존재 여부

### Layer 4 — 용어 일관성

`Glossary.md`의 공식 용어와 폐기 용어를 기준으로 문서 전체를 스캔합니다.

- 폐기 용어 목록: `references/deprecated_terms.md` 참조
- 폐기 용어가 문서에서 발견되면 위치와 대체 용어를 표시
- 공식 영문 ID와 실제 CSV/GDD 사용 ID 불일치 탐지

### Layer 5 — 마크다운 형식 검증

`GDD_Writing_Rules.md` §4.3의 마크다운 형식 제한 규칙을 자동으로 검증합니다.

- 스마트 따옴표 탐지: `"` `"` (U+201C, U+201D) 및 `'` `'` (U+2018, U+2019) 문자가 `.md` 파일에 존재하는지 검색
- 발견 시 해당 파일명, 줄 번호, 내용을 표시하고 직선 따옴표(`"`, `'`)로 교체를 제안
- 검색 방법: `Select-String -Pattern '[\u201c\u201d\u2018\u2019]'` 또는 `grep_search` 활용
- GFM Alert 문법(`> [!NOTE]` 등) 사용 여부도 함께 탐지
- 볼드(`**`) 마크다운 사용 탐지:
  - 검색 패턴: `grep_search`로 `\*\*[^*]+\*\*` (정규식) 검색
  - 허용 예외: `> **` 로 시작하는 blockquote 라벨은 제외 (설계 원칙/포인트용)
  - 탐지 대상: 본문 텍스트, 테이블 셀, 리스트 항목 내의 볼드 사용
  - 발견 시 해당 파일명, 줄 번호, 내용을 표시하고 볼드 마커 제거를 제안

## 프로세스

### Step 1 — 범위 결정

사용자의 요청에서 검증 범위를 판단합니다:

| 요청 예시 | 실행 범위 |
| :--- | :--- |
| "정합성 체크해줘" / "전체 검증" | Layer 1~5 전체 |
| "/sync-check" / "수치 동기화" | Layer 1만 |
| "System_Weapons_Range 체크" | 지정 문서에 대해 Layer 1~5 |
| "용어 체크" / "폐기 용어 검색" | Layer 4만 |
| "형식 체크" / "따옴표 체크" | Layer 5만 |

### Step 2 — 데이터 수집

1. `references/csv_gdd_mapping.md`에서 CSV↔GDD 매핑 테이블을 읽는다
2. 해당 CSV 파일들을 읽어 현재 수치를 추출한다
3. 대응되는 GDD 문서에서 동일 항목을 grep으로 검색한다

### Step 3 — 검증 실행

각 레이어의 상세 규칙은 `references/check_layer_definitions.md`를 참조하여 실행합니다.

- Layer 1: CSV 값 vs GDD 문서 내 테이블/본문 수치 비교
- Layer 2: `grep_search`로 문서 내 링크 추출 → 대상 파일 존재 확인
- Layer 3: `view_file_outline`으로 섹션 헤더 스캔 → 5단계 매칭
- Layer 4: `grep_search`로 폐기 용어 일괄 검색
- Layer 5: `grep_search`로 스마트 따옴표(`[\u201c\u201d\u2018\u2019]`) + GFM Alert(`[!NOTE]` 등) + 볼드(`\*\*`) 검색. blockquote 라벨(`> **`)은 예외 처리

### Step 4 — 보고서 생성

`assets/report_template.md`의 포맷으로 결과를 정리합니다.

- 레이어별 요약 테이블 (통과/불일치/경고)
- 불일치 상세 목록 (위치, 기대값, 실제값)
- 불일치 없으면 "✅ 모든 항목 정합성 확인 (검증 시각: YYYY-MM-DD HH:MM)"

### Step 5 — 수정 (승인 시)

사용자가 수정을 승인하면:

1. CSV를 SSoT로 삼아 GDD 문서를 갱신 (Layer 1)
2. 깨진 링크/섹션 참조를 수정 (Layer 2)
3. 폐기 용어를 현재 용어로 교체 (Layer 4)
4. 스마트 따옴표를 직선 따옴표로 일괄 치환 (Layer 5)
5. 볼드 마커(`**`)를 제거하여 plain text로 변환. blockquote 라벨은 유지 (Layer 5)
6. 수정 후 해당 레이어 재검증

## 참고 자료 경로

| 자료 | 경로 |
| :--- | :--- |
| CSV↔GDD 매핑 | `references/csv_gdd_mapping.md` |
| 레이어별 검증 규칙 | `references/check_layer_definitions.md` |
| 폐기 용어 목록 | `references/deprecated_terms.md` |
| 보고서 템플릿 | `assets/report_template.md` |
| 프로젝트 용어 사전 | `Design/Documents/Terms/Glossary.md` |
| GDD 작성 규칙 | `Design/Documents/Terms/GDD_Writing_Rules.md` |
| 문서 인덱스 | `Design/Documents/Terms/Document_Index.md` |
