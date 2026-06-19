# Dead Cells 바이옴별 방 구조 분석

Dead Cells TMX 668개 방 파싱 결과. ECHORIS 아이템계 방 템플릿 설계 레퍼런스.

---

## 전체 요약

| 지표 | 값 |
|---|---|
| 총 방 수 | 668개 |
| 평균 가로 | 40.6 tiles (974px) |
| 평균 세로 | 28.8 tiles (691px) |
| 중앙값 가로×세로 | 40×27 tiles (960×648px) |
| 레이어 구조 | col (충돌) + lnk (연결) 2레이어 고정 |
| 비주얼 레이어 | TMX 미포함 — 아틀라스 시스템 별도 처리 |

**형태 분포:**

| 형태 | 비율 |
|---|---|
| 정방형 (square) | 261개 (39.1%) |
| 가로형 (horizontal) | 238개 (35.6%) |
| 넓은 복도형 (wide_corridor) | 106개 (15.9%) |
| 세로형 (vertical) | 49개 (7.3%) |
| 수직 샤프트형 (shaft) | 14개 (2.1%) |

---

## 안뜰 (Courtyard)

> 방 수 가장 많음(89개). 다양한 형태 혼합. 세로 170타일 극단적 방 존재.

| 항목 | 값 |
|---|---|
| 방 수 | **89개** |
| 가로 범위 | 12-75 tiles (288-1800px) |
| 세로 범위 | 15-170 tiles (360-4080px) |
| 평균 크기 | 41×34 tiles |
| 주요 형태 | 정방형 |
| 형태 분포 | square:61개 / horizontal:19개 / vertical:7개 / shaft:1개 / wide_corridor:1개 |
| 평균 충전율 | 30% (콜리전 타일 비율) |
| 평균 출구 수 | 1.4개 |
| 주요 오브젝트 | OverStructure×489, BgWall×283, UnderStructure×112, Spikes×88 |

---

## 감옥 (Prison)

> Dead Cells 시작 구역. 가장 기본적인 방 문법. 수평 이동 중심, 낮은 플랫폼 밀도. ECHORIS 아이템계 1지층 레퍼런스.

| 항목 | 값 |
|---|---|
| 방 수 | **84개** |
| 가로 범위 | 11-85 tiles (264-2040px) |
| 세로 범위 | 7-70 tiles (168-1680px) |
| 평균 크기 | 37×24 tiles |
| 주요 형태 | 가로형 |
| 형태 분포 | horizontal:33개 / square:32개 / wide_corridor:13개 / vertical:4개 / shaft:2개 |
| 평균 충전율 | 40% (콜리전 타일 비율) |
| 평균 출구 수 | 1.7개 |
| 주요 오브젝트 | Light×42, CustomDeco×40, BreakableGround×34, DisableDecorator×32 |

---

## 난파선 (Shipwreck)

> 다양한 크기. 기울어진 플랫폼 특징.

| 항목 | 값 |
|---|---|
| 방 수 | **48개** |
| 가로 범위 | 13-85 tiles (312-2040px) |
| 세로 범위 | 7-47 tiles (168-1128px) |
| 평균 크기 | 42×21 tiles |
| 주요 형태 | 넓은 복도 |
| 형태 분포 | wide_corridor:20개 / horizontal:14개 / square:10개 / vertical:4개 |
| 평균 충전율 | 50% (콜리전 타일 비율) |
| 평균 출구 수 | 0.4개 |
| 주요 오브젝트 | BreakableOneWay×152, Water×24, ForcedMob×23, Spikes×20 |

---

## 고대 신전 (Ancient Temple)

> 중간 크기. 수평+수직 균등. 罠(함정) 밀도 높음.

| 항목 | 값 |
|---|---|
| 방 수 | **47개** |
| 가로 범위 | 8-61 tiles (192-1464px) |
| 세로 범위 | 7-55 tiles (168-1320px) |
| 평균 크기 | 44×24 tiles |
| 주요 형태 | 가로형 |
| 형태 분포 | horizontal:39개 / wide_corridor:6개 / square:1개 / shaft:1개 |
| 평균 충전율 | 50% (콜리전 타일 비율) |
| 평균 출구 수 | 0.0개 |
| 주요 오브젝트 | Spikes×71, UnderStructure×70, RotatingBall×56, CustomDeco×54 |

---

## 왕성 (Castle)

