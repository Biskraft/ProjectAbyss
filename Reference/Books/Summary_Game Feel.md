# Game Feel: A Game Designer's Guide to Virtual Sensation

## 기본 정보

- **제목:** Game Feel: A Game Designer's Guide to Virtual Sensation
- **저자:** Steve Swink
- **출판:** Morgan Kaufmann Publishers (Elsevier), 2009
- **ISBN:** 978-0-12-374328-2

---

## 핵심 주제

- **게임 필(Game Feel)의 정의와 분류:** 실시간 제어, 시뮬레이션 공간, 폴리시(Polish)라는 세 가지 구성 요소로 게임 필을 정의하고 분류하는 체계
- **인간 지각과 상호작용:** 인간의 지각 처리기(Perceptual, Cognitive, Motor Processor)와 240ms 교정 주기(Correction Cycle)를 기반으로 실시간 제어가 성립하는 조건 분석
- **게임 필 측정 메트릭:** 입력(Input), 반응(Response), 맥락(Context), 폴리시(Polish), 메타포(Metaphor), 규칙(Rules)의 6가지 측정 축
- **실용적 사례 분석:** Asteroids, Super Mario Brothers, Bionic Commando, Super Mario 64 등의 게임을 메트릭 기반으로 역공학 분석
- **게임 필 원칙:** 좋은 느낌의 게임을 만들기 위한 일반 원칙과 미래 전망

---

## 장별/섹션별 요약

### 1부: 게임 필 정의 (Ch.1-4)

**Ch.1 - 게임 필 정의:**
게임 필은 "시뮬레이션 공간 안에서 가상 객체를 실시간으로 제어하며, 상호작용이 폴리시로 강조되는 것"으로 정의된다. 세 가지 구성 요소:

1. **실시간 제어(Real-Time Control):** 플레이어와 게임 간의 끊김 없는 제어 흐름. 대화보다는 자동차 운전에 가까운 경험
2. **시뮬레이션 공간(Simulated Space):** 충돌 감지와 반응, 레벨 디자인을 통한 물리적 상호작용의 맥락
3. **폴리시(Polish):** 기저 시뮬레이션을 변경하지 않으면서 상호작용을 인위적으로 강화하는 효과(파티클, 사운드, 카메라 셰이크 등)

게임 필의 5가지 경험:
- 제어의 미학적 감각
- 기술 학습/숙달의 즐거움
- 감각의 확장
- 정체성의 확장
- 게임 내 고유 물리적 현실과의 상호작용

**Ch.2 - 인간 지각과 게임 필:**
Model Human Processor를 기반으로 한 지각 분석:
- 지각 처리기: 100ms (50-200ms)
- 인지 처리기: 70ms (30-100ms)
- 운동 처리기: 70ms (25-170ms)
- 총 교정 주기: 약 240ms

컴퓨터가 유지해야 하는 3가지 임계치:
1. 운동 인상: 10fps 이상 (20-30fps 권장)
2. 즉각 반응: 100ms 이내 (50ms면 즉각적으로 느낌)
3. 연속성: 100ms 이하의 일관된 주기

지각의 5가지 함의:
- 지각은 행동을 요구한다
- 지각은 기술이다
- 지각은 사고, 일반화, 오해를 포함한다
- 지각은 전신 경험이다
- 도구는 신체의 확장이 된다

**Ch.3 - 게임 필 상호작용 모델:**
플레이어, 근육, 입력장치, 컴퓨터, 게임 월드, 출력장치, 감각 기관, 의도를 포함하는 종합 모델. 지각장(Perceptual Field)이라는 개념으로 과거 경험, 태도, 일반화가 현재 지각에 미치는 영향을 설명한다.

**Ch.4 - 게임 필의 메커닉:**
개별 메커닉(단일 상호작용 루프) 단위로 게임을 분해하여 실시간 제어 여부를 판별한다. Street Fighter II, Prince of Persia, Guitar Hero, Kirby: Canvas Curse 분석.

