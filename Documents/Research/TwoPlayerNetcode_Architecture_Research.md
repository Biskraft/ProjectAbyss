# 2인 협동 넷코드 아키텍처 리서치 리포트

> **작성일:** 2026-04-15
> **담당:** 네트워크 프로그래머
> **목적:** ECHORIS 아이템계 2인 협동(Phase 3)에 최적화된 넷코드 아키텍처 선정
> **조건:** 웹 브라우저(PixiJS/TS), WebSocket, 2인 전용 PvE, 솔로 개발자, URL 기반 합류
> **선행 문서:**
> - `Documents/Research/OnlineCoop_Netcode_Research.md` (1-4인 풀 Server-Authoritative 기준)
> - `Documents/Research/CoopSynergy_ItemWorld_Research.md` (협동 시너지 메커닉)
> **변경 사항:** 기존 리서치는 1-4인 + Server-Authoritative를 권장했으나, 2인 전용 PvE로 제약이 변경되어 아키텍처 재평가

---

## 1. 4가지 아키텍처 비교 (2인 PvE 전용)

### 1.1 Option A: Pure P2P (WebRTC DataChannel)

```
[Player 1 (Host)] <── WebRTC DataChannel ──> [Player 2 (Guest)]
                         (UDP-like)
       │
  게임 시뮬레이션 실행
  AI/적/아이템 드랍 결정
```

**동작 방식:**
- Player 1이 게임 시뮬레이션을 실행 (호스트)
- Player 2는 입력만 전송, 상태를 수신
- WebRTC DataChannel로 직접 P2P 연결 (서버 불필요)
- 시그널링 서버만 연결 초기에 필요

**장점:**
- 서버 비용 $0 (시그널링 서버 제외)
- 두 플레이어 간 직접 연결 = 최저 레이턴시 가능
- UDP 기반이므로 Head-of-Line Blocking 없음

**단점:**
- NAT traversal 문제: 기업 네트워크, 모바일 핫스팟 등에서 P2P 연결 실패율 10-30%
- TURN 서버(폴백) 필요 = 추가 비용 + 복잡도
- WebRTC 시그널링 구현 복잡도 높음 (ICE, SDP, STUN)
- 호스트 치트 완전 무방비
- 호스트 연결 끊김 = 즉시 게임 종료

**구현 복잡도:** 높음 (시그널링 서버 + ICE 협상 + TURN 폴백)
**예상 코드량:** 서버 측 500줄 + 클라이언트 네트워크 레이어 800줄

**결론: 부적합.** NAT 문제로 "URL 공유로 즉시 합류" 경험이 보장되지 않음. 솔로 개발자가 WebRTC 인프라를 유지보수하기 어려움.

---

### 1.2 Option B: WebSocket Relay (Thin Server)

```
[Player 1] ──WebSocket──> [Relay Server] <──WebSocket── [Player 2]
                          (메시지 중계만)
    │                                              │
 자체 시뮬레이션                              자체 시뮬레이션
```

**동작 방식:**
- 서버는 메시지를 양쪽에 중계할 뿐, 게임 로직을 실행하지 않음
- 각 클라이언트가 독립적으로 게임 시뮬레이션을 실행
- 입력을 교환하여 동기화 (Lockstep 또는 Rollback)

**장점:**
- 서버 비용 최소 (CPU 거의 미사용, 패킷 포워딩만)
- Cloudflare Durable Objects로 구현 시 월 $5 이하
- NAT 문제 없음 (WebSocket은 거의 모든 환경에서 통과)
- 서버 구현 100줄 미만

**단점:**
- **결정론성 문제 (치명적):** JavaScript에서 완전한 결정론적 시뮬레이션이 극히 어려움
  - `Math.random()` 동기화 필요
  - 부동소수점 연산 순서가 브라우저/OS마다 다를 수 있음
  - PixiJS 물리/충돌 결정론성 미보장
- Desync 발생 시 디버깅 극히 어려움
- 치트 보호 없음 (양쪽 다 자체 시뮬레이션)
- 2인 이상 확장 시 N^2 동기화 복잡도

**구현 복잡도:** 서버는 낮음, 클라이언트 결정론성 확보는 극히 높음
**예상 코드량:** 서버 100줄 + 결정론적 시뮬레이션 리팩터링 2000줄+