> 정방형~가로형. 수직 이동보다 수평 탐색 중심. 중간 밀도.

| 항목 | 값 |
|---|---|
| 방 수 | **46개** |
| 가로 범위 | 19-51 tiles (456-1224px) |
| 세로 범위 | 7-41 tiles (168-984px) |
| 평균 크기 | 34×25 tiles |
| 주요 형태 | 정방형 |
| 형태 분포 | square:24개 / horizontal:11개 / wide_corridor:8개 / vertical:3개 |
| 평균 충전율 | 30% (콜리전 타일 비율) |
| 평균 출구 수 | 0.7개 |
| 주요 오브젝트 | Spikes×131, BreakableGround×24, Light×20, RotatingBall×17 |

---

## 집행관의 성 (Dooku Castle)

> 집행관 DLC. 넓은 방+좁은 복도 반복. 건축적 다양성.

| 항목 | 값 |
|---|---|
| 방 수 | **42개** |
| 가로 범위 | 3-68 tiles (72-1632px) |
| 세로 범위 | 7-30 tiles (168-720px) |
| 평균 크기 | 26×16 tiles |
| 주요 형태 | 가로형 |
| 형태 분포 | horizontal:24개 / square:12개 / wide_corridor:5개 / shaft:1개 |
| 평균 충전율 | 30% (콜리전 타일 비율) |
| 평균 출구 수 | 0.0개 |
| 주요 오브젝트 | CustomDeco×54, LoreDeco×49, DisableMobGen×31, SpecialEquipment×12 |

---

## 아스트롤라브 (Astrolab)

> 무중력/수직 이동 특화. 세로 94타일. ECHORIS surge/diveAttack 레퍼런스.

| 항목 | 값 |
|---|---|
| 방 수 | **35개** |
| 가로 범위 | 11-48 tiles (264-1152px) |
| 세로 범위 | 7-94 tiles (168-2256px) |
| 평균 크기 | 38×32 tiles |
| 주요 형태 | 정방형 |
| 형태 분포 | square:27개 / horizontal:3개 / vertical:3개 / shaft:1개 / wide_corridor:1개 |
| 평균 충전율 | 20% (콜리전 타일 비율) |
| 평균 출구 수 | 0.4개 |
| 주요 오브젝트 | BgWall×144, OverStructure×81, UnderStructure×49, OverStructure2×33 |

---

## 등대 (Lighthouse)

> 일정한 가로 크기(28-75). 수직 쌓기 구조.

| 항목 | 값 |
|---|---|
| 방 수 | **35개** |
| 가로 범위 | 28-75 tiles (672-1800px) |
| 세로 범위 | 20-50 tiles (480-1200px) |
| 평균 크기 | 49×29 tiles |
| 주요 형태 | 가로형 |
| 형태 분포 | horizontal:14개 / wide_corridor:12개 / square:7개 / vertical:2개 |
| 평균 충전율 | 20% (콜리전 타일 비율) |
| 평균 출구 수 | 0.0개 |
| 주요 오브젝트 | LoreDeco×238, Light×214, SpawnSpot×206, BreakableTile×183 |

---

## 시계탑 (Clock Tower)

> 수직 구조 강함. 90타일 가로 방+41타일 세로 방 공존.

| 항목 | 값 |
|---|---|
| 방 수 | **29개** |
| 가로 범위 | 13-90 tiles (312-2160px) |
| 세로 범위 | 7-41 tiles (168-984px) |
| 평균 크기 | 28×30 tiles |
| 주요 형태 | 세로형 |
| 형태 분포 | vertical:12개 / square:10개 / wide_corridor:4개 / horizontal:2개 / shaft:1개 |
| 평균 충전율 | 30% (콜리전 타일 비율) |
| 평균 출구 수 | 0.5개 |
| 주요 오브젝트 | Spikes×45, RotatingBall×18, FakeBlackWall×8, NoBgWall×8 |

---

## 독성 하수도 (Sewer Labyrinth)

> 분기형 미로. 수평+수직 교차. 출구가 3-4개인 방 다수. 길 찾기 부담이 높음.

