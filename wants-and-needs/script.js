/* ============================================================
   Wants and Needs — concept storefront
   Edit PRODUCTS / NEXT_DROP below to update the site.
   ============================================================ */

// Next drop time. Set to null to hide the countdown numbers.
const NEXT_DROP = '2026-10-17T14:00:00-04:00';

// Color groups used by the shop filter and the palette section.
const GROUPS = [
  { name: 'Black', hex: '#161617' },
  { name: 'Cream', hex: '#efebe3' },
  { name: 'Sky Blue', hex: '#8db7d9' },
  { name: 'Navy', hex: '#1f2b45' },
  { name: 'Brown', hex: '#5b3f2c' },
];

// Add `image: 'path/to/photo.jpg'` to any color to use a real photo
// instead of the illustration. Set `soldOut: true` on a color when it sells out.
const PRODUCTS = [
  {
    id: 'signature-tee',
    name: 'Signature Tee',
    type: 'tee',
    price: 44.99, // placeholder — confirm with the brand
    badge: 'Signature',
    blurb: 'Boxy fit, raglan seams, signature stitched on the chest.',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: [
      { name: 'Cream', hex: '#efebe3', group: 'Cream' },
    ],
  },
  {
    id: 'denim-shorts',
    name: 'Denim Shorts',
    type: 'shorts',
    price: 59.99, // placeholder — confirm with the brand
    badge: 'Washed',
    blurb: 'Wide-leg jorts in a faded black wash with curved panel seams.',
    sizes: ['28', '30', '32', '34', '36'],
    colors: [
      { name: 'Washed Black', hex: '#232325', group: 'Black' },
    ],
  },
  {
    id: 'hoodie',
    name: 'Signature Hoodie',
    type: 'hoodie',
    price: 69.99,
    badge: 'Matches the sweats',
    blurb: 'Signature script across the chest. Wear it with the sweats as a set.',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: [
      { name: 'Sky Blue', hex: '#8db7d9', group: 'Sky Blue' },
      { name: 'Black', hex: '#1b1b1c', group: 'Black' },
      { name: 'Navy', hex: '#1f2b45', group: 'Navy' },
    ],
  },
  {
    id: 'baggy-sweatpants',
    name: 'Baggy Sweatpants',
    type: 'sweatpants',
    price: 69.99,
    badge: '400 GSM',
    blurb: '100% heavyweight cotton. Relaxed wide leg, embroidered logo.',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: [
      { name: 'Black', hex: '#1b1b1c', group: 'Black' },
      { name: 'Navy', hex: '#1f2b45', group: 'Navy' },
      { name: 'Brown', hex: '#5b3f2c', group: 'Brown' },
    ],
  },
  {
    id: 'baggy-jeans',
    name: 'Baggy Jeans',
    type: 'jeans',
    price: 79.99,
    badge: 'Denim',
    blurb: 'Loose straight-leg denim with a relaxed seat.',
    sizes: ['28', '30', '32', '34', '36'],
    colors: [
      { name: 'Black', hex: '#222326', group: 'Black' },
      { name: 'Dark Blue', hex: '#2b3f5c', group: 'Navy' },
    ],
  },
];

// Hero outfits, drawn bottom layer first.
const LOOKS = [
  { name: 'Tee & Jorts', cls: 'outfit--tee', items: [['shorts', '#232325'], ['tee', '#efebe3']] },
  { name: 'Hoodie & Sweats', cls: 'outfit--hoodie', items: [['sweatpants', '#1b1b1c'], ['hoodie', '#8db7d9']] },
];

/* ---------- Garment illustrations ---------- */

// Small winged "W" emblem they put on hems and sleeves.
const emblem = (x, y, s = 1) =>
  `<path class="emblem" transform="translate(${x} ${y}) scale(${s})" d="M-10 -4 L-5 -1 M10 -4 L5 -1 M-4.5 -4 L-2.2 3 L0 -1.5 L2.2 3 L4.5 -4"/>`;

