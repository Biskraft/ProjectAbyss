# Project Abyss 용어집 (Glossary)

> 최근 업데이트: 2026-04-03 (수직 구조 용어 추가: Bulkhead, Bulkhead Surveyor, The Shaft, Tier)
> 문서 상태: `작성 중 (Draft)`

---

## 0. 필수 참고 자료

- Project Vision: `Documents/Terms/Project_Vision_Abyss.md`
- GDD Writing Rules: `Documents/Terms/GDD_Writing_Rules.md`
- Document Index: `Documents/Terms/Document_Index.md`
- Game Overview: `Reference/게임 기획 개요.md`

---

## 사용 규칙

1. 새 용어를 문서에서 최초 사용할 때 이 용어집의 영문 키를 기준으로 작성한다.
2. 폐기 용어(Deprecated)는 행을 삭제하지 않고 상태 열에 `폐기` 표시 후 대체어를 기재한다.
3. 용어는 영문 키 기준 알파벳 순, 한글 전용 용어는 가나다 순으로 정렬한다.
4. 테이블 셀 내 볼드(**) 사용 금지.

---

## 용어 목록

### A–C

| 영문 키 | 한글명 | 정의 | 관련 문서 |
| :--- | :--- | :--- | :--- |
| AABB | 축 정렬 경계 상자 | Axis-Aligned Bounding Box. 히트박스·허트박스 충돌 판정에 사용하는 직사각형 영역. 회전 없이 x·y 축에 정렬된 박사각형으로 계산 비용이 낮다. | `Documents/System/System_3C_Character.md` |
| Ability Gate | 능력 게이트 | 특정 이동 능력(이단 점프, 벽 타기, 안개 변신 등)을 보유해야 통과 가능한 월드 진행 장벽. 보스 처치 또는 렐릭 획득으로 해금된다. | `Reference/게임 기획 개요.md`, `Documents/Design/Design_Architecture_2Space.md` |
| Air Attack | 공중 공격 | 점프·낙하 등 공중 상태에서 공격 버튼을 입력할 때 발동하는 단일 타격. 전방 공격과 하방 공격(바운스 포함) 두 종류가 존재한다. 공중 공격은 1회로 제한된다. | `Documents/System/System_Combat_Action.md` |
| Always Winnable | 항상 클리어 가능 | 절차적으로 생성된 모든 시드에서 입구부터 출구까지 반드시 클리어 가능한 경로(Critical Path)가 보장됨을 의미하는 설계 원칙. 검증 실패 시 재시드를 수행한다. | `Documents/System/System_World_ProcGen.md` |
| Auto Combo | 자동 콤보 | 기본 공격 버튼을 연타하면 1타→2타→3타가 자동으로 연결되는 시스템. 접근성을 높이고 전투 흐름을 유지하기 위해 채택되었다. | `Documents/System/System_Combat_Action.md`, `Documents/System/System_3C_Control.md` |
| Bulkhead | 격벽 | 층위(Tier) 사이를 분리하는 세계수 Yggveil의 수평 가지 구조물. 각 격벽은 특정 능력 게이트로 기능하며, 해당 능력을 획득해야 통과할 수 있다. | `Documents/Content/Content_World_Bible.md`, `Documents/System/System_World_MapStructure.md` |
| Bulkhead Surveyor | 격벽 측량사 | 격벽 사이의 통행로를 점검하고 유지하는 독립 계약직. 에르다 벤-나흐트의 부업. 망치 에코로 격벽을 두드려 구조적 약점과 숨겨진 통로를 탐지한다. | `Documents/Content/Content_World_Bible.md` |
| Chunk | 청크 | Room 내부에 배치되는 사전 제작된 지형·장애물의 소단위 블록. Tiled Map Editor로 제작하며, 바이옴별·레어리티별 풀로 분리된다. 높은 레어리티의 아이템계일수록 복잡한 Chunk 풀이 사용된다. | `Documents/System/System_ItemWorld_FloorGen.md`, `Documents/System/System_World_ProcGen.md` |
| Combo End Lag | 콤보 후딜 | 자동 콤보 3타 완료 후 발생하는 공격 불가 경직 구간(기본값 600ms). 전투 리듬의 "숨 쉴 틈"이자 적의 반격 기회를 보장하는 설계 장치. 대시로 캔슬 가능하다(대시 렐릭 획득 후). | `Documents/System/System_Combat_Action.md` |
| Cooldown | 쿨다운 | 스킬 또는 대시(렐릭 해금 후)를 사용한 후, 동일 행동을 다시 사용할 수 있을 때까지 대기해야 하는 시간. 스킬 종류에 따라 3-15초 범위이며, UI에 원형 게이지로 표시된다. | `Documents/System/System_3C_Control.md` |
| Core Loop | 핵심 순환 | 월드 탐험 → 아이템 획득 → 아이템계 진입 → 장비 강화 → 스탯 게이트 해금 → 새 층위 탐험으로 이어지는 Project Abyss의 주요 순환 구조. | `Documents/Design/Design_CoreLoop_Circulation.md`, `Reference/게임 기획 개요.md` |
| Critical Path | 크리티컬 패스 | 절차적으로 생성된 Room Grid에서 입구부터 출구까지 플레이어가 반드시 통과 가능한 경로. 생성 알고리즘이 이 경로를 최우선으로 보장한다. | `Documents/System/System_World_ProcGen.md`, `Documents/System/System_ItemWorld_FloorGen.md` |

