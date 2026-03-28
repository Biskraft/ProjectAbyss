# Research Document Index — 1줄 요약

> 최근 업데이트: 2026-03-29
> 총 24개 리서치 문서

---

## Disgaea Item World Series (5+1)

| 문서 | 핵심 인사이트 |
|:-----|:-----|
| **Research_Summary** | 20년간 미충족된 실시간 협동 아이템계는 PA가 디스가이아를 초월할 수 있는 최대 기회 |
| **CoreMechanics** | 10층 단위 체크포인트 + 보스층 후 선택적 탈출이 명확한 세션 리듬을 만든다 |
| **InnocentSystem** | 야생/복종 이분법의 즉시 2배 효과가 아이템계 진입 동기 핵심. 슬롯 제약이 빌드 정체성 강제 |
| **GrowthEconomy** | 순수 선형 성장 + 보스 영구 보너스 + 다중 축적층 = 수백 시간 리텐션 |
| **ProceduralGen** | 데드셀 Concept Graph + 스펠렁키 Critical Path 하이브리드가 횡스크롤 아이템계 최적 |
| **UXPatterns** | 세션 종료 신호(레어리티별 층수) 부재는 D5 최대 실패. 멀티 협동이 모든 Bartle 유형 충족 가능 |

## Innocent System Series (5)

| 문서 | 핵심 인사이트 |
|:-----|:-----|
| **Combat_Behavior** | 도주 속도 = 플레이어 70~80%. "따라잡을 수 없지만 불가능하지도 않은" 긴장 |
| **Growth_Economy** | 선형 합산 + 자동 팜 성장 하이브리드 → 아이템계(수집) + 허브(수확) 동기 동시 충족 |
| **Classification_Balance** | 스탯형/파밍형/상태이상형 역할 분담 + 슬롯 제약 → 단일 최적 빌드 방지 |
| **Multiplayer_Social** | 아이템 오너 귀속 + 동행자 보상 → 역할 분담과 공정성 동시 달성 |
| **Narrative_Worldbuilding** | 이노센트 = "아이템의 기억이 응결된 의지". 디스가이아 경쾌함 → PA 고딕 톤 재해석 |

## Game Systems Research (12)

| 문서 | 핵심 인사이트 |
|:-----|:-----|
| **Metroidvania_MapStructure** | 능력 게이트 + 스탯 게이트 이중 레이어 → 메트로베니아 탐험 깊이 확보 |
| **SideScrolling_Combat** | 히트스탑(사쿠라이 공식) + 지수 감쇠 화면흔들림 + 계층 사운드 = 타격감 |
| **OnlineCoop_Netcode** | PvE 협동 → 서버 권위 아키텍처가 레이턴시/안정성 최적 |
| **ProceduralGen_World** | 월드=핸드+절차 혼합, 아이템계=완전 절차 (역할 분리) |
| **EndgameLoop_Economy** | 짧은 루프(30층) + 명확한 종료 신호 > 무한 콘텐츠 (장기 리텐션) |
| **HubSpace_Social** | 기능 분산 = 인지 부하 증가. 단일 통합 허브가 UX 마찰 최소화 |
| **Equipment_DropRate** | 최상위 거래 제한은 파밍 동기 보존, 과도하면 사교 보상 훼손 |
| **BossDesign_SideScrolling** | 6대분류×23소분류 공격 패턴 분류, 4-Layer 모듈러 보스 합성, 등급별 텔레그래프 배율 |
| **LevelDesign_ProgressionShape** | 16개 공간 패턴(4카테고리) + 태그 시스템 + 페이싱 시퀀싱 규칙 5종 |
| **ItemWorld_DepthReward_RiskBalance** | 지수 HP + 구간별 데미지 스케일링, 손실회피(λ=2.25) 보정 기대값, 톱니파 긴장곡선 |
| **ItemWorld_EntryTransition** | 아이템 다이브 연출 시퀀스, 14종 픽셀아트 전환 기법(GLSL), 레어리티별 차별화 |
| **ItemWorld_RecursiveEntry** | 장르 최초 중첩 재귀 메커닉 확인, 7가지 설계 원칙, UX 브레드크럼/순차복귀 설계 |
| **SkillSystem_ActionRPG** | 7종 게임 분석, "무기별 분기+공용 트리" 하이브리드 구조, 4슬롯 깊이 확보 6방안 |

---

## 리서치 커버리지 현황

### 리서치 충분 → 설계 문서 작성 대기

| 시스템 | 리서치 문서 | 설계 문서 (미작성) |
|:------|:----------|:----------------|
| 아이템계 보스 | BossDesign (1,483줄) | SYS-IW-03 |
| 스킬트리 | SkillSystem (신규) | SYS-LVL-03 |
| 재귀적 진입 | RecursiveEntry + DepthReward (2개) | SYS-IW-04 |
| 이노센트 팜 | Innocent 시리즈 5개 | SYS-INC-02 |
| 경제 철학 | EndgameLoop + Equipment + DropRate (3개) | D-07 |

### 리서치 부족 → 추가 리서치 필요

| 영역 | 기존 리서치 | 필요 |
|:-----|:----------|:-----|
| UI/UX 패턴 | 없음 | HUD, 인벤토리, 맵 UI 레퍼런스 |
| 넷코드 상세 | OnlineCoop 1개 (개요) | 클라이언트 예측, 롤백 등 Phase 3용 |
| 허브 상세 | HubSpace 1개 (개요) | 시설, NPC, 상점 구체화 Phase 2용 |
