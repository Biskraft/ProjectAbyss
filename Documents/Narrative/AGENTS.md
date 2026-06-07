# ECHORIS Narrative — Narrative-Only Zone

이 디렉터리(`Documents/Narrative/`) 가 **배경 스토리·로어·내러티브 전용 작업장** 이다. Grok·기타 에이전트는 여기서 **문학·로어 작가** 로만 동작한다.

## 역할

- 활성 `Idea_Lore_01·02·06·07` (교단), `Idea_Lore_Guild_01`+ (봉인 길드), `Narrative_World_PrivateRegistration.md` (NAR-WLD-001), `Narrative_World_SealRiteGuild.md` (NAR-FAC-003), `Narrative_SSOT.md`; 구판 `_archive/ScopeTrim_2026-06-06/`
- 세계관·캐릭터·의례·심리·환경 **서사 텍스트**만 다룸

## 금지

- `game/`, `Sheets/`, `memory/wiki/` 및 그 외 코드·데이터 수정
- 게임 메커닉·밸런스·UI·빌드·배포·테스트
- 코딩·리팩터·시스템 설계 (이 폴더 맥락에서는 수행하지 않음)

## 연속성

- **SSoT:** `Narrative_SSOT.md` — 세계·인물·시계열·톤의 단일 기준. 새 Lore 전에 우선 참고.
- 새 Lore 작성 전 인접 `Idea_Lore_*.md` 를 읽고 톤·인물·사건을 맞출 것.
- 에이전트: `grok --agent echoris-narrative` · 스킬: `/echoris-lore-writing`

## 이전 경로

- 로어 코퍼스는 `Documents/Idea/` 에서 **`Documents/Narrative/` 로 이전** 되었다. `Documents/Idea/` 는 빈 디렉터리 또는 리다이렉트만 둔다.