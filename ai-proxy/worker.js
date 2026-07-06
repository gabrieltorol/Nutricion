/* ============================================================
   nutri-ai-proxy — Cloudflare Worker
   Recibe los datos del plan desde la app, llama a la API de
   Claude con la API key guardada como SECRETO (env.ANTHROPIC_API_KEY),
   y devuelve el plan semanal en JSON. La key nunca viaja al navegador.
   ============================================================ */

// Orígenes autorizados a usar este proxy (evita que otros gasten tus créditos).
// Agregá aquí tu dominio si cambia.
const ALLOWED_ORIGINS = [
  'https://gabrieltorol.github.io',
  'http://localhost:4599',
  'http://127.0.0.1:4599',
];

// Esquema de salida: la IA está obligada a devolver exactamente esta forma.
const WEEK_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['rows'],
  properties: {
    rows: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['tiempo', 'hora', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'],
        properties: {
          tiempo: { type: 'string', description: 'Nombre del tiempo de comida, ej. Desayuno, Almuerzo, Entreno' },
          hora:   { type: 'string', description: 'Horario aproximado, ej. 8:00. Usar "—" si no aplica' },
          lun: { type: 'string' }, mar: { type: 'string' }, mie: { type: 'string' },
          jue: { type: 'string' }, vie: { type: 'string' }, sab: { type: 'string' }, dom: { type: 'string' },
        },
      },
    },
  },
};

const SYSTEM = `Sos el asistente de una nutricionista. Generás un PLAN SEMANAL de comidas usando el SISTEMA DE INTERCAMBIOS (porciones).
Cada casilla del plan contiene porciones con estos códigos:
- CER: cereales, tubérculos y leguminosas
- CBG: carnes y proteicos bajos en grasa
- VG: verduras de consumo general · VLC: verduras de libre consumo
- FRT: frutas
- LBG/LMG/LAG: lácteos bajos/medios/altos en grasa
- ARL: alimentos ricos en lípidos · AC: aceites y grasas · AZ: azúcar · EX: extra
Formato EXACTO de cada casilla: "N COD · N COD · N COD" (ej: "3 CBG · 1 CER · 1 FRT"). Sin nombres de alimentos, solo porciones y códigos.
Reglas:
- Distribuí las porciones a lo largo del día para acercarte a las calorías diarias objetivo.
- Poné más CER (carbohidratos) en las comidas cercanas a los días/horarios de entrenamiento.
- Ajustá la proteína (CBG) según el objetivo (más si es subir masa muscular).
- Respetá preferencias y alergias indicadas (ej: si es vegetariana, usá proteína de origen vegetal dentro de CBG; si es sin lácteos, evitá LBG/LMG/LAG).
- Incluí una fila "Entreno" con "GYM" en los días de entrenamiento y "Descanso"/"Libre" en el resto, SOLO si se indicaron días de entrenamiento.
- Devolvé una fila por cada tiempo de comida pedido, de lunes a domingo.`;

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-App-Token',
    'Vary': 'Origin',
  };
}

function jsonResponse(obj, status, extra) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...(extra || {}) },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin);

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return jsonResponse({ error: 'Usá POST' }, 405, cors);

    // Candado 1 — Rechazo por origen: si el pedido trae un Origin de navegador
    // y no está en la lista, se corta (no solo por CORS, sino en el servidor).
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return jsonResponse({ error: 'Origen no autorizado' }, 403, cors);
    }

    // Candado 2 — Clave compartida obligatoria. Se guarda como secreto en el
    // Worker (env.APP_TOKEN) y la app la manda en el header X-App-Token.
    if (!env.APP_TOKEN) return jsonResponse({ error: 'Falta configurar APP_TOKEN en el Worker' }, 500, cors);
    if ((request.headers.get('X-App-Token') || '') !== env.APP_TOKEN) {
      return jsonResponse({ error: 'No autorizado (clave inválida)' }, 401, cors);
    }

    if (!env.ANTHROPIC_API_KEY) return jsonResponse({ error: 'Falta configurar ANTHROPIC_API_KEY en el Worker' }, 500, cors);

    let input;
    try { input = await request.json(); } catch { return jsonResponse({ error: 'JSON inválido' }, 400, cors); }

    const userMsg =
      `Calorías diarias objetivo: ${input.kcal || 'no indicado'}\n` +
      `Objetivo: ${input.goal || 'no indicado'}\n` +
      `Comidas por día: ${input.meals || 5}\n` +
      `Días de entrenamiento: ${input.training || 'ninguno'}\n` +
      `Preferencias / alergias / notas: ${input.notes || 'ninguna'}\n\n` +
      `Generá el plan semanal completo (lunes a domingo).`;

    const body = {
      model: 'claude-haiku-4-5',
      max_tokens: 2500,
      system: SYSTEM,
      messages: [{ role: 'user', content: userMsg }],
      output_config: { format: { type: 'json_schema', schema: WEEK_SCHEMA } },
    };

    let claudeRes;
    try {
      claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      return jsonResponse({ error: 'No se pudo contactar a Claude', detail: String(e) }, 502, cors);
    }

    if (!claudeRes.ok) {
      const detail = (await claudeRes.text()).slice(0, 400);
      return jsonResponse({ error: 'Claude respondió ' + claudeRes.status, detail }, 502, cors);
    }

    const msg = await claudeRes.json();
    const text = (msg.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    let parsed;
    try { parsed = JSON.parse(text); } catch { return jsonResponse({ error: 'No se pudo interpretar la respuesta de la IA' }, 502, cors); }

    return jsonResponse(parsed, 200, cors);
  },
};
