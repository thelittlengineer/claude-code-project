"""
Rebuilds the SWAG brand assets:

  * theme/assets/pattern.svg            - the lime-and-black organic pattern, traced from the green logo card
                                          (reference/swag-logo-green.png) into smooth curves
  * theme/snippets/swag-wordmark.liquid - the handwritten "SWAG" signature (reference/swag-logo-purple.png),
                                          as inline SVG pen strokes that write themselves on stroke by stroke
  * theme/assets/swag-wordmark.svg      - the same strokes as a standalone SVG (used by the preview mock-ups)

Everything is traced into cubic Bezier curves, so it stays crisp at any size, including 4K screens.
The signature's colours come from CSS (olive gradient on dark, black on lime).

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
card = np.asarray(Image.open(os.path.join(ROOT, 'reference', 'swag-logo-green.png')).convert('RGB')).astype(float)
signature_logo = np.asarray(Image.open(os.path.join(ROOT, 'reference', 'swag-logo-purple.png')).convert('RGB')).astype(float)


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


def trace(coverage, scale, blur, k, tolerance, min_len=16):
    """Outline a 0..1 coverage map as smooth closed curves (even-odd keeps holes open)."""
    big = ndimage.zoom(ndimage.gaussian_filter(coverage, blur), scale, order=3)
    parts = []
    for contour in measure.find_contours(np.pad(big, 1), 0.5):
        if len(contour) < min_len:
            continue
        pts = (contour[:, ::-1] - 1) / scale  # (x, y) in source pixels
        if np.allclose(pts[0], pts[-1]):
            pts = pts[:-1]
        pts = smooth(pts, k, closed=True)
        pts = measure.approximate_polygon(np.vstack([pts, pts[:1]]), tolerance)[:-1]
        if len(pts) >= 3:
            parts.append(bezier(pts, closed=True))
    return ''.join(parts)


# ---------- pattern: black strokes over lime, from the top of the card ----------
x0, y0, x1, y1 = 14, 12, 898, 440
top = card[y0:y1, x0:x1]
ink = np.clip((120 - top.mean(axis=2)) / 90, 0, 1)
ink[top[..., 2] > 150] = 0  # light corner pixels count as lime
pattern_d = trace(ink, 4, 1.1, 9, 0.3)
pw, ph = x1 - x0, y1 - y0
pattern = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" preserveAspectRatio="xMidYMid slice">'
           '<rect width="%d" height="%d" fill="#BAD406"/><path fill="#000" fill-rule="evenodd" d="%s"/></svg>'
           % (pw, ph, pw, ph, pattern_d))
open(os.path.join(THEME, 'assets', 'pattern.svg'), 'w').write(pattern)

# ---------- trace the pen line ----------
x0, y0, x1, y1 = 22, 80, 366, 188
crop = signature_logo[y0:y1, x0:x1]
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

  Monoline pen strokes in an olive gradient (solid ink on the lime scheme).
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

print('pattern %dx%d, %d bytes' % (pw, ph, len(pattern)))
print('signature %dx%d: %d strokes, pen width %s' % (ww, wh, len(strokes), fmt(pen_width)))
