# TAREA: Unificar la capa de persistencia de BotMaRe v2.7.0

## OBJETIVO
Que `IDatabaseAdapter` sea de verdad una abstracción: que lowdb y Mongoose se
comporten igual, que ningún error se convierta en "no hay datos" y que exista una
sola fuente de verdad para la configuración y los tipos de dominio.

## CONTEXTO
- Dos implementaciones del mismo contrato: `src/core/db/lowdb.adapter.ts` y
  `src/core/db/mongo.adapter.ts`, sobre la interfaz `src/core/db/db.adapter.ts`.
- Se elige motor en `src/core/dbManager.ts:20-53`: si hay `MONGO_URI` usa Mongo;
  si falla, **cae a lowdb en silencio**.
- Todos los consumidores pasan por los proxies de `src/core/dbManager.ts:64-161`
  o por el shim `src/core/memory.ts` (49 líneas que reexportan 35 funciones sin
  transformarlas; 21 archivos importan de `memory`, 7 de `dbManager`).
- TypeScript `strict: true`, `npx tsc --noEmit` en 0 errores. Debe seguir así.
- **Solapamiento con la Tanda 1 (seguridad):** si ya aplicaste el `process.exit(1)`
  en el fallo de BD, el fin del fallback Mongo→lowdb, la propagación de errores en
  adaptadores y la recuperación de recordatorios en `'processing'`, **omite esos
  puntos aquí** y anota que ya están hechos.

## REGLAS DE TRABAJO
1. **Orden no negociable:** primero los *contract tests* (Fase 1), después los
   arreglos (Fase 2). Sin tests que fijen el comportamiento actual, cualquier
   "unificación" es una apuesta.
2. Rama: `refactor/db-contract`. Un commit por fase.
3. Antes de tocar un adaptador, lee los dos archivos completos y compáralos
   método por método. Haz una tabla de divergencias y **pégala en el PR**.
4. Ejecuta tras cada fase: `npx tsc --noEmit --incremental false` y `npx vitest run`.
5. **Cualquier cambio que afecte datos ya persistidos** (migración de tipos,
   cambio de semántica de borrado, `DB_ENGINE`) requiere: copia de seguridad
   previa de `data/`, migración idempotente y marcha atrás documentada.
6. No cambies el esquema de la UI ni los endpoints públicos: el frontend y el
   bot de Telegram son consumidores y no deben romperse.

---

## FASE 1 — Contract tests de `IDatabaseAdapter` (antes de arreglar nada)

Crea `tests/contract/db.adapter.contract.ts`: una función que recibe un adapter
ya inicializado y ejecuta la **misma batería** contra él.

- Ejecuta siempre contra lowdb (fichero temporal, sin tocar `data/` real).
- Ejecuta contra Mongo solo si existe `MONGO_URI_TEST`; si no, `describe.skip`
  con un mensaje claro. Documenta en el README cómo correrlo.
- Casos mínimos a fijar (los que hoy divergen):
  1. `getSettings()` → valores por defecto **idénticos** en ambos motores.
  2. `saveUser`/`getUser` → defaults aplicados; y que `data` con campos
     `undefined` **no** borre los defaults.
  3. `deleteRemindersBulk('pending' | 'sent' | 'all')` → define en la interfaz
     qué significa cada uno y verifica que se cumple igual.
  4. `checkReminderExistsByMediaPath` → mismo resultado con la misma entrada
     (mayúsculas, rutas relativas, rutas con `./`, solo basename).
  5. `getSheetSyncSettings` / `saveSheetSyncSettings` → ida y vuelta.
  6. `updateReminderStatus` → transiciones y filtrado de
     `listAllPendingReminders`.
  7. `createReminder` repetido en el mismo milisegundo → ids únicos.

**Criterio de aceptación:** los tests corren en verde contra lowdb y **fallan**
contra Mongo en los puntos que la auditoría detectó. Esos fallos son el trabajo
de la Fase 2; déjalos documentados (puedes marcarlos `it.fails` temporalmente
con un comentario que apunte a la fase que los arregla).

---

## FASE 2 — Corregir las divergencias reales

Cada punto con su evidencia (verifica las líneas: pueden haberse desplazado):

1. **Google Sheets no existe en Mongo.** `src/core/db/mongo.adapter.ts:466-473`
   solo hace `console.warn` y devuelve `null`; lowdb sí lo implementa. Con
   `MONGO_URI` configurado, el usuario conecta Sheets, la UI dice OK y **el
   `refreshToken` se descarta**. Implementa el modelo que falta
   (`SheetSyncSettingsModel` en `src/core/db/mongo.models.ts`) siguiendo el
   patrón de los demás. Si decides no implementarlo, entonces la ruta debe
   devolver **501 con mensaje explícito** y la UI debe mostrarlo: lo que no puede
   seguir es un `warn` invisible.
