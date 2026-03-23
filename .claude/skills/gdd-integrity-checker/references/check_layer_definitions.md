# 레이어별 검증 규칙 상세

## Layer 1 — 수치 동기화 검증 규칙

### 1.1 직접 수치 비교

1. `csv_gdd_mapping.md`에 정의된 각 CSV↔GDD 쌍을 순회
2. CSV 파일을 읽어 각 행의 검증 대상 컬럼 값을 추출
3. 대응 GDD 문서에서 해당 아이템/시스템의 수치를 검색
4. 비교 대상:
   - 마크다운 테이블 셀 내 수치
   - YAML/JSON 코드 블록 내 파라미터 값
   - 본문 인라인 수치 (백틱 안의 숫자 포함)

### 1.2 파생 계산 비교

- **TTK**: `STK = ceil(150 / Damage_Max)`, `TTK_ms = (STK-1) × (60000/RPM)`
- **DPS**: `Damage_Max × RPM / 60`
- **분당 생산량**: `Amount × (60 / Interval_s)`
- **헤드샷 원킬**: `Damage_Max × HS_Mult > 150`

### 1.3 허용 오차

- 정수 값: 정확히 일치해야 함
- 소수 값: ±0.1 이내 허용
- 백분율: ±1% 이내 허용
- 시간(초): ±0.01s 이내 허용

---

## Layer 2 — 교차 참조 검증 규칙

### 2.1 내부 링크 유효성

1. 모든 `.md` 파일에서 `[텍스트](경로)` 패턴을 grep으로 추출
2. 상대 경로를 절대 경로로 변환
3. 대상 파일이 실제 존재하는지 확인
4. 결과 분류:
   - ✅ 유효 (파일 존재)
   - ❌ 깨진 링크 (파일 미존재)
   - ⚠️ 경로 불일치 (대소문자 차이 등)

### 2.2 섹션 참조 유효성

1. "§N.N" 또는 "섹션 N.N" 패턴 검색
2. 대상 문서에서 해당 번호의 헤더가 존재하는지 확인
3. 섹션 번호가 변경된 경우 현재 번호를 제안

### 2.3 Document_Index 등록 확인

1. `Documents/` 폴더 내 모든 `.md` 파일을 `find_by_name`으로 수집
2. `Document_Index.md`에 해당 파일이 등록되어 있는지 확인
3. 미등록 파일을 보고

### 2.4 CSV ID 참조 유효성

1. GDD에서 CSV ID (예: `WEP_RNG_PST_IND`)를 검색
2. 해당 ID가 대응 CSV에 실제 존재하는지 확인

---

## Layer 3 — GDD 구조 준수 검증 규칙

### 3.1 5단계 구조 확인

각 `System_*.md` 파일에 대해 `view_file_outline`으로 섹션 헤더를 스캔합니다.

필수 섹션 매칭 (유연한 매칭):

| 순서 | 필수 키워드 | 허용 변형 |
|:---:|---|---|
| 1 | Concept, 개요 | Overview, 컨셉, 의도, Intent |
| 2 | Mechanics, 메커닉 | 메카닉, 행동, 동작, Verb |
| 3 | Rules, 규칙 | 규칙, 로직, 조건, Logic |
| 4 | Parameters, 파라미터 | 데이터, Config, 설정값, Tuning |
| 5 | Edge Cases, 예외 | Edge Case, 예외 처리, 충돌, Conflicts |

### 3.2 파라미터 분리 확인

- `System_*.md` 파일 내에서 `yaml`, `json`, `csv` 코드 블록 존재 여부 확인
- 코드 블록 외부에 직접 하드코딩된 밸런스 수치가 있으면 경고
  - 예: 본문에 "대미지 30" → ⚠️ "파라미터 블록으로 분리 권고"

### 3.3 Changelog 존재 확인

- 각 문서에 "변경 이력", "Changelog", "변경사항" 헤더 또는 섹션이 있는지 확인

---

## Layer 4 — 용어 일관성 검증 규칙

### 4.1 폐기 용어 탐지

`references/deprecated_terms.md`에 정의된 폐기 용어 목록으로 전체 문서를 `grep_search`합니다.

검색 옵션:

- `CaseInsensitive: true`
- 검색 대상: `Documents/` 폴더 내 모든 `.md` 파일
- CSV 파일도 검색 대상에 포함

### 4.2 한/영 혼용 탐지

Glossary에 정의된 공식 명칭과 다른 표현 사용 탐지:

- 예: Glossary "캠핑카" vs 문서에서 "캠핑카", "Camper Van", "RV" 혼용
- Glossary 공식 명칭과 영문 ID만 허용, 그 외는 경고

### 4.3 보고 형식

```
| 폐기 용어 | 현재 용어 | 발견 위치 | 라인 |
|---|---|---|:---:|
| Scrap Metal | Scrap Parts | System_Economy.md | L42 |
| Uranium | Core Module | Design_Economy_Faucet_Sink.md | L18 |
```
