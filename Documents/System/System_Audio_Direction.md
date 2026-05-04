# System: Audio Direction

> **참조 문서:**
> - `Documents/Terms/Project_Vision_Abyss.md` — 3대 기둥, 2-Space, 스파이크
> - `Documents/Design/Design_Architecture_2Space.md` — 공간별 감정 프로파일
> - `Documents/Design/Design_Combat_Philosophy.md` — 타격감 시청각 피드백 원칙
> - `Documents/Design/Design_ItemWorld_Onboarding_SwordEgo.md` — 검 Ego(Rustborn) 발화/대사 규칙
> - `Documents/Design/Design_ItemWorld_Town_Shadow.md` — 그림자 마을 거주자 사운드 정체성
> - `Documents/System/System_Combat_HitFeedback.md` — 타격 피드백 시스템 (CMB-07-R-V SFX 명세)
> - `Documents/System/System_ItemWorld_Core.md` — 아이템계 안전지대(Plaza/Archive) 룰
> - `Documents/Research/AudioDirection_SoundDesign_Research.md` — 사운드 디자인 기초 리서치
> - `Documents/Research/ItemWorldVisual_MemoryTheme_Research.md` — 10개 기억 테마 오디오 무드
> - `Documents/Research/WebGameFeel_Optimization_Research.md` — Web Audio 레이턴시 분석
> - `memory/wiki/decisions/DEC-033-Sword-Ego.md` — 검 Ego 단독 화자 원칙
> - `memory/wiki/decisions/DEC-036-Memory-Shard-System.md` — 기억 단편 시스템(이노센트 폐기)
> - `memory/wiki/decisions/DEC-038-Town-of-Orphaned-Shadows.md` — 그림자 마을
> - `memory/wiki/decisions/DEC-039-Item-World-Continuous-Dive.md` — 수직 딥 다이브 + Trapdoor
> - `memory/wiki/decisions/DEC-040-Audio-Pipeline.md` — @pixi/sound + AI 자산 + 무음 페이드

---

## 구현 현황 (Implementation Status)

> 최근 업데이트: 2026-05-04 (DEC-036/038/039 정렬 + 환경/분위기 중심 톤 재정의)
> 문서 상태: `Active`
> 2-Space: 전체
> 기둥: 전체

### 코드 실측

오디오 시스템 SSoT는 `game/src/audio/Sfx.ts`. 현재는 외부 라이브러리 미도입 상태이며, `AudioContext` 위에서 즉석 합성된 3개 큐만 작동한다. 라이브러리는 **`@pixi/sound` v6.0.1** 으로 확정되었다 (DEC-040, 2026-05-04). Howler.js는 메모리 릭 누적 위험 때문에 야리코미 RPG 부적합으로 폐기되었으며 재도입 금지된다.

| 큐 이름 | 호출처 | 합성 방식 | 비고 |
|:---|:---|:---|:---|
| `upgrade` | `WorldScene.ts:1005`, `ItemWorldScene.ts:3451` | C5–E5–G5 트라이어드 (트라이앵글) | 장비 레벨업 보상 |
| `milestone100` | `WorldScene.ts:626`, `ItemWorldScene.ts:3377` | 저음 thud + 필터 노이즈 + 고역 핑 | 단발 100 데미지 첫 도달 1회 |
| `capture` | `ItemWorldScene.ts:1620` | 상승 sweep + 크리스탈 핑 | 기억 단편 회상(구 "복종") 신호 |

> **Phase 2 작업의 1차 마이그레이션 표면:** `SFX.play(name)` 파사드는 그대로 유지하면서 내부 구현만 `@pixi/sound` + 에셋 번들로 교체. 호출처 코드 무수정 (DEC-040 §보존).

### 우선순위 표 (Phase 2 정렬)

| 기능 ID | 분류 | 기능명 | 우선순위 | 구현 상태 | 비고 |
|:---|:---|:---|:---:|:---|:---|
| AUD-01 | AMB | 월드 환경 베드 (Tier 2/3 2종) | P0 | 대기 | 대공동 잔향 + 저음 드론. 분위기의 1차 시그널 |
| AUD-02 | AMB | 그림자 마을 4공간 베드 (Plaza / Memorial / Sanctum 공통 + Rust Lane 1종) | P0 | 대기 | DEC-038 District SSoT. Lane 4종(Forge/Iron/Spark/Shadow)은 P2로 이연 |
| AUD-03 | SFX | 에르다 발소리 (금속 격자 / 돌 / 흙 3종) | P0 | 대기 | 공간 정체성 지속 전달 |
| AUD-04 | SFX | 검 Ego(Rustborn) 사인음 (각성 / 발화 / 침묵 복귀) | P0 | 대기 | DEC-033 단독 화자 청각 채널 |
| AUD-05 | SFX | Rustborn 히트 SFX (슬래시 / 임팩트 / 피격반응 3레이어) | P0 | 대기 | 다른 무기 6종은 Phase 2 후반 |
| AUD-06 | BGM | 세이브 포인트 대장간 BGM | P0 | 대기 | "유일한 안전" 정체성 |
| AUD-07 | BGM | 월드 탐험 베이스 BGM (Tier 3) | P0 | 대기 | 탐험/전투 2레이어 크로스페이드 |
| AUD-08 | BGM | Rust Lane BGM (Rustborn 1차 다이브 전용) | P0 | 대기 | 낮은 첼로 드론 + 빗물 noise. 추가 4기질 Lane BGM은 P2 |
| AUD-08b | BGM | 공통 보스 BGM (Sanctum, 5기질 변주 X) | P0 | 대기 | §3-4 영구 룰. HP 단계 레이어 옵션 |
| AUD-09 | SFX | 아이템계 진입 페이드 (Stratum 1) | P0 | 대기 | DEC-039: 페이드 유지, 폴 다운 금지 |
| AUD-10 | SFX | Trapdoor Descent (Stratum N→N+1) | P0 | 대기 | DEC-039: 포탈 인터랙트 + 바닥 붕괴 + 낙하 |
| AUD-11 | SFX | UI 최소 세트 (메뉴/선택/장착/취소) | P1 | 대기 | |
| AUD-12 | SFX | 기억 단편 회상(구 capture) — 에셋 교체 | P1 | 부분 | 현재 합성 큐. @pixi/sound 마이그레이션 시 에셋화 |
| AUD-13 | SFX | 보스 사망 + Core Memory 회상 카타르시스 | P1 | 대기 | 히트스탑 동기 + BGM 단절 |
| AUD-14 | AMB | 그림자 마을 거리 이벤트 (메모리얼 종 / 시안 데이터 단자 chirp / 페이지 넘김) | P1 | 대기 | DEC-038 BLAME!+무라카미 합성 톤 |
| AUD-15 | SFX | 에르다 비언어 발성 (피격 / 착지 / 사망 3종) | P1 | 대기 | 절제 원칙. 대시는 호흡 1종만 |
| AUD-16 | SFX | 6종 추가 무기 히트 SFX | P2 | 대기 | Cleaver/Shiv/Harpoon/Chain/Railbow/Emitter |
| AUD-17 | AMB | 월드 Tier 5–7 환경 베드 + 침묵 전환 | P2 | 대기 | Tier 7 = BGM 부재 = 음악 |
| AUD-18 | AMB | 5색 기질 Lane 환경 베드 4종 추가 (Forge/Iron/Spark/Shadow) | P2 | 대기 | DEC-036 SSoT. 해당 기질 핸드크래프트 무기 도입 시점에 동기 |
| AUD-19 | SFX | 원소 인챈트 레이어 (Fire/Ice/Thunder) | P2 | 대기 | 무기 6종 후속 |
| AUD-20 | SFX | 레어리티별 드랍 SFX 5단 (Normal–Ancient) | P2 | 대기 | |
| AUD-21 | SFX | 보스 텔레그래프 사인음 | P2 | 대기 | Tell 보장 청각 채널 |
| AUD-22 | AMB | Rustborn 친밀도 단계별 환경 미세 변주 | P3 | 대기 | DEC-033 친밀도 0→3 |
| AUD-23 | SFX | 메모리 코어 펄스 5색 기질 (Forgotten 격파 / Recalled 장착) | P0 | 대기 | DEC-036 SSoT. §3-4 표 |

> **마일스톤 가시화:** `@pixi/sound` 통합(P0 선결) → AUD-01~10 P0 10건이 Phase 2 알파 게이트의 사운드 측 통과 기준이다. 자산 1차 제작은 ElevenLabs Sound Effects + ElevenLabs Music (AI 100%, DEC-040 §결정 4).

---

## 1. 개요 (Concept)

### 설계 의도

> "ECHORIS의 사운드는 전투의 양념이 아니다. 메가스트럭처의 침묵, 대장간의 유일한 온기, 검 Ego의 작은 숨결을 전달하는 *공간의 두 번째 카메라*다."

ECHORIS는 분위기·환경 사운드 중심으로 톤을 잡는다. 이는 1차 niche(BLAME!/메이드 인 어비스/Transistor 팬)의 신호를 강화하는 결정이며, 1인 개발 환경에서 비용 대비 차별화 효과가 가장 큰 영역이기 때문이다. 화려한 전투 SFX 레이어 누적보다 "공간이 들리는가"를 먼저 만든다.

오디오 시스템이 해결하는 핵심 과제(우선순위 순):

1. **공간의 정체성** — 월드(메가스트럭처) / 아이템계(살아있는 세계) / 그림자 마을(Plaza/Archive 안전지대)이 *눈을 감아도* 구별되어야 한다.
2. **침묵 주인공의 정합** — 에르다 0줄 + 검 Ego(Rustborn) 단독 화자(DEC-033). Ego의 발화는 텍스트 + *짧은 청각 사인음*으로만 표현하며, 보이스 액팅은 도입하지 않는다.
3. **다이브의 무게** — Stratum 1 진입(페이드) / Stratum N→N+1 전이(Trapdoor)를 *서로 다른 청각 의례*로 분리(DEC-039). 후자만 폴 다운 + 압력 변화를 사용한다.
4. **타격감 보강** — 시각/운동감각 채널이 구현된 타격 피드백에 청각 30–50%를 채워 손맛 결손을 메운다. 단 *분위기를 깨지 않는 선*에서 임팩트 길이·잔향을 절제한다.

### 설계 근거

