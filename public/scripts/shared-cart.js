(function () {
  const CART_KEY = 'lashtribe_cart';

  // Cart shape: { [productId]: quantity }. Any positive-quantity entry is
  // kept, regardless of key — this is a real product-id keyed cart, not
  // the old two-line demo.
  function normalizeCart(cart) {
    const next = {};
    if (!cart || typeof cart !== 'object') return next;

    for (const [id, rawQty] of Object.entries(cart)) {
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

  function getCartCount() {
    return Object.values(getCart()).reduce((sum, value) => sum + Number(value || 0), 0);
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
