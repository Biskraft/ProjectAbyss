# 인벤토리 아이템 정보 표시 UI 리서치

> **작성일:** 2026-04-19
> **목적:** ECHORIS 인벤토리 UI에서 아이템 정보를 어떻게 표시할지 결정하기 위한 장르별 레퍼런스 분석
> **현황:** 인벤토리 그리드(5x4)는 구현 완료. 아이템 정보 표시는 이름/ATK/레어리티만 1줄 텍스트로 노출 중

---

## 1. 장르별 레퍼런스 게임 분석 (17개)

### 1.1 2D Metroidvania (5개)

#### Hollow Knight

| 항목 | 내용 |
|:---|:---|
| 표시 방식 | Side Panel -- 전체화면 메뉴에서 좌측 격자에 Charm 선택, 우측에 상세 |
| 표시 정보 | 이름, 설명 텍스트, Notch 비용, 장착 효과 |
| 스탯 비교 | 없음 (Charm은 수치 비교 불필요) |
| 인터랙션 | 컨트롤러/키보드 커서 이동 후 선택 |
| 화면 비율 | 100% (전체화면 메뉴) |
| **시사점** | 고딕풍 장식 프레임으로 분위기 유지. 텍스트 설명이 핵심 |

#### Dead Cells

| 항목 | 내용 |
|:---|:---|
| 표시 방식 | Tooltip Popup -- 아이템 획득/교체 시 화면에 Floating Box 표시 |
| 표시 정보 | 무기명, DPS, 특수효과 설명, 레어리티 색상 배경 |
| 스탯 비교 | 장착 중 무기와 나란히 표시 (좌: 현재 / 우: 새 아이템) |
| 인터랙션 | 아이템 근처 접근 시 자동 표시. 교체/무시 선택 |
| 화면 비율 | 약 30-40% (화면 상단에 두 아이템 Tooltip 나란히) |
| **시사점** | 실시간 액션 중 빠른 비교가 핵심. 텍스트 크기 조절 옵션 제공 |

#### Castlevania: Symphony of the Night

| 항목 | 내용 |
|:---|:---|
| 표시 방식 | Full-Screen Menu + Side Panel |
| 표시 정보 | 장비명, ATK/DEF, 특수효과, 장비 가능 슬롯 (RH/LH/Head/Body/Cloak/Other) |
| 스탯 비교 | 없음 (스탯은 캐릭터 스테이터스 화면에서 별도 확인) |
| 인터랙션 | 방향키 네비게이션 + 버튼 장착. Sort(Triangle) 지원 |
| 화면 비율 | 100% (전체화면 메뉴) |
| **시사점** | 장비 카테고리별 리스트 뷰. 254개 아이템을 리스트로 관리. 레어리티 색상 없음 |

#### Blasphemous

| 항목 | 내용 |
|:---|:---|
| 표시 방식 | Full-Screen Menu -- 좌측 그리드 + 우측 상세 패널 |
| 표시 정보 | 아이콘(큰 일러스트), 이름, Lore 텍스트, 효과 설명 |
| 스탯 비교 | 없음 (Rosary Bead 시스템은 수치 비교보다 효과 텍스트 중심) |
| 인터랙션 | 커서 이동 + 장착 |
| 화면 비율 | 100% (전체화면 메뉴) |
| **시사점** | 종교 미술풍 프레임. Lore 텍스트에 강한 비중 |

#### Salt and Sanctuary

| 항목 | 내용 |
|:---|:---|
| 표시 방식 | Full-Screen Menu -- Souls-like 장비 화면 |
| 표시 정보 | 장비명, ATK/DEF 수치, 스케일링 등급(S/A/B/C/D/E), Weight, 필요 스탯 |
| 스탯 비교 | 우클릭으로 상세 스탯 확인. 장비 부하(Equipment Load %) 실시간 표시 |
| 인터랙션 | 마우스 우클릭(PC) / L3 버튼(콘솔) |
| 화면 비율 | 100% (전체화면 메뉴) |
| **시사점** | Souls-like 스탯 표기 방식. 스케일링 등급이 핵심 정보 |

---

### 1.2 ARPG / Loot 중심 (5개)

#### Diablo 2 (Resurrected 포함)

| 항목 | 내용 |
|:---|:---|
| 표시 방식 | Tooltip on Hover -- 아이템 위에 마우스를 올리면 Floating Tooltip |
| 표시 정보 | 이름(레어리티 색상), 아이템 타입, 기본 스탯, 마법 속성(Affix), 소켓, 내구도, 요구 레벨/스탯 |
| 스탯 비교 | D2R: Shift 홀드로 장착 중 아이템 Tooltip 나란히 표시 (수치 비교 없음, 단순 병렬) |
| 인터랙션 | 마우스 Hover |
| 화면 비율 | Tooltip 자체는 약 15-20% |
| **시사점** | ARPG Tooltip의 원형. 레어리티 색상 = 아이템 이름 색상. 소켓은 회색 원형으로 시각 표시 |

