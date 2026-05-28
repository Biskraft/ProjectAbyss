# Virtual Economies: Design and Analysis

## 기본 정보

- **제목:** Virtual Economies: Design and Analysis
- **저자:** Vili Lehdonvirta, Edward Castronova
- **출판:** MIT Press, 2014
- **ISBN:** 978-0-262-02708-4

---

## 핵심 주제

- **가상 경제의 이론적 기반:** 합리적 선택 모델, 한계 분석(Marginal Analysis), 제한된 합리성(Bounded Rationality)을 가상 경제에 적용
- **가상 재화의 가치 구조:** 기능적(Functional), 쾌락적(Hedonic), 사회적(Social) 가치의 세 축과 포지셔널 재화(Positional Goods) 개념
- **수요/공급과 시장 규제:** 경쟁 시장 모델, 가격봇(Pricebot), 시장 구조(독점/독구매/가격 바닥/가격 천장/가격 창) 설계
- **교환 메커니즘의 진화:** 개인 거래 → 장터 → 경매소 → 주식시장까지의 교환 시스템 설계 원리
- **시장 권력과 가격 전략:** 가격 차별, 번들링, 1차/2차 시장 관계, 수익화 전략

---

## 장별/섹션별 요약

### Ch.1 - 서론

가상 경제란 디지털 환경 내에서 재화와 서비스의 생산, 분배, 소비가 이루어지는 체계이다. 텐센트 Q코인 사례를 통해 가상 화폐가 통제 불가능하게 확장되는 경로를 보여주며, 가상 경제 설계의 중요성을 강조한다.

### Ch.2 - 인간 행동 이론 (Theories of Human Behavior)

**합리적 선택 모델:** 한계 효용(Marginal Utility)과 한계 비용(Marginal Cost)이 교차하는 지점이 균형. 아이스크림 소비 사례로 설명 - 첫 번째 아이스크림은 매우 가치 있지만, 세 번째는 비용이 효용을 초과한다.

**에이전트(Agent):** 가상 경제의 행위자. 사용자, 퍼블리셔(NPC), 광고주, 콘텐츠 크리에이터 등 유형별로 다른 기능 세트와 인센티브를 가진다.

**합리성의 한계:**
- **시간 선택의 비합리성:** 사람들은 미래를 비일관적으로 할인한다 (가속된 보상은 과대평가, 지연된 보상은 과소평가)
- **무관한 대안의 역설:** 관련 없는 선택지 추가가 기존 선호를 바꿈
- **프레이밍 효과:** 동일한 결과도 표현 방식에 따라 선호가 변함 (200명 생존 vs 400명 사망)
- **손실 회피:** $100 손실이 $100 이득보다 훨씬 더 크게 느껴짐

**제한된 합리성(Bounded Rationality):**
- 정보 부족, 인지적 한계, 의사결정 비용으로 인한 합리성 제한
- **만족화(Satisficing):** 최적이 아닌 "충분히 좋은" 선택
- **휴리스틱(Heuristics):** 상황별 경험 규칙 적용

**진화심리학:** 인간의 행동 패턴은 자연 선택의 결과. 경제적 선택 능력은 매우 오래된 뇌 시스템에 기반한다.

**놀이 이론:** 경제 게임이 재미있는 이유는 경제적 선택이 생존과 관련된 고대 휴리스틱을 안전하게 훈련시키기 때문이다. "경제 시뮬레이션은 전투 시뮬레이션 다음으로 재미와 즐거운 감각을 생산하는 능력이 뛰어나다."

### Ch.3 - 재화: 물질적, 디지털, 가상 (Goods)

**가상 재화 vs 정보 재화:**
- 정보 재화(mp3, 소프트웨어): 비경합적(nonrivalrous), 비배제적(nonexcludable)
- 가상 재화(게임 아이템, 가상 자동차): 경합적, 배제적으로 설계 가능 → 희소성 창출 가능
- 가상 재화는 "두 세계의 최선": 배타적 객체이면서 생산 한계비용이 0

**가상 재화의 가치 3가지 원천:**

