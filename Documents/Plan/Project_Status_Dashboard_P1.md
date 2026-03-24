# Project Abyss P1 현황판 (프로토타입)

> **Last Sync:** 2026-03-24 (2차 동기화)
> **범위:** Phase 1 프로토타입 대상 기능

## 요약

| 문서 (Source) | 기능 수 | 진행률 |
| :--- | :--- | :--- |
| **System_3C_Camera.md** | 6개 | ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ (0%) |
| **System_3C_Character.md** | 12개 | ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ (0%) |
| **System_3C_Control.md** | 9개 | ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ (0%) |
| **System_Combat_Action.md** | 8개 | ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ (0%) |
| **System_Combat_Damage.md** | 11개 | ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ (0%) |
| **System_Combat_Weapons.md** | 3개 | ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ (0%) |
| **System_Enemy_AI.md** | 11개 | ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ (0%) |
| **System_Equipment_Rarity.md** | 8개 | ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ (0%) |
| **System_Equipment_Slots.md** | 6개 | ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ (0%) |
| **System_Growth_Stats.md** | 15개 | ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ (0%) |
| **System_ItemWorld_FloorGen.md** | 7개 | ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ (0%) |
| **System_World_ProcGen.md** | 7개 | ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ (0%) |
| **Total** | **103개** | **0%** |

## 상세

### [System_3C_Camera.md](../System/System_3C_Camera.md)

| 기능 ID    | 분류   | 기능명 (Feature Name)             | 우선순위 | 구현 상태   | 비고 (Notes)              |
| :--- | :--- | :--- | :---: | :--- | :--- |
| CAM-01-A   | 시스템 | Follow Mode (Lerp 추적)          |    P1    | ⬜ 제작 필요 | 기본 탐험 카메라           |
| CAM-02-A   | 시스템 | Dead Zone 처리                    |    P1    | ⬜ 제작 필요 | Follow Mode 하위 기능      |
| CAM-03-A   | 시스템 | Look Ahead (이동 방향 선행)       |    P1    | ⬜ 제작 필요 | 할로우 나이트 참조         |
| CAM-05-A   | 시스템 | Room Transition (방 전환)         |    P1    | ⬜ 제작 필요 | 월하의 야상곡 참조         |
| CAM-06-A   | 시스템 | Boss Lock (보스전 고정)           |    P1    | ⬜ 제작 필요 | 보스 아레나 전용           |
| CAM-09-A   | 시스템 | Camera Bounds (맵 경계 제한)      |    P1    | ⬜ 제작 필요 | AABB 클램프               |

### [System_3C_Character.md](../System/System_3C_Character.md)

| 기능 ID    | 분류   | 기능명 (Feature Name)              | 우선순위 | 구현 상태    | 비고 (Notes)              |
| :--- | :--- | :--- | :---: | :--- | :--- |
| CHR-01-A   | 시스템 | 기본 이동 (가속/감속)              |    P1    | 📅 대기      | PixiJS Ticker 기반        |
| CHR-01-B   | 시스템 | 고정 높이 점프                     |    P1    | 📅 대기      | 모바일 터치 최적화        |
| CHR-01-C   | 시스템 | Coyote Time / Jump Buffer         |    P1    | 📅 대기      | 관대한 허용 시간 (모바일) |
| CHR-02-D   | 시스템 | 대시 (Dash)                        |    P1    | 📅 대기      | i-frame 회피, 쿨다운 2초  |
| CHR-03-A   | 시스템 | 벽 슬라이드 (Wall Slide)           |    P1    | 📅 대기      | 능력 해금 후 사용 가능    |
| CHR-03-B   | 시스템 | 벽 점프 (Wall Jump)                |    P1    | 📅 대기      | 능력 해금 후 사용 가능    |
| CHR-05-A   | 시스템 | 히트박스/허트박스 시스템            |    P1    | 📅 대기      | AABB 기반, 넓은 히트박스  |
| CHR-05-B   | 시스템 | 피격/넉백 처리                     |    P1    | 📅 대기      | 히트스턴 + 넉백 벡터      |
| CHR-07-A   | 시스템 | 멀티플레이 물리 동기화             |    P1    | 📅 대기      | 서버 권위 모델            |
| CHR-08-A   | 시스템 | 타일맵 충돌 / 원웨이 플랫폼       |    P1    | 📅 대기      | 16px 그리드 기반          |
| CHR-09-A   | 시스템 | 스킬 슬롯 시스템 (SkillCast)       |    P1    | 📅 대기      | 스킬 버튼 기반 직관 조작  |
| CHR-09-B   | 시스템 | 자동 조준 보조 (Auto-Aim Assist)   |    P1    | 📅 대기      | 모바일 가상 패드 지원     |