#### Diablo 3

| 항목 | 내용 |
|:---|:---|
| 표시 방식 | Tooltip on Hover + Compare Tooltip |
| 표시 정보 | 이름, 아이템 타입, Primary Affix(4개), Secondary Affix(2개), 소켓(장착 젬 표시), 세트 보너스, Flavor Text |
| 스탯 비교 | 자동 비교 Tooltip -- 장착 중 아이템과 나란히 표시. 상승=초록, 하락=빨강 화살표 |
| 인터랙션 | 마우스 Hover (Ctrl로 Advanced Tooltip 토글) |
| 화면 비율 | 비교 시 약 30-40% (두 Tooltip 나란히) |
| **시사점** | Primary/Secondary Affix 분리 표기. 소켓에 장착된 젬 색상으로 시각화. 세트 보너스는 초록색 텍스트 |

#### Diablo 4

| 항목 | 내용 |
|:---|:---|
| 표시 방식 | Tooltip on Hover + Advanced Compare |
| 표시 정보 | Item Power, 이름, Affix 목록 + Roll Range, Aspect(전설 효과), 소켓, Flavor Text |
| 스탯 비교 | Advanced Tooltip Compare 활성화 시: 득=초록, 실=빨강 텍스트로 모든 Affix 차이 표시 |
| 인터랙션 | 마우스 Hover. 설정에서 Advanced Tooltip 토글 |
| 화면 비율 | 약 20-35% |
| **시사점** | Affix Roll Range 표시(최소~최대 범위)로 God Roll 판별 가능. additive(+) vs multiplicative(x) 구분 |

#### Path of Exile

| 항목 | 내용 |
|:---|:---|
| 표시 방식 | Tooltip on Hover (가장 정보가 많은 Tooltip) |
| 표시 정보 | 이름, 베이스 타입, Implicit Mod, Explicit Mod(Prefix/Suffix), 소켓(링크 시각화), 요구 레벨/스탯, Item Level, Corrupted 상태, Flavor Text |
| 스탯 비교 | 기본 비교 없음. 서드파티 도구(Exile-UI 등)로 Mod Tier, Weight 표시 |
| 인터랙션 | 마우스 Hover. Alt 홀드로 추가 정보(ilvl 등) 표시 |
| 화면 비율 | 약 15-25% (Mod가 많으면 Tooltip이 상당히 길어짐) |
| **시사점** | 소켓 링크를 색상 원(R/G/B/W)과 연결선으로 시각화. ECHORIS Memory Shard와 유사한 구조 |

#### Grim Dawn

| 항목 | 내용 |
|:---|:---|
| 표시 방식 | Tooltip on Hover + DPS Breakdown |
| 표시 정보 | 이름(레어리티 색상), 베이스 스탯, Affix(Prefix/Suffix + Tier 색상), Augment, Set Bonus |
| 스탯 비교 | 캐릭터 시트에서 DPS Breakdown Tooltip 제공. 장비 교체 시 스탯 변화 미리보기 |
| 인터랙션 | 마우스 Hover. 긴 Tooltip은 마우스 휠 스크롤 가능 |
| 화면 비율 | 약 15-25% |
| **시사점** | 스크롤 가능 Tooltip은 복잡한 아이템에 유용. Affix Tier를 색상으로 구분 |

---

### 1.3 Disgaea / SRPG (3개)

#### Disgaea Series (1~7)

| 항목 | 내용 |
|:---|:---|
| 표시 방식 | Full-Screen Detail View -- 아이템 선택 후 전체화면 상세 |
| 표시 정보 | 이름, Rank, Rarity(0~100), 8개 스탯(HP/SP/ATK/DEF/INT/SPD/HIT/RES), Specialist(Memory Shard) 목록 + 상태(Wild/Subdued), MV/JMP, Item Level, Resident 수/최대 |
| 스탯 비교 | 장착 전후 스탯 변화를 캐릭터 스테이터스에서 확인 |
| 인터랙션 | 메뉴 선택 + 확인 버튼 |
| 화면 비율 | 100% (전체화면) |
| **시사점** | **ECHORIS의 직접적 레퍼런스.** Specialist(=Memory Shard) 표시: 아이콘 + 이름 + 레벨 + 상태(Wild=빨간 얼굴 / Subdued=노란 얼굴). Rarity 0~100 수치 표시. Item World 진입을 위한 별도 NPC(Item World Guide) |

#### Fire Emblem (Engage 기준)

| 항목 | 내용 |
|:---|:---|
| 표시 방식 | Full-Screen Menu + Combat Forecast |
| 표시 정보 | 무기명, Might, Hit, Crit, Weight, Range, 내구도, Engrave 보너스 |
| 스탯 비교 | Combat Forecast에서 교전 결과 미리보기(적 HP, 피해량, 명중률, 필살률) |
| 인터랙션 | 메뉴 네비게이션 |
| 화면 비율 | 100% (메뉴) / 약 30% (Combat Forecast) |
| **시사점** | Combat Forecast = 실전 비교. 장비 스탯보다 "이걸 쓰면 전투에서 어떤 결과가 나오나"에 집중 |

