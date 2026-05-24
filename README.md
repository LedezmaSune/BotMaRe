<div align="center">
  <h1>🦊 BotMaRe - Gravity Dashboard (Unified)</h1>
  <p><strong>La plataforma definitiva de automatización para WhatsApp impulsada por Inteligencia Artificial.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white" alt="Node.js"/>
    <img src="https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs" alt="Next.js"/>
    <img src="https://img.shields.io/badge/Express-5-000000?logo=express" alt="Express"/>
    <img src="https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white" alt="TypeScript"/>
    <img src="https://img.shields.io/badge/License-ISC-blue" alt="License"/>
  </p>
</div>

---

## 📖 ¿Qué es BotMaRe?

**BotMaRe (powered by Kitsune Engine)** transforma tu WhatsApp en una herramienta de negocios inteligente. Combina múltiples modelos de IA, automatización de mensajes y un panel de control premium con diseño *Glassmorphism*, todo unificado en una sola aplicación de alto rendimiento.

### 🏛️ Arquitectura Unificada
BotMaRe utiliza una arquitectura monolítica moderna donde el motor de Inteligencia Artificial (Backend Express) y la interfaz gráfica (Frontend Next.js) conviven y se comunican a la perfección dentro de un solo proceso, simplificando despliegues y maximizando la velocidad.

---

## ✨ Características Principales

- 🧠 **IA Multi-Proveedor**: Groq, Gemini, OpenAI, DeepSeek, OpenRouter (con failover automático).
- 📱 **WhatsApp Bot**: Respuestas inteligentes, análisis de imágenes, transcripción de audio y documentos.
- 📢 **Difusión Masiva**: Envía mensajes personalizados a listas de contactos sin bloqueos. ¡Soporta múltiples archivos adjuntos!
- ⚡ **Menús Rápidos**: Auto-respuestas por palabra clave con menús, inyección de contexto IA o ignorar. (Incluye Variables Dinámicas).
- 📅 **Recordatorios**: Programa mensajes en grupos o privados con lógica de repetición.
- 🛡️ **Centro de Soporte**: Panel de escalado humano. Pausa la IA para clientes frustrados y alerta a asesores vía Telegram.
- 📦 **Respaldos Seguros**: Exporta e importa bases de datos (Sistema) y archivos multimedia separados o juntos con un clic.
- ✈️ **Telegram Bot**: Controla el sistema, reactiva bots y recibe alertas remotamente. ¡Incluye **acceso SSH reverso** integrado con `tmate`!
- 👥 **Gestor de Grupos**: Detección de menciones mejorada y selector nativo en el dashboard.
- 🌐 **Tunnel Automático**: Cloudflare Tunnel integrado para exponer tu bot a la web sin puertos.
- 📶 **Control de Conectividad**: Nueva tarjeta visual de "Redes y Conectividad" en la pestaña de configuración del Dashboard que permite monitorear y copiar con un clic tu acceso público vía Cloudflare Tunnel o tu IP privada segura de Tailscale VPN.
- 📡 **Detección de IP Inteligente**: El motor analiza automáticamente los adaptadores de red de la máquina, filtrando bucles o túneles virtuales incompatibles (como WARP), y priorizando las tarjetas físicas activas (Wi-Fi o Ethernet) para ofrecer siempre la dirección IP LAN ruteable real.
- 🎨 **Dashboard Premium**: Interfaz Next.js ultra rápida con modo oscuro, telemetría y micro-animaciones. Con políticas de seguridad relajadas para evitar bloqueos de estilos (CSS) en redes remotas.

---

## 🚀 Guía de Inicio Rápido

### 📋 Requisitos Previos

