# System_Shop.md — 상점 시스템 (세이브 포인트 NPC 상점)

## 구현 현황 (Implementation Status)

> 최근 업데이트: 2026-05-31
> 문서 상태: `작성 중 (Draft)`
> 2-Space: World (세이브 포인트)
> 기둥: 야리코미(주) / 탐험·멀티플레이(보조)

| 기능 ID | 분류 | 기능명 | 우선순위 | 구현 상태 | 비고 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| SHOP-01 | 구매 | 소모품 판매(플라스크 충전·탈출권·버프·던지기 컨테이너) | P1 | 대기 | 경제 등뼈, HL 주 Sink |
| SHOP-02 | 구매 | 장비 floor 판매(Normal/Magic — BIS 아님) | P2 | 대기 | drop ceiling 아래 엄격 제한 |
| SHOP-03 | 구매 | 비-이동 영구 강화(슬롯·체력/소울류) | P2 | 대기 | HK 선례. 이동 능력 제외 |
| SHOP-04 | 매입 | 매각 + 분해(기억 단편/Remnant 환원) | P1 | 대기 | 루프 닫기 |
| SHOP-05 | 편의 | 접근·맵 데이터·세이브포인트 워프 | P2 | 대기 | SotN Library Card식 |
| SHOP-06 | 메타 | "전 품목 구매" 완주 보상 | P3 | 대기 | Salubra's Blessing식 야리코미 훅 |
| SHOP-07 | 메타 | 주기 한정 특가 1건 | P3 | 대기 | 재방문 동기(Wretched Broker식) |
| SHOP-08 | 구매 | 도박대(미감정 base 장비 굴림) | P2 | 대기 | **단일 HL 확정(2026-05-31).** HL 단가를 throttle로 인플레 억제 |
| SHOP-09 | 시스템 | 감정(Identify) | P2 | 보류 | §결정 대기 — 미감정 드롭 여부 |
| SHOP-10 | 멀티 | 재고·가격 인원 스케일 | P3 | 대기 | Phase 3 |

> **단조소(복종·강화)는 본 문서 범위 밖.** 강화 locus는 아이템계/복종이며 SSoT는 `Design_Economy_FaucetSink.md` + 복종 시스템 문서. 상점은 단조소와 **동사가 분리**된다(구매/매각 ↔ 복종/승급).

---

## 0. 필수 참고 자료 (Mandatory References)

| 문서 | 경로 | 참조 이유 |
| :--- | :--- | :--- |
| 경제 Faucet/Sink | `Documents/Design/Design_Economy_FaucetSink.md` | HL 화폐·Sink·가격 앵커 SSoT (ECO-01) |
| 상점 레퍼런스 조사 | `Documents/Research/Shop_Reference_Survey.md` | 22게임 전수 조사 + NPC 구성 초안(부록 B) |
| 코어 루프 | `Documents/Design/Design_CoreLoop_Circulation.md` | 세이브 포인트 시설 위치 |
| 메뉴/UI | `Documents/UI/UI_Menu_System.md` | 상점 UI 패턴(Modal·탭) |
| 드롭률 | `Documents/System/System_Economy_DropRate.md` | 장비/재료 산출, drop ceiling |
| 용어집 | `Documents/Terms/Glossary.md` | HL·기억 단편·Remnant·렐릭 용어 |

---

## 1. 개요 (Concept)

### 1.1. 설계 의도 (Intent)

> **한 줄 요약:** 상점은 *다이브를 준비시키고 잉여 HL을 태우는 보완 레이어*다. 최강 장비·강화·이동 능력은 팔지 않는다.

상점이 해결하는 문제 — (1) HL의 주 Sink(거래소가 없어 NPC 경로에 Sink 집중), (2) 다이브 전 소모품·편의 공급, (3) 안 쓰는 드랍을 재료로 환원해 루프를 닫는다. **핵심 재미는 "무엇을 사느냐"가 아니라 "잉여 HL을 어디에 태워 다음 다이브를 더 깊이 갈까"** 의 선택이다.

### 1.2. 설계 근거 (Reasoning)

