# 아이템 종류 전수 조사 (Weapons / Armor / Accessories Full Survey)

> Research Date: 2026-04-18 (초안) / 2026-04-18 후반 (DEC-026 sci-fi 세계관 적용)
> Purpose: ECHORIS 무기·방어구·장신구 체계 확장 방향 결정을 위한 레퍼런스 수집
> Scope: 18개 레퍼런스 게임 교차 조사, 2D 횡스크롤 구현 제약 중심
> 최종 결정 로그: `memory/wiki/decisions/DEC-026.md`

---

## 1. 요약 (TL;DR)

### 1.1 리서치 결론 (원안)

- 2D 횡스크롤에서 **무브셋 차별성이 확보되는 무기 카테고리는 7-9종**이 상한선입니다. Castlevania: Dawn of Sorrow(약 8계열), Bloodstained(11계열), Disgaea(9종)가 실증 사례입니다.
- **방어구 슬롯 수는 5개가 UI 복잡도/파밍 깊이의 황금 비율**입니다. Elden Ring 4슬롯(Soulslike), Diablo 2 6슬롯(ARPG 표준), Diablo 3 8슬롯+방어구(과도), PoE 7슬롯을 비교할 때 5슬롯은 "파밍할 거리는 충분하되 정리 부담은 낮은" 지점입니다.
- **장신구 슬롯 3개(Ring x2 + Amulet x1) 또는 4개(Talisman 방식)** 중 하나로 수렴하는 것이 업계 표준입니다. Diablo 2/3, Dark Souls 3, Elden Ring 모두 이 범위를 벗어나지 않습니다.
- **ECHORIS의 이노센트 시스템은 장신구 슬롯의 "효과 부여자" 역할을 이미 수행**하고 있으므로, 별도의 "부적/각인" 슬롯을 추가하면 기능 중복이 발생합니다. 장신구 슬롯은 "영구 스탯 증가" 역할로 한정하는 것을 권장합니다.

### 1.2 DEC-026 최종 채택안 (세계관 적용)

**무기 7종** (근접 5 + 원거리 2):

| 공식 명칭 | 세계관 해석 | 원안 대비 |
|:---|:---|:---|
| **Blade** | 단조 공방의 한손 절삭기 | Sword 리네이밍 |
| **Cleaver** | 격벽/강판 파쇄도 | Greatsword 리네이밍 |
| **Shiv** | 외과/암살용 단도 | Dagger 리네이밍 |
| **Harpoon** | 빌더 리바(rebar) 장창 | Spear 리네이밍. 긴 직선 리치 포지션 |
| **Chain** | 산업용 강철 사슬 | 신규 (Fist 대체). 가변 리치 포지션 |
| **Railbow** | 전자기 가속 투척기 | Bow 리네이밍 |
| **Emitter** | 파동 방출 장비 | Staff 리네이밍. INT 스케일링 유지 |

> **Fist 제외 근거:** 메가스트럭처 전투 스케일과 맨손 격투 충돌. BLAME!/빌더 세계관에 산업 장비(사슬/리바)가 더 적합.

**장비 슬롯 5종** (sci-fi 리네이밍):

| 공식 명칭 | 원안 명칭 | 세계관 해석 |
|:---|:---|:---|
| **Visor** | Head/Helm | 관측용 HUD 헬멧 |
| **Plate** | Chest/Armor | 용접 결 판금 장갑 |
| **Gauntlet** | Hands | 단조 공방 건틀릿 |
| **Greaves** | Feet | 등반용 각반 |
| **Rig** | Cloak | 배면 장착 모듈. 유니크 효과 전용 슬롯 |

**장신구 3슬롯:**

| 공식 명칭 | 원안 명칭 | 수량 | 세계관 해석 |
|:---|:---|:---:|:---|
| **Sigil** | Ring | 2 | 빌더 문양 각인 금속 인장 |
| **Seal** | Amulet | 1 | 상위 빌더 권한 봉인체 (대형 효과) |

본 문서 이하 섹션은 리서치 원문(판타지 용어)을 보존합니다. 실제 게임 내 표시/코드는 DEC-026 공식 명칭을 따릅니다.

---

## 2. 무기 카테고리 전수

### 2.1 근접 무기 (Melee)

