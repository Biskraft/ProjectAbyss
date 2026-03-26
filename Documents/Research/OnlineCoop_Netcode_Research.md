# 온라인 협동 액션 게임 넷코드 종합 리서치 리포트

> **작성일:** 2026-03-25
> **담당:** 네트워크 프로그래머
> **목적:** Project Abyss 넷코드 아키텍처 설계 참고자료
> **적용 대상:** 아이템계 1~4인 협동 (WebSocket, Node.js)
> **참조 문서:**
> - `Reference/게임 기획 개요.md`
> - `Documents/System/System_Combat_Action.md`
> - `Documents/System/System_Combat_Damage.md`
> - `Documents/Research/SideScrolling_Combat_System_Research.md`

---

## 1. 넷코드 아키텍처 비교 (Lockstep vs Rollback vs Server-Authoritative)

### 1.1 Lockstep (결정론적 동기화)

**원리:**
모든 클라이언트가 매 틱(Tick)마다 입력을 교환하고, 가장 느린 플레이어의 입력이 확인될 때까지 시뮬레이션을 진행하지 않는다. 게임 로직이 완전 결정론적(deterministic)이어야 하며, 모든 클라이언트가 동일한 입력 → 동일한 상태를 보장한다.

```
[틱 N 처리 흐름]
클라이언트 A 입력 → 서버 수집
클라이언트 B 입력 → 서버 수집
클라이언트 C 입력 → 서버 수집
모든 입력 수신 완료 → 모든 클라이언트에 브로드캐스트
→ 시뮬레이션 동시 진행
```

**장점:**
- 모든 클라이언트의 상태가 항상 동기화 (체크섬으로 검증 가능)
- 서버 부하가 상대적으로 낮음 (입력만 중계)
- 결정론적 리플레이 기능 무료 제공

**단점:**
- 가장 느린 플레이어의 레이턴시가 전체 지연으로 전이됨 (최악의 경우 200ms 이상)
- 부동소수점 결정론성 확보가 매우 어려움 (JavaScript 환경에서 특히)
- 도중 참여(Late Join)와 재연결 구현 복잡
- 네트워크 불안정 플레이어 1명이 전체 게임 멈춤 (Stall)

**적합한 게임:** 스타크래프트, 에이지 오브 엠파이어 등 RTS. 실시간성보다 동기화 정확성이 우선인 경우.

---

### 1.2 Rollback Netcode (롤백 넷코드)

**원리:**
가장 최근에 받은 상대방 입력으로 미래 입력을 예측(보통 마지막 입력 반복)하고 즉시 시뮬레이션을 진행한다. 실제 입력이 도착하면 예측이 틀렸을 경우 해당 틱으로 롤백하여 재시뮬레이션하고 현재 프레임까지 Fast-Forward한다.

```
[롤백 흐름]
틱 10: 로컬 입력 즉시 시뮬레이션 (상대 입력 예측)
틱 12: 상대방 틱 10 실제 입력 수신
        → 예측 오류 → 틱 10으로 롤백
        → 틱 10~12 재시뮬레이션 (수 밀리초)
        → 현재 프레임 계속
```

**장점:**
- 입력 반응성 최우선 (항상 즉시 로컬 반응)
- 레이턴시가 높아도 "느린 느낌" 없음
- 격투 게임 업계 표준 (GGPO 프레임워크)

**단점:**
- 시각적 "텔레포트/순간이동" 현상 발생 가능 (롤백 시)
- 게임 로직이 결정론적이어야 함
- 4명 이상의 멀티플레이에서 롤백 비용 급증
- PvE에서는 AI 롤백까지 필요 → 구현 복잡도 폭발
- WebSocket TCP 환경에서는 패킷 순서 보장으로 인한 Head-of-Line Blocking이 롤백 효과를 제한

**적합한 게임:** 스트리트 파이터 6, 길티기어 스트라이브 등 1v1 격투게임.

---

### 1.3 Server-Authoritative (서버 권위 아키텍처)

**원리:**
서버가 게임 상태의 유일한 진실(Single Source of Truth)이다. 클라이언트는 입력을 서버로 전송하고, 서버가 상태를 계산하여 클라이언트로 전달한다. 클라이언트는 로컬 예측으로 반응성을 확보하되, 서버 응답으로 최종 결과를 확정한다.

```
[서버 권위 흐름]
클라이언트: 입력 → 로컬 예측 적용 (즉각 반응)
          → 서버로 입력 전송
서버:       입력 수신 → 검증 → 상태 계산
          → 상태 스냅샷 브로드캐스트
클라이언트: 서버 상태 수신 → 예측과 비교
          → 차이 있으면 서버 기준으로 보정
```

**장점:**
- 치트 방지 강력 (서버가 모든 결과를 최종 결정)
- 플레이어 수 제한 없음 (서버 용량까지)
- 도중 참여, 재연결 용이
- JavaScript/TypeScript 환경에서 결정론성 불필요
- PvE에서 AI 로직을 서버에서만 실행 가능

**단점:**
- 서버 비용 높음 (매 틱 게임 로직 실행)
- 레이턴시 200ms 이상에서 체감 저하
- 예측 → 롤백 파이프라인 구현 필요

**적합한 게임:** 오버워치, 포트나이트, Warframe, 디아블로 등 PvE 협동/PvP 액션.

---

### 1.4 PvE 협동 액션에 적합한 모델 비교

| 항목 | Lockstep | Rollback | Server-Authoritative |
| :--- | :---: | :---: | :---: |
| 반응성 | 낮음 | 최고 | 높음 (예측 포함) |
| 동기화 정확도 | 최고 | 높음 | 높음 |
| 치트 방지 | 약 | 약 | 강 |
| 4인 지원 | 어려움 | 비용 증가 | 적합 |
| PvE AI 처리 | 분산 (모든 클라이언트) | 롤백 비용 | 서버 중앙화 (최적) |
| 도중 참여/재연결 | 어려움 | 보통 | 쉬움 |
| JS/TS 환경 | 결정론성 어려움 | 결정론성 어려움 | 적합 |
| 모바일 불안정 네트워크 | 취약 | 보통 | 강 |

---

### 1.5 Project Abyss 권장 아키텍처

**결론: Server-Authoritative + Client-Side Prediction + Entity Interpolation 하이브리드**