| 항목 | 값 |
|---|---|
| 방 수 | **28개** |
| 가로 범위 | 23-60 tiles (552-1440px) |
| 세로 범위 | 7-50 tiles (168-1200px) |
| 평균 크기 | 50×33 tiles |
| 주요 형태 | 가로형 |
| 형태 분포 | horizontal:14개 / square:11개 / wide_corridor:3개 |
| 평균 충전율 | 50% (콜리전 타일 비율) |
| 평균 출구 수 | 0.0개 |
| 주요 오브젝트 | CustomDeco×185, Water×152, BreakableGround×22, DisableDecorator×7 |

---

## 은행 (Bank)

> 세로 최대 450타일 순수 수직 샤프트 존재. 낙하 메커닉 집중.

| 항목 | 값 |
|---|---|
| 방 수 | **26개** |
| 가로 범위 | 9-56 tiles (216-1344px) |
| 세로 범위 | 9-450 tiles (216-10800px) |
| 평균 크기 | 33×37 tiles |
| 주요 형태 | 정방형 |
| 형태 분포 | square:10개 / horizontal:9개 / wide_corridor:5개 / shaft:1개 / vertical:1개 |
| 평균 충전율 | 40% (콜리전 타일 비율) |
| 평균 출구 수 | 0.3개 |
| 주요 오브젝트 | BgWall×173, ForcedMob×73, DisableDecorator×52, UnderStructure×48 |

---

## 자줏빛 정원 (Purple Garden)

> 세로 81타일. 수직+플랫폼 복합.

| 항목 | 값 |
|---|---|
| 방 수 | **22개** |
| 가로 범위 | 10-65 tiles (240-1560px) |
| 세로 범위 | 10-81 tiles (240-1944px) |
| 평균 크기 | 45×26 tiles |
| 주요 형태 | 가로형 |
| 형태 분포 | horizontal:16개 / square:3개 / wide_corridor:2개 / shaft:1개 |
| 평균 충전율 | 30% (콜리전 타일 비율) |
| 평균 출구 수 | 0.6개 |
| 주요 오브젝트 | BgWall×42, Water×14, GenericEventTrigger×8, LoreDeco×8 |

---

## 납골당 (Crypts)

> 중간 크기 수평/세로 혼합. 비밀 통로 많음.

| 항목 | 값 |
|---|---|
| 방 수 | **21개** |
| 가로 범위 | 19-80 tiles (456-1920px) |
| 세로 범위 | 7-39 tiles (168-936px) |
| 평균 크기 | 44×25 tiles |
| 주요 형태 | 가로형 |
| 형태 분포 | horizontal:11개 / square:5개 / wide_corridor:4개 / vertical:1개 |
| 평균 충전율 | 50% (콜리전 타일 비율) |
| 평균 출구 수 | 0.4개 |
| 주요 오브젝트 | BreakableGround×14, RedTeleporter×12, DarknessRemover×9, Spikes×7 |

---

## 하수도 복도 (Sewer Corridor)

> 긴 수평 복도. 단방향 이동. 전투 집중 구조.

| 항목 | 값 |
|---|---|
| 방 수 | **20개** |
| 가로 범위 | 25-72 tiles (600-1728px) |
| 세로 범위 | 14-56 tiles (336-1344px) |
| 평균 크기 | 51×31 tiles |
| 주요 형태 | 가로형 |
| 형태 분포 | horizontal:10개 / wide_corridor:5개 / vertical:4개 / square:1개 |
| 평균 충전율 | 50% (콜리전 타일 비율) |
| 평균 출구 수 | 0.3개 |
| 주요 오브젝트 | CustomDeco×110, Water×85, BreakableGround×6, FakeBlackWall×4 |

---

## 납골소 (Ossuary)

> 방이 넓고 적 밀도 높음. 전투 특화. 출구 적음(단방향 강제).

| 항목 | 값 |
|---|---|
| 방 수 | **19개** |
| 가로 범위 | 40-65 tiles (960-1560px) |
| 세로 범위 | 16-65 tiles (384-1560px) |
| 평균 크기 | 52×34 tiles |
| 주요 형태 | 정방형 |
| 형태 분포 | square:12개 / wide_corridor:5개 / horizontal:2개 |
| 평균 충전율 | 40% (콜리전 타일 비율) |
| 평균 출구 수 | 0.1개 |
| 주요 오브젝트 | BreakableGround×12, Spikes×12, Light×5, FakeBlackWall×3 |

---

## 연구소 (Lab)

> 긴 가로(최대 100타일). 전투+탐색 복합.