| 카테고리 | 대표 레퍼런스 | 무브셋 핵심 | 2D 횡스크롤 적합도 | 구현 난이도 |
| :--- | :--- | :--- | :---: | :---: |
| One-Handed Sword | Castlevania SotN, Bloodstained, Disgaea | 중속/중거리, 콤보 기본 | 별5 | 별1 |
| Greatsword / Two-Handed | Vagrant Story, Monster Hunter, Dark Souls | 저속 대미지, 긴 리치 상하 스윙 | 별5 | 별2 |
| Dagger / Short Blade | Castlevania, Bloodstained, Vagrant Story | 고속 연타, 짧은 리치 | 별5 | 별1 |
| Spear / Polearm | Castlevania DoS, Bloodstained, Disgaea, Vagrant Story | 직선 찌르기, 최대 리치 | 별5 | 별2 |
| Axe | Castlevania DoS, Bloodstained, Disgaea | 저속 고대미지, 수직 궤적 강점 | 별4 | 별2 |
| Hammer / Mace | Vagrant Story (Heavy Mace), MH Hammer | 둔기, 넉백/스턴 특화 | 별4 | 별2 |
| Whip | Castlevania 시리즈, Bloodstained | 가변 리치, 채찍 궤적 | 별4 | 별3 |
| Fist / Knuckle | Disgaea, CV Aria(Whip Knuckle), Hades(Malphon) | 초근접 초고속 연타 | 별5 | 별1 |
| Boots / Kick | Bloodstained | Strike 속성 발차기, 근접 대쉬 | 별3 | 별3 |
| Scythe / 낫 | Castlevania 시리즈 | 곡선 궤적, 넓은 타격 | 별3 | 별3 |
| Katana / 일본도 | Castlevania, Bloodstained | 발도/납도 콘셉트 | 별3 (Sword와 차별화 어려움) | 별2 |

- **Dawn of Sorrow 확인 카테고리:** Sword / Greatsword / Spear / Axe / Gun / Whip Knuckle 등
- **Bloodstained 확인 카테고리:** 12계열 (Sword / Rapier / Dagger / Whip / Spear / Boots / Greatsword / Katana / Hammer / Gun / Shard 등)
- **Disgaea 확인 카테고리:** 9종 (Fist / Sword / Spear / Bow / Gun / Axe / Staff / Physical Monster / Magical Monster)

### 2.2 원거리 무기 (Ranged)

| 카테고리 | 대표 레퍼런스 | 무브셋 핵심 | 2D 횡스크롤 적합도 | 구현 난이도 |
| :--- | :--- | :--- | :---: | :---: |
| Bow | Disgaea, MH, 다수 | 조준 각도 변화, 차지샷 | 별5 | 별2 |
| Crossbow | Vagrant Story, Castlevania | 직선 고속 볼트, 재장전 | 별4 | 별2 |
| Gun / Handgun | CV Aria(3종), Bloodstained, Disgaea | 직선 탄환, 탄약 관리 | 별4 | 별2 |
| Rifle / Bowgun | Monster Hunter(Light/Heavy) | 원거리 정밀 / 장탄수 | 별3 | 별3 |
| Throwing Dagger | 다수 서브웨폰 | 포물선 투척 | 별4 | 별2 |

- **주의:** 2D 횡스크롤에서 원거리 무기는 "높이 차"를 활용한 수직 조준이 핵심입니다. CV Aria의 3종 총기(Handgun / Silver Gun / Positron Rifle)처럼 탄속/관통/범위로 차별화가 가능합니다.

### 2.3 마법 무기 (Magic Weapon)

| 카테고리 | 대표 레퍼런스 | 무브셋 핵심 | 2D 횡스크롤 적합도 | 구현 난이도 |
| :--- | :--- | :--- | :---: | :---: |
| Staff / Rod | Disgaea, Vagrant Story, MH(Insect Glaive) | INT 스케일, 원거리 투사체 | 별5 | 별2 |
| Catalyst / Wand | Dark Souls 3 (Sorcery Catalyst), Elden Ring | 마법 시전 전용, 스펠 부스트 | 별4 | 별3 |
| Talisman / Sacred Seal | Dark Souls 3 (기적용), Elden Ring | 신앙/미라클 전용 | 별3 (ATK/INT 이원화에 불필요) | 별2 |
| Tome / Grimoire | 다수 JRPG | 책 형태 캐스터 | 별3 | 별3 |

