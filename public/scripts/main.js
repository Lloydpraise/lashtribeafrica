(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // header shadow on scroll
  const header = document.getElementById('siteHeader');
  if (header) {
    window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 8));
  }

  // mobile nav
  const burger = document.getElementById('burgerBtn');
  const navLinks = document.getElementById('navLinks');
  if (burger && navLinks) {
    burger.addEventListener('click', (event) => {
      event.stopPropagation();
      navLinks.classList.toggle('open');
    });
  }

  // search panel
  const searchToggle = document.getElementById('searchToggle');
  const searchPanel = document.getElementById('searchPanel');
  if (searchToggle && searchPanel) {
    searchToggle.addEventListener('click', (event) => {
      event.stopPropagation();
      searchPanel.classList.toggle('open');
      if (searchPanel.classList.contains('open')) document.getElementById('searchInput')?.focus();
    });
  }

  // cart drawer
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('overlay');
  const cartOpen = document.getElementById('cartOpen');
  const drawerClose = document.getElementById('drawerClose');
  function closeDrawer(){
    if (drawer) drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
  }
  if (cartOpen && drawer && overlay) {
    cartOpen.addEventListener('click', () => { drawer.classList.add('open'); overlay.classList.add('open'); });
  }
  if (drawerClose) {
    drawerClose.addEventListener('click', closeDrawer);
  }
  if (overlay) {
    overlay.addEventListener('click', closeDrawer);
  }

  document.addEventListener('click', (event) => {
    const target = event.target;
    const clickedOnNav = navLinks && navLinks.contains(target);
    const clickedOnBurger = burger && burger.contains(target);
    const clickedOnSearchToggle = searchToggle && searchToggle.contains(target);
    const clickedOnSearchPanel = searchPanel && searchPanel.contains(target);
    const clickedOnCartButton = cartOpen && cartOpen.contains(target);
    const clickedOnCartDrawer = drawer && drawer.contains(target);
    const clickedOnOverlay = overlay && overlay.contains(target);

    if (navLinks && !clickedOnNav && !clickedOnBurger && navLinks.classList.contains('open')) {
      navLinks.classList.remove('open');
    }

    if (searchPanel && !clickedOnSearchToggle && !clickedOnSearchPanel && searchPanel.classList.contains('open')) {
      searchPanel.classList.remove('open');
    }

    if (drawer && !clickedOnCartButton && !clickedOnCartDrawer && !clickedOnOverlay && drawer.classList.contains('open')) {
      closeDrawer();
    }
  });

  // cadence fill
  const cadenceFill = document.getElementById('cadenceFill');
  if (cadenceFill) cadenceFill.style.width = '40%';

  // rotating hero headline using the exact three phrases requested
  const heroCycle = document.getElementById('heroCycle');
  if (heroCycle) {
    const heroPhrases = [
      'Direct Sourcing',
      'No Gatekeeping',
      'Unbeatable Prices'
    ];
    let heroPhraseIndex = 0;

    const rotateHeroPhrase = () => {
      heroCycle.style.opacity = '0';
      heroCycle.style.transform = 'translateY(10px)';

      setTimeout(() => {
        heroPhraseIndex = (heroPhraseIndex + 1) % heroPhrases.length;
        heroCycle.textContent = heroPhrases[heroPhraseIndex];
        heroCycle.style.opacity = '1';
        heroCycle.style.transform = 'translateY(0)';
      }, 180);
    };

    heroCycle.textContent = heroPhrases[0];
    heroCycle.classList.add('fade');

    if (!reduceMotion) {
      setInterval(rotateHeroPhrase, 2600);
    }
  }

  // cart math
  const unitPrices = { 1: 1150, 2: 1600 };
  const marketPrices = { 1: 1800, 2: 2400 };

  function getInitialCart(){
    return window.LashtribeCart ? window.LashtribeCart.getCart() : { 1: 5, 2: 5 };
  }

  const qty = getInitialCart();

  function persistCart(){
    if (window.LashtribeCart) {
      window.LashtribeCart.setCart(qty);
      window.LashtribeCart.syncCartBadges();
      return;
    }

    try {
      localStorage.setItem('lashtribe_cart', JSON.stringify(qty));
    } catch (error) {
      console.warn('Unable to save cart state to localStorage', error);
    }
  }

  function renderCart(){
    let market = 0, actual = 0;
    const totalItems = Object.values(qty).reduce((sum, value) => sum + Number(value || 0), 0);

    for (const line of [1,2]){
      const lineActual = unitPrices[line] * qty[line];
      const lineMarket = marketPrices[line] * qty[line];
      market += lineMarket; actual += lineActual;
      const qtyNode = document.getElementById('qty' + line);
      const lineNode = document.getElementById('lineTotal' + line);
      if (qtyNode) qtyNode.textContent = qty[line];
      if (lineNode) lineNode.textContent = 'Ksh ' + lineActual.toLocaleString();
    }
    const marketNode = document.getElementById('marketTotal');
    const yourTotalNode = document.getElementById('yourTotal');
    const savedNode = document.getElementById('savedTotal');
    const cartCountNodes = document.querySelectorAll('#cartCount, #cartMiniBadge');
    cartCountNodes.forEach((node) => {
      if (node) node.textContent = String(totalItems);
    });
    if (marketNode) marketNode.textContent = 'Ksh ' + market.toLocaleString();
    if (yourTotalNode) yourTotalNode.textContent = 'Ksh ' + actual.toLocaleString();
    if (savedNode) savedNode.textContent = 'Ksh ' + (market - actual).toLocaleString();
    persistCart();
  }

  const drawerCheckoutBtn = document.getElementById('drawerCheckoutBtn');
  if (drawerCheckoutBtn) {
    drawerCheckoutBtn.addEventListener('click', () => {
      closeDrawer();
      if (window.LashtribeCart) {
        window.LashtribeCart.goToCheckout();
        return;
      }
      window.location.href = '/ecommerce/checkout';
    });
  }

  document.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const line = btn.dataset.line;
      const dir = parseInt(btn.dataset.dir, 10);
      qty[line] = Math.max(5, qty[line] + dir);
      renderCart();
    });
  });

  if (document.getElementById('cartDrawer')) {
    renderCart();
  }

  // scroll reveal
  const revealEls = document.querySelectorAll('.reveal');
  if (reduceMotion){
    revealEls.forEach(el => el.classList.add('in-view'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting){
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(el => io.observe(el));
  }
})();
