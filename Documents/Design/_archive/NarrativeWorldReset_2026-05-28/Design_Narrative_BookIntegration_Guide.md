# D-19: ECHORIS 내러티브 통합 가이드 — 서사 이론 15편 적용 도구

> **문서 ID:** D-19
> **문서 상태:** Established (canon) — 2026-05-28 작성
> **Canon Level:** Design Philosophy (실작의 기준 자료)
> **근거 결정:** DEC-042 (한정흥) / DEC-043 (다중 결말) / DEC-047 (위령 Core Purpose) / DEC-041 (판타지 톤 폐기) / DEC-033 (검 Ego) / DEC-036 (Memory Shard)
> **적용 컨텍스트:** ItemNarrative_FoundationRework_2026-05-28 — 아이템 서사 6건 근본 재정의 라운드의 기준 자료

---

## Part I — 메타: 본 가이드의 위치

### 0.1. 본 문서의 SSoT 자격

본 문서는 Design Philosophy 레이어에 위치한다. 서사 이론서 15편의 발췌집이 아니라, 그 이론들이 ECHORIS 의 락된 결정과 만나는 *접촉면* 을 명문화한 실작 도구다. 이론은 도구이고, ECHORIS 의 락된 결정이 최종 권위다. 충돌 시 락된 결정이 이긴다.

본 문서를 참조하는 모든 작업 — 아이템 서사 재작성, 검 Ego 대사 선, Echo-Bearers brief, 환경 서사 세부 설계 — 에서 다음 상위 SSoT 들이 본 문서보다 선행한다.

| 우선순위 | SSoT | 역할 |
|:--|:--|:--|
| 1 | `Documents/Terms/Project_Vision_Abyss.md` §1-2 | 위령 명제, 3대 기둥 |
| 2 | `Documents/Content/Content_Direction.md` | 위령×위로, 4 시드, 7단계 곡선 |
| 3 | `Documents/Design/Design_Narrative_HanJeongHeung_Archetype.md` | 한정흥 spec, 살풀이 spine |
| 4 | `Documents/Content/Content_Story_Synopsis.md` | 플롯 spine, 결말 분기 |
| 5 | 본 문서 | 이론 출처 + 적용 형태 |

### 0.2. 시금석 — 4축 (Content_Direction §6.1 인용)

모든 결정은 다음 4 시금석 중 하나 이상과 매핑되어야 한다.

| 시금석 | 정의 |
|:--|:--|
| **위령(Requiem)** | 잊혀진 타자를 회상시키고 떠나보내는 것이 동기인가 |
| **위로(Consolation)** | 그 행위가 플레이어 자신에게 돌아오는 정서가 있는가 |
| **거울(Mirror)** | 적/검/단편이 플레이어의 잊혀진 자기를 반영하는가 |
| **침묵(Silence)** | 말하지 않아도 전달되는가 — 비언어, 환경, 행동이 화자인가 |

### 0.3. 3행 인용 형식

본 가이드 내 모든 이론 인용, 그리고 본 가이드를 근거로 작업하는 모든 설계 문서에서 다음 3행 형식을 사용한다.

> [원칙 한 줄]. (출처: [책 제목], [절/렌즈 번호]) — ECHORIS 적용: [한 줄].

---

## Part II — 서사 구조 (Structure)

### 2.1. Story Spine / 15-Beat / 7단계 곡선 — 3 모델 비교

**Hero's Journey 11단계** (Interactive Storytelling for Video Games, Ch.3) 는 "감정적 이정표" 이지 실제 사건 순서가 아니다. ECHORIS 의 7단계 곡선(Content_Direction §4) 과 구조적으로 대응한다.

| Hero's Journey | ECHORIS 7단계 | 한정흥 매핑 |
|:--|:--|:--|
| Ordinary World | Stage 0. 깨어남 | 한의 발견 (침전된 한) |
| Call to Adventure / Refusing | Stage 1. 발견 | 첫 Forgotten Shard — 거절된 것이 친구임 |
| Journey | Stage 2-3. 동행·회상 | 정의 축적 (말해지지 않는 결속) |
| Great Ordeal | Stage 4. 직면 | 가장 깊은 아웃사이더 = 나 자신 (자진모리 가속) |
| Return + Reward | Stage 5. 풀이 | 흥 — 카타르시스 + 결말 분기 |

**Save the Cat! 15-Beat Sheet** (Save the Cat Writes for TV, Ch.5-6) 는 에피소드-시즌-시리즈 3층 구조로 압축한다. ECHORIS 에서 이 3층은 각각 *단일 다이브 / 한 자루의 무기 / 메인 스토리* 에 대응한다. 압축 원칙: 아이템 레어리티가 높을수록 15-Beat 의 더 많은 beat 를 가동시킨다 (Part VII §7.1 참조).

**ECHORIS 7단계 곡선** (Content_Direction §4) 이 두 모델의 *ECHORIS 구현체* 이며 수정 금지다. 두 모델은 *이유를 설명하는 이론 근거* 로만 인용한다.

ECHORIS 적용: 7단계 곡선의 각 Stage 는 Hero's Journey 의 감정적 이정표이자 한정흥 트라이앵글의 한 꼭짓점 전이를 수행한다. 구조의 검증 질문 = "이 Stage 에서 플레이어의 정서가 어느 방향으로 전이되는가?"

> 시금석 매핑: **위령** (Stage 0-1), **거울** (Stage 2-4), **위로** (Stage 5).

### 2.2. 호러 MITH 프레임 — 위령 톤과의 정합

Monster in the House 의 3요소(Monster, House, Sin) 는 ECHORIS 아이템계 구조와 직접 대응한다. (출처: Save the Cat Writes Horror, Ch.1-4)

| MITH 요소 | ECHORIS 매핑 |
|:--|:--|
| Monster | Forgotten Memory Shard — 한이 형태로 남은 잔해 |
| House | 아이템계 — 영웅이 떠날 수 없는 이유 = 위령 의무 |
| Sin | 망자가 생전에 처리하지 못한 한 — Ego 의 발화 주제 |

"영웅이 그냥 떠날 수 없는 이유" 의 ECHORIS 답 = 위령 명제. MITH 의 집(House) 개념은 *아이템계 전체*가 탈출 금지의 의례 공간임을 강화한다. 다만 MITH 의 죄(Sin) 어휘는 ECHORIS 에서 *한* 으로 대체한다 — "도덕적 위반"이 아니라 "닫힌 길에서 발효된 상실".

