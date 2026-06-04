# ECHORIS 용어집 (Glossary)

> 최근 업데이트: 2026-05-28 (NarrativeWorldReset 라운드 — 내러티브 lore 용어 및 DEC-036/DEC-046 narrative-system 용어 일괄 분리)
> 문서 상태: `작성 중 (Draft)`

> **2026-05-28 NarrativeWorldReset 정리:**
> 내러티브 lore 용어 · narrative-system 용어 · narrative 분류 체계 · 폐기 사슬 일괄 분리 → `Documents/Terms/_archive/NarrativeWorldReset_2026-05-28/`.
> 본 활성 Glossary 에는 *현재 살아있는 narrative 정의가 0* 인 상태. 다음 라운드 재정의 전까지 인용 보류.

---

## 0. 필수 참고 자료

- Project Vision: `Documents/Terms/_archive/NarrativeWorldReset_2026-05-28/Project_Vision_Abyss.md` (📦 archived 2026-05-28)
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
| Ability Gate | 능력 게이트 | 특정 이동 능력(렐릭)을 보유해야 통과 가능한 월드 진행 장벽. 보스 처치 또는 렐릭 획득으로 해금된다. 렐릭 출시 캐논 = 11종(코어 6 LOCKED: 대시·이단 점프·벽 점프·수중 호흡·역류의 쇄도·추락의 영혼 + 빌더 전용 4 + 반중력 1). SSoT = `Plan/Spec/Spec_Relic_Catalog.md`. (구 "5종(역중력)" 표기 2026-06-01 갱신 — 역중력→반중력·극성 부츠 재정의.) | `Plan/Spec/Spec_Relic_Catalog.md`, `Documents/Design/Design_World_Master.md` §4.2 |
| Air Attack | 공중 공격 | 점프·낙하 등 공중 상태에서 공격 버튼을 입력할 때 발동하는 단일 타격. 전방 공격과 하방 공격(바운스 포함) 두 종류가 존재한다. 공중 공격은 1회로 제한된다. | `Documents/System/System_Combat_Action.md` |
| Always Winnable | 항상 클리어 가능 | 절차적으로 생성된 모든 시드에서 입구부터 출구까지 반드시 클리어 가능한 경로(Critical Path)가 보장됨을 의미하는 설계 원칙. 검증 실패 시 재시드를 수행한다. | `Documents/System/System_World_ProcGen.md` |
| Auto Combo | 자동 콤보 | 기본 공격 버튼을 연타하면 1타→2타→3타가 자동으로 연결되는 시스템. 접근성을 높이고 전투 흐름을 유지하기 위해 채택되었다. | `Documents/System/System_Combat_Action.md`, `Documents/System/System_3C_Control.md` |
| Blueprint | 블루프린트 | 빌더의 시공 패턴을 잔존자들이 추상해 부르는 이름. 빌더가 읽거나 따르는 계획이 아니라, 무지능 시공의 결과를 인간이 사후 분석한 명세. 인간은 한때 이 패턴 안에 있었으나 단절(Cascade) 이후 누락 카테고리가 되었다. | `Documents/Content/Content_Story_Synopsis.md` |
| Builder | 빌더 | 메가 스트럭처를 끝없이 짓는 거대 산업 시공자. 의도·의지·계획이 없으며 인간을 적으로도 인지하지 않는다. 시공 경로상의 모든 것을 무관심하게 묻는다. 격파 불가 — 에코의 응답으로 시공에 한 박자의 공백만 만들 수 있다. | `Documents/Content/Content_Story_Synopsis.md`, `Reference/게임 기획 개요.md` |
| Cascade | 단절 | 인간이 빌더의 시공 패턴(블루프린트) 에서 누락된 카테고리가 된 과거의 사건. 원인은 작품 내내 밝혀지지 않는다(코스믹 호러 — 이해 불가능성). | `Documents/Content/Content_Story_Synopsis.md` |
| Chunk | 청크 | Room 내부에 배치되는 사전 제작된 지형·장애물의 소단위 블록. Tiled Map Editor로 제작하며, 바이옴별·레어리티별 풀로 분리된다. 높은 레어리티의 아이템계일수록 복잡한 Chunk 풀이 사용된다. | `Documents/System/System_ItemWorld_FloorGen.md`, `Documents/System/System_World_ProcGen.md` |
| Combo End Lag | 콤보 후딜 | 자동 콤보 3타 완료 후 발생하는 공격 불가 경직 구간(기본값 600ms). 전투 리듬의 "숨 쉴 틈"이자 적의 반격 기회를 보장하는 설계 장치. 대시로 캔슬 가능하다(대시 렐릭 획득 후). | `Documents/System/System_Combat_Action.md` |
| Cooldown | 쿨다운 | 스킬 또는 대시(렐릭 해금 후)를 사용한 후, 동일 행동을 다시 사용할 수 있을 때까지 대기해야 하는 시간. 스킬 종류에 따라 3-15초 범위이며, UI에 원형 게이지로 표시된다. | `Documents/System/System_3C_Control.md` |
| Core Loop | 핵심 순환 | 월드 탐험 → 아이템 획득 → 아이템계 진입 → 장비 강화 → 스탯 게이트 해금 → 새 층위 탐험으로 이어지는 ECHORIS의 주요 순환 구조. | `Documents/Design/Design_CoreLoop_Circulation.md`, `Reference/게임 기획 개요.md` |
| Critical Path | 크리티컬 패스 | 절차적으로 생성된 Room Grid에서 입구부터 출구까지 플레이어가 반드시 통과 가능한 경로. 생성 알고리즘이 이 경로를 최우선으로 보장한다. | `Documents/System/System_World_ProcGen.md`, `Documents/System/System_ItemWorld_FloorGen.md` |

