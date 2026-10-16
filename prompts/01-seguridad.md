# TAREA: Endurecimiento de seguridad de BotMaRe v2.7.0

## OBJETIVO
Cerrar los riesgos críticos y altos de seguridad del proyecto, en fases
independientes y revisables. NO es un refactor de arquitectura: el alcance es
seguridad, robustez de errores y guardas de calidad. Todo lo demás queda fuera.

## CONTEXTO DEL PROYECTO
- Monolito unificado: Baileys (WhatsApp) + Express 5 (`src/server.ts`) + Next 16
  con `output: 'export'` servido estáticamente por Express + grammy (Telegram)
  + node-cron (scheduler) + 16 plugins JS en `data/plugins/`.
- Gestor de paquetes: **pnpm**. TypeScript con `strict: true`.
- Autenticación actual: HTTP Basic global para `/api`, exenta para
  `/socket.io` y `/api/webhooks`.
- El código, los comentarios y los mensajes al usuario están **en español**.
  Mantén ese idioma y el estilo existente.
- Hay 53 tests que pasan (`tests/`). Hoy **no existe** script `test`.

## REGLAS DE TRABAJO (obligatorias)
1. Antes de editar, **lee el archivo completo** que vas a modificar. No edites a
   ciegas por número de línea: las líneas que cito son de la versión actual y
   pueden desplazarse.
2. Trabaja en una rama: `fix/security-hardening`.
3. **Un commit por fase**, mensaje en español con prefijo `fix(security):` o
   `chore(security):`. No mezcles fases.
4. No actualices dependencias ni toques `pnpm-lock.yaml` salvo que la fase lo
   pida explícitamente.
5. Nunca introduzcas secretos reales en el repositorio. `.env` está en
   `.gitignore`: no lo commitees, no lo imprimas en logs, no lo pegues en el chat.
6. Tras cada fase ejecuta y reporta la salida de:
   - `npx tsc --noEmit --incremental false`  (debe seguir en 0 errores)
   - `npx vitest run`  (debe seguir en verde)
7. Si algo del alcance rompe funcionalidad existente, **para y repórtalo**; no
   improvises un rediseño.
8. No dejes `console.log` de depuración nuevos.

---

## FASE 1 — Eliminar todos los secretos por defecto y fallar rápido

**Problema:** hay credenciales y claves hardcodeadas como fallback; con el
`.env` que se entrega, varias son las que realmente aplican.

**Cambios:**
1. Crea `src/core/secrets.ts` con:
   - `getRequiredSecret(name: string): string` → lee `process.env[name]`,
     lanza si falta o está vacío.
   - `generateSecret(bytes = 32): string` → valor aleatorio en base64url.
2. Elimina los fallbacks:
   - `src/middleware/auth.middleware.ts:42-43` (`|| 'admin'`, `|| 'admin123'`)
   - `src/core/licensing.service.ts:21` (`|| 'botmare_admin'`) → si
     `SUPERADMIN_KEY` no está definida, los endpoints de SuperAdmin responden
     **503 "función deshabilitada"**, nunca "clave por defecto". Compara con
     `crypto.timingSafeEqual`.
   - `src/routes/webhooks.routes.ts:13` (`|| 'botmare_default_secret_key'`)
   - `src/modules/system/backup.service.ts:13` (`|| 'admin123'`) → usa una clave
     dedicada `BACKUP_ENCRYPTION_KEY` (ver Fase 7).
3. **Validación de arranque**: `src/core/system.ts:11-19` (`validateEnv`) tiene
   el array `required` vacío. Complétalo con las variables obligatorias y
   mensajes accionables (`DASHBOARD_USER`, `DASHBOARD_PASS`, `WEBHOOK_API_KEY`,
   `SUPERADMIN_KEY`, `BACKUP_ENCRYPTION_KEY`). Si falta alguna, imprime
   exactamente cuál y cómo generarla, y termina con `process.exit(1)`.
   Ya se llama desde `src/server.ts:201`: no muevas esa llamada.
4. Crea `bin/generate-secrets.js` (Node puro, sin dependencias) que:
   - genere valores fuertes para las 5 variables,
   - los escriba en `.env` **solo si la clave no existe o está vacía**,
   - imprima en consola qué se generó (sin volcar los valores completos).
   Añade el script `"setup:secrets": "node bin/generate-secrets.js"` a
   `package.json`.
