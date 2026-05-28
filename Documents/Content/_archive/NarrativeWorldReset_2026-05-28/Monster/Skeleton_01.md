# Skeleton — `husk_surveyor` (보행 측량 mech)

> **용도:** 월드/아이템계 공용 placeholder 비주얼. 실제 적 데이터(SSoT)는 `Sheets/Content_Stats_Enemy.csv` 와 `Documents/Content/Content_Monster_Bestiary.md` 참조.
> **아트 SSoT:** `Documents/Design/Design_Art_Direction.md` §12 (BLAME! 메가스트럭처 절제 톤). 본 문서는 §12 팔레트·화법 표준을 따른다.
> **메카닉 통일 (2026-05-10):** ECHORIS 의 모든 기본 적은 산업 메카닉으로 통일. Ghost (정찰 드론) / Skeleton (보행 측량 mech) / Slime (액체 nanomachine) / Boss (대형 mech) 동일 톤.

---

## 1. 개념

격벽 측량 작업을 수행하던 **인간형 보행 측량 unit**이 오류·녹슴으로 적대화된 상태. BLAME! Safeguard 의 인간형 익스터미네이터 실루엣을 humanoid mech 구조로 통합. 살아있지 않은 자동 메카닉이지만, 한때 측량사 형상으로 만들어진 잔해라는 측량 분견대들의 코드네임 **"Husk (껍데기)"** 가 그대로 통용된다.

**전투 어휘:** Hollow Knight Husk/Crawlid 계열 **바디 터치 접촉형(Contact)**. 별도 공격 프레임 없음. 위협 가독성은 실루엣·자세·sensor pod 발광이 담당한다.

> **이전 컨셉(인골·본 파치먼트) 폐기:** 2026-05-10. 시각 자산을 BLAME! Safeguard 메카닉으로 통일하면서 인골 톤 폐기. 본 파치먼트 #C8B89A · 세피아 #5A3E28 · 가일트 #A88A48 등 컬러 모두 산업 메카닉 톤으로 시프트. narrative 측은 "측량 분견대 자동 메카닉이 오류 후 적대화" 톤으로 우회 유지.

---

## 2. 외형 특징

| 항목 | 사양 |
|:-----|:-----|
| 셀 크기 | **32×32** (Erda 동일 스케일, 1:1 PPU 정합. 2×2 타일 점유) |
| 비율 | ~3등신 보행 humanoid mech |
| 머리 | 작은 **sensor pod head** (둥근 5~6px). 단일 청록 sensor lens (~3px) 정면. 짧은 안테나 1~2px 위로 돌출. Ghost 의 큰 카메라 head 와 차별화 — Skeleton 은 작은 sensor cluster |
| 토르소 | **사각 armored block**. 리벳 디테일 1~2점, 가슴에 주황 status light 1px 상시 |
| 팔 | 양쪽 short mechanical arm. 한쪽 팔이 부러진 **측량봉(survey rod)** 으로 융합 (4~5px 둔단). 식별자, 공격 도구 아님 |
| 다리 | **두 다리 보행 mech leg**. 산업 액추에이터, 무릎에 청록 hint 1px (관절 발광) |
| 표면 | 녹슨 갈색·세피아 industrial armor + 단순 dithering. 풀 아웃라인 사용 |
| 자세 | 상체 1~2px 앞으로 기울임. 앞발 무게, 뒷발 살짝 끌림 — "다가오는 중" 모션 시사 |

---

## 3. 색상 분배

| 부위 | 색상 | 면적 |
|:-----|:-----|:----:|
| 면적 60%+ | 녹슨 industrial armor #5A4830 ~ #3A2818 | 주조 |
| 그림자/내부 | 잉크 흑 #1A1410 ~ #0E0E14 | 디더 |
| 아웃라인 | 잉크 흑 #1A1410 (풀 아웃라인) | 윤곽 |
| **Sensor lens** | **#AABBFF (청록·라벤더, ECHORIS sensor 시그너처 — Ghost 와 통일)** | 1~3px 상시 발광 |
| **Status light** | **#FF8000 (주황, ECHORIS SSoT)** | 1~2px 상시 |
| 무릎 발광 (옵션) | #88AAEE (청록) | 무릎 1점 |

