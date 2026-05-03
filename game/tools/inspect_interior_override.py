"""Inspect overrideTilesetUid per Interior instance for a few sample levels."""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LDTK = os.path.join(ROOT, 'public', 'assets', 'World_ProjectAbyss.ldtk')
proj = json.load(open(LDTK, encoding='utf-8'))
base = os.path.dirname(LDTK)
targets = {'FirstAnvil', 'Builder_Level_0', 'Overworld_Level_26',
           'Garden', 'SaveRoom', 'Builder_Level_1', 'WorldEntrance3'}

for w in proj.get('worlds') or []:
    for lvl in w.get('levels') or []:
        if lvl.get('identifier') not in targets:
            continue
        ext = lvl.get('externalRelPath')
        if ext:
            data = json.load(open(os.path.join(base, ext.replace('\\', '/')), encoding='utf-8'))
        else:
            data = lvl
        for L in data.get('layerInstances') or []:
            if L.get('layerDefUid') == 707:
                painted = sum(1 for v in (L.get('intGridCsv') or []) if v)
                print(f"{lvl['identifier']:<22} override={L.get('overrideTilesetUid')!s:<6} "
                      f"path={L.get('__tilesetRelPath')!s:<32} painted={painted}")
