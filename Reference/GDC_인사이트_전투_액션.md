# GDC 인사이트: 전투 & 액션 디자인 (Combat & Action Design)

> 분석 대상: 8개 GDC 강연
> 분석일: 2026-03-23
> 프로젝트 맥락: Metroidvania + Item World + Online Action RPG 웹게임

---

## 1. Dead Cells: What the F*n!?

### 발표자 / 게임
- **발표자:** Sebastien Benard (Motion Twin)
- **게임:** Dead Cells (Roguevania — Roguelike + Metroidvania)

### 핵심 인사이트

1. **Permadeath를 긍정적 경험으로 전환하기:** 죽음 후 새로운 콘텐츠(경로, 무기)를 해금하여 "죽어서 좋다"는 감정을 유도. Dead Cells(영구 화폐)를 투자해 영구 진행도를 쌓는 구조로, 매 런이 무의미하지 않도록 설계.

2. **죽음-재시작 루프를 10초 이내로:** 죽음 후 액션 복귀까지 10초. 통계 화면이나 확인 버튼 없이 즉시 재시작. 이것이 Permadeath의 심리적 부담을 극적으로 줄임.

3. **플레이어 의도 파악 후 보이지 않는 보조(Invisible Assists):**
   - 플랫폼 가장자리에서 떨어질 때 2~3프레임 점프 허용 (Coyote Time)
   - 목표 플랫폼에서 5픽셀 이내면 자동 텔레포트
   - 적 뒤에서 공격 시 자동 방향 전환
   - 무기별 Auto-aim 우선순위 시스템 (빠른 무기 → 소형 적, 느린 무기 → 대형 적)

4. **핵심 챌린지가 아닌 것은 챌린지로 만들지 않기:** "이 플랫폼이 도전의 일부인가?" 질문을 지속. 전투 게임에서 플랫폼은 수단이지 도전이 아니므로, 이동 중 실패를 최소화.

5. **레퍼런스를 기억이 아닌 감정으로 재현:** 과거 명작을 그대로 복제하면 현대 기준에 미달. 그 게임에서 느꼈던 감정을 현대적 메커닉으로 재해석해야 함.

### 프로젝트 적용점
- Metroidvania 구조에서 영구 진행도(Permanent Progression)와 런 기반 진행도를 분리 설계
- 웹게임 특성상 빠른 재시작 루프 필수 — 로딩 최소화
- 전투 외 이동에서 Coyote Time, Auto-aim 등 보이지 않는 보조 시스템 적극 도입
- Item World 탐사 시 사망 후 일부 보상을 유지하는 Dead Cells 패턴 적용 가능

### 구체적 수치/규칙
- 죽음 → 재시작: **10초 이내**
- Coyote Time: **2~3프레임**
- 플랫폼 자석(Snap): **5픽셀 이내**

---

## 2. Boss Up: Boss Battle Design Fundamentals and Retrospective

### 발표자 / 게임
- **발표자:** Itay Karen (Mushroom 11 개발자)
- **게임:** 다수의 역사적 보스전 분석 (Shadow of the Colossus, Cuphead, Dark Souls, Undertale 등)

### 핵심 인사이트

1. **보스의 4가지 목적 — Reward, Dazzle, Engage, Challenge:**
   - **Reward:** 일반 게임플레이 돌파에 대한 보상으로서의 새로운 경험
   - **Dazzle:** 예상치 못한 플레이 경험으로 놀라움 제공
   - **Engage:** 스토리 전달 및 감정적 몰입 생성
   - **Challenge:** 습득한 스킬을 테스트하고 다음을 준비

2. **Delta of Chance (기회의 델타):** 가장 중요한 개념. 모든 공격 웨이브는 **도전적 정점(Challenging Peak) → 예상 가능한 승리(Anticipated Triumph)** 구조를 따라야 함. 이 패턴이 Dopamine 방출을 유도. 부정적 Delta(성공 직후 즉시 실패)는 극도로 불만족스러운 경험을 생성.

