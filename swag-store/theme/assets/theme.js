/* SWAG theme — small, dependency-free behaviour layer. */
(() => {
  const theme = window.theme || {};

  /* ---------- Helpers ---------- */

  const debounce = (fn, wait = 300) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  };

  const formatMoney = (cents) => {
    const format = (theme.moneyFormat || '${{amount}}').replace(/<[^>]*>/g, '');
    const placeholder = /\{\{\s*(\w+)\s*\}\}/;
    const delimit = (value, precision, thousands = ',', decimal = '.') => {
      const [whole, fraction] = (value / 100).toFixed(precision).split('.');
      return whole.replace(/(\d)(?=(\d{3})+(?!\d))/g, `$1${thousands}`) + (fraction ? decimal + fraction : '');
    };
    const match = format.match(placeholder);
    const formatters = {
      amount: () => delimit(cents, 2),
      amount_no_decimals: () => delimit(cents, 0),
      amount_with_comma_separator: () => delimit(cents, 2, '.', ','),
      amount_no_decimals_with_comma_separator: () => delimit(cents, 0, '.', ','),
      amount_with_apostrophe_separator: () => delimit(cents, 2, "'", '.'),
      amount_no_decimals_with_space_separator: () => delimit(cents, 0, ' ', ''),
      amount_with_space_separator: () => delimit(cents, 2, ' ', ','),
      amount_with_period_and_space_separator: () => delimit(cents, 2, ' ', '.'),
    };
    const value = (match && formatters[match[1]]) || formatters.amount;
    return format.replace(placeholder, value());
  };

  const updateCartCount = (count) => {
    document.querySelectorAll('[data-cart-count]').forEach((bubble) => {
      bubble.textContent = count;
      bubble.hidden = Number(count) === 0;
    });
  };

  /* ---------- Signature: write it on when it scrolls into view ---------- */

  const signatureObserver =
    'IntersectionObserver' in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              entry.target.classList.add('is-signed');
              signatureObserver.unobserve(entry.target);
            });
          },
          { threshold: 0.35 }
        )
      : null;

  const watchSignatures = (root = document) => {
    root.querySelectorAll('.signature--animate:not(.is-signed)').forEach((signature) => {
      if (signatureObserver) signatureObserver.observe(signature);
      else signature.classList.add('is-signed');
    });
  };

  /* ---------- Header ---------- */

  const header = document.querySelector('.section-header');
  const syncHeaderHeight = () => {
    if (!header) return;
    const rect = header.getBoundingClientRect();
    document.documentElement.style.setProperty('--header-height', `${Math.round(rect.height)}px`);
    document.documentElement.style.setProperty('--drawer-top', `${Math.max(0, Math.round(rect.bottom))}px`);
  };

  if (header) {
    syncHeaderHeight();
    if ('ResizeObserver' in window) new ResizeObserver(syncHeaderHeight).observe(header);
    window.addEventListener('scroll', debounce(syncHeaderHeight, 50), { passive: true });
  }

  // Only one disclosure (dropdown, search, filter) open at a time; close on outside click or Escape.
  const disclosureSelector = '[data-nav-dropdown], [data-search-toggle], [data-facet], [data-menu-drawer]';

  document.addEventListener(
    'toggle',
    (event) => {
      const details = event.target;
      if (!(details instanceof HTMLDetailsElement) || !details.matches(disclosureSelector)) return;

      if (details.open) {
        document.querySelectorAll(`${disclosureSelector}[open]`).forEach((other) => {
          if (other !== details && !other.contains(details)) other.open = false;
        });
        if (details.matches('[data-menu-drawer]')) {
          syncHeaderHeight();
          document.body.style.overflow = 'hidden';
        }
        if (details.matches('[data-search-toggle]')) {
          const input = details.querySelector('input[type="search"]');
          if (input) setTimeout(() => input.focus(), 50);
        }
      } else if (details.matches('[data-menu-drawer]')) {
        document.body.style.overflow = '';
      }
    },
    true
  );

  document.addEventListener('click', (event) => {
    document.querySelectorAll(`${disclosureSelector}[open]`).forEach((details) => {
      if (details.matches('[data-menu-drawer]')) return;
      if (!details.contains(event.target)) details.open = false;
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    document.querySelectorAll(`${disclosureSelector}[open]`).forEach((details) => {
      details.open = false;
      const summary = details.querySelector('summary');
      if (summary) summary.focus();
    });
  });

  /* ---------- Quantity input ---------- */

  class QuantityInput extends HTMLElement {
    connectedCallback() {
      this.input = this.querySelector('input');
      this.querySelectorAll('button').forEach((button) =>
        button.addEventListener('click', (event) => {
          event.preventDefault();
          const min = Number(this.input.min || 0);
          const current = Number(this.input.value || 0);
          const next = button.name === 'plus' ? current + 1 : Math.max(min, current - 1);
          if (next === current) return;
          this.input.value = next;
          this.input.dispatchEvent(new Event('change', { bubbles: true }));
        })
      );
    }
  }
  customElements.define('quantity-input', QuantityInput);

  /* ---------- Cart drawer ---------- */

  class CartDrawer extends HTMLElement {
    connectedCallback() {
      this.addEventListener('click', (event) => {
        if (event.target.closest('[data-cart-close]')) {
          event.preventDefault();
          this.close();
          return;
        }
        const change = event.target.closest('[data-cart-change]');
        if (change) {
          event.preventDefault();
          const line = change.closest('[data-line]');
          this.changeLine(line.dataset.line, Number(change.dataset.cartChange));
        }
      });
      this.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') this.close();
      });
    }

    open(trigger) {
      this.trigger = trigger || document.activeElement;
      this.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      const panel = this.querySelector('[role="dialog"]');
      if (panel) setTimeout(() => panel.focus(), 60);
    }

    close() {
      this.classList.remove('is-open');
      document.body.style.overflow = '';
      if (this.trigger && this.trigger.focus) this.trigger.focus();
    }

    render(html) {
      const fresh = new DOMParser().parseFromString(html, 'text/html').querySelector('cart-drawer');
      if (!fresh) return;
      this.innerHTML = fresh.innerHTML;
      updateCartCount(fresh.dataset.cartCountValue);
    }

    async changeLine(line, quantity) {
      const list = this.querySelector('.cart-drawer__items');
      if (list) list.classList.add('is-loading');
      try {
        const response = await fetch(`${theme.routes.cartChange}.js`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ line: Number(line), quantity, sections: 'cart-drawer' }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.description || data.message);
        this.render(data.sections['cart-drawer']);
      } catch (error) {
        if (list) list.classList.remove('is-loading');
        window.alert(error.message || theme.strings.cartError);
      }
    }
  }
  customElements.define('cart-drawer', CartDrawer);

  const getDrawer = () => document.querySelector('cart-drawer');

  document.addEventListener('click', (event) => {
    const toggle = event.target.closest('[data-cart-toggle]');
    const drawer = getDrawer();
    if (!toggle || !drawer || theme.cartType !== 'drawer') return;
    if (document.body.classList.contains('template-cart')) return;
    event.preventDefault();
    drawer.open(toggle);
  });

  /* ---------- Product form ---------- */

  class ProductForm extends HTMLElement {
    connectedCallback() {
      this.form = this.querySelector('form');
      this.button = this.querySelector('[data-add-to-cart]');
      this.error = this.querySelector('[data-form-error]');
      if (!this.form) return;
      this.form.addEventListener('submit', (event) => this.onSubmit(event));
    }

    async onSubmit(event) {
      const drawer = getDrawer();
      if (!drawer || theme.cartType !== 'drawer') return;
      event.preventDefault();
      if (this.button.getAttribute('aria-disabled') === 'true') return;

      this.button.setAttribute('aria-disabled', 'true');
      this.button.classList.add('is-loading');
      this.error.hidden = true;

      const body = new FormData(this.form);
      body.append('sections', 'cart-drawer');
      body.append('sections_url', window.location.pathname);

      try {
        const response = await fetch(`${theme.routes.cartAdd}.js`, {
          method: 'POST',
          headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          body,
        });
        const data = await response.json();
        if (!response.ok || data.status) throw new Error(data.description || data.message);
        drawer.render(data.sections['cart-drawer']);
        drawer.open(this.button);
      } catch (error) {
        this.error.textContent = error.message || theme.strings.cartError;
        this.error.hidden = false;
      } finally {
        this.button.classList.remove('is-loading');
        this.button.removeAttribute('aria-disabled');
      }
    }
  }
  customElements.define('product-form', ProductForm);

  /* ---------- Variant picker ---------- */

  class VariantPicker extends HTMLElement {
    connectedCallback() {
      this.variants = JSON.parse(this.querySelector('[data-variants]').textContent);
      this.info = this.closest('product-info');
      this.sectionId = this.dataset.sectionId;
      this.addEventListener('change', () => this.onChange());
      this.markUnavailable();
    }

    selectedOptions() {
      return [...this.querySelectorAll('fieldset')].map((fieldset) => {
        const checked = fieldset.querySelector('input:checked');
        return checked ? checked.value : null;
      });
    }

    onChange() {
      const options = this.selectedOptions();
      const variant = this.variants.find((candidate) =>
        candidate.options.every((value, index) => value === options[index])
      );

      this.querySelectorAll('fieldset').forEach((fieldset, index) => {
        const label = fieldset.querySelector('[data-selected-value]');
        if (label) label.textContent = options[index] || '';
      });

      this.markUnavailable();
      this.updateButton(variant);
      if (!variant) return;

      const form = document.getElementById(`ProductForm-${this.sectionId}`);
      const idInput = form && form.querySelector('[data-variant-id]');
      if (idInput) {
        idInput.value = variant.id;
        idInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      this.updatePrice(variant);
      this.updateMedia(variant);

      if (this.info && this.info.dataset.url) {
        window.history.replaceState({}, '', `${this.info.dataset.url}?variant=${variant.id}`);
      }
    }

    // Strike through values that can't be bought with the other options as currently chosen.
    markUnavailable() {
      const selected = this.selectedOptions();
      this.querySelectorAll('fieldset').forEach((fieldset, index) => {
        fieldset.querySelectorAll('input').forEach((input) => {
          const available = this.variants.some(
            (variant) =>
              variant.available &&
              variant.options[index] === input.value &&
              variant.options.every((value, i) => i === index || selected[i] === null || value === selected[i])
          );
          input.classList.toggle('is-unavailable', !available);
        });
      });
    }

    updateButton(variant) {
      const form = document.getElementById(`ProductForm-${this.sectionId}`);
      if (!form) return;
      const button = form.querySelector('[data-add-to-cart]');
      const text = form.querySelector('[data-add-to-cart-text]');
      if (!button || !text) return;
      if (!variant) {
        button.disabled = true;
        text.textContent = theme.strings.unavailable;
      } else if (!variant.available) {
        button.disabled = true;
        text.textContent = theme.strings.soldOut;
      } else {
        button.disabled = false;
        text.textContent = theme.strings.addToCart;
      }
    }

    updatePrice(variant) {
      const container = this.info && this.info.querySelector('[data-price-container]');
      if (!container) return;
      const price = container.querySelector('[data-price]');
      const badge = container.querySelector('.star-badge');
      const onSale = variant.compare_at_price && variant.compare_at_price > variant.price;
      const strings = theme.strings;

      price.classList.toggle('price--on-sale', Boolean(onSale));
      price.classList.toggle('price--sold-out', !variant.available);
      price.innerHTML =
        `<span class="visually-hidden">${onSale ? strings.salePrice : strings.regularPrice}</span>` +
        `<span class="price__current">${formatMoney(variant.price)}</span>` +
        (onSale
          ? `<span class="visually-hidden">${strings.regularPrice}</span><s class="price__compare">${formatMoney(
              variant.compare_at_price
            )}</s>`
          : '');
      if (badge) badge.classList.toggle('is-hidden', !onSale);
    }

    updateMedia(variant) {
      if (!variant.featured_media) return;
      const gallery = document.querySelector(`[data-section-id="${this.sectionId}"] [data-gallery]`);
      if (!gallery) return;
      const item = gallery.querySelector(`[data-media-id="${variant.featured_media.id}"]`);
      if (!item) return;
      gallery.querySelectorAll('.is-active').forEach((active) => active.classList.remove('is-active'));
      item.classList.add('is-active');
      if (window.matchMedia('(min-width: 990px)').matches) {
        gallery.prepend(item);
      } else {
        gallery.scrollTo({ left: item.offsetLeft - gallery.offsetLeft, behavior: 'smooth' });
      }
    }
  }
  customElements.define('variant-picker', VariantPicker);

  // Mobile gallery counter.
  document.querySelectorAll('[data-gallery]').forEach((gallery) => {
    const counter = gallery.parentElement.querySelector('[data-gallery-current]');
    if (!counter) return;
    gallery.addEventListener(
      'scroll',
      debounce(() => {
        const items = [...gallery.children];
        const center = gallery.scrollLeft + gallery.clientWidth / 2;
        const index = items.findIndex((item) => item.offsetLeft + item.offsetWidth > center);
        counter.textContent = Math.max(0, index) + 1;
      }, 60),
      { passive: true }
    );
  });

  /* ---------- Product recommendations ---------- */

  class ProductRecommendations extends HTMLElement {
    connectedCallback() {
      if (!this.dataset.url || this.children.length) return;
      const load = async () => {
        try {
          const response = await fetch(this.dataset.url);
          const html = await response.text();
          const fresh = new DOMParser().parseFromString(html, 'text/html').querySelector('product-recommendations');
          if (fresh && fresh.innerHTML.trim()) {
            this.innerHTML = fresh.innerHTML;
          }
        } catch (error) {
          // Recommendations are optional; leave the section empty.
        }
      };
      if (!('IntersectionObserver' in window)) return load();
      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries[0].isIntersecting) return;
          observer.disconnect();
          load();
        },
        { rootMargin: '0px 0px 400px 0px' }
      );
      observer.observe(this);
    }
  }
  customElements.define('product-recommendations', ProductRecommendations);

  /* ---------- Collection filters ---------- */

  class FacetForm extends HTMLElement {
    connectedCallback() {
      const form = this.querySelector('form');
      if (!form) return;
      const submit = debounce(() => {
        // Drop empty price inputs so they don't end up as blank filter params.
        form.querySelectorAll('input[type="number"]').forEach((input) => {
          input.disabled = input.value === '';
        });
        form.submit();
      }, 500);
      form.addEventListener('change', submit);
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        submit();
      });
    }
  }
  customElements.define('facet-form', FacetForm);

  /* ---------- Cart page ---------- */

  class CartForm extends HTMLElement {
    connectedCallback() {
      const form = this.querySelector('form');
      if (!form) return;
      form.addEventListener(
        'change',
        debounce((event) => {
          if (!event.target.matches('[data-cart-quantity], textarea[name="note"]')) return;
          form.classList.add('is-loading');
          form.submit();
        }, 450)
      );
    }
  }
  customElements.define('cart-form', CartForm);

  /* ---------- Boot ---------- */

  watchSignatures();

  document.addEventListener('shopify:section:load', (event) => {
    watchSignatures(event.target);
    syncHeaderHeight();
  });
})();
