(function () {
  // Draws the cart drawer and the checkout summary.
  //
  // Prices come from the database, not from this page: the cart sends its lines (product, options,
  // quantity) to the cart_quote() function and gets back names, photos, minimum order quantities and
  // prices, worked out by the same code that prices the order itself. So the page only ever carries the
  // products that are actually in the cart, however big the catalog gets.
  //
  // Between server answers the lines are re-priced instantly from the last answer, using the same rule:
  //   quantity at or above the MOQ -> wholesale price, below it -> retail price.

  const CACHE_KEY = 'lashtribe_quote_v1';
  const state = { lines: {}, freeShipping: null, shippingFee: null, failed: false };
  let seq = 0;
  let timer = null;

  const Cart = () => window.LashtribeCart;

  function money(value) {
    return 'Ksh ' + Number(value || 0).toLocaleString();
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function config() {
    const node = document.getElementById('lashtribe-config');
    if (!node) return null;
    try {
      const cfg = JSON.parse(node.textContent || '{}');
      return cfg && cfg.url && cfg.key ? cfg : null;
    } catch (error) {
      return null;
    }
  }

  // ---------- last answer, kept for the session so a new page draws instantly ----------
  function readCache() {
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
      if (cached && cached.lines && typeof cached.lines === 'object') {
        state.lines = cached.lines;
        state.freeShipping = cached.freeShipping || null;
        state.shippingFee = typeof cached.shippingFee === 'number' ? cached.shippingFee : null;
      }
    } catch (error) { /* storage blocked: draw after the first answer */ }
  }

  function writeCache() {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ lines: state.lines, freeShipping: state.freeShipping, shippingFee: state.shippingFee }));
    } catch (error) { /* ignore */ }
  }

  // ---------- turning cart lines + the last answer into things to draw ----------
  function cartLines() {
    return (Cart() ? Cart().getLines() : []).map((line) => {
      const q = state.lines[line.key];
      if (!q) return { ...line, status: state.failed ? 'error' : 'loading' };
      if (q.missing) return { ...line, status: 'missing' };
      if (q.needs_options) {
        return { ...line, status: 'options', name: q.name, slug: q.slug, image: q.image, icon: q.icon };
      }
      const moq = Math.max(1, Number(q.moq) || 1);
      const tier = line.qty >= moq ? 'wholesale' : 'retail';
      const unit = tier === 'wholesale' ? Number(q.wholesale) : Number(q.retail);
      const marketUnit = Number(q.market) > 0 ? Math.max(Number(q.market), unit) : unit;
      return {
        ...line,
        status: 'ok',
        name: q.name,
        slug: q.slug,
        image: q.image,
        icon: q.icon,
        moq,
        minQty: Math.max(1, Number(q.min_qty) || 1),
        tier,
        unit,
        wholesale: Number(q.wholesale),
        retail: Number(q.retail),
        shownOptions: q.options || line.options,
        lineTotal: unit * line.qty,
        lineMarket: marketUnit * line.qty,
      };
    });
  }

  function totalsFromLines(lines) {
    const priced = lines.filter((l) => l.status === 'ok');
    const subtotal = priced.reduce((sum, l) => sum + l.lineTotal, 0);
    const marketTotal = priced.reduce((sum, l) => sum + l.lineMarket, 0);
    return { subtotal, marketTotal, saved: Math.max(0, marketTotal - subtotal), unpriced: lines.length - priced.length };
  }

  function productCount(lines) {
    return new Set(lines.map((l) => l.id)).size;
  }

  // Shipping = weight x rate per kg (cost of getting the goods to our offices). The database works it out
  // (cart_quote.shipping_fee) and place_order() charges the same amount, so this is only for display.
  function shippingState() {
    if (state.shippingFee === null) return { label: 'Calculating…', fee: 0 };
    if (state.shippingFee <= 0) return { label: 'Free', fee: 0 };
    return { label: money(state.shippingFee), fee: state.shippingFee };
  }

  function lineThumb(line) {
    if (line.image) return '<img src="' + esc(line.image) + '" alt="" loading="lazy" decoding="async" />';
    return '<svg viewBox="0 0 60 60">' + (line.icon || '') + '</svg>';
  }

  function optionsText(line) {
    const entries = Object.entries(line.shownOptions || {});
    return entries.length ? entries.map(([k, v]) => esc(k) + ': ' + esc(v)).join(' · ') : '';
  }

  function tierNote(line) {
    if (line.tier === 'wholesale') return 'Wholesale · ' + money(line.unit) + ' each';
    return 'Retail · ' + money(line.unit) + ' each';
  }

  // "Add 2 more for the wholesale price" while the quantity is below the MOQ
  function tierHint(line) {
    if (line.minQty > 1 && line.qty < line.minQty) return 'Minimum for this shipment: ' + line.minQty + ' (add ' + (line.minQty - line.qty) + ' more)';
    if (line.tier !== 'retail' || !(line.wholesale < line.retail)) return '';
    const need = line.moq - line.qty;
    return 'Add ' + need + ' more (MOQ ' + line.moq + ') for wholesale ' + money(line.wholesale) + ' each';
  }

  // ---------- cart drawer ----------
  function drawerLine(line) {
    const key = esc(line.key);
    const remove = '<button class="line-remove" type="button" data-key="' + key + '" aria-label="Remove from cart">&times;</button>';

    if (line.status === 'loading') {
      return '<div class="line-item is-loading" data-key="' + key + '"><div class="line-thumb"></div>' +
        '<div class="line-info"><h5>Loading&hellip;</h5></div><div class="line-price">&hellip;</div></div>';
    }
    if (line.status === 'error') {
      return '<div class="line-item" data-key="' + key + '"><div class="line-info"><h5>Prices unavailable right now</h5>' +
        '<div class="moq-note">Check your connection and reopen the cart.</div></div>' + remove + '</div>';
    }
    if (line.status === 'options') {
      return '<div class="line-item" data-key="' + key + '"><div class="line-thumb">' + lineThumb(line) + '</div>' +
        '<div class="line-info"><h5>' + esc(line.name) + '</h5>' +
        '<div class="moq-note">This product needs options (such as curl or length).</div>' +
        '<a class="line-choose" href="/ecommerce/product/' + encodeURIComponent(line.slug || '') + '">Choose options &rarr;</a></div>' +
        remove + '</div>';
    }
    if (line.status === 'missing') return '';

    const opts = optionsText(line);
    const hint = tierHint(line);
    return '<div class="line-item" data-key="' + key + '">' +
      '<div class="line-thumb">' + lineThumb(line) + '</div>' +
      '<div class="line-info">' +
        '<h5>' + esc(line.name) + '</h5>' +
        (opts ? '<div class="line-opts">' + opts + '</div>' : '') +
        '<div class="moq-note">' + tierNote(line) + ' &middot; MOQ ' + line.moq + '</div>' +
        (hint ? '<div class="tier-hint">' + hint + '</div>' : '') +
        '<div class="stepper">' +
          '<button class="qty-btn" data-key="' + key + '" data-dir="-1" type="button" aria-label="One less">&ndash;</button>' +
          '<input class="qty-input" data-key="' + key + '" type="number" min="1" max="100000" inputmode="numeric" value="' + line.qty + '" aria-label="Quantity" />' +
          '<button class="qty-btn" data-key="' + key + '" data-dir="1" type="button" aria-label="One more">+</button>' +
        '</div>' +
      '</div>' +
      '<div class="line-price">' + money(line.lineTotal) + '</div>' +
      remove +
    '</div>';
  }

  function renderDrawer() {
    const linesEl = document.getElementById('drawerLines');
    const emptyEl = document.getElementById('drawerEmpty');
    if (!linesEl) return;

    const lines = cartLines().filter((l) => l.status !== 'missing');
    const typing = document.activeElement && document.activeElement.classList &&
      document.activeElement.classList.contains('qty-input') && linesEl.contains(document.activeElement);

    if (!typing) {
      if (lines.length === 0) {
        linesEl.innerHTML = '';
        if (emptyEl) emptyEl.hidden = false;
      } else {
        if (emptyEl) emptyEl.hidden = true;
        linesEl.innerHTML = lines.map(drawerLine).join('');
      }
    }

    const { subtotal, marketTotal, saved } = totalsFromLines(lines);
    const set = (id, text) => { const node = document.getElementById(id); if (node) node.textContent = text; };
    set('marketTotal', money(marketTotal));
    set('savedTotal', money(saved));
    set('shippingTotal', shippingState().label);
    set('yourTotal', money(subtotal + shippingState().fee));

    if (Cart()) Cart().syncCartBadges();
  }

  // ---------- checkout summary ----------
  function renderCheckoutSummary() {
    const itemsEl = document.getElementById('summaryItems');
    if (!itemsEl) return;

    const lines = cartLines().filter((l) => l.status !== 'missing');
    const typingHere = document.activeElement && document.activeElement.classList &&
      document.activeElement.classList.contains('qty-input') && itemsEl.contains(document.activeElement);

    if (typingHere) {
      // keep the box being typed in; totals below still update
    } else if (lines.length === 0) {
      itemsEl.innerHTML = '<p class="summary-empty">Your cart is empty. <a href="/shop">Browse products</a></p>';
    } else {
      itemsEl.innerHTML = lines.map((l) => {
        if (l.status === 'loading') {
          return '<div class="summary-item"><div class="summary-thumb"></div><div class="summary-info"><h3>Loading&hellip;</h3></div></div>';
        }
        if (l.status === 'error') {
          return '<div class="summary-item"><div class="summary-info"><h3>Prices unavailable right now</h3></div></div>';
        }
        if (l.status === 'options') {
          return '<div class="summary-item"><div class="summary-thumb">' + lineThumb(l) + '</div><div class="summary-info"><h3>' + esc(l.name) +
            '</h3><small><a href="/ecommerce/product/' + encodeURIComponent(l.slug || '') + '">Choose options &rarr;</a> before ordering</small></div></div>';
        }
        const opts = optionsText(l);
        const k = esc(l.key);
        const hint = tierHint(l);
        return '<div class="summary-item" data-key="' + k + '">' +
          '<div class="summary-thumb">' + lineThumb(l) + '</div>' +
          '<div class="summary-info"><h3>' + esc(l.name) + '</h3>' +
            (opts ? '<small>' + opts + '</small>' : '') +
            '<small>' + (l.tier === 'wholesale' ? 'Wholesale' : 'Retail') + ' ' + money(l.unit) + ' each &middot; MOQ ' + l.moq + '</small>' +
            (hint ? '<small class="summary-hint">' + hint + '</small>' : '') +
            '<div class="summary-qty-row">' +
              '<div class="stepper">' +
                '<button class="qty-btn" data-key="' + k + '" data-dir="-1" type="button" aria-label="One less">&ndash;</button>' +
                '<input class="qty-input" data-key="' + k + '" type="number" min="1" max="100000" inputmode="numeric" value="' + l.qty + '" aria-label="Quantity" />' +
                '<button class="qty-btn" data-key="' + k + '" data-dir="1" type="button" aria-label="One more">+</button>' +
              '</div>' +
              '<button class="summary-remove" type="button" data-key="' + k + '" aria-label="Remove ' + esc(l.name) + '">Remove</button>' +
            '</div>' +
          '</div>' +
          '<div class="summary-price">' + money(l.lineTotal) + '</div>' +
        '</div>';
      }).join('');
    }

    const { subtotal, saved } = totalsFromLines(lines);
    const shipping = shippingState();
    const total = subtotal + shipping.fee;
    const count = productCount(lines);

    const setText = (id, text) => {
      const node = document.getElementById(id);
      if (node) node.textContent = text;
    };

    setText('summaryCount', String(count));
    setText('summaryCountLabel', count === 1 ? 'product' : 'products');
    setText('checkoutSubtotal', money(subtotal));
    setText('checkoutSaved', money(saved));
    setText('checkoutShipping', shipping.label);
    setText('checkoutTotal', money(total));
    setText('checkoutFooterTotal', money(total));
    setText('checkoutSubtotalMobile', money(subtotal));
    setText('checkoutSavedMobile', money(saved));
    setText('checkoutShippingMobile', shipping.label);
    setText('checkoutTotalMobile', money(total));
  }

  function draw() {
    renderDrawer();
    renderCheckoutSummary();
  }

  // ---------- asking the database for prices ----------
  function hasCartUI() {
    return Boolean(document.getElementById('drawerLines') || document.getElementById('summaryItems'));
  }

  function refresh() {
    if (!Cart() || !hasCartUI()) return Promise.resolve();
    const lines = Cart().getLines();
    if (!lines.length) {
      state.lines = {};
      state.failed = false;
      writeCache();
      draw();
      return Promise.resolve();
    }
    const cfg = config();
    if (!cfg) {
      state.failed = true;
      draw();
      return Promise.resolve();
    }

    const mine = ++seq;
    return fetch(cfg.url.replace(/\/$/, '') + '/rest/v1/rpc/cart_quote', {
      method: 'POST',
      headers: { apikey: cfg.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_items: lines.map((l) => ({ key: l.key, id: l.id, qty: l.qty, options: l.options })),
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('cart_quote ' + res.status);
        return res.json();
      })
      .then((data) => {
        if (mine !== seq) return; // a newer answer is on its way
        const byKey = {};
        (data.lines || []).forEach((l) => { if (l && l.key) byKey[l.key] = l; });
        state.lines = byKey;
        const fs = data.free_shipping;
        state.shippingFee = data.shipping_fee === undefined || data.shipping_fee === null ? null : Number(data.shipping_fee) || 0;
        state.freeShipping = fs ? { minOrderValue: Number(fs.min_order_value) || 0, badgeText: fs.badge_text, label: fs.label } : null;
        state.failed = false;
        writeCache();

        // products that were deleted or switched off are dropped from the cart
        const gone = (data.lines || []).filter((l) => l && l.missing).map((l) => l.key);
        if (gone.length) {
          const cart = Cart().getCart();
          gone.forEach((key) => delete cart[key]);
          Cart().setCart(cart);
          Cart().syncCartBadges();
        } else {
          draw();
        }
      })
      .catch((error) => {
        if (mine !== seq) return;
        console.warn('Could not price the cart', error);
        state.failed = true; // lines we already have an answer for keep showing
        draw();
      });
  }

  function scheduleRefresh() {
    clearTimeout(timer);
    timer = setTimeout(refresh, 250);
  }

  // ---------- clicks ----------
  document.addEventListener('click', (event) => {
    const cart = Cart();
    if (!cart || !event.target.closest) return;

    const step = event.target.closest('.qty-btn[data-key]');
    if (step) {
      const key = step.dataset.key;
      const dir = parseInt(step.dataset.dir, 10);
      cart.setQty(key, (Number(cart.getCart()[key]) || 0) + dir); // below 1 removes the line
      cart.syncCartBadges();
      return;
    }

    const rm = event.target.closest('.line-remove[data-key], .summary-remove[data-key]');
    if (rm) {
      cart.remove(rm.dataset.key);
      cart.syncCartBadges();
    }
  });

  document.addEventListener('change', (event) => {
    const input = event.target.closest && event.target.closest('.qty-input[data-key]');
    if (!input || !Cart()) return;
    const n = Math.round(Number(input.value));
    if (!Number.isFinite(n) || n < 1) {
      draw(); // an empty or invalid box goes back to the real quantity; it never deletes the line
      return;
    }
    input.blur(); // so the drawer redraws with the new tier price even after pressing Enter
    Cart().setQty(input.dataset.key, n);
    Cart().syncCartBadges();
  });

  window.addEventListener('lashtribe:cart-updated', () => {
    draw(); // re-price from the last answer straight away...
    scheduleRefresh(); // ...and confirm with the database
  });

  // ---------- start ----------
  readCache();
  draw();
  refresh();

  const toggle = document.querySelector('.summary-toggle');
  const itemsWrap = document.getElementById('summaryItems');
  if (toggle && itemsWrap) {
    toggle.addEventListener('click', () => {
      const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!isExpanded));
      itemsWrap.classList.toggle('is-open', !isExpanded);
    });
  }

  // Lets other pages (the academy) redraw the same drawer on demand.
  window.LashtribeCartUI = { renderDrawer, renderCheckoutSummary, refresh };
})();
