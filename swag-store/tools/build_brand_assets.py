"""
Rebuilds the SWAG brand assets from the reference logo card (reference/swag-logo-card.png):

  * theme/snippets/swag-signature.liquid - the handwritten signature, traced into monoline SVG strokes
  * theme/assets/stars.svg                - a seamless tile of five-point stars like the ones on the card
  * the --stars data URI in theme/assets/base.css (the same tile, inlined so CSS masks avoid CORS)

    pip install pillow numpy scipy scikit-image
    python3 tools/build_brand_assets.py
"""
import math
import os
import random
import re
import urllib.parse

import numpy as np
from PIL import Image
from scipy import ndimage
from skimage import measure, morphology

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THEME = os.path.join(ROOT, 'theme')

# ---------- trace the signature ----------
im = np.asarray(Image.open(os.path.join(ROOT, 'reference', 'swag-logo-card.png')).convert('L')).astype(int)
dark = im < 90
lab = measure.label(dark, connectivity=2)
props = [p for p in measure.regionprops(lab) if p.area > 1500]
mask = np.isin(lab, [p.label for p in props])
mask = ndimage.binary_closing(mask, iterations=1)

H, W = mask.shape
PRUNE2 = 10
stroke = 13.2
OFFS = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]


def nbrs(p, s):
    y, x = p
    out = []
    for dy, dx in OFFS:
        ny, nx = y + dy, x + dx
        if 0 <= ny < H and 0 <= nx < W and (ny, nx) in s:
            out.append((ny, nx))
    return out


def build(s):
    deg = {p: len(nbrs(p, s)) for p in s}
    nodes = {p for p, d in deg.items() if d != 2}
    edges = []
    seen = set()
    for n in nodes:
        for nb in nbrs(n, s):
            if (n, nb) in seen:
                continue
            path = [n, nb]
            prev, cur = n, nb
            while cur not in nodes:
                nxt = [q for q in nbrs(cur, s) if q != prev]
                if not nxt:
                    break
                prev, cur = cur, nxt[0]
                path.append(cur)
            seen.add((path[-1], path[-2]))
            seen.add((n, nb))
            edges.append(path)
    return deg, nodes, edges


def centreline(mask, prune=22):
    """Skeleton of the pen strokes, with short spurs (star points, jaggies) pruned off."""
    s = set(zip(*np.nonzero(morphology.skeletonize(mask))))
    for _ in range(6):
        deg, nodes, edges = build(s)
        removed = False
        for e in edges:
            a, b = e[0], e[-1]
            ends = [p for p in (a, b) if deg.get(p) == 1]
            other = [p for p in (a, b) if deg.get(p, 0) >= 3]
            if ends and other and len(e) < prune:
                for p in e:
                    if p not in other:
                        s.discard(p)
                removed = True
        if not removed:
            break
    img = np.zeros((H, W), bool)
    for y, x in s:
        img[y, x] = True
    return morphology.skeletonize(ndimage.binary_dilation(img, iterations=1))


# pass 1: model the pen stroke, then strip star arms that stick out of it
line = centreline(mask, 22)
model = ndimage.distance_transform_edt(~line) <= stroke / 2 + 1.5
residual = mask & ~model
# only strip blobs belonging to the stars that touch the pen strokes; the other
# residuals are genuine stroke tips (W peak, A apex, crossbar end, G tail)
# (y, x) centres of the stars that overlap the signature on the card
STARS = [(272, 258), (290, 440), (382, 252), (345, 700), (250, 625), (334, 381)]
rl = measure.label(residual)
keep = np.zeros_like(residual)
for p in measure.regionprops(rl):
    cy, cx = p.centroid
    if any(np.hypot(cy - sy, cx - sx) < 18 for sy, sx in STARS):
        keep |= rl == p.label
residual = keep
mask = mask & ~ndimage.binary_dilation(residual, iterations=2)
mask = mask | (model & ndimage.binary_dilation(mask, iterations=1) & ~ndimage.binary_dilation(residual, iterations=2))
line = centreline(mask, PRUNE2)
s = set(zip(*np.nonzero(line)))
deg, nodes, edges = build(s)
edges = [e for e in edges if len(e) > 6]
print('edges', len(edges), [len(e) for e in edges])


def smooth(pts, k=4):
    pts = np.array(pts, float)
    if len(pts) < 2 * k + 1:
        return pts
    out = pts.copy()
    for i in range(k, len(pts) - k):
        out[i] = pts[i - k:i + k + 1].mean(axis=0)
    return out


def rdp(pts, eps):
    if len(pts) < 3:
        return pts
    a, b = pts[0], pts[-1]
    ab = b - a
    n = np.hypot(*ab) or 1e-9
    d = np.abs(ab[0] * (pts[:, 1] - a[1]) - ab[1] * (pts[:, 0] - a[0])) / n
    i = int(np.argmax(d))
    if d[i] > eps:
        return np.vstack([rdp(pts[:i + 1], eps)[:-1], rdp(pts[i:], eps)])
    return np.vstack([a, b])


# global bbox for normalisation
ys, xs = np.nonzero(mask)
pad = 8
x0, y0 = xs.min() - pad, ys.min() - pad
x1, y1 = xs.max() + pad, ys.max() + pad


