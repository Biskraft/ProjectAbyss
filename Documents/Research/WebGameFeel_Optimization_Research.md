# 웹 게임 타격감 최적화 리서치

## 문서 정보

> **작성일:** 2026-04-06
> **문서 상태:** `리서치 완료 (Research Complete)`
> **적용 대상:** ECHORIS — PixiJS v8 + TypeScript 프로토타입
> **참조 시스템:** `System_Combat_HitFeedback.md`, `Game.ts`, `HitManager.ts`, `HitSpark.ts`, `Entity.ts`, `InputManager.ts`

---

## 0. 리서치 배경 및 목적

PA는 사쿠라이 8기법 기반 히트 피드백 시스템을 구현 완료했다 (CMB-07-A~K). 그러나 웹 브라우저라는 실행 환경은 네이티브 게임 대비 다음 세 가지 구조적 불이익을 가진다.

1. **JavaScript GC(Garbage Collection):** 매 프레임 새 객체를 할당하면 GC가 불규칙하게 수십~수백ms를 점유하며 히트스탑 타이밍을 파괴한다.
2. **requestAnimationFrame 타이밍 불안정:** 브라우저 합성 스레드와의 경쟁, 전원 절약 모드, 백그라운드 탭 스로틀링이 프레임 간격을 불규칙하게 만든다.
3. **Web Audio 레이턴시:** Howler.js가 내부적으로 사용하는 Web Audio API는 AudioContext 초기화 이후에도 OS 오디오 버퍼 스택으로 인해 30~100ms 추가 지연이 발생한다.

이 세 가지는 히트스탑(CMB-07-A), 히트 스파크(CMB-07-G), 히트 SFX(CMB-07-R~U) 각각에 직접적 영향을 준다. 본 문서는 PA 코드베이스에 구체적으로 적용 가능한 방법으로 각 문제를 분석하고 대응 체크리스트를 제시한다.

---

## 1. 브라우저 GC 히컵 — 히트스탑 타이밍 파괴

### 1.1. 문제 메커니즘

JavaScript V8 엔진의 Garbage Collector는 세대별(Generational) GC를 사용한다.

- **Minor GC (Scavenge):** Young Generation 정리. 보통 1~5ms, 프레임 중간에 발생 가능.
- **Major GC (Mark-Sweep-Compact):** Old Generation 정리. 10~100ms 이상 소요 가능. 이 구간 동안 `requestAnimationFrame` 콜백이 지연된다.

히트스탑 1프레임 = 16.67ms이다. Major GC가 50ms를 점유하면 히트스탑 3프레임이 플레이어에게 순간적으로 소멸한다. "분명히 3타를 맞췄는데 멈추는 느낌이 없었다"는 플레이테스트 피드백의 주원인이다.

### 1.2. PA 현재 구조의 취약점

`HitSpark.ts`의 `spawn()` 메서드는 히트가 발생할 때마다 `new Graphics()`를 최소 5~8개 생성한다 (중앙 플래시 1개 + 라인 스파크 4~7개). 60fps 기준 초당 수백 번의 전투가 발생하는 아이템계에서는 이것이 Old Generation으로 누적되어 Major GC를 주기적으로 트리거한다.

`DamageNumber.ts`, `ScreenFlash.ts`도 매 히트마다 새 Container/Graphics 객체를 생성한다면 동일한 압력을 준다.

### 1.3. 해결책: 오브젝트 풀링

오브젝트 풀링은 미리 할당한 객체를 재사용해 GC 압력을 제거한다. 핵심 원칙은 "create once, reuse many"이다.

**HitSparkManager 풀링 구조 (설계안):**

```typescript
// 현재: spawn() 때마다 new Graphics() 생성 → GC 압력
// 개선: 풀에서 꺼내고, 수명 만료 시 풀에 반납

interface PooledSpark extends Spark {
  inPool: boolean;
}

export class HitSparkManager {
  private pool: PooledSpark[] = [];
  private readonly POOL_SIZE = 64; // 최대 동시 스파크 수

  constructor(parent: Container) {
    this.parent = parent;
    // 사전 할당
    for (let i = 0; i < this.POOL_SIZE; i++) {
      const gfx = new Graphics();
      gfx.visible = false;
      parent.addChild(gfx); // 항상 씬에 있음, visible로만 제어
      this.pool.push({ gfx, x: 0, y: 0, vx: 0, vy: 0,
                       life: 0, maxLife: 0, inPool: true });
    }
  }

  private acquire(): PooledSpark | null {
    return this.pool.find(s => s.inPool) ?? null;
  }

  private release(spark: PooledSpark): void {
    spark.inPool = true;
    spark.gfx.visible = false;
  }
}
```

이 구조는 `new Graphics()` 호출을 게임 시작 시 단 64회로 제한한다. 이후 아이템계에서 수천 번의 전투가 발생해도 추가 GC 압력이 없다.