---

### D–F

| 영문 키 | 한글명 | 정의 | 관련 문서 |
| :--- | :--- | :--- | :--- |
| Dash | 대시 | 캐릭터가 짧은 거리를 빠르게 이동하는 기동 행동. 쿨다운 400ms, 공중 대시 1회 제한. 기본 대시에 i-frame(무적)은 없으며, 위치 재설정으로 적 공격을 회피한다. 콤보 후딜 캔슬에도 사용된다. | `Documents/System/System_3C_Character.md`, `Documents/System/System_Combat_Action.md` |
| ~~DEX~~ | ~~민첩 스탯~~ | ~~DEPRECATED. 기존 기동성 게이트 스탯. ATK/INT/HP 3스탯 체계 전환으로 삭제.~~ | — |
| Echo | 에코 | 잊혀진 자가 무기에 남긴 마지막 한 마디가 응결된 잔존체. 곧 게임 내 모든 장비 아이템의 통칭. 포지로 에코 내부 위상에 진입해 마지막 음성을 회수하면 자기 검에 새길 수 있다. 작품명 ECHORIS 의 어원. | `Documents/Content/Content_Story_Synopsis.md`, `Documents/Design/Design_Art_Direction.md` |
| Erda | 에르다 | 주인공. 자기 이름·기억을 잃은 채 메가 스트럭처 빈 공동에서 깨어난다. Sculpted Avatar 유형. 붉은-갈색 머리 + 청록 눈. 시작 후 약 5분 첫 다이브에서 러스트본을 통해 자기 이름을 안다. | `Documents/Content/Content_Characters.md` |
| Forge | 포지 | 빌더 내부에만 존재하는 거대 단조 장치. 잔존자의 마지막 기술. 에코를 포지 위에 놓고 격발하면 시공 한 박자에 맞춰 에코 내부 위상으로 진입한다. 아이템계 진입의 in-universe 메커니즘. | `Documents/Content/Content_Story_Synopsis.md`, `Documents/Design/Design_Art_Direction.md` |
| Enchant | 인챈트 | 에코로 무기를 두드려 원소를 입히는 행위. 전투 중 1초 모션으로 원소 전환 가능 (↑+공격). 해금된 원소의 순환: 화→빙→뇌→무→화. 인챈트된 무기의 모든 공격에 해당 원소 적용. 피격 취약 1초 = 리스크. | `Documents/System/System_Combat_Action.md` |
| Equipment Slot | 장비 슬롯 | 캐릭터가 장착 가능한 아이템 슬롯의 종류. 무기·보조무기·머리·갑옷·망토·장신구(x2) 총 7슬롯으로 구성된다. 슬롯별로 아이템 유형이 고정된다. | `Reference/게임 기획 개요.md` |
| Floor / Stratum | 층 / 지층 | 아이템계(Item World) 내부 던전의 진행 단위. 아이템계는 레어리티별 2-4개 지층으로 구성되며, 각 지층은 메트로베니아 스타일의 Room Grid 던전이다. 각 지층의 보스를 처치해야 다음 지층으로 진행한다. | `Documents/System/System_ItemWorld_FloorGen.md`, `Reference/게임 기획 개요.md` |

