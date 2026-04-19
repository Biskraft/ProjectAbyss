# 레이어별 검증 규칙 상세 (ECHORIS)

## Layer 1 — 수치 동기화 검증 규칙

### 1.1 직접 수치 비교

1. `csv_gdd_mapping.md`에 정의된 각 CSV↔GDD 쌍을 순회
2. CSV 파일을 Read로 읽어 각 행의 검증 대상 컬럼 값을 추출
3. 대응 GDD 문서에서 해당 아이템/시스템의 수치를 Grep으로 검색
4. 비교 대상:
   - 마크다운 테이블 셀 내 수치
   - YAML/JSON/CSV 코드 블록 내 파라미터 값
   - 본문 인라인 수치 (백틱 안 숫자 포함)
   - 볼드/이탤릭 내 수치

### 1.2 파생 계산 비교

CSV 원값에서 계산되는 파생값은 재계산하여 GDD 기재값과 비교한다.

- **무기 실질 ATK:** `BaseATK × Rarity.Multiplier`
  - 예: sword_magic (BaseATK=20) × magic (1.3) = 26
  - GDD가 "매직 강철 장검 공격력 25"로 기재 시 불일치 플래그
- **레어리티별 지층 개수:** `StrataConfig`에서 레어리티별 고유 Stratum 값 개수
  - Normal=2, Magic=3, Rare=3, Legendary=4, Ancient=4
- **누적 HP 승수:** 레어리티-지층 조합의 HpMul 값
  - 지층 간 단조 증가 확인 (HpMul[s+1] > HpMul[s])
- **이노센트 복종 효과:** `BaseValue × Level × 2`
- **Remnant Fragment 획득량:** `floor(Innocent_Level / FRAGMENT_DIVISOR)`

### 1.3 허용 오차

- 정수 값: 정확히 일치
- 소수 값: ±0.01 이내
- 배율: ±0.05 이내
- 색상 코드(hex): 대소문자 무시, 정확히 일치
- 한글 명칭: 공백 유무 무시, 문자 일치

### 1.4 불일치 보고 형식

```
| 카테고리 | 항목 | CSV(SSoT) | GDD 값 | GDD 위치 | 상태 |
|:---|:---|---:|---:|:---|:---:|
| 무기 | sword_magic BaseATK | 20 | 22 | System_Combat_Weapons.md:L142 | [X] |
| 레어리티 | Legendary InnocentSlots | 6 | 5 | System_Equipment_Rarity.md:L88 | [X] |
```

---

## Layer 2 — 교차 참조 검증 규칙

### 2.1 내부 링크 유효성

1. 모든 `Documents/**/*.md` 파일에서 `\[.+?\]\(([^)]+)\)` 패턴을 Grep으로 추출
2. 상대 경로를 절대 경로로 변환 (기준: 현재 문서 위치)
3. 대상 파일이 실제 존재하는지 Glob/Read로 확인
4. 결과 분류:
   - [OK] 유효 (파일 존재)
   - [X] 깨진 링크 (파일 미존재)
   - [!] 경로 불일치 (대소문자 차이, 후행 슬래시 등)

### 2.2 섹션 참조 유효성

1. `§(\d+(?:\.\d+)*)` 또는 `섹션\s*(\d+(?:\.\d+)*)` 패턴 검색
2. 대상 문서에서 해당 번호의 마크다운 헤더가 실존하는지 확인
3. 섹션 번호가 변경된 경우 현재 번호를 제안

### 2.3 Document_Index 등록 확인

1. `Documents/` 폴더 내 모든 `.md` 파일을 Glob으로 수집
2. `Documents/Terms/Document_Index.md`에 해당 파일이 등록되어 있는지 확인
3. 미등록 파일을 경고로 보고 (Layer 2 경고, 불일치 아님)

### 2.4 CSV ID 참조 유효성

1. GDD에서 CSV ID 패턴을 Grep 검색
   - 무기 ID: `(?:sword|cleaver|shiv|harpoon|chain|railbow|emitter)_[a-z_]+`
   - 레어리티: `\b(normal|magic|rare|legendary|ancient)\b`
   - 이노센트 이름: `Content_Innocents.csv`의 Name 컬럼
   - 몬스터 Type: `Content_Stats_Enemy.csv`의 Type 컬럼