#### Final Fantasy Tactics

| 항목 | 내용 |
|:---|:---|
| 표시 방식 | Full-Screen Equipment Menu |
| 표시 정보 | 장비명, ATK/MAG, 방어력, 회피율, 속성, 상태이상 부여/방지, 이동력/점프력 보너스 |
| 스탯 비교 | 장착 전후 캐릭터 스탯 변화를 화살표(Up/Down)로 표시 |
| 인터랙션 | 메뉴 네비게이션 |
| 화면 비율 | 100% |
| **시사점** | 장착 전후 비교를 화살표로 표시하는 클래식 패턴 |

---

### 1.4 2D Online RPG (2개)

#### MapleStory

| 항목 | 내용 |
|:---|:---|
| 표시 방식 | Tooltip on Hover -- 아이템 아이콘 위에 마우스 올리면 상세 Tooltip |
| 표시 정보 | 이름(레어리티 색상), 카테고리, Star Force 강화 수치(별 아이콘), 스탯(STR/DEX/INT/LUK/ATK/MATK), Potential(Rare/Epic/Unique/Legendary), Bonus Stats, Scroll 강화 수치, 세트 효과, 교환 가능 여부, 제한 시간 |
| 스탯 비교 | 없음 (직접 수치 비교) |
| 인터랙션 | 마우스 Hover |
| 화면 비율 | 약 15-20% |
| **시사점** | **가장 복잡한 Tooltip 중 하나.** Star Force 별, Potential 등급 색상, Scroll 강화치가 모두 한 Tooltip에. 2025년 UI 리뉴얼에서 정보 그룹핑 개선(유사 정보끼리 묶기) |

#### Dungeon Fighter Online (DFO)

| 항목 | 내용 |
|:---|:---|
| 표시 방식 | Tooltip on Hover |
| 표시 정보 | 장비명(강화 수치 + 이름 순서), 장비 타입, 착용 가능 클래스, 기본 스탯, 부가 옵션, Set Bonus, 강화 레벨, Enchant |
| 스탯 비교 | 장착 중 아이템과 비교 Tooltip 지원. 비활성 조건부 옵션은 비표시, 중복 불가 옵션은 빨간색 |
| 인터랙션 | 마우스 Hover |
| 화면 비율 | 약 15-25% |
| **시사점** | 조건부 옵션 표시/비표시 처리. 강화 수치가 이름 앞에 표시. Tooltip 길이 확장 |

---

### 1.5 Roguelike / Roguelite (4개)

#### Slay the Spire

| 항목 | 내용 |
|:---|:---|
| 표시 방식 | Tooltip on Hover (카드) + Side Panel (Relic) |
| 표시 정보 | 카드: 이름, 에너지 비용, 레어리티(색상 테두리), 효과 텍스트, 업그레이드 버전. Relic: 이름, 효과, Flavor Text |
| 스탯 비교 | 없음 (카드 게임이므로 수치 비교보다 시너지 판단) |
| 인터랙션 | 마우스 Hover. Relic은 하단 바에 아이콘 나열, Hover로 상세 |
| 화면 비율 | 카드 약 10-15%, Relic Tooltip 약 10% |
| **시사점** | Relic 아이콘을 하단 바에 작게 나열 + Hover로 상세. ECHORIS Memory Shard 표시에 참고 가능 |

#### Hades

| 항목 | 내용 |
|:---|:---|
| 표시 방식 | Popup on Acquisition + Side Panel (Boon 메뉴) |
| 표시 정보 | Boon 이름, 신 이름(색상), 등급(Common/Rare/Epic/Heroic/Legendary), 효과 수치, 레벨, Flavor Text |
| 스탯 비교 | 없음 (Boon은 교체가 아닌 추가 방식) |
| 인터랙션 | 획득 시 선택 UI. 메뉴에서 좌측 카테고리 + 우측 상세 |
| 화면 비율 | 획득 UI 약 60%, 메뉴 100% |
| **시사점** | 등급별 색상 + 신별 색상 이중 코딩. Pin 기능으로 중요 Boon을 HUD에 표시 |

#### Risk of Rain 2

| 항목 | 내용 |
|:---|:---|
| 표시 방식 | Tooltip on Hover (하단 아이템 바) |
| 표시 정보 | 이름, 등급(색상), 효과 설명. **스택 수치는 기본 미표시** (커뮤니티 불만 사항) |
| 스탯 비교 | 없음 |
| 인터랙션 | 마우스 Hover (Tab으로 아이템 목록) |
| 화면 비율 | 약 10-15% |
| **시사점** | 스택 정보 미표시가 사용자 불만의 원인. **정보 부족은 플레이어 이탈로 직결** |

#### Enter the Gungeon

