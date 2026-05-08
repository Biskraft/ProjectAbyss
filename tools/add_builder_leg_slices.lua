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

-- Convention: each slice's art must be centered inside its frame. Code
-- anchors joints at frame center (0.5, 0.5) and limbs/foot at top-center
-- (0.5, 0), so visual alignment depends on the artist keeping content
-- centered. No pivot field is needed.
local SLICES = {
  { name = "shoulder",   x = 0, y =   0, w = 96, h =  96 },
  { name = "knee",       x = 0, y =  96, w = 80, h =  80 },
  { name = "upper_limb", x = 0, y = 176, w = 96, h = 280 },
  { name = "lower_limb", x = 0, y = 456, w = 64, h = 340 },
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
  print(string.format(
    "[add_slices] %-11s @ (%d,%d) %dx%d",
    slice.name, spec.x, spec.y, spec.w, spec.h
  ))
end

sprite:saveAs(file)
print("[add_slices] saved " .. file)
