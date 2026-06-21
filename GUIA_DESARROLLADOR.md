# 👨‍💻 Guía para Desarrolladores y Administradores - BotMaRe

Esta guía contiene instrucciones avanzadas para modificar el código fuente, compilar el proyecto manualmente, gestionar bases de datos y configurar automatizaciones.

---

## 🚀 Compilación Manual (Sin Docker)

Si deseas modificar el código o no quieres usar Docker, puedes instalar y correr el proyecto de forma nativa.

### 💻 Opción A: Servidor Local en Windows
1. **Instala los requisitos:** Node.js (v20+ LTS), Git y pnpm (`npm install -g pnpm`).
2. **Obtén el código:** `git clone https://github.com/LedezmaSune/BotMaRe.git`
3. **Instalador Automático:** Haz doble clic en `install-windows.bat`. Este script instalará dependencias y compilará todo sin pedir permisos de administrador.
4. **Arrancar:** Haz doble clic en `START.bat` y selecciona la opción `1` (Producción) o usa `pnpm run dev` para programar.

### 🍎 Opción B: macOS o Linux
```bash
git clone https://github.com/LedezmaSune/BotMaRe.git
cd BotMaRe
cp .env.example .env
pnpm install
pnpm run build
chmod +x start.sh
./start.sh
```

### ☁️ Opción C: Servidor VPS en la Nube (Ubuntu/Debian)
Ejecuta el instalador maestro automático:
```bash
curl -fsSL https://raw.githubusercontent.com/LedezmaSune/BotMaRe/main/install.sh | bash
```

### 📱 Opción D: Dispositivos Móviles (Android con Termux)

¡Corre el bot completo directamente desde tu celular, sin computadoras ni VPS! El instalador está optimizado para compilar SQLite nativo y resolver el túnel de Cloudflare en entornos móviles de forma automática.

#### Requisitos Previos:
- Android 7.0 o superior.
- Instalar la terminal **Termux** desde [F-Droid](https://f-droid.org/packages/com.termux/) (la versión de Google Play está obsoleta y causará errores de paquetes).
- Asegúrate de tener al menos 3 GB de memoria interna libre.
- Desactiva la optimización de batería para la aplicación Termux en los ajustes de tu Android (evita que el sistema lo cierre en segundo plano).

> [!WARNING]
> **REGLA DE ORO DE TERMUX:** Jamás instales ni clones este repositorio dentro del almacenamiento compartido (`/sdcard` o `/storage/emulated/0/...`). Las políticas de seguridad de Android montan esta partición con `noexec`, lo que impedirá la compilación de SQLite y el arranque de Node.js. **Instala siempre en el almacenamiento interno protegido del usuario (`~/` o `$HOME`)**.

#### Instalación Automática (Script Móvil):
El script de Termux valida la ruta de almacenamiento, instala automáticamente Node.js LTS, herramientas de compilación C++, Cloudflared aarch64 y compila SQLite de forma resiliente. Abre Termux y ejecuta:
```bash
curl -fsSL https://raw.githubusercontent.com/LedezmaSune/BotMaRe/main/install-termux.sh | bash
```

#### Instalación Manual (Paso a Paso):
Si deseas compilar todo de forma imperativa y manual, sigue estos pasos:

1. **Prepara tu entorno seguro e instala dependencias (Node LTS es altamente recomendado):**
   ```bash
   cd $HOME
   pkg update && pkg upgrade -y
   pkg install nodejs-lts python make clang binutils sqlite git curl openssl tmate tmux nano -y
   ```
2. **Instala los gestores de paquetes globales:**
   ```bash
   npm install -g pnpm pm2
   ```
3. **Clona el repositorio en el HOME interno:**
   ```bash
   git clone https://github.com/LedezmaSune/BotMaRe.git
   cd BotMaRe
   cp .env.example .env
   ```
4. **Configura el entorno de compilación e instala las dependencias de forma segura:**
   ```bash
   export CC=clang
   export CXX=clang++
   export LINK=clang++
   export GYP_DEFINES="android_ndk_path=''"
   export npm_config_build_from_source=true
   export npm_config_sqlite="/data/data/com.termux/files/usr"
   
   # Crear configuración global de gyp para omitir el chequeo de NDK en Android/Termux
   mkdir -p ~/.gyp
   echo "{'variables':{'android_ndk_path':''}}" > ~/.gyp/include.gypi
   
   # Instalar dependencias omitiendo los scripts automáticos incompatibles
   pnpm install --ignore-scripts
   
   # Compilar únicamente better-sqlite3 de forma nativa para Android
   pnpm rebuild better-sqlite3
   ```
5. **Compila la interfaz del Dashboard:**
   ```bash
   pnpm run build
   ```
6. **Arranca el Bot:**
   ```bash
   pnpm start
   ```

---

## 🛠️ Gestión Avanzada con PM2

Para mantener el bot corriendo 24/7 en segundo plano en servidores de forma nativa:
* **Iniciar / Reiniciar:** `pnpm run pm2:start` o `pnpm run pm2:restart`
* **Ver Consola en Vivo:** `pnpm run pm2:logs`
* **Limpiar el proceso:** `pm2 delete BotMaRe-Unified`

---

## 🐳 Despliegue Automatizado (CI/CD con GitHub Actions)

El proyecto cuenta con un flujo de trabajo para construir automáticamente tu imagen Docker y publicarla en **GitHub Container Registry (ghcr.io)**.

1. Al hacer un `git push` a la rama `main`, los servidores de GitHub ejecutarán la acción definida en `.github/workflows/docker-publish.yml`.
2. La imagen compilada se etiquetará como `latest` y se guardará en tu cuenta de GitHub.
3. Tus clientes solo necesitan usar el archivo `docker-compose.cliente.yml` para descargarla automáticamente.

---

## 💾 Base de Datos: Migración de agenda.json a MongoDB

El proyecto incluye un Patrón Adaptador (`src/core/dbManager.ts`) que conmuta automáticamente entre archivos locales (`lowdb`) y la nube.

Para escalar el proyecto y dejar de usar `agenda.json`:
1. Crea un clúster gratuito en **MongoDB Atlas**.
2. Copia tu "Connection String".
3. Pégalo en tu archivo `.env` en la variable `MONGO_URI`.
4. Reinicia el bot (`docker compose restart` o `pm2 restart`).

**Migración Automática:** El script `migrator.ts` detectará tu base de datos antigua y traspasará todos tus contactos, plantillas y configuraciones a MongoDB automáticamente en el primer arranque.
