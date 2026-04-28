# 코옵 세션 세이브 동기화 리서치 리포트

> **작성일:** 2026-04-15
> **담당:** 리서처
> **목적:** ECHORIS 1인 솔로 세이브 ↔ 2인 코옵 세이브의 연동 설계 근거 확보
> **핵심 질문:** "Guest가 URL로 합류했을 때, 캐릭터 데이터는 어디서 오고, 아이템계 결과는 어디에 저장되는가?"
> **선행 문서:**
> - `Documents/Research/TwoPlayerNetcode_Architecture_Research.md` (Host Authoritative)
> - `Documents/Research/URLJoin_CoopSession_Research.md` (URL 즉시 합류)

---

## 1. 레퍼런스 게임 세이브 처리 패턴

### 1.1. 패턴 비교

| 패턴 | 설명 | 대표 게임 | 서버 부담 | 치팅 방지 |
|:---|:---|:---|:---|:---|
| **A. 서버 권위** | 모든 세이브가 서버에 존재 | Diablo 3/4, PoE, Destiny 2, MapleStory, Elsword | 높음 | 강함 |
| **B. 클라이언트 전송** | 로컬 세이브를 합류 시 서버로 전송 | Terraria, Monster Hunter | 낮음 | 약함 |
| **C. 런 단위 초기화** | 영구 진행은 로컬, 런 내 데이터는 초기화 | Risk of Rain 2 | 없음 | 없음 |

### 1.2. 게임별 상세

| 게임 | 합류 시 캐릭터 소스 | 신규 플레이어 처리 | 보상 저장 시점 |
|:---|:---|:---|:---|
| **Terraria** | 클라이언트 로컬 .plr 파일 | 캐릭터 생성 필수 | 실시간 |
| **Diablo 3/4** | 서버 | 캐릭터 생성 + 튜토리얼 필수 | 즉시 서버 기록 |
| **Monster Hunter** | 로컬 세이브 | 튜토리얼 필수 | 퀘스트 완료 시 |
| **Risk of Rain 2** | 없음 (런마다 초기화) | 기본 캐릭터로 즉시 합류 | 런 종료 시 (언락만) |
| **Deep Rock Galactic** | Steam/Xbox 클라우드 | 기본 클래스로 즉시 합류 | 미션 완료 시 |
| **Path of Exile** | 서버 | 캐릭터 생성 필수 | 즉시 서버 기록 |

---

## 2. ECHORIS 세이브 아키텍처 (권장)

### 2.1. Phase별 진화

```
[Phase 1: 현재]  localStorage 전용 (솔로 프로토타입)
         |
[Phase 2: 준비]  localStorage + Cloudflare D1 (서버 세이브 도입)
         |
[Phase 3: 멀티]  D1 권위 + localStorage 캐시 (코옵 런칭)
```

### 2.2. Phase 3 구조

```
Guest B 브라우저              Cloudflare                    Host A 브라우저
+--------------+            +------------------+          +--------------+
| localStorage |--- WS ---->| Durable Object   |<--- WS --| localStorage |
| (캐시)       |            | (세션 관리)       |          | (캐시)       |
+--------------+            |                  |          +--------------+
                            | D1 (SQLite)      |
                            | (권위 세이브 DB)  |
                            |                  |
                            | KV (캐시/토큰)    |
                            +------------------+
```

### 2.3. 세이브 읽기/쓰기 규칙

| 동작 | 처리 |
|:---|:---|
| **세이브 쓰기** | 게임 → localStorage(즉시) + D1(비동기) |
| **세이브 읽기** | localStorage 있으면 사용 → 없으면 D1에서 복구 |
| **버전 충돌** | D1 타임스탬프 > localStorage → D1 우선 |
| **캐시 삭제** | localStorage 소실 → D1에서 전체 복구 |

---

## 3. 코옵 합류 시 데이터 흐름

### 3.1. 기존 플레이어가 합류 (세이브 있음)

```
Guest가 URL 클릭
    |
    v
localStorage에 UUID 있음
    |
    v
Worker에 UUID + JWT 전송
    |
    v
D1에서 세이브 로드
    |
    v
WebSocket으로 Durable Object 접속
    |
    v
자기 캐릭터(레벨/장비/기억 단편)로 아이템계 합류
```

### 3.2. 신규 플레이어가 합류 (세이브 없음)

```
Guest가 URL 클릭 (게임 처음)
    |
    v
localStorage에 UUID 없음
    |
    v
새 UUID 생성 → Worker에 등록 → JWT 발급
    |
    v
Express Join: 프리셋 캐릭터 자동 생성
  - 레벨: Host 아이템계 권장 레벨에 맞춤
  - 장비: Normal 등급 기본 검
  - 능력: 대시만 해금
  - HP/ATK: 해당 지층 최소 권장 수치
    |
    v
프리셋 캐릭터로 즉시 합류 (튜토리얼 게이트 없음)
    |
    v
세션 종료 후: "계속 플레이하시겠습니까?" → 세이브 생성
```

