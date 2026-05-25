# 한정흥 리서치 — Korean Games & Han-coded Game Design 2010+
> 조사 범위: 2010-2026 글로벌 흥행 한국 게임 + 한정흥 차용 비-한국 게임
> 조사자: general-purpose agent (Claude Code)
> 일자: 2026-05-25
> 본 문서는 ECHORIS 한정흥 backbone(DEC-042) + 게임 design 강화용 raw research.
> 가장 직접 적용 가능한 reference layer.

---

## 0. 조사 프레임 — 한정흥의 게임 메커닉 변환

이번 리서치는 "내러티브 stated Han"이 아닌 **메커닉으로 전달되는 Han/Jeong/Heung**에 초점을 둔다. 게임이 어떤 문장으로 슬픔·연대·기쁨을 *말하는가*보다, 어떤 **system/loop/economy/feedback**으로 *경험시키는가*를 본다. ECHORIS는 2D pixel-art metroidvania + Item World + Memory Shard + 5색 기질 + 4-end 구조이므로, 각 reference의 메커닉을 ECHORIS surface로 환산 가능한 형태로 정리한다.

용어 출처 태깅: [확인함] = 1차 review/wiki/dev interview / [추측임] = 메커닉 관찰 기반 해석 / [근거 없음] = 추정만 가능.

---

## 1. Lies of P (Round8 / Neowiz, 2023) — Core reference

### 메타
- 개발: Round8 Studio (Neowiz 산하). 한국 스튜디오의 첫 글로벌 souls-like 성공작.
- 출처: Pinocchio (Collodi, 1883) 다크 리이매기닝. Belle Époque 가상 도시 Krat.
- 글로벌 비평: GameSpot, Kotaku, Eurogamer, GameRant 모두 호평. "FromSoft을 단순 모방한 게 아니라 *왜 그것이 작동하는가*를 이해한 한국 스튜디오." [확인함]

### Han 메커니즘
- **거짓말 시스템(Lie System)** — 진실을 말하면 인간성 상실, 거짓을 말하면 인간성 획득. 모든 NPC 분기·엔딩이 P가 *얼마나 거짓되었는가*에 따라 갈린다. [확인함] Han을 "참고 삼킨 진실"로 메커닉화한 대표 사례. 거짓 = *말로 표현되지 않은 슬픔의 누적*. 진실 = *고독 강화*.
- **Ergo 잃기 / 회수 루프** — Bloodborne의 souls drop 메커닉을 그대로 가져왔으나, Krat의 환경(폐허로 변한 인형의 도시)이 회수 자체에 *부조리한 의무감*을 부여. Han 특유의 "이미 끝났는데 끝내지 못함"의 게임화. [추측임]
- **Belle Époque 폐허 미장센** — 풍요의 절정에서 무너진 도시. 그리움(yearning)의 시각화. Krat 거리에는 한때 번성한 인형 카페·음악당이 시체와 함께 정지해 있다. [확인함]
- **Record stones / Memory dialogue** — 죽은 NPC가 남긴 기억의 파편을 줍는 시스템. P가 직접 화자는 거의 되지 못하고, 죽은 자들이 기록을 통해 말한다. 침묵하는 주인공 + 망자의 잔향 = Han의 정석. [확인함]

### Jeong 메커니즘
- **Hotel Krat = 거점 NPC 가족** — Geppetto, Sophia, Antonia, Eugenie, Polendina. 각자 P를 *부르는 호칭이 다름*(아들/꼬마/꼭두각시). Hub로 돌아갈 때마다 그들이 처음 만났을 때와 같은 자리에 *여전히 있다*. Jeong = 변하지 않는 자리의 존재. [확인함]
- **거짓말 분기 → NPC 죽음의 책임 분산** — 진실/거짓 선택이 NPC 운명을 바꾼다. 단순 선택지가 아니라 P의 *정체성 변화*가 NPC를 떠나게 만든다. Jeong을 *유지하려면 인간성을 깎아야 하는* 압박. [확인함]
- **Geppetto = 아버지-창조자 양가성** — 신뢰와 의심이 동시에 흐른다. 단순 호의 NPC가 아닌, "내가 너를 만들었으니 너는 내 것이다"의 그림자가 있는 부성. K-가족 정서의 메커닉화. [확인함]

### Heung 메커니즘
- **여관 BGM Feel** — Hotel Krat에서 Sophia 곁에 앉으면 흐르는 곡 / 축음기에서 재생되는 LP는 Belle Époque 댄스. 폐허 한가운데의 "그래도 들리는 음악". Heung의 잔존. [확인함]
- **무기 조합(Weapon Assembly)** — 칼날과 손잡이를 자유롭게 결합하는 시스템. 빌드의 다양성 자체가 Heung. 의도된 *플레이어 장난기* 보존 장치. [확인함]
- **Fable Art / Legion Arm 파라프레이즈** — 압도적 보스 앞에서 *플레이어 표현의 폭발*. 보스 처치 후 ergo 사용 시 LP 음악 톤의 승리 사운드. [추측임]

### 게임플레이 grammar
- 단일 무기 + parry economy(Sekiro 변형) — *체념하지 말고 막아라*의 명시적 강요.
- 거짓말 시스템 = 메타-선택지로서의 morality.
- Stargazer(체크포인트) = 서양 souls-like의 bonfire지만 *전화기*를 매개로 한 Hotel과의 연결. 거점-필드 사이의 정서적 끈.

### 서양 비평 각도
- Eurogamer는 *level design을 약점*으로, 그러나 *세계의 슬픔이 짙다*를 호평. [확인함]
- Kotaku는 "Korean studio의 첫 souls-like가 *모방을 넘어 본질을 이해했다*"고 명시. [확인함]
- Polygon은 melancholy tone을 *FromSoft의 이종교배가 아닌 자체 정체성*으로 평가. [추측임]
- 비평이 *놓친 것*: 거짓말 시스템 = 한국 정서의 메커닉화라는 분석은 영어권 critic에서 거의 등장하지 않음. *문화적 substrate를 명시한 비평은 거의 없음*. [확인함]

### ECHORIS 직접 차용 가능
- Hotel Krat의 *불변 NPC 자리* → 월드 세이브 포인트(대장간/상점) 인물의 *항상 거기 있음* 표현. Erda가 귀환할 때마다 같은 위치·같은 자세.
- Record stone → Memory Shard 회상 UI. Shard 장착 시 *죽은 이의 한 줄*이 흐른다.
- 거짓말 시스템 → 4-end DEC-043의 *선택지 누적* 메커닉. Erda는 말이 없으므로 "행동의 거짓" — 적을 살리기/죽이기, Shard 회상 받아들이기/거부하기.
- Belle Époque 폐허 미장센 → 메가스트럭처 Shaft의 *번성기 잔존물*. 빌더가 떠난 공방, 멈춘 단조열.

