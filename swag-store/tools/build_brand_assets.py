"""
Rebuilds the SWAG brand assets from the green logo card (reference/swag-logo-green.png):

  * theme/assets/swag-wordmark.svg - the rounded "swag" script, traced into a filled vector shape
  * theme/assets/pattern.svg       - the lime-and-black organic pattern, traced from the top of the card
  * the --wordmark data URI in theme/assets/base.css (the wordmark inlined as a CSS mask, so it can
    take the olive gradient or any colour without a cross-origin request)

    pip install pillow numpy scipy scikit-image
    python3 tools/build_brand_assets.py
"""
import os
import re
import urllib.parse

import numpy as np
from PIL import Image
from scipy import ndimage
from skimage import measure

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THEME = os.path.join(ROOT, 'theme')
card = np.asarray(Image.open(os.path.join(ROOT, 'reference', 'swag-logo-green.png')).convert('RGB')).astype(float)


def trace(coverage, scale, blur, tolerance):
    """Contours of a 0..1 coverage map as one SVG path (even-odd, so letter holes stay open)."""
    big = ndimage.zoom(ndimage.gaussian_filter(coverage, blur), scale, order=3)
    parts = []
    for contour in measure.find_contours(big, 0.5):
        if len(contour) < 12:
            continue
        contour = measure.approximate_polygon(contour, tolerance) / scale
        parts.append('M' + 'L'.join('%.1f %.1f' % (x, y) for y, x in contour) + 'Z')
    return ''.join(parts)


# ---------- wordmark: green letters on the dark band ----------
x0, y0, x1, y1 = 266, 511, 646, 640
band = card[y0:y1, x0:x1]
g, b = band[..., 1], band[..., 2]
tone = np.linspace(190, 88, band.shape[1])[None, :]  # letters fade light -> dark olive left to right
letters = np.clip((g - 8) / (tone - 8), 0, 1)
letters[(g - b) < 8] = 0
wordmark_d = trace(letters, 4, 0.9, 0.6)
ww, wh = x1 - x0, y1 - y0
wordmark = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d"><path fill-rule="evenodd" d="%s"/></svg>'
            % (ww, wh, wordmark_d))
open(os.path.join(THEME, 'assets', 'swag-wordmark.svg'), 'w').write(wordmark)

# ---------- pattern: black strokes over lime, from the top of the card ----------
x0, y0, x1, y1 = 14, 12, 898, 440
top = card[y0:y1, x0:x1]
lum = top.mean(axis=2)
ink = np.clip((120 - lum) / 90, 0, 1)
ink[top[..., 2] > 150] = 0  # light corner pixels count as lime
pattern_d = trace(ink, 3, 0.8, 0.9)
pw, ph = x1 - x0, y1 - y0
pattern = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" preserveAspectRatio="xMidYMid slice">'
           '<rect width="%d" height="%d" fill="#BAD406"/><path fill="#000" fill-rule="evenodd" d="%s"/></svg>'
           % (pw, ph, pw, ph, pattern_d))
open(os.path.join(THEME, 'assets', 'pattern.svg'), 'w').write(pattern)

# ---------- inline the wordmark in base.css ----------
uri = 'data:image/svg+xml,' + urllib.parse.quote(wordmark.replace('"', "'"), safe=" /=:.'-")
css_path = os.path.join(THEME, 'assets', 'base.css')
css = open(css_path).read()
css = re.sub(r'--wordmark: url\("[^"]*"\);', lambda _: '--wordmark: url("%s");' % uri, css, count=1)
open(css_path, 'w').write(css)
print('wordmark %dx%d, %d bytes; pattern %dx%d, %d bytes' % (ww, wh, len(wordmark), pw, ph, len(pattern)))