Slow Burn vs Relentless 이분법도 정합: Normal/Magic 아이템계 = Slow Burn, Ancient 아이템계 심연 = Relentless.

ECHORIS 적용: 아이템 서사 설계 시 MITH 3요소 체크리스트를 사용한다. "이 무기의 Forgotten 상태가 Monster 로 기능하는가? 아이템계 지형이 House 로 플레이어를 가두는가? 망자의 한이 Sin 위치에서 이야기의 논리적 근거를 제공하는가?"

> 시금석 매핑: **위령** (Sin → 한의 원천), **거울** (Monster = 망자의 거울).

### 2.3. 인터랙티브 vs 선형 서사 — 선택의 허용 자리

플레이어에게 "선택이 의미 있다는 착각을 주면서도 관리 가능한 콘텐츠를 유지하는 것이 핵심 기술이다." (Interactive Storytelling for Video Games, Ch.6 스펙트럼 단계 2 — 인터랙티브 전통적)

ECHORIS 는 스펙트럼 2번 (Interactive Traditional) + 3번 (Multiple-Ending) 의 혼합이다.

| 위치 | 선택 유형 | 락 여부 |
|:--|:--|:--|
| 메인 스토리 spine | 선형 (Stage 0-5) | 락 — 플레이어가 세계를 바꾸지 않음 |
| 아이템 서사 | 인터랙티브 전통적 — 어떤 무기를 먼저 들어가느냐 | 자유 |
| 결말 분기 | 다중 결말 3+1 (DEC-043) | 락 |
| 야리코미 계속 | 결말 후 무한 계속 | 자유 |

한정흥 순환 구조(한 → 정 → 흥 → 다음 한) 는 본질적으로 *선형* 이다 — 순환이 반복될 뿐 각 회차는 단방향이다. 이는 "분기 경로" 모델과 충돌한다. ECHORIS 는 분기를 *결말 한 지점*에만 집중한다. 이 선택이 왜 옳은가: 분기가 한정흥 순환을 분열시키면 정서의 축적이 중단된다. 한이 *채워지지 않으면* 정으로 전이되지 않는다.

ECHORIS 적용: 아이템 서사 내부에 "플레이어 선택에 따라 달라지는 보상 경로" 를 설계해도 좋지만, 망자의 한이 "풀리느냐 안 풀리느냐" 는 선택지가 아니다 — 반드시 Recalled 로 전이된다. 선택은 *방법과 순서* 이지 *위령의 성공 여부* 가 아니다.

> 시금석 매핑: **위령** (선택은 있지만 위령은 반드시 수행된다).

### 2.4. 앙상블 서사 vs 침묵 주인공

Quality TV 의 Mad, Mad World (게임으로는 World Building 중심 앙상블 서사) 는 다층 시점이 공존하는 구조를 전제한다. (Game of Thrones — Quality Television and the Cultural Turn, §2 Topofocal Narrative)

ECHORIS 는 앙상블이 아니다. 단일 침묵 주인공(Erda) + 단독 화자(Rustborn) + 부재하는 동료들(Echo-Bearers) 의 구조다.

그러나 GoT 의 *Topofocal Narrative* 원칙 — "배경이 캐릭터와 플롯만큼 중요하다" (Stefan Ekman) — 은 직접 적용된다. ECHORIS 에서 The Shaft 의 수직 구조 자체가 캐릭터이고, 각 층위가 서로 다른 시대의 "목소리" 를 낸다. 다층 시점은 인물이 아니라 *공간* 과 *시간* 이 수행한다.

Echo-Bearers 의 회상은 제한적 앙상블 허용의 유일한 자리다. 이들은 대사가 아니라 *환경 흔적·기억 단편·잔영* 으로만 존재한다 — 이는 GoT 의 다층 화법을 *침묵 주인공 명제* (DEC-033) 와 충돌 없이 수용하는 유일한 방법이다.

ECHORIS 적용: "공간이 이야기한다" 원칙을 적용할 때 GoT 의 오프닝 크레딧 지도처럼, ECHORIS 의 각 층위가 *그 자체로 읽히는 역사 단면* 이 되어야 한다. 층위 진입 시 첫 10초가 그 층위의 "이름" 을 전달한다.

> 시금석 매핑: **침묵** (다층 시점 = 인물 아닌 공간의 목소리).

---

## Part III — 캐릭터 (Character)

### 3.1. Protagonist Engine — Erda 를 8축으로 분해

Save the Cat Writes for TV (Ch.2) 의 캐릭터 구축론과 Interactive Storytelling for Video Games (Ch.4) 의 캐릭터 신뢰성 원칙을 통합하면 다음 8축 분해가 도출된다.

| 축 | Erda |
|:--|:--|
| Want (표면 목표) | The Shaft 를 통과한다 |
| Need (진짜 필요) | 자기가 *누구인지* 기억해야 한다 — 가장 깊은 아웃사이더는 자기 자신 |
| Lie (믿는 거짓) | "강화하면 통과할 수 있다" — 동기가 위령이 아니라 생존인 줄 안다 |
| Ghost (과거 상처) | 강하한 자 — 빌더 메가스트럭처에서 *무엇인가를 잃은* 자. 내용은 결말까지 락 |
| Spine (행동 원리) | 검이 가리키는 방향으로 간다 |
| Comfort Zone | 과묵, 행동, 반응 없음 — 언어 대신 존재로 답함 |
| Pressure | Rustborn 의 발화 빈도 증가 / 자기 잔존 인스턴스와의 조우 (Stage 4) |
| Stakes | 잊혀짐 — 위령을 수행하지 못한 망자가 다시 Forgotten 으로 돌아감 |

"캐릭터의 결정은 성격과 일관되어야 한다." (Interactive Storytelling for Video Games, Ch.4 Heavy Rain 사례) — ECHORIS 적용: Erda 의 모든 행동 단서는 *과묵하지만 단호한* 결의와 일관되어야 한다. Rustborn 이 말하고 Erda 가 행동한다. 이 분업이 캐릭터 신뢰성의 척추.

> 시금석 매핑: **위령** (Want vs Need 의 괴리 = 위령 명제의 서사적 구현).

### 3.2. 침묵 주인공의 8축 — 비언어 커뮤니케이션

게임이 다른 매체와 구별되는 핵심은 선택(Choice) 이며, 행위자(Actor) 로서의 플레이어가 결과에 영향을 미친다. (How Games Move Us, Ch.1)

침묵 주인공 3대 레퍼런스 비교:

| 레퍼런스 | 침묵의 방식 | 화자 위치 |
|:--|:--|:--|
| Transistor Red | 검이 말하고, 주인공은 노래로 답함 | 검 = 내러티브 대리자 |
| Hollow Knight / Hornet | 환경이 말하고, 주인공은 행동으로 답함 | 세계 = 화자 |
| Sekiro / Sekiro 늑대 | 과묵하지만 대사 있음 — 침묵이 아닌 절제 | 주인공이 소량 발화 |

ECHORIS Erda = Transistor Red 직계. Rustborn 이 검의 Ego 로서 대사를 독점하고, Erda 는 0 대사 원칙 (DEC-033). 비언어적 커뮤니케이션의 6채널 (How Games Move Us) 에서 Erda 는 *캐릭터 body language* 와 *페이싱* 채널로만 존재한다 — 입력 타이밍, 이동 속도 변화, 히트스탑 반응.

ECHORIS 적용: Erda 의 모든 감정은 *애니메이션 프레임* 으로 표현된다. 주요 정서 전환 비트에서 이동 입력 없이 0.5-1.0초 정지 애니메이션이 발동한다. 이것이 Erda 의 "대사" 다.

> 시금석 매핑: **침묵** (비언어가 유일한 화자 채널).

### 3.3. 말하는 도구 Rustborn 의 화법

NPC 화법은 배경, 성격, 사회적 지위에 맞아야 한다. (Interactive Storytelling for Video Games, Ch.4)

Rustborn 은 *한을 가진 망자의 목소리*이자 *시니컬하고 수다스러운 안내자* 다 (DEC-033 Transistor 검 라인). 한정흥 spec §3.1 의 화법 제약을 기반으로 도출한 Rustborn 화법 4원칙:

1. **평조(平調)에서 시작한다** — 정보 전달, 잔잔한 어투, 망자의 이름을 가끔 발화
2. **중모리에서 감정이 드러난다** — 자조(自嘲)와 시니컬이 교차, 기억의 불연속이 말투에 반영
3. **자진모리에서 밀어붙인다** — Stage 4-5 에서만 발화 밀도 증가, 감정 강도 상승
4. **35단어 예산** — 단일 발화 최대 35단어 (Design_Onboarding_UnfamiliarMechanic 원칙 — Rustborn 에도 동일 적용)

ECHORIS 적용: Rustborn 의 각 대사 라인은 *어느 조(調)에서 발화되는가* 를 태그한다. 같은 정보라도 조가 다르면 어투가 달라진다. 작업 시 Rustborn 대사 초안에 `[평조]` / `[중모리]` / `[자진모리]` 태그를 붙인다.

> 시금석 매핑: **침묵** (Rustborn 이 말하는 방식이 Erda 의 침묵을 정의한다).

### 3.4. 보조 캐릭터 / 동료의 부재

"Movies are a fling... TV shows are a relationship." (Save the Cat Writes for TV, Cold Open) — TV 의 관계 중심 설계 원칙을 *부재(不在)* 에 적용한다.

Echo-Bearers 5명은 게임 내 현존하지 않는다. 그들의 흔적, 잔영, 기억 단편만 존재한다. 이것이 Up(Ellie 의 죽음 이후), Klaus(매주 주인이 죽는다), Coco(망자의 세계), Spiritfarer(모든 NPC 를 보내주기) 와 동일한 *부재의 서사 문법* 이다.

부재가 작동하는 조건: 플레이어가 그들의 *존재를 충분히 상상할 수 있어야* 한다. 부재는 먼저 충분한 *현존의 흔적* 이 있어야 힘을 갖는다.

ECHORIS 적용: Echo-Bearers 의 환경 흔적 설계 원칙 — (1) 각 흔적은 행위의 증거이지 설명이 아니다, (2) 동일 인물의 흔적이 최소 3층위에 걸쳐 분산된다, (3) 마지막 흔적은 항상 *미완성 행위* 다 — 그가 무엇을 하려 했는지만 보여주고, 결과는 없다.

> 시금석 매핑: **거울** (부재하는 동료 = 플레이어가 채워야 하는 거울 자리).

---

## Part IV — 세계 (World)

### 4.1. Bartle 4분류 — ECHORIS 의 위치

Explorer(탐험가) + Achiever(성취자) 우선, Killer + Socializer 는 2차 흡수. (Designing Virtual Worlds, Ch.3)

| Bartle 유형 | ECHORIS 1차 타깃 | 설계 우선순위 |
|:--|:--|:--|
| Explorer | BLAME!/MiA 팬 — 메가스트럭처 심연 | 최우선 |
| Achiever | 야리코미 팬 — 무한 강화 의례 | 최우선 |
| Socializer | 멀티플레이 동료 위령 | 2순위 (Phase 3+) |
| Killer | PvP 없음 — 설계 범위 외 | 해당 없음 |

Explorer 에게 탐험 동기를 제공하는 핵심: *알면서도 다시 들어가고 싶은 세계* 를 만드는 것. "발견이 이것을 특별하게 만드는 것의 핵심" (You Died, Chain of Pain 에세이). ECHORIS 에서 발견 = 망자의 이름을 찾는 것 = 위령의 진척.

ECHORIS 적용: 탐험 보상 설계 시 순수 자원 드랍만이 아니라 *이름 단편* — 망자의 이름이 조각나 있고, 탐험으로 복원된다 — 를 배치한다.

> 시금석 매핑: **위령** (탐험 = 이름 복원 = 위령의 물리적 행위).

### 4.2. 메가스트럭처 톤 — 침묵 + 스케일 + 빛의 하강

러브크래프트의 공포는 침입의 공포가 아니라 *깨달음의 공포*다. 세계는 언제나 무자비하게 황량했으며, 공포는 우리가 그 사실을 인정하는 데 있다. (At the Mountains of Madness, China Mieville 서문)

ECHORIS 의 메가스트럭처 톤 4요소:

| 요소 | 러브크래프트 원전 | BLAME! / MiA 전이 | ECHORIS 구현 |
|:--|:--|:--|:--|
| 침묵 | 남극의 공허한 정적 | 기계 문명의 무기(無機)적 침묵 | Erda 0 대사, 배경 BGM 의 저주파 지속음 |
| 스케일 | "수십 마일에 걸친 사이클로피언 석조 미로" | The Shaft 수직 대공동 | 카메라가 Erda 를 4픽셀 크기로 잡는 순간 |
| 빛의 하강 | 남극 탐험 — 층위마다 빛이 소멸 | 어비스 하강 — 빛이 단 하나 | 층위별 색온도 냉각 (Layer 1 따뜻 → Layer 7 한랭) |
| 적의 공감 | "방사체든 식물이든 — 그들은 인간이었다!" | 시킬레그 / 카블리 | Forgotten Shard = 한때 인간이었던 것 |