---

## 2. Limbus Company (Project Moon, 2023) — 가장 Han-coded한 현대 한국 게임

### 메타
- 개발: Project Moon (2016 창립). 한국 indie. 한국 문학 obsession이 시스템 깊숙히 박힘.
- 글로벌: Steam에 영문 동시 출시. Western fan-base가 *한국 시인 이상(Yi Sang)*을 학습하는 비정상적 현상 발생. [확인함]

### Han 메커니즘
- **12 Sinners = 12 죄인** — 각 캐릭터는 *세계 문학 고전 + 한국 문학 재해석*의 합성. Yi Sang은 실존 한국 모더니즘 시인이자 결핵으로 27세 사망한 인물. 그의 *오감도 시리즈*가 그대로 E.G.O 장비명. [확인함] Han을 *문학사적 trauma*와 결합한 사례.
- **Sanity / 침잠(Sinking) status** — Sanity가 깎이면 캐릭터는 *자기 자신의 트라우마 메아리에 빠진다*. 침잠 status = Han의 메커닉화. 회복은 불가능하고, 일정 수치 이하에서는 자해 행동. [확인함]
- **Mirror Dungeon** — 거울 세계의 절차적 던전. 각 회차마다 sinner들이 *과거의 자기와 마주친다*. Han의 핵심 메타포(*반복되는 후회*)를 dungeon loop로 변환. [확인함]
- **E.G.O = 자아의 외화** — Abnormality(존재의 공포)에서 추출한 E.G.O 장비를 입으면 *sinner의 trauma가 무기로 발현*된다. 입을수록 sanity가 깎인다. Han을 *전투력으로 변환하는 거래*. [확인함]

### Jeong 메커니즘
- **Sinner 간 합 / Clash** — 두 sinner가 동시에 같은 적을 공격하면 *coin clash*가 발생, 둘의 정신이 *문학적 인용으로 부딪힌다*. 친한 관계일수록 합이 잘 맞는다. Jeong을 *전투 시너지*로 환산. [추측임]
- **장기 운영 캐릭터의 *결락된 가족* 서사** — Yi Sang의 동료 Hong Lu, Faust 등. 각 sinner가 *서로의 사라진 가족 자리를 메우는* 의사 가족. 한국 회사형 의사 가족(*우리 회사 사람*) 정서. [확인함]
- **Limbus Bus** — 12명이 한 버스에 *어쩔 수 없이* 같이 탄다. 자발적 모임이 아닌, *책임에 묶여 같이 가는* 정. [확인함]

### Heung 메커니즘
- **Identity 가챠의 캐릭터 톤** — 어두운 본 게임 톤과 대조되는 *밈/유머 가득한 가챠 연출*. 한국 indie 특유의 *시니컬한 농담* 톤이 가챠에 폭발. [확인함]
- **PV 트레일러의 록 음악** — *처참한 내용*과 *경쾌한 K-rock BGM*의 결합. Heung-after-Han의 한국식 표현. [확인함]
- **N Corp / W Corp 챕터의 시각적 폭발** — 죽음을 다루는 챕터일수록 *색감이 폭발*. Han 직시 후 Heung 분출. [추측임]

### 게임플레이 grammar
- Coin flip 기반 deck-builder. 단순 RNG가 아닌 *문학적 인용으로 결과를 정당화*하는 연출.
- Mirror Dungeon = 무한 파밍. 디스가이아 아이템계와 메커닉 친척.
- E.G.O = Memory Shard와 거의 동형 시스템. ECHORIS 직접 비교 대상.

### 서양 비평 각도
- 영어권은 *진입장벽*에 막혀 비평이 적음. 그러나 *cult following*은 강력. [확인함]
- "한국 사람만이 만들 수 있는 게임"이라는 reddit/4chan 공감대. [확인함]
- 비평이 *놓친 것*: 한국 모더니즘 문학사가 게임 시스템에 *문자 그대로 박혀있다*는 사실. [확인함]

### ECHORIS 직접 차용 가능
- E.G.O = Memory Shard 거의 동형. *trauma를 입으면 강해지는데 자아가 손상된다*는 거래 구조. ECHORIS Shard에 *장착 시 정신 부담* 메커닉 추가 검토.
- Mirror Dungeon → Item World 절차적 던전과 직접 호환. *과거의 자기와 마주치는* 회상 보스 추가 검토.
- 12 Sinners의 *문학적 외피* → Rustborn(말하는 검) 대사의 *문학적 인용* 톤. 단, 한국 문학 그대로 인용은 *원본성 약화*. ECHORIS만의 가상 시집 필요.

---

## 3. Stellar Blade (SHIFT UP, 2024)

### 메타
- 개발: SHIFT UP (Kim Hyung-tae, Blade & Soul illustrator 출신).
- PS5 독점 → PC 2025-06. Korean Game Awards 전관왕. [확인함]
- 글로벌: Washington Post "Korean beauty의 shallow yet satisfying showcase". 평가 갈림. [확인함]

### Han 메커니즘
- **Eve의 고독** — 멸망 후 지구. Eve는 *유일한* 7th Airborne 생존자. NPC와의 대화도 *반사적·기능적*. 진정한 대화 상대가 없다. [확인함]
- **포스트-아포칼립스 미장센** — 풍요의 도시 Eidos 7의 폐허. Lies of P의 Krat과 같은 *번성기 잔존물* 패턴. [확인함]
- **Adam/Lily/Tachy의 사라짐** — 모든 인간적 연결이 *이미 끝난 뒤*에 Eve에게 도달. 그리움이 도착 시점에 이미 늦은 구조. [확인함]

### Jeong 메커니즘
- **Adam의 partner-voice** — Eve의 동반자 Adam은 대부분 무전 대화. *건조한 동반자* 톤. NieR 2B-9S의 한국 버전. [확인함]
- **Xion 마을 NPC quest** — 폐허에서 살아남은 인간들이 Eve에게 잡일을 부탁. 작은 부탁의 누적이 *마을의 회복*을 만든다. 거점-필드 정 구조. [확인함]

### Heung 메커니즘
- **Combat flow + DualSense haptic** — parry 성공 시 컨트롤러에서 *칼날 소리*가 진동. 신체적 쾌감의 K-게임 정점. [확인함]
- **Outfit system** — 캐릭터 의상 200+ 종. 디스가이아의 *야리코미* 정서를 패션으로. [확인함]
- **콤보 시스템** — Devil May Cry 영향의 스타일리시 콤보. 단조 타격감 + 화려한 모션. [확인함]