---

### D–F

| 영문 키 | 한글명 | 정의 | 관련 문서 |
| :--- | :--- | :--- | :--- |
| Dash | 대시 | 캐릭터가 짧은 거리를 빠르게 이동하는 기동 행동. 쿨다운 400ms, 공중 대시 1회 제한. 기본 대시에 i-frame(무적)은 없으며, 위치 재설정으로 적 공격을 회피한다. 콤보 후딜 캔슬에도 사용된다. | `Documents/System/System_3C_Character.md`, `Documents/System/System_Combat_Action.md` |
| ~~DEX~~ | ~~민첩 스탯~~ | ~~DEPRECATED. 기존 기동성 게이트 스탯. ATK/INT/HP 3스탯 체계 전환으로 삭제.~~ | — |
| Echo | 에코 | 에르다가 휴대하는 도구이자 무기. GBE(BLAME!) 오마주. 네 가지 기능: (1) 격벽 관통 — 격벽의 약점을 두드려 균열을 만든다, (2) 아이템계 진입 — 무기/제단을 두드려 기억의 균열을 연다, (3) 인챈트 — 전투 중 무기를 두드려 원소를 입힌다, (4) 전투 보조 — 느리지만 강력한 단발 타격. 에코의 정체와 출처는 최종장까지 불명이며, 에르다의 정체와 함께 밝혀진다. | `Documents/Content/Content_World_Bible.md`, `Documents/System/System_ItemWorld_Core.md` |
| Echo Strike | 기억의 두드림 | 에코로 무기를 두드려 아이템계에 진입하는 행위. 세이브 포인트 대장간, 필드 균열 제단, 기억의 방랑자가 남긴 임시 제단 등 어떤 진입 장소에서든 동일한 행위로 수행된다. | `Documents/System/System_ItemWorld_Core.md` |
| Enchant | 인챈트 | 에코로 무기를 두드려 원소를 입히는 행위. 전투 중 1초 모션으로 원소 전환 가능 (↑+공격). 해금된 원소�� 순환: 화→빙→뇌→무→화. 인챈트된 무기의 모든 공격에 해당 원소 적용. 피격 취약 1초 = 리스크. | `Documents/System/System_Combat_Action.md` |
| Equipment Slot | 장비 슬롯 | 캐릭터가 장착 가능한 아이템 슬롯의 종류. 무기·보조무기·머리·갑옷·망토·장신구(x2) 총 7슬롯으로 구성된다. 슬롯별로 아이템 유형이 고정된다. | `Reference/게임 기획 개요.md` |
| Erda ven-Nacht | 에르다 벤-나흐트 | 플레이어 캐릭터. 정체불명의 여성. 이름조차 게임 후반까지 밝혀지지 않는다. 에코(Echo)를 들고 대공동을 아래로 내려간다. 과묵하며 대사가 거의 없다. 행동으로 서사를 전달하는 캐릭터. 캐릭터 레퍼런스: 킬리(BLAME!). | `Documents/Content/Content_World_Bible.md`, `Documents/Terms/Project_Vision_Abyss.md` |
| Field Fissure Altar | 필드 균열 제단 | 월드 각 층위에 1-2개 고정 배치된 아이템계 진입 지점. 심연 전쟁의 상흔이 안정화된 옛 야전 대장간 폐허. 탐험으로 발견하면 이후 항상 사용 가능. | `Documents/System/System_ItemWorld_Core.md`, `Documents/System/System_World_MapStructure.md` |
| Floor / Stratum | 층 / 지층 | 아이템계(Item World) 내부 던전의 진행 단위. 기존 "Floor(층)" 개념은 "Stratum(지층)"으로 전환되었다. 아이템계는 레어리티별 2-4개 지층(Memory Strata)으로 구성되며, 각 지층은 메트로베니아 스타일의 Room Grid 던전이다. 각 지층의 보스를 처치해야 다음 지층으로 진행한다. | `Documents/System/System_ItemWorld_FloorGen.md`, `Reference/게임 기획 개요.md` |

