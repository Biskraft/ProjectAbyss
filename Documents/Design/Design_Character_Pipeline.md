# ECHORIS: 캐릭터 스프라이트 파이프라인 (Aseprite + PixelLab)

## 구현 현황 (Implementation Status)

> **최근 업데이트:** 2026-04-19
> **문서 상태:** `확정 (Approved)`

| 항목 | 상태 | 비고 |
|:-----|:-----|:-----|
| 파이프라인 설계 | ✅ 확정 | Aseprite + PixelLab 2단계 워크플로우 |
| 스프라이트 사양 | ✅ 확정 | 32x32 캐릭터, side view |
| 애니메이션 목록 | ✅ 확정 | 3 Phase 우선순위 |
| 팔레트 규칙 | ✅ 확정 | Design_Art_Direction.md 참조 |

---

## 1. 파이프라인 개요

```
┌─────────────────────────────────────────────────────────────┐
│                    CHARACTER SPRITE PIPELINE                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Phase A: PixelLab — Base Generation]                       │
│   ┌────────┐    ┌─────────┐    ┌──────────┐                │
│   │Concept │───>│PixelLab │───>│ Raw PNG  │                │
│   │Prompt  │    │MCP API  │    │(32x32)   │                │
│   └────────┘    └─────────┘    └──────────┘                │
│                                      │                       │
│  [Phase B: Aseprite — Refinement & Animation]                │
│                                      ▼                       │
│   ┌──────────┐    ┌─────────┐    ┌──────────┐              │
│   │ Import   │───>│ Polish  │───>│ Animate  │              │
│   │ + Palette│    │ + Edit  │    │ + Export  │              │
│   └──────────┘    └─────────┘    └──────────┘              │
│                                      │                       │
│  [Phase C: Engine Integration]       ▼                       │
│   ┌──────────┐    ┌─────────┐    ┌──────────┐              │
│   │Spritesheet│──>│ Atlas   │───>│ PixiJS   │              │
│   │ JSON     │    │ Pack    │    │ AnimSprite│              │
│   └──────────┘    └─────────┘    └──────────┘              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 스프라이트 사양 (Spec)

| 항목 | 값 | 근거 |
|:-----|:---|:-----|
| **캐릭터 크기** | 32 x 32 px | 실제 에르다 스프라이트 기준 확정 |
| **실제 점유** | 약 16 x 28 px (캐릭터 본체) | 32x32 캔버스 내 여백 = 이펙트/무기 공간 |
| **View** | side (좌향 기본, 코드에서 flipX) | 횡스크롤 전용 |
| **Outline** | single color black outline | Art Direction 가독성 확보 |
| **Shading** | detailed shading | 48px에서 볼륨감 표현 |
| **배경** | transparent | 게임 렌더링용 |
| **팔레트** | 12-16색 (에르다 전용 팔레트) | Art Direction §4.2 팔레트 기반 |

### 에르다 팔레트 (Aseprite 팔레트 파일)

```
#3A7A7A  — 청록 작업복 (밝은)
#2A5A5A  — 청록 작업복 (어두운)
#1A4040  — 청록 작업복 (그림자)
#D46A3C  — 주황 앞치마/부츠 (밝은)
#A04A2A  — 주황 앞치마/부츠 (어두운)
#6A4A30  — 갈색 가죽 벨트
#4A3420  — 갈색 가죽 (어두운)
#D4A880  — 피부 (밝은)
#B08060  — 피부 (그림자)
#2A2020  — 머리 (흑갈)
#1A1414  — 머리 (하이라이트 없는 영역)
#FFF5E0  — 하이라이트 (단조 불꽃/금속 반사)
#0A0A0A  — 아웃라인 (순흑)
#E87830  — 고글 렌즈/이펙트 악센트
```

---

## 3. Phase A: PixelLab Base Generation

### 3.1. MCP 호출 전략

```
도구: create_character
모드: standard (1 generation) — 초안 빠르게 확인
     pro (20-40 gen) — 최종 확정 시 품질 확보

필수 파라미터:
  description: "industrial blacksmith girl, teal overalls, orange apron,
               welding goggles on forehead, utility belt with tools,
               bandana with messy short hair, industrial boots,
               megastructure worker aesthetic"
  view: "side"
  body_type: "humanoid"
  size: 32
  outline: "single color black outline"
  shading: "detailed shading"

톤 키워드 (description에 포함):
  ✅ megastructure, industrial, forge-glow, teal-orange
  ❌ gothic, dark fantasy, medieval (금지)
