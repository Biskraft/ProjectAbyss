# ECHORIS 스펙 선정 체크리스트 (Spec Selection Checklist)

> **준거 상위 (Authority):** T-03
> **문서 ID:** PLN-CHECKLIST
> **최근 업데이트:** 2026-05-31
> **용도:** 모든 콘텐츠·시스템 스펙 차원의 결정 추적기. 각 항목의 확정/부분/공백 상태 + 레퍼런스 권장값 + 보유 문서.
> **근거:** `Research/Reference_Metroidvania_ActionRPG_Digest.md` (RES-REF-DIGEST), GDD 감사 2026-05-31.

## 범례

| 표기 | 의미 |
| :--- | :--- |
| C | 확정 (Confirmed) — 값 + 문서/코드 존재 |
| P | 부분 (Partial) — 일부 정의, 채움 필요 |
| G | 공백 (Gap) — 미정의, 결정 필요 |
| D | 결정 대기 (Decision) — 사람/선행 의존 |

---

## A. 스탯 / 전투 코어

| 항목 | 상태 | 확정값 / 권장값 | 보유 문서 |
| :--- | :--- | :--- | :--- |
| 기본 스탯 체계 | C | ATK/INT/HP 3스탯 (DEC-046) | System_Growth_Stats |
| Lv1 기본값 | C | ATK10/INT8/HP100, 레벨당 +2/+2/+15 | System_Growth_Stats |
| 레벨 상한 | P | MVP Lv10 → 1.0 목표값 결정 필요 (권장 50-99) | System_Growth_Stats |
| 크리티컬 | C | 5% 고정, 1.5x 배율 | System_Combat_Damage |
| 물리 데미지 공식 | C | max(1, ATK x Mult - DEF x 0.5), 흡수 상한 85% | System_Combat_Damage |
| 원소 데미지 공식 | C | max(1, INT x Mult - RES x 0.4), 상한 80% | System_Combat_Damage |
| 데미지 캡 | C | 9,999,999 | System_Combat_Damage |
| 캐릭터 레벨업 EXP 곡선 | G | 미작성. CSV Content_System_LevelExp_Curve 필요 | 미작성 |

## B. 무기 (7 타입 확정)

| 항목 | 상태 | 확정값 / 권장값 | 보유 문서 |
| :--- | :--- | :--- | :--- |
| 무기 타입 수 | C | 7 (Blade/Cleaver/Shiv/Harpoon/Chain/Railbow/Emitter, DEC-026) | Weapon CSV |
| Blade 수치 | C | BaseATK 15-172, 사거리 42-108 | Weapon CSV |
| Cleaver-Emitter 수치 | G | 6종 BaseATK/Hitbox 공란 — 채움 필요 | Weapon CSV |
| 무기별 Gimmick (차별화 4축) | G | 권장: 타입당 고유 기믹 1개 (콤보 파이널/스태거/백어택크리/풀백/멀티히트오라/충전배율/지속장) | 미작성 |
| 무기-스탯 친화 | P | ATK(Blade/Cleaver/Shiv) / INT(Chain/Railbow/Emitter) / 혼합(Harpoon) | Digest §7.1 |
| 무기 기본 모델 수 | D | 권장 35-42 (7타입 x 5-6 레어리티). 데모 12-15 | Weapon CSV |
| 무기 콤보 데이터 | P | 3타 콤보 Blade만. Content_Combat_Combo 확장 | Combo CSV |
| 무기 FX | P | Content_FX_WeaponType Blade만 완성 | FX CSV |

## C. 레어리티 / 루트