---

### G–H

| 영문 키 | 한글명 | 정의 | 관련 문서 |
| :--- | :--- | :--- | :--- |
| Geo Effect | 지오 이펙트 | 디스가이아의 지오 이펙트를 차용한 개념. 아이템계 특정 지층에 배치되는 패널로, 해당 타일 위에 있을 때 데미지 증가·감소, 이동 제한 등 전략적 변수를 추가한다. | `Documents/System/System_ItemWorld_FloorGen.md` |
| HL | HL | Project Abyss의 기본 화폐 단위. 몹 처치, 아이템계 보상으로 획득하며, NPC 상점/장비 강화/이노센트 합성 등에 소비된다. | `Documents/Design/Design_Economy_FaucetSink.md`, `Documents/Design/Design_Yarikomi_Philosophy.md` |
| Hitbox | 히트박스 | 공격 판정이 발생하는 영역. AABB 방식으로 정의되며, 타격 시 상대방의 허트박스와 겹치는지 검사한다. 무기 종류·타격 번호에 따라 크기가 다르다. | `Documents/System/System_3C_Character.md`, `Documents/System/System_Combat_Action.md` |
| Hitstop | 히트스탑 | 공격이 적중했을 때 2-4프레임간 게임 로직을 일시 정지하는 연출. 타격감(임팩트)을 증폭하는 핵심 피드백 기법. | `Documents/System/System_Combat_Action.md` |
| Hitstun | 피격 경직 | 피격 시 피격자의 행동이 일정 시간 강제 중단되는 상태. 경직 지속 시간은 공격의 강도와 피격자의 무게에 따라 결정된다. | `Documents/System/System_Combat_Action.md` |
| ~~Hub~~ | ~~허브~~ | ~~DEPRECATED. 기존 2-Space 모델의 세 번째 공간. 사교·거래·파티 매칭이 이루어지는 고정 맵 사교 공간. 2-Space 전환으로 폐기. 대장간/상점은 월드 세이브 포인트에 통합, 파티 합류는 URL 링크 공유로 아이템계 직접 진입.~~ | — |
| Hurtbox | 허트박스 | 피격 판정이 발생하는 캐릭터의 영역. 상대방의 히트박스와 겹쳤을 때 피해를 받는다. 일반적으로 캐릭터 스프라이트 크기보다 약간 작게 설정되어 관대한 판정을 제공한다. | `Documents/System/System_3C_Character.md` |

---

### I