5. Actualiza `.env.example`: añade `WEBHOOK_API_KEY`, `SUPERADMIN_KEY`,
   `BACKUP_ENCRYPTION_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
   `GOOGLE_REDIRECT_URI`, `ALLOWED_ORIGINS`, `TRUST_PROXY`, `DB_ENGINE`;
   sustituye los valores vacíos por placeholders evidentes
   (`CAMBIA_ESTO_genera_con_pnpm_run_setup_secrets`). Corrige también:
   - `LOGGER_LEVEL` → `LOG_LEVEL` (el logger lee `LOG_LEVEL`, ver
     `src/utils/logger.ts:11`, así que la variable actual es inerte).
   - El dominio de SMS: `api-sms.apptienda.online` → `api-sms.apptienda.site`
     (el código usa `.site`, ver `src/modules/sms/sms.service.ts:15,33`).
6. Documenta en `README.md` el nuevo paso `pnpm run setup:secrets` y que el
   arranque falla si faltan variables.

**Criterio de aceptación:**
- Arrancar sin `DASHBOARD_PASS` **no** permite `admin/admin123`; el proceso
  aborta indicando la variable que falta.
- `SUPERADMIN_KEY` vacía ⇒ `POST /api/licensing/update` responde 503, no acepta
  `botmare_admin`.
- `pnpm run setup:secrets` deja el `.env` completo y el arranque funciona.

---

## FASE 2 — Webhooks: cerrar el auto-deploy no autenticado

**Problema:** `verifyGitHubSignature` devuelve `true` cuando no hay secreto, el
router está exento de Basic Auth y `AUTO_DEPLOY` es `true` por defecto. Resultado:
cualquiera dispara `git reset --hard` + `pnpm install` + `pnpm run build`.

**Cambios:**
1. `src/routes/webhooks.routes.ts:35-37`: si falta `GITHUB_WEBHOOK_SECRET`,
   **rechaza con 503** y loguea el motivo. Nunca `return true`.
2. Verifica la firma sobre el **cuerpo crudo**, no sobre `JSON.stringify`
   (hoy en `:42`, que además rompe la verificación real de GitHub).
   El parser global `express.json()` está registrado antes
   (`src/server.ts:103`), así que usa la opción `verify`:
   `express.json({ limit: '50mb', verify: (req, _res, buf) => { (req as any).rawBody = buf } })`
   y calcula el HMAC sobre `req.rawBody`. Mantén `timingSafeEqual` y compara
   longitudes antes.
3. `AUTO_DEPLOY`: cambia la semántica de "activado salvo que sea false" a
   "activado solo si es exactamente `true`":
   - `src/routes/webhooks.routes.ts:100`
   - `src/modules/scheduling/jobs/update-checker.job.ts:23`
   Y pon `AUTO_DEPLOY=false` en `.env.example`.
4. Idempotencia: guarda el último `x-github-delivery` procesado (en memoria basta)
   e ignora repeticiones, para evitar builds encadenados.
5. `requireWebhookAuth` (`:12-23`): elimina el default, acepta la clave solo por
   cabecera `x-api-key` o `Authorization: Bearer` (**no** por query string, que
   queda en logs e historiales) y compara en tiempo constante.
6. `src/middleware/auth.middleware.ts:52`: mantén la exención de
   `/api/webhooks` **solo** para `/api/webhooks/github` (que ahora se defiende
   con HMAC) y protege `/api/webhooks/status` y `/api/webhooks/incoming` con la
   clave. Ajusta la comprobación de ruta para que sea exacta, no por prefijo laxo.

**Criterio de aceptación:**
- `POST /api/webhooks/github` sin `x-hub-signature-256` válida ⇒ 401.
- Sin `GITHUB_WEBHOOK_SECRET` configurada ⇒ 503 y **no** se ejecuta ninguna
  operación de Git.
- Con el secreto configurado, una firma calculada sobre el cuerpo crudo ⇒ 200.
- `GET /api/webhooks/status` sin clave ⇒ 401.

---

## FASE 3 — Bloquear SSRF en toda descarga saliente

**Problema:** el servidor hace `GET`/`POST` a URLs que elige un tercero, con
hasta 5 redirecciones y sin allowlist.

**Cambios:**
1. Crea `src/utils/safeHttp.ts`:
   - `assertPublicUrl(raw: string): Promise<URL>` que rechace: esquemas
     distintos de `http`/`https`, credenciales embebidas en la URL, y destinos
     en rangos no públicos — `127.0.0.0/8`, `10/8`, `172.16/12`, `192.168/16`,
     `169.254/16`, `0.0.0.0/8`, `100.64/10`, `::1`, `fc00::/7`, `fe80::/10`,
     IPv4 mapeada en IPv6 — **resolviendo el DNS primero** (no basta con
     comparar el string del host). Bloquea también nombres de metadata de nube
     (`metadata.google.internal`, `169.254.169.254`).
   - `safeDownload(url, { maxBytes, timeoutMs, maxRedirects = 2 })`: sigue las
     redirecciones **manualmente** (`maxRedirects: 0` en axios) validando
     **cada salto** con `assertPublicUrl`, y corta si el cuerpo supera
     `maxBytes` (por defecto 25 MB).
2. Usa `safeDownload` en `src/modules/messages/message.service.ts:175-183`
   (dentro de `sendMediaFromUrl`, dejando el reintento de Google Drive intacto
   pero también validado).
3. Expón la capacidad a los plugins **a través del puente del host**, no con
   `axios` crudo (ver Fase 4): `api.httpGet(url, opts)` / `api.httpPost(url, body, opts)`
   implementados en `plugin.service.ts` sobre `safeDownload`. Migra
   `data/plugins/url-info.js:44` y `data/plugins/webhook.js:63` a ese puente y
   elimina el `axios` del sandbox.
4. Añade límite de tamaño y de tiempo en `src/core/scraper.ts` (hoy 15 s, sin
   tope de bytes) — no es SSRF local porque va prefijado a `r.jina.ai`, pero
   conviene acotarlo.

**Criterio de aceptación (añade tests unitarios en `tests/unit/safe-http.test.ts`):**
- `http://127.0.0.1:8000/api/settings`, `http://169.254.169.254/latest/meta-data/`,
  `file:///etc/passwd` y `http://[::1]:8000/` ⇒ rechazados con error claro.
