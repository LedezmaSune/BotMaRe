# Arquitectura de BotMaRe

BotMaRe está diseñado como una plataforma modular de automatización de WhatsApp, construida en TypeScript, enfocada en la resiliencia y el alto rendimiento.

## 1. Patrón de Capas

El sistema sigue un modelo de separación de responsabilidades:

- **Capa de Presentación (Frontend):** 
  Aplicación web interactiva desarrollada con **React** y **Next.js**. Aquí se ubican los paneles de control, configuración, editor de webhooks y el Update Center. Se ejecuta típicamente en el puerto 3000.
  
- **Capa de Lógica y APIs (Backend):** 
  Servidor **Express** que gestiona la API REST para el Dashboard y coordina la lógica de negocio.
  Ubicado principalmente en `src/modules` y `src/routes`.

- **Capa de Infraestructura (WhatsApp & Base de Datos):** 
  Implementa `@whiskeysockets/baileys` para mantener un Socket WebSocket persistente con los servidores de WhatsApp Multi-dispositivo.
  - El estado de autenticación (llaves de sesión) y los datos persistentes del bot se guardan en **SQLite**.

## 2. Flujo de Mensajes

El núcleo conversacional del bot se maneja a través de un **Router Central** (`src/core/router.ts`).

1. **Ingreso:** El cliente `Baileys` capta un evento `messages.upsert` de WhatsApp.
2. **Normalización:** El evento puro es traducido a una estructura estandarizada interna.
3. **Distribución:** El mensaje se pasa por una cadena de middlewares (Plugins -> Webhooks -> Autorespondedores -> Comandos IA).
4. **Respuesta:** Si algún módulo decide responder, utiliza el servicio `MessageService` para poner el envío en cola o ejecutar la acción nativa con `Baileys`.

## 3. Persistencia de Datos

Para garantizar estabilidad en entornos con pocos recursos (como Termux en Android o micro-VPS), el sistema emplea **SQLite en modo WAL** (*Write-Ahead Logging*).
- `whatsapp_auth.db`: Almacena exclusivamente el estado criptográfico de la sesión.
- `bot.db`: Guarda la configuración dinámica, campañas masivas, agenda, colas de envío y datos de plantillas.
