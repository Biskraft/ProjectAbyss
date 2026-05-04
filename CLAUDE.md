# ECHORIS — 프로젝트

> This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

ECHORIS는 웹 기반 횡스크롤 온라인 액션 RPG (메트로베니아 + 야리코미)이다. Projectbyss저장소는 게임 기획 리서치, 레퍼런스 분석, 프로토타입을 관리하는 중앙 저장소이다.

- **장르:** 웹 기반 횡스크롤 온라인 액션 RPG
- **플랫폼:** 웹 브라우저 (PC)
- **타겟:** 탐험과 파밍을 즐기는 코어~미드코어 유저
- **레퍼런스:** BLAME!/메이드 인 어비스(세계관/스케일) + 디스가이아(아이템계/야리코미) + 월하의 야상곡(탐험/전투) + 스펠렁키(절차적 생성)

### 한 줄 요약

> "거대 빌더가 누비는 수직 구조물을 탐험하고, 말을 거는 무기 속으로 들어가 끝없이 강화하며, 다른 플레이어와 함께 싸우는 횡스크롤 온라인 액션 RPG"

### 3대 핵심 판타지 (Core Fantasy)

1. **탐험가** — 능력을 하나씩 얻으며 갈 수 없던 곳을 뚫어 세계의 비밀을 밝혀낸다
2. **장인** — 아이템 속에 들어가 잊혀진 기억 단편을 회상시키고, 세상에 하나뿐인 최강 장비를 만든다
3. **모험가** — 친구와 함께 끝없는 심연의 던전에 도전하고, 위기를 함께 극복한다

### 스파이크 (Spike Feature)

> **"아이템에 들어가면, 그 안에 살아있는 세계가 있다"**
> 무기는 Ego를 가지고 에르다에게 말을 건다. 에르다는 과묵하지만, 검이 온보딩과 내러티브를 전달한다.
> 모든 설계 결정은 이 스파이크를 강화하는 방향이어야 한다. 스파이크를 희석시키는 시스템은 삭제한다.

### 핵심 설계 원칙

- **2-Space 분리 모델:** 월드(탐험 + 세이브포인트/상점) / 아이템계(협동 파밍)
- **순환 구조:** 월드 탐험 → 아이템 획득 → 아이템계 진입 → 장비 강화 → 스탯 게이트 해금 → 새 층위 탐험
- **스탯 게이트 + 능력 게이트:** 장비 스탯과 능력(이단점프, 변신 등) 이중 게이트로 탐험 깊이 확보
- **스파이크 검증:** 새 시스템 추가 시 "이것이 아이템계 경험을 강화하는가?" 통과 필수

---

## 폴더 구조

