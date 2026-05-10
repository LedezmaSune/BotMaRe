# 🦊 BotMaRe AI - Guía Maestra del Usuario

¡Bienvenido a **BotMaRe AI**! Esta no es solo una herramienta de mensajes; es el "cerebro" para tu WhatsApp. Esta guía te enseñará desde cómo instalarlo hasta cómo convertirlo en un asistente que trabaje por ti las 24 horas.

---

## 🎯 ¿Qué puedes hacer con BotMaRe?

*   **Asistente Inteligente**: Responde dudas de clientes usando los mejores modelos de IA (ChatGPT, Gemini, Claude, etc.).
*   **Secretario Programador**: Agenda mensajes para que se envíen solos en una fecha y hora específica.
*   **Difusor Seguro**: Envía avisos a cientos de contactos sin que WhatsApp te bloquee fácilmente.
*   **Control de Grupos**: Decide exactamente en qué grupos debe intervenir la IA y en cuáles no.

---

## 🛠️ Paso 1: Preparando el Terreno (Instalación)

Antes de empezar, asegúrate de tener estas dos herramientas en tu PC:
1.  **[Node.js](https://nodejs.org/)**: Es el motor que hace que el bot camine.
2.  **[Git](https://git-scm.com/)**: Es lo que nos permite descargar y actualizar el código.

### 🚀 Instalación Rápida
Abre una terminal (PowerShell o CMD) en la carpeta donde quieras el proyecto y escribe:

```bash
# 1. Descarga el proyecto
git clone https://github.com/LedezmaSune/BotMaRe.git

# 2. Entra a la carpeta
cd BotMaRe

# 3. Prepara todo automáticamente
npm run setup
```
> **💡 Consejo Didáctico:** El comando `npm run setup` es como "armar los muebles". Solo se hace la primera vez para dejar todo listo.

---

## ⚙️ Paso 2: Configurando el "Cerebro" (IA)

Para que el bot hable, necesita una "llave" (API Key) de algún servicio de IA.
1. Inicia el bot con `npm start`.
2. Abre tu navegador en `http://localhost:8000`.
3. Ve a la pestaña de **⚙️ Configuración**.
4. Pega tu llave de **Gemini** (gratis y recomendada para empezar) o **Groq**.
5. ¡Dale a **Guardar Cambios**!

---

## 🛡️ Paso 3: El Escudo Anti-Baneo (Muy importante)

WhatsApp es estricto con los bots. Por eso, BotMaRe incluye protecciones automáticas:

| Función | ¿Qué hace? | ¿Por qué es bueno? |
|---------|------------|--------------------|
| **Simulación de Escritura** | Verás el mensaje "Escribiendo..." antes de cada respuesta. | Parece que un humano está redactando el mensaje. |
| **Jitter (Retraso Aleatorio)** | El bot espera entre 5 y 10 segundos entre cada envío. | Evita que WhatsApp detecte un ritmo robótico perfecto. |
| **Pausa de Ráfaga** | Cada 10 mensajes masivos, el bot se detiene 20 segundos. | Simula que el usuario se tomó un pequeño descanso. |

---

## 👥 Paso 4: Dominando los Grupos

Por defecto, la IA no responde en grupos para no molestar. Para activarla:
1. Ve a la pestaña **👥 Grupos**.
2. Verás una lista de tus grupos actuales.
3. Activa el interruptor (Switch) en el grupo que quieras.
4. **Regla de Oro:** En los grupos, el bot solo responderá si alguien lo **menciona** (@BotMaRe) o si alguien **responde** a un mensaje previo del bot.

---

## 🆘 Solución de Problemas Comunes

*   **¿El QR no carga?**
    *   *Solución:* Asegúrate de que tu internet sea estable y refresca el Dashboard.
*   **¿Hice un cambio y no lo veo en la web?**
    *   *Solución:* Ejecuta `npm run build` en la terminal. Esto "refresca" los archivos visuales del Dashboard.
*   **¿Error "Connection Closed"?**
    *   *Solución:* Es normal si WhatsApp se desconecta un segundo. El bot intentará reconectar solo. Si no lo hace, reinicia el programa.

---

## ⌨️ Diccionario de Comandos Rápidos

| Si quieres... | Escribe en la terminal... |
|---------------|---------------------------|
| **Arrancar el bot normal** | `npm start` |
| **Probar cambios visuales** | `npm run dev` |
| **Limpiar errores antiguos** | `npm run clean` |
| **Borrar la sesión (cerrar sesión)** | `npm run reset:wa` |

---

© 2024 **BotMaRe AI** - Creado con ❤️ para facilitar tu comunicación.