- **ECHORIS 관련성:** ATK/INT 이중 스탯 게이트 구조상 "Staff" 1종으로 마법 계열을 통합하는 현 설계가 합리적입니다. Dark Souls식 Catalyst/Talisman 분리는 신앙/이지능력이 없는 ECHORIS에 불필요합니다.

### 2.4 특수 무기 (Gimmick/Hybrid)

| 카테고리 | 대표 레퍼런스 | 기믹 특성 | 2D 횡스크롤 적합도 | 구현 난이도 |
| :--- | :--- | :--- | :---: | :---: |
| Switch Axe | Monster Hunter | 도끼/검 변형 | 별2 (모드 전환 UI 부담) | 별5 |
| Charge Blade | Monster Hunter | 방패/검 차지 | 별2 | 별5 |
| Gunlance | Monster Hunter | 창+포탄 | 별3 | 별4 |
| Insect Glaive | Monster Hunter | 공중 기동 쌍절창 | 별3 | 별4 |
| Hunting Horn | Monster Hunter | 파티 버프 멜로디 | 별2 | 별4 |
| Shield (공격용) | Hades(Shield of Chaos), Dead Cells, MH(SnS) | 방어+반격 투척 | 별4 | 별3 |
| Dual Blades | Dead Cells, MH | 쌍검 연타 | 별4 | 별3 |
| Rail / Firearm | Hades(Exagryph) | 연사 원거리 | 별3 | 별3 |

- **원칙:** MH식 복합 무기(Switch Axe 등)는 3D 공간과 모션 블렌딩에 강하게 의존하므로 2D 도트 환경에서는 연출/판정 비용이 급격히 증가합니다. Hades(6종), Dead Cells(브루탈/택틱/서바이벌 3계열)가 2D에서의 현실적 상한선입니다.

### 2.5 ECHORIS 적합도 매트릭스

| 무기 | 현재 포함 | 무브셋 차별성 | 스탯 스케일 | 확장 추천도 | 비고 |
| :--- | :---: | :---: | :---: | :---: | :--- |
| Sword | O | 중 | ATK | 유지 | 기준점 |
| Greatsword | O | 고 | ATK | 유지 | 저속 고뎀 |
| Dagger | O | 고 | ATK | 유지 | 고속 연타 |
| Bow | O | 고 | ATK | 유지 | 유일한 원거리 |
| Staff | O | 고 | INT | 유지 | 유일한 마법 |
| **Spear** | X | 고 (리치 차별) | ATK | **최우선 추가** | 긴 직선 찌르기 |
| **Fist** | X | 고 (초근접) | ATK | **권장 추가** | 초고속, Dagger보다 더 짧음 |
| Axe | X | 중 (Greatsword와 중복 위험) | ATK | 보류 | Greatsword와 역할 겹침 |
| Whip | X | 고 (가변 리치) | ATK | 2차 확장 | 연출 비용 높음 |
| Hammer | X | 중 (Greatsword와 중복) | ATK | 비권장 | |
| Gun | X | 고 | ATK | 2차 확장 | Bow와 역할 겹침 가능 |
| Shield | X | 고 (방어 역할) | - | 별도 슬롯 고려 | 오프핸드로 분리 |

**결론:** **5종 -> 7종 확장(+Spear, +Fist)** 이 1차 로드맵으로 적절합니다. Spear는 2D 메트로베니아의 "리치 가이더"로 Castlevania/Disgaea가 일관되게 유지하는 표준이며, Fist는 Dagger보다 더 극단적인 "초근접 초고속" 포지션을 차지합니다.

---

## 3. 방어구 슬롯 체계

### 3.1 주요 게임 슬롯 매트릭스

| 게임 | Head | Chest | Hands | Feet | Legs | Shoulders | Belt | Cloak | Shield/OH | 총 방어구 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Diablo 2 | O | O | O | O | - | - | O | - | O | 6 |
| Diablo 3 | O | O | O | O | O | O | O | - | O | 8 |
| Diablo 4 | O | O | O | O | O | - | - | - | O | 6 |
| PoE | O | O | O | O | - | - | O | - | O | 6 |
| Grim Dawn | O | O | O | O | O | O | O | - | O | 8 |
| Last Epoch | O | O | O | O | - | - | O | - | O | 6 |
| Elden Ring | O | O | O | O | - | - | - | - | (무기슬롯) | 4 |
| Dark Souls 3 | O | O | O | O | - | - | - | - | (무기슬롯) | 4 |
| Castlevania SotN | O | O | - | - | - | - | - | O | - | 3 + 악세2 |
| Bloodstained | O | O | - | - | - | - | - | O(Scarf) | - | 3 + 악세 |
| Hollow Knight | - | - | - | - | - | - | - | - | - | 0 (Charm 시스템 대체) |