### 서양 비평 각도
- Game Informer "More Than a Pretty Face" 호평. [확인함]
- Washington Post는 *"Korean beauty"*를 명시 — 미적 stylization을 한국적이라고 지목. 단, *narrative depth는 얕다*고 지적. [확인함]
- 비평이 *놓친 것*: 폐허 + 고독한 여전사 + 동반자 무전 구조 = NieR 영향이 명시되었지만 *한국식 침묵의 무게*는 분석되지 않음. [확인함]

### ECHORIS 직접 차용 가능
- Adam의 partner-voice → Rustborn 대사 톤의 *건조한 동반자* 모델. NieR Pod보다 인간적, Adam보다 변덕스러움.
- Parry haptic feedback → 단조 타격감 강화. PC에서도 *시각 + 청각 + 화면 흔들림*으로 동등한 신체 감각 구현 필요.
- Xion 마을 quest 누적 → 월드 세이브 포인트 NPC의 *작은 부탁 누적이 마을 회복*으로 시각화.

---

## 4. The First Berserker: Khazan (Neople / Nexon, 2025)

### 메타
- 개발: Neople (Dungeon Fighter Online의 회사).
- Souls-like + 한국 만화풍 셀셰이딩. Western reviewers "올해의 surprise" 평가. [확인함]

### Han 메커니즘
- **추방당한 영웅의 복수** — Khazan은 제국의 위대한 장군. 그러나 *내가 섬긴 제국이 나를 처형했다*. 폭설에서 살아 돌아와 복수. 가장 직설적인 Han 서사. [확인함]
- **베르세르크-스타일 표현** — Miura의 Berserk 영향의 폭력적 미장센. 한국식 복수극과 직결. [확인함]
- **Skill 트리에서의 *방향 선택의 부담*** — 모든 빌드가 *과거의 자기를 부정해야* 다음으로 간다. [추측임]

### Jeong 메커니즘
- **Phantom blade(소환수) 친구** — 살해된 영혼을 *동행자로 부른다*. 죽은 자와의 동행. [확인함]
- **거점 캐릭터들과의 서사** — 거점에서 만나는 인간들이 Khazan을 *영웅이 아닌 사람*으로 대한다. [추측임]

### Heung 메커니즘
- **콤보 시스템의 폭발성** — 한국 만화풍 이펙트. Sekiro보다 화려, Devil May Cry보다 무겁다. [확인함]
- **보스 처치 후 cinematic** — 일격필살 컷이 자주 발동. *Heung-as-catharsis*. [확인함]

### 서양 비평 각도
- "Story is forgettable, combat is excellent" — Vice, GameSpot. [확인함]
- 비평이 *놓친 것*: Khazan의 *추방·복수·존엄 회복* 구조가 한국 사극의 정석이라는 점. [확인함]

### ECHORIS 직접 차용 가능
- Phantom blade 동행 → Memory Shard의 *Active 슬롯이 동행자처럼 말한다* 연출 검토.
- 보스 처치 후 cinematic 한 컷 → 지층 보스 처치 시 *Core Memory drop의 cinematic 일격*.

---

## 5. Dave the Diver (Mintrocket / Nexon, 2023) — Heung 마스터클래스

### 메타
- 개발: Mintrocket (Nexon 산하 indie label).
- 5M+ copies. *한국 single-player 첫 글로벌 메가히트*. [확인함]
- GDC24 발표: "Blending Humor and Gameplay". [확인함]

### Han 메커니즘
- **거의 없음** — 의도적으로 Han을 *최소화*하고 Heung을 전면에 둠. 단, 깊은 바다 = 무의식 = *수직 하강의 메타포*는 ECHORIS Shaft와 직결. [추측임]

### Jeong 메커니즘
- **Bancho Sushi 직원 NPC들** — 각자 백스토리, 각자 *작은 quest*. 가게가 *가족*. K-드라마 화로 정 구조. [확인함]
- **Cobra Cobra(어업조합) 사이드 캐릭터** — 적대적이지만 결국 협력. *사람을 미워하기보다 *부족함을 가엾이 여김*. [추측임]

### Heung 메커니즘
- **톤 휘말림(Tonal whiplash)** — 진지한 cinematic 직후 *코믹한 슬랩스틱*. 일본 코미디 영향. [확인함]
- **장르 혼합** — 다이빙 + 스시집 운영 + RPG + 보스전. 장르 자체가 *놀이의 폭발*. [확인함]
- **CDC 직원 GDC24 강조점**: "instructional content를 light-hearted하게". 학습조차도 Heung으로. [확인함]

### 게임플레이 grammar
- 낮(다이빙) / 밤(스시집) 루프. 압박과 휴식의 alternation.
- 캐릭터마다 *기괴한 외모 + 디테일한 personality* — Mintrocket의 핵심 design language.

### 서양 비평 각도
- "Japanese comedy를 차용했다"고 Mintrocket 본인이 인터뷰. [확인함] — 즉 글로벌 Heung 효과는 *순수 한국 정서가 아닌* 동아시아 코믹 grammar의 혼합. ECHORIS 참고 시 주의.
- 비평은 *Korean-ness*보다 *universal charm*을 부각. [확인함]

### ECHORIS 직접 차용 가능
- *낮/밤 루프* → 월드 탐험 / Item World 다이빙 alternation 구조. Dave가 이미 검증.
- *NPC 외모 기괴 + personality 디테일* → 월드 NPC(대장간 인물 등)의 *디테일한 visual signature*.
- 단 *톤 휘말림*은 ECHORIS Han-locked(DEC-042)와 충돌. **Dave식 코믹 차용 금지.** Heung은 *조용한 음악·작은 농담*에 한정.

---

## 6. Black Desert Online (Pearl Abyss, 2014) — MMO 기준점

### 메타
- 글로벌 출시 2016. K-MMO 양산형의 정점.
- 글로벌 매출 강력하나 *narrative 차용도 없음*. [확인함]

### Han / Jeong / Heung 메커니즘
- **Han: grinding-as-Han** — 무한 grinding이 메커닉적 Han이다. 끝없이 갈고도 도달하지 못함. 단, 의도된 Han이 아닌 *수익 모델*. [확인함]
- **Jeong: Guild system** — 한국 MMO 특유의 길드 의리. 그러나 서양에서는 *toxicity*로 전이. [확인함]
- **Heung: PvP 격전** — 길드전·국가전의 *폭발*. 그러나 글로벌 Western에는 전이 실패. [확인함]

