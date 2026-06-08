# ECHORIS 개발 보고서 — 2026년 5월

> 작성일: 2026-06-08 · 대상 기간: 2026-05-01 ~ 2026-05-31
> 근거: git 커밋 112건, dev 위키 일지 13건, 의사결정 로그(DEC), 디자인 문서
> 단계: 버티컬 슬라이스 → 본격 제작 전환기 (Phase 1 완료 → Phase 2 진입)

---

## 1. 한눈에 보기

5월은 **"플레이 가능한 데모 + 투자/퍼블리싱 준비"** 두 축을 동시에 밀어붙인 달이다. 커밋 112건으로 월간 최대 산출량을 기록했고, 게임 시스템(전투·유체·환경)과 사업 자산(피치덱·Steam·웹사이트)이 나란히 진전했다. 후반부에 내러티브 전면 재설정(NarrativeWorldReset)과 성능 최적화 정리가 들어가며 6월 본격 제작의 토대를 깔았다.

| 지표 | 값 |
| :--- | :--- |
| 커밋 수 | 112건 |
| 활동 일수(일지 기준) | 13일 + 다수 |
| 주요 마일스톤 | 7건 (아래 §3) |
| 신규 의사결정(DEC) | DEC-036·037·039·040·041·042·045·046 계열 |
| 단계 전환 | Phase 1(프로토타입/슬라이스) 완료 → Phase 2(알파) 진입 |

---

## 2. 주차별 흐름

### 2-1. 1주차 (05-03 ~ 05-09) — 핵심 시스템 + 오디오 + i18n
- **아이템계 위상 확정:** DEC-039 Trapdoor 연속 다이브(수직 다이브 그래프) + RoomGraph 아키타입 분리 + Monster Bestiary 도입.
- **적/보스 골격:** Skeleton·Slime·Boss 스폰, Enemy 베이스 보강, FpsCounter HUD.
- **인게임 피드백 채널:** F키 피드백 채널 + InputManager textarea 우회.
- **오디오 파이프라인 확립(DEC-040):** @pixi/sound 도입, 오디오 버스, BGM 시스템(world_main intro/loop/outro) + BgmController, 이동 SFX(발소리·점프·대시·착지).
- **i18n KR/EN 로컬라이제이션 완성(LOC-01..11):** 코어 UI 전수 마이그레이션, KO PIXI.Text 블러/텍스트 메트릭 보정, wordWrap 패스. **Phase 2 close.** 게임의 다국어 토대 완비.
- **빌더 레그 아트 파이프라인:** ASE 슬라이스 기반 LegRig 아틀라스(Graphics 렌더러 은퇴), 미러/풋 회전 등 다수 폴리시.

### 2-2. 2주차 (05-10 ~ 05-17) — 전투 FX + 유체/화학 환경 시스템
- **전투 비주얼:** fx_slash 아틀라스 + Player WeaponFx 통합, GoldenMonster, GamepadRumble, Ghost 몬스터, door/LockedDoor 시스템.
- **튜토리얼:** jump/attack/dash/drop-through 힌트 + MODERN 기본 프리셋.
- **유체 시스템 V1→V2:** Dynamic fluid V1 → SteamPuff/TileMutatorRenderer/Burnable/TileHazards/FluidSystem 통합.
- **Hades 차용:** Ego Shard Cast(캐스트) + FluidResidue + Hades Boon 역기획서.
- **던질 수 있는 컨테이너:** ThrowableContainer 시스템 + crate/PigBox 아틀라스.
- **화학 반응 시스템:** 원소/화염 VFX + 화학 반응 GDD + FluidSpawner(+427줄) + 아이템계 테마/플루이드 매핑.
- **데모 엔딩:** Demo End Phase C EndingScene.

### 2-3. 3주차 (05-18 ~ 05-24) — 사업 자산 + 페르소나 보호 + 인벤토리 재설계
- **Phase 2 R&D 문서 + AcquireOverlay** 신규, Trapdoor/UpdraftSystem 보강.
- **플랫폼 페르소나 보호:** 모바일 감지 + 안내 오버레이(PC/콘솔 타깃 보호), iPad 선별 허용, analytics TEL-19 secret_wall_break 이벤트.
- **투자/퍼블리싱 자산:** Pitch Deck + One-Pager(HTML/PDF), ECHORIS 로고 SVG 통합, Pitch/Website/Presentation 정렬, 한글 피치덱 번역, 폰트 Chakra Petch 통일.
- **안정성:** Fullscreen 핸들링, BoundsGuard 신규(카메라/씬 안전 클램프), carrier velocity 상속 + LdtkWorldScene 리팩토링.
- **인벤토리 3칼럼 재설계 + DEC-046 Memory Recovery 패러다임 + 마케팅 칸반 시스템.**