3. **Negative Space 설계:** 보스의 공격 패턴은 플레이어가 통과할 수 있는 "빈 공간(경로)"을 의도적으로 남겨야 함. 보스는 플레이어를 죽이려는 것이 아니라, 죽이지 않으면서 긴장감을 주는 것. Cuphead, Contra 등이 대표적.

4. **명확성(Clarity)의 3요소:**
   - **Clear Target:** 빛나는 약점 등 행동 촉구(Call-to-action)
   - **Clear Progression:** Health Bar 또는 시각적 단계 표시
   - **Predictable Attacks:** 충분한 정보와 반응 시간 제공. Telegraphing(예비 동작) 필수.

5. **Phase 설계 원칙:** Phase는 게임 시간을 연장하기 위한 것이 아니라, 다른 스킬을 테스트하거나 난이도를 변화시키기 위한 것. 각 Phase 사이에 Delta of Chance를 적용하여 안도감 제공.

### 프로젝트 적용점
- 보스 및 미니보스 설계 시 Delta of Chance 곡선 적용 — 공격 웨이브 후 반드시 "안전한 1~2초" 보장
- Negative Space를 패턴에 내재화 — 탄막/공격 배치 시 플레이어 경로를 먼저 설계
- 온라인 환경에서 보스의 Attack Space(다양한 공략 방법) 확보 — 다양한 빌드/무기로 공략 가능하도록
- Cuphead식 사망 시 진행도 표시 바 적용 — Rage Quit 방지

### 구체적 수치/규칙
- 논리(Logic)와 스킬(Skill)을 동시에 요구하지 않기 — 둘 중 하나에 집중
- 보스전 후 즉시 새 도전 부여하지 않기 — 승리의 여운(Revel) 시간 확보
- 13개 다른 엔딩을 가진 Chrono Trigger식 보스 타이밍 선택 시스템 참고

---

## 3. Embracing Push Forward Combat in DOOM

### 발표자 / 게임
- **발표자:** Kurt Louie (Design), Jake Campbell (AI Programming) — id Software
- **게임:** DOOM (2016)

### 핵심 인사이트

1. **Push Forward Combat 원칙:** "멈추면 죽는다." 체력 회복을 전투 참여(Glory Kill)로만 가능하게 하여, 엄폐 기반 교전을 원천 차단. 공격 = 생존 메커닉.

2. **Combat Chess (전투 체스):**
   - 4대 구성요소: 지속적 이동(Constant Movement), 적 평가(Sizing Up Foes), 즉흥(Improvisation), 적을 수세로 모는 것(Putting Enemy on Heels)
   - 적을 "전투 퍼즐"로 바라보고, 해법은 Arena + Arsenal + 교전 방식의 조합
   - 적 AI를 Swiss Army Knife가 아닌 **단일 역할(Single Role)** 특화로 설계 — "한 문장으로 설명 가능한 적"

3. **Arena 설계 — Skate Park 철학:**
   - 반벽(Half Wall)이 "비밀 무기" — 점프로 넘기 쉬우면서 Line of Sight 차단
   - 원형 Arena 금지 — 대칭 구조는 AI와 플레이어가 서로 쫓는 경주가 됨
   - 적절한 크기의 Arena가 속도감을 만듦 — 가속도와 방향 전환 속도가 최고 속도보다 중요
   - 이동 옵션은 2~3개가 최적 — 4~5개면 판단 지연 발생

4. **Threat Management System (위협 관리 시스템):**
   - Hit Reaction을 "플레이어의 도구"로 재정의: Twitch(미약) → Falter(행동 중단) → Stagger(전투 이탈)
   - Stagger 상태에서 Glory Kill 가능 — 시각적 Highlight(파란색/노란색)로 명확히 표시
   - Glory Kill 중 플레이어 무적 + AI 공격 금지(Combat Pause)
   - Glory Kill은 해당 적을 일반 사살보다 **항상 빠르게** 완료되도록 설계