| 항목 | 내용 |
|:---|:---|
| 표시 방식 | Pickup Popup + Full-Screen Codex(Ammonomicon) |
| 표시 정보 | 획득 시: 이름 + 한 줄 설명. Ammonomicon: 이름, 등급, 상세 설명, 일러스트 |
| 스탯 비교 | 없음 |
| 인터랙션 | 획득 시 자동 팝업. 상세는 ESC > Ammonomicon |
| 화면 비율 | 획득 팝업 약 5-10%, Ammonomicon 100% |
| **시사점** | 이중 구조: 획득 시 최소 정보 + 원할 때 상세 열람. 정보 계층 분리의 좋은 사례 |

---

## 2. 아이템 정보 표시 패턴 분류

### 2.1 패턴 요약 비교표

| 패턴 | 대표 게임 | 장점 | 단점 | ECHORIS 적합성 |
|:---|:---|:---|:---|:---|
| **Tooltip on Hover/Select** | Diablo 2/3/4, PoE, MapleStory, DFO | 빠른 확인, 화면 전환 없음 | 복잡한 아이템은 Tooltip이 거대해짐 | **높음** (마우스+키보드 웹 게임) |
| **Side Panel** | Hollow Knight, Hades | 안정적 레이아웃, 일관된 정보 위치 | 화면 공간 소모, 실시간 게임에서 방해 | 중간 (인벤토리 내부에서 사용 가능) |
| **Full-Screen Detail** | Disgaea, SotN, FFT, Salt & Sanctuary | 충분한 공간, 복잡한 정보 표시 가능 | 몰입 단절, 전환 비용 | **높음** (Memory Shard/Memory Strata 상세용) |
| **Inline Preview** | Dead Cells, Risk of Rain 2 | 즉각적, 최소 인터랙션 | 표시 가능 정보 매우 제한 | 낮음 (ECHORIS 아이템이 너무 복잡) |
| **Compare Mode** | Diablo 3/4, Dead Cells, FFT | 의사결정 지원 | 화면 공간 2배 소모 | **높음** (장비 교체 핵심) |

### 2.2 패턴 상세

#### Pattern A: Tooltip on Hover/Select

아이템 위에 커서를 올리거나 선택하면 아이템 근처에 떠다니는 정보 상자가 표시된다.

- **Diablo 계열:** 레어리티 색상 이름 > 아이템 타입 > 기본 스탯 > Affix 목록 > 소켓 > 요구 조건 > Flavor Text 순서
- **MapleStory:** Star Force 별 > 이름 > 카테고리 > 스탯 > Potential > Scroll > 세트 효과 순서
- **PoE:** 이름 > 베이스 타입 > Implicit > Explicit > 소켓 시각화 > 요구 조건 순서

**공통 규칙:** 가장 중요한 정보(이름, 레어리티)가 최상단. 수치 스탯이 중간. 부가 정보(Lore, 요구 조건)가 하단.

#### Pattern B: Side Panel (Split View)

화면의 한쪽(보통 우측)에 고정된 패널에 선택된 아이템의 상세 정보를 표시한다.

- **Hollow Knight:** 좌측 그리드 + 우측 설명 패널
- **Hades:** 좌측 카테고리 + 우측 상세
- **Blasphemous:** 좌측 아이콘 격자 + 우측 일러스트 + 설명

**공통 규칙:** 레이아웃이 고정되어 있어 플레이어가 정보 위치를 학습하기 쉬움. 키보드/컨트롤러 네비게이션에 최적.

#### Pattern C: Full-Screen Detail View

전체화면을 사용하여 아이템의 모든 정보를 한 번에 표시한다.

- **Disgaea:** 아이템 8개 스탯 + Specialist(Memory Shard) 목록 + Rarity + Item Level + Item World 상태
- **SotN:** 장비 리스트 + 장비 스탯

**공통 규칙:** 복잡한 아이템 시스템에 필수. "더 보기" 없이 모든 정보 표시.

#### Pattern D: Compare Mode

장착 중인 아이템과 선택된 아이템을 나란히 표시하여 비교한다.

- **Diablo 3/4:** 좌측 = 새 아이템 Tooltip, 우측 = 장착 중 Tooltip. 수치 차이를 초록(상승)/빨강(하락)으로 표시
- **Dead Cells:** 화면 상단에 두 아이템을 나란히 표시
- **FFT:** 장착 전후 스탯을 화살표(Up/Down)로 표시

---

## 3. 정보 계층 (Information Hierarchy)

17개 게임의 공통 패턴을 분석한 결과, 3단계 정보 계층이 업계 표준이다.

### Level 1: 그리드 내 즉시 인지 (Always Visible)

| 정보 | 표현 방식 | 채택 게임 |
|:---|:---|:---|
| 레어리티 | 아이콘 테두리/배경 색상 | Diablo, PoE, MapleStory, Hades, Dead Cells |
| 장착 상태 | 별도 테두리/아이콘/체크마크 | Diablo, SotN, DFO |
| 아이템 종류 | 아이콘 실루엣 | 거의 모든 게임 |
| 강화 레벨 | 아이콘 위 숫자/별 | MapleStory(Star Force), DFO(+수치), Disgaea |
| 소켓/Memory Shard 유무 | 작은 점/아이콘 | Diablo(소켓 원), PoE(소켓 색상) |

