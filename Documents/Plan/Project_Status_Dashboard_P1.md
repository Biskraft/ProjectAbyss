# Project Abyss P1 현황판 (프로토타입)

> **Last Sync:** 2026-03-25 (3차 동기화 — 코드 대조 완료)
> **범위:** Phase 1 프로토타입 대상 기능
> **코드베이스:** game/src/ (~6,900줄 TypeScript)

## 범례

| 상태 | 의미 |
| :--- | :--- |
| ✅ 구현 완료 | 코드에서 동작 확인 |
| 🔧 부분 구현 | 프레임워크 존재, 완성 필요 |
| 📅 대기 | P1 범위 내, 미착수 |
| ⬜ P2+ | MVP 범위 밖 (Phase 2 이후 대상) |

## 요약

| 문서 (Source) | 총 기능 | P1 범위 | ✅ | 🔧 | 📅 | ⬜ P2+ | P1 진행률 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **System_3C_Camera.md** | 6 | 6 | 5 | 0 | 1 | 0 | ████████░░ (83%) |
| **System_3C_Character.md** | 12 | 8 | 7 | 0 | 1 | 4 | ████████░░ (87%) |
| **System_3C_Control.md** | 9 | 6 | 6 | 0 | 0 | 3 | ██████████ (100%) |
| **System_Combat_Action.md** | 8 | 6 | 6 | 0 | 0 | 2 | ██████████ (100%) |
| **System_Combat_Damage.md** | 11 | 6 | 4 | 2 | 0 | 5 | █████████░ (83%) |
| **System_Combat_Weapons.md** | 3 | 3 | 3 | 0 | 0 | 0 | ██████████ (100%) |
| **System_Enemy_AI.md** | 11 | 11 | 8 | 2 | 1 | 0 | █████████░ (82%) |
| **System_Equipment_Rarity.md** | 8 | 7 | 6 | 1 | 0 | 1 | █████████░ (93%) |
| **System_Equipment_Slots.md** | 6 | 6 | 6 | 0 | 0 | 0 | ██████████ (100%) |
| **System_Growth_Stats.md** | 15 | 10 | 4 | 2 | 4 | 5 | ██████░░░░ (50%) |
| **System_ItemWorld_FloorGen.md** | 7 | 6 | 5 | 1 | 0 | 1 | █████████░ (92%) |
| **System_World_ProcGen.md** | 7 | 6 | 6 | 0 | 0 | 1 | ██████████ (100%) |
| **Total** | **103** | **81** | **66** | **8** | **7** | **22** | **█████████░ (81%)** |

> **핵심 수치:** P1 범위 81개 기능 중 66개 완료, 8개 부분 구현, 7개 미착수

---

## 상세

### [System_3C_Camera.md](../System/System_3C_Camera.md)

| 기능 ID | 분류 | 기능명 | 우선순위 | 구현 상태 | 근거 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| CAM-01-A | 시스템 | Follow Mode (Lerp 추적) | P1 | ✅ 구현 완료 | Camera.ts: followLerp=0.08, smooth follow |
| CAM-02-A | 시스템 | Dead Zone 처리 | P1 | ✅ 구현 완료 | Camera.ts: deadZoneX=32, deadZoneY=24 |
| CAM-03-A | 시스템 | Look Ahead (이동 방향 선행) | P1 | ✅ 구현 완료 | Camera.ts: lookAhead 변수 + lerp 타겟팅 |
| CAM-05-A | 시스템 | Room Transition (방 전환) | P1 | ✅ 구현 완료 | WorldScene/ItemWorldScene: fade_out/fade_in 상태 머신 |
| CAM-06-A | 시스템 | Boss Lock (보스전 고정) | P1 | 📅 대기 | 아이템계 보스 전투 구현 시 필요 |
| CAM-09-A | 시스템 | Camera Bounds (맵 경계 제한) | P1 | ✅ 구현 완료 | Camera.ts: bounds AABB 클램프 + 정수 픽셀 스냅 |

### [System_3C_Character.md](../System/System_3C_Character.md)

