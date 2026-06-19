# 3D Rendering Integration System

> **Authority:** T-03, `Game.ts` render loop, PixiJS v8 official integration guide
> **Status:** Draft
> **Last Updated:** 2026-06-17
> **Scope:** Three.js/PixiJS mixed rendering feasibility, render ownership, performance budget, rollout plan
> **Primary References:**
> - `game/src/Game.ts`
> - `Documents/System/System_Performance_Budget.md`
> - `Documents/System/System_Effects_Transitions.md`
> - PixiJS official guide: https://pixijs.com/8.x/guides/third-party/mixing-three-and-pixi

---

## Implementation Status

| Feature ID | Category | Feature | Priority | Status | Notes |
| :--- | :--- | :--- | :---: | :--- | :--- |
| 3D-01 | Feasibility | PixiJS + Three.js mixed rendering review | P0 | Done | This document |
| 3D-02 | Prototype | Separate-canvas Three background prototype | P1 | Pending | Visual/perf proof only |
| 3D-03 | Runtime | Shared WebGL context renderer integration | P2 | Pending | Requires `Game.ts` render ownership changes |
| 3D-04 | Performance | 3D frame cost/debug budget overlay | P1 | Pending | Must be visible under debug mode |
| 3D-05 | Content | Decorative 3D background/setpiece scenes | P2 | Pending | No gameplay collision |
| 3D-06 | Fallback | Low-spec/mobile 3D disable path | P1 | Pending | Required before production use |

---

## 0. Mandatory References

- `game/src/Game.ts`
- `Documents/System/System_Performance_Budget.md`
- `Documents/System/System_Effects_Transitions.md`
- `Documents/System/System_3C_Camera.md`
- `memory/wiki/features/BuildChunkBudget.md`
- `memory/wiki/features/FilterLifecycleHelpers.md`
- PixiJS official guide: `Mixing PixiJS and Three.js`

---

## 1. Concept

### 1.1 Intent

3D rendering may be introduced only as a decorative depth layer or cinematic rendering layer. It must not replace the current 2D gameplay model.

The current project is a PixiJS v8 2D game with:

- LDtk/IntGrid as terrain authority.
- 2D AABB collision for player, monsters, hazards, and projectiles.
- Pixi containers and render textures as the render composition model.
- Pixi UI, transition, debug, and feedback overlays.

Therefore, 3D should initially support atmosphere and presentation:

- distant parallax structures,
- builder-scale background silhouettes,
- portal/anvil/item-world transition depth,
- boss room distant setpieces,
- item-world abyss/backdrop effects.

3D must not initially own:

- player rendering,
- monster rendering,
- tile collision,
- projectile collision,
- LDtk entity placement,
- UI,
- gameplay interaction picking.

### 1.2 Official PixiJS Guidance Summary

The PixiJS v8 guide supports mixing PixiJS and Three.js by sharing one WebGL context. The documented model is:

1. Create a Three.js `WebGLRenderer`.
2. Initialize PixiJS with `context: threeRenderer.getContext()`.
3. Render Three first.
4. Call `resetState()` before switching renderers.
5. Render Pixi above Three.
6. Use `stencil: true` if Pixi masks must work.
7. Disable Pixi clearing after Three, using `clearBeforeRender: false` or `clear: false`.

The guide also warns that Pixi and Three resources are separate. A Pixi texture is not directly a Three texture, and vice versa.

### 1.3 Current Project Render Ownership

`game/src/Game.ts` currently owns the full renderer lifecycle.

Current render pipeline:

```text
scene.update fixed step
scene.render interpolation
renderer.render(backgroundContainer -> backgroundRT)
renderer.render(gameContainer -> worldRT)
stage contains:
  backgroundSprite(backgroundRT)
  worldSprite(worldRT)
  legacyUIContainer
  uiContainer
  feedbackOverlayContainer
  transitionLayer
  fpsCounter
renderer.render(stage -> canvas)
```

This means Three.js cannot be inserted safely as a gameplay layer without changing render ownership. The least risky insertion point is before or behind the current Pixi `backgroundRT`/`backgroundSprite` stage.

---

## 2. Decision

### 2.1 Adoptability

3D is technically adoptable.

Recommended adoption scope:

```yaml
initial_scope:
  allowed:
    - background_3d
    - distant_setpiece_3d
    - transition_3d
    - cinematic_3d_backdrop
  disallowed:
    - gameplay_collision_3d
    - player_model_3d
    - monster_model_3d
    - tilemap_3d
    - projectile_physics_3d
```

### 2.2 Recommended Strategy

Use a two-stage rollout.

| Stage | Method | Purpose | Risk |
| :--- | :--- | :--- | :--- |
| Stage 1 | Separate canvas prototype | Fast visual/performance proof | Medium compositing risk |
| Stage 2 | Shared WebGL context | Production integration | Higher engine ownership change |

Stage 1 is not the final architecture. It is a cheap test to answer:

- Does 3D improve the visual direction enough?
- Can the target hardware keep frame time?
- Which scenes actually need 3D?
- What fallback quality is required?

Stage 2 is the final direction if the prototype is successful.

---

## 3. Rendering Architecture

### 3.1 Prototype Architecture: Separate Canvas

```text
DOM:
  threeCanvas   z-index 0
  pixiCanvas    z-index 1

Pixi:
  unchanged Game.ts renderer
  all gameplay/UI remains Pixi

Three:
  background-only scene
  no input
  no collision
  camera sync from Pixi camera renderX/renderY/zoom
```

Pros:

- Minimal risk to `Game.ts`.
- Fastest prototype.
- Easy on/off debug toggle.

Cons:

- Two canvases.
- Browser compositing cost.
- Resize/CSS sync must be maintained.
- Not ideal for final production.

### 3.2 Production Architecture: Shared WebGL Context

```text
single canvas
single WebGL context

per frame:
  scene.update()
  scene.render()
  threeRenderer.resetState()
  threeRenderer.render(threeScene, threeCamera)
  pixiRenderer.resetState()
  pixiRenderer.render(stage, clear=false)
```

Required changes:

- `Game.ts` must expose a 3D render hook before final Pixi stage render.
- Pixi renderer initialization must allow external WebGL context ownership, or Three must be initialized from Pixi's canvas/context if feasible.
- Renderer resize handling must update both renderers.
- `clear` behavior must be explicit.
- State reset must occur every time the frame switches between Three and Pixi.

### 3.3 Project-Specific Render Order

Recommended order for production:

```text
Three background pass
Pixi backgroundRT/worldRT/stage pass
Pixi UI/transition/debug remain on top
```

Do not use this order initially:

```text
Pixi world -> Three object -> Pixi UI
```

Reason: inserting 3D between Pixi world layers requires depth sorting, render target composition, coordinate conversion, and collision expectations that the current project does not have.

---

## 4. Performance Budget

### 4.1 Frame Budget

Target remains 60fps.

```yaml
frame_budget_3d_initial:
  total_ms: 16.67
  existing_pixi_gameplay_target_ms: preserve_existing_budget
  three_background_target_ms: 1.0_to_3.0
  three_background_hard_limit_ms: 4.0
  reset_state_overhead_target_ms: 0.2
  fallback_required_above_ms: 4.0
```

Interpretation:

- 3D must fit into spare render margin.
- 3D cannot justify degrading input latency, combat readability, or tile collision.
- If the 3D background pass exceeds 4ms on target hardware, it must degrade or disable.

### 4.2 Initial 3D Scene Budget

```yaml
three_scene_budget_initial:
  shadows: false
  postprocessing: false
  realtime_lights_max: 1
  draw_calls_target: 20
  draw_calls_hard_limit: 50
  triangle_target: 25000
  triangle_hard_limit: 75000
  transparent_meshes_target: 5
  texture_memory_target_mb: 32
  render_scale:
    desktop: 1.0
    low_spec: 0.5
    mobile: 0.5
```

### 4.3 Explicitly Disallowed in Phase 1

- Shadow maps.
- Bloom, SSAO, depth of field, screen-space postprocessing.
- Transparent particle clouds rendered in Three.
- Dynamic environment reflections.
- 3D skeletal animation for gameplay actors.
- Loading the same large asset once for Pixi and once for Three unless budgeted.

### 4.4 Expected Performance

| Target | Expected Result | Notes |
| :--- | :--- | :--- |
| Desktop dGPU | Safe for decorative 3D | Keep simple materials |
| Desktop/laptop iGPU | Acceptable with low scene budget | Watch fill-rate |
| iPad/mobile | Risky but possible | Half-res/fallback required |
| Electron offline build | Feasible | GPU variance must be measured |

