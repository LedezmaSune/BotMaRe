const path = require('path');
const fs = require('fs');
const os = require('os');

// En Debian / Linux sin entorno gráfico, cargar el token de servicio de 1Password si existe en rutas seguras
if (!process.env.OP_SERVICE_ACCOUNT_TOKEN) {
  const tokenPaths = [
    '/etc/botmare/op.token',
    path.join(os.homedir(), '.config/botmare/op_service_account.token'),
    path.join(__dirname, '.op_token')
  ];

  for (const tPath of tokenPaths) {
    try {
      if (fs.existsSync(tPath)) {
        process.env.OP_SERVICE_ACCOUNT_TOKEN = fs.readFileSync(tPath, 'utf8').trim();
        break;
      }
    } catch {}
  }
}

// Determinar el archivo de variables (.env tradicional o plantilla .env.op)
const envFile = fs.existsSync(path.join(__dirname, '.env'))
  ? path.join(__dirname, '.env')
  : (fs.existsSync(path.join(__dirname, '.env.op')) ? path.join(__dirname, '.env.op') : undefined);

module.exports = {
  apps: [
    {
      name: "BotMaRe-Unified",
      script: process.platform === 'win32' ? "pnpm.cmd" : "pnpm",
      args: "run start",
      interpreter: "none", // Se usa 'none' para que PM2 ejecute pnpm directamente (sin bash ni node)
      exec_mode: "fork",   // Modo fork para máxima compatibilidad
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      ignore_watch: ["node_modules", "data", "backups", ".next", "auth_info_baileys"],
      max_memory_restart: "1G",
      
      // Manejo de reinicios y apagado seguro para el Bot y SQLite
      kill_timeout: 5000,
      exp_backoff_restart_delay: 100,
      
      // Native PM2 env file support
      ...(envFile ? { env_file: envFile } : {}),
      env: {
        NODE_ENV: "production",
        ...(process.env.OP_SERVICE_ACCOUNT_TOKEN ? { OP_SERVICE_ACCOUNT_TOKEN: process.env.OP_SERVICE_ACCOUNT_TOKEN } : {}),
        ...(process.env.BOTMARE_SECRET_PROVIDER ? { BOTMARE_SECRET_PROVIDER: process.env.BOTMARE_SECRET_PROVIDER } : {})
      },

      error_file: path.join(__dirname, "data/logs/err.log"),
      out_file: path.join(__dirname, "data/logs/out.log"),

      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true
    }
  ]
};