- **Diablo 2 기준 구성:** Helmet / Chest / Gloves / Boots / Belt / Shield(OH) = 6슬롯
- **Diablo 3 확장:** + Shoulders / Pants / Bracers = 8슬롯 (방어구만 카운트 시 7)
- **Castlevania SotN:** Head Gear 1 + Chest Gear 1 + Cloak Accessory 1 + General Accessory 2 (총 5슬롯이지만 방어구는 3개)
- **Elden Ring 4슬롯:** Helm / Chest / Gauntlets / Legs

### 3.2 슬롯 수별 설계 트레이드오프

| 슬롯 수 | 장점 | 단점 | 대표 |
| :---: | :--- | :--- | :--- |
| 3-4슬롯 | UI 간결, 세트 효과 설계 용이, 빠른 파밍 순환 | 파밍 깊이 얕음, 드롭 다양성 낮음 | Elden Ring, DS3 |
| 5슬롯 | 균형 (파밍 + UI), 각 슬롯에 명확한 역할 부여 가능 | 슬롯별 스탯 분배 설계 필요 | Castlevania SotN (방어구3+악세2) |
| 6슬롯 | ARPG 표준, Diablo 2 황금비 | 솔로/야리코미 게임에서는 살짝 과도 | Diablo 2/4, PoE |
| 7-8슬롯 | 극한 파밍 깊이, 빌드 다양성 | UI 스크롤 필요, 드롭 범람, 저레어 쓰레기화 | Diablo 3, Grim Dawn |

- **핵심 관찰:** 2D 횡스크롤 메트로베니아에서 Castlevania SotN는 "방어구 3슬롯 + 악세 2슬롯 = 총 5장착"으로 25년간 표준으로 유지되고 있습니다. Bloodstained 역시 이를 그대로 계승했습니다.
- **UI 복잡도 체감 임계점:** 한 화면에 장비 슬롯이 8개를 초과하면 평균 플레이어가 "비교 피로"를 느낀다는 것이 PoE/D3 커뮤니티의 반복 피드백입니다.

### 3.3 ECHORIS 권장안

**권장 슬롯 구성: 5슬롯 (방어구)**

| 슬롯 | 주 스탯 기여 | 드롭 역할 | 비고 |
| :--- | :--- | :--- | :--- |
| Head (Helm) | HP + INT 저항 | 중레어 | Castlevania식 "INT 부스트" 슬롯 계승 가능 |
| Chest (Body) | DEF 주력 | 고레어 (메인 방어구) | 가장 무거운 슬롯, 레어리티 영향 최대 |
| Hands (Gloves) | 공격속도 / 크리 | 중레어 | 공격 보조 |
| Feet (Boots) | 이동속도 / 회피 | 중레어 | 탐험 보조, 렐릭과의 시너지 |
| Cloak (망토) | 원소 저항 / 특수효과 | 고레어 (SotN 전통) | "망토형 스페셜" 슬롯 |

- **제외 슬롯:** Shoulders, Pants, Belt, Bracers -> 파밍 범람 위험으로 제외
- **오프핸드(Shield):** 무기 카테고리 내에서 별도 처리 (Sword+Shield 조합 시 근접+방어)
- **세트 효과 설계 여지:** 5슬롯 중 "같은 세트 3개 이상 착용 시 보너스" 패턴이 익숙하고 UI 부담 없음

---

## 4. 장신구 체계

### 4.1 반지/목걸이/부적 계열

| 게임 | Ring | Amulet/Necklace | 기타 | 총 악세 슬롯 |
| :--- | :---: | :---: | :--- | :---: |
| Diablo 2 | 2 | 1 | - | 3 |
| Diablo 3 | 2 | 1 | - | 3 |
| Diablo 4 | 2 | 1 | - | 3 |
| PoE | 2 | 1 | - | 3 |
| Grim Dawn | 2 | 1 | Medal 1, Relic 1 | 5 |
| Last Epoch | 2 | 1 | Relic 1, Idol 4-20 | 4 + 유동 |
| Dark Souls 3 | 4 (Ring) | - | Covenant 1 | 4-5 |
| Elden Ring | - | - | Talisman 1-4 | 4 |
| CV SotN | - | - | Accessory 2 | 2 |
| FF XIV | - | 1 | Earring 1, Bracelet 1, Ring 2 | 5 |

