# Proxy de IA para el plan nutricional

Este pequeño servidor (Cloudflare Worker) guarda tu **API key de Anthropic** en
secreto y le habla a Claude por vos. La app (el sitio en GitHub Pages) le pega a
este proxy, nunca a Claude directo — así la key nunca queda expuesta en el navegador.

## 1. Conseguir una API key de Anthropic (y poner el tope de gasto)

1. Entrá a <https://console.anthropic.com/> y creá una cuenta.
2. Cargá crédito (con muy poco alcanza: cada plan generado cuesta fracciones de centavo con el modelo Haiku).
3. **Poné un tope de gasto:** en **Settings → Limits** (o **Billing → Usage limits**) definí un
   **límite mensual de USD 5**. Es la red de seguridad definitiva: aunque alguien
   abuse, la API deja de responder al llegar a ese monto y no te pueden gastar más.
4. En **API Keys**, creá una key nueva y copiala (empieza con `sk-ant-...`).

### Elegí una "clave de acceso" propia

El proxy exige una clave compartida para responder. Inventá una cadena larga y
difícil (ej. mezclá letras y números, 20+ caracteres) — la vas a usar como
`APP_TOKEN` abajo y la misma la pegás en la app. **No la pongas en el código ni
la subas al repositorio.**

## 2. Desplegar el Worker (opción fácil, sin instalar nada)

1. Entrá a <https://dash.cloudflare.com/> → **Workers & Pages** → **Create** → **Create Worker**.
2. Ponele un nombre (ej. `nutri-ai-proxy`) y **Deploy**.
3. Abrí **Edit code**, borrá lo que haya y pegá **todo** el contenido de [`worker.js`](worker.js). **Deploy**.
4. Andá a la pestaña **Settings → Variables and Secrets** y agregá **dos secretos**:
   - **Secret** `ANTHROPIC_API_KEY` = tu key `sk-ant-...`
   - **Secret** `APP_TOKEN` = la clave de acceso que inventaste en el paso 1
   - **Save / Deploy**.
5. Copiá la URL del Worker (algo como `https://nutri-ai-proxy.TU-USUARIO.workers.dev`).

### (Alternativa por consola, si preferís)

```bash
npm install -g wrangler
cd ai-proxy
wrangler login
wrangler secret put ANTHROPIC_API_KEY   # pegás la key cuando la pida
wrangler secret put APP_TOKEN           # pegás tu clave de acceso
wrangler deploy
```

## 3. Conectar la app

1. Abrí el plan → cuadro **✨ Generar plan con IA** → botón **⚙**.
2. Pegá la **URL** del Worker y la **clave de acceso** (la misma de `APP_TOKEN`).
   Se guardan solo en tu navegador.
3. Completá calorías, objetivo, días de entreno, etc. y apretá **Generar plan**.

## Seguridad (blindaje)

Tres candados, de menor a mayor:

1. **Rechazo por origen** — el Worker corta cualquier pedido que no venga de tu
   sitio (`ALLOWED_ORIGINS` en `worker.js`). Si cambiás de dominio, agregalo ahí
   y volvé a desplegar.
2. **Clave de acceso** (`APP_TOKEN`) — sin la clave correcta, el proxy responde
   "No autorizado". La clave se ingresa a mano en la app y vive solo en tu
   navegador; **no está en el repositorio**, así que quien mire el código no la ve.
3. **Tope de gasto USD 5/mes** — configurado en la consola de Anthropic. Es el
   límite absoluto: pase lo que pase, no se te puede gastar más que eso.

Ni la API key ni la clave de acceso están en este repositorio ni en el navegador
de tus clientes (el cuadro de IA se oculta en la vista cliente y en el PDF).