### Level 2: 선택/Hover 시 표시 (On Select/Hover)

| 정보 | 표현 방식 | 채택 게임 |
|:---|:---|:---|
| 아이템 이름 | 레어리티 색상 텍스트 | Diablo, PoE, MapleStory, Grim Dawn |
| 핵심 스탯 (ATK/DEF) | 숫자 | 거의 모든 게임 |
| 레어리티 등급명 | 텍스트 (Rare, Legendary 등) | Diablo, Hades |
| 간략 효과 설명 | 1~2줄 텍스트 | Dead Cells, Enter the Gungeon, Risk of Rain 2 |
| 장착 비교 | 초록/빨강 수치 또는 화살표 | Diablo 3/4, FFT |

### Level 3: 상세 보기 (On Click/Detail View)

| 정보 | 표현 방식 | 채택 게임 |
|:---|:---|:---|
| 전체 스탯 목록 | 수치 테이블 | Disgaea, PoE, Grim Dawn |
| Affix/Mod 상세 | Prefix/Suffix 분리, Tier 색상 | PoE, Grim Dawn, Diablo 4 |
| 소켓/Specialist 목록 | 리스트 + 아이콘 + 상태 | Disgaea(Memory Shard), PoE(소켓), Diablo(젬) |
| Lore/Flavor Text | 이탤릭 또는 별도 색상 텍스트 | Diablo, PoE, Slay the Spire |
| 세트 보너스 | 초록 텍스트 (활성/비활성 구분) | Diablo 3, DFO |
| Item World 상태 | 진입 가능 여부, 클리어 이력 | Disgaea |
| Roll Range | 최소~최대 범위 바 | Diablo 4 |

---

## 4. 복잡한 아이템 시스템의 표시 솔루션

### 4.1 다중 스탯 보너스 (Affix 시스템)

**문제:** 아이템에 5개 이상의 보너스 스탯이 붙으면 Tooltip이 길어진다.

| 게임 | 솔루션 |
|:---|:---|
| Diablo 3 | Primary Affix(4개)와 Secondary Affix(2개)를 구분선으로 분리 |
| Diablo 4 | Affix 옆에 Roll Range 바를 표시하여 품질 판별 |
| PoE | Implicit(구분선 위)과 Explicit(구분선 아래) 분리. Alt로 Tier 표시 |
| Grim Dawn | 긴 Tooltip은 마우스 휠 스크롤 지원 |
| MapleStory | 기본 스탯 / Scroll 강화 / Potential / Bonus Stat을 섹션으로 그룹핑 |

**ECHORIS 적용:** ATK/INT/HP 3개 핵심 스탯 + 레어리티 배율 + Memory Shard 보너스를 명확히 분리 표시

### 4.2 소켓/젬 시스템 (= ECHORIS Memory Shard)

**문제:** 아이템 내부에 거주하는 존재(Memory Shard)의 정보를 어떻게 표시할 것인가.

| 게임 | 솔루션 | 시각 표현 |
|:---|:---|:---|
| Diablo 2/3 | 소켓 = 회색 원. 젬 장착 시 젬 색상으로 채워짐 | 아이콘 위 또는 Tooltip 내 원형 아이콘 |
| PoE | 소켓 = R/G/B/W 색상 원 + 링크 연결선 | Tooltip 내 소켓 격자 시각화 |
| Disgaea | Specialist = 리스트 뷰 (이름 + Lv + 상태 아이콘) | 상세 화면에서 리스트. Wild=빨간 얼굴, Subdued=노란 얼굴 |
| Slay the Spire | Relic = 하단 바 아이콘 나열 + Hover Tooltip | 작은 아이콘 배열 |

**ECHORIS 적용:** Memory Shard은 Disgaea 방식(리스트 뷰 + 상태 아이콘) + PoE 방식(슬롯 시각화) 조합 추천

### 4.3 아이템 레벨 / 강화 레벨

| 게임 | 표시 위치 | 표현 |
|:---|:---|:---|
| MapleStory | 아이콘 위 Star Force 별 | 별 아이콘 (최대 25개, 5개씩 한 줄) |
| DFO | 아이템 이름 앞 | "+12 어둠의 검" 형식 |
| Disgaea | 상세 화면 | "Item Lv: 45" 텍스트 |
| Diablo 4 | Tooltip 최상단 | "Item Power: 820" 숫자 |

**ECHORIS 적용:** 현재 아이콘 좌상단 검정 사각형 방식을 유지하되, Level 2에서 "Lv.{n}" 텍스트로 명시

### 4.4 세트 보너스

| 게임 | 솔루션 |
|:---|:---|
| Diablo 3 | Tooltip 하단에 세트명 + 보너스 리스트. 활성화된 보너스=초록, 미활성=회색 |
| DFO | 동일. 중복 불가 옵션은 빨간 텍스트 |

