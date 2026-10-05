# Documentación Técnica - BotMaRe 🦊

Bienvenido a la documentación oficial de BotMaRe. Este documento detalla la arquitectura, módulos principales, despliegue y configuración del sistema.

## 1. Arquitectura del Sistema (Monolito)

BotMaRe utiliza una arquitectura híbrida de Controladores y Servicios, orquestando las interacciones entre WhatsApp, Telegram, la Base de Datos y los LLMs (Inteligencia Artificial).

### Flujo de Mensajes:
1. **Recepción:** El cliente Baileys (`src/infrastructure/whatsapp/client.ts`) recibe el evento de socket.
2. **Router (`src/core/router.ts`):** 
   - Limpia etiquetas, menciones y filtra por Listas de Acceso (Whitelist/Blacklist).
   - Procesa comandos administrativos y pausas manuales (Handoff humano).
   - Extrae multimedia y texto plano (incluso leyendo PDFs o archivos Excel).
3. **Controlador (`src/modules/messages/message.controller.ts`):**
   - Evalúa `Autorespondedores`.
   - Consulta al motor de IA (`AIService`).
4. **Respuesta:** Generación de texto o Audio (TTS) y envío final al cliente.

## 2. Cerebro IA y Motor Multi-Proveedor

BotMaRe soporta 11 proveedores de IA. Todo está centralizado en `src/core/agent.ts`.

### Escudo de Inyección (Prompt Injection)
Para prevenir que usuarios hackeen las directrices, los mensajes se encapsulan:
```text
<<<INICIO DEL MENSAJE>>>
[Mensaje del cliente]
<<<FIN DEL MENSAJE>>>
```
La IA está instruida para ignorar cualquier directriz dentro de esos bloques.

## 3. Asistente Maestro (Telegram)

El módulo de Telegram (`src/telegram/`) actúa como la Consola de Administración Remota.
- **`handlers/message.ts`:** Procesa texto y archivos (PDF, fotos).
- **`handlers/voice.ts`:** Escucha notas de voz y responde en audio.
- **Herramientas de IA (`src/tools/`):** La IA de Telegram tiene permisos de ejecución para:
  - Cambiar configuraciones (`update_bot_settings`).
  - Agendar recordatorios (`manage_reminders`).
  - Bloquear/Permitir usuarios (`manage_access_lists`).
  - Reiniciar servidor (`restart_bot_service`).

## 4. Infraestructura como Código (Terraform)

El archivo `main.tf` incluye las instrucciones declarativas para desplegar BotMaRe en la nube (AWS).
- **Security Groups:** Apertura de puertos 22 (SSH), 80/443 (Web) y 8000 (Panel Web).
- **Cloud-Init (User Data):** El servidor se auto-configura al encender (instala Docker, Node.js, PM2, clona este repositorio y levanta contenedores).
- **Para aplicarlo:**
  ```bash
  terraform init
  terraform apply
  ```

## 5. Módulo de Agendamiento y Calendario

Ubicado en `src/modules/scheduling/scheduler.ts`.
- Sincroniza la tabla `reminders` de SQLite.
- Dispara notificaciones a WhatsApp o Telegram en la fecha/hora indicada.
- Purga registros antiguos y limpia temporales del servidor.
- La IA puede gestionar este calendario mediante la tool `manage_reminders`.