| 항목 | 상태 | 확정값 / 권장값 | 보유 문서 |
| :--- | :--- | :--- | :--- |
| 레어리티 5등급 | C | Normal/Magic/Rare/Legendary/Ancient, x1.0-x3.0 (DEC-026) | System_Equipment_Rarity, Content_Rarity CSV |
| 드랍률 | C | 55/20/7/2.5/0.5 + no_drop 15% | Content_Rarity CSV |
| 기억단편 슬롯 수 | C | 2/3/4/6/8 (레어리티별) | System_Equipment_Rarity |
| Affix 풀 규모 | G | 권장 35-42 (공격14/방어10/조건10/유틸8) | 미작성 |
| Affix 슬롯/레어리티 | G | 권장 Normal0/Magic1/Rare2/Legendary3+Aspect/Ancient3+Aspect+심연고정 | 미작성 |
| Prefix/Suffix 분리 | G | 권장 채택 (곱셈 조합) | 미작성 |
| 세트 효과 | D | 1.0 범위. 데모 제외 | 미작성 |

## D. 월드 / 맵

| 항목 | 상태 | 확정값 / 권장값 | 보유 문서 |
| :--- | :--- | :--- | :--- |
| 매크로 토폴로지 | C | 수직 척추 + 가지 (7층위 + 역상승 T1) | System_World_MapStructure (골격) |
| 층위 수 | C | 7 + 역상승 1 (인디 Target 밴드 8-10 부합) | System_World_MapStructure |
| 층위 지명/테마 | D | 내러티브 캐논 대기 (D-NARR). 자리표시자 T1-T7 | archived |
| 능력 게이트 배치 (D-GATE) | C | 캐논 11렐릭 × 7층위 배치 완료(2026-06-01). Design_World_Master §4.2 D-GATE 배치표. 코드 게이팅 반영만 잔여 | Design_World_Master §4.2, PLN-RELIC |
| 스탯 게이트 배치 | G | 권장: 레어리티 색상 연동, ATK/INT 축 교번, 한 게이트 단일 축 | System_World_StatGating |
| Room 크기 | C | 60x34 타일, 평균 2-3분 | System_World_MapStructure |
| 빠른 이동 노드 밀도 | G | 권장: 티어당 1개, 클리어 후, 출구 배치 | 미작성 |
| 비밀 밀도 | G | 권장: 구역당 2-4 (이연/관찰/스킬 1개씩) | 미작성 |
| 절차 생성 검증 | C | Always Winnable + Critical Path 재시도 3회 | System_World_ProcGen |

## E. 능력 / 렐릭 (코드 실측 5 렐릭 + 전투능력)

> **코드 실측 (Player.ts):** GDD 5종 계획과 다름. 실제 렐릭 UI 노출 = dash/wallJump/doubleJump/waterBreathing/surge. 추가 전투 능력 diveAttack(렐릭 미분류).

| 항목 | 상태 | 확정값 / 권장값 | 보유 문서 |
| :--- | :--- | :--- | :--- |
| dash | C | 구현됨, 시작 보유 (무적 없음) | 코드 |
| doubleJump | C | 구현됨 (해금형) | 코드 |
| wallJump | C | 구현됨 (벽 도약 — 계획의 "벽 타기/등반"과 다름) | 코드 |
| waterBreathing | C | 구현됨 (해금형) | 코드 |
| surge | C | 구현됨. 역류 분출 상승 비행 (GDD 역중력 자리 대체) | 코드 |
| diveAttack | C | 구현됨. 하강 공격. 렐릭 분류 미정 | 코드 |
| 역중력 → 재정의 | C | 플레이어 중력 반전(R-V04) 보류. 기능은 **반중력**(사물·유체, Z2) + **극성 부츠**(빌더 천장 보행, Z5)로 분할 흡수. 상승 게이트는 surge | PLN-RELIC §2.2 |
| 벽 타기(등반) vs 벽 점프 | D | 코드는 점프. 별도 "벽 등반" 추가 도입 여부 (잔여) | PLN-RELIC §8 |
| 렐릭-격벽 매핑 | C | 캐논 11 × 7층위 배치 완료(2026-06-01). surge=Z4 상승 정점/T1 | Design_World_Master §4.2 |
| 6번째 렐릭 여부 | C | diveAttack 정식 렐릭 승격(UI 노출), 캐논 코어 6에 포함 | PLN-RELIC §1 |