**ECHORIS 적용:** Phase 1에서 세트 시스템은 없으므로 후순위. 도입 시 Diablo 3 방식 채택

### 4.5 Lore/Flavor Text

| 게임 | 표시 방식 |
|:---|:---|
| Diablo | Tooltip 최하단, 이탤릭, 갈색/황금 텍스트 |
| PoE | Tooltip 최하단, 이탤릭 |
| Slay the Spire | Relic Tooltip 하단, 작은 이탤릭 |
| Blasphemous | 우측 패널 하단, 풍부한 Lore |

**ECHORIS 적용:** Level 3(상세 보기)에서 Flavor Text 표시. 아이템의 "기억"과 연결된 Lore

### 4.6 "아이템 속의 아이템" (Memory Strata)

ECHORIS의 가장 독특한 기능. 직접적 레퍼런스가 있는 게임은 Disgaea뿐이다.

| 게임 | 유사 시스템 | 표시 방식 |
|:---|:---|:---|
| Disgaea | Item World | 상세 화면에서 "Floor: 30/30" 진행도. NPC를 통해 진입 |
| Diablo 3 | Greater Rift (간접 유사) | 별도 UI로 진입. 아이템 Tooltip과 분리 |

**ECHORIS 적용:** Level 1에서 아이콘 우하단 배지(클리어 여부), Level 2에서 "Strata: 2/4 Cleared" 텍스트, Level 3에서 지층별 상세(보스 타입, 클리어 여부, 발견된 Memory Shard)

---

## 5. 웹 / 픽셀아트 UI 제약사항

### 5.1 픽셀아트에서의 텍스트 가독성

| 과제 | 솔루션 | 사례 |
|:---|:---|:---|
| 작은 폰트에서 가독성 저하 | 전용 픽셀 폰트 사용 (5x7, 6x8 등). Anti-aliasing 비활성 | Dead Cells, Celeste |
| 스탯 수치가 많을 때 | 아이콘 + 숫자 조합으로 텍스트 양 감소 | 대부분의 픽셀아트 게임 |
| Tooltip 배경과 게임 배경 구분 | 반투명 어두운 배경 + 밝은 테두리 | Dead Cells, Enter the Gungeon |
| 긴 설명 텍스트 | 한 줄 최대 너비 제한 + 자동 줄바꿈 | 일반적 |

### 5.2 웹 브라우저 해상도

| 항목 | 고려사항 |
|:---|:---|
| 기본 해상도 | ECHORIS는 640x360 내부 해상도, CSS 스케일링으로 확대 |
| Tooltip 크기 | 내부 해상도 기준 최대 너비 약 200px, 높이 유동적 |
| 폰트 크기 | 내부 해상도 기준 최소 5px (640x360에서 가독성 확보) |
| DPI 스케일링 | CSS `image-rendering: pixelated`로 선명한 스케일링 |

### 5.3 마우스+키보드 하이브리드 조작

| 시나리오 | 패턴 |
|:---|:---|
| 마우스 사용 시 | Hover Tooltip (Diablo 스타일) |
| 키보드 전용 시 | 방향키로 선택 + 자동 Tooltip 표시 (현재 ECHORIS 방식) |
| 상세 보기 | 특정 키(예: Z 또는 Enter)로 Full Detail View 진입 |
| 비교 모드 | 특정 키(예: C)로 장착 중 아이템과 비교 Tooltip 토글 |

### 5.4 작은 화면 대응

- 640x360 내부 해상도에서 Side Panel 방식은 게임 화면을 가림
- **Tooltip 방식이 최적:** 필요할 때만 표시, 크기 유동적
- **Full Detail은 오버레이:** 현재 인벤토리처럼 반투명 오버레이 위에 표시

---

## 6. ECHORIS 전용 권장안

### 6.1 Primary Display Pattern: 하이브리드 3단계

ECHORIS의 아이템은 일반 ARPG보다 복잡하고(Memory Shard + Memory Strata), 픽셀아트 웹 게임이라는 제약이 있다. 따라서 **Tooltip + Detail View 하이브리드**를 권장한다.

```
Level 1 (그리드)     -- 아이콘만으로 즉시 인지
Level 2 (선택 시)    -- Tooltip/Side Info로 핵심 정보
Level 3 (Z키)       -- Full Detail Overlay로 완전 정보
```

### 6.2 정보 계층 상세

#### Level 1: 그리드 슬롯 (20x20px)

현재 구현에 추가 권장 사항:

| 요소 | 위치 | 현재 | 권장 |
|:---|:---|:---|:---|
| 레어리티 색상 | 중앙 14x14 | 구현됨 | 유지 |
| 장착 테두리 | 슬롯 테두리 | 노란색 (Rare와 충돌) | 흰색 `0xFFFFFF` 또는 이중 테두리로 변경 |
| 레벨 인디케이터 | 좌상단 6x6 | 검정 사각형 | 유지 (Level > 0일 때) |
| 클리어 배지 | 우하단 4x4 | 초록 사각형 | 유지 |
| **Memory Shard 인디케이터** | **좌하단 4x4** | 없음 | **추가 권장**: Memory Shard가 1개 이상이면 작은 점 표시 |
| **무기 종류 아이콘** | **중앙** | 없음 (색상 사각형만) | **Phase 2에서**: 무기별 실루엣 아이콘 |

