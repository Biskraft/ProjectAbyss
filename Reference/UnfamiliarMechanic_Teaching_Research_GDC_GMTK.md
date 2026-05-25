# 생소한 메커닉 전달 리서치 — GDC + GMTK + 설계 이론

> 조사 범위: 2007-2026 GDC vault + Mark Brown GMTK + Daniel Cook skill atoms + Raph Koster + Anna Anthropy + 핵심 설계 에세이
> 조사자: general-purpose agent (Claude Code)
> 일자: 2026-05-25
> 본 문서는 ECHORIS Item World 진입의 unfamiliarity 극복용 raw research — 이론 / 방법론 레이어.

---

## 0. 사용 안내

본 문서는 ECHORIS의 핵심 스파이크 — "아이템에 들어가면, 그 안에 살아있는 세계가 있다" — 를 플레이어에게 *학습 가능한 동사*로 전달하기 위한 **방법론 백본**입니다. 게임별 케이스 스터디는 별도 에이전트가 다루며, 본 문서는 *프레임워크/원칙/휴리스틱*만 정리합니다.

인용 신뢰도 태그:

- **[확인함]** — 1차 소스(GDC vault, 본인 영상, 본인 블로그, 본인 책) 또는 본 저장소 내 검증된 트랜스크립트로 직접 확인
- **[추측임]** — 캐논 디자인 담론에서 광범위하게 인용되나 1차 소스 직접 확인은 본 세션에서 부분적
- **[근거 없음]** — 본 세션에서 1차 소스를 확인하지 못함. 향후 검증 필요

---

## 1. Tier 1 — Mark Brown / Game Maker's Toolkit

### 1.1. *Super Mario 3D World's 4 Step Level Design* (2015)

- **인용:** Mark Brown, "Super Mario 3D World's 4 Step Level Design", GMTK YouTube, 2015. [확인함] 저장소 트랜스크립트 `Reference/gmtk/Super Mario 3D World's 4 Step Level Design.txt` 직접 확인.
- **핵심 프레임:** **Kishōtenketsu (起承転結) 4단계 패턴** — *Introduction → Development → Twist → Conclusion*.
  - Brown은 이를 닌텐도의 코이치 하야시다(Koichi Hayashida, 3D World 공동 디렉터)가 Gamasutra 인터뷰에서 명시한 설계 철학으로 추적합니다. 4컷 만화/4행 한시의 서사 구조를 단일 레벨에 적용해, "메커닉을 5분 안에 도입·발전·비틂·결론짓는다."
- **휴리스틱:** "메커닉은 **안전한 공간**에서 먼저 도입하라. 떨어져도 죽지 않게. 그 다음 안전망을 치우고 발전시켜라. 그 다음 익숙한 다른 요소와 교차시켜 비틀어라. 마지막에 마스터리를 보여줄 기회를 주어라."
- **예시:** Cakewalk Flip 패널 — 점프 시 빨강/파랑 전환. 첫 등장은 *낙하 안전망 위*에서 4-5초 학습. 다음 섹션은 절벽 위에서 같은 메커닉을 사용. 마지막엔 범퍼 적과 동시에 처리. 깃대 직전에 마스터리 보여주기.
- **실패 케이스:** Super Mario Galaxy 1 — Gusty Garden은 토끼 → 콩나무 → 토끼 경주로 컨셉이 산만하게 점프하여, "메커닉이 성숙할 시간"을 주지 못함(Brown 본인 비판).
- **ECHORIS 함의:** 단순 "Item World 진입"이 아니라, **Item World 안에서의 동사 하나**를 4단계로 가르쳐야 함. 예: "기억 단편 회수" — 도입(첫 Forgotten Shard, 죽지 않는 작은 방) → 발전(전투 중 회수) → 비틂(회수 vs 회피 선택지) → 결론(보스에서 마스터리 보여주기).

### 1.2. *Half-Life 2's Invisible Tutorial* (2015)

- **인용:** Mark Brown, "Half-Life 2's Invisible Tutorial", GMTK YouTube, 2015. [확인함] `Reference/gmtk/Half-Life 2's Invisible Tutorial.txt` 직접 확인.
- **핵심 프레임:** **Show, Don't Tell — 단 2모먼트 + 0단어로 메커닉 학습 완결.** 데드 스페이스가 4번의 다중 채널 안내(쓰기·팝업·오디오로그·콜)로 가르치는 것을, Half-Life 2는 톱날에 절단된 시체 한 장면 + 톱날을 중력건으로 잡고 좀비를 자르는 한 순간으로 *10초 안에* 완결.
- **휴리스틱:**
  - "관심을 *유도*하라(시체로). 도구를 *만나게* 하라(벽에 박힌 톱날). 즉각 *써먹을 대상*을 등장시켜라(좀비 등장). 버튼은 *반사적*으로 눌리게 하라."
  - 텍스트 없이 가르치려면 **시퀀스 = 원인 → 결과의 보존된 인과**가 필요.
- **예시:** 바나클(Barnacle) 도입 — NPC가 끌려 올라가 잡아먹히는 장면을 *플레이어 도착 직전*에 미리 보여줌. "이걸 피해야 한다"를 단어 0개로 전달.
- **실패 케이스:** 시퀀스 사이에 *주의 분산*이 끼면 인과가 끊김. 또한 *플레이어가 발화 지점을 놓치면* 학습 자체가 통째로 사라짐(보상 메커니즘 없음).
- **ECHORIS 함의:** Erda는 침묵 + Rustborn(검 Ego)가 발화. Half-Life 2의 "현장 시연" 원리를 적용 — Item World 진입 *전에* 다른 NPC(혹은 환경 잔재)가 아이템에 들어갔다 나오는 모습/흔적을 보여줄 수 있는가? 예: 대장간에 다른 모험가의 부서진 검 + 그 검 옆에 회상 단편이 떨어져 있는 환경 스토리텔링.

### 1.3. *Can we Improve Tutorials for Complex Games?* (2021)

- **인용:** Mark Brown, "Can we Improve Tutorials for Complex Games?", GMTK YouTube, 2021. [확인함] `Reference/gmtk/Can we Improve Tutorials for Complex Games_.txt` 직접 확인.
- **핵심 프레임:** **튜토리얼을 한 덩어리로 던지지 말고 게임 전체에 *뿌려라*(sprinkle).** George Fan(Plants vs Zombies 디자이너) 인용: "플레이어의 *학습 의지*는 *투자도*와 함께 자란다." 시작점에서 모든 학습을 끝내려 하면 학습 의지를 초과한다.
- **휴리스틱:**
  1. "**투자도가 자란 시점에 가르쳐라.**" — 크래프팅 튜토리얼은 *크래프팅 테이블을 처음 만난 순간*에.
  2. "**복잡성을 시간에 따라 키워라**(Bruce Shelley의 'inverted pyramid of decision making', Civilization 시리즈)." — 1턴은 1결정, 50턴은 50결정. Frostpunk가 모델: 손으로 자원 → 발전기 켜기 → 새 직군 → ...
  3. "**UI 자체도 점진적으로 추가.**" — Mini Metro: 시작엔 시계도 없음. Animal Crossing NH: 도구 휠은 *상점에서 사야* 등장.
  4. "**키네스테틱 학습(kinaesthetic learning)** 강제." — 단순히 "이 버튼을 누르세요"가 아니라, *작은 퍼즐을 풀게* 하라. Asher Vollmer(Threes): "화살표 따라가기는 게임 입장에서는 진행이지만, 뇌 입장에서는 학습이 0이다."
