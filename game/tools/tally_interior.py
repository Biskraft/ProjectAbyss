"""Per-level tally of painted Interior IntGrid cells in World_ProjectAbyss.ldtk.

Output: level identifier, has Interior layer (Y/N), tileset rel path, painted cell count.
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LDTK = os.path.join(ROOT, 'public', 'assets', 'World_ProjectAbyss.ldtk')

with open(LDTK, 'r', encoding='utf-8') as f:
    proj = json.load(f)

base_dir = os.path.dirname(LDTK)

INTERIOR_LAYER_UID = 707  # from layer definition

all_levels = []
for w in proj.get('worlds') or []:
    for lvl in w.get('levels') or []:
        all_levels.append((w.get('identifier', '?'), lvl))
for lvl in proj.get('levels') or []:
    all_levels.append(('(root)', lvl))

rows = []
for world_id, lvl in all_levels:
    name = f"{world_id}/{lvl.get('identifier', '?')}"
    # external level data
    ext_rel = lvl.get('externalRelPath')
    if ext_rel:
        ext_path = os.path.join(base_dir, ext_rel.replace('\\', '/'))
        try:
            with open(ext_path, 'r', encoding='utf-8') as ef:
                level_data = json.load(ef)
        except Exception as e:
            rows.append((name, 'ERR', '', 0, str(e)))
            continue
    else:
        level_data = lvl

    layers = level_data.get('layerInstances') or []
    interior = None
    for layer in layers:
        if layer.get('layerDefUid') == INTERIOR_LAYER_UID:
            interior = layer
            break

    if interior is None:
        rows.append((name, 'N', '', 0, ''))
        continue

    tileset_rel = interior.get('__tilesetRelPath') or ''
    intgrid = interior.get('intGridCsv') or []
    painted = sum(1 for v in intgrid if v != 0)
    autotile = len(interior.get('autoLayerTiles') or [])
    rows.append((name, 'Y', tileset_rel, painted, autotile))

# Sort: painted DESC, then name
rows.sort(key=lambda r: (-(r[3] if isinstance(r[3], int) else 0), r[0]))

print(f"{'LEVEL':<32} {'INT':<4} {'PAINTED':>8} {'AUTOTILES':>10}  TILESET")
print('-' * 100)
for name, has, tileset, painted, autotile_or_err in rows:
    print(f"{name:<32} {has:<4} {painted:>8} {str(autotile_or_err):>10}  {tileset}")

# Summary
total = len(rows)
with_layer = sum(1 for r in rows if r[1] == 'Y')
with_painted = sum(1 for r in rows if r[1] == 'Y' and isinstance(r[3], int) and r[3] > 0)
print('-' * 100)
print(f"Total levels: {total}, Interior layer present: {with_layer}, Painted (>0 cells): {with_painted}")