---

### G–H

| 영문 키 | 한글명 | 정의 | 관련 문서 |
| :--- | :--- | :--- | :--- |
| Geo Effect | 지오 이펙트 | 디스가이아의 지오 이펙트를 차용한 개념. 아이템계 특정 지층에 배치되는 패널로, 해당 타일 위에 있을 때 데미지 증가·감소, 이동 제한 등 전략적 변수를 추가한다. | `Documents/System/System_ItemWorld_FloorGen.md` |
| Grid | 그리드 | 블루프린트가 구현된 메가 스트럭처의 시공 격자. 빌더의 시공 단위가 한 박자마다 격자에 더해진다. 에코의 응답이 그리드를 한 박자 멈출 수 있다. | `Documents/Content/Content_Story_Synopsis.md` |
| HL | HL | ECHORIS의 기본 화폐 단위. 몹 처치, 아이템계 보상으로 획득하며, NPC 상점/장비 강화 등에 소비된다. | `Documents/Design/Design_Economy_FaucetSink.md`, `Documents/Design/Design_Yarikomi_Philosophy.md` |
| Hitbox | 히트박스 | 공격 판정이 발생하는 영역. AABB 방식으로 정의되며, 타격 시 상대방의 허트박스와 겹치는지 검사한다. 무기 종류·타격 번호에 따라 크기가 다르다. | `Documents/System/System_3C_Character.md`, `Documents/System/System_Combat_Action.md` |
| Hitstop | 히트스탑 | 공격이 적중했을 때 2-4프레임간 게임 로직을 일시 정지하는 연출. 타격감(임팩트)을 증폭하는 핵심 피드백 기법. | `Documents/System/System_Combat_Action.md` |
| Hitstun | 피격 경직 | 피격 시 피격자의 행동이 일정 시간 강제 중단되는 상태. 경직 지속 시간은 공격의 강도와 피격자의 무게에 따라 결정된다. | `Documents/System/System_Combat_Action.md` |
| ~~Hub~~ | ~~허브~~ | ~~DEPRECATED. 기존 2-Space 모델의 세 번째 공간. 사교·거래·파티 매칭이 이루어지는 고정 맵 사교 공간. 2-Space 전환으로 폐기. 대장간/상점은 월드 세이브 포인트에 통합, 파티 합류는 URL 링크 공유로 아이템계 직접 진입.~~ | — |
| Hurtbox | 허트박스 | 피격 판정이 발생하는 캐릭터의 영역. 상대방의 히트박스와 겹쳤을 때 피해를 받는다. 일반적으로 캐릭터 스프라이트 크기보다 약간 작게 설정되어 관대한 판정을 제공한다. | `Documents/System/System_3C_Character.md` |

---

### I

| 영문 키 | 한글명 | 정의 | 관련 문서 |
| :--- | :--- | :--- | :--- |
| i-frame | 무적 프레임 | Invincibility Frame. 피격 후 무적 시간 등 특정 상태에서 피격 판정이 일시 무효화되는 프레임. 기본 대시에는 i-frame이 없다 (2026-04-08 제거). | `Documents/System/System_3C_Character.md`, `Documents/System/System_Combat_Action.md` |
| Indexer | 인덱서 | 빌더에게 에코를 헌납하면 블루프린트에 다시 등재될 수 있다고 믿는 잔존자 집단. 그러나 빌더는 인지하지 않으므로 등재는 작동하지 않는다 — 거짓 신앙. 작품의 인격적 안타고니스트는 인덱서 지도자다. | `Documents/Content/Content_Story_Synopsis.md`, `Documents/Content/Content_Characters.md` |
| In-Combat | 전투 중 상태 | 적과 전투 상태에 있음을 나타내는 플레이어 상태. 이 상태에서는 MP 자동 회복이 중단되고 특정 아이템 사용이 제한된다. 마지막 전투 행동 이후 일정 시간 경과 시 Out-of-Combat으로 전환된다. | `Documents/System/System_Combat_Action.md` |
| INT | 지력 스탯 | ATK/INT/HP 3스탯 체계의 원소/인챈트 데미지 스탯. 장비 INT + 캐릭터 기본 INT. 에코 인챈트 적용 시 원소 데미지가 INT에 비례하며, 상태이상 지속시간도 INT에 비례한다. INT 게이트(마법 봉인)의 해금 조건. | `Documents/System/System_Growth_Stats.md`, `Documents/System/System_Combat_Damage.md` |
| Item World | 아이템계 | 장비 아이템 내부의 절차적 던전. 레어리티별 2-4개 지층으로 구성되며, 1-2인이 협동하여 (Phase 4+에서 최대 4인) 지층을 클리어하며 장비를 직접 강화한다. 2-Space 모델의 두 번째 공간이며 야리코미의 핵심 콘텐츠이다. | `Documents/Design/Design_Architecture_2Space.md`, `Documents/System/System_ItemWorld_FloorGen.md`, `Reference/게임 기획 개요.md` |

