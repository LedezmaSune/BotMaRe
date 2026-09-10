# 📓 Bitácora de Desarrollo - BotMaRe

> [!NOTE]
> **ESTADO: VERSIÓN 2.5.0 ESTABLE Y OPTIMIZADA 🚀**
> 
> *Sistemas de IA multiproveedor, diagnósticos en tiempo real, refactorización del actualizador `update.sh`, mantenimiento pasivo de Baileys/SQLite sin desconexión y actualización de UI.*

## Fecha: 10 de Septiembre de 2026

### ✅ Tareas Completadas (Sesión Actual)
1. **Refactorización de Configuración y `.env`:**
   - Se modificó la lectura de configuración en `config.ts` y la inyección en memoria de `.env` en `settings.controller.ts` para que los cambios surtan efecto correctamente al subir un nuevo archivo de entorno.
2. **Mejoras Visuales (Premium Dark Mode):**
   - Animaciones y transiciones de páginas mejoradas (`PageTransition.tsx`, `globals.css`).
   - Implementación de Glassmorphism avanzado, ajustando colores y efectos de resplandor.
3. **Indicadores de Red y Túnel Dinámicos:**
   - Se añadió un indicador visual ("TUNNEL ON" / Cloudflare) interactivo en el `DashboardLayout.tsx`.
   - El servicio del túnel (`TunnelService`) ahora lee dinámicamente `process.env.CUSTOM_DOMAIN` en tiempo real.
4. **Simplificación del Roadmap de Canales:**
   - Se redujo la vista de futuros canales (`FutureChannelsUI.tsx`) para centrarse exclusivamente en WhatsApp, Telegram, Instagram y Facebook Messenger.
   - *Actualización:* A petición, se ha ocultado temporalmente la página de canales del menú lateral para evitar distracciones en la interfaz, conservando el código base intacto para futuras implementaciones.
5. **Nuevo Comando de Telegram (`/informe`):**
   - Se implementó un reporte diagnóstico completo en el bot administrador (`commands.ts` y `callbacks.ts`), accesible mediante el menú interactivo o el comando directo.

---

## Fecha: 7 de Septiembre de 2026

### ✅ Tareas Completadas (Release v2.5.0)
1. **Infraestructura Multi-LLM y Failover Inteligente:**
   - Soporte ampliado a 11 proveedores de IA (Groq, Cerebras, SambaNova, SiliconFlow, Mistral, Together, Gemini 2.5, DeepSeek, OpenRouter, Nvidia NIM, OpenAI).
   - Sanitización automática de modelos obsoletos mediante `resolveModel()` (ej. migración automática de `llama-3.1-70b-versatile` a `llama-3.3-70b-versatile`).
   - Implementación del sistema de diagnóstico en tiempo real (`pnpm test:llm`), comando Telegram `/diagnostico` y botón interactivo `🤖 Estado IA`.
   - Botón de prueba en la Web UI (`⚡ Probar Conexiones IA`) y enlaces directos `Obtener Key ↗` en el panel de Ajustes.

2. **Auditoría y Refactorización del Script de Actualización (`update.sh`):**
   - Incorporación de control estricto de errores (`set -Eeuo pipefail`) y trampas de limpieza `trap EXIT`.
   - Respaldo de seguridad con fallback automático a copia cruda si `tar` no está disponible.
   - Sincronización robusta con Git Stash / Rebase y soporte mejorado para reinicio con PM2.

3. **Mantenimiento Pasivo No-Destructivo de Baileys y SQLite:**
   - Rediseño completo de `BaileysMaintenanceJob` y `purgePreKeys`.
   - Eliminación del borrado agresivo de claves `pre-key-*` y del comando bloqueante `VACUUM` en caliente para **prevenir desconexiones o invalidación de QR en WhatsApp**.
   - Implementación de optimización pasiva WAL (`wal_checkpoint(PASSIVE)`) y recolección segura de basura en RAM (`global.gc()`).

4. **UI/UX y Actualizaciones de Versión:**
   - Incremento global de versión a **v2.5.0** (`package.json`, `README.md`, `UpdateCenter.tsx`).
   - Soporte para reducción de movimiento (`@media (prefers-reduced-motion: reduce)`) en `globals.css`.

5. **Módulo de Futuros Canales y Separación de Telegram (`/channels`):**
   - Creación e integración de la vista `/channels` (`FutureChannelsUI.tsx`) para el Roadmap Omnicanal.
   - Separación explícita entre el **Telegram Bot Admin Privado** (control del sistema, comandos de diagnóstico y alertas) y el **Telegram Customer Bot & Broadcast** (difusión a clientes y atención automatizada).
   - Sustitución de dependencias de íconos sociales por componentes SVG vectoriales nativos para una compilación 100% limpia sin advertencias de *barrel exports*.

6. **Migración de Pasarela SMS (`apptienda.site`):**
   - Actualización de `HTTPSMS_API_URL` a `https://api-sms.apptienda.site/v1/messages/send` en `.env`, `sms.service.ts` y `Settings.tsx` tras la reconfiguración del túnel de Cloudflare.

7. **Integración de CheaperInference API y Corrección de Modelos:**
   - Adición de CheaperInference como proveedor de IA en `.env`, `config.ts`, `llm.ts`, `llmTest.ts` y Web UI (`Settings.tsx`).
   - Actualización del modelo por defecto de Groq a `llama-3.3-70b-specdec` resolviendo deprecaciones del proveedor.

---

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