"점진적 발견(Progressive Discovery): 벽화와 조각을 통해 역사가 단계적으로 밝혀지는 구조는 게임 내 환경 스토리텔링의 모범 사례." (At the Mountains of Madness 시사점)

Bloodborne 의 아트 디렉션 원칙도 보강한다: 진행에 따른 적 디자인의 점진적 비인간화 — 초반(인간에 가까움) → 후반(코즈믹 존재). ECHORIS 에서 Memory Shard 적의 시각적 왜곡 정도가 이 점진 구조를 수행한다.

ECHORIS 적용: 층위 진입 첫 씬의 카메라 거리를 점진적으로 당김(pull back) 한다 — 층위가 깊을수록 Erda 는 더 작게 보인다. 이것이 스케일과 침묵을 동시에 전달하는 단일 연출 선택이다.

> 시금석 매핑: **침묵** (스케일 자체가 침묵의 언어).

### 4.3. 안전 공간의 변질 — 세이브 포인트 설계

"The King in Yellow" 희곡은 읽는 것만으로 정신을 오염시킨다. 안전한 공간 자체가 점진적으로 변질되는 메커닉이 강력한 심리적 긴장을 만든다. (The King in Yellow, 시사점 §1 — 안전한 공간의 오염)

DEC-038 그림자 마을(Shadow Village) 이 이미 이 원칙의 구현이다 — 빛 없는 반 문명 공간, sci-fi 톤의 세이브 포인트. 그림자 마을 NPC 들은 Erda 를 알아보지만, 알아보는 방식이 층위마다 *다르다*. 상층에서는 반가움이지만 심층에서는 불안이다.

반복 상징 배치 원칙: The King in Yellow 의 "노란 표식" 처럼, 직접 설명 없이 세계관을 구축하는 *반복 상징* 을 환경에 배치한다. ECHORIS 의 반복 상징 후보: 빌더의 *미완성 단조 흔적*, *단 하나의 역광 실루엣*, *꺼진 앤빌 위의 이름 없는 도구*.

ECHORIS 적용: 세이브 포인트의 "온도" 를 층위마다 조정한다. 상층 세이브 포인트 = 주황빛, 도구 소리, NPC 환영. 심층 세이브 포인트 = 청록빛, 기계음만, NPC 없음. 이 변화 자체가 서사다.

> 시금석 매핑: **위령** (안전 공간의 침식 = 망자의 영역으로 더 깊이 들어감).

### 4.4. 모성/창조 불안 — 원초 구조체 메타포

엔지니어(남성적 창조) 와 Trilobite(여성적 창조) 의 대비 — 창조와 파괴의 이중성. 창조자가 자기 피조물에 의해 소비되는 구조. (Gazing upon the Mother, §창조의 전복)

World Bible Layer 0 의 원초 구조체(The Shaft 의 건설자, 빌더 문명의 창조 주체) 와 정합한다. 거대 빌더들은 *짓다가 사라졌다* — 자기가 만든 것에 의해, 또는 자기가 만드는 과정에서 소멸했다. The Shaft = 완성되지 못한 창조 = 거대한 묘비이자 미완성 자궁.

ECHORIS 적용: Ancient 아이템 서사에서 "원초 구조체와 피조물의 역전" 메타포를 적어도 하나의 무기 서사에 사용한다. 빌더가 만든 도구가 빌더를 삼킨 이야기 — 이것이 *공포 없이* 전달될 때 ECHORIS 톤이 된다 (공포가 아니라 위령).

> 시금석 매핑: **위령** (창조자의 한 = The Shaft 전체의 한).

### 4.5. 지속성의 매체 — Identity Archive

Ultima Online 의 주택 시스템: 플레이어의 투자가 가상 세계에 *물리적 흔적* 으로 남는 지속성이 세계를 "살아있게" 만든다. (Designing Virtual Worlds, Ch.1 §5세대 역사)

DEC-046 Identity Archive (1,200+ 문장의 1인칭 인생 컬렉션) 가 이 역할을 수행한다. 아이템계 진입 = 한 망자의 *영전 비망록* 에 들어가는 것. 플레이어가 Identity Archive 를 채울수록 *그 무기가 더 실재한다* 는 감각이 강화된다 — 이것이 야리코미 동기와 위령 명제를 연결하는 매개다.

ECHORIS 적용: 무기 한 자루의 Identity Archive 가 *비어 있을 때*와 *채워졌을 때* 의 시각적 차이를 명시한다. 빈 Identity Archive = 흑백 실루엣. 채워진 Identity Archive = 컬러, 이름 표기, 고유 빛 방향. 이 시각적 변화가 위령의 진척 지표이다.

> 시금석 매핑: **위로** (지속성 = 기억된 것 = 위로가 쌓이는 것).

---

## Part V — 환경 서사 (Environmental Narrative)

### 5.1. Frank Lloyd Wright 도착 그래머 — 대장간 도착 설계

"Hanna House 의 점진적 공간 공개: 보이지만 즉시 접근 불가한 보상(Zen Views), 방문자를 의도적으로 경로로 유도하는 건축 시퀀스." (An Architectural Approach to Level Design, Ch.7 §거부를 통한 흥미 유발)

ECHORIS 대장간(세이브 포인트) 도착 그래머 적용:

1. **원거리 시각 유인(Weenie)** — 대장간의 주황빛이 먼저 보인다. 직접 가지 않아도 보인다
2. **접근 경로 단 하나** — 좁은 통로를 통과해야 도착한다. 압박 → 해방의 공간 리듬
3. **진입 전 정지 포인트** — 입구에서 내부가 살짝 보이지만 아직 들어오지 않은 지점
4. **진입 시 사운드 전환** — 전투 BGM 이 끊기고 앤빌 저음이 시작된다

"전망-피난처(Prospect-Refuge) 공간 설계: 피난처, 전망, 보조 피난처로 경로 생성." (An Architectural Approach to Level Design, Ch.6) — 대장간은 Refuge 이고, 진입 경로는 Prospect 다.

