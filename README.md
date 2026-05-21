<h1 align="center">🦊 BotMaRe - Gravity Dashboard (Unified)</h1>

<p align="center">
  <strong>La plataforma definitiva de automatización para WhatsApp impulsada por Inteligencia Artificial.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs" alt="Next.js"/>
  <img src="https://img.shields.io/badge/Express-5-000000?logo=express" alt="Express"/>
  <img src="https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/License-ISC-blue" alt="License"/>
</p>

---

## 📖 ¿Qué es BotMaRe?

BotMaRe (powered by **Kitsune Engine**) transforma tu WhatsApp en una herramienta de negocios inteligente. Combina múltiples modelos de IA, automatización de mensajes y un panel de control premium con diseño **Glassmorphism**, todo unificado en una sola aplicación de alto rendimiento.

### Arquitectura Unificada

BotMaRe utiliza una arquitectura monolítica moderna donde el motor de Inteligencia Artificial (Backend Express) y la interfaz gráfica (Frontend Next.js) conviven y se comunican a la perfección dentro de un solo proceso, simplificando despliegues y maximizando la velocidad.

---

## ✨ Características

| Módulo | Funcionalidades |
|--------|-----------------|
| 🧠 **IA Multi-Proveedor** | Groq, Gemini, OpenAI, DeepSeek, OpenRouter — con failover automático. |
| 📱 **WhatsApp Bot** | Respuestas inteligentes, análisis de imágenes, transcripción de audio y documentos. |
| 📢 **Difusión Masiva** | Envía mensajes personalizados a listas de contactos sin bloqueos. |
| 📅 **Recordatorios** | Programa mensajes en grupos o privados con lógica de repetición. |
| 🛡️ **Centro de Soporte** | **[NUEVO]** Panel de escalado humano. Pausa la IA para clientes frustrados y alerta a asesores vía Telegram. |
| 📦 **Respaldos Seguros** | **[NUEVO]** Exporta e importa bases de datos (Sistema) y archivos multimedia separados o juntos con un clic. |
| ✈️ **Telegram Bot** | Controla el sistema, reactiva bots y recibe alertas remotamente. |
| 👥 **Gestor de Grupos** | Detección de menciones mejorada y selector nativo en el dashboard. |
| 🌐 **Tunnel Automático** | Cloudflare Tunnel integrado para exponer tu bot a la web sin puertos. |
| 🎨 **Dashboard Premium** | Interfaz Next.js ultra rápida con modo oscuro, telemetría y micro-animaciones. |

---

## 🚀 Instalación Rápida

### Requisitos Previos

