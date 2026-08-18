# Referencia de Módulos (BotMaRe)

El directorio `src/modules` es el cerebro lógico del sistema. Contiene los submódulos independientes que componen las características del bot.

## 1. `system` (Mantenimiento y Actualizaciones)
Encargado de la supervivencia del bot:
- **`update.service.ts`**: Lógica de auto-actualización desde GitHub. Implementa detección dinámica de rama (`main`, `master`) y soporte nativo para entornos de recursos limitados (Termux en Android) asegurando que el proceso `git pull` y `pnpm install` no se quede sin memoria o rompa la instalación.
- **`backup.service.ts`**: Realiza respaldos comprimidos de toda la configuración, reportes y bases de datos.

## 2. `messages` (Envíos y Difusión)
- **`message.service.ts`**: Wrapper asíncrono sobre Baileys para enviar mensajes, imágenes y documentos pesados. Usa E/S sin bloqueos (`fs.promises`) para evitar congelamientos de Node.js.
- **`diffusion.service.ts`**: Administrador de campañas masivas (Bulk Messaging). Posee lógica de resiliencia: si la conexión se cae en medio de un envío de 1,000 personas, permite reanudar o cancelar la campaña sin corromper el estado.

## 3. `scheduling` (Orquestación y Tareas Cron)
Corazón de los procesos en segundo plano:
- **`task-runner.ts`**: Registra y ejecuta tareas tipo Cron (`node-cron`). Limpia los temporizadores pendientes (Timeouts) usando `Map` para evitar Fugas de Memoria.
- **`reminder-checker.job.ts`**: Se ejecuta cada minuto para comprobar si hay recordatorios pendientes. Tiene una tolerancia de 60 minutos, garantizando que si el bot estuvo offline, los mensajes pendientes no se pierdan.

## 4. `plugins` (Extensiones de Terceros)
- **`plugin.service.ts`**: Carga y ejecuta plugins personalizados de forma aislada (Sandbox VM). 

## 5. `reminders` (Recordatorios y Exfiltración)
- **`reminder.service.ts`**: Permite programar mensajes en el futuro. Implementa un **Directory Jail** que asegura que solo se puedan leer y enviar archivos locales de la carpeta de adjuntos, protegiendo al sistema de accesos no autorizados.

## 6. `ai` (Inteligencia Artificial)
- **`ai.service.ts`**: Integra la API de OpenAI y proveedores locales. Procesa comandos directos para transcripción y respuestas automáticas inteligentes dependiendo del contexto de la conversación.

## 7. `settings` & `templates` (Configuraciones)
- Exponen controladores REST para que el Frontend (Dashboard de Next.js) pueda actualizar la configuración (`settings.controller.ts`) y gestionar plantillas predefinidas de texto/medios (`template.controller.ts`).
