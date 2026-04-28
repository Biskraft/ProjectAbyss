# ItemWorld Ant-Colony Topology — Reference Research

> 목적: DEC-037 (4×4 그리드 → 방사형 개미굴) 구현을 위한 토폴로지 패턴 정리
> 범위: Dead Cells Concept Graph + Hollow Knight 마을형 영역 (City of Tears / Mantis Village / Hive)
> 형식: 토폴로지 패턴 매핑 (구현 의사코드 제외)
> 작성일: 2026-04-28

---

## 0. 인용 태그 범례

- **[확인함]** — 게임 플레이/공식 위키/개발자 인터뷰로 직접 확인 가능
- **[추측임]** — 일반 인지 기반 추정. 1차 소스 재검증 필요
- **[근거 없음]** — 추론/디자인 가설

> feedback_reference_firstsource / feedback_reference_tagging 규정 준수.
> [추측임] 항목은 영상/스크린샷 1차 소스 검증을 후속 작업으로 남긴다.

---

## 1. Dead Cells — Concept Graph (그래프 토폴로지의 정석)

> 상세: `Reference/DeadCells-LevelGeneration-ReverseGDD.md` 참조. 이 절은 ECHORIS 적용 관점만 압축.

### 1.1 핵심 패턴

| 요소 | Dead Cells [확인함] | ECHORIS 매핑 |
|:---|:---|:---|
| 그래프 정의 | 바이옴별 Concept Graph (CastleDB) | 지층별 RoomGraph (LDtk + CSV) |
| 노드 | 룸 프리팹 (전투/전이/보상/보스) | 룸 프리팹 (광장/주거/가지/보스) |
| 엣지 | 출입구 매칭 (방향성 유향) | 출입구 매칭 (방사형 다방향) |
| 채움 | PCG Fill — 빈 공간을 벽/배경 자동 생성 | 동일 방식 차용 |
| 프레임 | Fixed Framework (입출구 위치 고정) | 광장 노드를 Fixed Framework 로 사용 |

### 1.2 ECHORIS가 차용할 것

- **Concept Graph 분리** — 로직(그래프) ↔ 콘텐츠(룸 프리팹) 분리. 1인 개발에 필수. [확인함]
- **PCG Fill** — 룸 사이 회랑/통로 자동 생성. 룸 수작업 부담 절감. [확인함]
- **Boss Cell 스케일링** — 동일 그래프에 난이도 파라미터만 차등 [확인함] → ECHORIS 지층 깊이 스케일링과 1:1.

### 1.3 ECHORIS가 차용하지 않을 것

- **선형 바이옴 체인** [확인함] — Dead Cells는 바이옴 간이 본질적으로 일자형. ECHORIS 아이템계는 단일 지층 내 방사형이므로 적용 불가.
- **Rune 게이팅** [확인함] — 메타 게이팅. 아이템계 1회성 진입 모델과 충돌.

---

## 2. Hollow Knight — City of Tears (수직 광장형)

### 2.1 토폴로지 관찰

| 항목 | 내용 | 태그 |
|:---|:---|:---|
| 전체 구조 | 수직 다층 광장 도시. 중앙 엘리베이터 축 | [확인함] |
| 광장(Hub) | King's Station, Soul Sanctum 입구 광장 | [확인함] |
| 가지(Branch) | Pleasure House, Watcher Knights 탑, Tower of Love | [확인함] |
| 가지 끝 보스 | Soul Master, Watcher Knights, Collector | [확인함] |
| 가지 길이 | 2-4 룸 (보스까지) | [추측임] |
| 분기 비율 | 광장당 평균 3-4 가지 | [추측임] |

### 2.2 ECHORIS 적용 포인트

1. **수직 축 폐기** — DEC-037이 명시한 대로 "월드와의 시각 대비" 위해 수직형은 차용 불가. **광장 배치만 채용**.
2. **광장 = NPC 클러스터 거점** — City of Tears의 King's Station이 NPC/상점/세이브 지점을 광장에 모아둠 [확인함]. ECHORIS Resident Quarter (회상된 주민) 와 동일 패턴.
3. **가지 끝 보스 = 핵심 기억** — Soul Master가 "도시의 비밀" 보스 [확인함]. ECHORIS 가지 끝 보스 = Core Memory 드롭 (DEC-036) 과 1:1.

---

## 3. Hollow Knight — Mantis Village (소규모 클러스터형)

### 3.1 토폴로지 관찰

| 항목 | 내용 | 태그 |
|:---|:---|:---|
| 전체 구조 | 단일 광장 + 4-5 주거 가지 + 보스 룸 | [확인함] |
| 광장(Hub) | 마을 중앙 통로 (Mantis Lord 하부) | [확인함] |
| 가지(Branch) | 사육장, 우물, 무기고 같은 짧은 분기 | [추측임] |
| 가지 끝 보스 | Mantis Lords (광장 직접 연결) | [확인함] |
| 규모 | 약 8-12 룸 | [추측임] |

### 3.2 ECHORIS 적용 포인트