### [System_3C_Control.md](../System/System_3C_Control.md)

| 기능 ID    | 분류       | 기능명 (Feature Name)                | 우선순위 | 구현 상태    | 비고 (Notes)                  |
| :--- | :--- | :--- | :---: | :--- | :--- |
| CTRL-01-A  | 입력       | 키보드 입력 처리 프레임워크           |    P1    | 📅 대기      | 웹 KeyboardEvent 기반          |
| CTRL-01-C  | 입력       | 모바일 가상 패드 입력 프레임워크      |    P1    | 📅 대기      | Touch API 기반                 |
| CTRL-02-A  | 스킬       | 스킬 슬롯 시스템 (4슬롯)             |    P1    | 📅 대기      | 장착식, 허브에서 변경           |
| CTRL-02-B  | 스킬       | 스킬 쿨다운 관리 시스템              |    P1    | 📅 대기      | 원형 게이지 UI 포함             |
| CTRL-02-C  | 스킬       | 자동 조준 시스템                     |    P1    | 📅 대기      | 사거리 내 최근접 적 타겟팅      |
| CTRL-03-A  | 기본 조작  | 기본 공격 자동 콤보 (3타)             |    P1    | 📅 대기      | 연타 시 자동 연결               |
| CTRL-03-B  | 기본 조작  | 점프 (고정 높이)                     |    P1    | 📅 대기      | 가변 높이 제거                  |
| CTRL-04-A  | 가상 패드  | 가상 패드 레이아웃 렌더링             |    P1    | 📅 대기      | 좌측 D-Pad + 우측 버튼          |
| CTRL-06-A  | 예외       | 포커스 해제 시 입력 초기화            |    P1    | 📅 대기      | visibilitychange 이벤트        |

### [System_Combat_Action.md](../System/System_Combat_Action.md)

| 기능 ID    | 분류       | 기능명 (Feature Name)                | 우선순위 | 구현 상태    | 비고 (Notes)                  |
| :--- | :--- | :--- | :---: | :--- | :--- |
| CMB-01-A   | 기본 공격  | 자동 콤보 시스템 (3타)               |    P1    | 📅 대기      | 무기별 모션 차이               |
| CMB-01-B   | 기본 공격  | 공중 공격 (Air Attack)               |    P1    | 📅 대기      | 전방 + 하방 공격               |
| CMB-02-A   | 스킬       | 스킬 시전 프레임워크                 |    P1    | 📅 대기      | 4슬롯 + MP 소비 + 쿨다운 + 자동 조준 |
| CMB-02-B   | 스킬       | 스킬 카테고리별 발동 규칙            |    P1    | 📅 대기      | 근접/원거리/범위/버프          |
| CMB-04-A   | 피격       | 피격 경직 (Hitstun) 시스템           |    P1    | 📅 대기      | 경직 + 넉백 + 무적             |
| CMB-05-A   | 타격감     | 히트스탑 (Hitstop) 시스템            |    P1    | 📅 대기      | 2~4프레임 정지                 |
| CMB-05-B   | 타격감     | 넉백 물리 시스템                     |    P1    | 📅 대기      | 무게 기반 넉백 벡터            |
| CMB-06-A   | 전투 흐름  | 전투 상태 관리 (Combat State)        |    P1    | 📅 대기      | In-Combat / Out-of-Combat     |

### [System_Combat_Damage.md](../System/System_Combat_Damage.md)

