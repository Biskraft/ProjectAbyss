# ItemWorldUnavailableInputRuntime

- `game/src/scenes/itemworld/ItemWorldUnavailableInputRuntime.ts` owns Item World `MAP` and `INVENTORY` input suppression.
- It consumes those actions through `InputPressHelpers.consumeJustPressedAction()` and shows `toast.currently_unavailable`, preserving the previous Item World policy that map/inventory are recognized but disabled.
- Keep this runtime after modal/transition early returns so blocked inputs do not leak through active overlays.
- Verification on 2026-06-02: `npx tsc --noEmit`, `npm run build`, and `http://localhost:3000/play/?debug=1` Puppeteer smoke passed.
