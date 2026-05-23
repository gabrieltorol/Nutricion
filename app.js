/* ============================================
   Plan Nutricional — fórmulas + gráfico
   ============================================ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const num = (v) => {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
const fmt = (n, d = 1) => {
  if (!Number.isFinite(n) || n === 0) return '—';
  return n.toFixed(d).replace('.', ',');
};
const fmtInt = (n) => (!Number.isFinite(n) || n === 0) ? '—' : Math.round(n).toLocaleString('es-CL');

/* ---------- Global state ---------- */
let GENDER = 'F'; // 'F' or 'M'
let BODY_MODE = 'pliegues'; // 'pliegues' or 'bia'

function setBodyMode(mode) {
  BODY_MODE = mode;
  document.body.dataset.bodymode = mode;
  $$('.mode-toggle button').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  calcAll();
  saveState();
}

function setGender(g) {
  GENDER = g;
  $$('.gender-toggle button').forEach(b => b.classList.toggle('active', b.dataset.g === g));
  $$('[data-bind="gender"]').forEach(el => el.textContent = g === 'F' ? 'Mujer' : 'Hombre');
  // Swap formula tags shown in pro view
  $$('[data-formula-f]').forEach(el => {
    el.textContent = g === 'F' ? el.dataset.formulaF : el.dataset.formulaM;
  });
  calcAll();
  saveState();
}

/* ---------- Sync patient name + date ---------- */
function syncIdentity() {
  const name = ($('#patient-name')?.value || '').trim() || '—';
  const date = ($('#patient-date')?.value || '').trim() || '—';
  $$('[data-bind="name"]').forEach(el => el.textContent = name);
  $$('[data-bind="date"]').forEach(el => el.textContent = date);
}

/* ---------- IMC + body comp ---------- */
function calcIMC() {
  const peso  = num($('#in-peso').value);
  const talla = num($('#in-talla').value); // metros

  const imc = (peso && talla) ? peso / (talla * talla) : 0;
  $('#out-imc').value = imc ? fmt(imc, 1) : '';

  // No clinical labels (no "obesidad", "sobrepeso") to avoid TCA triggers.
  $('#imc-interpret').textContent = '';

  const cardImc = $('#card-imc'); if (cardImc) cardImc.textContent = imc ? fmt(imc, 1) : '—';
  const cardImcI = $('#card-imc-i'); if (cardImcI) cardImcI.textContent = imc ? 'kg/m²' : '—';
}

/* ---------- Skinfolds — Yuhasz ----------
   Mujer: %G = (Σ6 × 0,1429) + 4,56
   Hombre: %G = (Σ6 × 0,1051) + 2,585
---------------------------------------- */
const PLIEGUES_IDS = ['tri', 'sub', 'sup', 'abd', 'mus', 'pie'];
function calcGrasa() {
  let suma = 0;
  PLIEGUES_IDS.forEach(id => suma += num($('#pl-' + id).value));
  $('#pl-suma').textContent = suma ? fmt(suma, 1) + ' mm' : '— mm';

  const grasaPct = suma
    ? (GENDER === 'F' ? suma * 0.1429 + 4.56 : suma * 0.1051 + 2.585)
    : 0;
  $('#out-grasa').value = grasaPct ? fmt(grasaPct, 1) : '';

  const peso = num($('#in-peso').value);
  const masaGrasa = peso && grasaPct ? peso * grasaPct / 100 : 0;
  const masaMagra = peso ? peso - masaGrasa : 0;
  $('#out-masa-grasa').textContent = masaGrasa ? fmt(masaGrasa, 1) + ' kg' : '— kg';
  $('#out-masa-magra').textContent = masaMagra ? fmt(masaMagra, 1) + ' kg' : '— kg';

  // No labels — just show numerical value
  $('#grasa-interpret').textContent = '';

  const cardG = $('#card-grasa'); if (cardG) cardG.textContent = grasaPct ? fmt(grasaPct,1) : '—';
  const cardGI = $('#card-grasa-i'); if (cardGI) cardGI.textContent = '';
  const cardM = $('#card-magra'); if (cardM) cardM.textContent = masaMagra ? fmt(masaMagra,1) : '—';
}

/* ---------- Waist-Hip Ratio ----------
   Mujer riesgo: <0.80 bajo, 0.80-0.85 mod, >0.85 alto
   Hombre riesgo: <0.90 bajo, 0.90-0.95 mod, >0.95 alto
---------------------------------------- */
function calcICC() {
  const cin = num($('#cir-cin').value);
  const cad = num($('#cir-cad').value);
  const icc = (cin && cad) ? cin / cad : 0;
  $('#out-icc').value = icc ? fmt(icc, 2) : '';

  // No risk labels — only numerical value
  $('#icc-interpret').textContent = '';

  const cardIcc = $('#card-icc'); if (cardIcc) cardIcc.textContent = icc ? fmt(icc,2) : '—';
  const cardIccI = $('#card-icc-i'); if (cardIccI) cardIccI.textContent = '';
}

