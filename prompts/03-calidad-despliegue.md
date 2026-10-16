# TAREA: Guardas de calidad, despliegue reproducible y documentación veraz

## OBJETIVO
Que ningún cambio roto llegue a `main`, que el despliegue sea reproducible y
auditable, y que la documentación diga la verdad.

## CONTEXTO
- Monolito: Express 5 sirve el export estático de Next 16 y ejecuta Baileys,
  Telegram y el scheduler. Gestor: **pnpm**. TS `strict` sin errores hoy.
- Estado verificado: **no existe script `test`** en `package.json`; `pnpm lint`
  está roto; el único workflow publica imagen a ghcr sin verificar nada.
- **Solapamiento con la Tanda 1:** el script `test`/`typecheck`, la migración a
  flat config de ESLint, quitar `ignoreBuildErrors` y el workflow de CI están en
  la Fase 9 de la Tanda 1. Si ya los aplicaste, **omítelos aquí** y quédate con
  lo demás.

## REGLAS DE TRABAJO
1. Rama: `chore/quality-and-deploy`. Un commit por fase.
2. No actualices dependencias salvo que la fase lo pida; no toques el lockfile
   para "arreglar" un fallo sin entenderlo.
3. Todo lo que ejecutes y reportes debe ser la salida **real**, no la esperada.
4. Antes de cambiar `install.sh` o `update.sh`, pruébalos en un contenedor o
   VM desechable. Estos scripts tocan el sistema del usuario.
5. No hay que reescribir la documentación entera: corrige lo que es **falso**.

---

## FASE 1 — Que la suite y el análisis estático sean ejecutables

*(omite si ya lo hiciste en la Tanda 1)*

1. `package.json`: añade `"test": "vitest run"`, `"typecheck": "tsc --noEmit"`,
   `"test:coverage": "vitest run --coverage"` y añade
   `@vitest/coverage-v8` como devDependency. Arregla `"lint"`: `next lint` **ya
   no existe en Next 16**; migra `.eslintrc.json` a `eslint.config.mjs` (flat
   config, obligatorio en ESLint 10) y usa `"lint": "eslint ."`.
2. `next.config.mjs`: elimina `typescript.ignoreBuildErrors: true`. Hoy hay 0
   errores, así que no rompe nada y a partir de ahí protege.
3. Añade `"engines": { "node": ">=20.19.0" }` y `.nvmrc`. Next 16 exige ≥20.9.0
   y mongoose ≥20.19.0, pero el README y `install.sh` aceptan Node 18.
4. CI: `.github/workflows/ci.yml` con `pnpm install --frozen-lockfile` →
   `pnpm typecheck` → `pnpm test` → `pnpm build`, en `pull_request` y `push` a
   `main`. Añade el reporte de cobertura como artefacto.
5. **Desenmascara el lockfile en Docker:** `Dockerfile` usa
   `pnpm install --frozen-lockfile || pnpm install`, que convierte un lockfile
   desincronizado en un despliegue silenciosamente distinto. Deja solo la
   variante estricta.

**Criterio de aceptación:** `pnpm test`, `pnpm typecheck` y `pnpm lint`
funcionan; el CI pasa en verde y **falla** si se introduce un error de tipo.

---

## FASE 2 — Tests que valen: eliminar los falsos y cubrir lo crítico

1. **Dos tests no prueban código de producción y hay que arreglarlos:**
   - `tests/integration/llm.test.ts:4-21` define dos mocks locales y prueba su
     propia función: no importa `src/core/llm.ts`. Reescríbelo para ejercitar
     `callLLM` con los proveedores simulados (inyecta las claves por entorno) y
     verifica el orden de failover y que el error final agregue las causas.
   - `tests/unit/reminder-checker.test.ts:8-33` reimplementa la lógica dentro del
     test y **nunca importa** `ReminderCheckerJob`. Reescríbelo contra el módulo
     real (`parseReminderTime` ya es estático y testeable).
2. Añade cobertura por riesgo, en este orden:
   1. `src/middleware/auth.middleware.ts` — credenciales correctas/incorrectas,
      bloqueo tras 5 intentos, y que la exención de rutas no cubra `/api/settings`.
   2. `src/routes/webhooks.routes.ts` — firma válida/inválida/ausente sobre el
      **cuerpo crudo**.
   3. `src/core/router.ts` `handleWhatsAppMessage` con mensajes sintéticos:
      deduplicación por id, exclusión de estados/broadcast/newsletter,
      whitelist/blacklist, grupos deshabilitados, y que un mensaje de un usuario
      normal **no** ejecute comandos admin.
   4. `src/utils/documentParser.ts` — con un xlsx/xlsx malformado y con uno
      grande (comportamiento ante errores y límites).
   5. Los jobs del scheduler: `ReminderCheckerJob` (ventana de retraso,
      `MAX_DELAY_MINUTES`) y `SheetsSyncJob`.
