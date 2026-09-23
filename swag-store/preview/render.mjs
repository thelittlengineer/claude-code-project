// Renders the SWAG Shopify theme to static HTML with sample products, so the design can be
// previewed and screenshotted without a Shopify store. It implements just enough of Shopify's
// Liquid (section groups, JSON templates, schema defaults, forms, common filters) for this theme.
//
//   npm install && npm run build   ->   build/index.html, product.html, collection.html, ...
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Liquid, Tag, Drop, Value } from 'liquidjs';
import { products, collections, linklists, makeCart } from './sample-data.mjs';
import { signaturePaths, buildMockups } from './mockups.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const THEME = path.join(here, '..', 'theme');
const OUT = path.join(here, 'build');

const read = (file) => fs.readFileSync(path.join(THEME, file), 'utf8');
const locale = JSON.parse(read('locales/en.default.json'));
const settingsSchema = JSON.parse(read('config/settings_schema.json'));
const settingsData = JSON.parse(read('config/settings_data.json'));

/* ---------- Shopify-ish values ---------- */

const FONTS = {
  inter_n4: ['Inter', 400],
  inter_n5: ['Inter', 500],
  inter_n7: ['Inter', 700],
  work_sans_n4: ['Work Sans', 400],
  anonymous_pro_n4: ['Anonymous Pro', 400],
  assistant_n4: ['Assistant', 400],
};

const font = (handle) => {
  const [family, weight] = FONTS[handle] || ['Inter', 400];
  return {
    family: `"${family}"`,
    weight,
    style: 'normal',
    fallback_families: family === 'Anonymous Pro' ? 'monospace' : 'sans-serif',
    'system?': false,
  };
};

const productsByHandle = Object.fromEntries(products.map((p) => [p.handle, p]));

const previewImage = (name) => ({ src: `images/${name}.svg`, width: 800, height: 1000, aspect_ratio: 0.8, alt: '' });

function convertSetting(type, value) {
  if (value === undefined || value === '') value = null;
  switch (type) {
    case 'collection':
      return value ? collections[value] || null : null;
    case 'product':
      return value ? productsByHandle[value] || null : null;
    case 'link_list':
      return value ? linklists[value] || null : null;
    case 'image_picker':
      return typeof value === 'string' && value.startsWith('preview:') ? previewImage(value.slice(8)) : null;
    case 'url':
      if (!value) return null;
      return value.startsWith('shopify://collections') ? 'collection.html' : value.startsWith('shopify://') ? '#' : value;
    case 'font_picker':
      return font(value);
    case 'page':
      return null;
    default:
      return value;
  }
}

function resolveSettings(defs, values = {}) {
  const out = {};
  for (const def of defs) {
    if (!def.id) continue;
    const raw = def.id in values ? values[def.id] : def.default;
    out[def.id] = convertSetting(def.type, raw);
  }
  return out;
}

const themeSettings = resolveSettings(
  settingsSchema.flatMap((group) => group.settings || []),
  settingsData.presets[settingsData.current] || {}
);

// Demo social links so the footer shows its icons.
Object.assign(themeSettings, { social_instagram_link: '#', social_tiktok_link: '#', social_youtube_link: '#' });

/* ---------- Engine ---------- */

const engine = new Liquid({
  root: path.join(THEME, 'snippets'),
  partials: path.join(THEME, 'snippets'),
  extname: '.liquid',
  cache: true,
});

const kwargs = (args) => {
  const named = {};
  for (const arg of args) if (Array.isArray(arg) && arg.length === 2 && typeof arg[0] === 'string') named[arg[0]] = arg[1];
  return named;
};

// Top-level comma split for tag arguments like: 'product', product, id: x, class: 'y'
const splitArgs = (input) => {
  const parts = [];
  let depth = 0;
  let quote = null;
  let current = '';
  for (const ch of input) {
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === "'" || ch === '"') quote = ch;
    else if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    else if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
};

