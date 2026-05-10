# Ghost — `surveillance_drone` (정찰 드론)

> **용도:** 월드/아이템계 공용 부유 원거리 적. 실제 적 데이터(SSoT)는 `Sheets/Content_Stats_Enemy.csv` 참조.
> **아트 SSoT:** `Documents/Design/Design_Art_Direction.md` §12 (BLAME! 메가스트럭처 절제 톤). 본 문서는 §12 팔레트·화법 표준을 따른다.
> **시각 자산 (확정):** `game/public/assets/characters/_archive/ChatGPT Image 2026년 5월 10일 오후 11_11_54.png` (2026-05-10).

---

## 1. 개념

메가스트럭처가 자동 운영하는 **부유 정찰 메카닉**. 살아있지 않으나 정적·은밀하게 떠다니는 인상 때문에 측량 분견대들이 "Ghost (유령)" 라는 코드네임을 붙였다. BLAME! Safeguard 의 하급 sensor unit 실루엣을 4단 vertical mech 구조로 통합한 형태.

**전투 어휘:** 부유 + 거리 유지 + 원거리 projectile. 접근 회피·견제형. Sentinel 아키타입.

> **이전 컨셉(영혼·전쟁 잔영) 폐기:** 2026-05-10. 시각 자산이 산업 메카닉으로 확정됨에 따라 narrative 측의 영혼·잔영 톤은 본 적과 분리. 영혼 모티브는 별도 NPC(예: 지층 3 메모리 단편 NPC) 에서 유지.

---

## 2. 외형 특징

| 항목 | 사양 |
|:-----|:-----|
| 셀 크기 | **32×64** (4단 vertical mech, 1×2 타일 점유) |
| 비율 | 1:2 vertical mech. 머리·토르소·부스터 4단 stacked |
| 머리 | **큰 원통형 카메라 head**. 단일 청록 optic eye lens(~8px diameter)가 카메라 정면. 짧은 안테나 1개 위로 돌출 (2~3px) |
| 토르소 | **사각 armored block**. 리벳 디테일 1~2점, 가슴에 주황 status light 1~2px 상시 |
| 팔 | 양쪽 short mechanical arm (4~5px). 끝에 작은 mechanical claw 또는 fist mount. 무기 부착 없음 |
| 다리 | 다리 없음. 하단 **한 쌍 thruster booster pod** (4~6px). 작은 주황 thrust glow 1px 상시 |
| 표면 | dark grey-green industrial armor + 단순 dithering. 풀 아웃라인 사용 |
| 자세 | 1~2px 위아래 hovering bob. 정적·정중한 정찰 톤 |

---

## 3. 색상 분배

| 부위 | 색상 | 면적 |
|:-----|:-----|:----:|
| 면적 60%+ | dark grey-green armor #2A3540 ~ #3A4855 | 주조 |
| 그림자/내부 | 잉크 흑 #1A1410 ~ #0E0E14 | 디더 |
| 아웃라인 | 잉크 흑 #1A1410 (풀 아웃라인) | 윤곽 |
| **Optic lens** | **#AABBFF (청록·라벤더, 코드 `0xaabbff`)** ~ **#88AAEE (코어 발광)** | **상시 발광 ~8px** |
| **Status light** | **#FF8000 (주황, ECHORIS SSoT)** | 1~2px 상시 |
| **Thrust glow** | **#FFAA40 (주황·금색)** | 부스터 1px 상시 |

> ECHORIS 청록·주황 SSoT 정합. 청록 = 적 정체 시그너처(lens), 주황 = 액센트(status·thrust). 환경 BG·wall 톤과 hue 분리되어 가독성 ★.

---

## 4. 애니메이션 세트

| 상태 | 프레임 | 시각 신호 |
|:-----|:---:|:---------|
| Idle | 2~3 | 1~2px 위아래 hovering. lens·status·thrust 상시 발광 |
| Patrol | 4 | hovering 좌우 wander. thrust glow 1프레임만 강화 |
| Detect | 1~2 | 350ms 정지. lens 1프레임 밝아짐 (또는 ring 1px 펄스) |
| Charge | 2~3 | shoot 직전. lens 발광 강화, status 깜빡임 (공격 예고) |
| Shoot | 2 | projectile 발사. lens 에서 빛이 발사되는 시각 출처 |
| Death | 3~4 | thrust 꺼짐, lens 어둠, 본체 좌측 회전 + 분리 fragments |

---

## 5. 전투 패턴 (Sentinel 아키타입)

| 단계 | 동작 (`game/src/entities/Ghost.ts` 구현) |
|:---|:---|
| Idle | 정지 hovering. lens·status 상시 발광 |
| Patrol | 4 tile 범위 좌우 wander, 0.6× 이동속도 |
| Detect | 240px 감지 → 350ms 정지 (감지 확인) |
| Keep Distance | 4~6 tile 거리 유지 (접근 시 후퇴, 멀어지면 추격) |
| Charge | shoot 직전 lens 발광 강화 (게임플레이 텔) |
| Shoot | projectile 발사, 1800ms cooldown |
| Lose Target | 2000ms 타임아웃 후 patrol 복귀 |
| Death | HP 0 → Death 애니 + thrust 꺼짐 |

**아키타입:** `Content_Monster_Bestiary.md` 의 **Sentinel** 슬롯. Skeleton (Contact) 와 구분.

---

## 6. 양 공간 정합

- **월드:** 격벽 사이·플랫폼 위 hovering 정찰 메카닉. 측량 분견대를 모니터링하는 자동 유닛
- **아이템계:** 무기 내부의 자동 방어 시스템. 무기 Ego 의 "면역 체계" 톤

---

## 7. 명명 합리화

"Ghost" = **코드네임**. 살아있지 않은 메카닉이지만 정적·은밀·부유 인상에서 측량 분견대가 붙인 별명. 게임 내 표기는 "Ghost" 또는 "Surveillance Drone" 둘 다 사용 가능. UI/대사에서는 "Ghost" 일관 사용 권장.

---

## 8. 변경 이력

- **2026-05-10:** 이미지 자산 확정. 이전 영혼·잔영 컨셉 폐기, 4단 vertical mech 구조 산업 정찰 드론으로 재정의. 셀 크기 14×18 → 32×64 변경 (코드 측 width/height 갱신 필요).
