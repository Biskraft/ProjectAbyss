# URL 기반 즉시 합류 멀티플레이 리서치 리포트

> **작성일:** 2026-04-15
> **담당:** 리서처
> **목적:** ECHORIS 아이템계 2인 협동의 URL 공유 즉시 합류 설계 근거 확보
> **조건:** 웹 브라우저(PixiJS/TS), WebSocket, Host Authoritative + Cloudflare Durable Objects, 2인 전용
> **선행 문서:**
> - `Documents/Research/TwoPlayerNetcode_Architecture_Research.md`
> - `Documents/Design/Design_Monetization_Strategy.md` (섹션 6: 바이럴 퍼널)

---

## 1. URL 스키마 설계

### 1.1. URL 형식 비교

| 형식 | 예시 | OG 태그 | 가독성 | 권장 |
|:---|:---|:---|:---|:---|
| **Path 기반** | `echoris.io/join/A7K9X2` | O (서버가 path 읽음) | 깔끔 | **채택** |
| Query 기반 | `echoris.io/play?s=A7K9X2` | O | 길어 보임 | - |
| Hash 기반 | `echoris.io/#join:A7K9X2` | X (서버가 hash 못 읽음) | 깔끔 | 탈락 |

**결정: `https://echoris.io/join/{code}`**

### 1.2. 세션 코드

**6자리 영대문자+숫자, 혼동 문자 제외 (29자 세트)**

```typescript
// O/0, I/1/L 제외
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 29자
// 29^6 = 약 5.9억 조합 -- 동시 수천 세션에서 충돌 0

function generateSessionCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes)
    .map(b => CHARSET[b % CHARSET.length])
    .join('');
}
```

- Among Us(6자리 영문)/Jackbox(4자리 숫자)에서 검증된 패턴
- 구두 전달 가능 ("코드 A7K9X2야")
- URL과 코드 직접 입력 양쪽 지원

### 1.3. 버전 정보

URL에 미포함. WebSocket 핸드셰이크 시 빌드 해시 교환으로 처리.

```typescript
// Guest → Relay → Host
{ type: 'join', sessionCode: 'A7K9X2', buildHash: __BUILD_HASH__ }

// 불일치 시
{ type: 'version_mismatch', message: 'Please refresh.' }
// → Guest 자동 새로고침
```

### 1.4. URL 만료 정책

| 상태 | 만료 시간 | 이유 |
|:---|:---|:---|
| 세션 생성 후 미접속 | 30분 | 친구가 늦을 수 있음 |
| 게임 진행 중 | 세션 활성 동안 유효 | -- |
| Host 연결 종료 후 | 5분 유예 | 새로고침/일시 끊김 대응 |
| 게임 완료 후 | 즉시 만료 | 재사용 방지 |
| 절대 최대 | 4시간 | 장기 세션 보호 |

---

## 2. 레퍼런스 구현 비교

| 서비스 | 공유 방식 | 클릭→플레이 | 로그인 | 설치 |
|:---|:---|:---|:---|:---|
| **Agar.io** | URL (hash) | **1클릭** | 없음 | 없음 |
| **Gartic Phone** | URL (query) | 2단계 (이름 입력) | 없음 | 없음 |
| **Jackbox** | 코드 입력 | 2단계 | 없음 | 없음 |
| **Among Us** | 코드 입력 | 2단계 | 선택 | 앱 필요 |
| **Discord Activity** | UI 버튼 | 1클릭 | Discord | 없음 |
| **Figma** | URL (path) | 1클릭 (view) | 선택 | 없음 |

**ECHORIS 목표: Agar.io 수준 (URL 클릭 1회 → 즉시 합류). 닉네임은 자동 생성 (수정 선택적).**

---

## 3. 전체 합류 플로우

### 3.1. Host 플로우

```
[메인 메뉴] → [아이템계 진입 준비] → [솔로/멀티 선택]
                                        ↓
                                  "함께 탐험" 클릭
                                        ↓
                              세션 코드 생성 (A7K9X2)
                              URL 표시 + [링크 복사] 버튼
                                        ↓
                              친구에게 Discord/카톡으로 공유
                                        ↓
                              대기 중... (장비 정리 가능)
                                        ↓
                              Guest 연결 알림 ("SwiftDiver joined")
                                        ↓
                              [시작] 클릭 → 아이템계 진입
```

### 3.2. Guest 플로우

