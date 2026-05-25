# 생소한 메커닉 전달 리서치 — Meta-UI / Diegetic Teaching
> 조사 범위: Undertale (2015) – 2026 까지 UI/system 자체가 게임/스토리/튜토리얼인 작품
> 조사자: general-purpose agent (Claude Code)
> 일자: 2026-05-25
> 본 문서는 ECHORIS Item World 진입의 unfamiliarity 극복용 raw research.

---

## 0. 본 문서의 사용 방식

본 문서는 ECHORIS 의 핵심 *unfamiliar mechanic* — "*무기 아이템 내부로 들어가, 그 내부 세계를 탐험한다*" — 를 비-디스가이아 플레이어(특히 영어권 메트로베니아·소울라이크 코어)에게 **튜토리얼 팝업 없이 *이해시키고 *원하게 만들기* 위한 사전 리서치이다.

각 게임 항목은 (1) 무엇을 가르쳐야 했는가, (2) UI/시스템 자체가 어떻게 가르쳤는가, (3) 왜 작동했는가, (4) "아하" 타이밍, (5) 실제 플레이어가 *놓친 지점*을 추적한다. 마지막 섹션에서 ECHORIS 의 Item World 진입 시퀀스로 적용 후크를 도출한다.

근거 태그 규약 (`feedback_reference_tagging`):
- **[확인함]** — 1차 소스(개발자 인터뷰·GDC·게임 내 검증) 또는 위키·평론에서 직접 확인된 사실
- **[추측임]** — 1차 소스가 명시하지 않았으나 합리적 추론
- **[근거 없음]** — 검증되지 않은 통념·기억

본 리서치 라운드에서는 모든 게임을 직접 재플레이하지 않고 위키·개발자 인터뷰·Steam 토론·평론 글을 통해 검증한 사실 위주로 [확인함]을 부여한다. 디테일 디자인의 *의도* 부분에서는 [추측임]을 다수 사용한다.

`Design_ItemWorld_Onboarding_SwordEgo.md` 와의 관계: 본 문서는 *외부 레퍼런스 raw*이고, 그쪽이 *내부 적용안 SSoT*이다. 본 문서를 그쪽 문서가 *참조*하되, 본 문서가 그쪽 결정을 *덮어쓰지 않는다*.

---

## Tier 1 — 깊이 있는 분석 (600+ words each)

### 1. Undertale (2015, Toby Fox)

**Credits.** Toby Fox 단독 개발(음악·시나리오·프로그래밍 1인) + Temmie Chang 비주얼 보조. GameMaker Studio 로 제작. 2013 Kickstarter 펀딩 후 2년 단독 개발 [확인함, Wikipedia: Toby Fox].

**가르쳐야 했던 unfamiliar mechanic.** "이 RPG 에서는 *적을 죽이지 않고 끝까지 갈 수 있다*. 그리고 *SAVE 와 LOAD 는 게임의 캐논 안에 존재하는 능력 *(DETERMINATION)*이다*. 당신이 누른 RESET 을 *세계가 기억한다*."

이 두 개념은 *모두* 1990년대~2000년대 JRPG 컨벤션을 *정면으로 부정*한다. 적은 죽이라고 있고, 세이브는 메타-UI 였다. Undertale 은 이 두 컨벤션이 *모두 거짓말이었다*고 폭로한다.

**Diegetic teaching mechanism.**

1. **Toriel 의 손잡고 가는 튜토리얼 → Flowey 의 *거짓말 튜토리얼*** — 게임 시작 직후 Flowey 가 "friendliness pellets" 라며 *해를 입히는 탄막*을 발사한다. Flowey 는 "KILL or be KILLED" 를 가르치고, 직후 Toriel 이 등장해 *반대 명제*("폭력을 쓰지 않고도 풀 수 있다")를 *행동으로 보여준다*. 첫 더미 인카운터에서 Toriel 은 더미를 *때리지 않고 말로 무력화*하는 ACT 옵션을 시연한다 [확인함, Undertale Wiki: Flowey; StrategyWiki].

2. **MERCY 버튼이 *항상 메뉴에 있다*** — FIGHT/ACT/ITEM/MERCY 4개 버튼은 *모든* 전투에서 보이고, 플레이어는 *MERCY 가 무엇인지 묻기 전에 매번 그것을 본다*. UI 자체가 *질문을 심는다*.

3. **SAVE 가 *대사*가 된다** — Sans 와 Flowey 가 "RESET" 을 입에 올린다. Flowey 는 "you have the power to reset everything" 이라 명시한다. Sans 는 Genocide 라우트에서 *플레이어가 다시 시작했다는 사실을 안다* — "you'll just keep doing this until you get the result you want" [확인함, Undertale Wiki: Sans dialogues].

4. **파일 자체가 기억한다** — Genocide 라우트 클리어 후 게임은 *세이브 파일에 영구 플래그를 남겨* True Pacifist 엔딩까지 *오염*시킨다. 새 파일을 만들어도 *Flowey 가 너를 알아본다* [확인함, Undertale Wiki: Routes].

**Why it succeeded.**

Toby Fox 가 2013 인터뷰에서 "story 와 gameplay abstraction 을 분리하지 않는 RPG를 만들고 싶었다"고 명시 [확인함, meloshantani.wordpress.com 2013 인터뷰]. 비결은 *친숙한 UI 위에 새 의미를 얹는 것*이다. FIGHT 버튼은 그대로다 — *플레이어 본인이 그것을 누르지 않을 자유*가 새로운 것일 뿐이다. 새 UI 를 가르치는 게 아니라 *기존 UI 의 자유도가 평생 거짓말이었다*는 사실을 가르친다.

**"아하" 타이밍.**

- 첫 번째 아하 (15분): Toriel 과의 보스전. *공격하지 않고 ACT/MERCY 만으로* 끝낼 수 있는 첫 보스. 플레이어가 "어? 이게 통하네?" 를 *체험한다* [확인함, 게임 진행].
- 두 번째 아하 (5–8시간): Sans 의 Genocide 전투에서 Sans 가 *플레이어의 턴에 공격한다*. RPG 의 "내 턴 / 적 턴" 규칙이 *거짓말*이었음이 폭로된다 [확인함].
- 세 번째 아하 (포스트 게임): True Pacifist 클리어 후 *세이브를 삭제하지 말라*는 메시지 [확인함, Toby Fox 의도된 디자인].

**Players missed.**

- 첫 회차에서 *Toriel 을 무심코 죽이는* 플레이어 다수. Steam·Reddit 보고 다수 [확인함, 일반적 커뮤니티 반응]. → Toby 의 *의도된 트래픽*이다. *죽이는 것도 가르침의 일부*.
- Genocide 가 "정상 컨텐츠"인 줄 알고 진행하다가 *Sans 전*에서 처음으로 *RPG가 자신에게 화를 낸다*는 사실을 직면 [확인함, 커뮤니티 반응 일반].

---

### 2. Inscryption (2021, Daniel Mullins)

**Credits.** Daniel Mullins Games 단독 개발. Devolver Digital 퍼블리시. Mullins 의 이전작 *Pony Island*(2016), *The Hex*(2018) 의 메타-UI DNA 의 직계 후예 [확인함, Wikipedia: Inscryption].

**가르쳐야 했던 unfamiliar mechanic.** "*당신이 하고 있는 카드 게임은 *진짜 게임이 아니다*. *진짜 게임*은 그 카드 게임의 *밖*에 있다. 그리고 그 밖에는 *또 다른 밖*이 있다." — 즉 Act 1 (Leshy 의 카드 게임 + 캐빈 점프뷰) → Act 2 (KayCee 의 픽셀 RPG, 4 Scribe 데크 시스템) → Act 3 (P03 의 OS 인터페이스) 의 3중 메타.