/* ---------- TMB & GET — Mifflin-St Jeor ----------
   Hombre: 10·P + 6,25·T(cm) − 5·E + 5
   Mujer:  10·P + 6,25·T(cm) − 5·E − 161
   GET = TMB × Factor NEAT
   Macros: 3 objetivos (mantención, aumento, pérdida)
---------------------------------------- */
function calcRequerimientos() {
  const peso  = num($('#in-peso').value);
  const tallaM = num($('#in-talla').value);
  const tallaCm = tallaM * 100;
  const edad  = num($('#in-edad').value);
  const factor = parseFloat($('#in-actividad').value || '1.55');

  const offset = GENDER === 'F' ? -161 : 5;
  const tmb = (peso && tallaCm && edad) ? 10*peso + 6.25*tallaCm - 5*edad + offset : 0;
  $('#out-tmb').textContent = tmb ? fmtInt(tmb) : '—';

  const get = tmb * factor;
  $('#out-get').textContent = get ? fmtInt(get) : '—';

  /* --- Macros for 3 objectives, Excel-style --- */
  const cards = [
    { id: 'mant', kcal: get,         protKey: 'mant-prot', graKey: 'mant-gra' },
    { id: 'plus', kcal: get + num($('#in-plus').value),  protKey: 'plus-prot', graKey: 'plus-gra' },
    { id: 'def',  kcal: get - num($('#in-def').value),   protKey: 'def-prot',  graKey: 'def-gra'  },
  ];

  cards.forEach(c => {
    const protGkg = num($('#in-' + c.protKey).value);
    const graGkg  = num($('#in-' + c.graKey).value);
    const protG = protGkg * peso;
    const protKcal = protG * 4;
    const graG = graGkg * peso;
    const graKcal = graG * 9;
    const choKcal = c.kcal - protKcal - graKcal;
    const choG = choKcal / 4;
    const totalKcal = protKcal + graKcal + choKcal;

    set('#o-' + c.id + '-kcal', c.kcal > 0 ? fmtInt(c.kcal) : '—');
    set('#o-' + c.id + '-prot-g', protG ? fmt(protG, 0) + ' g' : '— g');
    set('#o-' + c.id + '-prot-kcal', protKcal ? fmtInt(protKcal) : '—');
    set('#o-' + c.id + '-gra-g',  graG ? fmt(graG, 0) + ' g' : '— g');
    set('#o-' + c.id + '-gra-kcal', graKcal ? fmtInt(graKcal) : '—');
    set('#o-' + c.id + '-cho-g',  choG > 0 ? fmt(choG, 0) + ' g' : '— g');
    set('#o-' + c.id + '-cho-kcal', choKcal > 0 ? fmtInt(choKcal) : '—');
    set('#o-' + c.id + '-tot', totalKcal > 0 ? fmtInt(totalKcal) : '—');

    if (c.kcal > 0) {
      const pP = Math.max(0, Math.min(100, protKcal/c.kcal*100));
      const pC = Math.max(0, Math.min(100, choKcal/c.kcal*100));
      const pG = Math.max(0, Math.min(100, graKcal/c.kcal*100));
      setBar('#bar-' + c.id + '-prot', pP);
      setBar('#bar-' + c.id + '-cho',  pC);
      setBar('#bar-' + c.id + '-gra',  pG);
    }
  });
}

const set = (sel, val) => { const el = $(sel); if (el) el.textContent = val; };
const setBar = (sel, pct) => { const el = $(sel); if (el) { el.style.width = pct + '%'; el.textContent = Math.round(pct) + '%'; } };

/* ---------- Distribución totals ---------- */
function calcDistribucion() {
  // Discover all columns currently in the table (data-col on thead cells)
  const cols = $$('#dist-table thead th[data-col]').map(th => th.dataset.col);
  cols.forEach(col => {
    let sum = 0;
    $$(`#dist-table tbody input[data-dist="${col}"]`).forEach(inp => sum += num(inp.value));
    const tot = $(`#dist-table tfoot td[data-col="${col}"]`);
    if (tot) tot.textContent = sum || '';
  });
}

/* ---------- Bioimpedance ---------- */
function calcBIA() {
  const grasa = num($('#bia-grasa')?.value);
  const musc  = num($('#bia-musc')?.value);
  const visc  = num($('#bia-visc')?.value);

  // No labels (no "sobre rango" etc) — just show numerical values
  set('#bia-grasa-i', '');
  set('#bia-visc-i', '');
  set('#bia-card-grasa', grasa ? fmt(grasa,1) : '—');
  set('#bia-card-grasa-i', '');
  set('#bia-card-musc',  musc  ? fmt(musc,1) + ' kg' : '— kg');
  set('#bia-card-visc',  visc  ? fmt(visc,0) : '—');
  set('#bia-card-visc-i', '');

  if (BODY_MODE === 'bia') {
    const peso = num($('#in-peso').value);
    const masaMagra = peso && grasa ? peso * (1 - grasa/100) : (musc || 0);
    const cardG  = $('#card-grasa');  if (cardG)  cardG.textContent  = grasa ? fmt(grasa,1) : '—';
    const cardGI = $('#card-grasa-i'); if (cardGI) cardGI.textContent = '';
    const cardM  = $('#card-magra');  if (cardM)  cardM.textContent  = masaMagra ? fmt(masaMagra,1) : '—';
  }
}

/* ---------- Run all ---------- */
function calcAll() {
  calcIMC();
  calcGrasa();
  calcICC();
  calcBIA();
  calcRequerimientos();
  calcDistribucion();
  renderChart();
}

/* ============================================
   EVOLUTION CHART
   ============================================ */
const CHART_SERIES = [
  { key: 'peso',  label: 'Peso (kg)',     color: '#8E3B52', max: 150 },
  { key: 'grasa', label: '% Grasa',       color: '#C98AA0', max: 50  },
  { key: 'tri',   label: 'Tríceps (mm)',  color: '#6E8267', max: 60  },
  { key: 'sub',   label: 'Subescapular',  color: '#A8B89E', max: 60  },
  { key: 'sup',   label: 'Supraespinal',  color: '#B7945A', max: 60  },
  { key: 'abd',   label: 'Abdominal',     color: '#D97757', max: 60  },
  { key: 'mus',   label: 'Muslo',         color: '#7E6A91', max: 60  },
  { key: 'pie',   label: 'Pierna',        color: '#5C8A9A', max: 60  },
];

