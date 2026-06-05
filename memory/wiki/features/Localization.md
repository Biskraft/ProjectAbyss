---
feature: KR/EN Localization System
status: in-progress
last_updated: 2026-05-09
---
# Localization (i18n) 개발 히스토리

## 개요
ECHORIS의 모든 게임 텍스트를 SSoT 기반 KR/EN 양국어로 분리. SSoT = `Sheets/Content_Localization.csv` → 빌드 시 `game/src/i18n/locales/` 자동 생성. 글로벌 영어권 1순위 타깃(`project_target_market_global.md`)과 일치.

## 타임라인

| 날짜 | 커밋 | 작업 |
|---|---|---|
| 2026-05-08 16:59 | 30e394e7 | KR/EN localization system 첫 도입 — LOC-01..07/11/04 + core UI batch |
| 2026-05-08 17:57 | d79b60fd | HUD + [F] FEEDBACK 힌트 가시성 통합 (Game.hudReady 게이팅) |
| 2026-05-08 18:14 | a63a1bc2 | InventoryUI + ItemDetailView + DivePreview 마이그레이션 |
| 2026-05-08 18:27 | 51e3b46c | StratumClearOverlay + DeathScreen + ReturnResult + LorePopup |
| 2026-05-08 18:32 | 6eab1b17 | SaveLoadUI + CharacterStats + FeedbackPanel |
| 2026-05-08 21:31 | c3fd34cf | WorldMapOverlay + ControlsOverlay + LOC-10 validate (Phase 2 close) |
| 2026-05-08 21:36 | 62dca346 | Weapon_List + RARITY_DISPLAY_NAME 로컬라이제이션 |
| 2026-05-08 21:42 | 8c90d2c9 | KO PIXI.Text blur — setDefaultUiScale wiring fix |
| 2026-05-08 21:48 | e37c71f5 | KO 텍스트 metrics 정돈 (BitmapText layout budget 매칭) |
| 2026-05-08 21:58 | b8ee81e2 | wordWrap pass — 긴 텍스트 패널 전반 |
| 2026-05-09 02:15 | 82c5067c | Nonstop sweep — toasts/overlays/lore 전수 (419 keys) |

## 현재 상태
- **Nonstop sweep 완료** — 총 419 키, EN/KO 0 missing
- 마이그레이션 완료: 약 70개 hardcoded literals — LdtkWorldScene / ItemWorldScene / WorldScene / ItemWorldUiController / HUD / PauseMenu / EndingSequence / PlayerSave
- toast 템플릿은 named vars 사용 (`{amount}`, `{name}`, `{rarity}`, `{prev}`, `{next}` 등)
- `getWeaponLore` — `lore.special.{defId}.*` → `lore.rarity.{rarity}.*` → `lore.fallback.*` 3-tier `t()` lookup
- HUD 약어(HP/ATK/Lv/EXP/G)는 영문 유지 (Q2 결정)
- 검증: tsc clean, build:en + build:ko 모두 통과

## 관련 파일
- `Sheets/Content_Localization.csv` — i18n SSoT (CSV)
- `game/src/i18n/locales/` — 자동 생성 (gitignored)
- `game/src/i18n/` — 런타임 로더
- 마이그레이션된 UI: InventoryUI / ItemDetailView / DivePreview / StratumClearOverlay / DeathScreen / ReturnResult / LorePopup / SaveLoadUI / CharacterStats / FeedbackPanel / WorldMapOverlay / ControlsOverlay
- `Weapon_List` + `RARITY_DISPLAY_NAME` 데이터 레이블

## 정책
- 게임 내 텍스트/대사/UI/코드 = 영문 1순위 (`feedback_english_only.md`)
- 한국어 = 개발 내부 기준
- 마케팅 카피 = 영문 SSoT, 국문은 별도 전환

- 2026-06-05: Legacy WorldScene inventory-count HUD paths use ui.hud.items_count; do not reintroduce hardcoded Items:{count} strings.
- 2026-06-05: 100-damage milestone combat VFX uses `ui.combat.milestone_100_damage`; do not hardcode `100 DMG!` in scene/runtime damage-number calls.

- 2026-06-05: Legacy WorldAltarController draw path uses existing ui.world.offer_item; do not reintroduce hardcoded altar title strings.
