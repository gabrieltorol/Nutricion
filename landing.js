/* ============================================
   Landing Page — Plan Nutricional
   Registration, Auth & Stripe Checkout
   ============================================ */

// ===== CONFIGURATION =====
// Replace with your Stripe Payment Link URL from Stripe Dashboard
const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/test_XXXXXXXXXX';
const PLAN_PAGE_URL = 'plan.html';
const AUTH_KEY = 'nutri-auth';
const USERS_KEY = 'nutri-users';

// ===== DOM HELPERS =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// ===== AUTH STATE =====
function getUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }
  catch { return []; }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY)); }
  catch { return null; }
}

function setCurrentUser(user) {
  if (user) localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  else localStorage.removeItem(AUTH_KEY);
}

function isLoggedIn() {
  return !!getCurrentUser();
}

// ===== TOAST =====
function showToast(message, type = 'success') {
  const existing = $('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'));
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ===== MODAL MANAGEMENT =====
function openModal(id) {
  const modal = $(`#${id}`);
  if (modal) modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  const modal = $(`#${id}`);
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
}

function closeAllModals() {
  $$('.modal-overlay').forEach(m => m.classList.remove('open'));
  document.body.style.overflow = '';
}

// ===== REGISTRATION =====
function register(name, email, password) {
  const users = getUsers();

  if (users.find(u => u.email === email)) {
    showToast('Ya existe una cuenta con ese correo', 'error');
    return false;
  }

  const user = {
    id: Date.now().toString(36),
    name,
    email,
    password,
    plan: 'free',
    createdAt: new Date().toISOString()
  };

  users.push(user);
  saveUsers(users);
  setCurrentUser({ id: user.id, name: user.name, email: user.email, plan: user.plan });
  return true;
}

function login(email, password) {
  const users = getUsers();
  const user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    showToast('Correo o contrasena incorrectos', 'error');
    return false;
  }

  setCurrentUser({ id: user.id, name: user.name, email: user.email, plan: user.plan });
  return true;
}

function logout() {
  setCurrentUser(null);
  updateUI();
  showToast('Sesion cerrada');
}

// ===== UI UPDATE =====
function updateUI() {
  const user = getCurrentUser();
  const userBar = $('#user-bar');
  const navActions = $('.nav-actions');

  if (user) {
    if (userBar) {
      userBar.style.display = 'flex';
      $('#user-display-name').textContent = user.name;
    }
    if (navActions) {
      navActions.innerHTML = `
        <a href="${PLAN_PAGE_URL}" class="btn-primary">Ir al plan</a>
      `;
    }
  } else {
    if (userBar) userBar.style.display = 'none';
    if (navActions) {
      navActions.innerHTML = `
        <button class="btn-ghost" id="btn-login">Iniciar sesion</button>
        <button class="btn-primary" id="btn-register">Registrarse</button>
      `;
      $('#btn-login')?.addEventListener('click', () => {
        switchTab('login');
        openModal('auth-modal');
      });
      $('#btn-register')?.addEventListener('click', () => {
        switchTab('register');
        openModal('auth-modal');
      });
    }
  }
}

// ===== TAB SWITCHING =====
function switchTab(tab) {
  $$('.modal-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  $('#form-register').style.display = tab === 'register' ? 'block' : 'none';
  $('#form-login').style.display = tab === 'login' ? 'block' : 'none';
}

// ===== STRIPE CHECKOUT =====
function openStripeCheckout() {
  if (!isLoggedIn()) {
    switchTab('register');
    openModal('auth-modal');
    showToast('Registrate primero para continuar', 'error');
    return;
  }
  openModal('checkout-modal');
}

function redirectToStripe() {
  const user = getCurrentUser();
  if (!user) return;

  // In production, this would create a Stripe Checkout Session via your backend
  // For now, redirect to a Stripe Payment Link
  const successUrl = encodeURIComponent(window.location.origin + '/' + PLAN_PAGE_URL + '?payment=success');
  const url = STRIPE_PAYMENT_LINK + '?prefilled_email=' + encodeURIComponent(user.email) + '&success_url=' + successUrl;

  // Mark payment as pending
  user.plan = 'pro';
  setCurrentUser(user);

  // Update users array
  const users = getUsers();
  const idx = users.findIndex(u => u.id === user.id);
  if (idx >= 0) {
    users[idx].plan = 'pro';
    saveUsers(users);
  }

  showToast('Redirigiendo a Stripe...');

  // Redirect after a short delay
  setTimeout(() => {
    window.location.href = url;
  }, 1000);
}

// ===== NAV SCROLL =====
function handleScroll() {
  const nav = $('#nav');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 20);
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  // Check for payment success from Stripe redirect
  const params = new URLSearchParams(window.location.search);
  if (params.get('payment') === 'success') {
    showToast('Pago exitoso! Ya puedes descargar tus planes');
    window.history.replaceState({}, '', window.location.pathname);
  }

  // Update UI based on auth state
  updateUI();

  // Nav scroll effect
  window.addEventListener('scroll', handleScroll);
  handleScroll();

  // Mobile menu
  $('#mobile-toggle')?.addEventListener('click', () => {
    $('#mobile-menu')?.classList.toggle('open');
  });

  // Close mobile menu on link click
  $$('#mobile-menu a').forEach(a => {
    a.addEventListener('click', () => {
      $('#mobile-menu')?.classList.remove('open');
    });
  });

  // Auth modal triggers
  const openRegister = () => { switchTab('register'); openModal('auth-modal'); };
  const openLogin = () => { switchTab('login'); openModal('auth-modal'); };

  $('#btn-login')?.addEventListener('click', openLogin);
  $('#btn-register')?.addEventListener('click', openRegister);
  $('#btn-login-mobile')?.addEventListener('click', () => {
    $('#mobile-menu')?.classList.remove('open');
    openLogin();
  });
  $('#btn-register-mobile')?.addEventListener('click', () => {
    $('#mobile-menu')?.classList.remove('open');
    openRegister();
  });

  // Close modals
  $('#modal-close')?.addEventListener('click', () => closeModal('auth-modal'));
  $('#checkout-close')?.addEventListener('click', () => closeModal('checkout-modal'));

  $$('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeAllModals();
    });
  });

  // Tab switching
  $$('.modal-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Registration form
  $('#form-register')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#reg-name').value.trim();
    const email = $('#reg-email').value.trim();
    const password = $('#reg-password').value;

    if (register(name, email, password)) {
      closeAllModals();
      showToast('Cuenta creada exitosamente!');
      updateUI();
      $('#form-register').reset();
    }
  });

  // Login form
  $('#form-login')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = $('#login-email').value.trim();
    const password = $('#login-password').value;

    if (login(email, password)) {
      closeAllModals();
      showToast('Bienvenido/a de vuelta!');
      updateUI();
      $('#form-login').reset();
    }
  });

  // Logout
  $('#btn-logout')?.addEventListener('click', logout);

  // Pricing buttons
  $('#btn-free')?.addEventListener('click', () => {
    if (isLoggedIn()) {
      window.location.href = PLAN_PAGE_URL;
    } else {
      openRegister();
    }
  });

  $('#btn-pro')?.addEventListener('click', () => {
    openStripeCheckout();
  });

  // CTA button
  $('#btn-cta')?.addEventListener('click', openRegister);

  // Stripe pay button
  $('#btn-stripe-pay')?.addEventListener('click', redirectToStripe);

  // Smooth scroll for anchor links
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
});
