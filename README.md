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

## 🛡️ Seguridad y Buenas Prácticas
Para mantener tu sistema seguro y evitar filtraciones a GitHub:

1. **Nunca subas el archivo `.env`**: Este archivo contiene tus llaves privadas. Ya está en el `.gitignore`, pero asegúrate de no forzar su subida.
2. **Usa credenciales seguras**: Cambia `DASHBOARD_PASS` en tu `.env` inmediatamente.
3. **Logs Limpios**: El sistema está configurado para no mostrar llaves en los logs, pero siempre revisa antes de compartir capturas de pantalla.
4. **Actualizaciones**: Usa la opción `U` en el `manager.bat` para mantener el sistema al día con parches de seguridad.

---

## 🛠️ Estructura del Proyecto (Monolito)
```
BotMaRe/
├── src/
│   ├── core/             # Cerebro (Bot.ts, System, Router)
│   ├── infrastructure/   # Conexiones (WhatsApp, Telegram)
│   ├── modules/          # Funcionalidades (IA, Mensajes, Reminders)
│   ├── routes/           # API Endpoints
│   └── server.ts         # Punto de entrada unificado (Express + Socket.io)
├── out/                  # Interfaz estática (Generada con npm run build)
├── data/                 # Bases de datos y archivos locales (Ignorado)
└── manager.bat           # Panel de control Maestro (Recomendado)
```

---

## 🔑 Proveedores de IA Soportados
BotMaRe intenta conectar en este orden (Failover automático):
1. **Groq** (Llama 3.3 - Velocidad extrema)
2. **DeepSeek** (Inteligencia pura y económica) ⭐ *NUEVO*
3. **Google Gemini** (Excelente visión y contexto)
4. **OpenAI** (El estándar de la industria)
5. **OpenRouter / NVIDIA** (Respaldo total)

---

## ❓ Preguntas Frecuentes

**¿Por qué la pantalla se queda en blanco?**
Asegúrate de haber ejecutado la opción **9** en el `manager.bat` o `npm run build`. Esto genera la carpeta `out/` que el servidor necesita para mostrar el Dashboard.

**¿Cómo cambio el puerto?**
Edita la variable `PORT` en tu archivo `.env`. Por defecto es el **8000**.

**¿Es seguro usarlo en un VPS?**
Sí, pero se recomienda usar un túnel (Opción **T** en manager) o configurar un Proxy Inverso (Nginx) con SSL para proteger el tráfico.

---

<p align="center">
  Desarrollado con ❤️ por <strong><a href="https://github.com/LedezmaSune">LedezmaSune</a></strong><br/>
  Impulsado por el motor <strong>Kitsune Unified</strong> 🦊
</p>
