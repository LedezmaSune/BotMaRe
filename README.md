# 🦊 BotMaRe AI - Sistema de Gestión Inteligente de WhatsApp

BotMaRe es una plataforma modular de automatización para WhatsApp impulsada por Inteligencia Artificial (IA). Diseñada para ser potente, segura y fácil de usar, permite gestionar múltiples funciones desde un Dashboard web premium.

## 🌟 Características Principales

- **🧠 Motor de IA Multimodelo**: Soporte para Groq, Gemini, OpenAI, DeepSeek y Nvidia.
- **🛡️ Escudo Anti-Baneo Avanzado**: Simulación de escritura ("Escribiendo..."), pausas aleatorias (jitter) y protección por ráfagas (burst protection).
- **👥 Gestión de Grupos**: Activa o desactiva la IA en grupos específicos desde el Dashboard.
- **📅 Programador de Recordatorios**: Envío de mensajes y multimedia programados.
- **📢 Difusión Masiva**: Envío de campañas a listas de contactos con variables personalizadas.
- **🔒 Privacidad Total**: Base de datos SQLite local y cifrado en todas las comunicaciones.
- **🌍 Acceso Global**: Túnel integrado para acceder al Dashboard desde cualquier lugar.

---

## 🛠️ Instalación y Configuración

### Requisitos Previos
- [Node.js](https://nodejs.org/) (Versión 18 o superior recomendada).
- [Git](https://git-scm.com/).

### Paso a Paso

1. **Clonar el repositorio**:
   ```bash
   git clone <url-del-repositorio>
   cd BotMaRe-main
   ```

2. **Instalar dependencias**:
   ```bash
   npm run setup
   ```
   *Este comando instalará los módulos necesarios y creará tu archivo `.env` inicial.*

3. **Configurar el entorno**:
   Abre el archivo `.env` y añade al menos una API Key de IA (Groq, Gemini, etc.) o hazlo directamente desde el Dashboard en la pestaña de **Configuración**.

4. **Compilar el Dashboard**:
   Si es la primera vez o has hecho cambios visuales, ejecuta:
   ```bash
   npm run build
   ```

5. **Iniciar el Bot**:
   ```bash
   npm start
   ```
   *O usa el archivo `manager.bat` si estás en Windows para una gestión más fácil.*

---

## 📱 Uso de la Plataforma

### Vincular WhatsApp
Al iniciar el bot, aparecerá un código QR en la consola o en el Dashboard. Escanéalo con tu aplicación de WhatsApp (Dispositivos vinculados).

### Gestión de Grupos
1. Ve a la pestaña **Grupos**.
2. Usa el interruptor para habilitar la IA en los grupos que desees.
3. El bot responderá en los grupos habilitados solo cuando sea **mencionado** o cuando alguien **responda directamente** a uno de sus mensajes.

### Envíos Masivos (Anti-Ban)
El sistema aplica automáticamente:
- Esperas de 5-10 segundos entre contactos.
- Una pausa de seguridad de 20 segundos cada 10 mensajes.
- Simulación de escritura para evitar patrones robóticos.

---

## 🖥️ Comandos Útiles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia en modo desarrollo (cambios en tiempo real). |
| `npm run build` | Compila la interfaz para producción. |
| `npm run clean` | Limpia archivos temporales y builds antiguos. |
| `npm run reset:wa` | Borra la sesión de WhatsApp (útil para cambiar de número). |

---

## 🔒 Seguridad
- **Cambio de Credenciales**: Es altamente recomendable cambiar el usuario y contraseña del Dashboard en la pestaña de **Configuración** si planeas usar el acceso web público.
- **Base de Datos**: El archivo `data/database.db` contiene tus configuraciones y recordatorios. Mantén copias de seguridad regularmente.

---

© 2024 BotMaRe AI - Powered by Kitsune Engine.
