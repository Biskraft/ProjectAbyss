# ECHORIS — 프로젝트

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

> This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---



## 프로젝트 개요

ECHORIS는 웹 기반 횡스크롤 온라인 액션 RPG (메트로베니아 + 야리코미)이다. ProjectAbyss 저장소는 게임 기획 리서치, 레퍼런스 분석, 프로토타입을 관리하는 중앙 저장소이다.

- **장르:** 웹 기반 횡스크롤 온라인 액션 RPG
- **플랫폼:** 웹 브라우저 (PC)

> 📦 **내러티브 섹션 archived 2026-05-28 (NarrativeWorldReset 2차 라운드).**
> 분리 보존 경로: `Documents/Terms/_archive/NarrativeWorldReset_2026-05-28/`. 활성 SSoT 정의 0. 다음 라운드 재정의 전까지 인용 보류.

### 핵심 설계 원칙

- **2-Space 분리 모델:** 월드(탐험 + 세이브포인트/상점) / 아이템계(협동 파밍)
- **순환 구조:** 월드 탐험 → 아이템 획득 → 아이템계 진입 → 장비 강화 → 스탯 게이트 해금 → 새 층위 탐험
- **스탯 게이트 + 능력 게이트:** 장비 스탯과 능력(이단점프, 변신 등) 이중 게이트로 탐험 깊이 확보
- **스파이크 검증:** 새 시스템 추가 시 "이것이 아이템계 경험을 강화하는가?" 통과 필수
- **아이템계 정본 방향 (DIR-IWS-01):** 후크이자 스파이크 = "던전은 걸어 들어가고, 아이템 세계는 빠진다" — 무기가 곧 세계, 내려감은 약탈이 아니라 증언. 정본 = `Documents/Design/Design_ItemWorld_HookAndSpike.md` (10 캐논 다이브 = 합격선). 생성 시스템 = `Documents/Research/Research_ItemWorld_WonderAxisSystem.md` (RES-IWS-03, 8축).

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

| 공간                  | 핵심 목적                                            | 인원                                  | 맵 유형                        |
| :-------------------- | :--------------------------------------------------- | :------------------------------------ | :----------------------------- |
| 월드 (World)          | 탐험, 능력 획득, 스토리, 대장간/상점 (세이브 포인트) | 솔로(1인)                             | 핸드크래프트 + 절차적 혼합     |
| 아이템계 (Item World) | 아이템 강화, 야리코미                                | 1-2인 (Phase 3) / 최대 4인 (Phase 4+) | 완전 절차적 생성 (지층 던전) |

### 아이템계 핵심 규칙

- 아이템계 진입은 월드(세이브 포인트/대장간)에서만 가능. 아이템계 내부에서 다른 아이템의 아이템계에 진입할 수 없음
- 아이템계에서 획득한 아이템은 월드 귀환 후 다시 진입 가능 (순환 구조)
- 각 지층의 보스 처치 시 다음 지층으로 진행. 최심 지층 클리어 시 월드 세이브 포인트로 귀환

> 📦 아이템계 narrative bullet archived 2026-05-28 → `Documents/Terms/_archive/NarrativeWorldReset_2026-05-28/`

### 스탯 게이트 + 능력 게이트

- **스탯 게이트:** ATK(물리 장벽) + INT(마법 봉인) — 장비 스탯이 조건을 충족하면 장벽 돌파
- **능력 게이트(렐릭):** 출시 캐논 11종 — 코어 6 LOCKED(대시·이단 점프·벽 점프·수중 호흡·역류의 쇄도(surge)·추락의 영혼(diveAttack)) + 빌더 전용 4(자기 점착 클램프·빌더 제어 노드·극성 부츠·공명 펄스) + 반중력 1. SSoT = `Documents/Plan/Spec/Spec_Relic_Catalog.md`. (2026-06-01 갱신: 구 "5종(역중력)"에서 — 역중력→반중력·극성 부츠 재정의, surge·diveAttack·빌더 4종 추가. 안개 변신은 2026-05-18 폐기·재도입 금지.)

> **참고:** 허브(Hub)는 폐기되었습니다. 대장간/상점 기능은 월드 세이브 포인트에 통합. 멀티플레이 합류는 URL 링크 공유 방식.