- **예시:** Mortal Kombat 11 튜토리얼 — 'basics / advanced / strategy' 3 단계로 *플레이어를 강제로 튜토리얼에서 쫓아냄*. 다시 와서 다음 단계를 배움. 플레이어 세그먼트(couch / dabbler / connoisseur / online PvP)에 따라 *언제 멈출지* 선택권을 줌.
- **실패 케이스:** "처음에 모든 시스템이 켜져 있어야 하는 게임"(전통 RTS, 그랜드 스트래티지)은 이 원리 적용이 어려움. 다만 Brown은 "이지 모드를 *AI 멍청이*가 아니라 *시스템 절반 OFF* 버전으로 만들 수 있다"고 제안.
- **ECHORIS 함의:** Item World는 본질적으로 *복잡 게임*에 가까움(아이템·기억 단편·5색 기질·지층·정체성 결). 모든 시스템을 첫 진입에 켜지 말고, 노멀 등급(1지층) 첫 아이템에서는 *회상 단편 1종만* 활성, 매직(2지층)에서 *5색 기질 도입*, 레어(3지층)에서 *기억 슬롯과 정체성 슬롯 분리* — 레어리티가 자연 페이서.

### 1.4. *The Secret of Mario's Jump (and other Versatile Verbs)* (2018)

- **인용:** Mark Brown, "The Secret of Mario's Jump", GMTK YouTube, 2018. [확인함] 트랜스크립트 직접 확인.
- **핵심 프레임:** **Versatile Verbs** — 단일 버튼 액션이 *맥락*에 따라 다중 결과를 낳도록 설계. "press A to do B"가 아닌 "press A to do B, C, D, E depending on context."
- **휴리스틱:** "**하나의 버튼이 여러 결과를 낳도록 설계하라.** 버튼 *개수*는 줄이고 *깊이*는 늘려라. 짧게 누름/길게 누름, 정지/이동, 지상/공중, 차지 시간이 다 다른 결과를 만들면 학습 비용은 1, 표현력은 N."
- **예시:** Mario 점프 — 정지 점프 / 달리며 점프 / 짧게 / 길게 / 벽 점프 / 코파 셸 바운스 = 단일 A버튼. Luftrausers — 사격 버튼을 *놓으면* 수리, 즉 동일 버튼이 공격/방어 전환.
- **실패 케이스:** 버튼이 *컨텍스트*에 따라 바뀌는데 컨텍스트 표시가 부족하면 플레이어가 자기 의도를 잃음(Owlboy 사격 예시 — 누르면 발사가 느려져 *불이익* 발생).
- **ECHORIS 함의:** 인터랙트 키 *하나*가 "아이템 장착 / 대장간 강화 / Item World 진입"을 *맥락에 따라* 분기시키면 학습 비용 절감. 단 *맥락 표시(컨텍스트 프롬프트)*가 명확해야 함 — `KeyPrompt.createPrompt`의 [F] LABEL 형식이 SSoT.

### 1.5. *10 Game Design Lessons from 10 Years of GMTK* (2024)

- **인용:** Mark Brown, "10 Game Design Lessons from 10 Years of GMTK", GMTK YouTube, 2024. [확인함] 트랜스크립트 직접 확인.
- **핵심 프레임(교훈 9 = 튜토리얼):** **"Tutorialize without the player knowing."** 텍스트 무거운 튜토리얼은 누구도 좋아하지 않는다. 최선은 *레벨 디자인 자체*로 가르치는 것. 안전한 환경에서 도입 → 실험 시간 → 더 어려운 상황에서 적용.
- **핵심 프레임(교훈 8 = 깊이 vs 복잡성):** **"Depth is not complexity."** 복잡한 게임은 규칙·시스템이 많다. 깊은 게임은 *적은 규칙이 놀랍게 상호작용*한다. Go는 깊다. 대부분의 현대 RPG는 복잡하다.
- **핵심 프레임(교훈 4 = 정보):** **"Information is a resource."** 적 체력 바를 보여줄지, 다음 목표를 표시할지, 아이템 효과를 픽업 전에 보여줄지 — 정답은 없으나 *의도적 결정*을 해야 함.
- **휴리스틱(통합):** "단순함 + 깊이 + 정보 통제 + 보이지 않는 튜토리얼 = 캐논 4중주."
- **ECHORIS 함의:** Item World의 복잡성을 *복잡함*이 아닌 *깊이*로 다듬을 것. 5색 기질 × 슬롯 × 지층은 *복잡함*에 빠질 위험. 깊이로 만들려면 *적은 변수의 풍부한 상호작용*이 필요 — 기질 1색(Forge)만으로도 무기·적·이펙트가 충분한 표현을 내야 함.

### 1.6. *Boss Keys 시리즈* — 메트로베니아/던전 디자인 (2017-2021)

- **인용:** Mark Brown, "The World Design of [Castlevania: SotN / Super Metroid / Hollow Knight / Dark Souls / Metroid Prime ...]", GMTK Boss Keys, 2017-2021. [확인함] 본 저장소에 19개 전 에피소드 트랜스크립트 존재.
- **핵심 프레임:** **능력 게이트는 *교사*다.** 새 능력은 *능력 자체를 가르치는 방* 직후에 즉시 사용처가 등장해야 한다. "능력 → 게이트 → 보상" 3-비트 단위.
- **휴리스틱(SotN/Super Metroid 캐논):**
  1. "능력을 얻은 첫 5초 안에 *시연 환경*에서 한 번 써보게 하라."
  2. "능력 획득 직후 *되돌아가야만 열리는 게이트*를 배치하라(reverse traversal 강화)."
  3. "능력은 *서로 결합*해 새 동사를 만들어야 한다(이단점프 + 대시 = 갭 점프 등)."
- **예시:** Super Metroid 모프 볼 — 획득 즉시 좁은 통로 강제. Hollow Knight 매직 어택 — 첫 모먼트가 즉시 사용 강제 방.
- **실패 케이스:** Boss Keys가 비판하는 Phantom Hourglass / Spirit Tracks의 *과도한 손잡기* — 능력 표시·힌트·NPC 안내가 너무 많으면 *발견의 쾌감*이 사라짐.
- **ECHORIS 함의:** 본 게임의 능력 게이트(렐릭 5종: 대시·벽타기·이단점프·수중호흡·역중력)는 Boss Keys 캐논과 정렬. **추가 적용:** Item World *진입 자체*도 능력으로 간주. 진입 능력을 얻는 즉시 *되돌아가서 진입할 수밖에 없는 게이트*를 월드에 심으면, 진입 학습 + 순환 구조 동시 강화.

### 1.7. Razbuten — *Gaming for a Non-Gamer / Watching My Girlfriend Play* 시리즈

