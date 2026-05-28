# DEC-038: Item World as Town of Orphaned Shadows

> 결정일: 2026-04-29
> 상태: 확정 (Confirmed)
> 영향 범위: 아이템계 NPC/스폰/시각/대사, RoomGraph 의미 레이어, 코드(엔티티 신설), 디자인 문서, Glossary
> 선행 결정: DEC-033 (검 Ego), DEC-036 (Memory Shard), DEC-037 (Hub-and-Spoke 토폴로지)
> 선행 문서: `Documents/Design/Design_ItemWorld_Town_Shadow.md` (DES-IW-TOWN-01)

---

## 결정 사항

아이템계의 마을 의미 레이어를 **"주인을 잃은 그림자들의 거주지"** 로 확정한다. 모든 비-플레이어 엔티티는 단일 그림자 시각 언어를 공유하며, 검 Ego 단독 화자 원칙을 형이상학적으로 정당화한다.

핵심 룰 5가지:

1. **그림자 시각 통일** — 모든 비-플레이어 = 검은 실루엣 베이스. 역할별 형태/광원/움직임만 분기.
2. **3-신호 변별 룰** — 노란 눈빛 1점 = 적 (Memory Shard) / 청록 외곽선 = 인터랙티브 (대화 대상) / 외곽선 없음 = 장식 (배경 그림자).
3. **인터랙티브 그림자 2명만** — 문지기(Plaza, hub) + 사서(Memorial, shrine). 모든 무기에서 결정론적 spawn.
4. **광장 안전지대 약속** — Plaza(hub) 와 Memorial(shrine) 룸은 적 spawn 0. RoomNode.role 분기 invariant.
5. **검 Ego 단독 화자 유지** — 거주자 dialogue 0줄. 검 Ego(Rustborn) 가 거주자에 대해 회상.

---

## 폐기 / 도입

| 구분 | 폐기 | 도입 |
|:---|:---|:---|
| Plaza 거주자 | 인간형 NPC 다수 (활기찬 마을) | 그림자 2 인터랙티브 + 3~5 배경 (텅빈 마을) |
| Resident (영감/Caretaker) | 무기별 고유 NPC | 제거 확정 (재도입 금지) |
| 화자 다중화 | 거주자 dialogue 1줄씩 검토안 | 거주자 dialogue 0줄. 검 Ego 단독 |
| Memory Shard 시각 | 노란 큐브 #ffdd44 | 검은 그림자 + 노란 눈빛 1점 |
| 보스 시각 | 일반 인간형 | 거대 일그러진 그림자 (Memory Shard 확장형) |
| Plaza/Memorial 적 spawn | 룸 종류 무관 균등 spawn | hub/shrine 룸 적 spawn 0 |

---

## 결정 근거

1. **스파이크 봉합** — "아이템에 들어가면, 그 안에 살아있는 세계가 있다" (DEC-033) 의 "살아있는 세계" 가 형이상학적으로 정합. 그림자는 떠난 자의 잔재이므로 무기 안에 거주하는 것이 자연스럽다.

2. **검 Ego 단독 화자 정당화** — DES-IW-ONB-01 의 "에르다 0줄 + 검 Ego 단독 화자" 원칙이 형이상학적으로 정당화된다. 거주자(그림자) 는 보통 말하지 못하지만 검 Ego 는 자아를 보존한 유일한 그림자이므로 말한다.

3. **DEC-036 자연 봉합** — Memory Shard 의 Forgotten/Recalled 가 시각적으로 자명해진다. 노란 눈빛 = 잊혀진 그림자. 격파/회상 = 빛 회복. 사서가 슬롯 장착 시 두개골 idle 동기화로 무라카미 도서관 일과 재현.

4. **DEC-037 토폴로지 1:1 정합** — RoomGraph 의 hub(Plaza) + branch(Lane) + shrine(Memorial) + boss(Sanctum) 가 무라카미 마을 형이상학과 일치. 그래프 구조 무수정.

5. **1인 개발 부담 절감** — 모든 비-플레이어가 검은 실루엣 단일 시각 언어. 스프라이트 변주는 청록 외곽 / 노란 눈빛 / 크기 / 광원 4가지 신호로만.

6. **레퍼런스 정합** — 무라카미 『세계의 끝과 하드보일드 원더랜드』 (1985) 의 마을·그림자·문지기·사서·일각수·벽 메타포 [확인함]. ECHORIS 변주 = 거주자 = 그림자 자체 (한 단계 비틀기).

---

## 후보 평가

