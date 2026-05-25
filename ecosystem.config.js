const path = require('path');

module.exports = {
  apps: [
    {
      name: "BotMaRe-Unified",
      script: "pnpm",
      args: "run start",
      interpreter: "bash", // Uso de bash para evitar SyntaxError y problemas en Termux/Android
      exec_mode: "fork",   // Modo fork para máxima compatibilidad
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      
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