#!/usr/bin/env python3
"""Rebuild arcane icons with detailed vector artwork and one shared frame.

Build-time dependency: Pillow. Output contains only integer-coordinate paths.
For defense, pass the attack PNG as --frame-reference to match both borders.
"""

import argparse
from collections import defaultdict
from pathlib import Path
from PIL import Image, ImageOps

SIZE = 320
INTERIOR = (34, 41, 286, 279)


def frame_pixel(x, y):
    left, top, right, bottom = INTERIOR
    if not (left <= x < right and top <= y < bottom):
        return True
    # Preserve the matching gold flourishes just inside all four corners.
    return (x < 51 or x >= 269) and (y < 61 or y >= 259)


def read_reference(path):
    with Image.open(path) as image:
        image = ImageOps.exif_transpose(image).convert('RGB')
        if image.width != image.height:
            raise ValueError('Expected a square reference')
        return image


def palette_image(image):
    return image.quantize(colors=128, method=Image.Quantize.MEDIANCUT,
                          dither=Image.Dither.NONE).convert('RGB')


def vector_paths(pixels, include):
    rectangles, active = defaultdict(list), {}
    for y in range(SIZE + 1):
        runs = set()
        x = 0
        while y < SIZE and x < SIZE:
            if not include(x, y):
                x += 1
                continue
            color = pixels.getpixel((x, y))
            end = x + 1
            while end < SIZE and include(end, y) and pixels.getpixel((end, y)) == color:
                end += 1
            runs.add((color, x, end - x))
            x = end
        for key in list(active):
            if key not in runs:
                color, left, width = key
                top = active.pop(key)
                rectangles[color].append((left, top, width, y - top))
        for key in sorted(runs):
            active.setdefault(key, y)
    paths = []
    for (r, g, b), boxes in sorted(rectangles.items()):
        geometry = ''.join(f'M{x} {y}h{w}v{h}h-{w}z' for x, y, w, h in boxes)
        paths.append(f'    <path fill="#{r:02x}{g:02x}{b:02x}" d="{geometry}"/>')
    return '\n'.join(paths)


def vectorize(source, destination, artwork='attack', frame_reference=None):
    if artwork == 'defense' and frame_reference is None:
        raise ValueError('Defense requires the attack PNG as --frame-reference')
    original = read_reference(source)
    border = read_reference(frame_reference or source).resize((SIZE, SIZE), Image.Resampling.NEAREST)
    # Quantize the frame separately so red/blue artwork cannot alter its golds.
    frame = '<g id="arcane-frame">\n' + vector_paths(palette_image(border), frame_pixel) + '\n  </g>'
    if artwork == 'defense':
        # The references have slightly different frame insets. Align only the
        # artwork opening; reuse the exact same border geometry and palette.
        box = tuple(round(v * original.width / 1254) for v in (140, 161, 1113, 1093))
        interior = original.crop(box).resize((252, 238), Image.Resampling.NEAREST)
    else:
        interior = original.resize((SIZE, SIZE), Image.Resampling.NEAREST).crop(INTERIOR)
    pixels = Image.new('RGB', (SIZE, SIZE))
    pixels.paste(palette_image(interior), INTERIOR[:2])
    paths = vector_paths(pixels, lambda x, y: not frame_pixel(x, y))
    title, description, group = {
        'attack': ('Pixel scepter arcane blast',
                   'A ruby-tipped gold staff fires an ivory and red magical blast surrounded by crimson rings and sparks.',
                   'arcane-blast-artwork'),
        'defense': ('Pixel scepter arcane defense',
                    'A sapphire-tipped gold staff projects a cyan defensive barrier with concentric rings, diamond runes, and icy sparks.',
                    'arcane-defense-artwork'),
    }[artwork]
    opening = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 320 320" role="img" aria-labelledby="title desc" shape-rendering="crispEdges">'
    svg = '\n'.join([
        opening, f'  <title id="title">{title}</title>',
        f'  <desc id="desc">{description} Detailed vector reconstruction on a 320 by 320 grid, with a shared gold-and-ruby frame. The artwork uses up to 128 colors independently of the frame.</desc>',
        f'  <g id="{group}">', paths, '  </g>', '  ' + frame, '</svg>', '',
    ])
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(svg)
    # Transparent center makes this same frame reusable for future action icons.
    (destination.parent / 'arcane-frame.svg').write_text('\n'.join([
        opening, '  <title id="title">Shared jeweled pixel frame</title>',
        '  <desc id="desc">Gold rails, ruby corner ornaments, and gold flourishes with a transparent artwork opening.</desc>',
        '  ' + frame, '</svg>', '',
    ]))
    print(f'Wrote {destination}: {len(svg.encode()):,} bytes; shared vector frame, no embedded bitmap')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('destination', type=Path)
    parser.add_argument('--artwork', choices=['attack', 'defense'], default='attack')
    parser.add_argument('--frame-reference', type=Path)
    args = parser.parse_args()
    vectorize(args.source, args.destination, args.artwork, args.frame_reference)