5. **Token 기반 공격 제한:**
   - 동시 공격 가능한 AI 수를 Token으로 제한 — Token 없는 AI는 재배치/도발 등 수행
   - 이동 중인 플레이어에게 AI가 의도적으로 빗나감 — 속도가 빠를수록 Miss 증가
   - Miss 분포를 Curve로 정의하여 난이도별 세밀 조절

### 프로젝트 적용점
- 자원 획득을 전투 참여에 연동 — "전투 참여 = 보상" 루프로 소극적 플레이 방지
- 적을 단일 역할로 설계 후 조합으로 난이도 창출 — "재료(Ingredient)"이지 "완성 요리(Entree)"가 아님
- Arena 설계 시 비대칭 구조 + 반벽(Half Wall) 활용
- Token 시스템으로 동시 공격 수 제한 — 온라인 환경에서 다수 적의 압박감 조절
- AI 정확도를 플레이어 이동 속도에 연동하는 Curve 기반 시스템

### 구체적 수치/규칙
- Arena Fight 목표 시간: **5분, 3웨이브**
- 최대 Minion 수: 일반 **10**, 대규모 전투 **20**
- AI 정확도: 이동 중 Miss, 정지 시 Hit — **Curve 기반 분포**로 제어
- 다음 웨이브 소환 기준: 현재 Heavy의 HP **50% 이하** 시점
- 전투 종료: "Last Heavy Standing" — Heavy가 죽으면 잔여 Fodder Zerg Rush
- Trace Budget: 프레임당 **24 traces** (60fps 기준 초당 1,400회)
- 절대 금지: Charger(돌진형)와 Chaser(추격형)를 동시 배치

---

## 4. Evolving Combat in 'God of War' for a New Perspective

### 발표자 / 게임
- **발표자:** Mihir Sheth (Lead Combat Designer) — Santa Monica Studio
- **게임:** God of War (2018)

### 핵심 인사이트

1. **핵심 정체성과 새 카메라의 충돌 해결:**
   - God of War의 전투 정체성 4요소: 반응형 콤보 → 과장된 Hit Reaction / 공격이 물리적으로 전진 / 다수 적 상대 능수능란 / 접근성 높은 조작
   - Close Camera는 이 모든 것에 반하지만, 비전을 신뢰하고 시스템을 재설계

2. **Aggression Token 시스템:**
   - 적의 공격성을 Token Pool(예: 14개)로 관리
   - 적 유형별 Token 소비량 차등 (큰 적 = 많은 Token)
   - 화면 안/밖, 카메라 각도, 거리를 기반으로 Aggression Score 계산
   - 결과: 관리 가능한 위협(Manageable Threat)을 항상 유지

3. **Zone Constraint 기반 Positioning (크레센트 존):**
   - 초기 가중치 기반 시스템은 모놀리식 + 빈번한 무효화로 실패
   - 해법: "최적 위치 찾기"가 아닌 **"나쁜 위치 방지"**로 목표 전환
   - Aggressive 적: Kratos 정면 초승달(Crescent) 형태 존
   - Non-aggressive 적: Kratos 주변 넓은 원
   - **Quadrant System:** Off-screen 적이 마지막으로 보인 사분면에 유지 → 플레이어 Mental Map 형성

4. **Suck-to-Target (자석 공격):**
   - 공격 시 Kratos가 목표를 향해 자동 이동하여 적중률 보장
   - 측면 적에게는 Suck 거리를 감소 — 각도가 넓을수록 범위 축소
   - 가장 어려운 난이도(Give Me God of War)에서는 Suck 거리 대폭 감소

5. **Off-screen 위협 표시:**
   - 레이더/미니맵 대신 Kratos 주변 화살표
   - 빨간 화살표: 공격 임박 / 하얀 화살표: 대기 중 / 보라 화살표: 원거리 공격
   - 과부하를 방지하면서 필수 정보만 전달