Project Abyss에 Lockstep과 Rollback이 적합하지 않은 이유:

1. **1~4인 PvE 구조:** 적(이노센트, 보스)의 AI를 어떤 클라이언트가 실행할 것인가? Lockstep/Rollback은 AI 결정론성을 모든 클라이언트에 강요한다. Server-Authoritative에서는 서버만 AI를 실행하면 된다.

2. **JavaScript 부동소수점:** TypeScript/PixiJS 환경에서 완전한 결정론성 확보는 극히 어렵다. 64-bit float 연산 순서, Math.random() 등이 클라이언트 간 미세 차이를 만든다.

3. **모바일 지원:** 모바일 네트워크 불안정성(지하철, WiFi 전환 등)에서 Lockstep은 Stall을, Rollback은 과도한 롤백을 유발한다. Server-Authoritative는 해당 클라이언트만 부드럽게 보정된다.

4. **보안:** 이노센트 복종, 아이템 드랍, 보스 처치 등 경제적 가치가 있는 이벤트는 서버 권위 검증이 필수다.

5. **PvE 특성:** Rollback의 핵심 장점(즉각 반응성)은 PvP 격투에서 극대화된다. PvE에서는 약간의 보정 지연(~16ms)이 체감되지 않는다.

**권장 아키텍처 다이어그램:**
```
[클라이언트 레이어]
  입력 감지 → 로컬 예측 적용 (즉각 반응)
             → 서버 전송 (입력 패킷)
  서버 상태 수신 ← 권위 상태 적용
              ← 차이 보정 (보간 or 스냅)

[서버 레이어] (Node.js, 20 Tick/s)
  입력 수신 → 검증 → 게임 로직 실행 (AI 포함)
           → 상태 계산 → 스냅샷 전송
           → 이벤트 브로드캐스트 (히트, 드랍, 보스 처치)

[데이터 레이어]
  Redis: 세션 상태, 매치메이킹 큐
  PostgreSQL: 아이템 상태, 이노센트 데이터 영구 저장
```

---

## 2. 클라이언트 예측 & 서버 검증

### 2.1 이동 예측 (Movement Prediction)

클라이언트는 서버 응답을 기다리지 않고 플레이어의 이동을 즉시 로컬에서 처리한다.

**입력 시퀀스 번호 패턴:**
```typescript
interface InputPacket {
  seq: number;        // 입력 시퀀스 번호 (단조 증가)
  tick: number;       // 클라이언트 틱 번호
  timestamp: number;  // 클라이언트 타임스탬프 (ms)
  dx: number;         // 이동 방향 (-1, 0, 1)
  dy: number;         // 수직 입력
  actions: ActionFlag; // 점프, 공격, 스킬 등 비트마스크
}

// 클라이언트 측: 미확인 입력 버퍼 유지
const pendingInputs: InputPacket[] = [];

function processInput(input: InputPacket) {
  applyInputLocally(input);      // 즉시 로컬 적용
  pendingInputs.push(input);     // 버퍼에 보관
  sendToServer(input);           // 서버 전송
}

// 서버 상태 수신 시 검증
function onServerState(serverState: PlayerState, lastProcessedSeq: number) {
  // 서버가 처리한 시퀀스 이전 입력은 버퍼에서 제거
  pendingInputs = pendingInputs.filter(i => i.seq > lastProcessedSeq);

  // 서버 상태로 위치 보정
  localState.position = serverState.position;
  localState.velocity = serverState.velocity;

  // 아직 서버가 처리하지 않은 입력을 재적용 (Re-simulation)
  for (const input of pendingInputs) {
    applyInputLocally(input);
  }
}
```

**보정 방식:** 위치 차이가 32px 미만이면 부드러운 보간(LERP), 32px 이상이면 즉시 스냅. 32px는 플레이어 히트박스(약 32×48px) 기준으로 설정.

---

### 2.2 공격 판정 처리

공격은 반응성이 가장 중요한 액션이다. 하이브리드 판정 모델을 권장한다.

**공격 판정 흐름:**
```
[클라이언트 (즉시)]
1. 공격 버튼 입력
2. 로컬 히트박스 검사 → 로컬 적 히트 감지
3. 이펙트/사운드/히트스탑 즉시 재생 (체감 0ms)
4. AttackRequest 패킷 전송

[서버 (RTT/2 후 ~25~75ms)]
5. AttackRequest 수신
6. 서버 히트박스 검사 (서버 권위 위치 기준)
7. 허용 범위 내 판정: 데미지 계산 → HitConfirm 브로드캐스트
   허용 범위 초과: HitDeny 전송 (클라이언트 이펙트 취소)
8. 적 HP 감소, 이노센트 피격 처리

[클라이언트 (HitConfirm 수신 후)]
9. 데미지 숫자 표시
10. 적 체력바 업데이트
```

**허용 오차 (Lag Compensation):**
서버는 공격 판정 시 공격자의 타임스탬프 기준으로 **최대 150ms 과거** 상태를 참조하여 히트박스를 검사한다. 이는 네트워크 레이턴시로 인해 클라이언트에서 맞았다고 생각한 공격이 서버에서 빗나가는 현상을 방지한다.

```typescript
interface AttackRequest {
  seq: number;
  attackType: 'light' | 'heavy' | 'skill';
  skillId?: number;
  hitboxSnapshot: HitboxData;  // 클라이언트 기준 히트박스
  clientTimestamp: number;      // 판정 시점
  targetIds: number[];          // 예측된 피격 대상
}
```

---

### 2.3 피격 처리

피격은 서버가 최종 결정한다. 클라이언트는 예측으로 먼저 반응하되 서버 확인으로 확정한다.

```
플레이어 A가 공격 → 플레이어 B 피격 시나리오 (파티 플레이):

[A 클라이언트]  공격 이펙트 즉시 재생
[서버]         A의 AttackRequest 처리
              B의 HP 감소
              DamageEvent 브로드캐스트 (A, B, 모든 파티원)

[B 클라이언트]  DamageEvent 수신 → 피격 이펙트 재생
              HP 바 업데이트
              히트스탑 적용
```

B는 서버로부터 피격 이벤트를 받을 때까지 피격 반응을 하지 않는다. 이로 인해 B 클라이언트에서 B 캐릭터의 피격 반응이 ~50ms 지연되지만, PvE에서는 허용 가능한 수준이다.