| 기능 ID    | 분류       | 기능명 (Feature Name)                | 우선순위 | 구현 상태    | 비고 (Notes)                  |
| :--- | :--- | :--- | :---: | :--- | :--- |
| DMG-01-A   | 공식       | 기본 데미지 공식                     |    P1    | 📅 대기      | ATK/DEF 기반                   |
| DMG-01-B   | 공식       | 스킬 데미지 공식                     |    P1    | 📅 대기      | 스킬 배율 적용                 |
| DMG-01-C   | 공식       | 마법 데미지 공식                     |    P1    | 📅 대기      | INT/RES 기반                   |
| DMG-02-A   | 크리티컬   | 크리티컬 확률 시스템                 |    P1    | 📅 대기      | LCK 기반                       |
| DMG-02-B   | 크리티컬   | 크리티컬 배율 시스템                 |    P1    | 📅 대기      | 기본 1.5x + LCK 보너스        |
| DMG-03-A   | 원소       | 원소 상성 배율                       |    P1    | 📅 대기      | 6원소 상성표                   |
| DMG-04-A   | 방어       | 물리 방어력 감산 공식                |    P1    | 📅 대기      | DEF 기반                       |
| DMG-04-B   | 방어       | 마법 저항력 감산 공식                |    P1    | 📅 대기      | RES 기반                       |
| DMG-05-A   | 스케일링   | 아이템계 층수별 데미지 스케일링      |    P1    | 📅 대기      | 층수 보정 계수                 |
| DMG-06-A   | UI         | 데미지 넘버 표시                     |    P1    | 📅 대기      | 색상/크기 차별화               |
| DMG-07-A   | 멀티       | 서버 데미지 검증                     |    P1    | 📅 대기      | 클라이언트 예측 + 서버 권위    |

### [System_Combat_Weapons.md](../System/System_Combat_Weapons.md)

| 기능 ID    | 분류         | 기능명 (Feature Name)                    | 우선순위 | 구현 상태 | 비고 (Notes)                                 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| WPN-01-A   | 무기 체계    | 무기 카테고리 8종 정의                   |    P1    | 대기      | 검/창/도끼/채찍/지팡이/너클/활/대검           |
| WPN-01-B   | 무기 체계    | 무기 차별화 3축 (사거리/속도/범위)       |    P1    | 대기      | Design_Combat_Philosophy.md D-09-E 연동       |
| WPN-03-B   | 무기 교체    | 전투 중 무기 교체 불가 (MVP)             |    P1    | 대기      | Phase 2에서 교체 허용으로 변경 예정            |

### [System_Enemy_AI.md](../System/System_Enemy_AI.md)

| 기능 ID | 분류 | 기능명 (Feature Name) | 우선순위 | 구현 상태 | 비고 (Notes) |
| :--- | :--- | :--- | :---: | :--- | :--- |
| ENM-01-A | 상태 머신 | 적 AI 기본 상태 머신 (7단계) | P1 | 대기 | Idle/Patrol/Detect/Chase/Attack/Cooldown/Retreat |
| ENM-01-B | 상태 머신 | 화면 밖 비활성화 처리 | P1 | 대기 | 공정성 규칙 준수 |
| ENM-02-A | 감지 | 원형 감지 반경 시스템 | P1 | 대기 | 적 유형별 반경 차이 |
| ENM-02-B | 감지 | 시야각 (Field of View) 판정 | P1 | 대기 | 전방 기준 각도 |
| ENM-02-C | 감지 | Line of Sight 판정 | P1 | 대기 | 장애물 차단 여부 |
| ENM-04-A | 적 개체 | Skeleton (근접형) AI | P1 | 대기 | 감지-접근-공격-대기 |
| ENM-04-B | 적 개체 | Ghost (원거리형) AI | P1 | 대기 | 감지-거리유지-사격-회피 |
| ENM-05-A | 스폰 | 방 진입 시 스폰 포인트 활성화 | P1 | 대기 | 방 진입 트리거 |
| ENM-05-B | 사망 | 사망 이펙트-드랍-경험치 순서 처리 | P1 | 대기 | 소멸 이펙트 포함 |
| ENM-06-A | 스케일링 | 아이템계 층수별 스탯 스케일링 | P1 | 대기 | HP/ATK/DEF 각각 계수 |
| ENM-06-B | 어그로 | 단일 타겟 어그로 시스템 | P1 | 대기 | 최근 피해 플레이어 추적 |