> **본 파치먼트·가일트 톤 폐기.** 메카닉 통일을 위해 본·세피아 기반 컬러 모두 산업 메카닉 톤으로 시프트. 가일트 슬릿(#A88A48) → sensor lens(#AABBFF) 로 교체. 버건디(#6E2C20) 폐기 그대로 유지 (보스 슬롯 전용 격하).

---

## 4. 애니메이션 세트

> **공격 프레임 없음.** 바디 터치 접촉형이므로 Attack 애니가 존재하지 않는다. Hollow Knight Husk·Crawlid 표준.

| 상태 | 프레임 | 시각 신호 |
|:-----|:---:|:---------|
| Idle | 2~3 | 1~2px 위아래 호흡 (액추에이터 흔들림). sensor lens 상시 발광 |
| Walk | 4 | 무릎이 거의 굽지 않는 **삐걱대는 직립 보행**. 다리 액추에이터 청록 점이 1프레임만 깜빡 (기계 관절 시사) |
| Death | 3~4 | 좌측으로 쓰러지며 측량봉 분리, 마지막 프레임에 sensor lens 소멸 |

→ Attack 프레임 작업 0. 애니 작업량 표준 잡몹 대비 33% 감소.

---

## 5. 전투 패턴 (Contact 아키타입)

| 단계 | 동작 |
|:---|:---|
| Idle | 정지/미세 호흡. sensor 상시 발광 |
| Detect | 플레이어 감지. sensor 1프레임 밝아짐 |
| Chase | 지상 보행으로 플레이어에게 접근 |
| Damage | **신체 접촉 시 데미지 발생.** 별도 공격 프레임 없음. 데미지 빈도는 AttackCooldown으로 제어 (`Sheets/Content_Stats_Enemy.csv`) |
| Death | HP 0 → Death 애니 |

**아키타입:** `Content_Monster_Bestiary.md` §1 **Contact** 슬롯. Ghost (Sentinel)·Slime (Cluster, TBD)·Boss (Heavy) 와 구분.

---

## 6. 양 공간 정합

- **월드:** 격벽 사이에 박제된 채 발견되는 측량 분견대의 자동 mech 잔해. 오류·녹슴으로 적대화
- **아이템계:** 금속 결에 굳은 인간형 mech. 무기 Ego 의 "면역 체계" 일원

---

## 7. 금기 (Re-confirm)

- 백색 두개골 / 인골 / 본 파치먼트 (메카닉 통일로 폐기)
- 고딕 다크 판타지 (Blasphemous식)
- 갑옷 기사형 실루엣 (캐슬바니아 계열)
- 형광·네온 강조
- 풀 잉크 실루엣 강제 (§12.4)
- **공격 프레임 추가** (Contact 아키타입 위반)
- **공격 텔 색(버건디) 도입** (보스 전용)

---

## 8. 명명 합리화

"Skeleton" / "Husk" = 코드네임. 인골이 아니라 인간형 mech 의 잔해이지만, 측량 분견대들이 인간 윤곽에서 붙인 별명. 게임 내 표기는 "Skeleton" 또는 "Husk Surveyor" 일관 사용.

---

## 9. 자산 이력

| 일자 | 변경 |
|:---|:---|
| 2026-05-02 | 사용자 자체 제작 32×32 자산 채택 (`game/public/assets/characters/skeleton_01.png`) |
| 2026-05-02 | 4등신 MJ v8.1 원화는 `_concept/` 보존 (참조 SSoT). 인게임은 ~3등신 32×32 |
| 2026-05-02 | Contact 아키타입 전환. Attack 프레임·버건디 텔 폐기. 슬릿 가일트 상시화 |
| **2026-05-10** | **메카닉 통일 재정의. 인골·본 파치먼트 톤 폐기, BLAME! Safeguard 인간형 보행 mech 으로 시프트. 가일트 → sensor lens. 신규 자산 생성 필요 (기존 `skeleton_01.png` 인골 톤 자산 폐기)** |