```
Discord/카톡에서 URL 클릭
        ↓
echoris.io/join/A7K9X2 로드 (3초 이내)
        ↓
자동 합류 모드 진입 (메인 메뉴 건너뜀)
        ↓
닉네임 표시: "SwiftDiver" (자동 생성, 수정 가능)
        ↓
[Join Game] 클릭 (또는 자동 합류)
        ↓
WebSocket 연결 → Host에 합류
        ↓
Host가 "시작" 누를 때까지 대기
        ↓
아이템계 진입 (Host와 동일 화면)
```

### 3.3. 최소 클릭 수

| 단계 | Host | Guest |
|:---|:---|:---|
| 세션 생성 | 1클릭 ("함께 탐험") | - |
| URL 공유 | 1클릭 ("링크 복사") | - |
| 합류 | - | 1클릭 (URL 클릭) |
| 시작 | 1클릭 ("시작") | 0클릭 (자동) |
| **합계** | **3클릭** | **1클릭** |

---

## 4. 세션 생명주기 상태 머신

```
[CREATED] --Host 연결--> [WAITING] --Guest 연결--> [READY]
                              |                       |
                              |                  Host "시작"
                              |                       |
                              v                       v
                    30분 타임아웃              [ACTIVE] (게임 중)
                              |                       |
                              v                  +----|----+
                          [EXPIRED]            정상 종료  연결 끊김
                                                  |        |
                                                  v        v
                                              [ENDED]  [GRACE_PERIOD]
                                                            |
                                                      +-----+-----+
                                                   5분 내      5분 초과
                                                   재연결         |
                                                      |          v
                                                      v      [ENDED]
                                                  [ACTIVE]
```

---

## 5. 비로그인 / 익명 합류

### 5.1. 플레이어 식별

```typescript
// localStorage에 영구 UUID 저장 (재연결 식별용)
function getOrCreatePlayerId(): string {
  let id = localStorage.getItem('echoris_player_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('echoris_player_id', id);
  }
  return id;
}
```

- 인증 수단 아님. 동일 브라우저 재연결 식별용
- 보안 필요한 작업(랭킹 등)은 Phase 4 로그인 시스템에서 처리

### 5.2. 자동 닉네임 생성

```typescript
const ADJECTIVES = ['Swift', 'Iron', 'Echo', 'Deep', 'Rust', 'Void'];
const NOUNS = ['Diver', 'Smith', 'Walker', 'Seeker', 'Striker', 'Forge'];

function generateDisplayName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj}${noun}`;  // "IronDiver", "EchoSmith" 등
}
```

- 세계관 테마 (메가스트럭처/단조) 반영 단어 선택
- 합류 화면에서 수정 가능. 비워두면 자동 이름 사용
- 로그인 없이 1클릭 합류 UX 보존

---

## 6. Host UI 설계

```
+--------------------------------------+
|                                      |
|        Explore Together              |
|                                      |
|  Session: A7K9X2                     |
|                                      |
|  +------------------------------+   |
|  | echoris.io/join/A7K9X2       |   |
|  +------------------------------+   |
|                                      |
|  [ Copy Link ]                       |
|                                      |
|  Waiting... (0/1)                    |
|                                      |
|  --- or share the code ---           |
|  A 7 K 9 X 2                        |
|                                      |
+--------------------------------------+
```

### 클립보드 복사

```typescript
async function copyInviteLink(code: string): Promise<void> {
  const url = `https://echoris.io/join/${code}`;
  try {
    await navigator.clipboard.writeText(url);
    showToast('Link copied!');
  } catch {
    prompt('Copy this link:', url);  // 폴백
  }
}
```

---

## 7. 에러 처리

| 에러 | 화면 메시지 | 액션 |
|:---|:---|:---|
| 세션 미존재 | "Session not found. Check the code." | [Main Menu] / [Enter Code] |
| 세션 만료 | "Session expired. Ask host for a new link." | [Main Menu] |
| 세션 가득참 | "Session full (2/2)." | [Main Menu] |
| 버전 불일치 | "Updating..." | 자동 새로고침 |
| 네트워크 타임아웃 | "Connection failed." | [Retry] |
| 모바일 접속 | "ECHORIS is for PC. Open on a computer." | [Copy Link] (PC로 보내기) |

### 재연결 로직

```typescript
// localStorage에 세션 토큰 저장
// 새로고침/끊김 시 자동 재연결 시도
// 지수 백오프: 1s → 2s → 4s → 8s → 16s (최대 5회)
```

### 모바일 감지

```typescript
function detectMobile(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
}
// 모바일이면 "PC에서 열어주세요" + 링크 복사 버튼
```

---

## 8. 소셜 미리보기 (OG 태그)

Discord/카카오톡에서 URL 공유 시 미리보기 카드 표시.

### Cloudflare Worker 처리

```typescript
// /join/:code 요청 시
// 봇(Discord/Kakao/Twitter) → OG 태그 HTML 반환
// 일반 사용자 → SPA HTML + 세션 코드 주입