def fmt(v):
    return ('%.1f' % v).rstrip('0').rstrip('.')


def catmull(pts):
    # pts in (x, y)
    d = 'M%s %s' % (fmt(pts[0][0]), fmt(pts[0][1]))
    P = np.vstack([pts[0], pts, pts[-1]])
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        c1 = p1 + (p2 - p0) / 6
        c2 = p2 - (p3 - p1) / 6
        d += 'C%s %s %s %s %s %s' % tuple(fmt(v) for v in (*c1, *c2, *p2))
    return d


paths = []
edges.sort(key=lambda e: min(x for y, x in e))
for e in edges:
    # write each stroke left-to-right, like a pen would
    if e[0][1] > e[-1][1]:
        e = e[::-1]
    pts = np.array([(x - x0, y - y0) for y, x in e], float)
    pts = smooth(pts, 5)
    pts = rdp(pts, 1.1)
    paths.append(catmull(pts))

vw, vh = x1 - x0, y1 - y0
logo = {'viewBox': [int(vw), int(vh)], 'stroke': stroke, 'paths': paths}

# ---------- star tile ----------
def star(cx, cy, r, rot, inner=0.5):
    pts = []
    for i in range(10):
        rad = r if i % 2 == 0 else r * inner
        a = math.radians(rot - 90 + i * 36)
        pts.append('%.1f %.1f' % (cx + rad * math.cos(a), cy + rad * math.sin(a)))
    return 'M' + 'L'.join(pts) + 'Z'

random.seed(11)
T = 720
# size mix measured off the reference card: a few big stars, lots of mid and small ones
sizes = ([random.uniform(14, 19) for _ in range(10)] + [random.uniform(8, 12) for _ in range(20)]
         + [random.uniform(4.5, 7) for _ in range(25)] + [random.uniform(2.5, 3.5) for _ in range(7)])
placed = []
for r in sizes:
    for _ in range(4000):
        x, y = random.uniform(0, T), random.uniform(0, T)
        if all(math.hypot(min(abs(x - px), T - abs(x - px)), min(abs(y - py), T - abs(y - py))) > (r + pr) * 1.6 + 26
               for px, py, pr in placed):
            placed.append((x, y, r))
            break
d = ''
for x, y, r in placed:
    rot = random.uniform(-25, 25)
    # wrap stars that cross the tile edge so the pattern tiles seamlessly
    for ox in (-T, 0, T):
        for oy in (-T, 0, T):
            if -r <= x + ox <= T + r and -r <= y + oy <= T + r:
                d += star(x + ox, y + oy, r, rot)
tile = '<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d"><path d="%s"/></svg>' % (T, T, T, T, d)
open(f'{THEME}/assets/stars.svg', 'w').write(tile)
uri = 'data:image/svg+xml,' + urllib.parse.quote(tile.replace('"', "'"), safe=" /=:.'-")
css_path = f'{THEME}/assets/base.css'
css = open(css_path).read()
css = re.sub(r'--stars: url\("[^"]*"\);', lambda _: '--stars: url("%s");' % uri, css, count=1)
open(css_path, 'w').write(css)
print('stars', len(placed), 'uri bytes', len(uri))

# ---------- signature snippet ----------
vw, vh = logo['viewBox']

def length(d):
    nums = [float(n) for n in re.findall(r'-?\d+(?:\.\d+)?', d)]
    pts = [(nums[0], nums[1])] + [(nums[i + 4], nums[i + 5]) for i in range(2, len(nums) - 4, 6)]
    return sum(math.dist(a, b) for a, b in zip(pts, pts[1:]))

lens = [length(p) for p in logo['paths']]
total = sum(lens)
start = 0.0
paths = []
for d, L in zip(logo['paths'], lens):
    # delay/duration as fractions of the whole signature, so one CSS var sets the speed
    paths.append('    <path pathLength="1" style="--d:%.3f;--t:%.3f" d="%s"/>' % (start / total, max(L / total, 0.02), d))
    start += L * 0.92
snippet = '''{%- comment -%}
  The SWAG signature, traced from the brand's grey star-field logo.
  Monoline strokes in currentColor, so it takes the colour of whatever it sits on.

  Accepts:
  - class {String}: extra classes for the <svg>
  - animate {Boolean}: write the signature on like a pen stroke (respects reduced motion)
  - label {String}: accessible name, defaults to the shop name
{%- endcomment -%}
<svg
  class="signature{% if animate %} signature--animate{% endif %}{% if class != blank %} {{ class }}{% endif %}"
  viewBox="0 0 __VW__ __VH__"
  fill="none"
  stroke="currentColor"
  stroke-width="__SW__"
  stroke-linecap="round"
  stroke-linejoin="round"
  role="img"
  aria-label="{{ label | default: shop.name | escape }}"
  xmlns="http://www.w3.org/2000/svg"
>
  <g>
__PATHS__
  </g>
</svg>
'''
snippet = snippet.replace("__VW__", str(vw)).replace("__VH__", str(vh)).replace("__SW__", '%.1f' % logo['stroke']).replace("__PATHS__", '\n'.join(paths))
open(f'{THEME}/snippets/swag-signature.liquid', 'w').write(snippet)
print('snippet bytes', len(snippet))