| 영문 키 | 한글명 | 정의 | 관련 문서 |
| :--- | :--- | :--- | :--- |
| i-frame | 무적 프레임 | Invincibility Frame. 피격 후 무적 시간 등 특정 상태에서 피격 판정이 일시 무효화되는 프레임. 기본 대시에는 i-frame이 없다 (2026-04-08 제거). Ghost 이노센트 등으로 대시 i-frame을 추가할 수 있다. | `Documents/System/System_3C_Character.md`, `Documents/System/System_Combat_Action.md`, `Documents/System/System_Innocent_Core.md` |
| In-Combat | 전투 중 상태 | 적과 전투 상태에 있음을 나타내는 플레이어 상태. 이 상태에서는 MP 자동 회복이 중단되고 특정 아이템 사용이 제한된다. 마지막 전투 행동 이후 일정 시간 경과 시 Out-of-Combat으로 전환된다. | `Documents/System/System_Combat_Action.md` |
| Innocent | 이노센트 | 장비 아이템 내부(아이템계)에 거주하며 해당 아이템에 보너스 스탯을 부여하는 존재. 야생(Wild) 상태에서는 적으로 등장하며 격파 시 복종(Tamed) 상태로 전환된다. 복종 상태에서 효과가 2배가 되고 다른 아이템으로 이동 가능하다. | `Reference/게임 기획 개요.md`, `Documents/System/System_ItemWorld_FloorGen.md` |
| Innocent Slot | 이노센트 슬롯 | 장비 아이템이 보유할 수 있는 이노센트의 최대 수량. 레어리티에 따라 Normal 2슬롯부터 Ancient 8슬롯까지 증가한다. 아이템계 보스 처치로 슬롯을 추가할 수 있다. | `Reference/게임 기획 개요.md` |
| INT | 지력 스탯 | ATK/INT/HP 3스탯 체계의 원소/인챈트 데미지 스탯. 장비 INT + 캐릭터 기본 INT. 에코 인챈트 적용 시 원소 데미지가 INT에 비례하며, 상태이상 지속시간도 INT에 비례한다. INT 게이트(마법 봉인)의 해금 조건. | `Documents/System/System_Growth_Stats.md`, `Documents/System/System_Combat_Damage.md` |
| Item General | 아이템 장군 | 아이템계 초기 지층에 출현하는 보스 등급. 처치 시 아이템 스탯 +5% 보너스를 획득한다. | `Reference/게임 기획 개요.md` |
| Item God | 아이템 신 | 아이템계 후반 지층에 출현하는 보스 등급. 처치 시 아이템 스탯 +15%와 특수 이노센트 드랍 보상을 획득한다. | `Reference/게임 기획 개요.md` |
| Item King | 아이템 왕 | 아이템계 중반 지층에 출현하는 보스 등급. 처치 시 아이템 스탯 +10%와 이노센트 슬롯 +1 보상을 획득한다. | `Reference/게임 기획 개요.md` |
| Item Overlord | 아이템 대신 | 아이템계 최심층 지층에 출현하는 최상위 보스. 처치 시 아이템 레어리티 승급 기회와 대량 보상을 획득한다. | `Reference/게임 기획 개요.md` |
| Item World | 아이템계 | 모든 장비 아이템 내부에 존재하는 기억의 지층(Memory Strata) 절차적 던전. 레어리티별 2-4개 지층으로 구성되며, 1-2인이 협동하여 (Phase 4+에서 최대 4인) 지층을 클리어하며 장비를 직접 강화한다. 2-Space 모델의 두 번째 공간이며 야리코미의 핵심 콘텐츠이다. | `Documents/Design/Design_Architecture_2Space.md`, `Documents/System/System_ItemWorld_FloorGen.md`, `Reference/게임 기획 개요.md` |

---

### K–M