1. **사회적 가치 (Social Markers):**
   - **지위 재화(Status Goods):** 희소성이 가치. Ultima Online의 말똥 사례 - 30,000명당 하나, 다이아몬드급 지위 상징
   - **정체성 표현:** 소유물로 사회적 정체성(고스, 이모, 호스걸 등) 표현
   - **유대 형성:** 선물과 거래가 사회적 관계를 구조화

2. **쾌락적 가치 (Hedonic):**
   - 미적 즐거움, 추억의 기념품, 공상과 환상 충족
   - 창의적 자기 표현 (Ultima Online의 피아노 제작 사례)
   - 수집의 즐거움 (EVE Online의 Entity - 9,000종 이상 아이템 수집)

3. **기능적 가치 (Functional):**
   - 게임 내 문제 해결과 필요 충족
   - "현실 세계의 대부분의 재화도 인공적으로 만들어진 문제에 대한 해결책" - 가상 재화와 근본적 차이 없음

**포지셔널 재화(Positional Goods):**
- 절대적 가치가 아닌 상대적 순위가 중요
- 설계 함의 1: 모든 아이템을 최강으로 만들면 모두 무가치해짐 → 좋은/보통/나쁜 아이템의 성좌(constellation) 설계 필요
- 설계 함의 2: 새로운 우월 아이템 도입이 기존 아이템 가치를 파괴할 수 있음

### Ch.4 - 수요와 공급 (Supply and Demand)

**공급의 법칙:** 가격이 높을수록 공급량 증가. 가상 경제에서 공급자의 비용 = 시간의 기회비용. 생산에 투입하는 시간이 늘수록 한계비용이 증가한다 (수면, 사회생활, 다른 게임 시간 희생).

**역방향 휘는 공급 곡선(Backward-Bending Supply Curve):** 극도로 높은 보상은 오히려 생산을 줄일 수 있다. 일일 로그인 보상 사례 - 보상이 너무 높으면 적은 로그인으로도 충분해져 로그인 빈도 감소.

**수요의 법칙:** 가격이 낮을수록 수요량 증가.

**균형(Equilibrium):** 수요량 = 공급량인 가격. 시장 압력이 항상 균형 가격을 향해 작동한다.

**즐거움과 시장의 관계:** 생산이 재미있으면 공급 곡선이 하방 이동 → 더 많은 생산, 더 낮은 가격. 극단적으로 생산이 너무 재미있으면 재화가 무가치해짐 → "견고한 유저간 시장을 유지하려면 판매 측이 생산에서 적은 즐거움을 경험해야 할 수 있다."

**특수화(Specialization):** 유저간 거래를 촉진하려면 자급자족이 어렵게 설계해야 한다. "농부-광부-요리사-무기장인-전사" 같은 만능 캐릭터는 경제적 상호작용을 약화시킨다.

**EVE Online 미사일 사례:** 2007년 토피도 속성 변경 후 크루즈 미사일 수요 즉시 2배, 토피도 80% 하락 → 플레이어가 합리적으로 반응한다는 증거.

### Ch.5 - 시장 규제 (Regulating Markets)

**규제의 이유:** 효율성이 아닌 콘텐츠 제공, 사용자 유지, 수익 창출이 가상 경제의 목표.

**잘못된 규제: 가격 통제법**
- Diablo III 사례: $250 가격 상한 → 고가 아이템이 비공식 시장으로 이동
- 가격 통제는 역효과: 공급 감소, 암시장 발생

**올바른 규제: 시장 구조 설계**

6가지 기본 시장 구조:

| 구조 | 판매자 | 구매자 | 용도 |
| :--- | :--- | :--- | :--- |
| 비규제(Unregulated) | 유저 | 유저 | 자유 시장의 재미, 변동성 높음 |
| 독점(Monopoly) | 퍼블리셔 | 유저 | 수익화, 예측 가능한 경험 |
| 독구매(Monopsony) | 유저 | 퍼블리셔 | 생산자 최소 보장, 위험 제거 |
| 가격 바닥(Price Floor) | 유저 | 유저+퍼블리셔 | 보조금 효과, 생산자 보호 |
| 가격 천장(Price Ceiling) | 유저+퍼블리셔 | 유저 | 소비자 보호, 가격 상한 |
| 가격 창(Price Window) | 유저+퍼블리셔 | 유저+퍼블리셔 | 시장 안정화, 양방향 제한 |