2. 해당 ID가 대응 CSV에 실제 존재하는지 확인
3. 오타·리네임된 ID를 플래그

### 2.5 CSV 간 참조 유효성

- `Content_ItemWorld_MemoryRooms.csv`의 `WeaponID` → `Content_Stats_Weapon_List.csv` 실존 확인
- `Content_ItemWorld_SpawnTable.csv`의 `EnemyType` → `Content_Stats_Enemy.csv` 실존 확인
- `Content_Stats_Weapon_Lore.csv`의 `AreaID` → `Content_System_Area_Palette.csv` 실존 확인
- `Content_Stats_Weapon_Lore.csv`의 `LorePath` → 파일 실존 확인

---

## Layer 3 — GDD 구조 준수 검증 규칙

### 3.1 5단계 구조 확인

각 `Documents/System/System_*.md` 파일에 대해 Grep으로 `^## ` 헤더를 스캔한다.

필수 섹션 매칭 (유연 매칭, 키워드 포함 시 통과):

| 순서 | 필수 키워드 | 허용 변형 |
|:---:|---|---|
| 1 | Concept / 개요 | Overview, 컨셉, 의도, Intent, 목적 |
| 2 | Mechanics / 메커닉 | 메카닉, 행동, 동작, Verb |
| 3 | Rules / 규칙 | 규칙, 로직, 조건, Logic |
| 4 | Parameters / 파라미터 | 데이터, Config, 설정값, Tuning, 수치 |
| 5 | Edge Cases / 예외 | Edge Case, 예외 처리, 충돌, Conflicts, 경계 조건 |

한 섹션이 누락되면 해당 섹션명과 함께 보고한다.

### 3.2 Implementation Status 메타데이터

각 `System_*.md` 파일 상단에 구현 상태 메타데이터가 존재하는지 확인한다.

검색 패턴:
- `^\s*-?\s*(구현\s*상태|Implementation\s*Status|상태)[\s:]*`
- 값이 `기획 완료` / `구현 중` / `구현 완료` / `Deprecated` 중 하나인지 확인

### 3.3 파라미터 분리 확인

- `System_*.md` 파일 내 `yaml`, `json`, `csv` 코드 블록 또는 CSV 파일 참조가 존재하는지 확인
- 코드 블록·CSV 참조가 하나도 없는데 본문에 수치가 많으면 경고
- 본문에 수치(백틱 없는 숫자 + 단위)가 5회 이상 등장하면 `[!] CSV 참조로 분리 권고`

### 3.4 3대 기둥 정렬 선언

Design 문서 또는 System 문서 상단에 3대 기둥(탐험/야리코미/멀티) 중 어느 것에 정렬되는지 선언이 있는지 확인한다.

- 검색 키워드: "3대 기둥", "Pillar", "메트로베니아 탐험", "야리코미", "코옵", "멀티플레이"
- 기둥 정렬 선언이 없는 System 문서는 경고 (삭제 검토 대상일 수 있음)

### 3.5 Changelog 존재 확인

- 각 문서에 "변경 이력", "Changelog", "변경사항" 헤더가 있는지 확인
- Phase 1 미만 문서는 경고만, Phase 2 이상 문서는 필수

---

## Layer 4 — 용어 일관성 검증 규칙

### 4.1 폐기 용어 탐지

`references/deprecated_terms.md`의 10개 카테고리 패턴을 Grep으로 일괄 검색한다.

- Case-insensitive: 한글 단어는 기본적으로, 영문은 `-i` 플래그
- 검색 대상: `Documents/**/*.md`, `Sheets/**/*.csv`
- 검색 제외: `Reference/`, `game/`, `.git/`, `memory/`, `Glossary.md`, `GDD_Writing_Rules.md`, `deprecated_terms.md` 자체

### 4.2 공식 용어 사용 일관성

Glossary에 정의된 공식 명칭과 다른 표현 사용 탐지:

- 예: Glossary "격벽(Bulkhead)" vs 문서에서 "벽", "배리어", "장벽" 혼용
- 예: Glossary "아이템계(Item World)" vs "아이템 월드", "Item-World", "ItemWorld" 혼용
- Glossary 공식 명칭과 영문 키만 허용. 그 외 표현은 경고

### 4.3 에르다 내러티브 스캔 (Killy 오마주 검증)