| 결정 | 근거 | 대안 대비 장점 |
|:---|:---|:---|
| 환경 사운드 우선, 전투 SFX 후순위 | BLAME!/메이드 인 어비스/Hollow Knight 1차 niche 신호 강화. 1인 개발 비용 효율 | 전투 레이어 누적은 niche 신호 희석 위험. 환경은 가장 적은 에셋으로 가장 큰 정체성 차이 생성 |
| 검 Ego 발화 = 텍스트 + 사인음 (보이스 X) | Transistor 학습. 침묵 비대칭 + 1인 개발 보이스 비용 차단 | 보이스는 수정 비용·로컬라이제이션·배우 의존성 모두 폭증. 사인음은 디자이너 단독 회차 가능 |
| Stratum 1 페이드 유지 (DEC-039) | 플레이테스트 "납치 피드백" P0 회피 | Stratum 1까지 폴 다운 적용 시 *동의 없는 진입* 인지 재발 |
| Trapdoor만 폴 다운 + 압력 변화 (DEC-039) | 플레이어 능동 인터랙트 후 발동 = 동의 확보 | Stratum 1 페이드와 의례적으로 분리되어 "더 깊이" 신호가 강해짐 |
| 그림자 마을 = 도서관 식 적막 (DEC-038) | 무라카미 『세계의 끝과 하드보일드 원더랜드』. 거주자 = 그림자 = 침묵 | 활기찬 마을 BGM은 검 Ego 단독 화자 원칙 약화 |
| 음악 부재 자체를 음악으로 사용 (Tier 7) | Hollow Knight Deepnest 접근 | BGM 추가보다 강력한 분위기. 1인 개발 비용 0 |
| 히트 SFX 3레이어 구조 | Dead Cells GDC 2018 (Yoann Laulan) | 단일 레이어 대비 충격감 2–3배. 분위기 비용은 짧은 임팩트 길이로 통제 |
| 세이브 포인트 진입 시 앰비언트 전환 | "거대 차가움 속 유일한 따뜻함" (`Project_Vision_Abyss.md` §5) | "안전" 신호의 가장 강력한 청각 수단 |

### 3대 기둥 정렬

| 기둥 | 오디오 기여 |
|:---|:---|
| 탐험가 | 층위별 앰비언트 변화가 "더 깊이 내려간다"는 감각 형성. 세이브 포인트 사운드 전환이 안전 인식 강화. 능력 게이트 해금 시 음악적 카타르시스 |
| 장인 | 검 Ego(Rustborn) 사인음이 "이 검은 살아있다" 신호의 핵심 채널. 모루 단조·아이템 강화 효과음이 의례화 |
| 모험가 | (Phase 3+) 4인 파티 동시 히트 SFX 풀링. 단, 본 문서 작성 시점 멀티 코드 0줄. 멀티 사운드는 Phase 3 진입 전까지 *설계만* 유지 |

### 저주받은 문제

| 상충 요소 | 해결 방향 |
|:---|:---|
| 분위기 우선 vs 타격감 손맛 | 임팩트 길이는 짧게(≤120ms 잔향), 저역 펀치(150–400 Hz)는 단단하게. 길이가 아닌 *밀도*로 손맛 확보 |
| 환경 베드 항시 재생 vs 청각 피로 | LUFS −22 ~ −18 으로 낮게 유지. 거리 이벤트는 30–90초 간격 랜덤. 동일 샘플 연속 재생 금지 |
| 검 Ego 사인음 vs 반복 피로 | DEC-033 발화 빈도 게이팅(1회차 풀, 4회차 침묵) 그대로 청각에도 적용. 사인음은 발화 트리거에만 동기 |
| Stratum 1 페이드 vs 다이브 무게 | Stratum 1은 *페이드 + 검 Ego 사인음 + 새 환경 베드 페이드인* 으로 의례 확보. 폴 다운은 Stratum N→N+1 전용 |

---

## 2. 사운드 팔레트 (Sound Palette)

### 2-1. 월드 음향 정체성 — Megastructure Shaft

월드는 *거대 빌더가 누비는 수직 대공동*이다. 청각 팔레트는 BLAME!/메이드 인 어비스의 메가스트럭처 톤을 따른다.

- **기조:** 산업적 금속음 + *광활한 잔향* + 저음 드론 (60–120 Hz)
- **거리 신호:** 멀리서 들리는 빌더 발걸음, 구조물 삐걱임, 케이블 긴장음. 시각화 없음 — *저기 뭔가 있다* 만 전달
- **대비:** 세이브 포인트 화덕 온기 ↔ 외부 구조물 냉정한 기계음
- **금지:** 고딕 다크 판타지 음향 (교회 성가, 악마적 코러스). Blasphemous/Moonscars 레드오션과 차별

### 2-2. 아이템계 음향 정체성 — 그림자 마을 (DEC-038)

아이템계는 *아이템 안에 살아있는 세계*(DEC-033 스파이크)이며, 그 세계의 정체는 **빌더가 떠난 거대 공동에 잔류한 그림자 신호의 거주지**다 (DEC-038). 청각도 이 이중 메타포를 따른다.

- **이중 메타포 톤:** BLAME!(시각·메커닉) — 자동화 보존소·청록 데이터 단자·잔류 인간형 신호. 무라카미(정서·관계) — 그림자 마을·단독 화자·도서관 적막
- **유령 청각 원칙:** 풀무는 돌지만 대장장이는 없고, 종은 울리지만 치는 자는 없다. *소리는 남았지만 그 소리를 만든 자는 떠났다*
- **2축 분류 SSoT:**
  - **공간 차원** — Plaza / Lane / Memorial / Sanctum 4공간 (`itemWorldDistricts.ts` 코드 SSoT, §3-3)
  - **정체성 차원** — Forge / Iron / Rust / Spark / Shadow 5색 기질 (DEC-036 SSoT, §3-4)
- **시각 팔레트와 정합:** 청록(Iron) + 주황(Forge) + 회색(Rust) + 흰빛(Spark) + 자주(Shadow). District 매퍼 hex 색상과 1:1
- **반향 비율:** 월드 = 긴 잔향 (광활한 메가스트럭처) / 아이템계 = 짧은 잔향 ("기억의 보존소 내부")

### 2-3. 안전지대 vs 전투 영역 청각 약속

같은 그림자 마을 안에서도 *안전지대*와 *전투 영역*은 청각이 다르다 (DEC-038 §5).

| 영역 | 룸 (RoomNode) | 청각 약속 |
|:---|:---|:---|
| 안전지대 | Plaza (hub) / Memorial (shrine) | 환경 베드만. *전투 BGM 트리거 금지*. 검 Ego 발화·메모리얼 종·메모리 코어 chirp 만 허용 |
| 전투 영역 | Lane (spoke) | 5색 기질별 환경 베드 + 전투 BGM 활성. 왜곡 그림자 출현 시 긴장 레이어 추가 |
| 보스 직전 | Inner Sanctum (boss) | 환경 베드 −6dB 다운믹스. 0.5초 침묵 게이트 후 보스 BGM |

> **invariant:** 안전지대에서 적 spawn 0 + 전투 BGM 0. 코드 레벨 잠금 (DEC-038).

### 2-4. 주요 레퍼런스 트랙 방향

| 공간 | 음악 방향 | 참조 레퍼런스 |
|:---|:---|:---|
| 월드 탐험 | 미니멀 산업 앰비언트. 고독·광활. 멜로딕하되 무겁다 | Hollow Knight (Christopher Larkin) |
| 아이템계 Lane (전투) | 5색 기질별 변주. 금속 긴장 루프 위에 기질 포인트 악기 | Dead Cells (Yoann Laulan) + 5색 톤 변주 |
| 아이템계 Plaza | 도서관 적막 + 메모리얼 종 + 시안 데이터 단자 | Hollow Knight Resting Grounds + BLAME!/무라카미 합성 |
| 아이템계 Memorial | 페이지·먼지·시안 큐브 동기화 | Hollow Knight City of Tears 도서관 + BLAME! 보존소 |
| 아이템계 Sanctum | 거대 그림자 봉인음. 키퍼 호흡 | Made in Abyss (Kevin Penkin) Idofront 톤 |
| 세이브 포인트 | 대장간 테마. 따뜻하고 리드미컬. 유일한 "집" | Hades (Darren Korb) |
| 최심층 (Tier 7) | 앰비언트 텍스처. 음악적 구조 해체 | Hyper Light Drifter (Disasterpeace) |

### 2-5. 톤 일관성 약속 (CLAUDE.md §타깃·§톤 정합)

본 시스템의 모든 사운드 결정은 다음 4가지 톤 약속을 통과해야 한다.

#### A. 분위기 3축 (CLAUDE.md §톤 & 매너)

| 축 | 청각 구현 | 우선순위 |
|:---|:---|:---:|
| **거대 구조물의 경외** (BLAME!/메이드 인 어비스) | 광활한 잔향 + 저음 드론 + 거리 신호 (빌더 발걸음·구조물 삐걱임) | P1 — 1차 niche 핵심 신호 |
| **대장간의 온기** (세이브 포인트) | 화덕 타닥 + 망치 리듬 + 낮은 목관. *유일한 인간의 온기* | P1 — "안도/준비" 의례 |
| **디스가이아의 경쾌한 야리코미** | 메모리 코어 펄스·레어리티 드랍·레벨업 — *짧고 절제된* 카타르시스. 가벼운 톤 X, 의례적 반복의 작은 만족감 ○ | P2 — 절제 사용 |

> 세 축은 *공존하되 동시 발화 X*. 한 번에 하나의 축이 우세해야 한다. 동시 발화는 톤 충돌 = 1차 niche 신호 희석.

#### B. 월드 삼중 레이어 톤 (CLAUDE.md §월드)

월드 환경 베드는 자연/빌더/현 문명 *삼중 레이어 메타포*를 청각으로 운반한다.

| 레이어 | 청각 신호 | Tier |
|:---|:---|:---|
| **자연** (가장 깊은 층) | 낙수, 바람, 광물 결정 흐름 | Tier 6–7 비중 상승 |
| **빌더 구조물** (중간 층) | 메가스트럭처 금속 진동, 통풍구 바람, 케이블 긴장음, 빌더 발걸음 (멀리) | Tier 3–6 주력 |
| **현 문명 잔재** (얇은 표층) | 잔류 인간형 신호, 세이브 포인트 화덕, 깃발 펄럭, 멀리 거주자 호흡 | Tier 2 주력, 깊은 층에선 사라짐 |

> 깊이에 따라 *현 문명 → 빌더 → 자연* 순으로 청각 비중이 이동한다. Tier 7 에서는 자연 단일 레이어 + BGM 부재.

#### C. 아이템계 — 무기 결의 청각화 (CLAUDE.md §아이템계)

아이템계의 베이스 드론은 *무기 결*을 직접 청각화한다 — "부식 강판 / 다마스커스 단면". DEC-036 5색 기질이 이 결의 청각 변주.

| 무기 결 | 베이스 드론 음색 | 정합 기질 |
|:---|:---|:---|
| 부식 강판 (녹슨 결) | 빗물·부식 noise + 낮은 첼로 | Rust |
| 단조열 잔재 (불의 결) | 풀무·재 떨어짐 + 저음 hum | Forge |
| 다마스커스 단면 (강철 결) | 청록 종 진동 + 결정 핑 | Iron |
| 잔불의 결 (빛의 결) | 정전기 + 흰빛 chime | Spark |
| 그림자 결 (어둠의 결) | sub-bass + 휘파람 | Shadow |

> 시각 팔레트 반전(주황 배경 + 청록 디테일)과 청각 팔레트가 1:1. 무기를 *집어들면 그 결의 톤이 들린다*가 스파이크 청각 SSoT.

#### D. 비타깃 신호 거절 (CLAUDE.md §타깃)

CLAUDE.md *비타깃: 캐주얼 액션 RPG·캐주얼 플랫포머·가벼운 모바일* — 친절함·부드러움·안내 강화 *거절*. 사운드 차원에서:

| 비타깃 신호 | 본 시스템에서 금지하는 패턴 |
|:---|:---|
| 친절함 강화 | 도움 chime·긍정 fanfare 남용. UI 사인음의 *밝은 톤 과사용* |
| 부드러움 강화 | BGM 발라드 톤·따뜻한 멜로디 우세. 환경 베드의 가벼운 패드 사용 |
| 안내 강화 | 환경 베드가 *플레이어를 인도하는 톤*으로 변주. 길 안내 사인음·미터링 보조 톤 |
| 캐주얼 모바일 톤 | 짧은 청량 SFX 남용. 1초 미만 high-hat 식 UI 클릭 |

> 적용 시 점검: "이 사운드가 BLAME!/메이드 인 어비스/Transistor 팬에게 *louder* 한 신호인가, 또는 무해히 통과하는가? 1차 신호를 *약화*시키는가?" — 약화 신호는 채택 X.

---

## 3. 환경/앰비언트 오디오 (Ambient Audio)

> 본 시스템의 **선두 채널**이다. ECHORIS의 오디오 정체성은 환경 베드에서 1차 결정되며, 다른 모든 레이어는 이 위에 얹힌다.

### 3-1. 앰비언트 3레이어

모든 구역의 앰비언트는 3개의 독립 레이어로 구성된다 (Hollow Knight 시스템).

```
Layer A: 환경 기저 (Environmental Bed)
  — 항상 재생. 공간 특성을 정의. 루프

Layer B: 거리 이벤트 (Distance Events)
  — 30–90초 랜덤 간격. "저 멀리 뭔가 있다" 암시. 시각화 없음

Layer C: 근접 트리거 (Proximity Triggers)
  — 특정 오브젝트/구역 진입 시 활성화
```

**잔향 원칙:** 잔향 길이 = 공간 규모의 직접 번역. The Shaft 깊은 층위일수록 잔향이 길어지고("광활한 공동"), 아이템계 지층 내부는 짧다("금속 상자 안").

**전환 원칙:** 구역 간 이동 시 스냅 전환 금지. 크로스페이드 2–3초 (Dead Cells 바이옴 전환 기법).

### 3-2. 월드 층위별 환경 프로파일

| 층위 | 공간 특성 | 환경 기저 | 거리 이벤트 | 잔향 |
|:---|:---|:---|:---|:---|
| Tier 2 (세이브) | 따뜻한 대장간. 유일한 안전 | 화덕 소리, 망치 원거리 타격, 낮은 기계 허밍 | 동료 그림자, 거래 흐름, 물 방울 | 중간 (돌 공간) |
| Tier 3–4 | 산업 구조물. 탐험 시작 | 금속 구조물 진동, 통풍구 바람, 케이블 긴장음 | 멀리서 들리는 기계 작동음 | 긴 (대공동) |
| Tier 5–6 | 노후화. 이질감 | 금속 부식, 저음 맥동, 간헐적 진동 | 원인 불명 스크래핑 | 매우 긴 + 플랜지 |
| Tier 7 (최심층) | 거대 빌더의 영역 | **거의 침묵.** 에르다 발소리만 들림 | 없음 | 극장급 (무한 공동) |

> **Tier 7 침묵 원칙:** BGM 페이드아웃 + 환경 베드 −24 LUFS 이하. 침묵이 *공간의 무게*를 전달한다. 침묵을 BGM 누락으로 해석해 보강하지 말 것.

> **세이브 포인트 진입 의례:** 외부 산업 앰비언트 페이드아웃 (1.5초) → 화덕 소리 + 낮은 대장간 허밍 페이드인 (1.5초). 이것이 "이곳은 안전하다"의 가장 강력한 청각 신호다.

### 3-3. 그림자 마을 사운드스케이프 — 공간 차원 (DEC-038/039)

아이템계의 룸은 **District 매퍼**(`game/src/data/itemWorldDistricts.ts`, 코드 SSoT)에 따라 4가지 공간 약속으로 분류된다. 각 공간은 *고유한 음향 약속*을 가지며, 그림자 마을의 두 메타포(BLAME! 자동화 보존소 + 무라카미 그림자 마을)를 청각으로 봉합한다.

> **세계관 톤:** *떠난 자의 잔재 (Residual Signal)*. 빌더가 떠난 거대 공동에 *인간형 신호만* 잔류한다. 풀무는 돌지만 대장장이는 없고, 종은 울리지만 치는 자는 없다. 이 *유령 청각*이 모든 District 의 공통 톤이다.

#### 4공간 약속

| District (코드 SSoT) | RoomNode 역할 | flavor (코드) | 안전 여부 | 청각 시그니처 |
|:---|:---|:---|:---:|:---|
| **Plaza** | hub (지층 top) | "the bell-well at the heart of this memory" | 안전 (적 spawn 0) | 메모리얼 종 (60–90초) + 잔류 인간형 호흡 + 시안 데이터 단자 hum |
| **Lane** | spoke (분기 가지) | 5색 기질로 변주 (§3-4) | 전투 가능 | 기질별 환경 베드 (§3-4) |
| **Old Well / Memorial** | shrine (분기 끝) | "a quiet alcove off the plaza" | 안전 (적 spawn 0) | 도서관 적막 + 메모리 코어 시안 chirp |
| **Inner Sanctum** | boss (지층 bottom) | "where the keeper of this memory still stands watch" | 보스 직전 | 환경 베드 −6dB 다운믹스 + 거대 그림자 호흡 + sub-bass 봉인 톤 |

#### Plaza — 기억의 종소리 우물 (BLAME! + 무라카미 합성)

| 레이어 | 사운드 |
|:---|:---|
| Layer A 기저 | 빌더 부재 거대 공동 잔향 (광활) + 시안 데이터 단자 hum (60Hz, 미세 떨림) |
| Layer A 부가 | 천장 파괴 잔재 잔향 (DEC-039) — 위 지층 그림자 parallax + 미세한 잔재 떨어짐 noise (랜덤 90–180초) |
| Layer B 거리 이벤트 | **메모리얼 종 (무라카미 톤)** — 60–90초 간격, 낮은 청동, 200–600 Hz, 잔향 4–6초. **시안 데이터 단자 chirp (BLAME! 톤)** — 30–60초 간격, 고주파 4–8 kHz, 0.05초. *두 시그니처는 영구 분리 운반*. 통합 금지 |
| Layer C 근접 트리거 | 문지기(Gatekeeper) proximity 진입 → Speak-In 사인음 + 낮은 공명 1회. 배경 그림자 미세 호흡 (proximity 안에서만 들림) |

> **메모리얼 종 vs 시안 chirp 분리 운반 영구 룰 (자체 결정 2026-05-04):** 두 메타포를 한 시그니처로 통합하지 않는다. 통합 시 무라카미 의례 톤이 BLAME! 기계 톤과 충돌하거나 반대로 *부드러워져* CLAUDE.md §타깃 비타깃 신호("부드러움 강화") 위반 위험. 음역(저주파 vs 고주파) + 간격(60–90초 vs 30–60초) + 잔향(4–6초 vs 0.05초) 분리로 동시 발화도 청각 변별 보장.

#### Old Well / Memorial — 광장 옆 조용한 옛 우물 (Archive)

| 레이어 | 사운드 |
|:---|:---|
| Layer A 기저 | 도서관 적막 (≤ −24 LUFS) + 데이터 큐브 시안 hum (낮음) + 무라카미 사서·BLAME! 보존소 큐레이터 통합 톤 |
| Layer B 거리 이벤트 | 페이지 넘김 (60초 간격) + 종이 부스럭 (랜덤) + 큐브 동기화 미세 chirp |
| Layer C 근접 트리거 | 아카이비스트(Archivist) proximity → Speak-In + 메모리 코어 시안 chirp 1회 |
| **메모리 코어 펄스** | Recalled Shard 슬롯 장착 시 `MemoryResident.pulseCore()` 동기 — 시안 큰 펄스 SFX (시각 alpha 1.0→1.8 / scale 1→1.6 / 600ms 감쇠와 1:1) |

> Archive 의 1차 정체성 결은 **Spark 기질**(호기심·먼지·도서관)과 가장 강한 정합. 단, 모든 무기에서 등장하므로 환경 베드는 *기질 비특화 공통*으로 1차 제작.

#### Inner Sanctum — 키퍼가 아직 서 있는 곳

| 단계 | 사운드 |
|:---|:---|
| 진입 −0.5초 | 환경 베드 즉시 −6dB 다운믹스 |
| 진입 0초 | 0.5초 침묵 게이트 |
| 진입 +0.5초 | 낮은 sub-bass 봉인음 (1.0초) + 거대 그림자의 미세 호흡 noise (1초) — *키퍼가 깨어나려 한다* |
| 보스 활성 | 보스 BGM 인트로 시작. 환경 베드 −∞dB |

#### 안전지대 invariant (코드 1:1)

> RoomNode.role === 'hub' 또는 'shrine' 인 룸에서는 **전투 BGM 트리거 금지**. 환경 베드만 재생. DEC-038 §5 안전지대 약속 + 코드 invariant 와 1:1 정합.

---

### 3-4. 5색 기질 사운드 팔레트 — 정체성 차원 (DEC-036)

> **폐기:** 디스가이아 풍 일반 판타지 분류 10테마(T-HOME / T-MILITARY / T-FORGE / T-FOREST / T-SCHOLAR / T-SACRED / T-MARKET / T-PRISON / T-NATURE / T-WAR) — ECHORIS 1차 niche(BLAME!/메이드 인 어비스/Transistor) 신호와 정합 약함. DEC-036 5색 기질 SSoT 와 충돌. 본 문서에서 음향 분류축으로 재도입 금지.

본 문서의 SSoT 는 **DEC-036 5색 기질** 이며 District 매퍼(`itemWorldDistricts.ts`)와 1:1 정합한다. 무기의 dominant temperament 가 알려진 경우 branchIndex=0 = dominant 로 배치되므로, 플레이어가 첫 진입하는 Lane 은 항상 *해당 무기의 정체성 결*을 청각으로 직접 전달한다.

#### 5색 기질 환경 베드 (Lane)