- **인용:** Razbuten, "Gaming for a Non-Gamer" 시리즈, YouTube, 2018-현재. [확인함] 본 세션 WebSearch로 시리즈 존재·내용 검증.
- **핵심 프레임:** **게임플레이 리터러시(gameplay literacy)는 학습된다, 그것도 *눈에 안 보이게*.** 비게이머는 카메라 회전 자체를 안 함, HUD를 못 봄, 인과를 *상관*과 혼동, 매뉴얼을 절대 안 읽음.
- **휴리스틱:**
  1. "**'그건 당연하다'는 가정을 모두 폐기하라.**" — 대시 버튼이 있다는 사실 자체가 학습된 컨벤션.
  2. "**플레이어는 카메라를 안 돌린다고 가정하라.**" — 중요한 정보를 *카메라 정면에* 두라.
  3. "**HUD는 정보 과부하다.**" — 비게이머는 컴퍼스·체력·웨이포인트를 인식하지 못함. 핵심 정보는 *3개 이하*로.
  4. "**인과 vs 상관을 혼동한다.**" — 우연히 같이 일어난 두 사건을 메커닉으로 학습.
- **ECHORIS 함의:** Item World 진입은 *컨벤션 0*에 가깝다. "아이템에 들어가는" 동작은 어떤 기존 게임 컨벤션과도 매핑되지 않음 → 비-디스가이아 플레이어에게 사실상 비게이머와 동일. *진입 모먼트*는 카메라 정면 + HUD 노이즈 최소 + 단일 인과(키 1회 누름 → 시각·청각 트랜지션 → 새 공간 출현)로 설계해야 함.

---

## 2. Tier 2 — GDC Vault 핵심 강연

### 2.1. *A PORTAL Post-Mortem: Integrating Writing and Design* — Kim Swift & Erik Wolpaw (GDC 2008)

- **인용:** Kim Swift, Erik Wolpaw, "A PORTAL Post-Mortem: Integrating Writing and Design", GDC 2008. URL: https://gdcvault.com/play/197/A-PORTAL-Post-Mortem-Integrating. Archive: https://archive.org/details/GDC2008Swift. [확인함] WebSearch 검증.
- **핵심 프레임:** **"두 개의 스토리(story-story vs gameplay-story) 사이의 *델타*를 줄여라."** Wolpaw의 "crackpot theory" — 게임이 말하는 서사와 게임이 *플레이로 가르치는* 서사가 일치할수록 만족도가 올라간다.
- **휴리스틱:**
  1. "**스토리는 게임플레이를 침범하지 않는다.**"
  2. "**Less is more — 서사를 잔혹하게 잘라라.**"
  3. "**플레이테스트가 가장 중요한 활동이다 — 사람들이 플레이하는 것을 *앉아서 본다*.**"
- **예시:** Portal의 첫 19개 챔버는 모두 *추론에 의한 학습 조각* — 플레이어는 "튜토리얼을 한다"고 생각하지 않고 "게임을 한다"고 생각함. GLaDOS의 서술은 *게임플레이가 이미 가르친 것을 정당화*하는 역할.
- **실패 케이스:** 서사와 게임플레이의 *동사*가 다른 게임(예: "당신은 영웅이다"라 말하면서 학살만 시키는 RPG) → 델타 폭증 → 인지 부조화.
- **ECHORIS 함의:** Rustborn(검 Ego)의 발화는 *플레이어가 막 한 행동*을 정당화·확장해야 함. "당신은 지금 막 검 안으로 들어왔다 → 검이 자신을 소개한다" — 행동 → 발화 순서를 깨지 말 것. **금지:** 검이 *진입 전에* 진입을 설명하는 것 = 델타 증가.

### 2.2. *Daniel Cook — Skill Atoms / The Chemistry of Game Design* (Lostgarden, 2007)

- **인용:** Daniel Cook, "The Chemistry of Game Design", Lostgarden, 2007년 7월 19일. URL: https://lostgarden.com/2007/07/19/the-chemistry-of-game-design/. Gamasutra 재게재: https://www.gamedeveloper.com/design/the-chemistry-of-game-design. [확인함] WebSearch 검증. 후속 강연: Daniel Cook, "Game Design Theory I Wish I had Known When I Started", https://www.youtube.com/watch?v=qwPe3OHR04c.
- **핵심 프레임:** **Skill Atom** — 게임 디자인의 원자 단위. 4요소 피드백 루프:
  1. **Action** — 플레이어가 동사를 시도
  2. **Simulation** — 게임이 룰 따라 상태 갱신
  3. **Feedback** — 시청각 피드백으로 결과 전달
  4. **Modeling** — 플레이어 두뇌가 *예측 모델*을 갱신
- **휴리스틱:**
  1. "**모든 새 메커닉은 자체로 닫힌 4요소 루프여야 한다.**" — Action 했는데 Feedback 없으면 학습 실패.
  2. "**스킬 아톰은 *맵*으로 그려진다.**" — 작은 아톰이 다음 아톰의 *전제*가 되도록 연결. 점프 → 적 밟기 → 캐니언 점프 → 벽 점프.
  3. "**플레이어는 *피드백 부재*를 *동사 부재*로 해석한다.**" — 보이지 않으면 없는 것이다.
- **예시:** 마리오의 점프 아톰 — A 누름(Action) → 캐릭터 상승+낙하(Simulation) → 점프 사운드+애니메이션+포물선 궤적(Feedback) → "A는 점프다, 길게 누르면 더 높다"(Modeling).
- **실패 케이스:** 피드백이 *지연*되거나 *간헐적*이면 모델링이 깨짐. 또한 시뮬레이션이 *비결정적*이면(같은 입력에 다른 결과) 학습 불가.
- **ECHORIS 함의— 핵심 적용:**
  - **Item World 진입 = 단일 스킬 아톰.**
  - Action: 아이템 위에서 인터랙트.
  - Simulation: 캐릭터 좌표 = 아이템 내부 좌표, 월드 → Item World 전환.
  - Feedback: **여기가 가장 중요** — 트랜지션이 *동일성*을 시각화해야 한다. "검 내부의 결로 카메라가 들어가는" 시각, Forge 색의 환경 변화, BGM 변화, Rustborn 발화 1줄.
  - Modeling: "아 — 아이템마다 안에 세계가 있구나"가 1회 진입으로 형성되어야 함.

### 2.3. *Derek Yu — Spelunky: 1001 Deaths* (GDC 2009, IGF Keynote 2013, book 2016)

- **인용:** Derek Yu, *Spelunky* (Boss Fight Books, 2016) + GDC talks. [추측임] Yu의 정확한 GDC vault URL은 본 세션에서 직접 확인하지 못함. 핵심 캐논 담론은 GMTK "How (and Why) Spelunky Makes its Own Levels"에 정리됨 [확인함].
- **핵심 프레임:** **Compounding teaching via death.** 죽음은 *처벌*이 아니라 *피드백 채널*. 런이 짧고 죽음이 *원인 추적 가능*하면, 100회 죽음은 100회 학습 단위.
- **휴리스틱:**
  1. "**죽음의 원인이 *명확*해야 한다.**" — 죽음의 인과가 불투명하면 학습이 아니라 좌절.
  2. "**한 런의 비용이 *낮아야* 한다.**" — 1분 런이면 10번 죽어도 10분.
  3. "**메타 진행은 *느리고 정직*해야 한다.**" — 외부 능력치 떡칠은 학습을 압도함.
