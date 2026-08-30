(function () {
  const overlay = document.getElementById('overlay');
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  function showToast(msg){
    toastMsg.textContent = msg;
    toast.classList.add('show');
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  }

  // ---------- Auth tabs ----------
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => switchAuthTab(tab.dataset.tab));
  });
  document.querySelectorAll('[data-switch]').forEach(link => {
    link.addEventListener('click', (e) => { e.preventDefault(); switchAuthTab(link.dataset.switch); });
  });
  function switchAuthTab(name){
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    const panelSignin = document.getElementById('panelSignin');
    const panelCreate = document.getElementById('panelCreate');
    if (panelSignin) panelSignin.classList.toggle('active', name === 'signin');
    if (panelCreate) panelCreate.classList.toggle('active', name === 'create');
  }

  // ---------- Sign in / create account ----------
  const signinBtn = document.getElementById('signinBtn');
  const createBtn = document.getElementById('createBtn');
  const signOutBtn = document.getElementById('signOutBtn');
  const appShell = document.getElementById('appShell');
  const viewAuth = document.getElementById('viewAuth');
  const accountMenu = document.getElementById('accountMenu');

  if (signinBtn) signinBtn.addEventListener('click', () => enterApp(false, 'Amina'));
  if (createBtn) createBtn.addEventListener('click', () => {
    const name = document.getElementById('crName')?.value.trim() || 'there';
    enterApp(true, name);
  });
  if (signOutBtn) signOutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (appShell) appShell.style.display = 'none';
    if (viewAuth) viewAuth.style.display = 'flex';
    if (accountMenu) accountMenu.classList.remove('open');
  });

  function enterApp(isNew, name){
    if (viewAuth) viewAuth.style.display = 'none';
    if (appShell) appShell.style.display = 'block';
    const avatarInitial = document.getElementById('avatarInitial');
    const accountNameLabel = document.getElementById('accountNameLabel');
    const emptyName = document.getElementById('emptyName');
    const dashboardPopulated = document.getElementById('dashboardPopulated');
    const dashboardEmpty = document.getElementById('dashboardEmpty');

    if (avatarInitial) avatarInitial.textContent = name.charAt(0).toUpperCase();
    if (accountNameLabel) accountNameLabel.textContent = name.split(' ')[0];
    if (emptyName) emptyName.textContent = name.split(' ')[0];
    if (dashboardPopulated) dashboardPopulated.style.display = isNew ? 'none' : 'block';
    if (dashboardEmpty) dashboardEmpty.style.display = isNew ? 'block' : 'none';
    showDashboard();
  }

  // ---------- Account menu ----------
  const accountBtn = document.getElementById('accountBtn');
  if (accountBtn && accountMenu) {
    accountBtn.addEventListener('click', () => accountMenu.classList.toggle('open'));
    document.addEventListener('click', (e) => {
      if (!accountBtn.contains(e.target) && !accountMenu.contains(e.target)) accountMenu.classList.remove('open');
    });
  }

  // ---------- View switching ----------
  function showDashboard(){
    const viewDashboard = document.getElementById('viewDashboard');
    const viewPlayer = document.getElementById('viewPlayer');
    if (viewDashboard) viewDashboard.style.display = 'block';
    if (viewPlayer) viewPlayer.style.display = 'none';
    window.scrollTo(0, 0);
  }
  function showPlayer(){
    const viewDashboard = document.getElementById('viewDashboard');
    const viewPlayer = document.getElementById('viewPlayer');
    if (viewDashboard) viewDashboard.style.display = 'none';
    if (viewPlayer) viewPlayer.style.display = 'block';
    window.scrollTo(0, 0);
  }

  const continuePlayBtn = document.getElementById('continuePlayBtn');
  if (continuePlayBtn) continuePlayBtn.addEventListener('click', showPlayer);
  document.querySelectorAll('[data-open-player]').forEach(card => card.addEventListener('click', showPlayer));
  const backToDash = document.getElementById('backToDash');
  if (backToDash) backToDash.addEventListener('click', showDashboard);

  const nextModuleCard = document.getElementById('nextModuleCard');
  if (nextModuleCard) {
    nextModuleCard.addEventListener('click', () => {
      showToast('Finish Volume Lashing Fundamentals to unlock this module.');
    });
  }

  // ---------- Curriculum / player logic ----------
  const steps = [
    { title:'Welcome & Safety Basics', type:'lesson', transcript:'A quick safety and hygiene walkthrough before you touch a single lash.' },
    { title:'Prepping the Lash Bed', type:'lesson', transcript:'How to prep the client, the bed, and your tray so the whole set goes smoothly.' },
    { title:'Fan Formation Techniques', type:'lesson', transcript:"We're picking up in fan formation — the technique that gives volume sets their shape. Fan width and curl consistency matter more than speed here, so slow down and watch the base of every fan before you isolate." },
    { title:'Isolation Practice', type:'lesson', transcript:'Clean isolation is what separates a comfortable set from an itchy one. Practice on the mannequin before your next client.' },
    { title:'Assessment: Fan Formation Quiz', type:'assessment', transcript:'A short check on what you\'ve learned so far — five questions, no pressure.' },
    { title:'Your Certificate', type:'reward' }
  ];
  let currentStep = 2;
  const currList = document.getElementById('currList');

  function renderCurriculum(){
    if (!currList) return;
    currList.innerHTML = '';
    steps.forEach((step, i) => {
      const li = document.createElement('li');
      let cls = 'curr-step';
      if (step.type === 'assessment') cls += ' assessment';
      if (step.type === 'reward') cls += ' reward';
      if (i < currentStep) cls += ' done';
      else if (i === currentStep) cls += ' current';
      else cls += ' locked';
      li.className = cls;
      const icon = i < currentStep ? '✓' : (step.type === 'reward' ? '★' : (i+1));
      li.innerHTML = '<span class="curr-icon">' + icon + '</span><span>' + step.title + '</span>';
      if (i <= currentStep) li.addEventListener('click', () => jumpToStep(i));
      currList.appendChild(li);
    });
  }

  function jumpToStep(i){
    const step = steps[i];
    if (!step) return;
    const mainReward = document.getElementById('mainReward');
    const videoBox = document.getElementById('videoBox');
    const scrubFill = document.getElementById('scrubFill');
    const transcriptBox = document.getElementById('transcriptBox');
    const videoCaption = document.getElementById('videoCaption');
    const transcriptText = document.getElementById('transcriptText');
    const markCompleteBtn = document.getElementById('markCompleteBtn');
    const rewardPanel = document.getElementById('rewardPanel');

    if (step.type === 'reward'){
      if (videoBox) videoBox.style.display = 'none';
      if (scrubFill && scrubFill.parentElement) scrubFill.parentElement.style.display = 'none';
      if (transcriptBox) transcriptBox.style.display = 'none';
      if (mainReward) mainReward.style.display = 'block';
      if (rewardPanel) rewardPanel.style.display = 'block';
      if (markCompleteBtn) {
        markCompleteBtn.style.display = 'inline-block';
        markCompleteBtn.textContent = 'Claim Certificate';
      }
      return;
    }

    if (mainReward) mainReward.style.display = 'none';
    if (videoBox) videoBox.style.display = 'grid';
    if (scrubFill && scrubFill.parentElement) scrubFill.parentElement.style.display = 'block';
    if (transcriptBox) transcriptBox.style.display = 'block';
    if (videoCaption) videoCaption.textContent = step.title;
    if (transcriptText) transcriptText.textContent = step.transcript;
    if (markCompleteBtn) markCompleteBtn.style.display = (i === currentStep) ? 'inline-block' : 'none';
  }

  const markCompleteBtn = document.getElementById('markCompleteBtn');
  if (markCompleteBtn) {
    markCompleteBtn.addEventListener('click', () => {
      if (markCompleteBtn.textContent === 'Claim Certificate'){
        showToast('🎓 Certificate claimed — nice work!');
        burstConfetti();
        return;
      }
      if (currentStep < steps.length - 1){
        currentStep++;
        renderCurriculum();
        const justDone = currList && currList.children[currentStep - 1];
        if (justDone){
          const icon = justDone.querySelector('.curr-icon');
          if (icon) {
            icon.classList.add('pop');
            setTimeout(() => icon.classList.remove('pop'), 400);
          }
        }
        jumpToStep(currentStep);
        const scrubFill = document.getElementById('scrubFill');
        if (scrubFill) scrubFill.style.width = Math.round(((currentStep+1)/steps.length)*100) + '%';
        if (currentStep === steps.length - 1){
          jumpToStep(currentStep);
          burstConfetti();
        }
      }
    });
  }

  renderCurriculum();
  jumpToStep(currentStep);

  // ---------- Course checkout ----------
  const checkoutModal = document.getElementById('checkoutModal');
  let pendingCourseCard = null;

  document.querySelectorAll('.course-buy').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (btn.classList.contains('owned')) { showPlayer(); return; }
      pendingCourseCard = btn;
      const courseTitle = document.getElementById('coCourseTitle');
      const coursePrice = document.getElementById('coCoursePrice');
      const coTotal = document.getElementById('coTotal');
      if (courseTitle) courseTitle.textContent = btn.dataset.title;
      if (coursePrice) coursePrice.textContent = 'Ksh ' + parseInt(btn.dataset.price, 10).toLocaleString();
      if (coTotal) coTotal.textContent = 'Ksh ' + parseInt(btn.dataset.price, 10).toLocaleString();
      if (checkoutModal) checkoutModal.classList.add('open');
      if (overlay) overlay.classList.add('open');
    });
  });

  const checkoutClose = document.getElementById('checkoutClose');
  if (checkoutClose) checkoutClose.addEventListener('click', closeCheckout);
  if (overlay) overlay.addEventListener('click', closeCheckout);
  function closeCheckout(){
    if (checkoutModal) checkoutModal.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
  }

  const payCourseBtn = document.getElementById('payCourseBtn');
  if (payCourseBtn) {
    payCourseBtn.addEventListener('click', () => {
      if (pendingCourseCard) {
        pendingCourseCard.textContent = 'Start Course';
        pendingCourseCard.classList.add('owned');
        const card = pendingCourseCard.closest('.course-card');
        const lock = card?.querySelector('.module-lock');
        if (lock) lock.remove();
        card?.addEventListener('click', showPlayer);
      }
      closeCheckout();
      if (window.LashtribeCart) {
        window.LashtribeCart.goToCheckout();
        return;
      }
      window.location.href = '/ecommerce/checkout';
    });
  }

  // ---------- Scroll reveal ----------
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function observeReveals(){
    const els = document.querySelectorAll('.reveal:not(.in-view)');
    if (reduceMotion){ els.forEach(el => el.classList.add('in-view')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting){ entry.target.classList.add('in-view'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(el => io.observe(el));
  }
  observeReveals();

  // ---------- Shared cart badge ----------
  const cartMiniBadge = document.getElementById('cartMiniBadge');
  function syncSharedCartBadge(){
    if (!window.LashtribeCart) return;
    const count = window.LashtribeCart.getCartCount();
    if (cartMiniBadge) {
      cartMiniBadge.textContent = String(count);
      if (count > 0) cartMiniBadge.classList.add('bump');
      setTimeout(() => cartMiniBadge?.classList.remove('bump'), 250);
    }
  }

  function addToSharedCart(name, price){
    const cart = window.LashtribeCart ? window.LashtribeCart.getCart() : JSON.parse(localStorage.getItem('lashtribe_cart') || '{"1":5,"2":5}');
    const key = /fans/i.test(name) ? 1 : /adhesive/i.test(name) ? 2 : null;

    if (!key) {
      showToast('This item is ready for checkout in the shop.');
      return;
    }

    cart[key] = (Number(cart[key]) || 0) + 1;

    if (window.LashtribeCart) {
      window.LashtribeCart.setCart(cart);
      window.LashtribeCart.syncCartBadges();
    } else {
      localStorage.setItem('lashtribe_cart', JSON.stringify(cart));
    }

    syncSharedCartBadge();
    refreshAcademyCart();
    openAcademyCart();
    showToast('+ Added ' + name + ' to the cart — ready for checkout.');
  }

  if (cartMiniBadge) {
    syncSharedCartBadge();
  }

  document.querySelectorAll('.ps-add').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('added')) return;
      btn.classList.add('added');
      btn.textContent = '✓';
      addToSharedCart(btn.dataset.name, btn.dataset.price);
    });
  });
  const academyCartDrawer = document.getElementById('academyCartDrawer');
  const academyCartOverlay = document.getElementById('academyCartOverlay');
  const academyCartClose = document.getElementById('academyCartClose');
  const academyCartCheckout = document.getElementById('academyCartCheckout');

  function openAcademyCart(){
    if (academyCartDrawer) academyCartDrawer.classList.add('open');
    if (academyCartOverlay) academyCartOverlay.classList.add('open');
    if (window.LashtribeCart) {
      window.LashtribeCart.syncCartBadges();
    }
    refreshAcademyCart();
  }

  function closeAcademyCart(){
    if (academyCartDrawer) academyCartDrawer.classList.remove('open');
    if (academyCartOverlay) academyCartOverlay.classList.remove('open');
  }

  function refreshAcademyCart(){
    const cart = window.LashtribeCart ? window.LashtribeCart.getCart() : JSON.parse(localStorage.getItem('lashtribe_cart') || '{"1":5,"2":5}');
    const unitPrices = { 1: 1150, 2: 1600 };
    const marketPrices = { 1: 1800, 2: 2400 };
    let subtotal = 0;
    let marketTotal = 0;

    for (const line of [1, 2]) {
      const qty = Math.max(5, Number(cart[line] || 5));
      const lineTotal = unitPrices[line] * qty;
      const marketValue = marketPrices[line] * qty;
      subtotal += lineTotal;
      marketTotal += marketValue;

      const qtyNode = document.getElementById('academyQty' + line);
      const priceNode = document.getElementById('academyLineTotal' + line);
      if (qtyNode) qtyNode.textContent = String(qty);
      if (priceNode) priceNode.textContent = 'Ksh ' + lineTotal.toLocaleString();
    }

    const marketTotalNode = document.getElementById('academyMarketTotal');
    const savedTotalNode = document.getElementById('academySavedTotal');
    const yourTotalNode = document.getElementById('academyYourTotal');
    if (marketTotalNode) marketTotalNode.textContent = 'Ksh ' + marketTotal.toLocaleString();
    if (savedTotalNode) savedTotalNode.textContent = 'Ksh ' + (marketTotal - subtotal).toLocaleString();
    if (yourTotalNode) yourTotalNode.textContent = 'Ksh ' + subtotal.toLocaleString();
    syncSharedCartBadge();
  }

  document.querySelectorAll('.academy-qty-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const cart = window.LashtribeCart ? window.LashtribeCart.getCart() : JSON.parse(localStorage.getItem('lashtribe_cart') || '{"1":5,"2":5}');
      const line = Number(button.dataset.line || 0);
      const direction = Number(button.dataset.dir || 0);
      if (!line) return;

      cart[line] = Math.max(5, Number(cart[line] || 5) + direction);

      if (window.LashtribeCart) {
        window.LashtribeCart.setCart(cart);
        window.LashtribeCart.syncCartBadges();
      } else {
        localStorage.setItem('lashtribe_cart', JSON.stringify(cart));
      }

      refreshAcademyCart();
    });
  });

  const cartMiniBtn = document.getElementById('cartMiniBtn');
  if (cartMiniBtn) {
    cartMiniBtn.addEventListener('click', openAcademyCart);
  }
  if (academyCartClose) academyCartClose.addEventListener('click', closeAcademyCart);
  if (academyCartOverlay) academyCartOverlay.addEventListener('click', closeAcademyCart);
  if (academyCartCheckout) {
    academyCartCheckout.addEventListener('click', () => {
      closeAcademyCart();
      if (window.LashtribeCart) {
        window.LashtribeCart.goToCheckout();
        return;
      }
      window.location.href = '/ecommerce/checkout';
    });
  }
  refreshAcademyCart();

  // ---------- Confetti ----------
  function burstConfetti(){
    const colors = ['#C98A96', '#F3E4E7', '#222222', '#3F7A54'];
    for (let i = 0; i < 24; i++){
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + 'vw';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = (Math.random() * 0.4) + 's';
      piece.style.animationDuration = (1.8 + Math.random() * 1) + 's';
      document.body.appendChild(piece);
      setTimeout(() => piece.remove(), 3000);
    }
  }
})();
