# ECHORIS Playtest Links — SSoT

게재용 URL·대시보드·피드백 채널 모음. 카톡/Reddit/X 등에 던지기 전 여기서 복붙.

> **다음 사람/세션이 보더라도 이 파일 하나로 모든 게재 URL 조립 가능하게.**

---

## 1. 라이브 URL 조립 패턴

기본 게임 URL: `https://echoris.io/play`

게재 시 **반드시 UTM 파라미터** 부착(채널별 코호트 분리 + GA4 Acquisition 자동 집계):

```
https://echoris.io/play?utm_source=<채널>&utm_medium=<형태>&utm_campaign=<웨이브>
```

| 파라미터 | 의미 | 예시 값 |
|:---|:---|:---|
| `utm_source` | 채널명(소문자, snake_case) | `kakao`, `reddit`, `x`, `discord`, `itch` |
| `utm_medium` | 노출 형태 | `chat`, `post`, `tweet`, `dm`, `story`, `channel` |
| `utm_campaign` | 시기·웨이브 식별자 | `closed_w1`, `metroidvania_w1`, `teaser_2026_05` |

**규칙:**
- 모두 **소문자 + snake_case**. GA4는 대소문자 구분 → 컨벤션 어기면 디멘션 분열.
- Victor 자기 테스트는 `?dev=1` 첨부 (이벤트에 `is_dev` 마킹 — 향후 필터용).

---

## 2. 게재 준비된 URL (복붙용)

### 카톡 단톡방

```
https://echoris.io/play?utm_source=kakao&utm_medium=chat&utm_campaign=closed_w1
```

웨이브 진행하면 `closed_w2`, `closed_w3`로 증가.

### Reddit (1차 niche subs)

```
https://echoris.io/play?utm_source=reddit&utm_medium=post&utm_campaign=metroidvania_w1
https://echoris.io/play?utm_source=reddit&utm_medium=post&utm_campaign=disgaea_w1
```

서브별로 캠페인 분리 가능.

### X (Twitter)

```
https://echoris.io/play?utm_source=x&utm_medium=tweet&utm_campaign=teaser_2026_05
```

월별로 캠페인 갱신 권장(`teaser_2026_06`, ...).

### Discord

```
https://echoris.io/play?utm_source=discord&utm_medium=channel&utm_campaign=pvt
```

### itch.io 게재 페이지

```
https://echoris.io/play?utm_source=itch&utm_medium=embed&utm_campaign=launch
```

### Victor 자기 테스트 (프로덕션)

```
https://echoris.io/play?dev=1
```

---

## 3. 대시보드 / 분석

| 자원 | URL/위치 |
|:---|:---|
| GA4 속성 | `G-GECC9GCRHG` (Google Analytics 콘솔에서 검색) |
| GA4 DebugView | GA4 콘솔 → Admin → DebugView (개발 중 실시간 확인) |
| GA4 Realtime | GA4 콘솔 → Reports → Realtime |
| Playtest 대시보드 (정적) | `dashboard.html` 프로젝트 루트 (Chart.js 기반, 수동 갱신) |
| Funnel Exploration | GA4 → Explore → Funnel exploration (직접 작성 필요) |

---

## 4. 피드백 채널 (인게임 F-키 → Google Form)

| 자원 | URL |
|:---|:---|
| Google Form 편집 | https://docs.google.com/forms/d/1FAIpQLSeoLXi7J3swafAExN3RvlzMjOI4EEF96f0fQvqkSx9uvPe5vg/edit |
| Google Form 미리보기 | https://docs.google.com/forms/d/e/1FAIpQLSeoLXi7J3swafAExN3RvlzMjOI4EEF96f0fQvqkSx9uvPe5vg/viewform |
| Response Sheet | Google Drive에서 "ECHORIS Feedback (Responses)" 검색 |

**Form 5개 필드 (Locked — 절대 편집 금지, ID 회전됨):**

| 필드 | entry ID |
|:---|:---|
| feedback_text | entry.102695891 |
| category | entry.1045525568 |
| auto_context_json | entry.49140280 |
| run_id | entry.1606689676 |
| utm_source_campaign | entry.1521658925 |

코드 SSoT: `game/src/data/feedbackConfig.ts`

---

## 5. 게재 명의 (KR 커뮤니티 한정)

**FINE / 개발 / 인디** — 본명·Strata Forge 회사명 노출 금지.
글로벌(Reddit·X·Discord 영어권)은 별도 페르소나 검토 필요.

---

## 6. 게재 전 체크리스트 (매번)

- [ ] 위 URL 복붙
- [ ] OG 카드 카톡 미리보기 1회 정상 확인
- [ ] 단톡방 운영자 사전 양해 확인 (대형 단톡방)
- [ ] 카피 1줄 (FINE 페르소나, F 키 언급)
- [ ] 게재 후 1시간 GA4 Realtime 모니터링 (선택)
- [ ] 24시간 후 Funnel Exploration로 코호트 분리 확인

---

## 7. 미래 확장 (현재 미구현, 필요 시 결정)

- **단축 URL** — PlayX4 부스·인쇄·QR 시점에 Cloudflare Bulk Redirects로 `go.echoris.io/k1` 형태 도입. 디지털 채널은 OG 카드가 URL을 가리므로 단축 불필요.
- **Apps Script 자동 응답** — Form 제출 시 Discord 웹훅 알림 등. 응답률 본 후 결정.
- **BigQuery export** — GA4 무료 export 활성화 시 본문 코호트 SQL 분석 가능.
