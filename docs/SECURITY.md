# Seguridad y Resiliencia en BotMaRe

Este documento detalla los parches de seguridad críticos y las optimizaciones de resiliencia incorporados para proteger BotMaRe, especialmente cuando se despliega en Termux o entornos de nube públicos (VPS).

## 1. Sandbox de Plugins (Prevención RCE)
El sistema de plugins permite inyectar comportamientos personalizados. Anteriormente, estos plugins tenían acceso a NodeJS `require`.
- **Mitigación implementada**: Se ha eliminado el acceso a la directiva `require` dentro del módulo de Máquina Virtual (`vm`) en `plugin.service.ts`.
- **Impacto**: Evita ataques de *Remote Code Execution (RCE)*. Los plugins ya no pueden importar comandos del sistema operativo (`child_process`), ni el sistema de archivos, asegurando que un plugin malicioso no pueda hackear tu PC/Servidor.

## 2. Directory Jail en Recordatorios (Prevención LFI)
El servicio de programación de recordatorios acepta rutas locales para enviar archivos.
- **Mitigación implementada**: Validación obligatoria de rutas absolutas mediante un **Directory Jail**. Si una ruta local no se encuentra dentro de `data/uploads`, el motor de envío anula el archivo.
- **Impacto**: Previene ataques de *Local File Inclusion (LFI)*. Un atacante no puede crear un recordatorio para enviar por WhatsApp el archivo `/etc/passwd` o bases de datos confidenciales.

## 3. Resiliencia de SQLite (Prevención Corrupción)
En entornos como Termux o contenedores inestables, cierres abruptos corrompen las sesiones de Baileys.
- **Mitigación implementada**: Habilitación nativa de `journal_mode = WAL` y `synchronous = NORMAL` en la conexión a `whatsapp_auth.db`.
- **Impacto**: Garantiza la integridad transaccional (ACID). Previene los infames errores "401 Unauthorized" (Desconexión permanente) que se producen si la base de datos de credenciales se corrompe por un corte eléctrico o de red.

## 4. Memory Leak Control en Schedulers
Campañas de difusión masivas que se cancelan dejaban referencias "huérfanas" en Node.js.
- **Mitigación implementada**: El `task-runner.ts` utiliza colecciones de objetos `Map` para rastrear, interrumpir explícitamente y barrer los hilos encolados de los temporizadores `setTimeout` programados dinámicamente.
- **Impacto**: Mantiene el consumo de RAM plano, evitando que Node.js reviente (OOM Kill) tras días de uso prolongado.