- **"2 Ring + 1 Amulet" 구조**가 ARPG 표준 (Diablo 2/3/4, PoE, Grim Dawn 공통).
- **Soulslike**: Ring/Talisman 4개 (동일 종류 복수 장착), 각각 고유한 소규모 버프.
- **Castlevania/JRPG**: 포지션 구분 없는 "Accessory" 슬롯 2-3개.

### 4.2 탈리스만/각인 계열 (Soulslike)

- **Elden Ring Talisman:** 시작 1슬롯, Talisman Pouch 3개 획득 시 최대 4슬롯. 각 탈리스만은 "HP +", "특정 속성 저항 +", "무게 경감" 등 **중첩 없는 고유 버프** 1개씩.
- **Dark Souls 3 Ring:** 4개 슬롯, 동일 반지 중복 금지. 언더클래스 챌린지와 상성이 좋은 "빌드 정의 도구".
- **특징:** 레어리티 등급보다 "**유니크 ID**" 중심 설계. 드롭 랜덤성보다 "특정 보스/지역에서 고정 획득"이 기본.

### 4.3 플라스크/쥬얼/젬 계열 (PoE 방식)

- **PoE Flask 5슬롯:** HP/MP/유틸 플라스크. 몬스터 처치로 충전, 전투 중 사용.
- **PoE Jewel:** 패시브 트리에 삽입하는 소형 강화. "Abyss Jewel"은 전용 소켓용.
- **PoE Socket Gem:** 장비의 색상 소켓에 삽입하는 스킬 젬 (액티브/서포트).
- **Diablo 4 Gem:** 무기 소켓=대미지, 방어구=주스탯, 장신구=저항.
- **Last Epoch Idol:** 4-20개 슬롯 (퀘스트로 해금), 모양/크기 제약. 보석같은 영구 패시브 부여.

### 4.4 이노센트와의 관계

ECHORIS의 이노센트 시스템은 **"장비 아이템 내부에 거주하며 보너스 스탯 부여"** 구조로, 이는 다음과 중첩됩니다:

| 시스템 | 본질 | ECHORIS 이노센트와의 중복도 |
| :--- | :--- | :---: |
| PoE Jewel Socket | 장비/트리 삽입형 영구 버프 | 높음 |
| Diablo Gem | 장비 소켓에 삽입 | 중간 |
| Disgaea Innocent (원조) | 장비에 거주, 스탯 부여 | 동일 (ECHORIS는 Disgaea 계승) |
| Last Epoch Idol | 별도 인벤토리 슬롯에 배치 | 낮음 |

- **결론:** 이노센트가 이미 "장비에 삽입되는 버프 부여자" 역할을 수행하므로, ECHORIS에서 **PoE식 Jewel/Gem 소켓은 이중 시스템이 되어 삭제가 옳습니다.**
- **장신구(Ring/Amulet)의 역할 재정의:** "이노센트를 수용하지 않는 장비"로 차별화. 즉 **이노센트 슬롯이 없는 대신 고정된 유니크 효과**를 제공하는 방향. Soulslike의 Talisman과 유사한 설계.

---

## 5. 소모품·유틸 아이템

| 카테고리 | 대표 예시 | 주요 역할 | 레퍼런스 |
| :--- | :--- | :--- | :--- |
| HP 포션 | Red Potion, Estus Flask | 즉시 HP 회복 | 전체 |
| MP 포션 | Blue Potion, Ether | MP 회복 | Castlevania, FF |
| 엘릭서 | Elixir, Full Heal | HP+MP 완전 회복 | FF, Disgaea |
| 버프 포션 | Flask of Fortune, Bloodstained식 음식 | 일시 스탯 상승 | PoE, Bloodstained |
| 부활 아이템 | Phoenix Down | 사망 시 부활 | FF, Disgaea |
| 스크롤 | Scroll of Identify, Town Portal | 편의 기능 | Diablo 2 |
| 열쇠 | Key, Skeleton Key | 지역 해금 | 전체 메트로베니아 |
| 지도 조각 | Map Fragment | 맵 공개 | Castlevania SotN, Hollow Knight |
| 투척물 | Throwing Knife, Holy Water | 서브웨폰 | Castlevania 전통 |
| 토템/룬 | Rune, Totem | 일시 소환 | Dead Cells |
| 음식 | Cooked Meat, Bloodstained식 요리 | 영구 스탯 증가(한정) | Bloodstained |

