# DGN-IWGEN-01 — 아이템계 생성 아키텍처 (패킹 + 가로 노드 구조)

> **목적:** 가변-큰 방을 *겹침 없이 결정론적으로* 배치·연결하는 생성 아키텍처를 확정한다. 세로 다이브 RoomGraph를 *한 carver의 프리셋*으로 일반화해 가로·개방·하이브리드까지 같은 엔진으로 만든다.
> **결정(3 전수조사 종합 2026-06-18):** **그래프-우선 그리디 점진 임베딩 + 코리도 노드 + 정수 그리드 결정론 + 크리티컬 패스 by-construction.** (어닐링·TinyKeep 분리식 기각.)
> **입력:** [TASK-IWGEN-01](../Plan/Task_ItemWorld_VariableRoomGen.md) 확정 전제 · Dead Cells/Edgar(플랫포머) 패킹 조사 · RoomGraph 코드 매핑 · 가로/개방 토폴로지 조사.
> **작성:** 2026-06-18.

---

## §1. 채택 아키텍처 (한 문단)

Dead Cells의 *그래프-우선 + 채워넣기* 를 Edgar의 **플랫포머 변형(어닐링 버림, 그리디 채택)** 으로 구현한다. 추상 그래프(무엇↔무엇 + 크리티컬 패스)를 먼저 만들고, **그리디 점진 임베딩**(BFS 순서로 노드를 이미 놓인 이웃의 문에 맞춰 배치, 점유 그리드로 겹침 거부, 실패 시 백트랙)으로 16×16 정수 그리드 위에 가변 풋프린트를 깐다. 안 맞는 이음매는 **코리도 노드**(평탄/사다리/드롭)를 *정식 방처럼* 끼워 잇는다. 전부 정수 연산 + 시드 결정론. 풀이 가능성은 *검증이 아니라 구축으로* 보장(크리티컬 패스를 먼저 깐다).

**기각:** 시뮬레이티드 어닐링(사이드스크롤러엔 과함 — 문 위치가 적고 자유 코리도 없음), TinyKeep 분리식(토폴로지를 *발견*함 — 우리는 입력 그래프를 *준수*해야 함, 부동소수 결정론 취약).

---

## §2. 파이프라인 (6단계)

1. **미션/그래프 (매크로):** 지층별 개념 그래프를 *제약*으로 생성(길이·특수방 수·분기도·입구↔출구 거리·게이트). 대체로 *비순환*(루프는 드물고 비싸게). 게이트 = 락-전진/키-후진(스탯·능력 게이트와 1:1).
2. **크리티컬 패스 먼저 (Spelunky식):** 입구→출구 보장 체인을 *채우기 전에* 깐다. 방에 필요 출구 타입(L/R/드롭/사다리) 태깅. 세로=하강 bias, 가로=우향 bias.
3. **그리디 점진 임베딩 (Edgar 플랫포머):** 입구부터 BFS/체인 순서. 노드마다 — 풀에서 템플릿 선택 → 이미 놓인 이웃의 문에 맞는 위치를 **config-space**(겹침 없고 문 정렬된 상대 오프셋 집합)에서 선택 → 점유 그리드 충돌 거부 → 캡까지 재시도 → **체인 백트랙**.
4. **코리도 노드:** 연결된 쌍의 문이 직접 안 맞으면(오프셋) 코리도 템플릿(평탄/사다리/드롭)을 같은 로직으로 끼움 — *자유 엣지가 아니라 배치·검증되는 정식 방*.
5. **결정론 스파인:** SplitMix64 시드 믹스 → **해시 기반 per-node RNG**(Map 순회 비의존, 순서 독립). 정수 연산만. 입력 튜플 전체 핀(시드+설정+버전).
6. **실패 사다리:** 템플릿 재롤 → 노드/체인 재시도 캡 → 백트랙 → 제약 완화 → 보장 필러/캡 강제 → 리시드 재생성. 전부 하드 캡.

---

## §3. 패킹 알고리즘 상세 (난코어)

### §3.1 점유 그리드 (overlap oracle)
- 16×16 기본단위 = **불리언 점유 그리드**. 풋프린트 예약 = 셀 블록 점유. 충돌 검사 O(풋프린트 셀).

### §3.2 Config-space 캐시 (핵심 속도 레버)
- *순서쌍 (템플릿A 문, 템플릿B 문, 엣지 방향)* 마다 — *문이 정렬되고 겹치지 않는* 상대 오프셋 집합을 **사전 계산**. 정수 좌표. 배치 시 "이 방이 이웃에 붙을 수 있는 위치"가 O(1) 조회.
- 노드의 유효 위치 = 이미 놓인 *모든 이웃*의 config-space 교집합.