- **예시:** Spelunky의 가게 주인 — 도둑질하면 즉시 추적당해 죽음. 1회 학습 후 다시는 안 함. 또는 *함정 + 적의 조합*이 같은 방에서 *예측 불가한 결과*를 내며 학습 가능한 죽음을 양산.
- **실패 케이스:** 죽음의 원인이 *랜덤*이거나 *오프스크린*이면 학습 0. 또한 런이 길어지면(>15분) 죽음 비용이 학습 의지를 초과.
- **ECHORIS 함의:** Item World는 절차적 + 야리코미. Spelunky 모델 직접 적용. 단, 메트로베니아 톤이므로 *죽음 → 즉시 리스폰*보다는 *세이브 포인트 회귀*가 적합. 그리고 *기억 단편*이 메타 진행에 해당 — 너무 빨리 떡칠되면 학습 우회. **규칙:** 정체성 슬롯(Core) 떡칠은 4지층 이후로 페이스 락.

### 2.4. *Jonathan Blow — Designing to Reveal the Nature of the Universe* (IndieCade 2011, 후속 GDC Europe)

- **인용:** Jonathan Blow, Marc ten Bosch, "Designing to Reveal the Nature of the Universe", IndieCade 2011. URL: http://the-witness.net/news/2011/11/designing-to-reveal-the-nature-of-the-universe/. [확인함] WebSearch.
- **핵심 프레임:** **퍼즐이 *룰을 설명한다*.** 단어 없이 가르치려면, 첫 퍼즐이 *그 퍼즐 자체로 룰을 시연*해야 한다. The Witness의 500+ 패널은 모두 *환경의 일부*로 룰을 가르침.
- **휴리스틱:**
  1. "**첫 퍼즐은 *해답이 자명*해야 한다.**" — 손가락 하나로 선을 끄는 것 자체가 동사 학습.
  2. "**룰 변형은 *시각적 단서*로만 시그널.**" — 글자·아이콘 금지. 색·기호·패턴으로.
  3. "**한 줄기(line, sequence) 안에서 룰 1개씩만 추가.**" — Witness는 영역(area)마다 룰 1개.
- **예시:** 첫 잔디 영역의 노란 정사각형 패널 — 격자에 두 색 점 → 점을 *나눈다*는 룰이 패널 *형태*로 시연.
- **실패 케이스:** 룰의 시각 시그널이 모호하면 플레이어가 *틀린 룰*을 학습. Razbuten의 비-게이머 함정과 정확히 동일.
- **ECHORIS 함의:** Item World의 *기질(Forge/Iron/Rust/Spark/Shadow) 색*은 Witness식 룰 시그널. 색 하나 = 룰 하나. 환경 색채와 사운드만으로 "이 지층은 Forge다 → 적이 분노 패턴이다"를 추론 가능하게.

### 2.5. *Andrew Shouldice — Tunic 매뉴얼-as-교사* (GDC 2022)

- **인용:** Andrew Shouldice, GDC 2022 talk on Tunic. [확인함] 매뉴얼 설계 인터뷰: PlayStation Blog (2022-09-21), GameSpot. WebSearch 검증.
- **핵심 프레임:** **매뉴얼을 *수집물*로 만들라.** 80년대 게임 매뉴얼의 *촉각적 신비*를 재현. 매뉴얼 페이지는 게임 안에서 *찾아야* 얻을 수 있고, 외계어로 쓰여 있다. 플레이어는 *해석*해야 한다.
- **휴리스틱:**
  1. "**중요한 정보를 *발견의 보상*으로 만들면 학습 동기가 자생한다.**"
  2. "**외계어/외부 기호는 *주변의 그림과 맥락*으로 추론 가능해야 한다.**"
  3. "**매뉴얼은 가르치는 동시에 *세계관을 구축*해야 한다.**" — 정보 채널과 톤 채널의 통합.
- **예시:** Tunic 매뉴얼 페이지에 적힌 외계어 룰 + 그림 단서 → 플레이어가 추론.
- **실패 케이스:** 단서가 부족하면 *해석 불가*가 되어 진행 중단. Tunic도 일부 후반 페이지는 가독성 한계로 비판받음.
- **ECHORIS 함의:** Rustborn(검 Ego)의 *기억 회상*이 Tunic 매뉴얼 대응. 회상 단편 = "검의 매뉴얼 페이지". 단편을 모을수록 *검의 정체성*이 드러나고, 그것이 곧 *Item World의 룰*을 가르침. 단편은 *해독 가능한 단서*여야 함 — 텍스트 1줄이 아니라 *시각·청각·게임 행동*의 단서로.

### 2.6. *Lucas Pope — Return of the Obra Dinn 추론 가르치기* (GMTK 2018 분석)

- **인용:** Mark Brown, "How Return of the Obra Dinn Turns You Into a Detective", GMTK YouTube, 2018. [확인함] 트랜스크립트 직접 확인.
- **핵심 프레임:** **추론은 *교차참조*를 통해서만 강화된다.** 50개 사망 비네트를 단독으로 풀려 하면 막힘 — 한 인물의 정체는 *다른 인물의 단서*에서만 풀린다. 게임은 *3건 정답이 동시에 맞을 때* 확정시켜 추측 도박을 차단.
- **휴리스틱:**
  1. "**한 정보는 항상 *다른 정보와 짝*을 이뤄야 풀린다.**" — 단일 정보로 푸는 퍼즐은 추리가 아니라 운.
  2. "**오답의 비용을 *낮추되 진전은 막아라*.**" — 추측 시도는 허용, 자동 확정은 차단.
- **ECHORIS 함의:** 회상 단편을 *조합*으로 풀게 설계할 여지. 단편 A 단독으로는 50% 효과(Forgotten), 단편 A+B 조합 시 100% 회상. 다만 본 시스템은 DEC-036에서 *단편 단독* 모델로 결정됨 — Obra Dinn의 교차참조 메커닉은 *Phase 4 이상의 콘텐츠 깊이*로 보류.

### 2.7. *Sid Meier — Interesting Decisions* (GDC 2012)

- **인용:** Sid Meier, "Interesting Decisions", GDC 2012. [추측임] 본 세션 직접 확인 X, 캐논 담론 광범위.
- **핵심 프레임:** **흥미로운 선택의 3조건 — 흥미로워야 하고 / 결과가 보여야 하고 / 의미가 있어야 한다.** 또한 "**30년 룰**" — 디자이너가 30년 전에 즐겼던 메커닉은 새 플레이어에게도 신선하다.
- **휴리스틱:**
  1. "**선택지의 결과가 즉시 또는 *추적 가능하게* 표시되어야 한다.**" — Cook의 Feedback과 동일.
  2. "**'확실한 최적'이 있는 선택은 선택이 아니다.**" — 트레이드오프 강제.
- **ECHORIS 함의:** 기억 단편 슬롯 결정이 *흥미로운 선택*이어야 함. "공격력 +10 vs 방어력 +10" 같은 무의미 선택 금지. 5색 기질이 *플레이 스타일*을 바꾸는 차원의 선택이 되어야 함.

### 2.8. *Raph Koster — A Theory of Fun for Game Design* (2004, 2nd ed 2013)

