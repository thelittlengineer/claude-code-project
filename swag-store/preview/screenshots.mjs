// Serves build/ locally and captures desktop + mobile screenshots of each preview page.
//   npm run build && npm run screenshots   ->   screenshots/*.png
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const BUILD = path.join(here, 'build');
const OUT = path.join(here, 'screenshots');
const require = createRequire(import.meta.url);

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require('/opt/node22/lib/node_modules/playwright'));
}

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' };

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(BUILD, url === '/' ? 'index.html' : url);
  if (!file.startsWith(BUILD) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404).end('Not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

const shots = [
  { page: 'index.html', name: 'home' },
  { page: 'product.html', name: 'product' },
  { page: 'collection.html', name: 'collection' },
  { page: 'cart.html', name: 'cart' },
  { page: 'password.html', name: 'password' },
];

const viewports = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};

async function settle(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(() => document.fonts && document.fonts.ready);
  // Scroll through so lazy content and the signature animations kick in, then return to top.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(3200);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  await new Promise((resolve) => server.listen(0, resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const only = process.argv.slice(2);

  for (const [device, viewport] of Object.entries(viewports)) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: device === 'mobile' ? 2 : 1 });
    for (const shot of shots) {
      if (only.length && !only.includes(shot.name)) continue;
      const page = await context.newPage();
      await page.goto(`${base}/${shot.page}`);
      await settle(page);
      await page.screenshot({ path: path.join(OUT, `${shot.name}-${device}.png`), fullPage: true });
      await page.close();
    }

    if (!only.length || only.includes('drawer')) {
      // Add to bag from the product page to show the cart drawer.
      const page = await context.newPage();
      await page.goto(`${base}/product.html`);
      await settle(page);
      await page.click('[data-add-to-cart]');
      await page.waitForSelector('cart-drawer.is-open');
      await page.waitForTimeout(700);
      await page.screenshot({ path: path.join(OUT, `drawer-${device}.png`) });
      await page.close();
    }

    if (device === 'mobile' && (!only.length || only.includes('menu'))) {
      const page = await context.newPage();
      await page.goto(`${base}/index.html`);
      await settle(page);
      await page.click('.menu-drawer__toggle');
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(OUT, `menu-${device}.png`) });
      await page.close();
    }
    await context.close();
  }

  await browser.close();
  server.close();
  console.log(`Saved screenshots to ${path.relative(process.cwd(), OUT) || '.'}`);
}

main().catch((error) => {
  console.error(error);
  server.close();
  process.exit(1);
});