| 영문 키 | 한글명 | 정의 | 관련 문서 |
| :--- | :--- | :--- | :--- |
| Knockback | 넉백 | 피격 시 캐릭터가 공격 반대 방향으로 밀려나는 물리적 반응. 넉백 거리는 공격 강도와 피격자의 무게에 따라 결정된다. | `Documents/System/System_Combat_Action.md`, `Documents/System/System_3C_Character.md` |
| Memory Wanderer | 기억의 방랑자 | 월드 필드에 랜덤 출현하는 유령형 존재. 과거에 아이템 속으로 들어갔다 돌아오지 못한 자들의 잔상. 접촉하면 임시 균열 제단이 생성되며, 이를 통해 보상 강화 아이템계로 진입 가능. 평균 30-45분에 1회 출현. | `Documents/System/System_ItemWorld_Core.md` |
| Marta ven-Nacht | 마르타 벤-나흐트 | 에르다의 스승. 중년 여성 장인. 10년 전 Ancient 아이템 내부로 들어가 자발적으로 남아 기억을 지키고 있다. 카엘 오르스와 마찬가지로 기억을 지키기 위한 자발적 유배를 선택한 인물. | `Documents/Content/Content_World_Bible.md` |
| ~~LCK~~ | ~~행운 스탯~~ | ~~DEPRECATED. 기존 크리티컬/드랍률 스탯. ATK/INT/HP 3스탯 체계 전환으로 삭제. 크리티컬은 고정 5% + 이노센트 보정, 드랍률은 적 테이블 + 이노센트 보정.~~ | — |
| Metroidvania | 메트로베니아 | Metroid + Castlevania의 합성어. 능력 게이트 기반 비선형 탐험 액션 장르. Project Abyss의 월드 설계가 이 장르 문법을 기반으로 한다. | `Reference/Metroidvania Game Design Deep Dive.md`, `Documents/Terms/Project_Vision_Abyss.md` |
| ~~MP~~ | ~~마력~~ | ~~DEPRECATED. 기존 스킬 소비 자원. MP 시스템 삭제, 스킬은 쿨다운 기반으로 전환.~~ | — |
| Mystery Room | 미스터리 룸 | 아이템계 특정 지층에 확률적으로 출현하는 특수 이벤트 룸. 상점·점술사·특수 전투 등 예측 불가한 이벤트가 발생하며 5% 확률로 출현한다. | `Documents/System/System_ItemWorld_FloorGen.md`, `Reference/게임 기획 개요.md` |

---

### N

| 영문 키 | 한글명 | 정의 | 관련 문서 |
| :--- | :--- | :--- | :--- |
| No.1 | 넘버 원 | 에르다의 첫 이노센트. 말을 못하는 빛나는 구체. 정체는 스승 마르타가 남긴 이노센트로, 10년간 에르다와 마르타를 연결하는 매개체였다. Act 1에서 개그 마스코트, Act 3에서 서사적 핵심. | `Documents/Content/Content_World_Bible.md` |

---

### O–P

| 영문 키 | 한글명 | 정의 | 관련 문서 |
| :--- | :--- | :--- | :--- |
| Out-of-Combat | 전투 외 상태 | 전투 상태(In-Combat)가 아닌 평상시 상태. MP 자동 회복이 활성화되고 아이템 사용 제한이 해제된다. | `Documents/System/System_Combat_Action.md` |
| Pillar | 기둥 | Project Abyss의 3대 핵심 설계 기둥. 모든 시스템과 기능은 (1) 메트로베니아 탐험, (2) 아이템계 야리코미, (3) 온라인 멀티플레이 중 최소 하나에 정렬되어야 한다. 어느 기둥에도 해당하지 않는 기능은 채택하지 않는다. | `Documents/Terms/Project_Vision_Abyss.md` |
| Procedural Generation | 절차적 생성 | 알고리즘과 시드를 사용하여 맵·룸·Chunk를 자동으로 생성하는 기법. 월드의 마이크로 계층과 아이템계 전 층에 적용된다. 스펠렁키의 Room Grid 방식을 레퍼런스로 사용한다. | `Documents/System/System_World_ProcGen.md`, `Documents/System/System_ItemWorld_FloorGen.md` |

---

### Q

| 영문 키 | 한글명 | 정의 | 관련 문서 |
| :--- | :--- | :--- | :--- |

---

### R