let CHART_ACTIVE = new Set(['peso', 'grasa']);

function getEvoData() {
  const months = [];
  $$('#evo-table thead th[data-month]').forEach(th => {
    const inp = th.querySelector('input');
    months.push(inp ? (inp.value.trim() || th.dataset.month) : th.dataset.month);
  });
  const rows = {};
  CHART_SERIES.forEach(s => {
    rows[s.key] = [];
    for (let i = 0; i < months.length; i++) {
      const inp = $(`#evo-${s.key}-${i}`);
      rows[s.key].push(inp ? num(inp.value) : 0);
    }
  });
  return { months, rows };
}

function renderChart() {
  const svg = $('#evo-chart');
  if (!svg) return;

  const { months, rows } = getEvoData();
  const W = 720, H = 260, padL = 40, padR = 18, padT = 18, padB = 36;
  const plotW = W - padL - padR, plotH = H - padT - padB;

  // Determine y-range based on active series
  const allVals = [];
  CHART_ACTIVE.forEach(k => rows[k].forEach(v => { if (v > 0) allVals.push(v); }));

  let yMin = 0, yMax = 100;
  if (allVals.length) {
    yMin = Math.min(...allVals);
    yMax = Math.max(...allVals);
    const pad = (yMax - yMin) * 0.15 || 5;
    yMin = Math.max(0, yMin - pad);
    yMax = yMax + pad;
  }

  const xStep = months.length > 1 ? plotW / (months.length - 1) : 0;
  const yScale = v => padT + plotH - ((v - yMin) / (yMax - yMin || 1)) * plotH;
  const xScale = i => padL + xStep * i;

  let html = '';

  // Grid + Y labels
  for (let i = 0; i <= 4; i++) {
    const y = padT + (plotH / 4) * i;
    const val = yMax - ((yMax - yMin) / 4) * i;
    html += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#E4D3CC" stroke-dasharray="2,3"/>`;
    html += `<text x="${padL - 6}" y="${y + 4}" font-size="9" fill="#6E5D62" font-family="Karla" text-anchor="end">${val.toFixed(1)}</text>`;
  }

  // X labels
  months.forEach((m, i) => {
    const x = xScale(i);
    html += `<line x1="${x}" y1="${padT + plotH}" x2="${x}" y2="${padT + plotH + 4}" stroke="#C98AA0"/>`;
    html += `<text x="${x}" y="${padT + plotH + 18}" font-size="9" fill="#6E5D62" font-family="Karla" text-anchor="middle" letter-spacing="1">${m.toUpperCase()}</text>`;
  });

  // Series
  CHART_SERIES.forEach(s => {
    if (!CHART_ACTIVE.has(s.key)) return;
    const vals = rows[s.key];
    const pts = vals.map((v, i) => v > 0 ? [xScale(i), yScale(v)] : null);

    // Path: connect non-null consecutive
    let path = '', open = false;
    pts.forEach(p => {
      if (!p) { open = false; return; }
      path += (open ? ' L ' : ' M ') + p[0].toFixed(1) + ' ' + p[1].toFixed(1);
      open = true;
    });
    if (path) html += `<path d="${path}" fill="none" stroke="${s.color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;

    // Dots + labels
    pts.forEach((p, i) => {
      if (!p) return;
      html += `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="#fff" stroke="${s.color}" stroke-width="1.8"/>`;
      html += `<text x="${p[0]}" y="${p[1] - 8}" font-size="8.5" fill="${s.color}" font-family="Karla" text-anchor="middle" font-weight="600">${vals[i].toString().replace('.', ',')}</text>`;
    });
  });

  // No-data hint
  if (!allVals.length) {
    html += `<text x="${W/2}" y="${H/2}" font-size="13" fill="#C98AA0" font-family="Cormorant Garamond" font-style="italic" text-anchor="middle">Ingresa mediciones mensuales para ver la evolución</text>`;
  }

  svg.innerHTML = html;
}

function toggleSeries(key) {
  if (CHART_ACTIVE.has(key)) CHART_ACTIVE.delete(key);
  else CHART_ACTIVE.add(key);
  $$('#chart-controls .chip').forEach(c => c.classList.toggle('on', CHART_ACTIVE.has(c.dataset.k)));
  renderChart();
  saveState();
}

/* ============================================
   SETTINGS (template, brand, sections, logo)
   ============================================ */
const TOGGLEABLE_SECTIONS = ['objetivos', 'grupos', 'distribucion', 'ejemplos', 'tips'];

let TEMPLATE = 'rose';       // 'rose' | 'tierra'
let BRAND_NAME = 'Angélica Pinilla';
let BRAND_TITLE = 'Nutricionista';
let CUSTOM_LOGO = null;      // dataURL or null = use original
const ORIGINAL_LOGO = 'assets/logo-angelica.png';
const SECTIONS_ON = {};
TOGGLEABLE_SECTIONS.forEach(s => SECTIONS_ON[s] = true);

function applyTemplate(name) {
  TEMPLATE = name;
  document.body.classList.toggle('template-tierra', name === 'tierra');
  document.body.classList.toggle('template-rose', name === 'rose');
}

function applyBrand() {
  $$('[data-bind="brandName"]').forEach(el => el.textContent = BRAND_NAME);
  $$('[data-bind="brandTitle"]').forEach(el => el.textContent = BRAND_TITLE);
}

function applyLogo() {
  const src = CUSTOM_LOGO || ORIGINAL_LOGO;
  $$('.brand-logo').forEach(img => img.src = src);
  const prev = $('#sp-logo-preview');
  if (prev) prev.src = src;
}

function applySections() {
  TOGGLEABLE_SECTIONS.forEach(key => {
    document.body.classList.toggle('no-section-' + key, !SECTIONS_ON[key]);
  });
  // Hide pages whose all .section-block children are off
  $$('.page').forEach(p => {
    const blocks = p.querySelectorAll('.section-block');
    if (blocks.length === 0) { p.classList.remove('page-empty'); return; }
    const anyOn = Array.from(blocks).some(b => SECTIONS_ON[b.dataset.section] !== false);
    p.classList.toggle('page-empty', !anyOn);
  });
}

function setSection(key, on) {
  SECTIONS_ON[key] = !!on;
  applySections();
  saveState();
}

function setBrand(name, title) {
  if (name !== undefined) BRAND_NAME = name || 'Nutricionista';
  if (title !== undefined) BRAND_TITLE = title || '';
  applyBrand();
  saveState();
}

function setCustomLogo(dataUrl) {
  CUSTOM_LOGO = dataUrl || null;
  applyLogo();
  saveState();
}

/* ============================================
   EDITABLE LISTS (objectives + meal rows)
   ============================================ */
function attachDeleteBtn(item, onRemove) {
  if (item.querySelector(':scope > .row-delete')) return;
  const btn = document.createElement('button');
  btn.className = 'row-delete';
  btn.type = 'button';
  btn.title = 'Eliminar';
  btn.innerHTML = '×';
  // Crucial: contenteditable="false" prevents the parent's contenteditable
  // from hijacking clicks on this button.
  btn.setAttribute('contenteditable', 'false');
  // mousedown fires earlier than click and avoids contenteditable focus shift
  btn.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    e.preventDefault();
    item.remove();
    if (onRemove) onRemove();
    saveStructure();
  });
  item.appendChild(btn);
}

function addObjective() {
  const ul = $('#objectives-list');
  if (!ul) return;
  const li = document.createElement('li');
  const span = document.createElement('span');
  span.setAttribute('contenteditable', 'true');
  span.className = 'editable';
  span.textContent = 'Nuevo objetivo…';
  li.appendChild(span);
  ul.appendChild(li);
  attachDeleteBtn(li);
  span.focus();
  // Select only the span text (not the button which is a sibling)
  const range = document.createRange();
  range.selectNodeContents(span);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  saveStructure();
}

function addMealRow(col) {
  const row = document.createElement('div');
  row.className = 'meal-row';
  row.innerHTML = `
    <div class="time" contenteditable="true">Comida · hora</div>
    <div class="desc" contenteditable="true">Descripción de la comida…</div>
  `;
  const addBtn = col.querySelector('.add-meal-btn');
  col.insertBefore(row, addBtn);
  attachDeleteBtn(row);
  const desc = row.querySelector('.desc');
  desc.focus();
  const range = document.createRange();
  range.selectNodeContents(desc);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  saveStructure();
}

function initEditableLists() {
  // Migrate legacy <li contenteditable="true" data-k="obj-N"> structure to
  // <li><span contenteditable="true" data-k="obj-N"></span></li> so the
  // delete button can live outside the editable area.
  $$('#objectives-list li[contenteditable="true"]').forEach(li => {
    const k = li.dataset.k;
    // Strip any leftover dead buttons from earlier loads
    li.querySelectorAll('.row-delete').forEach(b => b.remove());
    const inner = li.innerHTML.trim();
    const span = document.createElement('span');
    span.setAttribute('contenteditable', 'true');
    span.className = 'editable';
    if (k) span.dataset.k = k;
    span.innerHTML = inner;
    li.removeAttribute('contenteditable');
    li.removeAttribute('data-k');
    li.innerHTML = '';
    li.appendChild(span);
  });

  // Objectives list — strip stale buttons and re-attach with fresh listeners
  const ul = $('#objectives-list');
  if (ul) {
    ul.querySelectorAll('li').forEach(li => {
      li.querySelectorAll(':scope > .row-delete').forEach(b => b.remove());
      attachDeleteBtn(li);
    });
    if (!$('#add-objective-btn')) {
      const btn = document.createElement('button');
      btn.id = 'add-objective-btn';
      btn.className = 'add-row';
      btn.type = 'button';
      btn.textContent = '+ Agregar objetivo';
      btn.addEventListener('click', addObjective);
      ul.parentNode.appendChild(btn);
    }
  }
  // Meal columns — strip stale buttons too
  $$('.meal-col').forEach((col, i) => {
    col.dataset.col = i;
    col.querySelectorAll('.meal-row').forEach(row => {
      row.querySelectorAll(':scope > .row-delete').forEach(b => b.remove());
      attachDeleteBtn(row);
    });
    if (!col.querySelector('.add-meal-btn')) {
      const btn = document.createElement('button');
      btn.className = 'add-row add-meal-btn';
      btn.type = 'button';
      btn.textContent = '+ Agregar comida';
      btn.addEventListener('click', () => addMealRow(col));
      col.appendChild(btn);
    }
  });

  // Distribution table — delete-row per row + add-row buttons above/below
  initDistTable();
}

/* ---------- Distribution table dynamic rows ---------- */
function attachDistDeleteBtn(tr) {
  const actionsCell = tr.querySelector('.dist-actions-col');
  if (!actionsCell || actionsCell.querySelector('.dist-row-delete')) return;
  const btn = document.createElement('button');
  btn.className = 'dist-row-delete';
  btn.type = 'button';
  btn.title = 'Eliminar fila';
  btn.innerHTML = '×';
  btn.setAttribute('contenteditable', 'false');
  btn.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    e.preventDefault();
    tr.remove();
    calcDistribucion();
    saveDistTable();
  });
  actionsCell.appendChild(btn);
}

function makeDistRow(label) {
  const tr = document.createElement('tr');
  const cols = $$('#dist-table thead th[data-col]').map(th => th.dataset.col);
  let html = `<td class="label" contenteditable="true">${label || 'Comida · hora'}</td>`;
  cols.forEach(c => html += `<td><input class="field" type="number" data-dist="${c}"></td>`);
  html += '<td class="dist-actions-col"></td>';
  tr.innerHTML = html;
  return tr;
}

function addDistRow(position /* 'top' | 'bottom' */) {
  const tbody = $('#dist-table tbody');
  if (!tbody) return;
  const tr = makeDistRow('Comida · hora');
  if (position === 'top') tbody.insertBefore(tr, tbody.firstChild);
  else tbody.appendChild(tr);
  attachDistDeleteBtn(tr);
  // Focus first cell so user can rename
  const label = tr.querySelector('.label');
  label.focus();
  const range = document.createRange();
  range.selectNodeContents(label);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  calcDistribucion();
  saveDistTable();
}

function initDistTable() {
  const tbody = $('#dist-table tbody');
  if (!tbody) return;
  tbody.querySelectorAll('tr').forEach(attachDistDeleteBtn);

  // Column delete buttons on each <th data-col>
  $$('#dist-table thead th[data-col]').forEach(attachDistColDeleteBtn);

  const table = $('#dist-table');
  // Add buttons above + below the table
  if (!$('#dist-add-top')) {
    const top = document.createElement('div');
    top.id = 'dist-add-top';
    top.className = 'dist-row-actions';
    top.innerHTML = `<button class="add-row" type="button">+ Agregar fila arriba</button>`;
    top.querySelector('button').addEventListener('click', () => addDistRow('top'));
    table.parentNode.insertBefore(top, table);
  }
  if (!$('#dist-add-bottom')) {
    const bot = document.createElement('div');
    bot.id = 'dist-add-bottom';
    bot.className = 'dist-row-actions';
    bot.innerHTML = `<button class="add-row" type="button">+ Agregar fila abajo</button>`;
    bot.querySelector('button').addEventListener('click', () => addDistRow('bottom'));
    table.parentNode.insertBefore(bot, table.nextSibling);
  }
  if (!$('#dist-add-col')) {
    const colAct = document.createElement('div');
    colAct.id = 'dist-add-col';
    colAct.className = 'dist-col-actions';
    colAct.innerHTML = `<button class="add-row" type="button">+ Agregar columna</button>`;
    colAct.querySelector('button').addEventListener('click', addDistCol);
    table.parentNode.insertBefore(colAct, table);
  }
}

/* ---------- Distribution columns ---------- */
function attachDistColDeleteBtn(th) {
  if (th.querySelector('.dist-col-delete')) return;
  const btn = document.createElement('button');
  btn.className = 'dist-col-delete';
  btn.type = 'button';
  btn.title = 'Eliminar columna';
  btn.innerHTML = '×';
  btn.setAttribute('contenteditable', 'false');
  btn.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    e.preventDefault();
    const col = th.dataset.col;
    if (!col) return;
    // Remove the th + matching cells in tbody rows and tfoot
    th.remove();
    $$(`#dist-table tbody td input[data-dist="${col}"]`).forEach(inp => inp.closest('td').remove());
    $$(`#dist-table tfoot td[data-col="${col}"]`).forEach(td => td.remove());
    calcDistribucion();
    saveDistTable();
  });
  th.appendChild(btn);
}