3. No persigas un porcentaje global: prioriza por riesgo y deja el umbral de
   cobertura como *ratchet* (que no baje), no como objetivo.

**Criterio de aceptación:** los dos tests falsos ahora fallan si se rompe el
módulo real (compruébalo introduciendo un fallo temporal y revirtiéndolo).

---

## FASE 3 — Docker reproducible y no privilegiado

1. `Dockerfile`: multi-stage. Etapa de build con `python3 make g++` y
   devDependencies; etapa final `node:20-alpine` (o `node:22-alpine`) **sin**
   toolchain, con `USER node`, `HEALTHCHECK` contra `/healthz` y solo
   dependencias de producción.
2. **Producción no debe depender de una devDependency:** hoy `start` ejecuta
   `tsx` (`package.json`), que está en `devDependencies`, así que un
   `pnpm install --prod` rompe el arranque y en producción se ejecuta TypeScript
   sin compilar. Añade una etapa de compilación (esbuild o `tsc`) que genere
   `dist/` y arranca con `node dist/server.js`. Si decides no compilar, entonces
   mueve `tsx` a `dependencies` y **documenta** que se ejecuta TS en producción.
3. **`.dockerignore` excluye `data/`, así que la imagen publicada no lleva los 16
   plugins que sí están versionados en git.** Decide explícitamente: incluir
   `data/plugins/` en la imagen (recomendado, ya que se versionan) o documentar
   que solo funcionan por el bind mount de compose.
4. `docker-compose.yml`: quita el mapeo del puerto 3000 (no se usa en producción
   con `output: 'export'`), añade `healthcheck`, límites de CPU/memoria y
   `restart: unless-stopped` ya está. Considera `read_only: true` con los
   volúmenes necesarios.
5. Workflow de publicación: etiqueta la imagen con `vX.Y.Z` **y** el SHA corto,
   no solo `latest` (hoy es imposible hacer rollback por versión). Ejecuta el
   build de la imagen **después** de que el CI de la Fase 1 pase.

**Criterio de aceptación:** la imagen arranca como usuario no root, responde al
healthcheck, `docker history` no muestra el toolchain, y existe un tag por versión.

---

## FASE 4 — Terraform: no abrir el panel al mundo

*Verifica las líneas exactas en `main.tf` y `variables.tf` antes de editar.*

1. `variables.tf` tiene `allowed_ssh_ips` con default `["0.0.0.0/0"]`. Cámbialo por
   una variable **obligatoria** sin default, o por un placeholder evidente que
   falle en `terraform plan` si no se sobrescribe. Lo mismo para cualquier regla
   de ingress.
2. **No publiques el puerto del panel (8000) a `0.0.0.0/0`.** Opciones, en orden
   de preferencia: (a) no exponerlo y acceder por túnel SSH o por un reverse
   proxy con TLS y autenticación; (b) restringirlo al CIDR de administración;
   (c) si se expone, exigir que `DASHBOARD_USER`/`DASHBOARD_PASS`/`WEBHOOK_API_KEY`
   vengan de variables y que el arranque falle sin ellas (Tanda 1).
3. El `user_data` copia `.env.example` como configuración: eso despliega
   credenciales placeholder. Inyéctalas como variables de Terraform (marcadas
   `sensitive`) o vía SSM/secret manager.
4. Añade el bloque `backend` (S3 + tabla de DynamoDB para *locking*) con un
   ejemplo comentado; hoy el estado es local, sin locking ni cifrado remoto.
5. `fail2ban` se instala pero no se configura ninguna regla: configura un *jail*
   para SSH o elimínalo del script para no dar falsa seguridad.
6. Añade a `outputs.tf` la URL del panel y la IP, y documenta el procedimiento de
   primer arranque (generar secretos, no usar los de ejemplo).

**Criterio de aceptación:** `terraform plan` con la configuración por defecto
**no** abre 22 ni 8000 al mundo, y el estado queda remoto.

---

## FASE 5 — Observabilidad mínima

1. **Rotación de logs.** PM2 escribe en `data/logs/` (`ecosystem.config.js`) y no
   hay `logrotate` ni `pm2-logrotate`. La purga por antigüedad
   (`src/modules/scheduling/jobs/file-cleanup.job.ts`) **nunca** aplica a un log
   activo porque su mtime se actualiza constantemente. Instala y configura
   `pm2-logrotate` en el instalador, o cambia a JSON por stdout con rotación del
   runtime de Docker.