---

### 2.4 서버 권위 검증 파이프라인 (DMG-07 연동)

`System_Combat_Damage.md`의 DMG-07-A "서버 데미지 검증"에 대한 구체적 파이프라인:

```typescript
// 서버 검증 단계
function validateAttack(req: AttackRequest, attacker: ServerPlayer): ValidationResult {
  // 1. 위치 유효성 (허용 오차 체크)
  const positionDiff = distance(req.hitboxSnapshot.origin, attacker.position);
  if (positionDiff > POSITION_TOLERANCE_PX) {
    return { valid: false, reason: 'position_mismatch' };
  }

  // 2. 쿨다운 검증
  if (attacker.cooldowns[req.attackType] > 0) {
    return { valid: false, reason: 'cooldown_not_ready' };
  }

  // 3. MP 검증 (스킬의 경우)
  if (req.skillId && attacker.mp < getSkillMpCost(req.skillId)) {
    return { valid: false, reason: 'insufficient_mp' };
  }

  // 4. 히트박스 서버측 검사 (과거 상태 참조)
  const historicalState = getHistoricalState(req.clientTimestamp);
  const serverHits = checkHitboxCollision(req.hitboxSnapshot, historicalState);

  // 5. 데미지 계산 (서버가 직접 계산)
  const damage = calculateDamage(attacker.stats, serverHits, req.attackType);

  return { valid: true, damage, hitEntities: serverHits };
}
```

**치팅 방지와 반응성의 균형:**

| 검증 항목 | 엄격도 | 이유 |
| :--- | :--- | :--- |
| 플레이어 이동 속도 | 엄격 | 속도 핵 방지. 허용 오차 ±15% |
| 공격 범위 | 관대 | 레이턴시 허용. ±40px 오차 허용 |
| 데미지 수치 | 엄격 | 서버가 직접 계산, 클라이언트 값 불신 |
| 쿨다운 | 엄격 | 클라이언트 조작 방지. 서버 타이머 기준 |
| 아이템 드랍/이노센트 복종 | 엄격 | 경제 시스템 무결성 |
| 히트스탑 | 관대 | 시각 효과만, 게임 상태에 영향 없음 |

---

## 3. 상태 동기화 전략

### 3.1 엔티티 보간 (Entity Interpolation)

다른 플레이어와 몬스터의 이동은 보간으로 부드럽게 표시한다. 클라이언트는 실제 수신한 서버 상태보다 **100ms 뒤처진 시점**을 렌더링하여, 두 스냅샷 사이를 보간한다.

```
서버 스냅샷:  [T=0: pos(100,200)] ... [T=50ms: pos(150,200)] ... [T=100ms: pos(200,200)]
클라이언트:   현재 시각 = T=100ms
              렌더링 시점 = T=100ms - 100ms = T=0ms
              T=0 → T=50 사이를 LERP으로 부드럽게 표시
```

**보간 버퍼 크기:** 100ms (2~3 스냅샷에 해당). 버퍼가 너무 작으면 끊기고, 너무 크면 시각적 지연이 과도하다.

```typescript
function interpolateEntity(entity: RemoteEntity, renderTime: number): Position {
  const buffer = entity.stateBuffer; // 타임스탬프 정렬된 스냅샷 배열

  // 렌더 타임 앞뒤의 스냅샷 탐색
  for (let i = 0; i < buffer.length - 1; i++) {
    if (buffer[i].timestamp <= renderTime && buffer[i+1].timestamp >= renderTime) {
      const t = (renderTime - buffer[i].timestamp)
                / (buffer[i+1].timestamp - buffer[i].timestamp);
      return lerp(buffer[i].position, buffer[i+1].position, t);
    }
  }

  // 버퍼 초과 시 외삽
  return extrapolate(buffer[buffer.length - 1], renderTime);
}
```

---

### 3.2 엔티티 외삽 (Extrapolation)

스냅샷이 없을 때(패킷 유실, 버퍼 부족) 마지막 알려진 속도 벡터로 위치를 예측한다. 외삽은 최대 **200ms**까지만 허용하며, 이후에는 마지막 위치에 정지시킨다.

```typescript
function extrapolate(lastState: EntityState, currentTime: number): Position {
  const elapsed = currentTime - lastState.timestamp;
  if (elapsed > 200) {
    return lastState.position; // 200ms 초과 시 정지
  }
  return {
    x: lastState.position.x + lastState.velocity.x * (elapsed / 1000),
    y: lastState.position.y + lastState.velocity.y * (elapsed / 1000)
  };
}
```

---

### 3.3 스냅샷 기반 vs 이벤트 기반 동기화

Project Abyss는 두 방식을 혼합한다.

| 데이터 유형 | 동기화 방식 | 이유 |
| :--- | :--- | :--- |
| 플레이어 위치/속도 | 스냅샷 (20Hz) | 연속 변화, 부드러운 보간 필요 |
| 몬스터 위치/속도 | 스냅샷 (10Hz, 관심 영역 필터) | 대량 엔티티, 빈도 절감 |
| 공격 판정/피격 | 이벤트 (신뢰성 있는 전송) | 놓치면 안 됨 |
| 이노센트 복종 | 이벤트 (서버 확인 필수) | 경제적 가치 있는 상태 변경 |
| 보스 HP/페이즈 전환 | 이벤트 + 스냅샷 혼합 | HP는 주기적, 페이즈는 이벤트 |
| 히트스탑/이펙트 | 이벤트 (일회성) | 한 번만 발생 |
| 아이템 드랍 | 이벤트 (서버 권위) | 귀속 처리 필요 |

---

### 3.4 대역폭 최적화

#### Delta Compression (델타 압축)

매 틱 전체 상태 대신 변경된 필드만 전송한다.

```typescript
interface StateDelta {
  tick: number;
  changed: {
    [entityId: number]: Partial<EntityState>; // 변경된 필드만
  }
}

// 예시: 위치만 변경된 경우
// 전체 상태: { id: 5, pos: {x:100, y:200}, hp: 1000, mp: 500, ... } = ~80 bytes
// 델타:      { id: 5, pos: {x:105, y:200} }                        = ~20 bytes
```

