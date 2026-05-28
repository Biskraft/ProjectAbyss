# Slime — `nano_residue` (나노 잔재 클러스터)

> **용도:** 월드/아이템계 공용 placeholder 비주얼. 실제 적 데이터(SSoT)는 `Sheets/Content_Stats_Enemy.csv` 와 `Documents/Content/Content_Monster_Bestiary.md` 참조.
> **아트 SSoT:** `Documents/Design/Design_Art_Direction.md` §12 (BLAME! 메가스트럭처 절제 톤). 본 문서는 §12 팔레트·화법 표준을 따른다.
> **메카닉 통일 (2026-05-10):** ECHORIS 의 모든 기본 적은 산업 메카닉으로 통일. Ghost (정찰 드론) / Skeleton (보행 측량 mech) / Slime (액체 nanomachine) / Boss (대형 mech) 동일 톤.

---

## 1. 개념

메가스트럭처에서 누출된 **lubricant 와 nanomachine 잔재가 자가 응집한 액체 메카닉 클러스터**. BLAME! 의 silicon life 하급 누출 형태에 해당. 단일 의식·생체 조직 없음. 그러나 화학적·전자기적 자가 결합으로 형태를 유지하며 침입자에게 본능적으로 반응한다. 작은 mechanical particle 들이 액체 lubricant 표면에 부유하면서 슬라임 형태로 응집한다.

**전투 어휘:** 작은 점프 + 바디 터치(Contact). 또는 분리·재결합(Cluster) — 큰 슬라임이 작은 슬라임으로 분리 후 재합쳐짐.

> **이전 컨셉(붕대 침전·의례 향유) 폐기:** 2026-05-10. 시각 자산을 BLAME! 메카닉으로 통일하면서 본 파치먼트 천·세피아 톤 폐기. 본 파치먼트 #C8B89A · 가일트 #A88A48 · 버건디 #6E2C20 등 컬러 모두 산업 메카닉 톤으로 시프트. 봉인 인장·천 자락 같은 의례 모티브도 폐기. narrative 측은 "메가스트럭처 누출 잔재" 톤으로 우회.

---

## 2. 외형 특징

| 항목 | 사양 |
|:-----|:-----|
| 셀 크기 | **24×16** (작고 넓적, 1.5×1 타일 점유) |
| 프로포션 | 폭 24px / 높이 14~16px. 납작한 더미 형태 |
| 본체 | **반액체 nanomachine 클러스터**. 외형은 둥근 슬라임이지만 표면에 작은 metallic flake 입자 1~2px 점들 분포 |
| 코어 | 중앙 **nanomachine sensor 코어** — 청록 점 1~2px 상시 발광. 핵이자 약점 |
| 표면 | 검정 lubricant base + 산업 metallic flake. 1~2px 주황 ember 누출 점이 표면에 부유 |
| 누액 | 바닥 접지면에 **검정 lubricant 1px 자국** 1~2개. 움직일 때만 잠깐 늘어났다 끊김 |
| 흐름 | 1~2px 위아래·좌우로 출렁이는 액체 모션. 표면 metallic flake 가 1프레임마다 위치 시프트 |
| 돌출부 | 둥근 윤곽이지만 표면이 매끈하지 않고 **작은 mechanical particle 가닥 4~6개** 가 비대칭으로 떠 있음 |

---

## 3. 색상 분배

| 부위 | 색상 | 면적 |
|:-----|:-----|:----:|
| 면적 60%+ | 검정 lubricant #1A1410 ~ #2A2418 | 주조 |
| 표면 metallic flake | 산업 grey #4A4A55 ~ #6A6A75 | 1~3점 분포 |
| 아웃라인 | 잉크 흑 #1A1410 (풀 아웃라인) | 윤곽 |
| **Nano core sensor** | **#AABBFF (청록·라벤더, ECHORIS sensor 시그너처 — Ghost·Skeleton 통일)** | 중앙 1~2px 상시 |
| **Ember leak** | **#FFAA40 (주황·금)** | 1~2점 누출 |
| 코어 활성 텔 (옵션) | #FFFFFF → #AABBFF 강화 | Charge 1프레임 |

> **본 파치먼트·가일트·버건디 톤 폐기.** 메카닉 통일을 위해 의례·생체 톤 모두 산업 메카닉 톤으로 시프트. 가일트 봉인 인장 → ember leak 으로 교체.

---

## 4. 애니메이션 세트

| 상태 | 프레임 | 시각 신호 |
|:-----|:---:|:---------|
| Idle | 2~3 | 1~2px 위아래·좌우로 출렁임. nano core 상시 발광. metallic flake 위치 시프트 |
| Hop | 3~4 | 작은 점프, 착지 시 1프레임 squash, lubricant 자국 1프레임 늘어짐 |
| Detect | 1~2 | nano core 1프레임 밝아짐 |
| Charge (옵션) | 2 | 점프 직전 위아래 squash 강화, core 발광 강화 |
| Split (옵션) | 2~3 | HP 50% 시 두 작은 슬라임으로 분리 (Cluster 패턴). core 가 둘로 나뉨 |
| Death | 3~4 | 표면 분해, ember leak 가 흩어지며 nano core 소멸. lubricant 누액 1~2초 잔류 |

---

## 5. 전투 패턴 (Contact + Cluster 아키타입)

| 단계 | 동작 |
|:---|:---|
| Idle | 정지/출렁임. nano core 상시 발광 |
| Hop | 일정 거리마다 작은 점프 이동 |
| Detect | 플레이어 감지. nano core 1프레임 밝아짐 |
| Damage | **신체 접촉 시 데미지 발생.** 별도 공격 프레임 없음 |
| Split (선택) | HP 50% 도달 시 두 작은 슬라임으로 분리. 각자 독립 행동. 새 슬라임의 HP·ATK 절반 |
| Death | HP 0 → Death 애니 + lubricant 누액 잔류 |

**아키타입:** `Content_Monster_Bestiary.md` §1 **Contact + Cluster** 슬롯. Skeleton (Contact only) / Ghost (Sentinel) / Boss (Heavy) 와 구분.

---

## 6. 양 공간 정합

- **월드:** 메가스트럭처 배수로·코어 균열·격벽 누출 지점에 응집. lubricant·coolant 의 자연 응집체
- **아이템계:** 무기 내부의 누출 잔재. Ego 의 "혈류" 가 응집한 형태로, 무기 면역 체계의 분산 unit

---

## 7. 금기 (Re-confirm)

- 본 파치먼트·세피아 톤 (메카닉 통일로 폐기)
- 봉인 인장·의례 모티브 (메카닉 통일로 폐기)
- 청록 점액 반투명 (브랜드 톤이지 인게임 톤 아님 — 단 nano core 의 청록 점은 sensor 시그너처로 OK)
- 둥근 돔 슬라임 (전통 판타지 RPG 어휘) — 표면 metallic flake 로 차별화
- 형광·네온 강조
- 풀 잉크 실루엣 강제 (§12.4)
- 버건디 텔(#6E2C20) — 보스 전용 격하

---

## 8. 명명 합리화

"Slime" = 코드네임. 액체 형태에서 측량 분견대들이 붙인 별명. 정확히는 nanomachine + lubricant 클러스터. 게임 내 표기는 "Slime" 또는 "Nano Residue" 둘 다 사용 가능.

---

## 9. 변경 이력

- **2026-05-10:** 메카닉 통일에 따라 컨셉 재정의. 붕대 침전·의례 향유 톤 폐기, BLAME! silicon life 누출 nanomachine 클러스터로 시프트. Ghost·Skeleton·Boss 와 동일 톤 통일. 신규 자산 생성 필요.
