"""Partition Aura's supplied pixel SVG into lossless, independently animated layers.
Usage: python3 game/tools/prepare-aura.py /path/to/aura-game-uniform-pixels.svg
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
if svg.get('viewBox') != '0 0 128 96':
    raise ValueError('Expected the supplied 128 × 96 Aura sprite')
cells = {}
for element in svg.iter():
    tag = element.tag.removeprefix('{http://www.w3.org/2000/svg}')
    if tag in ('svg', 'g'):
        if element.get('transform'):
            raise ValueError('Transformed pixels are unsupported')
        continue
    if tag != 'rect' or element.get('width') != '1' or element.get('height') != '1':
        raise ValueError('Only uniform 1 × 1 pixel rectangles are supported')
    color = element.get('fill', '')
    if not re.fullmatch(r'#[0-9a-fA-F]{6}', color):
        raise ValueError('Invalid color')
    x, y, w, h = (int(element.get(k, '0')) for k in ('x', 'y', 'width', 'height'))
    if min(x, y) < 0 or x + w > 128 or y + h > 96:
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
    if x <= 51 and 41 <= y <= 59:
        if y >= 51 and x <= 38: return 'panLeft'
        if y >= 51 and x >= 43: return 'panRight'
        return 'scales'
    if inside(x, y, [(72,29),(77,29),(88,36),(87,45),(78,47),(77,51),(73,50),(74,44),(71,42)]):
        return 'hair'
    if inside(x, y, [(30,71),(47,61),(54,56),(61,56),(58,63),(55,69),(52,73),(50,81),(43,88),(30,78)]):
        return 'cape'
    return 'body'

# Row runs are combined by color inside each layer. Every source cell is kept
# exactly once; the rest frame has precisely the original coverage and palette.
layers = {name: defaultdict(list) for name in ('cape','hair','body','scales','panLeft','panRight')}
for y in range(96):
    x = 0
    while x < 128:
        color = cells.get((x, y))
        if color is None:
            x += 1
            continue
        name, start = layer(x, y), x
        x += 1
        while x < 128 and cells.get((x, y)) == color and layer(x, y) == name:
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
(root/'assets/aura.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 96" shape-rendering="crispEdges"><title>Aura — supplied uniform pixel sprite</title>\n'+''.join(markup.values())+'\n</svg>\n')
(root/'aura-source.mjs').write_text('// Generated losslessly from assets/aura-original.svg by tools/prepare-aura.py.\nexport const AURA_LAYERS = '+json.dumps(markup)+';\nexport const AURA_SEAMS = '+json.dumps(seam_markup)+';\n')
print(f'Preserved {len(cells)} pixel cells and {len(set(cells.values()))} colors in {len(markup)} animation layers.')
