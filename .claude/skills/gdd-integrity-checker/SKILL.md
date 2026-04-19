---
name: gdd-integrity-checker
description: ECHORIS GDD 정합성 검증 스킬. Sheets/ CSV ↔ Documents/ GDD 수치 동기화, 교차 참조 유효성, 5단계 구조 준수, 폐기 용어 일관성, 마크다운 형식을 체계적으로 스캔한다. "정합성", "무결성", "체크", "검증", "sync", "동기화" 키워드로 트리거.
---

# GDD Integrity Checker (ECHORIS)

ECHORIS의 GDD 체계가 건강한 상태인지 **5개 레이어**로 검증하고, 발견된 이슈를 분류·보고한다. 1인 개발 컨텍스트를 전제로 하므로 엔터프라이즈급 프로세스가 아니라 실질적 드리프트 탐지에 집중한다.

## 트리거 조건

- 사용자가 "정합성", "무결성", "체크", "검증", "sync", "동기화" 키워드를 사용할 때
- `/sync-check` 슬래시 명령 실행 시 (Layer 1만 실행)
- CSV 또는 GDD 문서 수정 직후 사용자가 검증을 요청할 때
- 커밋 직전 드리프트 확인 시

## 검증 5개 레이어

### Layer 1 — 수치 동기화 (Sheets ↔ Documents)

`Sheets/*.csv`(SSoT)의 수치가 `Documents/` GDD 본문/테이블에 정확히 반영되었는지 비교한다.

- 검증 매핑: `references/csv_gdd_mapping.md` 참조
- 파생 계산값 포함 (레어리티 배율 적용, StrataConfig 누적 승수 등)
- CSV 값을 SSoT로 간주하여 불일치 시 GDD 수정을 제안

### Layer 2 — 교차 참조 유효성

문서 간 링크·섹션 참조·CSV ID 참조가 유효한지 검증한다.

- GDD 내 `[텍스트](경로)` 형식 내부 링크가 실제 파일로 연결되는지 확인
- "§N.N" / "섹션 N.N" 형식 섹션 참조가 대상 문서에 실존하는지 확인
- `Document_Index.md`에 모든 `Documents/` 폴더 내 `.md` 파일이 등록되어 있는지 확인
- GDD에서 참조하는 CSV 컬럼 이름·ID 값이 실제 CSV에 존재하는지 확인 (예: `sword_broken`, `normal`, `Slime`)

### Layer 3 — GDD 구조 준수

`Documents/Terms/GDD_Writing_Rules.md`의 5단계 구조를 각 `System_*.md` 문서가 준수하는지 탐지한다.

- 5단계 섹션 존재 확인: Concept(개요), Mechanics(메커닉), Rules(규칙), Parameters(파라미터), Edge Cases(예외)
- Implementation Status 메타데이터 블록 존재 여부 (문서 상단)
- 파라미터가 CSV 참조 또는 코드 블록으로 분리되었는지 (본문 하드코딩 수치 탐지)
- 3대 기둥(탐험/야리코미/멀티) 정렬 선언 여부

### Layer 4 — 용어 일관성

`Documents/Terms/Glossary.md`의 공식 용어와 폐기 용어 기준으로 문서 전체를 스캔한다.

- 폐기 용어 목록: `references/deprecated_terms.md` 참조
- 스탯 폐기어(DEX/SPD/STR/VIT/LCK/MP), 구조 폐기어(Hub/재귀 진입), 내러티브 폐기어(스승/멘토/가이드/No.1), 무기 폐기어(도끼/창/채찍), 원소 폐기어(풍/광) 검색
- 발견 시 위치와 대체 용어를 표시

### Layer 5 — 마크다운 형식 검증

`GDD_Writing_Rules.md` §4.3 마크다운 제약을 자동 검증한다.

- 스마트 따옴표 탐지: `"` `"` (U+201C, U+201D), `'` `'` (U+2018, U+2019)
- GFM Alert 문법 탐지: `> [!NOTE]`, `> [!WARNING]` 등
- 본문 볼드 탐지: `\*\*[^*]+\*\*`
  - 허용 예외: `> **` 로 시작하는 blockquote 라벨
  - 허용 예외: 테이블 헤더 행
- 숫자 범위에 틸드(`~`) 사용 탐지 — 하이픈(`-`)으로 교체 제안 (예: `1~3` → `1-3`)
- 금지 오타 탐지: "메커닭" → "메커닉"

## 프로세스

### Step 1 — 범위 결정

