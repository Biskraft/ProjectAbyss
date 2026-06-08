# Agent Shared Instructions

This repository uses `memory/wiki/` as shared long-term project memory for Claude, Codex, and other coding agents.

## Before Non-Trivial Work

- Read `memory/wiki/WIKI_INDEX.md` first.
- Open the relevant files under `memory/wiki/decisions/`, `memory/wiki/features/`, or `memory/wiki/playtests/` before changing related systems.
- Treat the current worktree as authoritative when wiki notes and code disagree.
- Prefer existing project patterns, data sources, and UI components over new abstractions.

## Systematize Recurrent State Bugs

When the user asks to fix a bug, first state the recommended fix mode before editing:

- `one-shot fix`: use when there is one clear owner, one mutation path, a small isolated mistake, a simple numeric/timing adjustment, or a narrow regression.
- `systemic fix`: use when the bug involves repeated state transitions, multiple writers, scene/cinematic/modal/debug timing, prior failed local fixes, or unclear ownership.

Briefly explain why the chosen mode fits. If a systemic fix is recommended, outline the owner/state/reconcile plan before changing code.

When a bug involves repeated on/off, lock/unlock, spawn/despawn, enable/disable, or similar state transitions, prefer a systemic fix over another local toggle if any of these are true:

- Multiple files, callbacks, runtimes, or UI components directly mutate the same state.
- A previous local fix was overridden by another path or the same symptom reappeared.
- The bug depends on timing, scene transitions, modal overlays, cinematics, debug modes, or async handoffs.
- It is unclear which component owns the final state.
- New exceptions keep being added to hide or force a state.

In those cases, define a single owner and a single reconciliation path:

- Represent the durable permission separately from the temporary desire/block state.
- Route all callers through named methods such as `setXWanted()`, `setXBlocked(reason, blocked)`, or `reconcileXState()`.
- Keep final `visible`, `enabled`, `active`, or equivalent mutation in one place.
- Remove or replace direct scattered mutations instead of adding another exception.
- Document the prevention rule in `memory/wiki/` when the system behavior becomes durable project knowledge.

Do not over-systematize simple numeric tuning, isolated one-line mistakes, text-only changes, or a bug with exactly one clear owner and one mutation path.

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

## Narrative worktree (로어·배경 스토리)

- **작업장:** `Documents/Narrative/` — `Idea_Lore_*`, `Idea_WorldBuilding.md`, `Narrative_SSOT.md`, `AGENTS.md`.
- 내러티브 전용 에이전트는 **이 경로만** 쓰기. `game/`, `Sheets/`, `memory/wiki/` 는 내러티브 세션에서 수정하지 않음.
- 구 경로 `Documents/Idea/` 는 이전 완료(리다이렉트만 유지).

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
- Do not run Playwright unless the user explicitly asks for it. It is visual/gameplay validation and has a higher coordination cost.
- Prefer `npm run build` for changes touching shared systems, scene runtimes, data/CSV generation, or import wiring.
- Prefer `npx tsc --noEmit` as the minimum check for TypeScript logic changes.
- It is acceptable to skip validation for simple numeric tuning, text/wiki-only edits, or an obviously mechanical one-line change.
- If a relevant check cannot be run, state that clearly in the final response.