### 2부: 게임 필 측정 (Ch.5-11)

**Ch.5 - 직감을 넘어: 게임 필 메트릭:**
6가지 측정 요소 정의:
1. **입력(Input):** 입력장치의 물리적 구성이 게임 필에 미치는 영향
2. **반응(Response):** 시스템이 입력을 처리하고 반응하는 방식
3. **맥락(Context):** 시뮬레이션 공간과 레벨 디자인이 실시간 제어에 의미를 부여하는 방식
4. **폴리시(Polish):** 물리적 현실의 인상을 인위적으로 강화하는 효과
5. **메타포(Metaphor):** 게임의 표현과 처리가 플레이어 기대를 변화시키는 방식
6. **규칙(Rules):** 추상화된 변수 간의 자의적 관계가 도전과 제어 감각을 변경하는 방식

소프트 메트릭(주관적 경험)과 하드 메트릭(정량적 데이터)을 모두 활용한다.

**Ch.6 - 입력 메트릭:**
입력장치를 미시적(개별 입력), 거시적(장치 전체), 촉각적(물리적 느낌) 수준에서 분석. 이산형/연속형 입력, 운동 유형, 감도, 경계, 신호 형식 등을 측정한다. 버튼은 2가지 상태, 트리거는 4-5가지 상태, 썸스틱은 거의 무한한 상태를 가진다.

**Ch.7 - 반응 메트릭:**
입력 신호를 게임 파라미터에 매핑하는 방식 분석. ADSR(Attack-Decay-Sustain-Release) 엔벨로프, 직접/간접 매핑, 파라미터 간 관계 분석.

**Ch.8 - 맥락 메트릭:**
고수준(공간, 속도, 운동의 전체적 인상), 중수준(객체 간 간격), 저수준(충돌의 촉각적 느낌) 세 수준으로 분류.

**Ch.9 - 폴리시 메트릭:**
폴리시 효과 유형: 애니메이션, 시각 효과, 사운드 효과, 시네마틱 효과(스크린 셰이크, 슬로모션), 촉각 효과(컨트롤러 진동). 디즈니 애니메이션 원칙(Squash & Stretch 등)이 게임에도 직접 적용됨. 사운드 효과만으로 물리적 인상을 완전히 바꿀 수 있다. Gears of War와 Dawn of Sorrow의 상세 비교 분석.

**Ch.10 - 메타포 메트릭:**
플레이어의 기대가 제어되는 것의 시각적 표현에 의해 형성됨. 동일한 시스템이라도 차를 뚱뚱한 사람으로 바꾸면 느낌이 완전히 달라짐.

**Ch.11 - 규칙 메트릭:**
고수준 목표(점수, 별 수집), 중수준 규칙(깃발 보유), 저수준 규칙(적 파괴 난이도)이 게임 필에 미치는 영향.

### 3부: 실용적 예제 (Ch.12-16)

**Ch.12 - Asteroids:**
추력과 회전의 분리가 핵심. 추력 벡터가 함선 속도를 덮어쓰지 않고 더해지는 것이 특유의 "떠다니는" 느낌을 만든다. 낮은 감쇠력, 화면 감싸기, 위험 요소가 의미를 부여한다.

**Ch.13 - Super Mario Brothers:**
NES 컨트롤러의 단순함 속에서 가속/감속을 통한 관성, 공중 제어의 감소, 점프 높이의 버튼 유지 시간 비례 등이 결합되어 직관적이지만 깊은 제어 체계를 형성한다. 미야모토의 직관적 감성 설계 접근법.

**Ch.14-16:** Bionic Commando, Super Mario 64, Raptor Safari 분석.

### 4부: 게임 필 원칙과 미래 (Ch.17-19)

좋은 느낌의 게임을 만들기 위한 일반화된 원칙과 입력 장치, 렌더링 기술의 미래 전망.

---

## ProjectZ 시사점

### 1. 캠핑카 (The Camper Van)