```

### 3.2. PixelLab 생성 → 선별 기준

| 기준 | Pass | Fail |
|:-----|:-----|:-----|
| 실루엣 명확성 | 배경 없이도 "사람"으로 인식 | 덩어리로 뭉침 |
| 팔레트 호환 | 청록+주황 2색 명확 | 제3의 주색 개입 |
| 프로포션 | 머리:몸 = 1:2.5~3 (약간 디폼) | 리얼 비율 또는 극단 SD |
| 방향 일관성 | 좌향 기준 안정 | 3/4뷰 혼재 |
| 아웃라인 | 전체 1px 흑색 아웃라인 | 아웃라인 끊김/이중선 |

### 3.3. 애니메이션 생성

```
도구: animate_character
character_id: [create_character에서 받은 ID]
animation_name: [템플릿 이름]
direction: "side"

비용 효율 전략:
  1순위: 템플릿 애니메이션 (1 gen/방향) — breathing-idle, walking, running, jumping
  2순위: 커스텀 최소 프레임 (확인 후 승인) — 공격, 피격, 스킬
```

---

## 4. Phase B: Aseprite Refinement

### 4.1. Import 워크플로우

```
[PixelLab 출력 PNG]
     │
     ▼
[Aseprite Import]
     │
     ├── 1. 캔버스 확인 (32x32)
     ├── 2. 팔레트 강제 적용 (에르다 14색 팔레트)
     │       └── Sprite > Color Mode > Indexed
     │       └── 가장 가까운 색으로 자동 매핑
     ├── 3. 아웃라인 정리 (끊김/이중 수정)
     └── 4. 서브픽셀 제거 (AA 제거, 클린 픽셀)
```

### 4.2. 수정 작업 (Polish)

| 작업 | 목적 | 소요 시간 |
|:-----|:-----|:---------|
| **팔레트 보정** | PixelLab 출력은 색수가 많음. 14색으로 축소 | 5-10분/프레임 |
| **실루엣 다듬기** | 1px 단위 형태 조정, 특히 무기/도구 | 10-15분/프레임 |
| **서브픽셀 제거** | AI가 생성하는 AA(anti-alias) 제거 | 3-5분/프레임 |
| **아웃라인 통일** | 모든 프레임 동일 아웃라인 규칙 적용 | 5분/프레임 |
| **타격점 마킹** | 공격 프레임에 히트박스 위치 표시 (레이어) | 2분/프레임 |

### 4.3. 애니메이션 보정

```
PixelLab 애니메이션 출력의 일반적 문제:
  1. 프레임 간 볼륨 변동 (떨림) → 양파 껍질로 프레임별 대조 수정
  2. 접지면 변동 → 하단 기준선(foot line) 고정
  3. 무기 위치 불일치 → 무기 별도 레이어 분리 후 재배치
  4. 타이밍 균일함 → Ease-in/out 적용 (프레임 duration 조정)

Aseprite 보정 순서:
  ① 양파 껍질(Onion Skin) ON — 전후 2프레임 비교
  ② 접지선(foot guide) 레이어 추가 — y좌표 고정 확인
  ③ 중간 프레임 수동 수정 — 실루엣 일관성
  ④ 프레임 duration 조정 — 강타(긴 체류) vs 스윙(짧은 통과)
  ⑤ 이펙트 레이어 추가 — 단조 불꽃, 잔상 등
```

### 4.4. 레이어 구조 (Aseprite)

```
[Aseprite Layer Stack — 각 애니메이션 파일]
─────────────────────────────
  fx_trail        — 잔상/이펙트 (선택적)
  fx_spark        — 단조 불꽃 파티클
  weapon          — 무기 (별도 분리, 교체 가능)
  body            — 에르다 본체
  hitbox          — 히트박스 가이드 (export 제외)
  foot_guide      — 접지선 (export 제외)
─────────────────────────────

Export 시: hitbox + foot_guide 숨기고 Flatten → PNG Sequence / Spritesheet
```

---

## 5. Phase C: Export & Engine Integration

### 5.1. Aseprite Export 설정

```
File > Export Sprite Sheet:
  Layout: Horizontal Strip (프레임 수 x 48px)
  또는: Packed (TexturePacker 호환)

  Output:
    PNG: sprites/erda/{animation_name}.png
    JSON: sprites/erda/{animation_name}.json (Array format)

  Tag 기반 Export:
    각 Tag = 하나의 애니메이션 상태
    idle, run, jump, fall, attack_1, attack_2, hurt, die...
```

### 5.2. Atlas 구조

```
sprites/
└── erda/
    ├── erda_atlas.png          — 전체 통합 스프라이트시트
    ├── erda_atlas.json         — PixiJS AnimatedSprite 호환 JSON
    ├── source/                 — Aseprite 원본 (.ase)
    │   ├── erda_idle.ase
    │   ├── erda_run.ase
    │   ├── erda_jump.ase
    │   ├── erda_attack_blade.ase
    │   └── ...
    └── pixellab/               — PixelLab 원본 보관 (raw)
        ├── erda_base_v1.png
        ├── erda_idle_raw.png
        └── ...