### 프로젝트 적용점
- Aggression Token으로 다수 적 교전의 공정성 보장 — ARPG 몬스터 밀도 조절에 직결
- Crescent Zone + Quadrant System으로 Off-screen 적 관리 (3D/2.5D 적용 가능)
- Suck-to-Target를 거리/각도별 Curve로 제어 — 난이도별 차등 적용
- 화면 밖 적 표시 UI 시스템 (특히 온라인 멀티에서 유용)
- "최적 위치 찾기"보다 **"나쁜 위치 방지"** 철학이 복잡한 레벨에서 더 안정적

### 구체적 수치/규칙
- Aggression Token Pool 예시: **14개**
- Targeting 요소: Left Stick 방향 + Right Stick(카메라 중심) + 거리 + 화면 위치 + 현재 타겟 가중치
- 타겟 없을 때: 항상 카메라 정면으로 공격 (좌우/후방 공격 불가)
- 타겟 있으면: 모든 공격 자동 회전하여 대상을 향함

---

## 5. Dreamscaper: Killer Combat on an Indie Budget

### 발표자 / 게임
- **발표자:** Ian Cofino (Co-founder, Afterburner Studios)
- **게임:** Dreamscaper (Action Roguelike, 3인 팀)

### 핵심 인사이트

1. **전투 필라(Pillar)의 적정 구체성:**
   - "플레이어가 강력해야 한다"는 너무 일반적 → "고도로 숙련된 느낌" / "암살자 같은 느낌"으로 1단계 구체화
   - Dreamscaper 필라: Purposeful Action / Improvisational Combat / Tough but Fair / Dynamic Interactions / Strong Feedback

2. **시스템 레이어링 (System Layering):**
   - 초기에 모든 시스템을 한번에 만들지 않음 — 기본 전투 → Early Access 피드백 → 원소 시스템 → 크리티컬 연쇄 → 패시브 아이템 순차 추가
   - 장점 3가지: 스코프 통제 / 반복 테스트 가능 / 아이디어 숙성(Soak) 시간 확보
   - 기존 옵션 수를 늘리지 않고도 옵션 간 상호작용으로 깊이 확보

3. **Hit Reaction의 전략적 활용:**
   - 6가지 상태: Stun → Stagger → Flyback → Pop-up → Knockdown → 각 상태에 추가 유틸리티
   - Flyback: 적 밀침 → 다른 적 충돌 피해 + 벽 충돌 피해
   - Pop-up: 공중 콤보(Juggle) → 착지 시 추가 피해
   - Knockdown: 주변 적에게 Splash 피해
   - Hit Reaction이 **전투 구조와 페이싱의 핵심 빌딩 블록**

4. **Game Feel 구성요소 체크리스트:**
   - Hit Flash (색상 변화)
   - Hit Stop (**115ms / ~7프레임**, 캐릭터만 정지, VFX/카메라는 계속)
   - Screen Shake (적 피격 > 플레이어 피격 강도)
   - Force Feedback (Controller Rumble)
   - Hit VFX + Damage Numbers
   - Procedural Enemy Shake (Root Bone yaw + X/Y)
   - Sound Design (무게감 있는 사운드가 X-Factor)

5. **인디 팀을 위한 실용적 조언:**
   - 점프를 의도적으로 제외(Verb 제거) — 스코프 폭발 방지
   - 고정 원거리 카메라 채택 → 상호작용 카메라 대비 스코프 대폭 감소
   - 애니메이션 12원칙 활용으로 적은 프레임에도 높은 품질감 달성
   - Blend Time 최소화: 공격 시작을 즉시 Anticipation Pose로 점프
   - 적 피격 시 블렌딩 없이 즉시 Hit Reaction 재생 → 임팩트 극대화

### 프로젝트 적용점
- 시스템 레이어링 방식으로 개발 — 기본 전투 → 원소 반응 → 빌드 시너지 순차 추가
- Hit Reaction을 전투 페이싱 도구로 활용 — Flyback으로 교전 리셋, Pop-up으로 공세 유도
- Hit Stop 115ms + Authored Curve Easing 적용
- Screen Shake 차등 적용: 플레이어 피격 시 < 적 피격 시
- Input Buffering 관대하게 설정 — 콤보 연결/회피 전환 시 입력 손실 방지
- 별도 Enemy/Environment/Breakable hitbox 분리 — 투사체가 환경에 걸리는 문제 방지

