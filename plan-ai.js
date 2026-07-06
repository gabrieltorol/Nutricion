/* ============================================
   plan-ai.js — Generador del plan semanal con IA
   Llama al proxy (Cloudflare Worker) que a su vez
   consulta a Claude, y rellena la tabla semanal.
   ============================================ */
(function () {
  const $ = (s) => document.querySelector(s);
  const PROXY_KEY = 'nutri-ai-proxy-url';
  const TOKEN_KEY = 'nutri-ai-token';
  const DAYS = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];

  document.addEventListener('DOMContentLoaded', () => {
    const box = $('#ai-box');
    if (!box) return;

    const urlInput = $('#ai-proxy-url');
    if (urlInput) urlInput.value = localStorage.getItem(PROXY_KEY) || '';
    const tokenInput = $('#ai-app-token');
    if (tokenInput) tokenInput.value = localStorage.getItem(TOKEN_KEY) || '';

    $('#ai-config-btn')?.addEventListener('click', () => {
      const c = $('#ai-config');
      if (c) c.hidden = !c.hidden;
    });

    urlInput?.addEventListener('input', () => {
      localStorage.setItem(PROXY_KEY, urlInput.value.trim());
    });
    tokenInput?.addEventListener('input', () => {
      localStorage.setItem(TOKEN_KEY, tokenInput.value.trim());
    });

    $('#ai-generate')?.addEventListener('click', generate);
  });

  function setStatus(msg, kind) {
    const el = $('#ai-status');
    if (!el) return;
    el.textContent = msg;
    el.className = 'ai-status' + (kind ? ' ' + kind : '');
  }

  function fillWeek(rows) {
    const tbody = document.querySelector('.week-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    rows.forEach((row, i) => {
      const rk = 'ws-r' + (i + 1);
      const tr = document.createElement('tr');

      const tcell = document.createElement('td');
      tcell.className = 'wk-time';
      tcell.setAttribute('contenteditable', 'true');
      tcell.dataset.k = rk + '-t';
      tcell.textContent = row.tiempo || 'Comida';
      const hour = document.createElement('span');
      hour.className = 'wk-hour';
      hour.setAttribute('contenteditable', 'true');
      hour.dataset.k = rk + '-h';
      hour.textContent = row.hora || '';
      tcell.appendChild(hour);
      tr.appendChild(tcell);

      DAYS.forEach((d) => {
        const td = document.createElement('td');
        const div = document.createElement('div');
        div.className = 'week-cell';
        div.setAttribute('contenteditable', 'true');
        div.dataset.k = rk + '-' + d;
        div.textContent = row[d] || '';
        td.appendChild(div);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    // Persistir con la máquina existente de app.js
    if (typeof saveState === 'function') saveState();
  }

  async function generate() {
    const url = (localStorage.getItem(PROXY_KEY) || '').trim();
    const token = (localStorage.getItem(TOKEN_KEY) || '').trim();
    if (!url || !token) {
      setStatus('Primero configurá la URL y la clave del servidor (⚙).', 'err');
      const c = $('#ai-config');
      if (c) c.hidden = false;
      return;
    }

    const payload = {
      kcal: $('#ai-kcal')?.value || '',
      goal: $('#ai-goal')?.value || '',
      meals: $('#ai-meals')?.value || '5',
      training: $('#ai-training')?.value || '',
      notes: $('#ai-notes')?.value || '',
    };

    const btn = $('#ai-generate');
    setStatus('Generando plan…', 'loading');
    if (btn) btn.disabled = true;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-App-Token': token },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let extra = '';
        try { const j = await res.json(); extra = j.error || j.detail || ''; } catch (_) {}
        throw new Error('HTTP ' + res.status + (extra ? ' · ' + extra : ''));
      }
      const data = await res.json();
      if (!data || !Array.isArray(data.rows) || !data.rows.length) {
        throw new Error('La respuesta no trajo filas de plan.');
      }
      fillWeek(data.rows);
      setStatus('¡Listo! Plan generado. Ya podés editar cualquier casilla.', 'ok');
    } catch (e) {
      setStatus('Error: ' + e.message, 'err');
    } finally {
      if (btn) btn.disabled = false;
    }
  }
})();