const sig = (x, y, size, rotate = -6, anchor = 'middle') =>
  `<text class="sig" x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" transform="rotate(${rotate} ${x} ${y})">Wants&amp;Needs</text>`;

const SHAPES = {
  tee: {
    viewBox: '0 0 240 240',
    body: 'M84 18 Q120 34 156 18 L204 34 Q214 38 218 48 L236 102 Q237 106 233 107 L198 118 Q194 119 193 115 L184 88 L185 226 Q185 232 179 232 H61 Q55 232 55 226 L56 88 L47 115 Q46 119 42 118 L7 107 Q3 106 4 102 L22 48 Q26 38 36 34 Z',
    extra: () => `
      <path d="M90 17 Q120 30 150 17 Q120 23 90 17 Z" fill="rgba(0,0,0,.14)"/>
      <path class="detail" d="M84 19 Q120 37 156 19 M89 18 Q120 32 151 18"/>
      <rect class="label" x="113" y="23" width="14" height="8" rx="1"/>
      <text class="label-text" x="120" y="29.2" font-size="5.5" text-anchor="middle">W</text>
      <path class="detail" d="M88 20 L58 90 M152 20 L182 90"/>
      <path class="detail" d="M9 98 L41 109 M231 98 L199 109 M57 222 H183"/>
      ${sig(150, 78, 17)}
      ${emblem(214, 96, .8)}`,
  },
  shorts: {
    viewBox: '0 0 200 200',
    body: 'M35 28 H165 L184 174 Q185 183 176 184 L111 188 Q104 188 103 181 L100 94 L97 181 Q96 188 89 188 L24 184 Q15 183 16 174 Z',
    extra: () => `
      <path d="M35 28 H165 L184 174 Q185 183 176 184 L111 188 Q104 188 103 181 L100 94 L97 181 Q96 188 89 188 L24 184 Q15 183 16 174 Z" fill="url(#wn-twill)"/>
      <ellipse cx="66" cy="120" rx="30" ry="46" fill="url(#wn-fade)"/>
      <ellipse cx="134" cy="120" rx="30" ry="46" fill="url(#wn-fade)"/>
      <rect class="fill" x="34" y="10" width="132" height="20" rx="3"/>
      <rect x="34" y="10" width="132" height="20" rx="3" fill="url(#wn-twill)"/>
      <g class="fill"><rect x="48" y="6" width="6" height="25" rx="1.5"/><rect x="74" y="6" width="6" height="25" rx="1.5"/><rect x="122" y="6" width="6" height="25" rx="1.5"/><rect x="148" y="6" width="6" height="25" rx="1.5"/></g>
      <circle class="button" cx="104" cy="20" r="4.5"/>
      <path class="stitch-grey" d="M36 13 H164 M36 27 H164"/>
      <path class="stitch-grey" d="M110 30 V72 Q110 82 100 86"/>
      <path class="stitch-grey" d="M40 32 Q60 34 66 58 M160 32 Q140 34 134 58 M136 36 H150 V48 H136"/>
      <path class="stitch-grey" d="M37 64 Q66 104 40 178 M163 64 Q134 104 160 178"/>
      <path class="stitch-grey" d="M19 177 L96 181 M104 181 L181 177"/>
      ${sig(140, 62, 12, -6)}
      ${emblem(34, 166, .8)}`,
  },
  sweatpants: {
    viewBox: '0 0 200 260',
    body: 'M50 32 H150 L163 234 Q164 244 154 244 H112 Q105 244 104 237 L100 104 L96 237 Q95 244 88 244 H46 Q36 244 37 234 Z',
    extra: () => `
      <rect class="fill" x="44" y="14" width="112" height="20" rx="4"/>
      <rect x="44" y="14" width="112" height="20" rx="4" fill="url(#wn-rib)"/>
      <path class="detail" d="M56 36 Q60 60 70 80 M144 36 Q140 60 130 80"/>
      <path class="detail-dark" d="M100 104 L100 60 M58 150 Q70 157 82 150 M118 150 Q130 157 142 150"/>
      <path class="detail" d="M41 232 H95 M105 232 H160"/>
      <path class="cord" d="M96 28 Q93 48 88 66 M104 28 Q107 48 112 66"/>
      <circle class="aglet" cx="88" cy="67" r="2.4"/><circle class="aglet" cx="112" cy="67" r="2.4"/>
      ${sig(70, 102, 13, -8)}
      ${emblem(52, 224, .8)}`,
  },
  hoodie: {
    viewBox: '0 0 240 260',
    body: 'M78 40 Q120 58 162 40 L196 58 Q208 64 212 78 L230 200 Q232 210 222 212 L200 214 Q192 214 190 206 L178 128 L180 234 Q180 244 170 244 H70 Q60 244 60 234 L62 128 L50 206 Q48 214 40 214 L18 212 Q8 210 10 200 L28 78 Q32 64 44 58 Z',
    extra: () => `
      <path class="fill" d="M78 40 Q74 8 120 6 Q166 8 162 40 Q150 66 120 68 Q90 66 78 40 Z"/>
      <path d="M78 40 Q74 8 120 6 Q166 8 162 40 Q150 66 120 68 Q90 66 78 40 Z" fill="url(#wn-shade-v)"/>
      <path d="M92 40 Q94 18 120 16 Q146 18 148 40 Q138 56 120 57 Q102 56 92 40 Z" fill="rgba(0,0,0,.38)"/>
      <path class="detail" d="M86 44 Q120 76 154 44"/>
      <path class="detail" d="M82 166 H158 L170 214 H70 Z"/>
      <path class="detail-dark" d="M84 168 L73 212 M156 168 L167 212"/>
      <rect x="60" y="226" width="120" height="16" fill="url(#wn-rib)"/>
      <path class="detail" d="M61 226 H179 M12 196 L50 200 M228 196 L190 200 M62 128 L64 150 M178 128 L176 150"/>
      <path class="cord" d="M110 62 Q108 84 106 104 M130 62 Q132 84 134 104"/>
      <circle class="aglet" cx="106" cy="105" r="2.4"/><circle class="aglet" cx="134" cy="105" r="2.4"/>
      ${sig(120, 140, 30, -7)}
      ${emblem(36, 194, .9)}`,
  },
  jeans: {
    viewBox: '0 0 200 260',
    body: 'M47 32 H153 L160 236 Q160 244 152 244 H110 Q104 244 104 238 L100 100 L96 238 Q96 244 90 244 H48 Q40 244 40 236 Z',
    extra: () => `
      <path d="M47 32 H153 L160 236 Q160 244 152 244 H110 Q104 244 104 238 L100 100 L96 238 Q96 244 90 244 H48 Q40 244 40 236 Z" fill="url(#wn-twill)"/>
      <rect class="fill" x="45" y="14" width="110" height="20" rx="3"/>
      <rect x="45" y="14" width="110" height="20" rx="3" fill="url(#wn-twill)"/>
      <path class="stitch" d="M47 17 H153 M47 31 H153"/>
      <g class="fill"><rect x="58" y="11" width="6" height="24" rx="1.5"/><rect x="84" y="11" width="6" height="24" rx="1.5"/><rect x="120" y="11" width="6" height="24" rx="1.5"/><rect x="142" y="11" width="6" height="24" rx="1.5"/></g>
      <path class="detail-dark" d="M58 11 h6 M84 11 h6 M120 11 h6 M142 11 h6"/>
      <circle class="button" cx="108" cy="24" r="4"/>
      <path class="stitch" d="M110 34 V78 Q110 90 100 96"/>
      <path class="stitch" d="M52 36 Q70 40 76 64 M148 36 Q130 40 124 64 M130 40 H144 V54 H130"/>
      <path class="detail" d="M84 108 L94 113 M82 116 L93 119 M116 108 L106 113 M118 116 L107 119"/>
      <path class="stitch" d="M42 236 H96 M104 236 H158"/>
      ${sig(136, 70, 11, -6)}`,
  },
};

