// Flat product illustrations for the preview store: SWAG merch with the signature printed on.
// Every image is an 800x1000 (4:5) SVG so it drops straight into the theme's portrait cards.
import fs from 'node:fs';

const W = 800;
const H = 1000;

export function signaturePaths(snippetFile) {
  const src = fs.readFileSync(snippetFile, 'utf8');
  const viewBox = src.match(/viewBox="0 0 (\d+) (\d+)"/);
  const stroke = src.match(/stroke-width="([\d.]+)"/);
  const paths = [...src.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);
  return { width: Number(viewBox[1]), height: Number(viewBox[2]), stroke: Number(stroke[1]), paths };
}

// The signature placed at (cx, cy) and scaled to `width` px, optionally rotated.
function signature(sig, { cx, cy, width, color, rotate = 0, weight = 1 }) {
  const scale = width / sig.width;
  const tx = cx - (sig.width * scale) / 2;
  const ty = cy - (sig.height * scale) / 2;
  return `<g transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)}) rotate(${rotate} ${(sig.width * scale) / 2} ${(sig.height * scale) / 2}) scale(${scale.toFixed(4)})" fill="none" stroke="${color}" stroke-width="${(sig.stroke * weight).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round">${sig.paths
    .map((d) => `<path d="${d}"/>`)
    .join('')}</g>`;
}

function star(cx, cy, r, rot = 0, inner = 0.5) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * inner;
    const a = ((rot - 90 + i * 36) * Math.PI) / 180;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)} ${(cy + rad * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
}

// Deterministic scatter of stars inside a box, for all-over prints.
function starScatter({ x, y, w, h, count, min, max, seed = 1 }) {
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  let d = '';
  for (let i = 0; i < count; i++) {
    d += star(x + rand() * w, y + rand() * h, min + rand() * (max - min), rand() * 40 - 20);
  }
  return d;
}

const shade = (hex, amount) => {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c) => Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
};

