# 🦊 BotMaRe AI - Guía Maestra del Usuario

¡Bienvenido a **BotMaRe AI**! Esta no es solo una herramienta de mensajes; es el "cerebro" para tu WhatsApp. Esta guía te enseñará desde cómo instalarlo hasta cómo convertirlo en un asistente que trabaje por ti las 24 horas.

---

## 🎯 ¿Qué puedes hacer con BotMaRe?

*   **Asistente Inteligente**: Responde dudas de clientes usando los mejores modelos de IA (ChatGPT, Gemini, Claude, etc.).
*   **Secretario Programador**: Agenda mensajes para que se envíen solos en una fecha y hora específica.
*   **Difusor Seguro**: Envía avisos a cientos de contactos sin que WhatsApp te bloquee fácilmente.
*   **Control de Grupos**: Decide exactamente en qué grupos debe intervenir la IA y en cuáles no.

---

## 📂 Estructura del Proyecto (Mapa de Carpetas)

Para que sepas dónde encontrar cada pieza del bot:

```text
BotMaRe/
├── src/                # 🧠 Código Fuente (El corazón del bot)
│   ├── core/           # Lógica central (IA, Router, Seguridad)
│   ├── infrastructure/ # Conexión pura con WhatsApp (Baileys)
│   ├── modules/        # Funcionalidades (Mensajes, Recordatorios, Ajustes)
│   └── app/            # Interfaz Web (Dashboard en Next.js)
├── data/               # 💾 Tus Datos (Base de datos, Sesión, Archivos subidos)
├── public/             # Imágenes y assets visuales
├── .env                # Configuración de llaves secretas
└── package.json        # Listado de módulos y comandos
```

---

## 🛠️ Instalación y Configuración

### Requisitos Previos
1.  **[Node.js](https://nodejs.org/)**: Versión 18 o superior.
2.  **[Git](https://git-scm.com/)**: Para descargar y actualizar.

### 🚀 Guía por Sistema Operativo

#### 🪟 Windows
1. Descarga el código: `git clone https://github.com/LedezmaSune/BotMaRe.git`
2. Ejecuta `setup.bat` o escribe en la terminal: `npm run setup`
3. Inicia con: `npm start` o usa el `manager.bat`.

#### 🐧 Linux (Ubuntu/Debian)
```bash
sudo apt update && sudo apt install nodejs npm git -y
git clone https://github.com/LedezmaSune/BotMaRe.git
cd BotMaRe
npm run setup
npm run build
npm start
```

#### 🍎 macOS
```bash
brew install node git
git clone https://github.com/LedezmaSune/BotMaRe.git
cd BotMaRe
npm run setup
npm run build
npm start
```

---

## 🌐 Entornos Pro (VPS y Docker)

### 🚀 Despliegue en VPS (con PM2)
Si quieres que el bot nunca se apague, usa PM2:
```bash
npm install -g pm2
npm run pm2:start  # Inicia el bot en segundo plano
npm run pm2:logs   # Mira qué está pasando en tiempo real
npm run pm2:stop   # Detiene el bot
```

### 🐳 Docker (Contenedores)
Si prefieres usar Docker para evitar instalar Node.js en tu sistema:
```bash
docker-compose up -d --build
```
*El Dashboard estará disponible en el puerto 8000.*

---

## 🛡️ El Escudo Anti-Baneo

WhatsApp es estricto. BotMaRe incluye protecciones automáticas:

| Función | ¿Qué hace? | Beneficio |
|---------|------------|-----------|
| **Simulación de Escritura** | Activa "Escribiendo..." antes de cada mensaje. | Parece un humano real. |
| **Jitter (Retraso Aleatorio)** | Espera entre 5-10s entre envíos. | Rompe patrones robóticos. |
| **Burst Protection** | Pausa larga de 20s cada 10 mensajes masivos. | Simula descansos humanos. |

---

## 👥 Gestión de Grupos
1. Ve a la pestaña **👥 Grupos**.
2. Activa el interruptor en los grupos deseados.
3. **Regla:** Solo responderá si es **mencionado** (@NombreBot) o si alguien le **responde** directamente.

---

## 🆘 SOS - Solución de Problemas
*   **¿QR no carga?** Refresca el Dashboard o revisa tu internet.
*   **¿Cambios visuales no aparecen?** Ejecuta `npm run build`.
*   **¿Error de conexión?** El bot reconecta solo. Si falla mucho, usa `npm run reset:wa`.

---

© 2024 **BotMaRe AI** - Creado con ❤️ para facilitar tu comunicación.
