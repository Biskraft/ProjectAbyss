> gdd-writer 스킬의 CSV SSoT 연동 실전 가이드. ID 생성, 열 순서, 데이터 형식, YAML 변환 규칙.

# CSV SSoT 연동 가이드 (CSV Integration Guide)

## 1. CSV 참조 패턴 (Reference Patterns)

### 문서 내 참조 형식

GDD 문서에서 CSV 데이터를 참조할 때 아래 형식을 따른다.

**인라인 참조**:
```
기본 데미지는 [Content_Stats_Weapon_RangeList.csv](../../Sheets/Content_Stats_Weapon_RangeList.csv) -> WEP_RNG_AR_01 참조
```

**YAML 블록 내 참조**:
```yaml
Base_Damage: 45          # 단위: HP
Fire_Rate_rpm: 600       # 단위: 분당 발사 수
# SSoT: ../../Sheets/Content_Stats_Weapon_RangeList.csv
# Row: WEP_RNG_AR_01
```

**상대 경로 기준**:
- Documents/ 내 문서에서 Sheets/ 참조: `../../Sheets/Content_XXX.csv`
- Documents/Gadgets/ 내 문서에서 Sheets/ 참조: `../../../Sheets/Content_XXX.csv`

### 참조 금지 경로

- 게임 프로젝트 측 CSV 경로(`C:/ProjectZ/ProjectZ/Assets/Project/Data/CSV/`)는 문서에서 절대 참조하지 않는다
- Design/Sheets/ 경로만 참조한다

---

## 2. ID 생성 규칙 (ID Generation Rules)

### 형식

```
[대분류]_[중분류]_[식별명]
```

- 전체 UPPER_SNAKE_CASE
- 한글 금지, 영문과 숫자만 사용
- 식별명은 약어 또는 축약어 허용

### 대분류 (Primary Category)

| 약어 | 의미 | 사용처 |
| :--- | :--- | :----- |
| WEP | Weapon | 무기 |
| ARM | Armor | 방어구 |
| GAD | Gadget | 가젯 |
| CHR | Character | 캐릭터 |
| ZOM | Zombie | 좀비 |
| MAT | Material | 재료 |
| RES | Resource | 자원 |
| BLD | Building | 건축물 |
| VEH | Vehicle | 탈것 |
| SYS | System | 시스템 |

### 중분류 (Sub Category)

| 약어 | 의미 | 사용처 |
| :--- | :--- | :----- |
| OFF | Offense | 공격용 |
| DEF | Defense | 방어용 |
| UTL | Utility | 유틸리티 |
| SUP | Support | 지원용 |
| TRV | Traversal | 이동용 |
| MEL | Melee | 근접 |
| RNG | Ranged | 원거리 |

### 속성 (Attribute)

| 약어 | 의미 | 사용처 |
| :--- | :--- | :----- |
| HVY | Heavy | 중량 |
| MED | Medium | 중간 |
| LGT | Light | 경량 |
| IND | Industrial | 산업용 |
| PRO | Professional | 전문가용 |
| STD | Standard | 표준 |

### ID 예시

```
WEP_RNG_AR_01       -> 원거리 무기, AR 타입, 1번
WEP_MEL_HVY_AXE     -> 근접 무기, 중량, 도끼
GAD_OFF_GRENADE_01   -> 공격 가젯, 수류탄, 1번
ARM_DEF_HVY_VEST     -> 방어구, 방어, 중량 조끼
MAT_IND_STEEL        -> 재료, 산업용, 강철
RES_STD_SCRAP        -> 자원, 표준, Scrap Parts
BLD_DEF_WALL_01      -> 건축물, 방어, 벽, 1번
ZOM_STD_WALKER_01    -> 좀비, 표준, 워커, 1번
```

---

## 3. 열 순서 표준 (Column Order Standard)

모든 CSV는 아래 열 순서를 따른다.

### 필수 열 (순서 고정)

| 순서 | 열명 | 필수 여부 | 설명 |
| :--: | :--- | :-------: | :--- |
| 1 | ID | 필수 | 고유 식별자 (Primary Key) |
| 2 | Description | 필수 | 한글 설명 |
| 3 | Display_Name | 선택 | 영문 표시명 |

### 메타데이터 열 (순서 유동)

| 순서 | 열명 | 필수 여부 | 설명 |
| :--: | :--- | :-------: | :--- |
| 4 | Tier | 선택 | 등급 (정수) |
| 5 | Category | 선택 | 분류 |
| 6 | Type | 선택 | 유형 |
| 7 | Tags | 선택 | 전투/시스템 태그 (쉼표 구분) |

### 수치/로직 열 (이후)

