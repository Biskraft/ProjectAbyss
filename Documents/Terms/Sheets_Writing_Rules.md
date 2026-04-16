# ECHORIS: 시트 작성 규칙 (Sheets Writing Rules)

본 문서는 ECHORIS의 모든 CSV 데이터 시트를 작성하고 유지 관리하기 위한 표준 규칙을 정의합니다. 이 규칙은 인간 기획자와 AI(Agent), 그리고 게임 엔진이 데이터를 일관성 있게 파악하고 처리할 수 있도록 돕습니다.

---

## 1. 핵심 원칙

### 1.1. ID 우선 원칙 (ID-First Principle)

- 필수 첫 번째 열: 모든 데이터 시트는 반드시 ID 역할의 열로 시작해야 합니다.
- 명명 규칙: ID는 `lower_snake_case`를 사용합니다. (예: `sword_normal`, `room_castle_01`, `physical`)
- 구조: `[카테고리]_[식별명]` 또는 `[카테고리]_[식별명]_[번호]` 형식을 권장합니다.
- 레어리티 제외: 아이템 등급(Rarity) 정보는 ID에 포함할 수 있으나, 별도 `Rarity` 열에서도 관리합니다.
- 고유 키: ID 열은 해당 행의 유일한 식별자(Primary Key) 역할을 합니다.

**ID 열 이름 규칙:**
시트의 성격에 따라 ID 열 이름이 달라집니다:

| 시트 유형 | ID 열 이름 | 예시 |
| :--- | :--- | :--- |
| 캐릭터 스탯 | `Level` | `1`, `2`, `10` |
| 무기 | `WeaponID` | `sword_normal`, `sword_ancient` |
| 데미지 공식 | `FormulaID` | `physical`, `magical`, `true` |
| Room 템플릿 | `TemplateID` | `room_castle_01`, `room_iw_03` |
| 이노센트 | `InnocentID` | `inn_atk_01`, `inn_def_01` |
| 몬스터 | `MonsterID` | `mon_skeleton_01`, `mon_ghost_01` |
| 층위 | `TierID` | `tier_garden`, `tier_catacombs` |
| 스킬 | `SkillID` | `skill_fireball`, `skill_heal` |
| 보스 | `BossID` | `boss_general_01`, `boss_king_01` |
| 경험치 | `Level` | `1`, `2`, `100` |

### 1.2. 줄임말 규칙 (Abbreviation Rules)

ID와 헤더가 과도하게 길어지는 것을 방지하기 위해 다음의 표준 줄임말을 사용합니다. 이 목록에 없는 단어는 협의 후 추가합니다.

| 분류 | 원문 (Original) | 줄임말 (Abbreviation) |
| :--- | :--- | :--- |
| 장비 카테고리 | Weapon / Armor / Accessory | Weapon / Armor / Acc |
| 무기 타입 | Sword / Greatsword / Dagger / Bow / Staff | Sword / GS / Dagger / Bow / Staff |
| 기본 스탯 | Attack / Intelligence / Hit Points | ATK / INT / HP |
| 파생 스탯 | Defense / Resistance | DEF / RES |
| 레어리티 | Normal / Magic / Rare / Legendary / Ancient | Normal / Magic / Rare / Legendary / Ancient (줄이지 않음) |
| 전투 | Attack Speed / Hitbox Width / Hitbox Height / Multiplier | AtkSpeed / HitboxW / HitboxH / Mult |
| 공간 | World / Item World / Hub | World / IW / Hub |
| 몬스터 | Monster / Skeleton / Ghost | Mon / Skel / Ghost |
| 이노센트 | Innocent | Inn |
| 레벨 생성 | Room / Template / Biome / Difficulty | Room / Tmpl / Biome / Diff |
| 공식 | Minimum / Maximum / Critical / Reduction / Cap | Min / Max / Crit / Red / Cap |

### 1.3. 구조의 영문 통일

- 헤더(Headers): 모든 열의 헤더 명칭은 영문으로 작성합니다.
- 형식: `PascalCase`를 사용합니다. (예: `BaseATK`, `AtkSpeed`, `HitboxW`, `CritMultBase`)
- 약어가 포함된 경우: 약어는 대문자 유지합니다. (예: `BaseATK`, `MPCostSkill`, `ExpToNext`)
- 단위 포함: 단위가 필요한 경우 접미사로 표기합니다:
  - 거리: 픽셀 단위이므로 별도 단위 생략 (예: `Range`, `HitboxW`)
  - 시간: `_s` (예: `Duration_s`, `Cooldown_s`)
  - 비율: 0-1 범위의 실수 (예: `RandomMin`, `RandomMax`, `DefReductionCap`)
  - 배율: `Mult` 접미사 (예: `Combo1Mult`, `CritMultBase`)

### 1.4. 한글 사용 정책

- `Name` 열: 인게임 표시명으로 한글을 사용합니다. (예: `시작의 검`, `강철 장검`)
- `Description` 열: 기획 의도 설명으로 한글을 사용합니다.
- `Tags` 열: 영문 세미콜론 구분을 사용합니다. (예: `basic;corridor`, `arena;combat`)
- 그 외 모든 열: 영문/숫자만 사용합니다.
- 이유: 데이터 구조를 언어 중립적으로 유지하되, 기획자와 플레이어가 직접 확인하는 필드에는 한글을 허용합니다.

---

## 2. 시트 구조

### 2.1. 열 순서 (Column Ordering)