| 결정 | 이유 | 근거 |
| :--- | :--- | :--- |
| BIS·affix 강화 판매 금지 | 구매로 다 사면 파밍 동기 붕괴 | D3 RMAH 폐지 교훈(`Design_Economy_FaucetSink` §) |
| 이동 능력(렐릭) 판매 금지 | 능력 게이트 훼손 | 메트로베니아 정석(Shop_Reference_Survey §2) |
| 비-이동 영구 강화는 판매 허용 | 체력/슬롯류는 게이트 무관 | HK Mask/Vessel/Notch 전수 선례(부록 A-1) |
| 소모품 + 서비스 중심 | 루트 루프와 함께 수요 증가, 드랍과 경쟁 안 함 | 경제 이론(부록 1-D) |
| 재고 고정 + 진행 해금(RNG 0) | 플레이어가 체크리스트로 계획·완주 | 메트로베니아 전수(부록 A) |
| 단조소와 동사 분리 | 구매 Sink와 강화 locus 혼선 방지 | Bloodstained Dominique↔Johannes(부록 A-3) |

### 1.3. 3대 기둥 정렬 (Pillar Alignment)

| 기둥 | 상점의 기여 |
| :--- | :--- |
| **야리코미(주)** | 잉여 HL의 자발적 Sink + "전 품목 구매" 완주 훅 + 주기 한정 특가 재방문. 파밍한 HL을 태워 다음 다이브 준비 |
| **탐험(보조)** | 회복 플라스크·탈출권·맵 데이터·워프로 더 깊은 탐험을 지원. 능력/게이트는 여전히 월드 배치 |
| **멀티플레이(보조)** | 재고·가격 인원 스케일, 협동 자원 분배의 소비처(`Design_Economy` 멀티 항) |

### 1.4. 저주받은 문제 검증 (Cursed Problem Check)

> **상충 약속:** "상점에서 강해지고 싶다" ↔ "파밍/아이템계로 강해진다."
> **해결(희생):** 양립 불가. **구매측을 약화** — 상점은 *최강 장비·강화·이동 능력*을 팔지 않는다. 상점이 주는 파워는 (a) 소모품(일시), (b) 비-이동 영구 강화(게이트 무관), (c) 장비 floor(drop ceiling 아래)로 제한해, 파밍·아이템계가 진짜 파워 locus임을 보존한다.

### 1.5. 위험과 보상 (Risk & Reward)

| 플레이어 행동 | 리스크 | 리턴 |
| :--- | :--- | :--- |
| 탈출권(Mr. Gency Exit) 사용 | 진행 포기(현 지층 보상 손실) | 즉시 안전 귀환 + HL 보존 |
| 도박대 굴림(SHOP-08, 도입 시) | HL/2차 화폐 소모, 꽝 가능 | 슬롯 타깃 base 장비 획득(강화는 아이템계) |
| HL을 영구 강화에 전부 투입 | 다음 다이브 소모품 부족 | 영구 스탯·슬롯 확보 |
| 잡 장비 분해 vs 보관 | 되돌릴 수 없음 | 기억 단편/Remnant 환원 → 복종 재투입 |

---

## 2. 메커닉 (Mechanics) — 동사 중심

> 상점은 **World 세이브 포인트에서만** 작동한다. 아이템계 내부에서는 접근 불가(다이브 중 소비는 사전 구매한 소모품으로만).

- 플레이어는 세이브 포인트의 **잔존자 상인**과 상호작용해 **구매 / 매각 / 분해 / (도박)** 한다.
- 상인은 **단일 NPC가 탭으로** 운용한다(구매 / 매입·분해 / (도박)). — SotN Librarian식. Phase 후반 NPC 분리 여지.
- 상점은 **진행도·완주에 따라 재고를 해금**한다(도박 탭 제외 RNG 0).
- 분해는 장비/수집품을 **기억 단편·Remnant Fragment로 환원**해 단조소 재투입 경로를 만든다.
- "전 품목 1회 구매"를 달성하면 **완주 보상**이 해금된다(SHOP-06).
- 매 주기 **한정 특가 1건**이 갱신된다(SHOP-07).

---

## 3. 규칙 (Rules)

### 3.1. 판매 가능/금지 경계 (가장 중요)

| 판매 가능 | 판매 금지 |
| :--- | :--- |
| 소모품(플라스크 충전·탈출권·버프·던지기 컨테이너) | **이동/게이트 능력(렐릭: 대시·이단점프·벽타기 등)** |
| 장비 floor(Normal/Magic) — **drop ceiling 아래** | **최강 장비(Legendary/Ancient) 직판** |
| 비-이동 영구 강화(슬롯 확장·체력/소울류) | **affix 리롤·복종·레어리티 승급(아이템계/복종 locus)** |
| 접근·맵 데이터·워프 | **플레이어 간 거래/거래소** |

### 3.2. 재고·해금

- 재고는 **고정 + 진행/완주 해금**. 동일 품목은 항상 같은 위치(체크리스트 계획성).
- 도박대(SHOP-08) 도입 시 그 탭만 RNG. 재입고당 **고정 레어리티 슬롯**으로 안정화(부록 1-D).
- 가격은 **HL 단일 화폐**(거래소 없음 → Sink 단가 높게). 도박대 2차 화폐 여부는 §결정 대기.

