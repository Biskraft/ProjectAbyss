# Rain World 아트 스타일 심층 분석 — 시각 언어 해부

> **작성일:** 2026-04-21 (2026-04-22 웹 리서치 보완)
> **목적:** Rain World의 비주얼 아이덴티티 — 팔레트, 깊이 레이어, 조명, 유기-산업 미학, 지역별 색채 시스템 — 를 기술적으로 분석하고, ECHORIS 아트 디렉션에 적용 가능한 인사이트를 도출한다.
> **관련 문서:** `RainWorld_ProceduralEffects_Research.md` (절차적 이펙트 구현 상세), `Design_Art_Direction.md` (ECHORIS 아트 바이블)
>
> **Sources:**
> - [Rain World TIGSource 개발 일지 아카이브](https://candlesign.github.io/Rain-World-Devlog/Full%20devlog)
> - [Joar Jakobsson 인터뷰 (Indie Game Enthusiast, 2014)](https://indiegameenthusiast.blogspot.com/2014/01/q-joar-jakobsson-on-rain-world.html)
> - [Road to the IGF: Rain World (Game Developer)](https://www.gamedeveloper.com/business/road-to-the-igf-videocult-s-i-rain-world-i-)
> - [GDC 2016 Animation Bootcamp: Rain World (GDC Vault)](https://www.gdcvault.com/play/1023475/Animation-Bootcamp-Rainworld-Animation)
> - [Dev on Air: Joar Jakobsson (YouTube)](https://www.youtube.com/watch?v=vlMTnuGGNxM)
> - [Rain World Shader Documentation (EtiTheSpirit, GitHub Gist)](https://gist.github.com/EtiTheSpirit/655d8e81732ba516ca768dbd7410ddf4)
> - [Level Editor — Miraheze Modding Wiki](https://rainworldmodding.miraheze.org/wiki/Level_Editor)
> - [Palettes — Miraheze Modding Wiki](https://rainworldmodding.miraheze.org/wiki/Palettes)
> - [The Architecture of Rain World (dragonpropaganda, Tumblr)](https://www.tumblr.com/dragonpropaganda/742778613420654592/the-architecture-of-rain-world-layers-of-history)
> - [Symbols and Strata — Heterotopias Zine](http://www.heterotopiaszine.com/2017/04/04/symbols-strata-rain-world/)
> - [Regions — Official Rain World Wiki](https://rainworld.miraheze.org/wiki/Regions)
> - [Five Pebbles (region) — Official Rain World Wiki](https://rainworld.miraheze.org/wiki/Five_Pebbles_(region))
> - [Shaded Citadel — Official Rain World Wiki](https://rainworld.miraheze.org/wiki/Shaded_Citadel)

---

## 1. 핵심 비주얼 철학 — Joar Jakobsson의 미학적 선택

### 1.1 기원: 두 가지 영향의 충돌

Rain World의 비주얼은 Joar Jakobsson이 두 가지 상반된 영향을 의도적으로 충돌시킨 결과다:

**영향 1 — 초기 20세기 애니메이션 (Felix the Cat, Betty Boop 시대):**
- 모노크로매틱 팔레트 — 초기에는 흑백 팔레트를 진지하게 검토
- 두꺼운 검은 윤곽선 (BlackGoo 시스템의 기원)
- 단순하고 유기적인 형태 언어

**영향 2 — 그래피티 아트:**
- 식물이 전통적 자연물이 아니라 **그래피티 장식 문양에서 형태를 차용**
- 이것이 Rain World 식물이 실제 식물보다 기이하게 보이는 이유
- 유기적이지만 인공적인, 살아있지만 기계적인 이중성

> *"모노크로매틱 팔레트는 오래된 만화 스타일에서 왔고, 많은 식물들은 그래피티 장식에서 형태를 차용했다. 원래 그래피티와 오래된 만화에 더 가까웠지만, 조금 더 현실적인 방향으로 흘러갔다."* — Joar Jakobsson [확인함]

**영향 3 — 서울 유학 경험:**
Joar는 서울 교환 학생 시절의 이방인 경험에서 핵심 컨셉을 도출했다. "맨해튼의 쥐" — 먹이를 찾고 숨는 방법은 알지만, 자신이 사는 도시 환경이 왜 만들어졌는지는 이해하지 못하는 존재. 이 철학은 비주얼에도 반영된다: 환경의 기호(글리프)는 한글과 유사한 해독 불가능한 문자로 배치되며, 이는 사이버펑크 클리셰가 아니라 Joar 자신의 서울 체험에서 비롯된 것이다. [확인함]

> *"The art style was inspired by graffiti and old cartoons... The world was actually originally intended to have more of a resemblance to the sources of inspiration, but drifted to something slightly more realistic."* — Joar Jakobsson [확인함]

### 1.2 핵심 원칙: "테라리움으로서의 게임"

Joar는 Rain World를 **"실험적 생태계를 창조하고 항해하는 테라리움"** 으로 정의했다. 이 철학은 비주얼에 직접 반영된다:

- 환경은 게임적 발판이 아니라 **실제로 존재하는 세계의 단면**
- 모든 표면에 **시간의 흔적**이 있어야 한다 (Slime, Erosion, Rust 이펙트의 이유)
- 플레이어는 이 세계의 방문자이지 이 세계를 소유하지 않는다

---

## 2. 팔레트 시스템 — 기술적 구조

### 2.1 팔레트 파일 스펙

Rain World의 모든 지역 색채는 **32x16 픽셀 PNG 파일** 하나로 정의된다.

```
팔레트 PNG 구조:
┌──────────────────────────────────┐
│  Row 0-7: SUN (주간 팔레트)        │
│    Row 0: 위쪽 면 색상 (30열)      │
│    Row 1: 중립 면 색상 (30열)      │
│    Row 2: 아래쪽 면 색상 (30열)    │
│    Row 3-7: Grime / 보조 채널      │
├──────────────────────────────────┤
│  Row 8-15: SHADE (야간 팔레트)     │
│    (동일 구조, 비 오기 직전 사용)   │
└──────────────────────────────────┘
```

**핵심 인코딩 원리:**
- **각 열 = 하나의 깊이 레이어 색상**
- 30개 열 = 30개 서브레이어 (전경~원경)
- 색상 채널 의미:
  - Blue 채널: 빛 받은 면 (lit surface)
  - Green 채널: 중립 면 (neutral surface)
  - Red 채널: 그림자 면 (shaded surface)
- **Grime 행:** 32픽셀 그래디언트 → 퍼린 노이즈 마스크에 적용 → 전체적 오염/노후 색조

### 2.2 동적 팔레트 적용 메커니즘

타일 스프라이트 자체는 RGB 채널이 별도 의미를 가진 **별도 인코딩 이미지**다. 셰이더가 런타임에 스프라이트의 RGB 값을 팔레트의 대응 색상으로 변환한다:

```
셰이더 로직 (개념):
픽셀_결과 = lerp(
  palette[SHADED_ROW][depth],   // R채널
  palette[LIT_ROW][depth],      // B채널
  lightIntensity
) * palette[GRIME_ROW] * grimeAmount
```

**결과:** 타일 그래픽 자체는 흑백에 가깝고, 팔레트 PNG 파일 하나를 바꾸면 지역 전체의 색조가 바뀐다. **팔레트 스왑이 지역 정체성을 결정한다.**

**팔레트 규모:** 베이스 게임 35개, Downpour 추가 약 10개, Watcher(2025) 추가 약 30개. 총 52개 이상의 지역이 동일한 타일 셋을 팔레트 하나로 완전히 다른 세계로 변환한다. [확인함]

### 2.2.1 "플랫 컬러" 전략과 이음새 은닉

Joar의 devlog에서 밝힌 핵심 원칙: 팔레트를 **5색 이하의 주조색**으로 극단적으로 제한한다. 이유는 "평면적 색상 패치는 인접한 필드가 같은 색일 때 이음새가 보이지 않게 된다"는 것이다. 수백 개의 콜라주 요소로 조립된 화면에서 색상 수를 제한하면, 각 요소의 경계가 자연스럽게 녹아든다. [확인함]

> *"flat patches of color blend together when neighboring fields share colors, making the joints invisible"* — Joar Jakobsson, Devlog [확인함]

### 2.3 실시간 셰이더 유니폼

| 유니폼 | 역할 |
|:-------|:-----|
| `_fogAmount` | 안개 강도 (원경 흐리게) |
| `_Grime` | 전체 오염도 % |
| `_WetTerrain` | 젖은 표면 반사도 |
| `_windAngle` | 식물 흔들림 방향 |
| `_RAIN` | 전역 타이머 (사이클 진행도) |
| `_rainDirection` | 빗방울 기울기 각도 |
| `_NoiseTex` | 퍼린 노이즈 텍스처 |
| `_PalTex` | 팔레트 텍스처 |

Rain 사이클이 진행될수록 `_WetTerrain` 값이 상승하여 모든 표면이 점점 반짝이다가, 비가 내릴 때 `_Grime`이 씻겨 내려간 효과를 낸다.

### 2.4 셰이더 프레임워크 제약 — Futile 엔진의 특성

Rain World는 Unity 위에 **Futile** 2D 프레임워크를 사용하며, 이 프레임워크의 제약이 렌더링 파이프라인 전체를 형성한다: [확인함]

- **깊이 버퍼 없음:** `ZWrite`, `ZTest` 무시. 깊이 정렬은 `FContainer` 레이어 순서 + `sortZ` 속성으로 대체
- **의사 투명(Pseudo-Transparency):** 검은 픽셀 `(0,0,0)`이 아래 레이어의 색상을 복사하여 투명 효과를 흉내냄 — 실제 알파 투명이 아님
- **조명/안개 시스템 없음:** Unity 기본 `Lighting`, `Fog` 명령이 무시됨. Rain World의 모든 조명/안개 효과는 **커스텀 셰이더 유니폼으로 수작업 구현**
- **안개(Fog) 적용 규칙:** 빨간 값이 10 이상이면 안개가 해당 픽셀에 100% 적용. 10 미만이면 빨간 음영에 비례하여 보간. 서브레이어 30(최원경)에서 가장 강하게, 전경에 가까울수록 약해짐
- **Grime 행의 무지개 줄무늬:** 팔레트의 빨간 값이 무지개 줄무늬의 오프셋을 결정하며, 이것이 Grime의 색상을 결정

### 2.5 광원과 그림자의 제약

Futile 프레임워크의 그림자 시스템: [확인함]

- 광원이 아래 오브젝트에 그림자를 투사하지만, **깊이 버퍼가 없으므로** 화면상 광원 아래의 모든 픽셀이 그림자를 생성
- 반투명 오브젝트도 그림자를 투사하여 시각적 아티팩트 발생 가능
- `LightSource`의 `sortZ`를 변경하면 그림자 계산이 깨져, 그림자가 오브젝트 뒤에 그려진 후 오브젝트가 위에 렌더링되는 결함 발생
- **셰이더는 HLSL로 작성** (Unity 표준)

---

## 3. 깊이 레이어 시스템 — 3레이어 + 30 서브레이어

### 3.1 3개 기하학 레이어

Rain World의 모든 방은 **3개의 깊이 레이어**로 구성된다:

| 레이어 | 역할 | 충돌 | 에디터 색상 | 안개 적용 |
|:-------|:-----|:-----|:-----------|:---------|
| **Layer 1** (전경) | 플레이어가 상호작용하는 실제 지형 | O | 검은색 | 없음 |
| **Layer 2** (중경) | 방의 뒷벽 | X | 초록색 | 약하게 |
| **Layer 3** (원경) | 뒷벽 너머, 하늘 또는 심연 | X | 빨간색 | 강하게 |

### 3.2 패럴랙스 동작 방식

카메라가 이동할 때 각 레이어는 다른 속도로 이동한다:
- Layer 1: 카메라와 1:1 이동 (고정)
- Layer 2: 카메라의 약 0.7배 속도 이동
- Layer 3: 카메라의 약 0.3배 속도 이동

이로 인해 **레이어 사이에 시각적 갭**이 생길 수 있다. Rain World 레벨 디자이너들은 배경 레이어 요소를 실제 방 경계 너머로 연장하여 이 갭을 숨긴다. [확인함]

**렌더링 출력 구조:** 에디터는 각 방을 "게임 오브젝트 뒤에 표시되는 이미지"와 "게임 오브젝트 앞에 표시되는 이미지"로 분리 출력한다. 이 분리 덕분에 정교한 프리렌더 환경을 실시간 성능 부담 없이 표시할 수 있다. [확인함]

### 3.3 30 서브레이어와 깊이 감

3개 레이어 안에서, 팔레트의 30개 열이 각각 다른 깊이를 정의한다. 먼 서브레이어일수록:
- **안개(fog) 적용 강도 증가** — 원경이 뿌옇게 흐려짐
- **대비(contrast) 감소** — 원경은 채도와 명도 차이가 줄어듦
- **색조 수렴** — 팔레트의 안개 색상(보통 하늘색 또는 지역의 배경색)으로 수렴

**결과:** 타일 기반임에도 실제로 깊이가 있는 3D 공간처럼 보인다. 원경이 흐릿하고 근경이 선명하므로 뇌가 깊이를 인식한다.

### 3.4 깊이 맵 (Depth Map)

배경 이미지에는 대응하는 **깊이 맵 PNG**가 존재한다:
- 동일 크기의 이미지
- 빨간색(멀음) ~ 검은색(가까움) 그래디언트
- 셰이더가 깊이 맵을 읽어 픽셀별 안개 강도를 결정
- **순수한 빨간색(1.0)을 쓰면 "더블링(doubling)" 아티팩트가 발생** — 미묘한 블러 필수 [확인함]

---

## 4. 지역별 팔레트 분석 — 색채가 서사가 된다

Rain World의 각 지역은 팔레트 하나로 완전히 다른 감정을 전달한다. 기본 타일 셋은 동일하지만 팔레트가 다르면 전혀 다른 세계처럼 느껴진다.

### 4.1 Outskirts (외곽 지대) — 시작과 회색 하늘

- **주조색:** 회색 ~ 밝은 회색 (콘크리트), 흰 구름 낀 하늘
- **배경색:** 옅은 회색 (안개), 밝은 중간 톤
- **식생:** 밝은 연두색 이끼와 풀 (유일하게 생명감 있는 색조)
- **구조물:** 녹슨 금속, 삐죽 튀어나온 철근
- **분위기:** 황량하지만 적대적이지 않음. 게임 첫인상 — 낯설지만 탐험 가능한 세계
- **조명:** 흐린 자연광. 어두운 구석 없이 비교적 고른 밝기

> **설계 원칙:** 시작 지역은 팔레트를 가장 밝게, 채도를 가장 낮게 — 플레이어가 적응하기 전 눈을 피로하게 만들지 않는다.

### 4.2 Industrial Complex (산업 단지) — 녹슨 거대기계

- **주조색:** 진한 회색-갈색 (산화 금속), 주황-갈색 녹
- **배경색:** 어두운 회색-청색 (깊은 공장 내부)
- **구조물:** 수직 타워, 교량, 높은 내부 공간 (방이 매우 "키가 큼")
- **조명:** 인공광이 주요 광원 — 주황-황색 공장 조명
- **분위기:** 위협적이나 이해 가능한 규모. "이 기계는 무엇을 만들었는가?"
- **특이점:** 지역 전체가 수직성에 특화 — 레이어 간 높이 차이가 극적

### 4.3 Garbage Wastes (쓰레기 황무지) — 뒤엉킨 혼돈

- **주조색:** 황토-갈색 (퇴적된 쓰레기), 탁한 녹색 (부패한 물)
- **배경색:** 탁한 황토 안개
- **구조물:** 쓰레기 더미가 지형 자체를 이룸. 뒤엉킨 파이프, 사체
- **조명:** 은은한 자연광이 쓰레기 틈새를 통해 들어옴
- **분위기:** 고통스럽고 혼란스럽지만 숨겨진 보물(Pearl)이 있음 — "탐색할 가치가 있는 위험"
- **물:** 웅덩이가 많음. 수면 반사가 팔레트 색상을 그대로 사용

### 4.4 Shoreline (해안선) — 광활한 열림

- **주조색:** 청회색-파란색 (대양), 은색 반짝이는 물
- **배경색:** 열린 하늘 또는 안개 낀 수평선
- **구조물:** 수중에 잠긴 파이프와 섬들
- **조명:** 가장 밝은 지역. 자연광이 수면을 반사
- **분위기:** Rain World에서 가장 개방적인 공간 — 위험하지만 아름다운 광활함
- **특이점:** 수중 구간에서 팔레트가 청색으로 전환, 수상에서는 회색 하늘

### 4.5 Shaded Citadel (어두운 성채) — 암흑과 생물발광

- **주조색:** 거의 순흑 (#0A0A0A ~ #1A1A1A)
- **배경색:** 완전한 흑색
- **광원:** 반딧불이(Fireflies) — **파란색 생물발광**이 유일한 빛
- **분위기:** Rain World에서 가장 적대적인 시각 환경. 광원 없이는 항법 불가
- **특이점:** 밝은 상부(Five Pebbles 구조물이 위에 있음)와 완전한 암흑 하부의 극적 대비
- **설계 원칙:** 팔레트의 명도를 극단적으로 낮추되, 생물발광 파란색이라는 단 하나의 강렬한 악센트로 플레이어를 유도

### 4.6 Five Pebbles (다섯 조약돌) — 살균된 임상 공간

- **주조색:** 흰색, 밝은 회색 (임상적 청결함)
- **악센트:** 밝은 파란색 (Five Pebbles의 시그니처 색)
- **구조물:** 균일한 흰색 방 격자, 바이오기계적 덩굴, 붉은 격자 물질
- **조명:** 균일한 흰색 인공광 — 그림자가 거의 없음
- **분위기:** 불안한 청결함. "이 공간은 생명체를 위해 설계되지 않았다"
- **대비:** Looks to the Moon 지역은 동일한 슈퍼구조물이지만 붉은 조명에 무너져 내리는 상태로, 같은 구조물이 다른 상태임을 팔레트로 전달

### 4.7 Subterranean (지하) — 암흑 속 기차 묘지

- **주조색:** 진한 갈색-회색 (어두운 터널)
- **배경색:** 거의 순흑
- **구조물:** 폐기된 기차, 좁은 터널, 기관실 잔해
- **조명:** 극도로 제한된 인공광. 좁은 틈새로 새는 빛
- **분위기:** 기차가 묘지가 된 절대 암흑. "이 아래에 무엇이 있는가?"
- **특이점:** 카메라 아래로 약 2화면 거리에서 배경이 커튼처럼 분해되기 시작하며, 약 7화면 아래에서 배경이 완전히 심연으로 전환. 가장 깊은 곳(The Depths)에는 사원과 신전 구조물 존재

### 4.8 Looks to the Moon (달을 바라보는 자) — 무너진 슈퍼구조물

- **주조색:** 붉은 조명 + 황녹색 과성장(overgrowth)
- **시그니처 색:** 노란색 (Light Tubes, Overseers, Inspectors)
- **구조물:** Five Pebbles와 동일한 슈퍼구조물이지만 무너져 내리는 상태
- **조명:** 붉은 비상 조명 + 노란 광원 혼합
- **분위기:** "같은 건축물이 다른 운명을 맞았다" — Five Pebbles의 청결한 흰색과 극적 대비
- **설계 원칙:** 동일 구조물 + 다른 팔레트 = 서사적 대비. 팔레트만으로 "건강한 시스템 vs 죽어가는 시스템"을 전달

### 4.9 The Watcher DLC (2025) — 31개 신규 지역의 팔레트 확장

Watcher DLC(2025.03.28)는 31개 신규 지역을 추가하며, 기존 팔레트 시스템을 대폭 확장했다:

- **새로운 환경 유형:** 번개 지대, 사구(Dunes), 진흙 구덩이, 산호 동굴, 폭풍 해안 등
- **부패(Corruption) 비주얼:** 어두운 보라색 색조 + 검은 물질이 표면을 덮음 + 검은 파티클 부유 — Rot(부패) 오염 지역의 시각 정체성
- **팔레트 수:** 기존 35개(바닐라) + Downpour 약 10개에서 Watcher 약 30개 추가. 총 52개 이상의 지역이 동일 타일 셋으로 운영
- **설계 원칙 유지:** 새 지역들도 동일한 32x16 팔레트 PNG 시스템과 3레이어 깊이 구조를 그대로 사용. 팔레트 스왑만으로 완전히 새로운 생태계를 구축

---

## 5. 유기-산업 미학 — "폐허 문명, 자연에 먹힌다"

### 5.1 시각적 레이어링의 고고학적 논리

Rain World의 환경은 **고고학적 텔(tell)** 개념을 시각화한다. 텔(Tell)은 오래된 도시 위에 새 도시가 반복해서 세워지며 생기는 언덕 — 역사가 지층으로 쌓인 구조다.

Rain World 각 지역의 배경을 자세히 보면:
- **최하층 (Layer 3 원경):** 원시적이고 가장 오래된 구조 — 거칠고 불규칙
- **중간층 (Layer 2 중경):** 산업 구조물 — 반복되는 금속 패턴
- **최상층 (Layer 1 전경):** 현재 환경 — 가장 최근의 상태, 자연에 의해 덮임

이것이 **세계관 설명 없이 비주얼로 역사를 전달**하는 방식이다. [확인함]

**구체적 예시 — Subterranean 지역:**
"현대 지하철이 고대 유적 위에 지어지고, 그 유적은 다시 태곳적 심연의 폐허 위에 세워진" 수직 지층 구조. Filtration System이 이 지층들을 수직으로 파괴적으로 관통하며, 기술적 침입이 오래된 공간을 침범한다는 것을 시각적으로 강조한다. [확인함]

**구체적 예시 — Outskirts 첫 화면:**
게임 시작 첫 방에서도 이미 고고학적 레이어링이 적용된다. "자연 동굴" 지형으로 보이는 바닥이 실제로는 벽돌 조적(Brick Masonry)으로 구성되어 있다. "바닥이 벽돌인 이유는, 바닥 자체가 과거 건물의 잔해이기 때문이다." [확인함]

### 5.1.1 Symbols and Strata — 환경이 서사를 대체하다

Heterotopias Zine의 분석(2017)에 따르면, Rain World의 세계는 "지층으로 만들어진 세계(a world made from strata)"로 정의된다. 정복된 문명이 다음 문명의 물리적 기초가 되는 구조:

- **최하층:** 대리석 사원 — 가장 원시적이고 의례적인 건축
- **중간층:** 지하 마을, 침몰한 지하철 — 산업 문명의 잔해
- **상층:** 강철과 유리의 타워 — 첨단 문명 (현재는 폐허)

이 구조는 서울의 "전통 건축과 초현대적 구조물이 공존하는 긴장감"에서 영감을 받았다. 대리석 사원이 "강철과 유리의 거대한 아이콘 아래 웅크리고 있는" 모습이 Rain World의 다층 배경에 그대로 반영된다. [확인함]

**ECHORIS 대응:** ECHORIS의 The Shaft(수직 대공동)가 이 원칙을 직접 사용. 빌더 구조물(원경/최하층)이 현 문명(중경)과 자연 침식(전경)에 의해 덮이는 삼중 레이어 구조.

### 5.1.2 "노출된 내장(Exposed Guts)" 원칙

Heterotopias Zine이 지적한 Rain World의 핵심 미학 원칙: "공장은 먼 배경의 단순한 윤곽으로 존재하지 않는다. 썩어가는 시체처럼 노출되어, 내장이 화면 전체에 쏟아져 나온다(factories don't exist just as simple outlines in the distance, but are exposed as rotting corpses, their guts spilled out across the screen)." [확인함]

이 원칙이 Rain World의 환경을 단순한 "배경"이 아니라 **물리적으로 존재하는 공간**으로 만든다. 구조물은 항상:
- 내부 구조가 보이도록 잘려 있거나 부서져 있다
- 배선/배관/기계 부품이 노출되어 있다
- 원래 용도를 추측할 수 있지만 확신할 수 없다

### 5.2 자연이 산업을 잠식하는 5가지 기법

#### 기법 1: 체인 속에 숨은 뿌리
산업 구조물(체인, 배선)과 유기체(뿌리, 덩굴)가 동일한 공간을 공유한다. 체인이 뿌리 사이를 뚫고 나오거나, 덩굴이 파이프를 감아오른다. 두 요소 중 어느 하나도 "장식"이 아니라 모두 그 공간에 "실제로 있는" 것처럼 배치된다.

#### 기법 2: 팬에 달라붙은 식물 부패
산업용 팬이나 환풍구에 식물 부패물이 막혀 있다. 기능하던 것이 기능하지 않게 되었음을 시각적으로 보여준다.

#### 기법 3: 콜로네이드에 끼어든 톱니바퀴
기둥 구조물(콜로네이드)에 기계 부품(톱니바퀴, 기어)이 박혀 있다. 원래 용도가 무엇인지 알 수 없게 만든다 — 이 세계의 기술은 이해 불가능하다.

#### 기법 4: 그래피티와 부패가 산업 환경을 덮음
벽면에 그래피티(식물 형태)와 부패 텍스처가 함께 존재한다. 이것이 Joar의 그래피티 영향이 직접 반영된 지점 — 식물이 그래피티처럼, 그래피티가 식물처럼 보인다.

#### 기법 5: 수직 필터링 시스템이 층을 뚫고 내려감
첨단 기술 구조물(Filtration System)이 여러 지층을 수직으로 관통한다. 이것은 지층 구조가 단순한 배경이 아니라 **실제 세계의 물리적 공간**임을 증명한다.

### 5.3 그래피티-식물 하이브리드 형태 언어

Rain World의 식물은 실제 식물을 참조하지 않는다. **그래피티 장식 문양**에서 형태를 가져온다:
- 극단적으로 곡선인 줄기 (그래피티 버블 레터의 곡선)
- 과장된 잎 (필체 장식의 과장)
- 팽창된 씨앗 꼬투리 (그래피티 스프레이 번짐)

**결과:** 유기적으로 보이지만 자연스럽지 않다. 살아있는 것 같지만 인공적이다. 이 이중성이 Rain World 세계의 불안한 아름다움을 만든다.

---

## 6. 조명 시스템 — 빛을 페인팅으로 만드는 방법

### 6.1 Light Editor의 작동 방식

Rain World에는 물리 기반 조명이 없다. 대신 **Light Editor**로 디자이너가 직접 빛과 그림자 영역을 페인팅한다:

- 밝은 영역과 어두운 영역을 브러시로 직접 칠함
- 팔레트의 Sun(상단) 행과 Shade(하단) 행을 각각 적용
- **조명은 타일의 셰이딩을 결정한다** — 밝은 영역의 타일은 Blue(lit) 채널 색상, 어두운 영역은 Red(shaded) 채널 색상

### 6.1.1 조명의 "살아있는" 효과

Joar의 devlog에서 밝힌 조명 기법: 구름이나 대기 변화를 시뮬레이션하여 빛 강도에 **느린 움직임(slow movement)**을 주입한다. 이로써 "정적인 레벨 그래픽에 약간의 생명감(a little bit of life)"을 부여한다. 렌더 시점에 픽셀별 레이트레이싱을 수행하므로, 한 방의 렌더 시간이 최대 7분에 달한다. [확인함]

### 6.1.2 캐러셀 그림자 (Carousel Shadows)

Heterotopias Zine이 지적한 Rain World 배경의 독특한 기법: 배경에 **애니메이션되는 캐러셀 그림자**가 존재한다. 이 그림자는 큰 구도를 작은 분석 가능한 구성요소로 분할하는 시각적 프레임을 생성한다. 끊임없는 그림자 움직임이 "거대하고 혼란스러운 미궁 속에 있다는 감각"을 만들어, 먼 경치의 낭만이 아니라 **가까이에 있는 것에 대한 경외와 공포**를 유발한다. [확인함]

### 6.2 단방향 그림자 원칙

Rain World의 그림자는 **항상 일관된 방향**에서 온다. 방 안에 여러 광원이 있더라도, 팔레트의 셰이딩 방향은 통일된다. 이것이 화면을 복잡하게 보이지 않게 만드는 핵심 원칙이다.

### 6.3 지역별 조명 특성

| 지역 | 광원 유형 | 색온도 | 특성 |
|:-----|:---------|:-------|:-----|
| Outskirts | 흐린 자연광 | 중립 백색 | 균일하고 방향성 약함 |
| Industrial Complex | 공장 인공광 | 따뜻한 주황-황색 | 강한 방향성, 고대비 |
| Garbage Wastes | 자연광 + 반사 | 탁한 황토 | 간접광, 확산 |
| Shoreline | 강한 자연광 + 수면 반사 | 차가운 청백 | 가장 밝고 하드엣지 |
| Shaded Citadel | 생물발광 | 파란색 점광원 | 극단적 명암비 |
| Five Pebbles | 인공 균일광 | 순백 형광 | 그림자 없음에 가까움 |

---

## 7. 타일 기반에서 유기적 환경을 만드는 비밀

### 7.0 렌더링 파이프라인 — "콜라주(Collage)" 방식

Joar는 이 방식을 **콜라주**로 설명한다: 손으로 그린 타일 요소들을 절차적 이펙트와 필터로 녹여 하나의 일관된 그래픽으로 만드는 것이다. 핵심 파이프라인: [확인함]

1. **Geometry Editor** — 충돌 지오메트리 (Wall/Slope/Pole) 정의
2. **Tile Editor** — 시각적 타일/머티리얼 배치. Materials를 선택하면 형태에 맞게 자동 생성
3. **Effects Editor** — 절차적 이펙트 페인팅 (BlackGoo, Slime, Erosion, 식물 등). **적용 순서가 중요** — 식물 먼저 → 침식 = 오래된 과성장, 침식 먼저 → 식물 = 죽은 식생 위 흘러내리는 점액
4. **Light Editor** — 빛/그림자 영역을 흑백으로 페인팅. 조절 가능한 광 각도와 동적 페이딩
5. **Prop Editor** — 수작업 장식물 개별 배치 (체인, 간판 등)
6. **Camera Editor** — 카메라 뷰포트 배치
7. **Render** — 최종 PNG 베이킹 출력 (1-7분 소요). 전경 이미지와 배경 이미지를 분리 출력

> *"You can change the order in which effects are applied, which will have some significance."* — Joar Jakobsson, Devlog [확인함]

**Washed-Out 미학의 기술적 근거:** Joar는 의도적으로 "washed-out" 색조를 추구한다. "수십 년간 폭우에 시달린 장소"를 표현하기 위해서다. 팔레트 색상 수를 극단적으로 제한하면 콜라주 요소들 사이의 이음새가 자연스럽게 녹아들면서, 이 "세탁된 듯한(washed-out)" 통일감이 만들어진다. [확인함]

### 7.1 "타일처럼 보이지 않는" 5가지 기법

#### 기법 1: Materials (머티리얼) — 절차적 채움
타일을 개별 배치하지 않고 **머티리얼을 선택하면 형태에 맞게 자동 생성된다.** 콘크리트, 바위, 금속 등 머티리얼이 다른 방향에서 보이는 면에 맞게 자동으로 다른 텍스처를 사용한다.

#### 기법 2: BlackGoo — 경계를 흐리는 윤곽선
방 전체를 블랙 그림자로 기본 덮고, 필요한 부분만 지운다. 타일의 격자 경계가 그림자 안에 묻혀 보이지 않는다. "방의 가장자리는 항상 어둡다" — 이것이 Rain World 화면이 동굴처럼 보이는 이유.

#### 기법 3: Slime + Erosion — 반복 패턴 파괴
동일한 머티리얼 타일이 반복 배치되면 패턴이 눈에 띈다. Slime과 Erosion 이펙트는 표면에 불규칙한 변형을 가하여 반복 패턴을 의도적으로 깨뜨린다.

#### 기법 4: 식물 이펙트 — 타일 경계를 덮음
Grower/Hanger/Clinger 식물들이 타일의 경계선(가장자리) 위에 배치된다. 규칙적인 타일 격자가 불규칙한 식물에 가려져 보이지 않는다.

#### 기법 5: Props (소품) — 수작업 디테일
절차적으로 배치하기 어려운 세밀한 요소들(체인, 간판, 특정 구조물)은 Prop Editor에서 개별 배치한다. 이것들은 완전한 수작업으로, 절차적 이펙트로 만들어진 배경과 혼합된다.

### 7.2 타일 반(半)복셀 구조

Rain World의 타일은 단순한 2D 스프라이트가 아니다:

```
타일 단위: 20 x 20 x 10 픽셀 (너비 x 높이 x 깊이)
- box 버전: 6개 면 텍스처 (빠른 렌더, 단순)
- voxel 버전: 복잡한 3D 반복 구조 (느리지만 더 입체적)
- #repeatL 속성: 레이어별 반복 횟수 정의
```

이 구조 덕분에 동일한 타일이 레이어 깊이에 따라 다르게 보인다 — Layer 1의 타일은 "두껍고" Layer 3의 타일은 "얇게" 보인다.

**복셀의 자동 효과:** Joar가 devlog에서 설명한 핵심 장점 — 반복셀 구조 덕분에 안개와 조명 같은 복잡한 효과가 "모든 특수 케이스를 계산하지 않고도 알아서 작동한다(it just works by itself)." 각 면의 방향이 이미 3D 데이터에 인코딩되어 있으므로, 셰이더가 자동으로 올바른 조명 방향을 적용할 수 있다. [확인함]

### 7.3 이펙트 컬러와 팔레트 연동

모든 이펙트(식물, 침식, 슬라임 등)는 팔레트의 **Color1**과 **Color2**를 참조한다. 팔레트 이미지를 교체하면, 동일한 이펙트 배치도 완전히 다른 색조로 렌더링된다. 추가로, 그래디언트 마스크를 통해 레이어별 2개의 이펙트 색상이 적용되어, 제한된 색상 범위 안에서도 깊이와 재질 변화를 만들어낸다. [확인함]

---

## 8. 대기 효과 — 물, 안개, 비

### 8.1 비 사이클 (Rain Cycle)

Rain World의 가장 중요한 대기 효과는 비 자체다. 시각적 구현:

- **`_RAIN` 유니폼:** 사이클 진행도 (0.0 = 맑음, 1.0 = 폭우)
- **`_WetTerrain`:** 표면 습기 → 반사도 증가, 모든 것이 빛난다
- **`_rainDirection`:** 빗방울 기울기 (바람 방향)
- **`_RainSpriteRect`:** 빗방울 스프라이트 스케일 (방 크기에 맞게 조정)
- **안개 증가:** `_fogAmount` 상승 → 원경이 점점 뿌옇게

**결과:** 비가 오기 전에 세계가 점점 습해지고, 빗물이 모든 표면을 반짝이게 만들다가, 폭우가 되면 안개로 시야가 줄어든다. 이것이 플레이어에게 "피해야 한다"는 비언어적 경고를 준다.

### 8.2 물 렌더링

물 표면은 팔레트 색상을 그대로 반사한다. 지역 팔레트의 하늘/안개 색상이 수면에 반사되어, 물이 항상 주변 환경과 자연스럽게 어울린다. 특별한 수면 셰이더 없이도 일관성이 유지된다.

### 8.3 안개 깊이 그래디언트

원경 레이어(Layer 3)에 안개를 강하게 적용하면, 먼 배경이 점점 지역 팔레트의 "배경색"으로 수렴한다. 이것이 Rain World의 배경이 깊어 보이는 주요 원인이다 — 공기원근법의 타일 기반 재현.

---

## 9. ECHORIS 아트 디렉션 적용 인사이트

> **주의:** 이하는 Rain World에서 직접 차용 가능한 기법들이며, ECHORIS의 기존 확정 아트 디렉션(`Design_Art_Direction.md`)과 모순되지 않는 범위에서만 적용한다.

### 9.1 즉시 적용 가능한 기법 (Already-Confirmed와 정렬)

| Rain World 기법 | ECHORIS 대응 | 근거 |
|:---------------|:------------|:-----|
| 팔레트 PNG 스왑으로 지역 정체성 전환 | Tier별 LUT 팔레트 (DEC-022) | 동일 원리, 이미 확정 |
| BlackGoo = 방 경계 어두운 그림자 기본값 | 모든 방 가장자리를 기본 어둡게 | Art Direction §2 "심연 흑색" 원칙과 일치 |
| Sun(주간) / Shade(야간) 팔레트 분리 | 월드(청록 배경) / 아이템계(주황 배경) 팔레트 반전 | Art Direction §3.4 "월드의 반전"과 동일 |
| 단방향 그림자 원칙 | 전체 화면 조명 방향 통일 | 가독성과 일관성 확보 |
| 3레이어 패럴랙스 + 원경 안개 | 3-5 패럴랙스 레이어 (RainWorld_ProceduralEffects §6.1) | 이미 설계됨 |

### 9.2 ECHORIS 월드 — Tier별 팔레트 설계 기준

Rain World 지역 팔레트 분석에서 도출한 Tier별 팔레트 원칙:

| Tier | 조명 유형 | 배경 안개 색 | 광원 색 | 분위기 |
|:-----|:---------|:------------|:-------|:-------|
| Tier 0 (천공의 정원) | 자연광 (유일) | 옅은 청록-백 | 따뜻한 황 | Rain World Outskirts 대응 |
| Tier 1 (중앙 성채) | 따뜻한 주황 횃불 + 인공광 | 진한 청록 안개 | 주황 (#E87830) | Industrial Complex 대응 |
| Tier 2 (묘지) | 인공광 + 반사된 빛 | 보라-회색 | 보라 (#7040A0) | Garbage Wastes 대응 (탁한 혼합) |
| Tier 3 (수로) | 수면 반사 + 인공광 | 청록 (#2A6B6B) | 청백 | Shoreline 대응 |
| Tier 4 (연구소) | 균일한 형광 | 밝은 회색 | 백색 (#F0F0F0) | Five Pebbles 대응 |
| Tier 5 (빙결 보존소) | 비상 주황등 + 빙결 반사 | 청백 (#C0D8E8) | 주황 비상등 | Shaded Citadel 반전 (밝은 기저 + 주황 악센트) |
| Tier 6 (심연의 구) | 거의 없음 — 미광 | 순흑 (#0A0A12) | 미세 청록 | Shaded Citadel 대응 |

### 9.3 아이템계 — 그래피티-유기체 원칙의 재해석

Rain World가 그래피티 문양을 식물 형태로 차용한 것처럼, ECHORIS 아이템계의 이노센트와 유기적 장식은 **다마스커스 강철 결 무늬에서 형태를 차용한다**:

- 줄기 곡선 = 다마스커스 웨이브 패턴
- 잎 형태 = 강철 결의 분기
- 씨앗 꼬투리 = 강철 기포/공극

이것이 Rain World가 "그래피티가 식물처럼 보인다"를 달성한 것처럼, ECHORIS는 "금속 결이 유기체처럼 보인다"를 달성해야 한다.

### 9.4 적용 불가 / 주의 필요 항목

| Rain World 기법 | 적용 불가 이유 |
|:---------------|:-------------|
| 반딧불이 생물발광 (Shaded Citadel) | Tier 6 이외에서는 사용 불가 — "자연 생물" 이미지가 메가스트럭처 세계관과 충돌 |
| 열린 하늘 배경 (Shoreline) | Tier 0(천공의 정원)만 하늘 가능. 나머지 Tier는 구조물 배경 필수 |
| 그래피티 문자/표지판 이펙트 | ECHORIS 세계의 문자 체계와 별도로 설계 필요 |

---

## 10. 핵심 교훈 요약

1. **팔레트 하나가 세계관을 만든다.** Rain World의 52개 팔레트(베이스 게임 12 + Downpour 10 + Watcher 30)는 동일한 타일 셋으로 52개의 다른 세계를 만든다. ECHORIS의 7 Tier + 아이템계 레어리티 팔레트도 동일 원리로 설계해야 한다.

2. **BlackGoo 원칙: 기본값을 어둡게.** "방 경계를 기본 어둡게 하고 밝은 부분만 지정"하는 역발상이 타일 게임의 최대 약점(격자 패턴 노출)을 해결한다.

3. **유기-산업 이중성은 형태 차용으로 만든다.** 자연과 기술이 "나란히 존재"하는 것이 아니라, 기술의 형태 언어로 유기체를 그리거나(Rain World: 그래피티 식물), 유기체의 형태로 기술을 그린다(ECHORIS: 다마스커스 결 유기체).

4. **깊이는 레이어 수가 아니라 안개로 만든다.** 3개 레이어만으로도 30 서브레이어의 깊이감이 나오는 것은, 원경에 지역 배경색 안개를 강하게 적용하기 때문이다. ECHORIS의 PixiJS 패럴랙스에도 원경 레이어에 AlphaFilter 또는 ColorMatrix로 안개를 적용해야 한다.

5. **조명은 방향을 통일하라.** 지역 전체의 그림자 방향을 통일하면, 복잡한 비주얼도 혼잡해 보이지 않는다. 팔레트의 Sun/Shade 행이 이것을 강제한다.

6. **역사는 레이어로 쌓인다.** Layer 3(원경)에 가장 오래된 구조, Layer 1(전경)에 가장 최근의 자연 침식을 배치하면, 세계관 텍스트 없이 수백 년의 역사를 전달한다. ECHORIS의 삼중 레이어 원칙(자연/빌더/현 문명)이 이 원리를 이미 사용한다.

---

## Sources

### 개발자 직접 발언
- [Joar Jakobsson 인터뷰 (Indie Game Enthusiast, 2014)](https://indiegameenthusiast.blogspot.com/2014/01/q-joar-jakobsson-on-rain-world.html)
- [Road to the IGF: Rain World (Game Developer)](https://www.gamedeveloper.com/business/road-to-the-igf-videocult-s-i-rain-world-i-)
- [Dev on Air: Joar Jakobsson (YouTube)](https://www.youtube.com/watch?v=vlMTnuGGNxM)
- [GDC 2016 Animation Bootcamp (GDC Vault)](https://www.gdcvault.com/play/1023475/Animation-Bootcamp-Rainworld-Animation)

### 기술 문서
- [Rain World Shader Documentation (EtiTheSpirit)](https://gist.github.com/EtiTheSpirit/655d8e81732ba516ca768dbd7410ddf4)
- [Level Editor (Miraheze)](https://rainworldmodding.miraheze.org/wiki/Level_Editor)
- [Palettes (Miraheze)](https://rainworldmodding.miraheze.org/wiki/Palettes)
- [Rain World Devlog Archive](https://candlesign.github.io/Rain-World-Devlog/Full%20devlog)

### 분석/비평
- [The Architecture of Rain World: Layers of History (dragonpropaganda)](https://www.tumblr.com/dragonpropaganda/742778613420654592/the-architecture-of-rain-world-layers-of-history)
- [Symbols and Strata (Heterotopias Zine)](http://www.heterotopiaszine.com/2017/04/04/symbols-strata-rain-world/)

### 공식 위키
- [Regions — Official Rain World Wiki](https://rainworld.miraheze.org/wiki/Regions)
- [Five Pebbles (region)](https://rainworld.miraheze.org/wiki/Five_Pebbles_(region))
- [Shaded Citadel](https://rainworld.miraheze.org/wiki/Shaded_Citadel)
- [Garbage Wastes](https://rainworld.miraheze.org/wiki/Garbage_Wastes)
- [Shoreline](https://rainworld.miraheze.org/wiki/Shoreline)

### 분석/비평 (2026-04-22 추가)
- [Symbols and Strata (Heterotopias Zine, 2017)](http://www.heterotopiaszine.com/2017/04/04/symbols-strata-rain-world/) — 환경 서사, 지층 개념, 서울 영감
- [Crafting the Complex Ecosystem of Rain World (Game Developer)](https://www.gamedeveloper.com/design/crafting-the-complex-chaotic-ecosystem-of-i-rain-world-i-) — 생태계 중심 레벨 설계
- [Joar Jakobsson Twitter (2022)](https://x.com/joar_lj/status/1525445177745317891) — 깊이 맵/하드엣지 스프라이트 제약 언급
- [Rain World: The Watcher — Unity Blog (2025)](https://unity.com/blog/exploring-procedural-design-rain-world) — Watcher DLC 절차적 디자인
- [Rain World: The Watcher — Game Rant Interview (2025)](https://gamerant.com/rain-world-watcher-dlc-interview/) — Watcher DLC 개발 인터뷰
- [Looks to the Moon (region) — Official Rain World Wiki](https://rainworld.miraheze.org/wiki/Looks_to_the_Moon_(region))
- [Subterranean — Official Rain World Wiki](https://rainworld.miraheze.org/wiki/Subterranean)
- [Rain World Shaders (Miraheze)](https://rainworldmodding.miraheze.org/wiki/Shaders) — 셰이더 시스템 기술 문서

### ECHORIS 내부 참조
- `Documents/Design/Design_Art_Direction.md` — ECHORIS 아트 바이블 (기준 문서)
- `Documents/Research/RainWorld_ProceduralEffects_Research.md` — 절차적 이펙트 구현 상세
- `Documents/Research/DeadCells_GrayscalePalette_Research.md` — 팔레트 스왑 파이프라인

---

## 11. 절차적 생성으로 Rain World 분위기를 내기 위한 추가 요소

> ECHORIS의 아이템계(완전 절차적)와 월드(핸드크래프트+절차적 혼합) 모두에 적용 가능한 요소들.
> 각 요소는 **PixiJS v8 + TypeScript** 스택에서 구현 가능한 범위로 기술한다.

### 11.1 레이어 안개 그래디언트 (Atmospheric Fog per Layer)

Rain World의 "3레이어가 30레이어처럼 보이는" 핵심 비결.

| 레이어 | 안개 강도 | 구현 |
|:-------|:---------|:-----|
| 전경 (Layer 1) | 0% | PixiJS Container, 필터 없음 |
| 중경 (Layer 2) | 30-50% | `ColorMatrixFilter` — Tier 배경색으로 saturation/brightness 이동 |
| 원경 (Layer 3) | 70-90% | `AlphaFilter(0.3)` + 배경색 단색 사각형 뒤에 합성 |

**절차적 요소:** 안개 강도를 방의 "깊이 메타데이터"(LDtk Custom Field `FogDepth: Float`)에 연동. 좁은 통로는 안개 강하게, 넓은 방은 약하게 = 공간감 자동 차별화.

### 11.2 BlackGoo 경계 비네팅 (Edge Darkness Vignette)

방의 가장자리를 기본적으로 어둡게 만들어 타일 격자 경계를 숨기는 기법.

- **구현:** 방 크기에 맞는 검은 사각형 위에 중앙이 투명한 방사형 그래디언트 마스크
- **PixiJS:** `Graphics` 사각형 + `AlphaMaskFilter` 또는 커스텀 `Filter`
- **절차적 변수:**
  - 방 크기 → 비네팅 반경 자동 조정
  - 광원 위치(LDtk Entity `LightSource`) → 비네팅 중심을 광원 쪽으로 편향
  - Tier 깊이 → 심층 Tier일수록 비네팅 강화 (Tier 6 심연은 거의 핀홀 수준)

### 11.3 퍼린 노이즈 기반 표면 오염 (Grime Overlay)

Rain World의 `_Grime` 유니폼을 재현. 동일한 타일이 매번 다르게 보이도록 만드는 핵심.

- **구현:** 타일 레이어 위에 퍼린 노이즈 텍스처를 `multiply` 블렌딩
- **절차적 변수:**
  - 방 시드(Room Seed) → 노이즈 오프셋 (같은 방은 항상 같은 오염 패턴)
  - Tier → 오염 색조 (Tier 1 녹, Tier 3 수분 얼룩, Tier 5 서리)
  - 아이템계 → 레어리티별 오염 패턴 (Normal: 부식, Legendary: 다마스커스 결)
- **성능:** 노이즈 텍스처 256x256 1장을 UV 타일링으로 재사용. 런타임 생성 비용 무시 가능.

### 11.4 식물/유기체 절차적 배치 (Organic Prop Scattering)

Rain World의 Grower/Hanger/Clinger 식물이 타일 경계를 덮는 기법.

- **배치 규칙:**
  - 벽면 상단 → Hanger (늘어지는 덩굴/체인)
  - 바닥면 가장자리 → Grower (올라오는 이끼/결정)
  - 천장 → Clinger (매달린 구조물/종유석)
- **절차적 변수:**
  - 벽 타일의 노출된 면 방향 감지 → 해당 방향에 맞는 소품 자동 배치
  - Tier별 소품 풀:
    - 월드 Tier 0-2: 이끼, 뿌리, 철근 (자연 > 산업)
    - 월드 Tier 3-4: 파이프, 케이블, 냉각관 (산업 > 자연)
    - 월드 Tier 5-6: 빙결 결정, 미광 소자 (극한 환경)
    - 아이템계: 다마스커스 결 덩굴, 금속 가시, 이노센트 알 (레어리티별)
  - 밀도 = `baseCount * (1 + tierDepth * 0.15)` — 깊은 층위일수록 침식이 심함
- **타일 경계 은닉:** 소품을 타일 경계(20px 격자선) 위에 우선 배치하여 격자 노출 방지

### 11.5 동적 습기 셰이딩 (Wet Surface Sheen)

Rain World의 `_WetTerrain` — 비가 오기 전 표면이 점점 반짝이는 효과.

- **ECHORIS 대응:** 아이템계에서 "기억의 지층이 불안정해질 때" 표면 반사 증가
- **구현:** 전경 타일에 `additive` 블렌딩 저강도 백색 하이라이트
- **절차적 트리거:**
  - 월드: 비/환경 이벤트 타이머
  - 아이템계: 보스 등장 전 경고 단계 (전경이 금속빛으로 반짝임)
  - 수중/수로 Tier: 항상 활성 (낮은 강도)

### 11.6 깊이 기반 패럴랙스 소품 (Depth-Sorted Parallax Props)

Rain World의 30 서브레이어를 간소화한 버전.

- **구현:** Layer 2(중경)와 Layer 3(원경) 사이에 2-3개 중간 소품 레이어 삽입
- **소품 종류:**
  - 대형 구조물 실루엣 (파이프, 기둥, 빌더 잔해) — 원경, 안개 강하게
  - 중형 디테일 (체인, 철근, 덩굴) — 중경 뒤, 안개 중간
  - 파티클 레이어 (먼지, 안개 입자, 미세 파편) — 전경 앞
- **절차적 배치:** 방의 빈 공간(타일이 없는 영역)을 감지 → 해당 영역의 깊이에 맞는 소품 배치
- **패럴랙스 속도:** `layer_speed = 1.0 - (depth * 0.2)` — depth 0(전경)~4(최원경)

### 11.7 단조 불꽃 파티클 (Forge Spark Particles)

Rain World에는 없지만, ECHORIS의 "대장간의 온기" 아트 디렉션에 필수적인 고유 요소.

- **월드 세이브 포인트(모루) 주변:** 주황 불꽃 파티클 상시 발생
- **아이템계 전체:** 미세 주황 불꽃이 화면 하단에서 상승 — "금속 속에 들어와 있다"
- **절차적 변수:**
  - 레어리티 → 파티클 색상 (Normal: 주황, Magic: 파란, Legendary: 금색)
  - 층(Floor) 깊이 → 파티클 밀도 증가 (깊을수록 뜨거움)
  - 보스 방 → 파티클 폭발적 증가

### 11.8 지역 팔레트 LUT 스왑 (Palette Swap via LUT)

Rain World의 32x16 팔레트 PNG를 ECHORIS 스택에 적용.

- **구현:** PixiJS `ColorMapFilter` 또는 커스텀 Fragment Shader
- **LUT 구조 (ECHORIS 버전):**
  ```
  16x16 PNG (간소화)
  Row 0-3: LIT (밝은 면) — 4단계 깊이
  Row 4-7: SHADE (어두운 면) — 4단계 깊이
  Row 8-11: GRIME (오염) — 4단계 강도
  Row 12-15: ACCENT (악센트) — 레어리티/특수 색상
  ```
- **스왑 타이밍:**
  - 월드 Tier 전환 시 → LUT 크로스페이드 (0.5초)
  - 아이템계 진입 시 → LUT 반전 (청록 → 주황)
  - 보스 등장 시 → LUT 일시적 고대비 전환

### 11.9 고고학적 레이어링 (Archaeological Layering)

Rain World의 "역사가 깊이로 쌓인다" 원칙. ECHORIS의 삼중 레이어(자연/빌더/현 문명)에 직접 대응.

- **Layer 3 (원경):** 빌더 시대 구조물 — 거대하고 기하학적, 안개에 묻혀 실루엣만
- **Layer 2 (중경):** 현 문명 구조물 — 빌더 구조물 위에 지어진 작고 불규칙한 건축
- **Layer 1 (전경):** 자연 침식 + 플레이어 지형 — 이끼, 부식, 생물 자국
- **절차적 규칙:**
  - 원경 소품은 직선/대칭 (빌더 = 정밀)
  - 중경 소품은 불규칙/비대칭 (현 문명 = 조잡)
  - 전경 소품은 유기적 곡선 (자연 = 무질서)
  - Tier가 깊어질수록 빌더 구조물 비율 증가, 현 문명 비율 감소

### 11.10 실루엣 대비 시스템 (Silhouette Contrast)

Rain World Shaded Citadel의 핵심 기법 — 어두운 환경에서 전경을 순흑 실루엣으로 처리.

- **적용 조건:** Tier 5-6 (빙결/심연) 또는 아이템계 Ancient 등급
- **구현:** 전경 레이어에 `threshold` 필터 → 일정 밝기 이하를 순흑으로 클램핑
- **광원:** 플레이어 캐릭터 주변 원형 라이트 (반경 80px) + 청록 미광
- **결과:** 지형은 순흑 실루엣, 플레이어 주변만 색상이 보이는 극적 연출

### 11.11 요소 통합 우선순위

| 순위 | 요소 | 비용 | 효과 | Phase |
|:-----|:-----|:-----|:-----|:------|
| 1 | 레이어 안개 그래디언트 (11.1) | 낮음 | 즉시 깊이감 확보 | P1 |
| 2 | BlackGoo 비네팅 (11.2) | 낮음 | 타일 격자 은닉 + 분위기 | P1 |
| 3 | 단조 불꽃 파티클 (11.7) | 낮음 | ECHORIS 고유 아이덴티티 | P1 |
| 4 | 팔레트 LUT 스왑 (11.8) | 중간 | Tier/아이템계 색상 전환 | P1 |
| 5 | 퍼린 노이즈 오염 (11.3) | 중간 | 타일 반복 패턴 파괴 | P2 |
| 6 | 유기체 절차 배치 (11.4) | 높음 | 환경 풍부함 극적 향상 | P2 |
| 7 | 깊이 패럴랙스 소품 (11.6) | 중간 | 공간 밀도 + 세계관 전달 | P2 |
| 8 | 고고학적 레이어링 (11.9) | 높음 | 비언어적 세계관 전달 | P2 |
| 9 | 동적 습기 (11.5) | 낮음 | 이벤트 시각 피드백 | P2 |
| 10 | 실루엣 대비 (11.10) | 중간 | Tier 5-6 전용 극적 연출 | P3 |
