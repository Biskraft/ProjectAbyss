--[[
  add_builder_leg_slices.lua

  Adds the 5 builder-leg slices to builder_leg_01.ase, with NineSlice 9-patch
  centers on the limb segments. Idempotent — existing slices with the same
  name are removed first so re-running never duplicates.

  Run via:
    aseprite.exe -b --script-param file=<absolute path to .ase> \
                 --script tools/add_builder_leg_slices.lua

  Slice geometry mirrors tools/gen_builder_leg_atlas.mjs / builderLegAtlas.ts.
--]]

local SLICES = {
  { name = "shoulder",   x = 0, y =   0, w = 96, h =  96 },
  { name = "knee",       x = 0, y =  96, w = 80, h =  80 },
  { name = "upper_limb", x = 0, y = 176, w = 96, h = 280, capTop = 24, capBottom = 24 },
  { name = "lower_limb", x = 0, y = 456, w = 64, h = 340, capTop = 16, capBottom = 16 },
  { name = "foot",       x = 0, y = 796, w = 80, h = 160 },
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
  if spec.capTop and spec.capBottom then
    -- 9-patch center: stays inside the cap rows. Caps run full width so
    -- left/right are 0 and width = full slice width.
    local cy = spec.capTop
    local ch = spec.h - spec.capTop - spec.capBottom
    slice.center = Rectangle(0, cy, spec.w, ch)
  end
  print(string.format(
    "[add_slices] %-11s @ (%d,%d) %dx%d%s",
    slice.name, spec.x, spec.y, spec.w, spec.h,
    spec.capTop and string.format(" 9-patch top=%d bottom=%d", spec.capTop, spec.capBottom) or ""
  ))
end

sprite:saveAs(file)
print("[add_slices] saved " .. file)