**설계 근거:** ECHORIS의 핵심 온보딩 = "친구가 URL을 보내줬는데 해보고 싶다". 튜토리얼 게이트는 이 시나리오를 파괴함. RoR2/DRG가 이 패턴으로 성공.

---

## 4. 보상 저장 타이밍

### 4.1. 체크포인트 커밋 모델

```
아이템계 진입
    |
    v
층 클리어마다 "잠정 보상" 서버 기록 (D1에 committed=0)
    |
    v
보스 클리어 (지층 끝) → "확정 커밋" (D1에 committed=1, 양쪽 세이브 업데이트)
    |
    v
정상 탈출/클리어 → 최종 확정
```

### 4.2. 비정상 종료 처리

| 상황 | 처리 | 보상 |
|:---|:---|:---|
| **Guest 연결 끊김** | 마지막 확정 커밋(보스 클리어)까지 보존 | 체크포인트 이후 진행 손실 |
| **Host 연결 끊김** | DO가 30초 대기 → 미복귀 시 세션 종료 | 마지막 확정 커밋까지 보존 |
| **양쪽 동시 끊김** | DO가 30초 유지 후 종료 | 마지막 확정 커밋까지 보존 |
| **정상 탈출** | 최종 보상 양쪽 D1에 커밋 | 전부 보존 |

**핵심:** "보스 클리어 = 체크포인트"라는 기존 아이템계 설계가 멀티플레이 세이브 포인트와 자연스럽게 일치.

---

## 5. 계정 시스템 (Progressive Authentication)

### 5.1. 3단계 인증

| 단계 | 식별 | 기능 | 전환 조건 |
|:---|:---|:---|:---|
| **0. 익명** | localStorage UUID | 솔로 플레이, localStorage 전용 | 멀티 합류 시 → 1 |
| **1. 디바이스 토큰** | UUID + 서버 JWT | 솔로 + 멀티, D1 세이브 | 다른 디바이스 → 2 |
| **2. 소셜 로그인** | Google/Discord OAuth | 크로스 디바이스, 세이브 복구 | 선택적 |

### 5.2. UUID → OAuth 마이그레이션

```
1. 플레이어가 Settings에서 "Google로 연결" 클릭
2. OAuth 흐름 → Google ID 획득
3. D1: players 테이블에 auth_provider='google', auth_id='{google_id}' 업데이트
4. 기존 UUID 세이브는 Google ID에 병합
5. 이후 다른 디바이스에서 Google 로그인 → 동일 세이브 접근
```

### 5.3. 서버 세이브가 필수인 시점

| 기능 | localStorage만? | 서버 필요? |
|:---|:---|:---|
| 솔로 플레이 | O | X |
| URL 코옵 (동일 디바이스) | O (세션 중계만) | O (세션) |
| URL 코옵 (다른 디바이스) | X | **O (세이브 동기화)** |
| 코옵 보상 저장 | 위험 | **O (권위 서버)** |
| 크로스 디바이스 | X | **O** |

**결론: 멀티플레이 = 서버 사이드 세이브 필수.**

---

## 6. D1 스키마 (최소)

```sql
CREATE TABLE players (
  id TEXT PRIMARY KEY,          -- UUID
  save_data TEXT NOT NULL,      -- JSON (현재 SaveData 구조 그대로)
  updated_at INTEGER NOT NULL,  -- Unix timestamp
  auth_provider TEXT DEFAULT 'anonymous',
  auth_id TEXT
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  host_id TEXT NOT NULL,
  item_uid INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  checkpoint_floor INTEGER DEFAULT 0,
  FOREIGN KEY (host_id) REFERENCES players(id)
);

CREATE TABLE checkpoints (
  session_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  floor INTEGER NOT NULL,
  reward_data TEXT NOT NULL,     -- JSON
  committed INTEGER DEFAULT 0,  -- 0=잠정, 1=확정
  PRIMARY KEY (session_id, player_id, floor)
);
```

---

## 7. 비용

| Cloudflare 서비스 | 무료 티어 | 초기 사용량 | 월 비용 |
|:---|:---|:---|:---|
| Workers | 10만 req/일 | 충분 | $0 |
| Durable Objects | 10만 req/일, 1GB | 동시 10세션 미만 | $0-5 |
| D1 | 500만 읽기/일 | 충분 | $0 |
| KV | 10만 읽기/일 | 충분 | $0 |
| Pages | 무제한 | 무제한 | $0 |
| **합계** | -- | -- | **$0-5** |

---

## 8. SaveManager 마이그레이션 경로

현재 `game/src/utils/SaveManager.ts`는 localStorage 전용. 점진적 확장:

### Step 1: Backend 인터페이스 추상화 (Phase 2 준비)

```typescript
interface SaveBackend {
  save(playerId: string, data: SaveData): Promise<void>;
  load(playerId: string): Promise<SaveData | null>;
}

class LocalStorageBackend implements SaveBackend { ... }  // 현재
class CloudBackend implements SaveBackend { ... }         // D1 연동
class HybridBackend implements SaveBackend { ... }        // 양쪽
```

### Step 2: 플레이어 UUID 도입

### Step 3: 서버 동기화 (Cloudflare D1)