function addDistCol() {
  const table = $('#dist-table');
  if (!table) return;
  // Generate a unique key
  let i = 1;
  const existing = new Set($$('#dist-table thead th[data-col]').map(th => th.dataset.col));
  while (existing.has('col' + i)) i++;
  const key = 'col' + i;

  // Add <th> in thead before the actions column
  const headerRow = table.querySelector('thead tr');
  const actionsTh = headerRow.querySelector('.dist-actions-col');
  const th = document.createElement('th');
  th.className = 'num';
  th.dataset.col = key;
  th.innerHTML = `<span contenteditable="true">Nuevo</span>`;
  headerRow.insertBefore(th, actionsTh);
  attachDistColDeleteBtn(th);

  // Add a matching <td> in each tbody row, before the row's actions cell
  $$('#dist-table tbody tr').forEach(tr => {
    const actionsTd = tr.querySelector('.dist-actions-col');
    const td = document.createElement('td');
    td.innerHTML = `<input class="field" type="number" data-dist="${key}">`;
    tr.insertBefore(td, actionsTd);
  });

  // Add a matching <td> in tfoot
  const footRow = table.querySelector('tfoot tr');
  const footActionsTd = footRow.querySelector('.dist-actions-col');
  const footTd = document.createElement('td');
  footTd.className = 'num';
  footTd.dataset.col = key;
  footTd.textContent = '—';
  footRow.insertBefore(footTd, footActionsTd);

  // Focus the new header so the user can rename
  const span = th.querySelector('span[contenteditable]');
  span.focus();
  const range = document.createRange();
  range.selectNodeContents(span);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  calcDistribucion();
  saveDistTable();
}