---

## 5. Runtime Rules

### 5.1 Ownership Rules

| System | Owner |
| :--- | :--- |
| Gameplay collision | Pixi/LDtk/2D AABB only |
| Player/monster gameplay rendering | Pixi |
| HUD/dialogue/menu/debug | Pixi |
| Screen transition authority | `TransitionDirector` / Pixi systems |
| Decorative 3D scene | Three runtime |
| 3D enable/disable | Game settings/debug flag |

### 5.2 Camera Sync

Three camera should follow Pixi camera as a visual transform only.

Required inputs:

- `game.camera.renderX`
- `game.camera.renderY`
- `game.camera.zoom`
- `GAME_WIDTH`
- `GAME_HEIGHT`
- scene-specific parallax factor

3D camera sync must not write back to Pixi camera.

### 5.3 Debug Rules

3D runtime must support:

- `debug=1` visibility of 3D pass cost.
- on/off toggle.
- render scale display.
- draw call/triangle estimate if available.
- fallback state display.

Do not require Playwright for regular 3D validation unless visual correctness is specifically requested.

---

## 6. Rollout Plan

### Phase 0: No-Code Validation

Status: this document.

Deliverables:

- feasibility decision,
- integration risks,
- performance budget,
- rollout path.

### Phase 1: Separate Canvas Prototype

Deliverables:

- `ThreeBackgroundPrototypeRuntime` or equivalent isolated runtime,
- debug flag: `?three=1`,
- no gameplay integration,
- one simple background setpiece,
- frame cost logs in debug mode.

Acceptance:

- Pixi gameplay unchanged.
- HUD/transition/debug overlays remain readable.
- 3D can be disabled without changing scene behavior.
- No gameplay collision depends on Three.

### Phase 2: Shared Context Spike

Deliverables:

- one-canvas shared context test branch,
- explicit `resetState()` calls around renderer switches,
- resize sync,
- no Pixi mask regressions,
- fallback to Pixi-only renderer.

Acceptance:

- `renderer.draw` and 3D pass timing are visible in `PerfMonitor`.
- Pixi filters, masks, transition layer, and UI still render correctly.
- WebGL path remains default. WebGPU path is not required for Three integration.

### Phase 3: Production Feature

Deliverables:

- scene-owned 3D background presets,
- asset budget,
- settings toggle,
- low-spec fallback,
- build chunk review.

Acceptance:

- 3D content is decorative only.
- performance stays within `three_background_target_ms`.
- fallback path is tested.

---

## 7. Risks

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| WebGL state leakage | Pixi filters/masks break | Always call renderer `resetState()` between Three/Pixi |
| Extra canvas compositing | Mobile frame cost increases | Prototype only; move to shared context for production |
| Resize mismatch | Pixi/Three layers drift | Single resize owner in `Game.ts` |
| Asset duplication | Memory grows quickly | Separate 3D asset budget; no duplicate high-res texture loads |
| Render order complexity | 3D appears above/under wrong layer | Phase 1 only background/decorative layers |
| WebGPU renderer path | Three integration targets WebGL | Keep 3D integration WebGL-only until separate WebGPU strategy exists |
| Build chunk growth | Vite chunks exceed budget | Lazy-load Three runtime/assets; review `BuildChunkBudget` |

---

## 8. Performance Measurement

Minimum metrics:

```yaml
metrics:
  three_update_ms: required
  three_render_ms: required
  pixi_renderer_bgRT_ms: existing
  pixi_renderer_worldRT_ms: existing
  pixi_renderer_draw_ms: existing
  total_frame_ms: required
  render_scale: required
  fallback_active: required
```

Measurement should be added through existing performance instrumentation, not ad hoc console spam, except for early prototype debug logs.

---

## 9. Recommendation

Adopt 3D only as a constrained rendering layer.

Recommended first use case:

```yaml
first_use_case:
  scene: item_world_or_boss_room_background
  type: decorative_background
  gameplay_collision: none
  render_order: behind_pixi_world
  shadows: false
  postprocessing: false
  debug_toggle: required
  fallback: pixi_only_background
```

Do not start by converting actors, monsters, projectiles, or terrain to 3D.

The project can gain depth and presentation value from Three.js, but only if 2D gameplay authority remains untouched.
