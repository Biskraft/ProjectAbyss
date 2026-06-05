# Agent Shared Instructions

This repository uses `memory/wiki/` as shared long-term project memory for Claude, Codex, and other coding agents.

## Before Non-Trivial Work

- Read `memory/wiki/WIKI_INDEX.md` first.
- Open the relevant files under `memory/wiki/decisions/`, `memory/wiki/features/`, or `memory/wiki/playtests/` before changing related systems.
- Treat the current worktree as authoritative when wiki notes and code disagree.
- Prefer existing project patterns, data sources, and UI components over new abstractions.

## Cross-Agent Wiki Access

- Other LLM coding agents may search, read, and update `memory/wiki/` as part of normal project work.
- Agents must start from `memory/wiki/WIKI_INDEX.md`, then open the relevant `decisions/`, `features/`, or `playtests/` pages before relying on wiki knowledge.
- Agents must treat the current worktree as authoritative when wiki notes and code disagree.
- When editing wiki pages, prefer concise appends to existing pages. Create a new page only when there is no clear owner, and update `memory/wiki/WIKI_INDEX.md`.
- Avoid wholesale rewrites of large or legacy wiki files with encoding issues, especially `memory/wiki/features/RefactorRoadmap.md`; prefer append-only or narrow byte-safe edits.

## Durable Knowledge

Update `memory/wiki/` when work creates durable project knowledge:

- A design decision is added, reversed, or clarified.
- Feature behavior changes in a way future agents must understand.
- A repeated bug cause or workflow trap is discovered.
- A build, test, deployment, asset, localization, or data-pipeline caveat would prevent future mistakes.

Do not update the wiki for trivial formatting, mechanical one-line fixes, temporary experiments, or routine build output.

## Where To Write

- `memory/wiki/decisions/DEC-xxx-*.md`: long-lived design decisions.
- `memory/wiki/features/*.md`: current implementation state, invariants, and pitfalls for a feature.
- `memory/wiki/daily/YYYY-MM-DD.md`: short session log for meaningful work.
- `memory/wiki/WIKI_INDEX.md`: add or update links when creating new wiki pages.

Prefer appending concise updates to an existing relevant page. Create a new page only when there is no clear owner.

## Writing Style

- Keep entries short and evidence-based.
- Include file paths, commands, commit hashes, or test results when useful.
- Document prevention rules explicitly, for example: "Do not add game UI text without `Sheets/Content_Localization.csv` keys."
- Avoid duplicating existing notes. Link or reference the prior decision instead.

## High-Priority Current Context

- `DEC-036`: 📦 narrative-system 통합 결정 archived 2026-05-28 → `Documents/Terms/_archive/NarrativeWorldReset_2026-05-28/`.
- `DEC-037`: Item World radial hub-and-spoke topology is partially obsolete; keep the RoomGraph data structure context, but follow `DEC-039` for topology behavior.
- `DEC-039`: Item World uses a vertical dive graph: Plaza above, Boss below, manual trapdoor descent after boss clear.
- `DEC-038`: 📦 Item World narrative theming archived 2026-05-28. Plaza and Archive remain mechanic safe zones; avoid enemy spawn there.
- `DEC-040`: Audio uses `@pixi/sound`; do not reintroduce Howler.js.
- `DEC-041`: Fluid crest foam uses CSV SSoT and the separated foam manager approach.
- Localization SSoT is `Sheets/Content_Localization.csv`; do not hardcode player-facing game text in code.
- UI work should reuse existing components such as `KeyPrompt`, `ModalPanel`, `UISkin`, and `create9SlicePanel`.

## Verification

- For code changes, run the narrowest meaningful check first, then broaden when the change touches shared systems.
- For game/data changes, prefer `npm run build` from `game/` when feasible because it runs CSV generation and validation before TypeScript and Vite build.
- If a relevant check cannot be run, state that clearly in the final response.
