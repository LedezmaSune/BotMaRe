# 📓 Bitácora de Desarrollo - BotMaRe

> [!WARNING]
> **ESTADO: EN CONSTRUCCIÓN 🚧**
> 
> *Actualmente estamos definiendo y configurando todo el tema del dominio (`apptienda.online`), túneles de Cloudflare y redirecciones.*

## Fecha: 29 de Agosto de 2026 (Noche)

### ✅ Tareas Completadas (Sesión Actual)
1. **Auditoría Estructural:**
   - Auditorías completas de `routes`, `components` y estructura raíz, certificando la solidez de la arquitectura Monolito-Modular y elaborando reportes detallados en artefactos.
2. **Mejora del Sistema Webhook:**
   - Inyección de instrucciones claras en la UI (`WebhooksUI.tsx`).
   - Implementación de `WEBHOOK_API_KEY` en archivo estático `.env` para mayor seguridad en integraciones.
3. **Desarrollo de Arquitectura RAG:**
   - Se estableció la ruta y las notas principales para integrar el sistema RAG (Bases de datos vectoriales para subir PDFs y TXTs). Todo documentado en `rag_project_notes.md`.
4. **Feedback Visual Anti-Ban:**
   - Se agregó una animación Premium (Ámbar) con contador regresivo en `MassMessaging.tsx` que escucha los tiempos de espera del `diffusion.service.ts` para evitar confusión visual del usuario.

---

## Fecha: 13 de Junio de 2026 (Madrugada)

### ✅ Tareas Completadas
1. **Diagnóstico de Google Sheets:**
   - Se identificó que el problema de conexión con Google Sheets se debe a que la URI de redirección (`GOOGLE_REDIRECT_URI`) apuntaba a un dominio no configurado.
2. **Corrección de Entorno (`.env`):**
   - Se actualizó `GOOGLE_REDIRECT_URI` a `http://localhost:8000/api/sheets/auth/callback` para permitir pruebas locales.
   - Se actualizó `NEXTAUTH_URL` a `http://localhost:8000`.
3. **Análisis de Tailscale:**
   - Se evaluaron los escenarios de uso de Tailscale frente a Cloudflare Tunnel (documentado en el artefacto).

---

### ⏳ Tareas Pendientes (Para cuando regreses)

**Objetivo Principal:** Configurar el dominio `apptienda.online` con Cloudflare Tunnel para tener una URL HTTPS fija (`bot.apptienda.online`). Esto resolverá permanentemente la integración con Google Sheets.

**Pasos a seguir (tienes la guía detallada en los artefactos):**
1. **Migrar DNS a Cloudflare:**
   - Ir a [dash.cloudflare.com](https://dash.cloudflare.com) y agregar el dominio `apptienda.online`.
   - Copiar los *Nameservers* de Cloudflare y ponerlos en la configuración de "Custom DNS" en Namecheap.
2. **Crear el Tunnel (Zero Trust):**
   - Desde Cloudflare, crear un túnel que apunte `bot.apptienda.online` hacia `localhost:8000`.
3. **Ajustes Finales en Google Cloud:**
   - Ir a la consola de GCP y actualizar la *Redirect URI* de OAuth para que use el nuevo dominio con HTTPS.
