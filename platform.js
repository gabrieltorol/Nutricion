/* ============================================
   platform.js — Shell + router + vistas
   Plataforma para nutricionistas
   ============================================ */

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

/* ---- guard de sesión ---- */
if (!Store.isLoggedIn()) {
  location.replace('index.html');
}

/* ---------- helpers de UI ---------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, m =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

const initials = (name) =>
  (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DOW = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const fmtDate = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

function toast(msg, type = 'success') {
  const wrap = $('#toast-wrap');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  wrap.appendChild(t);
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2800);
}

/* ---------- modal ---------- */
const modal = {
  open(html) {
    $('#modal-body').innerHTML = html;
    $('#modal').classList.add('open');
    document.body.style.overflow = 'hidden';
    const first = $('#modal-body input, #modal-body select, #modal-body textarea');
    if (first) setTimeout(() => first.focus(), 60);
  },
  close() {
    $('#modal').classList.remove('open');
    $('#modal-body').innerHTML = '';
    document.body.style.overflow = '';
  }
};
$('#modal-x').addEventListener('click', () => modal.close());
$('#modal').addEventListener('click', (e) => { if (e.target === $('#modal')) modal.close(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') modal.close(); });

/* ---------- sesión en sidebar ---------- */
function paintUser() {
  const u = Store.getCurrentUser() || {};
  $('#user-name').textContent = u.name || 'Nutricionista';
  $('#user-mail').textContent = u.email || '';
  $('#user-avatar').textContent = initials(u.name || 'N');
  if (u.name) $('#brand-name').textContent = u.name.split(' ')[0];
}
$('#btn-logout').addEventListener('click', () => {
  Store.logout();
  location.replace('index.html');
});

/* ---------- menú móvil ---------- */
$('#mobile-burger').addEventListener('click', () => document.body.classList.toggle('nav-open'));
$('#sidebar-backdrop').addEventListener('click', () => document.body.classList.remove('nav-open'));

/* ============================================
   ROUTER
   ============================================ */
function parseHash() {
  const raw = location.hash.replace(/^#/, '') || 'dashboard';
  const [route, param] = raw.split('/');
  return { route, param };
}

function render() {
  const { route, param } = parseHash();
  const view = $('#view');
  document.body.classList.remove('nav-open');

  // marcar link activo
  $$('.side-link[data-route]').forEach(a =>
    a.classList.toggle('active', a.dataset.route === route));

  switch (route) {
    case 'dashboard': view.innerHTML = viewDashboard(); break;
    case 'clientes':  view.innerHTML = viewClientes(); wireClientes(); break;
    case 'cliente':   view.innerHTML = viewCliente(param); wireCliente(param); break;
    case 'agenda':    view.innerHTML = viewAgenda(); wireAgenda(); break;
    default:          location.hash = '#dashboard'; return;
  }
  view.scrollTop = 0;
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', render);

/* ============================================
   VISTA: DASHBOARD
   ============================================ */
function viewDashboard() {
  const u = Store.getCurrentUser() || {};
  const clients = Store.getClients();
  const appts = Store.getAppointments();
  const today = todayStr();
  const todays = appts.filter(a => a.date === today && a.status !== 'cancelada');
  const upcoming = appts.filter(a => a.date >= today && a.status === 'pendiente').slice(0, 5);
  const withPlan = clients.filter(c => Store.hasPlan(c.id)).length;
  const hour = new Date().getHours();
  const saludo = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

  return `
    <div class="page-head">
      <div>
        <h1>${saludo}, ${esc((u.name || 'Nutricionista').split(' ')[0])}</h1>
        <div class="sub">Este es el resumen de tu consulta.</div>
      </div>
      <a href="#clientes" class="btn btn-primary"><svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>Nuevo cliente</a>
    </div>

    <div class="grid grid-stats" style="margin-bottom:26px;">
      <div class="card stat">
        <div class="stat-ico"><svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05C16.19 13.89 17 15 17 16.5V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg></div>
        <div class="stat-num">${clients.length}</div>
        <div class="stat-label">Clientes activos</div>
      </div>
      <div class="card stat">
        <div class="stat-ico sage"><svg viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z"/></svg></div>
        <div class="stat-num">${todays.length}</div>
        <div class="stat-label">Citas hoy</div>
      </div>
      <div class="card stat">
        <div class="stat-ico gold"><svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg></div>
        <div class="stat-num">${withPlan}</div>
        <div class="stat-label">Planes creados</div>
      </div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <div class="section-title">Citas de hoy</div>
        ${todays.length ? todays.map(apptRow).join('') : emptyInline('No tienes citas para hoy.')}
      </div>
      <div class="card">
        <div class="section-title">Próximas citas</div>
        ${upcoming.length ? upcoming.map(apptRow).join('') : emptyInline('Nada agendado todavía.')}
      </div>
    </div>
  `;
}

function apptRow(a) {
  const c = Store.getClient(a.clientId);
  return `
    <div class="appt-item">
      <span class="dot ${a.status}"></span>
      <span class="appt-time">${esc(a.time || '--:--')}</span>
      <div class="appt-body">
        <div class="t">${esc(a.title || (c ? c.name : 'Cita'))}</div>
        <div class="s">${c ? esc(c.name) + ' · ' : ''}${fmtDate(a.date)}</div>
      </div>
    </div>`;
}
const emptyInline = (txt) => `<p style="color:var(--ink-soft);padding:14px 2px;">${txt}</p>`;

/* ============================================
   VISTA: CLIENTES
   ============================================ */
function viewClientes() {
  return `
    <div class="page-head">
      <div><h1>Clientes</h1><div class="sub">Gestiona y haz seguimiento de cada persona.</div></div>
      <button class="btn btn-primary" id="btn-nuevo-cliente"><svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>Nuevo cliente</button>
    </div>
    <div class="toolbar-row">
      <div class="search">
        <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z"/></svg>
        <input type="text" id="client-search" placeholder="Buscar por nombre, correo u objetivo…">
      </div>
    </div>
    <div class="grid grid-cards" id="clients-grid"></div>
  `;
}

function clientCardHTML(c) {
  const plan = Store.hasPlan(c.id);
  const prog = Store.getProgress(c.id);
  const last = prog.length ? prog[prog.length - 1] : null;
  return `
    <div class="client-card" data-id="${c.id}">
      <div class="client-card-top">
        <div class="client-avatar">${initials(c.name)}</div>
        <div>
          <div class="client-name">${esc(c.name || 'Sin nombre')}</div>
          <div class="client-meta">${esc(c.goal || c.email || 'Sin objetivo definido')}</div>
        </div>
      </div>
      <div class="client-card-foot">
        ${c.age ? `<span class="chip muted">${esc(c.age)} años</span>` : ''}
        ${last && last.weight ? `<span class="chip sage">${esc(last.weight)} kg</span>` : ''}
        <span class="chip ${plan ? '' : 'muted'}">${plan ? 'Con plan' : 'Sin plan'}</span>
      </div>
    </div>`;
}

function renderClientsGrid(filter = '') {
  const grid = $('#clients-grid');
  if (!grid) return;
  let clients = Store.getClients();
  const f = filter.trim().toLowerCase();
  if (f) clients = clients.filter(c =>
    (c.name + ' ' + c.email + ' ' + c.goal).toLowerCase().includes(f));

  if (!clients.length) {
    grid.style.display = 'block';
    grid.innerHTML = emptyState(
      f ? 'Sin resultados' : 'Aún no tienes clientes',
      f ? 'Prueba con otra búsqueda.' : 'Crea tu primer cliente para empezar a hacer seguimiento.',
      f ? '' : 'btn-nuevo-cliente-2');
    const b = $('#btn-nuevo-cliente-2'); if (b) b.addEventListener('click', () => openClientForm());
    return;
  }
  grid.style.display = 'grid';
  grid.innerHTML = clients.map(clientCardHTML).join('');
  $$('.client-card', grid).forEach(card =>
    card.addEventListener('click', () => { location.hash = `#cliente/${card.dataset.id}`; }));
}

function emptyState(title, text, btnId) {
  return `<div class="empty card">
    <svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13z"/></svg>
    <h3>${title}</h3><p>${text}</p>
    ${btnId ? `<button class="btn btn-primary" id="${btnId}">Crear cliente</button>` : ''}
  </div>`;
}

function wireClientes() {
  renderClientsGrid();
  $('#btn-nuevo-cliente')?.addEventListener('click', () => openClientForm());
  $('#client-search')?.addEventListener('input', (e) => renderClientsGrid(e.target.value));
}

/* ---- formulario cliente (modal) ---- */
function openClientForm(existing) {
  const c = existing || {};
  modal.open(`
    <h2>${existing ? 'Editar cliente' : 'Nuevo cliente'}</h2>
    <div class="modal-sub">${existing ? 'Actualiza los datos del cliente.' : 'Completa los datos básicos. Podrás añadir progreso después.'}</div>
    <form id="client-form">
      <div class="form-grid">
        <div class="field-row full"><label>Nombre completo *</label><input name="name" required value="${esc(c.name)}" placeholder="Ej. María González"></div>
        <div class="field-row"><label>Correo</label><input name="email" type="email" value="${esc(c.email)}" placeholder="correo@ejemplo.com"></div>
        <div class="field-row"><label>Teléfono</label><input name="phone" value="${esc(c.phone)}" placeholder="+56 9 ..."></div>
        <div class="field-row"><label>Edad</label><input name="age" type="number" min="0" value="${esc(c.age)}" placeholder="años"></div>
        <div class="field-row"><label>Sexo</label>
          <select name="gender">
            <option value=""${!c.gender ? ' selected' : ''}>—</option>
            <option value="Femenino"${c.gender === 'Femenino' ? ' selected' : ''}>Femenino</option>
            <option value="Masculino"${c.gender === 'Masculino' ? ' selected' : ''}>Masculino</option>
            <option value="Otro"${c.gender === 'Otro' ? ' selected' : ''}>Otro</option>
          </select>
        </div>
        <div class="field-row"><label>Altura (cm)</label><input name="height" type="number" min="0" value="${esc(c.height)}" placeholder="cm"></div>
        <div class="field-row"><label>Objetivo</label><input name="goal" value="${esc(c.goal)}" placeholder="Ej. Bajar grasa, tonificar"></div>
        <div class="field-row full"><label>Notas</label><textarea name="notes" placeholder="Antecedentes, alergias, observaciones…">${esc(c.notes)}</textarea></div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" id="cf-cancel">Cancelar</button>
        <button type="submit" class="btn btn-primary">${existing ? 'Guardar cambios' : 'Crear cliente'}</button>
      </div>
    </form>
  `);
  $('#cf-cancel').addEventListener('click', () => modal.close());
  $('#client-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    if (!data.name.trim()) return;
    if (existing) data.id = existing.id;
    const saved = Store.saveClient(data);
    modal.close();
    toast(existing ? 'Cliente actualizado' : 'Cliente creado');
    if (parseHash().route === 'cliente') render();
    else renderClientsGrid($('#client-search')?.value || '');
  });
}

/* ============================================
   VISTA: FICHA DE CLIENTE
   ============================================ */
function viewCliente(id) {
  const c = Store.getClient(id);
  if (!c) return `<div class="empty card"><h3>Cliente no encontrado</h3><p>Puede que haya sido eliminado.</p><a href="#clientes" class="btn btn-primary">Volver a clientes</a></div>`;

  const prog = Store.getProgress(id);
  const plan = Store.hasPlan(id);
  const imc = (c.height && prog.length && prog[prog.length - 1].weight)
    ? (prog[prog.length - 1].weight / Math.pow(c.height / 100, 2)).toFixed(1) : null;

  return `
    <div class="crumb"><a href="#clientes">Clientes</a> › <span>${esc(c.name)}</span></div>
    <div class="page-head">
      <div class="profile-head">
        <div class="profile-avatar">${initials(c.name)}</div>
        <div>
          <h1 style="font-size:30px;">${esc(c.name)}</h1>
          <div class="sub">${esc(c.goal || 'Sin objetivo definido')}</div>
        </div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn btn-ghost btn-sm" id="btn-edit-client">Editar</button>
        <a class="btn btn-primary btn-sm" href="plan.html?cliente=${id}">
          <svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z"/></svg>
          ${plan ? 'Abrir plan' : 'Crear plan'}
        </a>
      </div>
    </div>

    <div class="grid grid-2" style="align-items:start;">
      <div style="display:flex;flex-direction:column;gap:18px;">
        <div class="card">
          <div class="section-title" style="font-size:19px;">Evolución de peso</div>
          <div id="chart-host">${progressChart(prog)}</div>
        </div>
        <div class="card">
          <div class="section-title" style="font-size:19px;">
            Registro de mediciones
            <button class="btn btn-soft btn-sm" id="btn-add-progress">+ Medición</button>
          </div>
          <div id="progress-table">${progressTable(prog)}</div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:18px;">
        <div class="card">
          <div class="section-title" style="font-size:19px;">Datos</div>
          <div class="info-grid">
            ${infoItem('Correo', c.email)}
            ${infoItem('Teléfono', c.phone)}
            ${infoItem('Edad', c.age ? c.age + ' años' : '')}
            ${infoItem('Sexo', c.gender)}
            ${infoItem('Altura', c.height ? c.height + ' cm' : '')}
            ${infoItem('IMC actual', imc)}
          </div>
        </div>
        ${c.notes ? `<div class="card"><div class="section-title" style="font-size:19px;">Notas</div><p style="color:var(--ink-soft);white-space:pre-wrap;">${esc(c.notes)}</p></div>` : ''}
        <div class="card">
          <div class="section-title" style="font-size:19px;">Acciones</div>
          <button class="btn btn-danger btn-sm" id="btn-del-client">Eliminar cliente</button>
        </div>
      </div>
    </div>
  `;
}

const infoItem = (k, v) => `<div class="info-item"><div class="k">${k}</div><div class="v">${v ? esc(v) : '—'}</div></div>`;

function progressTable(prog) {
  if (!prog.length) return emptyInline('Sin mediciones. Añade la primera para ver la evolución.');
  return `<div style="overflow-x:auto;"><table class="table">
    <thead><tr><th>Fecha</th><th>Peso</th><th>Cintura</th><th>Cadera</th><th>% Grasa</th><th></th></tr></thead>
    <tbody>
      ${prog.slice().reverse().map(e => `<tr data-pid="${e.id}">
        <td>${fmtDate(e.date)}</td>
        <td class="num">${e.weight ? esc(e.weight) + ' kg' : '—'}</td>
        <td class="num">${e.waist ? esc(e.waist) + ' cm' : '—'}</td>
        <td class="num">${e.hip ? esc(e.hip) + ' cm' : '—'}</td>
        <td class="num">${e.bodyfat ? esc(e.bodyfat) + ' %' : '—'}</td>
        <td style="text-align:right;"><button class="del-prog" data-pid="${e.id}" title="Eliminar" style="border:none;background:none;color:var(--ink-soft);cursor:pointer;font-size:16px;">×</button></td>
      </tr>`).join('')}
    </tbody>
  </table></div>`;
}

/* ---- gráfico SVG de peso ---- */
function progressChart(prog) {
  const pts = prog.filter(e => e.weight !== '' && e.weight != null).map(e => ({ date: e.date, w: parseFloat(e.weight) })).filter(p => !isNaN(p.w));
  if (pts.length < 2) return emptyInline('Necesitas al menos 2 mediciones de peso para ver el gráfico.');

  const W = 560, H = 220, padL = 38, padR = 16, padT = 16, padB = 28;
  const ws = pts.map(p => p.w);
  let min = Math.min(...ws), max = Math.max(...ws);
  if (min === max) { min -= 1; max += 1; }
  const range = max - min;
  min -= range * 0.12; max += range * 0.12;
  const x = (i) => padL + (i / (pts.length - 1)) * (W - padL - padR);
  const y = (w) => padT + (1 - (w - min) / (max - min)) * (H - padT - padB);

  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.w).toFixed(1)}`).join(' ');
  const area = `${line} L${x(pts.length - 1).toFixed(1)},${H - padB} L${padL},${H - padB} Z`;

  // grid horizontal (3 líneas)
  let grid = '';
  for (let g = 0; g <= 3; g++) {
    const val = min + (range + range * 0.24) * (g / 3);
    const yy = y(val);
    grid += `<line x1="${padL}" y1="${yy.toFixed(1)}" x2="${W - padR}" y2="${yy.toFixed(1)}" stroke="#F4DDE5" stroke-width="1"/>
             <text x="4" y="${(yy + 3).toFixed(1)}" font-size="9" fill="#6E5D62">${val.toFixed(1)}</text>`;
  }
  const dots = pts.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.w).toFixed(1)}" r="3.5" fill="#8E3B52"><title>${fmtDate(p.date)} · ${p.w} kg</title></circle>`).join('');

  return `<div class="chart-wrap"><svg class="chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
    <defs><linearGradient id="grad-w" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#C98AA0" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#C98AA0" stop-opacity="0"/>
    </linearGradient></defs>
    ${grid}
    <path d="${area}" fill="url(#grad-w)"/>
    <path d="${line}" fill="none" stroke="#8E3B52" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${dots}
  </svg>
  <div class="chart-legend"><span><i style="background:#8E3B52"></i> Peso (kg)</span>
  <span>De ${esc(pts[0].w)} kg a ${esc(pts[pts.length-1].w)} kg · ${pts[pts.length-1].w - pts[0].w >= 0 ? '+' : ''}${(pts[pts.length-1].w - pts[0].w).toFixed(1)} kg</span></div></div>`;
}

function wireCliente(id) {
  const c = Store.getClient(id);
  if (!c) return;
  $('#btn-edit-client')?.addEventListener('click', () => openClientForm(c));
  $('#btn-add-progress')?.addEventListener('click', () => openProgressForm(id));
  $('#btn-del-client')?.addEventListener('click', () => {
    if (confirm(`¿Eliminar a ${c.name}? Se borrarán su progreso y su plan. Esta acción no se puede deshacer.`)) {
      Store.deleteClient(id);
      toast('Cliente eliminado');
      location.hash = '#clientes';
    }
  });
  $$('.del-prog').forEach(b => b.addEventListener('click', () => {
    Store.deleteProgress(id, b.dataset.pid);
    refreshProgress(id);
  }));
}

function refreshProgress(id) {
  const prog = Store.getProgress(id);
  $('#progress-table').innerHTML = progressTable(prog);
  $('#chart-host').innerHTML = progressChart(prog);
  $$('.del-prog').forEach(b => b.addEventListener('click', () => {
    Store.deleteProgress(id, b.dataset.pid);
    refreshProgress(id);
  }));
}

function openProgressForm(id) {
  modal.open(`
    <h2>Nueva medición</h2>
    <div class="modal-sub">Registra el control de hoy para seguir la evolución.</div>
    <form id="prog-form">
      <div class="form-grid">
        <div class="field-row"><label>Fecha</label><input name="date" type="date" value="${todayStr()}" required></div>
        <div class="field-row"><label>Peso (kg)</label><input name="weight" type="number" step="0.1" min="0" placeholder="kg"></div>
        <div class="field-row"><label>Cintura (cm)</label><input name="waist" type="number" step="0.1" min="0" placeholder="cm"></div>
        <div class="field-row"><label>Cadera (cm)</label><input name="hip" type="number" step="0.1" min="0" placeholder="cm"></div>
        <div class="field-row"><label>% Grasa</label><input name="bodyfat" type="number" step="0.1" min="0" placeholder="%"></div>
        <div class="field-row full"><label>Notas</label><textarea name="notes" placeholder="Observaciones del control…"></textarea></div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" id="pf-cancel">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar medición</button>
      </div>
    </form>
  `);
  $('#pf-cancel').addEventListener('click', () => modal.close());
  $('#prog-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    Store.addProgress(id, data);
    modal.close();
    toast('Medición registrada');
    refreshProgress(id);
  });
}