| 기능 ID | 분류 | 기능명 | 우선순위 | 구현 상태 | 근거 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| CHR-01-A | 시스템 | 기본 이동 (가속/감속) | P1 | ✅ 구현 완료 | Player.ts: applyHorizontalInput(), MOVE_SPEED=128 |
| CHR-01-B | 시스템 | 고정 높이 점프 | P1 | ✅ 구현 완료 | Player.ts: tryJump(), JUMP_HEIGHT=80 |
| CHR-01-C | 시스템 | Coyote Time / Jump Buffer | P1 | ✅ 구현 완료 | Player.ts: COYOTE_TIME=150ms, JUMP_BUFFER=250ms |
| CHR-02-D | 시스템 | 대시 (Dash) — 렐릭 해금 | P2 | ✅ 코드 완료 | Player.ts: startDash/stateDash, 무적 없음. 렐릭 시스템 연동 필요 (획득 전 비활성) |
| CHR-03-A | 시스템 | 벽 슬라이드 (Wall Slide) | P2 | ⬜ P2+ | MVP OUT: "벽 점프, 이중 점프, 변신" 제외 |
| CHR-03-B | 시스템 | 벽 점프 (Wall Jump) | P2 | ⬜ P2+ | MVP OUT: 능력 게이트 해금 시스템 (Phase 2) |
| CHR-05-A | 시스템 | 히트박스/허트박스 시스템 | P1 | ✅ 구현 완료 | HitManager.ts: AABB 히트박스, CombatData.ts: 콤보별 크기 |
| CHR-05-B | 시스템 | 피격/넉백 처리 | P1 | ✅ 구현 완료 | Player.ts: onHit(), HitManager.ts: knockbackX/Y 적용 |
| CHR-07-A | 시스템 | 멀티플레이 물리 동기화 | P3 | ⬜ P2+ | MVP OUT: "싱글 플레이" 한정 |
| CHR-08-A | 시스템 | 타일맵 충돌 / 원웨이 플랫폼 | P1 | ✅ 구현 완료 | Physics.ts: resolveX/resolveY, 타일 타입(solid/one-way) |
| CHR-09-A | 시스템 | 스킬 슬롯 시스템 (SkillCast) | P2 | ⬜ P2+ | MVP OUT: "스킬 슬롯" 제외 |
| CHR-09-B | 시스템 | 자동 조준 보조 (Auto-Aim) | P2 | ⬜ P2+ | MVP OUT: "자동 조준" 제외 |

### [System_3C_Control.md](../System/System_3C_Control.md)

| 기능 ID | 분류 | 기능명 | 우선순위 | 구현 상태 | 근거 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| CTRL-01-A | 입력 | 키보드 입력 처리 프레임워크 | P1 | ✅ 구현 완료 | InputManager.ts: KeyboardEvent, isDown/isJustPressed |
| CTRL-01-C | 입력 | ~~모바일 가상 패드 입력 프레임워크~~ | — | ❌ 삭제 | 모바일 미지원으로 삭제 |
| CTRL-02-A | 스킬 | 스킬 슬롯 시스템 (4슬롯) | P2 | ⬜ P2+ | MVP OUT: "스킬 슬롯" 제외 |
| CTRL-02-B | 스킬 | 스킬 쿨다운 관리 시스템 | P2 | ⬜ P2+ | MVP OUT |
| CTRL-02-C | 스킬 | 자동 조준 시스템 | P2 | ⬜ P2+ | MVP OUT: "자동 조준" 제외 |
| CTRL-03-A | 기본 조작 | 기본 공격 자동 콤보 (3타) | P1 | ✅ 구현 완료 | Player.ts: comboIndex, COMBO_WINDOW=400ms, 공격 큐잉 |
| CTRL-03-B | 기본 조작 | 점프 (고정 높이) | P1 | ✅ 구현 완료 | InputManager: JUMP 바인딩, Player.ts: tryJump |
| CTRL-04-A | 가상 패드 | ~~가상 패드 레이아웃 렌더링~~ | — | ❌ 삭제 | 모바일 미지원으로 삭제 |
| CTRL-06-A | 예외 | 포커스 해제 시 입력 초기화 | P1 | ✅ 구현 완료 | InputManager.ts: blur/visibilitychange 핸들러, 키 리셋 |