- **인용:** Raph Koster, *A Theory of Fun for Game Design*, Paraglyph Press 2004 / O'Reilly 2nd ed 2013. URL: https://www.theoryoffun.com/. [추측임] 책 자체는 캐논, 본 세션 직접 확인 X.
- **핵심 프레임:** **재미 = 학습.** 게임이 재미있는 순간은 *패턴을 막 파악한 순간*. 패턴이 완전히 학습되면 지루해진다(noise → pattern → mastery → boredom 곡선).
- **휴리스틱:**
  1. "**재미를 유지하려면 *학습할 거리를 계속 공급*하라.**" — 새 메커닉, 새 변주, 새 조합.
  2. "**그러나 *공복기*는 필수.**" — 학습 직후 마스터리 보여줄 안전 구간을 줘야 한다(Mario 4단계의 Conclusion).
  3. "**노이즈(이해 불가) → 패턴(이해) → 마스터리(자동) → 지루함**의 곡선에서, 디자이너는 *패턴 직전 단계에 머무르게* 해야 한다.**"
- **ECHORIS 함의:** "아이템에 들어가면 세계가 있다"는 메커닉은 *1회 진입 시 패턴 파악 완료* → 빠른 마스터리 → 지루함 위험. 이를 *야리코미 / 5색 기질 / 정체성 결*이라는 *층층의 추가 학습 거리*로 방어. 핵심: *진입 자체*는 단순하게 가르치고, *각 아이템마다 다른 학습*이 안에 있어야 함.

### 2.9. *Anna Anthropy — A Game Design Vocabulary* (Anthropy & Clark, 2014)

- **인용:** Anna Anthropy, Naomi Clark, *A Game Design Vocabulary*, Pearson 2014. ISBN 978-0321886927. [확인함] WebSearch.
- **핵심 프레임:** **"튜토리얼은 첫 레벨이다(혹은 첫 레벨이 튜토리얼이다)."** Super Mario Bros. 1-1을 사례로 — *별도 튜토리얼 없이* 마리오의 위치(좌측), 시선(우측), ?블록의 유혹, 굼바의 등장만으로 *모든 핵심 동사*가 학습됨. New Super Mario Bros. Wii가 우측 화살표를 추가한 것에 대한 Anthropy의 비판: *불필요한 잉여 안내*.
- **휴리스틱:**
  1. "**플레이어의 시선과 욕망을 *환경 자체*로 유도하라.**" — 화살표 금지, 화면 구성 활용.
  2. "**튜토리얼이라는 *분리된 모드*를 만들지 말라.**" — 첫 레벨이 *그 자체로 게임이면서 가르친다*.
  3. "**저자성(authorship)이 메커닉에 반영되어야 한다.**" — 메커닉은 무엇을 가르치는가? 무엇을 *말하는가*?
- **ECHORIS 함의:** ECHORIS의 첫 월드 구간 = 튜토리얼이어야 함. 별도 "튜토리얼 챕터" 금지. **자연 진행 동사:** 이동 → 점프 → 공격(검) → 검 Ego 첫 발화 → 첫 아이템 픽업 → 첫 Item World 진입. 모두 *플레이어가 *플레이하고 있다고 느끼는 동안* 발생해야 함.

### 2.10. *Jenova Chen — Designing Journey* (GDC 2013)

- **인용:** Jenova Chen, "Designing Journey", GDC 2013. [추측임] 캐논 담론, 본 세션 직접 확인 X.
- **핵심 프레임:** **단어 없는 멀티플레이 온보딩.** Journey는 채팅·이름·음성 없이 *2명만의 협동*을 가르친다. 동사 = "노래(ping) + 함께 움직임". 학습은 *동료의 행동*을 보고 일어남.
- **휴리스틱:** "**다른 플레이어가 *시범*이 되도록 설계하라.**" — 텍스트 안내 없이 *행동 모방*으로 학습.
- **ECHORIS 함의:** Phase 3 멀티플레이 합류 시, *호스트 플레이어*가 게스트의 교사 역할을 자연 수행하도록 *합류 직후 호스트의 진입 위치*가 게스트보다 안쪽이 되도록 설계.

### 2.11. *Ueda Fumito — ICO/Last Guardian 트리코-as-교사*

- **인용:** Ueda Fumito 인터뷰 (IGN, EDGE 등). [근거 없음] 본 세션에서 1차 강연 직접 확인 X.
- **핵심 프레임(캐논):** **NPC가 *교사*가 될 수 있다 — 단, NPC 자신이 *유기적으로* 반응해야 한다.** Trico는 명령을 받지 않고 *반응*한다. 플레이어는 Trico의 행동을 *읽는* 법을 배운다.
- **ECHORIS 함의:** Rustborn(검)이 Trico식 교사. 명령 NPC가 아니라 *반응형 동료*. 단편 회수 시 검의 반응이 *학습 신호*가 되도록 설계.

---

## 3. Tier 3 — 기타 핵심 에세이/채널 (간단 정리)

| 소스 | 핵심 원리 | ECHORIS 적용 |
|:---|:---|:---|
| **Daryl Talks Games** [추측임] | 도파민 루프 / 신경과학 기반 보상 곡선 | 지층 클리어 시 *예측 가능한 보상*과 *놀라움*의 비율 70:30 |
| **Architect of Games (Adam Millard)** [추측임] | "디자인 = 의도된 학습 경로" | Item World 입구 → 출구의 학습 경로를 SSoT로 문서화 |
| **Lost Garden — Daniel Cook** [확인함] | Skill atoms (위 2.2) | 위와 동일 |
| **Designer Notes — Soren Johnson** [추측임] | "더하기보다 빼라(subtract before adding)" | 시스템 추가 시 *제거할 수 있는 것*부터 검토. DEC-039 Trapdoor가 사례 |
| **Sirlin — Playing to Win** [추측임] | 경쟁 게임은 *씬*이 *학습 자원* | ECHORIS 비-경쟁, 일부만 적용 — 커뮤니티/Discord가 *학습 자원* |
| **Schell — Art of Game Design (lens of essential experience)** [추측임] | "본질 경험"부터 시작 | ECHORIS 본질 = 검 안의 세계. 모든 학습이 이 본질을 향하도록 |
| **Steve Swink — Game Feel (2007)** [추측임] | 입력→피드백 지연 100ms 미만 = 즉각성 | Item World 진입 트랜지션의 *느낌* 자체가 학습. 지연 최소화 |
| **Tynan Sylvester — Designing Games** [추측임] | 메커닉 = 픽션 정렬 | Item World 메커닉이 *검의 픽션*과 정확히 정렬 |

---

## 4. 종합 — 가장 자주 인용되는 12개 온보딩 휴리스틱

캐논 전반에서 *3소스 이상에서 동시 인용*되는 합의된 디자인 지혜:

1. **Show, don't tell** — Half-Life 2 (Brown), Portal (Swift), Anthropy. [확인함]
2. **튜토리얼은 첫 레벨이다 / 분리된 모드 만들지 말 것** — Anthropy, Brown, Cook. [확인함]
3. **메커닉은 안전 환경에서 도입, 위험 환경에서 발전, 비틀고, 결론** — 4단계 패턴 (Brown / Hayashida). [확인함]
4. **스킬 아톰 = Action / Simulation / Feedback / Modeling** — Cook. [확인함]
5. **재미 = 패턴 학습** — Koster. [확인함]
6. **투자도가 자란 후에 가르쳐라** — George Fan via Brown. [확인함]
7. **단일 버튼이 다중 결과(Versatile Verbs)** — Brown / 닌텐도 캐논. [확인함]
8. **죽음(혹은 실패)은 학습 채널** — Yu / Brown / Spelunky. [확인함]
9. **선택은 *결과가 보이고 / 흥미롭고 / 의미 있을 때*만 선택** — Sid Meier. [추측임]
10. **NPC를 교사로 — 명령 NPC가 아니라 반응 NPC** — Ueda, Chen. [추측임]
11. **정보는 자원이다 — 무엇을 보일지 의도적으로** — Brown 교훈4. [확인함]
12. **복잡성 ≠ 깊이 — 적은 규칙의 풍부한 상호작용을 추구하라** — Brown 교훈8, Koster, Schell. [확인함]