function saveDistTable() {
  try {
    const table = $('#dist-table');
    if (!table) return;
    // Clean clones (strip dynamic buttons)
    const head = table.querySelector('thead').cloneNode(true);
    head.querySelectorAll('.dist-col-delete').forEach(b => b.remove());
    const body = table.querySelector('tbody').cloneNode(true);
    body.querySelectorAll('.dist-row-delete').forEach(b => b.remove());
    const foot = table.querySelector('tfoot').cloneNode(true);
    localStorage.setItem(KEY + '-dist', JSON.stringify({
      head: head.innerHTML,
      body: body.innerHTML,
      foot: foot.innerHTML,
    }));
  } catch(e) { console.warn(e); }
}

function loadDistTable() {
  try {
    const raw = localStorage.getItem(KEY + '-dist');
    if (!raw) return;
    const table = $('#dist-table');
    if (!table) return;
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch { parsed = { body: raw }; /* migration from old format */ }
    if (parsed.head) table.querySelector('thead').innerHTML = parsed.head;
    if (parsed.body) table.querySelector('tbody').innerHTML = parsed.body;
    if (parsed.foot) table.querySelector('tfoot').innerHTML = parsed.foot;
  } catch(e) { console.warn(e); }
}

function saveStructure() {
  // Saves the dynamic structure of objectives list + meal columns into localStorage
  try {
    const struct = {};
    const ul = $('#objectives-list');
    if (ul) {
      // Strip delete buttons before saving
      const clean = ul.cloneNode(true);
      clean.querySelectorAll('.row-delete').forEach(b => b.remove());
      struct.objectives = clean.innerHTML;
    }
    $$('.meal-col').forEach((col, i) => {
      const rows = col.querySelectorAll('.meal-row');
      const cleanRows = Array.from(rows).map(r => {
        const c = r.cloneNode(true);
        c.querySelectorAll('.row-delete').forEach(b => b.remove());
        return c.outerHTML;
      });
      struct['meals-' + i] = cleanRows.join('');
    });
    localStorage.setItem(KEY + '-struct', JSON.stringify(struct));
  } catch(e) { console.warn('saveStructure failed', e); }
}