#### 관심 영역 필터링 (Area of Interest)

횡스크롤 게임에서는 뷰포트(화면) + 버퍼를 관심 영역으로 설정한다.

```
[관심 영역 설정]
- 플레이어 뷰포트: 1280×720px (기본 해상도)
- 동기화 버퍼: 뷰포트 + 각 방향 256px 추가
- 관심 영역 밖 엔티티: 서버는 업데이트하지만 클라이언트로 전송 안 함
- 관심 영역 진입 시: 전체 상태 스냅샷 1회 전송
```

아이템계 방(Room)은 최대 5×5 Room Grid이며, 각 방의 크기는 약 1280×720px. 4인 파티가 흩어지면 관심 영역 필터링 효과가 제한되므로, 한 Room 내 모든 엔티티를 동기화하는 단순 모델이 적합하다.

**예상 대역폭 (4인, 20 Tick/s 기준):**
- 플레이어 상태 (4명): 4 × 40 bytes × 20 = 3,200 bytes/s ≈ 3.1 KB/s
- 몬스터 상태 (방당 최대 20마리): 20 × 30 bytes × 10 = 6,000 bytes/s ≈ 5.9 KB/s
- 이벤트 패킷 (공격, 피격 등): 가변 ~2 KB/s
- **총 예상:** 약 11~15 KB/s per client (업링크 + 다운링크 합산)

일반적인 모바일 4G 환경(업링크 2Mbps, 다운링크 10Mbps)에서 매우 여유 있는 수준이다.

---

## 4. WebSocket 환경의 특수 고려사항

### 4.1 TCP 기반 WebSocket vs UDP (WebRTC DataChannel) 비교

| 항목 | WebSocket (TCP) | WebRTC DataChannel (UDP) |
| :--- | :--- | :--- |
| 연결 방식 | TCP (신뢰성 보장) | UDP (SCTP 위) |
| 패킷 유실 | 자동 재전송 (Head-of-Line Blocking) | 유실 허용 (unreliable 모드) |
| 순서 보장 | 강제 | 선택 (ordered/unordered 설정 가능) |
| 레이턴시 | 약간 높음 (재전송 오버헤드) | 낮음 |
| 구현 복잡도 | 낮음 (서버 직접 연결) | 높음 (시그널링 서버 필요, ICE/STUN/TURN) |
| 방화벽 통과 | 거의 모든 환경 통과 | 방화벽/NAT에서 실패 가능 (TURN 필요) |
| 브라우저 지원 | 100% | Chrome 70+, Firefox 63+, Safari 15.4+ |
| 서버 구현 | Node.js ws 라이브러리 충분 | 추가 미디어 서버 또는 직접 구현 |

**Project Abyss에 WebSocket(TCP)이 적합한 이유:**

1. **PvE 협동 특성:** 실시간 격투와 달리 PvE는 50~100ms 레이턴시에서도 쾌적하다. TCP 재전송 오버헤드의 영향이 제한적이다.

2. **모바일 지원:** WebRTC는 모바일 브라우저에서 NAT/방화벽 문제가 빈번하다. TURN 서버 비용이 추가된다.

3. **아이템 드랍, 이노센트 복종** 등 중요 이벤트는 신뢰성 있는 전송이 필수다. WebSocket TCP에서는 이를 무료로 얻는다.

4. **구현 단순성:** Node.js + ws 라이브러리로 즉시 프로토타입 가능. WebRTC는 시그널링 서버, ICE 협상 등 별도 인프라가 필요하다.

**TCP Head-of-Line Blocking 대응:**
위치/속도처럼 오래된 패킷이 쓸모없는 데이터는, 최신 스냅샷이 도착하면 이전 패킷을 버리는 방식으로 Blocking 영향을 최소화한다. TCP 자체를 바꿀 수 없으므로, 패킷 설계 수준에서 "구버전 스냅샷은 무시" 로직으로 대응한다.

```typescript
// 구버전 스냅샷 무시
function onSnapshotReceived(snapshot: WorldSnapshot) {
  if (snapshot.tick <= lastAppliedTick) {
    return; // 이미 처리된 틱의 스냅샷은 무시
  }
  lastAppliedTick = snapshot.tick;
  applySnapshot(snapshot);
}
```

---

### 4.2 브라우저 탭 비활성화 시 Throttling 문제

Chrome/Firefox는 비활성화된 탭의 `requestAnimationFrame`을 1fps, `setTimeout`/`setInterval`을 최소 1000ms 간격으로 제한한다. 이는 게임 루프에 치명적이다.

**대응 전략:**

1. **WebSocket 메시지로 게임 루프 구동 (권장):**
   ```typescript
   // requestAnimationFrame 대신 서버 패킷 수신 시 게임 로직 처리
   ws.onmessage = (event) => {
     const packet = deserialize(event.data);
     processServerPacket(packet); // 게임 로직 실행
   };
   ```

2. **Page Visibility API로 탭 전환 감지:**
   ```typescript
   document.addEventListener('visibilitychange', () => {
     if (document.hidden) {
       // 입력 전송 중단, 서버에 AFK 알림
       sendToServer({ type: 'afk', hidden: true });
     } else {
       // 복귀 시 전체 상태 스냅샷 요청
       sendToServer({ type: 'request_full_snapshot' });
     }
   });
   ```

3. **Web Worker 분리:** 네트워크 처리를 Web Worker로 이동하면 탭 비활성화 Throttling의 영향을 받지 않는다. (Web Workers는 Throttling 적용 안 됨)

4. **서버 측 AFK 처리:** 클라이언트가 500ms 이상 입력이 없으면 서버가 해당 플레이어를 정지(idle) 처리. 복귀 시 전체 상태 재동기화.

---

### 4.3 모바일 웹의 네트워크 불안정성 대응

모바일 환경에서는 지하철, 엘리베이터, WiFi↔LTE 전환 시 순간적인 패킷 손실과 RTT 급증이 발생한다.

**대응 기법:**

1. **Heartbeat + 자동 재연결:**
   ```typescript
   // 클라이언트: 2초마다 핑 전송
   setInterval(() => sendToServer({ type: 'ping', t: Date.now() }), 2000);

   // 서버: 5초간 핑 없으면 접속 끊김 처리
   // 클라이언트: ws.onclose 시 지수 백오프로 재연결 시도
   function reconnect(attempt: number) {
     const delay = Math.min(1000 * Math.pow(2, attempt), 30000); // 최대 30초
     setTimeout(() => connectWebSocket(), delay);
   }
   ```

