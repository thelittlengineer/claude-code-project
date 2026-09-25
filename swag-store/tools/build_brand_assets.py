"""
Rebuilds the SWAG brand assets from the purple signature logo (reference/swag-logo-purple.png):

  * theme/snippets/swag-wordmark.liquid - the handwritten "SWAG" signature as inline SVG pen strokes,
                                          in the logo's lilac-to-indigo gradient, drawn on stroke by stroke
  * theme/assets/swag-wordmark.svg      - the same strokes as a standalone SVG (used by the preview mock-ups)
  * theme/assets/pattern.svg            - brand art for the hero strip and panels: the purple gradient
                                          with oversized signature loops drifting across it

The signature is traced along the centre of the pen line and smoothed into cubic Bezier curves,
so it stays crisp at any size, including 4K screens.

    pip install pillow numpy scipy scikit-image
    python3 tools/build_brand_assets.py
"""
import os

import numpy as np
from PIL import Image
from scipy import ndimage
from skimage import measure, morphology

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THEME = os.path.join(ROOT, 'theme')
logo = np.asarray(Image.open(os.path.join(ROOT, 'reference', 'swag-logo-purple.png')).convert('RGB')).astype(float)

# Colours sampled from the logo: charcoal ground, pen fading lilac -> periwinkle -> indigo left to right.
GRADIENT = ['#B4A0CE', '#837ABA', '#4C4AA2']


def fmt(value):
    return ('%.2f' % value).rstrip('0').rstrip('.')


def smooth(points, k, closed):
    """Moving-average smoothing that irons out JPEG edge noise without moving the shape."""
    if len(points) < 2 * k + 1:
        return points
    if closed:
        padded = np.vstack([points[-k:], points, points[:k]])
        kernel = np.ones(2 * k + 1) / (2 * k + 1)
        return np.column_stack([np.convolve(padded[:, i], kernel, 'valid') for i in range(2)])
    out = points.copy()
    for i in range(k, len(points) - k):
        out[i] = points[i - k:i + k + 1].mean(axis=0)
    return out


def bezier(points, closed):
    """Catmull-Rom through the points, written as cubic Bezier segments."""
    n = len(points)
    d = 'M%s %s' % (fmt(points[0][0]), fmt(points[0][1]))
    segments = n if closed else n - 1
    for i in range(segments):
        p0 = points[(i - 1) % n] if closed else points[max(i - 1, 0)]
        p1 = points[i]
        p2 = points[(i + 1) % n] if closed else points[i + 1]
        p3 = points[(i + 2) % n] if closed else points[min(i + 2, n - 1)]
        c1 = p1 + (p2 - p0) / 6
        c2 = p2 - (p3 - p1) / 6
        d += 'C' + ' '.join(fmt(v) for v in (*c1, *c2, *p2))
    return d + ('Z' if closed else '')


# ---------- trace the pen line ----------
x0, y0, x1, y1 = 22, 80, 366, 188
crop = logo[y0:y1, x0:x1]
ink = np.clip((crop.mean(axis=2) - 40) / 80, 0, 1)
S = 4
solid = ndimage.zoom(ndimage.gaussian_filter(ink, 0.7), S, order=3) > 0.5
labels = measure.label(solid)
solid = np.isin(labels, [r.label for r in measure.regionprops(labels) if r.area > 40 * S * S])  # drop JPEG specks
skeleton = morphology.skeletonize(solid)
H, W = skeleton.shape
OFFSETS = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]


def neighbours(p, pixels):
    y, x = p
    return [(y + dy, x + dx) for dy, dx in OFFSETS if (y + dy, x + dx) in pixels]


def edges_of(pixels):
    degree = {p: len(neighbours(p, pixels)) for p in pixels}
    nodes = {p for p, d in degree.items() if d != 2}
    edges, seen = [], set()
    for node in nodes:
        for nxt in neighbours(node, pixels):
            if (node, nxt) in seen:
                continue
            path, prev, cur = [node, nxt], node, nxt
            while cur not in nodes:
                step = [q for q in neighbours(cur, pixels) if q != prev and q not in path[-3:]]
                if not step:
                    break
                prev, cur = cur, step[0]
                path.append(cur)
            seen.add((node, nxt))
            seen.add((path[-1], path[-2]))
            edges.append(path)
    # closed loops with no junctions (e.g. the bowl of an "a") have no nodes at all
    covered = {p for e in edges for p in e}
    for p in pixels - covered:
        if p in covered:
            continue
        loop, prev, cur = [p], None, p
        while True:
            step = [q for q in neighbours(cur, pixels) if q != prev and q not in loop[-3:]]
            if not step or (len(loop) > 3 and step[0] == p):
                break
            prev, cur = cur, step[0]
            loop.append(cur)
        covered.update(loop)
        edges.append(loop + [p])
    return degree, edges


pixels = set(zip(*np.nonzero(skeleton)))
for _ in range(5):  # prune short spurs left by bumps along the pen line
    degree, edges = edges_of(pixels)
    removed = False
    for edge in edges:
        ends = [p for p in (edge[0], edge[-1]) if degree.get(p) == 1]
        joints = [p for p in (edge[0], edge[-1]) if degree.get(p, 0) >= 3]
        if ends and joints and len(edge) < 5 * S:
            pixels -= set(edge) - set(joints)
            removed = True
    if not removed:
        break