const unquote = (s) => s.replace(/^['"]|['"]$/g, '');

function collectUntil(liquid, remainTokens, endName, owner) {
  const templates = [];
  const stream = liquid.parser
    .parseStream(remainTokens)
    .on(`tag:${endName}`, () => stream.stop())
    .on('template', (tpl) => templates.push(tpl))
    .on('end', () => {
      throw new Error(`${owner} not closed`);
    });
  stream.start();
  return templates;
}

engine.registerTag(
  'schema',
  class extends Tag {
    constructor(token, remainTokens, liquid) {
      super(token, remainTokens, liquid);
      while (remainTokens.length) if (remainTokens.shift().name === 'endschema') return;
      throw new Error('schema not closed');
    }
    render() {
      return '';
    }
  }
);

engine.registerTag(
  'style',
  class extends Tag {
    constructor(token, remainTokens, liquid) {
      super(token, remainTokens, liquid);
      this.templates = collectUntil(liquid, remainTokens, 'endstyle', 'style');
    }
    *render(ctx, emitter) {
      emitter.write('<style>');
      yield this.liquid.renderer.renderTemplates(this.templates, ctx, emitter);
      emitter.write('</style>');
    }
  }
);

const FORM_ACTIONS = {
  product: '/cart/add',
  customer: '/contact#newsletter',
  contact: '/contact#contact_form',
  storefront_password: '/password',
};

engine.registerTag(
  'form',
  class extends Tag {
    constructor(token, remainTokens, liquid) {
      super(token, remainTokens, liquid);
      this.args = splitArgs(token.args);
      this.templates = collectUntil(liquid, remainTokens, 'endform', 'form');
    }
    *render(ctx, emitter) {
      const [typeArg, ...rest] = this.args;
      const type = unquote(typeArg);
      const attrs = {};
      for (const part of rest) {
        const match = part.match(/^([\w-]+)\s*:\s*([\s\S]+)$/);
        if (match) attrs[match[1]] = yield new Value(match[2], this.liquid).value(ctx, false);
      }
      const attrHtml = Object.entries(attrs)
        .map(([key, value]) => ` ${key}="${value}"`)
        .join('');
      emitter.write(`<form method="post" action="${FORM_ACTIONS[type] || '/'}" accept-charset="UTF-8"${attrHtml}>`);
      emitter.write(`<input type="hidden" name="form_type" value="${type}">`);
      ctx.push({ form: { errors: null, email: '', 'posted_successfully?': false } });
      yield this.liquid.renderer.renderTemplates(this.templates, ctx, emitter);
      ctx.pop();
      emitter.write('</form>');
    }
  }
);

engine.registerTag(
  'paginate',
  class extends Tag {
    constructor(token, remainTokens, liquid) {
      super(token, remainTokens, liquid);
      this.templates = collectUntil(liquid, remainTokens, 'endpaginate', 'paginate');
    }
    *render(ctx, emitter) {
      ctx.push({ paginate: { current_page: 1, pages: 1, parts: [], previous: null, next: null } });
      yield this.liquid.renderer.renderTemplates(this.templates, ctx, emitter);
      ctx.pop();
    }
  }
);

engine.registerTag(
  'section',
  class extends Tag {
    constructor(token, remainTokens, liquid) {
      super(token, remainTokens, liquid);
      this.name = unquote(token.args.trim());
    }
    *render(ctx, emitter) {
      emitter.write(yield renderSection(this.name, {}, this.name, ctx.globals));
    }
  }
);

engine.registerTag(
  'sections',
  class extends Tag {
    constructor(token, remainTokens, liquid) {
      super(token, remainTokens, liquid);
      this.name = unquote(token.args.trim());
    }
    *render(ctx, emitter) {
      emitter.write(yield renderGroup(this.name, ctx.globals));
    }
  }
);

/* ---------- Filters ---------- */

class ImageUrl extends Drop {
  constructor(image) {
    super();
    this.image = image;
  }
  valueOf() {
    return this.image ? this.image.src : '';
  }
}

const money = (cents) => (cents == null ? '' : `$${(cents / 100).toFixed(2)}`);
const escapeAttr = (value) => String(value ?? '').replace(/"/g, '&quot;');

const PLACEHOLDER =
  '<path d="M190 140l-72 42 26 62 36-16v186h165V228l36 16 26-62-72-42c-10 26-38 42-73 42s-62-16-72-42z" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/>';

const filters = {
  t(key, ...args) {
    const params = kwargs(args);
    let value = key.split('.').reduce((node, part) => (node ? node[part] : undefined), locale);
    if (value === undefined) return `translation missing: ${key}`;
    if (typeof value === 'object') value = params.count === 1 ? value.one : value.other;
    return value.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name) => params[name] ?? '');
  },
  asset_url: (name) => `assets/${name}`,
  shopify_asset_url: (name) => `assets/${name}`,
  stylesheet_tag: (url) => `<link rel="stylesheet" href="${url}">`,
  image_url: (image) => new ImageUrl(image && image.src ? image : image && image.preview_image),
  image_tag(input, ...args) {
    const image = input instanceof ImageUrl ? input.image : input;
    if (!image) return '';
    const attrs = kwargs(args);
    const html = {
      src: image.src,
      alt: attrs.alt ?? image.alt ?? '',
      width: attrs.width ?? image.width,
      height: attrs.width ? Math.round(attrs.width / (image.aspect_ratio || 1)) : image.height,
      loading: attrs.loading,
      sizes: attrs.sizes,
      class: attrs.class,
    };
    return `<img${Object.entries(html)
      .filter(([, value]) => value != null)
      .map(([key, value]) => ` ${key}="${escapeAttr(value)}"`)
      .join('')}>`;
  },
  placeholder_svg_tag: (name, cls = '') =>
    `<svg class="${cls}" viewBox="0 0 525 525" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${PLACEHOLDER}</svg>`,
  payment_type_svg_tag: (type) =>
    `<svg class="payment-icon" viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${type}"><rect width="38" height="24" rx="4" fill="#9b9391"/><text x="19" y="15.5" font-size="6.5" font-family="monospace" text-anchor="middle" fill="#0b0b0b">${type
      .slice(0, 4)
      .toUpperCase()}</text></svg>`,
  money,
  money_with_currency: (cents) => (cents == null ? '' : `${money(cents)} USD`),
  money_without_currency: (cents) => (cents == null ? '' : (cents / 100).toFixed(2)),
  money_without_trailing_zeros: (cents) => money(cents).replace(/\.00$/, ''),
  font_face: () => '',
  font_url: () => '',
  font_modify(fontObj, prop, value) {
    if (!fontObj) return fontObj;
    if (prop === 'weight') return { ...fontObj, weight: value === 'bold' ? 700 : Number(value) || fontObj.weight };
    if (prop === 'style') return { ...fontObj, style: value };
    return fontObj;
  },
  link_to: (text, url) => `<a href="${url}">${text}</a>`,
  handle: (value) =>
    String(value ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
  time_tag: () => '<time>Sep 23, 2026</time>',
  default_errors: () => '',
  format_code: (code) => code,
  payment_button: () =>
    '<div class="shopify-payment-button"><button type="button" class="shopify-payment-button__button shopify-payment-button__button--unbranded">Buy it now</button></div>',
  external_video_tag: () => '',
  video_tag: () => '',
  model_viewer_tag: () => '',
};
filters.handleize = filters.handle;

for (const [name, fn] of Object.entries(filters)) engine.registerFilter(name, fn);

/* ---------- Sections, groups, templates ---------- */

const schemaOf = (source) => {
  const match = source.match(/\{%-?\s*schema\s*-?%\}([\s\S]*?)\{%-?\s*endschema\s*-?%\}/);
  return match ? JSON.parse(match[1]) : {};
};

async function renderSection(type, data, id, globals, extraClass = '', index = 1) {
  const source = read(`sections/${type}.liquid`);
  const schema = schemaOf(source);
  const blockOrder = data.block_order || Object.keys(data.blocks || {});
  const blocks = blockOrder.map((blockId) => {
    const block = data.blocks[blockId];
    const blockSchema = (schema.blocks || []).find((candidate) => candidate.type === block.type) || {};
    return {
      id: blockId,
      type: block.type,
      settings: resolveSettings(blockSchema.settings || [], block.settings),
      shopify_attributes: `data-block-id="${blockId}"`,
    };
  });
  const section = { id, index, settings: resolveSettings(schema.settings || [], data.settings), blocks };
  const html = await engine.parseAndRender(source, { section }, { globals });
  const tag = schema.tag || 'div';
  const classes = ['shopify-section', extraClass, schema.class].filter(Boolean).join(' ');
  return `<${tag} id="shopify-section-${id}" class="${classes}">${html}</${tag}>`;
}

async function renderGroup(name, globals) {
  const group = JSON.parse(read(`sections/${name}.json`));
  const parts = [];
  for (const key of group.order) {
    parts.push(await renderSection(group.sections[key].type, group.sections[key], `sections--1__${key}`, globals, `shopify-section-group-${name}`));
  }
  return parts.join('\n');
}

async function renderTemplate(name, globals, overrides = {}) {
  const template = JSON.parse(read(`templates/${name}.json`));
  const parts = [];
  let index = 0;
  for (const key of template.order) {
    index += 1;
    const data = structuredClone(template.sections[key]);
    const override = overrides[key];
    if (override) {
      Object.assign((data.settings ||= {}), override.settings || {});
      for (const [blockId, settings] of Object.entries(override.blocks || {})) Object.assign(data.blocks[blockId].settings, settings);
    }
    parts.push(await renderSection(data.type, data, `template--1__${key}`, globals, '', index));
  }
  return { html: parts.join('\n'), layout: template.layout || 'theme' };
}

/* ---------- Pages ---------- */

// The preview starts with an empty bag; preview-shim.js keeps the cart in the browser from there.
const baseCart = makeCart([]);

function globalsFor({ template, pageType, title, product = null, collection = null, cart = baseCart, extra = {} }) {
  return {
    settings: themeSettings,
    shop: {
      name: 'SWAG',
      description: 'Streetwear signed by hand.',
      money_format: '${{amount}}',
      money_with_currency_format: '${{amount}} USD',
      customer_accounts_enabled: true,
      enabled_payment_types: ['visa', 'master', 'american_express', 'paypal', 'apple_pay', 'google_pay'],
      shipping_policy: { body: '', url: '#' },
      password_message: 'Drop 002 lands soon. Get on the list to hear first.',
      url: 'index.html',
    },
    routes: {
      root_url: 'index.html',
      cart_url: 'cart.html',
      cart_add_url: '/cart/add',
      cart_change_url: '/cart/change',
      account_url: '#',
      search_url: 'search.html',
      collections_url: 'collection.html',
      all_products_collection_url: 'collection.html',
      product_recommendations_url: '/recommendations/products',
    },
    request: { locale: { iso_code: 'en' }, page_type: pageType, origin: '' },
    template: { name: template },
    linklists,
    collections,
    cart,
    customer: null,
    product,
    collection,
    recommendations: { 'performed?': false, products: [], products_count: 0 },
    search: { performed: false },
    page_title: title,
    page_description: 'Streetwear signed by hand.',
    canonical_url: '',
    content_for_header: '',
    powered_by_link: '<a href="#">Powered by Shopify</a>',
    additional_checkout_buttons: false,
    current_page: 1,
    ...extra,
  };
}

const FONT_LINK =
  '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anonymous+Pro:wght@400;700&family=Inter:wght@400;700&display=swap">';

async function renderPage({ file, template, overrides, ...options }) {
  const globals = globalsFor({ template, ...options });
  const { html: content, layout } = await renderTemplate(template, globals, overrides);
  let page = await engine.parseAndRender(read(`layout/${layout}.liquid`), {}, { globals: { ...globals, content_for_layout: content } });
  page = page.replace('</head>', `${FONT_LINK}\n<script src="preview-data.js"></script>
<script src="preview-shim.js"></script>\n</head>`);
  fs.writeFileSync(path.join(OUT, file), page);
  return page;
}

async function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
  fs.mkdirSync(path.join(OUT, 'images'), { recursive: true });

  for (const asset of fs.readdirSync(path.join(THEME, 'assets'))) {
    fs.copyFileSync(path.join(THEME, 'assets', asset), path.join(OUT, 'assets', asset));
  }

  const sig = signaturePaths(path.join(THEME, 'snippets', 'swag-signature.liquid'));
  for (const [name, svg] of Object.entries(buildMockups(sig))) {
    fs.writeFileSync(path.join(OUT, 'images', `${name}.svg`), svg);
  }

  const hoodie = productsByHandle['starfield-hoodie'];

  // Data for preview-shim.js, which stands in for Shopify's cart and recommendations endpoints.
  const emptyDrawer = await renderSection('cart-drawer', {}, 'cart-drawer', globalsFor({ template: 'product', pageType: 'product' }));
  const recommendations = await renderSection(
    'product-recommendations',
    {},
    'template--1__recommendations',
    globalsFor({
      template: 'product',
      pageType: 'product',
      product: hoodie,
      extra: {
        recommendations: {
          'performed?': true,
          products: products.filter((p) => p !== hoodie).slice(0, 4),
          products_count: 4,
        },
      },
    })
  );
  const variants = {};
  for (const product of products) {
    for (const variant of product.variants) {
      variants[variant.id] = {
        title: product.title,
        variantTitle: product.has_only_default_variant ? '' : variant.title,
        price: variant.price,
        image: product.featured_media.src,
        url: product.url,
      };
    }
  }
  const icons = {};
  for (const name of ['minus', 'plus', 'close', 'arrow', 'star']) {
    icons[name] = (await engine.parseAndRender(`{% render 'icon', icon: '${name}' %}`)).trim();
  }
  const t = (key, params) => filters.t(key, ...(params ? Object.entries(params) : []));
  const strings = {
    title: t('cart.title'),
    close: t('accessibility.close'),
    remove: t('cart.remove'),
    subtotal: t('cart.subtotal'),
    taxes: t('cart.taxes_and_shipping_at_checkout'),
    checkout: t('cart.checkout'),
    viewCart: t('cart.view_cart'),
    continueShopping: t('cart.continue_shopping'),
    oneItem: t('cart.item_count', { count: 1 }),
    manyItems: t('cart.item_count', { count: 2 }).replace('2', '{{ count }}'),
    increase: 'Increase quantity for',
    decrease: 'Decrease quantity for',
    checkoutPreview: 'Preview only: checkout runs on your Shopify store',
    formPreview: 'Preview only: forms send once the theme is on Shopify',
  };
  const previewData = { variants, icons, strings, emptyDrawer, recommendations, cartUrl: 'cart.html', shopUrl: 'collection.html' };
  fs.writeFileSync(path.join(OUT, 'preview-data.js'), `window.__preview = ${JSON.stringify(previewData)};\n`);
  fs.copyFileSync(path.join(here, 'preview-shim.js'), path.join(OUT, 'preview-shim.js'));

  const indexOverrides = {
    story: { settings: { image: 'preview:flatlay' } },
    categories: {
      blocks: {
        'collection-1': { collection: 'tees', title: '' },
        'collection-2': { collection: 'hoodies', title: '' },
        'collection-3': { collection: 'bottoms', title: '' },
        'collection-4': { collection: 'accessories', title: '' },
      },
    },
  };

  await renderPage({ file: 'index.html', template: 'index', pageType: 'index', title: 'SWAG', overrides: indexOverrides });
  await renderPage({ file: 'product.html', template: 'product', pageType: 'product', title: hoodie.title, product: hoodie });
  await renderPage({
    file: 'collection.html',
    template: 'collection',
    pageType: 'collection',
    title: 'Drop 001',
    collection: collections.all,
  });
  await renderPage({ file: 'cart.html', template: 'cart', pageType: 'cart', title: 'Your bag' });
  await renderPage({
    file: 'search.html',
    template: 'search',
    pageType: 'search',
    title: 'Search',
    extra: {
      search: {
        performed: true,
        terms: 'tee',
        results: products.filter((p) => p.type === 'Tees'),
        results_count: 3,
      },
    },
  });
  await renderPage({ file: '404.html', template: '404', pageType: '404', title: 'Not found' });
  await renderPage({ file: 'password.html', template: 'password', pageType: 'password', title: 'SWAG' });

  console.log(`Rendered preview to ${path.relative(process.cwd(), OUT) || '.'}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
