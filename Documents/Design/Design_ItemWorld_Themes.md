# Design_ItemWorld_Themes.md — 아이템계 5 테마 통합 디자인

> **작성 기준:** 2026-05-16 — DEC-036 (5색 기질) 정착 후 데이터 SSoT (CSV·코드·GDD) 가 분산된 시점에 *디자이너 1-페이지 참조용* 으로 신설.
> **상위 정의:** `memory/wiki/decisions/DEC-036-Memory-Shard-System.md` (5색 기질 정체성)
> **시스템 SSoT:** §6 cross-reference 참조
> **상태:** 데모 출하 직전 — V1 4 테마 노출 (Forge / Iron / Rust / Spark), Shadow 는 v1.0 정식 공개

---

## 1. 정의 (DEC-036 인용)

ECHORIS 의 *5색 기질 (Temperament)* 은 무기 Ego 의 인격을 결정하는 5축. *감정의 색* 으로 인사이드 아웃 매핑에서 가져왔으며, 모든 무기는 1차 기질을 가지고 2차 기질을 보조로 둘 수 있다 (`temperamentPrimary` + `temperamentSecondary`).

아이템계 다이브 시점에 *1차 기질* 이 룸의 fluid · 컨테이너 · hazard · 시각 톤을 결정한다 — *같은 룸 템플릿* 이 다이브할 무기에 따라 5가지 다른 룸 경험으로 분기한다.

| 기질 | 색 | 정념 | 무기 페르소나 | 룸 페르소나 |
| :--- | :--- | :--- | :--- | :--- |
| **Forge** | 주황 `#FF6633` | 분노 · 열기 | 단조의 망치 · 화염의 불꽃 | 단조 신전 — 빌더 시설의 주력 화로 |
| **Iron** | 청록 `#3E8E7E` | 결연 · 의지 | 차분한 강철 · 견고한 의지 | 냉각 격납고 — 응결수 + 응고 강철 |
| **Rust** | 회색 `#8E8678` | 체념 · 부식 | 닳아 가는 칼 · 잊혀진 도구 | 부식 라보 — 산성 + 녹슨 강판 |
| **Spark** | 흰빛 `#E8F0FF` | 호기심 · 전류 | 새 발견의 빛 · 시도의 불꽃 | 전기 회로 홀 — 전도체 함정 setup |
| **Shadow** | 자주 `#5A3A5A` | 은밀 · 잠복 | 어둠 속 단검 · 잊혀진 음모 | 잊혀진 골목 — 기름 · 산성 · 그림자 |

---

## 2. 시스템 매트릭스

### 2.1 Fluid Slot 매핑 (Generic_A / B / C → 실제 fluid)

| 기질 | Slot A (주력) | Slot B (보조) | Slot C (액센트) | 시그니처 hazard |
| :--- | :--- | :--- | :--- | :--- |
| Forge | magma | oil | water | Burn 15s (magma 첫 접촉 10% maxHp) |
| Iron | water | water | water | (hazard 약함 — 차분 톤) |
| Rust | acid | oil | water | Acid DOT (5%/s) |
| Spark | water | acid | water | Thunder 50% maxHp 단발 (전도체 함정 setup) |
| Shadow | oil | acid | water | 미끄러짐 + 점화 사슬 |

> 데이터 SSoT: `Sheets/Content_ItemWorld_FluidMapping.csv`
> 코드 mirror: `game/src/data/ItemWorldFluidMapping.ts`

### 2.2 Container Pool 가중치

| 기질 | Pool ID | 가중치 (kind:weight) | 톤 |
| :--- | :--- | :--- | :--- |
| Forge | `ItemWorld_Forge` | MagmaCrucible:4 / OilDrum:2 / Crate:1 / MetalCrate:3 | 단조 시설 화로 + 기름 |
| Iron | `ItemWorld_Iron` | Crate:4 / MetalCrate:4 / WaterBarrel:2 | 단조 강철 + 차분 water |
| Rust | `ItemWorld_Rust` | AcidVial:4 / MetalCrate:5 / Crate:2 | 산성 + 부식 강판 |
| Spark | `ItemWorld_Spark` | WaterBarrel:4 / MetalCrate:3 / Crate:3 | 전도체 setup |
| Shadow | `ItemWorld_Shadow` | Crate:5 / AcidVial:2 / OilDrum:2 | 은밀 / 부식 / 잔존 |