> 📦 아이템계 보스 narrative 명칭 행 archived 2026-05-28 → `Documents/Terms/_archive/NarrativeWorldReset_2026-05-28/`. 보스 등급은 Tier 1-4 로 mechanic 라벨링 예정.

---

### K–M

| 영문 키 | 한글명 | 정의 | 관련 문서 |
| :--- | :--- | :--- | :--- |
| Knockback | 넉백 | 피격 시 캐릭터가 공격 반대 방향으로 밀려나는 물리적 반응. 넉백 거리는 공격 강도와 피격자의 무게에 따라 결정된다. | `Documents/System/System_Combat_Action.md`, `Documents/System/System_3C_Character.md` |
| ~~LCK~~ | ~~행운 스탯~~ | ~~DEPRECATED. 기존 크리티컬/드랍률 스탯. ATK/INT/HP 3스탯 체계 전환으로 삭제. 크리티컬은 고정 5%, 드랍률은 적 테이블 기준.~~ | — |
| Mega Structure | 메가 스트럭처 | 빌더가 끝없이 짓는 거대 시공 구조물. 작품의 무대 전체. 끝없이 자라며 인간이 잔존하는 빈 공동을 점점 삼킨다. BLAME!/Biomega 결의 산업적 거대 구조. 표기 canon: "메가 스트럭처" (메가스트럭쳐·메가 스트럭쳐 비-canon). | `Documents/Content/Content_Story_Synopsis.md`, `Documents/Design/Design_Art_Direction.md`, `Reference/게임 기획 개요.md` |
| Metroidvania | 메트로베니아 | Metroid + Castlevania의 합성어. 능력 게이트 기반 비선형 탐험 액션 장르. ECHORIS의 월드 설계가 이 장르 문법을 기반으로 한다. | `Reference/Metroidvania Game Design Deep Dive.md` |
| ~~MP~~ | ~~마력~~ | ~~DEPRECATED. 기존 스킬 소비 자원. MP 시스템 삭제, 스킬은 쿨다운 기반으로 전환.~~ | — |
| Mystery Room | 미스터리 룸 | 아이템계 특정 지층에 확률적으로 출현하는 특수 이벤트 룸. 상점·특수 전투 등 예측 불가한 이벤트가 발생하며 5% 확률로 출현한다. | `Documents/System/System_ItemWorld_FloorGen.md`, `Reference/게임 기획 개요.md` |

---

### O–P

| 영문 키 | 한글명 | 정의 | 관련 문서 |
| :--- | :--- | :--- | :--- |
| Out-of-Combat | 전투 외 상태 | 전투 상태(In-Combat)가 아닌 평상시 상태. MP 자동 회복이 활성화되고 아이템 사용 제한이 해제된다. | `Documents/System/System_Combat_Action.md` |
| Pillar | 기둥 | ECHORIS의 3대 핵심 설계 기둥. 모든 시스템과 기능은 (1) 메트로베니아 탐험, (2) 아이템계 야리코미, (3) 온라인 멀티플레이 중 최소 하나에 정렬되어야 한다. 어느 기둥에도 해당하지 않는 기능은 채택하지 않는다. | `CLAUDE.md` |
| Procedural Generation | 절차적 생성 | 알고리즘과 시드를 사용하여 맵·룸·Chunk를 자동으로 생성하는 기법. 월드의 마이크로 계층과 아이템계 전 층에 적용된다. 스펠렁키의 Room Grid 방식을 레퍼런스로 사용한다. | `Documents/System/System_World_ProcGen.md`, `Documents/System/System_ItemWorld_FloorGen.md` |

