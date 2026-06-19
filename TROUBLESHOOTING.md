# Diagnóstico de Error Next.js + PNPM + Windows

## Error Detectado

```text
errno: -4048
code: 'EPERM'
syscall: 'spawn'
```

```text
Next.js build worker exited with code: 3221225477
ELIFECYCLE Command failed with exit code 3221225477
```

---

# ¿Qué significa?

## EPERM

`EPERM` significa: `Operation not permitted`.
Node.js intentó ejecutar un proceso hijo (`spawn`) y Windows lo bloqueó.

---

## Código 3221225477

```text
3221225477 = 0xC0000005
```

Corresponde a `Access Violation`.
Un proceso intentó acceder a memoria de forma incorrecta y Windows lo terminó abruptamente.

---

# Posibles Causas y Soluciones

## 1. Node.js 24 (Incompatibilidad)

Si tu versión detectada es v24.x (ej. `node -v` devuelve `v24.15.0`), algunas dependencias de Next.js y binarios nativos aún presentan problemas serios con Node 24 en Windows.

### Recomendación
Instalar:
- **Node.js 22 LTS (Altamente Preferido)**
- Node.js 20 LTS (Alternativa estable)

---

## 2. Dependencias Nativas Bloqueadas por PNPM

Durante la instalación con versiones nuevas de pnpm (v10+), puede aparecer:

```text
Ignored build scripts:
better-sqlite3
cloudflared
esbuild
protobufjs
sharp
```

Estas dependencias necesitan ejecutar scripts de compilación para conectarse con tu sistema operativo. Si PNPM las bloquea por seguridad, aparecerán errores como `spawn EPERM`.

### Solución
Ejecuta el siguiente comando para aprobar los scripts en tu sistema:
```bash
pnpm approve-builds
```
*(Es importante aprobar especialmente: sharp, esbuild y better-sqlite3).*

Después, reinstala:
```bash
pnpm install
```

---

## 3. Antivirus o Windows Defender

Windows puede detectar como falsos positivos y bloquear ejecutables generados localmente por:
- `esbuild.exe`
- `sharp.exe`
- `better-sqlite3`

### Verificación
- Revisa el panel de **Seguridad de Windows**.
- Revisa el **historial de protección**.
- Comprueba la **cuarentena** y añade la carpeta `BotMaRe` a exclusiones si es necesario.

---

## 4. Permisos Insuficientes de Consola

Es posible que la terminal no tenga los permisos adecuados para enlazar archivos en Windows (symlinks).

### Solución
1. Abre **PowerShell** haciendo clic derecho y seleccionando **"Ejecutar como administrador"**.
2. Navega a tu carpeta y vuelve a probar:
```bash
pnpm run build
```

---

# Reinstalación Limpia (Caso Extremo)

Si nada de lo anterior funciona, elimina las dependencias cacheadas y vuelve a probar:

```powershell
rmdir /s /q node_modules
del pnpm-lock.yaml
pnpm install
pnpm run build
```

---

# Obtener Más Información (Debug)

Para generar un log completo y descubrir qué archivo específico está causando el EPERM:

```powershell
pnpm run build > error.txt 2>&1
notepad error.txt
```
Busca las líneas inmediatamente anteriores a la palabra `EPERM`.

---

# Procedimiento Recomendado Final

**Paso 1:** Cambiar a Node.js 22 LTS.
**Paso 2:** Aprobar builds nativos: `pnpm approve-builds`.
**Paso 3:** Reinstalar dependencias: `pnpm install`.
**Paso 4:** Compilar nuevamente: `pnpm run build`.

---

### Prioridad de Hipótesis

| Probabilidad | Posible causa |
|-------------|--------------|
| **Alta** | Node.js 24 incompatible. |
| **Alta** | `esbuild`, `sharp` o `better-sqlite3` bloqueados por PNPM. |
| **Media** | Antivirus bloqueando ejecutables. |
| **Media** | Permisos insuficientes (Falta abrir como Admin). |
| **Baja** | Error interno del código Next.js. |
