--[[
  analyze_builder_leg.lua

  Diagnostic-only: scans each named slice in builder_leg_01.ase and
  reports the bounding box of opaque pixels relative to the slice frame.
  Tells you exactly how far off-center the art is for each part, so you
  know what to nudge in Aseprite.

  Conventions enforced by the runtime (game/src/entities/LegRig.ts):
    shoulder, knee → art should be CENTERED  in its slice frame
    upper_limb, lower_limb, foot → art should be HORIZONTALLY centered
                                   AND its TOP edge flush with the frame
                                   top (y=0)

  Run via:
    aseprite.exe -b --script-param file=<absolute path to .ase> \
                 --script tools/analyze_builder_leg.lua
--]]

local TOP_ANCHORED = {
  upper_limb = true,
  lower_limb = true,
  foot       = true,
}

local TARGET_NAMES = {
  shoulder   = true,
  knee       = true,
  upper_limb = true,
  lower_limb = true,
  foot       = true,
}

local file = nil
if app.params and app.params.file then file = app.params.file end
if not file then
  local sp = app.activeSprite
  if sp and sp.filename then file = sp.filename end
end
if not file then
  print("[analyze] ERROR: no file given. Use --script-param file=<path>.")
  return
end

local sprite = Sprite{ fromFile = file }
if not sprite then
  print("[analyze] ERROR: failed to open " .. file)
  return
end
app.activeSprite = sprite

local flat = Image(sprite.width, sprite.height, sprite.colorMode)
flat:drawSprite(sprite, 1)

local function alphaOf(pixel)
  return app.pixelColor.rgbaA(pixel)
end

local function scanBbox(bx, by, bw, bh)
  local minX, minY = bw, bh
  local maxX, maxY = -1, -1
  for ly = 0, bh - 1 do
    for lx = 0, bw - 1 do
      local px = bx + lx
      local py = by + ly
      if px >= 0 and py >= 0 and px < flat.width and py < flat.height then
        local a = alphaOf(flat:getPixel(px, py))
        if a > 0 then
          if lx < minX then minX = lx end
          if ly < minY then minY = ly end
          if lx > maxX then maxX = lx end
          if ly > maxY then maxY = ly end
        end
      end
    end
  end
  if maxX < 0 then return nil end
  return minX, minY, maxX, maxY
end

print("[analyze] art content vs anchor convention:")
for _, slice in ipairs(sprite.slices) do
  if TARGET_NAMES[slice.name] then
    local b = slice.bounds
    local minX, minY, maxX, maxY = scanBbox(b.x, b.y, b.width, b.height)
    if not minX then
      print(string.format("  %-11s NO OPAQUE PIXELS in slice region", slice.name))
    else
      local contentCx = (minX + maxX) / 2
      local contentCy = (minY + maxY) / 2
      local expectedCx = b.width / 2
      local expectedCy = TOP_ANCHORED[slice.name] and 0 or (b.height / 2)
      local dx = contentCx - expectedCx
      local dy = contentCy - expectedCy
      local topGap = TOP_ANCHORED[slice.name] and minY or nil
      local extra = ""
      if topGap and topGap > 0 then
        extra = string.format("  topGap=%dpx (move art %d up)", topGap, topGap)
      end
      print(string.format(
        "  %-11s bbox=(%d,%d)..(%d,%d)  contentC=(%.1f,%.1f) expectedC=(%.1f,%.1f)  off=(%+.1f,%+.1f)%s",
        slice.name, minX, minY, maxX, maxY,
        contentCx, contentCy, expectedCx, expectedCy,
        dx, dy, extra
      ))
    end
  end
end
print("[analyze] off=(±dx,±dy) tells you how many px the art is shifted from " ..
      "the anchor. dy ignored on top-anchored parts; their topGap row above " ..
      "is the relevant fix amount.")