### [System_Equipment_Rarity.md](../System/System_Equipment_Rarity.md)

| 기능 ID  | 분류       | 기능명 (Feature Name)                  | 우선순위 | 구현 상태 | 비고 (Notes)                          |
| :--- | :--- | :--- | :---: | :--- | :--- |
| RAR-01-A | 등급       | 5등급 레어리티 정의                    |    P1    | 대기      | Common~Mythic 데이터 구조 정의        |
| RAR-01-B | 등급       | 레어리티별 스탯 배율 적용              |    P1    | 대기      | EquipStat * Rarity_Multiplier         |
| RAR-02-A | 아이템계   | 레어리티별 아이템계 층수 정의          |    P1    | 대기      | MVP: 3층 고정, 데이터는 전체 정의     |
| RAR-02-B | 아이템계   | 아이템계 진입 규칙 (레어리티 연동)     |    P1    | 대기      | 층수 상한 및 보스 배치 연동           |
| RAR-03-A | 이노센트   | 레어리티별 이노센트 슬롯 수 정의       |    P1    | 대기      | Phase 2 이노센트 시스템 연동          |
| RAR-04-A | 드랍       | 레어리티별 드랍 확률 가중치 정의       |    P1    | 대기      | 드랍 풀 확률 계산 기준                |
| RAR-04-B | 드랍       | 드랍 이펙트 (레어리티별 시각 효과)     |    P1    | 대기      | 색상/파티클 차별화                    |
| RAR-05-A | 시각       | 아이템 이름 색상 (레어리티별)          |    P1    | 대기      | UI 컬러 코드 적용                     |

### [System_Equipment_Slots.md](../System/System_Equipment_Slots.md)

| 기능 ID  | 분류     | 기능명 (Feature Name)               | 우선순위 | 구현 상태 | 비고 (Notes)                        |
| :--- | :--- | :--- | :---: | :--- | :--- |
| EQP-01-A | 슬롯     | 무기 슬롯 (MVP: 검 1종)             |    P1    | 대기      | Phase 1 MVP 범위                    |
| EQP-02-A | 착용     | 아이템 착용 규칙                    |    P1    | 대기      | 타입 일치 검증                      |
| EQP-02-B | 착용     | 아이템 해제 규칙                    |    P1    | 대기      | 빈 슬롯 복귀                        |
| EQP-03-A | 스탯합산 | 장비 스탯 → 캐릭터 스탯 합산        |    P1    | 대기      | FinalStat = Base + Equip + Innocent |
| EQP-04-A | 데이터   | 아이템 데이터 구조 정의             |    P1    | 대기      | id/name/type/rarity/level/stats     |
| EQP-07-A | UI       | 장비창 HUD                          |    P1    | 대기      | 슬롯 UI 표시                        |

### [System_Growth_Stats.md](../System/System_Growth_Stats.md)