### 레어리티 체계 (Diablo Style)

| 등급      | 색상         | 스탯 배율 | 아이템계 지층 수              |
| :-------- | :----------- | :-------- | :---------------------------- |
| Normal    | 흰색 #FFFFFF | x1.0      | 1 지층 (DEC-039: 단일 다이브) |
| Magic     | 파란 #6969FF | x1.3      | 2 지층                        |
| Rare      | 노란 #FFFF00 | x1.7      | 3 지층                        |
| Legendary | 주황 #FF8000 | x2.2      | 4 지층                        |
| Ancient   | 초록 #00FF00 | x3.0      | 4 지층 + 심연                 |

> 📦 레어리티 slot narrative 컬럼·주석 archived 2026-05-28 → `Documents/Terms/_archive/NarrativeWorldReset_2026-05-28/`

---

## 기술 스택

### 클라이언트

| 기술          | 용도                                                               |
| :------------ | :----------------------------------------------------------------- |
| PixiJS v8     | 2D 렌더링 (WebGL/WebGPU)                                           |
| TypeScript    | 메인 언어                                                          |
| Vite          | 빌드/번들러                                                        |
| @pixi/tilemap | 타일맵 렌더링                                                      |
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
- 디스가이아: 아이템계, Innocent, 스탯, 클래스 시스템 레퍼런스
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

> **현재 스테이지 (2026-06-03): 본격 개발 (Full Production).**
> **MVP = 버티컬 슬라이스 완료.** 핵심 루프 검증(30분 플레이 + 지인 50명 + 공개 테스트) 종료. 슬라이스는 `echoris.io/play`(동결, 태그 `vslice-1.0` / `vertical-slice` 브랜치)로 보존. 현재 빌드는 `echoris.io/main`.
> 프로토타입/검증 단계는 끝났다. 이제 콘텐츠·기능을 출시 볼륨으로 채우는 **본격 제작 단계**다 — 7구역 월드, 7무기, 18스킬, 적·보스 로스터, 아이템계 전 지층. 다음 마일스톤·작업 순서 = `Plan/Roadmap_Master_Integrated.md`(PLN-MASTER) §12 M-NEXT.

| Phase                | 목표                                | 핵심 과제                                             | 상태 |
| :------------------- | :---------------------------------- | :---------------------------------------------------- | :--- |
| Phase 1 (프로토타입) | 핵심 루프가 재미있는가?             | 이동/전투, 타일맵, 절차적 방 생성, 아이템계 미니 버전 | ✅ 완료 (MVP/슬라이스) |
| Phase 2 (알파)       | 성장/탐험 쾌감이 있는가?            | 장비/슬롯 아이템, 스탯·능력 게이트, 월드 연결, 보스 | 🔄 진행 (본격 제작) |
| Phase 3 (베타)       | 파티 플레이/무한 파밍이 작동하는가? | WebSocket 멀티, 아이템계 전 지층, URL 링크 파티 합류  | 대기 |
| Phase 4 (런칭)       | 장기 운영 가능한가?                 | 시즌, 이벤트, 길드                                    | 대기 |

---

## 용어 사전 (Quick Reference)

| 용어                       | 정의                                                                                                                    |
| :------------------------- | :---------------------------------------------------------------------------------------------------------------------- |
| 야리코미 (やりこみ)        | 게임의 한계까지 파고드는 극한 플레이                                                                                    |
| 메트로베니아               | Metroid + Castlevania. 능력 게이트 기반 비선형 탐험 액션                                                                |
| 2-Space 모델               | 월드/아이템계 두 공간 분리 설계 (허브는 폐기, 기능은 월드 세이브 포인트로 통합)                                         |
| 스탯 게이트                | 장비 ATK 또는 INT가 특정 수치 이상일 때 열리는 진행 장벽 (ATK/INT 이중 게이트)                                          |
| 능력 게이트                | 특정 능력 획득 시 열리는 진행 장벽                                                                                      |
| 아이템계                   | 장비 아이템 내부의 절차적 던전 (레어리티별 2~4 지층)                                                                    |
| ~~재귀적 진입~~           | ~~DEPRECATED. 아이템계 내 중첩 진입은 삭제. 아이템계에서 획득한 아이템은 월드 귀환 후 진입~~                           |
| Critical Path              | 시작점에서 종료점까지 반드시 통과 가능한 경로                                                                           |
| Room Template              | 절차적 생성의 기본 단위가 되는 사전 제작된 방 구조                                                                      |
| Chunk                      | Room 내부에 배치되는 지형/장애물의 작은 블록 단위                                                                       |