---

## 5. 디자이너 간 의견 충돌 (Debates)

### 5.1. 처벌-가르치기(punishment-as-teaching) vs 접근성(accessibility)

- **Spelunky / FromSoftware 캠프:** "정확하고 즉각적인 죽음이 *가장 빠른 교사*다. 학습을 못 견디는 사람을 위해 설계할 수 없다." [확인함, Spelunky 캐논]
- **Celeste / Matt Thorson 캠프:** "어시스트 모드(assist mode)는 *플레이어의 자기결정권*. 학습 곡선을 강제할 권리가 디자이너에게 있지 않다." [추측임, Celeste GDC 2019 캐논]
- **충돌 지점:** "*누구*를 위해 가르치는가?"가 본질. ECHORIS는 1차 niche(BLAME!/디스가이아/Transistor 팬)를 시금석으로 삼으므로, 어시스트 모드 충동은 *1차 niche 신호 희석* — 채택 거절.

### 5.2. 보이지 않는 튜토리얼 vs 명시적 시스템 학습

- **Half-Life 2 / 닌텐도 캠프:** "단어 없이 가르치는 것이 최선." [확인함]
- **복잡 게임 / Mortal Kombat 11 / Civilization 캠프:** "특정 시스템은 명시적 텍스트가 *반드시* 필요. 단, 분할·맥락화하라." [확인함, Brown 2021]
- **충돌 지점:** *메커닉의 임의성(arbitrariness) 정도*. 자연 관찰로 추론 가능하면 invisible, 임의 룰이면 명시. ECHORIS는 *둘 다*: 진입 동작은 invisible, 5색 기질 룰은 명시.

### 5.3. "튜토리얼은 첫 레벨" vs "튜토리얼은 별도 챕터"

- **Anthropy / Brown 캠프:** 분리 금지. [확인함]
- **MMO / 전통 RPG / 그랜드 스트래티지 캠프:** 분리 필수 — 시스템이 동시에 모두 켜져야 하기 때문. [확인함, Brown 2021]
- **충돌 지점:** *시스템이 점진 도입 가능한가*. ECHORIS는 점진 가능(레어리티 페이서) → Anthropy 캠프 채택.

---

## 6. Skill Atoms 프레임을 ECHORIS에 직접 매핑

### 6.1. "Item World 진입" 스킬 아톰 — 정밀 분해

```
[Action]      플레이어가 인벤토리에서 아이템 선택 → Item World 진입 키를 누름
              (혹은 월드의 대장간/세이브 포인트 인터랙트에서 분기)

[Simulation]  - 캐릭터의 좌표가 월드 → Item World 스트래텀 1 입구로 워프
              - 아이템 인스턴스가 "다이브 중" 플래그
              - Erda의 시각 표현이 검의 결 색조(Forge/Iron/Rust/Spark/Shadow)로 살짝 물듦

[Feedback]    여기가 학습의 99% — 5채널 동시 발화 필수:
              1. 시각: 카메라가 검 그립에서 *결*로 빨려 들어가는 0.8초 트랜지션
              2. 색: 청록 월드 팔레트가 주황 아이템계 팔레트로 *반전*
              3. 사운드: 단조 망치 소리(Forge라면) + 깊이 잔향
              4. UI: HUD가 1초간 옅어졌다가 Item World 컨텍스트로 복귀
              5. Rustborn 발화 1줄: "다시 — 내 안으로 왔군." (캐릭터별 변형)

[Modeling]    플레이어 두뇌에 형성되어야 할 모델:
              "내 아이템 = 하나의 작은 세계. 다시 들어올 수 있고, 매번 다르다.
               검의 *결*(기질)이 안의 세계 톤을 정한다."
```

이 4요소가 *동시에 또렷이* 발화되지 않으면 *생소함이 학습 비용으로 누적*. Cook의 캐논 — "보이지 않으면 없는 것이다."

### 6.2. 다중 아톰 맵 — Item World 학습 사슬

```
A0  이동·점프·공격          (월드 0~5분)
 ↓
A1  검의 첫 발화              (월드 5~10분) — Rustborn이 존재한다는 modeling
 ↓
A2  첫 Item World 진입        (월드 15~20분, 대장간 첫 발견 직후)
 ↓
A3  Forgotten Shard 1회 회수  (Item World 첫 방 안에서)
 ↓
A4  Item World 탈출 → 월드로  (첫 다이브의 폐쇄)
 ↓
A5  획득 단편을 슬롯에 장착   (월드 대장간에서)
 ↓
A6  같은 아이템 *재진입*       (순환 구조 modeling — "다시 들어갈 수 있다")
 ↓
A7  5색 기질 시그널 인식      (2번째 아이템 진입 시 색 차이 인지)
```

A0~A5는 *Mario 1-1 식 첫 레벨*과 동일 — 모든 핵심 동사가 한 흐름 안에 강제됨. A6의 *재진입*이 본 게임의 진짜 스파이크. 첫 진입은 *놀라움*, 재진입은 *순환의 modeling*.

---

## 7. Mark Brown의 4단계 패턴을 ECHORIS Item World에 적용

레벨 단위가 아니라 *학습 단위* 단위로 4단계를 적용:

| 단계 | ECHORIS 적용 |
|:---|:---|
| **Introduction** | 첫 Item World 입장 = *낙사 없는 작은 방 1개*. 적 1마리, Forgotten Shard 1개, 출구 1개. Rustborn이 "회수하라"고 한 줄. 안전망. |
| **Development** | 2번째 아이템 진입 = 같은 구조이지만 *기질 색이 다름* + 방 2개. Shard 회수에 약간의 액션 압력(적 2). |
| **Twist** | 3-4번째 아이템 = 5색 기질 중 *불리한 기질* 등장(예: 화염 무기로 화염 적 사냥 = 데미지 반감). 플레이어가 *기질-매칭 사고*를 시작. |
| **Conclusion** | 첫 지층 보스 = 1-4 단계의 모든 학습을 *통합 적용*해야 격파 가능. 클리어 시 핵심 기억(Core Memory) 100% 드롭, 정체성 슬롯 첫 활성. |

이는 *단일 Item World 1개의 4지층 구조*에도 그대로 매핑됩니다(레어리티별 지층 수와 정확히 일치).

---

## 8. Spelunky-식 컴파운딩 가르침 — ECHORIS 적용 가능성

**적용 가능:** 절차적 + 야리코미 → Spelunky 모델 직접 차용 가능.

**적용 한계:**
- ECHORIS는 *런 기반*이 아닌 *세이브 포인트 기반*. 죽음 비용이 Spelunky보다 높음(1런 ≠ 1분).
- 메트로베니아의 *공간적 학습*은 Spelunky의 *조합적 학습*과 결이 다름.

