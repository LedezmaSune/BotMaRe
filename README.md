<div align="center">
  <h1>🦊 BotMaRe - Gravity Dashboard (Unified)</h1>
  <p><strong>La plataforma definitiva de automatización para WhatsApp impulsada por Inteligencia Artificial y Orquestación Multi-Proveedor.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white" alt="Node.js"/>
    <img src="https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs" alt="Next.js"/>
    <img src="https://img.shields.io/badge/Express-5-000000?logo=express" alt="Express"/>
    <img src="https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white" alt="TypeScript"/>
    <img src="https://img.shields.io/badge/License-ISC-blue" alt="License"/>
  </p>

  <p>
    <a href="MANUAL_DE_USUARIO.md">📘 Manual de Usuario</a>
  </p>
</div>

---

## 📖 ¿Qué es BotMaRe?

**BotMaRe (powered by Kitsune Engine)** transforma tu cuenta de WhatsApp en una central de operaciones inteligente. Integra los modelos de IA más avanzados del mercado, flujos de automatización de mensajes, programadores de recordatorios, y un panel de administración premium con diseño *Glassmorphism*, todo consolidado en un solo proceso monolítico de alto rendimiento.

---

## 🏛️ Arquitectura y Flujo de Datos

El siguiente diagrama ilustra cómo interactúan la interfaz gráfica, el servidor central de Express, las bases de datos SQLite y las integraciones externas (WhatsApp, Telegram y Proveedores de IA):

```mermaid
graph TD
    %% Estilos de Nodos
    classDef frontend fill:#0ea5e9,stroke:#0284c7,stroke-width:2px,color:#fff;
    classDef backend fill:#6366f1,stroke:#4f46e5,stroke-width:2px,color:#fff;
    classDef database fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#fff;
    classDef wa fill:#22c55e,stroke:#16a34a,stroke-width:2px,color:#fff;
    classDef tg fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff;
    classDef ai fill:#ec4899,stroke:#db2777,stroke-width:2px,color:#fff;

    %% Nodos
    UI["💻 Dashboard (Next.js / React)"]:::frontend
    SRV["🦊 Servidor Principal (Express.js)"]:::backend
    DB["💾 Almacenamiento Híbrido NoSQL y Auth<br>(MongoDB / database.json / whatsapp_auth.db)"]:::database
    WA["🟢 WhatsApp Web Link (Baileys)"]:::wa
    TG["🔵 Control / Alertas Bot (Grammy)"]:::tg
    LLM["🧠 Orquestador de IA (callLLM)"]:::ai

    %% Conexiones
    UI <-->|HTTP API & WebSockets| SRV
    SRV <-->|Lectura/Escritura Rápida| DB
    SRV <-->|Control de Sesión & Eventos| WA
    SRV <-->|Notificaciones & SSH Reverso| TG
    SRV <-->|Failover de Prompts| LLM
```

---

## ✨ Características Principales

- 🧠 **IA Multi-Proveedor con Failover**: Groq, Gemini, OpenAI, DeepSeek, OpenRouter y Nvidia. Si un proveedor falla, la IA escala automáticamente al siguiente en milisegundos.
- 📱 **WhatsApp Agent**: Respuestas inteligentes, comprensión de imágenes (Visión), transcripción de audio (Whisper) y soporte de documentos.
- 📢 **Difusión Masiva con Spintax**: Envía campañas personalizadas a listas de contactos desde la interfaz con soporte nativo de **Giro de Texto (Spintax)**. El asistente IA te permite generar variaciones y emojis de forma temática con un clic.
- ⚡ **Menús Rápidos e IA**: Auto-respuestas por palabras clave con soporte de variables dinámicas e inyección de contexto de IA.
- 📅 **Recordatorios Inteligentes**: Programa recordatorios en chats privados o grupales con frecuencias de repetición y soporte de carga masiva.
- 🛡️ **Blindaje Anti-Ban Activo**: Retardos aleatorios proporcionalmente dinámicos al largo del mensaje (Jitter), pausas de seguridad (Burst Protection) y simulación humana de carga de archivos (presencia de "Escribiendo..." y "Grabando audio...").
- 👤 **Soporte Humano Dinámico**: Detén la IA en cualquier chat de forma temporal si un cliente requiere atención humana. Centraliza las alertas en Telegram.
- 📦 **Respaldos en un Clic**: Exporta e importa bases de datos de configuración y archivos multimedia por separado o juntos desde la UI.
- ✈️ **Soporte Remoto vía Telegram**: Controla el estado del bot, genera nuevos QRs y levanta túneles de soporte SSH remoto (`tmate`) directo desde tu chat de Telegram.
- 👥 **Gestor de Grupos**: Selector nativo de grupos autorizados en el dashboard y detección inteligente de menciones.
- 💾 **Base de Datos con Patrón Estrategia**: Arquitectura sólida y modular (`MongoAdapter` y `LowdbAdapter`) que permite escalar el almacenamiento sin tocar la lógica central.
- 📶 **Control de Conectividad**: Tarjeta visual en el panel de configuración para ver el estado y copiar con un clic tus accesos por **Cloudflare Tunnel** (Público) y **Tailscale VPN** (Privado).
- 🚀 **Compilación Ultrarrápida**: Integración con **Turbopack** y optimización nativa de librerías para arranques y builds hasta 700x más rápidos.
- 🎨 **Experiencia Premium UI/UX**: Animaciones fluidas nativas en el dashboard gracias a **Framer Motion** y una **Terminal Visual** con spinners ANSI y arte ASCII para las fases de arranque.