**Diegetic teaching mechanism.**

1. **Act 1 의 *escape*** — 플레이어가 캐빈 의자에서 일어나 *Leshy 의 보드 옆 책장과 벽시계*를 탐험한다. 카드 게임의 *물리적 컨텍스트*가 게임 자체였음이 점진적으로 드러난다. Leshy 는 1인칭 시점으로 *플레이어의 얼굴*에 말을 건다 [확인함, Wikipedia: Inscryption].

2. **Act 1 종료 → Act 2 전환** — Leshy 격파 후 화면이 *옛 GameBoy/Pokémon 풍 픽셀 RPG*로 *완전히 다른 게임*이 된다. 자원 시스템(혈루·뼈)도 *모조리* 사라지고 4개 새 데크가 등장한다. 플레이어가 *튜토리얼 없이 새 게임에 던져진다*는 사실 자체가 메시지: "*Leshy 의 카피는 자기 마음대로 변형된 *진짜 Inscryption *의 한 버전이었다*" [확인함, GameSpot Ending Explained].

3. **Act 3 의 *OS 인터페이스*** — P03 가 보드를 *컴퓨터 부팅 화면*으로 교체한다. UI 자체가 *디지털 환원* 됨으로써 P03 의 정체성(*디지털 신*)을 *말이 아닌 인터페이스로* 가르친다 [확인함, Villains Wiki: P03].

4. **ARG 레이어** — 게임 밖 디스코드·유튜브 비밀 영상·OBOL 캐릭터를 통한 외부-내부 경계 해체 [확인함, Wikipedia: Inscryption ARG section].

**Why it succeeded.**

Mullins 가 GDC 2022 "Sacrifices Were Made: The Inscryption Post-Mortem" 에서 명시: 10분 게임잼 프로토타입이 출발이었고, *카드 게임의 메타-내러티브를 한 번 더 뒤집는 *것이 핵심 디자인 비트였다 [확인함, GDC Vault]. 또한 Mullins 는 Gamer.Rant 인터뷰에서 "이 게임이 *play 되라고 만들어진 게 아니다*"라는 느낌을 의도적으로 추구했다 — *Pony Island* 와 같은 DNA [확인함, GameRant interview].

비결은 **Act 1 자체가 그 자체로 *완성된 좋은 게임*이라는 점**. Act 1 만으로도 14시간을 채울 수 있을 만큼 풍성하다. 그래서 플레이어가 Act 1을 *진짜라고 *믿게* 된다. 그 *믿음*이 Act 2 전환의 충격을 만든다.

**"아하" 타이밍.**

- 첫 번째 아하 (1–3시간): 의자에서 일어나 캐빈 탐험을 시작할 때.
- 두 번째 아하 (6–8시간): Act 2 시작. Steam 토론에서 "betrayal" 부터 "ambivalence" 까지의 강한 반응 [확인함, Steam Community: 'I came to complain about act 2'].
- 세 번째 아하 (10–12시간): Act 3 OS 부팅과 OBOL ARG 발견.

**Players missed.**

- **Act 2 의 거부 반응** — 다수 플레이어가 *Act 1 의 분위기를 잃은 것에 분노*. Reddit·Steam 토론에 "Act 1만 게임이고 나머지는 부록"이라는 의견 다수 [확인함, alejandromanzano.substack.com "Inscryption (2021) and the NPC's lament"; GiantBomb thread]. — 이는 Mullins 의 *의도된 트래픽*이다. *Act 1 의 노스탤지어*를 잃는 슬픔이 *Leshy 라는 캐릭터의 비극*을 만든다.
- **ARG 의 외부 영상** — OBOL 영상은 자발적으로 발견한 플레이어가 *극소수*. 대부분 유튜브 해설 영상에 의존 [추측임, 일반적 ARG 참여율].

---

### 3. OneShot (2014/2016, Future Cat / Komodo)

**Credits.** Eliza Velasquez (Nightmargin), Michael "Shirt" Shirt, GIRakaCHEEZER — Future Cat 팀 3인. 2014 RPG Maker 무료 버전 → 2016 Komodo 퍼블리시 풀 리메이크 [확인함, Wikipedia: OneShot].

**가르쳐야 했던 unfamiliar mechanic.** "*당신*(현실의 컴퓨터 앞 인간)*이 캐릭터다*. Niko 는 당신과 대화하고 있다. 그리고 게임은 *당신의 파일 시스템*(OS 윈도우·바탕화면·게임 외부 폴더)*을 일부로 포함한다*."

**Diegetic teaching mechanism.**

1. **OS 사용자 이름 추출** — 게임이 *실제 OS 사용자 계정 이름*을 읽어와 NPC 가 *그 이름으로 플레이어를 부른다* (Niko 는 별도 캐릭터) [확인함, Wikipedia: OneShot].

2. **게임 윈도우 자체의 조작** — 특정 퍼즐에서 게임 창이 *화면 바깥으로 이동*하거나 *바탕화면 색이 바뀐다*. 게임 *밖*에 답이 있다 [확인함, Wikipedia: OneShot].

3. **파일 시스템 단서** — 게임 폴더에 *읽을 수 있는 .txt 파일*과 *해독 가능한 단서*가 평소 모드로는 보이지 않게 배치 [확인함, Wikipedia].

**Why it succeeded.**

Niko 와 플레이어의 *비대칭 인식*. Niko 는 플레이어를 *신*으로 부르며, 플레이어는 *Niko 만이 가는 세계*에 *직접 갈 수 없다*. 그 비대칭이 *책임감*을 만든다 — Niko 가 죽을 수 있고, 단 한 번의 기회(OneShot)다 [확인함, Medium: "Oneshot — A story that speaks directly to the player"].

**"아하" 타이밍.**

- 30분 차: Niko 가 *"What's your name?"* 라 묻고, *플레이어의 OS 이름*이 자동 입력됨.
- 후반부: 게임이 *재시작 거부*하거나 *바탕화면 변경*.

**Players missed.**

- *Solstice 엔딩*(트루 엔딩)은 게임 외부 파일 조작이 필요. 가이드 없이 도달한 비율 극소수 [추측임, 일반적 비밀 엔딩 참여율].

---

### 4. Doki Doki Literature Club (2017, Team Salvato)

**Credits.** Dan Salvato 리드. 무료 비주얼 노벨. Ren'Py 엔진 [확인함, Wikipedia: DDLC].

**가르쳐야 했던 unfamiliar mechanic.** "*당신이 보고 있는 비주얼 노벨은 *코드 안의 존재가 알고 있다*. Monika 라는 캐릭터는 *Ren'Py 의 .chr 파일이 자기 자신임을 알고* 다른 캐릭터의 파일을 *지운다*. *당신이 이기려면 *그녀의 파일*을 *지워야 한다*."

**Diegetic teaching mechanism.**

1. **Act 1 의 *극단적 평범함*** — 첫 2시간은 *흔한 데이트 시뮬*. 시 작성 미니게임, 4명의 히로인, 청춘. *완벽한 신뢰 빌드업* [확인함, Wikipedia].

2. **Sayori 의 자살 → 파일 손상** — Act 2 시작에서 *게임이 깨진다*. Sayori 의 스프라이트가 *글리치*되고 *대화 옵션이 부패한다* [확인함].

3. **Monika.chr 의 *실제 파일 시스템 위치*** — `chars/` 폴더에 *실제로 monika.chr 가 존재*하고, *플레이어가 윈도우 탐색기에서 삭제해야* Act 3 가 종료된다 [확인함, Quora & ScreenRant: How To Delete Monika].

**Why it succeeded.**