| 순서 | 열명 | 설명 |
| :--: | :--- | :--- |
| 8+ | Stats & Logic | 게임 수치 파라미터 |

**예시 CSV 헤더**:
```csv
ID,Description,Display_Name,Tier,Category,Type,Tags,Base_Damage,Fire_Rate_rpm,Effective_Range_m,Max_Range_m,Reload_Time_s
```

---

## 4. 데이터 형식 표준 (Data Format Standard)

### 헤더 형식

- Pascal_Snake_Case (영문)
- 단위는 접미사로 명시

| 접미사 | 단위 | 예시 |
| :----- | :--- | :--- |
| `_m` | 미터 | `Effective_Range_m` |
| `_s` | 초 | `Reload_Time_s` |
| `_ms` | 밀리초 | `Response_Time_ms` |
| `_deg` | 도(각도) | `Spread_Angle_deg` |
| `_%` | 퍼센트 | `Move_Speed_%` |
| `_rpm` | 분당 발사 수 | `Fire_Rate_rpm` |
| `_hp` | 체력 | `Base_Health_hp` |
| `_kg` | 킬로그램 | `Weight_kg` |

### 데이터 유형

| 항목 | 형식 | 예시 | 비고 |
| :--- | :--- | :--- | :--- |
| Tier/Level | 정수 | `1`, `2`, `3` | |
| 확률 | 실수 | `10.005`, `0.1` | 소수점 표기 |
| Boolean | 0 / 1 | `1`(True), `0`(False) | true/false 문자열 금지 |
| 한글 | Description 열에서만 | | ID, 헤더, 수치에 한글 금지 |
| 빈 값 | 빈 문자열 | `,,` | NULL, N/A 금지 |

### 셀 내부 규칙

- 단위 기호 적지 않음 (단위는 헤더에만)
- Bad: `45 HP`, `2.1s`
- Good: `45`, `2.1`

### 섹션 구분

- 줄 시작에 `#` 사용
- 예: `# --- Weapons (Range) ---`

---

## 5. 새 CSV 생성 체크리스트 (New CSV Checklist)

새로운 CSV 파일을 생성할 때 아래 항목을 모두 확인한다.

### 파일 생성 전

- [ ] 기존 CSV에 해당 데이터가 이미 존재하지 않는가? (중복 방지)
- [ ] 파일명이 네이밍 규칙을 따르는가? (`Content_[분류]_[하위분류]_[항목명].csv`)
- [ ] 저장 위치가 `Design/Sheets/`인가?

### 파일 생성 후

- [ ] 첫 번째 열이 ID인가?
- [ ] Description 열이 존재하는가?
- [ ] 열 순서가 표준을 따르는가?
- [ ] 헤더에 단위 접미사가 명시되어 있는가?
- [ ] Document_Index.md에 매핑이 추가되었는가?
- [ ] Sheets_Data_Dependency_Map.md에 의존성이 등록되었는가?

### 절대 금지

- [ ] 게임 프로젝트 측 CSV(`ProjectZ/Assets/`)는 절대 수정하지 않았는가?
- [ ] 한글이 Description 열 외에 사용되지 않았는가?
- [ ] 셀 내부에 단위 기호가 포함되지 않았는가?

---

## 6. YAML -> CSV 변환 규칙 (YAML to CSV Conversion)

GDD 문서의 YAML 파라미터 블록을 CSV로 변환할 때 아래 규칙을 따른다.

### 변환 규칙

| YAML | CSV |
| :--- | :--- |
| 키 이름 | 컬럼 헤더 (Snake_Case 유지) |
| 단위 주석 | 헤더 접미사로 이동 |
| 값 | 셀 데이터 |
| 주석 | 제거 (Description 열로 이동) |

### 변환 예시

**YAML (문서 내)**:
```yaml
# AR 기본 스펙
Base_Damage: 45          # 단위: HP
Fire_Rate_rpm: 600       # 단위: 분당 발사 수
Effective_Range_m: 30    # 단위: m
Reload_Time_s: 2.1       # 단위: 초
Magazine_Size: 30        # 단위: 발
```

**CSV (변환 결과)**:
```csv
ID,Description,Base_Damage,Fire_Rate_rpm,Effective_Range_m,Reload_Time_s,Magazine_Size
WEP_RNG_AR_01,기본 돌격소총,45,600,30,2.1,30
```

### 주의사항

- YAML 키의 단위 접미사가 이미 있으면 그대로 CSV 헤더로 사용
- YAML 키에 단위가 없고 주석에만 있으면 헤더에 접미사 추가
- 1개 YAML 블록이 CSV의 1개 Row에 대응
- 여러 YAML 블록은 같은 CSV의 여러 Row로 통합