> 데이터 SSoT: `game/src/data/ContainerPools.ts`
> GDD: `System_World_Container.md` §12.4

### 2.3 Emergent 상호작용 (대표 예시)

| 기질 | 시그니처 emergent |
| :--- | :--- |
| Forge | MagmaCrucible 깨짐 → magma paint → 인접 OilDrum 점화 → fire chain |
| Iron | WaterBarrel 깨짐 → 침수 → metal cell 인접 → 무게 + 정적 톤 |
| Rust | AcidVial 깨짐 → MetalCrate 4초 부식 → wall 붕괴 |
| Spark | WaterBarrel 깨짐 → 침수 → MetalCrate 전도 → Thunder enchant 50% 한방 |
| Shadow | OilDrum 깨짐 → 미끄러짐 + AcidVial 의 acid 점화 setup |

---

## 3. 시각 톤 (Visual Tone)

### 3.1 Palette (parallax + ambient)

| 기질 | 배경 hue | 강조 hue | parallax tint (V2 예정) |
| :--- | :--- | :--- | :--- |
| Forge | 짙은 검 + 주황 광원 (#1A0A05 + #FF6633) | 단조 광택 (#FFBB66) | `#3A1408` |
| Iron | 청록 회색 (#1C2A2A) | 강철 광 (#7AA0A0) | `#152828` |
| Rust | 회색 사막 (#3A352D) | 산화 황 (#A0883A) | `#2A2620` |
| Spark | 청자 백광 (#1A2230) | 아크 백색 (#E8F0FF) | `#0F1A2A` |
| Shadow | 자주 검정 (#1A0F1A) | 흐릿한 자수정 (#7A5A8A) | `#1F1422` |

### 3.2 Halo (FluidSystem 자체 발광)

자체 발광 fluid (magma · lava · acid) 가 룸 톤에 추가 광원을 부여:

| 기질 | 발광 fluid 빈도 | 룸 광원 결과 |
| :--- | :--- | :--- |
| Forge | magma 풍부 | 따뜻한 광원, *대장간 화로* 톤 |
| Iron | (발광 fluid 없음) | 차분, 정적 톤 — 광원은 ambient 만 |
| Rust | acid 풍부 | 형광 녹색 광원, *실험실* 톤 |
| Spark | (acid 보조) | 약한 형광 + thunder pulse |
| Shadow | (oil 비발광) | 어두운, 광원 부재 — *그림자* 톤 |

---

## 4. 청각 톤 (Audio Direction)

> 상세: `Documents/System/System_Audio_Direction.md` + `Sheets/Content_System_Audio_Events.csv`. 본 문서는 *큐 슬롯 명세* 만.

| 기질 | BGM cue (V2 예정) | ambient SFX | 시그니처 SFX |
| :--- | :--- | :--- | :--- |
| Forge | `iw_forge_loop_01` | 화로 송풍 + 망치 멀리 | magma boil + 단조 일격 |
| Iron | `iw_iron_loop_01` | 응결수 떨어짐 + 금속 진동 | water 잔잔한 splash |
| Rust | `iw_rust_loop_01` | 산성 fizz + 녹슨 진동 | acid drip + corrode hiss |
| Spark | `iw_spark_loop_01` | 전기 hum + 회로 tick | thunder crackle |
| Shadow | `iw_shadow_loop_01` | 침묵 + 흐릿한 발자국 | oil drip + 그림자 속삭임 |

---

## 5. 내러티브 모티프

각 기질 룸은 *사라진 빌더 문명의 어느 시설* 을 모티프로 한다. 룸이 검 Ego 의 *그 결* 의 기억을 재생시키는 무대.

| 기질 | 시설 모티프 | 검 Ego 대사 (V2 어조) |
| :--- | :--- | :--- |
| Forge | 단조 신전 — 거대 빌더의 *생산의 신전* | "여기서 만들어졌다. 망치 소리가 아직도 들린다." |
| Iron | 냉각 격납고 — 식어버린 *결연의 보관소* | "차게 굳었구나. 그러나 끊어지진 않는다." |
| Rust | 부식 라보 — 산화한 *실험의 잔해* | "녹은 시간이다. 잊혀진 시도들이." |
| Spark | 전기 회로 홀 — 살아 있는 *호기심의 회로* | "여전히 흐른다. 누군가가 시도한 빛이." |
| Shadow | 잊혀진 골목 — 빛이 닿지 않은 *은밀한 통로* | "여기에 누가 있었는가. 흔적조차 흐릿하다." |

---

## 6. 데모 우선순위

데모 1차 노출은 *1차 niche 시그널이 louder* 한 4 테마 (Forge · Iron · Rust · Spark). Shadow 는 v1.0 정식 공개 — 데모에서는 trailer 안에 단 1 컷 (검의 그림자만) 노출.

| 데모 노출 | 기질 | 노출 룸 수 | 시그널 강도 |
| :--- | :--- | :-: | :--- |
| ◎ | Forge | 2~3 | BLAME!/단조 시설 신호 louder |
| ○ | Iron | 1 | 차분 톤 콘트라스트 |
| ◎ | Rust | 2 | 부식 라보 — 1차 niche 의 *시설 폐기* 톤 |
| ○ | Spark | 1 | 전기 트랩 setup 데모 |
| ✕ | Shadow | 0 (trailer 컷 1) | v1.0 정식 |

---

## 7. Cross-Reference (분산 SSoT 일람)

| 영역 | 위치 | 역할 |
| :--- | :--- | :--- |
| **5색 기질 정의 원전** | `memory/wiki/decisions/DEC-036-Memory-Shard-System.md` | 인사이드 아웃 매핑 + 정체성 |
| **Fluid 매핑 데이터 SSoT** | `Sheets/Content_ItemWorld_FluidMapping.csv` | 5×3 slot + container_pool_id |
| **Fluid 매핑 코드 mirror** | `game/src/data/ItemWorldFluidMapping.ts` | runtime 매핑 + `applyFluidGenericResolution` |
| **Container Pool 카탈로그** | `game/src/data/ContainerPools.ts` | 9 Pool (ItemWorld 5 + World 4) |
| **Fluid 시스템 GDD** | `Documents/System/System_World_Fluid.md` §3.4, §10 | Generic IntGrid + Spawner |
| **Container 시스템 GDD** | `Documents/System/System_World_Container.md` §12.4 | Pool 가중치 표 |
| **Audio 방향** | `Documents/System/System_Audio_Direction.md` | BGM/SFX 방향 |
| **Audio Event 카탈로그** | `Sheets/Content_System_Audio_Events.csv` | cue id SSoT |
| **무기 Ego (검 인격)** | `Documents/System/System_Combat_Weapons.md` | 무기-기질 결합 |
| **메모리 코어 정의** | `Documents/System/System_Memory_Core.md` | 핵심 기억 / 단편 |
| **Shadow 마을 (부분 design)** | `Documents/Design/Design_ItemWorld_Town_Shadow.md` | Shadow 한 기질 룸 사례 |

---

## 8. 갱신 규칙

1. *데이터 변경* (slot / pool / 가중치) 시 — CSV 또는 코드 카탈로그 *먼저 갱신*, 본 문서 §2 표는 *거울* 로 사후 동기화
2. *기질 정체성 변경* (색 / 정념 / 페르소나) 시 — DEC-036 갱신 후 본 문서 §1 동기화
3. *데모 우선순위 변경* 시 — §6 만 갱신, 다른 시스템 영향 없음
4. *cross-validation* 은 `gdd-integrity-checker` §15 룰이 자동 검출

---

## 9. 미해결 / 후속 카드

| 항목 | 우선순위 | 비고 |
| :--- | :--- | :--- |
| Iron slot_b *metal-flooded* 변종 도입 | V2 | 별도 fluid value 신설 vs FluidSpawner 기반 침수 — 둘 중 |
| Shadow 본격 도입 (v1.0) | v1.0 | 데모에서는 trailer 컷 1개만 |
| 2차 기질 (temperamentSecondary) 영향 | V2 | 현재는 1차만 룸 매핑. 2차는 *blend* 로 약하게 |
| Parallax tint 실제 구현 | V2 | §3.1 의 hex 가 현재 *데이터만* 있고 LdtkRenderer 측 적용은 후속 |
| BGM cue 실제 자산 | V2 | ElevenLabs 의뢰 큐 5종 (§4 cue id 기준) |