---

### Q

| 영문 키 | 한글명 | 정의 | 관련 문서 |
| :--- | :--- | :--- | :--- |

---

### R

| 영문 키 | 한글명 | 정의 | 관련 문서 |
| :--- | :--- | :--- | :--- |
| Rarity | 레어리티 | 장비 아이템의 등급 체계. Normal·Magic·Rare·Legendary·Ancient 5단계로 구성되며, 등급에 따라 스탯 배율·아이템계 지층 수가 결정된다. | `Reference/게임 기획 개요.md` |
| ~~Recursive Entry~~ | ~~재귀적 진입~~ | ~~DEPRECATED. 아이템계 내부에서 다른 아이템의 아이템계에 중첩 진입하는 메커닉. 삭제됨. 아이템계에서 획득한 아이템은 월드 귀환 후 진입하는 순환 구조로 대체.~~ | — |
| Registration | 등재 | 빌더의 블루프린트 안에 한 항목으로 다시 기록되는 행위. 인덱서의 신앙이나 실제로는 작동하지 않는다(빌더가 인지하지 않으므로). 등재의 대가는 자기 음성의 상실. 결말 B(등재) 의 핵심. | `Documents/Content/Content_Story_Synopsis.md` |
| Resident | 잔존자 | 단절(Cascade) 이후 블루프린트 바깥에 잔존하며 점점 사라져 가는 인간. 빈 공동에 흩어져 산다. 인덱서·솔로 잔존자 등으로 분화. | `Documents/Content/Content_Story_Synopsis.md` |
| Rustborn | 러스트본 | "부식에서 태어난 자". 프롤로그의 실험 동료. Cascade 때 죽으며 에르다의 절개도(Scalpel) 안으로 의식이 응결 → 수천 년 부식하여 녹날(Rustedge, 시작 검) 의 에코가 됨. 시작 후 약 5분 첫 다이브에서 그녀에게 자기 이름을 가르친다. 에르다 이름을 아는 이유 = 동료(정체성 미스터리 아님). 시각 친연성(붉은 머리·청록 눈) = 같은 연구소 동료. | `Documents/Content/Content_Characters.md`, `Documents/Design/Design_Art_Direction.md` |
| Rustedge | 녹날 | 에르다의 시작 검. 프롤로그의 절개도(Scalpel) 가 수천 년 부식 + 죽어가는 러스트본 의식 응결로 변한 것. 멸균 도구가 녹과 영혼을 얻은 유물. 에셋 sword_rustborn. 에코 누적으로 형태 변화(D-15 검 시각화). | `Documents/Content/Content_Story_Synopsis.md`, `Documents/Design/Design_Art_Direction.md` |
| Room Grid | 룸 그리드 | 절차적 생성 시 사용하는 룸 배치 격자. 아이템계는 4×4 고정, 월드 구역은 난이도에 따라 3×3-5×5. 각 셀에 Room Type이 배정되고 Chunk가 조립된다. | `Documents/System/System_World_ProcGen.md`, `Documents/System/System_ItemWorld_FloorGen.md` |
| Room Template | 룸 템플릿 | 절차적 생성의 기본 단위가 되는 사전 제작된 방 구조. Tiled Map Editor로 제작되며, 출입구 방향에 따라 분류된다. 각 템플릿에 Chunk가 채워져 최종 룸이 완성된다. | `Documents/System/System_World_ProcGen.md`, `Documents/System/System_ItemWorld_FloorGen.md` |
| Room Type | 룸 타입 | Room Grid 내 각 셀의 역할 분류. 전투룸·보상룸·함정룸·빈 룸 등으로 나뉘며, Critical Path 상의 룸과 분기 룸을 구분한다. | `Documents/System/System_ItemWorld_FloorGen.md`, `Documents/System/System_World_ProcGen.md` |

---

### S

