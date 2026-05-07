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

## 🛠️ Comandos de Control (Terminal)
Hemos migrado toda la lógica a `npm` para que el sistema sea más rápido y profesional. Abre tu terminal en la carpeta del proyecto y usa:

| Comando | 🦊 ¿Qué hace? |
| :--- | :--- |
| `npm run setup` | **Instalación**: Prepara el `.env` e instala todo. |
| `npm run build` | **Compilación**: Genera la carpeta `out` (Dashboard). |
| `npm start` | **Arranque**: Inicia el motor y el servidor. |
| `npm run dev` | **Desarrollo**: Recarga en vivo para cambios de código. |
| `npm run pm2:start` | **Producción**: Corre el bot en segundo plano. |
| `npm run reset:wa` | **Limpieza**: Cierra sesión y borra el QR actual. |
| `npm run tunnel` | **Acceso Web**: Abre un túnel seguro con Cloudflare. |

---

## 🏗️ Estructura del "Cerebro" (Arquitectura)
Para que entiendas cómo fluye la información en **BotMaRe**:

1.  **Entrada**: WhatsApp recibe un mensaje via `infrastructure/whatsapp`.
2.  **Procesamiento**: El `core/router.ts` decide si el mensaje es para la IA o un comando.
3.  **Módulos**: Se activa la lógica en `modules/` (IA, Recordatorios, etc.).
4.  **Salida**: Se envía la respuesta y se actualiza el **Dashboard** vía Socket.io.

---

## 🛡️ Seguridad Checklist
- [ ] **Archivo .env**: Nunca lo compartas. Contiene tus llaves privadas.
- [ ] **Carpeta data/**: Contiene tu sesión de WhatsApp. Mantenla privada.
- [ ] **Puerto**: Por defecto es el `8000`. Puedes cambiarlo en el `.env`.

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
Falta compilar. Ejecuta `npm run build` para generar los archivos de la interfaz.

**¿Cómo lo pongo en un servidor 24/7?**
Usa `npm run pm2:start`. Esto mantendrá el bot vivo aunque cierres la terminal.

**¿Cómo actualizo a la última versión?**
Ejecuta `git pull` seguido de `npm install`.

<p align="center">
  Desarrollado con ❤️ por <strong><a href="https://github.com/LedezmaSune">LedezmaSune</a></strong><br/>
  Impulsado por el motor <strong>Kitsune Unified</strong> 🦊
</p>
