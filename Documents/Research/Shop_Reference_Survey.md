# 상점(Shop) 레퍼런스 전수 조사 — ECHORIS 상점 품목 선정용

> 조사일: 2026-05-31
> 목적: 타 게임 상점을 4개 장르 클러스터로 병렬 전수 조사하여, ECHORIS 세이브 포인트 통합 상점에 **무엇을 팔지** 선정하기 위한 근거 문서.
> 방법: 4 에이전트 병렬 웹 조사 (메트로베니아 / 로그라이트 / 루트 ARPG / 상점 설계 이론).

---

## 0. ECHORIS 제약 (선정이 반드시 지켜야 할 것)

`Design_Economy_FaucetSink.md` 기준.

| 제약 | 내용 | 함의 |
| :--- | :--- | :--- |
| **단일 화폐 HL** | 홀로우 링 = "기억의 화폐". 범용 통화 | 인플레이션 위험 — 강한 Sink 다수 필요 |
| **거래소 없음** | 플레이어 간 HL 유통 없음 | Sink가 NPC 경로에만 집중 → Sink 단가 높게 |
| **D3 RMAH 실패 교훈** | 구매로 다 살 수 있으면 파밍 동기 붕괴 | **상점이 파밍·강화를 대체하면 안 됨** |
| **강화 = 아이템계/복종** | 기억 단편 복종이 업그레이드 locus | 상점은 *보완*만, BIS(최강 장비) 판매 금지 |
| **에르다 = 대장장이** | HL = "기억을 고치는 비용" | 수리·복종 프레임이 서사 통합 |
| **기준값** | Normal 무기 ≈ 500 HL, Mr. Gency Exit(탈출권) = 200 HL | 가격 앵커 |

---

## 1. 클러스터별 핵심 (4 병렬 조사 distill)

### 1-A. 메트로베니아 (Hollow Knight / SotN / Bloodstained / Blasphemous / Ori / Guacamelee / Axiom Verge)

| 거의 항상 판다 | 거의 안 판다 |
| :--- | :--- |
| 맵 / 소모품 / **장착 패시브 모디파이어**(charm·shard·rosary·accessory) | **이동 능력**(대시·이단점프·벽타기) — 월드 배치, 판매 금지 |

