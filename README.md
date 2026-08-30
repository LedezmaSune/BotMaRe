<div align="center">
  <img src="https://img.shields.io/badge/BotMaRe-AI_Agent-6366f1?style=for-the-badge&logo=probot" alt="BotMaRe Banner"/>
  <h1>🦊 BotMaRe - Dashboard</h1>
  <p><strong>La plataforma definitiva de automatización para WhatsApp impulsada por Inteligencia Artificial, Orquestación Multi-Proveedor y Despliegue Multi-Plataforma.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white" alt="Node.js"/>
    <img src="https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs" alt="Next.js"/>
    <img src="https://img.shields.io/badge/Express-5-000000?logo=express" alt="Express"/>
    <img src="https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white" alt="TypeScript"/>
    <img src="https://img.shields.io/badge/Terraform-1.5+-844FBA?logo=terraform&logoColor=white" alt="Terraform"/>
    <img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white" alt="Docker"/>
    <img src="https://img.shields.io/badge/License-ISC-blue" alt="License"/>
  </p>
  <p>
    <i>Automatiza, difunde y responde como un humano 24/7 en Android, Linux, Windows y la Nube.</i>
  </p>
</div>

<br />

> **BotMaRe (powered by Kitsune Engine)** transforma tu cuenta de WhatsApp en una central de operaciones inteligente. Integra modelos de IA, flujos de automatización, programadores de recordatorios, sincronización con Google Sheets, asistente maestro por Telegram y un panel de administración premium (_Glassmorphism_), todo en un monolito de alto rendimiento.

---

<details open>
<summary><h2>📑 Tabla de Contenidos</h2></summary>