### §3.3 그리디 배치 루프 (의사코드)
```
placeChain(chain, occupancy, rng):
  for node in chain (BFS 순):
    placedNeighbors = node의 이미 배치된 이웃들
    candidates = ⋂ configSpace(node, nb) for nb in placedNeighbors   // 교집합
    candidates = candidates.filter(pos => !occupancy.collides(node.footprint @ pos))
    if candidates.empty:
       if node.retries++ < CAP_NODE: node.template = pickAnother(rng); continue
       else: return BACKTRACK            // 체인 백트랙(스택 pop)
    pos = pick(candidates, hashRng(seed, node.idx, node.attempt))
    occupancy.reserve(node.footprint @ pos); node.place(pos)
  return OK
```
- **밀지 않는다(no shove).** 거부·재시도·백트랙만(밀기는 연쇄·비결정 유발).
- **백트랙 = 체인 단위 스택**(부분 레이아웃 pop).
- 순환 그래프는 비쌈 → 개념 그래프를 *대체로 트리*로, 루프는 드물게.

### §3.4 코리도 삽입
- 배치 후 두 연결 노드의 문 오프셋 확인:
  - **하강:** 무제한(낙하) → 드롭 코리도(또는 직접).
  - **상승 ≤4셀:** 평탄 코리도(점프).
  - **상승 >4셀:** 사다리 코리도(∞).
- 코리도도 config-space로 배치·검증. 안 맞으면 재시도→백트랙.

### §3.5 실패 사다리 (모든 루프에 하드 캡)
1. 템플릿 재롤 2. 노드 재시도 캡 3. 체인 백트랙 4. 제약 완화(선택 특수방 드롭·크기 허용 확대) 5. 보장 필러/캡 강제 6. `hash(seed, globalAttempt++)` 리시드 재생성(전역 캡). 최후 = 고정 48×32 폴백.

---

## §4. 가로 노드 구조 + OPEN (Design B)

### §4.1 핵심 재구성 — 방향은 *노드 속성*, 레벨 속성 아님
세로 다이브 엔진에 **별도 가로 엔진이 필요 없다.** 셋만 추가:
- **orientation 태그** (H / V / OPEN) — 노드/세그먼트 단위.
- **bias 벡터** — carve의 방향 가중치만 교체.
- **OPEN 세그먼트 타입** — 방이 아니라 바닥+산포.

### §4.2 한 carve, 세 프리셋
| 프리셋 | bias (L/R/D) | 형태 |
| :--- | :--- | :--- |
| 세로 다이브(기존) | 20/20/60 하향 | 하강 미궁 |
| 가로 스파인 | 40/40/20 우향+세로 포켓 | 평원·수로 진행(Spelunky 고유 형태) |
| OPEN 필드 | 우향 only, 분기 없음 | 넓은 평원(방 없음) |

Dead Cells `linearity`(0=선형/가로, 1=미로) + `entranceExitDistance` 를 *기존 carve의 bias 변조*로 추가(새 코드 경로 아님).

### §4.3 OPEN 세그먼트 = 바닥 + 산포 (방 아님)
1. **바닥 실루엣:** 1D Perlin **3~4 옥타브 fBm**(노드 서브스트림 시드).
2. **산포:** *지터드 그리드*(결정론·스트립 스트리밍 가능) — 밀도 마스크 게이트. 일회 베이크면 Bridson Poisson-disk.
3. **랜드마크:** 가중 앵커 테이블 + **POI 다양성 규칙**(지평선에 *다른 종류* POI 2~3개 상시) + **~40초/N스크린 케이던스**.
4. **갭 검증:** 점프 궤적 도달성(평탄 긴 엣지는 perturb).

### §4.4 하이브리드 = 페이즈 스파인
레벨 = 순서 세그먼트 `[H|V|OPEN]` + 커넥터로 결합. *평원→집→미궁* = `[OPEN 필드] → [드롭 커넥터] → [V 다이브 서브그래프]`. **드롭 커넥터 = 기존 세로 다이브의 top hub 진입에 mate** → 후반(미궁)은 코드 변경 0.
- **카메라 규칙:** 방향 전환 커넥터는 *진입 방향에서 읽혀야*(Mega Man X 블라인드 랜딩 회피) — 강제 점프/드롭 전 새 축 지오메트리가 화면에.

### §4.5 소켓 규약 (확정 반영)
- 가로 L/R 매칭. 세로 **U 없음** — 하강은 드롭/사다리(매칭 아님), 일방향. 곁가지 = 측면 포켓(L/R)만. 세로 이동은 *큰 방 내부 사다리*가 흡수.

### §4.6 페이싱 시퀀서 (PATH 노드 위)
- 타입 교대표(REST/REWARD/ELITE 연속 금지, 2-분기는 종류 상이).
- 핀 앵커(보상 ~⅔, 휴식 보스 직전, 보스 끝).
- 관심 곡선 점검 → 평탄 구간에 랜드마크/인카운터 삽입.

---

## §5. 결정론 (정수 그리드)