```
VibeCoding/
├── CLAUDE.md                    # 이 파일
├── VibeCoding.code-workspace    # VS Code 워크스페이스
├── Documents/                   # GDD 문서 (System_, Design_, UI_, Content_ 접두사)
│   ├── Terms/                   # 메타 문서 (비전, 작성 규칙, 용어집, 인덱스)
│   ├── System/                  # 시스템 메커닉 문서 (5단계 구조 필수)
│   ├── Design/                  # 설계 원칙/철학 문서
│   ├── UI/                      # UI/HUD 명세 문서
│   └── Content/                 # 콘텐츠 목록 문서
├── Sheets/                      # CSV 데이터 시트 (SSoT)
└── Reference/                   # 레퍼런스 및 리서치 자료
    ├── 게임 기획 개요.md          # 핵심 기획서 (ECHORIS 전체 설계)
    ├── WIKI_INDEX.md             # 위키 MD 파일 주제별 인덱스
    ├── 디스가이아 시스템 분석.md    # 위키 기반 디스가이아 시스템 분석
    ├── 캐슬바니아 시스템 분석.md    # 위키 기반 캐슬바니아 시스템 분석
    ├── designdocs_인사이트.md      # Design Doc 채널 인사이트 정리
    ├── extracredit_인사이트.md     # Extra Credits 인사이트 정리
    ├── jonastyroller_인사이트.md   # Jonas Tyroller 인사이트 정리
    ├── noclip_인사이트.md          # Noclip 인사이트 정리
    ├── sakurai_인사이트.md         # 사쿠라이 마사히로 인사이트 정리
    ├── timcain_인사이트.md         # Tim Cain 인사이트 정리
    ├── castlevania-wiki-md/       # 캐슬바니아 위키 MD (7,434개 파일)
    ├── disgaea-wiki-md/           # 디스가이아 위키 MD (1,585개 파일)
    ├── gmtk/                      # GMTK 유튜브 트랜스크립트
    ├── designdocs/                # Design Doc 유튜브 트랜스크립트
    ├── gdc/                       # GDC 강연 자료
    ├── extracredit/               # Extra Credits 트랜스크립트
    ├── jonastyroller/             # Jonas Tyroller 트랜스크립트
    ├── noclip/                    # Noclip 다큐멘터리 트랜스크립트
    ├── sakurai/                   # 사쿠라이 마사히로 트랜스크립트
    ├── timcain/                   # Tim Cain 트랜스크립트
    ├── Disgaea_ItemWorld_Reverse_GDD.md          # 디스가이아 아이템계 역기획서
    ├── Spelunky-LevelGeneration-ReverseGDD.md    # 스펠렁키 레벨 생성 역기획서
    ├── DeadCells-LevelGeneration-ReverseGDD.md   # 데드셀 레벨 생성 역기획서
    ├── Metroidvania Game Design Deep Dive.md     # 메트로베니아 디자인 심층 분석
    ├── wiki_to_md.py              # 위키 XML → MD 변환 스크립트
    └── wiki_to_md_robust.py       # 위키 변환 스크립트 (안정화 버전)
```

---

## 핵심 참고 문서

작업 전 반드시 확인해야 할 문서:

| 문서                          | 경로                                                 | 용도                                                |
| :---------------------------- | :--------------------------------------------------- | :-------------------------------------------------- |
| 게임 기획 개요                | `Reference/게임 기획 개요.md`                      | 전체 게임 설계서 (2-Space, 순환 구조, 기술 스택 등) |
| 위키 인덱스                   | `Reference/WIKI_INDEX.md`                          | 디스가이아/캐슬바니아 위키 주제별 정리              |
| 디스가이아 시스템 분석        | `Reference/디스가이아 시스템 분석.md`              | 아이템계, 이노센트, 스탯 등 핵심 시스템             |
| 캐슬바니아 시스템 분석        | `Reference/캐슬바니아 시스템 분석.md`              | 탐험, 장비, 맵 구조 분석                            |
| 아이템계 역기획서             | `Reference/Disgaea_ItemWorld_Reverse_GDD.md`       | 아이템계 상세 역분석                                |
| 스펠렁키 레벨 생성 역기획서   | `Reference/Spelunky-LevelGeneration-ReverseGDD.md` | 절차적 레벨 생성 역분석                             |
| 메트로베니아 디자인 심층 분석 | `Reference/Metroidvania Game Design Deep Dive.md`  | 메트로베니아 장르 분석                              |

---

## 핵심 시스템 요약

### 2-Space 분리 모델 (월드 + 아이템계)

| 공간                  | 핵심 목적                              | 인원      | 맵 유형                    |
| :-------------------- | :------------------------------------- | :-------- | :------------------------- |
| 월드 (World)          | 탐험, 능력 획득, 스토리, 대장간/상점 (세이브 포인트) | 솔로(1인) | 핸드크래프트 + 절차적 혼합 |
| 아이템계 (Item World) | 아이템 강화, 야리코미                  | 1-2인 (Phase 3) / 최대 4인 (Phase 4+) | 완전 절차적 생성 (기억의 지층)   |

### 아이템계 핵심 규칙