**추가 풀링 대상:**
- `DamageNumber` 텍스트 오브젝트 (권장 풀 크기: 32)
- `ItemDrop` 스프라이트 (권장 풀 크기: 64)
- `Projectile` 엔티티 (권장 풀 크기: 32)

### 1.4. GC 압력 측정 방법

Chrome DevTools → Performance 탭 → Record → 전투 30초 → 타임라인에서 "GC" 이벤트 확인. 목표: Minor GC < 2ms, Major GC 발생 없음.

---

## 2. requestAnimationFrame 타이밍 불안정

### 2.1. 문제 메커니즘

`requestAnimationFrame`은 브라우저의 합성(Compositor) 스레드가 준비됐을 때 콜백을 실행한다. 이상적으로는 16.67ms 간격이지만 다음 상황에서 불규칙해진다.

| 원인 | 발생 조건 | 지연 범위 |
| :--- | :--- | :--- |
| 브라우저 탭 백그라운드 전환 | `document.hidden = true` | RAF가 1fps로 스로틀링됨 |
| Windows 전원 절약 모드 | 노트북 배터리 사용 | 타이머 정밀도 15.625ms로 저하 |
| 다른 탭의 무거운 렌더링 | GPU 공유 경쟁 | +5~20ms 지연 |
| V-Sync 미스 | 한 프레임 늦게 플립됨 | +16.67ms (1프레임 통째로 누락) |
| High-DPI 디스플레이 + 낮은 GPU | 합성 비용 증가 | +3~8ms |

### 2.2. PA 현재 구조 분석

`Game.ts`의 고정 스텝 루프는 이미 핵심 문제를 올바르게 처리하고 있다.

```typescript
// Game.ts — 고정 스텝 누산기 루프 (현재 구현)
this.accumulated += ticker.deltaMS;
if (this.accumulated > MAX_ACCUMULATED) {
  this.accumulated = MAX_ACCUMULATED; // 스파이크 클램핑
}
while (this.accumulated >= FIXED_STEP) {
  if (this.hitstopFrames > 0) {
    this.hitstopFrames--;
  } else {
    this.sceneManager.update(FIXED_STEP);
  }
  this.input.update();
  this.accumulated -= FIXED_STEP;
}
const alpha = this.accumulated / FIXED_STEP;
this.sceneManager.render(alpha); // 보간 렌더
```

이 구조는 **고정 스텝 + 선형 보간 렌더** 패턴으로, 프레임레이트 변동과 물리/게임로직을 분리하는 올바른 접근이다. 다만 세 가지 개선 포인트가 있다.

### 2.3. 개선 포인트

**개선 1: 히트스탑 중 입력 처리 위치**

현재 `input.update()`가 히트스탑 분기 안쪽에서도 매 스텝 호출된다. 히트스탑 중에도 `isJustPressed` 감지가 정상 동작하므로 이 부분은 올바르다. 그러나 히트스탑 스텝에서 렌더는 실행되지 않기 때문에 히트스탑이 길 경우 `Entity.render(alpha)`의 진동 애니메이션이 멈추지 않고 매 렌더 프레임마다 계속 업데이트된다. 이것은 설계 의도(히트스탑 중 진동은 보여야 함)에 부합하므로 현 구조가 정상이다.

**개선 2: `MAX_ACCUMULATED` 값 검토**

현재 `MAX_ACCUMULATED = FIXED_STEP * 5 = 83.33ms`. 이는 5프레임 이상의 프레임 드랍이 발생했을 때 누적치를 클램핑한다. 백그라운드 탭 복귀 시 수백ms가 한꺼번에 누산되어 "프레임 버스트"가 발생하는 것을 방지한다. 적절한 값이다.

**개선 3: 백그라운드 탭 복귀 감지**

```typescript
// 추가 권장: 백그라운드 복귀 시 누산기 강제 리셋
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    this.accumulated = 0; // 복귀 순간 누산 버림
  }
});
```

이것이 없으면 30초 백그라운드 후 복귀 시 `MAX_ACCUMULATED` 클램핑이 작동하기 전에 한 프레임에 5틱이 몰려 히트스탑, 타이머, 애니메이션 등이 일시적으로 불규칙해진다.

현재 `InputManager.ts`에는 이미 `document.visibilitychange`로 키 상태 리셋이 있다. 같은 이벤트에서 `accumulated` 리셋을 추가하면 된다.

---

## 3. 키보드 입력 레이턴시 — 웹 vs 네이티브

### 3.1. 문제 메커니즘

웹 브라우저의 키보드 입력 경로는 네이티브보다 두 단계 더 길다.

```
[물리 키보드]
    ↓ OS 드라이버 (~1ms)
    ↓ OS 키 이벤트 큐 (~1-2ms)
[네이티브 게임은 여기서 직접 폴링]
    ↓ 브라우저 메인 스레드 이벤트 루프
    ↓ JavaScript keydown 이벤트 콜백
    ↓ 다음 RAF에서 게임 루프가 처리
[웹 게임은 여기서 처리]
```