function loadStructure() {
  try {
    const struct = JSON.parse(localStorage.getItem(KEY + '-struct') || '{}');
    if (typeof struct.objectives === 'string') {
      const ul = $('#objectives-list');
      if (ul) ul.innerHTML = struct.objectives;
    }
    $$('.meal-col').forEach((col, i) => {
      if (typeof struct['meals-' + i] !== 'string') return;
      // Remove existing meal-rows
      col.querySelectorAll('.meal-row').forEach(r => r.remove());
      // Parse saved HTML and insert each row after the h4 in order
      const wrap = document.createElement('div');
      wrap.innerHTML = struct['meals-' + i];
      const h4 = col.querySelector('h4');
      // Move add-button (if exists) out of the way first
      const addBtn = col.querySelector('.add-meal-btn');
      const insertAfter = node => {
        if (addBtn) col.insertBefore(node, addBtn);
        else col.appendChild(node);
      };
      Array.from(wrap.children).forEach(insertAfter);
      // Make sure h4 is first
      if (h4) col.insertBefore(h4, col.firstChild);
    });
  } catch(e) { console.warn('loadStructure failed', e); }
}

/* ============================================
   STATE
   ============================================ */
const KEY = 'plan-nutricional-state-v2';

function saveState() {
  const state = {
    gender: GENDER,
    bodymode: BODY_MODE,
    chart: [...CHART_ACTIVE],
    template: TEMPLATE,
    brandName: BRAND_NAME,
    brandTitle: BRAND_TITLE,
    customLogo: CUSTOM_LOGO,
    sections: SECTIONS_ON,
  };
  $$('input.field, [contenteditable="true"]').forEach(el => {
    const id = el.id || el.dataset.k;
    if (!id) return;
    state[id] = el.tagName === 'INPUT' ? el.value : el.innerHTML;
  });
  const sel = $('#in-actividad'); if (sel) state['in-actividad'] = sel.value;
  // evo table headers + cells
  $$('#evo-table input').forEach(inp => {
    if (inp.dataset.k) state[inp.dataset.k] = inp.value;
  });
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(e) {}
}

function loadState() {
  try {
    const state = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (state.gender) GENDER = state.gender;
    if (state.bodymode) BODY_MODE = state.bodymode;
    if (Array.isArray(state.chart)) CHART_ACTIVE = new Set(state.chart);
    if (state.template) TEMPLATE = state.template;
    if (typeof state.brandName === 'string') BRAND_NAME = state.brandName;
    if (typeof state.brandTitle === 'string') BRAND_TITLE = state.brandTitle;
    if (typeof state.customLogo === 'string') CUSTOM_LOGO = state.customLogo;
    if (state.sections && typeof state.sections === 'object') {
      TOGGLEABLE_SECTIONS.forEach(s => {
        if (typeof state.sections[s] === 'boolean') SECTIONS_ON[s] = state.sections[s];
      });
    }
    Object.keys(state).forEach(id => {
      if (['gender','bodymode','chart','template','brandName','brandTitle','customLogo','sections'].includes(id)) return;
      const el = document.getElementById(id) || $(`[data-k="${id}"]`);
      if (!el) return;
      if (el.tagName === 'INPUT' || el.tagName === 'SELECT') el.value = state[id];
      else el.innerHTML = state[id];
    });
  } catch(e) {}
}

