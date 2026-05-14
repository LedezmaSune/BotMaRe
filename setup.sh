#!/bin/bash

echo "🦊 Iniciando instalacion automatica de BotMaRe Unificado..."
echo "------------------------------------------------------------"

# 1. Verificar Node.js
if ! command -v node &> /dev/null
then
    echo "❌ [ERROR] Node.js no esta instalado."
    echo "Por favor, instalalo desde https://nodejs.org/ antes de continuar."
    exit 1
fi

# 2. Instalar dependencias
echo "[1/3] Instalando dependencias del sistema..."
npm install -g pnpm
pnpm config set ignore-scripts false
pnpm install

# 3. Configurar archivo .env
echo "[2/3] Configurando archivo de entorno (.env)..."

if [ ! -f ".env" ]; then
    echo "Creando archivo .env desde el ejemplo..."
    cp .env.example .env
    echo "[!] IMPORTANTE: Se ha creado un archivo .env"
    echo "    Por favor, abrelo y pon tus API Keys."
else
    echo "El archivo .env ya existe, saltando..."
fi

# 4. Finalización
echo "[3/3] Finalizando..."
echo ""
echo "------------------------------------------------------------"
echo "✅ INSTALACION COMPLETADA CON EXITO"
echo ""
echo "📝 PROXIMOS PASOS:"
echo "1. Abre el archivo .env y pon tus API Keys."
echo "2. Ejecuta 'npm start' para iniciar el bot."
echo "------------------------------------------------------------"