#### Level 2: 선택 시 정보 (Tooltip / Side Info)

현재 구현: 패널 하단 3줄 텍스트
권장: 인벤토리 패널 우측에 확장 Info Box

```
+--[ INVENTORY ]--+---[ INFO ]----------+
|  [■] [■] [■] [■] [■] |  Iron Blade [E]      |
|  [■] [■] [■] [■] [■] |  RARE                |
|  [■] [■] [■] [■] [■] |  ~~~~~~~~~~~~~~~~    |
|  [■] [■] [■] [■] [■] |  ATK: 45  INT: 0     |
|                 |  HP:  +10            |
|                 |  ~~~~~~~~~~~~~~~~    |
|                 |  Memory Shards: 2/4      |
|                 |  Strata: 1/3 CLR     |
|                 |  ~~~~~~~~~~~~~~~~    |
|                 |  [Z] Detail [X] Equip|
+-----------------+----------------------+
```

**표시 정보 (위에서 아래 순서):**

1. **아이템명** + 장착 표시 `[E]`
2. **레어리티** (색상 텍스트)
3. 구분선
4. **핵심 스탯:** ATK / INT / HP (변화량은 초록/빨강)
5. 구분선
6. **Memory Shard 요약:** 현재 수 / 최대 슬롯
7. **Memory Strata 요약:** 클리어 지층 / 전체 지층
8. 구분선
9. **조작 힌트:** `[Z] Detail` `[X] Equip` `[C] Compare`

#### Level 3: 상세 보기 (Z키 Full Detail Overlay)

인벤토리 위에 전체화면 오버레이로 표시. Disgaea 스타일.

```
+============[ IRON BLADE ]============+
|  RARE         Lv.3  Cycle:2  CLR     |
|  Blade (Weapon)                      |
+--------------------------------------+
|  BASE STATS          FINAL STATS     |
|  ATK: 30             ATK: 45         |
|  INT:  0             INT:  0         |
|  HP:   0             HP: +10         |
+--------------------------------------+
|  MEMORY_SHARDS (2/4 slots)               |
|  [!] ATK Boost Lv.3    (Subdued)     |
|  [!] HP Boost  Lv.2    (Wild)        |
|  [ ] Empty                           |
|  [ ] Empty                           |
+--------------------------------------+
|  MEMORY STRATA (1/3 cleared)         |
|  [V] Stratum 1 - Item General       |
|  [ ] Stratum 2 - Item King          |
|  [ ] Stratum 3 - Item God           |
+--------------------------------------+
|  "A blade forged in the memory of    |
|   an ancient smith's first creation" |
+--------------------------------------+
|  [X] Close  [C] Compare  [W] Enter  |
+======================================+
```

**표시 정보 (위에서 아래 순서):**

1. **헤더:** 아이템명 (레어리티 색상)
2. **메타 정보:** 레어리티, Level, Cycle, 클리어 상태
3. **무기/방어구 타입**
4. 구분선
5. **스탯 테이블:** Base Stats vs Final Stats (Memory Shard 보너스 반영)
6. 구분선
7. **Memory Shard 리스트:** 슬롯별 이름 + 레벨 + 상태(Wild/Subdued). 빈 슬롯도 표시
8. 구분선
9. **Memory Strata 진행도:** 지층별 클리어 여부 + 보스 타입
10. 구분선
11. **Flavor Text:** 이탤릭/별도 색상
12. **조작 힌트:** Close / Compare / Enter Item World

### 6.3 스탯 비교 방식

**권장: Diablo 3/4 하이브리드**

```
+---[ EQUIPPED ]---+---[ SELECTED ]---+
|  Steel Blade [E] |  Iron Blade      |
|  LEGENDARY       |  RARE            |
|  ATK: 78         |  ATK: 45 (-33)   |
|  INT:  5         |  INT:  0 (-5)    |
|  HP: +25         |  HP: +10 (-15)   |
|  Memory Shards: 4/6  |  Memory Shards: 2/4  |
|  Strata: 3/4     |  Strata: 1/3     |
+------------------+------------------+
```

- 수치 감소: 빨간색 `(-33)`
- 수치 상승: 초록색 `(+12)`
- 동일: 표시 없음
- **C키**로 Compare Mode 토글 (현재 장착 아이템이 있을 때만 활성)

### 6.4 Memory Shard 표시 방식

3단계 구분:

| Level | 표시 |
|:---|:---|
| Level 1 (그리드) | 좌하단 4x4 점 (Memory Shard 1개 이상일 때) |
| Level 2 (선택 시) | "Memory Shards: 2/4" 요약 텍스트 |
| Level 3 (상세) | 슬롯별 리스트: 아이콘 + 이름 + Lv + 상태. Wild=빨강 `[!]`, Subdued=초록 `[O]`, Empty=회색 `[ ]` |