### 서양 비평 각도
- 비평이 *지적한 것*: Korean MMO grind tone이 글로벌에서 *실패하는 패턴*. P2W 의심. [확인함]
- ECHORIS 교훈: **MMO grind = Han 전달에 실패한 K-game의 대표 사례**. 우리는 *의도된 Han*만 메커닉화하고, *부주의한 grind를 Han으로 위장*하지 않는다.

---

## 7. Lost Ark (Smilegate, 2018 KR / 2022 NA)

### 메타
- Amazon Games 퍼블리싱. Steam 동접 1.3M 기록 (역대 2위). [확인함]
- 그러나 PC Gamer, RPS는 *story가 약하고 progression이 단조*하다고 지적. [확인함]

### Han / Jeong / Heung 메커니즘
- **Han: Story가 약한 이유** — Smilegate가 한국 audience 우선이라고 forum 자체 인정. [확인함] 글로벌 *문화적 substrate 전달 의지 부족*.
- **Jeong: 함정 — bot 천국** — Western에서 *Jeong의 자리에 봇이 가득*. 인간적 연결 전달 실패. [확인함]
- **Heung: ARPG combat flow** — Diablo-like 액션의 부드러움은 호평. [확인함]

### ECHORIS 교훈
- **글로벌 reception에서 narrative substrate를 의도적으로 약화하면 *문화 전달 실패*가 자동**. ECHORIS는 반대 방향. Han-locked narrative + universally readable visual.

---

## 8. Throne and Liberty (NCSoft / Amazon, 2024)

### 메타
- Steam 동접 300K+ 피크. 그러나 4개월 만에 서버 107→25 통합. [확인함]
- Metacritic mixed. [확인함]

### 분석
- **장기 retention 실패** — 초기 hype 후 급락. *Korean MMO grind*가 Western에서 *Han이 아닌 burnout*으로 번역됨. [확인함]
- **narrative substrate 없음** — Throne and Liberty의 세계관·서사는 *한국 fantasy 일반*. K-적인 substrate 의도 부재. [확인함]

### ECHORIS 교훈
- **Korean = MMO ≠ globalization 보장**. Lies of P / Dave / Stellar Blade의 공통점은 *single-player + 분명한 정서적 substrate*. ECHORIS는 이 라인에 정렬.

---

## 9. MapleStory (Wizet / Nexon, 2003-) & PUBG (Krafton, 2017)

### MapleStory
- 20년 이상 운영. Western fanbase 잔존. Han이 아닌 *nostalgia*. [추측임]
- ECHORIS 직접 reference 가치 낮음. 다만 *cute pixel-art metroidvania-adjacent*의 K-game 선례로서 기억.

### PUBG
- Krafton 글로벌 메가히트. 그러나 *Korean narrative substrate 없음*. 메커닉만 globalized. [확인함]
- ECHORIS 교훈: PUBG는 *narrative substrate 없이도 글로벌 성공 가능*함을 증명. 단, 우리는 narrative-driven이므로 반대 케이스.

---

## 10. NIKKE (SHIFT UP, 2022) & Eversoul (Kakao, 2023) — 회피 reference

### NIKKE
- Gacha. $1B+ revenue. 메커닉적 Heung(pin-up + bullet hell)으로 일본·중화권 시장 장악. [확인함]
- 다크 narrative(인간 멸망, Nikke들의 자기희생)는 *gacha 표면 아래 숨겨져* 있어, Han 전달이 *유저 의지에 의존*. [확인함]

### Eversoul
- 한정흥 표면 차용, Gacha exhaustion 패턴. [확인함]

### ECHORIS 교훈 — 회피
- **Gacha 패턴은 Han 전달에 적대적**. 무한 보상 루프가 *Han의 마무리 감각*을 해친다.
- **표면 다크 + 메커닉 가챠 충돌** 사례. ECHORIS는 *메커닉도 Han에 정렬*해야 함.

---

## 11. NieR Replicant / Automata (Square Enix / Yoko Taro, 2010 / 2017) — 비-한국 parallel

### 메타
- Japanese. 그러나 Yoko Taro의 *반복-grief-cycle*은 Han과 거의 동형.
- NieR Replicant 2010 원작 + Ver 1.22 (2021) 재출시. ECHORIS의 *자아 발견 수렴* 패턴의 명시적 참조. [확인함]

### Han 메커니즘 — 최강
- **반복 회차(B/C/D)** — 같은 사건을 *다른 시점으로 다시 보게 한다*. 첫 회차에 죽인 적이 알고 보니 *부모를 찾던 아이*였다. Han의 정점: *내가 한 일을 되돌릴 수 없음*. [확인함]
- **Kaine의 trauma loop** — Kaine은 자신의 trauma 회상을 같은 자리에서 *반복*한다. 그녀가 마침내 *반복을 자각하고 깨는* 순간이 Ending E의 트리거. [확인함]
- **Save 삭제 선택** — Ending E에서 게임은 묻는다: "다른 플레이어를 돕기 위해 너의 모든 진행을 삭제하겠는가?" Han을 *유저 행동 자체에 강제 외화*. [확인함]

### Jeong 메커니즘
- **Pod 062 / 042 동반자 voice** — 건조한 안드로이드 동반자가 *마지막에 인간적이 된다*. 천천히 쌓이는 정. [확인함]
- **Yonah / 가족 회복 동기** — Replicant의 모든 동기는 *동생을 살리려는* 형제애. 한국 가족정의 핵심 변형. [확인함]

### Heung 메커니즘
- **Ending E choir + bullet hell** — 모든 회차 후, 합창과 함께 *다른 플레이어의 도움을 받는* bullet hell. Han을 모두 통과한 후의 *집단적 Heung*. [확인함]
- **음악 — 합창 boss themes** — Emi Evans의 합창. 슬픔이 *노래로 폭발*. Heung-after-Han의 정점. [확인함]

### 게임플레이 grammar
- 다회차 강제 + 회차마다 *다른 정보 공개*. 같은 cutscene이 4번째에 *완전히 다른 의미*로 보임.
- Save 삭제 = 유저 commitment를 메커닉으로 추출.

### ECHORIS 직접 차용 가능 (최우선)
- **4-end(DEC-043) 구조의 reference 모델 = NieR Automata Ending E**. Han end / Jeong end / Heung end / True end. True end가 *Heung-after-Han + 집단성*을 가지는 것을 NieR에서 차용.
- **합창 BGM** — True/Heung end의 *집단 합창* 사운드 아이덴티티. ECHORIS audio pipeline에 합창 layer 검토.
- **회차마다 시점 변경** — 같은 보스가 다음 회차에 *Memory Shard로 해금된 새 회상 cutscene*을 가진다.
- **유저 행동을 ending에 강제 외화** — 단순 선택지가 아닌, *Memory Shard 회상 거부 누적* 같은 행동 누적 메커닉.

