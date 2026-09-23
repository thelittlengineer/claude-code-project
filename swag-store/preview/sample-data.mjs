// Sample catalogue for the preview store. Prices are in cents, like Shopify.

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

let mediaId = 1000;
const image = (name, alt) => ({
  id: mediaId++,
  media_type: 'image',
  src: `images/${name}.svg`,
  width: 800,
  height: 1000,
  aspect_ratio: 0.8,
  alt,
});

let variantId = 5000;
function makeProduct({ handle, title, price, compareAt = null, images, type, soldOutSizes = [], sizes = SIZES, description }) {
  const media = images.map((name) => image(name, title));
  const variants = sizes.map((size) => {
    const available = !soldOutSizes.includes(size) && !soldOutSizes.includes('*');
    return {
      id: variantId++,
      title: size,
      options: [size],
      option1: size,
      price,
      compare_at_price: compareAt,
      available,
      featured_media: null,
      url: `product.html?variant=${variantId}`,
      sku: `${handle}-${size}`.toUpperCase(),
    };
  });
  const firstAvailable = variants.find((v) => v.available) || variants[0];
  const oneSize = sizes.length === 1;
  return {
    id: variantId++,
    handle,
    title,
    type,
    vendor: 'SWAG',
    url: 'product.html',
    price,
    price_min: price,
    price_max: price,
    price_varies: false,
    compare_at_price: compareAt,
    available: variants.some((v) => v.available),
    featured_media: media[0],
    featured_image: media[0],
    media,
    images: media,
    variants,
    selected_or_first_available_variant: firstAvailable,
    has_only_default_variant: oneSize,
    options: oneSize ? ['Title'] : ['Size'],
    options_with_values: oneSize
      ? []
      : [{ name: 'Size', position: 1, values: sizes, selected_value: firstAvailable.title }],
    description:
      description ||
      '<p>Heavyweight 280gsm cotton, garment-dyed and pre-shrunk. The SWAG signature is screen-printed by hand, so no two sit exactly the same.</p>',
  };
}

export const products = [
  makeProduct({
    handle: 'signature-tee-black',
    title: 'Signature Tee — Black',
    price: 4500,
    images: ['tee-black-front', 'tee-black-back'],
    type: 'Tees',
    soldOutSizes: ['XS'],
  }),
  makeProduct({
    handle: 'starfield-hoodie',
    title: 'Starfield Hoodie',
    price: 9500,
    compareAt: 12000,
    images: ['hoodie-front', 'hoodie-back'],
    type: 'Hoodies',
    soldOutSizes: ['XS', 'XXL'],
    description:
      '<p>Brushed-back 420gsm fleece with a double-lined hood. Signature across the chest, a sky full of stars across the back.</p><p>Boxy fit, dropped shoulders, ribbed cuffs and hem.</p>',
  }),
  makeProduct({
    handle: 'signature-tee-stone',
    title: 'Signature Tee — Stone',
    price: 4500,
    images: ['tee-stone-front', 'tee-stone-back'],
    type: 'Tees',
  }),
  makeProduct({
    handle: 'signed-dad-cap',
    title: 'Signed Dad Cap',
    price: 3800,
    images: ['cap-front', 'cap-black'],
    type: 'Accessories',
    sizes: ['One size'],
  }),
  makeProduct({
    handle: 'constellation-crewneck',
    title: 'Constellation Crewneck',
    price: 8500,
    images: ['crewneck-front', 'crewneck-back'],
    type: 'Hoodies',
  }),
  makeProduct({
    handle: 'night-sky-sweatpants',
    title: 'Night Sky Sweatpants',
    price: 8000,
    compareAt: 9500,
    images: ['pants-front'],
    type: 'Bottoms',
  }),
  makeProduct({
    handle: 'ink-longsleeve',
    title: 'Ink Longsleeve',
    price: 5500,
    images: ['longsleeve-front', 'longsleeve-back'],
    type: 'Tees',
  }),
  makeProduct({
    handle: 'star-tote',
    title: 'Star Tote',
    price: 3000,
    images: ['tote-front'],
    type: 'Accessories',
    sizes: ['One size'],
    soldOutSizes: ['*'],
  }),
];

