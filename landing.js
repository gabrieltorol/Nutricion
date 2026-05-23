/* ============================================
   Landing Page — Plan Nutricional
   Registration & Auth
   ============================================ */

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

function goToPlan() {
  if (isLoggedIn()) {
    window.location.href = PLAN_PAGE_URL;
  } else {
    switchTab('register');
    openModal('auth-modal');
  }
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

// ===== NAV SCROLL =====
function handleScroll() {
  const nav = $('#nav');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 20);
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  updateUI();

  window.addEventListener('scroll', handleScroll);
  handleScroll();

  $('#mobile-toggle')?.addEventListener('click', () => {
    $('#mobile-menu')?.classList.toggle('open');
  });

  $$('#mobile-menu a').forEach(a => {
    a.addEventListener('click', () => {
      $('#mobile-menu')?.classList.remove('open');
    });
  });

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

  $('#modal-close')?.addEventListener('click', () => closeModal('auth-modal'));

  $$('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeAllModals();
    });
  });

  $$('.modal-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

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

  $('#btn-logout')?.addEventListener('click', logout);

  $('#btn-free')?.addEventListener('click', goToPlan);
  $('#btn-pro')?.addEventListener('click', goToPlan);
  $('#btn-cta')?.addEventListener('click', openRegister);

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