| Software | Versión Mínima | Enlace |
|----------|----------------|--------|
| **Node.js** | v18+ | [nodejs.org](https://nodejs.org) |
| **pnpm** | v8+ | `npm i -g pnpm` |
| **API Key** | Al menos 1 | Ver [Proveedores de IA](#-proveedores-de-ia) |

### Paso 1 — Clonar el repositorio

```bash
git clone https://github.com/LedezmaSune/BotMaRe.git
cd BotMaRe
```

### Paso 2 — Instalar dependencias y configurar

Al ser una plataforma unificada, solo necesitas un comando para instalar todo:

```bash
pnpm install
```

Luego, configura tus variables de entorno iniciales:

```bash
# Windows
copy .env.example .env
# Linux / Mac
cp .env.example .env
```

Edita `.env` con tus API Keys (ver [Proveedores de IA](#-proveedores-de-ia)) y tus credenciales maestras. 
> **💡 Tip:** También puedes configurar todas tus API Keys directamente desde la pestaña ⚙️ **Configuración** del Dashboard de manera visual una vez que inicies la app.

### Paso 3 — Iniciar el sistema

```bash
pnpm run dev
```

Esto arranca el Motor de IA y el Dashboard de forma simultánea (por defecto en el puerto `8000`).

```
  SYSTEM    🚀 KITSUNE ENGINE activo
  SYSTEM    🌍 DASHBOARD listo en: http://localhost:8000
```

### Paso 4 — Vincular WhatsApp

1. Abre [**http://localhost:8000**](http://localhost:8000) en tu navegador.
2. Inicia sesión con tus credenciales (por defecto `admin` / `tu_contrasena_segura` o lo que pusiste en `.env`).
3. Verás un **código QR** en el overlay del sistema — escanéalo con tu celular:
   * WhatsApp → **⋮ Menú** → **Dispositivos vinculados** → **Vincular dispositivo**
4. ¡Listo! El estado cambiará a **Conectado** 🟢.

---

## 🖥️ Requisitos para Servidores (Si lo subes a la nube)

Si vas a instalar BotMaRe en un VPS (Servidor Privado Virtual), esto es lo que necesitas:

| Recurso | 🔴 Mínimo | 🟢 Recomendado |
|---------|-----------|----------------|
| **CPU** | 1 vCPU | 2+ vCPUs |
| **RAM** | 1 GB (+ 2 GB Swap) | 2+ GB de RAM |
| **Disco** | 10 GB SSD | 20+ GB SSD/NVMe |

> [!IMPORTANT]
> **El Truco del Swap (Muy importante):** Si tu servidor tiene solo 1 GB de RAM, la compilación de la página web podría fallar por falta de memoria. Nuestro script `install.sh` te ofrece crear "Swap" (memoria virtual) automáticamente. ¡Dile que sí!

### Preparando un servidor Ubuntu/Debian desde cero
Si vas a realizar la instalación de forma manual en Linux, estos son los pasos para preparar tu entorno:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install build-essential python3 make g++ git curl -y
# Instalar Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pnpm pm2
```

---

## 🔑 Proveedores de IA

BotMaRe soporta múltiples proveedores con failover automático. Solo necesitas configurar **al menos 1**:

| Proveedor | Gratuito | Obtener Key | Variable en `.env` |
|-----------|----------|-------------|--------------------|
| **Groq** ⭐ (Prioridad 1)| ✅ Sí | [console.groq.com/keys](https://console.groq.com/keys) | `GROQ_API_KEY` |
| **Google Gemini** | ✅ Sí | [aistudio.google.com](https://aistudio.google.com/app/apikey) | `GEMINI_API_KEY` |
| **DeepSeek** | ❌ Pago | [platform.deepseek.com](https://platform.deepseek.com/) | `DEEPSEEK_API_KEY` |
| **OpenAI** | ❌ Pago | [platform.openai.com](https://platform.openai.com/api-keys) | `OPENAI_API_KEY` |
| **OpenRouter** | ✅ Free tier | [openrouter.ai/keys](https://openrouter.ai/keys) | `OPENROUTER_API_KEY` |

> **💡 Tip:** Puedes usar el Dashboard gráfico de BotMaRe para actualizar estos valores en caliente sin tocar archivos de texto.

---

## 📁 Estructura del Proyecto (Unificado)

```
BotMaRe-Unified/
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

## 🏷️ Variables Inteligentes

Al redactar mensajes o plantillas en el dashboard, puedes usar variables que se reemplazan automáticamente:

| Variable | Resultado | Ejemplo |
|----------|-----------|---------|
| `{NOMBRE}` | Nombre completo | Juan Pérez |
| `{NOMBRE_PILA}` | Primer nombre | Juan |
| `{APELLIDO}` | Apellidos | Pérez |
| `{FECHA}` | Fecha actual | 01/05/2026 |
| `{HORA_12}` | Hora 12h | 2:30 PM |
| `{HORA_24}` | Hora 24h | 14:30 |
| `{DIA_SEMANA}` | Día de la semana | Jueves |

---

## 📜 Scripts de PNPM

| Comando | Descripción |
|---------|-------------|
| `pnpm run dev` | Inicia el sistema completo en modo desarrollo (recarga activa). |
| `pnpm run build` | Compila el sistema para producción (necesario antes de PM2). |
| `pnpm run start` | Arranca el sistema en modo producción. |
| `pnpm run reset:wa` | Elimina las credenciales de WhatsApp para forzar un QR nuevo. |
| `pnpm run pm2:start` | Despliega BotMaRe usando PM2 (24/7 background). |
| `pnpm run pm2:logs` | Muestra la consola en vivo de PM2. |

---

## ❓ Solución de Problemas y Configuración de Grupos

<details>
<summary><strong>¿Cómo personalizo el nombre de WhatsApp del bot y uso menciones en grupos?</strong></summary>

* **Personalización de Perfil Automática:** El bot se sincroniza automáticamente con el `bot_name` configurado en la base de datos (pestaña **Configuración** de tu Dashboard). Al conectar o al cambiar el nombre desde la interfaz, el sistema llama a WhatsApp para actualizar tu perfil público en tiempo real.
* **Menciones Súper Flexibles:** En los grupos que hayas habilitado, el bot responderá a cualquiera de los siguientes disparadores:
  * Menciones amigables/genéricas: `@bot`, `@ia`, `@ai`, `@botmare` y `botmare`.
  * Nombre personalizado: `@TuNombrePersonalizado` o `@tu_nombre_personalizado` (con o sin espacios, ej. `@GravityBot` si se llama `Gravity Bot`).
  * Mención nativa: Seleccionando al bot con el selector `@` nativo de WhatsApp.
  * Respuestas directas: Respondiendo (haciendo Reply/Réplica) a cualquier mensaje emitido por el bot.
</details>

<details>
<summary><strong>El bot no envía respuestas en grupos o la consola arroja error "not-acceptable" (406)</strong></summary>

* **Causa:** El error `not-acceptable` lo lanza WhatsApp cuando las llaves de cifrado criptográfico local (Signal Protocol) se desincronizan. Esto sucede frecuentemente cuando una misma cuenta de teléfono es enlazada a múltiples scripts o clientes de automatización de forma simultánea (ej. correr `OpenWA` y `BotMaRe` al mismo tiempo con el mismo número).
* **Solución de Resiliencia:** El bot cuenta con protección anti-caídas (el servidor no se cerrará), pero para restablecer los envíos debes recrear la sesión limpia:
  1. Detén el bot en la consola.
  2. Ejecuta el comando de limpieza:
     ```bash
     pnpm run reset:wa
     ```
  3. Inicia de nuevo la aplicación:
     ```bash
     pnpm run dev
     ```
  4. Abre el Dashboard en tu navegador y **escanea el código QR nuevamente**. Esto generará claves criptográficas frescas, estables y seguras.
</details>

<details>
<summary><strong>El bot no responde o dice "Conectado" pero no hace nada</strong></summary>

* Ve a la pestaña **Configuración** y verifica que tengas al menos una API Key válida ingresada.
* Revisa la **Consola en Vivo** en la pestaña de *Soporte* para ver si hay errores de cuota de los LLM.
</details>

<details>
<summary><strong>El bot envía la base de datos dividida</strong></summary>

* ¡Es intencional! El Centro de Respaldo genera archivos separados para **Sistema** (Base de Datos ligera) y **Multimedia** (Fotos pesadas) para no sobrecargar las descargas por navegador o Telegram.
</details>

<details>
<summary><strong>El cliente pidió hablar con un humano y la IA ya no responde</strong></summary>

* Revisa tu pestaña de **Soporte**. La IA pausó inteligentemente la conversación. Puedes reactivarla presionando "Reactivar IA" en el Dashboard o desde el botón que te envió a Telegram.
</details>

---

## 🤝 Contribuir

1. Fork del repositorio
2. Crea tu rama: `git checkout -b feature/mi-mejora`
3. Commit: `git commit -m "feat: agregar nueva función"`
4. Push: `git push origin feature/mi-mejora`
5. Abre un Pull Request

---

<p align="center">
  Desarrollado con ❤️ por <strong><a href="https://github.com/LedezmaSune">LedezmaSune</a></strong><br/>
  Impulsado por <strong>Kitsune Engine</strong> 🦊
</p>