> 📦 용어 사전 narrative 행 archived 2026-05-28 → `Documents/Terms/_archive/NarrativeWorldReset_2026-05-28/`

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

## 로컬라이제이션 규칙

> **P0 원칙 (예외 없음):** 게임 내에 표시되는 모든 문자열은 반드시 `Sheets/Content_Localization.csv` 에 먼저 등록한다. 코드에 텍스트를 직접 하드코딩하지 않는다.

### 규칙

- **하드코딩 금지:** UI 레이블, 대사, 툴팁, 버튼 텍스트, 에러 메시지 등 플레이어에게 노출되는 모든 문자열을 코드에 직접 작성하지 않는다.
- **CSV 우선 등록:** 신규 문자열이 필요하면 코드 작성 전에 `Sheets/Content_Localization.csv` 에 키와 EN/KO 값을 추가한다.
- **키 참조 방식:** 코드에서는 문자열 키(예: `ui.inventory.empty`, `sword.ego.greeting`) 를 통해 로케일 번들을 참조한다.
- **빌드 파이프라인:** CSV → `node Sheets/tools/csv_to_locale.mjs` → `game/public/locales/` JSON 번들 자동 생성. CSV가 SSoT이며 JSON 직접 수정은 빌드 시 손실된다.

### 위반 예시

```typescript
// ❌ 금지 — 코드에 직접 텍스트
label.text = "Pick up item";
tooltip.text = "강화 완료";

// ✅ 올바른 방법 — 키 참조
label.text = t("ui.item.pickup");
tooltip.text = t("forge.complete");
```

### 예외

- 디버그/개발 전용 콘솔 로그 (`console.log`, `console.warn`) 는 예외.
- 코드 주석은 예외.

---

## 마크다운 작성 규칙

- **링크 뒤 띄어쓰기 필수:** 모든 마크다운 링크(`[텍스트](URL)`, `` `경로` ``) 뒤에 반드시 공백(스페이스)을 추가한다. 한글 텍스트가 링크 바로 뒤에 붙으면 링크가 깨진다.
  - ✅ `[문서](path.md) 참조` / `` `Documents/UI/UI_Inventory.md` 참조``
  - ❌ `[문서](path.md)참조` / `` `Documents/UI/UI_Inventory.md`참조``

---

## 검증 정책

- **Playwright 브라우저 검증은 사용자가 직접 명령할 때만 수행한다.** 배포·기능 작업 후 자동으로 Playwright(브라우저 자동화, 스크린샷, 클릭 검증)를 실행하지 않는다. 명시적 요청("playwright로 확인해", "브라우저에서 검증해" 등)이 있을 때만 사용한다.
- 배포 검증(/deploy Step 7)은 기본적으로 `curl`(HTTP 응답·JS 해시) 로만 수행한다. 실제 인게임 동작 확인이 필요하면 사용자가 직접 Playwright를 지시한다.

---

## 타깃 플레이어

> 📦 **archived 2026-05-28 (NarrativeWorldReset 라운드)**
> 3 niche 정의는 `Documents/Terms/_archive/NarrativeWorldReset_2026-05-28/CLAUDE_TargetPlayer_Section_2026-05-28.md` 로 분리 보존.
> 활성 SSoT 에서는 현재 정의 0. 다음 내러티브 라운드에서 재정의 예정. 인용 보류.

---

## 톤 & 매너

> 📦 **archived 2026-05-28 (NarrativeWorldReset 2차 라운드)**
> 시각/월드/아이템계/분위기/전투 톤·금지 사항은 `Documents/Terms/_archive/NarrativeWorldReset_2026-05-28/CLAUDE_NarrativeSections_2026-05-28.md` 로 분리 보존.
> Design Art Direction(`Documents/Design/Design_Art_Direction.md`)도 동일 라운드로 archive. 활성 정의 0. 다음 라운드 재정의 대기.

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
