# ECHORIS 개발 위키 인덱스

`memory/wiki/` 하위 작업일지·의사결정·기능 히스토리·플레이테스트 자료 인덱스.

## Daily Log (작업일지)
최신순.

- [2026-05-13](daily/2026-05-13.md) — Fluid VFX 마감(SteamPuff / AshRemnant / Burn HUD / multi-fluid Splash) + Damage Matrix SSoT (Documents/System/System_World_TileSystem.md §3.0/§3.0.2/§3.2/§3.4 보강)
- [2026-05-09](daily/2026-05-09.md) — 발 미러링 정리(256aaff4/78b74945/d1b1d795) + Death 모달 ReturnResult 재부착 회귀 fix(82abb69b) + LegRig/LandingDust 보강(03a454ce) + 위키 갱신
- [2026-05-08](daily/2026-05-08.md) — BGM 시스템 도입(78e24336/9d177db3) + KR/EN i18n 시스템 첫 도입(30e394e7) + UI 12+ 마이그레이션 + Builder Leg 아트 파이프라인 재정립(Graphics → 스프라이트 아틀라스, 16 커밋)
- [2026-05-07](daily/2026-05-07.md) — 행사 디렉토리북 회신 확정(국문 음역·Fine 페르소나·평문 양식) + UI native migration phase 1 배포(56c8812f, fonts LCM 48-pt + cyan-dominant 팔레트 + parallax 갱신 + 로고) + LDtk 월드 콘텐츠 배포(d15ce008)
- [2026-05-06](daily/2026-05-06.md) — Shift+I 전역 UI 토글 + 팔레트 hue 분리 + Kings and Pigs atlas 9종 (커밋 3c919e68 / Actions 25423868766). 디렉토리북 회신 1차 초안. 별도 세션 481c8481 echoris.io 카피 정돈
- [2026-05-04](daily/2026-05-04.md) — 사운드 시스템 전수 리서치 + DEC-040 (Audio Pipeline = @pixi/sound, ElevenLabs)
- [2026-04-28](2026-04-28.md) — Beginner Grace 버프화 + Shift+I 디버그 HUD 토글 정정 (Game.ts/ItemWorldScene 충돌 해결)

## Decisions (의사결정)

- [DEC-040 Audio Pipeline](decisions/DEC-040-Audio-Pipeline.md) — @pixi/sound + ElevenLabs AI 자산 + 검 Ego 타이핑 SFX (2026-05-04)
- [DEC-039 Item World Continuous Dive](decisions/DEC-039-Item-World-Continuous-Dive.md) — Trapdoor Descent + 지층 축소 (Normal 1 / Magic 2) (2026-05-02)
- [DEC-038 Town of Orphaned Shadows](decisions/DEC-038-Town-of-Orphaned-Shadows.md) — 그림자 마을 sci-fi 톤 (2026-04-30)
- [DEC-037 Item World Topology Ant Colony](decisions/DEC-037-Item-World-Topology-AntColony.md) — 개미굴식 spoke 토폴로지
- [DEC-036 Memory Shard System](decisions/DEC-036-Memory-Shard-System.md) — 기억 단편 + 핵심 기억 + 5색 기질 통합

## Features (기능 히스토리)

- [BuilderLegArt](features/BuilderLegArt.md) — GiantBuilder 다리 아트 파이프라인 (Pixi Graphics → ASE 슬라이스 스프라이트 아틀라스 전환)
- [FeedbackSystem](features/FeedbackSystem.md) — F-key 인게임 피드백 채널
- [Localization](features/Localization.md) — KR/EN i18n SSoT 시스템 (Sheets/Content_Localization.csv → game/src/i18n/locales/ 자동 생성)

## Playtests (플레이테스트)

- [2026-04-25](playtests/2026-04-25.md) — 조작 불가(P0) + 인벤토리 UX 6건 + 아이템계 진입 온보딩 8건 + 검 Ego 4건

## 갱신 규칙

- 한국어 작성. 코드/경로/기술 용어는 영문 유지
- Daily: 최신순
- Decisions: DEC 번호 내림차순 (최신 결정이 위)
- 신규 항목 추가 시 본 인덱스의 해당 섹션도 동시 갱신