| 기질 | District (코드 SSoT) | 코드 flavor | Lane 환경 베드 핵심 (유령 청각) | 포인트 악기 |
|:---|:---|:---|:---|:---|
| **Forge** (분노·열정) | Forge Quarter (#ff8a3c) | "Anvils ring through the ash." | 풀무 바람 + 단조 망치 (60–90초) + *재(ash) 떨어지는 noise* + 용광로 잔열 hum. *대장장이는 없다* | 대형 앤빌 타격 1회 (간헐) |
| **Iron** (결연·냉정) | Iron Lane (#4cd6c1) | "Stone footings held against time." | 청록 종 (느림) + 차가운 석재 진동 + 결정 핑 분포. *치는 자는 없다* | 큰 청록 종 1회 |
| **Rust** (체념·세월) | Rust Alley (#8a8a8a) | "A street the rain forgot." | 빗물 noise + 부식 noise + 낮은 첼로 드론 + *간헐 단조 망치 잔재* (90초+, −14dB, Rustborn 부색 Forge). *비는 안 내린다 / 길은 잊혔다 / 단조도 멈췄다* | 낮은 첼로 한 음 (지속 드론) |
| **Spark** (호기심·경이) | Spark Court (#fff5b0) | "Embers loose in the air." | 정전기 hum + 잔불 hiss + 흰빛 chime + 먼지 부유 noise. *불은 꺼졌다* | 흰빛 chime 3음 |
| **Shadow** (의심·교활) | Shadow Den (#6b3a8a) | "Lanterns pulled low." | sub-bass + 짧은 휘파람 (멀리서) + 적막 + 등불 펄럭. *부는 자는 없다* | 휘파람 한 음 (느림) |

> **유령 청각 원칙:** 모든 Lane 은 *소리는 남았지만 그 소리를 만든 자는 떠났다* 톤을 공유한다. 풀무가 돌지만 대장장이가 없고, 종이 울리지만 치는 자가 없다. 이것이 BLAME! "잔류 신호" + 무라카미 "마음 잃은 거주자" 통합 톤이다.

#### 무기 dominant temperament 와 청각 1:1

| 무기 | dominant 기질 | 첫 진입 Lane 음향 |
|:---|:---|:---|
| **Rustborn** (첫 검, 핸드크래프트, Normal, 1지층) | **주색 Rust + 부색 Forge** | Rust Alley — 빗물 + 부식 + 낮은 첼로 (주색) + 간헐 단조 망치 잔재 (부색, 90초+ −14dB). 1차 다이브의 *모든 환경 베드 톤*이 된다 |
| 후속 핸드크래프트 Forge 무기 | Forge | Forge Quarter — 풀무 + 단조 망치 + 용광로 잔열 |
| 후속 핸드크래프트 Iron 무기 | Iron | Iron Lane — 청록 종 + 차가운 석재 |
| 후속 핸드크래프트 Spark 무기 | Spark | Spark Court — 정전기 + 잔불 + 흰빛 chime |
| 후속 핸드크래프트 Shadow 무기 | Shadow | Shadow Den — sub-bass + 휘파람 + 적막 |

#### 1인 개발 비용 통제 — 자산 매트릭스

(공간 4종) × (기질 5종) = 20셀이지만 1차 자산은 다음으로 한정.

| 자산 카테고리 | Phase 2 P0 (1차) | Phase 2 후반 (2차) | Phase 3 (3차) |
|:---|:---|:---|:---|
| Plaza 환경 베드 | **1종 (기질 비특화 공통)** | — | 5종 변주 (선택) |
| Lane 환경 베드 | **Rust 1종 (Rustborn 전용)** | Forge / Iron / Spark / Shadow 4종 추가 | — |
| Memorial 환경 베드 | **1종 (Spark 톤 공통)** | — | 5종 변주 (선택) |
| Sanctum 진입 사인음 | **1종 (기질 비특화 공통)** | — | 5종 변주 (선택) |
| 포인트 악기 (Lane) | **Rust 1종 (낮은 첼로)** | 4종 추가 | — |
| 메모리 코어 펄스 (Forgotten 격파/Recalled 장착) | **5종 모두** | — | — |
| 보스 BGM | **1종 (Sanctum 공통)** | 5색 기질별 변주 검토 | — |

> **Phase 2 P0 사운드 자산은 12건으로 압축**: Plaza 베드 + Memorial 베드 + Sanctum 사인음 + Rust Lane 베드 + Rust 포인트 + 메모리 코어 펄스 5종 + 메모리얼 종 + 시안 단자 chirp + 페이지 넘김. 기질별 Lane 변주는 *해당 기질 무기가 도입되는 시점*에 추가.

#### 공간별 자산 정책 — 영구 룰 (자체 결정 2026-05-04)

자산 폭증 안전 게이트. 1차 niche(BLAME! 광활 + 무라카미 적막) 신호는 *반복적 동일성*에서 강도가 산다. 같은 무기의 Plaza/Memorial/Sanctum이 동일 톤일 때 의례감이 보존되며, 무기마다 변주되면 "여긴 광장이야" 정체성이 흔들린다.

| 영역 | 5색 기질 변주 정책 | 사유 |
|:---|:---|:---|
| **Plaza** (hub) | **영구 1종 (기질 비특화)**. 5색 변주 도입 영구 금지 | 무라카미 광장은 *어느 마을이든 광장*이라는 공통성이 정체성. 무기별 변주 시 의례감 붕괴 |
| **Memorial** (shrine) | **영구 1종 (Spark 톤 공통)**. 5색 변주 도입 영구 금지 | 사서·보존소 큐레이터 = 어느 마을이든 같은 *시간 멈춤* 약속 |
| **Inner Sanctum** (boss) | **영구 1종 (기질 비특화 봉인 톤)**. 5색 변주 도입 영구 금지 | 보스 = 어느 기질이든 *그림자의 극단형* 공통 (DEC-038 §4.4) |
| **보스 BGM** | **영구 1종 (Sanctum 공통)** + HP 단계 레이어 | 위와 동일 사유 |
| **Lane 환경 베드** | 5기질 변주 (해당 dominant 무기 도입 시점에 동기) | Lane = 무기 정체성 결의 청각화 영역. 변주 필수 |
| **Lane BGM** | 5기질 변주 (Phase 3 베타 검토) | Lane 환경 베드와 동일 사유 |
| **메모리 코어 펄스** | 5종 모두 (Forgotten 격파 / Recalled 장착 / Core Memory 회상 공통) | 5색 기질 정체성의 1회성 신호. 풀 커버 필요 |

> **자산 풀 타깃 영구 압축:** 가설 풀 자산 (5공간 × 5기질 + 보스 BGM 5 + Lane BGM 5 + 메모리 코어 5 = 45건+) → 본 룰 적용 후 **~25건**. 1인 개발 비용 통제 + 1차 niche 신호 보존 동시 달성.

> **재도입 금지:** 향후 Plaza/Memorial/Sanctum/보스 BGM에 5색 기질 변주를 도입하자는 제안은 본 룰로 차단된다. 도입하려면 본 룰을 명시적으로 폐기하는 의사결정이 선행되어야 한다.

#### 메모리 코어 펄스 — Forgotten 격파 / Recalled 장착 시 (5색 모두 필수)

| 기질 | 펄스 사운드 |
|:---|:---|
| Forge | 단조 망치 + 불꽃 hiss (0.6초) |
| Iron | 청록 종소리 + 결정 핑 (0.6초) |
| Rust | 부식 noise + 낮은 첼로 한 음 (0.6초) |
| Spark | 흰빛 chime 3음 (0.6초) |
| Shadow | sub-bass + 짧은 휘파람 (0.6초) |

> 본 5종은 §8-3 Core Memory 회상(보스 처치 직후)과 동일 모티프를 공유한다. 단, Recalled 장착 시(Memorial)는 −3dB 약화, Core Memory 회상 시(Sanctum 직후)는 풀 강도.

### 3-5. 침묵의 사용 (Strategic Silence)

음악·사운드의 부재 자체가 가장 강력한 청각 사건이다. 다음 순간에 의도적으로 사운드가 빠져야 한다.

1. **Tier 7 최심층** 탐험 — BGM 부재 + 환경 베드 ≤ −24 LUFS
2. **Shadow Den 장기 체류** — *적막이 BGM을 대체*. 휘파람 단편 외 음악 부재
3. **아이템계 진입 직전 0.5초** — 모든 사운드 페이드아웃. 침묵이 진입의 무게를 만든다
4. **검 Ego 첫 각성 직전 0.3초** — Rustborn 사인음 직전 침묵 게이트
5. **보스 페이즈 전환** — 0.3–0.5초 침묵 후 강화 BGM 진입
6. **에르다가 기억 단편(Forgotten Shadow)을 시야에 처음 잡는 순간** — 환경 베드 −12dB 더킹, Ego 사인음 진입 공간 확보

---

## 4. 검 Ego 사인음 (Rustborn Sting)

> **DEC-033 청각 채널 + DEC-040 §결정 2.** Rustborn은 *말하는 무기*이지만 Phase 1~2 동안 보이스 액팅을 도입하지 않는다. Ego의 발화는 **타이핑 SFX (Undertale 패턴)** + 사인음으로만 표현된다. 정식 보이스 캐스팅은 Phase 3 베타 진입 시 재검토.

> **타이핑 SFX 음색:** 금속성(forged, hard edge). 검의 물질적 본질을 청각화. 5색 기질(Forge/Iron/Rust/Spark/Shadow)별 음색 분리는 DEC-040 후속 결정으로 미정 — 현재는 *단일 금속 톤* 사용.

### 4-1. Ego 발화의 청각 채널

| 채널 | 역할 | 음역 |
|:---|:---|:---|
| **각성음 (Awaken)** | Ego 의식 활성화. 검날 빛 동기. 1회 영구 | 고주파 공명 (3–6 kHz) + 짧은 잔향 0.4초 |
| **발화 진입음 (Speak-In)** | 텍스트 박스 출현. 매 발화마다 1회 | 미세한 금속 핑 (G6 / 1.6 kHz) + 0.15초 |
| **타이핑 SFX (Type-Tick)** | 텍스트 글자 출력에 동기. 글자당 1회 | 짧은 금속 클릭 (≤ 30ms). −12dB 이하 |
| **발화 종료음 (Speak-Out)** | 텍스트 박스 닫힘. 발화 종료 | 매우 약한 페이드아웃 노이즈. *거의 들리지 않게* |
| **침묵 복귀 (Silence Return)** | 4회차 이후 또는 전투 중 침묵 진입 | 사운드 없음. *부재가 신호*다 |

> **타이핑 SFX 사용 규칙:** 한 글자당 1회 트리거하되 동일 샘플 연속 시 피로 발생. 4–6종 변주 샘플을 라운드 로빈으로 재생. 한국어/영어 폰트 자간에 무관하게 시간 간격(≤ 60ms/글자)으로 트리거.

### 4-2. 트리거별 사인음 매핑

| 트리거 (DEC-033) | 사인음 | 빈도 제한 |
|:---|:---|:---|
| 첫 획득 (각성) | 각성음 (full) + Speak-In | 1회. 영구 |
| 아이템계 첫 진입 직후 | Speak-In | 1회. 영구 |
| 첫 적 처치 (왜곡 첫 격파) | 발화 진입음 약화 (−6dB) | 1회 |
| 첫 피격 | *사운드 없음* (검날 빛 시각만) | DEC-033 명시 |
| 첫 기억 단편 시야 진입 | Speak-In | 1회 |
| 보스 방 진입 | Speak-In | 매 진입 1회 |
| 보스 처치 후 | 각성음 약화(−3dB) + Speak-In | 매 진입 1회 |
| 친밀도 단계 전환 (0→1, 1→2, 2→3) | 각성음 (full) + 환경 베드 미세 변주 | 단계 전환 시만 |
| 4회차 이후 진입 | 침묵 | DEC-033 침묵 원칙 |

> **원칙:** 사인음은 *발화의 시작점만 마킹*한다. 발화 중 배경음으로 깔지 않는다. 텍스트 가독성을 해치지 않아야 한다.

### 4-3. 친밀도 단계별 음색 변화 (DEC-033 §4.4)

명시적 UI 없는 친밀도 시스템에 *청각 신호*를 미세하게 부여한다.

| 친밀도 | Speak-In 음색 |
|:---|:---|
| 0 (관찰) | 건조한 금속 핑. 잔향 거의 없음 |
| 1 (감각) | 금속 핑 + 미세한 따뜻한 하모닉 (5도 위) |
| 2 (인식 불가) | 금속 핑 + 따뜻한 하모닉 + 짧은 잔향 0.2초 |
| 3 (각성) | 금속 핑 + 따뜻한 하모닉 + 잔향 0.4초 + 미세한 코러스 |

> **개발 비용:** 1개의 베이스 핑 샘플 + EQ/Reverb 후처리 4단계로 충분. 단계별 별도 녹음 불필요.

---

## 5. 침묵 주인공 오디오 (Erda)

### 5-1. 비언어 발성

에르다는 대사 0줄(DEC-033). *신체 반응*만 허용된다.

| 상황 | 비언어 발성 | 음량/피치 | 목표 |
|:---|:---|:---|:---|
| 대시 | 짧은 숨 내뱉기 ("후") | 작음, 낮음 | 에너지 소비 |
| 피격 | 짧은 충격 숨소리 ("읏") | 중간 | 피해 인식 |
| 치명타 피격 | 더 강한 충격음 ("윽") | 중간–큰 | 위험 신호 |
| 사망 | 짧은 쓰러짐 소리 | 중간 | 드라마틱하되 길지 않게 |
| 높은 곳 착지 | 충격 숨 + 무릎 관절음 | 작음 | 물리적 무게 |
| 아이템계 진입 다이빙 | 숨 참기 (무음) → 진입 후 공기 흡입 | 없음 → 중간 | 긴장 극대화 |

> **절제 원칙:** 발성은 아껴야 의미가 산다. 너무 자주·크게 사용하면 "말 없는 주인공"의 정체성이 희석된다.

### 5-2. 발소리 시스템

발소리는 에르다가 *어떤 공간에 있는가*를 지속적으로 전달한다 — 환경 베드의 가장 강력한 보조 채널.

| 지면 재질 | 발소리 특성 | 적용 |
|:---|:---|:---|
| 금속 격자 | 딱딱한 "탁탁". 짧은 금속 공명 | 월드 빌더 구조물 전반 (Tier 3–6) |
| 돌/콘크리트 | 단단하고 낮은 "툭툭" | 월드 Tier 5–7, Plaza 천장 잔재, Iron Lane |
| 흙/유기물 | 부드럽고 흡수적인 "퍽퍽" | 월드 자연 레이어 (Tier 6–7) |
| 금속 판 (대형) | "탁" + 공명 길게 울림 | Forge Quarter (단조 강판) |
| 부식 금속 | "철컥" + 부식 noise | Rust Alley (녹슨 결) |
| 석재 | 단단한 "툭" + 미세 잔향 | Iron Lane (시간을 견딘 석재) |
| 종이/먼지 | 부드러운 "사삭" + 종이 부스럭 | Memorial (Old Well / Archive) |
| 잔불 흙 | 건조한 "퍽" + 미세 hiss | Spark Court |
| 어두운 잔재 | 흡수적 "툭" + sub-bass 공명 | Shadow Den |
| 빗물 잔재 | 미세 "첨" + 부식 hiss | Rust Alley 일부 |

**달리기/걷기 차이:** 달리기는 간격 짧고 충격 강함. 걷기/잠입은 음량 −12dB.

### 5-3. 에코 (지원 채널)

에코는 에르다의 *기계적 감각 보조*이며 발화 채널이 아니다. 절제 사용.

| 에코 상태 | 사운드 | 빈도 |
|:---|:---|:---|
| 평상시 대기 | 낮고 안정적인 전기 허밍 | 상시 (매우 낮음, ≤ −28 LUFS) |
| 새 구역 스캔 | 짧은 "핑" + 잔향 (소나) | 탐험 중 가끔 |
| 균열/게이트 탐지 | 빠른 "비이-" 알림음 | 게이트 근처 |
| 원소 인챈트 활성 (Phase 2 후반) | 원소별 지속 허밍 | 인챈트 지속 중 |

> 에코는 "기계가 아닌 따뜻한 유기적 울림"의 전기음. 검 Ego의 *금속 핑*과 음색이 명확히 구별되어야 한다 (Rustborn = 고주파 금속 / 에코 = 따뜻한 저주파 허밍).

---

## 6. 스파이크 사운드 — 아이템계 다이브 (DEC-039 + DEC-040)

> 아이템계 진입은 ECHORIS의 가장 중요한 단일 청각 이벤트다. **DEC-039는 진입 의례를 두 가지로 분리**한다: Stratum 1 = 무음 페이드 / Stratum N→N+1 = Trapdoor Descent. **DEC-040 §결정 5에 따라 LP 필터 풀 구현은 폐기**되었으며, 두 의례 모두 *무음 페이드*를 핵심 청각 장치로 사용한다.

### 6-1. Stratum 1 진입 — 무음 페이드 (DEC-040 정렬)

플레이테스트 "납치 피드백"(2026-04-17/04-20 P0)을 회피하기 위해 Stratum 1 진입은 *페이드 의례*만 사용한다. 폴 다운·낙하·바닥 붕괴 *금지*. DEC-040의 1초 fade-out + 0.5초 침묵 + 아이템계 BGM 인트로 패턴을 적용한다 (Hollow Knight 보스 진입 하드 컷 + Made in Abyss/Kevin Penkin 침묵 활용 레퍼런스).

```
Phase A (−0.5초 ~ 0초): 모루 인터랙트 + Rustborn 검날 빛
  - SFX: 검 Ego Speak-In + 타이핑 SFX
  - SFX: 모루 표면 미세 공명 (낮은 고주파 0.3초)

Phase B (0 ~ 1.0초): 모든 외부 사운드 페이드아웃 (1.0초)
  - BGM, 환경 베드, UI 모두 −∞dB 까지 선형 페이드

Phase C (1.0 ~ 1.5초): 무음 게이트 (0.5초)
  - 완전 침묵. 화면 블랙아웃 동기
  - 침묵 게이트가 *들어간다*는 청각 신호 그 자체

Phase D (1.5초 ~): 아이템계 BGM 인트로 + Plaza 환경 베드 페이드인
  - Plaza 환경 베드: 메모리얼 종 1회 + 시안 데이터 단자 hum + 거대 공동 잔향
  - Rustborn = Rust 기질 → BGM 인트로는 낮은 첼로 드론 + 빗물 noise
  - SFX: 검 Ego 진입 발화 Speak-In + 타이핑 SFX (텍스트: "여기야. 내 안.")
  - 환경 베드는 BGM 인트로 0.5초 후 진입
```

> **원칙:** Stratum 1 다이브는 *LP 필터·기압 시뮬*을 사용하지 않는다 (DEC-040 폐기). 무음 0.5초 자체가 압력 변화를 대체한다.

### 6-2. Stratum N → N+1 — Trapdoor Descent (DEC-039 신설 + DEC-040 정렬)

보스 처치 후 *능동 인터랙트*로만 발동되는 의례. 시각 측 폴 다운·바닥 붕괴는 유지되지만, 청각은 DEC-040에 따라 LP 필터 풀 구현 없이 *디제틱 SFX(낙하 바람·균열)* + *무음 페이드*만으로 구성한다.

```
Phase 1 (보스 처치 직후): 0.8초 카타르시스 침묵 게이트
  - SFX: 보스 BGM 즉시 정지
  - SFX: 환경 베드 −12dB 다운믹스
  - SFX: Core Memory 회상 SFX (5색 기질에 따라, §8-3 참조)

Phase 2 (Trapdoor 활성): 0.5초
  - SFX: 오렌지 단조열 빛기둥 활성 SFX (저음 hum + 고역 spark, 0.5초)
  - SFX: 인터랙트 prompt 등장 사인음 (UI 키 박스 펄스에 동기)

Phase 3 (인터랙트 입력): 0초
  - SFX: 검 Ego Speak-In + 타이핑 SFX (짧게)

Phase 4 (바닥 균열 → 낙하): 0.0 ~ 1.0초
  - SFX: 금속/콘크리트 균열 "쩍쩍" + 저음 공명
  - SFX: 금속 파열 + 낙하 바람 점진 증폭 (디제틱)
  - SFX: 에르다 숨 참기 (무음)
  - 시각: 카메라 다운 패닝 진행

Phase 5 (무음 게이트): 1.0 ~ 1.5초
  - SFX: 전 사운드 페이드아웃 (0.5초)
  - 0.3초 완전 침묵
  - 침묵이 *지층 사이를 통과한다*는 신호

Phase 6 (다음 Plaza 천장 진입): 1.5초 ~
  - SFX: 다음 Stratum Plaza 환경 페이드인 (천장 부서진 잔재 잔향 강조)
  - SFX: "DEPTH N / MAX" 풀스크린 텍스트 진입 사인음 (Plaza 진입 1.0초 시점)
```

> **디제틱 청각만 사용:** 낙하 바람·균열 SFX는 *세계 안에서 발생하는 소리*다. 외부 BGM에 LP 필터를 적용해 기압 변화를 시뮬레이션하는 비-디제틱 효과는 DEC-040으로 폐기되었다.

### 6-3. Stratum 마지막 보스 처치 후 — 월드 귀환

DEC-039: *대칭 페이드*. Stratum 1 진입과 같은 페이드 의례. 별도 상승 컷 없음.

```
Phase A: 보스 처치 직후 0.8초 카타르시스 침묵 + Core Memory 회상 SFX
Phase B: 1.5초 페이드아웃
Phase C: 1.5초 세이브 포인트 환경 페이드인
```

### 6-4. 레어리티별 강도 (참고)

> **DEC-039로 지층 수가 축소되었다.** Normal 1지층 / Magic 2지층 / Rare 3지층 / Legendary 4지층 / Ancient 4지층 + 심연. 따라서 Trapdoor 발동 횟수는 무기당 0회(Normal) / 1회(Magic) / 2회(Rare) / 3회(Legendary) / 3회+심연(Ancient).

| 레어리티 | Phase 4–5 강도 | Phase 6 환경 변주 |
|:---|:---|:---|
| Normal | N/A (Trapdoor 없음) | N/A |
| Magic | 작은 균열 + 보통 바람 | 1단계 어두워짐 |
| Rare | 황금빛 spark + 강한 바람 | 2단계 어두워짐 |
| Legendary | 불꽃 폭발 + 포효 바람 | 3단계 어두워짐 |
| Ancient | 현실 왜곡 (피치 시프트 LP) + 차원 붕괴 | 심연 진입 시 잔향 무한 확장 |

---

## 7. 전투 / 히트 사운드 (Combat Audio)

> 분위기 우선 원칙에 따라 전투 SFX는 *지원 레이어*다. 환경 베드 위에 *짧고 단단하게* 얹힌다.

### 7-1. 3레이어 히트 구조

모든 근접 히트 SFX는 3개의 독립 레이어가 시간차로 겹친다 (Dead Cells GDC 2018).

| 레이어 | 역할 | 타이밍 | 음역 | CMB 연동 |
|:---|:---|:---|:---|:---|
| L1. 슬래시 (Whoosh) | 무기 궤적. 공격 모션 시작과 함께 | 0ms | 중고음 (2–8 kHz) | CMB-07-R |
| L2. 임팩트 (Thud/Crack) | 금속이 살/갑옷에 닿는 순간 | 히트 판정과 동시 | 저중음 (200–1,200 Hz) | CMB-07-S |
| L3. 피격 반응 (Grunt/Echo) | 적의 피격 반응 | +30–50ms | 중음 + 짧은 잔향 | CMB-07-T |

**히트 컨펌 원칙:** L2 임팩트음에서 150–400 Hz 저음 성분이 충분히 커야 타격감이 산다. 노트북 스피커에서도 체감되도록 설계.

**잔향 통제 원칙:** L3 잔향 길이 ≤ 120ms. 환경 베드와 충돌하지 않도록 짧게.

**콤보 피치 계단:** 같은 무기 콤보는 누적될수록 임팩트음 피치 +3–7%. 피니셔 직전에 "완성"을 청각으로 예감.

### 7-2. Rustborn (검) 프로파일 — Phase 2 전반 1순위

| 요소 | 사운드 |
|:---|:---|
| L1 슬래시 | 중간 "휙" (금속 마찰). 녹슨 검의 미세한 부식음 추가 |
| L2 임팩트 1타 | 건조한 "챙" (이가 빠진 금속 톤) |
| L2 임팩트 2타 | "챙+" (피치 +3%) |
| L2 임팩트 3타 | "쾅" (피치 +7%, 저음 강화) |
| L3 피격 반응 (왜곡) | 그림자 흩어지는 짧은 노이즈 (0.1초) |
| 3타 피니셔 잔향 | 0.3초 공명 (Rustborn 검날 빛 동기) |
| 친밀도 3 도달 후 | L2 임팩트에 따뜻한 하모닉 미세 추가 |

> **레퍼런스:** Hollow Knight Nail의 단조 톤 + Transistor의 음악적 임팩트 결합. *고딕 다크 판타지 톤 금지*.

### 7-3. Phase 2 후반 무기 6종 (백로그)

`Documents/Plan/Phase2_RnD_MasterList.md` I-28~33. SFX 명세는 무기 구현 시점에 본 문서 §7.3 갱신 예정.

| 무기 | 슬래시 방향 | 임팩트 방향 | 특수 SFX |
|:---|:---|:---|:---|
| Cleaver (대검) | 묵직한 "쉬익" + 공기 압력 | "쿵" 저주파 | 2타 충격파 저음 |
| Shiv (단검) | 매우 짧은 "틱" x 4 | 건조한 "탁" | 출혈 시그니처 hiss |
| Harpoon (작살) | "휭" 중거리 | "꽝" 박힘 | 당기기 케이블 긴장음 |
| Chain (사슬) | "사라락" 채찍 궤도 | 다단 "탁탁탁" | 범위 펼침 음 |
| Railbow (활) | 차징 "흐음" + 발사 "탁" | "퍽" 충돌 | 3단 충전 단계음 (Dead Cells 활) |
| Emitter (지팡이) | 마법 충전 "윙-" | 원소별 분기 | 빔 INT 스케일 hum |

### 7-4. 원소 인챈트 레이어 (Phase 2 후반)

기본 히트음 위에 원소 레이어 추가 (Hades 부운 수정 히트음 기법).

| 원소 | 추가 레이어 |
|:---|:---|
| 화염 | "직직" 연소음 |
| 냉기 | "갈라지는" 크리스탈 음 |
| 전격 | "지지직" 방전음 |

---

## 8. 기억 단편 사운드 (DEC-036/038)

> **용어 갱신:** "야생/복종" 폐기. *Forgotten / Recalled* 또는 *불안정 / 안정화*로 통일 (DEC-033 §5.1, DEC-036 §4).

### 8-1. Forgotten Shadow 조우 (불안정 상태)

기억 단편은 적이 아니라 *왜곡에 의해 불안정해진 그림자 주민*이다. 청각도 *주민 신호*로 설계.

| 트리거 | 사운드 |
|:---|:---|
| 시야 진입 | 짧은 떨림 noise + 노란 눈빛 점멸 동기 (시각 0.3초마다) |
| 가까이 접근 | 떨림 noise 음량 +3dB |
| 주변 왜곡 처치 진행 | 떨림 noise 점진 약화 |

### 8-2. Recalled (안정화) — DEC-033 §3.6

주변 왜곡을 모두 처치하면 기억 단편이 안정화된다. *공격이 아니라 구원*의 청각 신호.

| 단계 | 사운드 |
|:---|:---|
| 안정화 트리거 | 떨림 noise 정지 → 0.3초 침묵 |
| 형태 안정 연출 | 따뜻한 상승 sweep (300 → 900 Hz, 0.4초) + 크리스탈 핑 (E6) |
| 검 Ego 발화 | Speak-In 사인음 (텍스트: "따뜻해졌어.") |
| 환경 베드 | 해당 영역 −2dB 밝은 EQ로 0.5초 전환 |

> **현재 코드:** `SFX.play('capture')`가 합성 sweep + 핑으로 이를 흉내내고 있다 (`Sfx.ts:167–194`). `@pixi/sound` 마이그레이션 시 동일 호출처에서 에셋으로 교체.

### 8-3. 핵심 기억 (Core Memory) 회상 — 보스 처치 후

DEC-036 보스 처치 시 100% 드롭. 카타르시스 정점.

| 단계 | 사운드 |
|:---|:---|
| 보스 사망 직후 | 0.8초 카타르시스 침묵 + 화면 흔들림 |
| Core Memory 등장 | 5색 기질에 따라 다른 모티프 (각 0.6초): |
| ↳ Forge (분노) | 단조 망치 + 불꽃 hiss |
| ↳ Iron (결연) | 청록 종소리 + 결정 핑 |
| ↳ Rust (체념) | 부식 noise + 낮은 첼로 한 음 |
| ↳ Spark (호기심) | 흰빛 chime 3음 |
| ↳ Shadow (의심) | 자주 sub-bass + 짧은 휘파람 |
| 정체성 슬롯 장착 | Speak-In + 친밀도 단계 전환 사인음 (해당 시) |

---

## 9. UI / 시스템 사운드

### 9-1. 메뉴 & 인벤토리

| 이벤트 | 방향 | 음량 |
|:---|:---|:---|
| 메뉴 열기 | 금속 슬라이딩 "철컥". 짧음 | 기준 |
| 메뉴 닫기 | 열기의 역방향. 피치 약간 하강 | 기준 |
| 커서 이동 | 매우 짧고 건조한 "틱" | 히트 SFX의 30% |
| 아이템 선택 | "탁" 확인음 + 짧은 공명 | 기준 |
| 아이템 장착 | 카테고리별 다름 (검=금속 "챙") | 기준 |
| 아이템 버리기 | 낮은 "툭". 가치 없음 | −6dB |

### 9-2. 성장 사운드

| 이벤트 | 방향 | 감정 |
|:---|:---|:---|
| 레벨업 | 따뜻한 상승 음계 (3–4음). 짧음 | 성취감, 절제 |
| 스탯 게이트 해금 | "문이 열리는" 금속 + 짧은 팡파르 1초 | 탐험 확장의 기념 |
| 능력 게이트 해금 (렐릭) | 보스 사망 + 별도 "획득" SFX. 무게감 | 메트로베니아 핵심 쾌감 |
| 장비 레벨업 | 현재 `SFX.play('upgrade')` 합성 트라이어드 (`Sfx.ts:88–108`) | `@pixi/sound` 마이그레이션 시 에셋화 |
| 100 데미지 첫 도달 | 현재 `SFX.fireMilestone100Once()` (`Sfx.ts:114–159`) | 세션당 1회 잠금 유지 |

### 9-3. 레어리티 드랍 SFX

| 레어리티 | 드랍 SFX | 지속 |
|:---|:---|:---|
| Normal | 작은 "탁" | 0.2초 |
| Magic | 가벼운 "챙" | 0.4초 |
| Rare | 황금빛 "챙챙챙" | 0.8초 |
| Legendary | 낮은 "쿵" + 오렌지 불꽃 | 1.5초 |
| Ancient | 시간 멈춤 (리버브 급증) + 팡파르 | 2.5초 |

---

## 10. 음악 디렉션 (Music)

### 10-1. BGM 2-Space 분리

| 공간 | 음악 방향 | 핵심 악기 | 강도 시스템 |
|:---|:---|:---|:---|
| 월드 탐험 | BLAME! 메가스트럭처 잔향. 미니멀·광활. *유령 청각* | 첼로/비올라 + 산업 타악 + 신디 패드 | 탐험/전투 2레이어 크로스페이드 |
| 아이템계 — Lane (전투) | 5색 기질로 변주(§3-4) | 기질별 포인트 악기 + 공통 베이스 드론 | 지층 깊이별 긴장도 상승 |
| 아이템계 — Plaza | 메모리얼 종 우물. 도서관 적막 + 시안 데이터 단자 hum | 청동 종 (간헐) + 낮은 첼로 한 음 + 시안 chirp | 강도 변화 없음 |
| 아이템계 — Memorial (Archive) | 무라카미 사서 + BLAME! 보존소 큐레이터 | 페이지 noise + 데이터 큐브 hum + 메모리 코어 시안 chirp | 강도 변화 없음 |
| 아이템계 — Inner Sanctum (보스) | 거대 그림자 봉인음 + 키퍼 호흡 | sub-bass + 봉인 톤 → **공통 보스 BGM 1종** | HP 단계별 레이어 추가 (5기질 변주 영구 도입 X, §3-4 영구 룰) |
| 세이브 포인트 | 대장간 테마. 유일한 인간의 온기 | 목관 + 망치 리듬 + 낮은 피아노 | 단일 고정 |

**BGM 공통 리듬:** 아이템계 Lane BGM 은 월드 BGM 과 *공통 리듬 패턴*을 공유하되 음색(Timbre)은 dominant 기질에 따라 변주된다 (Hades 장르 블렌딩 + DEC-036 5색 기질 SSoT). Plaza/Memorial/Sanctum 은 BGM 보다 *환경 베드 비중이 높음* — 음악적 구조보다 잔류 신호의 청각이 우선.

#### 5색 기질 Lane BGM 변주 매트릭스 (DEC-036)

| 기질 | dominant 무기 | Lane BGM 핵심 | BGM 변주 신호 |
|:---|:---|:---|:---|
| Forge | (후속) | 단조 망치 리듬 + 풀무 베이스 + 재 떨어지는 noise | 리듬 = 망치 그 자체 |
| Iron | (후속) | 청록 종 박자 + 차가운 석재 진동 + 결정 멜로디 | 박자 = 종소리 간격 |
| Rust | **Rustborn (1지층 P0)** | 빗물 noise + 부식 noise + 낮은 첼로 드론 (지속) | 멜로디 부재. *드론이 BGM을 대체* |
| Spark | (후속) | 정전기 hum + 잔불 hiss + 흰빛 chime 멜로디 | 멜로디 = 흰빛 chime 변주 |
| Shadow | (후속) | sub-bass + 휘파람 라인 + 적막 | *적막이 BGM을 대체*. 휘파람 단편만 간헐 |

> **Rust 톤이 1차 BGM:** Rustborn(첫 검) Phase 2 P0 시점에서 아이템계 BGM 은 *Rust 변주 1종만* 제작된다. 추가 4종은 해당 기질 핸드크래프트 무기가 도입되는 시점에 동기.

### 10-2. 월드 층위별 BGM 감정 목표

| 층위 | 감정 | 음악 방향 |
|:---|:---|:---|
| Tier 2 | 준비, 안도, 인간의 온기 | 대장간 테마 변형. 따뜻한 화성 |
| Tier 3–4 | 기대, 발견, 경이 | 멜로딕 탐험 테마. 현악 주도 |
| Tier 5 | 긴장, 이질 | 불협화 증가. 타악 비중 상승 |
| Tier 6 | 압박, 단호 | 화성 붕괴. 드론 중심 |
| Tier 7 | 고독, 경외, 무한 | *BGM 부재.* 앰비언트 텍스처만 |

### 10-3. 음악이 없어야 할 때

§3-5와 동일. 음악 부재의 6가지 트리거를 BGM 시스템에 직접 통합한다.

### 10-4. 루프 원칙

모든 BGM은 루프 포인트를 음악적으로 해결 (멜로디 종지 후 루프). SotN 미치루 야마네 접근.

**탐험/전투 2레이어 동기화:** 두 트랙은 정확히 같은 BPM, 마디 수, 루프 포인트. 에셋 검수 의무.

---

## 11. 믹스 전략 (Mix)

### 11-1. 라우드니스 타겟

| 카테고리 | LUFS | 피크 한계 |
|:---|:---|:---|
| BGM (탐험) | −18 | −3 dBTP |
| BGM (전투) | −16 | −2 dBTP |
| SFX (히트 임팩트) | −12 | −1 dBTP |
| SFX (UI) | −20 | −4 dBTP |
| 앰비언트 루프 | −22 | −6 dBTP |
| 검 Ego Speak-In | −16 | −3 dBTP |
| Tier 7 환경 베드 | ≤ −24 | −8 dBTP |
| Trapdoor 디제틱 SFX (균열·낙하 바람) | −10 (피크) | −1 dBTP |
| Plaza 메모리얼 종 | −16 | −3 dBTP |
| Memorial 메모리 코어 펄스 | −14 | −2 dBTP |
| Lane 환경 베드 (5색 기질) | −22 | −6 dBTP |

### 11-2. 믹스 우선순위

게임플레이에 중요한 오디오일수록 항상 먼저 들린다.

```
P1: 검 Ego Speak-In (희귀 발화. 들리지 않으면 내러티브 손실)
P2: 히트 임팩트 SFX
P3: 능력/아이템 획득 SFX
P4: 에르다 발소리/움직임 SFX (공간 정체성 핵심)
P5: BGM (전투)
P6: BGM (탐험)
P7: 앰비언트 루프
P8: UI SFX
```

> Ego Speak-In이 P1인 이유: 친밀도 단계 전환 사인음 등은 게임 내 단 1회만 발생하는 신호다. 뭉개지면 영구 손실.

---

## 12. 오디오 에셋 명세 (Asset Specifications)

### 12-1. 파일 포맷

| 카테고리 | 포맷 | 비트레이트 | 샘플레이트 |
|:---|:---|:---|:---|
| SFX (짧은 타격음) | OGG (폴백 MP3) | 96 kbps (히트는 128) | 44.1 kHz |
| SFX (긴 앰비언트) | OGG (폴백 MP3) | 128 kbps | 44.1 kHz |
| BGM (루프) | OGG (폴백 MP3) | 160 kbps | 44.1 kHz |
| BGM (스트리밍) | OGG | 128 kbps | 44.1 kHz |
| 마스터 보존 | WAV | 무손실 | 44.1 kHz |

### 12-2. 네이밍 컨벤션 (영문 strict)

규칙: `[category]_[context]_[name]_[variant].[ext]`

> **영문 strict.** 한국어 또는 한자 파일명 금지 (Tauri 빌드 / Windows + macOS 경로 안정성).

| 파일명 예시 | 설명 |
|:---|:---|
| `sfx_combat_rustborn_whoosh_01.ogg` | Rustborn 슬래시 1번 |
| `sfx_combat_rustborn_impact_01.ogg` | Rustborn 임팩트 1타 |
| `sfx_combat_rustborn_finisher_01.ogg` | Rustborn 3타 피니셔 |
| `sfx_player_footstep_metal_01.ogg` | 에르다 발소리 금속 1번 |
| `sfx_player_dash_01.ogg` | 에르다 대시 |
| `sfx_ego_speakin_t0_01.ogg` | 검 Ego Speak-In 친밀도 0 |
| `sfx_ego_speakin_t3_01.ogg` | 검 Ego Speak-In 친밀도 3 |
| `sfx_ego_awaken_01.ogg` | Rustborn 각성음 |
| `sfx_iw_entry_fade_stratum1.ogg` | 아이템계 Stratum 1 페이드 진입 |
| `sfx_iw_trapdoor_activate.ogg` | Trapdoor 활성 |
| `sfx_iw_trapdoor_descent_loop.ogg` | Trapdoor 낙하 시퀀스 |
| `sfx_shadow_recall_stabilize.ogg` | Forgotten → Recalled 안정화 |
| `sfx_iw_plaza_bell_01.ogg` | Plaza 메모리얼 종 |
| `sfx_iw_plaza_chirp_01.ogg` | Plaza 시안 데이터 단자 chirp |
| `sfx_iw_memorial_pageturn_01.ogg` | Memorial 페이지 넘김 |
| `sfx_iw_memorial_corepulse.ogg` | Memorial 메모리 코어 펄스 (Recalled 장착 시) |
| `sfx_iw_sanctum_seal_enter.ogg` | Inner Sanctum 봉인음 (보스 진입) |
| `sfx_iw_corepulse_forge_01.ogg` | Core Memory 펄스 (Forge 기질) |
| `sfx_iw_corepulse_iron_01.ogg` | Core Memory 펄스 (Iron 기질) |
| `sfx_iw_corepulse_rust_01.ogg` | Core Memory 펄스 (Rust 기질) |
| `sfx_iw_corepulse_spark_01.ogg` | Core Memory 펄스 (Spark 기질) |
| `sfx_iw_corepulse_shadow_01.ogg` | Core Memory 펄스 (Shadow 기질) |
| `sfx_drop_legendary_01.ogg` | Legendary 드랍 |
| `sfx_ui_menu_open_01.ogg` | 메뉴 열기 |
| `mus_explore_tier3_calm_loop.ogg` | Tier 3 탐험 BGM 루프 |
| `mus_combat_tier3_intense_loop.ogg` | Tier 3 전투 BGM 루프 |
| `mus_savepoint_forge_loop.ogg` | 세이브 포인트 대장간 |
| `amb_world_shaft_tier3_bed.ogg` | Tier 3 환경 베드 |
| `amb_iw_plaza_bed.ogg` | 그림자 마을 Plaza 환경 베드 (기질 비특화 공통) |
| `amb_iw_memorial_bed.ogg` | Memorial(Old Well) 환경 베드 (기질 비특화 공통, Spark 톤) |
| `amb_iw_sanctum_bed.ogg` | Inner Sanctum 환경 베드 (보스 진입 직전) |
| `amb_iw_lane_rust_bed.ogg` | Rust Alley Lane 환경 베드 (Rustborn dominant, P0) |
| `amb_iw_lane_forge_bed.ogg` | Forge Quarter Lane 환경 베드 (P2) |
| `amb_iw_lane_iron_bed.ogg` | Iron Lane 환경 베드 (P2) |
| `amb_iw_lane_spark_bed.ogg` | Spark Court Lane 환경 베드 (P2) |
| `amb_iw_lane_shadow_bed.ogg` | Shadow Den Lane 환경 베드 (P2) |
| `mus_iw_lane_rust_loop.ogg` | Rust Lane BGM 루프 (낮은 첼로 드론, P0) |
| `mus_iw_sanctum_boss_loop.ogg` | 공통 보스 BGM (Sanctum, 5기질 변주 X, §3-4 영구 룰) |
| `mus_iw_sanctum_boss_layer_phase2.ogg` | 보스 BGM HP 50% 페이즈 2 강화 레이어 (옵션) |

### 12-3. 에셋 수 예산

**Phase 2 알파 P0 게이트 (AUD-01~10, AUD-23):**

| 카테고리 | 에셋 수 | 예상 크기 |
|:---|:---|:---|
| 월드 환경 베드 (Tier 2 / Tier 3) | 2 | 2 MB |
| 그림자 마을 4공간 베드 (Plaza / Memorial / Sanctum 공통 + Rust Lane) | 4 | 4 MB |
| 발소리 (재질 3종 x 2변형) | 6 | 0.4 MB |
| Rustborn 히트 (슬래시 / 임팩트 1–3 / 피니셔 / 피격반응) | 8 | 0.5 MB |
| Ego 사인음 (각성 / Speak-In 친밀도 4단계 / Speak-Out / 타이핑 SFX 4–6변주) | 11 | 0.4 MB |
| 진입 페이드 (Stratum 1) + Trapdoor 시퀀스 (Stratum N→N+1) | 6 | 0.6 MB |
| 메모리 코어 펄스 5색 기질 | 5 | 0.3 MB |
| BGM (세이브 / Tier 3 탐험 / Tier 3 전투 / Rust Lane / 보스 공통) | 5 | 8 MB |
| Plaza/Memorial 거리 이벤트 (메모리얼 종 / 시안 chirp / 페이지 넘김) | 3 | 0.2 MB |
| **P0 합계** | **50** | **~16 MB** |

**Phase 2 알파 누적 (P0+P1):** ~75개, ~22 MB
**Phase 3 베타 풀 타깃:** ~220개, ~70 MB (스트리밍 포함, Lane 4종 추가 + 무기 6종 SFX + 원소 레이어 + 보스 텔레그래프 등)

> **로드 예산:** 초기 로드 ≤ 15 MB (P0 SFX + 첫 BGM). 추가 스트리밍 ≤ 45 MB.

---

## 13. 오디오 아키텍처 (Audio Architecture)

### 13-1. 현재 구현 상태 (2026-05-04)

- **SSoT:** `game/src/audio/Sfx.ts` (199 line)
- **방식:** WebAudio API 직접 사용. `OscillatorNode` + `GainNode` + `BiquadFilterNode` + 노이즈 버퍼 합성
- **외부 라이브러리:** `@pixi/sound` v6.0.1 미통합 (DEC-040 마이그레이션 대상). `package.json` 의존성 추가 필요. Howler.js는 폐기 — 재도입 금지
- **AudioContext 정책:** Lazy 초기화. 첫 user gesture(`pointerdown`/`keydown`) 시 1회 resume. SSR/vitest 가드 포함
- **마스터 게인:** 0.35 단일
- **존재 큐:** `upgrade` / `milestone100` / `capture` 3종 (§구현 현황 표 참조)
- **호출처:** `WorldScene.ts` 2곳, `ItemWorldScene.ts` 3곳

### 13-2. @pixi/sound 마이그레이션 계획 (DEC-040)

**Phase 2 P0 작업으로 격상.** 모든 신규 P0 에셋(AUD-01~10)은 `@pixi/sound` 인프라가 선행되어야 도입 가능하다.

```
[마이그레이션 순서 — DEC-040 §다음 액션]

1. npm install @pixi/sound (game/ 디렉토리)
   - PixiJS v8 호환. PIXI.Assets 와 자산 파이프라인 일원화

2. game/src/audio/AudioBus.ts 신설
   - master / bgm / ambient / sfx / voice 5채널 라우팅
   - LUFS 타깃별 게인 트림 적용
   - 채널별 mute/solo (디버그용)
   - @pixi/sound 의 Reverb / EQ / Stereo 필터 활용

3. Sfx.ts 파사드 유지 (DEC-040 §보존)
   - SFX.play(name) 시그니처 무수정
   - SFX.fireMilestone100Once() 시그니처 무수정
   - 내부 구현: WebAudio synth → @pixi/sound 인스턴스 풀
   - 합성 큐(upgrade/milestone100/capture)는 OGG 에셋으로 대체

4. game/src/audio/AmbientLayer.ts 신설
   - Layer A/B/C 3레이어 매니저
   - 크로스페이드 2-3초
   - RoomNode.role 기반 베드 자동 전환

5. game/src/audio/MusicConductor.ts 신설
   - 탐험/전투 2레이어 크로스페이드
   - 보스 페이즈 BGM 단계 추가
   - 침묵 트리거 6종 (§3-5)

6. game/src/audio/EgoSting.ts 신설
   - 검 Ego Speak-In / Speak-Out 사인음
   - 타이핑 SFX 라운드 로빈 풀 (4–6 변주)
   - 친밀도 단계별 EQ/Reverb 후처리

7. 아이템계 진입 페이드 시퀀스 (1.5초) 코드 구현
   - Stratum 1: §6-1 4-Phase
   - Trapdoor: §6-2 6-Phase

8. 호출처 5곳 무수정 검증 (회귀 테스트)
   - WorldScene.ts:626, 1005
   - ItemWorldScene.ts:1620, 3377, 3451
```

> **호환성 약속(DEC-040 §보존):** `SFX.play('upgrade' | 'milestone100' | 'capture')` 호출처 5곳은 마이그레이션 후에도 무수정 동작해야 한다 (회귀 테스트 필수).

### 13-2-1. 자산 제작 파이프라인 (DEC-040 §결정 4)

| 카테고리 | 1차 도구 | 비고 |
|:---|:---|:---|
| SFX (전체) | ElevenLabs Sound Effects (2024) | 프롬프트 기반 생성. 라이선스 약관 검토 후 채택 |
| BGM | ElevenLabs Music (2025) | 외주 작곡 0 (Phase 1~2) |
| 검 Ego 보이스 | Phase 1~2 = 타이핑 SFX. Phase 3 베타 = 정식 캐스팅 검토 (ElevenLabs Voice 또는 인간 외주) | 동일 플랫폼 통합 가능 |
| 핵심 트랙 (타이틀/아이템계 진입 테마) | Phase 1~2 AI. 베타 시장 신호 후 인간 외주 교체 검토 | DEC-040 후속 결정 미정 |

**금지:** Suno/Udio 등 학습 데이터 분쟁 진행 중인 플랫폼 사용 금지. 라이선스 안정성 우선.

> **데모 테스트 작업 시트:** `Documents/Plan/Plan_Audio_Demo_AIGenerated_Assets.md` 가 *복붙 가능한 절차 SSoT*. 본 시스템 문서는 *디렉션*, Plan 문서는 *작업 절차* — 책임 분리. Victor 가 직접 ElevenLabs 에서 자산 생성 시 해당 Plan 문서의 §3 프롬프트 시트 + §4 큐레이션 가이드 + §5 변환 명령어를 따른다.

### 13-3. 오디오 레이어 구조

```
L1: BGM (탐험/전투 2레이어, 크로스페이드)            ← MusicConductor
L2: 앰비언트 루프 (베드/거리이벤트/근접트리거 3레이어) ← AmbientLayer
L3: 검 Ego 사인음 (각성/Speak-In/Speak-Out)         ← EgoSting
L4: 에르다 이동 SFX (발소리, 점프, 착지, 대시)        ← AudioBus.sfx
L5: 에코 상태 SFX (허밍, 스캔, 인챈트)              ← AudioBus.sfx
L6: 전투 SFX (슬래시, 임팩트, 피격반응)              ← AudioBus.sfx
L7: 게임플레이 SFX (회상, 스탯게이트, 드랍)          ← AudioBus.sfx
L8: UI SFX (메뉴, 커서, 장착)                       ← AudioBus.sfx
```

### 13-4. 오디오 스프라이트 번들

HTTP 요청 최소화를 위한 카테고리별 번들. `@pixi/sound` 의 `sprites` / `addSprites` API 활용.

| 번들 | 포함 SFX | 예상 크기 | 로드 타이밍 |
|:---|:---|:---|:---|
| `sfx_combat_rustborn.ogg` | Rustborn 슬래시/임팩트/피니셔 | 1 MB | 게임 시작 |
| `sfx_world_movement.ogg` | 발소리(재질 6종 x 2변형), 점프, 착지, 대시 | 1 MB | 게임 시작 |
| `sfx_ui.ogg` | 메뉴 조작, 장착, 레벨업, 드랍 | 0.5 MB | 게임 시작 |
| `sfx_ego_sting.ogg` | Ego 각성 / Speak-In 4단계 / Speak-Out | 0.3 MB | Rustborn 첫 획득 직전 |
| `sfx_iw_entry.ogg` | Stratum 1 페이드 + Trapdoor 시퀀스 전체 | 1.2 MB | 첫 아이템계 진입 직전 |
| `sfx_shadow.ogg` | Forgotten 떨림, Recall 안정화, Core Memory 5기질 | 0.8 MB | 첫 아이템계 진입 직전 |
| `sfx_combat_weapons_extra.ogg` | 6종 추가 무기 SFX | 1.5 MB | Phase 2 후반 |

### 13-5. 동시 재생 풀

Phase 3 4인 파티 진입 전까지는 솔로 기준. 멀티 진입 시 풀 크기 재산정.

| 카테고리 | 솔로 풀 | Phase 3 멀티 풀 |
|:---|:---:|:---:|
| 무기 임팩트 | 4 | 8 |
| 무기 슬래시 | 4 | 8 |
| 피격 반응 | 4 | 8 |
| 환경 SFX | 4 | 4 |
| 앰비언트 루프 | 3 | 3 |
| BGM | 2 | 2 |
| Ego Speak-In | 1 | 1 (호스트만) |

---

## 14. 예외 처리 (Edge Cases)

| 상황 | 처리 방침 |
|:---|:---|
| Web Audio 레이턴시 (30–100ms) | `AudioContext` 초기화 시 `baseLatency + outputLatency` 측정 후 SFX 트리거 오프셋 보정. AudioContext pre-warming 으로 콜드 스타트 제거 |
| 백그라운드 탭 오디오 정지 | `@pixi/sound` `pauseAll()` + `visibilitychange` 처리. 재포커스 시 첫 SFX 지연 허용 범위 내 |
| 4인 파티 동시 히트 SFX 충돌 (Phase 3+) | `@pixi/sound` 인스턴스 풀로 동시 재생 관리. 과부하 시 낮은 우선순위(L8 UI)부터 탈락 |
| 장시간 세션 메모리 릭 | `@pixi/sound` 채택 사유. 야리코미 RPG는 6시간+ 세션이 본질이므로 사운드 인스턴스 unload/release 동작이 정확해야 함. Howler 폐기 사유 |
| BGM 루프포인트 불연속 | 모든 BGM 에셋 제작 단계에서 루프포인트 음악적 처리(멜로디 종지 후 루프) 검수 의무 |
| 탐험/전투 BGM 2레이어 동기화 실패 | 두 트랙은 정확히 같은 BPM, 마디 수, 루프포인트. 에셋 납품 검수 기준 |
| Stratum 1 페이드 중 접속 끊김 | 재진입 시 현재 씬 환경 베드로 리셋. 진입 SFX 재실행 없음 |
| Trapdoor 시퀀스 중 접속 끊김 | 재진입 시 다음 Stratum Plaza 환경 베드로 즉시 시작. 폴 다운 시퀀스 재생 없음 |
| 검 Ego 발화 중 텍스트 스킵 | Speak-In은 끝까지 재생. Speak-Out은 즉시 페이드아웃 |
| 친밀도 단계 전환 동시 발생 (멀티 트리거) | 하나의 단계 전환 사인음만 재생. 나머지는 큐잉 후 1초 후 발생 |
| Tauri PC 빌드 오디오 경로 | OGG/MP3 모두 상대 경로로만 참조. 절대 경로·외부 도메인 금지 |

---

## 15. 변경 이력 (Changelog)

| 일자 | 변경 |
|:---|:---|
| 2026-05-04 (개정 3) | **자체 정합성 결정 3건 반영** (도메인 권한 위임 후 자체 분석): (1) Rustborn = 주색 Rust + 부색 Forge 명시. Lane Rust 베드에 90초+ 간헐 단조 잔재(−14dB) 1줄 추가 — 청각 단조로움 회피는 기질 차원 X, 공간/이벤트 변주 차원 O. (2) Plaza 메모리얼 종(무라카미·청동 저주파) vs 시안 chirp(BLAME!·고주파) 영구 분리 운반 룰 — 통합 시 *부드러움* 비타깃 신호 위험. (3) Plaza/Memorial/Sanctum/보스 BGM 5색 기질 변주 영구 도입 금지 — 1차 niche 반복적 동일성 보존 + 자산 풀 45건→25건 영구 압축 |
| 2026-05-04 (개정 2) | **세계관 중심 재설계.** 디스가이아 풍 일반 판타지 10테마(T-HOME 등) 폐기. SSoT를 **District 매퍼 4공간(Plaza/Lane/Memorial/Sanctum) + DEC-036 5색 기질(Forge/Iron/Rust/Spark/Shadow)** 매트릭스로 재정의. BLAME!(자동화 보존소) + 무라카미(그림자 마을) 이중 메타포 톤 일관 — *유령 청각* 원칙. Plaza = 메모리얼 종 우물, Memorial = 사서·보존소 큐레이터, Sanctum = 키퍼 봉인. Rustborn = Rust 기질로 1차 다이브 음향 정체성 확정. 자산 매트릭스 (공간 4 × 기질 5) 1차 12건 압축. 파일명 컨벤션 District 기반으로 재작성 |
| 2026-05-04 (개정 1) | 환경/분위기 중심 톤으로 전면 재구성. DEC-033/036/038/039/040 정렬. 이노센트 → 기억 단편/그림자. Stratum 1 = 무음 페이드(DEC-040), Trapdoor = 디제틱 SFX + 무음 게이트. 검 Ego 사인음 §4 신설(타이핑 SFX, DEC-040). 코드 실측(Sfx.ts WebAudio synth 3큐) 반영. @pixi/sound v6.0.1 마이그레이션 계획 §13-2. 자산 = ElevenLabs AI 100% (DEC-040). 영문 strict 네이밍 |
| 2026-04-15 | 초안 작성 |
