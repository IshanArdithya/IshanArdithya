"""Crop the existing vector pixel sprites into compact HUD portraits."""
from collections import defaultdict
from pathlib import Path
from xml.etree import ElementTree as ET
import json

root = Path(__file__).resolve().parents[1]
portraits = {}
for name, left, top in [('frieren',48,18), ('aura',48,12)]:
    colors = defaultdict(list)
    cells = {}
    for e in ET.parse(root / f'assets/{name}-original.svg').getroot().iter():
        if e.tag.split('}')[-1] != 'rect':
            continue
        x, y = int(e.get('x')), int(e.get('y'))
        if left <= x < left+32 and top <= y < top+32:
            if e.get('width') != '1' or e.get('height') != '1':
                raise ValueError('Expected uniform vector pixels')
            cells[x-left,y-top] = e.get('fill')
    for y in range(32):
        x = 0
        while x < 32:
            color = cells.get((x,y))
            if color is None:
                x += 1
                continue
            start = x
            x += 1
            while x < 32 and cells.get((x,y)) == color:
                x += 1
            colors[color].append(f'M{start} {y}h{x-start}v1h-{x-start}z')
    portraits[name] = ''.join(f'<path fill="{color}" d="{"".join(runs)}"/>' for color,runs in colors.items())
(root / 'hud-source.mjs').write_text('// Generated from the existing vector sprites by tools/prepare-hud.py.\nexport const HUD_PORTRAITS = ' + json.dumps(portraits, separators=(',',':')) + ';\n')