function frame(body, { bg = '#b7b0ae', shadow = true } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<rect width="${W}" height="${H}" fill="${bg}"/>
${shadow ? `<ellipse cx="400" cy="905" rx="250" ry="22" fill="#000" opacity=".12"/>` : ''}
${body}
</svg>`;
}

/* ---------- Garments ---------- */

const TEE =
  'M318 176C340 196 368 208 400 208C432 208 460 196 482 176L596 222L700 372L632 424L580 360L588 822C530 834 470 838 400 838C330 838 270 834 212 822L220 360L168 424L100 372L204 222Z';
const TEE_COLLAR = 'M318 176C340 196 368 208 400 208C432 208 460 196 482 176';
const TEE_FOLDS = 'M300 470C296 560 300 660 312 780M512 520C520 610 516 700 500 800M548 420C556 500 560 560 558 640';

const LONGSLEEVE =
  'M318 176C340 196 368 208 400 208C432 208 460 196 482 176L596 222L672 520L706 800L632 812L604 560L580 380L588 822C530 834 470 838 400 838C330 838 270 834 212 822L220 380L196 560L168 812L94 800L128 520L204 222Z';

const HOODIE =
  'M300 190C292 132 340 92 400 92C460 92 508 132 500 190L604 236L684 520L716 790L638 806L604 560L584 400L592 840C530 852 470 856 400 856C330 856 270 852 208 840L216 400L196 560L162 806L84 790L116 520L196 236Z';
const HOOD_OPENING = 'M334 214C336 170 364 142 400 142C436 142 464 170 466 214C446 236 424 246 400 246C376 246 354 236 334 214Z';
const HOODIE_POCKET = 'M268 640L532 640L566 780L234 780Z';

const PANTS =
  'M262 150L538 150L552 196L566 470L596 852L462 864L418 420L400 384L382 420L338 864L204 852L234 470L248 196Z';

const TOTE_BODY = 'M216 360L584 360L604 860L196 860Z';

function tee(sig, { color, print, back = false, sleeve = 'short' }) {
  const body = sleeve === 'long' ? LONGSLEEVE : TEE;
  const dark = shade(color, -0.18);
  const light = shade(color, 0.08);
  const collar = back
    ? '<path d="M322 180C346 190 372 194 400 194C428 194 454 190 478 180" fill="none" stroke="' + dark + '" stroke-width="16" stroke-linecap="round"/>'
    : `<path d="${TEE_COLLAR}" fill="none" stroke="${dark}" stroke-width="18" stroke-linecap="round"/>`;
  const art = back
    ? `<path d="${starScatter({ x: 250, y: 300, w: 300, h: 420, count: 26, min: 5, max: 16, seed: 9 })}" fill="${print}"/>` +
      signature(sig, { cx: 400, cy: 250, width: 120, color: print })
    : signature(sig, { cx: 400, cy: 380, width: 250, color: print, rotate: -4 });
  const cuffs =
    sleeve === 'long'
      ? `<path d="M168 812L94 800L98 770L172 782Z M632 812L706 800L702 770L628 782Z" fill="${dark}"/>`
      : '';
  return frame(`
<path d="${body}" fill="${color}"/>
<path d="${body}" fill="none" stroke="${dark}" stroke-width="3" stroke-linejoin="round"/>
<clipPath id="body"><path d="${body}"/></clipPath>
<path d="${TEE_FOLDS}" fill="none" stroke="${light}" stroke-width="10" stroke-linecap="round" opacity=".55" clip-path="url(#body)"/>
${cuffs}
${collar}
${art}`);
}

function hoodie(sig, { color, print, back = false }) {
  const dark = shade(color, -0.2);
  const light = shade(color, 0.1);
  const front = `
<path d="${HOOD_OPENING}" fill="${shade(color, -0.35)}"/>
<path d="M378 244L372 370M422 244L428 370" fill="none" stroke="${print}" stroke-width="7" stroke-linecap="round"/>
<circle cx="372" cy="376" r="7" fill="${print}"/><circle cx="428" cy="376" r="7" fill="${print}"/>
<path d="${HOODIE_POCKET}" fill="${shade(color, -0.06)}" stroke="${dark}" stroke-width="3" stroke-linejoin="round"/>
${signature(sig, { cx: 400, cy: 480, width: 260, color: print, rotate: -4 })}`;
  const rear = `
<path d="M318 206C330 150 362 124 400 124C438 124 470 150 482 206" fill="none" stroke="${dark}" stroke-width="4"/>
<path d="${starScatter({ x: 240, y: 330, w: 320, h: 420, count: 28, min: 6, max: 18, seed: 4 })}" fill="${print}"/>
${signature(sig, { cx: 400, cy: 290, width: 140, color: print })}`;
  return frame(`
<path d="${HOODIE}" fill="${color}"/>
<path d="${HOODIE}" fill="none" stroke="${dark}" stroke-width="3" stroke-linejoin="round"/>
<path d="M300 520C296 600 300 700 310 800M510 560C516 640 512 720 500 820" fill="none" stroke="${light}" stroke-width="10" stroke-linecap="round" opacity=".5"/>
<path d="M208 800L592 800L592 840C530 852 470 856 400 856C330 856 270 852 208 840Z" fill="${dark}"/>
<path d="M162 806L84 790L90 752L168 768Z M638 806L716 790L710 752L632 768Z" fill="${dark}"/>
${back ? rear : front}`);
}

function pants(sig, { color, print }) {
  const dark = shade(color, -0.2);
  const light = shade(color, 0.1);
  return frame(`
<path d="${PANTS}" fill="${color}"/>
<path d="${PANTS}" fill="none" stroke="${dark}" stroke-width="3" stroke-linejoin="round"/>
<path d="M262 150L538 150L544 196L256 196Z" fill="${dark}"/>
<path d="M388 196C384 240 372 262 360 280M412 196C416 240 428 262 440 280" fill="none" stroke="${print}" stroke-width="6" stroke-linecap="round"/>
<path d="M300 300C296 480 290 660 280 820M500 300C504 480 510 660 520 820" fill="none" stroke="${light}" stroke-width="10" stroke-linecap="round" opacity=".5"/>
<path d="M204 852L338 864L340 830L208 818Z M596 852L462 864L460 830L592 818Z" fill="${dark}"/>
${signature(sig, { cx: 320, cy: 330, width: 110, color: print, rotate: -8 })}`);
}

function cap(sig, { color, print }) {
  const dark = shade(color, -0.22);
  const light = shade(color, 0.12);
  const crown = 'M150 640C132 470 236 350 392 346C520 344 606 420 624 560C628 590 626 620 618 646C480 676 290 674 150 640Z';
  return frame(
    `
<ellipse cx="420" cy="738" rx="300" ry="26" fill="#000" opacity=".12"/>
<path d="${crown}" fill="${color}"/>
<clipPath id="crown"><path d="${crown}"/></clipPath>
<g clip-path="url(#crown)" fill="none" stroke="${dark}" stroke-width="3" opacity=".7">
  <path d="M392 348C360 430 350 540 368 668"/>
  <path d="M392 348C470 410 520 520 530 662"/>
  <path d="M392 348C290 390 230 500 228 650"/>
</g>
<path d="M170 560C230 520 300 500 360 500" fill="none" stroke="${light}" stroke-width="12" stroke-linecap="round" opacity=".35" clip-path="url(#crown)"/>
<path d="${crown}" fill="none" stroke="${dark}" stroke-width="3"/>
<ellipse cx="394" cy="350" rx="18" ry="9" fill="${dark}"/>
<path d="M420 646C520 640 600 628 632 612C700 620 760 650 752 684C700 716 560 716 470 700C420 692 396 668 420 646Z" fill="${dark}"/>
<path d="M452 688C560 704 690 700 740 680" fill="none" stroke="${light}" stroke-width="3" opacity=".6"/>
${signature(sig, { cx: 400, cy: 520, width: 250, color: print, rotate: -6, weight: 1.2 })}`,
    { shadow: false }
  );
}

function tote(sig, { color, print }) {
  const dark = shade(color, -0.2);
  return frame(`
<path d="M262 380C262 262 290 214 320 214C350 214 368 262 368 380M432 380C432 262 450 214 480 214C510 214 538 262 538 380" fill="none" stroke="${print}" stroke-width="18" stroke-linecap="round"/>
<path d="${TOTE_BODY}" fill="${color}"/>
<path d="${TOTE_BODY}" fill="none" stroke="${dark}" stroke-width="3" stroke-linejoin="round"/>
<path d="${starScatter({ x: 240, y: 400, w: 320, h: 420, count: 16, min: 6, max: 16, seed: 21 })}" fill="${print}" opacity=".9"/>
${signature(sig, { cx: 400, cy: 610, width: 300, color: print, rotate: -6, weight: 1.1 })}`);
}

// A flat-lay for the "story" section: tee, cap and stars on a darker ground.
function flatlay(sig) {
  const teeScaled = `<g transform="translate(90 120) scale(.72) rotate(-8 400 500)">
<path d="${TEE}" fill="#141414"/>
<path d="${TEE_COLLAR}" fill="none" stroke="#000" stroke-width="18" stroke-linecap="round"/>
${signature(sig, { cx: 400, cy: 380, width: 250, color: '#a39c9a', rotate: -4 })}
</g>`;
  const capScaled = `<g transform="translate(360 560) scale(.52) rotate(12 400 520)">
<path d="M150 640C132 470 236 350 392 346C520 344 606 420 624 560C628 590 626 620 618 646C480 676 290 674 150 640Z" fill="#c9c4bf"/>
<path d="M420 646C520 640 600 628 632 612C700 620 760 650 752 684C700 716 560 716 470 700C420 692 396 668 420 646Z" fill="#9f9994"/>
${signature(sig, { cx: 400, cy: 500, width: 250, color: '#0b0b0b', rotate: -3, weight: 1.2 })}
</g>`;
  return frame(
    `<rect width="${W}" height="${H}" fill="#8f8886"/>
<path d="${starScatter({ x: 0, y: 0, w: W, h: H, count: 40, min: 4, max: 15, seed: 33 })}" fill="#0b0b0b"/>
${teeScaled}
${capScaled}`,
    { shadow: false }
  );
}

export function buildMockups(sig) {
  return {
    'tee-black-front': tee(sig, { color: '#161616', print: '#a39c9a' }),
    'tee-black-back': tee(sig, { color: '#161616', print: '#a39c9a', back: true }),
    'tee-stone-front': tee(sig, { color: '#d8d3cd', print: '#0b0b0b' }),
    'tee-stone-back': tee(sig, { color: '#d8d3cd', print: '#0b0b0b', back: true }),
    'longsleeve-front': tee(sig, { color: '#2a2827', print: '#d8d3cd', sleeve: 'long' }),
    'longsleeve-back': tee(sig, { color: '#2a2827', print: '#d8d3cd', sleeve: 'long', back: true }),
    'hoodie-front': hoodie(sig, { color: '#1a1a1a', print: '#a39c9a' }),
    'hoodie-back': hoodie(sig, { color: '#1a1a1a', print: '#a39c9a', back: true }),
    'crewneck-front': tee(sig, { color: '#77716f', print: '#0b0b0b', sleeve: 'long' }),
    'crewneck-back': tee(sig, { color: '#77716f', print: '#0b0b0b', sleeve: 'long', back: true }),
    'pants-front': pants(sig, { color: '#232221', print: '#a39c9a' }),
    'cap-front': cap(sig, { color: '#c9c4bf', print: '#0b0b0b' }),
    'cap-black': cap(sig, { color: '#161616', print: '#a39c9a' }),
    'tote-front': tote(sig, { color: '#e3ddd4', print: '#0b0b0b' }),
    flatlay: flatlay(sig),
  };
}
