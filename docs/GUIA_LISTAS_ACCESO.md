# 🛡️ Guía de Control de Acceso (Listas Blancas y Negras)

El sistema de control de acceso de **BotMaRe** te permite dictar de manera estricta y segura a quién le responde el bot, y en qué grupos puede participar. Todo esto se administra sin necesidad de tocar código, directamente desde tu chat de WhatsApp o desde Telegram.

## ⚙️ Configuración Inicial
Para poder utilizar estos comandos, el sistema debe saber que tú eres el administrador autorizado.
Abre el archivo `.env` en la raíz de tu proyecto y asegúrate de configurar lo siguiente:
- `WHATSAPP_OWNER_NUMBER="5215512345678"` (Coloca tu número con código de país, sin el +, sin espacios y sin `@s.whatsapp.net`).
- `TELEGRAM_ALLOWED_USER_IDS="12345678"` (Coloca tu ID numérico de Telegram).

---

## 📝 Modos Disponibles
Puedes tener reglas separadas para **Contactos** (mensajes directos) y para **Grupos**.
Los modos de operación posibles son:
- **all**: (Por defecto). El bot le responde a todos los que le escriban, sin filtros.
- **whitelist**: El bot **solo** responderá a las personas o grupos que estén explícitamente en la Lista Blanca. Ignorará a todos los demás.
- **blacklist**: El bot le responderá a todos, **excepto** a los que estén explícitamente en la Lista Negra.
- **none**: El bot ignora todos los mensajes para esa categoría.

---

## 💬 Comandos por WhatsApp
Solo el número definido en `WHATSAPP_OWNER_NUMBER` puede enviar estos comandos. Al enviarlos, el bot no se los pasará a la Inteligencia Artificial, sino que ejecutará la acción administrativa.

### Para Contactos (Chats Privados)
La forma más fácil de administrar tus listas es mediante el menú interactivo:

Simplemente envía: `!lista`

El bot te responderá con un menú enumerado como este:
```
🛡️ Menú de Listas de Acceso (Contactos) 🛡️
1️⃣ Activar Lista Blanca (Estricto)
2️⃣ Activar Lista Negra (Bloqueos)
3️⃣ Desactivar filtros (Modo abierto)
...
```
Solo tienes que responder con el **número** de la opción que desees (ej: envías `1`). Si eliges agregar o bloquear a alguien, el bot te preguntará el número de esa persona en el siguiente mensaje.

**(Avanzado) Atajos Rápidos**
Si no quieres usar el menú, puedes enviar el comando completo en una sola línea:
- `!lista mode whitelist` (Activa el modo estricto).
- `!lista mode all` (Desactiva las restricciones).
- `!lista add 5215512345678` (Agrega a lista blanca).
- `!lista ban 5215512345678` (Agrega a lista negra).
- `!lista remove 5215512345678` (Quita de cualquier lista).

### Para Grupos
Si escribes el comando `!lista` **dentro de un grupo**, las acciones afectarán a las listas de **Grupos**, no de Contactos.
- `!lista mode whitelist` (Enviado en un grupo, hace que el bot solo hable en grupos autorizados).
- `!lista add 12345-6789@g.us` (Autoriza a un grupo específico).
- `!lista ban 12345-6789@g.us` (Bloquea a un grupo específico).

---

## 📱 Comandos por Telegram
A través de Telegram, el comando es ligeramente distinto para poder diferenciar si estás hablando de grupos o contactos, ya que no existe el "contexto" de chat como en WhatsApp.

Formato general: `/lista [contactos|grupos] [add|ban|remove|mode] [valor]`

### Ejemplos en Telegram:
- `/lista contactos mode whitelist` (Cambia el modo de contactos a Lista Blanca).
- `/lista contactos add 5215512345678` (Autoriza un número).
- `/lista grupos ban 12345-6789@g.us` (Bloquea un grupo).
- `/lista contactos mode all` (Restaura el acceso general a contactos).

---

## 🛠️ ¿Dónde se guardan estos datos?
Toda la configuración y los números que vayas agregando se guardan en tiempo real en un archivo seguro en:
`data/accessList.json`

¡Disfruta del control total sobre tu asistente inteligente! 🚀