ECHORIS 적용: 대장간 도착 시퀀스는 반드시 4단계(원거리 시각 → 좁은 접근 → 입구 정지 → 사운드 전환) 를 거친다. 단계를 줄이면 *위령의 의례 공간* 이 아닌 *단순 메뉴 화면* 이 된다.

> 시금석 매핑: **위로** (의례 공간으로의 도착 = 위로의 예비).

### 5.2. Dark Souls 아이템 플레이버 — 1-3문장 절제

"모든 붓질이 의도된 것처럼 느껴지는 세계에서, 모든 디테일이 잠재적으로 의미를 가진다." (You Died, 환경적 서사 인용)

Dark Souls 플레이버 텍스트의 3원칙: (1) 1-3 문장으로 완결, (2) 설명하지 않고 *암시한다*, (3) 이름과 장소가 구체적이되 맥락은 없다.

ECHORIS 아이템 플레이버 텍스트 적용 형식:

```
[무기 이름]. [망자가 최후로 한 행위 1문장]. [이름 또는 장소 단편 1문장 — 선택적].
```

예시 형식 (실제 내용은 아이템 서사 재작성 라운드에서 결정):
- 나쁜 예: "이 검은 빌더 문명 7세대에 단조된 도구로, 층위 3의 방위군이 사용했으며..." (설명)
- 좋은 예: "세 번 갈았다. 마지막은 갈지 않았다. — [이름 단편]" (암시)

ECHORIS 적용: 모든 아이템 플레이버 텍스트는 *행위* 또는 *감각* 으로 시작한다. 명사 또는 개념으로 시작하는 텍스트는 재작성 대상이다.

> 시금석 매핑: **위령** (텍스트 = 망자의 마지막 흔적 = 위령의 단서).

### 5.3. 환경이 화자인 4 채널

"그림 / 배치 / 마모 / 색온도 의 4 채널이 세계관의 서사를 전달한다." (Bloodborne Official Artworks 시사점 §환경 스토리텔링)

ECHORIS 각 채널의 서사 역할:

| 채널 | Bloodborne 사례 | ECHORIS 적용 |
|:--|:--|:--|
| 그림(시각 모티프) | 야남의 첨탑 — 도시의 성격 선언 | 각 층위의 *단조 흔적 패턴* — 누가 무엇을 만들었는가 |
| 배치(오브젝트 위치) | 야경꾼 시체의 위치 — 무엇이 일어났는지 | 파괴된 도구의 방향 — 어느 쪽에서 무엇이 왔는지 |
| 마모(시간 흔적) | 혈흔의 정도 — 얼마나 오래된 일인지 | 앤빌의 부식 정도 — 마지막으로 사용된 게 언제인지 |
| 색온도(분위기) | 차가운 달빛 vs 따뜻한 램프빛 | 층위 색온도 냉각 그래디언트 (§4.2 참조) |

ECHORIS 적용: 아이템계 방 하나를 설계할 때 "이 방이 4채널로 무엇을 말하는가" 를 먼저 정의한다. 채널이 없는 방은 *정보 없는 방* 이고, 4채널이 모두 같은 방향을 가리키는 방이 *서사적으로 강한 방* 이다.

> 시금석 매핑: **침묵** (4채널 = 비언어 서사의 총체).

### 5.4. 기존 환경 서사 7대 원칙과의 통합 — 보강과 충돌

기존 `Design_Narrative_Worldbuilding.md` §3.x 의 환경 서사 7대 원칙을 본 절과 대조한다.

| 기존 원칙 | 본 절과의 관계 | 판정 |
|:--|:--|:--|
| 씬>플롯 | §5.3 배치 원칙과 정합 — 씬이 곧 4채널 | 보강 |
| 정보 제거 | §5.2 Dark Souls 1-3문장 절제와 정합 | 보강 |
| 묵시적 서사 | §5.1 Zen Views 와 정합 — 보이지만 말하지 않음 | 보강 |
| 40초 법칙 | 본 가이드에서 명시적 근거 추가 — Koster 패턴 학습 타임라인 | 보강 |
| 환경 일관성 | §5.3 4채널이 같은 방향을 가리켜야 함 — 동일 원칙의 확장 | 보강 |
| 시선 차단 | §5.1 Wright 도착 그래머의 "좁은 접근 경로" 와 정합 | 보강 |
| Fire/Ember | 본 가이드 §7.3 에서 이론적 출처 명문화 | 보강 |

충돌 없음. 본 가이드는 기존 7대 원칙의 *이론적 근거와 실행 도구* 를 추가한다.

> 시금석 매핑: **침묵** (환경 서사 전체가 침묵의 언어).

---

## Part VI — 정서 디자인 (Emotion)

### 6.1. How Games Move Us 비언어 6채널 — ECHORIS 매핑

"게임을 제외한 모든 매체에서 우리는 관찰자일 뿐이며, 결과에 영향을 미칠 수 없다. 게임만이 플레이어를 행위자로 만든다." (How Games Move Us, Ch.1)

비언어적 감정 6채널 ECHORIS 매핑:

| 채널 | ECHORIS 구현 | 강도 조절 포인트 |
|:--|:--|:--|
| 음악 | BGM 판소리 5조 전이 (평조→진양조→중모리→자진모리→휘모리) | Stage 별 조(調) 전환 |
| 색온도 | 층위 하강 냉각 + 아이템계 팔레트 반전(청록↔주황) | 대장간 = 주황 최고점 |
| 공간 | 카메라 거리 — 심층일수록 Erda 가 작아짐 | Stage 4 직면 = 최대 거리 |
| 페이싱 | 자진모리 발화 밀도 + 히트스탑 빈도 증가 | Stage 5 풀이 = 1.5-2.5초 정지 |
| 캐릭터 body language | Erda 의 정지 애니메이션 0.5-1.0초 | 주요 전환 비트 |
| 환경 소리 | 기계음 → 앤빌 저음 → 판소리 보조음 레이어링 | 대장간 진입 = 앤빌 저음 시작 |

선택의 정서적 무게: "플레이어가 직접 선택하고 행동하기 때문에, 그 결과에 대한 감정적 책임감(공모, Complicity) 이 발생한다." (How Games Move Us, Ch.1 Train 보드게임 사례) — ECHORIS 에서 Forgotten Shard 격파 = 공모 감정의 발생 지점. "내가 방금 망자를 또 잊었나, 아니면 기억해주었나" 의 순간적 인지 혼란이 의도된 설계다.

ECHORIS 적용: 6채널의 강도 변화는 *Stage 전환* 과 반드시 동기화된다. 채널 변화 없이 Stage 가 넘어가면 플레이어는 전환을 인지하지 못한다.