| 영문 키 | 한글명 | 정의 | 관련 문서 |
| :--- | :--- | :--- | :--- |
| Remnant Fragment | 잔재 파편 | 복종(Tamed) 이노센트를 분해하여 획득하는 레어리티 승급 재료. floor(이노센트_레벨 / FRAGMENT_DIVISOR) 개 획득. System_Innocent_Core.md §2.7 참조. | `Documents/System/System_Innocent_Core.md` |
| Rarity | 레어리티 | 장비 아이템의 등급 체계. Normal·Magic·Rare·Legendary·Ancient 5단계로 구성되며, 등급에 따라 스탯 배율·이노센트 슬롯 수·아이템계 지층 수가 결정된다. | `Reference/게임 기획 개요.md` |
| ~~Recursive Entry~~ | ~~재귀적 진입~~ | ~~DEPRECATED. 아이템계 내부에서 다른 아이템의 아이템계에 중첩 진입하는 메커닉. 삭제됨. 아이템계에서 획득한 아이템은 월드 귀환 후 진입하는 순환 구조로 대체.~~ | — |
| Room Grid | 룸 그리드 | 절차적 생성 시 사용하는 룸 배치 격자. 아이템계는 4×4 고정, 월드 구역은 난이도에 따라 3×3-5×5. 각 셀에 Room Type이 배정되고 Chunk가 조립된다. | `Documents/System/System_World_ProcGen.md`, `Documents/System/System_ItemWorld_FloorGen.md` |
| Room Template | 룸 템플릿 | 절차적 생성의 기본 단위가 되는 사전 제작된 방 구조. Tiled Map Editor로 제작되며, 출입구 방향에 따라 분류된다. 각 템플릿에 Chunk가 채워져 최종 룸이 완성된다. | `Documents/System/System_World_ProcGen.md`, `Documents/System/System_ItemWorld_FloorGen.md` |
| Room Type | 룸 타입 | Room Grid 내 각 셀의 역할 분류. 전투룸·보상룸·함정룸·빈 룸 등으로 나뉘며, Critical Path 상의 룸과 분기 룸을 구분한다. | `Documents/System/System_ItemWorld_FloorGen.md`, `Documents/System/System_World_ProcGen.md` |

---

### S

| 영문 키 | 한글명 | 정의 | 관련 문서 |
| :--- | :--- | :--- | :--- |
| Skill Slot | 스킬 슬롯 | 캐릭터가 전투에 장착할 수 있는 스킬 칸. 총 4개 슬롯이 존재하며, 각 슬롯에 하나의 스킬을 장착한다. 장착 변경은 세이브 포인트에서만 가능하다. 슬롯 제한이 빌드 선택의 전략성을 만든다. | `Documents/System/System_3C_Control.md`, `Documents/System/System_3C_Character.md` |
| SkillCast | 스킬 시전 | 스킬 슬롯에 장착된 스킬을 발동하는 행동. 쿨다운 기반으로 발동되며, 스킬 카테고리(근접·원거리·범위·버프·소환)에 따라 발동 중 이동 가능 여부가 다르다. 자동 조준이 적용된다. | `Documents/System/System_Combat_Action.md`, `Documents/System/System_3C_Control.md` |
| ~~SPD~~ | ~~속도 스탯~~ | ~~DEPRECATED. 기존 이동/공격 속도 스탯. ATK/INT/HP 3스탯 체계 전환으로 삭제. 이동/공격 속도는 무기 유형별 고정값 + 이노센트 보정.~~ | — |
| SSoT | 단일 진실 공급원 | Single Source of Truth. 수치 데이터는 `Sheets/` CSV 파일에서만 정의하고, 기획 문서는 해당 파일을 참조하는 방식. 데이터의 중복 정의와 불일치를 방지하는 데이터 관리 원칙. | `Documents/Terms/GDD_Writing_Rules.md`, `Documents/Terms/Sheets_Writing_Rules.md` |
| Stat Gate | 스탯 게이트 | 장비 ATK 또는 INT가 특정 수치 이상일 때 열리는 월드 진행 장벽. ATK 게이트(물리 장벽: 파괴 가능한 벽, 바리케이드)와 INT 게이트(마법 봉인: 룬 장벽, 마법 잠금)로 구분된다. 아이템계에서 장비를 강화하여 ATK/INT를 올리고 게이트를 해금하는 것이 핵심 순환의 동력이다. | `Reference/게임 기획 개요.md`, `Documents/Design/Design_Architecture_2Space.md` |
| ~~STR~~ | ~~근력 스탯~~ | ~~DEPRECATED. 기존 물리 공격력 스탯. ATK/INT/HP 3스탯 체계 전환으로 ATK에 통합.~~ | — |
| Super Armor | 슈퍼 아머 | 특정 공격을 받아도 피격 경직(Hitstun)이 발생하지 않는 상태. 보스 및 강화 적 전용이며, 이 상태의 적은 넉백도 무효화된다. | `Documents/System/System_Combat_Action.md` |