function isLight(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.8;
}

function garmentSVG(type, hex, label) {
  const s = SHAPES[type];
  const light = isLight(hex) ? ' garment--light' : '';
  return `
    <svg class="garment garment--${type}${light}" viewBox="${s.viewBox}" style="--c:${hex}" role="img" aria-label="${label || type}">
      <path class="fill" d="${s.body}"/>
      <path d="${s.body}" fill="url(#wn-shade)"/>
      <path d="${s.body}" fill="url(#wn-shade-v)"/>
      ${s.extra()}
    </svg>`;
}

const BADGE = '<span class="badge" aria-hidden="true"><span class="badge-w">W</span><span class="badge-sig">Wants&amp;Needs</span></span>';

/* ---------- Helpers ---------- */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const money = (n) => `$${n.toFixed(2)}`;
const findProduct = (card) => PRODUCTS.find((x) => x.id === card.dataset.id);

let toastTimer;
function toast(msg) {
  const el = $('[data-toast]');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------- Mobile nav ---------- */

const navToggle = $('.nav-toggle');
const nav = $('.nav');
navToggle.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', open);
});
$$('.nav-links a').forEach((a) => a.addEventListener('click', () => {
  nav.classList.remove('open');
  navToggle.setAttribute('aria-expanded', 'false');
}));

