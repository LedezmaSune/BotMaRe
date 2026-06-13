# 💡 Ideas de Actualizaciones y Futuras Mejoras para BotMaRe

Este documento sirve como un registro central para almacenar conceptos arquitectónicos, ideas de features y posibles vías de escalabilidad para el ecosistema unificado de BotMaRe.

---

## 🧠 1. Integración de Cerebros CLI (Agentes de Consola)
**Concepto:** Permitir que el bot utilice herramientas de Inteligencia Artificial basadas en la línea de comandos (CLI), como `gemini cli`, `GitHub Copilot CLI`, `Codex`, u `Ollama`, integrándolas directamente como un proveedor más en el orquestador actual.

### ¿Cómo funcionaría?
- **Ejecución vía Subprocesos:** El bot utilizaría el módulo nativo `child_process` de Node.js para abrir terminales invisibles, enviar el prompt del usuario mediante comandos (ej: `gemini ask "mensaje"`) y leer la respuesta estándar (`stdout`) de la consola.
- **Autenticación desde la Interfaz Web:** 
  - Se agregaría una sección en el Dashboard de Configuración llamada "Vincular IA CLI".
  - Si la CLI requiere un flujo OAuth (abrir navegador), el Dashboard capturaría la URL de autenticación generada por el terminal y se la presentaría al usuario como un botón clickeable en la web.
  - Si requiere token, se guardaría en la base de datos y se inyectaría como variable de entorno (ej. `GEMINI_API_KEY`) al ejecutar el comando.
- **Ventajas:** Posibilidad de procesar mensajes 100% offline (con Ollama), esquivar límites comerciales (rate limits de APIs REST tradicionales) y utilizar capacidades de sistema operativo que las APIs estándar no ofrecen.

---

## ⚡ 2. Optimización Continua del Orquestador (Failover)
**Concepto:** Mejorar el `callLLM` para que sea proactivo en lugar de reactivo.

### ¿Cómo funcionaría?
- **Pings de Salud Base:** Enviar pings invisibles periódicamente a los proveedores (Groq, Gemini, OpenAI) para conocer su latencia y salud. 
- Si Groq está lento en ese minuto específico, el orquestador derivaría dinámicamente a Gemini sin esperar a que el primer request falle, reduciendo drásticamente el tiempo de respuesta final percibido por el cliente en WhatsApp.

---

## 🎨 3. Spintax IA Predictivo
**Concepto:** Evolucionar el motor actual de Giro de Texto (Spintax) para que aprenda del nicho de mercado del usuario.

### ¿Cómo funcionaría?
- Permitir que el usuario suba ejemplos de mensajes exitosos que sus clientes suelen responder positivamente.
- Usar el motor de IA para generar un Spintax que no sea simplemente sinónimos aleatorios, sino variaciones psicológicas orientadas a la venta (A/B testing natural).

---

## 📊 4. Integración Directa con Google Sheets (Auto-respuestas por Hoja de Cálculo)
**Concepto:** Permitir que los usuarios administren sus auto-respuestas, palabras clave y mensajes directamente desde una hoja de cálculo de Google (Google Sheets).

### ¿Cómo funcionaría?
- **Sincronización:** En el Dashboard se añadiría una opción para "Vincular Hoja de Cálculo". El usuario proporciona el enlace de su Google Sheet o la vincula vía OAuth de Google.
- **Estructura Simple:** El bot leería la primera pestaña (Hoja 1) asumiendo una estructura de dos columnas principales: `Palabra Clave` (Columna A) y `Respuesta` (Columna B).
- **Caché y Sincronización Automática:** 
  - Para no exceder los límites de la API de Google y mantener respuestas en milisegundos, el bot descargaría (sincronizaría) la hoja de cálculo localmente a la base de datos de auto-respuestas cada cierto tiempo (ej. cada 15 minutos o bajo demanda manual).
- **Ventajas:** Los clientes que no son técnicos pueden actualizar sus respuestas desde su celular usando la app de Google Sheets sin siquiera tener que abrir el Dashboard del bot.

---

> *"Las mejores herramientas crecen de manera orgánica escuchando los cuellos de botella reales de los usuarios. Mantener la arquitectura modular (como se hizo con Lowdb y Mongo) permitirá que cualquiera de estas ideas se integre sin reescribir el núcleo."*