| 항목 | 값 |
|---|---|
| 방 수 | **13개** |
| 가로 범위 | 28-100 tiles (672-2400px) |
| 세로 범위 | 20-63 tiles (480-1512px) |
| 평균 크기 | 50×35 tiles |
| 주요 형태 | 정방형 |
| 형태 분포 | square:8개 / horizontal:4개 / wide_corridor:1개 |
| 평균 충전율 | 50% (콜리전 타일 비율) |
| 평균 출구 수 | 0.5개 |
| 주요 오브젝트 | FixedLoot×27, CustomDeco×26, Light×14, CustomSpot×12 |

---

## 증류소 (Distillery)

> 작은 방 다수. 빠른 전환.

| 항목 | 값 |
|---|---|
| 방 수 | **11개** |
| 가로 범위 | 5-60 tiles (120-1440px) |
| 세로 범위 | 7-42 tiles (168-1008px) |
| 평균 크기 | 32×23 tiles |
| 주요 형태 | 정방형 |
| 형태 분포 | square:5개 / vertical:3개 / horizontal:2개 / wide_corridor:1개 |
| 평균 충전율 | 40% (콜리전 타일 비율) |
| 평균 출구 수 | 0.0개 |
| 주요 오브젝트 | MultiPressurePlate×12, ForcedMob×10, Elevator×5, SpecialEquipment×5 |

---

## 고대 묘지 (Cemetery)

> 가장 넓은 방(최대 150타일). 수직 낙하 구간 포함. 야외 개방감.

| 항목 | 값 |
|---|---|
| 방 수 | **10개** |
| 가로 범위 | 30-150 tiles (720-3600px) |
| 세로 범위 | 21-100 tiles (504-2400px) |
| 평균 크기 | 63×43 tiles |
| 주요 형태 | 정방형 |
| 형태 분포 | square:6개 / wide_corridor:2개 / horizontal:2개 |
| 평균 충전율 | 60% (콜리전 타일 비율) |
| 평균 출구 수 | 0.6개 |
| 주요 오브젝트 | DisableDecorator×21, Water×14, BgWall×12, Light×11 |

---

## 심연 (Pit)

> 가로 66-100타일 고정 넓음. 깊은 구덩이 구조.

| 항목 | 값 |
|---|---|
| 방 수 | **8개** |
| 가로 범위 | 66-100 tiles (1584-2400px) |
| 세로 범위 | 13-62 tiles (312-1488px) |
| 평균 크기 | 80×34 tiles |
| 주요 형태 | 가로형 |
| 형태 분포 | horizontal:5개 / wide_corridor:3개 |
| 평균 충전율 | 60% (콜리전 타일 비율) |
| 평균 출구 수 | 0.9개 |
| 주요 오브젝트 | BgWall×21, Spikes×18, UnderStructure×13, PullBomb×8 |

---

## 고분 (Tumulus)

> 넓은 방(최대 118타일). 고분 내부. 복합 구조.

| 항목 | 값 |
|---|---|
| 방 수 | **7개** |
| 가로 범위 | 21-118 tiles (504-2832px) |
| 세로 범위 | 24-100 tiles (576-2400px) |
| 평균 크기 | 51×73 tiles |
| 주요 형태 | 세로형 |
| 형태 분포 | vertical:2개 / shaft:2개 / square:1개 / wide_corridor:1개 / horizontal:1개 |
| 평균 충전율 | 50% (콜리전 타일 비율) |
| 평균 출구 수 | 0.3개 |
| 주요 오브젝트 | TumulusTimedShooter×11, MultiPressurePlate×8, BgWall×5, SpecialEquipment×5 |

---

## 수상 마을 (Stilt Village)

> 세로 100타일. 수직 마을 구조.

| 항목 | 값 |
|---|---|
| 방 수 | **6개** |
| 가로 범위 | 5-80 tiles (120-1920px) |
| 세로 범위 | 7-100 tiles (168-2400px) |
| 평균 크기 | 33×54 tiles |
| 주요 형태 | 정방형 |
| 형태 분포 | square:3개 / vertical:2개 / shaft:1개 |
| 평균 충전율 | 40% (콜리전 타일 비율) |
| 평균 출구 수 | 0.3개 |
| 주요 오브젝트 | Spikes×14, BgWall×7, MultiPressurePlate×5, KeyLockedDoor×5 |

---

## 늪 (Swamp)

> 낮고 넓은 형태. 지형 변형(수중 구간) 포함.