Disgaea의 빨간 얼굴/노란 얼굴 아이콘을 텍스트 기호로 대체(픽셀아트 제약):
- `[!]` = Wild (빨간색) -- 아직 복종시키지 않은 상태
- `[O]` = Subdued (초록색) -- 복종 완료, 보너스 활성
- `[ ]` = Empty (회색) -- 빈 슬롯

### 6.5 Memory Strata 정보 표시

3단계 구분:

| Level | 표시 |
|:---|:---|
| Level 1 (그리드) | 우하단 초록 배지 (전체 클리어 시) |
| Level 2 (선택 시) | "Strata: 1/3 CLR" 요약 |
| Level 3 (상세) | 지층별 리스트: 클리어 여부 `[V]/[ ]` + 보스 타입 (Item General/King/God/Great God) |

### 6.6 구현 우선순위

| 순위 | 항목 | 이유 |
|:---|:---|:---|
| P0 | Level 2 Info Box (선택 시 확장 정보) | 현재 가장 부족한 부분. ATK/INT/HP + Memory Shard 요약 + Strata 요약 |
| P0 | 장착 비교 (Compare Mode) | 장비 교체 의사결정의 핵심 |
| P1 | Level 3 Detail View | Memory Shard 관리, Memory Strata 확인에 필수 |
| P1 | 장착 테두리 색상 변경 | Rare(노란색)와 충돌 해결 |
| P2 | Memory Shard 인디케이터 (Level 1) | 그리드에서 즉시 식별 |
| P3 | 무기 종류 아이콘 | 픽셀아트 아이콘 제작 필요 |

---

## Sources

- [Game UI Database - Diablo II](https://www.gameuidatabase.com/gameData.php?id=804)
- [Diablo 2 Resurrected Forums - Item Tooltip Comparison](https://diablo2.io/forums/how-does-the-item-comparison-tooltip-work-in-resurrected-t8788.html)
- [How To Enable Advanced Tooltips In Diablo 4](https://www.thegamer.com/diablo-4-how-advanced-tooltips-work/)
- [Diablo 4 Advanced Tooltip Compare](https://gamerant.com/diablo-4-max-god-perfect-roll-legendaries-weapons-armor-identify-advanced-tooltips-d4/)
- [Path of Exile Tooltip Redesign](https://devtrackers.gg/pathofexile/p/928fcfc7-tooltip-redesign-with-a-focus-on-readability-and-clarity)
- [Exile-UI (PoE Overlay)](https://github.com/Lailloken/Exile-UI)
- [Symphony of the Night Inventory - Castlevania Wiki](https://castlevania.fandom.com/wiki/Symphony_of_the_Night_Inventory)
- [Castlevania SotN UI Redesign](https://cidmengel.artstation.com/projects/8lQB3O)
- [Game UI Database - Dead Cells](https://www.gameuidatabase.com/gameData.php?id=1780)
- [Game UI Database - Hollow Knight](https://www.gameuidatabase.com/gameData.php?id=113)
- [Hollow Knight Interface Design Analysis](https://champicky.com/2022/03/23/hollow-knight-interface-design-analysis/)
- [Disgaea Item World - Disgaea Wiki](https://disgaea.fandom.com/wiki/Item_World)
- [Disgaea Items - Disgaea Wiki](https://disgaea.fandom.com/wiki/Items)
- [Disgaea 5 Item World Overview](https://www.gamerguides.com/disgaea-5-alliance-of-vengeance/guide/extras/item-world/overview)
- [MapleStory NEXT III UI Revamp (v244)](https://www.maplesea.com/updates/view/v244_Patch_Notes_2/)
- [MapleStory Equipment Tooltip Revamp Forum](https://forums.maplestory.nexon.net/discussion/comment/62644)
- [DFO Equipment System Improvements](https://www.dfoneople.com/news/updates/3990/Equipment-Updates/Equipment-System-Improvements)
- [Slay the Spire UI Redesign Analysis](https://medium.com/@n01578837/final-deliverable-632cfc09e673)
- [Game UI Database - Hades](https://www.gameuidatabase.com/gameData.php?id=534)
- [Risk of Rain 2 ItemStatsMod](https://thunderstore.io/package/ontrigger/ItemStatsMod/)
- [Enter the Gungeon Ammonomicon](https://enterthegungeon.wiki.gg/wiki/Ammonomicon)
- [Grim Dawn Items Wiki](https://grimdawn.fandom.com/wiki/Items)
- [Game UI Tooltip Design Best Practices](https://www.patternsgameprog.com/strategy-game-20-tooltips)
- [Salt and Sanctuary Equipment Guide](https://gamefaqs.gamespot.com/ps4/834700-salt-and-sanctuary/faqs/73366/equipment-and-inventory)
- [Game UI Database - Blasphemous](https://www.gameuidatabase.com/gameData.php?id=97)