---

### T–U

| 영문 키 | 한글명 | 정의 | 관련 문서 |
| :--- | :--- | :--- | :--- |
| The Shaft | 대공동 | 세계수 Yggveil이 하늘에서 뿌리를 내리며 수직으로 관통한 거대 공동. 세계의 물리적 골격. 7개 층위(Tier 1-7)가 격벽으로 분리되어 수직으로 쌓여 있다. | `Documents/Content/Content_World_Bible.md` |
| Tier | 층위 | 수직 대공동(The Shaft)을 구성하는 대구역 단위. Tier 1 천공의 정원 - Tier 7 심연의 구까지 7개. 각 층위는 격벽(Bulkhead)으로 분리된다. | `Documents/Content/Content_World_Bible.md` |
| Tutor | 튜터 | INT +X 효과를 부여하는 기본형 이노센트. 원소/인챈트 빌드의 핵심이며 INT 게이트(마법 봉인) 해금에 기여한다. 레벨당 INT +1. 야생 50%, 복종 100%. | `Documents/System/System_Innocent_Core.md` |
| Unified Grid | 통합 그리드 | 아이템계의 모든 지층을 수직으로 이어붙인 단일 2D 배열 구조. 지층 간 씬 전환 없이 연속적 탐험이 가능하다. `UnifiedGridData` 타입으로 구현. | `game/src/level/RoomGrid.ts` |

---

### V–W

| 영문 키 | 한글명 | 정의 | 관련 문서 |
| :--- | :--- | :--- | :--- |
| Tell | 예고 동작 | 적 또는 보스가 강력한 공격을 시전하기 직전 재생하는 예고 모션·이펙트. 플레이어가 회피를 준비할 수 있는 공정성 장치. | `Documents/System/System_Combat_Action.md` |
| ~~VIT~~ | ~~생명력 스탯~~ | ~~DEPRECATED. 기존 최대 HP/환경 저항 스탯. ATK/INT/HP 3스탯 체계 전환으로 삭제. MaxHP는 레벨 + Dietician 이노센트로 성장.~~ | — |
| World | 월드 | 2-Space 모델의 첫 번째 공간. 솔로(1인) 탐험을 중심으로 한 핸드크래프트+절차적 혼합 맵. 능력 게이트와 스탯 게이트로 비선형 진행이 설계되며, 아이템 획득과 능력 해금이 주요 보상이다. | `Documents/Design/Design_Architecture_2Space.md`, `Reference/게임 기획 개요.md` |

---

### 한글 전용 용어