2. **세션 재개 (Session Resume):**
   재연결 시 세션 토큰으로 기존 파티 세션에 복귀. 재연결 허용 시간은 **30초**. 30초 내 복귀하면 파티에서 추방되지 않는다.
   ```typescript
   ws.send(JSON.stringify({
     type: 'reconnect',
     sessionToken: localStorage.getItem('sessionToken'),
     lastAppliedTick: gameState.lastAppliedTick
   }));
   ```

3. **RTT 적응형 보간 버퍼:**
   현재 RTT를 기반으로 보간 버퍼 크기를 동적 조정. RTT 100ms 이하 → 버퍼 100ms. RTT 200ms → 버퍼 150ms.

4. **중요 패킷 확인 응답(ACK):**
   이노센트 복종, 아이템 드랍 등 중요 이벤트는 클라이언트가 ACK를 보낼 때까지 서버가 재전송.

---

### 4.4 JSON vs Binary Protocol 성능 비교

| 항목 | JSON | MessagePack | Protobuf |
| :--- | :--- | :--- | :--- |
| 인코딩 속도 | 기준 | 약 2~3배 빠름 | 약 5~10배 빠름 |
| 디코딩 속도 | 기준 | 약 2~3배 빠름 | 약 5~10배 빠름 |
| 패킷 크기 | 기준 | 약 30~40% 감소 | 약 40~60% 감소 |
| 구현 복잡도 | 없음 | 라이브러리 1개 | 스키마 정의 필요 |
| 브라우저 지원 | 기본 | msgpack-lite npm | protobufjs npm |
| 디버깅 | 쉬움 (가독성) | 어려움 | 어려움 |

**Project Abyss 권장 전략:**

- **Phase 1 (프로토타입):** JSON으로 빠른 개발. 디버깅 편의성 최우선.
- **Phase 3 (베타) 이후:** MessagePack 전환. 네트워크 최적화가 체감될 단계.
- Protobuf는 스키마 버전 관리 복잡도를 고려할 때 Phase 4(런칭) 이후 검토.

**패킷 크기 예시:**
```json
// JSON: 이동 패킷 ~95 bytes
{"type":"move","seq":1234,"tick":5000,"dx":1,"dy":0,"actions":0,"timestamp":1711300000}

// MessagePack: 동일 내용 ~55 bytes (42% 감소)
// Protobuf: 동일 내용 ~30 bytes (68% 감소)
```

---

## 5. 실시간 전투 동기화

### 5.1 히트스탑 동기화 (하이브리드 방식 상세)

`Documents/Research/SideScrolling_Combat_System_Research.md` 5.1절에서 권장한 하이브리드 방식(C안)의 상세 구현:

```
[히트스탑 하이브리드 흐름]

공격자(A) 클라이언트:
  1. 공격 입력
  2. 로컬 히트스탑 즉시 적용 (A의 애니메이션 일시정지)
  3. AttackRequest 서버 전송

서버:
  4. AttackRequest 검증
  5. HitConfirm 패킷 브로드캐스트 {
       attacker_id: A,
       target_ids: [B, C],
       hitstop_frames: 6,    // 서버가 계산
       knockback: {x: 240, y: 0}
     }

피격자(B) 클라이언트:
  6. HitConfirm 수신
  7. 히트스탑 적용 (B의 애니메이션 일시정지 6프레임)
  8. 넉백 벡터 적용

관찰자(파티원 D) 클라이언트:
  9. HitConfirm 수신
  10. B의 히트스탑 이펙트 표시
```

**히트스탑 중 서버 패킷 처리 주의:**
히트스탑 중에도 WebSocket 메시지는 계속 수신된다. 위치 업데이트 패킷을 히트스탑 종료 후 한꺼번에 적용하면 "텔레포트" 현상이 발생한다. 히트스탑 중에는 **이동 패킷만 큐에 쌓아두고**, 히트스탑 종료 시 최신 상태로 부드럽게 보간한다.

```typescript
function onPositionUpdate(update: PositionUpdate) {
  if (entity.hitstopRemaining > 0) {
    entity.pendingPositionUpdates.push(update); // 큐에 누적
    return;
  }
  applyPositionUpdate(update);
}

function onHitstopEnd(entity: Entity) {
  if (entity.pendingPositionUpdates.length > 0) {
    // 최신 상태로 보간
    const latest = entity.pendingPositionUpdates[entity.pendingPositionUpdates.length - 1];
    smoothLerpTo(entity, latest.position, 100); // 100ms 보간
    entity.pendingPositionUpdates = [];
  }
}
```

---

### 5.2 이노센트 복종 이벤트 동기화

이노센트 복종은 아이템 경제에 직접 영향을 미치는 중요 이벤트이므로, **서버 권위 + ACK 보장** 방식을 사용한다.

```
[이노센트 복종 흐름]

플레이어가 야생 이노센트 공격 → HP=0

서버:
  1. 이노센트 사망 처리
  2. 복종 전환 계산
  3. DB 트랜잭션: 이노센트 상태 WILD → TAMED 저장
  4. InnocentTamed 이벤트 전송 (ACK 요구) {
       innocent_id: 12345,
       item_id: 67890,
       stat_type: 'ATK',
       level: 150,
       effect_bonus: 2.0
     }

클라이언트:
  5. InnocentTamed 수신
  6. ACK 전송
  7. 이노센트 팝업 UI 표시
  8. 아이템 스탯 갱신

서버:
  9. ACK 수신 → 재전송 큐에서 제거
  (10초 내 ACK 없으면 최대 3회 재전송)
```

**파티 플레이 이노센트 귀속:**
파티원이 동시에 같은 이노센트를 공격할 경우, 서버가 최종 킬 플레이어를 결정하여 귀속 처리.
```
귀속 우선순위: 최종 타격 플레이어 (Last Hit)
동시 타격: 서버 타임스탬프 기준 선착 (Race Condition은 서버 뮤텍스로 해결)
```

---

### 5.3 보스 HP / 페이즈 동기화

