"""Favicon generator: my pixel-art bust (images/coder.png) over a dithered night sky.

Run:  python _favicon.py
Writes favicon.svg, favicon.ico, favicon.png (apple-touch), icon-192/512.png,
images/favicon-frames.png (32px frames used by script.js: rest, blink, glint)
and site.webmanifest. Underscore prefix keeps it out of the GitHub Pages build.
"""
import base64
import io
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).parent
S = 32  # favicon canvas, sprite pixels map 1:1

C = {
    'ink': (5, 13, 20), 'navy': (8, 26, 38), 'navy2': (12, 35, 51), 'teal': (18, 56, 74),
    'sky': (29, 90, 110), 'paper': (239, 230, 216),
    'orange': (255, 107, 44), 'orange2': (255, 148, 89), 'deep': (184, 64, 26),
}
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
SKY = ['ink', 'navy', 'navy2', 'teal', 'sky']

# Crop of images/coder.png: head and shoulders, pasted at OFFSET
CROP = (3, 0, 35, 30)
OFFSET = (0, 3)
SKIN = (233, 164, 122)       # same as CODER.skin in script.js
EYES = [(13, 14, 4), (21, 14, 3)]  # sprite coords (x, y, width), as in script.js

# Small brand star in the top-right corner (centre at STAR)
STAR = (26, 6)


def sky():
    im = Image.new('RGBA', (S, S))
    for y in range(S):
        for x in range(S):
            # 2px dither cells so the pattern survives the 16px downscale
            bx, by = x // 2, y // 2
            t = y / (S - 1) * (len(SKY) - 1.3)
            i = int(t)
            step = t - i > (BAYER[by % 4][bx % 4] + 0.5) / 16
            im.putpixel((x, y), C[SKY[min(i + step, len(SKY) - 1)]] + (255,))
    return im


def star(im, kind):
    cx, cy = STAR
    px = lambda x, y, c: im.putpixel((cx + x, cy + y), C[c] + (255,))
    arm = 2 if kind == 'glint' else 1
    for d in range(1, arm + 1):
        c = 'orange' if d == 1 else 'orange2'
        for x, y in [(d, 0), (-d, 0), (0, d), (0, -d)]:
            px(x, y, 'paper' if kind == 'glint' and d == 1 else c)
    px(0, 0, 'paper')


def frame(kind):
    im = sky()
    sprite = Image.open(ROOT / 'images' / 'coder.png').convert('RGBA')
    if kind == 'blink':
        for x, y, w in EYES:
            for i in range(w):
                sprite.putpixel((x + i, y), SKIN + (255,))
    im.alpha_composite(sprite.crop(CROP), OFFSET)
    star(im, kind)
    return im


def rounded(im, r=5):
    mask = Image.new('L', im.size, 255)
    for y in range(r):
        for x in range(r):
            if (r - x - 0.5) ** 2 + (r - y - 0.5) ** 2 > r * r:
                for X, Y in [(x, y), (S - 1 - x, y), (x, S - 1 - y), (S - 1 - x, S - 1 - y)]:
                    mask.putpixel((X, Y), 0)
    out = im.copy()
    out.putalpha(mask)
    return out


def up(im, k):
    return im.resize((im.width * k, im.height * k), Image.NEAREST)


if __name__ == '__main__':
    rest = frame('rest')
    icon = rounded(rest)

    # SVG wraps the crisp PNG so it scales without smoothing
    buf = io.BytesIO()
    icon.save(buf, 'PNG')
    data = base64.b64encode(buf.getvalue()).decode()
    (ROOT / 'favicon.svg').write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
        f'<image width="32" height="32" style="image-rendering:pixelated" href="data:image/png;base64,{data}"/>'
        '</svg>\n', encoding='utf-8')
    up(icon, 2).save(ROOT / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    # apple-touch / manifest icons are full-bleed: the OS applies its own mask
    up(rest, 6).save(ROOT / 'favicon.png')
    up(rest, 6).save(ROOT / 'icon-192.png')
    up(rest, 16).save(ROOT / 'icon-512.png')

    strip = Image.new('RGBA', (S * 3, S))
    for k, kind in enumerate(['rest', 'blink', 'glint']):
        strip.paste(rounded(frame(kind)), (S * k, 0))
    strip.save(ROOT / 'images' / 'favicon-frames.png')

    (ROOT / 'site.webmanifest').write_text(json.dumps({
        'name': 'Mehmet Kahya', 'short_name': 'Mehmet Kahya',
        'start_url': '/', 'display': 'standalone',
        'background_color': '#081a26', 'theme_color': '#06121b',
        'icons': [
            {'src': '/icon-192.png', 'sizes': '192x192', 'type': 'image/png', 'purpose': 'any maskable'},
            {'src': '/icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any maskable'},
        ],
    }, indent=2) + '\n', encoding='utf-8')
    print('favicons written')