```

### 5.3. PixiJS Integration

```typescript
// AnimatedSprite 로드 (PixiJS v8)
const atlas = await Assets.load('sprites/erda/erda_atlas.json');
const animations = atlas.animations; // Tag별 자동 분리

const erda = new AnimatedSprite(animations['idle']);
erda.animationSpeed = 0.15;
erda.anchor.set(0.5, 1.0); // 하단 중앙 기준 (접지점)
erda.play();

// 상태 전환
function setState(state: string) {
  erda.textures = animations[state];
  erda.play();
}
```

---

## 6. 애니메이션 목록 & 우선순위

### Phase 1 (프로토타입 필수)

| 애니메이션 | 프레임 수 | PixelLab 템플릿 | 비고 |
|:-----------|:---------:|:----------------|:-----|
| **idle** | 4-6f | breathing-idle | 호흡 순환 |
| **run** | 6-8f | running-6-frames | 달리기 |
| **jump_up** | 2f | jumping-1 | 점프 상승 |
| **fall** | 2f | — (수동) | 하강 |
| **land** | 3f | — (수동) | 착지 충격 |
| **attack_1** | 4-5f | — (커스텀) | 기본 공격 1타 |
| **attack_2** | 4-5f | — (커스텀) | 기본 공격 2타 |
| **hurt** | 3f | taking-punch | 피격 |
| **die** | 5-6f | falling-back-death | 사망 |

### Phase 2 (알파 추가)

| 애니메이션 | 프레임 수 | PixelLab 템플릿 | 비고 |
|:-----------|:---------:|:----------------|:-----|
| **dash** | 3-4f | running-slide | 대시 |
| **wall_slide** | 2f | — (수동) | 벽 슬라이드 |
| **wall_jump** | 3f | — (수동) | 벽 점프 |
| **attack_3** | 5-6f | — (커스텀) | 3타 피니셔 |
| **attack_air** | 4f | — (커스텀) | 공중 공격 |
| **climb** | 6f | — (수동) | 사다리/벽 등반 |
| **crouch** | 2f | crouching | 웅크리기 |
| **interact** | 4f | picking-up | 상호작용 (대장간 등) |

### Phase 3 (베타 추가)

| 애니메이션 | 프레임 수 | PixelLab 템플릿 | 비고 |
|:-----------|:---------:|:----------------|:-----|
| **forge_strike** | 6f | — (커스텀) | 아이템계 진입 연출 |
| **emote_wave** | 6f | — (커스텀) | 코옵 인사 |
| **revive** | 8f | getting-up | 부활 |
| **mist_transform** | 6f | — (커스텀) | 안개 변신 능력 |
| **double_jump** | 3f | backflip | 이단 점프 |
| **weapon_switch** | 3f | — (수동) | 무기 교체 모션 |

---

## 7. 무기별 공격 모션 전략

### 7.1. 분리 원칙

> **무기는 body 레이어와 별도 레이어.** 같은 body 모션에 weapon 레이어만 교체하여 7 카테고리 지원.

```
공격 모션 구조:
  body_attack_swing  + weapon_blade    = Blade 공격
  body_attack_swing  + weapon_cleaver  = Cleaver 공격
  body_attack_thrust + weapon_harpoon  = Harpoon 공격
  body_attack_throw  + weapon_shiv     = Shiv 투척
  body_attack_whip   + weapon_chain    = Chain 공격
  body_attack_aim    + weapon_railbow  = Railbow 사격
  body_attack_cast   + weapon_emitter  = Emitter 발사
```

### 7.2. Body 모션 유형 (4종으로 7무기 커버)

| Body 모션 | 적용 무기 | 핵심 동작 |
|:----------|:---------|:---------|
| **swing** (수평 스윙) | Blade, Cleaver | 어깨 → 허리 회전 |
| **thrust** (찌르기) | Harpoon | 팔 전방 직선 |
| **throw/whip** (투사) | Shiv, Chain | 팔 스냅 |
| **aim** (조준) | Railbow, Emitter | 팔 전방 고정 |

### 7.3. Weapon 레이어 제작

```
각 무기 레이어 = 별도 Aseprite 파일
  weapon_blade.ase     — 직검 (24x24 내 수납)
  weapon_cleaver.ase   — 대검 (32x32, body보다 큼)
  weapon_harpoon.ase   — 작살 (32x8, 길이 강조)
  weapon_shiv.ase      — 단검 (16x16, 작음)
  weapon_chain.ase     — 쇠사슬 (가변 길이, 프레임별)
  weapon_railbow.ase   — 석궁/레일건 (24x16)
  weapon_emitter.ase   — 방출기 (24x24, 발광 이펙트)

