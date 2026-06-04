# 🔄 Registro de Actualizaciones (Changelog) - BotMaRe

En este documento se registran los cambios, mejoras, parches de seguridad y nuevas funcionalidades añadidas a la plataforma **BotMaRe AI / Wamasivos**.

---

## [1.4.0] - 2026-06-04

### 🚀 Nuevas Características
*   **Motor de Spintax (Giro de Texto):** Soporte nativo para variaciones de texto en campañas y auto-respuestas usando el formato `{opción A|opción B|opción C}`. Útil para aleatorizar mensajes y evitar filtros de spam de WhatsApp.
*   **Asistente IA para Spintax:** Añadido el botón de **Generar Spintax** (color púrpura) en la interfaz de redacción de campañas masivas y plantillas, que permite reescribir textos automáticamente usando Spintax y añadiendo emojis según el tema principal.
*   **Variables de Emojis Dinámicos:**
    *   `{EMOJI_SALUDO}`: Emoji de saludo aleatorio (`👋`, `😊`, `🤝`, etc.).
    *   `{EMOJI_ATENCION}`: Emoji de atención aleatorio (`💡`, `📢`, `⚠️`, etc.).
    *   `{EMOJI_ALEATORIO}`: Emoji general aleatorio (`🎉`, `🚀`, `🔥`, etc.).
*   **Saludo Dinámico Inteligente:**
    *   `{SALUDO}`: Traduce automáticamente a *"Buenos días"*, *"Buenas tardes"* o *"Buenas noches"* según la hora del servidor al momento del envío.

### 🛡️ Mejoras de Seguridad Anti-Ban
*   **Simulación de Presencia en Multimedia:**
    *   Al enviar notas de voz/audios, el bot simula el estado de **"Grabando audio..."** (`recording`) durante 2 a 4 segundos.
    *   Al enviar imágenes, videos o documentos, el bot simula el estado de **"Escribiendo..."** (`composing`) durante 1.5 a 3 segundos.
*   **Retardo Caótico Proporcional:**
    *   El intervalo entre envíos masivos ahora calcula dinámicamente un tiempo extra (Jitter) proporcional al tamaño en caracteres del mensaje (añadiendo aprox. 15ms por carácter con un límite de 6 segundos). Esto rompe el patrón de red constante y simula la velocidad humana de redacción.

### 🔧 Corrección de Errores y Calidad
*   **Corrección de Compilación en Recordatorios:** Solucionado el error de TypeScript en [Reminders.tsx](file:///C:/Proyectos/wamasivos/BotMaRe-main/src/components/Reminders.tsx) donde no se estaba pasando la propiedad obligatoria `media` a `ReminderForm`.
*   **Tipado Estricto:** Alineación de firma de métodos en controladores y servicios de IA para asegurar compatibilidad de llamadas en Next.js.