### [System_Combat_Action.md](../System/System_Combat_Action.md)

| 기능 ID | 분류 | 기능명 | 우선순위 | 구현 상태 | 근거 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| CMB-01-A | 기본 공격 | 자동 콤보 시스템 (3타) | P1 | ✅ 구현 완료 | Player.ts: 콤보 체인, CombatData.ts: COMBO_STEPS[3] |
| CMB-01-B | 기본 공격 | 공중 공격 (Air Attack) | P1 | ✅ 구현 완료 | Player.ts: stateAir 중 공격 가능, 수평 입력 유지 |
| CMB-02-A | 스킬 | 스킬 시전 프레임워크 | P2 | ⬜ P2+ | MVP OUT: "스킬 슬롯" 제외 |
| CMB-02-B | 스킬 | 스킬 카테고리별 발동 규칙 | P2 | ⬜ P2+ | MVP OUT |
| CMB-04-A | 피격 | 피격 경직 (Hitstun) 시스템 | P1 | ✅ 구현 완료 | CombatData.ts: hitstun 값, Player.ts: stateHit |
| CMB-05-A | 타격감 | 히트스탑 (Hitstop) 시스템 | P1 | ✅ 구현 완료 | HitManager.ts: hitstopFrames (1타=3f, 2타=4f, 3타=6f, 킬=8f) |
| CMB-05-B | 타격감 | 넉백 물리 시스템 | P1 | ✅ 구현 완료 | HitManager.ts: 방향 넉백, CombatData.ts: knockbackX/Y |
| CMB-06-A | 전투 흐름 | 전투 상태 관리 (Combat State) | P1 | ✅ 구현 완료 | Player.ts: FSM (Idle/Run/Jump/Fall/Dash/Attack/Hit/Death) |

### [System_Combat_Damage.md](../System/System_Combat_Damage.md)

| 기능 ID | 분류 | 기능명 | 우선순위 | 구현 상태 | 근거 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| DMG-01-A | 공식 | 기본 데미지 공식 | P1 | ✅ 구현 완료 | Damage.ts: calculateDamage() ATK-DEF 감산 + 랜덤 분산 |
| DMG-01-B | 공식 | 스킬 데미지 공식 | P2 | ⬜ P2+ | MVP OUT: 스킬 시스템 없음 |
| ~~DMG-01-C~~ | ~~공식~~ | ~~마법 데미지 공식~~ DEPRECATED | — | ❌ DEPRECATED | ATK 통합으로 별도 마법 공식 삭제 |
| DMG-02-A | 크리티컬 | 크리티컬 확률 시스템 | P1 | 🔧 부분 구현 | Damage.ts: criticalMultiplier 파라미터 존재, 실제 확률 계산 미구현 |
| DMG-02-B | 크리티컬 | 크리티컬 배율 시스템 | P1 | 🔧 부분 구현 | 고정 1.5x 배율 (LCK 삭제, 이노센트 보정 Phase 2) |
| DMG-03-A | 원소 | 원소 상성 배율 | P2 | ⬜ P2+ | MVP OUT: "원소" 제외 |
| DMG-04-A | 방어 | 물리 방어력 감산 공식 | P1 | ✅ 구현 완료 | Damage.ts: def * defFactor 감산 |
| ~~DMG-04-B~~ | ~~방어~~ | ~~마법 저항력 감산 공식~~ DEPRECATED | — | ❌ DEPRECATED | RES 삭제, DEF로 통합 |
| DMG-05-A | 스케일링 | 아이템계 지층별 데미지 스케일링 | P1 | ✅ 구현 완료 | StrataConfig.ts: 레어리티×지층별 적 스탯 정의 |
| DMG-06-A | UI | 데미지 넘버 표시 | P1 | ✅ 구현 완료 | DamageNumber.ts: 색상/크기 차별화, 플로팅 표시 |
| DMG-07-A | 멀티 | 서버 데미지 검증 | P3 | ⬜ P2+ | MVP OUT: "싱글 플레이" 한정 |

### [System_Combat_Weapons.md](../System/System_Combat_Weapons.md)

