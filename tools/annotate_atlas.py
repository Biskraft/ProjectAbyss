"""
Generate an annotated debug image of a tileset atlas with grid lines and
(col, row) labels. Optionally highlight a specific set of coordinates.

Usage:
    python tools/annotate_atlas.py \
        --input game/public/assets/atlas/SunnyLand_by_Ansimuz-extended.png \
        --tile-size 16 \
        --scale 4 \
        --highlight tools/tileset_maps/_used_tiles.json \
        --out tools/tileset_maps/_annotated_sunnyland.png

    python tools/annotate_atlas.py \
        --input Documents/Content/image/LevelDesign/Sprite-0004.png \
        --tile-size 16 --scale 4 \
        --out tools/tileset_maps/_annotated_source.png
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def load_highlight(path: Path | None) -> set[tuple[int, int]]:
    if path is None:
        return set()
    d = json.loads(path.read_text(encoding="utf-8"))
    return {tuple(c) for c in d.get("unique_used", [])}


def annotate(src: Path, tile: int, scale: int, highlight: set, out: Path) -> None:
    im = Image.open(src).convert("RGBA")
    cols = im.width // tile
    rows = im.height // tile

    big = im.resize((im.width * scale, im.height * scale), Image.NEAREST).convert("RGBA")
    overlay = Image.new("RGBA", big.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # highlight cells
    cell = tile * scale
    for (c, r) in highlight:
        if 0 <= c < cols and 0 <= r < rows:
            x0, y0 = c * cell, r * cell
            draw.rectangle([x0, y0, x0 + cell - 1, y0 + cell - 1],
                           outline=(255, 80, 80, 255), width=2)
            draw.rectangle([x0, y0, x0 + cell - 1, y0 + cell - 1],
                           fill=(255, 80, 80, 50))

    # grid lines
    for c in range(cols + 1):
        x = c * cell
        draw.line([(x, 0), (x, big.height)], fill=(255, 255, 255, 80), width=1)
    for r in range(rows + 1):
        y = r * cell
        draw.line([(0, y), (big.width, y)], fill=(255, 255, 255, 80), width=1)

    # labels
    try:
        font = ImageFont.truetype("arial.ttf", max(8, scale * 3))
    except Exception:
        font = ImageFont.load_default()
    for r in range(rows):
        for c in range(cols):
            label = f"{c},{r}"
            tx = c * cell + 2
            ty = r * cell + 2
            draw.text((tx + 1, ty + 1), label, fill=(0, 0, 0, 200), font=font)
            color = (255, 220, 80, 255) if (c, r) in highlight else (220, 240, 255, 220)
            draw.text((tx, ty), label, fill=color, font=font)

    composited = Image.alpha_composite(big, overlay)
    out.parent.mkdir(parents=True, exist_ok=True)
    composited.save(out)
    print(f"saved -> {out}  ({composited.size}, highlight={len(highlight)})")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--tile-size", type=int, default=16)
    ap.add_argument("--scale", type=int, default=4)
    ap.add_argument("--highlight", default=None, help="JSON with unique_used list")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    hi = load_highlight(Path(args.highlight)) if args.highlight else set()
    annotate(Path(args.input), args.tile_size, args.scale, hi, Path(args.out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