합성: Aseprite Script 또는 수동 레이어 병합 후 Export
```

---

## 8. PixelLab 비용 최적화 전략

### 8.1. Generation 예산 배분

```
Phase 1 최소 예산:
  create_character (standard) x 3-5회     = 3-5 gen (적합한 베이스 확보)
  create_character (pro) x 1회            = 20-40 gen (최종 확정)
  animate_character (template) x 5회      = 5 gen (idle/run/jump/hurt/die)
  animate_character (custom) x 2회        = 40-80 gen (attack_1, attack_2)
  ──────────────────────────────────────
  총: 약 70-130 generations

비용 절감 방법:
  ✅ 템플릿 우선 사용 (1 gen vs 20-40 gen)
  ✅ standard로 컨셉 확인 후 pro 최소 사용
  ✅ 공격 모션은 body만 PixelLab, weapon은 Aseprite 수동
  ✅ fall/land/wall_slide 등 단순 모션은 Aseprite 수동 제작
```

### 8.2. PixelLab vs Aseprite 수동 판단 기준

| 상황 | PixelLab | Aseprite 수동 |
|:-----|:--------:|:------------:|
| 새 캐릭터 베이스 포즈 | ✅ | |
| 기본 루프 애니메이션 (idle, run) | ✅ | |
| 단순 변형 (2-3프레임, fall/land) | | ✅ |
| 복잡한 공격 모션 | △ (비용 확인) | ✅ (body만) |
| 무기 레이어 | | ✅ |
| 이펙트/파티클 | | ✅ |
| 팔레트 스왑 변형 (NPC) | | ✅ |

---

## 9. 작업 순서 (Step-by-Step)

```
━━━ Day 1: Base Character ━━━
  1. PixelLab create_character (standard) x 3 → 후보 선별
  2. 선별된 후보 → Aseprite import → 팔레트 14색 적용
  3. 실루엣/프로포션 수동 보정 (15-30분)
  4. 확정 → PixelLab create_character (pro) → 고품질 버전 확보
  5. 최종 보정 → erda_base.ase 확정

━━━ Day 2: Core Animations ━━━
  6. PixelLab animate (template): breathing-idle → Aseprite 보정
  7. PixelLab animate (template): running-6 → Aseprite 보정
  8. PixelLab animate (template): jumping → Aseprite 보정
  9. Aseprite 수동: fall (idle 프레임 변형)
  10. Aseprite 수동: land (jump 프레임 역순 + 스쿼시)

━━━ Day 3: Combat Animations ━━━
  11. PixelLab animate (custom): attack body swing → 비용 확인 후 결정
      또는 Aseprite 수동: idle→swing 중간 프레임 보간
  12. Aseprite: weapon 레이어 제작 (Blade 먼저)
  13. Body + Weapon 합성 → attack_1 완성
  14. Attack_1 변형 → attack_2 (리버스 + 변형)

━━━ Day 4: Export & Integration ━━━
  15. 전체 애니메이션 Tag 정리
  16. Spritesheet export (JSON Array)
  17. PixiJS 로드 테스트
  18. 프레임 타이밍 미세 조정 (게임 내)
```

---

## 10. 품질 체크리스트

### Export 전 확인

- [ ] 모든 프레임 32x32 동일 캔버스
- [ ] 접지점(하단) 일관 (y=47 또는 y=46)
- [ ] 팔레트 14색 이내 (인덱스드 모드)
- [ ] 아웃라인 1px 흑색, 끊김 없음
- [ ] 서브픽셀/AA 없음 (클린 엣지)
- [ ] 무기 레이어 분리 상태
- [ ] hitbox/guide 레이어 숨김
- [ ] 루프 애니메이션 첫/끝 프레임 자연스러운 연결
- [ ] 공격 프레임에 히트 타이밍 마커 (Tag 또는 레이어)

### 게임 내 확인

- [ ] 16x16 타일 그리드 위에서 스케일 적절 (캐릭터 = 2타일 높이)
- [ ] 640x360 해상도에서 가독성 확보
- [ ] flipX 시 부자연스러운 요소 없음 (비대칭 요소 확인)
- [ ] 상태 전환(idle→run→jump) 부드러움
- [ ] 배경 팔레트(청록)와 캐릭터(주황 악센트) 대비 충분

---

## 11. 의존성 (Dependencies)

| 방향 | 시스템 | 계약 |
|:-----|:-------|:-----|
| 읽음 | `Design_Art_Direction.md` | 팔레트, 캐릭터 디자인 확정안 |
| 읽음 | `System_Combat_Weapons.md` | 7 무기 카테고리, 공격 모션 요구사항 |
| 쓰기 | `sprites/erda/` | 최종 스프라이트시트 출력 |
| 쓰기 | `Content_Animation_Spec.md` | 프레임 타이밍, 히트박스 데이터 |