---

## 12. Sekiro: Shadows Die Twice (FromSoftware, 2019) — Han-adjacent

### Han 메커니즘
- **늑대의 *주인 잃은* 정체성** — 늑대는 주인 Kuro를 지키기 위해 *되살아나는*. 죽음과 부활의 무한 반복. Han의 메커닉화. [확인함]
- **Bushidō melancholy** — 시대 변화 속 사라지는 무사도. *시대의 끝에서 끝까지 가는* 정서. Han-adjacent. [확인함]

### Jeong 메커니즘
- **Kuro와의 master-disciple bond** — 보호 대상 = 동기. 모든 행동이 *Kuro를 위해서*. 한국 충(忠) 정서와 부분 호환. [확인함]
- **Emma의 의사 (Sculptor의 후견인)** — 거점에서 늑대를 *치료하는* NPC. 작은 따스함. [확인함]

### Heung 메커니즘
- **Parry의 신체적 쾌감** — Deflect Dance. 칼날이 *춤추는 느낌*. Heung을 신체 감각으로 외화. [확인함]
- **Mikiri Counter** — 적의 찌르기를 밟고 반격. *기예의 폭발*. [확인함]

### ECHORIS 직접 차용 가능
- *Parry economy* → Erda의 검 전투 기본 grammar. 단조 타격감과 결합.
- *Master-disciple bond* → Erda-Rustborn 관계의 *서로가 서로를 살리는* 양방향 구조. Sekiro와 달리 *동등한* 관계.

---

## 13. Hollow Knight (Team Cherry, 2017) — Han-adjacent metroidvania 정석

### Han 메커니즘
- **Hallownest 폐허** — 번성한 곤충 왕국의 *조용한 붕괴*. Krat과 같은 *번성기 잔존물* 패턴. [확인함]
- **침묵하는 Knight** — 주인공은 말하지 않는다. *Vessel*. 안에 무엇이 담길지는 환경이 결정. [확인함]
- **NPC들의 *작별*** — 거의 모든 NPC가 *결국 죽거나 떠난다*. Quirrel, Myla, Hornet. [확인함]

### Jeong 메커니즘
- **Cornifer-Iselda 부부** — 거점에 *지도를 파는* 부부. 거의 변하지 않고 거기 있다. Lies of P Hotel Krat과 같은 *고정 자리의 정*. [확인함]
- **Grimm Troupe** — 외부에서 온 사람들이 *작은 가족*. [확인함]

### Heung 메커니즘
- **City of Tears의 음악** — 폐허 한가운데의 *피아노 솔로*. Heung-as-elegy. [확인함]
- **벤치 휴식** — 모든 vibe-out의 정점. [확인함]

### ECHORIS 직접 차용 가능 (최강 metroidvania reference)
- **벤치 = 세이브 포인트의 *정서적 무게*** — 단순 save 기능이 아닌, *플레이어가 머무르고 싶은 자리*. ECHORIS 세이브 포인트 BGM·시각 톤 강화.
- **NPC 작별 시스템** — 일부 NPC는 *반드시 떠나거나 죽는다*. 그것이 발견의 부담을 만든다.
- **Vessel-style silent 주인공** — Erda 침묵의 정당화 모델. *플레이어 투영체*.

---

## 14. Replica (SOMI, 2016) — Korean indie 정치적 Han

### 메타
- 한국 indie. IndieCade 2016 Impact Award, IGF 2017 Honorable Mention. [확인함]
- 스마트폰 화면 100%로 진행되는 한국 anti-terrorism law 비판 게임. [확인함]

### Han 메커니즘
- **국가 감시에 강제 협조하는 무력감** — 플레이어는 *거부할 수 없는 명령*에 따라 타인의 스마트폰을 뒤진다. Han의 *체념의 메커닉화*. [확인함]
- **다중 ending — 모두 비극적** — *완전한 해피 엔딩이 없다*. 한국 정치적 trauma 표현. [확인함]

### ECHORIS 차용
- *체념 강제 메커닉* → Memory Shard 회상 거부 시도 시 *시스템이 강제로 회상시키는* 순간 한 번. Erda의 자율성 일부 박탈 = Han 메커닉.

---

## 15. 종합 — Top 7 Han 전달 device (메커닉)

순위는 ECHORIS에 즉시 차용 가능성 기준.

1. **번성기 잔존물 미장센** (Lies of P Krat / Hollow Knight Hallownest / Stellar Blade Eidos 7) — *멈춘 단조열·꺼진 카페·아직 돌아가는 축음기*. ECHORIS Shaft에 직접 적용.
2. **죽은 자의 기록을 줍는 시스템** (Lies of P record stones / Hollow Knight 지문) — Memory Shard 회상 UI에 *한 줄 인용* 고정.
3. **반복 회차 + 시점 재공개** (NieR Replicant B/C/D) — Item World 재진입 시 *같은 보스의 다른 회상*. ECHORIS 회차 시스템 검토.
4. **trauma를 입어 강해지는 거래** (Limbus E.G.O.) — Memory Shard 장착 시 *정신 부담* 검토. 단 ECHORIS는 정신 게이지 없음 → *기억 슬롯 갯수 자체가 Erda의 부담* 시각화.
5. **거짓/진실 누적이 ending을 결정** (Lies of P Lie System / NieR Ending E save 삭제) — DEC-043 4-end의 *행동 누적 메커닉*.
6. **침묵 주인공 + 잔향 화자** (Hollow Knight Vessel / Lies of P P / Stellar Blade Eve / NieR 2B) — Erda 침묵 정당화. Rustborn = 잔향 화자.
7. **NPC 작별의 강제** (Hollow Knight Quirrel·Myla / Lies of P 거짓말 분기) — 일부 NPC는 *반드시 사라진다*. Han의 마무리.

---

## 16. 종합 — Top 5 Jeong 메커닉

1. **고정 자리의 NPC** (Lies of P Hotel Krat / Hollow Knight Cornifer / Sekiro Emma) — 거점 NPC가 *항상 같은 자리*. ECHORIS 세이브 포인트 인물 적용.
2. **건조한 동반자 voice** (Stellar Blade Adam / NieR Pod / Sekiro Sculptor) — Rustborn 대사 톤 모델.
3. **호칭의 변화** (Lies of P Geppetto의 "아들/꼬마/꼭두각시") — Rustborn이 Erda를 *부르는 호칭*이 회차에 따라 진화.
4. **죽은 자와의 동행 (소환)** (Khazan Phantom blade) — Memory Shard Active 슬롯이 *동행자처럼 말함* 검토.
5. **작은 부탁의 누적 = 마을 회복** (Stellar Blade Xion / Dave the Diver Bancho Sushi) — 세이브 포인트 마을의 *작은 quest 누적*이 시각 변화로.