보스는 파티원 전체가 동일한 상태를 봐야 하는 중요 공유 객체다.

**동기화 전략:**
- 보스 HP: 20Hz 스냅샷 (이벤트 기반은 공격마다 브로드캐스트 → 과부하)
- 페이즈 전환: 이벤트 기반 (BossPhaseChange 패킷, ACK 요구)
- 보스 스킬 예고(Telegraph): 이벤트 기반 (플레이어가 반응해야 하므로)

```typescript
interface BossPhaseChange {
  bossId: number;
  fromPhase: number;
  toPhase: number;
  newHpPercent: number;   // 페이즈 전환 시점 HP
  newPatterns: string[];  // 추가된 패턴 목록
  visualEffect: 'flash' | 'explosion' | 'transformation';
}

interface BossSkillTelegraph {
  bossId: number;
  skillId: string;
  warningDurationMs: number; // 예고 지속 시간 (예: 1500ms)
  affectedArea: AreaData;    // 위험 구역 표시
}
```

**보스 HP 표시 정확도:**
HP 스냅샷은 20Hz이므로 최대 50ms 지연이 있다. 플레이어 경험상 보스 HP바 50ms 지연은 전혀 인지되지 않는다. 크리티컬 데미지 넘버가 뜨고 HP바가 미세하게 늦게 내려가는 것은 허용 가능한 수준이다.

---

### 5.4 드롭 아이템 귀속 처리

아이템 드랍은 서버가 결정하고 클라이언트에 통보한다.

**귀속 규칙:**
```
[귀속 우선순위]
1. 개인 귀속 방식 (권장): 각 플레이어에게 독립적인 드랍 롤
   → 4인 파티에서 같은 아이템이 4명에게 각각 드랍될 수 있음
   → 아이템 파밍 효율을 극대화 (디스가이아 방식)

2. 공유 귀속 방식 (대안): 드랍된 아이템 1개를 파티원이 나눠 가짐
   → 아이템 획득 경쟁 발생 가능
   → 아이템 가치 유지에 유리
```

Project Abyss의 야리코미 컨셉과 아이템계 협동 파밍 구조상 **개인 귀속 방식**을 권장한다. 같은 파티원이 각자 아이템을 받는 것이 "함께 파밍하는 쾌감"을 배가시킨다.

```typescript
interface ItemDropEvent {
  dropId: string;
  itemProto: ItemPrototype;
  assignedPlayerId: number;  // 귀속된 플레이어 (개인 귀속 방식)
  position: Vector2;
  pickupDeadline: number;    // 귀속 만료 타임스탬프 (60초 후 공유 전환)
}
```

---

## 6. 레이턴시별 체감 품질

### 6.1 레이턴시 구간별 체감

| RTT (왕복) | 편도 레이턴시 | PvE 협동 체감 | PvP 격투 체감 | 조치 필요 여부 |
| :--- | :--- | :--- | :--- | :--- |
| 0~50ms | 0~25ms | 완벽 | 완벽 | 없음 |
| 50~100ms | 25~50ms | 쾌적 | 좋음 | 없음 |
| 100~150ms | 50~75ms | 양호 | 약간 느린 느낌 | 예측 강화 |
| 150~200ms | 75~100ms | 허용 가능 | 불쾌 | 예측 + 보정 |
| 200~300ms | 100~150ms | 불쾌하지만 플레이 가능 | 매우 불쾌 | 레이턴시 경고 표시 |
| 300ms 이상 | 150ms+ | 플레이 곤란 | 플레이 불가 | 서버 재연결 권고 |

**체감 품질 지표 (Quake 3 Arena, Overwatch 기준):**
- 공격 판정: RTT 100ms까지 예측으로 완전 보상 가능
- 회피 액션(대시 i-frame): RTT 150ms까지 클라이언트 예측으로 커버
- 보스 패턴 반응: Telegraph 1500ms 기준, RTT 300ms에서도 반응 가능 (1200ms 여유)
- 파티원 위치: 보간 버퍼 100ms → RTT 200ms까지 부드러운 표시 가능

---

### 6.2 허용 가능한 레이턴시 상한

| 장르 | 허용 상한 | 근거 |
| :--- | :--- | :--- |
| PvP 격투 (스트리트파이터, 철권) | 80ms | 4~6프레임(60fps). 그 이상은 판정 오류 체감 |
| PvP 슈터 (오버워치, CS) | 120ms | 레이턴시 보상 기법으로 150ms까지 허용 |
| PvE 협동 액션 (Warframe, Diablo) | 200ms | 반응형 액션이지만 실시간 판정 경쟁 없음 |
| **Project Abyss (PvE 횡스크롤)** | **200ms** | 보스 Telegraph 긴 편, 이노센트 사냥은 정밀성보다 지속성 |
| MMO (WoW, FFXIV) | 300ms | 글로벌 쿨다운 1~2초. 레이턴시 영향 최소 |

**Project Abyss의 200ms 근거:**
- 아이템계 전투는 PvP 대전이 아닌 협동 PvE. 0.1프레임 단위 판정이 결과에 영향을 미치지 않음.
- 보스 공격 Telegraph(예고 모션)는 500ms~1500ms 유지. 200ms RTT에서도 충분히 반응 가능.
- 히트스탑, 넉백은 시각 효과로 게임 결과에 영향을 주지 않음. 지연 허용 가능.

---

### 6.3 레이턴시 보상 기법

**1. Lag Compensation (서버 히스토리 참조):**
서버는 과거 150ms의 게임 상태 히스토리를 유지한다. 공격 판정 시 클라이언트 타임스탬프 기준의 과거 상태를 참조하여, 레이턴시로 인한 판정 오차를 보정한다.

```typescript
class HistoryBuffer {
  private states: Map<number, WorldState> = new Map(); // tick → state
  private maxHistory = 30; // 1.5초 (20 tick/s × 1.5s)

  save(tick: number, state: WorldState) {
    this.states.set(tick, deepClone(state));
    if (this.states.size > this.maxHistory) {
      const oldestTick = Math.min(...this.states.keys());
      this.states.delete(oldestTick);
    }
  }

  getAt(tick: number): WorldState | undefined {
    return this.states.get(tick);
  }
}
```