degree, edges = edges_of(pixels)
edges = [e for e in edges if len(e) > 2 * S]

thickness = ndimage.distance_transform_edt(solid)[skeleton]
pen_width = 2 * np.median(thickness) / S * 1.05  # in viewBox units

edges.sort(key=lambda e: min(x for _, x in e))
strokes, lengths = [], []
for edge in edges:
    if edge[0][1] > edge[-1][1]:
        edge = edge[::-1]  # write each stroke left to right
    pts = np.array([(x / S, y / S) for y, x in edge], float)
    pts = smooth(pts, 4, closed=False)
    pts = measure.approximate_polygon(pts, 0.12)
    if len(pts) < 2:
        continue
    lengths.append(np.hypot(*np.diff(pts, axis=0).T).sum())
    strokes.append(bezier(pts, closed=False))
total = sum(lengths)
ww, wh = x1 - x0, y1 - y0

start = 0.0
pen_paths = []
for d, length in zip(strokes, lengths):
    # --d: when this stroke starts, --t: how long it takes, both as fractions of the whole signature
    pen_paths.append('    <path pathLength="1" style="--d:%.3f;--t:%.3f" d="%s"/>' % (start / total, max(length / total, 0.02), d))
    start += length * 0.92

standalone = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" fill="none" stroke="#000" stroke-width="%s" '
              'stroke-linecap="round" stroke-linejoin="round"><path d="%s"/></svg>' % (ww, wh, fmt(pen_width), ''.join(strokes)))
open(os.path.join(THEME, 'assets', 'swag-wordmark.svg'), 'w').write(standalone)

snippet = '''{%- comment -%}
  The handwritten "SWAG" signature, as inline SVG. Generated by tools/build_brand_assets.py.

  Monoline pen strokes in the logo's lilac-to-indigo gradient (solid ink on the lilac scheme).
  When animated, each stroke is drawn on after the one before it, so the signature writes itself.

  Accepts:
  - id {String}: unique id for this instance (the section id works); keeps gradients apart
  - class {String}: extra classes
  - animate {Boolean}: write the signature on when it scrolls into view (respects reduced motion)
  - label {String}: accessible name, defaults to the shop name
{%- endcomment -%}
{%- liquid
  assign uid = id | default: class | default: 'wordmark' | handleize
-%}
<svg
  class="wordmark{% if animate %} wordmark--animate{% endif %}{% if class != blank %} {{ class }}{% endif %}"
  viewBox="0 0 __W__ __H__"
  role="img"
  aria-label="{{ label | default: shop.name | escape }}"
  xmlns="http://www.w3.org/2000/svg"
>
  <defs>
    <linearGradient id="wordmark-ink-{{ uid }}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="__W__" y2="0">
      <stop offset="0" class="wordmark__stop wordmark__stop--start"/>
      <stop offset="0.5" class="wordmark__stop wordmark__stop--middle"/>
      <stop offset="1" class="wordmark__stop wordmark__stop--end"/>
    </linearGradient>
  </defs>
  <g
    class="wordmark__pen"
    fill="none"
    stroke="url(#wordmark-ink-{{ uid }})"
    stroke-width="__PEN__"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
__PATHS__
  </g>
</svg>
'''
snippet = (snippet.replace('__W__', str(ww)).replace('__H__', str(wh))
           .replace('__PEN__', fmt(pen_width)).replace('__PATHS__', '\n'.join(pen_paths)))
open(os.path.join(THEME, 'snippets', 'swag-wordmark.liquid'), 'w').write(snippet)

# ---------- brand art: purple field with oversized signature loops ----------
AW, AH = 1600, 600
loops = []
for scale, dx, dy, rot, opacity in [(5.2, -260, -150, -8, 0.22), (4.2, 420, 80, 6, 0.16), (3.4, -80, 250, -4, 0.12)]:
    loops.append('<g transform="translate(%d %d) rotate(%d %d %d) scale(%s)" opacity="%s">'
                 '<path d="%s" stroke-width="%s"/></g>'
                 % (dx, dy, rot, ww / 2, wh / 2, fmt(scale), fmt(opacity), ''.join(strokes), fmt(pen_width)))
art = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" preserveAspectRatio="xMidYMid slice">'
       '<defs><linearGradient id="field" x1="0" y1="0" x2="1" y2="1">'
       '<stop offset="0" stop-color="#B4A0CE"/><stop offset=".5" stop-color="#837ABA"/><stop offset="1" stop-color="#4C4AA2"/>'
       '</linearGradient><radialGradient id="glow" cx=".25" cy=".2" r=".7">'
       '<stop offset="0" stop-color="#F3EEFB" stop-opacity=".45"/><stop offset="1" stop-color="#F3EEFB" stop-opacity="0"/>'
       '</radialGradient></defs>'
       '<rect width="%d" height="%d" fill="url(#field)"/><rect width="%d" height="%d" fill="url(#glow)"/>'
       '<g fill="none" stroke="#F6F3FC" stroke-linecap="round" stroke-linejoin="round">%s</g></svg>'
       % (AW, AH, AW, AH, AW, AH, ''.join(loops)))
open(os.path.join(THEME, 'assets', 'pattern.svg'), 'w').write(art)

print('signature %dx%d: %d strokes, pen width %s' % (ww, wh, len(strokes), fmt(pen_width)))