| 요청 예시 | 실행 범위 |
| :--- | :--- |
| "정합성 체크해줘" / "전체 검증" | Layer 1-5 전체 |
| "/sync-check" / "수치 동기화" | Layer 1만 |
| "System_Combat_Action 체크" | 지정 문서에 대해 Layer 1-5 |
| "용어 체크" / "폐기 용어 검색" | Layer 4만 |
| "형식 체크" / "따옴표 체크" | Layer 5만 |
| "링크 체크" / "교차 참조" | Layer 2만 |

### Step 2 — 데이터 수집

1. `references/csv_gdd_mapping.md`에서 CSV↔GDD 매핑을 읽는다
2. 대상 CSV 파일을 Read로 추출
3. 대응 GDD 문서에서 Grep으로 동일 항목·ID를 검색

### Step 3 — 검증 실행

각 레이어의 상세 규칙은 `references/check_layer_definitions.md`를 참조한다.

- Layer 1: CSV 값 vs GDD 테이블·본문 수치 비교 (Grep으로 숫자 컨텍스트 추출)
- Layer 2: Grep으로 링크 패턴 추출 → Read/Glob로 대상 파일 존재 확인
- Layer 3: Grep으로 섹션 헤더(`^## `) 스캔 → 5단계 매칭
- Layer 4: `deprecated_terms.md` 목록을 Grep 패턴으로 일괄 검색
- Layer 5: Grep 정규식으로 스마트 따옴표·GFM Alert·볼드·틸드·오타 검색

### Step 4 — 보고서 생성

`assets/report_template.md` 포맷으로 결과를 정리한다.

- 레이어별 요약 테이블 (통과/불일치/경고)
- 불일치 상세 목록 (파일경로:라인, 기대값, 실제값)
- 불일치 없으면 "[OK] 모든 항목 정합성 확인 (검증 시각: YYYY-MM-DD HH:MM)"

### Step 5 — 수정 (사용자 승인 시)

사용자가 수정을 승인할 때만 실행한다.

1. CSV(SSoT) 기준으로 GDD 수치 갱신 (Layer 1)
2. 깨진 링크·섹션 참조 수정 (Layer 2)
3. 누락 섹션 헤더 스켈레톤 추가 (Layer 3) — 내용은 작성하지 않고 자리만 표시
4. 폐기 용어를 현재 용어로 교체 (Layer 4)
5. 스마트 따옴표·GFM Alert·볼드·틸드 일괄 치환 (Layer 5)
6. 수정 후 해당 레이어 재검증

## 참고 자료 경로

| 자료 | 경로 |
| :--- | :--- |
| CSV↔GDD 매핑 | `references/csv_gdd_mapping.md` |
| 레이어별 검증 규칙 | `references/check_layer_definitions.md` |
| 폐기 용어 목록 | `references/deprecated_terms.md` |
| 보고서 템플릿 | `assets/report_template.md` |
| 프로젝트 용어 사전 | `Documents/Terms/Glossary.md` |
| GDD 작성 규칙 | `Documents/Terms/GDD_Writing_Rules.md` |
| 문서 인덱스 | `Documents/Terms/Document_Index.md` |
| 시트 작성 규칙 | `Documents/Terms/Sheets_Writing_Rules.md` |

## ECHORIS 특수 주의사항

- **SSoT 방향:** 수치 불일치 시 무조건 CSV가 권위. GDD 본문을 CSV에 맞춘다.
- **Flattened Hierarchy:** Documents/ 하위 최대 4단계까지만 허용 (예: `Documents/System/System_Combat_Action.md`).
- **파일명 규칙:** `대분류_중분류_소분류.md` (System_Combat_Action, Content_World_Bible 등).
- **3대 기둥 정렬:** 탐험(메트로베니아)/야리코미(아이템계)/멀티(코옵) 중 하나 이상에 정렬된 기능만 유지. 정렬 없는 시스템은 설계 질문으로 플래그.
- **Reference/ 제외:** `Reference/` 폴더는 외부 인사이트 아카이브이므로 Layer 2-4 검증 대상에서 제외.
- **game/ 코드 제외:** 코드 내부 변수명은 Glossary 용어와 다를 수 있으므로 Layer 4 검색에서 `game/` 제외.
- **스킬 파일 자체 제외:** `.claude/skills/gdd-integrity-checker/` 내부 파일은 폐기어·금지 오타·틸드를 규칙 예시로 포함하므로 Layer 4-5 검증 대상에서 제외.