총 추가 지연: **5~15ms** (브라우저 메인 스레드 이벤트 루프 큐 대기 시간). 120Hz 모니터에서 1프레임(8.33ms)을 초과할 수 있다.

### 3.2. PA 현재 구조 분석

`InputManager.ts`는 이미 두 가지 최적화를 적용하고 있다.

1. **캡처 단계 우선순위:** `addEventListener('keydown', handler, true)` — `true`는 캡처 단계로, 버블링 단계보다 먼저 실행된다. 다른 DOM 리스너보다 앞서 처리된다.
2. **IME 차단:** 한국어 Windows IME가 Z/X/C를 가로채는 문제를 canvas focus + `inputmode='none'`으로 차단.

이미 브라우저에서 가능한 최적 입력 처리를 하고 있다.

### 3.3. 추가 개선 포인트

**점프 버퍼와 어택 큐의 의미 재확인**

PA의 점프 버퍼(250ms)와 어택 큐(`attackQueued` 플래그)는 단순히 편의 기능이 아니다. 이것들은 **입력 레이턴시 보상 메커니즘**이다. 플레이어가 시각적으로 "착지 직전"에 점프를 누르면 5~15ms 입력 지연으로 인해 착지 프레임을 놓칠 수 있다. 버퍼가 이를 흡수한다.

현재 점프 버퍼 250ms는 관대한 편이다. Celeste는 6프레임(100ms), Hollow Knight는 5프레임(83ms)을 사용한다. PA가 타이트한 조작감을 목표로 한다면 150ms로 줄이되, 플레이테스트로 검증하는 것을 권장한다.

**`isJustPressed` 폴링 방식의 한계**

현재 `isJustPressed`는 고정 스텝 루프에서 폴링한다. `keydown` 이벤트가 두 스텝 사이 16ms 어딘가에서 발생하면, 최악의 경우 다음 스텝까지 약 16ms를 더 기다린다. 이론적 최대 입력 레이턴시: 16ms(프레임 시작 직후 키 누름) + 브라우저 이벤트 지연 15ms = **31ms**. 이는 실제로는 크게 눈에 띄지 않지만, 히트스탑이 1~2프레임일 때 타이밍 불일치로 "공격이 씹혔다" 느낌을 줄 수 있다.

**게임패드 폴링 (미래 고려사항)**

Gamepad API는 이벤트 기반이 아닌 폴링 방식(`navigator.getGamepads()`)으로, RAF 콜백 내에서 직접 호출하면 이벤트 큐 지연 없이 최신 상태를 얻는다. 키보드보다 오히려 더 낮은 레이턴시를 달성 가능하다.

---

## 4. 가변 프레임레이트 환경에서 프레임 퍼펙트 히트스탑 구현

### 4.1. "프레임 퍼펙트"의 정의 재설정

60fps 기준으로 히트스탑 1프레임 = 16.67ms이다. 그러나 웹 환경에서 "프레임 퍼펙트"는 네이티브와 다른 의미이다. **중요한 것은 히트스탑의 시각적 지속 시간이 설계값과 일치하는 것이지, 정확히 16.67ms마다 업데이트되는 것이 아니다.**

### 4.2. PA의 현재 히트스탑 구현 평가

```typescript
// Game.ts — 히트스탑 처리 (현재)
while (this.accumulated >= FIXED_STEP) {
  if (this.hitstopFrames > 0) {
    this.hitstopFrames--;
  } else {
    this.sceneManager.update(FIXED_STEP);
  }
  this.input.update();
  this.accumulated -= FIXED_STEP;
}
```

이 구현은 올바르다. 히트스탑은 게임 논리 스텝을 건너뛰는 방식으로 구현되어 있어, 실제 경과 시간과 독립적으로 "N 게임 프레임"을 정확히 멈춘다. 브라우저 프레임 드랍이 발생해도 누산기가 따라잡을 때 히트스탑 프레임 카운트를 소진하므로 시각적 지속 시간은 유지된다.

**주의점: 히트스탑 중 진동 렌더링**

히트스탑 중에도 `render(alpha)` 는 호출된다. `Entity.render()`의 진동 로직은 `vibrateFrames`를 기반으로 하는데, 진동 프레임 감소는 게임 스텝(`update()`)이 아닌 렌더(`render()`) 내에서 일어나고 있을 가능성이 있다. 확인 필요: `vibrateFrames` 감소 위치가 `Entity.render()` 내라면, 히트스탑 중에도 진동이 정상 소진된다 (설계 의도에 부합). 만약 `update()` 내에서 감소한다면 히트스탑 중 진동이 멈추는 버그가 있다.

### 4.3. 30fps에서 히트스탑이 작동하는가?

결론: **작동하지만 체감이 다르다.**

30fps 환경(저사양 PC, 모바일)에서 히트스탑 1프레임 = 33.33ms로 늘어난다. 현재 설계값(1타 3프레임 = 50ms)은 30fps에서 약 100ms가 된다. 이는 너무 긴 정지감을 줄 수 있다.

