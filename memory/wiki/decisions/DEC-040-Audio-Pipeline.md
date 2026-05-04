# DEC-040: Audio Pipeline — @pixi/sound + AI 자산 + 무음 페이드

- **날짜:** 2026-05-04
- **상태:** 확정
- **선행:** DEC-033 (검 Ego), 기존 `Documents/Research/AudioDirection_SoundDesign_Research.md` (754줄, 2026-04-07), `Documents/System/System_Audio_Direction.md` (534줄, 2026-04-15)

---

## 결정 5건

| # | 항목 | 결정 |
|---|---|---|
| 1 | 사운드 라이브러리 | `@pixi/sound` v6.0.1 (PixiJS v8 공식 플러그인). Howler.js 폐기 |
| 2 | 검 Ego 보이스 | Phase 1~2 = 텍스트 타이핑 SFX (방안 A). 정식 보이스 캐스팅은 베타로 연기 |
| 3 | CLAUDE.md 기술 스택 표 | 즉시 갱신 (Howler.js → @pixi/sound) |
| 4 | 자산 제작 | AI 100%. ElevenLabs Sound Effects + ElevenLabs Music 1차 레퍼런스. 외주 작곡 = 0 (Phase 1~2 한정) |
| 5 | 아이템계 진입 트랜지션 | LP 필터 풀 구현 폐기 → 무음 페이드 (1초 fade-out + 0.5초 침묵 + 아이템계 BGM 인트로) |

---

## 사유

### 라이브러리 선택 — @pixi/sound
- Howler.js v2.2.4는 약 3년간 신규 릴리스 정체. `unload()` 후 메모리 미회수 보고 다수 (GitHub Issue #1731, #914).
- 야리코미 RPG는 장시간 세션이 본질이라 메모리 릭 누적 시 치명적.
- `@pixi/sound` 는 `PIXI.Assets` 와 일원화되어 자산 파이프라인 단순. PixiJS v8 호환 검증됨.
- 라이선스 MIT 동일. 필터(Reverb/EQ/Stereo) 내장.

### 보이스 처리 — 타이핑 SFX
- 검 Ego의 정식 보이스 캐스팅은 비용/일정 부담 + 1차 niche 신호 결정에 영향 큰 의사결정.
- 타이핑 SFX (Undertale 패턴) = 비용 0, 즉시 구현 가능, 베타 전 캐스팅 결정 시 자연 교체 가능.
- 음색은 금속성(forged, hard edge) 계열로 검의 물질적 본질을 청각화. 5색 기질별 음색 분리는 별도 후속 결정.

### 자산 = AI 100%
- 1인 개발 예산: 외주 작곡 트랙당 $200~1500, 패키지 $3~10K 비현실적.
- ElevenLabs 통합 플랫폼: Voice + Sound Effects (2024) + Music (2025). 향후 정식 보이스 캐스팅도 동일 플랫폼 가능.
- 라이선스: 유료 플랜 상업 사용 허가 명시 약관 검토 후 채택. 학습 데이터 분쟁 진행 중인 Suno/Udio 대비 ElevenLabs는 약관 안정성 평가 우위.
- 출시 전 핵심 트랙 (타이틀, 아이템계 진입 테마) 인간 외주 교체 검토는 보존.

### 진입 트랜지션 = 무음 페이드
- 풀 LP 필터 구현은 BGM/앰비언트 혼합 구조에서 선택적 필터링 복잡도 높음.
- Hollow Knight의 보스 진입 하드 컷 패턴 + Made in Abyss(Kevin Penkin)의 침묵 활용이 레퍼런스.
- 무음 0.5초 자체가 "들어가는" 청각적 트랜지션으로 기능.

---

## 보존 (변경 없음)

- `game/src/audio/Sfx.ts:198` 의 글로벌 싱글톤 API (`SFX.play`, `SFX.fireMilestone100Once`) 유지. 백엔드만 Web Audio synth → @pixi/sound 교체.
- 호출처 5개 무수정: `ItemWorldScene.ts:1620 / 3451 / 3377`, `WorldScene.ts:1005 / 626`.
- 기존 기획 문서 `Documents/Research/AudioDirection_SoundDesign_Research.md` + `Documents/System/System_Audio_Direction.md` 모두 유효. AUD-01~17 17개 기능 ID 그대로 사용.
- DEC-033 검 Ego 단독 화자 / 에르다 대사 0줄 / Transistor 패턴 모두 무수정.

---

## 폐기 (재도입 금지)

- ~~Howler.js~~ — 메모리 릭 + 정체. 야리코미 게임 비적합.
- ~~외주 작곡 패키지 의뢰 (Phase 1~2)~~ — 1인 개발 예산 한계로 AI 생성으로 대체.
- ~~아이템계 진입 LP 필터 풀 구현~~ — 무음 페이드로 단순화.

---

## 후속 결정 미정

- **Q2 후속:** 5색 기질(Forge/Iron/Rust/Spark/Shadow)별 타이핑 SFX 음색 매핑. 별도 세션에서 결정.
- **ElevenLabs 라이선스 검토:** 유료 플랜 명시 약관 확인 후 채택.
- **정식 보이스 캐스팅 결정 시점:** Phase 3 베타 진입 시.
- **출시 전 핵심 트랙 인간 외주 교체:** 타이틀 / 아이템계 진입 테마 후보. 베타 시장 신호 확인 후 결정.

---

## SSoT

- 기술 스택: `CLAUDE.md` §기술 스택 (갱신 완료)
- 메모리: `memory/project_design_decisions.md` (DEC-040 섹션 추가)
- 코드 파사드: `game/src/audio/Sfx.ts` (백엔드 교체 대상)
- 기획: `Documents/Research/AudioDirection_SoundDesign_Research.md`, `Documents/System/System_Audio_Direction.md`

---

## 다음 액션

1. `npm install @pixi/sound` (game/ 디렉토리)
2. `Sfx.ts` 의 Web Audio synth 백엔드를 @pixi/sound 로 교체. 파사드 API는 무수정.
3. ElevenLabs 유료 플랜 라이선스 약관 검토 + 캡처.
4. Phase 1 Must 30 SFX + 5 BGM 의 ElevenLabs 프롬프트 시트 작성.
5. 아이템계 진입 페이드 시퀀스 코드 (1.5초 시퀀스) 구현.