---

## 17. 종합 — Top 5 Heung 메커닉

1. **합창 BGM + 보스 처치 catharsis** (NieR Automata Ending E / Hollow Knight City of Tears piano) — True/Heung end 사운드 디자인 직접 모델.
2. **Parry economy 신체적 쾌감** (Sekiro Deflect / Lies of P Perfect Guard / Stellar Blade haptic) — 단조 타격감 메커닉.
3. **보스 처치 cinematic 일격** (Khazan / Stellar Blade) — Core Memory drop cinematic.
4. **거점의 작은 음악** (Lies of P Hotel Krat 축음기 / Hollow Knight bench) — *폐허 한가운데의 작은 곡* SSoT.
5. **무기·장비 조합의 장난기** (Lies of P Weapon Assembly / Stellar Blade outfit) — Memory Shard 5색 기질 조합 자체가 Heung. *디스가이아 야리코미*와 합류.

---

## 18. 글로벌 성공한 한국 게임 vs 실패 — 패턴 분석

### 성공 (Lies of P, Stellar Blade, Dave the Diver, Limbus Company)
- **공통점 1: Single-player + 분명한 narrative substrate**
- **공통점 2: 글로벌 메커닉 grammar에 한국 정서를 *얹지*만, *밀어붙이지* 않음** (Lies of P = souls-like + Krat 슬픔 / Stellar Blade = DMC+Sekiro + Eve 고독 / Dave = 다이빙심+한국식 농담)
- **공통점 3: 시각적으로 *universally readable***. Belle Époque / 사이버펑크 / 만화풍 — 한국 traditional motif에 의존하지 않음.
- **공통점 4: 톤의 약속을 *깨지 않음***. Lies of P는 Hotel Krat에서도 슬픔 유지. Dave는 darkness를 의도적으로 피함.

### 실패 (Throne and Liberty, Lost Ark NA 후기, 다수 MMO)
- **공통점 1: MMO grind tone — Han을 *의도하지 않고* burnout만 전달**
- **공통점 2: P2W 의심 + bot 만연 → Jeong 자리에 *비인간 NPC만 가득***
- **공통점 3: narrative substrate를 *의도적으로 generic화*** — 한국 audience만 신경. 글로벌 비평이 *공허*함을 감지.
- **공통점 4: 톤의 약속이 *원래 없음***. 무한 컨텐츠 = 톤 일관성 불가.

### ECHORIS 결론
- **single-player 우선, Phase 3 multiplayer는 *Han-locked tone을 깨지 않는 한도* 내에서.**
- **Korean traditional motif 직접 차용 금지. universally readable 미장센(메가스트럭처 + 단조열) 유지.**
- **톤 약속을 깨는 시스템(컬렉터블 무한 보상, gacha 패턴)은 거절.**

---

## 19. Lies of P 심층 — ECHORIS와 거리 측정

### 공통점
- Korean dev / souls-like (ECHORIS는 metroidvania지만 soulslike 적합도 높음) / Pinocchio-style 변형 source (Lies of P=Collodi / ECHORIS=Disgaea+Castlevania+BLAME!) / Western reception 1순위.

### 차이점 (ECHORIS 강점)
- **2D pixel-art** → Lies of P보다 *비주얼 prod cost 낮고 brand signature 강력*.
- **Item World** → Lies of P에 없는 *무한 파밍 loop*. 디스가이아 야리코미 차용.
- **5색 기질 + Memory Shard** → Lies of P의 Legion Arm/Weapon Assembly보다 *서사적으로 깊고 시스템적으로 단순*.
- **4-end (DEC-043)** → Lies of P는 3-end. NieR이 4-end. ECHORIS는 NieR 모델.

### 차이점 (Lies of P 강점, ECHORIS 따라잡아야 할 것)
- **Hotel Krat 거점의 *정서적 단단함*** → ECHORIS 세이브 포인트가 아직 *기능 only*. 인물·BGM·시각 톤 강화 필요.
- **거짓말 시스템의 *메커닉적 elegance*** → 단일 시스템이 ending·NPC·정체성 모두에 작용. ECHORIS의 4-end 누적 메커닉도 *단일 시스템으로 단순화*해야.
- **무기 조합의 *플레이어 표현 폭*** → ECHORIS는 Memory Shard 5색으로 표현 폭 확보. 단 *조합 자체의 시각적 쾌감*은 Lies of P 추가 학습 필요.

### Mining 결론
- **Hotel Krat 모델 = ECHORIS 세이브 포인트의 직접 reference**. 인물 4-5명, 변하지 않는 자리, 작은 BGM, 호칭 진화.
- **Lie System의 단일 누적 메커닉 = ECHORIS 4-end의 단순화 모델**. *Memory Shard 회상 받아들임 / 거부* 누적이 ending 결정.

---

## 20. Limbus Company 심층 — Han-coded 양산의 한계와 교훈

### Project Moon의 강점
- **한국 modernist 문학을 시스템에 박은** 유일한 사례. Yi Sang E.G.O. 장비명 = 시 제목 그대로.
- **E.G.O = Memory Shard와 거의 동형**. *trauma 입어서 강해진다*의 메커닉화.
- **Mirror Dungeon = Item World 절차적 던전의 한국 indie 검증**.

### Project Moon의 약점 (ECHORIS가 회피할 것)
- **진입장벽 과도** — UI 복잡, 학습 곡선 가파름. Western mainstream에 도달 못 함.
- **dark tone *유머 없음에 의한* burnout** — Han이 너무 짙어 *Heung relief 부족*. ECHORIS는 *조용한 Heung*을 의도적으로 배치해야.
- **gacha 패턴** — Han-coded 게임을 gacha로 운영. 메커닉이 톤과 충돌. ECHORIS는 *one-time purchase + DLC* 모델.

### Mining 결론
- **E.G.O 메커닉의 *trauma 거래* = ECHORIS Memory Shard 정신 부담 검토**.
- **Project Moon의 *문학 인용 외피* = ECHORIS 가상 시집 도입 검토**. 단 *실존 한국 시인 인용 금지* (원본성 약화). Rustborn 대사에 *가상의 ECHORIS 세계관 시인* 인용.
- **Mirror Dungeon의 *과거 자기와 마주침* = ECHORIS Item World 회상 보스**.

---

## 21. NieR Replicant 심층 — 비-한국 parallel & 4-end 모델