| 기능 ID    | 분류       | 기능명 (Feature Name)                   | 우선순위 | 구현 상태 | 비고 (Notes)                       |
| :--- | :--- | :--- | :---: | :--- | :--- |
| STAT-01-A  | 스탯 정의  | 6대 기본 스탯 시스템                    |    P1    | 📅 대기   | STR/INT/DEX/VIT/SPD/LCK            |
| STAT-01-B  | 스탯 정의  | 2차 파생 스탯 (ATK/DEF/RES 등)          |    P1    | 📅 대기   | 1차 스탯에서 산출                  |
| STAT-02-A  | 공식       | FinalStat 합산 공식                     |    P1    | 📅 대기   | Base + Equip + Innocent            |
| STAT-02-B  | 공식       | MaxHP 산출 공식                         |    P1    | 📅 대기   | VIT 기반                           |
| STAT-02-C  | 공식       | MaxMP 산출 공식                         |    P1    | 📅 대기   | INT + 레벨 기반                    |
| STAT-03-A  | 성장 테이블| Lv 1-10 기본 스탯 성장 곡선             |    P1    | 📅 대기   | MVP 레벨 캡 = 10                   |
| STAT-03-B  | 성장 테이블| 레벨업 경험치 요구량 테이블             |    P1    | 📅 대기   | Sheets/Content_System_LevelExp.csv |
| STAT-04-A  | 전투 연동  | STR → ATK 변환                          |    P1    | 📅 대기   | System_Combat_Damage.md 연동       |
| STAT-04-B  | 전투 연동  | INT → 마법 ATK 및 MaxMP 연동            |    P1    | 📅 대기   | System_Combat_Damage.md 연동       |
| STAT-04-C  | 전투 연동  | DEX → 명중/회피/크리티컬 연동           |    P1    | 📅 대기   | System_Combat_Damage.md 연동       |
| STAT-04-D  | 전투 연동  | VIT → MaxHP 및 DEF 연동                 |    P1    | 📅 대기   | System_Combat_Damage.md 연동       |
| STAT-04-E  | 전투 연동  | SPD → 이동/공격 속도 연동               |    P1    | 📅 대기   | System_3C_Character.md 연동        |
| STAT-04-F  | 전투 연동  | LCK → 드랍률/크리티컬 보조 연동         |    P1    | 📅 대기   | System_Combat_Damage.md 연동       |
| STAT-05-A  | 이노센트   | 이노센트 보너스 합산 처리               |    P1    | 📅 대기   | System_Innocent_Core.md 연동       |
| STAT-06-A  | UI         | 스탯 패널 표시                          |    P1    | 📅 대기   | Documents/UI/ 연동                 |

### [System_ItemWorld_FloorGen.md](../System/System_ItemWorld_FloorGen.md)

| 기능 ID       | 분류   | 기능명 (Feature Name)              | 우선순위 | 구현 상태    | 비고 (Notes)                |
| :--- | :--- | :--- | :---: | :--- | :--- |
| IWF-01-A      | 시스템 | 시드 기반 층 생성 파이프라인       |    P1    | ⬜ 제작 필요 | 핵심 생성 로직              |
| IWF-02-A      | 시스템 | Room Grid 레이아웃 생성            |    P1    | ⬜ 제작 필요 | 3x3 ~ 5x5                  |
| IWF-03-A      | 시스템 | Critical Path 알고리즘             |    P1    | ⬜ 제작 필요 | 입구 → 출구 경로 보장       |
| IWF-04-A      | 시스템 | Chunk 조립 시스템                  |    P1    | ⬜ 제작 필요 | 레어리티별 Chunk 풀         |
| IWF-05-A      | 시스템 | 적 배치 및 난이도 스케일링         |    P1    | ⬜ 제작 필요 | 층수 × 배율                 |
| IWF-07-A      | 시스템 | 보스 층 생성                       |    P1    | ⬜ 제작 필요 | 10층 단위                   |
| IWF-10-A      | 시스템 | 멀티플레이 스케일링                |    P1    | ⬜ 제작 필요 | 1~4인 체력 보정             |

### [System_World_ProcGen.md](../System/System_World_ProcGen.md)

| 기능 ID      | 분류   | 기능명 (Feature Name)              | 우선순위 | 구현 상태    | 비고 (Notes)                  |
| :--- | :--- | :--- | :---: | :--- | :--- |
| WPG-01-A     | 시스템 | 매크로 구조 로드                   |    P1    | ⬜ 제작 필요 | 구역 연결 그래프 로드          |
| WPG-02-A     | 시스템 | Room Grid 생성                     |    P1    | ⬜ 제작 필요 | 구역별 3x3~5x5 그리드         |
| WPG-03-A     | 시스템 | Critical Path 생성                 |    P1    | ⬜ 제작 필요 | Always Winnable 보장           |
| WPG-04-A     | 시스템 | Room Type 배정                     |    P1    | ⬜ 제작 필요 | Type 0~3 분류                  |
| WPG-05-A     | 시스템 | Chunk 조립                         |    P1    | ⬜ 제작 필요 | 바이옴별 Chunk 풀              |
| WPG-07-A     | 시스템 | 게이트 검증                        |    P1    | ⬜ 제작 필요 | 능력/스탯 게이트 접근 가능성   |
| WPG-08-A     | 시스템 | 시드 시스템                        |    P1    | ⬜ 제작 필요 | 서버 고정 시드, 시즌 리셋      |