**권장 접근:** 히트스탑 설계값을 "프레임" 단위가 아닌 "ms" 단위로 전환하는 것을 고려할 수 있다.

```typescript
// 현재: 프레임 단위 (60fps 종속)
hitstopFrames: 3  // = 50ms at 60fps, = 100ms at 30fps

// 개선안: ms 단위 (프레임레이트 독립)
hitstopMs: 50     // 항상 50ms 정지

// Game.ts 변경
let hitstopMs = 0;
// ...
while (this.accumulated >= FIXED_STEP) {
  if (hitstopMs > 0) {
    hitstopMs = Math.max(0, hitstopMs - FIXED_STEP);
  } else {
    this.sceneManager.update(FIXED_STEP);
  }
  // ...
}
```

그러나 현재 PA가 60fps 고정 스텝을 타겟으로 설계되어 있고 `FIXED_STEP = 1000/60`이 하드코딩되어 있으므로, 30fps 지원을 명시적으로 목표하지 않는다면 프레임 단위 유지가 더 단순하다. 이 결정은 게임 디자이너와 협의 사항이다.

---

## 5. 히트 스파크/파티클 오브젝트 풀링 전략

### 5.1. 현재 구조의 GC 비용 측정

`HitSpark.ts`의 `spawn()` 1회 호출 비용:
- `new Graphics()` × 5~8개
- `this.parent.addChild()` × 5~8회 (씬 트리 변경)
- 180ms 후 `removeChild()` × 5~8회 + 배열 `splice()`

아이템계에서 초당 10히트가 발생하면: 초당 50~80개의 Graphics 객체 생성/파괴. 분당 3,000~4,800개. V8은 약 1MB의 Young Generation 공간을 소진하면 Minor GC를 발동한다. Graphics 객체 하나의 메모리 크기를 보수적으로 500 bytes로 추산하면 약 2,000개마다 Minor GC가 발생한다 — 즉 약 30초마다 GC 히컵이 발생한다.

### 5.2. 풀링 설계 원칙

**원칙 1: addChild/removeChild 하지 않는다**

씬 트리 변경은 GPU 배치 재계산을 유발한다. 풀링에서는 모든 파티클을 씬 트리에 영속적으로 추가한 상태로 `visible = false`/`true`로만 제어한다.

**원칙 2: Graphics.clear() + 재드로잉은 비용이 있다**

Graphics 명령어를 매 스파크마다 재작성하는 것은 GPU 버퍼 업로드 비용이 있다. 스파크 종류(라이트/헤비, 중앙 플래시/라인)를 미리 그려 고정한 뒤 위치/스케일/알파만 변경하는 것이 이상적이다.

**원칙 3: 스파크 타입별로 풀을 분리한다**

- `FlashPool`: 중앙 플래시용 Graphics 풀 (8개)
- `SparkPool`: 라인 스파크용 Graphics 풀 (56개)

총 64개로 동시에 발생 가능한 스파크(헤비 기준 8개 × 최대 8세트 = 64개)를 커버한다.

**원칙 4: DamageNumber 텍스트도 풀링 대상이다**

PixiJS의 `Text` 객체는 Canvas API를 호출해 텍스처를 생성하므로 `Graphics`보다 훨씬 무겁다. 데미지 숫자는 반드시 풀링되어야 한다. 풀 크기 16~32개면 충분하다.

### 5.3. PixiJS v8 ParticleContainer 활용 검토

PixiJS v8의 `ParticleContainer`는 동일한 텍스처를 가진 수천 개의 스프라이트를 단일 드로우 콜로 렌더링한다. 히트 스파크를 별도 스프라이트시트 텍스처로 만들고 `ParticleContainer`에 넣으면 드로우 콜 최소화가 가능하다.

단, 현재 PA의 스파크는 절차적으로 그린 `Graphics`이므로 `ParticleContainer` 적용을 위해서는 스파크를 사전 렌더링된 스프라이트로 전환해야 한다. Phase 2 스프라이트 통합 시 함께 고려할 수 있다.

---

## 6. Web Audio API 레이턴시 — Howler.js 특이사항

### 6.1. 레이턴시 발생 구조

Web Audio API의 오디오 경로:

```
[JavaScript 코드에서 재생 명령]
    ↓ AudioContext 스케줄링 (~1ms)
    ↓ AudioWorklet/ScriptProcessor 처리
    ↓ OS 오디오 드라이버 버퍼
    ↓ 하드웨어 출력
```

일반적인 레이턴시: **20~80ms** (Windows 기준). Mac은 10~30ms, Linux는 5~15ms.

이 레이턴시의 주원인은 OS 오디오 드라이버 버퍼 크기다. WASAPI(Windows)는 기본 버퍼가 10~30ms이며 안전 마진을 추가하면 실제 체감 지연은 더 길다.

### 6.2. Howler.js의 구체적 이슈

**이슈 1: AudioContext 사용자 제스처 요구**

