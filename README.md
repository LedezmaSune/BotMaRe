# 🦊 BotMaRe AI - Tu Asistente Inteligente de WhatsApp 🚀

¡Hola y bienvenido a **BotMaRe AI 2026**! 🎉 
Imagina que pudieras tener a un asistente experto trabajando para ti en WhatsApp las 24 horas del día. Eso es exactamente lo que hace este proyecto. Transforma tu número de WhatsApp en un "cerebro" automatizado.

---

## 🌟 ¿Qué es BotMaRe AI?
BotMaRe es un ecosistema que conecta la inteligencia artificial (como ChatGPT o Gemini) directamente con tu WhatsApp. Tiene dos partes principales:
1. **El Motor (Backend):** El cerebro invisible que procesa los mensajes, lee lo que te envían y decide qué responder.
2. **El Panel de Control (Dashboard):** Una página web muy visual y fácil de usar donde puedes ver y controlar todo el comportamiento de tu bot.

---

## 🚀 ¡Vamos a Instalarlo! (Guía Paso a Paso)

No importa si eres un programador experto o si es tu primera vez abriendo una terminal, te llevaremos de la mano.

### 🍎 Opción 1: Tienes Linux o macOS (La forma más fácil)
Si tienes una computadora con Linux o una Mac, la instalación es casi mágica. Solo abre tu terminal (consola) y pega esta línea:

```bash
curl -fsSL https://raw.githubusercontent.com/LedezmaSune/BotMaRe/main/install.sh | bash
```

**¿Qué hace esto?** Se encarga de todo por ti: descarga el código, instala las herramientas necesarias (como Node.js) y deja todo listo para funcionar. ¡Tú solo relájate y observa! ☕

### 🪟 Opción 2: Estás en Windows

¡Sí, también funciona perfectamente en Windows! 

> **💡 ¿Se puede usar `curl` en Windows? ¡SÍ!**
> Si tienes Windows 10 (actualizado) o Windows 11, la herramienta `curl` **ya viene preinstalada** de fábrica.
> Simplemente abre el menú inicio, busca **CMD** (Símbolo del sistema) o **PowerShell**, ábrelo y ya puedes usar comandos `curl` igual que en Linux. 
> 
> *⚠️ Nota importante para usuarios de PowerShell:* A veces PowerShell confunde la palabra `curl` con un comando antiguo suyo (`Invoke-WebRequest`). Para evitar errores y usar el `curl` real, te recomendamos escribir **`curl.exe`** en lugar de solo `curl`.
> Ejemplo: `curl.exe -fsSL http://ejemplo.com`

Para instalar el bot en Windows, sigue estos pasos:

1. **Descarga el código del bot:**
   Abre tu consola (CMD) y escribe:
   ```cmd
   git clone https://github.com/LedezmaSune/BotMaRe.git
   cd BotMaRe
   ```
2. **Ejecuta el asistente visual de Windows:**
   ```cmd
   bin\setup.bat
   ```
   Este archivo abrirá un menú interactivo que te irá guiando paso a paso. 🤝

---

## ⚙️ Configurando tu Bot (El archivo `.env`)

Para que el bot funcione, necesita saber un par de secretos, como qué contraseña quieres usar para entrar a tu panel web, y cuál es tu "llave" de Inteligencia Artificial. Esto se guarda en un archivo secreto llamado `.env`.

Abre (o crea) el archivo llamado `.env` en la carpeta principal de tu proyecto y asegúrate de que tenga esta información:

```env
# ── TUS DATOS PARA ENTRAR AL PANEL WEB ──
DASHBOARD_USER=mi_usuario_inventado
DASHBOARD_PASS=mi_clave_secreta

# ── EL PUERTO (El "estacionamiento" de tu web) ──
PORT=8000

# ── TU LLAVE DE INTELIGENCIA ARTIFICIAL ──
# ¡Elige al menos una y pon tu código real!
GEMINI_API_KEY=pega_tu_llave_aqui_sin_comillas
```

---

## 🎮 ¡A Jugar! (Cómo encender tu bot)

Una vez instalado y configurado, tienes varias formas de encenderlo dependiendo de lo que quieras hacer. Abre tu consola en la carpeta del bot y escribe uno de estos comandos:

*   **Para usarlo y dejarlo encendido SIEMPRE (Recomendado):**
    ```bash
    pnpm run pm2:start
    ```
    *Esto hace que el bot funcione de fondo, incluso si cierras la consola, y se reinicie solo si la computadora se apaga.*

*   **Para curiosear o modificar el código (Desarrollo):**
    ```bash
    pnpm run dev
    ```

### 📱 El Paso Final: Conectar tu WhatsApp al Bot
1. Abre tu navegador de internet (Chrome, Edge, Safari) y entra a esta dirección: `http://localhost:8000` (Si cambiaste el puerto en el `.env`, usa ese número).
2. Pon el usuario y contraseña que inventaste.
3. Ve a la sección que dice **WhatsApp**. Verás aparecer un código QR gigante.
4. Toma tu celular, abre WhatsApp, ve a **Dispositivos Vinculados > Vincular un dispositivo** y escanea ese código. ¡Listo! Tu bot ya está escuchando. 🥳

---

## 🚑 Sección de Primeros Auxilios (Errores Comunes)

A veces las cosas no salen a la primera, ¡es normal! Aquí tienes las soluciones a los problemas más comunes:

*   **Problema:** Me sale un error diciendo que "El puerto 8000 ya está en uso" (EADDRINUSE).
    *   **Solución:** Significa que otro programa ya está usando ese espacio. Abre tu archivo `.env` y cambia `PORT=8000` por otro número, como `PORT=8500`.
*   **Problema:** La pantalla de mi panel web se ve en blanco o dice "out/index.html no encontrado".
    *   **Solución:** Te saltaste el paso de "construir" la página visual. Abre tu consola y escribe el comando: `pnpm run build`. Luego vuelve a encender el bot.
*   **Problema:** El código QR no funciona, no escanea o se quedó trabado buscando.
    *   **Solución:** A veces la memoria de WhatsApp se confunde. Apaga el bot y escribe en tu consola: `pnpm run reset:wa`. Esto borrará la sesión anterior y te dará un QR nuevecito y limpio.

---

## 📋 Requisitos para los más técnicos
Si quieres saber los requisitos exactos de la computadora o servidor donde lo vas a instalar:
*   Sistema operativo: Linux (recomendado), Windows, o macOS.
*   **Node.js v20** o superior.
*   **Git** (para poder descargar y actualizar el código).
*   Memoria: Recomendamos al menos **2GB de RAM** para que funcione sin tirones.

¡Disfruta de BotMaRe AI y lleva tu comunicación al siguiente nivel! 🚀