> 시금석 매핑: **위로** (감정 채널 전체가 위로 → 위로 변환의 물리적 도구).

### 6.2. 한정흥 트라이앵글의 비언어 그래머

한정흥 세 꼭짓점은 각각 *비언어* 채널이 다르다. (한정흥 spec §1, §2.1 매핑)

| 꼭짓점 | 지배 채널 | 비언어 신호 |
|:--|:--|:--|
| 한 | 공간 + 환경 소리 | 거대한 빈 공간, 낮은 기계음, Forgotten Shard 의 노란 눈빛 |
| 정 | 캐릭터 body language + 페이싱 | Rustborn 발화 빈도 저하 (말 없음 = 정의 표지), Erda 이동 속도 미세 감소 |
| 흥 | 음악 + 색온도 | 휘모리 가속, UI 카니발, 청록→주황 컬러 드롭 (Memory Shard Recalled) |

흥은 희소해야 한다 (세션당 5% 미만 — 한정흥 spec §1.3). 이것은 감정 채널 설계에서도 동일하다: UI 카니발과 휘모리 가속은 *각 세션에서 한 번* 의 강도로 작동한다. 남용하면 한의 무게가 사라진다.

ECHORIS 적용: 흥 발화 트리거 목록을 명시하고 잠근다 — (1) Memory Shard Recalled 전이, (2) 보스 격파 직후 정지→폭발, (3) True Ending 의 합주. 이 세 자리 외에 흥 채널을 가동하는 것은 한정흥 spec 위반이다.

> 시금석 매핑: **위령** (흥은 위령 완료의 신호 — 한이 풀린 증거).

### 6.3. 4 시드의 비언어 클라이맥스 — 7단계 §5 풀이와의 정합

Victor 의 4 시드가 공통으로 가지는 비언어 클라이맥스 형태 분석 (Content_Direction §2.5 5단계 곡선):

| 시드 | 비언어 클라이맥스 순간 | 감정 채널 |
|:--|:--|:--|
| 랄프 | 낙하하면서 버낼로피를 받쳐주는 신체 행위 (대사 없음) | 캐릭터 body language + 페이싱 |
| 히컵 | 드래곤을 풀어줄 때 끈을 자르는 단 하나의 행위 | 캐릭터 body language + 음악 중단 |
| 주디 | 편견 발언 후 닉이 등을 돌리는 순간 — 침묵 | 공간 + 페이싱 (아무것도 일어나지 않음) |
| 조이 / 불안이 | 모든 감정이 함께 손을 잡는 순간 — 말 없이 | 색온도 + 음악 |

4 시드 공통 DNA = **클라이맥스에서 대사가 없다.** Stage 5 풀이(Content_Direction §5) 의 "카메라 정지 1.5~2.5초" 연출이 이 비언어 클라이맥스를 수행한다.

ECHORIS 적용: Stage 5 풀이 씬의 설계 절대 원칙 — 마지막 보스 처치 후 *Rustborn 이 침묵한다*. 1.5-2.5초 동안 Rustborn 발화 없음, Erda 이동 입력 잠금, BGM 만 남음. 이 침묵이 4 시드 클라이맥스와 동형이다.

> 시금석 매핑: **위로** (침묵의 클라이맥스 = 위령이 위로로 전환되는 순간).

---

## Part VII — 씬 / 비트 단위 작법 (Scene Craft)

### 7.1. 15-Beat Sheet — 아이템 서사 한 자루의 압축 구조

"Save the Cat! 의 15비트 시트를 TV 에 적용한다. 시즌 전체의 아크를 비트 시트로 구성하는 방법과, 에피소드별 비트 분배 전략을 설명한다." (Save the Cat Writes for TV, Ch.5-6)

아이템 레어리티별 15-Beat 압축 적용표:

| 레어리티 | 지층 수 | 15-Beat 매핑 | 수행되는 Beat |
|:--|:--|:--|:--|
| Normal | 1 | 5-Beat 압축 | Opening Image / Catalyst / Break into 2 / All is Lost / Final Image |
| Magic | 2 | 8-Beat 압축 | 위 5 + Fun & Games / Midpoint / Dark Night of Soul |
| Rare | 3 | 11-Beat 압축 | 위 8 + Theme Stated / B Story / Break into 3 |
| Legendary | 4 | 13-Beat 압축 | 위 11 + Setup / Debate |
| Ancient | 4+심연 | 15-Beat 완전 | 전체 |

"Opening Image" = 아이템계 진입 첫 방. "Final Image" = 마지막 지층 클리어 후 Rustborn 의 마지막 발화. 두 이미지가 *반드시 대조* 되어야 한다 — Opening 이 Forgotten 의 이미지라면, Final 은 Recalled 의 이미지다.

ECHORIS 적용: 아이템 서사 재작성 시 먼저 "Opening Image 와 Final Image 는 무엇인가" 를 정의한다. 두 이미지가 동일하다면 서사적 전환이 없는 것이다 — 재작성 대상이다.

> 시금석 매핑: **위령** (Opening=Forgotten → Final=Recalled = 위령의 완료).

### 7.2. Scene with No Turn 거절 — 최소 1 Turn 보장

"Breaking Story 는 TV 작가실에서 이야기의 비트를 만들어내는 과정이다." (Save the Cat Writes for TV, Ch.3-4) — 씬은 반드시 *전환(Turn)* 이 있어야 한다. 전환 없는 씬은 존재 이유가 없다.

ECHORIS 의 Turn 발생 자리:

| 씬 유형 | 최소 Turn | Turn 의 형태 |
|:--|:--|:--|
| 보스방 등장 | 1 Turn 필수 | 보스의 패턴 변화 또는 Rustborn 의 태도 변화 |
| 잔영 NPC 조우 | 1 Turn 필수 | NPC 가 처음과 다른 행동을 한다 |
| Memory Shard Recalled 전이 | 1 Turn 내장 | Forgotten → Recalled 상태 변화 자체가 Turn |
| 층위 전환 컷 | 1 Turn 필수 | 다음 층위는 시각적으로 *다른 것* 이 먼저 보인다 |

ECHORIS 적용: 아이템 서사 재작성 시 각 방·씬·비트에 "이 자리의 Turn 은 무엇인가" 를 태그한다. Turn 이 없는 방은 *장식* 이지 서사가 아니다. 야리코미 게임에서 장식이 많으면 파밍 흐름이 끊긴다.