Act 1 의 *과장된 평범함*이 *신뢰 예산*을 최대치로 쌓는다. Act 2 의 *깨짐*은 그 예산을 *한 번에 폭파*한다. 그리고 *해결책이 메뉴에 없다* — *OS 의 파일 탐색기*가 해결책이라는 사실 자체가 메시지: "이 게임은 *프로그램이고*, *당신은 그 프로그램의 *밖에 있다*"는 사실의 자각.

**"아하" 타이밍.**

- 첫 아하 (2시간): Sayori 자살 후 글리치.
- 두 번째 아하 (3시간): *내가 monika.chr 를 *지워야 한다*는 자각 — 보통 검색 후 도달 [확인함, Steam guides].

**Players missed.**

- *Monika.chr 가 어디 있는지 모르는 플레이어 다수*. Steam Community 토론에 "어떻게 지우냐" 질문 빈번 [확인함, Steam Community discussions].
- *Monika 를 일찍 지우면 *그녀가 그 사실을 알아챈다* — 이 분기를 의도적으로 발견한 플레이어는 소수.

---

### 5. Pony Island (2016, Daniel Mullins)

**Credits.** Daniel Mullins 단독 개발. 1.5년 개발 [확인함, Wikipedia: Pony Island].

**가르쳐야 했던 unfamiliar mechanic.** "*당신이 다운로드한 *Pony Island* 게임은 *악마(Lou Natas)의 영혼 수확 도구*다. 게임을 *고치는 것*이 게임 플레이의 일부다. 그리고 *프로그래밍*하는 것이 *적과 싸우는 것*이다."

**Diegetic teaching mechanism.**

1. **메인 메뉴가 *깨져 있다*** — 시작 버튼이 *클릭되지 않고*, *Hopeloda* 라는 NPC 가 "이 게임은 망가졌다" 고 채팅 [확인함, Wikipedia].

2. **유사-코드 퍼즐** — 의사 코드 블록(`MOVE_LEFT`, `JUMP`)을 *재배열*하여 *게임 자체의 동작을 수정*한다 [확인함, Wikipedia].

3. **인-게임 채팅** — Hopeloda 와 Lou Natas 가 *실시간 채팅창*으로 말한다 — 게임의 *내러티브*가 *UI 의 평소 자리*에서 일어난다 [확인함, Wikipedia].

**Why it succeeded.**

Mullins 의 의도: "*play 되라고 만들어지지 않은* 게임의 느낌". 최소한의 instructions 와 *familiar interface* 위에 *불길한 시스템* 구축 [확인함, GameRant interview].

**"아하" 타이밍.**

- 5분: 시작 버튼이 깨져 있고 *옆의 코드 블록*을 만져야 함.
- 30분: Lou Natas 와의 첫 대면.
- 끝나기 직전: 본인의 *프로젝트 이름이 게임 외부 파일에 새겨졌다*는 자각.

**Players missed.**

- 2시간 짜리 게임이라 *미스율 낮음*. 다만 *진엔딩의 외부 파일 단서*는 발견율 낮음 [추측임].

---

### 6. Hypnospace Outlaw (2019, Tendershoot / Jay Tholen)

**Credits.** Jay Tholen 리드 (Dropsy 의 그 사람), TetroniMike, ThatWhichIs Media. No More Robots 퍼블리시. 2019 PC, 2020 Switch/PS4/XB [확인함, Wikipedia].

**가르쳐야 했던 unfamiliar mechanic.** "*당신은 1999년 가상 인터넷 *Hypnospace*의 컨텐츠 모더레이터다*. 게임에는 *튜토리얼이 없고*, *OS를 *사용해서* 일을 한다*. 검색·다운로드·신고가 *전부 OS의 평범한 행동*이다."

**Diegetic teaching mechanism.**

1. **게임 = OS** — 시작 즉시 *Windows 9x 풍 OS*가 나타난다. *게임 UI 가 없다 — OS 가 게임이다* [확인함, Wikipedia].

2. **Hypnospace Explorer** — Internet Explorer 풍 *가상 브라우저*. 일을 하려면 *실제로 탐색해야 한다* [확인함, Wikipedia].

3. **메일·채팅이 *임무 지시*** — *튜토리얼 텍스트가 없다*. 보스가 *이메일*을 보내고, 플레이어는 *이메일 클라이언트를 열어 답한다* [확인함, Wikipedia].

**Why it succeeded.**