| 기능 ID | 분류 | 기능명 | 우선순위 | 구현 상태 | 근거 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| WPN-01-A | 무기 체계 | 무기 카테고리 정의 (MVP: 검 1종) | P1 | ✅ 구현 완료 | Weapons.ts: 검 5레어리티 정의, 히트박스 크기 차별화 |
| WPN-01-B | 무기 체계 | 무기 차별화 3축 (사거리/속도/범위) | P1 | ✅ 구현 완료 | CombatData.ts: 콤보별 사거리/프레임/넉백 정의 |
| WPN-03-B | 무기 교체 | 전투 중 무기 교체 불가 (MVP) | P1 | ✅ 구현 완료 | 인벤토리에서만 장착 변경 가능 |

### [System_Enemy_AI.md](../System/System_Enemy_AI.md)

| 기능 ID | 분류 | 기능명 | 우선순위 | 구현 상태 | 근거 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| ENM-01-A | 상태 머신 | 적 AI 기본 상태 머신 (7단계) | P1 | ✅ 구현 완료 | Enemy.ts: FSM (idle/chase/attack/cooldown/hit/death) |
| ENM-01-B | 상태 머신 | 화면 밖 비활성화 처리 | P1 | 🔧 부분 구현 | 방 단위 스폰/디스폰 존재, 화면 밖 틱 최적화 미확인 |
| ENM-02-A | 감지 | 원형 감지 반경 시스템 | P1 | ✅ 구현 완료 | Skeleton.ts: detectRange=160px, 수평 거리 계산 |
| ENM-02-B | 감지 | 시야각 (FoV) 판정 | P1 | 📅 대기 | 현재 수평 거리만 사용, 각도 판정 없음 |
| ENM-02-C | 감지 | Line of Sight 판정 | P1 | 🔧 부분 구현 | 거리 기반 감지만 존재, 장애물 차단 미구현 |
| ENM-04-A | 적 개체 | Skeleton (근접형) AI | P1 | ✅ 구현 완료 | Skeleton.ts: HP40/ATK8/DEF3, 접근→공격→쿨다운 |
| ENM-04-B | 적 개체 | Ghost (원거리형) AI | P1 | ✅ 구현 완료 | Ghost.ts: FSM 완비, 거리유지+공격+쿨다운 |
| ENM-05-A | 스폰 | 방 진입 시 스폰 포인트 활성화 | P1 | ✅ 구현 완료 | WorldScene/ItemWorldScene: 방 진입 시 적 스폰 |
| ENM-05-B | 사망 | 사망 이펙트-드랍-경험치 순서 | P1 | ✅ 구현 완료 | 사망 시 아이템 드랍 + GoldenMonster 포탈 스폰 |
| ENM-06-A | 스케일링 | 아이템계 지층별 스탯 스케일링 | P1 | ✅ 구현 완료 | StrataConfig.ts: 레어리티×지층별 HP/ATK/DEF 정의 |
| ENM-06-B | 어그로 | 단일 타겟 어그로 시스템 | P1 | ✅ 구현 완료 | 최근접 플레이어 추적 (단일 플레이어이므로 충분) |

### [System_Equipment_Rarity.md](../System/System_Equipment_Rarity.md)

| 기능 ID | 분류 | 기능명 | 우선순위 | 구현 상태 | 근거 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| RAR-01-A | 등급 | 5등급 레어리티 정의 | P1 | ✅ 구현 완료 | ItemInstance.ts: Normal~Ancient 데이터 구조 |
| RAR-01-B | 등급 | 레어리티별 스탯 배율 적용 | P1 | ✅ 구현 완료 | Weapons.ts: RARITY_MULTIPLIER (x1.0~x3.0) |
| RAR-02-A | 아이템계 | 레어리티별 아이템계 지층 수 정의 | P1 | ✅ 구현 완료 | StrataConfig.ts: Normal=2, Magic=3, ... Ancient=4+심연 |
| RAR-02-B | 아이템계 | 아이템계 진입 규칙 (레어리티 연동) | P1 | ✅ 구현 완료 | ItemWorldScene.ts: 아이템별 지층 구성 로드 |
| RAR-03-A | 이노센트 | 레어리티별 이노센트 슬롯 수 정의 | P2 | ⬜ P2+ | MVP OUT: "이노센트" 제외 |
| RAR-04-A | 드랍 | 레어리티별 드랍 확률 가중치 정의 | P1 | ✅ 구현 완료 | ItemDrop.ts: rollDrop/rollGoldenDrop, 난이도별 가중치 |
| RAR-04-B | 드랍 | 드랍 이펙트 (레어리티별 시각 효과) | P1 | 🔧 부분 구현 | 레어리티별 색상 차이 있으나 파티클 미구현 |
| RAR-05-A | 시각 | 아이템 이름 색상 (레어리티별) | P1 | ✅ 구현 완료 | ItemInstance.ts: RARITY_COLOR 디아블로 스타일 |