1. **저레어리티(Normal/Magic) 지층의 표준 모델로 채용** — DEC-037 표 기준 가지 2-3개 = Mantis Village 규모와 정확히 일치.
2. **광장 직접 보스 변형 패턴 확보** — DEC-037 잔여 의사결정 "가지 끝 보스 vs 광장 직행" 의 후자 사례. Mantis Village는 광장-보스 직결 [확인함] → 짧은 지층(Normal) 에 적용.
3. **"적대적 마을" 톤** [확인함] — Mantis는 호전적 부족. ECHORIS Forgotten 단편(적 NPC) 의 톤과 정합.

---

## 4. Hollow Knight — The Hive (방사 벌집형)

### 4.1 토폴로지 관찰

| 항목 | 내용 | 태그 |
|:---|:---|:---|
| 전체 구조 | 다층 벌집 셀이 방사로 연결 | [확인함] |
| 광장(Hub) | 명확한 중앙 광장은 약함. 대신 다중 작은 허브 | [추측임] |
| 가지(Branch) | 원형 셀들이 짧은 통로로 연결 | [확인함] |
| 가지 끝 보스 | Hive Knight (가지 끝 격리) | [확인함] |
| 규모 | 약 10-15 룸 | [추측임] |

### 4.2 ECHORIS 적용 포인트

1. **고레어리티(Legendary/Ancient) 지층 모델** — 다중 허브 + 셀 클러스터 = DEC-037 가지 5-6개 + 심연.
2. **셀 시각 모티프** [확인함] — 벌집의 6각 셀이 시각적 정체성. ECHORIS의 "기억의 지층" 도 셀형 룸 외곽 처리로 시각 통일 가능 (월드의 직사각 룸과 대비).
3. **약한 중앙 허브** — DEC-037 "중앙 광장 vs 다중 허브" 변형의 후자 사례. Ancient 등급에서 채용 검토.

---

## 5. ECHORIS 토폴로지 결정 — 레퍼런스 → 매핑

| 레어리티 | 노드 수 | 가지 수 | 모델 레퍼런스 | 보스 배치 |
|:---|:---:|:---:|:---|:---|
| Normal | 4-5 | 2 | Mantis Village 축소 | 광장 직결 |
| Magic | 6-7 | 3 | Mantis Village 표준 | 광장 직결 1 + 가지 끝 1 |
| Rare | 8-10 | 4 | City of Tears 미니 | 가지 끝 |
| Legendary | 11-13 | 5 | City of Tears 표준 | 가지 끝 (롱 가지) |
| Ancient | 14-16 + 심연 | 6 + 심연 | Hive (다중 허브) | 가지 끝 + 심연 보스 |

> 수치는 1차 가설. 프로토타이핑 후 조정. DEC-037 §"잔여 의사결정" 의 "가지 끝 보스 vs 광장 직행" 은 레어리티별로 분리 채택하는 안.

---

## 6. 시각 모티프 분리 (DEC-037 잔여 의사결정 §2)

| 영역 | 톤 | 레퍼런스 |
|:---|:---|:---|
| 광장 (Resident Quarter) | 따뜻한 등불, 정주의 안전감 | City of Tears King's Station 등불 [확인함] |
| 가지 (Distortion Branch) | 차가운 왜곡, 기억 단편 적대화 | Mantis Village 폐쇄 통로 [확인함] |
| 가지 끝 (Boss Cell) | 단일 큰 공간, 과포화된 색채 | Mantis Lords / Hive Knight 단일 아레나 [확인함] |

---

## 7. 후속 검증 필요 항목 (1차 소스)

- [ ] City of Tears 광장당 가지 수 정확 카운트 — 현재 [추측임]
- [ ] Mantis Village 룸 수 정확 카운트 — 현재 [추측임]
- [ ] The Hive 다중 허브 구조 맵 캡처 — 현재 [추측임]
- [ ] Dead Cells Concept Graph CastleDB 스크린샷 1장 (이미 GDD에 텍스트만 존재)

> 위 4개 항목은 DEC-037 코드 작업 시작 전에 영상/스크린샷으로 보강 권장. 토폴로지 결정에는 영향 없으나 수치 가설 정확도에 영향.

---

## 8. 관련 문서

- DEC-037 (`memory/wiki/decisions/DEC-037-Item-World-Topology-AntColony.md `) — 결정
- `Reference/DeadCells-LevelGeneration-ReverseGDD.md ` — Concept Graph 상세
- `Documents/System/System_ItemWorld_FloorGen.md ` — DEC-037 기준 전면 재작성 대상
- DEC-036 (Memory Shard) — 광장/가지에 단편 배치 매핑

---

## 9. 다음 액션

1. 본 문서 + DEC-037 기반으로 `System_ItemWorld_FloorGen.md ` 재작성 (별도 세션)
2. `Sheets/Content_Rarity.csv ` "4×4 고정" → "노드 수 / 가지 수" 컬럼 변경
3. Normal 지층 (4-5 노드 / 가지 2) 으로 첫 프로토타입 — Mantis Village 축소판 구조