- **`Math.random` 금지(시드 불가).** SplitMix64로 시드 *믹스*(유사 시드 상관 제거) → xoshiro256\*\* / Mulberry32 스트림. 또는 **해시 기반 per-node RNG**(`hash(seed, nodeIdx, purpose)`) — *순서 독립*이라 Map/Set 순회 desync(최대 버그류) 면역. **권장: 해시 기반.**
- **서브시스템별 독립 스트림**(layout/loot/enemy) — OPEN 필드의 가변 산포 draw가 다이브 서브그래프 시드를 밀지 않게.
- **결정 경로는 정수만.** `sin/cos/exp`·부동소수 누적 금지(시각 전용). 크로스플랫폼 비트 동일 보장.
- **입력 튜플 전체 핀**(시드+모든 설정 플래그+생성기 버전). *Dead Cells 로어방 시드 버그가 교훈.*

---

## §6. 크리티컬 패스 / 도달성 (by-construction)

- **Spelunky식 — 해결 경로 먼저 깐다.** 방 타입이 필수 출구 인코딩(L/R / +드롭 / +착지). 풀이 가능성 = *구조 불변값*, 테스트 실패 없음. 세로 하강·드롭/사다리 엣지에 직결.
- **그래프-우선 연결성:** 다음 체인은 항상 이미 놓인 방에 연결 → 단일 연결 성분.
- **백스톱:** flood-fill/BFS로 전 노드 도달 확인, 고립 시 재생성(또는 코리도 splice).
- **OPEN 갭만 점프 궤적 검증 추가**(세로 다이브엔 긴 가로 갭 드묾).
- **능력 게이트 소프트락 = 핵심 실패 모드** — 키/능력을 그것이 여는 게이트 *뒤*에 두지 말 것(락-전진/키-후진).

---

## §7. 자료구조 변경 + 정확한 훅 지점 (코드)

| 변경 | 파일:라인 | 내용 |
| :--- | :--- | :--- |
| `RoomNode += footprint{w,h}` | RoomGraph.ts:48-64 | 현재 1셀 고정 → 가변. orientation·encounterType도 추가 |
| `RoomEdge += corridorId, kind 'tree_with_corridor'` | RoomGraph.ts:66-73 | 코리도 노드 참조 |
| carve↔좌표 분리 | RoomGraph.ts:153-495 | buildVerticalDive가 *좌표를 직접 할당* → 토폴로지+CP+footprint만 만들고 좌표는 패커로 |
| bias 벡터 추출 | RoomGraphArchetypes.ts | cpD/L/R을 프리셋 벡터로(세로/가로/OPEN) |
| `embedVertical` → `packGraph` | RoomGraphAdapter.ts:202-233 | 1×1 정규화 → **그리디 풋프린트 패커**(점유 그리드+config-space+백트랙) |
| 코리도 삽입 | RoomGraphAdapter.ts (신규) | 엣지별 오프셋→평탄/사다리/드롭 |
| 플라자 정렬 footprint-aware | RoomGraphAdapter.ts:83 | bbox = 단일셀 → 풋프린트 |
| 검증 확장 | RoomGraph.ts:501-543 | IWF-R10/11/17/18 + 풋프린트 겹침·코리도·CP-with-corridor flood-fill |
| `generateRoomGraph += layoutDirection` | RoomGraph.ts:122 | vertical/horizontal 분기(또는 통합 carve+bias) |
| 템플릿 메타 자동화 | LdtkLoader/TemplatePicker | footprint 자동측정 + 입구 자동검출(테두리 갭, 4셀 스냅, 최소 3) + 클래스 판별(밀폐 vs 개방) |

---

## §8. 보존 불변값

- **결정론:** 신규 RNG 전부 해시/시드. 재다이브=동일 맵.
- **크리티컬 패스:** carve-first + flood-fill 백스톱.
- **카메라·유체·스폰:** 가변 크기 이미 대응 — 변경 없음(회귀만 확인).
- **레거시 고정 48×32:** 폴백·기존 방 호환(48×32 = 3×2 풋프린트).

---

## §9. 출처 (요약)

- Dead Cells/Edgar(플랫포머 그리디): deepnight.net · gamedeveloper.com · ondrejnepozitek.github.io/Edgar · Nepožitek &amp; Gemrot Game-ON 2018.
- 크리티컬 패스: tinysubversions.com/spelunkyGen · journal.stuffwithstuff.com(Nystrom) · boristhebrave.com(graph rewriting/Dormans).
- 가로/개방: Spelunky 워크 · Unexplored 순환 · Bridson Poisson-disk · 1D fBm · Lynch legibility · Slay the Spire 맵 규칙.
- 결정론: Vigna prng.di.unimi.it(SplitMix64/xoshiro) · Eiserloh GDC(Squirrel 해시 RNG).
- 분리식 비교(기각): vazgriz.com · TinyKeep(a327ex).
