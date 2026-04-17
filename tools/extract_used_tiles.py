"""
Extract tile coordinates actually referenced by LDtk layers that use the
SunnyLand atlas. Outputs a sorted list of (col, row) pairs per layer, plus
a combined unique set — the "must-replace" target positions.

Usage:
    python tools/extract_used_tiles.py \
        --ldtk game/public/assets/World_ProjectAbyss.ldtk \
        --tileset-id SunnyLand_by_Ansimuz \
        --tile-size 16

Outputs:
    - tools/tileset_maps/_used_tiles.json  (structured)
    - stdout summary
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path


def extract(ldtk_path: Path, tileset_id: str, tile_size: int) -> dict:
    data = json.loads(ldtk_path.read_text(encoding="utf-8"))

    target_uid = None
    atlas_w = atlas_h = None
    for ts in data.get("defs", {}).get("tilesets", []):
        if ts.get("identifier") == tileset_id:
            target_uid = ts.get("uid")
            atlas_w = ts.get("pxWid")
            atlas_h = ts.get("pxHei")
            break
    if target_uid is None:
        raise RuntimeError(f"tileset '{tileset_id}' not found in LDtk")

    cols = atlas_w // tile_size

    used_by_layer: dict[str, set[tuple[int, int]]] = defaultdict(set)

    def walk_levels(levels, world_name=""):
        for level in levels:
            for layer in level.get("layerInstances", []):
                if layer.get("__tilesetDefUid") != target_uid:
                    continue
                prefix = f"{world_name}::" if world_name else ""
                key = f"{prefix}{level.get('identifier')}::{layer.get('__identifier')}"
                for t in layer.get("gridTiles", []):
                    tid = t.get("t")
                    if tid is None:
                        continue
                    used_by_layer[key].add((tid % cols, tid // cols))
                for t in layer.get("autoLayerTiles", []):
                    tid = t.get("t")
                    if tid is None:
                        continue
                    used_by_layer[key].add((tid % cols, tid // cols))

    walk_levels(data.get("levels", []))
    for world in data.get("worlds", []):
        walk_levels(world.get("levels", []), world.get("identifier", ""))

    combined: set[tuple[int, int]] = set()
    for s in used_by_layer.values():
        combined |= s

    return {
        "atlas_size": [atlas_w, atlas_h],
        "tile_size": tile_size,
        "grid": [cols, atlas_h // tile_size],
        "unique_used": sorted(combined),
        "by_layer": {k: sorted(v) for k, v in used_by_layer.items()},
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ldtk", required=True)
    ap.add_argument("--tileset-id", required=True)
    ap.add_argument("--tile-size", type=int, default=16)
    ap.add_argument("--out", default="tools/tileset_maps/_used_tiles.json")
    args = ap.parse_args()

    result = extract(Path(args.ldtk), args.tileset_id, args.tile_size)
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"atlas     = {result['atlas_size']}")
    print(f"grid      = {result['grid']}  (cols x rows)")
    print(f"unique    = {len(result['unique_used'])} tiles used")
    for layer, coords in result["by_layer"].items():
        print(f"  {layer}: {len(coords)} tiles")
    print(f"saved     -> {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