**가격봇(Pricebot):** NPC 상인 = 무제한 공급/수요를 가진 "경제적으로 바보인" 봇. 무한한 신용으로 운영되며, 받는 재화는 즉시 파괴. 가격 바닥/천장을 물리적으로 구현하는 메커니즘.

**EVE Online 트리타늄 사례:** NPC 판매 제거 → 가격 천장 제거 → 균형 가격 상승 → 채굴 활동 급증 → 자원 고갈 → 리스폰 비율 조정으로 안정화. 실시간 경제 조정의 실례.

**타겟 인구통계와 시장 구조:** MMO 코어 유저는 변동성을 감당 → 비규제 시장 적합. 캐주얼/모바일 유저는 예측 가능성 선호 → 독점/독구매 구조 적합.

### Ch.6 - 시장 권력과 가격 (Market Power and Pricing)

**가격 차별(Price Discrimination):** 동일 재화를 다른 가격에 판매.
- 1차: 개인별 최대 지불의사 가격 (실현 어려움)
- 2차: 수량 할인
- 3차: 집단별 차등 (학생 할인)
- 시간적 가격 차별: Habbo 사례 - 새 아이템은 고가, 시간 후 중고 시장에서 저가

**번들링(Bundling):** 선호가 다른 소비자들에게 묶음 상품 판매. 사과 $4/배 $2 가치인 사람과 사과 $2/배 $4인 사람 모두에게 $6 번들이 수용 가능 → 총 수익 극대화.

**2차 시장의 역할:** Amazon의 중고 서적 판매 사례 - 2차 시장이 1차 시장 잠식보다 신규 구매자 유입 효과가 클 수 있음. 재판매 가능성이 구매 위험을 줄여 총 수요 증가.

### Ch.7 - 교환 메커니즘 (Methods of Exchange)

교환 시스템의 진화:
1. **개인 거래(Personal Trade):** Ultima Online 초기 - 채팅으로 상대 찾기
2. **에스크로(Escrow):** Habbo의 거래 창 - 신뢰 문제 해결
3. **장터(Fair):** EverQuest의 자연발생적 시장 (North Freeport Market이 아닌 East Commons Tunnel에 형성 - "시장은 선악을 가리지 않는다")
4. **바자/소매점:** NPC 판매 로봇
5. **경매(Auction):** 희소 아이템의 가격 발견
6. **경매소(Auction House):** World of Warcraft의 자동화된 경매
7. **직거래소(Buyout House):** Habbo의 최저가 자동 표시
8. **거래소(Bourse):** 주식시장 수준의 양방향 주문장

### Ch.8-12 (후반부 개요)

- **비공인 실물화폐 거래:** 설계로 방지할 수 없는 시장 압력의 한계
- **비시장 배분:** 호혜성, 선물, 의무 기반 분배
- **화폐 설계:** 화폐의 기능(교환 매개, 가치 저장, 회계 단위)과 가상 화폐 설계
- **수도꼭지와 배수구(Faucets & Sinks):** 경제에 재화/화폐를 투입하고 회수하는 메커니즘
- **거시경제 관리:** 인플레이션, 통화 정책, MUDflation(아이템 가치 하락) 관리

---

## ProjectZ 시사점

### 1. 캠핑카 (The Camper Van)

- 캠핑카는 **포지셔널 재화**의 성격을 가진다. 팀 간 캠핑카 업그레이드 수준의 상대적 차이가 전략적 우위를 결정한다
- 캠핑카 파괴 시 발생하는 자원 손실은 **손실 회피(Loss Aversion)** 심리를 활용한다. $100 손실 > $100 이득이므로, 캠핑카 방어의 심리적 가치가 공격의 심리적 가치보다 높다
- 캠핑카 주변의 NPC 상점은 **가격 바닥/천장** 역할을 할 수 있다. 긴급 상황에서 기본 자원을 구매할 수 있는 안전장치 제공

### 2. 자원 기반 총기 제작 (Gun Crafting)