Tholen 이 Noclip Crewcast (2020) 에서 명시: *OS literacy 가 있는 플레이어*가 *튜토리얼 없이 *직관적으로 *알게 만들기 위해* 모든 UI 가 *현실 OS 의 직접 패러디* [확인함, Noclip Crewcast #37]. *기존 OS 사용 경험*이 *튜토리얼을 대체*한다.

**"아하" 타이밍.**

- 5분: OS 가 부팅되고 *플레이어가 알아서 마우스로 클릭하기 시작*. *튜토리얼 없이도 *그게 게임이라는 것을* 안다.
- 1시간: 첫 *위반 컨텐츠*를 *내가 알아서 찾아낸 순간*의 만족.

**Players missed.**

- 1999 OS 컨벤션을 모르는 *어린 플레이어*는 *어려움 호소* [확인함, Steam reviews 일부]. 1차 페르소나 외 진입 시 *진입 장벽이 됨*.

---

### 7. There Is No Game: Wrong Dimension (2020, Draw Me a Pixel)

**Credits.** Pascal Cammisotto 리드. 2015 Game Jam 작 *There Is No Game*의 풀-스코프 후속작 [확인함, Wikipedia: TINGWD].

**가르쳐야 했던 unfamiliar mechanic.** "*당신이 켠 *것*은 *게임이 아니다*. *Narrator*가 당신에게 *플레이하지 말라*고 부탁한다. 그를 *거역*하는 것이 *플레이*다."

**Diegetic teaching mechanism.**

1. **역심리학 디자인** — Cammisotto 인터뷰: "당신에게 *이 아이콘을 만지지 마*라고 말하면, 당신은 그것을 만진다. 이것이 이 세계의 룰을 가르치는 방법이다" [확인함, Game Developer 인터뷰: "Bending genres and breaking rules"].

2. **메인 메뉴를 *분해해 사용한다*** — 시작 메뉴의 글자·아이콘을 *떼어내 도구로 사용*한다 [확인함, CBR review].

3. **Narrator 가 곧 캐릭터** — *Stanley Parable* 식 narrator 가 *유일한 친구이자 적대자* [확인함, Game Developer 인터뷰].

**Why it succeeded.**

UI 와 *놀이*의 경계를 지운다. *플레이어의 첫 본능*(메뉴 클릭)이 곧 첫 *플레이*가 된다.

**"아하" 타이밍.**

- 30초: 메인 메뉴를 클릭하면 *Narrator 가 거부*. 거부를 *부수는 것*이 첫 행동.
- 1시간: 게임이 *장르를 바꾼다*. *Zelda* → *클리커* → *비주얼 노벨*.

**Players missed.**

- 후반부의 *장르 폭주*가 일부 플레이어에게 "너무 산만하다"는 평가 [확인함, Steam reviews].

---

## Tier 2 — 보충 분석 (300+ words each)

### 8. The Stanley Parable / Ultra Deluxe (2013/2022, Davey Wreden & William Pugh)

**가르쳐야 했던 것.** "*Narrator 는 당신을 *원하지 않는 곳으로 *몰고 간다*. *그를 *따르지 않는 것*도 *플레이*다.*"

**Mechanism.** Kevan Brighting 의 narrator 가 *플레이어의 모든 결정에 반응*. *문 선택*같은 사소한 결정조차 *다른 엔딩으로 분기*. Ultra Deluxe (2022) 의 *Museum Ending* 은 *콘텐츠를 더 달라는 플레이어의 욕망*에 대한 메타-비평 [확인함, Wonderful Museums analysis].

**Why it worked.** Wreden 자신의 말 — "*메타-게임에 *관한 게임이 아니다. *인간 경험*에 *관한* 게임이다" [확인함, Vice 인터뷰]. 메타-UI 가 *목적이 아니라 *공감의 수단이라는 점.

**Aha timing.** 첫 2분 — narrator 의 지시를 따르지 않으면 *narrator 가 화를 낸다*. 즉시 직관됨.

**Missed.** *너무 자명함*. 다만 일부 플레이어가 1엔딩으로 끝내고 *3시간 컨텐츠가 더 있다는 사실을 모름*.

**ECHORIS 시사점.** *Rustborn* 의 어투를 *Narrator* 식으로 만들 경우의 위험 — *Narrator* 가 너무 *비꼬는 톤*이 되면 *플레이어가 Item World 진입을 *반항적 거부*할 수 있다. Rustborn 은 *친밀한 노 정성* 톤이어야 한다 [추측임, ECHORIS 페르소나 정합 추론].

### 9. Pathologic 2 (2019, Ice-Pick Lodge)

**가르쳐야 했던 것.** "*세이브는 *공짜가 아니다*. *죽음은 *벌칙으로 누적된다*. *시계는 NPC 다.*"

**Mechanism.** 시계 앞에서만 세이브 가능. 죽으면 Mark Immortell (극장의 감독·메타-캐릭터)이 *세이브 파일에 영구 패널티*를 새긴다 — HP 감소, 허기 감소, *부검에서 장기 대신 솜·단추가 나오는 저주* [확인함, Pathologic Wiki: Game Mechanics].

**Why it worked.** *세이브의 메타-안전망*을 *캐논화*. 죽음이 *실제로* 무게가 있다. *재시도 가능한 RPG* 컨벤션을 부순다.

**Missed.** *불공정하다는 강력한 반발*. Steam reviews mixed [확인함, GND-Tech, EGM review].

**ECHORIS 시사점.** ECHORIS 의 *Trapdoor Descent* (DEC-039) 와 유사한 *내려가는 것의 무게*. 다만 *벌칙 누적*은 *야리코미*와 충돌하므로 직접 차용 금지 [추측임, ECHORIS 페르소나 충돌].

### 10. Disco Elysium (2019, ZA/UM)

**가르쳐야 했던 것.** "*당신의 *스킬*은 *NPC다*. *당신의 *생각*은 *장착 가능한 장비*다."

**Mechanism.** 24개 스킬(*Inland Empire*, *Electrochemistry* 등)이 *내적 목소리*로 *대화에 끼어든다*. Thought Cabinet — *생각을 슬롯에 장착*하는 UI. 12 슬롯 한계. 일부 생각은 *완성에 시간 소요* [확인함, Disco Elysium Wiki: Thought Cabinet; devblog 2019-09-30].

**Why it worked.** 스킬 체크가 *내적 목소리 캐릭터*가 되어, *수치가 인격화*된다. 플레이어는 *낮은 능력을 단점으로 느끼지 않고 *캐릭터의 결*로 느낀다.

**ECHORIS 시사점 — 매우 강함.** *Rustborn* 의 4·5색 기질이 *5인의 내적 목소리* 처럼 작동 가능. *Forge 가 분노로 외친다*, *Iron 이 결연하게 말한다*, *Rust 가 체념을 속삭인다* — 무기 *Ego*의 5색 기질이 *Disco Elysium* 의 24 스킬의 *축약된 5인 회의*가 될 수 있다 [추측임, ECHORIS 적용 hypothesis].

### 11. Eternal Darkness: Sanity's Requiem (2002, Silicon Knights)

**가르쳐야 했던 것.** "*UI 가 거짓말할 수 있다.* *세이브가 *지워졌다*고 가짜로 알릴 수 있다. *컨트롤러를 빼라*는 *가짜 시스템 메시지*가 게임의 일부일 수 있다."

**Mechanism.** Sanity Meter 가 낮아지면 *가짜 BSOD*, *가짜 demo 종료 화면*, *가짜 세이브 삭제 알림* 출현. 닌텐도 특허 등록된 메커닉 [확인함, Wikipedia: Eternal Darkness; AV Club article].

**Why it worked.** 2002 시점에서 *fourth wall 파괴의 선구*. *플레이어가 본인의 PC/콘솔을 의심하게 만드는* 첫 작품 [확인함].

**ECHORIS 시사점.** *직접 차용 금지* — ECHORIS 는 *공포 게임이 아니다*. 다만 *UI 가 거짓말할 수 있다*는 가능성을 *Rustborn* 의 *불신뢰 narrator* 모드로 살짝 차용 가능 [추측임].

### 12. Metal Gear Solid 2: Sons of Liberty (2001, Kojima)

**가르쳐야 했던 것.** "*당신이 받는 모든 지시는 *조작된 시뮬레이션이다*. *Colonel*은 *AI*이고, 그 AI 는 *플레이어의 환각*이다."

**Mechanism.** Colonel AI 의 후반 *Codec 통화 붕괴* — "*콘솔을 꺼라*" 직접 지시, *FISSION MAILED* 가짜 게임오버 화면 (작은 패널에서 게임이 계속 진행) [확인함, MGS Wiki; metagearsolid.org breakdown].

**Why it worked.** Kojima의 의도: "*Solid Snake 의 환상이 *진짜가 아니라는 사실*에 *깨어나게* 하기" [확인함, metagearsolid.org Official Review].

**ECHORIS 시사점.** *Rustborn* 이 *완벽한 안내자가 아니라는 *암시*를 후반에 심을 수 있는 선례. 다만 *Phase 1-2 에서는 *순수 안내자*에 한정* [추측임].

### 13. Frog Fractions (2012, Twinbeard / Jim Crawford)

**가르쳐야 했던 것.** "*당신이 시작한 *수학 교육 게임*은 *수학 게임이 아니다*. *15분 후 *우주선 슈팅*이 된다. *그것도 진짜가 아니다*."

**Mechanism.** Jim Crawford 의 의도: "*tutorial 을 읽지 않는 친구가 *Zelda 의 숨겨진 메커닉을 발견*하는 *그 기쁨*을 게임의 *전체 디자인*으로 만들기" [확인함, Game Developer "Frog Fractions and 'the joy of discovery'"].

**Why it worked.** *모든 새 시스템이 *발견*된다. 알림이 없다.

**ECHORIS 시사점.** *Item World 진입*을 *발견*으로 만드는 케이스. *튜토리얼이 아닌 *비밀로 가르치기*의 극단적 예시 [추측임].

### 14. In Stars and Time (2023, insertdisc5)

**가르쳐야 했던 것.** "*당신은 *루프* 안에 있다. *SAVE/LOAD 가 *캐논*이다. Siffrin 은 *루프를 *기억한다*."

**Mechanism.** Undertale 의 직계 후계. 매 루프마다 *친구의 *기억을 장비처럼 *장착*. 가위바위보가 *전투*. *시간의 잔혹함*이 *루프 횟수*로 시각화 [확인함, Wikipedia: ISAT; Pocket Tactics review].

**Why it worked.** *루프의 *피로*를 *디자인 자체로 *공감*시킨다. Siffrin 이 지치는 것을 *플레이어도 지친다*.

**ECHORIS 시사점.** ECHORIS 의 *아이템계 무한 반복*과 가장 가까운 작품. *Rustborn* 이 *루프의 *기억 *을 보존*함으로써 *야리코미의 *피로*를 *내러티브로 *치환* 가능 [추측임, 강력한 적용 hypothesis].

### 15. OFF (2008/2024, Mortis Ghost)

**가르쳐야 했던 것.** "*당신이 *정화*하고 있는 세계는 *원주민의 세계다*. *당신은 *침략자*다." (반전 엔딩)

**Mechanism.** 평범한 RPG 시작 → 후반에 The Batter 가 *세계를 *지우는 *것*이 *임무*였다는 폭로 [확인함, GamesRadar OFF review 2024 remake; Wikipedia: OFF].

**Why it worked.** Toby Fox 가 직접 *Sans 의 캐릭터 디자인이 OFF 의 *Judge*에서 영향받았다*고 언급 [확인함, GamesRadar; Smash Jump interview with Mortis Ghost].

**ECHORIS 시사점.** *후반 폭로의 *세계관 반전*은 ECHORIS Phase 4 의 *Memory Shard* 시스템 후반 비밀과 잠재적 정합. 다만 *온보딩 단계에선 무관*.

### 16. YIIK: A Postmodern RPG (2019, Ackk Studios)

**실패 사례 분석.** Metacritic ~60대 [확인함, Metacritic].

**왜 실패했나.** 평론 종합 — *메타-RPG 의 *코스튬*만 입었지 *그 메타 자체가 무엇을 가르치는지가 *공허*. 메커닉이 *플레이어를 방해하는 데만* 시간을 쓰고, *그 방해가 *내러티브와 *연결*되지 않음 [확인함, GameSpot; ScreenRant; Gamecritics reviews].

**ECHORIS 시사점 — 가장 중요한 *반례*.** *Item World 진입*이 *unfamiliar*하기만 하고 *Erda 의 *내러티브*와 *연결되지 않으면 *YIIK 의 길*. 진입 자체가 *Rustborn 의 *기억의 잔재*임을 *Phase 1 부터 *내러티브적으로 *잠금*해야 함 [추측임, 강력한 경고].

---

## Tier 3 — 짧은 언급

### 17. EarthBound (1994, HAL/Itoi)

플레이어 이름이 *엔딩에서 호명*되는 첫 RPG. Undertale 의 *직접적 조상* [확인함, 통념]. ECHORIS 적용: *Erda 의 이름*을 플레이어가 정하는 옵션은 *과한 차용*이므로 회피.

### 18. The Hex (2018, Daniel Mullins)

Inscryption 의 직계 전작. *6 게임 장르가 한 호텔에 모인다*. 메타-UI 의 *Mullins 디자인 진화 트랙* [확인함, Wikipedia: The Hex].

### 19. IMSCARED (2012, Ivan Zanotti)

*OS 파일 시스템*에 *파일을 만들어*  플레이어 PC 외부에 메시지를 남기는 *호러 ARG 의 선구* [확인함, 통념]. DDLC·OneShot 의 조상.

### 20. Petscop (2017, web series)

가짜 PS1 게임의 가짜 캡처. 게임이 아니지만 *fake-UI 의 *내러티브적 *호러*가 강력. ARG 영향 [확인함, 통념].

### 21. 2024–2026 indie 후계

- *Slay the Princess* (2023) — 메타-narrator + 분기
- *Pseudoregalia* (2023) — 메트로베니아 + 픽셀 *unfamiliar* (참조 점만)
- *Animal Well* (2024) — 비밀-중심 metroidvania, 튜토리얼 0 [확인함, 통념].

이들은 ECHORIS 의 *발견 기반 온보딩* 의 동시대 동료다.

---

## 통합 시너지스 — Top 7 Diegetic Teaching Devices

본 22개 작품에서 *반복적으로 등장하고 *작동한 *7개 기법:

### 1. **"친숙한 UI 위에 새 의미를 얹기"**

Undertale 의 FIGHT/ACT/ITEM/MERCY 4버튼이 *완전 평범한 RPG 메뉴*인데 *MERCY* 가 새로운 것. 새 UI 학습 비용 = 0. *기존 UI 의 *자유도*에 *새로운 의미가 *추가*되는 것뿐 [확인함].

### 2. **"믿게 만든 후 부수기" (Trust → Betrayal → Reframe)**

Inscryption Act 1 → Act 2 전환, DDLC Act 1 → Act 2 자살, Pony Island 메뉴 깨짐. *처음 1–3시간은 평범*하게 두고, *플레이어가 *예측 가능*하다고 *확신*한 후*에 *부순다* [확인함].

### 3. **"UI 가 NPC"**

Stanley Parable narrator, DDLC monika.chr, OneShot Niko, Disco Elysium 스킬-목소리, Inscryption Leshy. *시스템이 *말한다*. 그 시스템이 *캐릭터다* [확인함].

### 4. **"외부 파일 시스템을 게임 안으로"**

OneShot OS이름·바탕화면, DDLC chars/monika.chr, IMSCARED 실제 파일 생성. *게임 외부가 *내부의 일부*가 된다 [확인함]. — *고도 페르소나 의존*. 영어권 코어 미만에선 발견율 낮음.

### 5. **"역심리학·금지의 유혹"**

TINGWD 의 *"이 아이콘을 만지지 마"*, Stanley Parable narrator 의 *"이 문으로 가지 마"*. *금지가 곧 *지시*다. *튜토리얼을 *반대로 *말함* [확인함, Cammisotto 직접 발언].

### 6. **"SAVE/LOAD/RESET 의 캐논화"**

Undertale Sans, ISAT Siffrin, Pathologic 2 Mark Immortell. *플레이어의 *메타-안전망*을 *게임이 *기억한다* [확인함].

### 7. **"메인 메뉴/세이브 포인트 자체가 *세계의 일부*"**

Inscryption 캐빈, Hypnospace OS 부팅, Pony Island 메인 메뉴 깨짐, TINGWD 메뉴 분해. *시작 화면이 *놀이 표면*이다 [확인함].

---

## Timing Patterns — 메타-UI 레슨은 *언제* 떨어지나

| 시점                | 기법                                            | 사례                                                        |
| :------------------ | :---------------------------------------------- | :---------------------------------------------------------- |
| **0–5분**           | 메뉴 자체가 깨져 있음 / 역심리학                | Pony Island, TINGWD, Stanley Parable                        |
| **15–60분**         | 첫 보스가 *컨벤션을 거역*                       | Undertale Toriel, Disco Elysium 첫 스킬 체크                |
| **2–4시간 (1막 끝)** | 신뢰 빌드업 후 *시스템이 부서진다*              | Inscryption Act 1→2, DDLC Act 1→2                           |
| **중반 (50–70%)**   | 게임이 *플레이어의 기억을 *언급*                | Undertale Sans Genocide, ISAT Siffrin                       |
| **엔드게임/포스트** | *세이브 파일이 *영구 표시되거나 *외부 파일* 작성 | Undertale (영구 플래그), DDLC (monika.chr), OneShot Solstice |

**ECHORIS 적용 권고.** Item World 의 *unfamiliarity*는 *0–5분*에 *메뉴 차원의 *암시*만, *15–60분*에 *체험적 *해소* 가 적정. *2–4시간 *지연 *위험* — 플레이어가 *이미 metroidvania 로 *프레임 굳혀*버리면 *Item World 가 *부록 기능*으로 보임 [추측임, 강력한 가설].

---

## Trust Budget — 신뢰 곡선

각 작품이 *몇 시간 동안 *"정상 *룰*"을 *신뢰*시키는가:

```
0h ─────────── 1h ─────────── 2h ─────────── 4h ─────────── 8h
│              │              │              │              │
Undertale: Flowey 거짓말 즉시 (5분), Toriel 보스 (40분)
Pony Island: 메뉴 깨짐 즉시 (1분)
TINGWD: narrator 즉시 (30초)
Stanley Parable: narrator 즉시 (1분)
DDLC:                                ─── Act 2 자살 (2h) ──
Inscryption:                                                ─ Act 2 (5h) ─
ISAT:                          ─ 첫 루프 (1h) ─
Pathologic 2: 죽음 1회 (1h) → 세이브 패널티 캐논 (1.5h)
Hypnospace: OS 즉시 (1분), 임무 (10분)
```

**관찰.** 두 극단:
- **A형 (즉시 폭로):** 메뉴 차원에서 *즉시* 메타-UI 도입 (Pony Island, TINGWD, Hypnospace). *unfamiliar* 가 *전체 기조* — 신뢰 부담 0.
- **B형 (장기 신뢰 후 폭파):** 1–5시간 평범 후 *대폭로* (DDLC, Inscryption). 충격은 강함, 다만 *조기 이탈자*에게는 *메시지가 도달 못 함*.

**ECHORIS 의 선택.** ECHORIS 의 *unfamiliar mechanic* (Item World) 은 *코어 promise* 이므로 **A형 권고**. *Steam 페이지*에서 이미 광고된 *"무기에 들어간다"*가 *최초 30분 안에 *체험 *되어야* trust budget 누수 없음. *DDLC/Inscryption 식 지연 폭로*는 *Item World 가 게임의 *서브가 아니라 *주축*이라는 사실과 *모순* [추측임, 강력한 가설].

---

## Failure Patterns — *gimmick* vs *earned*

YIIK 와 Undertale 의 *차이*는 어디서 오나? 평론 종합 [확인함, 평론 다수]:

| 축                       | Earned (Undertale)                                                  | Gimmick (YIIK)                                          |
| :----------------------- | :------------------------------------------------------------------ | :------------------------------------------------------ |
| **메타가 *무엇을* 가르치나** | "*폭력 RPG 컨벤션 자체가 *질문될 수 있다*"                          | "*RPG 컨벤션을 *비꼰다*" (대상이 *없다*)                |
| **메커닉과 *내러티브* 정합** | MERCY = Frisk 의 결단 = 플레이어의 결단 — 3중 정합                 | 비꼬는 텍스트 ≠ 비꼬는 시스템                          |
| ***반복 플레이* 효과**     | 두 번째·세 번째 회차에 *다른 의미*로 *재해석*                       | 두 번째 회차에 *같은 농담의 반복*                       |
| **플레이어 *작용*의 무게** | *플레이어의 *결정*이 *작품의 *주제다*                              | *플레이어의 결정이 *조롱의 대상*                       |

**ECHORIS 적용 — 핵심 안전판.**

Item World 진입이 *gimmick* 으로 보일 위험 신호:
- **(a)** Item World 가 *Erda 의 내러티브*에서 *분리*돼 있음 (= 그냥 *던전*에 가는 *추가 버튼*)
- **(b)** Rustborn 의 5색 기질이 *플레이어의 *결정*과 무관 (= *플레이버 텍스트*에 머묾)
- **(c)** Memory Shard 가 *통계*에 머묾 (= "+5 ATK" 만이지 *기억의 *회상*이 아니라*)
- **(d)** 두 번째 무기 진입이 *첫 번째와 *기조가 *동일*

**Earned 확보 조건.** Item World 진입이 *Rustborn 의 *기억 회상*이라는 *내러티브 트리거*와 *기계적*으로 *얽혀야* 함. *모루 타격*이 *Rustborn 의 *기억을 흔드는* 행위로 *내러티브 정당화* 필요 [추측임, ECHORIS 페르소나 정합 추론].

---

## "You don't need to be told" Threshold

플레이어가 *팝업/툴팁 없이* 시스템을 *직관*하기 시작하는 지점:

- **OS literacy 기반 게임 (Hypnospace, DDLC)**: 즉시. 단, *비-OS-네이티브* 페르소나는 *영원히 *못함*.
- **장르 컨벤션 기반 (Undertale, OneShot)**: 첫 보스 (15–40분). RPG 를 한 번이라도 해본 *모든* 플레이어 적용.
- **시리즈 컨벤션 기반 (MGS2)**: *Solid Snake* 팬은 즉시, 비-팬은 *영원히 *못함*.

**ECHORIS 의 위치.** *Disgaea 팬*은 즉시 (1차 niche). *영어권 metroidvania·소울라이크 코어*는 *Phase 1 의 *툴팁·KeyPrompt 도움* 으로 *15–40분 안 *직관 도달* 가능 [추측임]. *비-niche 진입자*는 *Steam 페이지·트레일러*로 사전 면역 필요 — *광고가 곧 *튜토리얼* 의 일부 [확인함, Pony Island/Inscryption Steam 페이지의 *의도된 *모호함*과 동일 전략].

---

## ECHORIS 적용 후크

### Q1. 어떤 3개 기법이 *"무기에 들어간다"* 에 가장 잘 이식되나?

**선정 3종 (우선순위 순):**

1. **"친숙한 UI 위에 새 의미"** (Undertale 기법 #1). — 기존 *인벤토리 슬롯*이 *이미 *Item World 진입 입구*임을 *물리적으로 *시연*. 무기를 *선택*하는 행위 자체가 *입구를 *바라보는 *행위*가 되도록 인벤토리 UI 를 디자인 [추측임, 적용 hypothesis].

2. **"UI 가 NPC" (Rustborn = Disco Elysium 스킬-목소리 변형)**. — Rustborn 이 *대장간/세이브 포인트 UI 옆에서 *말한다*. UI 의 *고정 위치*에 *항상 그가 있다*. 플레이어가 *Item World 진입 버튼*을 *볼 때마다 *그가 *간접적으로 *권유*. — 단, *간섭은 *낮은 빈도*로 유지 (= ECHORIS 의 *침묵 톤* 보존).

3. **"메타-UI 가 *대장간*이라는 *세계의 일부*"** (Inscryption 캐빈 기법 #7). — 대장간이 *단지 *메뉴*가 아니라 *Erda 가 *물리적으로 *서있는 *공간*. *모루 타격*이 *진입 의식*임을 *공간이 *말한다*. (이미 ECHORIS 가 채택한 방향 — *강화*에 그침.)

### Q2. Rustborn 의 *introduces Item World* 라인 — Sans/Leshy 등가 대사 후보

ECHORIS 의 톤 정합 ( *한정흥*, *침묵 주인공*, *부식 강판*, *말하는 검*) 기반 후보. 모두 [추측임, 1차 안].

**Option A — 직접 권유 (Leshy 식, 강력하지만 위험).**
> "Erda. *나*는 *기억의 무덤*이다. *너*는 들어가야 한다. *그것이 *시작이다*."

risk: 너무 *지시적*. Erda 의 침묵·플레이어의 *선택의 무게*를 *덮어버림*.

**Option B — 의문 형태 (Undertale 식, 권장).**
> "*안*. 너는 ... *안*을 본 적 있나? *나*의 안 말이다. ... *모루*가 들으면, 보일지도 모른다."

작동 이유: *질문*은 *플레이어가 *답한다*. *시연 (모루 타격)* 이 *답*이 된다.

**Option C — 회상 단편 (Disco Elysium 식, 강력 권장).**
> "*불에 *데인 *적*이 있다. ... *그날*의 *얼굴*을 *나는 *못 *본다*. ... 누군가 *대신 *봐줘야 한다. *그러려면 *안에 들어와야 한다*."

작동 이유: *Rustborn 의 *결핍*이 *진입의 *내러티브 정당화*. *플레이어가 *해결자*. — *gimmick* 위험 제거.

**Option D — 침묵 + UI 시각 단서 (OneShot 식, 백업).**
대사 0줄. *대장간 옆에 *Rustborn 이 *물리적으로 *흔들리고*, *모루 옆에 *KeyPrompt 가 *희미하게 켜진다*. *플레이어가 *알아챘을 때만 진입.

**권장 조합.** **C + D 의 혼합.** Rustborn 의 1줄 회상 단편 *후* 침묵 → KeyPrompt 출현. *그가 *말하지 않는 *시간*이 *그의 *고통*이라는 사실의 *시연*.

### Q3. "아하" 타이밍 매핑

| 옵션                    | 위치                            | Pros                                                                          | Cons                                                                              |
| :---------------------- | :------------------------------ | :---------------------------------------------------------------------------- | :-------------------------------------------------------------------------------- |
| **(a) 첫 5분**          | 시작 직후 첫 무기 획득 후       | Steam 카피와 정합. *코어 promise 즉시 *체험*. *trust budget 최소*.            | Erda 의 *능력 게이트 *학습 *시간* 부족. metroidvania 컨벤션 학습 *지연*.      |
| **(b) 첫 세이브포인트** | 15–30분 (대장간 도착 시)        | *대장간*이라는 *공간이 *진입 의식의 *무대*. metroidvania 1차 학습 후 *전환*. | Steam 광고를 *본 후 30분간 *기다리는 *답답함* 위험.                              |
| **(c) 첫 사망 후**      | 30–60분                         | *죽음*의 무게가 *진입의 *치료*로 *연결*.                                       | *어느 죽음*에 트리거할지 변동성. *튜토리얼 보스* 이전엔 너무 빠름.              |
| **(d) 첫 보스 후**      | 1–2시간                         | *Inscryption Act 1→Act 2* 식. *충격 강함*.                                    | 1–2시간 *지연*은 *코어 promise 누수*. *Item World 가 *부록처럼 보임* 위험. |

**권장.** **(b) 첫 세이브포인트 (대장간 도착 시)**, 단 *(a) 시작 5분 *예고*가 *대장간 전까지 *내러티브적으로 *깔림*.

구체:
- **0–5분**: 첫 무기 획득. Rustborn 첫 발화 (Option C 의 짧은 버전). *진입 가능 단서 없음*.
- **5–25분**: metroidvania 컨벤션 학습 (이동·공격·기본 적). Rustborn 침묵.
- **25–35분**: 첫 *대장간/세이브 포인트* 도달. Rustborn 의 *두 번째 발화*. *모루* 옆 *KeyPrompt* 점등. → *진입*.

### Q4. Trust-budget 질문 — *front-load* vs *delay*

본 리서치는 **front-load (옵션 A형)** 를 권장. 사유:

1. **Steam 카피·트레일러가 이미 *promise 를 노출*** — *delay 는 *광고와 *체험의 *괴리*를 만든다 (DDLC 의 *위장*과 ECHORIS 의 *광고된 promise* 는 *반대 입장*).
2. **Phase 2 검증 KPI** — *Item World 진입*이 *코어 루프*. 1–2시간 *지연 *튜토리얼*은 *플레이테스트의 *재미 검증*을 *지연*시킴.
3. **메트로베니아 페르소나 정합** — *메트로베니아 코어*는 *첫 *능력 게이트*를 *첫 30분 내 *기대*. *Item World 진입*을 *최초 능력 게이트의 *대체로 *프레이밍* 가능 [추측임].

**예외.** *Item World 진입 후 *재 *진입*은 *DDLC 식 *trust-breaking* 패턴이 적용 가능 — Stratum 2 진입 시 *Rustborn 의 *불안*이 *깊어진다*. (Phase 2 후반·Phase 3 권고.)

### Q5. Anti-pattern — Item World 가 *gimmick* 으로 보이는 신호

**경고 시그널 (반드시 회피):**

1. **YIIK 패턴**: Item World 진입이 *Erda 의 내러티브와 분리*. *어떤 무기든 *같은 텍스트*가 *나옴*. → *Rustborn 의 *기억*과 *5색 기질*이 *진입마다 *다른 발화*를 *내야* 함.
2. **MGS2 후기 패턴**: *말하는 검*이 *너무 자주 *간섭*. *온보딩의 *전령*에서 *내내 *짖는 *동반자*가 됨. → *대사 빈도 cap*. Rustborn 발화는 *상황 트리거*에만.
3. **Inscryption Act 2 거부 패턴**: *Item World 의 *비주얼이 *Erda 월드와 *너무 분리*. *플레이어가 *Erda 월드를 *그리워함*. → *Item World 도 *Erda 의 *동일 입력·전투 *컨벤션* 유지. *변화는 *팔레트·맵 절차 생성*에만.
4. **Pathologic 2 거부 패턴**: *세이브 패널티*. → *Item World 사망*에 *Erda 월드 패널티 *주지 *말 것*. *야리코미 페르소나와 *충돌*.

### Q6. UI metamorphosis — 인벤토리가 *Item World 뷰가 되는가?*

**검토.** Inscryption Act 1→2 식 *완전 UI 변신*은 *과한 차용*. ECHORIS 의 *2-Space* 는 *분리*이지 *변신*이 아니다.

**권장 약화안.**

- **인벤토리 슬롯의 *깊이감*** — 무기 슬롯을 *2D 아이콘*이 아니라 *작은 단면도* (다마스커스 결)로. *클릭/호버 시 *결이 *흐른다*. → *"안이 있다"* 의 *시각적 *사전 시그널*.
- **모루 옆 UI** — *모루 화면*이 *무기를 *해부 단면*으로 *전환*. *Inscryption 의 *카드 → 픽셀 RPG 식 *경계 전환*의 *작은 버전*.
- **Item World 진입 페이드** — *현행 페이드 유지* (DEC-039 식 Trapdoor 는 Stratum 간만). *첫 진입의 *납치 피드백*은 금지* (`feedback_itemworld_entry_keep`).

**Hypnospace 시사점.** 인벤토리·대장간·맵을 *모두 *Erda 의 *손바닥 *기억판*같은 *통일된 *물리 표면*으로 디자인하면 *OS 통일*과 유사한 *통일된 *메타-언어* 가능 [추측임, Phase 3 검토 가치].

---

## 결론 — ECHORIS Item World 진입의 메타-UI 사양 (요약)

본 리서치가 권장하는 *최소 사양*:

1. **신뢰 곡선: A형 (front-load)**. 첫 30분 안에 *체험 완료*.
2. **3개 기법:** 친숙 UI 의미 재할당 + UI 가 NPC (Rustborn) + 메타-UI 가 *공간* (대장간).
3. **Rustborn 톤:** Disco Elysium 식 *내적 목소리* + OneShot 식 *간헐적 침묵*. Stanley Parable 식 *비꼼* 회피.
4. **아하 타이밍:** 첫 세이브포인트 (25–35분), 0–5분 예고.
5. **Anti-pattern 방지:** YIIK 식 *분리* 절대 금지. *진입마다 *다른 발화·다른 결*.
6. **UI 변신:** 인벤토리 *결 시각화* + 모루 *해부 단면 전환*. *완전 UI 변신은 *Phase 3 검토 항목*.

**Cross-reference.** `Documents/Design/Design_ItemWorld_Onboarding_SwordEgo.md` 의 현행 사양과 비교 검증 필요. 본 문서는 *외부 raw research* — 그쪽 SSoT 를 *덮어쓰지 않는다*. 그쪽 문서가 *본 문서를 *인용하여 *근거*를 강화하는 방향.

---

## 참고 자료 (Sources)

**개발자 인터뷰·devlog:**
- [Toby Fox – DEV 2 DEV INTERVIEW (2013, meloshantani.wordpress.com)](https://meloshantani.wordpress.com/2013/05/25/toby-foxs-undertale-dev-2-dev-interview-1/)
- [Toby Fox – The Mary Sue interview](https://www.themarysue.com/interview-undertale-game-creator-toby-fox/)
- [Daniel Mullins – GDC Vault: "Sacrifices Were Made: The Inscryption Post-Mortem"](https://gdcvault.com/play/1027609/Independent-Games-Summit-Sacrifices-Were)
- [Daniel Mullins – GameRant Inscryption interview](https://gamerant.com/inscryption-interview-developer-daniel-mullins-3d-retro-horror-games/)
- [Daniel Mullins – GameDeveloper "How a game jam on sacrifices became Inscryption"](https://www.gamedeveloper.com/design/how-game-jam-sacrifices-became-inscryption)
- [Daniel Mullins – Escapist Design Delve live](https://www.escapistmagazine.com/inscryption-game-design-discussion-live-daniel-mullins-creator/)
- [Pascal Cammisotto – GameDeveloper "Bending genres and breaking rules in TINGWD"](https://www.gamedeveloper.com/game-platforms/bending-genres-and-breaking-rules-in-i-there-is-no-game-wrong-dimension-i-)
- [Davey Wreden – Vice "The Man Behind The Stanley Parable"](https://www.vice.com/en/article/the-man-behind-the-deconstructionist-mod-ithe-stanley-parablei/)
- [Davey Wreden – Gamercamp 2013 (That Shelf)](https://thatshelf.com/gamercamp-2013-the-stanley-parables-davey-wreden/)
- [Jay Tholen – Noclip Crewcast #37 Hypnospace Outlaw](https://noclippodcast.libsyn.com/37-hypnospace-outlaw-with-jay-tholen)
- [Jay Tholen – Software Engineering Daily bonus episode](https://softwareengineeringdaily.com/2024/01/05/bonus-episode-hypnospace-outlaw-with-jay-tholen/)
- [Mortis Ghost – Smash Jump interview on OFF inspirations and Undertale](https://www.smashjump.com/features/interviews/mortis-ghost-talks-off-inspirations-the-future-and-undertale/)
- [Jim Crawford – GameDeveloper "Frog Fractions and the joy of discovery"](https://www.gamedeveloper.com/business/-i-frog-fractions-i-and-the-joy-of-discovery-)
- [Disco Elysium devblog – Introducing the Thought Cabinet](https://discoelysium.com/devblog/2019/09/30/introducing-the-thought-cabinet)

**위키·사전 (1차 사실 검증):**
- [Wikipedia: Undertale](https://en.wikipedia.org/wiki/Undertale) · [Toby Fox](https://en.wikipedia.org/wiki/Toby_Fox)
- [Wikipedia: Inscryption](https://en.wikipedia.org/wiki/Inscryption)
- [Wikipedia: OneShot](https://en.wikipedia.org/wiki/OneShot)
- [Wikipedia: Pony Island](https://en.wikipedia.org/wiki/Pony_Island)
- [Wikipedia: Hypnospace Outlaw](https://en.wikipedia.org/wiki/Hypnospace_Outlaw)
- [Wikipedia: The Stanley Parable](https://en.wikipedia.org/wiki/The_Stanley_Parable) · [Davey Wreden](https://en.wikipedia.org/wiki/Davey_Wreden)
- [Wikipedia: In Stars and Time](https://en.wikipedia.org/wiki/In_Stars_and_Time)
- [Wikipedia: Frog Fractions](https://en.wikipedia.org/wiki/Frog_Fractions)
- [Pathologic Wiki: Game Mechanics](https://pathologic.fandom.com/wiki/Game_Mechanics)
- [Undertale Wiki: Flowey](https://undertale.fandom.com/wiki/Flowey) · [Toby Fox](https://undertale.fandom.com/wiki/Toby_Fox)
- [Inscryption Wiki: Act II](https://inscryption.fandom.com/wiki/Act_II) · [Leshy](https://inscryption.fandom.com/wiki/Leshy) · [Kaycee Hobbes](https://inscryption.fandom.com/wiki/Kaycee_Hobbes)
- [Villains Wiki: P03](https://villains.fandom.com/wiki/P03)
- [Disco Elysium Wiki: Thought Cabinet](https://discoelysium.wiki.gg/wiki/Thought_Cabinet)
- [Eternal Darkness Wiki: Sanity Effects](https://eternaldarkness.fandom.com/wiki/Sanity_Effects)
- [Metal Gear Wiki: Colonel (AI)](https://metalgear.fandom.com/wiki/Colonel_(AI))

**평론·분석:**
- [GameSpot: Inscryption Ending Explained](https://www.gamespot.com/articles/inscryption-ending-explained-arg-secrets-and-whats-going-on-in-the-story/1100-6497568/)
- [alejandromanzano.substack — Inscryption (2021) and the NPC's lament](https://alejandromanzano.substack.com/p/inscryption-2021-and-the-npcs-lament)
- [bunchashapes.tumblr – Inscryption essay](https://bunchashapes.tumblr.com/post/667345642508746752/i-felt-strongly-enough-about-inscryption-to-write)
- [Kotaku — The Stanley Parable Turns Storytelling On Its Head](https://kotaku.com/the-stanley-parable-turns-video-game-storytelling-on-it-5829254)
- [Wonderful Museums — Stanley Parable Museum Ending](https://www.wonderfulmuseums.com/museum/stanley-parable-museum-ending/)
- [Medium — Oneshot: A story that speaks directly to the player](https://medium.com/@austin.bijumon/oneshot-a-story-that-speaks-directly-to-the-player-d1f762adb851)
- [AV Club — Tracing the roots of Eternal Darkness's infamous gimmick](https://www.avclub.com/tracing-the-roots-of-eternal-darkness-infamous-gimmick-1798272747)
- [metagearsolid.org — MGS2: A Complete Breakdown](https://metagearsolid.org/tag/a-complete-breakdown/)
- [Enosiophobia — Pathologic 2 review](https://enosiophobia.com/blog/pathologic-2-review/)
- [Pocket Tactics — In Stars and Time Switch review](https://www.pockettactics.com/in-stars-and-time/switch-review)
- [GamesRadar — OFF review (2024 remake)](https://www.gamesradar.com/games/rpg/off-review/)
- [GameSpot — YIIK review](https://www.gamespot.com/reviews/yiik-a-postmodern-rpg-review-a-bit-more-hipster/1900-6417066/)
- [ScreenRant — YIIK review](https://screenrant.com/yiik-post-modern-rpg-review/)
- [Gamecritics — YIIK review](https://gamecritics.com/eugene-sax/yiik-a-postmodern-rpg-review/)
- [CBR — There Is No Game: Wrong Dimension review](https://www.cbr.com/there-is-no-game-wrong-dimension-review/)
- [Backlog Magazine — There Is No Game: Wrong Dimension](https://www.backlogmag.com/there-is-no-game-wrong-dimension/)

**커뮤니티·플레이어 반응:**
- [Steam Community — Inscryption: "I came to complain about act 2"](https://steamcommunity.com/app/1092790/discussions/0/603017487742695530/?ctp=2)
- [Steam Community — DDLC: Delete Monika guides](https://steamcommunity.com/sharedfiles/filedetails/?id=1190477109)
- [Quora — DDLC Monika.chr deletion behaviour](https://www.quora.com/In-Doki-Doki-Literarure-Club-what-happens-if-you-delete-Monika-s-character-file-before-the-final-part-of-the-game-after-she-has-already-deleted-everyone-else)
- [ScreenRant — DDLC Plus delete Monika](https://screenrant.com/doki-doki-literature-club-plus-delete-monika/)
- [GiantBomb — Inscryption forum](https://www.giantbomb.com/forums/inscryption-806756/for-those-wondering-whether-this-eventually-opens--1898932/)

---

> 끝. 본 문서는 ECHORIS Item World 진입 사양의 *외부 레퍼런스 raw*. 적용 결정은 `Documents/Design/Design_ItemWorld_Onboarding_SwordEgo.md` 의 SSoT 갱신 시 본 문서를 인용한다.