/* ---------- Hero looks ---------- */

const outfit = $('[data-outfit]');
function renderLook(i) {
  const look = LOOKS[i];
  outfit.className = `outfit ${look.cls}`;
  outfit.innerHTML = look.items.map(([type, hex]) => garmentSVG(type, hex, type)).join('');
  $('[data-look-name]').textContent = look.name;
  $$('[data-look]').forEach((b) => b.classList.toggle('is-active', +b.dataset.look === i));
}
renderLook(0);
$$('[data-look]').forEach((btn) => btn.addEventListener('click', () => renderLook(+btn.dataset.look)));

/* ---------- Countdown ---------- */

(function countdown() {
  const box = $('[data-countdown]');
  if (!NEXT_DROP) { box.classList.add('is-live'); $('.countdown-label', box).textContent = 'Waitlist open now'; return; }
  const target = new Date(NEXT_DROP).getTime();
  const pad = (n) => String(n).padStart(2, '0');
  function tick() {
    const diff = target - Date.now();
    if (diff <= 0) {
      box.classList.add('is-live');
      $('.countdown-label', box).textContent = 'The drop is live';
      return;
    }
    const s = Math.floor(diff / 1000);
    $('[data-cd="d"]', box).textContent = pad(Math.floor(s / 86400));
    $('[data-cd="h"]', box).textContent = pad(Math.floor((s % 86400) / 3600));
    $('[data-cd="m"]', box).textContent = pad(Math.floor((s % 3600) / 60));
    $('[data-cd="s"]', box).textContent = pad(s % 60);
    setTimeout(tick, 1000);
  }
  tick();
})();

/* ---------- Products ---------- */

const grid = $('[data-products]');
const state = {}; // per product: { color, size }

function mediaHTML(p, color) {
  if (color.image) return `<img class="photo" src="${color.image}" alt="${p.name} — ${color.name}">`;
  return garmentSVG(p.type, color.hex, `${p.name} in ${color.name}`);
}

function renderProducts() {
  grid.innerHTML = PRODUCTS.map((p) => {
    state[p.id] = { color: 0, size: null };
    const c = p.colors[0];
    const swatches = p.colors.length > 1
      ? p.colors.map((col, i) => `<button type="button" class="swatch${i === 0 ? ' is-active' : ''}" style="--sw:${col.hex}" data-color="${i}" aria-label="${col.name}"></button>`).join('')
      : `<span class="swatch is-active" style="--sw:${c.hex}" aria-hidden="true"></span>`;
    return `
      <article class="card reveal" data-id="${p.id}">
        <div class="card-media swirl">
          <span class="card-badge">${p.badge}</span>
          <span class="card-badge card-badge--soldout" data-soldout ${c.soldOut ? '' : 'hidden'}>Sold out</span>
          <div data-media>${mediaHTML(p, c)}</div>
        </div>
        <div class="card-body">
          <div class="card-top">
            <h3 class="card-name">${p.name}</h3>
            <span class="card-price">${money(p.price)}</span>
          </div>
          <p class="card-blurb">${p.blurb}</p>
          <div class="card-colors" role="group" aria-label="Color">
            ${swatches}
            <span class="card-color-name" data-color-name>${c.name}</span>
          </div>
          <div class="sizes" role="group" aria-label="Size">
            ${p.sizes.map((s) => `<button type="button" class="size" data-size="${s}">${s}</button>`).join('')}
          </div>
          <button type="button" class="btn btn-light btn-block" data-add>Select a size</button>
        </div>
      </article>`;
  }).join('') + `
    <article class="card card--teaser swirl reveal">
      ${BADGE}
      <h3>Next drop loading.</h3>
      <p>New colors, same signature. The waitlist gets first access.</p>
      <a href="#waitlist" class="btn btn-light">Join the waitlist</a>
    </article>`;
}
renderProducts();