- Una URL pública que redirige a `127.0.0.1` ⇒ rechazada en el salto.
- Una descarga que excede `maxBytes` ⇒ abortada.

---

## FASE 4 — Plugins: contención inmediata (y una decisión que NO debes tomar solo)

**Advertencia que debes respetar:** `node:vm` **no es una frontera de seguridad**
(lo dice la documentación de Node). Un plugin puede hacer
`Object.constructor("return process")()` y obtener el `process` real. Está
verificado en este proyecto. Por tanto:

> **NO afirmes en ningún commit, comentario, PR ni mensaje que esta fase "arregla"
> el sandbox de plugins.** Esta fase elimina los caminos accidentales y los
> secretos entregados a mano; el escape sigue siendo posible.

**Cambios (contención):**
1. `src/modules/plugins/plugin.service.ts:138`: elimina
   `global: this.apiKeysConfig`. No pases **ningún** objeto del host al contexto
   más allá de lo estrictamente necesario y documentado.
2. Sustituye el acceso a claves por un puente del host: el objeto `api` que ya
   se construye en `:205-248` debe ganar `httpGet`/`httpPost` (Fase 3) que
   inyecten la credencial en el servidor. Migra los plugins que usan
   `global.APIKeys`/`global.APIs` (búscalos con grep en `data/plugins/*.js`).
3. `:250-261`: añade **timeout** a `dispatchOnMessage` (p. ej. 10 s por plugin
   con `Promise.race`) y loguea el plugin que lo agota. Comenta explícitamente
   que una espera **síncrona** infinita (`while(true)`) no se puede interrumpir
   en el mismo proceso: por eso existe la Fase B.
4. Corrige el bug de `:68-72`: `config.APIKeys[provider] = keys[Math.floor(...)]`
   reemplaza un array por un string. Selecciona la clave **en el punto de uso**,
   no mutando la configuración.
5. Sanea el `id` de plugin en `savePlugin` / `deletePlugin` / `togglePlugin`
   (`:170-197`): acepta solo `/^[a-zA-Z0-9_-]{1,64}$/` y verifica con
   `path.resolve` que el archivo resultante quede **dentro** de `pluginsDir`.
   Hoy `id` viene del cuerpo de `POST /api/plugins` sin validar.
6. Actualiza el texto del prompt de la UI que documenta el contrato de plugins
   (`src/app/plugins/page.tsx:270-307` **y** el duplicado en `:626-663`) para
   describir el puente nuevo. Idealmente extrae ese texto a una sola constante
   o a un `.md` importado, porque hoy está duplicado.