---

## 🧠 Orquestador de IA y Failover Automático

La función `callLLM` actúa como un despachador inteligente. Si una API Key se queda sin saldo o el servidor de un proveedor sufre un límite de peticiones (Error 429), el orquestador fluye de manera descendente para asegurar que el bot nunca deje de responder:

```mermaid
flowchart TD
    classDef init fill:#64748b,stroke:#475569,stroke-width:2px,color:#fff;
    classDef success fill:#22c55e,stroke:#16a34a,stroke-width:2px,color:#fff;
    classDef process fill:#6366f1,stroke:#4f46e5,stroke-width:2px,color:#fff;
    classDef error fill:#ef4444,stroke:#dc2626,stroke-width:2px,color:#fff;

    Start["💬 Entrada de Mensaje"]:::init
    P1["⚡ 1. Groq (Llama 3.3 / Vision)"]:::process
    P2["🤖 1.5. DeepSeek Directo"]:::process
    P3["♊ 2. Google Gemini"]:::process
    P4["🟢 3. OpenAI (GPT-4o mini)"]:::process
    P5["🧭 4. OpenRouter (Llama Free)"]:::process
    P6["💚 5. Nvidia (DeepSeek R1/V3)"]:::process
    Done["🤖 Respuesta Enviada"]:::success
    Fail["❌ Error: Sin proveedores"]:::error

    Start --> P1
    P1 -- "Éxito" --> Done
    P1 -- "Falla o Límite" --> P2
    P2 -- "Éxito" --> Done
    P2 -- "Falla o Límite" --> P3
    P3 -- "Éxito" --> Done
    P3 -- "Falla o Límite" --> P4
    P4 -- "Éxito" --> Done
    P4 -- "Falla o Límite" --> P5
    P5 -- "Éxito" --> Done
    P5 -- "Falla o Límite" --> P6
    P6 -- "Éxito" --> Done
    P6 -- "Falla o Límite" --> Fail
```

---

## 🤖 Modelos Recomendados (Bajo Costo y Gratuitos)

Para obtener el máximo rendimiento sin gastar de más, recomendamos la siguiente configuración en tu archivo `.env`. Esta combinación aprovecha las capas gratuitas y los modelos más costo-eficientes del mercado:

```env
# Groq es 100% gratuito por ahora y súper rápido. Llama 3.1 70B es su mejor opción.
GROQ_MODEL="llama-3.1-70b-versatile"

# OpenRouter: Google Gemma 2 9B (Gratis), alternativo Llama 3 8B
OPENROUTER_MODEL="google/gemma-2-9b-it:free"

# Gemini: El modelo Flash tiene una capa gratuita mensual muy generosa y es rapidísimo.
GEMINI_MODEL="gemini-2.5-flash"

# DeepSeek: Súper económico, "deepseek-chat" es su modelo insignia.
DEEPSEEK_MODEL="deepseek-chat"

# OpenAI: No tiene capa gratuita, pero 4o-mini es extremadamente barato y capaz.
OPENAI_MODEL="gpt-4o-mini"

# NVIDIA NIM: Dan créditos gratis iniciales.
NVIDIA_MODEL="deepseek-ai/deepseek-v4-pro"
```