2. **`deleteRemindersBulk` borra conjuntos distintos.** lowdb conserva solo
   `sent` al pedir `'pending'`; Mongo usa `$ne: 'sent'`, que en MongoDB también
   coincide con documentos **sin** el campo `status`. Unifica la semántica,
   **documéntala en la interfaz** y ten en cuenta que el frontend
   (`src/components/reminders/PendingList.tsx:60`) llama a `type=pending` y
   `type=failed` esperando limpiar ambos.
3. **`possible_responses` por defecto difiere.** `lowdb.adapter.ts:94` tiene
   `\\n` literal; `mongo.adapter.ts:58` tiene salto real. El **prompt de la IA
   cambia según el motor**. Unifica el valor y añade un test que compare los
   defaults de ambos adaptadores campo por campo.
4. **`saveUser` sin defaults en Mongo.** lowdb (`:62-68`) los aplica pero con el
   spread al final, que puede sobrescribirlos con `undefined`; Mongo no aplica
   ninguno. Define los defaults una sola vez (helper compartido) y aplícalos en
   ambos.
5. **`checkReminderExistsByMediaPath` no es equivalente.** lowdb normaliza con
   `path.normalize` + `toLowerCase` y compara sufijos; Mongo hace regex sobre el
   basename. Define **una** normalización canónica (sugerencia: basename en
   minúsculas, que es lo que ambos pueden hacer igual) y úsala en los dos.
6. **`generateNumericId` está copiado tres veces:** `lowdb.adapter.ts` (~`:25`),
   `mongo.adapter.ts` (~`:16`) y `dbManager.ts:56-58`. Extráelo a un módulo
   compartido. Ojo: `Date.now() + rand(0..999)` puede colisionar bajo carga; si
   cambias la estrategia, debe seguir devolviendo un **number** y no romper los
   ids ya guardados.
7. **`updateSettings` no valida tipos.** La firma promete `Record<string,string>`
   y `settings.controller.ts:20` pasa `req.body` sin validar. Valida (o
   serializa) en la entrada del adaptador, no en el controlador.

**Criterio de aceptación:** la batería de la Fase 1 en verde contra **ambos**
motores, con la tabla de divergencias del PR actualizada.

---

## FASE 3 — Que los errores dejen de disfrazarse de "no hay datos"

1. En `lowdb.adapter.ts` y `mongo.adapter.ts` hay **~24 `catch` que devuelven
   `[]`, `null` o `false` sin registrar nada**. Revísalos uno a uno:
   - Añade un `logger.error` con el nombre del método y el error.
   - **Propaga** el error salvo que exista una razón de negocio documentada
     para degradar. Regla práctica: si el `catch` no puede hacer nada útil,
     debe re-lanzar.
2. Caso crítico: `isChatPaused()` devolviendo `false` ante un error de Mongo
   significa que **la IA responde a un chat que un humano había pausado**. Haz
   que propague y que `src/core/router.ts` (donde se consulta) decida de forma
   **conservadora**: si no se puede saber si está pausado, es preferible no
   responder y registrar el fallo, que responder de más.
3. `src/core/migrator.ts:58-59,78` accede a lowdb crudo con
   `ldb.get('settings').find(...).value()`. Cámbialo por llamadas al adaptador.
4. `src/core/dbManager.ts:17-18` exporta `ldb: any` e `isMongo` mutables. Deja de
   exportarlos: si hace falta saber el motor, usa `getActiveEngine()` (ya existe)
   y tipado.

**Criterio de aceptación:** simula un fallo del motor (cierra la conexión /
renombra el fichero) y comprueba que la app **registra y no finge** que no hay
datos. Añade un test que lo cubra para al menos `isChatPaused` y
`listAllPendingReminders`.

---

## FASE 4 — Una sola fuente de verdad para la configuración

Hoy hay dos rutas con precedencias distintas:
- `src/core/config.ts:10-19` (`getConfig`): BD → `process.env` → default.
- `src/core/dbManager.ts:67-78` (`getSettings`): solo BD, cacheada 5 min, y
  **nunca** consulta `process.env`. `getAllConfig` (`config.ts:22-80`) mezcla
  ambas con una lista blanca escrita a mano.

Consecuencia: cambiar `AI_ENABLED` en el dashboard o en el `.env` puede dar
resultados distintos según quién lea.

**Cambios:**
1. Define **una** precedencia y documéntala en un comentario de cabecera y en el
   README. Sugerencia: `.env` define los valores de arranque; la BD puede
   sobrescribirlos (que es el comportamiento actual de `getConfig`) — pero
   elígelo explícitamente y úsalo en todas partes.
2. Un único módulo (`src/core/config.ts`) que exponga `getConfig`, `getAllConfig`
   y `setConfig`, alimentado por la caché de `getSettings`.
3. Arregla el aliasing de la caché: `src/utils/cache.ts:11-19` devuelve **la
   referencia** al objeto, y los consumidores hacen `as any` y lo mutan. Devuelve
   una copia (o congela el objeto) para que nadie pueda corromper la caché sin
   pasar por `updateSettings`.
4. `getAllConfig` se ejecuta en **cada** llamada al LLM (vía `src/core/llm.ts:163`)
   reconstruyendo ~40 claves. Reutiliza la caché.