| 안 | 형태 | 채택 여부 | 사유 |
|:---|:---|:---:|:---|
| A | 활기찬 마을 (Disgaea 풍) | ✗ | 검 Ego 단독 화자 약화. 1인 개발 부담 과다 |
| B | 마음 없는 거주자 (무라카미 원작 직번역) | △ | 메타포는 강하나 시각 변별 모호. 그림자가 더 통일적 |
| **C** | **그림자 거주자 (무라카미 변주)** | **✓** | 시각 통일 + 화자 룰 정당화 + DEC-036 자연 봉합 |
| D | 무인 마을 (NPC 0) | ✗ | 마을 인지 실패. "버그로 spawn 실패" 처럼 읽힘 |

---

## 영향 범위

### 코드 (신규/수정)

| 항목 | 분량 | 위치 |
|:---|:---:|:---|
| MemoryResident 엔티티 신규 | ~150 line | `game/src/entities/MemoryResident.ts` |
| Spawn 룰 분기 (hub/shrine 안전지대) | ~30 line | ItemWorldSpawnController |
| EgoDialogue 라인 추가 (문지기·사서 × First/Familiar) | ~12 줄 | `game/src/data/EgoDialogue.ts` |
| 사서 두개골 idle 동기화 | ~10 line | 슬롯 장착 트리거 |
| Memory Shard 비주얼 재정의 (검은 그림자 + 노란 눈빛) | 스프라이트 1종 | `MemoryShardNPC.ts` |
| 그림자 스프라이트 (망령 실루엣 2종) | 폴리시 | PixelLab MCP 또는 임시 회색톤 |

**총: 약 250~300 line + 대사 12 줄 + 스프라이트 2~3 종.**

### 데이터

- 그래프/스폰 SSoT: 코드 invariant (RoomNode.role === 'hub'/'shrine' 시 적 spawn 0)
- 추가 CSV 없음

### 문서

- `Documents/Design/Design_ItemWorld_Town_Shadow.md` (DES-IW-TOWN-01) — 본 결정의 SSoT
- `Documents/System/System_ItemWorld_Core.md` — §2 캐스팅 / §5 안전지대 통합
- `Documents/Terms/Glossary.md` — 신규 용어 추가:
  - 그림자 마을 (Town of Shadows)
  - 문지기 (Gatekeeper)
  - 사서 (Librarian)
  - 배경 그림자 (Ambient Shadow)
- `CLAUDE.md` — 필요 시 핵심 시스템 요약에 그림자 마을 1줄 반영

---

## 보존 사항

- DEC-037 RoomGraph 토폴로지 (hub/spoke/boss/shrine) 그대로 유지. 의미 레이어만 추가.
- DEC-036 Memory Shard 위계/슬롯/상태 모델 그대로. 비주얼만 재정의.
- DEC-033 검 Ego 단독 화자 + 에르다 0줄 원칙 그대로. 새 정당화 추가.
- District 매퍼 (`game/src/data/itemWorldDistricts.ts`) 그대로 유지.

---

## 금지 규칙 (재도입 금지)

- **Caretaker / 영감 NPC 재도입 금지** — 무기 고유 거주자 패턴은 검 Ego 단독 화자 원칙과 충돌. 본 결정으로 영구 폐기.
- **Plaza/Memorial 적 spawn 금지** — RoomNode.role 분기 invariant. 코드 레벨 잠금.
- **거주자 dialogue 직접 발화 금지** — 화자는 검 Ego 1명. 거주자는 침묵.
- **Memory Shard 노란 큐브 비주얼 재도입 금지** — 검은 그림자 + 노란 눈빛 1점으로 통일.

---

## 잔여 의사결정 / 후속

- 검 Ego 의 "자기 자신이 그림자임" 자각 호 — 1지층 무자각 → 2지층 의심 → 3지층 자각 권장. 별도 내러티브 디자인에서 결정.
- 무기별 배경 그림자 인원 가변 (Pristine 5 / Mid 4 / Rusted 3) 적용 시점 — 1차 구현은 결정론 5명 고정. 폴리시 단계에서 검토.
- 단계 3 (Recalled-Aware, ≥ 50%) 대사 추가 시점 — 1차 구현은 단계 1·2 만 (12 줄). 단계 3 은 후속.
- 변별 검증 플레이테스트 — 첫 빌드 후 3-신호 룰 인지 테스트 1회 필수.

---

## 레퍼런스

- 무라카미 하루키 (1985). 『세계의 끝과 하드보일드 원더랜드』. Kodansha. [확인함]
- Wikipedia / Strange Horizons / Book Oblivion / Medium — 그림자·문지기·사서·일각수·벽 메타포 [확인함]
- Transistor (Supergiant, 2014) — 침묵 주인공 + 말하는 무기 [확인함]
- Hollow Knight (Team Cherry, 2017) — Dirtmouth 텅빈 마을 안전지대 [확인함]
- Hades (Supergiant, 2020) — House of Hades hub + 소수 인터랙티브 [확인함]
