module.exports = {
  apps: [
    {
      name: "botmare-unified",
      script: "npx",
      args: "tsx src/server.ts",
      interpreter: "none",
      instances: 1, // Mantenemos 1 instancia para evitar conflictos con la sesión de WhatsApp
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 8000
      },
      error_file: "data/logs/err.log",
      out_file: "data/logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true
    }
  ]
};