브라우저 정책상 `AudioContext`는 사용자 인터랙션(클릭, 키 누름) 이후에만 활성화된다. 게임 시작 전 반드시 `AudioContext.resume()`을 호출해야 한다. Howler는 내부적으로 이를 처리하지만, 첫 번째 사운드 재생 시 `AudioContext`가 `suspended` 상태라면 재생이 누락된다.

**이슈 2: 스프라이트 레이어 병렬 재생 제한**

Howler의 `AudioSprite`는 단일 오디오 파일의 구간을 나눠 재생하는 방식이다. 동일 스프라이트에서 여러 채널을 동시에 재생하는 경우, Howler가 내부적으로 새 `AudioBufferSourceNode`를 생성하므로 GC 압력을 줄 수 있다. 타격 SFX (L12~L15 레이어)의 경우 스프라이트 방식보다 미리 로딩된 `Howl` 인스턴스를 여러 개 풀로 관리하는 것이 더 안정적이다.

**이슈 3: 레이턴시 보상 스케줄링**

Web Audio API는 미래 시점을 지정해 재생을 예약할 수 있다 (`AudioBufferSourceNode.start(when)`). Howler.js는 이 기능을 직접 노출하지 않지만, `Howler.ctx`를 통해 내부 AudioContext에 직접 접근할 수 있다.

```typescript
// Howler 우회 스케줄링 (고급 최적화)
const ctx = Howler.ctx;
const source = ctx.createBufferSource();
source.buffer = preloadedBuffer;
source.connect(ctx.destination);
// 현재 AudioContext 타임에서 5ms 후 재생 (레이턴시 일부 보상)
source.start(ctx.currentTime + 0.005);
```

### 6.3. 히트 SFX 레이턴시 보상 전략

PA의 CMB-07-T는 "피격 반응 SFX에 +30~50ms 지연"을 설계한다고 명시되어 있다 (Dead Cells 3레이어 구조). 이것은 사실 웹 오디오 레이턴시를 의도적으로 활용하는 패턴이다.

- **L12 임팩트 SFX**: 히트 프레임에 즉시 트리거 → 실제 재생은 20~40ms 후 (OS 레이턴시)
- **L13 슬래시 SFX**: 공격 동작 시작에 트리거 → 히트보다 먼저 들림 (의도적)
- **L14 피격 반응 SFX**: 임팩트로부터 30~50ms 지연 트리거 → OS 레이턴시 포함 50~90ms 후 실제 재생

이 3레이어가 자연스럽게 분리되어 들리려면 총 레이턴시가 일정해야 한다. Howler의 레이턴시가 플랫폼마다 다른 문제는 `AudioContext.currentTime`을 기준으로 상대적 스케줄링을 사용해 보상한다.

**실용적 권장:** 먼저 Howler의 기본 API로 구현하고, 플레이테스트에서 "소리와 시각 효과가 따로 논다" 피드백이 나오면 AudioContext 직접 스케줄링으로 전환한다.

---

## 7. Canvas/WebGL 렌더링 파이프라인과 체감 반응성

### 7.1. GPU 커맨드 버퍼와 프레임 레이턴시

WebGL은 JavaScript에서 `gl.draw*()` 호출 시 실제로 즉시 픽셀을 그리지 않는다. GPU 커맨드 버퍼에 명령을 쌓고, 브라우저 합성 스레드가 `requestAnimationFrame` 완료 후 화면에 플립(swap)한다. 이 파이프라인은 최소 1프레임(16.67ms)의 디스플레이 레이턴시를 항상 추가한다.

**의미:** 플레이어가 공격 버튼을 누른 시점부터 화면에 공격 모션이 보이는 시점까지는 이론적으로 최소 16.67ms(1프레임)의 지연이 있다. 이것은 웹게임의 구조적 한계이며 제거 불가능하다.

### 7.2. PA의 RenderTexture 렌더링 이중 패스 비용

`Game.ts`는 줌 구현을 위해 이중 렌더 패스를 사용한다.
1. `gameContainer` → `worldRT` (1x 해상도)
2. `worldRT` 스프라이트 → 실제 화면

이는 정확한 픽셀 줌을 위한 필수 선택이다. 그러나 두 번째 드로우 패스의 GPU 비용은 미미하므로 체감 반응성에 영향이 없다.

### 7.3. PixiJS Ticker vs 수동 RAF

PA는 PixiJS `Ticker`를 사용한다. PixiJS v8의 `Ticker`는 내부적으로 `requestAnimationFrame`을 래핑하며, 기본적으로 `Ticker.maxFPS = 0` (무제한)이다. 수동 RAF와 체감상 차이는 없다.

**Ticker 주의사항:** `ticker.add()` 콜백에서 무거운 작업을 하면 프레임 드랍이 발생한다. 현재 PA의 `ticker.add()` 콜백은 누산기 루프 + 렌더 호출로 제한되어 있어 올바른 구조다.

### 7.4. `imageRendering: pixelated` CSS 속성

`Game.ts`의 `handleResize()`에서 캔버스에 `imageRendering: pixelated`를 적용한다. 이는 브라우저 CSS 스케일링 시 픽셀아트 블러 방지에 필수이며, 렌더링 퀄리티에는 영향이 있지만 레이턴시에는 영향이 없다.