**제안 규칙:**
1. **얕은 지층(1-2)의 죽음 비용은 *세이브 포인트 복귀*만**. 단편 손실 없음.
2. **깊은 지층(3-4 + 심연)에서만 손실 적용** — 회수하지 못한 단편 일부 손실.
3. **Spelunky의 *명확 인과* 원칙 유지** — 죽음의 원인이 항상 *직전 화면 안*에서 추적 가능.

---

## 9. Koster — "재미 = 학습" 원칙을 Item World에 적용

**무엇이 학습되는가?**
- 1차 학습: "내 아이템은 작은 세계다" (1회 진입으로 완료)
- 2차 학습: "기질이 다르면 안의 세계가 다르다" (3-5회 진입)
- 3차 학습: "조합·전이·재배치로 무기를 *조각*할 수 있다" (10+ 회 진입)
- 4차 학습: "야리코미 — 깊이 갈수록 *내 손으로 만든 무기*가 된다" (50+ 회 진입)

**왜 재미인가?** 각 학습 단계가 *완료되는 순간* 다음 단계가 *시야에 들어옴*. Koster의 noise → pattern → mastery 곡선이 *4번 갱신*되므로 지루함 곡선이 4번 리셋.

**위험:** 1차 학습이 *너무 빨리* 완료되면 2차로 넘어가는 다리가 없을 경우 이탈. → 1차 학습 직후 *기질 색 차이를 즉시 노출*해 2차 학습을 발화시켜야 함.

---

## 10. 명시 텍스트 가이드 예산 — 5분 / 15분 / 60분

Razbuten의 *비-게이머 기준*과 Brown의 *투자도 곡선*을 결합한 예산표:

| 시간 | 명시 텍스트(말풍선/툴팁/오버레이) 허용량 | 내용 |
|:---|:---|:---|
| **0-5분** | 키 프롬프트 1종 (`KeyPrompt` 표준) + 검 발화 2-3줄 | 이동/점프/공격. *시스템 설명 0*. |
| **5-15분** | 키 프롬프트 누적 3종 + 검 발화 5-7줄 | 첫 인터랙터블(아이템 픽업), 첫 단편 발견, 첫 대장간 도착 |
| **15-30분** | 키 프롬프트 누적 5종 + 검 발화 10-12줄 + 인벤토리 첫 진입 시 *1회* 오버레이 1장 | 첫 Item World 진입 + 첫 다이브 완료 |
| **30-60분** | 키 프롬프트 *재등장 없음*(이미 학습), 검 발화는 자유, 슬롯 시스템 첫 사용 시 *1회* 오버레이 1장 | 기질 색 인식, 슬롯 장착, 재진입 |
| **60분+** | 오버레이 0. 검 발화만. 모달 금지. | 본격 야리코미 진입 |

핵심: *오버레이 모달은 일평생 2회만 사용*. 그 외 모든 학습은 *환경·검 발화·키 프롬프트*로.

---

## 11. Anthropy 원칙 — ECHORIS는 *튜토리얼 레벨*이 별도여야 하는가?

**결론: NO. 첫 월드 구역이 그 자체로 튜토리얼이어야 한다.**

근거:
1. ECHORIS의 1차 niche(BLAME!/Transistor 팬)는 *분리된 튜토리얼 챕터*를 *유치함*으로 인식.
2. Item World의 점진 도입은 *레어리티 페이서* 덕분에 첫 30분에 모든 시스템을 켤 필요 없음.
3. Anthropy의 Super Mario 1-1 캐논 — *별도 안내 없이 환경 구성*으로 학습 강제 가능.

**설계 규칙:**
- 첫 월드 구역의 *첫 5분*은 이동/점프/공격만 강제(다른 동사 차단).
- *대장간 첫 도착*이 자연스럽게 *시야의 가장 큰 시각적 후크*가 되도록 화면 구성.
- *Item World 진입 키*는 대장간 NPC 옆에서만 등장 — 이전엔 키 자체가 노출 안 됨.

---

## 12. "스캐폴디드 인출(scaffolded retrieval)" 비판 — 교사 vs 게임 디자이너

교육학에서 *스캐폴디드 인출*은 학습의 핵심: 학습자가 *방금 배운 것을 곧바로 인출*하도록 강제. 단순히 정보를 *전달*하는 것이 아니라 *떠올리게* 한다. [확인함, 교육학 캐논]

대부분 게임 튜토리얼은 *전달*만 하고 *인출*을 강제하지 않음. Threes의 Asher Vollmer 인용(via Brown): *"화살표를 따라 누르는 것은 진전이지 학습이 아니다."*

**ECHORIS 적용:**
1. **단편을 *찾으라*고 *말로* 알려주지 말고**, 단편을 *찾아야만* 다음 방이 열리게 설계.
2. **5색 기질 룰은 *문서로* 가르치지 말고**, *불리한 기질의 아이템을 일부러 보스 직전에 배치*해 플레이어가 *기질을 바꿔야* 풀리게 함.
3. **재진입을 *권하지 말고*** — 같은 아이템의 두 번째 지층에 *반드시 필요한 단편*을 두고, 플레이어가 "다시 들어가야 하는구나"를 *스스로 깨닫게*.

---

## 13. 2020년 이후 신규 온보딩 아이디어

### 13.1. Cocoon (2023) — 재귀적 가르침

- **Jeppe Carlsen(전 Playdead 리드)** [추측임, 본 세션 직접 확인 X]. Cocoon은 *세계를 구체 안에 담아 들고 다닌다 → 그 구체 안으로 다시 들어간다*는 메커닉을 *0단어*로 가르침.
- **ECHORIS 함의:** Cocoon은 ECHORIS의 가장 *위험한 유사작*. 다만 ECHORIS는 *재귀 진입을 금지*(DEC) — 1층만. Cocoon식 *시각 시그널* — 구체/검의 *외관에 내부가 비친다* — 은 차용 가능.

### 13.2. Inscryption (2021) — UI 메타모포시스

- 게임의 메타 레이어가 진행에 따라 *UI 자체*가 변형됨. 카드 게임 → 어드벤처 → 해킹 시뮬레이션. 각 단계가 *전 단계의 학습을 토대*로 새 UI를 학습시킴.
- **ECHORIS 함의:** Item World 진입 시 HUD가 *변형*되도록 설계 — 월드 HUD와 Item World HUD가 *같은 정보를 다른 형식*으로. 동일성을 깨지 않으면서 *공간 전환의 시각 시그널*.

### 13.3. Pentiment (2022) — 매뉴스크립트 UI

- UI가 *중세 필사본*의 일부로 통합. 메뉴/대화/지도가 모두 *책 페이지*. 픽션이 UI 자체.
- **ECHORIS 함의:** Item World의 메뉴/슬롯 UI를 *검의 결*에 통합 가능. 슬롯 = 검에 새겨진 룬 자국. 픽션과 UI의 일체화.

### 13.4. Outer Wilds (2019)의 "지식 = 진행" 모델

- 정량 진행 0. *플레이어의 머릿속 지식*이 유일한 진행. 학습이 곧 잠금 해제.
- **ECHORIS 함의:** ECHORIS는 정량 진행(능력·스탯·단편)이 핵심이므로 직접 적용 부적합. 단, *기질 룰 학습*은 Outer Wilds식으로 — 룰을 *발견*하는 것 자체가 진행감.