**Decisión pendiente — PREGUNTA AL USUARIO antes de continuar:**
> Fase B (aislamiento real) tiene dos caminos:
> (a) `worker_threads` con `resourceLimits`, sin objetos del host, con el puente
>     `api.*` por mensajes (protege también contra bucles síncronos);
> (b) declarar los plugins como **código de confianza** y en ese caso exigir que
>     el dashboard nunca quede expuesto públicamente.
> Implementa solo Fase A y **pregunta** cuál de las dos quiere antes de tocar la
> Fase B.

**Criterio de aceptación:**
- Ningún plugin recibe ya las API keys ni `apiKeysConfig`.
- Un plugin con un `await` largo se interrumpe por timeout y el bot sigue vivo.
- `POST /api/plugins` con `id: "../../evil"` ⇒ 400 y ningún archivo escrito.

---

## FASE 5 — Endurecer la superficie HTTP

**Cambios en `src/server.ts`:**
1. Mueve `express.static` (`:134`) **después** de `app.use(basicAuth)` (`:138`),
   para que la UI no se sirva sin credenciales. Verifica que las exenciones de
   `/socket.io` y `/api/webhooks` de `auth.middleware.ts:52` sigan funcionando.
2. CORS (`:76-79`): sustituye `origin: true` por una allowlist leída de
   `ALLOWED_ORIGINS` (lista separada por comas). Por defecto, **sin** CORS
   (el dashboard consume rutas relativas del mismo origen). Aplica lo mismo al
   `cors` de Socket.IO (`:46-51`), que hoy es `origin: "*"`.
3. `app.set('trust proxy', 1)` (`:81`): léelo de `TRUST_PROXY` y por defecto usa
   `'loopback'`, no un número ciego. En `src/middleware/security.ts:14-24`,
   elimina el `skip` por loopback salvo en `NODE_ENV === 'development'`.
4. CSP (`:85-98`): mantén `'unsafe-inline'` (Next lo necesita) pero elimina
   `'unsafe-eval'` cuando `NODE_ENV === 'production'`. Ajusta también
   `connectSrc`, que hoy permite `http:` y `https:` arbitrarios.
5. Añade un endpoint público `GET /healthz` que devuelva solo
   `{ status, uptime, version }`, **sin** autenticación y sin datos internos,
   y úsalo en el `HEALTHCHECK` de la Fase 9.

**Criterio de aceptación:**
- `GET /index.html` sin credenciales ⇒ 401.
- `GET /api/settings` sin credenciales ⇒ 401.
- `GET /healthz` ⇒ 200 sin credenciales.
- Con `X-Forwarded-For: 127.0.0.1` el rate limiting **sí** cuenta.

---

## FASE 6 — Sacar los secretos del cliente, de los logs y de la configuración libre

**Cambios:**
1. `src/modules/settings/settings.controller.ts:14-17` (`GET /api/settings`):
   deja de devolver valores de secretos. Devuelve, para cada clave sensible,
   `{ hasValue: boolean }` o un enmascarado (`••••1234`). Aplica a
   `DASHBOARD_PASS`, `SUPERADMIN_KEY`, `BACKUP_ENCRYPTION_KEY`, `*_API_KEY`,
   `TELEGRAM_BOT_TOKEN`, `HTTPSMS_API_KEY`, `GITHUB_TOKEN`, `MONGO_URI`.
   Revisa la lista de `src/core/config.ts:29-70` y separa "config legible" de
   "secretos de escritura".
2. `POST /api/settings` (`:19-20`): hoy hace `updateSettings(req.body)` sin
   validar. Añade una **allowlist** de claves escribibles y bloquea las
   sensibles de seguridad, en particular `WHATSAPP_OWNER_NUMBER` (concederlo
   otorga los comandos admin de WhatsApp, ver `src/core/router.ts:102-105`),
   `DASHBOARD_USER`, `DASHBOARD_PASS` y `SUPERADMIN_KEY`. Para cambiarlas, exige
   un endpoint aparte con reautenticación.
3. `parse-env` (`:38-70`): allowlist de claves, valida el formato, haz **copia
   de seguridad** del `.env` previo antes de sobrescribir y rechaza el contenido
   si no incluye las variables obligatorias (hoy puede dejar el `.env`
   inservible).
