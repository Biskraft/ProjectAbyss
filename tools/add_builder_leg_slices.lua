--[[
  add_builder_leg_slices.lua

  Adds the 5 builder-leg slices to builder_leg_01.ase. Single-sprite design:
  no NineSlice / 9-patch — limbs scale via sprite.scale at runtime. Slices
  carry only bounds. Idempotent — existing slices with the same name are
  removed first so re-running never duplicates.

  Run via:
    aseprite.exe -b --script-param file=<absolute path to .ase> \
                 --script tools/add_builder_leg_slices.lua

  Slice geometry mirrors game/src/entities/builderLegAtlas.ts.
--]]

-- Pivot is the slice-local point that aligns with the entity position. For
-- joints (shoulder, knee) it sits where the disc visually joins the limb;
-- for limbs and foot it sits where the upstream joint attaches. Edit these
-- in Aseprite (Slice properties → Pivot) when you re-draw the art and
-- re-run this script with the desired numbers, or open the .ase and drag
-- the pivot directly. Values are slice-local pixels.
local SLICES = {
  -- Joint discs: centered visually inside the disc.
  { name = "shoulder",   x = 0, y =   0, w = 96, h =  96, px = 48, py = 48 },
  { name = "knee",       x = 0, y =  96, w = 80, h =  80, px = 40, py = 40 },
  -- Limbs: pivot at the top-center where the joint above attaches.
  { name = "upper_limb", x = 0, y = 176, w = 96, h = 280, px = 48, py =  0 },
  { name = "lower_limb", x = 0, y = 456, w = 64, h = 340, px = 32, py =  0 },
  -- Foot: pivot at the top-center (ankle attach point).
  { name = "foot",       x = 0, y = 796, w = 80, h = 160, px = 40, py =  0 },
}

local file = nil
for _, p in ipairs(app.params) do end
if app.params and app.params.file then file = app.params.file end
if not file then
  -- Fallback: process the active sprite if launched via -b <ase>.
  local sp = app.activeSprite
  if sp and sp.filename then file = sp.filename end
end
if not file then
  print("[add_slices] ERROR: no file given. Use --script-param file=<path> or open the .ase first.")
  return
end

local sprite = Sprite{ fromFile = file }
if not sprite then
  print("[add_slices] ERROR: failed to open " .. file)
  return
end
app.activeSprite = sprite

-- Drop any existing slices with our names so we don't accumulate dupes.
local toDelete = {}
for _, s in ipairs(sprite.slices) do
  for _, spec in ipairs(SLICES) do
    if s.name == spec.name then
      table.insert(toDelete, s)
      break
    end
  end
end
for _, s in ipairs(toDelete) do
  sprite:deleteSlice(s)
end

-- Re-create.
for _, spec in ipairs(SLICES) do
  local slice = sprite:newSlice(Rectangle(spec.x, spec.y, spec.w, spec.h))
  slice.name = spec.name
  if spec.px ~= nil and spec.py ~= nil then
    slice.pivot = Point(spec.px, spec.py)
  end
  print(string.format(
    "[add_slices] %-11s @ (%d,%d) %dx%d  pivot=(%s,%s)",
    slice.name, spec.x, spec.y, spec.w, spec.h,
    tostring(spec.px), tostring(spec.py)
  ))
end

sprite:saveAs(file)
print("[add_slices] saved " .. file)
