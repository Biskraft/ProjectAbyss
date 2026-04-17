"""
ECHORIS tileset composer

Composites PixelLab-generated tiles onto the SunnyLand atlas at specified
grid positions, preserving overall atlas dimensions so LDtk tile IDs stay valid.

Usage:
    python tools/compose_tileset.py --config tools/tileset_maps/<name>.json

Config JSON schema (see tools/tileset_maps/example.json):
    {
      "tile_size": 16,
      "base":   "game/public/assets/atlas/SunnyLand_by_Ansimuz-extended.png",
      "source": "Documents/Content/image/LevelDesign/Sprite-0003.png",
      "output": "game/public/assets/atlas/SunnyLand_ECHORIS.png",
      "mappings": [
        { "from": [0, 0], "to": [0, 0], "note": "top-left corner" },
        ...
      ]
    }

Requires: Pillow (pip install Pillow)
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image


def compose(config_path: Path) -> None:
    cfg = json.loads(config_path.read_text(encoding="utf-8"))
    tile_size: int = int(cfg.get("tile_size", 16))
    base_path = Path(cfg["base"])
    source_path = Path(cfg["source"])
    output_path = Path(cfg["output"])
    mappings = cfg.get("mappings", [])

    if not base_path.is_absolute():
        base_path = (config_path.parent.parent.parent / base_path).resolve()
    if not source_path.is_absolute():
        source_path = (config_path.parent.parent.parent / source_path).resolve()
    if not output_path.is_absolute():
        output_path = (config_path.parent.parent.parent / output_path).resolve()

    base = Image.open(base_path).convert("RGBA")
    source = Image.open(source_path).convert("RGBA")

    print(f"[compose] base   = {base_path.name} {base.size}")
    print(f"[compose] source = {source_path.name} {source.size}")
    print(f"[compose] tile   = {tile_size}px, mappings = {len(mappings)}")

    src_cols = source.width // tile_size
    src_rows = source.height // tile_size
    base_cols = base.width // tile_size
    base_rows = base.height // tile_size

    out = base.copy()
    placed = 0
    for m in mappings:
        fx, fy = m["from"]
        tx, ty = m["to"]
        note = m.get("note", "")

        if not (0 <= fx < src_cols and 0 <= fy < src_rows):
            print(f"[skip] from=({fx},{fy}) out of source {src_cols}x{src_rows}  {note}")
            continue
        if not (0 <= tx < base_cols and 0 <= ty < base_rows):
            print(f"[skip] to=({tx},{ty}) out of base {base_cols}x{base_rows}  {note}")
            continue

        box = (fx * tile_size, fy * tile_size,
               (fx + 1) * tile_size, (fy + 1) * tile_size)
        tile = source.crop(box)
        dest = (tx * tile_size, ty * tile_size)

        # clear target then paste with alpha to fully replace the cell
        clear = Image.new("RGBA", (tile_size, tile_size), (0, 0, 0, 0))
        out.paste(clear, dest)
        out.paste(tile, dest, tile)
        placed += 1

    output_path.parent.mkdir(parents=True, exist_ok=True)
    out.save(output_path)
    print(f"[compose] placed {placed}/{len(mappings)} tiles -> {output_path}")


def main() -> int:
    parser = argparse.ArgumentParser(description="ECHORIS tileset composer")
    parser.add_argument("--config", required=True, help="Path to mapping JSON")
    args = parser.parse_args()

    cfg_path = Path(args.config).resolve()
    if not cfg_path.exists():
        print(f"[error] config not found: {cfg_path}", file=sys.stderr)
        return 1
    compose(cfg_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