- 단일 소프트 화폐(Geo/Gold/Light), 전투+탐험 드랍.
- **재고 고정 + 진행 해금**(RNG 없음) — 플레이어가 체크리스트로 취급, 완주 목표.
- **단조/forge는 구매 상인과 분리된 별도 NPC**(Bloodstained: Dominique 구매 ↔ Johannes 단조 / Dawn: Hammer ↔ Yoko). forge는 *소재·소울* 소비.
- "전 품목 구매 = 완주 보상"(Salubra's Blessing) = 야리코미 훅.
- Axiom Verge = 상점 0 (반례 — 전부 탐험 보상).

### 1-B. 로그라이트 (Hades / Dead Cells / Spelunky / StS / RoR2 / Isaac / Gungeon)

- **2단 화폐가 거의 보편**: in-run 소모성(죽으면 소멸, 즉시 빌드) + **영속 meta 화폐**(영구 해금).
- in-run 상점은 절차적·소량(3슬롯)·RNG. meta 상점은 허브 고정.
- **변형/제거/리롤 서비스가 구매보다 중요할 때가 많다** (StS 카드 제거, RoR2 3D프린터/Scrapper, Isaac 재고 리롤) — *빌드 방향 통제권*.
- 리스크/리워드가 상점에 내장(Spelunky 훔치기, Gungeon 저주 할인, Isaac 악마방 HP거래).
- meta 상점은 *파워가 아니라 가능성 공간(드랍풀)* 을 넓힘.

### 1-C. 루트 ARPG (D2/D3/D4 / PoE / Grim Dawn / Torchlight / Last Epoch) — **최고 관련 클러스터**

- **상점은 드랍이 안 주는 것을 판다: 마찰 제거 + 결정성.** 감정·포탈·수리·포션·소켓·크래프팅 재료가 주력. **완성 장비는 거의 안 산다**(벤더 장비 = 초반 필러).
- **도박(gambling)은 보편적 "타깃 파밍 + 화폐 Sink"** (Gheed→Kadala→Purveyor→Duros→Soul Gambler). 펀저블 화폐로 *특정 슬롯* 굴림.
- **상한(capped) 2차 화폐가 도박을 *압박*으로** 만듦 (D3 Blood Shard, D4 Obol = 못 쟁임 → 주기적 소비).
- 현대 ARPG는 "장비 구매" → **"찾은 장비 개선"**(리롤·임프린트·소켓)으로 이동. 단 ECHORIS는 *개선이 아이템계*이므로 상점은 그걸 하면 안 됨.
- **분해/salvage가 루프를 닫음** — 안 쓰는 드랍 → 크래프팅 화폐 (모든 드랍에 가치).

### 1-D. 상점 설계 이론 (GDC / Game Developer / 경제 이론)

- **품목 분류**: 소모품 / 장비 / 영구 업그레이드 / 크래프팅·환전 / 도박 / 접근·키 / **서비스(감정·수리·리롤·분해·리스펙·확장)** / 코스메틱 / 로어.
- **소모품 + 서비스가 경제의 등뼈** — 루트 루프와 함께 수요가 *증가*(경쟁 안 함). 장비는 드랍과 *경쟁*하면 죽음.
- **상점 = 화폐 파괴 장치(Sink)**. 단일 화폐는 위험 → 상한·수리 upkeep·lossy 환전·거래 제거로 방어.
- **RNG 재고 안정화**: 재입고당 고정 레어리티 슬롯("커먼5 매직2 레어2 레전드1") + 선주문 + 인원수 스케일.
- **반(反)패턴**: 드랍이 벤더를 무력화 / "바가지" 체감 / BIS가 벤더에서 나옴(벤더 낚시) / 너무 싸서 Sink 0 / 너무 비싸 죽은 상점 / 돌아올 이유 없음.

---

## 2. 교차 합의 (4 클러스터 공통 결론)

1. **상점은 BIS를 팔지 않는다.** 최강 장비·강화는 드롭/아이템계 몫. (ECHORIS D3 교훈과 일치)
2. **소모품 + 서비스가 핵심** — 루트 루프와 함께 수요 증가.
3. **이동 능력(렐릭)은 절대 판매 금지** — 월드 배치 유지(스탯/능력 게이트 보존).
4. **도박 = 타깃 파밍 Sink** — 거의 모든 루트 게임이 보유. *상한 2차 화폐* 가 정석.
5. **분해/salvage로 루프 닫기** — 모든 드랍에 가치.
6. **"전 품목 구매" 완주 목표** + **주기 한정 특가** = 돌아올 이유.
7. forge(강화)와 구매 상인 **분리** — ECHORIS는 이미 복종(forge)과 상점이 개념 분리.

---

## 3. ECHORIS 상점 — 권장 품목 (선정 후보)

> 등급: ✅ 권장(루프 보강·교훈 부합) / 🟡 검토(설계 결정 필요) / ⛔ 금지(파밍 대체·게이트 훼손).
>
> **정정(HK 전수 후, 부록 A):** "상점은 영구 파워를 안 판다"는 과한 단정이었다. Hollow Knight는 *비-이동* 영구 강화(Mask Shard 체력·Vessel Fragment 소울·Charm Notch·못 업글)를 정상 판매한다. **금지선은 (1) 이동/게이트 능력(렐릭), (2) BIS·affix 강화(아이템계 locus) 두 가지뿐.** 비-이동 영구 강화(슬롯·체력류)는 판매 가능.

### ✅ 권장 — 소모품 (경제 등뼈, HL 주 Sink)

| 품목 | 근거 | 화폐 |
| :--- | :--- | :--- |
| 회복 플라스크 충전/업글 | 다이브 준비, 무한 재수요 | HL |
| Mr. Gency Exit (탈출권) — *이미 200 HL 존재* | 긴급 탈출, 리스크-리턴 | HL |
| 버프 소모품(원소 저항·일시 ATK 등) | 다이브 대비 자발 Sink | HL |
| 던지기용 컨테이너(MagmaCrucible·OilDrum 등) | 조성 시스템·화학 연동, 일회용 | HL |

### ✅ 권장 — 서비스 (루트와 함께 수요 증가, 최강 Sink)

| 서비스 | 근거 | 화폐 |
| :--- | :--- | :--- |
| **장비 수리** | 에르다=대장장이 프레임, upkeep Sink | HL |
| **분해(Dismantle/Salvage)** | 드랍 → 기억 단편/Remnant Fragment 회수, 루프 닫기 | — (산출) |
| **감정(Identify)** | *아이템이 미감정 드롭일 경우만* — 도입 여부는 §4 결정 | HL |

### 🟡 검토 — 도박 (타깃 파밍 Sink, 강력하나 결정 필요)

| 품목 | 근거 | 쟁점 |
| :--- | :--- | :--- |
| **미감정 base 장비 굴림** (Kadala/Purveyor식) | 다이브할 *base*를 슬롯 타깃 획득. 강화는 여전히 아이템계 | 단일 HL이면 인플레 가속 → **상한 2차 화폐** 검토(§4) |

> 핵심: 도박이 주는 건 *base 장비*(강화 전)뿐. 최종 강화는 아이템계 → 파밍 대체 안 함.

### 🟡 검토 — 정적 커스터마이즈 / 접근

| 품목 | 근거 | 쟁점 |
| :--- | :--- | :--- |
| 소켓/젬(정적 스탯) | 아이템계 affix와 *겹치지 않는* 커스터마이즈 | 시스템 신설 필요 |
| 아이템계 진입·맵 데이터·워프 | SotN Library Card식 접근권 Sink | 핵심 진행 paywall 주의 |
| 코스메틱/도색 | 비인플레 Sink(파워 0), 완주용 | 우선순위 낮음 |
| Normal/Magic/Rare 장비 floor — *이미 Normal 500 HL* | 불운 방지 baseline (BIS 아님) | 드랍 ceiling 아래로 엄격 제한 |

### ⛔ 금지

| 품목 | 이유 |
| :--- | :--- |
| **최강(Legendary/Ancient) 장비 직판** | D3 RMAH 교훈 — 파밍 붕괴 |
| **이동 능력(렐릭: 대시·이단점프·벽타기)** | 능력 게이트 훼손 (메트로베니아 원칙) |
| **affix 리롤/강화 자체** | 아이템계·복종의 locus 침범 (벤더 낚시) |
| **거래소/플레이어 거래** | 이미 설계상 배제 |

---

## 4. 선정 전 결정해야 할 것 (Open Questions)

1. **단일 HL vs 2차 화폐** — 도박 Sink를 단일 HL로 둘지(인플레 위험), 아이템계 전용 *상한* 2차 화폐(D4 Obol식)를 도입할지. 거래소 없음 + 단일 Sink 집중을 감안하면 2차 화폐가 인플레 방어에 유리하나 복잡도↑.
2. **감정(Identify) 시스템 유무** — 아이템이 미감정 드롭인가? 아니면 즉시 식별(D3/D4 현대식)? 감정 도입 시 상점 Sink 1개 추가.
3. **도박 도입 여부** — 타깃 파밍 가치 vs 단순성. 도입 시 §4-1과 묶임.
4. **forge(복종)와 상점 NPC 분리 정도** — 같은 세이브 포인트지만 *구매/판매* 와 *복종/분해* 의 동사 분리 강도.

---

## 5. 한 줄 결론

> ECHORIS 상점은 **"소모품 + 수리·분해 서비스 + (선택)타깃 도박 + 장비 floor"** 를 팔고, **최강 장비·강화·이동 능력은 팔지 않는다.** 강화는 아이템계, 능력은 월드 배치 — 상점은 *다이브를 준비시키고 잉여 HL을 태우는 보완 레이어*다.

---

## 부록 — 출처 (병렬 4 조사 종합)

메트로베니아: Hollow Knight/SotN/Bloodstained/Blasphemous/Ori/Guacamelee/Axiom Verge wiki·가이드. 로그라이트: Hades/Dead Cells/Spelunky/Slay the Spire/RoR2/Isaac/Gungeon wiki. 루트 ARPG: Diablo II~IV(Maxroll/Wowhead/DiabloWiki)·PoE(poewiki)·Grim Dawn·Torchlight·Last Epoch(Icy Veins). 이론: gamedeveloper.com(Preferential Treatment / Game Economy Design), GDKeys, Machinations.io, GDC Vault(Clever Sink Design), Wikipedia(Gold sink). (각 에이전트 보고서에 URL 전체 수록.)

---

# 부록 A — 핵심 레퍼런스 전 품목 전수 (위키 직접 크롤링)

## A-1. Hollow Knight — 상인 12종 (fextralife 전 페이지 크롤링)

**판매(SELLS):**
- **Sly** (종합): Gathering Swarm 300 / Stalwart Shell 200 / Lumafly Lantern 1800 / Simple Key 950 / Rancid Egg 60 / Mask Shard 150·500·(800·1500*) / Vessel Fragment 550·(900*) / Sprintmaster 400 / Heavy Blow 350 / Elegant Key 800*. (* = Shopkeeper's Key 이후)
- **Salubra** (부적·노치): Lifeblood Heart 250 / Longnail 300 / Steady Body 120 / Shaman Stone 220 / Quick Focus 800 / Notch 120(5)·500(10)·900(18)·1400(25) / Salubra's Blessing 800(부적 40종 완주).
- **Iselda** (맵·핀): 지역 맵 13종 40-200 / Wayward Compass 220 / Quill 120 / 핀·마커 100-180.
- **Leg Eater** (Fragile 부적): Fragile Heart 350 / Greed 250 / Strength 600 + 수리(200·150·350), Defender's Crest 시 −20%.

**서비스:** Nailsmith 못 업글 250+0 / 800+1 / 2000+2 / **Pure 4000+3 Pale Ore** · Little Fool 시련 100·450·800 · The Last Stag 이동 **무료** · Tuk Rancid Egg(가격 미표기, 80개 cap).
**매입(BUYS):** Relic Seeker Lemm — Wanderer's Journal 200 / Hallownest Seal 450 / King's Idol 800 / Arcane Egg 1200.
**거래/은행:** Confessor Jiji(에그→Shade 소환) · Steel Soul Jinn(에그 매입) · Millibelle(예치).

## A-2. Castlevania: SotN — Master Librarian (단일 상인 전 품목)

> 단일 NPC가 구매+매입+서비스 전부 탭으로 운용. Library Card로 어디서든 워프 호출.

**소모품:** Potion 800 / High Potion 2000 / Elixir 8000 / Manna Prism 4000 / Antivenom 200 / Uncurse 200 / Meal Ticket 2000.
**무기:** Magic Missile·Bwaka Knife 300 / Boomerang 500 / Fire Boomerang 1000 / Javelin 800 / Shuriken 2400 / Cross Shuriken 5000 / Buffalo Star 8000 / Flame Star 15000 / Sabre 1500 / Mace 2000 / Damascus Sword 4000 / Firebrand·Icebrand·Thunderbrand 10000.
**방어구:** Leather Shield 400 / Iron Shield 3980 / Velvet Hat 400 / Leather Hat 1000 / Iron Cuirass 1500 / Steel Cuirass 4000 / Diamond Plate 12000.
**망토:** Reverse Cloak 2000 / Elven Cloak 3000 / Joseph's Cloak 30000.
**액세서리:** Medal 3000(+1 ATT/DEF) / Circlet 4000 / Ring of Pales 4000 / Gauntlet 8000(+5 ATT) / Silver Crown 12000(+12 INT) / Harper 12000.
**특수:** **Jewel of Open 500**(블루 도어) / **Library Card 500**(상점 워프) / Magic Scroll 500 / Map of Castle 103 / Hammer 200 / **Duplicator 500,000**(아이템 복제).
**매입(Sell Gem):** Zircon 150 / Aquamarine 800 / Turquoise 1500 / Onyx 3000 / Garnet 5000 / Opal 8000 / Diamond 20000.
**서비스:** Boss Strategies(보스 공략 열람) 200-10000, 20종.

## A-3. Bloodstained: RotN — Dominique(구매) + Johannes(제작) 분리

> **해금 규칙:** 대부분 품목은 *Johannes가 1회 제작(또는 Dominique에 1회 판매)해야* Dominique 상점에 등장. 크래프트-언락 모델.

**Dominique 판매(Gold):**
- 소모품: Potion 100 / Ether 80.
- 재료(crafting): Alkahest 120 / Soda Water 100 / Steel 250 / Bronze 50 / Iron 100 / Flour 200 / Rice 160 / Egg 100 / Dragon Egg 500 / 조미료류 100 / Milk 280 / Beef 1129 / Cheese 150 등.
- 무기: Knife·Rapier·Short Sword 300 / Long Sword 500 / Nodachi 1080 / Epee 2320 / **Bunny Boots(특수) 20000**.
- 탄약: SP 20 / HP 30 / Flame·Ice·Thunder Round 50.
- 방어구·액세서리: Hairband 120 / 방어구 100-500 / Ring 80 / Thick Glasses 1980 / Moon Belt 1600 / 스카프 100-1280.
- 매각: 가능(비율 미표기 — 통상 ~1/10).

**Johannes(별도 NPC, 상점 아님):** Craft(제작) / Prepare(요리 → 최초 1회 영구 스탯) / Enhance Shard(능력 강화, 재료) / Dismantle(분해 → 재료).

### 3대 레퍼런스 교차 관찰

- **단일 NPC(SotN) vs 분리(HK·Bloodstained) 둘 다 유효.** SotN은 한 명이 탭으로 전부, HK/Bloodstained는 구매↔제작/매입을 NPC로 분리.
- **워프-투-상점 상품화**(SotN Library Card 500) — 편의를 Sink로.
- **크래프트-언락 재고**(Bloodstained) = "1회 제작하면 상시 구매" — RNG 드롭과 결정적 상점을 잇는 다리.
- **요리=최초 1회 영구 스탯**(Bloodstained Prepare) — 비-이동 영구 강화 판매의 또 다른 선례.
- **재료를 상점이 판다**(Bloodstained) — 크래프팅 경제의 바닥 보장.
- 셋 다 **잡템 매입/분해 Sink** 보유(Lemm gem-sell / SotN Sell Gem / Johannes Dismantle).

---

# 부록 B — ECHORIS 세이브 포인트 상점 NPC 구성 초안

> 레퍼런스 매핑: Sly식 종합 + Salubra식 부적·노치(=비-이동 영구 강화) + Lemm식 잡템 매입 + SotN 단일-NPC 탭 운용 + Bloodstained 구매↔제작 분리. ECHORIS 제약(HL 단일·거래소 없음·강화=아이템계·에르다=대장장이·허브 폐기로 세이브포인트 통합) 반영.

## B-1. 구조 — 세이브 포인트 = 단조소 + 상점(단일 잔존자 상인, 탭)

허브가 폐기되고 대장간/상점이 세이브 포인트에 통합되므로, 솔로 메트로베니아에 맞게 **단일 잔존자 상인이 탭으로 운용**(SotN Librarian식) + **단조소는 에르다 본인의 동사로 분리**(Bloodstained Johannes식).

| 역할 | 동사 | 화폐 | 레퍼런스 |
| :--- | :--- | :--- | :--- |
| **단조소 (에르다/모루)** | 복종(강화)·레어리티 승급·합성·이식 | HL + 기억 단편 + Remnant Fragment | Bloodstained Johannes / Aria Yoko / Nailsmith(재료 병행) |
| **상점 — 구매 탭** | 소모품·장비 floor·비-이동 영구 강화·접근 | HL | Sly + SotN Librarian |
| **상점 — 매입/분해 탭** | 잡 장비·수집품 매각 / 분해 환원 | 산출(HL·재료) | Lemm gem-sell / Johannes Dismantle |
| **(선택) 도박대** | 미감정 base 장비 슬롯 굴림 | 상한 2차 화폐 권장(§4-1) | Kadala / Purveyor |

## B-2. 구매 탭 — 품목 초안 (Sly+Librarian 매핑)

| 카테고리 | 품목 | 근거 |
| :--- | :--- | :--- |
| 소모품 | 회복 플라스크 충전 / **Mr. Gency Exit 200HL(기존)** / 원소 저항·일시 버프 / 던지기 컨테이너 | Sly 소모품, 경제 등뼈 |
| 장비 floor | Normal 500HL(기존)·Magic 등 — **BIS 아님, drop ceiling 아래** | Sly·Librarian 무기/방어구 = 초반 필러 |
| 비-이동 영구 강화 | 슬롯 확장·체력/소울류 업글 (이동 능력 제외) | **HK Mask/Vessel/Notch 선례** / Bloodstained 요리 |
| 접근·편의 | 맵 데이터 / 아이템계 진입 편의 / **세이브포인트 워프(Library Card식)** | Iselda 맵 / SotN Library Card |

## B-3. 매입/분해 탭 (Lemm 매핑 — 루프 닫기)

- 안 쓰는 장비·수집품 → **HL 매입**(Lemm식).
- **분해 → 기억 단편/Remnant Fragment 환원** → 단조소 재투입(루프 닫기). 모든 드랍에 가치.

## B-4. 완주·재방문 훅

- **"전 품목 구매" 완주 보상**(Salubra's Blessing식) — 야리코미 HL Sink.
- **주기 한정 특가 1건**(Hades Wretched Broker식) — 돌아올 이유.
- 재고 **고정 + 진행 해금**(메트로베니아 정석, RNG 0) — 단, 도박대 도입 시 그 탭만 RNG.

## B-5. 미해결(§4 연동)

도박대(B-1 선택)·2차 화폐(§4-1)·감정 시스템(§4-2) 결정에 따라 구매 탭/도박대 구성이 확정된다. NPC는 단일(SotN식)로 시작하되, Phase 후반 분리(HK식) 여지 유지.