1. [✨ Características Principales](#-características-principales)
2. [🚀 Despliegue Multi-Plataforma](#-despliegue-multi-plataforma)
   - [📱 Android (Termux)](#-1-android-termux)
   - [🐧 Linux / Debian / VPS](#-2-linux--debian--ubuntu-vps)
   - [🪟 Windows Local](#-3-windows-local)
   - [☁️ Despliegue en la Nube con Terraform](#-4-despliegue-en-la-nube-con-terraform)
   - [🐳 Docker / Docker Compose](#-5-docker--docker-compose)
3. [🔄 Centro de Actualizaciones](#-centro-de-actualizaciones)
4. [🧩 Sistema de Plugins JS](#-sistema-de-plugins-js-sandbox)
   - [📁 Estructura de un Plugin](#-estructura-de-un-plugin-datapluginsidjs)
   - [📋 Galería de Plantillas](#-galería-de-plantillas-listas-para-usar)
   - [🤖 Adaptación con IA](#-adaptar-plugins-de-otros-bots-con-ia)
5. [📘 Manual de Usuario (Web & Telegram)](#-manual-de-usuario)
   - [🦊 Asistente Maestro de Telegram](#-asistente-maestro-de-telegram)
   - [🤖 Carga Masiva y Spintax](#-difusiones-masivas-y-spintax)
   - [🧠 Variables Dinámicas y Cerebro IA](#-variables-dinámicas-y-cerebro-ia)
   - [🎙️ Macros Multimedia](#-macros-multimedia)
6. [🧹 Mantenimiento Autónomo y Memoria](#-mantenimiento-autónomo-y-limpieza)
7. [🛠️ Gestión Avanzada con PM2](#-gestión-avanzada-con-pm2)
8. [⚠️ Troubleshooting](#-solución-a-errores-comunes)
9. [🔄 Historial de Actualizaciones (Changelog)](#-historial-de-actualizaciones-changelog)

</details>

---

## ✨ Características Principales

| Característica | Descripción |
| :--- | :--- |
| 🧠 **IA Multi-Proveedor** | Groq, Gemini, OpenAI, DeepSeek, OpenRouter y Nvidia con Failover automático. |
| 🧩 **Plugins JS en Sandbox** | Entorno seguro Node.js VM con plantillas prediseñadas, comandos, APIs y multimedia. |
| 📱 **WhatsApp Agent** | Comprensión de imágenes (Visión), transcripción de audio (Whisper), documentos y QR/Pairing Code instantáneo. |
| 🦊 **Asistente Telegram** | Control remoto total por comandos y botones interactivos con emojis. |
| 📢 **Difusión con Spintax** | Campañas masivas anti-spam con variación de frases y macros de contacto. |
| 📅 **Recordatorios Inteligentes** | Programación individual y grupal con frecuencias configurables (horas, días, semanas, meses). |
| 🛡️ **Blindaje Anti-Ban** | Retardos progresivos, pausas y simulación humana ("Escribiendo...", "Grabando audio..."). |
| 📦 **Sincronización Sheets** | Auto-respuestas y plantillas sincronizadas automáticamente desde Google Sheets. |
| ☁️ **Infraestructura como Código** | Archivos `main.tf` listos para aprovisionar VPS en AWS, Hetzner, DigitalOcean u Oracle Cloud. |

---

## 🚀 Despliegue Multi-Plataforma

### 📱 1. Android (Termux)
Ideal para ejecutar el bot de forma continua en tu teléfono Android sin root.
```bash
# Instalador automático en 1 paso:
curl -fsSL https://raw.githubusercontent.com/LedezmaSune/BotMaRe/main/install-termux.sh | bash

# Iniciar el panel maestro:
cd BotMaRe && pnpm run menu
```

---

### 🐧 2. Linux / Debian / Ubuntu VPS
Para servidores dedicados o VPS en la nube.
```bash
# Instalador desatendido en Linux:
curl -fsSL https://raw.githubusercontent.com/LedezmaSune/BotMaRe/main/install.sh | bash

# Iniciar servidor:
cd BotMaRe && ./start.sh
```

---

### 🪟 3. Windows Local
Sin necesidad de permisos de Administrador.
1. Descarga el repositorio o haz `git clone https://github.com/LedezmaSune/BotMaRe.git`.
2. Dale doble clic a `install-windows.bat` para instalar dependencias y base de datos.
3. Dale doble clic a `START.bat` para abrir el **Menú de Control Maestro**.
4. O ejecuta directamente `npm run dev` para modo desarrollo.

---

### ☁️ 4. Despliegue en la Nube con Terraform
Aprovisiona en minutos un servidor VPS con disco SSD cifrado, IP pública fija, Docker y BotMaRe preconfigurado.
```bash
# 1. Configurar variables (opcional):
cp terraform.tfvars.example terraform.tfvars

# 2. Inicializar Terraform:
terraform init

# 3. Aplicar y desplegar servidor:
terraform apply
```

---

### 🐳 5. Docker / Docker Compose
```bash
# Iniciar contenedor en segundo plano:
docker compose up -d --build

# Ver logs en tiempo real:
docker compose logs -f
```

---

## 🔄 Centro de Actualizaciones

BotMaRe cuenta con un **Centro de Actualizaciones Inteligente** accesible desde 3 canales:

1. **🌐 Desde el Panel Web (Dashboard):**
   - Ve a la pestaña **"Actualizaciones"** para verificar nuevos commits en GitHub.
   - Aplica actualizaciones con un solo clic con respaldo automático preventivo.
2. **🦊 Desde Telegram:**
   - Envía el comando `/actualizar` para buscar nuevas versiones y aplicarlas al instante.
3. **💻 Desde la Terminal:**
   - Ejecuta `pnpm run menu` y selecciona la opción `[10] Git Update`.

---

## 🧩 Sistema de Plugins JS (Sandbox)

BotMaRe incorpora un potente motor de **Plugins en JavaScript** ejecutados en un entorno seguro **Sandbox (Node.js VM)**. Esto permite agregar comandos personalizados, menús interactivos, descargas multimedia y consumo de APIs externas sin necesidad de reiniciar el servidor.

### 📁 Estructura de un Plugin (`data/plugins/<id>.js`)
Todo plugin exporta un objeto CommonJS con la siguiente estructura estándar:

```javascript
module.exports = {
    name: "Nombre del Plugin",
    description: "Descripción visible en el panel y menú",
    active: true, // true = activo, false = pausado
    onMessage: async (ctx, api) => {
        // Lógica de respuesta e interceptor
    }
};
```

#### 📥 Parámetros del Objeto `ctx` (Contexto Entrante):
* `ctx.text`: Texto recibido del usuario.
* `ctx.from`: Identificador (JID o número) del remitente o grupo.
* `ctx.isGroup`: Booleano (`true` para grupos, `false` para chats directos).
* `ctx.pushName`: Nombre público del perfil de WhatsApp.
* `ctx.quoted`: Información del mensaje citado o respondido (si existe).

#### 🛠️ Métodos del Objeto `api` (Interacción con WhatsApp):
* `await api.reply(texto)`: Envía una respuesta al chat actual.
* `await api.sendTo(jid, texto)`: Envía un mensaje a cualquier chat o grupo específico.
* `await api.sendMedia(url, caption, tipo)`: Descarga y envía archivos (`'image' | 'video' | 'audio' | 'document'`).
* `api.getPlugins()`: Devuelve la lista y estado de todos los plugins instalados.

#### 🌐 Librerías Globales Disponibles en Sandbox (Sin `import`/`require`):
* `axios` y `fetch`: Para consumir servicios web y APIs REST en tiempo real.
* `console`: Métodos `log`, `warn`, `error` con prefijo `[Plugin:<id>]`.
* `global.APIs` y `global.APIKeys`: Llaves y endpoints inyectados automáticamente.

---

### 📋 Galería de Plantillas Listas para Usar

#### 1. Comando Básico con Prefijo Flexible (`!ping`, `.ping`, `/ping`)
```javascript
module.exports = {
    name: "Comando Ping",
    description: "Comprueba el estado del bot",
    active: true,
    onMessage: async (ctx, api) => {
        const text = (ctx.text || "").trim();
        const match = text.match(/^[!./#]?(ping|hola|estado)$/i);
        if (!match) return;

        const sender = ctx.pushName || "amigo";
        await api.reply(`🏓 ¡Pong! Hola *${sender}*, BotMaRe está activo al 100%.`);
    }
};
```

#### 2. Envío de Imágenes y Multimedia (`api.sendMedia`)
```javascript
module.exports = {
    name: "Envío Multimedia",
    description: "Genera y envía una imagen",
    active: true,
    onMessage: async (ctx, api) => {
        const text = (ctx.text || "").trim();
        if (/^[!./#]?(imagen|foto|meme)$/i.test(text)) {
            await api.reply("⏳ Generando tu imagen...");
            await api.sendMedia("https://picsum.photos/800/600", "📸 ¡Aquí tienes tu imagen!", "image");
        }
    }
};
```

#### 3. Consumo de API Externa en Tiempo Real (Axios / Fetch)
```javascript
module.exports = {
    name: "Consulta API Externa",
    description: "Obtiene chistes o datos desde una API pública",
    active: true,
    onMessage: async (ctx, api) => {
        const text = (ctx.text || "").trim();
        if (/^[!./#]?(chiste|broma)$/i.test(text)) {
            try {
                const res = await axios.get("https://v2.jokeapi.dev/joke/Any?lang=es&type=single");
                const chiste = res.data?.joke || "¿Qué hace una abeja en el gimnasio? ¡Zumba!";
                await api.reply(`😂 *Chiste:* \n\n${chiste}`);
            } catch (err) {
                await api.reply("❌ Error al consultar la API externa.");
            }
        }
    }
};
```

#### 4. Menú Interactivo Dinámico
```javascript
module.exports = {
    name: "Menú de Comandos",
    description: "Muestra la lista de plugins instalados",
    active: true,
    onMessage: async (ctx, api) => {
        const text = (ctx.text || "").trim();
        if (!/^[!./#]?(menu|comandos|plugins|help|ayuda)$/i.test(text)) return;

        const plugins = api.getPlugins ? api.getPlugins() : [];
        const activePlugins = plugins.filter(p => p.active);

        let msg = `╭━━━ 🤖 *LISTA DE PLUGINS* ━━━╮\n`;
        msg += `┃ Activos: ${activePlugins.length} plugins\n`;
        msg += `╰━━━━━━━━━━━━━━━━━━━━━╯\n\n`;

        activePlugins.forEach((p, i) => {
            msg += `*${i + 1}. ${p.name}*\n> ${p.description}\n\n`;
        });

        await api.reply(msg);
    }
};
```

---

### 🤖 Adaptar Plugins de Otros Bots con IA
El Panel Web incluye un botón **"Adaptar Plugin con IA"** con un prompt preconfigurado. Solo debes copiar el prompt, pegarlo junto al código de cualquier plugin de **Mystic Bot**, **GataBot** o **Baileys** en ChatGPT, Claude o Gemini, y el modelo te devolverá el código adaptado listo para pegar en BotMaRe.

---

## 📘 Manual de Usuario

### 🦊 Asistente Maestro de Telegram

Puedes supervisar, configurar y operar BotMaRe de forma remota usando tu bot de Telegram:

#### 🎮 Comandos Principales
- `👉 /start` - Abre el menú principal con botones interactivos.
- `👉 /ayuda` - Muestra la guía rápida de comandos y sintaxis.
- `👉 /dashboard` - Obtiene el enlace de acceso actual al Panel Web.
- `👉 /recordatorios` - Gestiona, programa o elimina alertas de WhatsApp.
- `👉 /masivo` - Asistente interactivo paso a paso para enviar difusiones masivas.
- `👉 /detenermasivo` - Cancela de inmediato una campaña masiva activa.
- `👉 /cerebro` - Muestra y permite editar el prompt y reglas de la IA.
- `👉 /lista` - Control de Listas Blancas (Whitelist) y Negras (Blacklist).
- `👉 /auditoria` - Muestra los últimos 10 movimientos y eventos del sistema.
- `👉 /notificaciones` - Activa o desactiva alertas del sistema en Telegram.

#### ⚙️ Mantenimiento y Servidor
- `👉 /actualizar` - Busca y aplica nuevas versiones desde GitHub.
- `👉 /tunel` - Consulta o reinicia la URL pública del túnel Cloudflare.
- `👉 /ssh` - Genera una sesión SSH remota segura (tmate) para soporte técnico.
- `👉 /tailscale` - Muestra el estado y enlace de red privada VPN.
- `👉 /pm2` - Panel de control de procesos (Estado, Reinicio y Logs).
- `👉 /borrarmemorial` - Limpia la memoria conversacional del bot.
- `👉 /setadmin <numero>` - Añade un nuevo número como administrador autorizado.
- `👉 /backup` - Genera y envía un respaldo manual comprimido (`.zip`).

---

### 📢 Difusiones Masivas y Spintax

Para evitar baneos al enviar a múltiples contactos, usa la sintaxis `{Opción 1|Opción 2|Opción 3}`. El motor elegirá una variación al azar para cada contacto.

**Botones de Asistencia en el Panel:**
- **Perfeccionar:** Corrige ortografía y mejora la semántica con IA.
- **Generar Spintax:** Genera variaciones inteligentes respetando palabras protegidas `{texto protegido}`.

---

### 🧠 Variables Dinámicas y Cerebro IA

Usa variables dinámicas que se reemplazarán automáticamente al enviar mensajes:
- `{NOMBRE}`, `{NOMBRE_PILA}`, `{SALUDO}`, `{EMOJI_SALUDO}`, `{EMOJI_ATENCION}`, `{HORA_12}`, `{DIA_SEMANA}`, `{NUMERO_ALEATORIO}`.

---

### 🎙️ Macros Multimedia

Envía notas de voz nativas, imágenes y documentos desde tus plantillas o Google Sheets:
- `[AUDIO: https://tu-dominio.com/audio.ogg]` ➔ Nota de voz verde nativa ("Grabando audio...").
- `[IMG: https://tu-dominio.com/foto.jpg]` ➔ Imagen con pie de foto opcional.
- `[DOC: https://tu-dominio.com/archivo.pdf]` ➔ Archivo descargable.
- `[VIDEO: https://tu-dominio.com/clip.mp4]` ➔ Envío de video.

---

## 🧹 Mantenimiento Autónomo y Limpieza

El planificador central ([`Scheduler`](file:///C:/Proyectos/wamasivos/BotMaRe/src/modules/scheduling/scheduler.ts)) ejecuta rutinas de optimización continuas:
- 🧹 **Temporales huérfanos:** Purga cada **3 minutos**.
- 📦 **Logs y Backups antiguos:** Purga diaria de logs (>7 días) y respaldos (>15 días).
- 🗑️ **Uploads temporales:** Limpieza cada **24 horas** y al arrancar el servidor.
- 🔑 **Optimización SQLite:** Purga de claves temporales (`purgePreKeys`) cada **1 hora** para mantener la base de datos ligera y rápida.

---

## 🛠️ Gestión Avanzada con PM2

Ejecución continua 24/7 en servidores de producción:
- **Preparar:** `npm run setup`
- **Iniciar:** `pnpm run pm2:start`
- **Ver Logs:** `pnpm run pm2:logs`
- **Reiniciar:** `pnpm run pm2:restart`
- **Detener:** `pnpm run pm2:stop`
- **Limpiar Logs:** `pnpm run clean:logs`

---

## ⚠️ Solución a Errores Comunes

- **Recompilar binarios nativos:**
  ```bash
  pnpm rebuild better-sqlite3
  pnpm rebuild cloudflared
  ```
- **Error de actualización en Git (archivos modificados localmente):**
  ```bash
  git restore . && git pull origin main
  ```
- **Guía de errores en Windows / Node.js:** Consulta [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

---

## 🔄 Historial de Actualizaciones (Changelog)

- **[2.4.1] - 2026-08-29:** Contador Anti-Ban, RAG (Base) y Seguridad en Webhooks:
  - 🛡️ **Contador Visual Anti-Ban:** Nueva interfaz en el despachador masivo que muestra una cuenta regresiva animada (Glassmorphism Ámbar) al activarse la Protección de Ráfaga.
  - 🔒 **Seguridad en Webhooks:** Transición de claves de Webhooks a variables de entorno estáticas (`.env`) previniendo exposición en la base de datos.
  - 🧠 **Base RAG Documentada:** Finalizada la arquitectura teórica e inicial para inyectar PDFs y TXTs al cerebro de la IA.
  - 🔎 **Auditoría Completa de Código:** Revisión masiva de componentes, enrutadores y sistema Core confirmando la alta resiliencia de la arquitectura Monolito-Modular.
- **[2.4.0] - 2026-08-16:** Webhooks Universales, Parches de Seguridad y Renderizado Cliente:
  - 🔗 **API de Webhooks Universal:** Nuevo endpoint `/api/webhooks/incoming` para recibir eventos desde Zapier, Make, Google Apps Script, Go, y n8n con soporte para JSON y Formularios.
  - 🔑 **Autenticación Flexible:** Soporte para cabeceras `Authorization: Bearer`, `x-api-key` y parámetros de URL `?apikey=` permitiendo integraciones en ambientes estrictos.
  - 📝 **Dashboard Interactivo de Snippets:** Nueva interfaz visual Glassmorphism para Webhooks con ejemplos listos para copiar, pegar y ejecutar.
  - 🛡️ **Parche de Seguridad:** Resolución de 59 vulnerabilidades heredadas actualizando Next.js a `v16.3.1` e imponiendo resoluciones estrictas a `axios`.
- **[2.3.1] - 2026-08-11:** Soporte Internacional para SMS, Normalización E.164 y Ajustes Dinámicos:
  - 🌐 **Soporte SMS Internacional (E.164 Global):** Compatibilidad completa para envíos masivos y recordatorios por SMS vía pasarela httpSMS hacia números de cualquier país (EE. UU. `+1`, España `+34`, Argentina `+549`, Colombia `+57`, Chile `+56`, Perú `+51`, Brasil `+55`, Ecuador `+593`, etc.).
  - 🔄 **Normalización Inteligente de Prefijos:** Limpieza y adaptación automática de prefijos internacionales (`00`, `011`), eliminación de sufijos WhatsApp (`@s.whatsapp.net`) y normalización del prefijo móvil de México (`+521` a `+52`) para garantizar entrega en operadoras móviles.
  - ⚙️ **Configuración Dinámica de SMS:** Recarga en tiempo real de `HTTPSMS_API_KEY`, `HTTPSMS_FROM_NUMBER` y `HTTPSMS_API_URL` desde los ajustes del panel y base de datos sin requerir reinicio del servidor.
  - 📋 **Mejoras en el Parser de Contactos:** Preservación del signo `+` en listas de contactos multilínea y archivos CSV para números internacionales.
  - 🧪 **Suite de Pruebas Unitarias:** Nuevos tests unitarios en Vitest verificando el formateo y normalización de números internacionales para SMS y contactos.
- **[2.3.0] - 2026-08-09:** CRM Completo, Ecosistema de Plugins JS & Resiliencia de Red:
  - 💼 **CRM y Perfilado de Clientes:** Captura automática de contactos en tiempo real al recibir mensajes, panel visual de prospectos, tarjetas de estadísticas (Total, VIP, Leads, Activos Hoy), notas comerciales internas y descarga de base de datos en CSV.
  - 🏷️ **Gestor de Etiquetas (Tags):** Asignación rápida y creación de etiquetas personalizadas con colores temáticos (VIP, Leads, Cobranza, Soporte, Mayorista).
  - 📢 **Segmentación en Difusiones:** Integración directa entre el CRM y el módulo de Difusión Masiva para cargar destinatarios automáticamente filtrados por etiqueta.
  - 🧩 **Galería de Plantillas de Plugins JS:** Selector de plantillas prediseñadas (Comandos prefijados, Envío Multimedia, APIs externas y Menús dinámicos) con archivo maestro de ejemplo comentado en `data/plugins/ejemplo_plantilla.js`.
  - 🛡️ **Filtro de Estados de WhatsApp:** Filtrado automático de `status@broadcast` y canales `@newsletter` en el router para evitar colisiones y avisos falsos en listas de contactos.
  - 🌐 **Resiliencia Cloudflare Tunnel:** Detección de sesiones caídas (`Unauthorized: Tunnel not found`) con autorreinicio y regeneración transparente del túnel en segundo plano.
- **[2.2.0] - 2026-08-07:** Despliegue Multi-Plataforma y Resiliencia Total:
  - ☁️ Módulo de **Terraform** (`main.tf`, `variables.tf`, `outputs.tf`) para despliegue automatizado en VPS/Cloud.
  - 🔄 **Reconexión WhatsApp Resiliente:** Reseteo nativo en SQLite (`clear()`) inmune a bloqueos `EBUSY` en Windows y normalización automática para **Pairing Code**.
  - 🦊 **Telegram Enriquecido:** Asistentes interactivos paso a paso (Wizards), emojis temáticos y reintentos silenciosos para `setMyCommands`.
  - 🧹 **Scheduler Autónomo:** Limpieza programada de temporales, purga de logs antiguos y optimización periódica de SQLite.
- **[2.1.0] - 2026-07-17:** Conectividad Fija & Carga Inteligente Resiliente (`CUSTOM_DOMAIN` Cloudflare, cola de subida secuencial, deduplicación de mensajes).
- **[2.0.0] - 2026-07-04:** Actualización Enterprise (Soporte Docker, respaldos encriptados a Telegram, CRM con etiquetas, notas de voz PTT).

---

<div align="center">
  <p>Desarrollado con ❤️ por <strong><a href="https://github.com/LedezmaSune">LedezmaSune</a></strong> | Impulsado por <strong>Kitsune Engine</strong> 🦊</p>
</div>