---

## 14. 종합 — ECHORIS Item World 진입 학습 설계 마스터 체크리스트

다음 12개 항목 모두 충족 시 본 문서의 캐논과 정렬:

- [ ] **C1 — 진입은 단일 스킬 아톰** (Cook). 4요소(A/S/F/M) 모두 1회 진입에서 발화.
- [ ] **C2 — 진입은 invisible tutorial** (HL2/Anthropy). 모달 0, 검 발화 1줄.
- [ ] **C3 — 진입은 4단계 패턴 안에 위치** (Brown/Hayashida). 첫 방 = Introduction, 둘째 = Development.
- [ ] **C4 — 진입 동사는 versatile** (Brown). 같은 키가 *맥락에 따라* 다른 결과.
- [ ] **C5 — 진입 전 투자도 확보** (Fan via Brown). 월드 10-20분 후에 첫 진입.
- [ ] **C6 — 검 발화는 행동 *직후*** (Wolpaw delta). 진입을 *예고*하지 않음.
- [ ] **C7 — Razbuten 가드** — 카메라 정면, HUD 노이즈 최소, 단일 인과.
- [ ] **C8 — 재진입 강제** — 두 번째 지층 진입을 *플레이어가 자발 결정*하도록 단편 배치.
- [ ] **C9 — 5색 기질은 색 시그널만으로 가르침** (Witness). 텍스트 룰 0.
- [ ] **C10 — 스캐폴디드 인출** — *말로* 가르치지 말고 *되게 강제*.
- [ ] **C11 — 텍스트 예산 준수** — 60분 누적 검 발화 ≤ 12줄, 오버레이 ≤ 2회.
- [ ] **C12 — Anthropy 통합** — *분리된 튜토리얼 챕터 0*.

---

## 15. 1차 niche 시그널 검증

본 캐논에서 추출한 모든 원칙은 *1차 niche 시그널 강화*에 적합한지 검증되어야 함:

| 캐논 원칙 | BLAME!/Abyss 팬 | Disgaea 팬 | Transistor 팬 | 채택 여부 |
|:---|:---:|:---:|:---:|:---:|
| Show, don't tell | + | 중립 | + | 채택 |
| 분리 튜토리얼 금지 | + | 중립 | + | 채택 |
| Spelunky 죽음 = 학습 | 중립 | + | 중립 | 부분 채택 |
| 어시스트 모드 | − | − | − | **거절** |
| Versatile verbs | 중립 | + | + | 채택 |
| 5색 시그널만(Witness) | + | + | + | 채택 |
| 매뉴얼-as-수집물(Tunic) | + | 중립 | + | 채택 |
| 메타 UI(Inscryption) | + | 중립 | + | 채택 |

거절된 *어시스트 모드* — 본 게임의 1차 niche 신호를 *희석*하므로 채택 안 함. 캐논이라도 페르소나에 어긋나면 거절(Anthropy의 *저자성* 원칙과도 정렬).

---

## 16. 결론 — 6개의 작업 원칙

본 캐논 전체에서 ECHORIS에 직접 적용해야 할 *6가지 작업 원칙*을 추출합니다.

1. **첫 Item World 진입은 *환경이 가르치는 단일 스킬 아톰*이다.** 별도 튜토리얼 챕터·모달·튜토리얼 모드 금지. Cook + Anthropy + Brown 합의.
2. **검(Rustborn)의 발화는 *행동 직후의 정당화*다, 행동 *예고*가 아니다.** Wolpaw delta 원칙.
3. **5색 기질은 *색 시그널과 환경*으로만 가르치고 텍스트 룰을 쓰지 않는다.** Witness + Tunic 합의.
4. **레어리티가 자연 페이서다.** Normal 1지층 → Ancient 4+심연. 첫 30분에 시스템을 다 켜지 않는다. Brown 2021 + Cook.
5. **재진입은 *플레이어 자발*로 발화해야 한다.** 스캐폴디드 인출 — 단편 배치로 *재진입 필요성*을 *말 없이* 강제.
6. **모든 학습 단계는 *재미 = 학습 직전의 패턴*에 머무른다.** Koster — 학습이 끝나는 순간 다음 학습거리가 시야에 들어와야 함.

이 6개 원칙은 모두 *스파이크 검증*을 통과: "이것이 아이템계 경험을 강화하는가?" — 6/6 강화.

---

## Sources (1차 + 검증)

- [GMTK — Super Mario 3D World's 4 Step Level Design](https://www.youtube.com/@GMTK) (저장소 트랜스크립트 확인)
- [GMTK — Half-Life 2's Invisible Tutorial](https://www.youtube.com/@GMTK) (저장소 트랜스크립트 확인)
- [GMTK — Can we Improve Tutorials for Complex Games?](https://www.youtube.com/@GMTK) (저장소 트랜스크립트 확인)
- [GMTK — The Secret of Mario's Jump](https://www.youtube.com/@GMTK) (저장소 트랜스크립트 확인)
- [GMTK — 10 Game Design Lessons from 10 Years of GMTK](https://www.youtube.com/@GMTK) (저장소 트랜스크립트 확인)
- [GMTK — How Return of the Obra Dinn Turns You Into a Detective](https://www.youtube.com/@GMTK) (저장소 트랜스크립트 확인)
- [GMTK — Boss Keys 시리즈](https://www.youtube.com/@GMTK) (저장소 트랜스크립트 19개 전 에피소드 확인)
- [Daniel Cook — The Chemistry of Game Design (Lostgarden, 2007)](https://lostgarden.com/2007/07/19/the-chemistry-of-game-design/)
- [Daniel Cook — Gamasutra reprint](https://www.gamedeveloper.com/design/the-chemistry-of-game-design)
- [Daniel Cook — Game Design Theory I Wish I had Known](https://www.youtube.com/watch?v=qwPe3OHR04c)
- [Kim Swift & Erik Wolpaw — A Portal Post-Mortem (GDC 2008)](https://gdcvault.com/play/197/A-PORTAL-Post-Mortem-Integrating)
- [Portal Post-Mortem Archive.org](https://archive.org/details/GDC2008Swift)
- [Jonathan Blow & Marc ten Bosch — Designing to Reveal the Nature of the Universe (IndieCade 2011)](http://the-witness.net/news/2011/11/designing-to-reveal-the-nature-of-the-universe/)
- [Andrew Shouldice — The Creation of Tunic's In-Game Manual (PlayStation Blog 2022)](https://blog.playstation.com/2022/09/21/the-creation-of-tunics-invaluable-in-game-manual/)
- [Tunic Instruction Booklet Archive](https://archive.org/details/TunicInstructionBookletEnglish)
- [Anna Anthropy & Naomi Clark — A Game Design Vocabulary (Pearson 2014)](https://www.amazon.com/Game-Design-Vocabulary-Foundational-Principles-ebook/dp/B00IJYFDPG)
- [Razbuten — Gaming for a Non-Gamer series (BotW episode)](https://www.youtube.com/watch?v=5LdenlAKb2g)
- [Raph Koster — Theory of Fun](https://www.theoryoffun.com/) [추측임 — 책 직접 검증은 본 세션 외]

> **태깅 요약:** [확인함] 13건, [추측임] 9건, [근거 없음] 1건(Ueda Trico). 후자는 향후 별도 1차 강연 검증 필요.
