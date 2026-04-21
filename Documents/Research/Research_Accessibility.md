# 접근성 전수 조사 — 메트로베니아/액션 RPG + 웹 게임

> **작성일:** 2026-04-21
> **목적:** ECHORIS Phase 2 접근성 최소 기능 도출 + Phase 3 확장 기능 식별
> **대상:** 웹 기반 2D 횡스크롤 액션 RPG (PixiJS v8, TypeScript, 키보드 우선, 640x360)
> **조사 범위:** 레퍼런스 게임 8종 + 표준 5종 + 카테고리 5개

---

## Part 1: 레퍼런스 게임 접근성 감사 (8종)

### 1. Celeste — Assist Mode (골드 스탠다드)

| 옵션 | 범위 | 기본값 |
|:-----|:-----|:-------|
| Game Speed | 50~100% (10% 단위) | 100% |
| Invincibility | On/Off | Off |
| Infinite Stamina | On/Off | Off |
| Infinite Dashes | On/Off | Off |
| Dash Assist (방향 자동 보정) | On/Off | Off |
| Skip Chapter | 버튼 (일시정지 메뉴) | -- |

**설계 철학:**
- 첫 게임 오버 시 "이 게임을 경험하는 것 자체가 가장 중요합니다" 메시지로 낙인(stigma) 제거
- 각 옵션이 **독립적으로** 조절 가능 (프리셋 아닌 개별 슬라이더/토글)
- 스토리 체험과 도전을 분리 — 접근성을 "쉬움"이 아닌 "맞춤형 경험"으로 프레이밍
- 업적/진행 제한 없음