## F. 적

| 항목 | 상태 | 확정값 / 권장값 | 보유 문서 |
| :--- | :--- | :--- | :--- |
| 적 종류 수 | P | 현재 2종 → 권장 Target 30-50 (1.0), 데모 10-12 | Spec, Digest §2 |
| 행동 아키타입 | C | 11종 확정 (A-01~A-10) | System_Enemy_MonsterArchetype (SSoT) |
| 핵심 AI 구현 수 | G | 권장 8 핵심 AI 구현 → 속성 스태킹으로 40-60 체감 | Digest §7.3 |
| 적 스탯 CSV | G | Content_Stats_Enemy 필드 대부분 공란 | Enemy CSV |
| 적 원소 약점/저항 | G | 권장 보스·엘리트만, 잡몹 중립 | 미작성 |

## G. 보스

| 항목 | 상태 | 확정값 / 권장값 | 보유 문서 |
| :--- | :--- | :--- | :--- |
| 보스 총수 | P | 권장 메인 8-12 + 서브 4-8 (1.0). 데모 4-5 | Spec, Digest §2 |
| 층위 진행 보스 | G | 6-7 (처치 시 렐릭) | System_Enemy_BossDesign |
| 층위 숨겨진 보스 | G | 6-7 | 미작성 |
| 아이템계 군주 | G | 7-9 (테마별). 디스가이아 장군/왕/신 티어 차용 | 미작성 |
| 보스 페이즈 구조 | C | 1-3 페이즈, 인디 2 기본 (P1 3패턴 / P2 +2-3) | BossDesign_Research |
| 텔레그래프 표준 | C | 선딜 300-1000ms, 안전창 1-2초, 3시도 학습 | BossDesign_Research |
| 아이템계 보스 AI 구현 | G | 최우선 코드 작업 (현재 스탯만) | StrataConfig |

## H. 아이템계

| 항목 | 상태 | 확정값 / 권장값 | 보유 문서 |
| :--- | :--- | :--- | :--- |
| 지층 수/레어리티 | C | 1/2/3/4/4+심연 (MVP 1 고정 오버라이드) | System_Equipment_Rarity, StrataConfig CSV |
| 테마 수 | C | 11 (T-HABITAT 등, CSV 기정의) | DecoPresets CSV |
| 테마 데코 구현 | P | ProceduralDecorator 연동 상태 미확인 | DecorationCatalog CSV |
| 웨더 프로파일 | P | cyro/shadow/forge 등 구현, 11 테마 매핑 점검 | 코드 |
| 미스터리 룸 | P | MemoryRooms CSV 부분, SYS-IW-05 미작성 | 미작성 |
| 지오 이펙트 | G | SYS-IW-06 미작성. 디스가이아 15+ 패널 차용 | 미작성 |
| 기억의 방랑자 | G | 필드 랜덤 출현, 보상 강화 진입 | 미작성 |
| 아이템 레벨/강화 곡선 | P | Content_Item_Growth 부분 | Item_Growth CSV |

## I. 기억 단편 (이노센트)

| 항목 | 상태 | 확정값 / 권장값 | 보유 문서 |
| :--- | :--- | :--- | :--- |
| 풀 종류 수 | G | 권장 12-15 (1.0), 데모 6 | Spec |
| 분류 체계 | P | 단일스탯/행동/상태부여/상태저항/원소저항/특수 (디스가이아 차용) | 재정의 대기 |
| 행동 수정자 밸런스 | C | Berserker+20%/Vampire2-6%/Ironclad50%/Sprinter+15% | InnocentBalance_Research |
| 포획/복종/합성 규칙 | G | 미정의 | System_Memory_Core (재정의) |
| 기억단편 CSV | G | Content_MemoryShards 구조만 | MemoryShards CSV |

## J. 스킬 (상세: PLN-SKILL)