**2. Input Buffering (입력 버퍼링):**
공격 입력 후 즉각 공격이 발동되지 않는 상황(이동 중, 다른 공격 중)에서 입력을 버퍼(200ms)에 보관하여 가능한 시점에 자동 발동.

**3. 적응형 업데이트 레이트:**
RTT가 높은 클라이언트에게 서버가 더 낮은 빈도로 업데이트를 전송하여, 처리 부담을 줄이고 안정성을 높인다.

```
RTT < 100ms  → 20 Hz 업데이트
RTT 100~200ms → 15 Hz 업데이트
RTT > 200ms  → 10 Hz 업데이트 (경고 표시)
```

---

## 7. Project Abyss 구체적 구현 권장사항

### 7.1 틱레이트 (Tick Rate) 권장값

| 시스템 | 틱레이트 | 이유 |
| :--- | :--- | :--- |
| 서버 게임 루프 | **20 Hz (50ms/tick)** | Overwatch 63Hz, Warframe 30Hz, PvE 협동 기준 20Hz 적합 |
| 클라이언트 렌더 | 60 Hz (목표) | requestAnimationFrame 기준 |
| 위치 스냅샷 전송 | 20 Hz | 서버 루프와 동기 |
| 몬스터 AI 처리 | 10 Hz | 플레이어 입력의 절반. 몬스터 반응이 약간 느려도 허용 |
| 핑 측정 | 1 Hz | 네트워크 상태 모니터링 |

**20Hz를 선택하는 이유:**
- 50ms 간격으로 위치 업데이트가 오면, 60fps 렌더러가 보간으로 충분히 부드러운 움직임을 생성할 수 있다.
- Diablo 3 협동의 경우 서버 틱레이트 약 15~20Hz에서도 쾌적한 플레이가 보고됨.
- 30Hz(약 500KB/s)에서 20Hz(약 350KB/s)로 낮추면 서버 CPU 및 대역폭이 약 33% 절감된다.

---

### 7.2 패킷 구조 설계 방향

**공통 헤더:**
```typescript
interface PacketHeader {
  version: number;    // 프로토콜 버전 (하위 호환성)
  type: PacketType;   // 패킷 유형 enum
  seq: number;        // 시퀀스 번호 (uint32, 롤오버 처리 필요)
  tick: number;       // 서버 틱 번호
  timestamp: number;  // 발신 타임스탬프 (ms)
}

enum PacketType {
  // 클라 → 서버
  INPUT       = 0x01,
  PING        = 0x02,
  RECONNECT   = 0x03,
  ATTACK_REQ  = 0x10,

  // 서버 → 클라
  WORLD_SNAPSHOT  = 0x81,
  ENTITY_DELTA    = 0x82,
  PONG            = 0x83,
  HIT_CONFIRM     = 0x90,
  ITEM_DROP       = 0x91,
  INNOCENT_TAMED  = 0x92,
  BOSS_PHASE      = 0x93,
  FULL_RESYNC     = 0xFF,
}
```

**월드 스냅샷 패킷 (서버 → 클라이언트, 20Hz):**
```typescript
interface WorldSnapshot {
  header: PacketHeader;
  serverTick: number;
  players: PlayerState[];     // 1~4명
  monsters: MonsterStateDelta[]; // 변경된 몬스터만 (델타 압축)
  bosses: BossState[];        // 보스가 있는 경우
  lastProcessedInputSeq: number; // 플레이어별 마지막 처리 입력
}

interface PlayerState {
  id: number;
  position: Vector2;    // 4 bytes (fixed point 권장)
  velocity: Vector2;    // 4 bytes
  facingDir: number;    // 1 byte (-1 or 1)
  animState: number;    // 1 byte (상태 ID)
  hp: number;           // 2 bytes (uint16)
  mp: number;           // 2 bytes (uint16)
  statusFlags: number;  // 2 bytes (비트마스크: 빙결, 화상 등)
}
// 합계: 약 20 bytes per player
```

**버전 관리 원칙:**
모든 패킷에 `version` 필드를 포함한다. 서버 업데이트 시 구버전 클라이언트가 새 패킷을 받아도 무시하거나 폴백 처리할 수 있어야 한다. 이는 "핫픽스 배포 중에도 진행 중인 세션이 끊기지 않아야 한다"는 원칙에 기반한다.

---

### 7.3 서버 인스턴스 구조 (아이템계 세션 관리)

```
[인프라 레이어 개요]

                     ┌──────────────────────┐
                     │   API Gateway / LB   │ (HTTPS/WSS)
                     └──────┬───────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
     ┌──────────┐    ┌──────────┐    ┌──────────┐
     │  Hub     │    │ ItemWorld│    │ ItemWorld│
     │  Server  │    │ Instance │    │ Instance │  ...
     │  (고정)  │    │  (1~4인) │    │  (1~4인) │
     └─────┬────┘    └────┬─────┘    └────┬─────┘
           │              │               │
           └──────────────┴───────────────┘
                          │
                    ┌─────▼──────┐
                    │   Redis    │
                    │  (세션/    │
                    │ 매치메이킹)│
                    └─────┬──────┘
                          │
                    ┌─────▼──────┐
                    │ PostgreSQL │
                    │  (영구 DB) │
                    └────────────┘
```

**아이템계 세션 생성 흐름:**
```
1. 플레이어 A가 아이템계 진입 요청 (itemId: 12345)
2. API Server → Redis에서 해당 itemId의 기존 세션 탐색
3. 기존 세션 있음 + 파티 초대 받음 → 기존 Instance에 참여
   기존 세션 없음 → 새 ItemWorld Instance 생성
4. Instance에 플레이어 WebSocket 연결
5. Redis에 세션 정보 캐시:
   {
     sessionId: "iw_12345_1711300000",
     itemId: 12345,
     instanceAddr: "10.0.1.5:8001",
     players: [playerId_A],
     floor: 1,
     createdAt: 1711300000,
     expiresAt: 1711386400  // 24시간
   }
```

**재귀 진입 처리:**
아이템계 깊이 2, 3의 세션도 동일한 구조로 관리. 부모 세션 ID를 참조로 유지:
```
세션 A (깊이 1, itemId: 12345)
  └─ 세션 B (깊이 2, parentSession: A, itemId: 67890)
       └─ 세션 C (깊이 3, parentSession: B, itemId: 99999) ← 최대 깊이
```

