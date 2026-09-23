# SWAG — Shopify theme

A Shopify (Online Store 2.0) theme for a clothing brand, designed from the grey **SWAG** logo card: a warm grey sky, scattered black stars, and a hand-signed wordmark.

![Home page](docs/home-desktop.png)

| Product page | Cart drawer | Mobile |
| --- | --- | --- |
| ![Product](docs/product-desktop.png) | ![Cart drawer](docs/drawer-desktop.png) | ![Mobile home](docs/home-mobile.png) |

## Taken from the logo

| Logo detail | Where it shows up in the theme |
| --- | --- |
| Warm grey card, `#9B9391` (sampled from the logo) | Page background, header, cards (`Theme settings → Colors`) |
| Black ink, `#0B0B0B` | Text, buttons, the "Ink" color scheme for dark sections |
| Scattered five-point stars | A seamless star tile behind the hero, newsletter, footer, collection banner, and a faint layer across the whole page (`Theme settings → Stars`) |
| The handwritten signature | Traced into vector strokes: header logo, hero, footer, empty states and sign-offs. It writes itself on like a pen when it scrolls into view |
| Rounded card corners | Rounded product and collection cards and the hero card (`Layout → Corner radius`) |

Stars also turn up in small ways: star-shaped **Sale** badges, star separators in the scrolling text, and a star on the Add to bag button.

Typography pairs the signature with bold uppercase **Inter** headings and **Anonymous Pro** mono labels and prices. All three fonts can be changed in the theme editor.

## What's included

- **Home page sections:** Star hero (with an optional photo background), scrolling text, featured collection, collection list, image with text (signed off with the signature), rich text, newsletter
- **Store pages:** product page (gallery, size pills that strike through sold-out sizes, quantity, dynamic checkout, collapsible tabs, recommendations, app blocks), collection page (Shopify filters and sorting), cart page, search, blog, article, page, contact page, 404, gift card, and a "coming soon" password page
- **Header and footer:** announcement ticker, sticky header with dropdown menus, mobile menu, search, account and a bag icon with an item count; footer with menus, social icons, payment icons and a giant signature
- **Cart drawer:** Add to bag opens a slide-out cart (Section Rendering API). Set `Theme settings → Cart → Cart type` to "Page" to use the cart page instead
- No build step and no dependencies: vanilla JS (`assets/theme.js`) and one stylesheet (`assets/base.css`). It passes `shopify theme check` with no offenses

## Install

**Option A: upload a zip (no tools needed)**

1. Zip the *contents* of the `theme/` folder, so that `layout/`, `sections/` and the other folders sit at the top of the zip:
   ```sh
   cd swag-store/theme && zip -r ../swag-theme.zip .
   ```
2. In Shopify admin, go to **Online Store → Themes → Add theme → Upload zip file**.
3. Click **Customize** to open the theme editor, or **Publish** when you're ready.

**Option B: Shopify CLI**

```sh
shopify theme push --path swag-store/theme --unpublished   # or: shopify theme dev --path swag-store/theme
```

## Set up the store

1. **Menus** (`Content → Menus`): the header uses `main-menu` and the footer uses `footer`. Nested links become dropdowns.
2. **Collections:** create collections such as Tees, Hoodies, Bottoms and Accessories. In the theme editor, choose them in *Collection list* and choose the new drop in *Featured collection*.
3. **Product photos:** cards and the product gallery are portrait **4:5** (square is an option under *Product cards*). The second photo shows on hover.
4. **Logo:** the signature is built in. To use an image instead, upload one under `Theme settings → Logo`.
5. **Social links:** add them under `Theme settings → Social media`. The footer and mobile menu show icons only for the links you fill in.
6. **Filters:** install Shopify's *Search & Discovery* app to choose the filters shown on collection pages.
7. **Launching soon?** Turn on password protection (`Online Store → Preferences`). The password page shows the signature over the stars with an email sign-up.

Customer account pages use Shopify's new customer accounts, so the theme has no legacy account templates.

## Preview without a store

`preview/` renders the theme locally with a sample catalogue: SWAG tees, hoodie, crewneck, sweatpants, cap and tote, drawn as flat SVG mock-ups with the signature printed on. Use it to check design changes or take screenshots.

```sh
cd swag-store/preview
npm install
npm run build         # -> build/index.html, product.html, collection.html, cart.html, search.html, 404.html, password.html
npm run screenshots   # -> screenshots/*.png (desktop + mobile, cart drawer, mobile menu); needs Playwright
```

The renderer (`render.mjs`) covers only the parts of Shopify Liquid this theme uses: JSON templates, section groups, schema defaults, forms and the common filters. The preview has a working bag: it starts empty and keeps what you add in your browser. Checkout and forms only run on a real Shopify store.

## Brand assets

`tools/build_brand_assets.py` rebuilds the signature snippet and the star tile from `reference/swag-logo-card.png`, the grey logo card cropped from the original image. It traces the pen strokes, removes the stars that touch them, smooths the result into SVG, and generates the matching star pattern.

```sh
pip install pillow numpy scipy scikit-image
python3 swag-store/tools/build_brand_assets.py
```

## Layout

```
swag-store/
├── theme/        # the Shopify theme (upload this)
├── preview/      # local renderer, sample data and product mock-ups
├── tools/        # brand asset generator
├── reference/    # the grey SWAG logo card the design is based on
└── docs/         # screenshots
```