> 시금석 매핑: **위령** (Turn = 위령의 진척 신호).

### 7.3. 정보 공개 타임라인 — Fire & Ember 양식의 이론 출처

"배스토리 전달 방법: 인게임 책/일지, 선택적 사이드퀘스트, NPC 대화, 메뉴 내 데이터베이스 등. Aaron Sorkin 의 접근법처럼 캐릭터 배경을 필요에 따라 점진적으로 발명하는 것도 유효한 전략이다." (Interactive Storytelling for Video Games, Ch.6 배스토리 전달)

기존 `Design_Narrative_Worldbuilding.md` 의 Fire & Ember 정보 공개 양식의 이론적 출처:

- **Fire (직접 정보)**: MDQ(Major Dramatic Question) 를 진전시키는 정보. "왜 아이템계에 들어가는가" 의 답에 직결. Interactive Storytelling Ch.5 MDQ 원칙 — MDQ 가 답변되면 5분 이내에 관심이 떨어진다. Fire 는 MDQ 를 해소하지 않고 *심화시키는* 정보여야 한다.
- **Ember (간접 정보)**: 환경 배치, 아이템 플레이버, 잔영의 행동. Theory of Fun (Koster) 의 패턴 발견 — 플레이어가 *스스로 Ember 를 조합해 Fire 를 만들 때* 가장 강한 서사 경험이 발생한다.

ECHORIS 적용: 한 아이템계 전체에서 Fire : Ember = 1 : 3 비율을 권장한다. Fire 는 지층 보스 처치 시 한 번, Ember 는 지층 내 방마다 1-2개. Fire 가 너무 많으면 서사가 설명이 된다.

> 시금석 매핑: **거울** (Ember = 플레이어가 자기 방식으로 채우는 거울 자리).

---

## Part VIII — 수정·교정 원칙 (Revision)

### 8.1. 상위 실패부터 — 수정 순서

"Show, Don't Tell 원칙: 캐릭터의 감정 상태는 행동으로만 보인다." (Interactive Storytelling for Video Games, Ch.2 드라마 vs 소설의 차이) 수정도 동일한 우선순위 구조를 따른다.

수정 순서 4단계:

1. **구조 (Structure)** — Stage 전환이 정서 곡선을 따르는가. 7단계 곡선과의 정합
2. **캐릭터 (Character)** — Rustborn 의 화법이 일관성을 가지는가. Erda 의 행동이 Need 와 정합하는가
3. **플롯 (Plot)** — Turn 이 있는가. Fire & Ember 비율이 맞는가. 15-Beat 압축이 레어리티에 맞는가
4. **문장 (Sentence)** — 플레이버 텍스트가 1-3문장인가. 35단어 예산이 지켜지는가. 판타지 톤 어휘 0건인가

문장부터 수정하는 것은 구조 문제를 숨긴다. 구조가 틀렸는데 문장만 다듬으면 *잘 쓰인 실패작* 이 된다.

ECHORIS 적용: 아이템 서사 재작성 시 위 4단계를 *순서대로* 통과한다. 각 단계에서 "통과" 판정을 받아야 다음 단계로 진행한다.

> 시금석 매핑: **위령** (구조 = 위령 의례의 뼈대).

### 8.2. 아카이브된 6건 아이템 서사 — 수정 우선순위

아카이브 위치: `Documents/Content/_archive/ItemNarrative_FoundationRework_2026-05-28/`

아카이브 6건(Surveyor / Patchwright / Coldroom / Cistern / Rigger / Resonator) 에서 관찰되는 3개 의심 지점:

**의심 지점 1: Stage 4 Fire 한 문장의 약함**
위령 명제(DEC-047) 락 이전 작성된 서사들은 Stage 4 "직면 — 가장 깊은 아웃사이더는 나 자신이다" 비트가 없거나 약하다. 망자의 한이 표면 사건 수준에 머물고, *플레이어 자신과의 거울 관계* 가 부재한다. 수정 시 이 비트를 *반드시* 포함한다.

**의심 지점 2: Builder 캐논 과집중**
6건 중 다수가 Builder 문명의 캐릭터를 망자로 설정한다. World Bible 의 Layer 2-3 세력 다양성(6개 팩션) 이 활용되지 않았다. 재작성 시 망자의 세력 분산을 고려한다 — 모든 무기가 Builder 의 것이면 위령이 *특정 집단의 사건* 으로 좁아진다.

**의심 지점 3: 5색 기질의 과결정**
기질이 너무 명시적으로 서사에 서술된다 — "이 검은 Forge 기질을 가진 분노한 전사의 것" 식의 설명. 기질은 서술되는 것이 아니라 *플레이어가 느끼는* 것이다. 기질 어휘를 서사 본문에서 제거하고, 대신 기질이 *환경과 Rustborn 어투에서* 배어나오게 한다.

> 시금석 매핑: **거울** (의심 지점 3개 모두 플레이어가 직접 느끼지 못하게 방해하는 요소들).

---

## Part IX — 거절 매트릭스 (책의 원칙 ↔ ECHORIS 충돌)

다음 항목들은 소스 텍스트에 등장하는 유효한 원칙이지만 ECHORIS 의 락된 결정과 충돌한다. 충돌 근거와 거절 사유, 제한적 허용 가능 자리를 명시한다.

