# 🦊 BotMaRe AI - Ecosistema Avanzado de WhatsApp

¡Bienvenido a la vanguardia de la automatización! **BotMaRe AI 2026** es la plataforma definitiva diseñada para transformar tu WhatsApp en un centro de operaciones inteligente, portátil y de alto rendimiento.

Tras nuestra última gran actualización a una arquitectura **Modular Monolith**, BotMaRe no solo es un bot: es un motor acoplado a un Dashboard de grado empresarial (Next.js 15) capaz de ejecutarse 24/7 sin sudar.

---

## 💎 Características de Élite

*   **🧠 IA Multi-Modelo**: Integración nativa con los cerebros más potentes del mercado (ChatGPT, Gemini, Claude, DeepSeek).
*   **📊 Dashboard de Control Maestro**: Interfaz ultra-moderna con modo oscuro, animaciones fluidas y métricas en tiempo real.
*   **🚀 Difusión Masiva Inteligente**:
    *   **Progreso en Vivo**: Barra de carga con efectos de brillo y porcentaje real.
    *   **Logs en Tiempo Real**: Visualiza exactamente a quién se le está enviando el mensaje mientras sucede.
    *   **Control Total**: Botón de **Cancelación Instantánea** para detener campañas en cualquier momento.
*   **📅 Suite de Programación Modular**: Nuevo sistema de recordatorios totalmente refactorizado con soporte multimedia.
*   **🛡️ Blindaje Empresarial**: Simulación de escritura humana, retrasos aleatorios (jitter) y protección contra bloqueos (Anti-Ban).
*   **📦 Portabilidad Inteligente**: Respalda y mueve tu agenda entre servidores con auto-reparación de rutas multimedia.

---

## 🚀 Instalación y Despliegue Multiplataforma

Hemos optimizado el despliegue para que el bot corra impecable en cualquier sistema operativo. **Requisitos universales:** `Node.js` (v20+), `Git`.

### 🪟 Instalación en Windows
1. Clona el repositorio: `git clone https://github.com/LedezmaSune/BotMaRe.git`
2. Entra a la carpeta: `cd BotMaRe`
3. Abre la carpeta `bin` y dale doble clic al archivo `setup.bat` (o ejecútalo como `bin\setup.bat`). Esto instalará pnpm y todas las dependencias automáticamente.
4. Ejecuta `bin\manager.bat` (o entra a la carpeta `bin` y dale doble clic) para compilar y arrancar el servidor con un menú interactivo.

### 🐧 Instalación en Linux / 🍎 macOS
1. Abre tu terminal y clona el proyecto:
   ```bash
   git clone https://github.com/LedezmaSune/BotMaRe.git
   cd BotMaRe
   ```
2. Dale permisos de ejecución al instalador y ejecútalo:
   ```bash
   chmod +x setup.sh update.sh
   ./setup.sh
   ```
3. Compila el dashboard y arranca el ecosistema completo:
   ```bash
   pnpm run build
   pnpm run dev
   ```

### 📱 Instalación en Termux (Android)
Puedes convertir tu celular en un servidor 24/7:
1. Actualiza Termux e instala los compiladores básicos: `pkg update && pkg upgrade -y && pkg install git nodejs python make clang -y`
2. Clona el repositorio e instala pnpm: `git clone https://github.com/LedezmaSune/BotMaRe.git && cd BotMaRe && npm install -g pnpm`
3. Instala dependencias: `pnpm config set ignore-scripts false && pnpm install`
4. Arranca: `pnpm run build && pnpm run start`.

---

## 🏭 ¡Modo Producción! (Recomendado para servidores web)

Para poner tu BotMaRe a trabajar de forma seria en un VPS (Ubuntu, Debian, etc), compilamos e iniciamos con PM2:

```bash
# 1. Compila el dashboard para máxima velocidad
pnpm run build

# 2. Enciende el ecosistema completo en segundo plano
pnpm run pm2:start
```

**Comandos Útiles de PM2:**
*   `pnpm run pm2:logs` → Ver qué está haciendo el bot en vivo.
*   `pnpm run pm2:restart` → Reiniciar el motor de WhatsApp.
*   `pnpm run pm2:stop` → Detener el bot por completo.

---

## 🔄 Gestión Masiva Inteligente

El motor **BotMaRe 2026** está diseñado para la automatización a gran escala:

1.  **Asistente de Lotes (Smart Lote)**: Sube tus archivos multimedia nombrados como `DD-MM` y el bot detectará automáticamente la fecha para programar la entrega.
2.  **Manejo de Variables**: Usa la etiqueta `{NOMBRE}` o `{ARCHIVO}` y el bot personalizará cada mensaje automáticamente.
3.  **Auto-Fix de Rutas**: Si cambias de computadora, el bot detecta las rutas rotas y las repara buscando los archivos por nombre. ✨
4.  **Promise Lock**: Sistema que evita el error `rate-overlimit` protegiendo tu cuenta de WhatsApp.

---

## 🆘 Solución a Problemas Frecuentes

*   **¿Error de base de datos?** Corre `pnpm approve-builds` y luego `pnpm rebuild`.
*   **¿El dashboard no carga los grupos?** Verifica que tu celular esté conectado. La primera sincronización puede tardar unos segundos.
*   **¿Errores de permisos en Linux?** Asegúrate de correr `chmod +x` en los archivos `.sh` y `.bat`.

---

© 2026 **BotMaRe AI** - Potenciando la comunicación del futuro.
*Refactorizado, optimizado y creado con ❤️ para mentes innovadoras.*