### [System_Equipment_Slots.md](../System/System_Equipment_Slots.md)

| 기능 ID | 분류 | 기능명 | 우선순위 | 구현 상태 | 근거 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| EQP-01-A | 슬롯 | 무기 슬롯 (MVP: 검 1종) | P1 | ✅ 구현 완료 | Inventory.ts: equip/unequip, 맨손 폴백 ATK=5 |
| EQP-02-A | 착용 | 아이템 착용 규칙 | P1 | ✅ 구현 완료 | Inventory.ts: equip() 메서드 |
| EQP-02-B | 착용 | 아이템 해제 규칙 | P1 | ✅ 구현 완료 | Inventory.ts: unequip(), 빈 슬롯 복귀 |
| EQP-03-A | 스탯합산 | 장비 스탯 → 캐릭터 스탯 합산 | P1 | ✅ 구현 완료 | 장착 시 ATK 반영, recalcItemAtk() |
| EQP-04-A | 데이터 | 아이템 데이터 구조 정의 | P1 | ✅ 구현 완료 | ItemInstance.ts: uid/def/level/exp/rarity/itemWorldProgress |
| EQP-07-A | UI | 장비창 HUD | P1 | ✅ 구현 완료 | InventoryUI.ts: 20슬롯(5×4), 레어리티 색상, 선택 정보 |

### [System_Growth_Stats.md](../System/System_Growth_Stats.md)

| 기능 ID | 분류 | 기능명 | 우선순위 | 구현 상태 | 근거 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| STAT-01-A | 스탯 정의 | ATK/INT/HP 3스탯 시스템 | P1 | 🔧 부분 구현 | Stats.ts: CharacterStats에 INT 추가 필요 |
| STAT-01-B | 스탯 정의 | ~~2차 파생 스탯~~ DEPRECATED | — | ❌ DEPRECATED | ATK/INT/HP 3스탯으로 단순화, 파생 스탯 불필요 |
| STAT-02-A | 공식 | FinalStat 합산 공식 | P1 | 🔧 부분 구현 | Base + Equip 합산 동작, Innocent 항 없음 (P2) |
| STAT-02-B | 공식 | MaxHP 산출 공식 | P1 | ✅ 구현 완료 | Player 고정 HP 존재 + 지층별 스케일링 |
| STAT-02-C | 공식 | ~~MaxMP 산출 공식~~ DEPRECATED | — | ❌ DEPRECATED | MP 시스템 삭제, 스킬은 쿨다운 기반 |
| STAT-03-A | 성장 테이블 | Lv 1-10 기본 스탯 성장 곡선 | P1 | ✅ 구현 완료 | Stats.ts: BASE_STATS[Lv1~Lv10], CSV 데이터 연동 |
| STAT-03-B | 성장 테이블 | 레벨업 경험치 요구량 테이블 | P1 | 📅 대기 | 아이템 레벨업 EXP 존재, 캐릭터 레벨업 미구현 |
| STAT-04-A | 전투 연동 | ATK → 데미지 산출 | P1 | ✅ 구현 완료 | 데미지 계산에 ATK 직접 사용 |
| ~~STAT-04-B~~ | ~~전투 연동~~ | ~~INT → 마법 ATK~~ DEPRECATED | — | ❌ DEPRECATED | INT 삭제, 모든 공격은 ATK 기반 |
| ~~STAT-04-C~~ | ~~전투 연동~~ | ~~DEX → 명중/회피~~ DEPRECATED | — | ❌ DEPRECATED | DEX 삭제, 회피는 대시 위치 이탈 |
| ~~STAT-04-D~~ | ~~전투 연동~~ | ~~VIT → MaxHP/DEF~~ DEPRECATED | — | ❌ DEPRECATED | VIT 삭제, HP는 레벨 기반, DEF는 장비 제공 |
| ~~STAT-04-E~~ | ~~전투 연동~~ | ~~SPD → 이동/공격 속도~~ DEPRECATED | — | ❌ DEPRECATED | SPD 삭제, 속도는 무기별 고정 + 이노센트 |
| ~~STAT-04-F~~ | ~~전투 연동~~ | ~~LCK → 드랍률/크리티컬~~ DEPRECATED | — | ❌ DEPRECATED | LCK 삭제, 크리티컬 5% 고정 + 이노센트 |
| STAT-05-A | 이노센트 | 이노센트 보너스 합산 처리 | P2 | ⬜ P2+ | MVP OUT: "이노센트" 제외 |
| STAT-06-A | UI | 스탯 패널 표시 | P2 | ⬜ P2+ | MVP: HUD HP바로 충분, 풀 패널은 P2 |