### 구체적 수치/규칙
- Hit Stop: **115ms (~7프레임, 60fps 기준)**
- Input Latency 목표: Switch에서 **130ms → 65ms**로 절반 감소
- 가속 구간: 거의 0 (즉시 최대 속도)
- Interrupt 우선순위: Dodge/Block > Attack (방어 행동은 거의 모든 상태에서 캔슬 가능)
- Parry Window: PC와 Switch에서 체감 동일하도록 플랫폼별 차등 설정

---

## 6. Breaking Barriers: Combat Accessibility in 'God of War Ragnarok'

### 발표자 / 게임
- **발표자:** Adam Doskocil (Senior Combat Designer) — Santa Monica Studio
- **게임:** God of War Ragnarok

### 핵심 인사이트

1. **접근성 = 의도하지 않은 장벽 제거:** 의도적 장벽(적 처치, 퍼즐 해결)은 유지하되, 비의도적 장벽(조작 불가, 카메라 관리 불가)을 제거하는 것이 접근성.

2. **접근성 기능 평가 3요소:**
   - Player Value (사용 볼륨 + 변혁 규모)
   - Cost (구현 난이도)
   - Design Conflict (설계 의도와의 충돌 여부)
   - 초기에는 충돌이 적은 기능부터 시작하여 자신감과 지식을 축적

3. **Enhanced Lock-on 시스템:**
   - 적 사망 시 자동 다음 타겟 획득
   - Aim 중에도 Lock-on 유지
   - 적이 Lock-on을 해제하지 못하게 변경
   - Sub-target Aim Flicking: Lock-on 상태에서 스틱 상하로 머리/다리 등 부위 조준

4. **Auto-target Camera (자동 카메라):**
   - 공격 시작 시 카메라가 자동으로 가장 가까운 적에게 회전
   - 적이 뒤에 있어도 공격하면 자동 전환
   - 운동 장애가 있는 플레이어의 피드백: "2018에서는 전투 중 방향 잡기가 어려웠는데, 이 기능 덕에 전투를 직접 극복할 수 있었다"

5. **Mini-boss Checkpoint의 교훈:**
   - 기능 위치가 중요: 일반 게임플레이 메뉴에 배치 → 의도치 않은 사용 → 전투 체감 왜곡
   - 해결: 접근성 메뉴로 이동 + 높은 난이도에서 잠금 + 사망 시 리마인더 표시
   - **접근성 기능도 Play-test를 통해 의도하지 않은 부작용을 검증해야 함**

### 프로젝트 적용점
- 접근성 기능을 난이도 옵션과 분리하여 별도 메뉴에 배치
- Auto-target Camera 옵션 제공 — 특히 모바일/웹 환경에서 카메라 조작 부담 감소
- 원거리/근거리 전환이 잦은 게임에서 Enhanced Lock-on 필수
- 보조 기능(Checkpoint, 무적 프레임 확장 등)은 opt-in 방식으로 제공하되, 의도치 않은 활성화 방지 장치 필요
- Evade Assist: 회피 무적 프레임을 접근성 옵션으로 확장 가능하게 설계

### 구체적 수치/규칙
- 회피(Evade)는 Sidestep + Full Roll 2단계, 각각 별도 i-frame 보유
- Evade Assist: 추가 i-frame 부여 (정확한 프레임 수는 접근성 레벨에 따라 조절)
- Stun Grab 대안 입력: 스틱 방향으로 자동 Stun Grab (Move Stick) — 버튼 입력 불필요

---

## 7. Authored vs. Systemic: Finding a Balance for Combat AI in Uncharted 4

### 발표자 / 게임
- **발표자:** Matthew Gallant (Combat Designer) — Naughty Dog
- **게임:** Uncharted 4: A Thief's End