| 한글명 | 영문 키/표기 | 정의 | 관련 문서 |
| :--- | :--- | :--- | :--- |
| 2-Space 모델 | 2-Space Model | 게임 세계를 월드(World)/아이템계(Item World) 두 공간으로 분리하여 각 공간이 고유한 규칙과 목적을 갖도록 설계한 Project Abyss의 핵심 구조 원칙. 메트로베니아 탐험과 온라인 멀티플레이의 충돌을 해결하는 핵심 해법이다. 허브(Hub)는 폐기되어 대장간/상점은 월드 세이브 포인트에 통합. | `Documents/Design/Design_Architecture_2Space.md`, `Documents/Terms/Project_Vision_Abyss.md` |
| 세계수 | Yggveil (이그베일) | 세계 창조 이전에 존재하던 원초적 존재. 자신의 기억을 재료로 세계를 빚었다. 세계의 모든 사물은 세계수의 기억이 응고된 것이며, 이것이 아이템계의 형이상학적 근거이다. | `Documents/Content/Content_World_Bible.md` |
| 심연 | Abyss | 세계가 존재하기 위해 지불한 대가가 쌓인 곳. 세계수가 창조 과정에서 포기한 가능성들의 기억이 소멸하지 못하고 가라앉은 장소. 악의가 아닌 결핍("나는 왜 존재하지 못하는가")의 감정을 가진다. | `Documents/Content/Content_World_Bible.md` |
| 심연 전쟁 | Abyss War | 약 150-100년 전 발생한 세계적 전쟁. 심연의 기억을 해방하려는 해방파(기억 연구원)와 현재 세계를 수호하려는 수호파(성채 의회+수호단)가 대립. 영웅 카엘 오르스가 심연과 협약을 맺어 종결했다. | `Documents/Content/Content_World_Bible.md` |
| 카엘 오르스 | Kael Ors | 심연 전쟁의 영웅. 심연의 검을 들고 심연 속으로 뛰어들어 심연과 협약을 맺었다. 협약의 닻으로서 100년간 심연 속에 머물고 있다. 심연의 검 최심층에서 기억으로서 대면 가능. | `Documents/Content/Content_World_Bible.md` |
| 협약 | The Accord | 카엘 오르스가 심연과 맺은 협상. 심연은 귀환을 멈추는 대신 세계가 심연을 기억해야 한다. 모든 아이템의 기억 최심층에 심연의 흔적이 존재하는 이유. | `Documents/Content/Content_World_Bible.md` |
| 야리코미 | Yarikomi (やりこみ) | 게임의 한계까지 파고드는 극한 플레이를 의미하는 일본어. 디스가이아의 아이템계·이노센트 시스템이 대표적 야리코미 콘텐츠. Project Abyss에서는 아이템계 모든 지층 클리어·이노센트 수집·레어리티 승급이 야리코미 축을 구성한다. | `Documents/Terms/Project_Vision_Abyss.md`, `Reference/디스가이아 시스템 분석.md` |

---

## 레어리티 등급 빠른 참조

| 등급 | 색상 | 스탯 배율 | 이노센트 슬롯 | 아이템계 지층 수 | 드랍 확률 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Normal | 흰색 #FFFFFF | x1.0 | 2 | 2 지층 (4×4 고정) | 60% |
| Magic | 파란 #6969FF | x1.3 | 3 | 3 지층 (4×4 고정) | 25% |
| Rare | 노란 #FFFF00 | x1.7 | 4 | 3 지층 (4×4 고정) | 10% |
| Legendary | 주황 #FF8000 | x2.2 | 6 | 4 지층 (4×4 고정) | 4% |
| Ancient | 초록 #00FF00 | x3.0 | 8 | 4 지층 + 심연 (4×4 고정) | 1% |

---

## 스탯 게이트 빠른 참조

| 스탯 | 게이트 유형 | 예시 장벽 |
| :--- | :--- | :--- |
| ATK | 물리 장�� | 금이 간 벽 파괴, 바리케��드 돌파, 중문/쇠사슬/바위 |
| INT | 마법 봉인 | 룬 문양 장벽, 마법 봉인 문, 아케인 잠금장치, 룬 퍼즐 |

> **설계 변경:** 기존 6대 스탯 게이트(STR/INT/DEX/VIT/SPD/LCK)는 ATK/INT 이중 게이트로 재설계. ATK는 물리 장벽(파괴), INT는 마법 봉인(해제). 기동성/환경 저항/시간 제한 등은 능력 게이트나 환경 퍼즐로 재설계 예정.

---

## 아이템계 보스 빠른 참조

| 보스 등급 | 출현 지층 | 처치 보상 |
| :--- | :--- | :--- |
| 아이템 장군 (Item General) | 각 지층의 보스 (초기 지층) | 아이템 스탯 +5% |
| 아이템 왕 (Item King) | 각 지층의 보스 (중반 지층) | 아이템 스탯 +10%, 이노센트 슬롯 +1 |
| 아이템 신 (Item God) | 각 지층의 보스 (후반 지층) | 아이템 스탯 +15%, 특수 이노센트 드랍 |
| 아이템 대신 (Item Overlord) | 최심층 지층의 보스 | 레어리티 승급 기회, 대량 보상 |