---

## 🚀 Guías de Instalación Paso a Paso

### 💻 Opción A: Servidor Local (Windows / macOS / Linux)

Ideal para computadoras de escritorio de uso diario o laptops locales.

#### Requisitos Previos:
- **Node.js**: v18 o superior ([Descargar](https://nodejs.org/)).
- **pnpm**: Gestor de paquetes ultrarrápido. Instálalo abriendo tu terminal y ejecutando:
  ```bash
  npm install -g pnpm
  ```

#### Paso a Paso:

1. **Clona el repositorio oficial de GitHub:**
   ```bash
   git clone https://github.com/LedezmaSune/BotMaRe.git
   cd BotMaRe
   ```

2. **Prepara tu archivo de variables de entorno:**
   * **En Windows (CMD/PowerShell):**
     ```powershell
     copy .env.example .env
     ```
   * **En Linux o macOS:**
     ```bash
     cp .env.example .env
     ```

3. **Instala todas las dependencias del proyecto:**
   ```bash
   pnpm install
   ```

4. **Compila la interfaz de Next.js para producción:**
   ```bash
   pnpm run build
   ```

5. **Inicia el menú interactivo para controlar tu bot de forma visual:**
   ```bash
   pnpm run menu
   ```
   *Selecciona la opción **1** para iniciar en Modo Producción. Tu consola mostrará las direcciones locales, privadas e IPs físicas para acceder al Dashboard (por defecto: `http://localhost:8000`). Accede con tu usuario (`admin`) y contraseña (`admin123`).*

---

### ☁️ Opción B: Servidor en la Nube (VPS Linux Ubuntu/Debian)

Ideal para mantener el bot operativo 24 horas al día, 7 días a la semana sin depender de tu computadora personal.

#### Requisitos de Hardware mínimos:
- **CPU**: 1 vCPU o superior.
- **RAM**: 1 GB mínimo. **IMPORTANTE:** Si tu VPS tiene solo 1 GB de RAM, la compilación del frontend puede quedarse sin memoria. Activa la memoria virtual (Swap) cuando el instalador te lo pregunte.

#### Instalación en Un Solo Paso (Script Automático):
Conéctate a tu VPS mediante SSH y ejecuta este comando maestro:
```bash
curl -fsSL https://raw.githubusercontent.com/LedezmaSune/BotMaRe/main/install.sh | bash
```
*Este instalador actualizará tu sistema operativo, instalará Node.js, pnpm, PM2, clonará el proyecto, creará la memoria Swap y dejará el bot compilado y listo para iniciar.*

#### Gestión en Segundo Plano con PM2:
* **Iniciar el Bot 24/7:**
  ```bash
  pnpm run pm2:start
  ```
* **Monitorear Consola en Vivo:**
  ```bash
  pnpm run pm2:logs
  ```
* **Guardar persistencia ante reinicios del VPS:**
  ```bash
  pm2 save
  pm2 startup
  ```

---

### 📱 Opción C: Dispositivos Móviles (Android con Termux)

¡Corre el bot completo directamente desde tu celular, sin computadoras ni VPS! El instalador está optimizado para compilar SQLite nativo y resolver el túnel de Cloudflare en entornos móviles de forma automática.

#### Requisitos Previos:
- Android 7.0 o superior.
- Instalar la terminal **Termux** desde [F-Droid](https://f-droid.org/packages/com.termux/) (la versión de Google Play está obsoleta y causará errores de paquetes).
- Asegúrate de tener al menos 3 GB de memoria interna libre.
- Desactiva la optimización de batería para la aplicación Termux en los ajustes de tu Android (evita que el sistema lo cierre en segundo plano).

> [!WARNING]
> **REGLA DE ORO DE TERMUX:** Jamás instales ni clones este repositorio dentro del almacenamiento compartido (`/sdcard` o `/storage/emulated/0/...`). Las políticas de seguridad de Android montan esta partición con `noexec`, lo que impedirá la compilación de SQLite y el arranque de Node.js. **Instala siempre en el almacenamiento interno protegido del usuario (`~/` o `$HOME`)**.

#### Instalación Automática (Script Móvil):
El script de Termux valida la ruta de almacenamiento, instala automáticamente Node.js LTS, herramientas de compilación C++, Cloudflared aarch64 y compila SQLite de forma resiliente. Abre Termux y ejecuta:
```bash
curl -fsSL https://raw.githubusercontent.com/LedezmaSune/BotMaRe/main/install-termux.sh | bash
```

#### Instalación Manual (Paso a Paso):
Si deseas compilar todo de forma imperativa y manual, sigue estos pasos:

1. **Prepara tu entorno seguro e instala dependencias (Node LTS es altamente recomendado):**
   ```bash
   cd $HOME
   pkg update && pkg upgrade -y
   pkg install nodejs-lts python make clang binutils sqlite git curl openssl tmate tmux nano -y
   ```
2. **Instala los gestores de paquetes globales:**
   ```bash
   npm install -g pnpm pm2
   ```
3. **Clona el repositorio en el HOME interno:**
   ```bash
   git clone https://github.com/LedezmaSune/BotMaRe.git
   cd BotMaRe
   cp .env.example .env
   ```
4. **Configura el entorno de compilación e instala las dependencias de forma segura:**
   ```bash
   export CC=clang
   export CXX=clang++
   export LINK=clang++
   export GYP_DEFINES="android_ndk_path=''"
   export npm_config_build_from_source=true
   export npm_config_sqlite="/data/data/com.termux/files/usr"
   
   # Crear configuración global de gyp para omitir el chequeo de NDK en Android/Termux
   mkdir -p ~/.gyp
   echo "{'variables':{'android_ndk_path':''}}" > ~/.gyp/include.gypi
   
   # Instalar dependencias omitiendo los scripts automáticos incompatibles
   pnpm install --ignore-scripts
   
   # Compilar únicamente better-sqlite3 de forma nativa para Android
   pnpm rebuild better-sqlite3
   ```
5. **Compila la interfaz del Dashboard:**
   ```bash
   pnpm run build
   ```
6. **Arranca el Bot:**
   ```bash
   pnpm start
   ```

---

## 📶 Gestión de Redes y Conectividad

BotMaRe te ofrece tres formas perfectamente integradas para ver y compartir el panel de control:

1. **🌐 RED LOCAL (Wi-Fi/Ethernet):**
   * **¿Qué es?** La dirección IP física de tu computadora en tu módem (ej: `http://10.31.17.53:8000`).
   * **¿Para qué sirve?** Para abrir el panel desde cualquier celular, tableta o laptop que esté conectada al mismo Wi-Fi de tu casa u oficina.
2. **🔒 RED PRIVADA (Tailscale VPN):**
   * **¿Qué es?** Una VPN privada y segura autogestionada (IP que inicia en `100.x.x.x`).
   * **¿Para qué sirve?** Conéctate a tu panel desde cualquier lugar del mundo de manera 100% encriptada. El bot detectará tu IP de Tailscale y te la mostrará en el dashboard con un botón de copiado rápido.
3. **🌍 RED PÚBLICA (Cloudflare Tunnel):**
   * **¿Qué es?** Un túnel seguro de Cloudflare (`https://tu-subdominio.trycloudflare.com`).
   * **¿Para qué sirve?** Te da una URL pública segura (`https://`) para compartir con tu equipo o acceder desde cualquier navegador del mundo sin necesidad de abrir puertos en tu módem.

---

## 🧹 Mantenimiento del Servidor y Optimización

Los registros de chat y logs de Baileys pueden llenar tu disco. Mantén el sistema ligero con un solo comando:

```bash
pnpm run clean:logs
```
* **¿Qué hace?** Elimina logs antiguos, trunca archivos bloqueados por PM2 y ejecuta una desfragmentación física en tus bases de datos SQLite (`VACUUM`) para reclamar espacio en disco inmediatamente.

---

## 🏷️ Variables Dinámicas para Plantillas y Difusión

Personaliza tus mensajes de difusión y auto-respuestas inyectando datos del destinatario:

| Variable | Descripción | Ejemplo Visual |
|---|---|---|
| `{NOMBRE}` | Nombre completo guardado en agenda | Juan Carlos Pérez |
| `{NOMBRE_PILA}` o `{NOMBRE_PILA}` | Primer nombre únicamente | Juan |
| `{APELLIDO}` o `{LAST_NAME}` | Apellidos únicamente | Pérez |
| `{SALUDO}` | Saludo dinámico inteligente según horario | Buenos días / Buenas tardes / Buenas noches |
| `{EMOJI_SALUDO}` | Emoji de saludo aleatorio | 👋, 😊, 🤝, 🙌, ✨, 🌟 |
| `{EMOJI_ATENCION}` | Emoji de llamada a la acción aleatorio | 💡, 📢, ⚠️, 🎯, 📌 |
| `{EMOJI_ALEATORIO}` | Emoji positivo general aleatorio | 🎉, 🚀, 🔥, ✅, 😎 |
| `{FECHA}` o `{DATE}` | Fecha actual del servidor | 04/06/2026 |
| `{HORA_12}` | Hora actual en formato de 12 horas | 3:45 PM |
| `{HORA_24}` | Hora actual en formato de 24 horas | 15:45 |
| `{DIA_SEMANA}` | Día de la semana en curso | Jueves |
| `{NUMERO_ALEATORIO}` | Número aleatorio para forzar diferencias | 487219 |

---

## 📜 Tabla de Scripts Disponibles

| Comando | Descripción |
|---|---|
| `pnpm run menu` | **Lanzador Interactivo:** Menú gráfico para controlar todas las funciones. |
| `pnpm run dev` | Inicia el motor y Next.js en modo desarrollo con recarga activa. |
| `pnpm run build` | Compila las páginas estáticas del Dashboard para producción. |
| `pnpm run start` | Arranca el bot y sirve el dashboard compilado en modo producción. |
| `pnpm run clean` | Elimina todas las carpetas de caché `.next`, `.dist` y `out/`. |
| `pnpm run clean:logs` | Vacía logs en ejecución y optimiza el almacenamiento de SQLite. |
| `pnpm run reset:wa` | Elimina sesión actual de WhatsApp para forzar un escaneo de QR nuevo. |
| `pnpm run pm2:start` | Despliega e inicia el bot 24/7 en segundo plano usando PM2. |
| `pnpm run pm2:logs` | Abre el visor de consola en tiempo real para PM2. |

---

## 💾 Sistema de Base de Datos Híbrida Unificada (MongoDB Atlas / Lowdb)

Toda la persistencia de datos de la plataforma (**recordatorios, plantillas, auto-respuestas, historial de chats, auditorías, configuraciones del panel y perfiles de usuarios**) ha sido completamente migrada a una arquitectura NoSQL híbrida unificada (`src/core/dbManager.ts`):

1. **Prioridad en la Nube (MongoDB Atlas - Plan A):** Si configuras `MONGO_URI` en tu archivo `.env`, el bot almacenará todos los datos de forma centralizada y segura en la nube.
2. **Fallback Local Resiliente (Lowdb - Plan B):** Si la conexión a MongoDB Atlas falla (por timeout de 5 segundos), no hay acceso a internet o la variable de entorno no está configurada, el bot conmuta en tiempo real de forma automática para guardar y leer los datos localmente en [data/database.json](file:///c:/Proyectos/wamasivos/BotMaRe-main/data/database.json).

### 🤖 Migración Automática Cero-Pérdidas
El bot cuenta con un script de migración nativo (`src/core/migrator.ts`). Al arrancar la plataforma por primera vez, detectará si cuentas con una base de datos física de SQLite previa (`data/database.db`), extraerá todos tus datos reales de forma segura y los importará con sus IDs originales al nuevo motor NoSQL activo, registrando el éxito en `data/database.db.migrated` sin alterar tu archivo original.

---

## 🔄 Historial de Actualizaciones (Changelog)

### [1.5.0] - 2026-06-14
*   **Rediseño de Terminal CLI (Control Maestro):** El script `launcher.js` (`pnpm run menu`) fue reescrito completamente con una interfaz visual basada en cajitas, spinners ANSI, y arte ASCII para una experiencia de usuario más inmersiva durante el arranque.
*   **Sincronización Avanzada de Google Sheets (3 Columnas):** El parser CSV ahora procesa estrictamente 3 columnas (A: Palabra Clave, B: Respuesta, C: Regla de Coincidencia [1=Exacta, 2=Contiene]), aumentando el límite de lectura a 200 filas.
*   **Visor de Datos Expandido:** El panel de previsualización en la web ahora soporta la visualización de 50 respuestas simultáneas distribuidas en las 3 columnas, permitiendo auditar la base de datos de manera más clara.
*   **Gestión Remota desde Telegram:** Añadido un nuevo botón interactivo `📊 Google Sheets` en el menú `/start` del bot de Telegram para forzar la sincronización remota de autorespondedores sin necesidad de abrir el dashboard web.

### [1.4.3] - 2026-06-13
*   **Integración Multi-Autenticación Google Sheets:** La herramienta de Google Sheets se ha migrado a una página dedicada con tres modalidades de conexión para mayor flexibilidad y seguridad.
*   **Opción Pública:** Sincronización rápida sin autenticación mediante el uso de enlaces públicos (CSV).
*   **Cuenta de Servicio (Service Account):** Opción de autenticación segura orientada a servidores subiendo el `credentials.json`.
*   **Flujo de errores mitigado:** Inicialización dinámica de clientes OAuth para evitar el error "invalid_request".

### [1.4.2] - 2026-06-11
*   **Nuevo Menú de Actualizaciones:** Opción `[10]` añadida al menú de la terminal para gestionar actualizaciones directamente desde GitHub (permite elegir entre Versión Estable por Tags o Versión en Desarrollo por rama main).
*   **Migración de Core DB a Lowdb v7:** Reescribimos la lógica de `lowdb.adapter.ts` de CJS síncrono a la nueva API nativa asíncrona (ESM) para mayor robustez de archivos.
*   **Librería WhatsApp Actualizada:** Subida exitosa a `@whiskeysockets/baileys@7.0.0-rc13`.

### [1.4.1] - 2026-06-10
*   **Actualización de Seguridad de Dependencias:** Revisión completa de librerías obsoletas y actualización de Next.js (`16.2.9`), React (`19.2.7`), Axios (`1.17.0`), Framer Motion (`12.40.0`), Mongoose (`9.7.0`), OpenAI (`6.42.0`), entre otras.
*   **Control de Actualizaciones Mayores:** Bloqueo explícito de actualizaciones mayores para `lowdb` y `@whiskeysockets/baileys` para prevenir fallos por incompatibilidad de API o ESM.
*   **Verificación de Construcción:** Confirmación del despliegue exitoso mediante compilación limpia en TypeScript.

### [1.4.0] - 2026-06-04
*   **Motor de Spintax (Giro de Texto) Integrado:** Variación dinámica de mensajes en campañas masivas usando `{opción A|opción B|opción C}` para eludir filtros de spam de WhatsApp.
*   **Asistente IA de Spintax:** Botón en la interfaz (color púrpura) que reescribe tus textos automáticamente aplicando Spintax y emojis temáticos específicos de tu sector comercial.
*   **Zona Protegida de Variaciones:** Posibilidad de envolver entre llaves `{}` tus propias frases personalizadas (ej. `{nuestra promoción}`) para que el asistente de IA varíe **únicamente** esas secciones, dejando el resto del mensaje completamente idéntico.
*   **Nuevas Variables de Emojis y Saludos:** Incorporación de `{SALUDO}` (Buenos días/tardes/noches de forma automática) y etiquetas de emojis aleatorios `{EMOJI_SALUDO}`, `{EMOJI_ATENCION}` y `{EMOJI_ALEATORIO}`.
*   **Simulación de Presencia Multimedia:** El bot muestra *"Grabando audio..."* (para notas de voz) o *"Escribiendo..."* (para fotos y videos) durante unos segundos antes de entregar el archivo.
*   **Retardo Caótico Proporcional:** Intervalos dinámicos entre envíos masivos basados en la longitud de caracteres del mensaje para imitar redacción humana.
*   **Corrección de Compilación:** Reparado un fallo de TypeScript en `Reminders.tsx` relacionado con la propiedad `media`.

---



<div align="center">
  <p>Desarrollado con ❤️ por <strong><a href="https://github.com/LedezmaSune">LedezmaSune</a></strong></p>
  <p>Impulsado por <strong>Kitsune Engine</strong> 🦊</p>
</div>
