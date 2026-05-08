const path = require('path');
const fs = require('fs');

// Detectar automáticamente el nombre de la carpeta actual para usarlo como nombre de la app en PM2
const folderName = path.basename(__dirname);

// Intentar leer el puerto desde el archivo .env automáticamente
let envPort = 8000;
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const portMatch = envContent.match(/^PORT\s*=\s*(\d+)/m);
  if (portMatch) {
    envPort = parseInt(portMatch[1], 10);
  }
}

module.exports = {
  apps: [
    {
      name: folderName, // Nombre dinámico basado en la carpeta
      script: "npx",
      args: "tsx src/server.ts",
      interpreter: "none",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: envPort
      },
      error_file: path.join(__dirname, "data/logs/err.log"),
      out_file: path.join(__dirname, "data/logs/out.log"),
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true
    }
  ]
};