### 핵심 인사이트

1. **Authored(저작) vs. Systemic(시스템적) 스펙트럼:**
   - 이전 Uncharted: 극도로 저작된 Zone 기반 AI → 높은 품질이지만 스크립팅 비용 과다
   - Uncharted 4: Systemic 극단 시도 → 일관성 부족으로 실패
   - **최종 해답: 중간 지점** — 레벨 디자이너의 의도를 구조화된 데이터로 bake하고, AI가 그 안에서 Systemic하게 행동

2. **Hard Point 시스템:**
   - Zone을 NPC에 직접 할당하는 대신, **세계에 독립적으로 존재하는 Hard Point** 오브젝트 생성
   - 속성: 이름, 영역, 최소/최대 배정 수, 활성화 토글
   - AI가 Hard Point 간 동적으로 재배정 — 증원 도착 시 기존 수비 AI가 자동으로 전진
   - 레벨 디자이너의 의도(강한 위치, 출구 수비)를 프로그래밍적으로 보존

3. **Combat Roles (전투 역할) = Pac-Man의 유령:**
   - **Engager (Blinky):** 플레이어 현재 위치로 접근하여 교전
   - **Ambusher (Pinky):** 플레이어 이동 경로 20m 전방에 매복
   - **Defender (Clyde):** Hard Point를 고수하며 방어
   - 역할 분리로 "Post Selector 범위 밖" 문제 해결 + 자연스러운 전투 레이어링

4. **Global Combat Params (전역 전투 파라미터):**
   - Encounter별 커스텀 가능한 스크립트 파일
   - 제어 항목: Engager 수(2~3), Ambusher 수(2~3), Engager 교체 딜레이, 은신 감지 거리, 수류탄 타이머, 측면 우회 경로 최소 품질, 사수 수 상한(3~4)
   - 동일 기본 AI에 Combat Params만 변경하여 전 적 유형(스나이퍼, 샷건, 중화기) 생성

5. **Search 시스템 — 열(Heat) 기반 실패, Spline Loop 성공:**
   - Heat 기반 탐색: NPC가 예측 불가능하게 방향 전환 → 플레이어가 스텔스 계획 불가
   - **해법: 레벨 디자이너가 배치한 Spline Loop를 따라 순찰** → 예측 가능한 이동 + 핵심 영역 커버

### 프로젝트 적용점
- Hard Point 시스템으로 던전/맵의 핵심 위치를 데이터화 — AI가 동적으로 배정
- Combat Roles(Engager/Ambusher/Defender) 패턴을 적 AI에 적용 — 단순 "접근 → 공격" 탈피
- Global Combat Params를 Encounter(방)별 데이터로 관리 — Item World 각 층마다 전투 느낌 차등화
- Shooter Role Token으로 동시 사격 수 제한 — 적 수와 난이도 비례 방지
- 탐색/순찰 패턴은 예측 가능하게 설계 — 스텔스 플레이를 위한 플레이어 계획 가능성 보장

### 구체적 수치/규칙
- Post Selection 반경: 타겟 중심 **25m**
- Ambush Point 생성: navmesh 따라 플레이어 **20m 전방**
- 동시 Engager: **2~3명**, Ambusher: **2~3명**
- 동시 Shooter: **3~4명** 상한
- Accuracy Ramp: 적이 플레이어를 발견한 후 **시간 경과에 따라** 정확도 상승 (거리 기반)
- 수류탄 타이머: 플레이어가 **일정 반경 내 정지** 시 카운트다운 → NPC 수류탄 투척

---

## 8. Hacking into the Combat AI of Watch Dogs 2

### 발표자 / 게임
- **발표자:** Chadwick Eclair (AI Programmer) — Ubisoft Montreal
- **게임:** Watch Dogs 2

### 핵심 인사이트

