const path = require('path');

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
      env_file: path.join(__dirname, '.env'),
      env: {
        NODE_ENV: "production",
      },

      error_file: path.join(__dirname, "data/logs/err.log"),
      out_file: path.join(__dirname, "data/logs/out.log"),

      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true
    }
  ]
};