- 캠핑카의 **물리적 존재감**을 전달하려면 폴리시가 핵심이다. 무거운 차체의 충돌, 흔들림, 엔진 소리, 파티클(먼지, 연기) 등을 통해 "이것은 진짜 큰 물체다"라는 인상을 만들어야 한다
- 캠핑카 주변에서의 제어 감각은 **맥락 메트릭**과 직결된다. 캠핑카 근처의 밀집된 공간은 긴장감을, 넓은 공간은 안도감을 줄 수 있다
- 캠핑카에 탑승/하차 시 제어 체계가 변화하면서 "가상 신체 공간"이 변화하는 경험을 제공할 수 있다

### 2. 자원 기반 총기 제작 (Gun Crafting)

- 제작한 총기마다 **고유한 게임 필**을 가져야 한다. 반응 매핑(ADSR 엔벨로프), 폴리시(반동, 발사 효과음, 카메라 셰이크), 메타포(시각적 형태에 따른 기대치)가 각기 다르게 설계되어야 한다
- 무거운 총 vs 가벼운 총의 느낌 차이는 **반응 속도**, **화면 흔들림 강도**, **사운드의 저음/고음** 차이로 전달 가능
- 240ms 교정 주기 내에서 즉각적인 사격 반응(50-100ms)이 필수. 이 임계치를 넘으면 "반응이 느리다"는 피드백 발생

### 3. 자원 기반 전략 플레이 (Resource Strategy)

- 자원 수집/소비 행위에도 **게임 필**이 존재한다. Scrap Parts를 주울 때의 사운드, 파티클, 촉각 피드백이 수집의 만족감을 결정한다
- 규칙 메트릭 관점: 자원의 **자의적 관계**(Core Module이 100개 = 팀 업그레이드 1회)가 자원에 의미와 가치를 부여한다. Mario의 코인-별 관계와 동일한 원리
- 자원 부족 상황에서의 제어 감각 변화: 탄약이 부족할 때 더 조심스러운 움직임, 풍부할 때 공격적 움직임 유도

### 일반 적용

- **50-100ms 응답 시간** 목표로 TPS 입력 시스템 설계 (스윙크가 말하는 "tight and responsive" 범위)
- 30fps 이상 유지 필수, 프레임 드롭은 게임 필의 근본적 파괴
- **일관된 물리 규칙**: 세계관 내 물리 법칙이 자기모순 없이 일관되어야 함. "단순하지만 일관된 세계가 복잡하지만 불일관한 세계보다 낫다"
- 폴리시의 **계층적 설계**: 개별 효과 -> 지각 그룹 -> 추론되는 물리적 속성 순서로 설계

---

## 핵심 인용/개념

> "Game feel is the tactile, kinesthetic sense of manipulating a virtual object. It's the sensation of control in a game."

> "Real-time control of virtual objects in a simulated space, with interactions emphasized by polish."

> "If all polish were removed, the essential functionality of the game would be unaltered, but the player would find the experience less perceptually convincing and therefore less appealing."

> "Perception requires action. ... The thing being controlled in the game becomes your surrogate body, your hands."

> "A consistent abstraction is so much more important than a detailed one."

> "Better to have a simple, tight, cohesive world like Dig Dug than a weird, inconsistent world like Jurassic Park: Trespasser."

> "People are going to figure out everything about your world either way... better to make it simple and self-consistent than a broad inchoate mess."

> "The separation of thrust from rotation is the most important part of the feel of Asteroids." (추력과 회전의 분리가 게임 필의 핵심 관계를 결정한다는 실례)

> "Sound can completely change the perception of an object in a game." (사운드만으로 물체의 물리적 인상이 완전히 바뀐다)

**핵심 수치:**
- 지각 교정 주기: 240ms
- 즉각 반응 느낌: 50ms 이내
- 눈에 띄지만 무시 가능한 지연: 100ms
- 느린 느낌 시작: 200ms
- 실시간 제어 붕괴: 240ms 초과
- 모션 환상 최소: 10fps, 원활: 30fps 이상