### 3.3. 매각·분해

- 매각은 **lossy**(매입가 < 판매가; 비율은 파라미터). 환불 없음.
- 분해 산출(기억 단편/Remnant)은 `System_Economy_DropRate` 규칙을 따른다.

### 3.4. 완주·재방문

- SHOP-06: 전 품목 1회 구매 → 완주 보상(영구 패시브 류, 비-이동). 강력한 HL Sink.
- SHOP-07: 주기당 한정 특가 1건(상시가보다 유리, 1회 구매).

---

## 4. 데이터 & 파라미터 (Parameters)

> 본문에 하드코딩 금지. 수치 SSoT는 아래 CSV. 신설 CSV는 `Content_System_Shop.csv`(제안).

| 파라미터 | 위치 | 비고 |
| :--- | :--- | :--- |
| HL 가격 앵커 (Normal 무기 `500`, 탈출권 `200`) | `Design_Economy_FaucetSink.md` §3.2 (SSoT) | 본 문서는 참조만 |
| 품목별 판매가/매입가/해금 조건 | `Sheets/Content_System_Shop.csv` (신설 예정) | Item·Category·BuyPrice·SellPrice·UnlockCond·Tab |
| 매각 lossy 비율 | `Sheets/Content_ConstData.csv` (Shop.SellRatio) | 신설 키 |
| 도박대 슬롯 분포·가격 | `Content_System_Shop.csv` (도박 도입 시) | 고정 레어리티 슬롯 |
| 상점 UI 문자열 | `Sheets/Content_Localization.csv` | P0 로컬라이제이션 규칙 — 코드 전 등록 |

---

## 5. 예외 처리 (Edge Cases)

| 케이스 | 처리 |
| :--- | :--- |
| 아이템계 내부에서 상점 접근 시도 | 불가. 상점은 World 세이브 포인트 전용. 다이브 중 소비는 사전 구매분으로만 |
| HL 부족 | 구매 불가 표시(가격 회색). 음수 잔액 없음 |
| 분해 후 되돌리기 | 환불·복구 없음(되돌릴 수 없음 명시) |
| 도박대 꽝/중복 | 정상. 슬롯 고정 분포로 최저 보장(도입 시) |
| 멀티 동시 구매(파티) | 재고 경쟁 처리 — 인원 스케일 재고 + 동기화(Phase 3, SHOP-10) |
| 세이브 미저장 사망 후 구매 롤백 | 마지막 세이브 시점 HL로 롤백(`UI_Menu_System` 사망 규칙 정합) |

---

## 검증 체크리스트 (Verification)

- [ ] 상점이 BIS·affix 강화·이동 능력을 팔지 않는가 (3.1 경계)
- [ ] 비-이동 영구 강화만 판매 허용되는가 (HK 선례)
- [ ] HL이 단일 Sink로 작동하며 가격이 `Design_Economy` 앵커와 일치하는가
- [ ] 재고가 고정+진행 해금인가 (도박 탭 제외 RNG 0)
- [ ] 분해 산출이 단조소(복종) 재투입 경로를 닫는가
- [ ] 스파이크: 상점이 아이템계(야리코미) 경험을 강화하는가 — 잉여 HL Sink + 완주 훅으로 통과
- [ ] 저주받은 문제(구매 vs 파밍)가 구매측 약화로 해소됐는가
- [ ] 모든 UI 문자열이 `Content_Localization.csv` 에 등록됐는가
- [ ] 멀티 재고·가격 스케일이 분배 갈등·인플레를 동시 통제하는가 (Phase 3)

---

## 결정 (Decisions — Shop_Reference_Survey §4 연동)

1. **화폐 — 단일 HL 확정(2026-05-31).** 2차 화폐 도입 안 함. 도박대(SHOP-08)도 HL 사용, **HL 단가를 throttle**로 두어 인플레 억제(상한 화폐 대신 고단가). `Design_Economy_FaucetSink` 단일 HL Sink 집중 전제 유지.
2. **감정(Identify) 시스템 유무** — SHOP-09 (보류). 미감정 드롭 여부 결정 후 확정.
3. **NPC 단일(SotN식) vs 분리(HK식)** — Phase 1 단일, 후반 분리 여지.

> 상점 콘텐츠 데이터 = `Sheets/Content_System_Shop.csv` (작성됨, Phase 1 카탈로그 18행). i18n NameKey = `Content_Localization.csv` `shop.*`.