**Criterio de aceptación:** un test que cambie una misma clave por las dos rutas
y verifique que todos los lectores ven el mismo valor.

---

## FASE 5 — Colapsar el shim `memory.ts` y tipar el proxy

1. **Elimina `src/core/memory.ts`.** Reexporta 35 funciones sin transformarlas;
   además `export const db: any = null` (`:5`) es un export muerto. Reescribe los
   ~21 imports a `core/dbManager` (o al nombre nuevo).
2. Renombra `src/core/dbManager.ts` a `src/core/db/index.ts` y expón ahí el
   acceso a datos. Un solo punto de instrumentación y logging.
3. **Tipa los proxies.** Hoy `dbManager.ts:88` degrada a `Array<any>` un tipo que
   la interfaz define bien. Usa el tipo derivado de la interfaz:
   `export const createRemindersBulk: IDatabaseAdapter['createRemindersBulk'] = (...args) => adapter.createRemindersBulk(...args);`
   Objetivo medible: reducir los `any` de la capa de datos (hoy ~324 en todo el
   proyecto, con 17 solo en `dbManager`+adaptadores).

**Criterio de aceptación:** `grep -r "core/memory" src` sin resultados;
`tsc --noEmit` en 0; la suite en verde.

---

## FASE 6 — Sacar CRM, listas de acceso y telemetría del `writeFileSync`

Estos tres siguen escribiendo en el sistema de ficheros **aunque Mongo esté
configurado**, así que en Docker se pierden en cada despliegue:

- `src/core/crm.service.ts:50` (`data/crm.json`), con `saveDB` en `:87`
  reescribiendo **el JSON completo en cada mensaje entrante** de WhatsApp.
- `src/core/accessControl.ts:35` (`data/accessList.json`), `:67`.
- `src/core/telemetry.ts:51`: `writeFileSync` **síncrono en cada petición LLM**.

**Cambios (en este orden):**
1. **Mínimo viable si no hay tiempo para migrar:** flag `dirty` + debounce
   (200-500 ms) + `fs.promises.writeFile`, y en telemetría acumular en memoria y
   volcar cada N segundos. Esto ya elimina el bloqueo del event loop.
2. **Correcto:** llévalos a los adaptadores (colecciones propias o el contrato
   existente) para que `MONGO_URI` signifique algo. Empieza por CRM, que es el
   que más escribe.
3. Mantén compatibilidad: si el JSON local existe y la BD está vacía, migra una
   vez (idempotente) y deja un marcador, como hace `src/core/migrator.ts`.

**Criterio de aceptación:** con `DB_ENGINE=lowdb` el comportamiento es idéntico
al actual; con Mongo, los tres datos sobreviven a un reinicio del contenedor.

---

## FASE 7 — Tipos de dominio únicos

Hay dos definiciones contradictorias para la misma entidad:
- `src/core/db/interfaces.ts:28-43` → `ReminderData` con `timestamp: Date`,
  `repeat: string` (obligatorio).
- `src/types.ts:1-16` → `Reminder` con `timestamp: string`, `repeat?: string`.

Y los adaptadores escriben `new Date()`, que al serializarse en JSON queda como
string. Además `src/components/CRMUI.tsx:36-68` redefine `CRMContact`, `CRMTag`
y `CRMStats`, que ya existen en `src/core/crm.service.ts:4-32`.

**Cambios:**
1. Crea `src/domain/` con los tipos de dominio. **Una** definición por entidad.
2. Decide la representación de las fechas y sé coherente de extremo a extremo
   (recomendado: ISO string en la frontera de persistencia y en el transporte;
   `Date`/`DateTime` solo en la lógica). Documenta la decisión.
3. Haz que el frontend importe los tipos de dominio en lugar de redeclararlos.
4. `src/core/dbManager.ts:12,14` reexporta tipos desde `db/interfaces` **y**
   desde `db/mongo.models`, así que los consumidores reciben tipos de dominio
   colados por un backend concreto. Deja de reexportar los modelos.

**Criterio de aceptación:** `grep -c "interface Reminder" src` = 1;
`grep -c "interface CRMContact" src` = 1; la UI compila sin cambios de
comportamiento.

---

## VERIFICACIÓN FINAL
```
npx tsc --noEmit --incremental false
npx vitest run
MONGO_URI_TEST=... npx vitest run tests/contract   # si tienes un Mongo de pruebas
```
Manual: arrancar con Mongo, conectar Google Sheets, reiniciar, y comprobar que
el `refreshToken` sigue ahí (el bug más caro de esta tanda).

## AL TERMINAR, ENTREGA
1. La tabla de divergencias encontradas (antes/después).
2. Los archivos tocados por fase y los comandos con su salida.
3. Qué decisiones tomaste y cuáles quedaron pendientes de decisión de producto.

## FUERA DE ALCANCE
Seguridad (Tanda 1), CI/Docker/Terraform/documentación (Tanda 3), y el rediseño
de la interfaz del dashboard.