- Scrap Parts → 총기 제작은 **공급 곡선의 직접적 구현**이다. 자원이 풍부할수록 더 좋은 총기 제작이 가능하지만, 시간과 위험의 기회비용이 증가한다
- 총기의 가치는 **포지셔널**이다. 절대적 수치보다 상대 팀 총기 대비 상대적 성능이 중요. 모든 총기를 동일하게 강화하면 무의미 → 좋은/보통/나쁜 총기의 성좌 설계 필요
- 총기 레시피는 **번들링 원리**를 적용할 수 있다. 다양한 자원 조합이 필요한 레시피는 자원의 교환 가치를 높인다

### 3. 자원 기반 전략 플레이 (Resource Strategy)

- 매치 내 경제는 **비규제 시장(유저간 거래 없음) + 수도꼭지/배수구** 모델이다. 자원 생성(수도꼭지)은 맵 내 스폰, 자원 소비(배수구)는 총기 제작과 팀 업그레이드
- **특수화 원칙** 적용: Tech Unit이 팀 전용이라는 규칙은 개인과 팀 간의 "특수화"를 강제한다. 개인은 Scrap Parts로 무장, 팀은 Tech Unit과 Core Module로 업그레이드
- Core Module의 희소성은 **EVE Online 트리타늄** 패턴과 동일하다. 중앙 지역에 집중 배치하면 "위험 대비 보상" 공급 곡선이 자연스럽게 형성된다
- **역방향 휘는 공급 곡선 경계**: Core Module 보상이 지나치게 높으면 "한 번 큰 거 하나 먹으면 됨" 심리로 오히려 적극적 플레이 감소 가능

### 일반 적용

- **수도꼭지/배수구 균형**: 매치 내 자원 투입(스폰 속도, 위치)과 소비(제작 비용, 소모 속도)의 균형이 매치 리듬을 결정한다
- **프레이밍 효과**: 동일한 자원 비용이라도 "50 Scrap Parts 소비"보다 "기본 총기 + 20 Scrap Parts 업그레이드"로 표현하면 수용성이 높아진다
- **만족화 설계**: 모든 플레이어가 최적 전략을 찾지 않는다. "충분히 좋은" 총기 조합이 빠르게 발견되어야 진입 장벽이 낮아진다
- **가상 재화 가치의 3축**: ProjectZ의 총기/가젯은 기능적(성능) + 쾌락적(외형, 제작 만족감) + 사회적(팀 기여도 과시) 가치를 모두 제공해야 한다

---

## 핵심 인용/개념

> "Economic simulation is second only to combat simulation in its ability to produce fun and other pleasurable sensations."

> "If you want to encourage economic interaction that leads to social interaction, you might want to make it harder for people to supply everything for themselves."

> "Creating a robust user-to-user market may require that users on the selling side experience little joy from production unless the goods are very hard to produce or the demand is massive."

> "The most effective way to bend a virtual market to your will is through market structure." (시장 구조가 가격 통제보다 효과적)

> "When demand quantity exceeds supply quantity, price pressure is upward. When supply quantity exceeds demand quantity, price pressure is downward."

> "Designing the most valuable virtual goods line-up is not simply a matter of maxing out all the attributes of every item. If you did that, then all the goods would be on the same rank and none of them would be valuable."

> "Markets don't care if their users are good or evil or something in between, as long as they do business." (EverQuest 장터 형성 사례)

**핵심 수치/사례:**
- EVE Online 미사일: 속성 변경 후 크루즈 미사일 가격 2배, 토피도 80% 하락
- Ultima Online 말똥: 30,000명당 1개, 다이아몬드급 지위 상징
- EVE Online 트리타늄: NPC 가격 천장 제거 후 25% 상승, 리스폰 조정 후 25% 하락
- "I Am Rich" 앱: $999.99, 8개 판매 후 삭제 → 가격이 유틸리티를 만드는 역전 사례

**핵심 프레임워크:**
- 가상 재화 가치의 3축: 기능적 / 쾌락적 / 사회적
- 6가지 시장 구조: 비규제, 독점, 독구매, 가격 바닥, 가격 천장, 가격 창
- 수요/공급 균형 모델
- 가격봇(Pricebot) 메커니즘
- 수도꼭지/배수구(Faucets & Sinks)
- 포지셔널 재화 설계 원칙
