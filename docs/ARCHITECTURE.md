# Arquitectura de BotMaRe

BotMaRe está diseñado como una plataforma modular de automatización de WhatsApp, construida en TypeScript, enfocada en la resiliencia y el alto rendimiento.

## 1. Patrón de Capas

El sistema sigue un modelo de separación de responsabilidades:

- **Capa de Presentación (Frontend):** 
  Aplicación web interactiva desarrollada con **React** y **Next.js**. En producción, los assets estáticos exportados (`out/`) son servidos directamente por el servidor Express en el puerto 8000 (`PORT`), eliminando la necesidad de procesos Node adicionales en memoria. El puerto 3000 solo se utiliza opcionalmente durante desarrollo activo con Turbopack (`pnpm dev:next`).
  
- **Capa de Lógica y APIs (Backend):** 
  Servidor **Express** que gestiona la API REST para el Dashboard y coordina la lógica de negocio.
  Ubicado principalmente en `src/modules` y `src/routes`, escuchando en el puerto 8000.

- **Capa de Infraestructura (WhatsApp & Base de Datos):** 
  Implementa `@whiskeysockets/baileys` para mantener un Socket WebSocket persistente con los servidores de WhatsApp Multi-dispositivo.
  - El estado de autenticación (llaves de sesión) se almacena en SQLite en modo WAL (`data/whatsapp_auth.db`).
  - La persistencia del dominio y configuración se desacopla mediante el contrato `IDatabaseAdapter`: soporte nativo para **LowDB** (`data/database.json`, por defecto para compatibilidad multiplataforma), **SQLite** (`data/database.db`) y **MongoDB** (`MONGODB_URI`).

## 2. Flujo de Mensajes

El núcleo conversacional del bot se maneja a través de un **Router Central** (`src/core/router.ts`).

1. **Ingreso:** El cliente `Baileys` capta un evento `messages.upsert` de WhatsApp.
2. **Normalización:** El evento puro es traducido a una estructura estandarizada interna con deduplicación por ID.
3. **Distribución:** El mensaje se pasa por una cadena de middlewares (Filtros de Lista -> Grupos -> Plugins -> Webhooks -> Autorespondedores -> Comandos IA).
4. **Respuesta:** Si algún módulo decide responder, utiliza el servicio `MessageService` para poner el envío en cola o ejecutar la acción nativa con `Baileys`.

## 3. Persistencia de Datos

Para garantizar estabilidad en entornos con recursos variables (desde Android/Termux hasta servidores empresariales), el sistema emplea una arquitectura desacoplada:
- `data/whatsapp_auth.db`: Almacena exclusivamente el estado criptográfico de la sesión de Baileys.
- `data/database.json` / `data/database.db` / MongoDB: Guarda la configuración dinámica, recordatorios, campañas masivas, agenda, colas de envío y datos de plantillas según el driver configurado (`DB_DRIVER`).