const byType = (type) => products.filter((p) => p.type === type);

function makeCollection(handle, title, items, description = '') {
  return {
    id: handle,
    handle,
    title,
    url: 'collection.html',
    description,
    products: items,
    products_count: items.length,
    all_products_count: items.length,
    featured_image: items[0] ? items[0].featured_media : null,
    sort_by: 'manual',
    default_sort_by: 'manual',
    sort_options: [
      { value: 'manual', name: 'Featured' },
      { value: 'best-selling', name: 'Best selling' },
      { value: 'price-ascending', name: 'Price, low to high' },
      { value: 'price-descending', name: 'Price, high to low' },
      { value: 'created-descending', name: 'Newest' },
    ],
    filters: [
      {
        label: 'Availability',
        type: 'list',
        param_name: 'filter.v.availability',
        active_values: [],
        values: [
          { label: 'In stock', value: '1', param_name: 'filter.v.availability', count: 7, active: false },
          { label: 'Out of stock', value: '0', param_name: 'filter.v.availability', count: 1, active: false },
        ],
      },
      {
        label: 'Product type',
        type: 'list',
        param_name: 'filter.p.product_type',
        active_values: [],
        values: ['Tees', 'Hoodies', 'Bottoms', 'Accessories'].map((t) => ({
          label: t,
          value: t,
          param_name: 'filter.p.product_type',
          count: byType(t).length,
          active: false,
        })),
      },
      {
        label: 'Size',
        type: 'list',
        param_name: 'filter.v.option.size',
        active_values: [],
        values: SIZES.map((s) => ({ label: s, value: s, param_name: 'filter.v.option.size', count: 6, active: false })),
      },
      {
        label: 'Price',
        type: 'price_range',
        range_max: 12000,
        min_value: { param_name: 'filter.v.price.gte', value: null },
        max_value: { param_name: 'filter.v.price.lte', value: null },
        active_values: [],
      },
    ],
  };
}

export const collections = {
  all: makeCollection(
    'all',
    'Drop 001',
    products,
    '<p>The first run: heavyweight basics, each one signed. Limited quantities, no restocks.</p>'
  ),
  tees: makeCollection('tees', 'Tees', byType('Tees')),
  hoodies: makeCollection('hoodies', 'Hoodies', byType('Hoodies')),
  bottoms: makeCollection('bottoms', 'Bottoms', byType('Bottoms')),
  accessories: makeCollection('accessories', 'Accessories', byType('Accessories')),
};

const link = (title, url, links = []) => ({ title, url, links, active: false, current: false, child_active: false });

export const linklists = {
  'main-menu': {
    handle: 'main-menu',
    links: [
      link('New drop', 'collection.html'),
      link('Shop', 'collection.html', [
        link('Tees', 'collection.html'),
        link('Hoodies', 'collection.html'),
        link('Bottoms', 'collection.html'),
        link('Accessories', 'collection.html'),
      ]),
      link('Lookbook', '#'),
      link('About', '#'),
    ],
  },
  footer: {
    handle: 'footer',
    links: [
      link('Search', 'search.html'),
      link('Shipping', '#'),
      link('Returns', '#'),
      link('Size guide', '#'),
      link('Contact', '#'),
    ],
  },
};

export function makeCart(lines) {
  const items = lines.map(({ product, size, quantity }) => {
    const variant = product.variants.find((v) => v.title === size) || product.variants[0];
    const line = variant.price * quantity;
    return {
      product,
      variant,
      quantity,
      url: product.url,
      image: product.featured_media,
      title: `${product.title} - ${variant.title}`,
      final_line_price: line,
      original_line_price: line,
      properties: {},
      line_level_discount_allocations: [],
      url_to_remove: '#',
    };
  });
  const total = items.reduce((sum, i) => sum + i.final_line_price, 0);
  return {
    items,
    item_count: items.reduce((sum, i) => sum + i.quantity, 0),
    total_price: total,
    checkout_charge_amount: total,
    currency: { iso_code: 'USD', symbol: '$' },
    taxes_included: false,
    cart_level_discount_applications: [],
    note: '',
  };
}
