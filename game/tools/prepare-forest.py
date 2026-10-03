"""Losslessly compact the supplied 320 × 180 forest into SVG pixel paths.
Usage: python3 game/tools/prepare-forest.py /path/to/frieren-forest-background-320x180.svg
"""
import json
import re
import sys
from collections import defaultdict
from pathlib import Path
from xml.etree import ElementTree as ET

root = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1]).read_bytes()
svg = ET.fromstring(source)
if svg.get('viewBox') != '0 0 320 180':
    raise ValueError('Expected a 320 × 180 forest')
cells = {}
for e in svg:
    if e.tag != '{http://www.w3.org/2000/svg}rect' or e.get('width') != '1' or e.get('height') != '1':
        raise ValueError('Expected uniform pixel rectangles')
    x,y = int(e.get('x')),int(e.get('y'))
    color = e.get('fill','')
    if not (0 <= x < 320 and 0 <= y < 180) or not re.fullmatch(r'#[0-9a-fA-F]{6}',color):
        raise ValueError('Invalid pixel')
    if (x,y) in cells:
        raise ValueError('Duplicate pixel')
    cells[x,y] = color
if len(cells) != 320*180:
    raise ValueError('Expected a fully painted background')

# Merge same-color runs, then extend matching runs vertically. This changes
# representation only: the source palette and every pixel remain identical.
paths = defaultdict(list)
active = {}
for y in range(181):
    row = {}
    x = 0
    while y < 180 and x < 320:
        color,start = cells[x,y],x
        x += 1
        while x < 320 and cells[x,y] == color:
            x += 1
        key = (start,x-start,color)
        row[key] = active.get(key,y)
    for (x,w,color),top in active.items():
        if (x,w,color) not in row:
            paths[color].append(f'M{x} {top}h{w}v{y-top}h-{w}z')
    active = row
markup = ''.join(f'<path fill="{c}" d="{"".join(runs)}"/>' for c,runs in paths.items())

# Small sunlit leaf tips retain their original colors over the intact base.
# Moving only these highlights avoids holes and keeps trunks/ground stationary.
leaves = defaultdict(list)
for (x,y),c in cells.items():
    r,g,b = (int(c[i:i+2],16) for i in (1,3,5))
    tip = (72 <= x < 97 and 3 <= y < 23) or (178 <= x < 199 and 7 <= y < 29) or (246 <= x < 269 and 22 <= y < 40)
    if tip and g > r and g > b and r > 90:
        leaves[c].append(f'M{x} {y}h1v1h-1z')
foliage = ''.join(f'<path fill="{c}" d="{"".join(runs)}"/>' for c,runs in leaves.items())
(root/'assets/forest-original.svg').write_bytes(source)
(root/'assets/forest.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" shape-rendering="crispEdges"><title>Forest clearing — supplied pixel background</title>'+markup+'</svg>\n')
(root/'forest-source.mjs').write_text('// Generated losslessly from assets/forest-original.svg by tools/prepare-forest.py.\nexport const FOREST_SHAPES = '+json.dumps(markup)+';\nexport const FOREST_LEAVES = '+json.dumps(foliage)+';\n')
print(f'Preserved {len(cells)} pixels and {len(paths)} colors; compact SVG geometry: {len(markup):,} bytes.')