- **소모품 비중 스펙트럼:**
  - 저비중 (Hollow Knight): 소모품 거의 없음. 벤치 회복 중심
  - 중비중 (Castlevania SotN): 포션 + 서브웨폰 투척물
  - 고비중 (Diablo 2, Bloodstained): 포션 스팸 전투, 요리 영구버프
- **PoE Flask:** 전투 중 능동 사용 + 몹 처치로 충전 -> "포션=스킬 일부" 설계
- **ECHORIS 권장:** 중비중. HP/MP 포션 + 열쇠/지도 + 서브웨폰 투척물 3축. 요리/음식은 2차 확장 후보.

---

## 6. 특수 아이템 카테고리

### 6.1 "영구 장착형" vs "소모형" vs "장비 삽입형" 분류

| 분류 | 대표 예시 | 작동 방식 | ECHORIS 이식 가능성 |
| :--- | :--- | :--- | :---: |
| **영구 장착형** | Elden Ring Talisman, DS3 Ring, Hollow Knight Charm | 슬롯 장착 시 지속 버프 | 장신구 슬롯으로 흡수 |
| **소모형** | Estus, Potion, Scroll | 1회 사용 후 소실(또는 충전) | 소모품 카테고리로 |
| **장비 삽입형** | Disgaea Innocent, PoE Jewel, D4 Gem, LE Idol | 장비/트리에 넣어 스탯 부여 | **이노센트가 이미 이 역할 수행** |
| **선택 전환형** | Hades Aspect, Blasphemous Mea Culpa Heart | 런/빌드마다 하나씩 선택 | 렐릭 시스템과 겹침 |
| **업적/컬렉션** | CV SotN Familiar, Blasphemous Rosary | 수집/성장 후 장착 | 이노센트 성장과 겹침 |

### 6.2 레퍼런스 특수 시스템 요약

- **Hollow Knight Charm:** 45종, Notch 3 -> 11까지 확장. "영구 장착형"의 가장 세련된 사례. ECHORIS 장신구 설계 시 강력한 레퍼런스.
- **Blasphemous Rosary Bead:** 최대 8개 슬롯, 각 비드는 1-2줄의 고유 효과. "영구 장착형"의 메트로베니아 버전.
- **Blasphemous Mea Culpa Heart:** 단 1개 장착, 포지티브+네거티브 효과 동시 부여. "빌드 정의자" 역할.
- **PoE Flask 5슬롯:** "능동 소모품 + 빌드 구성 요소"의 결합.
- **Diablo 4 Aspect 추출:** 레전더리에서 Aspect 추출 후 임프린트. "장비 삽입형"의 모던 발전형.
- **Last Epoch Idol:** 4-20슬롯 퀘스트 해금. 방어구/무기와 별도 독립 공간.

### 6.3 ECHORIS 이식 가능한 유형 식별

| 시스템 | 이식 추천 | 이유 |
| :--- | :---: | :--- |
| Hollow Knight Charm | **이노센트에 통합** | Notch 방식=이노센트 슬롯 수 제한과 동형 |
| Blasphemous Rosary | **장신구 슬롯에 흡수** | 3슬롯 장신구에 소규모 고유 효과 |
| Blasphemous Mea Culpa Heart | **렐릭 시스템에 통합** | 단일 장착 빌드 정의자 |
| PoE Flask | 포션 카테고리에 흡수 | 별도 슬롯 불필요 |
| LE Idol | 비권장 | 이노센트와 완전 중복 |
| D4 Aspect 추출 | 후순위 고려 | Legendary 이상에서 추후 확장 가능 |

---

## 7. ECHORIS 최종 권장 아이템 체계

### 7.1 전체 장착 슬롯 구성 (권장안)