1. **Cover 표준 규격화:**
   - 아티스트/디자이너/프로그래머 합의: 일반 Cover **1m 폭, 1~1.2m 높이** / 높은 Cover **1.8m** / Dead Zone(중간) 확보
   - Cover가 시각적으로 즉시 식별 가능해야 함 — 플레이어와 AI 모두를 위해
   - Player-only Cover (난간 등)와 AI Cover 분리

2. **Cover Search 3단계:**
   - **First Cover:** 최우선은 근접 거리 — 교전 개시 시 즉시 엄폐
   - **Neighboring Cover:** 짧은 거리(~7m) 이동하여 사격 위치 변경 — 플레이어가 조준 고정하지 못하도록
   - **Second Cover:** 더 나은 사거리/보호/Line of Sight를 위해 장거리 이동

3. **Cover 평가 기준 4가지:**
   - Distance to Target (무기에 따라 최적 거리 변동)
   - Distance to Agent (이동 거리 — 너무 가깝거나 너무 멀지 않게)
   - Protection Angle (90도 정면이 최적, 비틀릴수록 노출 증가)
   - Line of Sight (Cover의 6개 사격 위치에서 타겟까지 Ray Test)

4. **Agent Exclusion Zone:** 다른 Agent 주변 일정 반경 내 Cover 금지 → 뭉침(Clumping) 방지, 범위 공격에 동시 피해 방지.

5. **Unreachable 상황 대응:**
   - 플레이어가 AI가 도달 불가능한 위치(높은 곳, Scissor Lift 등)에 있을 때의 특수 행동
   - 2회 이상 총알이 빗나가면 전투 모드 진입
   - 모두에게 수류탄 부여 (포물선으로 도달 불가 지역 공격)
   - 플레이어가 조준 중이면 Cover에서 나오지 않음 — 생존 최적화
   - 원거리에서 접근 시 직진 대신 **측면 Cover로 우회** — 측면 이동으로 피격 위험 감소

### 프로젝트 적용점
- Cover/엄폐 시스템 구현 시 표준 규격 협의 선행 — 아트/디자인/엔지니어링 합의
- Cover Search 3단계(First → Neighboring → Second) 패턴은 적 AI 행동의 기본 프레임워크
- Agent Exclusion Zone으로 적 뭉침 방지 — 범위 공격 게임에서 필수
- Unreachable 대응: 플레이어가 안전 지대를 악용하는 것을 방지하는 시스템 필요
- Pathfinding 부하 관리: 전투 시작 + 민간인 도주가 동시 발생하면 Pathfinder 과부하 → 우선순위 설정 필요

### 구체적 수치/규칙
- 일반 Cover: **1m 폭, 1~1.2m 높이**
- 높은 Cover: **1.8m 높이**
- Neighboring Cover 이동 거리: **~7m**
- Agent 간 최소 간격: Exclusion Zone 반경 (Cover 선택 시 다른 Agent 주변 제외)
- Emergency Shooting: 적이 타겟과 **너무 가까운** 거리에 도달 시 Cover 포기, 탄창 전부 소모
- 전투 Cover Search 시작: 타겟으로부터 **30m 이내** 진입 시

---

## 종합 교훈 (Cross-cutting Insights)

### 1. 보이지 않는 손(Invisible Hand)의 법칙
8개 강연 모두 공통적으로 **플레이어가 눈치채지 못하는 보조 시스템**의 중요성을 강조. Dead Cells의 Coyote Time, DOOM의 이동 속도 연동 Miss, God of War의 Suck-to-Target, Dreamscaper의 관대한 Hitbox 등. **플레이어의 의도를 읽고, 성공하도록 도와주되, 절대 알려주지 않는 것.**

### 2. Token/Role 기반 AI 제어
DOOM, God of War, Uncharted 4 모두 **Token 시스템**으로 동시 공격 수를 제한하고, **역할 기반(Role-based)** AI로 전투의 리듬과 페이싱을 제어. 적 수가 많아져도 체감 난이도는 Token/Role 파라미터로 독립 조절 가능.

