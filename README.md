# 🦊 BotMaRe AI - Ecosistema Avanzado de WhatsApp

¡Bienvenido a la vanguardia de la automatización! **BotMaRe AI 2026** es la plataforma definitiva diseñada para transformar tu WhatsApp en un centro de operaciones inteligente, portátil y de alto rendimiento.

Tras nuestra última gran actualización a una arquitectura **Modular Monolith**, BotMaRe no solo es un bot: es un motor acoplado a un Dashboard de grado empresarial (Next.js 15) capaz de ejecutarse 24/7 sin sudar.

---

## 💎 Características de Élite

*   **🧠 IA Multi-Modelo**: Integración nativa con los cerebros más potentes del mercado (ChatGPT, Gemini, Claude, DeepSeek).
*   **📅 Suite de Programación Modular**: Nuevo sistema de recordatorios totalmente refactorizado. Interfaz limpia con Custom Hooks y cargas masivas super eficientes.
*   **📦 Portabilidad Inteligente**: Respalda y mueve tu agenda entre servidores con auto-reparación de rutas multimedia.
*   **🚀 Difusión de Alto Volumen**: Motor de envíos masivos con protección anti-bloqueo de última generación.
*   **🛡️ Escudo Maestro**: Simulación de escritura humana, retrasos aleatorios (jitter) y pausas inteligentes.
*   **⚡ Arquitectura pnpm**: Dependencias hiper-optimizadas, resolviendo bloqueos pasados y agilizando instalaciones.

---

## 🚀 Instalación y Despliegue Express (Guía Definitiva)

Hemos simplificado todo para que arrancar sea pan comido, sin importar tu nivel técnico.

### Requisitos Previos:
Asegúrate de tener instalados:
*   **Node.js** (v20 o v22)
*   **pnpm** (Ejecuta `npm install -g pnpm` si no lo tienes)
*   **Git**

### 1️⃣ Descarga e Instalación Inicial
```bash
# 1. Clona el repositorio
git clone https://github.com/LedezmaSune/BotMaRe.git
cd BotMaRe

# 2. Instala TODAS las dependencias a la velocidad de la luz
pnpm install

# (Si te marca un error sobre builds ignorados, corre esto para habilitar sqlite3):
pnpm approve-builds && pnpm rebuild
```

### 2️⃣ Modo Desarrollo (Para hacer cambios en vivo)
Si quieres editar código, cambiar colores o probar algo:
```bash
pnpm run dev
```
*Esto arrancará el **UI Dashboard** (`localhost:3000`) y el **Motor de WhatsApp** (`localhost:8000`) al mismo tiempo.*

---

## 🏭 ¡Modo Producción! (Recomendado para servidores)

El modo de desarrollo es lento. Para poner tu BotMaRe a trabajar de forma seria, necesitamos **compilarlo**.

### Paso A: Compilar el código (Ultra Rápido)
```bash
pnpm run build
```
*(Esto tomará tu código y generará una versión súper comprimida y optimizada de tu Dashboard en Next.js).*

### Paso B: Arrancar 24/7 con PM2
Queremos que el bot sobreviva incluso si cierras la ventana negra o se reinicia la compu.
```bash
# Instala PM2 globalmente si no lo tienes:
npm install -g pm2

# Enciende el ecosistema completo:
pnpm run pm2:start
```

**Comandos Útiles de PM2:**
*   `pnpm run pm2:logs` → Ver qué está haciendo el bot en vivo.
*   `pnpm run pm2:monit` → Ver el consumo de RAM/CPU de tu bot.
*   `pnpm run pm2:restart` → Reiniciar el motor.
*   `pnpm run pm2:stop` → Detener el bot por completo.

---

## 🔄 Gestión Masiva Inteligente

El motor **BotMaRe 2026** está diseñado para la automatización a gran escala:

1.  **Asistente Inteligente (Lotes)**: Sube tus archivos multimedia nombrados como `DD-MM` y el bot detectará automáticamente la fecha (asumiendo el año en curso) para programar la entrega, ¡sin intervención manual!
2.  **Manejo de Variables**: Usa la etiqueta `{ARCHIVO}` en tu mensaje global y el bot la sustituirá con el nombre del cliente o archivo adjunto en tiempo real.
3.  **Auto-Fix de Rutas**: Si cambias de computadora, el bot detecta las rutas rotas y las repara buscando los archivos por nombre. ✨
4.  **Promise Lock en Consultas**: El sistema incorpora cachés de 5 minutos y candados asíncronos para protegerse del molesto error `rate-overlimit` de WhatsApp al buscar grupos masivamente.

---

## 🆘 Solución a Problemas Frecuentes

*   **¿La carpeta `node_modules` se corrompió? (`ENOTEMPTY`)**
    En Windows, bórrala manualmente o corre: `Remove-Item -Recurse -Force node_modules` y luego `pnpm install`.
*   **¿Falta el archivo `better_sqlite3.node`?**
    Se soluciona aprobando las compilaciones: `pnpm approve-builds` seguido de `pnpm rebuild`.
*   **¿El dashboard no carga los grupos?**
    Verifica que tu celular esté conectado. Si hay un `failed to decrypt message` en tu terminal, es normal: WhatsApp está sincronizando llaves de grupos viejos tras la instalación.

---

© 2026 **BotMaRe AI** - Potenciando la comunicación del futuro.
*Refactorizado, optimizado y creado con ❤️ para mentes innovadoras.*
