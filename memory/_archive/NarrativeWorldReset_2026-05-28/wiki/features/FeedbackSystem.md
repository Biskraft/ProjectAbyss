---
feature: F-key Feedback System (FB-01)
status: done
last_updated: 2026-05-04
---
# F-키 인게임 피드백 시스템 개발 히스토리

## 개요

카톡 단톡방 1~2k명 준공개 플레이테스트 진입을 위한 인게임 정성 피드백 채널. F 키로 모달 오픈 → 텍스트 + 카테고리 → Google Form(저장소) + GA4(메타). 익명 트래픽 스케일에서 1:1 후속 채팅이 불가능한 상황의 유일한 정성 시그널 통로.

## 타임라인

| 날짜 | 작업 | 상세 |
|---|---|---|
| 2026-05-04 | 스펙 작성 | 풀 사양 문서화. Form 5필드 정의(`feedback_text`, `category`, `auto_context_json`, `run_id`, `utm_source_campaign`) |
| 2026-05-04 | Google Form 생성 | Form ID `1FAIpQLSeoLXi7J3swafAExN3RvlzMjOI4EEF96f0fQvqkSx9uvPe5vg`. WebFetch로 entry ID 5개 추출 + 코드에 박음 |
| 2026-05-04 | 구현 (커밋 `a657f37`) | FeedbackPanel + FeedbackSubmit + FeedbackContext + Analytics 확장 + InputManager textarea 우회 + Toast duration |
| 2026-05-04 | 라이브 폴리시 4사이클 | UI 미가림 / Enter 무반응 / 카테고리 선택 어색 / 'o' 입력 안 됨 — 모두 수정 |
| 2026-05-04 | UX 결정 | 카테고리 `Bug 버그` / `Idea 제안` / `Other 기타`. `Confused`는 의미 모호로 폐기 |
| 2026-05-04 | HUD 인디케이터 | 우측 중단 `[F] FEEDBACK` (alpha 0.5) |
| 2026-05-04 | 배포 | `f5fbed60` 최종 라이브. `https://echoris.io/play/` |

## 현재 상태

- **구현 완료** (TypeScript 빌드 통과, 라이브 배포 완료)
- 라이브 수동 검증 5건 대기 중
- 카톡 단톡방 게재 전 추가 항목: OG 카드 점검, 게재 명의 확정, 단톡방 운영자 사전 양해

## 데이터 흐름

```
F 키
 → game.feedbackOpen = true (씬 update 차단)
 → FeedbackPanel 오픈 (HUD 위 최상단)
 → 사용자 입력 (한글 IME 안전, 'o' 등 모든 키 정상)
 → Enter 또는 SEND 클릭
 → GA4 trackFeedbackSubmitted (카테고리/길이/playtime/area)
 → fetch no-cors POST → Google Form Response Sheet 행 추가
 → Toast "Sent" 1.2s + 30초 쿨다운 + 패널 닫힘
```

## 관련 파일

| 경로 | 역할 |
|:---|:---|
| `game/src/ui/FeedbackPanel.ts` | 패널 본체 (모달 + textarea + 카테고리 + SEND/CLOSE + HUD 인디케이터) |
| `game/src/utils/FeedbackSubmit.ts` | Google Form fetch no-cors POST + localStorage 백업 |
| `game/src/utils/FeedbackContext.ts` | `IFeedbackContextProvider` 인터페이스 + 가드 |
| `game/src/data/feedbackConfig.ts` | FORM_URL + 5개 entry ID + 상수 (Locked) |
| `game/src/utils/Analytics.ts` | `trackFeedbackOpened/Submitted` + 링버퍼 + UTM 박제 + 6 getter |
| `game/src/core/InputManager.ts` | TEXTAREA/INPUT 포커스 시 game key 우회 (isTextInputFocused) |
| `game/src/ui/Toast.ts` | `show(msg, color?, durationMs?)` backward-compat |
| `game/src/Game.ts` | `feedbackOpen` 플래그 + `feedbackOverlayContainer` 신규 레이어 |
| `game/src/scenes/LdtkWorldScene.ts` | `getFeedbackContext()` + `update()` 가드 |
| `game/src/scenes/ItemWorldScene.ts` | 동일 (level_id는 절차생성으로 undefined) |
| `game/docs/ui-components.html` | `TextInputField` + `FeedbackPanel` SSoT 섹션 |

## 알려진 제약

- **Form 필드 락**: 필드 추가/삭제 시 `entry.NNN` ID 회전 → 코드 어긋남. 절대 편집 금지.
- **본문 GA4 미전송**: 100자 트렁케이트 + GDPR. 본문은 Google Form만.
- **no-cors 응답 무읽기**: 전송 실패 silent. localStorage 백업 5건만 보존.
- **모바일/터치 미대응**: 1차 카톡 단톡방 KR 데스크톱 우선.
- **char-count wrap**: BitmapText 자동 wrap 없음. 한/영 혼합 시 시각 오차.

## 향후 확장 (Nice-to-have)

- 스크린샷 캡처 (Canvas DataURL → 별도 저장)
- 게임패드 지원 (현재 키보드 전용)
- 외부 긴 설문 링크 (Phase 3+ 응답률 검증 후)
- BigQuery export로 본문 코호트 분석