2. `GET /healthz` público (Tanda 1, Fase 5) y úsalo en el `HEALTHCHECK` y en
   compose. Documenta que el endpoint de salud actual está detrás de Basic Auth y
   por eso no sirve para orquestadores.
3. Que los fallos repetidos avisen: engancha el `errorHandler` y el helper
   `safeRun` del scheduler a `NotificationHub` para no depender de que alguien
   mire la consola.

**Criterio de aceptación:** llenar el log no llena el disco; `/healthz` responde
sin credenciales; un error recurrente genera una notificación.

---

## FASE 6 — Instalación y actualización: una sola política

Hoy hay **tres procedimientos contradictorios** y el más visible es el que
pierde trabajo:
- `update.sh` (~líneas 96-120): `git stash` + `pull --rebase` + `stash pop`. El bueno.
- El actualizador interno: `git reset --hard origin/<rama>` (`src/modules/system/update.service.ts`).
- El README (~líneas 424-427): `git restore . && git pull origin main`, que
  descarta cambios locales. Y `TROUBLESHOOTING.md` (~líneas 112-113) llega a
  recomendar borrar `pnpm-lock.yaml`, que destruye la reproducibilidad.

**Cambios:**
1. Elige **una** política (recomendado: la de `update.sh`) y haz que el
   actualizador interno la use: `fetch` + `stash` + `rebase` + `stash pop`, con
   respaldo de **todo `data/`** antes de tocar Git. Hoy el respaldo previo solo
   copia la base de datos y `.env`: si algo sale mal, se pierden `data/plugins/`
   y `data/accessList.json`.
2. `AUTO_DEPLOY` por defecto en `false` (Tanda 1, Fase 2) y exige confirmación
   explícita desde Telegram y desde la web antes de aplicar.
3. **`install.sh` nunca detecta que ya estás dentro del repo:** comprueba
   `grep -q "botmare-unified"` sobre `package.json` (**línea ~120**), pero el
   paquete se llama `botmare-dashboard`, así que siempre clona una segunda copia
   en `./BotMaRe`. Detecta por `name`, por `.git` o por la existencia de
   `src/server.ts`.
4. `install.sh` (~línea 308) y `setup.sh` (~línea 25) hacen
   `pnpm config set ignore-scripts false`, que **desactiva** la protección de
   pnpm 10 y permite scripts de build arbitrarios. Quítalo y usa
   `pnpm approve-builds`, como ya recomienda `TROUBLESHOOTING.md`.
5. Los instaladores desatendidos ejecutan `sudo apt-get`, añaden NodeSource y
   crean un swapfile editando `/etc/fstab` **sin preguntar**. Añade confirmación
   explícita para los cambios de sistema y verifica la integridad de las
   descargas (checksum) en lugar de `curl | bash` a ciegas.
6. `install.sh` no configura `pm2 startup` + `pm2 save`: tras reiniciar el VPS el
   bot no vuelve. Añádelo al final.
7. Unifica el doble mecanismo de aprobación de builds: `pnpm-workspace.yaml` usa
   `allowBuilds` y `package.json` usa `pnpm.onlyBuiltDependencies` con las mismas
   dependencias. Deja una sola fuente y verifícala en CI.

**Criterio de aceptación:** ejecutar `./install.sh` dentro del repo **no** clona
una segunda copia; tras reiniciar, el bot arranca solo; no se permiten scripts de
build arbitrarios.

---

## FASE 7 — Versionado y releases

1. **`launcher.js` (~líneas 202-206) hace `git checkout` del último tag para
   "Actualizar a Estable", y el último tag es v1.5.3 (junio) frente a la versión
   actual 2.7.0:** la opción **degrada** el proyecto. Que use GitHub Releases y
   que se **niegue** a aplicar un tag anterior a la versión instalada.
2. `UpdateService.fetchReleases` (`src/modules/system/update.service.ts`) depende
   de Releases que no existen. Publica releases con tag `vX.Y.Z` y notas, y
   enlázalas con el Centro de Actualizaciones.
3. Un solo origen de versión: `package.json`. Hoy los scripts declaran versiones
   propias y contradictorias (`install.sh` se anuncia como "Versión 3.0",
   `update.sh` como "2.5.0", `BITACORA.md` como 2.5.0, el producto es 2.7.0).
   Léela de `package.json` o elimina esas cadenas.