| 영문 키 | 한글명 | 정의 | 관련 문서 |
| :--- | :--- | :--- | :--- |
| Scalpel | 절개도 | 切開刀. 프롤로그에서 과학자 에르다가 소지한 연구 규격 도구. 에코를 가르고 들어가는 멸균 다이브 인터페이스 — 영혼·사연 없는 깨끗한 도구. Cascade 때 죽어가는 러스트본 의식이 이 안으로 응결 → 수천 년 부식 → 녹날(Rustedge, 시작 검). 멸균(절개도) ↔ 부식(녹날) 의 전후 대비. | `Documents/Content/Content_Story_Synopsis.md` |
| Skill Slot | 스킬 슬롯 | 캐릭터가 전투에 장착할 수 있는 스킬 칸. 총 4개 슬롯이 존재하며, 각 슬롯에 하나의 스킬을 장착한다. 장착 변경은 세이브 포인트에서만 가능하다. 슬롯 제한이 빌드 선택의 전략성을 만든다. | `Documents/System/System_3C_Control.md`, `Documents/System/System_3C_Character.md` |
| SkillCast | 스킬 시전 | 스킬 슬롯에 장착된 스킬을 발동하는 행동. 쿨다운 기반으로 발동되며, 스킬 카테고리(근접·원거리·범위·버프·소환)에 따라 발동 중 이동 가능 여부가 다르다. 자동 조준이 적용된다. | `Documents/System/System_Combat_Action.md`, `Documents/System/System_3C_Control.md` |
| ~~SPD~~ | ~~속도 스탯~~ | ~~DEPRECATED. 기존 이동/공격 속도 스탯. ATK/INT/HP 3스탯 체계 전환으로 삭제. 이동/공격 속도는 무기 유형별 고정값으로 정의.~~ | — |
| SSoT | 단일 진실 공급원 | Single Source of Truth. 수치 데이터는 `Sheets/` CSV 파일에서만 정의하고, 기획 문서는 해당 파일을 참조하는 방식. 데이터의 중복 정의와 불일치를 방지하는 데이터 관리 원칙. | `Documents/Terms/GDD_Writing_Rules.md`, `Documents/Terms/Sheets_Writing_Rules.md` |
| Stat Gate | 스탯 게이트 | 장비 ATK 또는 INT가 특정 수치 이상일 때 열리는 월드 진행 장벽. ATK 게이트(물리 장벽: 파괴 가능한 벽, 바리케이드)와 INT 게이트(마법 봉인: 룬 장벽, 마법 잠금)로 구분된다. 아이템계에서 장비를 강화하여 ATK/INT를 올리고 게이트를 해금하는 것이 핵심 순환의 동력이다. | `Reference/게임 기획 개요.md`, `Documents/Design/Design_Architecture_2Space.md` |
| ~~STR~~ | ~~근력 스탯~~ | ~~DEPRECATED. 기존 물리 공격력 스탯. ATK/INT/HP 3스탯 체계 전환으로 ATK에 통합.~~ | — |
| Super Armor | 슈퍼 아머 | 특정 공격을 받아도 피격 경직(Hitstun)이 발생하지 않는 상태. 보스 및 강화 적 전용이며, 이 상태의 적은 넉백도 무효화된다. | `Documents/System/System_Combat_Action.md` |

---

### T–U

| 영문 키 | 한글명 | 정의 | 관련 문서 |
| :--- | :--- | :--- | :--- |
| Trapdoor Descent | 트랩도어 침강 | 아이템계 보스 처치 후 보스 룸 바닥에 활성화되는 포탈 entity. 공격 키 인터랙트 시 1초 카메라 다운 패닝 + 페이드 후 다음 지층 Plaza 천장 위치에 플레이어 텔레포트. 마지막 지층 보스 처치 후의 Trapdoor 는 월드 세이브포인트 페이드 귀환. 자동 폴 다운 금지 — 능동 인터랙트만. (DEC-039) | `memory/wiki/decisions/DEC-039-Item-World-Continuous-Dive.md` |
| Unified Grid | 통합 그리드 | 아이템계의 모든 지층을 수직으로 이어붙인 단일 2D 배열 구조. 지층 간 씬 전환 없이 연속적 탐험이 가능하다. `UnifiedGridData` 타입으로 구현. | `game/src/level/RoomGrid.ts` |

---

### V–W