| 항목 | 상태 | 확정값 / 권장값 | 보유 문서 |
| :--- | :--- | :--- | :--- |
| 슬롯 구조 | C | 4 고정 (A Protocol/B Traverse/C Dampener/D Resonance), 트리 없음 | PLN-SKILL §1 |
| 스킬 풀 | P | 18종 설계 완료 (A5/B4/C5/D4), 데모 8. CSV 발주 대기 | PLN-SKILL §2 |
| 발동 방식 | C | 쿨다운 전용(MP 폐기), Slot D만 hit-charge | PLN-SKILL §0 |
| 무기 바인딩 | P | 7무기 × 18스킬 변형 설계, 수치 CSV 대기 | PLN-SKILL §3 |
| 스킬 해금 경로 | G | 월드/보스/아이템계 배치 구체화 (D-SKILLGET) | PLN-SKILL §6 |
| 자동 조준 | C | 원터치, 자동 조준 | System_Combat_Action |

## K. 원소 / 상태이상 (4종 확정)

| 항목 | 상태 | 확정값 / 권장값 | 보유 문서 |
| :--- | :--- | :--- | :--- |
| 원소 4종 | C | 화/빙/뇌/무 (DEC-018) | System_Combat_Elements |
| 상태이상 | C | Burn/Freeze/Shock | System_Combat_Elements |
| 상성표 | C | 삼각 순환 (화>빙>뇌>화), 보스 약점 1.5x 상한 | System_Combat_Elements |
| 원소 반응 | G | 권장 3종 (Melt/Overload/Shatter, 단방향) | 미작성 |
| 원소 해금 | P | Ice=월드보스2, Thunder=월드보스3 (보스 배치 미정) | System_Combat_Elements |

## L. 방어구 / 장비 슬롯 (7 슬롯 확정)

| 항목 | 상태 | 확정값 / 권장값 | 보유 문서 |
| :--- | :--- | :--- | :--- |
| 슬롯 체계 | C | 무기+Visor/Plate/Gauntlet/Greaves/Rig/Sigil/Seal (DEC-026) | System_Equipment_Slots |
| 무기 슬롯 구현 | C | 1슬롯 동작 | 코드 |
| 방어구 슬롯 구현 | G | 6슬롯 미구현 | 미작성 |
| 방어구 CSV | G | Content_Stats_Armor_List 파일 자체 없음 | 미작성 |
| 슬롯별 스탯 분배 | G | 권장 Visor INT / Plate HP / Gauntlet ATK / Greaves 이동 / Rig 유틸 / Sigil 원소 / Seal 특수 | 미작성 |
| 모델 수 | D | 권장 24-28 (슬롯당 3-4 x 레어리티) | 미작성 |

## M. 경제 / 자원 / 거점 (상세: PLN-SHOP)

| 항목 | 상태 | 확정값 / 권장값 | 보유 문서 |
| :--- | :--- | :--- | :--- |
| 상점 벤더 로스터 | P | 6벤더(노다/율 + 구조 4) 설계 완료, 코드 미구현 | PLN-SHOP §3 |
| 가격/판매 비율 | P | 소모품 고정 앵커(50/200), Legendary+ 귀속, sink 균형 설계 | PLN-SHOP §4-8 |
| 드랍률 가중치 | C | 레어리티 분리 추첨 | Content_Rarity CSV |
| HL 통화 수치 | P | sink 설계됨(D-07: 수리비/복종/승급), 수치 곡선 미정 | Design_Economy_FaucetSink |
| 골드 소비처 (D-GOLD) | P | 설계 존재(D-07), 구현 대기(ECO-01 P1). 설계 공백 아님 | D-07 / SYS-ECO-01 |
| 상점 공간 (D-HUBFN) | P | 지정 완료 — 잔존자 마을(D-20 §5.1, 패턴 A). 기물 목록/이주 트리거 코드 스펙 잔여 | Design_World_Master §5.1 |
| 에고 샤드 (V Cast) | P | 구현됨, 보유/재충전/원소 규칙 스펙화 필요 | EgoShard.ts |
| 에코 플라스크 (R) | P | 구현됨, 충전 수/회복% 스펙화 필요 | System_Healing_Recovery |
| 소비 아이템 시스템 | G | 드랍 존재, 시스템 미정 | 미작성 |
| 사망 페널티 (D-DEATH) | G | 손실/부활 규칙 미정 | 미작성 |
| 구역별 드랍 풀 | P | 기본 프레임만 | Drop CSV |
| HP 회복 규칙 | P | 문서 간 모순 — 정합 필요 | Combat_Damage vs Action |

