"""Preserve Frieren's uniform pixel SVG and separate its twin tails for animation.
Usage: python3 game/tools/prepare-frieren.py /path/to/frieren-game-uniform-pixels.svg
No raster conversion, smoothing, or palette changes.
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
if svg.get('viewBox') != '0 0 128 96':
    raise ValueError('Expected the supplied 128 × 96 Frieren sprite')
cells = {}
for e in svg.iter():
    tag = e.tag.removeprefix('{http://www.w3.org/2000/svg}')
    if tag in ('svg', 'g'):
        if e.get('transform'):
            raise ValueError('Transformed pixels are unsupported')
        continue
    if tag != 'rect' or e.get('width') != '1' or e.get('height') != '1':
        raise ValueError('Only uniform 1 × 1 pixel rectangles are supported')
    color = e.get('fill', '')
    if not re.fullmatch(r'#[0-9a-fA-F]{6}', color):
        raise ValueError('Invalid color')
    x, y = int(e.get('x')), int(e.get('y'))
    if not (0 <= x < 128 and 0 <= y < 96):
        raise ValueError('Pixel lies outside the canvas')
    cells[x, y] = color


def inside(x, y, polygon):
    x, y = x+.5, y+.5
    hit = False
    for (ax, ay), (bx, by) in zip(polygon, polygon[1:]+polygon[:1]):
        if (ay > y) != (by > y) and x < (bx-ax)*(y-ay)/(by-ay)+ax:
            hit = not hit
    return hit


def layer(x, y):
    if inside(x,y,[(15,20),(51,20),(51,29),(46,29),(46,34),(43,34),(40,38),(36,44),(34,50),(30,55),(29,66),(15,66)]):
        return 'hairLeft'
    if inside(x,y,[(73,42),(75,42),(75,44),(77,44),(77,46),(80,46),(80,48),(82,48),(82,51),(78,51),(77,49),(75,49),(73,46)]):
        return 'hairRight'
    return 'body'

layers = {name: defaultdict(list) for name in ('hairLeft','hairRight','body')}
for y in range(96):
    x = 0
    while x < 128:
        color = cells.get((x,y))
        if color is None:
            x += 1
            continue
        name, start = layer(x,y), x
        x += 1
        while x < 128 and cells.get((x,y)) == color and layer(x,y) == name:
            x += 1
        layers[name][color].append(f'M{start} {y}h{x-start}v1h-{x-start}z')
markup = {name: ''.join(f'<path fill="{c}" d="{"".join(runs)}"/>' for c,runs in colors.items()) for name,colors in layers.items()}
seams = defaultdict(list)
for (x,y),color in cells.items():
    name = layer(x,y)
    neighbor = {'hairLeft':(x+1,y), 'hairRight':(x-1,y)}.get(name)
    if neighbor in cells and layer(*neighbor) != name:
        seams[color].append(f'M{x} {y}h1v1h-1z')
seam_markup = ''.join(f'<path fill="{c}" d="{"".join(runs)}"/>' for c,runs in seams.items())
(root/'assets/frieren-original.svg').write_bytes(source)
(root/'assets/frieren.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 96" shape-rendering="crispEdges"><title>Frieren — supplied uniform pixel sprite</title>'+''.join(markup.values())+'</svg>\n')
(root/'frieren-source.mjs').write_text('// Generated losslessly from assets/frieren-original.svg by tools/prepare-frieren.py.\nexport const FRIEREN_LAYERS = '+json.dumps(markup)+';\nexport const FRIEREN_SEAMS = '+json.dumps(seam_markup)+';\n')
print(f'Preserved {len(cells)} pixel cells and {len(set(cells.values()))} colors in {len(markup)} layers.')