- 모든 장비 아이템은 내부에 기억의 지층(Memory Strata)을 보유
- 각 지층의 보스 (아이템 장군 → 아이템 왕 → 아이템 신 → 아이템 대신)
- 아이템계 진입은 월드(세이브 포인트/대장간)에서만 가능. 아이템계 내부에서 다른 아이템의 아이템계에 진입할 수 없음
- 아이템계에서 획득한 아이템은 월드 귀환 후 다시 진입 가능 (순환 구조)
- 기억 단편 (Memory Shard): 무기 Ego의 잊혀진 기억. 적으로 출현(Forgotten) → 격파 시 회상(Recalled) → 슬롯 장착으로 효과 발현. DEC-036 참조.

### 스탯 게이트 + 능력 게이트

- **스탯 게이트:** ATK(물리 장벽) + INT(마법 봉인) — 장비 스탯이 조건을 충족하면 장벽 돌파
- **능력 게이트(렐릭):** 대시(최초 렐릭), 벽 타기, 이단 점프, 안개 변신, 수중 호흡, 역중력

> **참고:** 허브(Hub)는 폐기되었습니다. 대장간/상점 기능은 월드 세이브 포인트에 통합. 멀티플레이 합류는 URL 링크 공유 방식.

### 레어리티 체계 (Diablo Style)

| 등급      | 색상         | 스탯 배율 | 정체성 슬롯 (Core 전용) | 기억 슬롯 (자유) | 합계 | 아이템계 지층 수                     |
| :-------- | :----------- | :-------- | :---------------------: | :--------------: | :--: | :----------------------------------- |
| Normal    | 흰색 #FFFFFF | x1.0      | 2                       | 0                | 2    | 1 지층 (DEC-039: 단일 다이브)        |
| Magic     | 파란 #6969FF | x1.3      | 3                       | 0                | 3    | 2 지층                               |
| Rare      | 노란 #FFFF00 | x1.7      | 3                       | 1                | 4    | 3 지층                               |
| Legendary | 주황 #FF8000 | x2.2      | 4                       | 2                | 6    | 4 지층                               |
| Ancient   | 초록 #00FF00 | x3.0      | 5 (4 + 심연)            | 3                | 8    | 4 지층 + 심연                        |

> 정체성 슬롯에는 핵심 기억(Core Memory)만 장착 가능. 기억 슬롯은 일반 단편을 Active/Passive 역할로 끼움. DEC-036 참조.

---

## 기술 스택

### 클라이언트

| 기술          | 용도                     |
| :------------ | :----------------------- |
| PixiJS v8     | 2D 렌더링 (WebGL/WebGPU) |
| TypeScript    | 메인 언어                |
| Vite          | 빌드/번들러              |
| @pixi/tilemap | 타일맵 렌더링            |
| @pixi/sound   | 오디오 (BGM, SFX) — PixiJS v8 공식 플러그인 (DEC-040, 2026-05-04) |

### 서버

| 기술       | 용도                        |
| :--------- | :-------------------------- |
| Node.js    | 게임 서버 (초기 프로토타입) |
| WebSocket  | 실시간 통신                 |
| PostgreSQL | 메인 DB                     |
| Redis      | 캐시/세션                   |

### 맵 에디터

| 기술             | 용도                    |
| :--------------- | :---------------------- |
| Tiled Map Editor | Room 템플릿, Chunk 제작 |
| 커스텀 에디터    | 구역 연결, 게이트 설정  |

---

## 레퍼런스 자료 활용 가이드

### 위키 자료 (disgaea-wiki-md/, castlevania-wiki-md/)

- `WIKI_INDEX.md`에서 주제별로 분류된 핵심 문서를 확인
- 디스가이아: 아이템계, Innocent(원전, ECHORIS에서는 기억 단편으로 통합), 스탯, 클래스 시스템 레퍼런스
- 캐슬바니아: 맵 구조, 장비, 적 배치, 능력 시스템 레퍼런스

### 유튜브 트랜스크립트 (gmtk/, designdocs/, sakurai/ 등)

- 각 채널별 `*_인사이트.md` 파일에 핵심 인사이트 정리
- 원본 트랜스크립트는 각 폴더 내 `.txt` 파일

### 역기획서

- 아이템계 → `Disgaea_ItemWorld_Reverse_GDD.md`
- 절차적 레벨 생성 → `Spelunky-LevelGeneration-ReverseGDD.md`, `DeadCells-LevelGeneration-ReverseGDD.md`
- 메트로베니아 → `Metroidvania Game Design Deep Dive.md`