| 원칙 | 출처 | 충돌 | 거절 사유 | 제한적 허용 자리 |
|:--|:--|:--|:--|:--|
| **분기 경로(Branching Path) 스토리** | Interactive Storytelling Ch.6 스펙트럼 4번 | DEC-043 다중 결말 3+1 구조와 충돌 — 분기는 결말 한 지점에만 | 한정흥 순환은 선형이다. 중간 분기는 정서 축적을 분열시킴 | 결말 선택 1회, 야리코미 순서 선택 (서사 무관) |
| **GoT 식 다층 시점 화법** | Game of Thrones 에세이 §토포포컬 서사 | DEC-033 Erda 0 대사 원칙 + 단독 화자 Rustborn 과 충돌 | ECHORIS 는 단일 시점(Rustborn 화자) 이 정서 단일성을 보장 | Echo-Bearers 의 환경 흔적 (대사 없는 복수 시점 — 공간이 화자) |
| **"캐릭터 배경을 필요에 따라 즉흥 발명"** | Interactive Storytelling Ch.6 Sorkin 전략 | Content_Story_Synopsis CNT-STR-001 캐논 구조와 충돌 | 캐논화된 캐릭터 구조는 즉흥 변경 금지 | 미등장 소규모 NPC 의 배경 — 캐논 충돌 없는 범위 내 |
| **욕설/폭력/성적 묘사로 "진정성" 구축** | Game of Thrones §젠트리피케이션, 거침의 전략적 사용 | DEC-041 판타지 톤 폐기 + ECHORIS 1차 niche 페르소나 정합 | ECHORIS 의 거침 = 메가스트럭처 스케일 + 위령 정서. 선정/폭력적 거침은 BLAME!/MiA 팬에게 오히려 1차 niche 신호 희석 | 없음 — 전면 거절 |
| **Hero's Journey "멘토" 단계** | Interactive Storytelling Ch.3 단계 4 | Erda 에게 멘토가 없는 구조 + Rustborn 이 멘토가 되는 것 거절 | Rustborn 은 멘토가 아니라 동행자(動行者)이자 한을 가진 망자. 멘토 역할 수행 시 검 Ego 의 정서적 지위가 변질됨 | Rustborn 이 정보를 제공하는 것은 허용 — 그러나 "너를 이끈다"는 태도가 아닌 "내가 기억하는 것을 말한다"는 태도 |
| **다중 캐릭터 성장 아크 (앙상블)** | Save the Cat Writes for TV §캐릭터 구축론 | ECHORIS 는 단일 주인공 Erda 의 arc 가 메인 | 앙상블 arc 는 콘텐츠 양산 비용을 폭발시키며, 위령 명제의 "타자 중심" 을 "관계 중심" 으로 희석함 | Echo-Bearers 의 부재 arc — 그러나 이들은 현재 씬에 등장하지 않으므로 콘텐츠 비용 없음 |
| **Bartle Killer 유형 지원 (PvP 설계)** | Designing Virtual Worlds Ch.3 | ECHORIS PvP 없음 결정 | 1차 niche 페르소나에 Killer 유형 없음. PvP 추가 = 1차 niche 신호 희석 | 없음 |

---

## Part X — 다음 라운드 적용 (Application to Next Round)

### 10.1. 아이템 서사 재작성 체크리스트

아이템 서사 6건 재작성 시 다음 순서로 본 가이드를 시금석으로 사용한다.

```
Step 1. 위령 명제 정합 (Part I §0.2 시금석)
  - 이 무기의 망자는 누구인가? 한은 무엇인가?
  - Forgotten 상태가 MITH 의 Monster 로 기능하는가? (Part II §2.2)

Step 2. 구조 확인 (Part II §2.1, Part VII §7.1)
  - 레어리티에 맞는 15-Beat 압축을 선택했는가?
  - Opening Image 와 Final Image 가 Forgotten → Recalled 대조를 가지는가?

Step 3. 캐릭터 정합 (Part III §3.1, §3.3)
  - 망자의 Want / Need / Ghost 가 정의되었는가?
  - Rustborn 의 대사가 [평조/중모리/자진모리] 태그를 가지는가?

Step 4. 환경 서사 4채널 설계 (Part V §5.3, §5.4)
  - 각 방이 그림/배치/마모/색온도 채널로 무엇을 말하는가?
  - Fire : Ember = 1 : 3 비율인가?

Step 5. 의심 지점 3개 점검 (Part VIII §8.2)
  - Stage 4 "직면" 비트가 있는가?
  - 망자의 세력이 Builder 일색이 아닌가?
  - 5색 기질이 서사 본문에 명시 서술되지 않는가?

Step 6. 거절 매트릭스 통과 (Part IX)
  - 판타지 톤 어휘 0건인가?
  - Rustborn 이 멘토 역할을 하지 않는가?
  - 다마스커스 / 검의 결 어휘 0건인가?
```

### 10.2. 세계 캐논 보강 시 인용 절

세계 캐논 신규 결정(World Bible 보완, Layer 0-5 추가) 시 본 가이드의 다음 절이 출처로 기능한다.

| 결정 유형 | 본 가이드 출처 절 |
|:--|:--|
| 새 층위의 분위기 설계 | Part IV §4.2 (메가스트럭처 톤 4요소) |
| 세이브 포인트 설계 | Part V §5.1 (Wright 도착 그래머) + Part IV §4.3 (안전 공간 변질) |
| Ancient 아이템 서사 체인 | Part IV §4.4 (모성/창조 불안 메타포) + Part VII §7.1 (15-Beat 완전 버전) |
| 팩션 추가 결정 | Part II §2.4 (앙상블 거절 원칙 — Builder 일색 회피) |
| Identity Archive 설계 보완 | Part IV §4.5 (지속성의 매체) |

### 10.3. Echo-Bearers 5명 첫 Brief 작성 시 인용 절

Echo-Bearers 5명의 첫 캐릭터 brief 를 작성할 때, 다음 절을 *반드시* 함께 인용한다.

| Brief 항목 | 본 가이드 인용 절 |
|:--|:--|
| 캐릭터 8축 분해 | Part III §3.1 (Protagonist Engine 형식 동일 적용) |
| 부재 설계 원칙 | Part III §3.4 (부재의 서사 문법 3원칙) |
| 비언어 클라이맥스 자리 | Part VI §6.3 (4 시드 비언어 클라이맥스 형태) |
| 기질 표현 방식 | Part VI §6.2 (한정흥 비언어 그래머 — 기질 = 채널) |
| 한정흥 매핑 | Part II §2.1 (각 캐릭터가 트라이앵글의 어느 꼭짓점인가) |

---

## 소스 참조 인덱스

본 가이드에서 인용한 15편 소스:

| 번호 | 제목 | 인용 Part |
|:--|:--|:--|
| 1 | Interactive Storytelling for Video Games | II, III, VII, VIII |
| 2 | Save the Cat Writes for TV | II, III, VII |
| 3 | Save the Cat Writes Horror | II |
| 4 | How Games Move Us | III, VI |
| 5 | At the Mountains of Madness | IV |
| 6 | The King in Yellow | IV |
| 7 | The Gone World | IV |
| 8 | Gazing upon the Mother | IV |
| 9 | Game of Thrones — Quality Television | II, IV |
| 10 | The Art of Game Design A Book of Lenses | II, VII |
| 11 | A Theory of Fun for Game Design | V, VII |
| 12 | An Architectural Approach to Level Design | V |
| 13 | You Died The Dark Souls Companion | IV, V |
| 14 | Bloodborne Official Artworks | IV, V |
| 15 | Designing Virtual Worlds | IV |