### NieR Replicant이 ECHORIS의 동형인 이유
- **자아 발견 수렴 패턴** — 모든 회차가 *진실에 가까워지는* 한 방향. ECHORIS 시놉시스(per project context)와 동일.
- **silent protagonist + 동반자 화자** — Erda+Rustborn = Nier+Grimoire Weiss / Pod의 변형.
- **multi-end** — A/B/C/D/E. ECHORIS의 4-end (Han/Jeong/Heung/True)와 직접 호환.
- **반복 회차의 강제** — *같은 cutscene이 다른 의미로 보임*. ECHORIS Item World 재진입에 적용 가능.

### Ending E의 *집단적 Heung* 모델
- 합창 + bullet hell + 다른 플레이어의 자기희생 도움 + save 삭제 선택.
- ECHORIS True end에 *Phase 3 multiplayer 도움* 메커닉 검토. *내가 클리어한 후 다른 플레이어의 첫 클리어에 메시지를 남기는 시스템*.

### 사운드 디자인
- Emi Evans의 *가공의 언어* 합창. ECHORIS 합창 layer도 *실재 언어 아닌 가공의 음절*. 글로벌 universally listenable.
- Ending E 진입 시 *주제 BGM의 전면 합창화*. ECHORIS True end 메인 테마의 *합창 reprise*.

### Mining 결론
- **ECHORIS 4-end (DEC-043) 사운드 아이덴티티 = NieR Automata Ending E 모델**. True end만 *합창 layer 폭발*.
- **회차 시스템의 *cutscene 재해석*** — 같은 보스가 회차마다 *다른 회상*. Memory Shard 시스템과 결합.
- **Save 자기희생 메커닉의 *변형 안* 검토** — ECHORIS는 save 삭제 대신, *True end 후 Memory Shard 일부가 다음 플레이어에게 전달*되는 *비파괴 협력 메커닉*.

---

## 22. ECHORIS 시스템 별 Korean-game-derived 설계 안

### 22.1 전투 hit-feel
- **Reference 1순위**: Stellar Blade (DualSense haptic + parry 칼날 소리). PC에서 동등 구현 = 시각(화면 흔들림 + 단조 불꽃) + 청각(parry 시 *공명음*) + 컨트롤(reaction window 12-15 프레임).
- **Reference 2순위**: Lies of P parry-economy. Perfect Guard 시 *체력/스태미나 회복 X, posture 회복 X, 무기 내구도 회복 O*의 elegant 단순화. ECHORIS는 *Perfect Guard 시 Memory Shard 회복 1*.
- **Reference 3순위**: Sekiro Deflect Dance. *공격-방어가 같은 입력 박자*. ECHORIS attack/guard 입력이 *같은 박자 위에서 동작*하도록.

### 22.2 Memory Shard 회상 sequence
- **Reference 1순위**: Lies of P record stones. *짧은 cutscene + 한 줄 인용 + 사운드 모티프*. 진입 cost는 *읽기 한 번* 뿐.
- **Reference 2순위**: Limbus Company E.G.O. unlock. *trauma의 시각적 폭발 + 캐릭터 대사 변화*. ECHORIS는 Rustborn 대사 톤이 *Shard 장착 후 변화*.
- **Reference 3순위**: NieR Replicant 회상 cutscene. *같은 장면을 다른 시점에서*. ECHORIS Memory Shard 재장착 시 *추가 회상 한 줄*이 잠금해제.

### 22.3 Rustborn 대사 cadence
- **Reference 1순위**: Stellar Blade Adam (건조한 동반자 + 작은 위트). NieR Pod (절제된 보고체).
- **Reference 2순위**: Lies of P Geppetto (호칭의 양가성, *아들/꼭두각시/실험체*가 같은 화자 안에 공존).
- **Reference 3순위**: Hollow Knight Hornet (*조롱 + 보호*가 한 호흡 안에).
- 회피: Dave the Diver의 *코믹 톤*, Limbus Company의 *과잉 dark*.

### 22.4 4-end (DEC-043) 사운드 + 시각 정체성
- **True end (Heung-after-Han) 모델 = NieR Automata Ending E**. 합창 layer 폭발 + 메인 테마 reprise + 시각 *흰빛(Spark) 폭발*.
- **Han end 모델 = Lies of P Free from the Puppet String 엔딩 / Hollow Knight Hollow Knight 엔딩**. *침묵 + 검은 화면 + 한 줄 인용*.
- **Jeong end 모델 = Hollow Knight Dream No More**. *NPC들이 모두 살아 있고 거점에 모인 그림 한 컷*.
- **Heung end 모델 = NieR Automata Ending B (2B의 미소)**. *Erda가 처음이자 마지막으로 웃는 한 컷*.

### 22.5 Forge / Anvil 의례
- **Reference 1순위**: Lies of P Eugenie의 *Hotel Krat 무기실*. 변하지 않는 자리, 작은 BGM, 매번 같은 인사.
- **Reference 2순위**: Sekiro Sculptor (*조각하는 사람*). 무기 강화가 *조용한 의례*.
- **Reference 3순위**: Khazan Phantom blade 소환 의례 (검은 *영혼을 받아들이는 행위*).
- ECHORIS: 대장간 강화 시 *Rustborn이 직접 발화하는* 의례 대사. *기억의 단편을 검에 박는* 시각 cinematic.

### 22.6 Item World loops
- **Reference 1순위**: Disgaea (원전 — 메모리 기준으로 우선).
- **Reference 2순위**: Limbus Company Mirror Dungeon. *과거 자기와 마주침*. 보스 = *Erda의 그림자*.
- **Reference 3순위**: Lost Ark abyssal dungeon (*반복 진입의 보상 곡선*) — 단 Lost Ark의 grind tone은 거절. *보상 곡선 형식*만 차용.
- ECHORIS: 지층마다 *Mirror-style 회상 보스* 1체 추가 검토.

---

## 23. ECHORIS가 피해야 할 K-game 패턴

1. **MMO grind tone** (Throne and Liberty, Black Desert) — Han을 위장한 burnout. ECHORIS는 *Item World 진입 빈도를 제한*해서 *의도된 Han만 누적*되게.
2. **Gacha exhaustion** (NIKKE, Eversoul) — 보상 무한 = Han 마무리 감각 파괴. ECHORIS는 *one-time purchase + DLC*.
3. **Anime-derivative Han 표현** — 눈물·비명·과잉 cutscene. ECHORIS는 *침묵 + 환경 디테일*로 Han 전달. 사쿠라이/Yoko Taro 모델.
4. **Korean traditional motif 직접 차용** — 한복·기와·태극. *universally readable 미장센*(메가스트럭처) 우선. Han의 *substrate*만 차용, *표면*은 거절.
5. **글로벌 표적을 generic 한국 fantasy로 묽힘** (Lost Ark NA, Throne and Liberty) — ECHORIS는 *분명한 정서적 substrate*를 *희석하지 않음*. Han-locked tone(DEC-042)을 *글로벌 판매 압력에 양보 금지*.