---

## 개발 우선순위 (Phase)

| Phase                | 목표                                | 핵심 과제                                             |
| :------------------- | :---------------------------------- | :---------------------------------------------------- |
| Phase 1 (프로토타입) | 핵심 루프가 재미있는가?             | 이동/전투, 타일맵, 절차적 방 생성, 아이템계 미니 버전 |
| Phase 2 (알파)       | 성장/탐험 쾌감이 있는가?            | 장비/기억 단편, 스탯·능력 게이트, 월드 연결, 보스    |
| Phase 3 (베타)       | 파티 플레이/무한 파밍이 작동하는가? | WebSocket 멀티, 아이템계 전 지층, URL 링크 파티 합류 |
| Phase 4 (런칭)       | 장기 운영 가능한가?                 | 시즌, 이벤트, 길드                                    |

---

## 용어 사전 (Quick Reference)

| 용어                | 정의                                                        |
| :------------------ | :---------------------------------------------------------- |
| 야리코미 (やりこみ) | 게임의 한계까지 파고드는 극한 플레이                        |
| 메트로베니아        | Metroid + Castlevania. 능력 게이트 기반 비선형 탐험 액션    |
| 2-Space 모델        | 월드/아이템계 두 공간 분리 설계 (허브는 폐기, 기능은 월드 세이브 포인트로 통합) |
| 스탯 게이트         | 장비 ATK 또는 INT가 특정 수치 이상일 때 열리는 진행 장벽 (ATK/INT 이중 게이트) |
| 능력 게이트         | 특정 능력 획득 시 열리는 진행 장벽                          |
| 기억 단편 (Memory Shard) | 무기 Ego의 잊혀진 기억 조각. 일반 단편은 단일 효과·자유 전이. 5색 기질(Forge/Iron/Rust/Spark/Shadow)로 분류. (DEC-036) |
| 핵심 기억 (Core Memory)  | 지층 보스 처치 시 100% 드롭하는 영혼 단편. 무기의 정체성 결을 가동. 정체성 슬롯 전용·전이 시 결 붕괴 |
| 정체성 결 (Identity Trait) | 핵심 기억이 가동시키는 무기의 본질적 성격 한 면. 결의 합 = 무기의 코어 인격 |
| Forgotten / Recalled     | 단편 상태. 잊혀진(50% 효과, 적 NPC) → 회상된(100% 효과, 전이 가능) |
| 5색 기질 (Temperament)   | Forge(주황·분노) / Iron(청록·결연) / Rust(회색·체념) / Spark(흰빛·호기심) / Shadow(자주·은밀) |
| ~~이노센트~~        | ~~DEPRECATED. DEC-036에서 검 Ego(DEC-033)와 통합되어 기억 단편 시스템으로 흡수. 재도입 금지.~~ |
| 아이템계            | 장비 아이템 내부의 절차적 던전 (기억의 지층, 레어리티별 2~4 지층) |
| ~~재귀적 진입~~     | ~~DEPRECATED. 아이템계 내 중첩 진입은 삭제. 아이템계에서 획득한 아이템은 월드 귀환 후 진입~~ |
| Critical Path       | 시작점에서 종료점까지 반드시 통과 가능한 경로               |
| Room Template       | 절차적 생성의 기본 단위가 되는 사전 제작된 방 구조          |
| Chunk               | Room 내부에 배치되는 지형/장애물의 작은 블록 단위           |

---

## 유틸리티 스크립트

| 스크립트             | 경로                               | 용도                           |
| :------------------- | :--------------------------------- | :----------------------------- |
| wiki_to_md.py        | `Reference/wiki_to_md.py`        | 위키 XML 덤프 → Markdown 변환 |
| wiki_to_md_robust.py | `Reference/wiki_to_md_robust.py` | 위키 변환 안정화 버전          |

---

## UI 작성 규칙