### 3. Hit Reaction은 Game Feel의 핵심 인프라
DOOM의 Twitch/Falter/Stagger, Dreamscaper의 6단계 상태, God of War의 과장된 반응 등 — Hit Reaction은 단순한 피드백이 아니라 **전투 구조, 페이싱, 전략적 깊이를 결정하는 기반 시스템**. 리소스가 제한된 인디 팀도 이것만은 투자해야 함.

### 4. 난이도는 "더 많은 적"이 아니라 "시스템 파라미터 조절"
DOOM의 Accuracy Curve, Uncharted의 Global Combat Params, God of War의 Aggression Token Pool 등 — 난이도를 적 수나 HP가 아닌 **행동 파라미터(공격 빈도, 정확도, 동시 공격 수, Suck 거리)**로 조절하는 것이 핵심.

### 5. Arena/공간 설계가 전투 품질을 결정
DOOM의 Skate Park, Boss Up의 맞춤형 Arena, God of War의 Crescent Zone, Watch Dogs의 Cover 규격 등 — **전투 공간이 먼저, 적 배치가 그 다음**. 공간의 크기, 형태, 장애물이 플레이어의 속도감, 전략, 만족감을 직접 결정.

### 6. 접근성은 디자인을 강화한다
God of War Ragnarok의 접근성 기능(Auto Camera, Enhanced Lock-on)은 장애가 있는 플레이어뿐 아니라 모든 플레이어의 경험을 향상. 접근성 기능을 설계하는 과정에서 핵심 시스템의 기술적 문제가 드러나고 개선됨.

---

## 프로젝트 적용 매트릭스

| 인사이트 | 적용 시스템 | 우선순위 |
| :--- | :--- | :---: |
| Push Forward Combat (공격 = 회복) | Resource/Health Loop | P1 |
| Token 기반 동시 공격 제한 | Enemy AI System | P1 |
| Hit Reaction 다단계 상태 머신 | Combat System Core | P1 |
| Hit Stop + Screen Shake + VFX 레이어 | Game Feel Polish | P1 |
| 보이지 않는 보조 (Coyote Time, Auto-aim) | Player Controller | P1 |
| Delta of Chance (보스 공격 웨이브 곡선) | Boss/Elite Design | P1 |
| System Layering (순차적 시스템 추가) | Development Process | P1 |
| Combat Roles (Engager/Ambusher/Defender) | Enemy AI Behavior | P2 |
| Arena 비대칭 설계 + Half Wall | Level/Room Design | P2 |
| Global Combat Params (방별 전투 파라미터) | Item World Floor Config | P2 |
| Aggression Token + Crescent Zone Positioning | Enemy Positioning AI | P2 |
| Off-screen Threat Indicators | UI/HUD System | P2 |
| Accuracy Curve (이동 속도 연동 Miss) | Enemy Ranged AI | P2 |
| Hard Point (맵 핵심 위치 데이터화) | Level Design Tools | P2 |
| Input Buffering 관대 설정 | Input System | P2 |
| Cover Search 3단계 패턴 | Enemy AI (Cover-based) | P3 |
| Agent Exclusion Zone (뭉침 방지) | Enemy Positioning | P3 |
| 접근성 옵션 (Auto Camera, Evade Assist) | Accessibility Settings | P3 |
| Mini-boss Checkpoint (opt-in) | Progression System | P3 |
| 사망 시 진행도 표시 바 (Cuphead 패턴) | Death Screen UI | P3 |


**Q1: 이 프로젝트에서 Push Forward Combat 루프를 구현할 때, 자원 획득과 전투 참여를 어떤 메커닉으로 연결하면 가장 효과적일까요?**


**Q2: Item World의 각 층마다 전투 느낌을 다르게 하기 위해 Global Combat Params를 어떤 변수들로 구성하면 좋을까요?**


**Q3: 웹게임 환경에서 Hit Stop과 Screen Shake 같은 Game Feel 요소를 구현할 때, 프레임 레이트 변동에 대응하는 가장 실용적인 접근법은 무엇일까요?**