**Source:** [Celeste 공식](https://www.celestegame.com/), Matt Thorson GDC 2019 "Celeste and Forgiveness"

---

### 2. Dead Cells — Assist Mode (2023 업데이트)

| 옵션 | 범위 | 기본값 |
|:-----|:-----|:-------|
| Damage Reduction | 25/50/75/100% | 100% |
| Damage Output | 배율 조절 | 100% |
| Trap Speed Reduction | On/Off | Off |
| No Lethal Fall | On/Off | Off |
| Enemy HP Reduction | 배율 조절 | 100% |
| Continue Mode (사망 위치 부활) | On/Off | Off |
| Auto-Hit (공격 홀드=연속 공격) | On/Off | Off |
| Game Speed | 단계별 감속 | 100% |

**추가 접근성 옵션:**
- HUD 크기: 50~150% 슬라이더
- 색맹 모드: 적록/청황 2종
- 고대비 UI 옵션
- 가독성 높은 대체 폰트 토글
- 아이콘 + 색상 병행 (스탯 아이콘)
- 화면 흔들림 ON/OFF

**설계 철학:**
- 로그라이크에서 "Continue Mode"는 장르 핵심(영구 사망)을 접근성 차원에서 완화한 최초 사례
- 세이브 파일에 Assist 아이콘 표시되지만 업적/진행 제한 없음
- 각 옵션이 세분화되어 필요한 만큼만 조절 가능

**Source:** [Dead Cells Store](https://store.steampowered.com/app/588650/Dead_Cells/), Motion Twin 패치 노트 v3.4

---

### 3. Hades — God Mode

| 옵션 | 범위 | 기본값 |
|:-----|:-----|:-------|
| God Mode | On/Off | Off |

**동작 방식:**
- 활성화 시 피해 감소 **20%** 로 시작
- **사망할 때마다 2%씩 증가** (최대 80% 감소)
- 업적/엔딩 제한 없음

**설계 철학:**
- "적응형 난이도"를 접근성 도구로 전환
- 숙련될수록 감소량이 쌓이므로 보스를 반복 도전하면 자연스럽게 클리어
- "포기하지 않게" 하는 심리적 설계 — 단일 토글이 최소 인지 부하

**Source:** [Supergiant Games FAQ](https://www.supergiantgames.com/blog/hades-faq/), Greg Kasavin 인터뷰

---

### 4. Hollow Knight — 반면교사

- **키 리매핑**: PC에서 키보드/컨트롤러 리매핑 지원
- **색맹 모드**: 없음
- **난이도 조절**: 없음 (고정)
- **자막**: 해당 없음 (보이스 없음)
- **교훈:** 공식 접근성 옵션 거의 부재. 커뮤니티에서 "하드코어 게임이라도 접근성은 별개의 문제"라는 인식을 확산시킨 반면교사

**Source:** [Can I Play That 리뷰](https://caniplaythat.com/)

---

### 5. Ori and the Will of the Wisps

- 난이도 프리셋: Easy / Normal / Hard (언제든 변경)
- Easy: 피해 감소, 적 HP 감소, 에너지 회복 증가
- 잦은 자동 세이브
- 컨트롤러/키보드 리매핑

**Source:** [Ori 공식](https://www.orithegame.com/)

---

### 6. Diablo IV — 풀 접근성 스위트

| 카테고리 | 주요 옵션 |
|:---------|:----------|
| 시각 | 색맹 3종, 아이템 강조, 폰트 크기 3단계, 흔들림 감소, UI 투명도 |
| 운동 | 리매핑, 홀드/토글, 자동 이동, 액션 바 입력 변경 |
| 청각 | 자막(크기/배경/화자), 개별 볼륨 5채널, 모노 오디오 |
| 인지 | 퀘스트 추적, 미니맵 확대, 도감, 난이도 4단계 |
| 기타 | 컨트롤러 진동 조절, 커서 크기, 메뉴 화면 읽기 |

**Source:** [Blizzard 접근성](https://www.blizzard.com/en-us/accessibility)

---

### 7. The Last of Us Part II — 업계 최고봉 (비교용)

**60+ 접근성 옵션:**
- High Contrast Mode: 배경 검게 + 아군/적/아이템/상호작용 4색 구분
- 오디오 큐 기반 탐색 (시각 장애인 플레이 가능)
- 자막 60+ 옵션 (크기 8단계, 배경색, 화자, 방향)
- 시각적 사운드 인디케이터 (소리 방향/종류를 화면에 표시)
- 전투 자동 조준, 무적, 자동 무기 교체, QTE → 홀드 변환
- **프리셋**: 시각/청각/운동 장애 프리셋 → 한 번에 관련 옵션 일괄 설정

**Source:** [Naughty Dog 접근성](https://www.naughtydog.com/accessibility), Emilia Schatz & Matthew Gallant GDC 2021

---

### 8. Sea of Stars — 디에게틱 접근성

- **Relics 시스템**: 접근성 옵션을 게임 내 장비 아이템으로 제공
  - Amulet of Storytelling: 전투 피해 감소/HP 회복 증가
  - Sequent Flare: 타이밍 창 확대
  - Tome of Knowledge: 적 약점 자동 표시
  - Guardian Aura: 적 접촉 회피
- 낙인 효과 최소화: "설정의 옵션"이 아니라 "게임 세계 내의 보조 장비"

**Source:** [Sea of Stars 공식](https://seaofstarsgame.co/)

---

### 레퍼런스 비교 매트릭스

| 기능 | Celeste | DC | Hades | HK | Ori | D4 | TLOU2 | SoS |
|:-----|:-------:|:--:|:-----:|:--:|:---:|:--:|:-----:|:---:|
| 키 리매핑 | O | O | O | O | O | O | O | O |
| 색맹 모드 | -- | O | -- | -- | -- | O | O | -- |
| 고대비 | -- | O | -- | -- | -- | -- | O | -- |
| 텍스트 크기 | -- | -- | -- | -- | -- | O | O | -- |
| HUD 크기 | -- | O | -- | -- | -- | O | O | -- |
| 흔들림 제어 | -- | O | -- | -- | -- | O | O | -- |
| 게임 속도 | O | O | -- | -- | -- | -- | -- | -- |
| 난이도 조절 | O | O | O | -- | O | O | O | O |
| 자동 공격 | -- | O | -- | -- | -- | -- | O | -- |
| 입력 타이밍 보조 | O | -- | -- | -- | -- | -- | O | O |
| 홀드/토글 | -- | -- | -- | -- | -- | O | O | -- |
| 볼륨 개별 | O | O | O | O | O | O | O | O |
| 모노 오디오 | -- | -- | -- | -- | -- | O | O | -- |
| 사운드 인디케이터 | -- | -- | -- | -- | -- | -- | O | -- |
| 스크린 리더 | -- | -- | -- | -- | -- | O | O | -- |
| Continue Mode | -- | O | -- | -- | -- | -- | -- | -- |
| God Mode (적응형) | -- | -- | O | -- | -- | -- | -- | -- |

---

## Part 2: 접근성 표준 및 가이드라인

### WCAG 2.2 — 게임 적용 핵심 기준

**Source:** https://www.w3.org/TR/WCAG22/

| 기준 | 레벨 | 내용 | ECHORIS 관련성 |
|:-----|:-----|:-----|:---------------|
| 1.4.1 Use of Color | A | 색상만으로 정보를 전달하지 않음 | 레어리티, 적/아군 구분, 게이트 타입 |
| 1.4.3 Contrast | AA | 텍스트 대비율 4.5:1 이상 | 픽셀 폰트 + 배경 대비 |
| 1.4.11 Non-text Contrast | AA | UI 요소 대비율 3:1 이상 | HP 바, 버튼, 게이지 |
| 2.1.1 Keyboard | A | 모든 기능 키보드 조작 가능 | 이미 키보드 기반 |
| 2.1.2 No Keyboard Trap | A | 키보드 포커스가 갇히지 않음 | 모달/메뉴 ESC |
| 2.3.1 Three Flashes | A | 1초에 3회 이상 번쩍이지 않음 | 전투 이펙트 검증 필수 |

---

### Game Accessibility Guidelines

**Source:** http://gameaccessibilityguidelines.com/

**Basic (최소):**
- 키 리매핑
- 충분한 대비의 텍스트/UI
- 볼륨 개별 조절
- 조작 방식 설명
- 게임 속도에 영향받지 않는 메뉴

**Intermediate (권장):**
- 색맹 모드 또는 색상 비의존 설계
- 홀드 vs 토글 전환
- 난이도 조절
- HUD 크기/위치 조절
- 저장 빈도 향상

**Advanced (선도적):**
- 스크린 리더
- 게임 속도 조절
- 시각 사운드 인디케이터
- 커스텀 난이도 슬라이더
- 광과민 발작 테스트 통과

---

### Xbox Accessibility Guidelines (XAG)

**Source:** https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/

| XAG # | 항목 | ECHORIS 적용 |
|:------|:-----|:-------------|
| 101 | Text Display | 1080p 기준 최소 28px. ECHORIS 8px x3 = 24px → **미달. x4 = 32px 필요** |
| 102 | Contrast | UI/텍스트 4.5:1. `UI_HUD_MasterPlan.md`에서 15.4:1 달성 확인 |
| 103 | Additional Channels | 색상 외 형태/아이콘. 레어리티에 N/M/R/L/A 라벨 추가 |
| 106 | Input | 리매핑, 홀드/토글 |
| 107 | Difficulty Options | Assist Mode |
| 110 | Game Speed | 일시정지/속도 조절 |
| 116 | Saving | 자주 저장 가능 |

---

### AbleGamers APX 프레임워크

**Source:** https://accessible.games/accessible-player-experiences/

| 축 | 질문 | ECHORIS 대응 |
|:---|:-----|:-------------|
| **Perceive** | 게임 정보를 인지할 수 있는가? | 색상 비의존 설계, 사운드 인디케이터 |
| **Reach** | 모든 조작에 도달할 수 있는가? | 키 리매핑, 한손 모드 |
| **Act** | 요구 동작을 수행할 수 있는가? | 타이밍 완화, 게임 속도, 자동 공격 |
| **Feel** | 모든 플레이어가 포함되었다고 느끼는가? | "Assist Mode" 프레이밍, 업적 제한 없음 |

**핵심 권장:**
- 접근성 옵션을 게임 첫 실행 시 제시
- "Easy Mode"가 아닌 "Assist Mode" 네이밍
- 옵션 사용 시 콘텐츠/업적 제한 금지

---

## Part 3: 접근성 카테고리별 상세 기능 목록

### 1. 시각 접근성 (Visual)

#### 1.1 색맹 모드

| 유형 | 인구 비율 | 구현 방식 |
|:-----|:---------|:----------|
| 적록색맹 (Protanopia/Deuteranopia) | 남성 8% | 적-녹 → 청-주황 또는 형태 차이로 대체 |
| 청황색맹 (Tritanopia) | 0.01% | 청-노란 → 적-녹 또는 밝기 차이로 대체 |
| 전색맹 (Achromatopsia) | 0.003% | 전체 흑백 + 패턴/형태 구분 |

**구현 접근법 3종:**
- **A: 팔레트 교체** — 게임 전체 색상 팔레트 스왑. 픽셀아트에 최적. ECHORIS는 이미 팔레트 스왑 파이프라인 존재 (DEC-022)
- **B: 포스트프로세싱 필터** — PixiJS `ColorMatrixFilter`로 전체 화면에 색상 변환 매트릭스 적용. 구현 간단, 아트 품질 저하 가능
- **C: 색상 비의존 설계 (권장)** — 색상 외에 형태/아이콘/텍스트 레이블로 정보 전달. 색맹 모드 자체가 불필요해짐

**ECHORIS 해당 항목:**
- 레어리티 색상 (흰/파/노/주/초) → 아이콘 또는 레이블(N/M/R/L/A) 병행 필요
- 원소 색상 (적/청/황) → 아이콘 병행 필요
- 게이트 색상 (ATK=물리/INT=마법) → 아이콘 필수
- HP 바 색상 전환 (초/노/빨) → 이미 텍스트 HP 수치 병행

#### 1.2 고대비 모드
- 배경 밝기 감소 + 전경 강조
- 픽셀아트: 아웃라인 강화 또는 배경 레이어 투명도 조절

#### 1.3 텍스트 크기/스케일링
- XAG 101: 최소 28px @1080p
- ECHORIS 8px x3 = 24px → **미달**. x4 = 32px 권장
- 정수 배율 스케일링으로 BitmapText 선명도 유지

#### 1.4 화면 흔들림/번쩍임 제어
- Screen Shake ON/OFF 토글
- 번쩍임 강도 조절 (히트 플래시, 번개 이펙트)
- WCAG 2.3.1: 1초 3회 이상 금지 — 전투 이펙트 검증 필수
- 파티클 밀도 조절 옵션

#### 1.5 HUD 크기 조절
- 50~150% 스케일 슬라이더 (Dead Cells 방식)
- 별도 HUD 컨테이너에 스케일 팩터 적용

---

### 2. 운동/물리 접근성 (Motor)

#### 2.1 키 리매핑
- 모든 게임 액션에 대해 키보드/컨트롤러 매핑 변경 가능
- 웹 게임: 브라우저 단축키(Ctrl+W, F5 등)와 충돌 회피 필수
- 기본 프리셋 + 커스텀 저장 (localStorage)

#### 2.2 홀드/토글 전환
- 대시, 방어 등 "누르고 있기" 액션을 토글로 전환
- 연타 → 홀드 전환 (자동 콤보)

#### 2.3 입력 타이밍 보조
- 코요테 타임 확대 (기본 6f → Generous 12f)
- 입력 버퍼 확대 (기본 6f → Generous 12f)
- 패리/회피 타이밍 창 확대

#### 2.4 자동 공격
- 공격 버튼 홀드 시 자동 연속 공격 (Dead Cells Auto-Hit)

#### 2.5 게임패드 지원
- Web Gamepad API
- 아날로그 스틱 데드존 조절
- 버튼 아이콘 자동 전환 (Xbox/PS)

---

### 3. 인지 접근성 (Cognitive)

#### 3.1 난이도 옵션
- **Assist Mode (Celeste/Dead Cells)**: 개별 슬라이더 (피해/속도/HP/타이밍)
- **God Mode (Hades)**: 사망 시 피해 감소 2% 누적 (최대 80%)
- **프리셋**: Story / Standard / Challenge + 커스텀

#### 3.2 게임 속도 조절
- 전체 속도 50~100% (10% 단위)
- PixiJS: `Ticker.shared.speed` 또는 자체 deltaTime 배율

#### 3.3 내비게이션 보조
- 메트로베니아 탐험 핵심과 충돌 → 힌트 강도 세분화 (0/1/2/3)
- 0: 없음, 1: 미니맵 미방문 방 강조, 2: 게이트 위치 마커, 3: 다음 목적지 화살표

#### 3.4 아이템계 중간 저장
- 접근성 모드 전용: 층 클리어 시 자동 세이브 + 재개 가능
- 밸런스 영향 고려: 리워드 조정 없이, 진행 편의만 제공

---

### 4. 청각 접근성 (Auditory)

#### 4.1 볼륨 개별 조절
- Master / BGM / SFX / UI 4채널 분리 슬라이더
- Howler.js 볼륨 그룹으로 구현

#### 4.2 모노 오디오
- 스테레오 → 모노 믹스 (한쪽 귀만 들을 수 있는 플레이어)
- Web Audio API StereoPannerNode → 센터 고정

#### 4.3 시각 사운드 인디케이터
- 화면 밖 적 공격/위험 소리 → 화면 가장자리 방향별 이펙트
- 방향 + 종류 (적/환경/아이템) 구분

---

### 5. 웹 특화 접근성 (Web-Specific)

#### 5.1 브라우저 줌 호환
- Ctrl+/- 줌 시 캔버스/UI 깨지지 않도록 resize 이벤트 처리
- 정수 스케일링 재계산 로직

#### 5.2 키보드 전용 내비게이션
- Tab으로 메뉴/UI 요소 순회 + Enter/Space 선택 + ESC 뒤로
- 포커스 표시기(Focus Indicator) 명확 표시

#### 5.3 스크린 리더 지원
- PixiJS v8 **AccessibilityManager** 내장: `displayObject.accessible = true`
- HTML div 오버레이 자동 생성 → 스크린 리더 접근 가능
- 메뉴/인벤토리/상점 우선 적용

#### 5.4 CSS 미디어 쿼리 활용
- `prefers-reduced-motion`: 감지 시 자동으로 흔들림/파티클 감소
- `prefers-contrast`: 감지 시 자동으로 고대비 모드
- `prefers-color-scheme`: 다크/라이트 UI 대응 (해당 시)

#### 5.5 URL 파라미터 접근성 프리셋
- `?assist=true&speed=0.7` 등 URL로 접근성 설정 공유 가능
- 웹 게임 고유의 강점

---

## Part 4: ECHORIS 맞춤 권장사항

### Phase 2 (Alpha) 최소 기능 — 12건

| # | 기능 | 카테고리 | 난이도 | 구현 노트 |
|:--|:-----|:---------|:-------|:----------|
| A-01 | **키 리매핑** | 운동 | Easy | 키 바인딩 맵 객체 + 설정 UI. localStorage 저장. 브라우저 단축키 충돌 체크 |
| A-02 | **홀드/토글 전환** | 운동 | Easy | 대시 등 지속 입력 액션에 토글 옵션 |
| A-03 | **볼륨 개별 조절** | 청각 | Easy | Howler.js 볼륨 그룹: Master/BGM/SFX/UI. 슬라이더 4개 |
| A-04 | **화면 흔들림 ON/OFF** | 시각 | Easy | screenShake 함수에 전역 플래그 체크 |
| A-05 | **번쩍임 감소** | 시각 | Easy | 히트 플래시 강도 조절. WCAG 2.3.1 검증 |
| A-06 | **레어리티 아이콘/레이블** | 시각 | Easy | 색상 외에 N/M/R/L/A 텍스트 또는 형태 아이콘 추가 |
| A-07 | **텍스트 크기 조절** | 시각 | Medium | 8px 기준 x3/x4/x5 정수배. BitmapFont 스케일링 |
| A-08 | **게임 속도 조절** | 인지 | Medium | `Ticker.shared.speed` 또는 deltaTime 배율. 50~100% |
| A-09 | **입력 타이밍 보조** | 운동 | Medium | 코요테 타임/입력 버퍼를 설정값 노출. "Generous" 프리셋 |
| A-10 | **Assist Mode 프레임** | 전체 | Easy | 위 옵션을 "Assist" 탭으로 통합. Celeste식 프레이밍 |
| A-11 | **게임패드 지원** | 운동 | Medium | Web Gamepad API. 기본 매핑 + 리매핑 + 데드존 |
| A-12 | **일시정지 메뉴 접근성** | 웹 | Easy | ESC 일시정지, Tab 순회, Enter 선택, 포커스 트랩 |

### Phase 3 (Beta) 확장 기능 — 13건

| # | 기능 | 카테고리 | 난이도 |
|:--|:-----|:---------|:-------|
| A-13 | 색맹 모드 3종 | 시각 | Medium |
| A-14 | 고대비 모드 | 시각 | Medium |
| A-15 | 시각 사운드 인디케이터 | 청각 | Medium |
| A-16 | 모노 오디오 | 청각 | Easy |
| A-17 | 난이도 세분화 슬라이더 | 인지 | Medium |
| A-18 | 적응형 God Mode | 인지 | Medium |
| A-19 | 내비게이션 힌트 (강도 조절) | 인지 | Hard |
| A-20 | 스크린 리더 메뉴 지원 | 웹 | Hard |
| A-21 | 브라우저 줌 호환 | 웹 | Medium |
| A-22 | 자동 공격 | 운동 | Easy |
| A-23 | 아이템계 중간 저장 | 인지 | Hard |
| A-24 | 튜토리얼 다시보기 | 인지 | Easy |
| A-25 | 첫 실행 접근성 설정 | 전체 | Medium |

---

### PixiJS v8 활용 포인트

| PixiJS 기능 | 접근성 활용 |
|:------------|:-----------|
| **AccessibilityManager** | `displayObject.accessible = true` → HTML 오버레이 → 스크린 리더 |
| **ColorMatrixFilter** | `.deuteranopia()`, `.protanopia()`, `.tritanopia()` → 색맹 보정 |
| **Ticker.shared.speed** | 전체 게임 속도 조절 (0.5 = 50%) |
| **정수 스케일링** | 텍스트 선명도 유지 + 추가 UI 스케일링 |

---

### 비용 대비 효과 TOP 5

1. **키 리매핑** — Easy, 가장 많은 운동 장애 플레이어 포용
2. **레어리티 색상 비의존** — Easy, 남성 8% 적록색맹 대응
3. **흔들림/번쩍임 제어** — Easy, 전정 장애 + 광과민 발작 방지
4. **게임 속도 조절** — Medium, 인지/운동 장애 동시 대응
5. **Assist Mode 프레이밍** — Easy, 구현 비용 0에 가깝지만 심리 장벽 제거 핵심

---

### ECHORIS 고유 고려사항

**아이템계 접근성:**
- 절차적 생성 던전의 가독성이 핵심 — 벽/바닥/위험/출구의 시각 구분
- 층 수가 많으므로 "중간 저장"의 실질적 영향이 큼
- 이노센트 전투도 Assist Mode 적용 대상

**메트로베니아 탐험 접근성:**
- 능력/스탯 게이트 위치 힌트는 탐험 경험과 직접 충돌 → 세분화된 힌트 강도(0-3) 필수
- 백트래킹 빈도를 줄이는 패스트 트래블 확장도 접근성의 일환

**웹 플랫폼 강점:**
- HTML 오버레이로 스크린 리더 지원이 네이티브보다 용이
- CSS `prefers-reduced-motion`, `prefers-contrast` 자동 감지
- localStorage로 접근성 설정 영속 저장 (계정 없이도)
- URL 파라미터로 접근성 프리셋 공유 가능

---

## Sources

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [Game Accessibility Guidelines](http://gameaccessibilityguidelines.com/)
- [Xbox Accessibility Guidelines](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/)
- [AbleGamers APX](https://accessible.games/accessible-player-experiences/)
- [IGDA GASIG](https://igda-gasig.org/)
- [Celeste 공식](https://www.celestegame.com/)
- [Dead Cells](https://store.steampowered.com/app/588650/Dead_Cells/)
- [Supergiant Games Hades FAQ](https://www.supergiantgames.com/blog/hades-faq/)
- [Blizzard Accessibility](https://www.blizzard.com/en-us/accessibility)
- [Naughty Dog Accessibility](https://www.naughtydog.com/accessibility)
- [Can I Play That](https://caniplaythat.com/)
- [Game UI Database](https://www.gameuidatabase.com/)