---

## 24. 한 줄 결론 — ECHORIS의 K-game positioning

> "Lies of P의 *Krat slowness* + Limbus Company의 *Memory-as-trauma* + NieR Replicant의 *4-end 수렴* + Hollow Knight의 *bench melancholy*. Dave the Diver의 *톤 휘말림*은 거절. Stellar Blade의 *combat haptic*은 차용."

ECHORIS는 한국 게임 글로벌 성공 라인업의 *5번째 자리*를 노린다. 1순위 niche(BLAME!/Disgaea/Transistor 팬)에 Han-locked 신호를 *louder*로 보내되, 메커닉 grammar는 globally readable. Korean traditional motif가 아닌, *Korean 정서 substrate*만 차용. 이것이 *Lies of P가 했고 Throne and Liberty가 실패한* 구분선이다.

---

## 출처 (key)

- Lies of P — [GameSpot Review](https://www.gamespot.com/reviews/lies-of-p-review-no-strings-attached/1900-6418114/) / [Kotaku Review](https://kotaku.com/lies-of-p-review-pinocchio-soulslike-bloodborne-sekiro-1850857903) / [Wikipedia](https://en.wikipedia.org/wiki/Lies_of_P) / [SCMP feature](https://www.scmp.com/lifestyle/entertainment/article/3333333/how-korean-game-company-behind-lies-p-found-success-after-struggles) / [Fextralife Lie System](https://liesofp.wiki.fextralife.com/Lie+System) / [Hotel Krat Wiki](https://liesofp.wiki.fextralife.com/Hotel+Krat)
- Limbus Company — [Project Moon Wiki](https://limbuscompany.wiki.gg/wiki/Project_Moon) / [Yi Sang Trivia](https://limbuscompany.fandom.com/wiki/Yi_Sang/Trivia) / [E.G.O Wiki](https://limbuscompany.wiki.gg/wiki/E.G.O) / [Wikipedia](https://en.wikipedia.org/wiki/Limbus_Company)
- Lobotomy / Library of Ruina — [Wikipedia Lobotomy Corp](https://en.wikipedia.org/wiki/Lobotomy_Corporation)
- Stellar Blade — [Wikipedia](https://en.wikipedia.org/wiki/Stellar_Blade) / [Game Informer Review](https://gameinformer.com/review/stellar-blade/more-than-a-pretty-face) / [Washington Post Review](https://www.washingtonpost.com/entertainment/video-games/2024/04/24/stellar-blade-review/) / [Kotaku Combat Tips](https://kotaku.com/stellar-blade-combat-tips-demo-parry-blink-1851416441)
- The First Berserker: Khazan — [Rolling Stone](https://www.rollingstone.com/culture/culture-features/the-first-berserker-khazan-review-1235301352/) / [GameSpot](https://www.gamespot.com/reviews/the-first-berserker-khazan-review-a-souls-like-that-packs-a-punch/1900-6418346/) / [Vice](https://www.vice.com/en/article/raw-relentless-and-rewarding-the-first-berserker-khazan-is-a-must-play-soulslike-about-embracing-your-dark-side-review/)
- Dave the Diver — [Wikipedia](https://en.wikipedia.org/wiki/Dave_the_Diver) / [Inven Global GDC24](https://www.invenglobal.com/articles/18786/gdc24-blending-humor-and-gameplay-insights-from-dave-the-divers-session) / [DualShockers Interview](https://www.dualshockers.com/dave-the-diver-interview-mint-rocket-dlc-plans/)
- Black Desert / Lost Ark / Throne and Liberty — [Lost Ark Wikipedia](https://en.wikipedia.org/wiki/Lost_Ark_(video_game)) / [Throne and Liberty Wikipedia](https://en.wikipedia.org/wiki/Throne_and_Liberty) / [PCGamesN T&L Launch](https://www.pcgamesn.com/throne-and-liberty/launch-success)
- NIKKE — [Wikipedia](https://en.wikipedia.org/wiki/Goddess_of_Victory:_Nikke)
- NieR Replicant / Automata — [TheGamer NieR Trauma](https://www.thegamer.com/nier-replicant-endings-trauma/) / [TechRaptor Analysis](https://techraptor.net/gaming/features/nier-replicant-yoko-taro-analysis) / [RPGFan Universal Empathy](https://www.rpgfan.com/feature/even-if-our-words-seem-meaningless-yoko-taros-plea-for-universal-empathy-in-nier/) / [Kotaku Ending E](https://kotaku.com/theres-a-difficult-decision-at-the-end-of-nier-automat-1793071026)
- Sekiro — [Too Much Gaming Review](https://www.toomuchgaming.net/blog-news/sekiro-shadows-die-twice-review-bushido-blades-and-postured-knaves) / [Medium Sifu/Sekiro Parry](https://medium.com/@gatherer286/song-of-sword-and-fist-sifu-sekiro-and-the-anatomy-of-a-perfect-parry-2f9c4c26867a)
- Hollow Knight — [Paragraph Architecture of Silence](https://paragraph.com/@ludologist/architecture-of-silence-and-melancholy-a-comprehensive-analysis-of-hollow-knight-as-a-new-paradigm-for-modern-metroidvanias) / [Medium Walking Through Ruin](https://medium.com/@anknguyen21/walking-through-ruin-story-space-and-cyclical-tragedy-in-hollow-knight-3bcaac4e53f6) / [Screen Burn Review](https://screenburnblog.wordpress.com/2017/04/10/hollow-knight-melancholy-beautiful-and-almost-perfect/)
- Replica — [SOMI Games](https://somigames.com/replica/) / [VOA News](https://www.voanews.com/a/south-korean-video-game-raises-awareness-of-government-surveillance/3531378.html) / [Inverse](https://www.inverse.com/article/17218-replica-pc-game-review)
- Korean game industry — [NPR Korean Culture in Games](https://www.npr.org/2023/05/31/1179241534/how-a-south-korean-video-game-developer-is-pushing-korean-culture-in-its-games) / [Game Developer Korean Single-Player Burst](https://www.gamedeveloper.com/business/korean-devs-report-a-burst-of-interest-in-single-player-console-and-pc-games) / [PocketGamer Korea Global](https://www.pocketgamer.biz/how-korea-remains-a-strong-challenger-in-the-global-games-market/)

---

> 본 문서는 raw research. DEC-042/043 backbone에 *직접 차용 가능 메커닉*만 추출. ECHORIS 시스템 설계 시 §22 항목을 1차 reference로.