---

## 8. 성공적인 웹 액션 게임 사례 분석

### 8.1. Vampire Survivors (웹 버전)

Vampire Survivors의 웹 버전은 Steam 버전과 동일한 JavaScript 코드베이스(Phaser 엔진)를 사용한다. 타격감 전략의 핵심은 **피드백을 시각과 오디오에 집중시키고 히트스탑을 사용하지 않는다**는 것이다. 수천 마리의 적이 동시에 존재하는 게임에서 히트스탑은 오히려 흐름을 방해하기 때문이다.

PA의 야리코미 파밍 루프는 Vampire Survivors보다는 Dead Cells에 가깝고, 히트스탑이 핵심 타격감이므로 이 비교는 참조 정도로만 활용한다.

**얻을 수 있는 인사이트:**
- 대량의 파티클/이펙트를 `ParticleContainer`로 단일 배치 렌더
- 적 수가 많아도 드로우 콜을 50 이하로 유지하는 스프라이트 배칭

### 8.2. CrossCode (원래 웹 기반, Electron으로 이전)

CrossCode는 임팩트 15 엔진(JavaScript 커스텀 엔진)으로 개발되었다가 이후 Electron으로 이전했다. 타격감의 핵심은 **적의 피격 애니메이션(충격파 스프라이트)이 히트스탑보다 더 큰 역할을 한다**는 것이다. 히트스탑 자체는 매우 짧고, 대신 피격체의 흰색 플래시 + 충격 방향으로 기울어지는 스프라이트 변형이 타격감을 만든다.

**얻을 수 있는 인사이트:**
- 스프라이트 스쿼시/스트레치(Squash & Stretch)가 히트스탑을 보완한다
- 피격체의 물리적 반응(각도 기울임, 스케일 변형)은 웹 환경에서도 CPU 부담 없이 구현 가능

이것은 PA의 CMB-07-L(적 무게 클래스별 넉백 계수) 구현 시 고려할 수 있다.

### 8.3. Pico-8 게임들

Pico-8은 128x128, 30fps 환경이다. 타격감 전략:
- **히트스탑 없음** (30fps에서 1프레임 = 33ms, 너무 굵어서 오히려 어색함)
- **색상 반전 1프레임**으로 히트 표시 (팔레트 교체)
- **사운드 큐만으로 충분한 타격감 전달**

**PA에 대한 시사점:** 30fps 환경에서는 히트스탑 대신 더 강한 화면 플래시 + 사운드로 보상하는 것이 더 자연스럽다. 60fps 타겟을 유지하는 한 현재 설계가 적합하다.

---

## 9. PixiJS v8 최적화

### 9.1. 배치 렌더링 (Batch Rendering)

PixiJS v8는 동일한 텍스처를 사용하는 스프라이트를 자동으로 배칭한다. 단, Graphics 객체는 배칭되지 않는다 — 각 Graphics는 별도의 드로우 콜을 발생시킨다.

**현재 PA의 드로우 콜 현황:**
- 플레이어 스프라이트: `Graphics` (배칭 불가)
- 히트 스파크: `Graphics` 5~8개 (배칭 불가, 각각 별도 드로우 콜)
- 데미지 숫자: `Text` (배칭 불가)
- 타일맵: `@pixi/tilemap` (배칭 가능)

플레이어와 적 스프라이트가 스프라이트시트 기반 `Sprite`로 전환되면(Phase 2), 자동 배칭으로 드로우 콜이 대폭 감소한다. 현재 프로토타입 단계에서는 Graphics 사용이 허용 가능하다.

### 9.2. RenderTexture 재사용

`Game.ts`는 이미 `worldRT`를 싱글톤으로 유지하고 크기 변경 시에만 재생성한다. 이것이 올바른 RenderTexture 재사용 패턴이다.

**히트 스파크에 RenderTexture 적용 (고급 최적화):**

복잡한 스파크 이펙트를 한 번 `RenderTexture`에 오프스크린 렌더링하고, 이후 `Sprite`로 재사용하면 드로우 콜을 줄일 수 있다. 단 스파크마다 방향/색상이 다르므로 실용적이지 않다. 이 최적화는 Phase 2 이후 스프라이트 통합 시 고려한다.

### 9.3. Ticker vs 수동 RAF — PA에서의 권장

수동 RAF (`requestAnimationFrame(() => { ... })`)와 PixiJS Ticker는 성능 차이가 없다. Ticker가 더 편리하며 PixiJS 내부 배치 플러시 타이밍을 자동으로 관리하므로 PA는 Ticker 유지가 권장된다.

**Ticker 설정 최적화:**

```typescript
// 권장 추가 (Game.ts init 내부)
this.app.ticker.maxFPS = 60; // 60fps 이상 렌더 불필요 (배터리 절약)
```