- **Node.js**: v18+ ([Descargar](https://nodejs.org))
- **pnpm**: v8+ (`npm i -g pnpm`)
- **API Key**: Al menos de 1 proveedor de IA.

### 💻 Instalación Local

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/LedezmaSune/BotMaRe.git
   cd BotMaRe
   ```

2. **Instalar dependencias y configurar**
   ```bash
   pnpm install
   ```
   Copia el archivo de variables de entorno:
   ```bash
   # Windows
   copy .env.example .env
   # Linux / Mac
   cp .env.example .env
   ```
   *Edita `.env` con tus API Keys y credenciales maestras. También puedes configurarlas gráficamente después en el dashboard.*

3. **Iniciar el sistema**
   ```bash
   pnpm run dev
   ```
   *El Dashboard estará disponible en `http://localhost:8000`.*

4. **Vincular WhatsApp**
   - Inicia sesión en el Dashboard (por defecto `admin` / `tu_contrasena_segura`).
   - Escanea el **código QR** desde tu WhatsApp (Dispositivos vinculados).
   - ¡El estado cambiará a Conectado!

---

## ☁️ Instalación en Servidores (VPS)

### 📊 Requisitos
| Recurso | 🔴 Mínimo | 🟢 Recomendado |
|---------|-----------|----------------|
| **CPU** | 1 vCPU | 2+ vCPUs |
| **RAM** | 1 GB (+ 2 GB Swap) | 2+ GB de RAM |
| **Disco** | 10 GB SSD | 20+ GB SSD/NVMe |

> [!IMPORTANT]  
> **El Truco del Swap (Muy importante):** Si tu servidor tiene solo 1 GB de RAM, la compilación de la página web podría fallar por falta de memoria. Nuestro script `install.sh` te ofrece crear "Swap" (memoria virtual) automáticamente. ¡Dile que sí!

### ⚡ Instalación Automática (Linux)
Ejecuta este comando para una preparación completa y automática de tu entorno:
```bash
curl -fsSL https://raw.githubusercontent.com/LedezmaSune/BotMaRe/main/install.sh | bash
```

---

## 📱 Instalación en Termux (Android)

¿Sin computadora? ¡BotMaRe también corre en tu celular usando **Termux**!

### Requisitos
- Android 7+ con [Termux](https://f-droid.org/packages/com.termux/) instalado desde **F-Droid** (no desde Play Store).
- Al menos **4 GB de RAM** recomendados para compilar.
- Desactivar la optimización de batería para Termux.

### ⚡ Instalación Automática
```bash
curl -fsSL https://raw.githubusercontent.com/LedezmaSune/BotMaRe/main/install-termux.sh | bash
```

### 🛠️ Instalación Manual
```bash
pkg update && pkg upgrade -y
pkg install nodejs python make clang binutils sqlite git curl openssl tmate tailscale -y
npm install -g pnpm pm2
git clone https://github.com/LedezmaSune/BotMaRe.git
cd BotMaRe
cp .env.example .env
pnpm install
pnpm run build
pnpm run start
```

> [!TIP]
> Usa **tmux** para que BotMaRe siga corriendo al cerrar Termux: `pkg install tmux` → `tmux new -s botmare` → `pnpm run start` → `Ctrl+B` luego `D` para desacoplar.

## 🔄 Actualización Segura

Mantener tu bot al día es fundamental. BotMaRe incluye un actualizador inteligente (`update.sh`) que realiza respaldos, actualiza dependencias y reconstruye el proyecto.

Para actualizar, ejecuta:
```bash
chmod +x update.sh
./update.sh
```

---

## 🔑 Proveedores de IA Soportados

| Proveedor | Gratis | Obtener Key | Variable en `.env` |
|-----------|--------|-------------|--------------------|
| **Groq** ⭐ | ✅ | [console.groq.com/keys](https://console.groq.com/keys) | `GROQ_API_KEY` |
| **Google Gemini** | ✅ | [aistudio.google.com](https://aistudio.google.com/app/apikey) | `GEMINI_API_KEY` |
| **DeepSeek** | ❌ | [platform.deepseek.com](https://platform.deepseek.com/) | `DEEPSEEK_API_KEY` |
| **OpenAI** | ❌ | [platform.openai.com](https://platform.openai.com/api-keys) | `OPENAI_API_KEY` |
| **OpenRouter** | ✅ | [openrouter.ai/keys](https://openrouter.ai/keys) | `OPENROUTER_API_KEY` |

---

## 📁 Estructura del Proyecto

```text
BotMaRe/
├── src/                      # Código unificado
│   ├── app/                  # Frontend Next.js (Dashboard y Páginas)
│   ├── components/           # Componentes UI (React)
│   ├── core/                 # Backend: Agente IA, LLM, router principal
│   ├── modules/              # Backend: Difusión, Recordatorios, Sistema
│   ├── routes/               # Endpoints REST (Express)
│   ├── telegram/             # Integración y notificaciones Telegram
│   ├── tools/                # Herramientas de IA (Web Search, Soporte, Clima)
│   └── server.ts             # Punto de entrada maestro
├── data/                     # Bases de datos SQLite y Uploads (Respaldable)
├── docs/                     # Documentación técnica
├── backups/                  # Sistema automático de respaldos locales
├── .env                      # Variables de entorno maestras
└── package.json              # Configuración y scripts de pnpm
```

---

## 🏷️ Variables Dinámicas para Mensajes

Puedes usar estas variables en tus difusiones y respuestas automáticas:

- `{NOMBRE}`: Nombre completo (Ej: Juan Pérez)
- `{NOMBRE_PILA}`: Primer nombre (Ej: Juan)
- `{APELLIDO}`: Apellidos (Ej: Pérez)
- `{FECHA}`: Fecha actual (Ej: 01/05/2026)
- `{HORA_12}`: Hora 12h (Ej: 2:30 PM)
- `{HORA_24}`: Hora 24h (Ej: 14:30)
- `{DIA_SEMANA}`: Día de la semana (Ej: Jueves)

---

## 📜 Scripts Disponibles (PNPM)

| Comando | Descripción |
|---------|-------------|
| `pnpm run dev` | Inicia el sistema en modo desarrollo (recarga activa). |
| `pnpm run build` | Compila el sistema para producción (necesario antes de PM2). |
| `pnpm run start` | Arranca el sistema en modo producción. |
| `pnpm run reset:wa` | Elimina las credenciales de WhatsApp para forzar un QR nuevo. |
| `pnpm run pm2:start` | Despliega BotMaRe usando PM2 (24/7 background). |
| `pnpm run pm2:logs` | Muestra la consola en vivo de PM2. |

---

## ❓ Preguntas Frecuentes (FAQ)

<details>
<summary><strong>¿Cómo personalizo el nombre de WhatsApp del bot y uso menciones en grupos?</strong></summary>

- **Personalización de Perfil Automática:** Configura `bot_name` en la pestaña **Configuración** del Dashboard.
- **Menciones:** En grupos habilitados, responde a: `@bot`, `@ia`, `@tu_nombre_personalizado`, selector nativo `@`, o respondiendo directamente a un mensaje suyo.
</details>

<details>
<summary><strong>El bot no responde y la consola arroja "not-acceptable" (406)</strong></summary>

Ocurre al desincronizarse las llaves locales de WhatsApp (por usar múltiples clientes).
Solución:
1. `pnpm run reset:wa`
2. `pnpm run dev`
3. Escanea el nuevo QR en el Dashboard.
</details>

<details>
<summary><strong>El bot dice "Conectado" pero no hace nada</strong></summary>

Verifica tener al menos una API Key válida configurada. Revisa la consola en la pestaña de Soporte para identificar errores de cuota en el LLM.
</details>

<details>
<summary><strong>El cliente pidió hablar con un humano y la IA se detuvo</strong></summary>

La IA pausó inteligentemente el chat. Revisa la pestaña de **Soporte** en el Dashboard para continuar manualmente y luego presiona "Reactivar IA".
</details>

---

<div align="center">
  <p>Desarrollado con ❤️ por <strong><a href="https://github.com/LedezmaSune">LedezmaSune</a></strong></p>
  <p>Impulsado por <strong>Kitsune Engine</strong> 🦊</p>
</div>