/* ============================================
   VISTA: AGENDA
   ============================================ */
let calY, calM; // año/mes en vista (mes 0-11)

function viewAgenda() {
  const now = new Date();
  if (calY == null) { calY = now.getFullYear(); calM = now.getMonth(); }
  return `
    <div class="page-head">
      <div><h1>Agenda</h1><div class="sub">Tu calendario de citas y controles.</div></div>
      <button class="btn btn-primary" id="btn-nueva-cita"><svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>Nueva cita</button>
    </div>
    <div class="grid grid-2" style="align-items:start;">
      <div class="card">
        <div class="cal-head">
          <div class="cal-nav">
            <button id="cal-prev" aria-label="Anterior">‹</button>
            <div class="cal-title" id="cal-title"></div>
            <button id="cal-next" aria-label="Siguiente">›</button>
          </div>
          <button class="btn btn-soft btn-sm" id="cal-today">Hoy</button>
        </div>
        <div id="calendar-host"></div>
      </div>
      <div class="card">
        <div class="section-title" style="font-size:19px;" id="day-title">Próximas citas</div>
        <div id="day-list"></div>
      </div>
    </div>
  `;
}

function renderCalendar(selectedDay) {
  const host = $('#calendar-host');
  if (!host) return;
  $('#cal-title').textContent = `${MESES[calM]} ${calY}`;

  const first = new Date(calY, calM, 1);
  let startDow = (first.getDay() + 6) % 7; // lunes=0
  const daysInMonth = new Date(calY, calM + 1, 0).getDate();
  const appts = Store.getAppointments();
  const today = todayStr();

  let cells = DOW.map(d => `<div class="cal-dow">${d}</div>`).join('');
  for (let i = 0; i < startDow; i++) cells += `<div class="cal-cell empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${calY}-${String(calM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayAppts = appts.filter(a => a.date === ds);
    const evs = dayAppts.slice(0, 3).map(a => {
      const c = Store.getClient(a.clientId);
      return `<div class="cal-event ${a.status}">${esc(a.time ? a.time + ' ' : '')}${esc(a.title || (c ? c.name : 'Cita'))}</div>`;
    }).join('');
    const more = dayAppts.length > 3 ? `<div class="cal-event" style="background:transparent;color:var(--ink-soft);">+${dayAppts.length - 3} más</div>` : '';
    cells += `<div class="cal-cell ${ds === today ? 'today' : ''}" data-date="${ds}">
      <span class="cal-daynum">${d}</span>${evs}${more}</div>`;
  }
  host.innerHTML = `<div class="calendar">${cells}</div>`;
  $$('.cal-cell[data-date]', host).forEach(cell =>
    cell.addEventListener('click', () => renderDayList(cell.dataset.date)));

  renderDayList(selectedDay || today);
}

function renderDayList(ds) {
  const list = $('#day-list');
  const title = $('#day-title');
  if (!list) return;
  const appts = Store.getAppointmentsByDate(ds);
  title.textContent = ds === todayStr() ? 'Citas de hoy' : `Citas · ${fmtDate(ds)}`;

  if (!appts.length) {
    list.innerHTML = `${emptyInline('No hay citas este día.')}
      <button class="btn btn-soft btn-sm" id="day-add">+ Agendar en ${fmtDate(ds)}</button>`;
    $('#day-add')?.addEventListener('click', () => openApptForm(null, ds));
    return;
  }
  list.innerHTML = appts.map(a => {
    const c = Store.getClient(a.clientId);
    return `<div class="appt-item" data-aid="${a.id}" style="cursor:pointer;">
      <span class="dot ${a.status}"></span>
      <span class="appt-time">${esc(a.time || '--:--')}</span>
      <div class="appt-body">
        <div class="t">${esc(a.title || (c ? c.name : 'Cita'))}</div>
        <div class="s">${c ? esc(c.name) + ' · ' : ''}${esc(a.status)}${a.duration ? ' · ' + a.duration + ' min' : ''}</div>
      </div>
    </div>`;
  }).join('') + `<button class="btn btn-soft btn-sm" style="margin-top:12px;" id="day-add">+ Agendar en ${fmtDate(ds)}</button>`;
  $$('.appt-item[data-aid]', list).forEach(it =>
    it.addEventListener('click', () => {
      const a = Store.getAppointments().find(x => x.id === it.dataset.aid);
      if (a) openApptForm(a);
    }));
  $('#day-add')?.addEventListener('click', () => openApptForm(null, ds));
}

function wireAgenda() {
  renderCalendar();
  $('#btn-nueva-cita').addEventListener('click', () => openApptForm(null, todayStr()));
  $('#cal-prev').addEventListener('click', () => { calM--; if (calM < 0) { calM = 11; calY--; } renderCalendar(); });
  $('#cal-next').addEventListener('click', () => { calM++; if (calM > 11) { calM = 0; calY++; } renderCalendar(); });
  $('#cal-today').addEventListener('click', () => { const n = new Date(); calY = n.getFullYear(); calM = n.getMonth(); renderCalendar(todayStr()); });
}

function openApptForm(existing, presetDate) {
  const a = existing || {};
  const clients = Store.getClients();
  const opts = clients.map(c => `<option value="${c.id}"${a.clientId === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('');
  modal.open(`
    <h2>${existing ? 'Editar cita' : 'Nueva cita'}</h2>
    <div class="modal-sub">${existing ? 'Modifica o actualiza el estado de la cita.' : 'Agenda un control o primera consulta.'}</div>
    <form id="appt-form">
      <div class="form-grid">
        <div class="field-row full"><label>Cliente</label>
          <select name="clientId">
            <option value="">— Sin cliente / otro —</option>
            ${opts}
          </select>
        </div>
        <div class="field-row full"><label>Título / motivo</label><input name="title" value="${esc(a.title)}" placeholder="Ej. Control mensual, Primera consulta"></div>
        <div class="field-row"><label>Fecha *</label><input name="date" type="date" required value="${esc(a.date || presetDate || todayStr())}"></div>
        <div class="field-row"><label>Hora</label><input name="time" type="time" value="${esc(a.time)}"></div>
        <div class="field-row"><label>Duración (min)</label><input name="duration" type="number" min="0" step="15" value="${esc(a.duration ?? 60)}"></div>
        <div class="field-row"><label>Estado</label>
          <select name="status">
            <option value="pendiente"${a.status === 'pendiente' || !a.status ? ' selected' : ''}>Pendiente</option>
            <option value="realizada"${a.status === 'realizada' ? ' selected' : ''}>Realizada</option>
            <option value="cancelada"${a.status === 'cancelada' ? ' selected' : ''}>Cancelada</option>
          </select>
        </div>
        <div class="field-row full"><label>Notas</label><textarea name="notes" placeholder="Detalles de la cita…">${esc(a.notes)}</textarea></div>
      </div>
      <div class="form-actions">
        ${existing ? '<button type="button" class="btn btn-danger" id="af-del">Eliminar</button>' : ''}
        <button type="button" class="btn btn-ghost" id="af-cancel">Cancelar</button>
        <button type="submit" class="btn btn-primary">${existing ? 'Guardar' : 'Agendar'}</button>
      </div>
    </form>
  `);
  $('#af-cancel').addEventListener('click', () => modal.close());
  $('#af-del')?.addEventListener('click', () => {
    Store.deleteAppointment(existing.id);
    modal.close(); toast('Cita eliminada'); renderCalendar();
  });
  $('#appt-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    if (existing) data.id = existing.id;
    const saved = Store.saveAppointment(data);
    modal.close();
    toast(existing ? 'Cita actualizada' : 'Cita agendada');
    renderCalendar(saved.date);
  });
}

/* ============================================
   INIT
   ============================================ */
paintUser();
if (!location.hash) location.hash = '#dashboard';
render();
