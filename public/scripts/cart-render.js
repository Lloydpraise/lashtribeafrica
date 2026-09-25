(function () {
  function getCatalog() {
    const node = document.getElementById('lashtribe-catalog');
    if (!node) return { products: {}, freeShipping: null };
    try {
      return JSON.parse(node.textContent || '{}');
    } catch (error) {
      console.warn('Unable to parse cart catalog', error);
      return { products: {}, freeShipping: null };
    }
  }

  function money(value) {
    return 'Ksh ' + Number(value || 0).toLocaleString();
  }

  function getCart() {
    return window.LashtribeCart ? window.LashtribeCart.getCart() : {};
  }

  function setCart(cart) {
    if (window.LashtribeCart) {
      window.LashtribeCart.setCart(cart);
      window.LashtribeCart.syncCartBadges();
    }
  }

  // Builds the list of { id, product, qty, lineTotal, lineMarket } for
  // whatever's actually in the cart AND in the catalog. Any cart entry
  // whose id isn't a real product (leftover/foreign data) is skipped.
  function getCartLines(catalog) {
    const cart = getCart();
    const lines = [];
    for (const [id, qty] of Object.entries(cart)) {
      const product = catalog.products[id];
      if (!product) continue;
      lines.push({
        id,
        product,
        qty,
        lineTotal: product.price * qty,
        lineMarket: product.marketPrice * qty,
      });
    }
    return lines;
  }

  function totalsFromLines(lines) {
    const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
    const marketTotal = lines.reduce((sum, l) => sum + l.lineMarket, 0);
    const itemCount = lines.reduce((sum, l) => sum + l.qty, 0);
    return { subtotal, marketTotal, saved: Math.max(0, marketTotal - subtotal), itemCount };
  }

  function shippingState(catalog, subtotal) {
    const fs = catalog.freeShipping;
    if (fs && subtotal >= fs.minOrderValue) {
      return { label: 'Free', free: true };
    }
    if (fs) {
      return { label: 'TBD (free over ' + money(fs.minOrderValue) + ')', free: false };
    }
    return { label: 'TBD', free: false };
  }

  function lineThumb(product) {
    if (product.image) {
      return '<img src="' + product.image + '" alt="" />';
    }
    return '<svg viewBox="0 0 60 60">' + (product.icon || '') + '</svg>';
  }

  // ---------- Cart drawer ----------
  function renderDrawer() {
    const linesEl = document.getElementById('drawerLines');
    const emptyEl = document.getElementById('drawerEmpty');
    if (!linesEl) return;

    const catalog = getCatalog();
    const lines = getCartLines(catalog);

    if (lines.length === 0) {
      linesEl.innerHTML = '';
      if (emptyEl) emptyEl.hidden = false;
    } else {
      if (emptyEl) emptyEl.hidden = true;
      linesEl.innerHTML = lines
        .map(
          (l) => `
        <div class="line-item" data-product-id="${l.id}">
          <div class="line-thumb">${lineThumb(l.product)}</div>
          <div class="line-info">
            <h5>${l.product.name}</h5>
            <div class="moq-note">MOQ ${l.product.moq} · ${money(l.product.price)} each</div>
            <div class="stepper">
              <button class="qty-btn" data-id="${l.id}" data-dir="-1" type="button">–</button>
              <span class="qty-val">${l.qty}</span>
              <button class="qty-btn" data-id="${l.id}" data-dir="1" type="button">+</button>
            </div>
          </div>
          <div class="line-price">${money(l.lineTotal)}</div>
        </div>`
        )
        .join('');
    }

    const { subtotal, marketTotal, saved } = totalsFromLines(lines);
    const marketNode = document.getElementById('marketTotal');
    const savedNode = document.getElementById('savedTotal');
    const yourTotalNode = document.getElementById('yourTotal');
    if (marketNode) marketNode.textContent = money(marketTotal);
    if (savedNode) savedNode.textContent = money(saved);
    if (yourTotalNode) yourTotalNode.textContent = money(subtotal);

    if (window.LashtribeCart) window.LashtribeCart.syncCartBadges();
  }

  document.addEventListener('click', (event) => {
    const btn = event.target.closest('.qty-btn[data-id]');
    if (!btn) return;
    const id = btn.dataset.id;
    const dir = parseInt(btn.dataset.dir, 10);
    const catalog = getCatalog();
    const product = catalog.products[id];
    if (!product) return;

    const cart = getCart();
    const minQty = Math.max(1, Number(product.moq) || 1);
    const nextQty = (Number(cart[id]) || 0) + dir;

    if (nextQty < minQty) {
      delete cart[id];
    } else {
      cart[id] = nextQty;
    }

    setCart(cart);
    renderDrawer();
    renderCheckoutSummary();
  });

  if (document.getElementById('drawerLines')) {
    renderDrawer();
  }

  // ---------- Checkout summary ----------
  function renderCheckoutSummary() {
    const itemsEl = document.getElementById('summaryItems');
    if (!itemsEl) return;

    const catalog = getCatalog();
    const lines = getCartLines(catalog);

    if (lines.length === 0) {
      itemsEl.innerHTML = '<p class="summary-empty">Your cart is empty. <a href="/ecommerce#shop">Browse products</a></p>';
    } else {
      itemsEl.innerHTML = lines
        .map(
          (l) => `
        <div class="summary-item">
          <div class="summary-thumb">${lineThumb(l.product)}</div>
          <div class="summary-info">
            <h3>${l.product.name}</h3>
            <small>Qty <span class="summary-qty">${l.qty}</span></small>
          </div>
          <div class="summary-price">${money(l.lineTotal)}</div>
        </div>`
        )
        .join('');
    }

    const { subtotal, saved, itemCount } = totalsFromLines(lines);
    const shipping = shippingState(catalog, subtotal);
    const total = subtotal; // shipping fee (when due) is confirmed separately, not added here

    const setText = (id, text) => {
      const node = document.getElementById(id);
      if (node) node.textContent = text;
    };

    setText('summaryCount', String(itemCount));
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

  if (document.getElementById('summaryItems')) {
    renderCheckoutSummary();

    const summaryToggle = document.querySelector('.summary-toggle');
    const summaryItemsWrap = document.getElementById('summaryItems');
    if (summaryToggle && summaryItemsWrap) {
      summaryToggle.addEventListener('click', () => {
        const isExpanded = summaryToggle.getAttribute('aria-expanded') === 'true';
        summaryToggle.setAttribute('aria-expanded', String(!isExpanded));
        summaryItemsWrap.classList.toggle('is-open', !isExpanded);
      });
    }
  }

  window.addEventListener('lashtribe:cart-updated', () => {
    renderDrawer();
    renderCheckoutSummary();
  });
})();