현재 무제한(`maxFPS = 0`)으로 실행되면 240Hz 모니터에서 초당 240번 렌더가 발생한다. 게임 로직은 60fps 고정이므로 렌더만 낭비된다. `maxFPS = 60`으로 제한하면 배터리 소모와 GPU 발열을 줄인다.

단, 이 변경은 화면이 약간 덜 부드럽게 보일 수 있다. 75Hz, 90Hz, 120Hz 디스플레이 사용자는 실제 주사율을 활용하지 못한다. `maxFPS = 0` 유지와의 트레이드오프를 설계자와 협의해야 한다.

---

## 10. 프레임 드랍 은폐 기법 (Interpolation, Catch-up Frames)

### 10.1. 선형 보간 렌더 (현재 구현)

`Game.ts`의 `render(alpha)` 패턴은 이미 선형 보간을 구현한다.

```typescript
const alpha = this.accumulated / FIXED_STEP;
this.sceneManager.render(alpha);
```

`Entity.render(alpha)`에서 `prevX + (x - prevX) * alpha`로 현재 프레임의 서브-스텝 위치를 보간해 렌더링한다. 30fps로 드랍되어도 엔티티 움직임이 부드럽게 보이는 것은 이 보간 덕분이다.

### 10.2. 프레임 드랍 은폐의 한계

**히트스탑 중 보간은 역효과를 낼 수 있다.** 히트스탑 중 게임 스텝은 진행되지 않으므로 `prevX == x`이며 `alpha`값과 무관하게 엔티티가 같은 위치에 렌더된다. 진동만 `render()` 내부 로직으로 처리되므로 문제없다.

**"캐치업 프레임" 패턴의 위험성:**

일부 엔진은 드랍된 프레임을 보상하기 위해 다음 프레임에서 더 많은 논리 스텝을 실행(catch-up)한다. PA의 `MAX_ACCUMULATED = FIXED_STEP * 5` 클램핑이 이미 제한적인 캐치업을 허용한다. 이를 더 공격적으로 늘리면(예: ×10) 연속 드랍 후 복귀 시 게임이 순간적으로 빠르게 보이는 느낌을 준다. 현재 ×5 설정은 적절한 보수적 값이다.

---

## 11. 브라우저 스로틀링 감지 및 보상

### 11.1. 백그라운드 탭 스로틀링

Chrome과 Firefox는 비가시 탭의 `requestAnimationFrame`을 최대 1fps로 제한한다. `document.visibilitychange` 이벤트로 감지한다.

```typescript
// 권장 추가: 탭 복귀 시 누산기 리셋 (Game.ts)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    this.accumulated = 0;
    // Ticker의 내부 deltaMS도 리셋 필요
    // (PixiJS Ticker는 자동으로 deltaTime 클램핑을 하므로 대부분 문제없음)
  }
});
```

### 11.2. 전원 절약 모드 감지

Windows 배터리 절약 모드에서는 타이머 정밀도가 15.625ms로 저하된다. `performance.now()`의 반환값이 15.625ms 단위로 계단 형태가 되는 것으로 감지할 수 있다.

```typescript
// 개발/디버그용 감지 (프로덕션에서는 제거)
let lastT = performance.now();
requestAnimationFrame(function detect() {
  const t = performance.now();
  const delta = t - lastT;
  if (Math.abs(delta - 15.625) < 1) {
    console.warn('Low-res timer mode detected (battery saver?)');
  }
  lastT = t;
});
```

실용적 대응: 전원 절약 모드에서 히트스탑 타이밍이 약간 부정확해지는 것은 허용하고, 시각적 피드백(진동, 플래시)으로 보완한다. 타이머 정밀도 문제는 코드로 완전히 해결 불가능하다.

### 11.3. 고주사율 디스플레이에서 Ticker 동작

144Hz, 240Hz 디스플레이에서 `ticker.deltaMS`가 약 7ms, 4ms로 줄어든다. 고정 스텝 누산기 구조이므로 게임 로직에는 영향이 없다. 단, 렌더가 더 자주 호출되어 불필요한 GPU 부담이 생긴다. `maxFPS = 60` 설정으로 해결 가능하다.

---

## 12. 체크리스트 — PA 전투 타격감 최적화 (실행 가능 항목)

우선순위 기준: **P0** = 즉시 수정, **P1** = 다음 스프린트, **P2** = Phase 2 이후

### 12.1. P0 — 즉시 수정 권장

| ID | 항목 | 근거 | 예상 대상 파일 |
| :--- | :--- | :--- | :--- |
| OPT-01 | 백그라운드 탭 복귀 시 `accumulated = 0` 리셋 | 복귀 시 5틱 몰림으로 타이머/히트스탑 불규칙 | `Game.ts` |
| OPT-02 | `ticker.maxFPS = 60` 설정 | 고주사율 디스플레이에서 불필요한 렌더 60~240회/초 낭비 | `Game.ts` |
| OPT-03 | `Entity.render()`의 `vibrateFrames` 감소 위치 확인 | `update()` 내 감소라면 히트스탑 중 진동이 멈추는 버그 가능 | `Entity.ts` |