/* ============================================
   WIRE UP
   ============================================ */
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  loadDistTable();
  loadStructure();
  initEditableLists();
  setGender(GENDER);
  setBodyMode(BODY_MODE);
  applyTemplate(TEMPLATE);
  applyBrand();
  applyLogo();
  applySections();
  $$('#chart-controls .chip').forEach(c => c.classList.toggle('on', CHART_ACTIVE.has(c.dataset.k)));

  // Inputs
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.matches('input.field, select.field, input[type="text"], input[type="number"]')) {
      calcAll();
      saveState();
    }
    if (t.id === 'patient-name' || t.id === 'patient-date') syncIdentity();
    // Persist structure when user edits any contenteditable in dynamic lists
    if (t.closest && (t.closest('#objectives-list') || t.closest('.meal-col'))) {
      saveStructure();
    }
    // Persist distribution table edits (labels + values)
    if (t.closest && t.closest('#dist-table tbody')) {
      saveDistTable();
    }
  });

  // Gender toggle
  $$('.gender-toggle button').forEach(b => {
    b.addEventListener('click', () => setGender(b.dataset.g));
  });

  // Body composition mode toggle
  $$('.mode-toggle button').forEach(b => {
    b.addEventListener('click', () => setBodyMode(b.dataset.mode));
  });

  // Chart series toggles
  $$('#chart-controls .chip').forEach(c => {
    c.addEventListener('click', () => toggleSeries(c.dataset.k));
  });

  // Objective tabs (visual)
  function applyObjective(obj) {
    $$('.objective-tab').forEach(x => x.classList.toggle('active', x.dataset.obj === obj));
    $$('.macros-table, .macro-bar').forEach(el => {
      if (el.dataset.for === obj) el.setAttribute('data-active', '');
      else el.removeAttribute('data-active');
    });
  }
  $$('.objective-tab').forEach(t => {
    t.addEventListener('click', () => {
      applyObjective(t.dataset.obj);
      saveState();
    });
  });
  // Default active objective
  const initialObj = $$('.objective-tab.active')[0]?.dataset.obj || 'mant';
  applyObjective(initialObj);

  // Toolbar buttons
  function syncInputAttrs() {
    // mirror input.value -> value attribute for accurate html2canvas capture
    $$('input').forEach(inp => {
      if (inp.type === 'number' || inp.type === 'text' || !inp.type) {
        if (inp.value) inp.setAttribute('value', inp.value);
        else inp.removeAttribute('value');
      }
    });
    $$('select').forEach(sel => {
      [...sel.options].forEach(o => {
        if (o.value === sel.value) o.setAttribute('selected', '');
        else o.removeAttribute('selected');
      });
    });
  }

  /* ---------- SVG rasterization (html2canvas can't handle <use href> across SVGs) ---------- */
  function inlineSvgUseRefs(svg) {
    svg.querySelectorAll('use').forEach(use => {
      const href = use.getAttribute('href') || use.getAttribute('xlink:href');
      if (!href || !href.startsWith('#')) return;
      const sym = document.getElementById(href.slice(1));
      if (!sym) return;
      const parentSvg = use.closest('svg');
      if (!parentSvg) return;
      if (!parentSvg.getAttribute('viewBox') && sym.getAttribute('viewBox')) {
        parentSvg.setAttribute('viewBox', sym.getAttribute('viewBox'));
      }
      const ns = 'http://www.w3.org/2000/svg';
      const g = document.createElementNS(ns, 'g');
      Array.from(sym.childNodes).forEach(c => g.appendChild(c.cloneNode(true)));
      use.parentNode.replaceChild(g, use);
    });
  }

  async function svgToPngDataURL(svg) {
    const rect = svg.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return null;
    const clone = svg.cloneNode(true);
    inlineSvgUseRefs(clone);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', Math.round(rect.width));
    clone.setAttribute('height', Math.round(rect.height));
    const xml = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    try {
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = url;
      });
      const c = document.createElement('canvas');
      c.width = Math.round(rect.width * 2);
      c.height = Math.round(rect.height * 2);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return { dataUrl: c.toDataURL('image/png'), width: rect.width, height: rect.height };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function rasterizeSvgsIn(page) {
    const restores = [];
    const svgs = Array.from(page.querySelectorAll('svg'));
    for (const svg of svgs) {
      if (svg.getAttribute('width') === '0') continue;
      if (svg.closest('defs')) continue;
      try {
        const res = await svgToPngDataURL(svg);
        if (!res) continue;
        const img = document.createElement('img');
        img.src = res.dataUrl;
        img.className = svg.getAttribute('class') || '';
        img.setAttribute('style', svg.getAttribute('style') || '');
        img.style.width = res.width + 'px';
        img.style.height = res.height + 'px';
        // copy data-* attrs that might matter for CSS
        for (const attr of svg.attributes) {
          if (attr.name.startsWith('data-')) img.setAttribute(attr.name, attr.value);
        }
        svg.parentNode.insertBefore(img, svg);
        restores.push({ svg, img, displayWas: svg.style.display });
        svg.style.display = 'none';
      } catch (e) { console.warn('SVG rasterize failed', e); }
    }
    return restores;
  }

  function restoreSvgs(restores) {
    restores.forEach(({ svg, img, displayWas }) => {
      img.remove();
      svg.style.display = displayWas;
    });
  }

  async function downloadPDF() {
    if (!window.html2canvas || !window.jspdf) {
      alert('Cargando librerías PDF, intenta de nuevo en unos segundos.');
      return;
    }
    const { jsPDF } = window.jspdf;
    syncInputAttrs();

    const includeChart = $('#chk-include-chart').checked;
    let pages = $$('.page');
    if (!includeChart) pages = pages.filter(p => !p.classList.contains('chart-page'));

    const rawName = ($('#patient-name')?.value || 'Plan-Nutricional').trim();
    const safe = rawName.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '').replace(/\s+/g, '-') || 'Plan-Nutricional';
    const filename = `Plan-Nutricional-${safe}.pdf`;

    showOverlay('Generando PDF…', 0);
    document.body.classList.add('exporting');
    await new Promise(r => setTimeout(r, 150));

    try {
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pageW = 210, pageH = 297;

      for (let i = 0; i < pages.length; i++) {
        showOverlay(`Generando PDF… página ${i + 1} de ${pages.length}`, (i / pages.length) * 100);
        // Rasterize SVGs first (html2canvas can't follow <use href> across SVGs)
        const restores = await rasterizeSvgsIn(pages[i]);
        let canvas;
        try {
          canvas = await html2canvas(pages[i], {
            scale: 2,
            backgroundColor: '#FBF7EE',
            useCORS: true,
            logging: false,
            windowWidth: pages[i].scrollWidth,
            windowHeight: pages[i].scrollHeight,
          });
        } finally {
          restoreSvgs(restores);
        }
        const img = canvas.toDataURL('image/jpeg', 0.92);
        if (i > 0) pdf.addPage();
        pdf.addImage(img, 'JPEG', 0, 0, pageW, pageH, undefined, 'FAST');
      }

      showOverlay('Guardando…', 100);
      pdf.save(filename);
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error generando el PDF. Revisa la consola.');
    } finally {
      document.body.classList.remove('exporting');
      hideOverlay();
    }
  }

  function showOverlay(text, pct) {
    let o = $('#pdf-overlay');
    if (!o) {
      o = document.createElement('div');
      o.id = 'pdf-overlay';
      o.innerHTML = `
        <div class="pdf-overlay-card">
          <div class="pdf-spinner"></div>
          <div class="pdf-overlay-text">${text}</div>
          <div class="pdf-progress"><div class="pdf-progress-bar" style="width:${pct}%"></div></div>
        </div>`;
      document.body.appendChild(o);
    } else {
      o.querySelector('.pdf-overlay-text').textContent = text;
      o.querySelector('.pdf-progress-bar').style.width = pct + '%';
    }
  }
  function hideOverlay() {
    const o = $('#pdf-overlay');
    if (o) o.remove();
  }

  /* ---------- Stripe checkout gate ---------- */
  const STRIPE_LINK = 'https://buy.stripe.com/test_XXXXXXXXXX';
  const AUTH_KEY_PLAN = 'nutri-auth';

  function getUserPlan() {
    try {
      const auth = JSON.parse(localStorage.getItem(AUTH_KEY_PLAN));
      return auth?.plan || 'free';
    } catch { return 'free'; }
  }

  function hasPaid() {
    return getUserPlan() === 'pro' || localStorage.getItem('nutri-payment-success') === 'true';
  }

  function showStripeCheckout() {
    const overlay = $('#stripe-checkout-overlay');
    if (overlay) overlay.style.display = 'flex';
  }

  function hideStripeCheckout() {
    const overlay = $('#stripe-checkout-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  // Check URL for payment success on page load
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('payment') === 'success') {
    localStorage.setItem('nutri-payment-success', 'true');
    try {
      const auth = JSON.parse(localStorage.getItem(AUTH_KEY_PLAN));
      if (auth) { auth.plan = 'pro'; localStorage.setItem(AUTH_KEY_PLAN, JSON.stringify(auth)); }
    } catch {}
    window.history.replaceState({}, '', window.location.pathname);
  }

  $('#btn-print').addEventListener('click', () => {
    if (hasPaid()) {
      downloadPDF();
    } else {
      showStripeCheckout();
    }
  });

  $('#stripe-close')?.addEventListener('click', hideStripeCheckout);
  $('#stripe-checkout-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'stripe-checkout-overlay') hideStripeCheckout();
  });

  $('#btn-stripe-checkout')?.addEventListener('click', () => {
    const auth = (() => { try { return JSON.parse(localStorage.getItem(AUTH_KEY_PLAN)); } catch { return null; } })();
    const email = auth?.email || '';
    const successUrl = encodeURIComponent(window.location.origin + window.location.pathname + '?payment=success');
    window.location.href = STRIPE_LINK + '?prefilled_email=' + encodeURIComponent(email) + '&success_url=' + successUrl;
  });

  $('#btn-back-landing')?.addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  $('#btn-preview').addEventListener('click', () => {
    document.body.classList.toggle('client-view');
    $('#btn-preview').classList.toggle('primary');
    $('#btn-preview').textContent = document.body.classList.contains('client-view')
      ? '✎ Vista nutricionista'
      : '👁 Vista cliente';
  });

  $('#btn-reset').addEventListener('click', () => {
    if (confirm('¿Borrar todos los datos del paciente y empezar de nuevo?')) {
      localStorage.removeItem(KEY);
      location.reload();
    }
  });

  /* ----- Settings panel ----- */
  const panel = $('#settings-panel');
  $('#btn-settings').addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      $('#sp-brand-name').value = BRAND_NAME;
      $('#sp-brand-title').value = BRAND_TITLE;
      $$('input[name="template"]').forEach(r => r.checked = r.value === TEMPLATE);
      $$('input[data-section-toggle]').forEach(c => c.checked = SECTIONS_ON[c.dataset.sectionToggle] !== false);
    }
  });
  $('#sp-close').addEventListener('click', () => { panel.hidden = true; });
  $('#sp-apply').addEventListener('click', () => { panel.hidden = true; });

  $$('input[name="template"]').forEach(r => {
    r.addEventListener('change', () => { applyTemplate(r.value); saveState(); });
  });

  $('#sp-brand-name').addEventListener('input', e => setBrand(e.target.value, undefined));
  $('#sp-brand-title').addEventListener('input', e => setBrand(undefined, e.target.value));

  $('#sp-logo-input').addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      alert('La imagen es muy grande (máximo 4 MB).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCustomLogo(reader.result);
    reader.readAsDataURL(file);
  });
  $('#sp-logo-reset').addEventListener('click', () => {
    setCustomLogo(null);
    $('#sp-logo-input').value = '';
  });

  $$('input[data-section-toggle]').forEach(chk => {
    chk.addEventListener('change', e => setSection(chk.dataset.sectionToggle, e.target.checked));
  });

  $('#chk-include-chart')?.addEventListener('change', () => {
    document.body.classList.toggle('no-chart', !$('#chk-include-chart').checked);
    saveState();
  });
  // initial state
  document.body.classList.toggle('no-chart', !$('#chk-include-chart')?.checked);

  syncIdentity();
  calcAll();
});
