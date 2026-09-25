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

  // rotating hero headline — phrases come from Site Settings, passed in
  // via a data attribute so this script has no hardcoded copy in it.
  const heroCycle = document.getElementById('heroCycle');
  if (heroCycle) {
    let heroPhrases = [];
    try {
      heroPhrases = JSON.parse(heroCycle.dataset.phrases || '[]');
    } catch (error) {
      heroPhrases = [];
    }

    if (heroPhrases.length > 1) {
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

      heroCycle.classList.add('fade');

      if (!reduceMotion) {
        setInterval(rotateHeroPhrase, 2600);
      }
    }
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

  if (window.LashtribeCart) {
    window.LashtribeCart.syncCartBadges();
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