### 12.2. P1 — 다음 스프린트

| ID | 항목 | 근거 | 예상 대상 파일 |
| :--- | :--- | :--- | :--- |
| OPT-04 | `HitSparkManager` 오브젝트 풀링 (64개 사전 할당) | 아이템계 장기 파밍 시 30초마다 GC 히컵으로 히트스탑 파괴 | `HitSpark.ts` |
| OPT-05 | `DamageNumber` 오브젝트 풀링 (32개) | Text 객체 생성이 Graphics보다 무거움 | `DamageNumber.ts` |
| OPT-06 | Howler.js `AudioContext` 사전 활성화 확인 | 첫 히트 시 AudioContext suspended로 SFX 누락 가능 | `AudioManager.ts` (구현 시) |
| OPT-07 | 히트 SFX L12~L15 레이어 Howl 인스턴스 풀링 | 스프라이트 방식 다채널 재생 시 GC 압력 | `AudioManager.ts` (구현 시) |

### 12.3. P2 — Phase 2 이후

| ID | 항목 | 근거 | 예상 대상 파일 |
| :--- | :--- | :--- | :--- |
| OPT-08 | 플레이어/적 스프라이트 → `Sprite` + 스프라이트시트 전환 | 현재 `Graphics` 기반은 배칭 불가 → 드로우 콜 절감 | `Player.ts`, `Enemy.ts` |
| OPT-09 | 히트 스파크 → `ParticleContainer` + 사전 렌더 스프라이트 | 배칭으로 스파크 드로우 콜 8개 → 1개 | `HitSpark.ts` |
| OPT-10 | 히트스탑을 ms 단위로 전환 (`hitstopMs` 대신 `hitstopFrames`) | 30fps 지원 시 프레임 단위는 지속 시간이 2배로 늘어남 | `Game.ts`, `HitManager.ts` |
| OPT-11 | 게임패드 Haptics API 구현 | 키보드 환경에서 불가능한 촉각 피드백 (컨트롤러 플레이어 대상) | `InputManager.ts` |
| OPT-12 | Web Audio API 직접 스케줄링 (Howler 우회) | "소리와 시각 효과가 따로 논다" 피드백 발생 시 | `AudioManager.ts` (구현 시) |
| OPT-13 | Chrome DevTools Memory 프로파일로 풀링 효과 검증 | Young Gen 할당 속도 및 Major GC 빈도 측정 | 개발 환경 |

---

## 13. 핵심 결론 요약

### 13.1. PA 현재 구조에서 올바른 것들

- 고정 스텝 + 선형 보간 렌더 패턴 (`Game.ts`) — 가변 프레임레이트 환경에서 최적
- 히트스탑을 게임 스텝 스킵으로 구현 — 시각적 지속 시간 프레임레이트 독립
- 키 이벤트 캡처 단계 + IME 차단 (`InputManager.ts`) — 브라우저에서 가능한 최저 입력 레이턴시
- 점프 버퍼 + 어택 큐 — 이것은 편의 기능이 아니라 입력 레이턴시 보상 메커니즘임

### 13.2. 가장 우선적으로 해결해야 할 문제

1. **HitSpark 풀링 부재 (OPT-04):** 아이템계 장기 파밍에서 GC 히컵이 가장 먼저 체감될 문제다. 다른 모든 최적화보다 이것을 먼저 구현한다.
2. **백그라운드 탭 복귀 리셋 (OPT-01):** 1줄 코드 추가로 해결되는 버그성 문제다.
3. **maxFPS 설정 (OPT-02):** 1줄 코드로 배터리 소모와 GPU 발열을 절반으로 줄인다.

### 13.3. 60fps 필수 여부

히트스탑이 타격감의 핵심 메커니즘인 이상 60fps는 사실상 필수이다. 1프레임 = 16.67ms에서 히트스탑 3프레임 = 50ms는 심리적으로 "멈추는 느낌"의 임계값(40ms)을 넘는다. 30fps에서는 50ms 설계값이 100ms가 되어 과도하게 느껴진다. 60fps 타겟을 유지하되, 30fps로 드랍 시 히트스탑을 절반으로 줄이는 적응형 로직을 Phase 2에서 고려할 수 있다.

---

## 참조 자료

- [MDN Web Docs — requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- [MDN Web Docs — Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [PixiJS v8 마이그레이션 가이드](https://pixijs.com/8.x/guides/migrations/v8)
- [Fix Your Timestep! — Glenn Fiedler](https://gafferongames.com/post/fix_your_timestep/) — PA의 고정 스텝 누산기 패턴의 원전
- [Game Feel — Steve Swink, 2008] — 챕터 7 "Response Time", 챕터 9 "Hitstop"
- Howler.js GitHub Issues — AudioContext user gesture requirement
- V8 Blog — [Trash Talk: The Orinoco Garbage Collector](https://v8.dev/blog/trash-talk)
- Chrome DevTools — Memory Panel, Performance Panel 사용법
