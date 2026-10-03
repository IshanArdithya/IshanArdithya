"""Partition Aura's supplied pixel SVG into lossless, independently animated layers.
Usage: python3 game/tools/prepare-aura.py /path/to/aura-true-pixel-detailed.svg
Only integer pixel geometry is emitted; no smoothing or raster conversion.
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
if svg.get('viewBox') != '0 0 96 110':
    raise ValueError('Expected the supplied 96 × 110 Aura sprite')
cells = {}
for element in svg:
    if element.tag != '{http://www.w3.org/2000/svg}rect':
        raise ValueError('Only colored pixel rectangles are supported')
    color = element.get('fill', '')
    if not re.fullmatch(r'#[0-9a-fA-F]{6}', color):
        raise ValueError('Invalid color')
    x, y, w, h = (int(element.get(k, '0')) for k in ('x', 'y', 'width', 'height'))
    if min(x, y) < 0 or w < 1 or h < 1 or x + w > 96 or y + h > 110:
        raise ValueError('Pixel lies outside the canvas')
    for yy in range(y, y+h):
        for xx in range(x, x+w):
            cells[xx, yy] = color


def inside(x, y, polygon):
    x, y = x+.5, y+.5
    hit = False
    for (ax, ay), (bx, by) in zip(polygon, polygon[1:]+polygon[:1]):
        if (ay > y) != (by > y) and x < (bx-ax)*(y-ay)/(by-ay)+ax:
            hit = not hit
    return hit


def layer(x, y):
    if x <= 31 and 40 <= y <= 64:
        if y >= 53 and x <= 13: return 'panLeft'
        if y >= 53 and x >= 18: return 'panRight'
        return 'scales'
    if inside(x, y, [(58,24),(65,24),(80,33),(79,46),(66,48),(64,54),(59,52),(60,44),(56,41)]):
        return 'hair'
    if inside(x, y, [(0,81),(24,68),(33,60),(43,60),(39,70),(35,78),(30,84),(28,95),(18,104),(0,91)]):
        return 'cape'
    return 'body'

# Row runs are combined by color inside each layer. Every source cell is kept
# exactly once; the rest frame has precisely the original coverage and palette.
layers = {name: defaultdict(list) for name in ('cape','hair','body','scales','panLeft','panRight')}
for y in range(110):
    x = 0
    while x < 96:
        color = cells.get((x, y))
        if color is None:
            x += 1
            continue
        name, start = layer(x, y), x
        x += 1
        while x < 96 and cells.get((x, y)) == color and layer(x, y) == name:
            x += 1
        layers[name][color].append(f'M{start} {y}h{x-start}v1h-{x-start}z')
markup = {name: ''.join(f'<path fill="{color}" d="{"".join(runs)}"/>' for color,runs in colors.items()) for name,colors in layers.items()}
# Keep one pixel of original color behind moving joints. These pixels are
# already covered at rest; they prevent transparent cracks during stepped motion.
seams = defaultdict(list)
for (x, y), color in cells.items():
    name = layer(x, y)
    neighbor = {'hair': (x-1,y), 'cape': (x+1,y), 'panLeft': (x,y-1), 'panRight': (x,y-1)}.get(name)
    if neighbor in cells and layer(*neighbor) != name:
        seams[color].append(f'M{x} {y}h1v1h-1z')
seam_markup = ''.join(f'<path fill="{color}" d="{"".join(runs)}"/>' for color,runs in seams.items())
(root/'assets/aura-original.svg').write_bytes(source)
(root/'assets/aura.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 110" shape-rendering="crispEdges"><title>Aura — supplied true pixel sprite</title>\n'+''.join(markup.values())+'\n</svg>\n')
(root/'aura-source.mjs').write_text('// Generated losslessly from assets/aura-original.svg by tools/prepare-aura.py.\nexport const AURA_LAYERS = '+json.dumps(markup)+';\nexport const AURA_SEAMS = '+json.dumps(seam_markup)+';\n')
print(f'Preserved {len(cells)} pixel cells and {len(set(cells.values()))} colors in {len(markup)} animation layers.')
