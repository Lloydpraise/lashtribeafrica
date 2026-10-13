(function () {
  const CART_KEY = 'lashtribe_cart';
  const SEP = '|';
  const MAX_QTY = 100000;

  // Cart shape: { [lineKey]: quantity }
  //   lineKey = "<productId>"                         a product with no options (also every older cart)
  //   lineKey = "<productId>|Curl=C&Length=12mm"      a product with options chosen; names and values are
  //                                                   percent-encoded and sorted by name, so the same
  //                                                   choice always makes the same key
  // A line is one product + one combination of options. The price of a line (wholesale at or above the
  // product's minimum order quantity, retail below it) is worked out by the database, see cart-render.js.

  function makeKey(id, options) {
    const pairs = Object.entries(options || {})
      .map(([k, v]) => [String(k).trim(), String(v == null ? '' : v).trim()])
      .filter(([k, v]) => k && v)
      .sort((a, b) => (a[0].toLowerCase() < b[0].toLowerCase() ? -1 : a[0].toLowerCase() > b[0].toLowerCase() ? 1 : 0));
    if (!pairs.length) return String(id);
    return id + SEP + pairs.map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');
  }

  function parseKey(key) {
    const text = String(key);
    const at = text.indexOf(SEP);
    if (at === -1) return { id: text, options: {} };
    const options = {};
    text.slice(at + 1).split('&').forEach((pair) => {
      const eq = pair.indexOf('=');
      if (eq < 1) return;
      try {
        options[decodeURIComponent(pair.slice(0, eq))] = decodeURIComponent(pair.slice(eq + 1));
      } catch (error) { /* skip a damaged pair */ }
    });
    return { id: text.slice(0, at), options };
  }

  function normalizeCart(cart) {
    const next = {};
    if (!cart || typeof cart !== 'object') return next;

    for (const [key, rawQty] of Object.entries(cart)) {
      const { id } = parseKey(key);
      // Real product ids are never plain numbers. The old demo cart used "1" and "2"
      // for two made-up products; they can't be priced, so they are dropped.
      if (!id || /^\d+$/.test(id)) continue;
      const qty = Math.min(MAX_QTY, Math.round(Number(rawQty)));
      if (Number.isFinite(qty) && qty > 0) next[key] = qty;
    }

    return next;
  }

  function getCart() {
    try {
      const stored = JSON.parse(localStorage.getItem(CART_KEY) || 'null');
      if (stored && typeof stored === 'object') {
        return normalizeCart(stored);
      }
    } catch (error) {
      console.warn('Unable to read cart state from localStorage', error);
    }
    return {};
  }

  function setCart(cart) {
    const nextCart = normalizeCart(cart);
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(nextCart));
    } catch (error) {
      console.warn('Unable to save cart state to localStorage', error);
    }
    window.dispatchEvent(new CustomEvent('lashtribe:cart-updated', { detail: nextCart }));
    return nextCart;
  }

  /** Every line as { key, id, options, qty }, in the order they were added. */
  function getLines() {
    return Object.entries(getCart()).map(([key, qty]) => {
      const { id, options } = parseKey(key);
      return { key, id, options, qty };
    });
  }

  /**
   * Adds qty of a product (with its chosen options) to the cart. Adding the same product + options again
   * increases the existing line. Returns the new cart.
   */
  function add(id, qty, options) {
    const key = makeKey(id, options);
    const cart = getCart();
    const amount = Math.max(1, Math.round(Number(qty)) || 1);
    cart[key] = Math.min(MAX_QTY, (Number(cart[key]) || 0) + amount);
    const next = setCart(cart);
    syncCartBadges();
    return next;
  }

  function setQty(key, qty) {
    const cart = getCart();
    const n = Math.round(Number(qty));
    if (!Number.isFinite(n) || n < 1) delete cart[key];
    else cart[key] = Math.min(MAX_QTY, n);
    return setCart(cart);
  }

  function remove(key) {
    const cart = getCart();
    delete cart[key];
    return setCart(cart);
  }

  // The badge shows how many different products are in the cart, not how many
  // units or option combinations: 4 products at MOQ 5 is "4", never "20".
  function getCartCount() {
    return new Set(Object.keys(getCart()).map((key) => parseKey(key).id)).size;
  }

  function syncCartBadges() {
    const count = getCartCount();
    document.querySelectorAll('#cartCount, #cartMiniBadge, [data-cart-count]').forEach((node) => {
      if (node) node.textContent = String(count);
    });
  }

  function goToCheckout() {
    const target = '/ecommerce/checkout';
    if (window.location.pathname !== target) {
      window.location.href = target;
    }
  }

  window.LashtribeCart = {
    CART_KEY,
    makeKey,
    parseKey,
    getCart,
    setCart,
    getLines,
    add,
    setQty,
    remove,
    getCartCount,
    syncCartBadges,
    goToCheckout,
  };
})();
