// Preview only: a working stand-in for Shopify's cart API, so the static preview behaves like a
// real store. The cart starts empty, lives in this browser's localStorage, and answers theme.js's
// /cart/add.js and /cart/change.js requests with freshly built cart drawer markup.
// Catalogue, icons and strings come from preview-data.js (window.__preview), written by render.mjs.
(function () {
  var data = window.__preview;
  var STORAGE_KEY = 'swag-preview-cart';
  var realFetch = window.fetch.bind(window);

  /* ---------- Cart state ---------- */

  function load() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(saved) ? saved.filter(function (line) { return data.variants[line.id] && line.quantity > 0; }) : [];
    } catch (error) {
      return [];
    }
  }

  var lines = load();

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch (error) {
      // Private windows can refuse storage; the cart still works for this page view.
    }
  }

  function itemCount() {
    return lines.reduce(function (sum, line) { return sum + line.quantity; }, 0);
  }

  function subtotal() {
    return lines.reduce(function (sum, line) { return sum + data.variants[line.id].price * line.quantity; }, 0);
  }

  function add(id, quantity) {
    if (!data.variants[id]) throw new Error('This size is not available.');
    var existing = lines.find(function (line) { return line.id === id; });
    if (existing) existing.quantity += quantity;
    else lines.push({ id: id, quantity: quantity });
    save();
  }

  function change(lineNumber, quantity) {
    var index = lineNumber - 1;
    if (!lines[index]) return;
    if (quantity <= 0) lines.splice(index, 1);
    else lines[index].quantity = quantity;
    save();
  }

  /* ---------- Markup ---------- */

  var money = function (cents) { return '$' + (cents / 100).toFixed(2); };
  var esc = function (text) {
    return String(text).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; });
  };
  var t = data.strings;
  var icon = data.icons;

  function itemMarkup(line, number, attr) {
    var v = data.variants[line.id];
    return (
      '<li class="cart-item' + (attr === 'data-cart-change' ? ' cart-item--compact' : '') + '" data-line="' + number + '">' +
      '<a href="' + v.url + '" class="cart-item__media" tabindex="-1" aria-hidden="true"><img src="' + v.image + '" alt="" class="cart-item__image"></a>' +
      '<div class="cart-item__details">' +
      '<a href="' + v.url + '" class="cart-item__title">' + esc(v.title) + '</a>' +
      (v.variantTitle ? '<p class="cart-item__variant">' + esc(v.variantTitle) + '</p>' : '') +
      '<div class="cart-item__controls">' +
      '<div class="quantity quantity--small">' +
      '<button class="quantity__button" type="button" ' + attr + '="' + (line.quantity - 1) + '" aria-label="' + esc(t.decrease + ' ' + v.title) + '">' + icon.minus + '</button>' +
      '<span class="quantity__input" aria-live="polite">' + line.quantity + '</span>' +
      '<button class="quantity__button" type="button" ' + attr + '="' + (line.quantity + 1) + '" aria-label="' + esc(t.increase + ' ' + v.title) + '">' + icon.plus + '</button>' +
      '</div>' +
      '<button type="button" class="link-underline cart-item__remove" ' + attr + '="0">' + esc(t.remove) + '</button>' +
      '</div></div>' +
      '<div class="cart-item__price"><span class="price__current">' + money(v.price * line.quantity) + '</span></div>' +
      '</li>'
    );
  }

  function checkoutButton() {
    return '<button type="submit" name="checkout" class="button button--full">' + esc(t.checkout) + ' ' + icon.arrow + '</button>';
  }

  function drawerMarkup() {
    var count = itemCount();
    if (count === 0) return data.emptyDrawer;
    return (
      '<cart-drawer class="cart-drawer" data-cart-count-value="' + count + '">' +
      '<div class="cart-drawer__overlay" data-cart-close></div>' +
      '<div class="cart-drawer__panel scheme-grey" role="dialog" aria-modal="true" aria-labelledby="CartDrawer-title" tabindex="-1">' +
      '<div class="cart-drawer__header"><h2 class="h3" id="CartDrawer-title">' + esc(t.title) + ' <span class="cart-drawer__count">(' + count + ')</span></h2>' +
      '<button type="button" class="header__icon" data-cart-close aria-label="' + esc(t.close) + '">' + icon.close + '</button></div>' +
      '<ul class="cart-drawer__items" role="list">' +
      lines.map(function (line, i) { return itemMarkup(line, i + 1, 'data-cart-change'); }).join('') +
      '</ul>' +
      '<div class="cart-drawer__footer">' +
      '<p class="cart-summary__row cart-summary__total"><span>' + esc(t.subtotal) + '</span><span>' + money(subtotal()) + ' USD</span></p>' +
      '<p class="cart-summary__note">' + esc(t.taxes) + '</p>' +
      '<form action="' + data.cartUrl + '" method="post" class="cart-drawer__actions">' + checkoutButton() +
      '<a href="' + data.cartUrl + '" class="button button--outline button--full">' + esc(t.viewCart) + '</a></form>' +
      '</div></div></cart-drawer>'
    );
  }

  function cartPageMarkup() {
    var count = itemCount();
    return (
      '<section class="section section--tight cart-page"><div class="page-width">' +
      '<div class="section-heading"><div><p class="eyebrow">' + icon.blob + ' ' + esc(count === 1 ? t.oneItem : t.manyItems.replace('{{ count }}', count)) + '</p>' +
      '<h1 class="h1">' + esc(t.title) + '</h1></div>' +
      '<a href="' + data.shopUrl + '" class="link-arrow">' + esc(t.continueShopping) + ' ' + icon.arrow + '</a></div>' +
      '<form action="' + data.cartUrl + '" method="post" class="cart-page__grid">' +
      '<ul class="cart-items" role="list">' +
      lines.map(function (line, i) { return itemMarkup(line, i + 1, 'data-preview-change'); }).join('') +
      '</ul>' +
      '<aside class="cart-summary">' +
      '<p class="cart-summary__row cart-summary__total"><span>' + esc(t.subtotal) + '</span><span>' + money(subtotal()) + ' USD</span></p>' +
      '<p class="cart-summary__note">' + esc(t.taxes) + '</p>' + checkoutButton() +
      '</aside></form></div></section>'
    );
  }

  /* ---------- Page sync ---------- */

  function syncCount() {
    var count = itemCount();
    document.querySelectorAll('[data-cart-count]').forEach(function (bubble) {
      bubble.textContent = count;
      bubble.hidden = count === 0;
    });
  }

  var cartSection = null;
  var emptyCartPage = '';

  function syncCartPage() {
    if (!cartSection) return;
    cartSection.innerHTML = itemCount() === 0 ? emptyCartPage : cartPageMarkup();
  }

  function toast(message) {
    var el = document.getElementById('preview-toast');
    if (!el) {
      el = document.createElement('p');
      el.id = 'preview-toast';
      el.setAttribute('role', 'status');
      el.style.cssText =
        'position:fixed;left:50%;bottom:calc(20px + env(safe-area-inset-bottom, 0px));transform:translateX(-50%);z-index:200;' +
        'max-width:calc(100% - 32px);padding:12px 20px;border-radius:999px;background:#0b0b0b;color:#9b9391;' +
        'font:13px/1.3 "Anonymous Pro",monospace;letter-spacing:.08em;text-transform:uppercase;text-align:center';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.hidden = false;
    clearTimeout(el._timer);
    el._timer = setTimeout(function () { el.hidden = true; }, 3200);
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (document.body.classList.contains('template-cart')) {
      cartSection = document.querySelector('.section-main-cart');
      if (cartSection) emptyCartPage = cartSection.innerHTML;
    }
    syncCount();
    syncCartPage();
    var drawer = document.querySelector('cart-drawer');
    if (drawer && typeof drawer.render === 'function') drawer.render(drawerMarkup());
  });

  // Cart page quantity buttons.
  document.addEventListener('click', function (event) {
    var button = event.target.closest('[data-preview-change]');
    if (!button) return;
    event.preventDefault();
    change(Number(button.closest('[data-line]').dataset.line), Number(button.getAttribute('data-preview-change')));
    syncCount();
    syncCartPage();
  });

  // There is no checkout or form backend in a preview: stop POSTs and say so.
  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (event.defaultPrevented || (form.getAttribute('method') || 'get').toLowerCase() !== 'post') return;
    event.preventDefault();
    var submitter = event.submitter;
    if (submitter && submitter.name === 'checkout') toast(t.checkoutPreview);
    else toast(t.formPreview);
  });

  /* ---------- Shopify endpoints ---------- */

  var respond = function (body, status) {
    return new Promise(function (resolve) { setTimeout(resolve, 250); }).then(function () {
      return new Response(JSON.stringify(body), { status: status || 200, headers: { 'Content-Type': 'application/json' } });
    });
  };

  window.fetch = function (url, options) {
    var href = String(url);
    try {
      if (href.indexOf('/cart/add') !== -1) {
        var form = options && options.body;
        var id = Number(form.get('id'));
        var quantity = Math.max(1, Number(form.get('quantity')) || 1);
        add(id, quantity);
        syncCount();
        return respond({ id: id, quantity: quantity, sections: { 'cart-drawer': drawerMarkup() } });
      }
      if (href.indexOf('/cart/change') !== -1) {
        var body = JSON.parse(options.body);
        change(Number(body.line), Number(body.quantity));
        syncCount();
        return respond({ item_count: itemCount(), sections: { 'cart-drawer': drawerMarkup() } });
      }
    } catch (error) {
      return respond({ status: 422, description: error.message }, 422);
    }
    if (href.indexOf('/recommendations/products') !== -1) {
      return Promise.resolve(new Response(data.recommendations, { status: 200 }));
    }
    return realFetch(url, options);
  };
})();