### 2-4. 4주차 (05-25 ~ 05-31) — Steam·성능·내러티브 재설정
- **퍼포먼스:** 60FPS 최적화 + ItemWorldTemplatePool, 저성능 디바이스/iPad 부팅 프로파일 → 이후 reducedVisualCost 분기 **완전 제거**(복잡도 회수).
- **Steam 페이지 승인** + 웹사이트 위시리스트 CTA·링크 + 위시리스트 추적 시스템. (사업 마일스톤)
- **콘텐츠:** 한정 흥(아키타입) + 온보딩 방법론 리서치, Anvil 배치 시스템, DEC-023 LoreWeapons 폐기 아카이브, 아이템 내러티브 샘플(EN 포함).
- **물리 재작성:** Player 점프를 Celeste/TowerFall 정수 픽셀 스윕 충돌 모델로 전환(05-28).
- **패키징:** Windows 오프라인 데모 Electron 패키징(build:offline / package:win).
- **NarrativeWorldReset(05-28/29):** 내러티브 전면 재설정 + WeatherSystem + Wiki 복원. 기존 내러티브 정의를 archive로 분리, 차기 라운드 재정의 체제로 전환.
- **마감:** Settings/Options + ItemWorld Liminal 연출 + Art Direction 문서, Weapon3DPreview(Three.js 저해상 픽셀) 프로토타입.

---

## 3. 주요 마일스톤

1. **i18n KR/EN 로컬라이제이션 완성** (05-08~09) — 코어 UI 전수, KO 텍스트 렌더 보정까지. 빌드타임 i18n 검증(validate V5/V6) 도입.
2. **오디오 파이프라인 확립(DEC-040)** — BGM(intro/loop/outro) + 이동/전투 SFX + 오디오 버스.
3. **유체·화학 환경 시스템(V1→V2 + 반응)** (05-12~17) — 게임플레이 깊이의 핵심 신규 축.
4. **Steam 페이지 승인 + 위시리스트 퍼널 가동** (05-26) — 사업/마케팅 전환점.
5. **투자 자산 세트 완성** (05-20~24) — 피치덱(EN/KO) + One-Pager + 웹사이트 + 로고.
6. **NarrativeWorldReset** (05-28/29) — 세계관·톤의 전략적 재정렬, 6월 캐논 재정의의 출발점.
7. **성능 프로파일 정리 + Player 물리 재작성** (05-25~28) — 60FPS 목표 + Celeste 스윕 충돌.

---

## 4. 의사결정 (DEC) 요약

| ID | 제목 | 비고 |
| :--- | :--- | :--- |
| DEC-039 | 아이템계 연속 다이브(수직 다이브 그래프) | Trapdoor 하강, Grid 폐기 |
| DEC-040 | 오디오 파이프라인 — @pixi/sound + AI 자산 | 무음 페이드 정책 |
| DEC-041 | Fluid Crest Foam — 폭포 포말 시각 | 유체 비주얼 |
| DEC-042 | 공식 런타임 충돌 범위 | 충돌 스코프 정의 |
| DEC-045 | 몬스터 로스터 수량 스펙 | 아키타입별 고유 디자인 수 |
| DEC-046 | 사적 기억 회복(Memory Recovery) 패러다임 | 인벤토리 재설계 동반 |

> DEC-043·044·047 등은 5월 말 NarrativeWorldReset에서 촉발되었으나 문서 확정은 6월 초. 본 보고서는 5월 실행분 기준.

---

## 5. 평가 · 6월 이월

### 잘된 것
- 시스템·아트·오디오·사업 자산이 **병렬로** 진전 — 데모와 퍼블리싱 준비를 동시에 충족.
- 유체/화학 시스템으로 게임플레이 차별화 축 확보.
- Steam 승인·위시리스트 퍼널로 출시 트랙 진입.

### 부채 · 리스크
- 후반 reducedVisualCost를 도입했다 다시 전면 제거 — 성능 분기 설계에 시행착오 비용 발생.
- NarrativeWorldReset로 내러티브 캐논이 일시 공백(차기 라운드 재정의 대기). 6월에 메우는 작업 필요.
- 커밋 다수가 chore/폴리시 — 코어 루프(탐험→아이템→아이템계→강화→재탐험) 완결 검증은 6월 과제로 이월.

### 6월 우선순위(이월)
- 코어 루프 한 바퀴 완결 + 치명적 버그 트리아지(루프 차단 버그 우선).
- 내러티브 캐논 재정의(DEC-047 톤=고독 기반) 본격화.
- 적 아키타입 로스터 구현 진입(스펙 확정분).
- 플레이테스트/피드백 루프 재가동.

---

> 본 보고서는 git·dev 위키 실측 기록 기반이며, 추정이 포함된 항목은 명시했다.