const isBot = /bot|crawl|spider|preview|slack|discord|telegram|kakao|twitter|facebook/i
  .test(userAgent);

if (isBot) return ogTagHtml(sessionCode);
else return spaHtml(sessionCode);
```

### OG 태그

```html
<meta property="og:title" content="ECHORIS - Join Session A7K9X2" />
<meta property="og:description" content="Dive into the Item World together. No install needed." />
<meta property="og:image" content="https://echoris.io/assets/og-invite.png" />
<!-- 1200x630px 정적 이미지. Phase 3에서는 정적으로 충분 -->
```

| 플랫폼 | 이미지 크기 | 비고 |
|:---|:---|:---|
| Discord | 1200x630 권장 | og:image 자동 표시 |
| 카카오톡 | 800x400+ | og:image 사용 |
| Twitter/X | 1200x628 | twitter:card = summary_large_image |

---

## 9. 보안

| 항목 | 대응 |
|:---|:---|
| 코드 무차별 대입 | Rate Limiting: `/join/*` 분당 30회 (Cloudflare WAF) |
| 세션 사칭 | 세션 토큰 (32자 랜덤) + localStorage. 코드만으로는 재연결 불가 |
| HTTPS/WSS | Cloudflare 자동 제공. 별도 설정 불필요 |
| 개인정보 | IP 미저장, localStorage UUID만 사용, 쿠키 미사용, GDPR 해당 없음 |
| 만료 코드 재사용 | 만료 후 24시간 보류. 즉시 재할당 안 함 |

---

## 10. 구현 로드맵

### Phase 3-A: 최소 기능 (1-2주)

| # | 항목 | 내용 |
|:---|:---|:---|
| 1 | Durable Object | 세션 생성/합류/만료 로직 |
| 2 | 세션 코드 생성 | 6자리 + 중복 검사 |
| 3 | Join URL 라우팅 | `/join/:code` → 게임 로드 + 자동 연결 |
| 4 | Host UI | "함께 탐험" → 코드 표시 + 링크 복사 |
| 5 | Guest UI | URL 클릭 → 닉네임(선택) → 합류 |
| 6 | 에러 화면 | 만료/가득참/미존재 3종 |

### Phase 3-B: 안정화 (1주)

| # | 항목 | 내용 |
|:---|:---|:---|
| 7 | 재연결 | localStorage 토큰 + 지수 백오프 |
| 8 | 모바일 감지 | "PC에서 열어주세요" 안내 |
| 9 | 버전 검증 | 빌드 해시 교환 + 자동 새로고침 |

### Phase 3-C: 소셜 (1주)

| # | 항목 | 내용 |
|:---|:---|:---|
| 10 | OG 태그 | Worker 봇 감지 + 동적 HTML |
| 11 | 미리보기 이미지 | 정적 1200x630 |
| 12 | 코드 직접 입력 UI | URL 깨진 경우 대비 |

### 총 예상: 3-4주 (넷코드 15일과 병행)

---

## 11. 핵심 설계 결정 요약

| 결정 | 선택 | 근거 |
|:---|:---|:---|
| URL 형식 | `echoris.io/join/{code}` | OG 태그 + 가독성 |
| 코드 | 6자리 영대문자+숫자 (29자) | Among Us/Jackbox 검증, 구두 전달 가능 |
| 인증 | 없음 (localStorage UUID) | 제로 로그인 UX |
| 닉네임 | 자동 생성 + 선택 변경 | 1클릭 합류 보존 |
| 미리보기 | 정적 이미지 + 동적 텍스트 | 솔로 개발자 범위 |
| 보안 | Rate Limit + 토큰 + WSS | Cloudflare 기본 활용 |
| Guest 클릭 수 | **1클릭** | Agar.io 수준 |
