(function () {
  const CART_KEY = 'lashtribe_cart';
  const FALLBACK_CART = { 1: 5, 2: 5 };

  function normalizeCart(cart) {
    const nextCart = { ...FALLBACK_CART };
    if (!cart || typeof cart !== 'object') return nextCart;

    for (const key of Object.keys(nextCart)) {
      const value = Number(cart[key]);
      nextCart[key] = Number.isFinite(value) && value > 0 ? Math.round(value) : nextCart[key];
    }

    return nextCart;
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
    return { ...FALLBACK_CART };
  }

  function setCart(cart) {
    const nextCart = normalizeCart(cart);
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(nextCart));
    } catch (error) {
      console.warn('Unable to save cart state to localStorage', error);
    }
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
    FALLBACK_CART,
    getCart,
    setCart,
    getCartCount,
    syncCartBadges,
    goToCheckout,
  };
})();
