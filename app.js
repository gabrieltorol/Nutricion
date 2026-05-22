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

  let interp = '—';
  if (imc) {
    if (imc < 18.5) interp = 'Bajo peso';
    else if (imc < 25) interp = 'Peso normal';
    else if (imc < 30) interp = 'Sobrepeso';
    else if (imc < 35) interp = 'Obesidad I';
    else if (imc < 40) interp = 'Obesidad II';
    else interp = 'Obesidad III';
  }
  $('#imc-interpret').textContent = interp;

  const pesoIdeal = talla ? 22 * talla * talla : 0;
  $('#out-peso-ideal').textContent = pesoIdeal ? fmt(pesoIdeal, 1) + ' kg' : '— kg';

  const cardImc = $('#card-imc'); if (cardImc) cardImc.textContent = imc ? fmt(imc, 1) : '—';
  const cardImcI = $('#card-imc-i'); if (cardImcI) cardImcI.textContent = interp;
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

  // Body fat interpretation by gender
  let g = '—';
  if (grasaPct) {
    if (GENDER === 'F') {
      if (grasaPct < 14) g = 'Esencial';
      else if (grasaPct < 21) g = 'Atlética';
      else if (grasaPct < 25) g = 'Fitness';
      else if (grasaPct < 32) g = 'Aceptable';
      else g = 'Sobre rango';
    } else {
      if (grasaPct < 6) g = 'Esencial';
      else if (grasaPct < 14) g = 'Atlético';
      else if (grasaPct < 18) g = 'Fitness';
      else if (grasaPct < 25) g = 'Aceptable';
      else g = 'Sobre rango';
    }
  }
  $('#grasa-interpret').textContent = g;

  const cardG = $('#card-grasa'); if (cardG) cardG.textContent = grasaPct ? fmt(grasaPct,1) : '—';
  const cardGI = $('#card-grasa-i'); if (cardGI) cardGI.textContent = g;
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

  let r = '—';
  if (icc) {
    const t1 = GENDER === 'F' ? 0.80 : 0.90;
    const t2 = GENDER === 'F' ? 0.85 : 0.95;
    if (icc < t1) r = 'Bajo riesgo';
    else if (icc < t2) r = 'Riesgo moderado';
    else r = 'Riesgo elevado';
  }
  $('#icc-interpret').textContent = r;

  const cardIcc = $('#card-icc'); if (cardIcc) cardIcc.textContent = icc ? fmt(icc,2) : '—';
  const cardIccI = $('#card-icc-i'); if (cardIccI) cardIccI.textContent = r;
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
  const cols = ['cer', 'vcg', 'fru', 'car', 'lac', 'arl'];
  cols.forEach(col => {
    let sum = 0;
    $$(`input[data-dist="${col}"]`).forEach(inp => sum += num(inp.value));
    const tot = $(`#tot-${col}`);
    if (tot) tot.textContent = sum || '';
  });
}

/* ---------- Bioimpedance ---------- */
function calcBIA() {
  const grasa = num($('#bia-grasa')?.value);
  const musc  = num($('#bia-musc')?.value);
  const visc  = num($('#bia-visc')?.value);

  // Body fat interpretation by gender (same scale as Yuhasz cards)
  let gi = '—';
  if (grasa) {
    if (GENDER === 'F') {
      if (grasa < 14) gi = 'Esencial';
      else if (grasa < 21) gi = 'Atlética';
      else if (grasa < 25) gi = 'Fitness';
      else if (grasa < 32) gi = 'Aceptable';
      else gi = 'Sobre rango';
    } else {
      if (grasa < 6) gi = 'Esencial';
      else if (grasa < 14) gi = 'Atlético';
      else if (grasa < 18) gi = 'Fitness';
      else if (grasa < 25) gi = 'Aceptable';
      else gi = 'Sobre rango';
    }
  }
  // visceral fat ref (Tanita/InBody scale 1-59): <=9 saludable, 10-14 alto, >=15 muy alto
  let vi = '—';
  if (visc) {
    if (visc <= 9) vi = 'Saludable';
    else if (visc <= 14) vi = 'Elevada';
    else vi = 'Muy elevada';
  }
  set('#bia-grasa-i', gi);
  set('#bia-visc-i', vi);
  set('#bia-card-grasa', grasa ? fmt(grasa,1) : '—');
  set('#bia-card-grasa-i', gi);
  set('#bia-card-musc',  musc  ? fmt(musc,1) + ' kg' : '— kg');
  set('#bia-card-visc',  visc  ? fmt(visc,0) : '—');
  set('#bia-card-visc-i', vi);

  // When in BIA mode, mirror values to the main results cards
  if (BODY_MODE === 'bia') {
    const peso = num($('#in-peso').value);
    const masaMagra = peso && grasa ? peso * (1 - grasa/100) : (musc || 0);
    const cardG  = $('#card-grasa');  if (cardG)  cardG.textContent  = grasa ? fmt(grasa,1) : '—';
    const cardGI = $('#card-grasa-i'); if (cardGI) cardGI.textContent = gi;
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
   STATE
   ============================================ */
const KEY = 'plan-nutricional-state-v2';

function saveState() {
  const state = { gender: GENDER, bodymode: BODY_MODE, chart: [...CHART_ACTIVE] };
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
    Object.keys(state).forEach(id => {
      if (['gender','bodymode','chart'].includes(id)) return;
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
  setGender(GENDER);
  setBodyMode(BODY_MODE);
  $$('#chart-controls .chip').forEach(c => c.classList.toggle('on', CHART_ACTIVE.has(c.dataset.k)));

  // Inputs
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.matches('input.field, select.field, input[type="text"], input[type="number"]')) {
      calcAll();
      saveState();
    }
    if (t.id === 'patient-name' || t.id === 'patient-date') syncIdentity();
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

  $('#btn-print').addEventListener('click', downloadPDF);

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

  $('#chk-include-chart')?.addEventListener('change', () => {
    document.body.classList.toggle('no-chart', !$('#chk-include-chart').checked);
    saveState();
  });
  // initial state
  document.body.classList.toggle('no-chart', !$('#chk-include-chart')?.checked);

  syncIdentity();
  calcAll();
});