| 분류 | 슬롯 수 | 구성 | 이노센트 슬롯 |
| :--- | :---: | :--- | :---: |
| 무기 | 1 | Weapon (Main Hand) | 레어리티별 2-8 |
| 방어구 | 5 | Head / Chest / Hands / Feet / Cloak | 레어리티별 2-8 (각) |
| 장신구 | 3 | Ring x2 + Amulet x1 | 0 (이노센트 불가) |
| **합계** | **9슬롯** | | |

### 7.2 무기 카테고리 확장 로드맵

**Phase 2 (알파) 확장안: 5종 -> 7종**

| 우선순위 | 카테고리 | ATK/INT | 무브셋 |
| :---: | :--- | :---: | :--- |
| 1 | Sword (기존) | ATK | 중속 3콤보 |
| 2 | Greatsword (기존) | ATK | 저속 2스윙, 차지 |
| 3 | Dagger (기존) | ATK | 고속 4연타, 짧은 리치 |
| 4 | Bow (기존) | ATK | 원거리 조준 투사체 |
| 5 | Staff (기존) | INT | 마법 투사체 |
| **+6** | **Spear** | **ATK** | 긴 직선 찌르기, 중속 |
| **+7** | **Fist** | **ATK** | 초고속 5연타, 초근접 |

**Phase 3 이후 2차 확장 후보:** Whip, Gun, Shield(오프핸드). 단, 추가할수록 이노센트 풀/밸런싱 비용이 선형 증가하므로 신중 결정.

### 7.3 방어구 슬롯 구성

| 슬롯 | 주 스탯 | 보조 효과 | 레어리티별 차별화 지점 |
| :--- | :--- | :--- | :--- |
| Head | INT | 정신 저항, HP 소폭 | 이노센트 슬롯 수 |
| Chest | DEF | HP 대폭 | 메인 방어 수치 |
| Hands | ATK 보정 | 공격속도, 크리 | 공격 부수효과 |
| Feet | 이동속도 | 회피, 점프 | 탐험/렐릭 시너지 |
| Cloak | 속성 저항 | 특수효과 (SotN 전통) | 유니크 효과 |

### 7.4 장신구 슬롯 구성

| 슬롯 | 특성 | 이노센트 | 주 효과 |
| :--- | :--- | :---: | :--- |
| Ring 1 | 교체 가능, 중복 금지 | X | 소규모 고유 버프 (Talisman식) |
| Ring 2 | 동 | X | 동 |
| Amulet | 1슬롯, 강력한 효과 | X | 빌드 정의자 (Mea Culpa Heart식) |

- **이노센트 불가 이유:** 장신구는 "고정 유니크 효과" 전담. 이노센트는 무기/방어구에서 "가변 스탯 성장"을 담당. 역할 분리 유지.
- **획득 경로:** 장신구는 드롭보다 **아이템계 지층별 보상 / 보스 드롭 / 월드 고정 보상** 위주 (Soulslike Talisman 계승).

### 7.5 소모품 체계

| 카테고리 | 슬롯/인벤토리 | 예시 |
| :--- | :--- | :--- |
| 회복 포션 | 퀵슬롯 2 (HP/MP) | Red/Blue Potion |
| 서브웨폰 | 퀵슬롯 1 | Throwing Dagger, Holy Water |
| 유틸 | 인벤토리 | Key, Map Fragment, Scroll |
| 버프 | 인벤토리 | Elixir, 특수 요리(2차) |

### 7.6 제외 권장 시스템

| 시스템 | 제외 이유 |
| :--- | :--- |
| PoE Jewel Socket | 이노센트와 완전 중복 |
| LE Idol | 이노센트와 완전 중복 |
| MH Switch/Charge 복합 무기 | 2D 모션 비용 폭증 |
| DS3 Covenant 슬롯 | 온라인 구조 다름 |
| D3 Shoulders/Pants/Bracers | 슬롯 범람 |
| FFXIV 5악세 (Earring/Bracelet) | 슬롯 범람 |

---

## 8. 레퍼런스 링크