1. `ID` (필수, 고유 식별자 — 시트별 ID 열 이름 참조)
2. `Name` (선택, 인게임 표시명 — 한글 허용)
3. `Type` / `Category` / `Biome` (구조적 메타데이터)
4. `Rarity` / `Difficulty` (등급/난이도)
5. Stats & Logic (수치 파라미터들)
6. `Tags` (분류용 태그, 세미콜론 구분)
7. `Description` (선택, 기획 의도 설명 — 한글 허용)

### 2.2. 데이터 라우팅 (Data Routing)

각 CSV 시트는 하나 이상의 GDD 문서와 연결됩니다. 시트 간 참조 시 원본 시트의 ID를 정확히 사용합니다.

| 시트 파일명 | 연결 GDD | 주요 내용 |
| :--- | :--- | :--- |
| `Content_Stats_Character_Base.csv` | SYS-LVL-01 | Lv별 기본 스탯 (ATK, HP, DEF, 경험치) |
| `Content_Stats_Weapon_List.csv` | SYS-CMB-03, SYS-EQP-02 | 무기별 ATK, 속도, 사거리, 히트박스, 콤보 배율 |
| `Content_System_Damage_Formula.csv` | SYS-CMB-02 | 데미지 타입별 공식, 크리티컬 배율, 방어력 감산 캡 |
| `Content_Stats_Armor_List.csv` | SYS-EQP-01 | 방어구별 DEF, RES, 부위, 세트 효과 |
| `Content_System_Innocent_Pool.csv` | SYS-INC-01 | 이노센트 종류, 보너스 스탯, 등장 확률 |
| `Content_System_Monster_Pool.csv` | SYS-MON-01, SYS-MON-03 | 몬스터별 HP, ATK, DEF, AI 패턴, 드랍 |
| `Content_Level_Tier_Config.csv` | SYS-WLD-02 | 층위별 바이옴, 난이도, 스탯 게이트 요구치 |
| `Content_System_Skill_List.csv` | SYS-LVL-03 | 스킬별 MP 비용, 쿨다운, 배율, 효과 |
| `Content_System_IW_BossTable.csv` | SYS-IW-03 | 아이템계 보스 등급별 스탯, 등장 지층 |
| `Content_System_LevelExp_Curve.csv` | SYS-LVL-02 | Lv 1-100 경험치 커브 |

### 2.3. 주석 및 그룹화

- 줄 시작 부분에 `#`을 사용하여 주석이나 논리적인 섹션 구분선으로 활용할 수 있습니다.
- 가독성을 위해 빈 줄을 사용할 수 있으나 최소화합니다.

### 2.4. 수치 데이터 (Numeric Data)

기계적인 처리 효율과 가독성을 위해 다음 수치 형식을 준수합니다.

| 항목 | 형식 | 예시 | 비고 |
| :--- | :--- | :--- | :--- |
| 레벨 | 정수 (Integer) | `1`, `2`, `10` | 1부터 시작 |
| 스탯 | 정수 (Integer) | `10`, `100`, `300` | ATK, INT, HP 등 |
| 배율 | 실수 (Float) | `1.0`, `1.5`, `3.0` | 콤보/크리티컬/스탯 배율 |
| 비율 | 실수 (0-1) | `0.9`, `0.8`, `0.03` | 확률, 감산 캡, 분산 범위 |
| 크기/거리 | 정수 (Pixel) | `48`, `320`, `192` | 히트박스, Room 크기 (px 단위) |
| 참/거짓 | 문자열 | `true`, `false` | 출구 존재 여부 등 |

- 단위 제거: 셀 내부에는 단위(px, s, % 등)를 적지 않습니다. 단위는 헤더 또는 문서에서 명시합니다.
- 공백 제거: 모든 데이터 앞뒤에 불필요한 공백이 포함되지 않도록 주의합니다.

---

## 3. 유지 관리 규칙 (SSoT)

- **단일 소스**: 각 데이터 포인트는 오직 하나의 시트에만 존재해야 합니다. GDD 문서에 같은 수치가 반복될 경우, CSV가 SSoT(Single Source of Truth)입니다.
- **상호 참조**: 다른 시트의 데이터를 참조할 때는 원본 시트의 ID를 정확히 사용합니다. (예: 몬스터 드랍 테이블에서 `sword_normal` 참조)
- **GDD 동기화**: CSV 수치를 변경하면 연결된 GDD 문서의 파라미터 섹션도 함께 갱신합니다.
- **파일 경로**: 모든 CSV는 `Sheets/` 폴더에 위치합니다.
- **파일명 규칙**: `Content_[유형]_[대상].csv` 형식을 따릅니다.
  - `Content_Stats_*`: 스탯/수치 데이터
  - `Content_System_*`: 시스템 규칙/공식 데이터
  - `Content_Level_*`: 레벨/맵 관련 데이터

---

## 4. 검증 체크리스트

- [ ] 첫 번째 열이 ID 역할의 고유 식별자로 시작하는가?
- [ ] 모든 헤더가 영문이며 `PascalCase` 형식을 따르는가?
- [ ] 한글이 `Name`과 `Description` 열에서만 사용되었는가?
- [ ] 모든 ID가 고유하며 `lower_snake_case` 규칙을 따르는가?
- [ ] 배율/비율 수치에 단위 문자열이 섞여 있지 않은가?
- [ ] Boolean 값이 `true`/`false` 형식인가?
- [ ] 연결 GDD 문서의 파라미터와 수치가 일치하는가?

---

버전: v2.0
최근 업데이트: 2026-03-23
관련 문서: [GDD_Writing_Rules.md](GDD_Writing_Rules.md), [Document_Index.md](Document_Index.md)