> **P0 원칙 (예외 없음):** 모든 UI 제작 전 반드시 `game/docs/ui-components.html` 컴포넌트 가이드를 *먼저* 참고한다. 가이드에 해당 컴포넌트가 없으면 *코드 작성 전에* 가이드에 추가하고 사용자 승인을 받는다. 신규 컴포넌트를 가이드 없이 코드에 먼저 만드는 것을 금지한다.

### 작업 순서 (UI 신규/수정 시)

1. **컴포넌트 검색:** 만들려는 UI(prompt / panel / row / icon / overlay 등)가 `game/docs/ui-components.html` 에 이미 정의되어 있는지 확인.
2. **있는 경우:** 해당 섹션의 표준 factory (예: `KeyPrompt.createPrompt`, `ModalPanel.create9SlicePanel`, `InventoryUI` row 등) 와 토큰만 사용. 커스텀 픽토그램/색/사이즈 추가 금지.
3. **없는 경우:** 가이드에 신규 섹션 추가 → 사용자 승인 → 코드 작성. 가이드 없이 임의 컴포넌트를 코드에 먼저 만들지 않는다.
4. **수정 시:** 토큰(색상/폰트/사이즈/여백) 변경 전 `ui-components.html` 의 해당 정의를 먼저 갱신하고 코드와 동기화.

### 세부 규칙

- **하드코딩 금지:** 색·폰트·사이즈·패딩·여백은 모두 토큰(`ModalPanel.ts` 상수, `KeyPrompt.ts` 상수 등) 으로만 사용. 매직 넘버 금지.
- **토큰 SSoT:** `game/src/ui/ModalPanel.ts` 의 상수가 코드 측 SSoT이고, `game/docs/ui-components.html` 이 시각 측 SSoT이다. 양쪽을 항상 동기화한다.
- **표준 컴포넌트 사용:**
  - 월드-스페이스 prompt: `KeyPrompt.createPrompt(key, action)` — `[KEY] LABEL` 형식.
  - HUD 키 박스: `KeyPrompt.createKeyIcon(key, size)` — 진행 게이지 필요 시 `setKeyIconProgress`.
  - 모달 패널: `create9SlicePanel`, `drawSelectionRow`, `drawSelectionPulse`.
  - 토스트: `Toast.show / showBig`.
- **승인 워크플로:** 가이드에 없는 토큰/컴포넌트가 필요하면 (1) 가이드 초안 추가 → (2) 사용자 승인 대기 → (3) 코드 작성. 승인 없이 임의 값을 사용하지 않는다.

---

## 마크다운 작성 규칙

- **링크 뒤 띄어쓰기 필수:** 모든 마크다운 링크(`[텍스트](URL)`, `` `경로` ``) 뒤에 반드시 공백(스페이스)을 추가한다. 한글 텍스트가 링크 바로 뒤에 붙으면 링크가 깨진다.
  - ✅ `[문서](path.md) 참조` / `` `Documents/UI/UI_Inventory.md` 참조``
  - ❌ `[문서](path.md)참조` / `` `Documents/UI/UI_Inventory.md`참조``

---

## 타깃 플레이어

ECHORIS 는 다음 **3 niche 팬덤의 교집합** 을 1차 타깃으로 한다. 모든 디자인 결정은 이 페르소나의 만족을 시금석으로 삼는다.

**1차 niche (시그널 강화 대상):**
- **BLAME! / 메이드 인 어비스 팬** — 메가스트럭처 · 거대 스케일 · 침묵 · 깊이 메타포
- **디스가이아 / 야리코미 팬** — 아이템계 · 무한 파밍 · 장비 강화 의례
- **Transistor / 침묵 주인공 팬** — 말하는 무기 · 단독 화자 · 절제된 서사

**2차 (자연 흡수):** Hollow Knight · Hades · Sekiro · Dark Souls 팬 — 메트로베니아 · 영구 거점 · 어려운 액션을 매개로 1차 신호에 양성 반응.

**비타깃 (디자인 우선순위 X):** 캐주얼 액션 RPG · 캐주얼 플랫포머 · 가벼운 모바일 플레이어. *친절함 · 부드러움 · 안내 강화* 같은 충동은 1차 niche 신호를 희석하므로 거절한다.