**결론: 부적합.** TypeScript/PixiJS 환경에서 결정론성 확보가 현실적으로 불가능. Windblown이 Photon Quantum(C#, 자체 고정소수점 수학 라이브러리)을 사용한 이유가 바로 이것임.

---

### 1.3 Option C: Server Authoritative (Full)

```
[Player 1] ──입력──> [Game Server] <──입력── [Player 2]
                     (게임 시뮬레이션)
    │                    │                    │
 예측+보간          AI/물리/판정          예측+보간
```

**동작 방식:**
- 서버가 게임 시뮬레이션의 유일한 진실 (Single Source of Truth)
- 클라이언트는 입력 전송 + 예측 + 서버 보정
- 기존 `OnlineCoop_Netcode_Research.md`에서 상세 설계한 모델

**장점:**
- 치트 방지 강력
- 결정론성 불필요 (서버가 유일한 시뮬레이션)
- 도중 참여/재연결 용이
- 2인 -> 4인 확장 자연스러움

**단점:**
- 서버 비용 높음 (게임 로직 실행 = CPU 상시 소모)
- Always-on 서버 인스턴스 필요
- 클라이언트 예측 + 서버 보정 구현 복잡도 높음
- 2인 PvE에서 치트 방지의 가치가 낮음 (경쟁 요소 없음)
- 솔로 개발자가 서버/클라이언트 양쪽 게임 로직 유지보수

**구현 복잡도:** 높음 (서버 게임 루프 + 클라이언트 예측 + 보정)
**예상 코드량:** 서버 2000줄 + 클라이언트 네트워크 레이어 1500줄
**월 비용:** Fly.io 기준 $10-30/월 (always-on VM), 동시 세션 수에 비례

**결론: 과잉 설계.** 2인 PvE에서 Server-Authoritative의 핵심 장점(치트 방지)이 가치를 발휘하지 못함. 솔로 개발자에게 서버+클라이언트 양쪽 게임 로직은 부담이 큼.

---

### 1.4 Option D: Host Authoritative + WebSocket Relay (권장)

```
[Player 1 (Host)] ──WebSocket──> [Relay Server] <──WebSocket── [Player 2 (Guest)]
       │                        (메시지 중계만)
  게임 시뮬레이션 실행
  AI/적/아이템 드랍 결정
  Player 2 입력 수신 후 처리
       │
  상태 스냅샷 → Relay → Player 2
```

**동작 방식:**
1. Player 1(Host)의 클라이언트가 전체 게임 시뮬레이션을 실행
2. Player 2(Guest)는 입력만 전송, Host로부터 상태를 수신
3. Relay 서버는 양쪽 WebSocket 메시지를 중계할 뿐 게임 로직 없음
4. Guest는 로컬 예측으로 반응성 확보, Host 상태로 보정

**장점:**
- **서버 비용 최소:** Relay는 CPU를 거의 사용하지 않음 (패킷 포워딩만)
- **결정론성 불필요:** Host 한 곳에서만 시뮬레이션 실행
- **NAT 문제 없음:** WebSocket은 거의 모든 환경에서 동작
- **구현 단순:** 기존 솔로 게임 코드를 Host 역할로 그대로 활용
- **코드 중복 없음:** 서버 게임 로직 = 클라이언트 게임 로직 (동일 코드)
- **URL 합류 자연스러움:** URL에 세션 ID 포함 → Relay 서버에 연결 → Host에 중계

**단점:**
- Host 어드밴티지: Host는 레이턴시 0ms, Guest는 RTT/2 지연
- Host 연결 끊김 = 게임 종료 (마이그레이션 불가)
- Host 치트 가능 (PvE이므로 실질적 문제 없음)

**구현 복잡도:** 낮음-중간
**예상 코드량:** Relay 서버 150줄 + 클라이언트 네트워크 레이어 600줄

---

## 2. 레퍼런스 게임 넷코드 분석

### 2.1 비교 매트릭스

| 게임 | 장르 | 인원 | 아키텍처 | 전송 | 결정론적 | 비고 |
|:---|:---|:---|:---|:---|:---|:---|
| **Spelunky 2** | 2D 로그라이크 | 1-4 | Server + 결정론적 전파 | Steam/UDP | O | GDC 2021 발표. "Deterministic Propagation" 커스텀 넷코드 |
| **Terraria** | 2D 샌드박스 | 1-8 | Host Authoritative | TCP | X | Host & Play 모드. 호스트가 월드 시뮬레이션 |
| **Risk of Rain 2** | 3D 로그라이크 | 1-4 | Host Authoritative | Steam P2P | X | 호스트가 게임 로직 실행. 전용 서버도 지원 |
| **Castle Crashers** | 2D 비트뎀업 | 1-4 | P2P | Steam P2P | X | Desync 이슈 빈번. 넷코드 불안정 |
| **Windblown** | 2D 로그라이크 | 1-3 | 결정론적 Rollback | Photon Quantum | O | C# + 고정소수점. Motion Twin 자체 개발 불가로 Photon 채택 |
| **agar.io** | 웹 .io 게임 | 500 | Server Authoritative | WebSocket | X | Node.js + Socket.IO. 서버가 모든 상태 관리 |
| **slither.io** | 웹 .io 게임 | 600 | Server Authoritative | WebSocket | X | 서버당 600명. WebSocket TCP 기반 |

### 2.2 핵심 인사이트

**Spelunky 2의 교훈:**
- 결정론적 시뮬레이션을 C++에서 구현하는 데도 막대한 노력이 들었음
- GDC 2021 발표에서 "propagation netcode"라는 독자적 방식을 설명 -- 롤백의 변형이지만 시뮬레이션 전체를 롤백하지 않고 변경 사항만 전파
- **ECHORIS 시사점:** TypeScript에서 이 수준의 결정론성은 비현실적

**Terraria / Risk of Rain 2의 교훈:**
- 둘 다 Host Authoritative 방식을 사용
- 호스트가 월드/게임 시뮬레이션을 실행하고, 다른 플레이어는 상태를 수신
- Terraria는 TCP 기반이며 ECHORIS와 유사한 환경 (2D, PvE)
- **ECHORIS 시사점:** Host Authoritative가 2D PvE 협동에서 검증된 모델

**Windblown의 교훈:**
- Motion Twin은 결정론적 넷코드를 직접 구현하지 않고 Photon Quantum 엔진을 채택
- Quantum이 고정소수점 수학, 결정론적 물리를 모두 제공하므로 가능
- 개발 초기 "몇 주"의 학습 곡선 후에는 로컬 멀티플레이어처럼 개발 가능
- **ECHORIS 시사점:** TypeScript 환경에서 Photon Quantum 같은 결정론적 프레임워크가 없으므로, 결정론적 방식은 선택지에서 제외

**웹 게임(.io 게임)의 교훈:**
- agar.io, slither.io 모두 Server-Authoritative + WebSocket
- 하지만 이들은 수백 명 동시 접속을 처리해야 하므로 서버가 필수
- 2인 PvE에서는 이 정도의 서버가 불필요
- **ECHORIS 시사점:** .io 게임 모델은 과잉. 2인에게는 Host Authoritative가 적합

---

## 3. WebSocket vs WebRTC DataChannel

### 3.1 상세 비교

| 항목 | WebSocket (TCP) | WebRTC DataChannel |
|:---|:---|:---|
| 전송 프로토콜 | TCP | SCTP over UDP (또는 TCP 폴백) |
| 패킷 유실 | 자동 재전송 | 유실 허용 모드 가능 (unreliable) |
| 순서 보장 | 강제 | 선택 가능 (ordered/unordered) |
| Head-of-Line Blocking | 있음 (TCP 특성) | 없음 (unreliable 모드) |
| 레이턴시 | RTT/2 + 재전송 오버헤드 | RTT/2 (재전송 없으면 더 낮음) |
| NAT 통과 | 거의 100% (HTTP 업그레이드) | 70-90% (STUN 필요, 실패 시 TURN) |
| 구현 복잡도 | **매우 낮음** (ws 라이브러리) | 높음 (시그널링 + ICE + SDP) |
| 서버 필요 | Relay 서버 | 시그널링 서버 + STUN + TURN(폴백) |
| 브라우저 지원 | 100% | Chrome 70+, Firefox 63+, Safari 15.4+ |
| 디버깅 | 쉬움 (브라우저 DevTools) | 어려움 (ICE 후보 디버깅 복잡) |

### 3.2 ECHORIS에 대한 판단

**WebSocket 선택이 최적인 이유:**

1. **NAT 통과 보장:** "URL 공유로 즉시 합류"가 핵심 UX. WebRTC는 NAT 실패 시 TURN 폴백이 필요하며, TURN 서버 비용이 발생. WebSocket은 HTTP 업그레이드이므로 거의 100% 연결 성공.

2. **PvE 레이턴시 허용치:** 2인 PvE 횡스크롤에서 허용 가능한 RTT는 200ms (기존 리서치 기준). WebSocket TCP의 Head-of-Line Blocking이 발생해도 PvE에서는 체감 영향 미미.

3. **솔로 개발자 복잡도:** WebSocket은 Node.js `ws` 라이브러리 하나로 즉시 구현 가능. WebRTC는 시그널링, ICE 협상, TURN 폴백, 연결 실패 처리 등 부수 인프라가 필요.

4. **신뢰성 필수 이벤트:** 기억 단편 복종, 아이템 드랍 등은 유실되면 안 됨. WebSocket TCP에서는 이를 무료로 보장. WebRTC unreliable 모드에서는 별도 ACK 레이어 구현 필요.

5. **비용:** WebSocket Relay는 Cloudflare Durable Objects($5/월)로 충분. WebRTC는 TURN 서버(Twilio: $0.0004/분, 월 수만 원 가능)가 추가.

**WebRTC가 더 나은 유일한 시나리오:**
- RTT 20ms 미만의 초저지연이 필요한 PvP 격투게임
- ECHORIS는 PvE이므로 해당하지 않음

---

## 4. 레이턴시 요구사항 (2D 횡스크롤 PvE)

### 4.1 액션별 레이턴시 허용치

| 액션 | 허용 RTT | 보상 기법 | 근거 |
|:---|:---|:---|:---|
| 자기 캐릭터 이동 | 0ms (로컬 예측) | Host: 즉시 / Guest: 로컬 예측 | 입력 즉시 반영 필수 |
| 자기 캐릭터 공격 | 0ms (로컬 이펙트) | 이펙트/사운드 즉시 재생, 판정은 Host 확인 후 | 타격감 즉시 필요 |
| 상대 캐릭터 이동 | 100-150ms | 엔티티 보간 (100ms 버퍼) | 부드럽게 보이면 충분 |
| 적 피격/사망 | 50-100ms | Host에서 확정 후 브로드캐스트 | 약간의 지연 허용 |
| 보스 텔레그래프 | 200ms까지 | 1500ms 예고 시간이 RTT를 충분히 흡수 | 반응 시간 여유 |
| 아이템 드랍 | 500ms까지 | 서버 확정 후 표시 | 실시간성 불필요 |
| 기억 단편 복종 | 1000ms까지 | 서버 확정 + ACK | 경제적 가치, 정확성 우선 |

### 4.2 Host vs Guest 체감 차이

**Host (Player 1):**
- 레이턴시 0ms (로컬 시뮬레이션)
- 솔로 플레이와 동일한 체감

**Guest (Player 2):**
- 자기 이동/공격: 로컬 예측으로 0ms 체감
- Host 보정 시 위치 차이: RTT/2 (통상 25-75ms)
- 적 상태/HP: Host 시뮬레이션 결과를 수신하므로 RTT 지연
- 보스 텔레그래프: Host가 발생시킨 이벤트를 수신하므로 RTT 지연

**PvE에서 Host Advantage가 문제가 되지 않는 이유:**
- PvP가 없으므로 "불공정"이 존재하지 않음
- Guest가 보스 패턴에 RTT만큼 늦게 반응해도, 텔레그래프 시간이 충분하므로 체감 차이 미미
- 드랍/보상은 개인 귀속이므로 경쟁 없음

### 4.3 Desync 허용 범위 (PvE 특성)

PvE 협동에서는 PvP와 달리 상당한 desync를 허용할 수 있음:

| 항목 | 허용 범위 | 이유 |
|:---|:---|:---|
| 적 위치 | 32px (1타일) | Guest 화면에서 적이 1타일 차이나도 게임플레이 영향 없음 |
| 적 HP | 1틱 차이 | HP바가 50ms 늦게 내려가도 인지 불가 |
| 아이템 위치 | 완전 동기화 | 줍기 판정은 Host가 결정 |
| 플랫폼/지형 | 동기화 불필요 | 절차적 생성은 시드 공유로 동일 맵 보장 |

---

## 5. 권장 아키텍처: Host Authoritative + WebSocket Relay

### 5.1 최종 권장안

```
┌─────────────────────────────────────────────────────────┐
│                    Relay Server                          │
│         (Cloudflare Durable Objects / Fly.io)           │
│                                                          │
│  역할: WebSocket 메시지 중계 + 세션 관리 + URL 합류     │
│  게임 로직: 없음                                         │
│  CPU 사용: 최소 (패킷 포워딩)                            │
│  상태 저장: 세션 ID, 플레이어 목록만                     │
│                                                          │
│  [WS 연결 1: Host] <──────> [WS 연결 2: Guest]          │
└─────────────────────────────────────────────────────────┘
         │                           │
         ▼                           ▼
┌─────────────────┐        ┌──────────────────┐
│  Player 1 (Host) │        │  Player 2 (Guest) │
│                   │        │                    │
│ - 전체 시뮬레이션 │        │ - 로컬 예측        │
│ - AI/적/보스 실행 │        │ - 입력 → Host 전송 │
│ - 물리/충돌 판정  │        │ - 상태 수신 → 보정 │
│ - 아이템 드랍 결정│        │ - 엔티티 보간      │
│ - 기억 단편 처리  │        │ - 이펙트/사운드    │
│                   │        │                    │
│ 레이턴시: 0ms    │        │ 레이턴시: RTT/2    │
└─────────────────┘        └──────────────────┘
```

### 5.2 선택 근거 요약

| 평가 기준 | Option A (P2P) | Option B (Relay Sim) | Option C (Server Auth) | **Option D (Host Auth)** |
|:---|:---|:---|:---|:---|
| 서버 비용 | $0 + TURN비용 | $5/월 | $10-30/월 | **$5/월** |
| NAT 통과 | 70-90% | 100% | 100% | **100%** |
| 구현 복잡도 | 높음 | 극히 높음(결정론) | 높음 | **낮음-중간** |
| 치트 방지 | 없음 | 없음 | 강함 | 약함 (PvE 무관) |
| 코드 중복 | 없음 | 중복(2x시뮬) | 서버+클라 분리 | **없음** |
| 확장성(4인) | 어려움 | 어려움 | 쉬움 | 보통 |
| 솔로 개발자 적합 | X | X | X | **O** |

**Option D가 최적인 핵심 이유:**
1. **기존 코드 재활용:** 현재 솔로 게임 코드가 그대로 Host 역할을 수행. 서버용 게임 로직을 별도로 작성할 필요 없음.
2. **PvE 특성 활용:** 치트 방지가 불필요하므로 Server-Authoritative의 복잡도를 피할 수 있음.
3. **2인 전용 최적화:** 동기화 대상이 1명뿐이므로 넷코드 복잡도가 극히 낮음.

### 5.3 Host Authoritative의 한계와 대응

| 한계 | 심각도 | 대응 |
|:---|:---|:---|
| Host 치트 가능 | **낮음** | PvE이므로 자기 게임만 쉬워짐. 리더보드/경쟁 요소 없으면 무해 |
| Host 끊김 = 게임 종료 | **중간** | 아이템계 진행 상황을 주기적으로 Relay에 체크포인트 저장. Host 복귀 시 재개 |
| Host 어드밴티지 | **낮음** | PvE 협동이므로 불공정 개념 없음. Guest 예측으로 체감 차이 최소화 |
| 4인 확장 시 Host 부하 | **중간** | Phase 4+에서 4인 필요 시, Host 기기 성능이 병목. 이 시점에 Server Auth 전환 검토 |

---

## 6. 최소 구현 설계 (Minimal Viable Implementation)

### 6.1 Relay Server (150줄 이하)

```typescript
// relay-server.ts (Cloudflare Durable Object 또는 Node.js)
// 핵심: 세션 생성 + 메시지 중계

interface Session {
  id: string;
  host: WebSocket | null;
  guest: WebSocket | null;
}

const sessions = new Map<string, Session>();

// URL 기반 세션 생성/합류
// POST /session/create → { sessionId: "abc123" }
// GET  /session/join/:id → WebSocket 업그레이드

function onMessage(ws: WebSocket, session: Session, data: any) {
  // Host → Guest 또는 Guest → Host로 메시지 중계
  const target = (ws === session.host) ? session.guest : session.host;
  if (target && target.readyState === WebSocket.OPEN) {
    target.send(data);
  }
}

function onClose(ws: WebSocket, session: Session) {
  if (ws === session.host) {
    // Host 끊김: Guest에게 알림 후 세션 정리
    session.guest?.send(JSON.stringify({ type: 'host_disconnected' }));
    sessions.delete(session.id);
  } else {
    // Guest 끊김: Host에게 알림, 세션 유지 (Host는 솔로 계속 가능)
    session.host?.send(JSON.stringify({ type: 'guest_disconnected' }));
    session.guest = null;
  }
}
```

### 6.2 클라이언트 네트워크 레이어 (Host 측)

```typescript
// network-host.ts
// Host는 기존 게임 루프에 네트워크 레이어만 추가

class HostNetwork {
  private ws: WebSocket;
  private snapshotInterval = 50; // 20Hz

  constructor(relayUrl: string, sessionId: string) {
    this.ws = new WebSocket(`${relayUrl}/session/join/${sessionId}`);
    this.ws.onmessage = this.onGuestInput.bind(this);

    // 20Hz 상태 스냅샷 전송
    setInterval(() => this.sendSnapshot(), this.snapshotInterval);
  }

  // Guest 입력 수신 → 게임 시뮬레이션에 반영
  private onGuestInput(event: MessageEvent) {
    const input: GuestInput = JSON.parse(event.data);
    if (input.type === 'input') {
      this.game.applyGuestInput(input);
    }
  }

  // 게임 상태 스냅샷을 Guest에게 전송
  private sendSnapshot() {
    const snapshot: WorldSnapshot = {
      type: 'snapshot',
      tick: this.game.tick,
      hostPlayer: this.game.getHostState(),
      guestPlayer: this.game.getGuestState(),
      enemies: this.game.getEnemyStates(),
      events: this.game.flushEvents(), // 히트, 드랍 등
    };
    this.ws.send(JSON.stringify(snapshot));
  }
}
```

### 6.3 클라이언트 네트워크 레이어 (Guest 측)

```typescript
// network-guest.ts
// Guest는 입력 전송 + 상태 수신 + 로컬 예측

class GuestNetwork {
  private ws: WebSocket;
  private pendingInputs: GuestInput[] = [];
  private lastAppliedTick = 0;

  constructor(relayUrl: string, sessionId: string) {
    this.ws = new WebSocket(`${relayUrl}/session/join/${sessionId}`);
    this.ws.onmessage = this.onSnapshot.bind(this);
  }

  // 로컬 입력 → 즉시 예측 적용 + Host로 전송
  sendInput(input: GuestInput) {
    input.seq = this.nextSeq++;
    this.game.applyLocalPrediction(input); // 즉시 로컬 반영
    this.pendingInputs.push(input);
    this.ws.send(JSON.stringify(input));
  }

  // Host 스냅샷 수신 → 보정
  private onSnapshot(event: MessageEvent) {
    const snapshot: WorldSnapshot = JSON.parse(event.data);
    if (snapshot.tick <= this.lastAppliedTick) return; // 구버전 무시
    this.lastAppliedTick = snapshot.tick;

    // 자기 캐릭터: 서버 상태로 보정
    const serverPos = snapshot.guestPlayer.position;
    const localPos = this.game.guestPlayer.position;
    const diff = distance(serverPos, localPos);

    if (diff > 32) {
      // 32px 초과: 즉시 스냅
      this.game.guestPlayer.position = serverPos;
    } else if (diff > 2) {
      // 2-32px: 부드러운 보간
      this.game.guestPlayer.position = lerp(localPos, serverPos, 0.3);
    }
    // 2px 이하: 무시 (예측이 정확)

    // 다른 엔티티: 보간 버퍼에 추가
    this.game.interpolateHostPlayer(snapshot.hostPlayer);
    this.game.interpolateEnemies(snapshot.enemies);

    // 이벤트 처리 (히트, 드랍 등)
    for (const event of snapshot.events) {
      this.game.handleNetworkEvent(event);
    }

    // 처리된 입력 제거
    this.pendingInputs = this.pendingInputs.filter(
      i => i.seq > snapshot.lastProcessedGuestSeq
    );
  }
}
```

### 6.4 구현 단계별 로드맵

| 단계 | 내용 | 예상 공수 | 비고 |
|:---|:---|:---|:---|
| **Step 1** | Relay 서버 구축 (세션 생성/합류/중계) | 2일 | Cloudflare DO 또는 Node.js |
| **Step 2** | Host: 상태 스냅샷 직렬화 + 전송 (20Hz) | 2일 | JSON, 기존 게임 상태 활용 |
| **Step 3** | Guest: 스냅샷 수신 + 엔티티 보간 | 2일 | LERP 100ms 버퍼 |
| **Step 4** | Guest: 입력 전송 + 로컬 예측 | 2일 | 이동/점프/공격 예측 |
| **Step 5** | Host: Guest 입력 수신 + 게임에 반영 | 1일 | 기존 입력 시스템 확장 |
| **Step 6** | 이벤트 동기화 (히트, 드랍, 보스) | 3일 | 이벤트 큐 시스템 |
| **Step 7** | URL 합류 UX + 세션 관리 | 1일 | URL에 세션 ID 포함 |
| **Step 8** | 재연결/끊김 처리 | 2일 | Host 끊김 알림, Guest 재연결 |
| **합계** | | **15일** | 약 3주 (파트타임 기준 4-5주) |

---

## 7. 비용 분석

### 7.1 호스팅 플랫폼 비교

| 플랫폼 | 역할 | 무료 티어 | 유료 시작가 | WebSocket 지원 | ECHORIS 적합도 |
|:---|:---|:---|:---|:---|:---|
| **Cloudflare Durable Objects** | Relay 서버 | 10만 요청/일, 13,000 GB-s/일 | $5/월 | O (Hibernation API) | **최적** |
| **Fly.io** | Relay 또는 Game 서버 | 없음 (폐지) | $5/월 (최소 VM) | O | 좋음 |
| **Railway** | Relay 또는 Game 서버 | $5 크레딧/월 | $5/월 | O | 좋음 |
| **Render** | Relay 서버 | 무료 (750시간/월) | $7/월 | O (제한적) | 보통 |
| **Vercel** | 부적합 | - | - | X (서버리스) | 부적합 |

### 7.2 Cloudflare Durable Objects 상세 비용 계산

**가정:**
- 동시 세션: 10개 (초기 단계)
- 세션당 평균 시간: 30분
- 20Hz 스냅샷 = 초당 20 메시지 x 2방향 = 40 메시지/초
- 입력: 초당 10 메시지 (Guest → Host)
- 일일 총 세션: 50회

**월간 비용 계산:**

```
1. 연결 요청: 50 세션/일 × 2 플레이어 × 30일 = 3,000 요청/월
2. WebSocket 메시지: 50 메시지/초 × 1,800초/세션 × 50 세션/일 × 30일
   = 135,000,000 메시지/월
   billing: 135,000,000 / 20 = 6,750,000 요청/월
3. 총 요청: 3,000 + 6,750,000 = 6,753,000 요청/월
4. 무료 할당: 1,000,000/월
5. 초과: 5,753,000 × $0.15/백만 = $0.86

Duration (Hibernation API 사용):
- 메시지 처리 시간만 과금 (패킷 포워딩 < 1ms)
- 실질적으로 $0에 가까움

총 비용: $5(기본) + $0.86 = 약 $5.86/월
```

**동시 100세션(서비스 성장):**
```
총 요청: ~67,500,000/월
초과: 66,500,000 × $0.15/백만 = $9.98
총 비용: $5 + $9.98 = 약 $15/월
```

### 7.3 Option C (Server Authoritative) 비용 비교

```
Fly.io shared-cpu-1x (256MB RAM):
- 기본: $1.94/월 (always-on)
- 동시 10세션 × 게임 루프(20Hz): CPU 20-30% 사용
- 메모리: 세션당 ~20MB = 200MB → 256MB VM으로 감당 한계

동시 10세션 기준: $5-10/월 (1 VM)
동시 100세션 기준: $50-100/월 (10 VM + 로드밸런서)
```

**비용 비교 요약:**

| 규모 | Option D (Host Auth + Relay) | Option C (Server Auth) |
|:---|:---|:---|
| 동시 10세션 | **$5.86/월** | $5-10/월 |
| 동시 100세션 | **$15/월** | $50-100/월 |
| 동시 1,000세션 | **$100/월** | $500-1,000/월 |

Host Authoritative는 세션 수가 늘어나도 Relay만 스케일하면 되므로, 비용 증가가 선형적. Server Authoritative는 게임 로직 실행 비용이 세션 수에 비례하여 급증.

---

## 8. Phase 확장 전략

### 8.1 Phase 3 (2인 협동) - Host Authoritative

현재 리서치의 권장안. 구현 복잡도와 비용이 최소.

```
Phase 3 아키텍처:
Player 1 (Host) ──WS──> Relay <──WS── Player 2 (Guest)
```

### 8.2 Phase 4+ (4인 확장 검토 시)

2인 → 4인 확장 시 선택지:

**Option 1: Host Authoritative 유지 (권장)**
- Host가 3명의 Guest 상태를 관리
- 대역폭: 3x 증가 (3명에게 스냅샷 전송)
- Host 기기 부하: 3x 증가 (3명의 입력 처리)
- 현대 PC에서 충분히 감당 가능 (20Hz 스냅샷, 2D 게임)
- **추가 구현 비용:** 기존 2인 코드에서 배열 확장 수준. 1-2일

**Option 2: Server Authoritative 전환**
- Host 기기 성능 편차가 문제가 되는 경우에만
- 게임 로직을 서버로 이전 = 대규모 리팩터링
- Phase 3에서 검증된 프로토콜/패킷 구조 재활용 가능
- **전환 비용:** 2-3주

**권장:** Phase 4에서도 Option 1(Host Authoritative 유지)을 먼저 시도. Host 기기 성능이 실제로 병목이 되는 경우에만 Server Authoritative 전환.

### 8.3 "2인 → 4인 전환 없이 2인 전용 유지" 시나리오

기획적으로 아이템계를 2인 전용으로 확정하면:
- 넷코드 복잡도가 최소로 유지됨
- "1 Host + 1 Guest" 고정이므로 엣지 케이스 감소
- 재연결 로직 단순화 (2명 중 1명만 재연결하면 됨)
- **권장:** Phase 3에서 2인으로 출시 후, 플레이어 피드백에 따라 4인 확장 결정

---

## 9. 핵심 결론

### 9.1 최종 권장 아키텍처

> **Host Authoritative + WebSocket Relay (Option D)**

| 항목 | 값 |
|:---|:---|
| 아키텍처 | Host Authoritative (Player 1 = 시뮬레이션) |
| 전송 | WebSocket (TCP) via Relay Server |
| Relay 서버 | Cloudflare Durable Objects (WebSocket Hibernation) |
| 서버 게임 로직 | 없음 (Host 클라이언트가 실행) |
| 클라이언트 예측 | Guest만 (이동/공격 로컬 예측) |
| 스냅샷 빈도 | 20Hz (50ms 간격) |
| 패킷 형식 | JSON (Phase 3), MessagePack (Phase 4+) |
| 합류 방식 | URL 링크 공유 (세션 ID 포함) |
| 월 비용 | $5-6 (초기), $15 (100세션) |
| 구현 기간 | 15일 (약 3주) |

### 9.2 기존 리서치와의 관계

기존 `OnlineCoop_Netcode_Research.md`는 1-4인 + Server-Authoritative + Redis + PostgreSQL을 전제한 포괄적 설계. 본 리서치는 **2인 전용 PvE**라는 제약 하에 최소 구현을 도출한 것.

**기존 리서치에서 재활용 가능한 설계:**
- 섹션 2.1: 이동 예측 패턴 (입력 시퀀스 번호, 미확인 입력 버퍼) → Guest 예측에 그대로 적용
- 섹션 2.2: 공격 판정 처리 흐름 → Host가 서버 역할을 대체
- 섹션 3.1: 엔티티 보간 (LERP 100ms 버퍼) → Guest의 상대방/적 표시에 적용
- 섹션 4.2: 탭 비활성화 대응 (Page Visibility API) → 그대로 적용
- 섹션 5.1: 히트스탑 동기화 하이브리드 → 그대로 적용
- 섹션 6: 레이턴시별 체감 품질 → 그대로 적용
- 섹션 7.2: 패킷 구조 설계 → 간소화하여 적용

**기존 리서치에서 불필요한 설계:**
- 서버 게임 루프 (Host 클라이언트가 대체)
- Redis 세션 관리 (Relay 서버 내 인메모리로 충분)
- PostgreSQL 영구 저장 (Phase 3에서는 LocalStorage + Host 메모리)
- Lag Compensation 히스토리 버퍼 (PvE에서 과잉)
- 매치메이킹 큐 (URL 링크 합류이므로 불필요)

---

## 출처 및 참고 자료

- **GDC Vault:** ["Breaking the Ankh: Deterministic Propagation Netcode in Spelunky 2"](https://www.gdcvault.com/play/1027358/Breaking-the-Ankh-Deterministic-Propagation) (Guillermo, 2021)
- **Photon Engine Blog:** ["Crafting Lightning: How Motion Twin Built Windblown with Photon Quantum"](https://blog.photonengine.com/motion-twin-windblown-photon-quantum/)
- **Terraria Wiki:** [Server Architecture](https://terraria.fandom.com/wiki/Server), [Network Protocol](https://seancode.com/terrafirma/net.html)
- **Rune Developers Blog:** ["WebRTC vs WebSockets for Multiplayer Games"](https://developers.rune.ai/blog/webrtc-vs-websockets-for-multiplayer-games)
- **Gabriel Gambetta:** ["Client-Server Game Architecture"](https://www.gabrielgambetta.com/client-server-game-architecture.html)
- **Cloudflare Docs:** [Durable Objects Pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/), [WebSocket Hibernation](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)
- **Edgegap Blog:** ["Authoritative Servers, Relays & Peer-To-Peer"](https://edgegap.com/blog/explainer-series-authoritative-servers-relays-peer-to-peer-understanding-networking-types-and-their-benefits-for-each-game-types)
- **Hacker News:** ["Games like agar.io use websockets over TCP"](https://news.ycombinator.com/item?id=18519432)
- **Colyseus:** [Real-Time Multiplayer Framework](https://colyseus.io/)
- **MDN Web Docs:** [WebRTC Data Channels](https://developer.mozilla.org/en-US/docs/Games/Techniques/WebRTC_data_channels)
- 내부 문서: `OnlineCoop_Netcode_Research.md`, `CoopSynergy_ItemWorld_Research.md`, `Reference/게임 기획 개요.md`
