# Política de Seguridad - BotMaRe

## Versiones Soportadas

| Versión | Soportada          |
| ------- | ------------------ |
| 2.7.x   | :white_check_mark: |
| < 2.7.0 | :x:                |

---

## 🔒 Lista de Verificación para Despliegue Seguro (Production Checklist)

Antes de exponer o poner en producción una instancia de BotMaRe, verifica el cumplimiento de las siguientes directrices:

### 1. Generación Criptográfica de Secretos
Nunca uses valores por defecto del archivo `.env.example`. Ejecuta siempre:
```bash
pnpm run setup:secrets
```
Este script genera claves aleatorias de alta entropía (32 bytes / 256 bits) para:
- `DASHBOARD_PASS`: Clave de acceso al panel de administración.
- `SUPERADMIN_KEY`: Llave maestra para licenciamiento y configuraciones sensibles (Ctrl+Shift+S).
- `WEBHOOK_API_KEY`: Clave de autenticación para endpoints entrantes de Make, Zapier o HTTP.
- `BACKUP_ENCRYPTION_KEY`: Clave AES para cifrar respaldos locales y enviados por Telegram.
- `GITHUB_WEBHOOK_SECRET`: Token HMAC para validar eventos de auto-actualización.

### 2. Restricción de Red e Interfaces Públicas
- **No abras el puerto 8000 a `0.0.0.0/0`**: El panel de administración debe ser accesible únicamente a través de `127.0.0.1`, una VPN privada (Tailscale / WireGuard) o un túnel seguro con autenticación adicional (Cloudflare Zero Trust Access).
- **Acceso Administrativo Remoto Seguro**: Para gestionar el servidor remotamente sin abrir puertos HTTP al mundo, establece un túnel SSH cifrado:
  ```bash
  ssh -L 8000:localhost:8000 usuario@ip-del-servidor
  ```
- **IPs de administración**: Configura `allowed_admin_ips` en Terraform o reglas de firewall `ufw` restringidas únicamente a tus IPs fijas.

### 3. Modelo de Confianza de Plugins (Plugin Trust Model)
- Los archivos en `data/plugins/*.js` se cargan y ejecutan dinámicamente con privilegios del proceso de Node.js.
- **Regla estricta:** Trata cualquier plugin como código de confianza total. **Nunca descargues ni ejecutes plugins de fuentes no verificadas** ni permitas que usuarios no autenticados suban código al directorio de plugins.
- El sandboxing actual utiliza aislamiento de contexto, pero no constituye una barrera de aislamiento de memoria a nivel de sistema operativo.

### 4. Procedimiento de Rotación de Claves
Si sospechas que un secreto ha sido expuesto:
1. Conéctate al servidor vía SSH.
2. Ejecuta `node scripts/setup-secrets.js` o edita manualmente `.env` reemplazando los valores comprometidos.
3. Actualiza las llaves correspondientes en tus clientes de webhook (ej. Make, Zapier o GitHub Webhooks).
4. Reinicia el proceso del bot:
   ```bash
   pnpm run pm2:restart
   ```
5. Si `BACKUP_ENCRYPTION_KEY` fue cambiada, genera un nuevo respaldo inmediato con `/backup` o mediante la interfaz web para garantizar que las copias recientes utilicen la nueva clave.

---

## 🚨 Reporte de Vulnerabilidades

Si descubres una vulnerabilidad de seguridad en BotMaRe, **no abras un issue público**. 

Por favor, envía un correo detallando la vulnerabilidad, los pasos para reproducirla y el impacto a:
- **Email:** `seguridad@botmare.local` o contacta al mantenedor directamente en GitHub vía canal privado.
- Responderemos en un plazo máximo de 48 horas con un plan de mitigación y parche de seguridad.