### [System_ItemWorld_FloorGen.md](../System/System_ItemWorld_FloorGen.md)

| 기능 ID | 분류 | 기능명 | 우선순위 | 구현 상태 | 근거 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| IWF-01-A | 시스템 | 시드 기반 지층 생성 파이프라인 | P1 | ✅ 구현 완료 | RoomGrid.ts: PRNG 시드 기반, 아이템별 결정적 생성 |
| IWF-02-A | 시스템 | Room Grid 레이아웃 생성 | P1 | ✅ 구현 완료 | RoomGrid.ts: 4×4 고정 그리드, 통합 수직 연결 |
| IWF-03-A | 시스템 | Critical Path 알고리즘 | P1 | ✅ 구현 완료 | RoomGrid.ts: 가중치 경로 (좌30%/우35%/직진35%) |
| IWF-04-A | 시스템 | Chunk 조립 시스템 | P1 | ✅ 구현 완료 | ChunkAssembler.ts: 벽/바닥/문 카빙/플랫폼 생성 |
| IWF-05-A | 시스템 | 적 배치 및 난이도 스케일링 | P1 | ✅ 구현 완료 | StrataConfig.ts + ItemWorldScene: 지층별 적 스탯 스케일링 |
| IWF-07-A | 시스템 | 보스 지층 생성 | P1 | 🔧 부분 구현 | StrataConfig.ts: 보스 스탯 정의, 보스 전용 AI 미구현 |
| IWF-10-A | 시스템 | 멀티플레이 스케일링 | P3 | ⬜ P2+ | MVP OUT: "싱글 플레이" 한정 |

### [System_World_ProcGen.md](../System/System_World_ProcGen.md)

| 기능 ID | 분류 | 기능명 | 우선순위 | 구현 상태 | 근거 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| WPG-01-A | 시스템 | 매크로 구조 로드 | P1 | ✅ 구현 완료 | WorldScene.ts: 6×6 Room Grid 하드코딩 (MVP 충분) |
| WPG-02-A | 시스템 | Room Grid 생성 | P1 | ✅ 구현 완료 | RoomGrid.ts: generateWorldGrid() |
| WPG-03-A | 시스템 | Critical Path 생성 | P1 | ✅ 구현 완료 | RoomGrid.ts: 입구→출구 경로 보장 |
| WPG-04-A | 시스템 | Room Type 배정 | P1 | ✅ 구현 완료 | RoomGrid.ts: Type 0~3 (dead-end/LR/LRD/LRU) |
| WPG-05-A | 시스템 | Chunk 조립 | P1 | ✅ 구현 완료 | ChunkAssembler.ts: assembleRoom(), 플랫폼/장애물 |
| WPG-07-A | 시스템 | 게이트 검증 | P2 | ⬜ P2+ | 능력/스탯 게이트는 Phase 2 범위 |
| WPG-08-A | 시스템 | 시드 시스템 | P1 | ✅ 구현 완료 | PRNG.ts: 시드 기반 결정적 생성, SaveManager 연동 |

