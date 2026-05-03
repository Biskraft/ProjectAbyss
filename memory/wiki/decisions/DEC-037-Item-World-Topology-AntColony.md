# DEC-037: Item World Topology — Grid → Ant Colony (Radial)

> 결정일: 2026-04-28
> 상태: **부분 무효화 (2026-05-02, DEC-039)** — 토폴로지 위상 룰 (방사형 hub-and-spoke) 은 폐기. RoomGrid → RoomGraph 자료구조 도입은 보존.
> 영향 범위: 절차 생성, 데이터 시트, 코드 (RoomGrid → RoomGraph), 레퍼런스 GDD, UI(미니맵)
> **후속:** `memory/wiki/decisions/DEC-039-Item-World-Continuous-Dive.md` — 수직 딥 다이브 그래프 (Plaza top + Boss bottom) 로 토폴로지 재정의

---

## 결정 사항

아이템계의 절차 생성 토폴로지를 **스펠렁키 기반 4×4 그리드**에서 **방사형 개미굴 (Radial Ant Colony / Hub-and-Spoke)** 그래프 구조로 전환한다.

---

## 폐기 / 도입

| 구분 | 폐기 | 도입 |
|:---|:---|:---|
| 자료구조 | RoomGrid (4×4 셀) | RoomGraph (노드 + 엣지) |
| 절차 알고리즘 | Spelunky critical path on grid | MST + random branch on graph |
| 룸 배치 | 모든 셀 동등 비중 | Hub(광장) + Branch(가지) 비대칭 |
| 입출구 | 4방향 고정 | N방향 일반화 |

---

## 결정 근거

1. **그리드는 마을 표현과 근본적으로 어긋남**
   - 4×4 그리드는 모든 셀이 동등 비중. 마을은 본질적으로 hub + branch 구조.
   - "광장-주거-광장-주거" 반복으로 NPC 클러스터링이 강제 분산됨.

2. **스파이크 강화 — 월드 vs 아이템계 시각/구조 대비**
   - 월드 = 수직 거대 구조 (The Shaft).
   - 아이템계 = 방사형 마을. 두 공간이 한 화면에서 즉시 구분된다.
   - "아이템에 들어가면, 그 안에 살아있는 세계가 있다" 가 카메라만 봐도 인지된다.

3. **DEC-036 (Memory Shard) 와 정합**
   - 중앙 광장 = Resident Quarter (회상된 주민 NPC 클러스터)
   - 방사 가지 = Distortion 분기 (Forgotten 단편 = 적 NPC)
   - 가지 끝 = 보스 (Core Memory 드롭)

4. **레어리티 확장이 직관적**
   - Normal: 가지 2 / Magic: 3 / Rare: 4 / Legendary: 5 / Ancient: 6+심연
   - 4×4 셀 강제보다 서사·난이도 곡선이 자연스럽다.

---

## 후보 평가

| 안 | 형태 | 채택 여부 | 사유 |
|:---|:---|:---:|:---|
| A | T자형 (수평 분기) | ✗ | 분기 1회로 단조. 5지층 확장 어려움 |
| **B** | **방사형 개미굴 (hub-and-spoke)** | **✓** | 마을 본질과 1:1, 월드와 시각 대비 극대화 |
| C | 수직 개미굴 | ✗ | The Shaft와 수직 구조가 중복되어 스파이크 약화 |

---

## 영향 범위 (잔여 작업)

### 코드
- `game/src/level/RoomGrid.ts` → `RoomGraph.ts` 자료구조 교체
- `game/src/scenes/itemworld/ItemWorldMapController.ts` 절차 생성 알고리즘 교체 (BSP/grid → MST + random branch)
- 룸 prefab 입출구 4방향 → N방향 일반화
- 미니맵 UI 그리드 표시 → 그래프 노드 표시

### 데이터
- `Sheets/Content_Rarity.csv` "4×4 고정" 컬럼 → "지층당 노드 수" 로 재정의
- `Sheets/Content_StrataConfig.csv` 노드 수/가지 수 컬럼 추가 검토

### 문서
- `Reference/게임 기획 개요.md` §6 (아이템계 구조) 갱신
- `Documents/System/System_ItemWorld_FloorGen.md` 전면 재작성
- `Reference/Spelunky-LevelGeneration-ReverseGDD.md` → **월드 절차 생성용으로 한정** (아이템계 적용 폐기 명기)
- 신규 레퍼런스: Hollow Knight City of Tears / Mantis Village 룸 그래프 역기획서 후보

### CLAUDE.md / Glossary
- "4×4 고정" 표기 제거
- 용어 추가: 광장(Plaza/Hub), 가지(Branch), 노드(Node)

---

## 보존 사항

- LDtk 룸 prefab은 **유지** — 연결 방식만 그래프로 변경
- 월드(World)의 절차 생성은 **스펠렁키 방식 유지** — 아이템계만 비대칭 전환
- DEC-036 Memory Shard 위계/슬롯/상태 모델은 **그대로** 유지
- 레어리티별 지층 수 (Normal 2 ~ Ancient 4+심연) **그대로** 유지

---

## 잔여 의사결정 (다음 세션)

- 가지 끝 보스 1개 vs 광장에서 보스 직행: 어느 쪽이 마을 내러티브에 적합한가
- Resident Quarter 와 Distortion 가지의 시각 팔레트 분리 (따뜻한 등불 vs 차가운 왜곡)
- T자형 1지층 온보딩 보존 여부 (현재는 4×4 첫 진입 튜토리얼 — 그래프 기반 튜토리얼 신규 설계 필요)
