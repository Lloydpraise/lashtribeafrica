(function () {
  const CART_KEY = 'lashtribe_cart';

  // Cart shape: { [productId]: quantity }. Any positive-quantity entry is
  // kept, regardless of key — this is a real product-id keyed cart, not
  // the old two-line demo.
  function normalizeCart(cart) {
    const next = {};
    if (!cart || typeof cart !== 'object') return next;

    for (const [id, rawQty] of Object.entries(cart)) {
      // Real product ids are never plain numbers. The old demo cart used "1" and "2"
      // for two made-up products; they can't be priced, so they are dropped.
      if (/^\d+$/.test(id)) continue;
      const qty = Math.round(Number(rawQty));
      if (Number.isFinite(qty) && qty > 0) next[id] = qty;
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

  // Pages that price the cart embed the product catalog; use it to ignore ids
  // that no longer exist (deleted products) so the badge matches what is listed.
  function knownProducts() {
    const node = document.getElementById('lashtribe-catalog');
    if (!node) return null;
    try {
      const catalog = JSON.parse(node.textContent || '{}');
      return catalog && catalog.products ? catalog.products : null;
    } catch (error) {
      return null;
    }
  }

  // The badge shows how many different products are in the cart, not how many
  // units: 4 products at MOQ 5 is "4", never "20".
  function getCartCount() {
    const ids = Object.keys(getCart());
    const known = knownProducts();
    return known ? ids.filter((id) => known[id]).length : ids.length;
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
    getCart,
    setCart,
    getCartCount,
    syncCartBadges,
    goToCheckout,
  };
})();