---

## 마일스톤 진행 현황

| 마일스톤 | 핵심 | 상태 | 근거 |
| :--- | :--- | :--- | :--- |
| M1.1 엔진 기반 | Vite/TS/PixiJS/60fps | ✅ 완료 | Game.ts: 고정 60fps, PixiJS v8 WebGL, 480×270 해상도 |
| M1.2 캐릭터 물리 | 이동/점프/충돌 (대시는 렐릭) | ✅ 완료 | Player.ts: FSM 8상태, 물리 완성, 코요테/점프버퍼. 대시 코드 완료되었으나 렐릭 시스템 연동 필요 |
| M1.3 전투 시스템 | 콤보/데미지/피격 | ✅ 완료 | 사쿠라이 8기법, 3타 콤보, 적 2종, 아이템 드랍 |
| M1.4 맵 생성 시스템 | Room Grid/Chunk/Spawn | ✅ 완료 | RoomGrid + ChunkAssembler + TilemapRenderer |
| M1.5 미니 아이템계 | 진입/생성/클리어/강화 | 🔧 90% | 통합 지층, EXP/레벨업 동작. 보스 AI만 미완 |
| M1.6 통합 루프 검증 | 전체 순환 테스트 | 🔧 70% | 순환 루프 동작, HUD/인벤/세이브 완료. 밸런스+테스트 잔여 |

---

## Phase 1 완료 기준 (Go/No-Go)

- [x] 캐릭터가 월드를 탐험하며 적을 처치할 수 있다
- [x] 적 처치 시 장비 아이템이 드랍된다
- [x] 드랍된 아이템의 아이템계에 진입할 수 있다
- [x] 아이템계 지층 클리어로 장비가 강해진다
- [x] 강해진 장비로 더 어려운 적을 처치할 수 있다
- [ ] 위 순환을 반복하고 싶은 동기가 발생한다 ← **플레이테스트 필요**

---

## P1 잔여 작업 (미착수 + 부분 구현)

### 📅 미착수 (7개)

| ID | 기능 | 메모 |
| :--- | :--- | :--- |
| CAM-06-A | Boss Lock (보스전 카메라) | 아이템계 보스 전투 구현 시 함께 |
| ENM-02-B | 시야각 (FoV) 판정 | 선택적 — 현재 수평 거리로도 동작 |
| ~~STAT-02-C~~ | ~~MaxMP 산출 공식~~ | DEPRECATED — MP 시스템 삭제 |
| STAT-03-B | 캐릭터 레벨업 경험치 | 아이템 레벨이 주요 성장축 |
| ~~STAT-04-C~~ | ~~DEX → 명중/회피~~ | DEPRECATED — DEX 삭제, 회피는 대시 위치 이탈 |
| ~~STAT-04-D~~ | ~~VIT → MaxHP/DEF~~ | DEPRECATED — VIT 삭제, HP는 레벨 기��� |
| CHR-08-B | 원웨이 플랫폼 하강 | 하방 입력+점프로 플랫폼 통과 |

### 🔧 부분 구현 (8개)

| ID | 기능 | 남은 작업 |
| :--- | :--- | :--- |
| DMG-02-A | 크리티컬 확률 | 고��� 5% + 이노센트 보정 (Phase 2) |
| DMG-02-B | 크리티컬 배율 | 고정 1.5x 배율 적용 |
| ENM-01-B | 화면 밖 비활성화 | 틱 최적화 확인/구현 |
| ENM-02-C | Line of Sight | 장애물 차단 판정 추가 |
| IWF-07-A | 보스 지층 | 보스 전용 AI/패턴 구현 |
| RAR-04-B | 드랍 이펙트 | 레어리티별 파티클 추가 |
| STAT-01-B | 파생 스탯 | RES/회피/명중 산출 |
| STAT-02-A | FinalStat 합산 | Innocent 항 준비 (P2 연동) |
