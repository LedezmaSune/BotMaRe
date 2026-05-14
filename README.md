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
*   **⚡ Arquitectura pnpm**: Dependencias hiper-optimizadas, resolviendo bloqueos pasados y agilizando instalaciones en cualquier plataforma.

---

## 🚀 Instalación y Despliegue Multiplataforma

Hemos optimizado el despliegue para que el bot corra impecable en cualquier sistema operativo. **Requisitos universales:** `Node.js` (v20+), `Git`.

### 🪟 Instalación en Windows
1. Clona el repositorio: `git clone https://github.com/LedezmaSune/BotMaRe.git`
2. Entra a la carpeta: `cd BotMaRe`
3. Dale doble clic al archivo `setup.bat`. Esto instalará pnpm y todas las dependencias automáticamente de forma segura.
4. (Opcional) Abre `manager.bat` para compilar y arrancar el servidor con un menú interactivo.

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
Puedes convertir tu celular en un servidor 24/7. Termux requiere compilar la base de datos localmente, así que necesitas paquetes adicionales:
1. Actualiza Termux e instala los compiladores básicos:
   ```bash
   pkg update && pkg upgrade -y
   pkg install git nodejs python make clang -y
   ```
2. Clona el repositorio e instala pnpm:
   ```bash
   git clone https://github.com/LedezmaSune/BotMaRe.git
   cd BotMaRe
   npm install -g pnpm pm2
   ```
3. Instala las dependencias y desactiva las restricciones estrictas para compilar SQLite:
   ```bash
   pnpm config set ignore-scripts false
   pnpm install
   ```
4. *Nota: Cloudflared (el túnel web) no es compatible nativamente con NPM en Termux. Descárgalo desde Termux (`pkg install cloudflared`) y ábrelo en una pestaña aparte si deseas acceso externo.*
5. Arranca el servidor local: `pnpm run build && pnpm run start`.

---

## 🏭 ¡Modo Producción! (Recomendado para servidores web)

El modo de desarrollo (`pnpm run dev`) es lento. Para poner tu BotMaRe a trabajar de forma seria en un VPS (Ubuntu, Debian, etc), necesitamos compilarlo e iniciarlo con PM2:

```bash
# 1. Compila el dashboard para máxima velocidad
pnpm run build

# 2. Enciende el ecosistema completo en segundo plano
pnpm run pm2:start
```

**Comandos Útiles de PM2:**
*   `pnpm run pm2:logs` → Ver qué está haciendo el bot en vivo.
*   `pnpm run pm2:monit` → Ver el consumo de RAM/CPU de tu bot.
*   `pnpm run pm2:restart` → Reiniciar el motor de WhatsApp.
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
*   **¿Falta el archivo `better_sqlite3.node` en Windows/Linux?**
    Se soluciona aprobando las compilaciones en tu terminal: `pnpm approve-builds` seguido de `pnpm rebuild`.
*   **¿El dashboard no carga los grupos de WhatsApp?**
    Verifica que tu celular esté conectado. Si hay un `failed to decrypt message` en tu terminal, es normal: WhatsApp está sincronizando llaves de grupos viejos tras la instalación y el bot sigue corriendo bien.

---

© 2026 **BotMaRe AI** - Potenciando la comunicación del futuro.
*Refactorizado, optimizado y creado con ❤️ para mentes innovadoras.*