### ARPG 계열
- [Diablo 2 Accessories Wiki](https://diablo2.wiki.fextralife.com/Accessories)
- [Diablo 2 Armor Wiki](https://diablo2.wiki.fextralife.com/Armor)
- [Diablo 3 Inventory System (Fantasy Sports Blog)](http://fantasysportsvideogames.blogspot.com/2011/01/diablo-3-new-inventory-system.html)
- [Diablo 4 Jeweler Gems & Socketing (Maxroll)](https://maxroll.gg/d4/resources/jeweler-gems-socketing)
- [Path of Exile Equipment Wiki](https://www.poewiki.net/wiki/Equipment)
- [Path of Exile Item Socket Wiki](https://pathofexile.fandom.com/wiki/Item_socket)
- [Path of Exile Jewel Wiki](https://www.poewiki.net/wiki/Jewel)
- [Grim Dawn Item Database](https://www.grimtools.com/db/)
- [Last Epoch Gear Walkthrough (Maxroll)](https://maxroll.gg/last-epoch/resources/gear-walkthrough)
- [Last Epoch Idol Slots Guide (GameRant)](https://gamerant.com/last-epoch-how-to-unlock-idol-slots/)

### Metroidvania 계열
- [Castlevania SotN Armor (StrategyWiki)](https://strategywiki.org/wiki/Castlevania:_Symphony_of_the_Night/Armor)
- [Castlevania SotN Equipment Checklist (VideoChums)](https://videochums.com/article/castlevania-symphony-of-the-night-equipment-checklist)
- [Castlevania SotN Head Gear (CastlevaniaCrypt)](https://www.castlevaniacrypt.com/sotn-head/)
- [Castlevania Aria of Sorrow Weapons](https://www.castlevaniacrypt.com/aos-weapons/)
- [Castlevania Dawn of Sorrow Weapons](https://www.castlevaniacrypt.com/dos-weapons/)
- [Bloodstained Weapons Wiki](https://bloodstainedritualofthenight.wiki.fextralife.com/Weapons)
- [Bloodstained Accessories List (GameWith)](https://gamewith.net/bloodstained-ritual-of-the-night/article/show/9965)
- [Hollow Knight Charms Wiki](https://hollowknight.wiki.fextralife.com/Charms)
- [Hollow Knight Notches Wiki](https://hollowknight.wiki.fextralife.com/Notches)
- [Blasphemous Equipment & Magic Wiki](https://blasphemous.wiki.fextralife.com/Equipment+&+Magic)
- [Blasphemous Mea Culpa Hearts](https://blasphemous.wiki.gg/wiki/Mea_Culpa_Hearts)
- [Blasphemous Rosary Beads Category](https://blasphemous.fandom.com/wiki/Category:Rosary_Beads)

### Soulslike 계열
- [Elden Ring Talismans Wiki](https://eldenring.wiki.fextralife.com/Talismans)
- [Elden Ring Talisman Pouch Wiki](https://eldenring.wiki.fextralife.com/Talisman+Pouch)
- [Dark Souls 3 Rings Wiki](https://darksouls3.wiki.fextralife.com/Rings)

### 액션/로그라이크/JRPG
- [Dead Cells Gear Wiki](https://deadcells.wiki.gg/wiki/Gear)
- [Dead Cells Ranged Weapons Wiki](https://deadcells.fandom.com/wiki/Ranged_Weapons)
- [Hades Infernal Arms Wiki](https://hades.fandom.com/wiki/Infernal_Arms)
- [Hades Weapon Aspects Guide (RPG Site)](https://www.rpgsite.net/feature/10254-hades-infernal-arms-weapon-aspects-guideevery-weapon-aspect-and-upgrade-unlock)
- [Disgaea Weapon Wiki](https://disgaea.fandom.com/wiki/Weapon)
- [List of Disgaea 5 Weapons](https://disgaea.fandom.com/wiki/List_of_Disgaea_5_Weapons)
- [Vagrant Story Weapons Wiki](https://vagrantstory.fandom.com/wiki/Vagrant_Story_Weapons)
- [Final Fantasy XIV Accessories Wiki](https://finalfantasy.fandom.com/wiki/Final_Fantasy_XIV_accessories)

### 모던 ARPG/MH
- [Monster Hunter Weapon Types Wiki](https://monsterhunter.fandom.com/wiki/Weapon_Types)
- [Monster Hunter Weapons Wiki](https://monsterhunterwiki.org/wiki/Weapons)

### 2D 무기 설계 피드백
- [Metroidvania Weapon Variety Discussion (Reddit)](https://www.reddit.com/r/metroidvania/comments/144bju3/what_are_musthave_weapons_for_a_metroidvania/)
- [Metroidvania Multiple Weapons (Reddit)](https://www.reddit.com/r/metroidvania/comments/1ejk7rc/metroidvanias_with_multiple_weapons/)