| 영문 키 | 한글명 | 정의 | 관련 문서 |
| :--- | :--- | :--- | :--- |
| Tell | 예고 동작 | 적 또는 보스가 강력한 공격을 시전하기 직전 재생하는 예고 모션·이펙트. 플레이어가 회피를 준비할 수 있는 공정성 장치. | `Documents/System/System_Combat_Action.md` |
| ~~VIT~~ | ~~생명력 스탯~~ | ~~DEPRECATED. 기존 최대 HP/환경 저항 스탯. ATK/INT/HP 3스탯 체계 전환으로 삭제. MaxHP는 레벨로 성장.~~ | — |
| Vertical Dive Graph | 수직 딥 다이브 그래프 | 아이템계 한 지층의 그래프 토폴로지. Plaza(hub) = top + Boss = bottom 의 단일 수직 critical path (D 방향) + 좌우 LR 분기. shrine(Archive) 는 R 분기 가지 끝에 부착되는 옵션 안전지대. DEC-037 hub-and-spoke 방사형을 폐기하고 채택. (DEC-039) | `memory/wiki/decisions/DEC-039-Item-World-Continuous-Dive.md`, `game/src/level/RoomGraph.ts` |
| World | 월드 | 2-Space 모델의 첫 번째 공간. 솔로(1인) 탐험을 중심으로 한 핸드크래프트+절차적 혼합 맵. 능력 게이트와 스탯 게이트로 비선형 진행이 설계되며, 아이템 획득과 능력 해금이 주요 보상이다. | `Documents/Design/Design_Architecture_2Space.md`, `Reference/게임 기획 개요.md` |

---

### 한글 전용 용어

| 한글명 | 영문 키/표기 | 정의 | 관련 문서 |
| :--- | :--- | :--- | :--- |
| 2-Space 모델 | 2-Space Model | 게임 세계를 월드(World)/아이템계(Item World) 두 공간으로 분리하여 각 공간이 고유한 규칙과 목적을 갖도록 설계한 ECHORIS의 핵심 구조 원칙. 메트로베니아 탐험과 온라인 멀티플레이의 충돌을 해결하는 핵심 해법이다. 허브(Hub)는 폐기되어 대장간/상점은 월드 세이브 포인트에 통합. | `Documents/Design/Design_Architecture_2Space.md` |
| 야리코미 | Yarikomi (やりこみ) | 게임의 한계까지 파고드는 극한 플레이를 의미하는 일본어. 디스가이아의 아이템계 시스템이 대표적 야리코미 콘텐츠. ECHORIS에서는 아이템계 모든 지층 클리어가 야리코미 축을 구성한다. | `Reference/디스가이아 시스템 분석.md` |

---

## 레어리티 등급 빠른 참조

| 등급 | 색상 | 스탯 배율 | 아이템계 지층 수 | 드랍 확률 |
| :--- | :--- | :--- | :--- | :--- |
| Normal | 흰색 #FFFFFF | x1.0 | 2 지층 (4×4 고정) | 60% |
| Magic | 파란 #6969FF | x1.3 | 3 지층 (4×4 고정) | 25% |
| Rare | 노란 #FFFF00 | x1.7 | 3 지층 (4×4 고정) | 10% |
| Legendary | 주황 #FF8000 | x2.2 | 4 지층 (4×4 고정) | 4% |
| Ancient | 초록 #00FF00 | x3.0 | 4 지층 + 심연 (4×4 고정) | 1% |

> 슬롯 시스템(정체성 슬롯/기억 슬롯)은 NarrativeWorldReset 2026-05-28 으로 분리 보존. 다음 라운드 재정의 대기.

---

## 스탯 게이트 빠른 참조

| 스탯 | 게이트 유형 | 예시 장벽 |
| :--- | :--- | :--- |
| ATK | 물리 장벽 | 금이 간 벽 파괴, 바리케이드드 돌파, 중문/쇠사슬/바위 |
| INT | 마법 봉인 | 룬 문양 장벽, 마법 봉인 문, 아케인 잠금장치, 룬 퍼즐 |

> **설계 변경:** 기존 6대 스탯 게이트(STR/INT/DEX/VIT/SPD/LCK)는 ATK/INT 이중 게이트로 재설계. ATK는 물리 장벽(파괴), INT는 마법 봉인(해제). 기동성/환경 저항/시간 제한 등은 능력 게이트나 환경 퍼즐로 재설계 예정.

---

## 아이템계 보스 빠른 참조

> 📦 보스 등급 narrative 명칭 archived 2026-05-28 → `Documents/Terms/_archive/NarrativeWorldReset_2026-05-28/`. Tier 1-4 mechanic 라벨로 재정의 대기.
> 단편/슬롯/레어리티 승급 보상도 동일 라운드로 분리 보존.