- 에르다 관련 문서에서 다음 패턴 탐지:
  - `에르다.*대사` / `에르다.*말했` / `에르다.*독백` — 에르다 대사 발견 시 불일치
  - `에르다.*스승` / `에르다.*배웠` / `에르다.*가르침` — 멘토 서사 잔재
  - `의뢰.*에르다` / `에르다.*고용` — 고용 서사 잔재

### 4.4 보고 형식

```
| 카테고리 | 폐기 용어 | 현재 용어 | 발견 위치 | 라인 |
|:---|:---|:---|:---|:---:|
| 스탯 | DEX | (삭제) | System_Growth_Stats.md | L42 |
| 내러티브 | 스승 | (없음, Killy 오마주) | Content_World_Bible.md | L18 |
| 무기 | 도끼 | Cleaver | Content_Weapon_List.md | L207 |
```

---

## Layer 5 — 마크다운 형식 검증 규칙

### 5.1 스마트 따옴표 탐지

- Grep 패턴 (multiline true): `[\u201c\u201d\u2018\u2019]`
- 발견 시 파일명·라인·내용 표시
- 직선 따옴표(`"`, `'`)로 교체 제안

### 5.2 GFM Alert 문법 탐지

- Grep 패턴: `^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]`
- 발견 시 `> **Note:**` 같은 blockquote 라벨로 교체 제안

### 5.3 본문 볼드 탐지

- Grep 패턴: `\*\*[^*\n]+\*\*`
- 허용 예외:
  - `^>\s*\*\*` (blockquote 라벨)
  - 테이블 헤더 행 (첫 번째 `|` 구분 행)
  - 제목행 `#` 뒤의 볼드
- 발견 시 볼드 마커 제거 제안 (GDD_Writing_Rules §4.3)

### 5.4 숫자 범위 틸드 탐지

- Grep 패턴: `\d+\s*~\s*\d+` (숫자-틸드-숫자)
- 발견 시 `-` (하이픈)으로 교체 제안
- 메모리 `feedback_no_tilde_in_md` 근거

### 5.5 금지 오타 탐지

- Grep 패턴: `메커닭|이너센트|아이탬`
- 발견 시 즉시 수정 플래그

### 5.6 파일명 규칙 확인

- `Documents/` 내 모든 `.md` 파일의 파일명이 `대분류_중분류(_소분류).md` 규칙을 따르는지 확인
- 허용 대분류: `System_`, `Design_`, `Content_`, `UI_`, `GDD_`, `Project_`, `Sheets_`, `WorldLayout_`
- 규칙 위반 파일명을 경고

### 5.7 Flattened Hierarchy 확인

- `Documents/` 내 `.md` 파일의 경로 깊이가 4단계를 초과하는지 확인
  - 허용: `Documents/System/System_Combat_Action.md` (3단계)
  - 위반: `Documents/System/Combat/Actions/Basic.md` (5단계)
- 위반 시 평탄화 제안

### 5.8 보고 형식

```
| 유형 | 위치 | 라인 | 내용 발췌 | 제안 |
|:---|:---|:---:|:---|:---|
| 스마트 따옴표 | System_Combat_Action.md | L42 | "히트스탑" | 직선 따옴표로 교체 |
| GFM Alert | Design_CoreLoop.md | L18 | > [!NOTE] | > **Note:** 로 변경 |
| 본문 볼드 | System_ItemWorld_Core.md | L55 | **중요:** 이노센트는... | 볼드 제거 |
| 숫자 틸드 | Content_World_Bible.md | L33 | Tier 1~7 | Tier 1-7 |
```

---

## 공통 검색 제외

모든 레이어에서 다음은 검색 대상에서 제외한다.

- `Reference/` — 외부 인사이트 아카이브 (원본 보존)
- `.git/`, `node_modules/`, `dist/`, `.venv/`, `memory/`
- Glossary 자체 (폐기 용어 정의 문서) — Layer 4 검색 시 제외
- `game/` 하위 — 코드 변수명은 별도 규칙 (Layer 4 검색 시 제외)
- `.claude/skills/gdd-integrity-checker/` — 본 스킬의 규칙·예시 파일은 폐기어·금지 오타·틸드를 문서화 목적으로 포함하므로 Layer 4-5 검색 대상 제외