## N. 멀티플레이 (Phase 3+)

| 항목 | 상태 | 확정값 / 권장값 | 보유 문서 |
| :--- | :--- | :--- | :--- |
| 동기화 모델 | G | WebSocket 서버 권위 + 예측 | 미작성 (SYS-MP-01-04) |
| 파티 합류 | G | URL 링크, 1-2인 아이템계 | 미작성 |
| 고스트 메시지 | G | 비동기 소셜 (우선순위 낮음) | 미작성 |

## O. 오디오 / UI

| 항목 | 상태 | 확정값 / 권장값 | 보유 문서 |
| :--- | :--- | :--- | :--- |
| BGM 트랙 수 | G | 권장 16-20 (1.0), 데모 6-8. @pixi/sound (DEC-040) | 미작성 |
| SFX 카테고리 | P | 8 카테고리 (audioEvents 골격) | Audio CSV |
| 맵 UI | G | 전체 지도 미작성 (UI-03) | 미작성 |
| 아이템계 UI | P | 깊이 게이지만 (UI-04 본 UI 미작성) | UI-11 |
| 신성 획득 UX | P | 설계 완료, 구현 대기 (UI-12) | UI_SacredPickup |

## P. 로컬라이제이션 / 내러티브

| 항목 | 상태 | 확정값 / 권장값 | 보유 문서 |
| :--- | :--- | :--- | :--- |
| 문자열 등록 | P | Content_Localization CSV 핵심만 | Localization CSV |
| KO/EN 커버 | G | 데모 직전 전체 커버 | 미작성 |
| 내러티브 캐논 (D-NARR) | D | 2026-05-29 리셋 라운드 종결 대기 | archived |

---

## 결정 우선순위 (선행 순서)

| 순위 | 결정 ID | 항목 | 차단하는 후행 작업 |
| :--- | :--- | :--- | :--- |
| 1 | ~~D-GATE~~ ✅ | 캐논 11렐릭 × 7층위 배치 완료(§4.2). 코드 게이팅 반영만 잔여 | 7층위 발주, 진행 순서 |
| 2 | D-STATGATE | 스탯 게이트 색상/축 규칙 | 강화 순환 배치 |
| 3 | D-NARR | 내러티브 캐논 종결 | 모든 명칭/테마/서사 |
| 4 | D-BOSSAI | 아이템계 보스 AI | 아이템계 루프 완성, 진행 보스 |
| 5 | D-SHARD | 기억 단편 12-15종 | 아이템계 보상 깊이 |
| 6 | D-AI8 | 핵심 AI 8종 | 적 로스터 40-60 |
| 7 | D-WEAPON | 무기 6종 수치 + Gimmick | 무기 7타입 실사용 |
| 8 | D-AFFIX | Affix 풀 35-42 | 루트 다양성 |
| 9 | D-ARMOR | 방어구 슬롯/스탯 | 장비 폭 |
| 10 | D-SKILL | 스킬 16-20 풀 | 전투 깊이 |

> **Note:** 본 체크리스트는 PLN-SPEC(볼륨)과 PLN-MASTER(일정)의 결정 추적기다. 각 G/D 항목이 해당 SYS 문서에서 확정되면 상태를 C로 갱신하고 CSV에 수치 SSoT를 기입한다.
