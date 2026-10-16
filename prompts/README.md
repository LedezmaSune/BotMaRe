# Prompts de remediación — BotMaRe v2.7.0

Tres prompts listos para entregar a un agente de codificación. Cada archivo es
**autocontenido**: contexto, referencias `archivo:línea`, fases con criterios de
aceptación, verificación y alcance excluido.

## Archivos

| # | Archivo | Alcance | Riesgo de no hacerlo |
|---|---|---|---|
| 1 | [01-seguridad.md](01-seguridad.md) | Secretos por defecto, webhooks, SSRF, plugins, superficie HTTP, respaldos, errores silenciosos, guardas de CI | **Existe explotación activa hoy** con la configuración que se entrega |
| 2 | [02-arquitectura-datos.md](02-arquitectura-datos.md) | Unificar los adaptadores lowdb/Mongo, propagar errores, una sola fuente de configuración, tipos de dominio | Pérdida silenciosa de datos (el `refreshToken` de Sheets se descarta con Mongo) |
| 3 | [03-calidad-despliegue.md](03-calidad-despliegue.md) | CI, tests reales, Docker, Terraform, observabilidad, instalación/actualización, versionado, documentación | Nada impide que un cambio roto llegue a `main`; despliegue no reproducible |

## Orden recomendado

1. **01-seguridad.md** primero. Es lo único con explotación activa, y además
   introduce `pnpm run setup:secrets`, `GET /healthz` y la validación de arranque
   que las otras dos tandas dan por supuestos.
2. **03-calidad-despliegue.md, Fase 1** (CI + typecheck + lint) inmediatamente
   después. Es barata y, a partir de ahí, cualquier error de las otras tandas lo
   detecta el CI en lugar de producción. Si solo pudieras hacer una cosa de la
   Tanda 3, haz esa.
3. **02-arquitectura-datos.md**, empezando por los *contract tests*. Es la única
   forma de unificar los adaptadores sin romper datos.
4. **03-calidad-despliegue.md**, resto, y la Fase 9 (frontend) la última.

## Solapamientos (para no hacer el trabajo dos veces)

- Los scripts `test` / `typecheck`, la migración a flat config de ESLint, quitar
  `typescript.ignoreBuildErrors` y el workflow de CI están en **01 (Fase 9)** y
  en **03 (Fase 1)**. Aplica uno y omite el otro.
- El `process.exit(1)` en el fallo de BD, el fin del fallback silencioso
  Mongo→lowdb, la propagación de errores en los adaptadores y la recuperación de
  recordatorios atascados en `'processing'` están en **01 (Fase 8)** y en
  **02 (Fases 3 y 6)**. Igual: uno u otro.

## Advertencias antes de empezar

- **`node:vm` no es una frontera de seguridad.** Un plugin puede alcanzar el
  `process` real del host con `Object.constructor("return process")()`. Está
  verificado en este proyecto. La Fase 4 de la Tanda 1 solo elimina los caminos
  accidentales; **no cierra el escape**, y ninguna entrega debe afirmar lo
  contrario. El aislamiento real es una decisión aparte (worker threads vs.
  declarar los plugins código de confianza).
- **La Fase 1 de la Tanda 1 rompe instalaciones existentes a propósito**: en
  cuanto el arranque exija secretos, un `.env` con
  `DASHBOARD_PASS=tu_contrasena_segura` dejará de arrancar hasta correr
  `pnpm run setup:secrets`. Aplícalo en ventana de mantenimiento y con respaldo.
- **La Tanda 2 toca datos ya persistidos** en tres puntos (`deleteRemindersBulk`,
  recuperación de `processing`, y el paso de `Date` a string en los tipos). Haz
  copia de `data/` antes y prueba la migración con una base real copiada, no solo
  con tests.
- El `.env` de este checkout es **byte-idéntico a `.env.example`**, así que las
  credenciales por defecto que describe la Tanda 1 son las que aplican de verdad
  en esta instalación, no una hipótesis.

## Estado del análisis

Estos prompts salen de una auditoría de solo lectura (sin cambios en el código):
lectura del núcleo, tres auditorías paralelas (seguridad, arquitectura,
calidad/despliegue) y verificaciones empíricas — escape del sandbox de plugins,
`tsc --noEmit` limpio, divergencia entre adaptadores, recordatorios atascados y
plugins activos por defecto. Los `archivo:línea` citados corresponden a la
versión auditada; **verifica siempre antes de editar**.
