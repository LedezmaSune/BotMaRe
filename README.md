<h1 align="center">🦊 BotMaRe - Monolito Unificado</h1>

<p align="center">
  <strong>La plataforma definitiva de automatización para WhatsApp impulsada por IA, ahora más simple, robusta y rápida.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20+-339933?logo=nodedotjs&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/Next.js%20(Export)-15-000000?logo=nextdotjs" alt="Next.js"/>
  <img src="https://img.shields.io/badge/Express-4.21-000000?logo=express" alt="Express"/>
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/DeepSeek-Ready-blue?logo=openai" alt="DeepSeek"/>
</p>

---

## 📖 ¿Qué es BotMaRe?

**BotMaRe** es un sistema de automatización modular para WhatsApp que combina el poder de múltiples modelos de IA (DeepSeek, Groq, Gemini, OpenAI) con un Dashboard administrativo premium. 

Esta versión **Monolito Unificado** elimina la complejidad de procesos separados, sirviendo toda la plataforma desde un solo puerto (**8000**), simplificando el despliegue y mejorando la estabilidad.

### ✨ Características Principales
- 🚀 **Arquitectura Unificada:** Todo el sistema (Motor + Dashboard) corre en un solo proceso.
- 🤖 **IA Multi-Proveedor:** Soporte nativo para **DeepSeek**, Groq, Gemini, OpenAI y OpenRouter con failover automático.
- 🇪🇸 **Arranque Estructurado:** Proceso de inicio en 5 fases (0-4) con logs detallados en español.
- 🛡️ **Seguridad Blindada:** Dashboard protegido con credenciales y sesiones de WhatsApp aisladas.
- ✈️ **Telegram Link:** Control remoto y notificaciones de respaldo vía Telegram.
- 🎨 **Dashboard Premium:** Interfaz Glassmorphism ultrarrápida (Next.js 15).

---

## 🚀 Instalación Rápida

### Requisitos Previos
- **Node.js v20+** (Recomendado)
- **Git**

### Paso 1 — Preparación
```bash
git clone https://github.com/LedezmaSune/BotMaRe.git
cd BotMaRe
npm install
```

### Paso 2 — Configuración
Copia el archivo de ejemplo y rellena tus API Keys:
```bash
cp .env.example .env
```
*Edita el archivo `.env` con tu llave de **DeepSeek**, Groq o Gemini.*

### Paso 3 — Iniciar
```bash
# Para desarrollo (con recarga en vivo)
npm run dev

# Para producción (Recomendado)
npm start
```

---

## 🚀 Guía de Despliegue Multi-Plataforma
BotMaRe está diseñado para correr en cualquier lugar. Elige tu entorno:

### 🏠 1. Local (Windows/Mac) — Ideal para uso personal
1.  **Instala**: `npm run setup`
2.  **Inicia**: `npm start`
3.  **Dashboard**: Abre `http://localhost:8000`

### ☁️ 2. VPS (Linux - Ubuntu/Debian) — Ideal para uso 24/7
Recomendamos usar **PM2** para que el bot no se detenga nunca:
1.  **Instala**: `npm run setup`
2.  **Levanta**: `npm run pm2:start`
3.  **Monitorea**: `npm run pm2:logs`

### 🐋 3. Docker (Universal) — Ideal para aislamiento total
Si tienes Docker instalado, no necesitas Node.js en tu sistema:
```bash
docker-compose up -d
```
*El contenedor se encargará de instalar, compilar e iniciar todo por ti.*

---

## 🏗️ Arquitectura del Motor (Fases)
Para un arranque seguro y sin errores, BotMaRe sigue este flujo:

| Fase | 🦊 Objetivo |
| :--- | :--- |
| **Fase 0** | **Validación**: Revisa carpetas y el archivo `.env`. |
| **Fase 1** | **Memoria**: Conecta la base de datos SQLite. |
| **Fase 2** | **Acceso**: Activa túneles de Cloudflare (si aplica). |
| **Fase 3** | **Cerebros**: Inicia IA, Telegram y el Programador. |
| **Fase 4** | **Motor**: Enciende el Servidor Web y WhatsApp. |

---

## 🛠️ Comandos Pro (NPM)
| Comando | ✨ ¿Para qué sirve? |
| :--- | :--- |
| `npm run setup` | Configuración inicial y descarga de librerías. |
| `npm run build` | Compila la interfaz (Genera la carpeta `out`). |
| `npm start` | **Inteligente**: Compila si falta `out` e inicia el bot. |
| `npm run reset:wa` | Resetea la sesión de WhatsApp (QR nuevo). |
| `npm run tunnel` | Abre tu bot al mundo de forma segura. |

---

## 🛡️ Checklist de Seguridad
- [ ] **API Keys**: Ponlas en el `.env`, nunca en el código.
- [ ] **Sesión**: La carpeta `data/` es tu identidad de WhatsApp. Protégela.
- [ ] **Acceso**: Cambia `DASHBOARD_PASS` en el `.env` antes de subir a un VPS.

---

<p align="center">
  Desarrollado con ❤️ por <strong><a href="https://github.com/LedezmaSune">LedezmaSune</a></strong><br/>
  <strong>BotMaRe v1.1.0 — Monolito Unificado</strong> 🦊
</p>
