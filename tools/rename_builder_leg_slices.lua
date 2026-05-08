--[[
  rename_builder_leg_slices.lua

  Lightweight repair tool: re-aligns slice NAMES in builder_leg_01.ase to
  the 5 names the runtime expects, without touching bounds. Useful when
  Aseprite auto-renames a slice ("Slice 1") or when the artist tweaked
  positions and the names drifted.

  Strategy: order the existing slices by their bounds.y, then assign the
  canonical names in vertical order (shoulder → knee → upper_limb →
  lower_limb → foot). Bounds are preserved exactly. If the .ase has fewer
  or more slices than expected, the script bails out so it never silently
  destroys layout work.

  Run via:
    aseprite.exe -b --script-param file=<absolute path to .ase> \
                 --script tools/rename_builder_leg_slices.lua
--]]

local CANONICAL_ORDER = {
  "shoulder", "knee", "upper_limb", "lower_limb", "foot",
}

local file = nil
if app.params and app.params.file then file = app.params.file end
if not file then
  local sp = app.activeSprite
  if sp and sp.filename then file = sp.filename end
end
if not file then
  print("[rename_slices] ERROR: no file given. Use --script-param file=<path>.")
  return
end

local sprite = Sprite{ fromFile = file }
if not sprite then
  print("[rename_slices] ERROR: failed to open " .. file)
  return
end
app.activeSprite = sprite

local slices = {}
for _, s in ipairs(sprite.slices) do table.insert(slices, s) end
table.sort(slices, function(a, b) return a.bounds.y < b.bounds.y end)

if #slices ~= #CANONICAL_ORDER then
  print(string.format(
    "[rename_slices] ERROR: found %d slices, expected %d. Open the .ase " ..
    "in Aseprite and add or remove slices until the count matches; " ..
    "this script only fixes names, not slice counts.",
    #slices, #CANONICAL_ORDER
  ))
  return
end

for i, slice in ipairs(slices) do
  local newName = CANONICAL_ORDER[i]
  local oldName = slice.name
  slice.name = newName
  print(string.format(
    "[rename_slices] %-12s → %-11s  bounds=(%d,%d) %dx%d",
    oldName, newName, slice.bounds.x, slice.bounds.y, slice.bounds.width, slice.bounds.height
  ))
end

sprite:saveAs(file)
print("[rename_slices] saved " .. file)
