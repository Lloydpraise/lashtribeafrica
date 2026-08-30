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
    document.getElementById('panelSignin').classList.toggle('active', name === 'signin');
    document.getElementById('panelCreate').classList.toggle('active', name === 'create');
  }

  // ---------- Sign in / create account (mock) ----------
  document.getElementById('signinBtn').addEventListener('click', () => enterApp(false, 'Amina'));
  document.getElementById('createBtn').addEventListener('click', () => {
    const name = document.getElementById('crName').value.trim() || 'there';
    enterApp(true, name);
  });
  document.getElementById('signOutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('appShell').style.display = 'none';
    document.getElementById('viewAuth').style.display = 'flex';
    document.getElementById('accountMenu').classList.remove('open');
  });

  function enterApp(isNew, name){
    document.getElementById('viewAuth').style.display = 'none';
    document.getElementById('appShell').style.display = 'block';
    document.getElementById('avatarInitial').textContent = name.charAt(0).toUpperCase();
    document.getElementById('accountNameLabel').textContent = name.split(' ')[0];
    document.getElementById('emptyName').textContent = name.split(' ')[0];
    document.getElementById('dashboardPopulated').style.display = isNew ? 'none' : 'block';
    document.getElementById('dashboardEmpty').style.display = isNew ? 'block' : 'none';
    showDashboard();
  }

  // ---------- Account menu ----------
  const accountBtn = document.getElementById('accountBtn');
  const accountMenu = document.getElementById('accountMenu');
  accountBtn.addEventListener('click', () => accountMenu.classList.toggle('open'));
  document.addEventListener('click', (e) => {
    if (!accountBtn.contains(e.target) && !accountMenu.contains(e.target)) accountMenu.classList.remove('open');
  });

  // ---------- View switching ----------
  function showDashboard(){
    document.getElementById('viewDashboard').style.display = 'block';
    document.getElementById('viewPlayer').style.display = 'none';
    window.scrollTo(0,0);
  }
  function showPlayer(){
    document.getElementById('viewDashboard').style.display = 'none';
    document.getElementById('viewPlayer').style.display = 'block';
    window.scrollTo(0,0);
  }
  document.getElementById('continuePlayBtn').addEventListener('click', showPlayer);
  document.querySelectorAll('[data-open-player]').forEach(card => card.addEventListener('click', showPlayer));
  document.getElementById('backToDash').addEventListener('click', showDashboard);

  // locked next-module card: hover shows tip (css); click also toasts (for touch devices)
  document.getElementById('nextModuleCard').addEventListener('click', () => {
    showToast('Finish Volume Lashing Fundamentals to unlock this module.');
  });

  // ---------- Curriculum / player logic ----------
  const steps = [
    { title:'Welcome & Safety Basics', type:'lesson', transcript:'A quick safety and hygiene walkthrough before you touch a single lash.' },
    { title:'Prepping the Lash Bed', type:'lesson', transcript:'How to prep the client, the bed, and your tray so the whole set goes smoothly.' },
    { title:'Fan Formation Techniques', type:'lesson', transcript:"We're picking up in fan formation — the technique that gives volume sets their shape. Fan width and curl consistency matter more than speed here, so slow down and watch the base of every fan before you isolate." },
    { title:'Isolation Practice', type:'lesson', transcript:'Clean isolation is what separates a comfortable set from an itchy one. Practice on the mannequin before your next client.' },
    { title:'Assessment: Fan Formation Quiz', type:'assessment', transcript:'A short check on what you\'ve learned so far — five questions, no pressure.' },
    { title:'Your Certificate', type:'reward' }
  ];
  let currentStep = 2; // Fan Formation Techniques, matching the dashboard's "Module 3 of 6"

  const currList = document.getElementById('currList');
  function renderCurriculum(){
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
    if (step.type === 'reward'){ renderReward(); return; }
    document.getElementById('mainReward').style.display = 'none';
    document.getElementById('videoBox').style.display = 'grid';
    document.getElementById('scrubFill').parentElement.style.display = 'block';
    document.getElementById('transcriptBox').style.display = 'block';
    document.getElementById('videoCaption').textContent = step.title;
    document.getElementById('transcriptText').textContent = step.transcript;
    document.getElementById('markCompleteBtn').style.display = (i === currentStep) ? 'inline-block' : 'none';
  }

  function renderReward(){
    document.getElementById('videoBox').style.display = 'none';
    document.getElementById('scrubFill').parentElement.style.display = 'none';
    document.getElementById('transcriptBox').style.display = 'none';
    document.getElementById('mainReward').style.display = 'block';
    document.getElementById('rewardPanel').style.display = 'block';
    const btn = document.getElementById('markCompleteBtn');
    btn.style.display = 'inline-block';
    btn.textContent = 'Claim Certificate';
  }

  document.getElementById('markCompleteBtn').addEventListener('click', () => {
    const btn = document.getElementById('markCompleteBtn');
    if (btn.textContent === 'Claim Certificate'){
      showToast('🎓 Certificate claimed — nice work!');
      burstConfetti();
      return;
    }
    if (currentStep < steps.length - 1){
      currentStep++;
      renderCurriculum();
      const justDone = currList.children[currentStep - 1];
      if (justDone){
        const icon = justDone.querySelector('.curr-icon');
        icon.classList.add('pop');
        setTimeout(() => icon.classList.remove('pop'), 400);
      }
      jumpToStep(currentStep);
      document.getElementById('scrubFill').style.width = Math.round(((currentStep+1)/steps.length)*100) + '%';
      if (currentStep === steps.length - 1){ renderReward(); burstConfetti(); }
    }
  });

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
      document.getElementById('coCourseTitle').textContent = btn.dataset.title;
      document.getElementById('coCoursePrice').textContent = 'Ksh ' + parseInt(btn.dataset.price,10).toLocaleString();
      document.getElementById('coTotal').textContent = 'Ksh ' + parseInt(btn.dataset.price,10).toLocaleString();
      checkoutModal.classList.add('open');
      overlay.classList.add('open');
    });
  });

  document.getElementById('checkoutClose').addEventListener('click', closeCheckout);
  overlay.addEventListener('click', closeCheckout);
  function closeCheckout(){
    checkoutModal.classList.remove('open');
    overlay.classList.remove('open');
  }

  document.getElementById('payCourseBtn').addEventListener('click', () => {
    if (pendingCourseCard){
      pendingCourseCard.textContent = 'Start Course';
      pendingCourseCard.classList.add('owned');
      const card = pendingCourseCard.closest('.course-card');
      const lock = card.querySelector('.module-lock');
      if (lock) lock.remove();
      card.addEventListener('click', showPlayer);
      showToast('🎉 ' + pendingCourseCard.dataset.title + ' unlocked — happy learning!');
    }
    closeCheckout();
  });
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

  // ---------- Shared cart badge (syncs with the shop via localStorage) ----------
  const cartMiniBadge = document.getElementById('cartMiniBadge');
  let sharedCartCount = parseInt(localStorage.getItem('lashtribe_shared_cart_count') || '0', 10);
  cartMiniBadge.textContent = sharedCartCount;
  function addToSharedCart(name, price){
    sharedCartCount++;
    localStorage.setItem('lashtribe_shared_cart_count', sharedCartCount);
    cartMiniBadge.textContent = sharedCartCount;
    cartMiniBadge.classList.add('bump');
    setTimeout(() => cartMiniBadge.classList.remove('bump'), 250);
    showToast('+ Added ' + name + ' to cart — it\'ll be waiting in the shop.');
  }
  document.querySelectorAll('.ps-add').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('added')) return;
      btn.classList.add('added');
      btn.textContent = '✓';
      addToSharedCart(btn.dataset.name, btn.dataset.price);
    });
  });
  document.getElementById('cartMiniBtn').addEventListener('click', () => {
    showToast('Cart lives on the shop — head over to check out.');
  });

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