| 항목 | 값 |
|---|---|
| 방 수 | **6개** |
| 가로 범위 | 20-53 tiles (480-1272px) |
| 세로 범위 | 17-30 tiles (408-720px) |
| 평균 크기 | 32×21 tiles |
| 주요 형태 | 정방형 |
| 형태 분포 | square:4개 / horizontal:1개 / wide_corridor:1개 |
| 평균 충전율 | 40% (콜리전 타일 비율) |
| 평균 출구 수 | 0.2개 |
| 주요 오브젝트 | Light×7, CustomDeco×4, ReflectWater×3, BgWall×3 |

---

## 천문대 (Observatory)

> 세로 151타일. 수직 샤프트 특화. Bank와 함께 최고 수직 구조.

| 항목 | 값 |
|---|---|
| 방 수 | **5개** |
| 가로 범위 | 10-70 tiles (240-1680px) |
| 세로 범위 | 28-151 tiles (672-3624px) |
| 평균 크기 | 35×74 tiles |
| 주요 형태 | 정방형 |
| 형태 분포 | square:2개 / shaft:2개 / vertical:1개 |
| 평균 충전율 | 40% (콜리전 타일 비율) |
| 평균 출구 수 | 0.0개 |
| 주요 오브젝트 | CustomSpot×28, CustomDeco×27, Spikes×10, GenericEventTrigger×9 |

---

## 부패한 감옥 (Prison Corrupt)

> Prison 변형. 좁고 짧음.

| 항목 | 값 |
|---|---|
| 방 수 | **5개** |
| 가로 범위 | 16-35 tiles (384-840px) |
| 세로 범위 | 7-30 tiles (168-720px) |
| 평균 크기 | 30×20 tiles |
| 주요 형태 | 정방형 |
| 형태 분포 | square:3개 / wide_corridor:1개 / horizontal:1개 |
| 평균 충전율 | 40% (콜리전 타일 비율) |
| 평균 출구 수 | 0.2개 |
| 주요 오브젝트 | SpecialEquipment×2, TimedShooter×1, RandomLevelSpecificTrap×1, Lava×1 |

---

## 산지 (Mountains)

> 좁은 가로(34-35 고정). 높은 세로. 수직 등반 특화.

| 항목 | 값 |
|---|---|
| 방 수 | **4개** |
| 가로 범위 | 34-35 tiles (816-840px) |
| 세로 범위 | 22-34 tiles (528-816px) |
| 평균 크기 | 34×30 tiles |
| 주요 형태 | 정방형 |
| 형태 분포 | square:3개 / horizontal:1개 |
| 평균 충전율 | 50% (콜리전 타일 비율) |
| 평균 출구 수 | 0.5개 |
| 주요 오브젝트 | BgWall×6, SpecialEquipment×2 |

---

## 온실 (Greenhouse)

> 방 수 적음. 넓고 개방적.

| 항목 | 값 |
|---|---|
| 방 수 | **2개** |
| 가로 범위 | 47-60 tiles (1128-1440px) |
| 세로 범위 | 13-13 tiles (312-312px) |
| 평균 크기 | 54×13 tiles |
| 주요 형태 | 넓은 복도 |
| 형태 분포 | wide_corridor:2개 |
| 평균 충전율 | 20% (콜리전 타일 비율) |
| 평균 출구 수 | 2.0개 |
| 주요 오브젝트 | CustomDeco×8, Light×7, NoBgWall×4, FocusCamera×2 |

---

## ECHORIS 아이템계 적용 요약

| 설계 기준 | Dead Cells 근거 |
|---|---|
| 표준 방 크기 | 40×27 tiles (중앙값) = 960×648px |
| 수직 샤프트 방 | Bank/Observatory 레퍼런스 — 세로 100-450타일 |
| 방 1지층 목표 수 | 30-40개 (Prison/SewerLabyrinth 참고) |
| 레이어 분리 원칙 | 충돌(col) + 연결(lnk) 분리, 비주얼은 별도 |
| 출구 수 | 평균 2-3개 / 보스방 1개 (단방향) |
| 충전율 기준 | 일반 방 30-50% / 복도형 60-70% |
| 전투 특화 방 | Ossuary 레퍼런스 — 넓고 출구 적음 |
| 미로형 방 | SewerLabyrinth 레퍼런스 — 분기 3-4출구 |