function selectColor(card, index) {
  const p = findProduct(card);
  const c = p.colors[index];
  state[p.id].color = index;
  $$('[data-color]', card).forEach((b) => b.classList.toggle('is-active', +b.dataset.color === index));
  $('[data-color-name]', card).textContent = c.name;
  $('[data-soldout]', card).hidden = !c.soldOut;
  const svg = $('[data-media] .garment', card);
  if (svg && !c.image) {
    svg.style.setProperty('--c', c.hex);
    svg.classList.toggle('garment--light', isLight(c.hex));
  } else {
    $('[data-media]', card).innerHTML = mediaHTML(p, c);
  }
  updateAddButton(card);
}

function updateAddButton(card) {
  const p = findProduct(card);
  const st = state[p.id];
  const btn = $('[data-add]', card);
  const soldOut = p.colors[st.color].soldOut;
  btn.disabled = soldOut || !st.size;
  btn.textContent = soldOut ? 'Sold out' : st.size ? `Add to bag — ${money(p.price)}` : 'Select a size';
}

grid.addEventListener('click', (e) => {
  const card = e.target.closest('.card[data-id]');
  if (!card) return;
  const colorBtn = e.target.closest('[data-color]');
  const sizeBtn = e.target.closest('[data-size]');
  const addBtn = e.target.closest('[data-add]');

  if (colorBtn) selectColor(card, +colorBtn.dataset.color);

  if (sizeBtn) {
    state[card.dataset.id].size = sizeBtn.dataset.size;
    $$('[data-size]', card).forEach((b) => b.classList.toggle('is-active', b === sizeBtn));
    updateAddButton(card);
  }

  if (addBtn && !addBtn.disabled) {
    const p = findProduct(card);
    const st = state[p.id];
    addToBag(p, p.colors[st.color], st.size);
  }
});
$$('.card[data-id]').forEach(updateAddButton);

/* ---------- Color filter ---------- */

$('[data-filters]').innerHTML = '<button type="button" class="chip is-active" data-filter="all">All</button>' +
  GROUPS.map((g) => `<button type="button" class="chip" data-filter="${g.name}"><i style="--sw:${g.hex}"></i>${g.name}</button>`).join('');

function applyFilter(group) {
  $$('[data-filter]').forEach((c) => c.classList.toggle('is-active', c.dataset.filter === group));
  $$('.card[data-id]').forEach((card) => {
    const p = findProduct(card);
    const idx = p.colors.findIndex((c) => c.group === group);
    const show = group === 'all' || idx !== -1;
    card.classList.toggle('is-hidden', !show);
    if (show && idx !== -1) selectColor(card, idx);
  });
}
$$('[data-filter]').forEach((chip) => chip.addEventListener('click', () => applyFilter(chip.dataset.filter)));
$$('[data-shop-color]').forEach((tone) => tone.addEventListener('click', () => applyFilter(tone.dataset.shopColor)));

/* ---------- Bag ---------- */

const BAG_KEY = 'wn-bag';
let bag = [];
try { bag = JSON.parse(localStorage.getItem(BAG_KEY)) || []; } catch (_) { bag = []; }
bag = bag.filter((l) => SHAPES[l.type]);