**세션 플레이어 수 제한 (4인):**
Redis의 `SETNX` (Set if Not eXists) 패턴으로 동시 참여 레이스 컨디션 방지:
```
SETNX session:iw_12345:lock 1 EX 5  (5초 락)
→ 성공: 플레이어 추가, 락 해제
→ 실패: 이미 처리 중, 재시도
```

---

### 7.4 Redis 활용 (세션 캐시, 매치메이킹)

**세션 캐시:**
```
KEY: session:{sessionId}
TYPE: Hash
FIELDS:
  - instanceAddr: "10.0.1.5:8001"
  - itemId: "12345"
  - floor: "1"
  - players: "[101, 102, 103]"  (JSON)
  - state: "active" | "ending"
TTL: 24시간 (진행 중 세션은 연장)
```

**플레이어 세션 역참조:**
```
KEY: player:{playerId}:session
TYPE: String
VALUE: "iw_12345_1711300000"  (현재 참여 중인 세션 ID)
TTL: 세션 종료 시 삭제
```

**매치메이킹 큐:**
```
KEY: matchmaking:itemworld:{itemId}:{floor_range}
TYPE: Sorted Set (Score = 대기 시작 타임스탬프)
MEMBERS: playerId

// 매치메이킹 로직:
1. 플레이어가 공개 매치 요청 → ZADD 큐에 추가
2. 매치메이킹 서버가 1초마다 큐 폴링
3. 같은 itemId 요청 2명 이상 → 세션 생성 후 초대
4. 30초 이상 대기 시 → 솔로 세션 자동 시작
```

**서버 상태 (Pub/Sub):**
아이템계 인스턴스가 완료되거나 오류 발생 시, Redis Pub/Sub으로 이벤트 전파:
```
PUBLISH itemworld:session_ended {
  "sessionId": "iw_12345_1711300000",
  "reason": "boss_cleared",
  "players": [101, 102],
  "rewards": { ... }
}
```

**RTT 측정 캐시:**
플레이어별 최근 RTT를 Redis에 저장하여 서버 선택(지역 최적화)에 활용:
```
KEY: player:{playerId}:rtt
TYPE: String
VALUE: "45"  (ms)
TTL: 60초
```

---

## 8. 구현 우선순위 및 단계별 로드맵

### Phase 1 (프로토타입): 핵심 동기화만

| 항목 | 상세 | 예상 공수 |
| :--- | :--- | :--- |
| WebSocket 서버 (ws 라이브러리) | Node.js 기본 연결 | 1일 |
| 서버 게임 루프 (20Hz) | `setInterval` 기반 | 0.5일 |
| JSON 패킷 (위치, 입력) | 기본 스냅샷 | 1일 |
| 엔티티 보간 (클라이언트) | LERP 100ms 버퍼 | 1일 |
| 클라이언트 이동 예측 | 입력 즉시 적용, 서버 보정 | 2일 |
| 공격 이벤트 기본 브로드캐스트 | JSON 패킷, 로컬 이펙트 | 1일 |

### Phase 3 (베타): 최적화 및 강화

| 항목 | 상세 | 예상 공수 |
| :--- | :--- | :--- |
| MessagePack 전환 | JSON → Binary | 2일 |
| Delta Compression | 변경 필드만 전송 | 3일 |
| Lag Compensation (히스토리 버퍼) | 서버 150ms 히스토리 | 3일 |
| Redis 세션 관리 | 아이템계 인스턴스 | 4일 |
| 재연결 (30초 허용) | 세션 재개 토큰 | 2일 |
| 관심 영역 필터링 | 룸 기반 | 2일 |
| ACK 기반 중요 이벤트 | 이노센트, 드랍 | 2일 |

---

## 9. 리스크 및 주의사항

### 9.1 JavaScript 타이머 정밀도

`setInterval(gameLoop, 50)` (20Hz)은 브라우저/Node.js에서 ±5~15ms 오차가 발생한다. 서버 게임 루프는 `process.hrtime()`으로 실제 경과 시간을 측정하여 틱 보정을 수행해야 한다.

```typescript
// Node.js 서버 게임 루프 (정밀 타이머)
const TARGET_TICK_MS = 50; // 20Hz
let lastTickTime = process.hrtime.bigint();

function gameLoop() {
  const now = process.hrtime.bigint();
  const elapsed = Number(now - lastTickTime) / 1_000_000; // ms
  lastTickTime = now;

  update(elapsed);
  broadcastSnapshot();

  // 다음 틱 스케줄 (오차 보정)
  const nextDelay = Math.max(0, TARGET_TICK_MS - elapsed);
  setTimeout(gameLoop, nextDelay);
}
```

### 9.2 재귀 아이템계의 세션 복잡성

최대 3중 재귀 세션에서 플레이어가 탈출하는 경우, 세션 정리 순서와 보상 처리가 복잡해진다. 구현 전 세션 상태 머신을 명확히 정의하고, 부모 세션으로의 복귀 흐름을 상세히 설계해야 한다.

### 9.3 서버 권위와 반응성의 긴장

서버 검증이 너무 엄격하면 클라이언트 예측이 자주 롤백되어 시각적 "튀는" 현상이 발생한다. 특히 이동 속도 검증의 허용 오차(±15%)는 플레이테스트를 통해 조정이 필요하다.

---

## 출처 및 참고 자료

- **GDC Vault:** "Overwatch Gameplay Architecture and Netcode" (Tim Ford, 2017)
- **GDC Vault:** "Fighting Game Netcode" (GGPO, Tony Cannon)
- **Valve Developer Wiki:** Source Engine Multiplayer Networking
- **Gabriel Gambetta:** "Fast-Paced Multiplayer" 시리즈 (gabrielgambetta.com)
- **Riot Games Engineering Blog:** "Fixing Riot's Netcode" (2020)
- **Warframe Engineering Blog:** "Peer-to-Peer to Dedicated Server" (Digital Extremes, 2019)
- **MDN Web Docs:** Page Visibility API, WebSocket API
- **Node.js Docs:** process.hrtime, ws 라이브러리
- **Redis Docs:** SETNX, Pub/Sub, Sorted Sets
- Project Abyss 내부 문서: `Reference/게임 기획 개요.md`, `Documents/System/System_Combat_Damage.md`