4. Enmascarado en logs (`src/middleware/logger.ts:7-17`): amplía de
   `password|token` a una lista por patrón: `*_API_KEY`, `*_TOKEN`, `*_SECRET`,
   `*PASS*`, `masterKey`, `refreshToken`, `private_key`. Y **no** loguees el
   cuerpo de `parse-env` (lleva el `.env` entero).
5. `src/modules/autoresponders/sheets.routes.ts:53-60`: no devuelvas
   `refreshToken` al cliente; devuelve `hasToken`. Igual con
   `credentials.private_key`.

**Criterio de aceptación:**
- Al abrir el dashboard, ninguna respuesta HTTP contiene el valor de una API key
  ni de `DASHBOARD_PASS` (compruébalo en la pestaña Network).
- Con `LOG_LEVEL=debug`, `data/logs/out.log` no contiene valores de claves.
- `POST /api/settings` con `{"WHATSAPP_OWNER_NUMBER":"123"}` ⇒ rechazado.

---

## FASE 7 — Restauración y respaldos

**Cambios:**
1. `src/modules/system/backup.service.ts:211-283` (`restoreBackup`): antes de
   copiar, valida el índice del ZIP contra una **allowlist de rutas
   restaurables** (`data/database.db`, `data/database.json`,
   `data/uploads/**`, `data/templates*`). **Nunca** `data/plugins/**` (es código
   ejecutable), **nunca** `.env`, **nunca** `auth_info_baileys/**` salvo opt-in
   explícito. Si el ZIP contiene algo fuera de la allowlist, rechaza la
   restauración completa con un mensaje claro.
2. Exige que el archivo esté cifrado (`.enc`) y descártalo si no lo está.
3. Cifrado: `BACKUP_ENCRYPTION_KEY` dedicada (no `DASHBOARD_PASS`), **salt
   aleatorio por archivo** guardado junto al ciphertext, y **`aes-256-gcm`** con
   tag de autenticación en lugar de `aes-256-cbc` (hoy sin integridad:
   `:10-24`).
4. Excluye `.env` del ZIP del respaldo (`:70-74`). Si se quiere conservar, va
   cifrado con la clave dedicada y nunca en claro.
5. `createHumanReadableBackup` (`:342-401`): hoy genera un ZIP **sin cifrar**
   con `{ settings, templates, reminders }`. Cífralo con la misma clave y quita
   `refreshToken`/`private_key` del JSON.

**Criterio de aceptación:**
- Subir un ZIP que contenga `data/plugins/pwn.js` ⇒ rechazado, sin escribir nada.
- Subir un ZIP sin cifrar ⇒ rechazado.
- El respaldo ya no contiene `.env`.
- Restaurar un respaldo legítimo sigue funcionando.

---

## FASE 8 — Errores silenciosos que ocultan fallos

**Cambios:**
1. `src/server.ts:36-38`: `uncaughtException` debe loguear y **terminar** con
   `process.exit(1)` (PM2/systemd reinician). Hoy el proceso sigue vivo en
   estado indefinido. Deja un comentario explicando por qué.
2. `src/server.ts:213-215`: si `initDB()` falla, `process.exit(1)`. Hoy se
   limita a marcar el spinner y el servidor arranca con la persistencia rota.
3. `src/core/dbManager.ts:20-53`: elimina el fallback silencioso Mongo→Lowdb.
   Si `MONGO_URI` está definida y falla, **falla**. El modo Lowdb debe ser una
   decisión explícita (`DB_ENGINE=lowdb`). Esto evita bifurcar datos entre dos
   backends y perder escrituras.
4. Que los adaptadores **no** conviertan errores en "no hay datos": en
   `src/core/db/lowdb.adapter.ts` y `src/core/db/mongo.adapter.ts` hay ~24
   `catch` que devuelven `[]`/`null`/`false` sin log. Como mínimo, loguea con el
   nombre del método; lo correcto es propagar. Caso crítico:
   `isChatPaused() → false` significa que **la IA responde a un chat que un
   humano había pausado**.
5. `src/tools/index.ts:44-47`: `executeTool` busca en `allTools` mientras
   `src/core/agent.ts:78` solo decide qué *ofrecer* al modelo. La autorización
   vive en el prompt, no en el ejecutor: si el modelo emite el nombre de una
   herramienta no ofrecida, se ejecuta igual. Valida dentro de `executeTool` que
   el llamante esté autorizado y que la herramienta pertenezca al conjunto
   permitido para el canal. (Hoy no es explotable porque solo Telegram llama con
   `fullAccess=true` y WhatsApp no usa herramientas: es una trampa latente, pero
   se cierra en 5 líneas.)