function saveBag() {
  try { localStorage.setItem(BAG_KEY, JSON.stringify(bag)); } catch (_) { /* storage unavailable */ }
}

function addToBag(p, color, size) {
  const key = `${p.id}|${color.name}|${size}`;
  const line = bag.find((l) => l.key === key);
  if (line) line.qty += 1;
  else bag.push({ key, id: p.id, name: p.name, type: p.type, price: p.price, color: color.name, hex: color.hex, size, qty: 1 });
  saveBag();
  renderBag();
  const count = $('[data-bag-count]');
  count.classList.add('bump');
  setTimeout(() => count.classList.remove('bump'), 250);
  toast(`${p.name} · ${color.name} · ${size} added`);
}

function renderBag() {
  const items = $('[data-bag-items]');
  const count = bag.reduce((n, l) => n + l.qty, 0);
  const subtotal = bag.reduce((n, l) => n + l.qty * l.price, 0);
  $('[data-bag-count]').textContent = count;
  $('[data-bag-subtotal]').textContent = money(subtotal);
  $('[data-checkout]').disabled = count === 0;

  if (!bag.length) {
    items.innerHTML = '<p class="bag-empty">Your bag is empty.<br>Take action.</p>';
    return;
  }
  items.innerHTML = bag.map((l, i) => `
    <div class="bag-item">
      <div class="bag-thumb swirl">${garmentSVG(l.type, l.hex, l.name)}</div>
      <div>
        <p class="bag-item-name">${l.name}</p>
        <p class="bag-item-meta">${l.color} · ${l.size}</p>
        <div class="qty">
          <button type="button" data-qty="-1" data-i="${i}" aria-label="Decrease quantity">−</button>
          <span>${l.qty}</span>
          <button type="button" data-qty="1" data-i="${i}" aria-label="Increase quantity">+</button>
        </div>
      </div>
      <div class="bag-item-side">
        <p class="bag-item-price">${money(l.price * l.qty)}</p>
        <button type="button" class="bag-remove" data-remove="${i}">Remove</button>
      </div>
    </div>`).join('');
}

$('[data-bag-items]').addEventListener('click', (e) => {
  const q = e.target.closest('[data-qty]');
  const r = e.target.closest('[data-remove]');
  if (q) {
    const line = bag[+q.dataset.i];
    line.qty += +q.dataset.qty;
    if (line.qty <= 0) bag.splice(+q.dataset.i, 1);
  }
  if (r) bag.splice(+r.dataset.remove, 1);
  if (q || r) { saveBag(); renderBag(); }
});

const bagEl = $('[data-bag]');
const overlay = $('[data-bag-overlay]');
function openBag() {
  overlay.hidden = false;
  requestAnimationFrame(() => overlay.classList.add('show'));
  bagEl.classList.add('open');
  bagEl.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  $('[data-close-bag]').focus();
}
function closeBag() {
  overlay.classList.remove('show');
  bagEl.classList.remove('open');
  bagEl.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  setTimeout(() => { overlay.hidden = true; }, 300);
}
$$('[data-open-bag]').forEach((b) => b.addEventListener('click', openBag));
$('[data-close-bag]').addEventListener('click', closeBag);
overlay.addEventListener('click', closeBag);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && bagEl.classList.contains('open')) closeBag(); });

// Checkout hooks into the store's real checkout at launch.
$('[data-checkout]').addEventListener('click', () => toast('Checkout connects to the live store at launch'));

renderBag();

/* ---------- Waitlist ---------- */

// Hook this up to the brand's email / SMS provider at launch.
$('[data-waitlist]').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  $('[data-waitlist-note]').textContent = "You're on the list. Watch your inbox.";
  form.reset();
});

/* ---------- Scroll reveal ---------- */

if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.12 });
  $$('.reveal').forEach((el, i) => {
    el.style.transitionDelay = `${(i % 4) * 70}ms`;
    io.observe(el);
  });
} else {
  $$('.reveal').forEach((el) => el.classList.add('in'));
}