**시금석 (모든 디자인 결정 시):**

> "이것이 1차 niche 팬에게 *louder* 한 신호인가, 또는 이들에게 *무해히 통과* 하는 신호인가?"
> 1차 신호를 *약화* 시키는 결정은 채택하지 않는다.

---

## 톤 & 매너

> **상세 아트 디렉션:** `Documents/Design/Design_Art_Direction.md`

- **시각:** 메가스트럭처 + 판타지, 스프라이트 기반 픽셀아트 2D. 팔레트: 청록(배경) + 주황(구조물/단조열)
- **월드:** 거대 빌더가 누비는 수직 대공동(The Shaft) — 삼중 레이어(자연/빌더 구조물/현 문명). BLAME! + 메이드 인 어비스
- **아이템계:** 부식 강판 / 다마스커스 단면 — 무기의 금속 결이 던전이 되는 세계. 팔레트 반전(주황 배경 + 청록 디테일)
- **분위기:** 거대 구조물의 경외감 + 대장간의 온기 + 디스가이아의 경쾌한 야리코미
- **전투:** 단조 타격감의 횡스크롤 액션 (히트스탑, 화면 흔들림, 넉백, 단조 불꽃)
- **~~금지:~~** ~~고딕 다크 판타지~~ (Blasphemous/Moonscars 레드오션과 차별화)

---

## 개발 위키 자동 갱신

세션 중 작업 내역은 memory 폴더의 dev wiki에 자동 기록한다.

- **위키 경로:** `memory/wiki/` (daily/, features/, decisions/)
- **인덱스:** `memory/wiki/WIKI_INDEX.md`
- **갱신 명령:** `/wiki-update`

### 자동 갱신 타이밍

다음 상황에서 `/wiki-update`를 **자동 실행**한다 (사용자에게 물어보지 않고):

1. **커밋 직후** — 커밋이 완료되면 해당 작업을 daily log와 feature history에 반영
2. **PreCompact 발동 시** — 컨텍스트 압축 전 현재 세션 작업을 위키에 저장
3. **주요 마일스톤 완료 시** — 기능 구현, 설계 결정, 버그 수정 등 의미 있는 단위 작업 완료 시

### 의사결정 기록 기준

다음에 해당하면 decisions/ 에 기록한다:
- 시스템 설계 방향이 바뀔 때
- 기능을 추가/삭제/변경할 때
- 기술 스택이나 구조가 바뀔 때
- 사용자가 명시적으로 결정을 내릴 때

---

## Coding Behavioral Guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

Tradeoff: These guidelines bias toward caution over speed. For trivial tasks, use judgment.

1. Think Before Coding
Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:

State your assumptions explicitly. If uncertain, ask.
If multiple interpretations exist, present them - don't pick silently.
If a simpler approach exists, say so. Push back when warranted.
If something is unclear, stop. Name what's confusing. Ask.
2. Simplicity First
Minimum code that solves the problem. Nothing speculative.

No features beyond what was asked.
No abstractions for single-use code.
No "flexibility" or "configurability" that wasn't requested.
No error handling for impossible scenarios.
If you write 200 lines and it could be 50, rewrite it.
Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

3. Surgical Changes
Touch only what you must. Clean up only your own mess.

When editing existing code:

Don't "improve" adjacent code, comments, or formatting.
Don't refactor things that aren't broken.
Match existing style, even if you'd do it differently.
If you notice unrelated dead code, mention it - don't delete it.
When your changes create orphans:

Remove imports/variables/functions that YOUR changes made unused.
Don't remove pre-existing dead code unless asked.
The test: Every changed line should trace directly to the user's request.

4. Goal-Driven Execution
Define success criteria. Loop until verified.

Transform tasks into verifiable goals:

"Add validation" → "Write tests for invalid inputs, then make them pass"
"Fix the bug" → "Write a test that reproduces it, then make it pass"
"Refactor X" → "Ensure tests pass before and after"
For multi-step tasks, state a brief plan:

1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

These guidelines are working if: fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