6. Recordatorios atascados: `src/modules/scheduling/services/delivery.dispatcher.ts:34`
   marca `'processing'` y **no existe ningún camino que lo devuelva a
   `'pending'`**. Añade un job de arranque que recupere los `processing`
   huérfanos (con un `lockedUntil`/antigüedad) y los reintente. Hoy un reinicio
   en el momento equivocado pierde el recordatorio para siempre.
7. `setup-web/server.ts:12,22-34`: el PIN de 6 dígitos no tiene límite de
   intentos y se publica por túnel. Añade límite (p. ej. 5 intentos), caducidad
   y no lo expongas por túnel.

**Criterio de aceptación:**
- Matar la BD y arrancar ⇒ el proceso sale con código 1 y mensaje claro.
- Un `throw` no capturado termina el proceso y queda registrado.
- Existe una ruta que devuelve recordatorios `processing` antiguos a `pending`
  (test unitario).

---

## FASE 9 — Guardas de calidad (para que esto no se vuelva a romper)

**Cambios:**
1. `package.json`: añade `"test": "vitest run"`, `"typecheck": "tsc --noEmit"`,
   y arregla `"lint"`: `next lint` **no existe en Next 16**. Migra
   `.eslintrc.json` a un `eslint.config.mjs` (flat config, formato que exige
   ESLint 10) con `eslint-config-next` y usa `"lint": "eslint ."`.
2. `next.config.mjs:7-9`: elimina `typescript.ignoreBuildErrors: true`. Hoy
   `npx tsc --noEmit` da 0 errores, así que activarlo no rompe el build; a
   partir de ahí sí protege.
3. `package.json`: añade `"engines": { "node": ">=20.19.0" }` (Next 16 exige
   ≥20.9.0 y mongoose ≥20.19.0) y un `.nvmrc`. Corrige el README ("Node.js 18+")
   y `install.sh:275-276`, que hoy acepta Node 18 mientras la línea 221 dice 20.
4. CI: crea `.github/workflows/ci.yml` que en `pull_request` y `push` a `main`
   ejecute, con `pnpm install --frozen-lockfile`:
   `pnpm typecheck` → `pnpm test` → `pnpm build`.
   Documenta en el README que debe marcarse como *required check*.
5. Docker: `HEALTHCHECK` usando `/healthz` (Fase 5), `USER node`, y multi-stage
   para que `python3/make/g++` no queden en la imagen final. Quita el fallback
   `|| pnpm install` (`Dockerfile:17`), que enmascara un lockfile desincronizado.

**Criterio de aceptación:**
- `pnpm typecheck`, `pnpm test` y `pnpm lint` funcionan en local.
- El workflow de CI pasa en verde y falla si se introduce un error de tipo.

---

## VERIFICACIÓN FINAL (ejecuta y reporta la salida real)

```
npx tsc --noEmit --incremental false
npx vitest run
node -e "require('./next.config.mjs')"   # comprobar que el config carga
```
Y comprobaciones manuales:
- Arranque sin secretos ⇒ aborta con mensaje accionable.
- `pnpm run setup:secrets` ⇒ deja el `.env` utilizable y el bot arranca.
- `POST /api/webhooks/github` sin firma ⇒ 401; sin secreto ⇒ 503.
- `sendMediaFromUrl` con URL interna ⇒ rechazada.
- `GET /index.html` sin credenciales ⇒ 401.

## AL TERMINAR, ENTREGA
1. La lista de archivos tocados por fase.
2. Los comandos ejecutados y su salida (textual).
3. Las decisiones que tomaste y por qué.
4. Lo que quedó pendiente, con la Fase B de plugins explícitamente marcada como
   **pendiente de decisión del usuario**.
5. **Ninguna afirmación de que el sandbox de plugins está resuelto.**

## FUERA DE ALCANCE (no lo toques en este cambio)
- Refactor de los adaptadores de BD, `memory.ts`, los 324 `any`, la duplicación
  de proveedores de IA, el frontend, la documentación histórica
  (`BITACORA.md`) y el versionado de tags. Eso va en un cambio aparte.