4. Arregla el prompt del menú: dice `[1-13]` con 16 opciones (`bin/launcher.js`
   ~línea 118).

**Criterio de aceptación:** "Actualizar a Estable" no puede retroceder de
versión; un release publicado aparece en el Centro de Actualizaciones.

---

## FASE 8 — Documentación veraz

Corrige solo lo comprobadamente falso (verifica cada afirmación antes de
editarla):

| Documento | Afirmación actual | Realidad |
|---|---|---|
| `README.md` (~línea 8) | "Tests 52 Passed" | son **53** y hoy no hay script para correrlos |
| `README.md` (~línea 9) | "Node.js 18+" | se requiere **≥20.19.0** |
| `README.md` (~línea 397) | enlace a `file:///C:/Proyectos/...` | enlace roto; además filtra una ruta local |
| `README.md` (~línea 401) | "purga `purgePreKeys` cada 1 hora" | el job está **comentado** (`src/modules/scheduling/core/task-runner.ts`, ~líneas 60-61) |
| `README.md` (~líneas 424-427) | `git restore . && git pull` | política destructiva; ver Fase 6 |
| `BITACORA.md` (~línea 4) | "ESTADO: VERSIÓN 2.5.0" | el producto es 2.7.0; faltan las entradas de 2.6 y 2.7 |
| `BITACORA.md` (~línea 97) | referencia a `rag_project_notes.md` | el archivo no existe |
| `docs/ARCHITECTURE.md` | frontend "en el puerto 3000"; `bot.db` | el estático se sirve en 8000 desde `out/`; el código usa `data/database.db` y `data/database.json` |
| `docs/MODULES.md` | `git pull` + detección main/master; tolerancia 60 min | el updater usa la rama actual; `MAX_DELAY_MINUTES` es **120** |
| `.env.example` | — | falta `WEBHOOK_API_KEY` y las de Google; `LOGGER_LEVEL` es inerte (el logger lee `LOG_LEVEL`); el dominio de SMS difiere del código (`.online` vs `.site`) |

Además:
1. Corrige los comentarios desincronizados con el código:
   `src/modules/scheduling/core/task-runner.ts` (~líneas 34-46) dice "cada 30
   segundos" sobre un intervalo de 60 s y "cada 1 minuto" sobre 5 minutos.
2. Añade `SECURITY.md` con la lista de despliegue seguro: secretos obligatorios,
   no exponer el panel públicamente, modelo de confianza de los plugins (código
   de confianza hasta que exista aislamiento real), y cómo rotar claves.
3. Añade `.github/dependabot.yml`, `CODEOWNERS` y plantillas de PR/issue. No hay
   ninguna automatización de dependencias ni pre-commit.

**Criterio de aceptación:** cada afirmación de la tabla corregida y contrastada
contra el código; el README permite instalar y arrancar en una máquina limpia
siguiéndolo al pie de la letra.

---

## FASE 9 — Frontend (opcional, si queda presupuesto)

1. **No hay cliente de API compartido:** 76 `fetch()` directos repartidos en 20
   archivos, mezclando `fetch` y `axios`. Crea un `src/lib/api.ts` con manejo de
   errores y tipos, y migra por páginas.
2. `src/hooks/useBotData.ts` es un *god hook* que concentra todo el estado, con
   un efecto cuya dependencia se reprograma a sí misma (`diffusionProgress` está
   dentro de su propio array de dependencias). Sácalo de las dependencias y
   divide el hook por dominio.
3. Hay **4 conexiones socket independientes** (`useBotData`, `useNotifications`,
   `useWhatsApp`, `SupportDashboard`). Unifícalas en un solo proveedor.
4. Sustituye los `catch` vacíos por estados de error visibles: hoy un módulo
   deshabilitado o una difusión colgada no se diagnostican.

## VERIFICACIÓN FINAL
```
pnpm install --frozen-lockfile
pnpm typecheck && pnpm test && pnpm lint && pnpm build
docker compose build && docker compose up -d && curl -f localhost:8000/healthz
terraform validate && terraform plan    # comprobar que no abre puertos al mundo
```

## AL TERMINAR, ENTREGA
1. Archivos tocados por fase y comandos ejecutados con su salida real.
2. Qué afirmaciones de documentación resultaron **falsas** y cuáles ya eran
   correctas.
3. Lo que quedó fuera y por qué.

## FUERA DE ALCANCE
Seguridad (Tanda 1), persistencia y tipos de dominio (Tanda 2), y cualquier
reescritura de la interfaz más allá de la Fase 9.
