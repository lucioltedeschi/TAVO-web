# TAVO — E-commerce Distribuidora de Frigorífico

Tienda online con catálogo, carrito, pagos por **Mercado Pago (Checkout Pro)**, seguimiento de pedidos y panel de administración con gestión de stock y pedidos.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite + React Router |
| Backend | Node.js + Express |
| Base de datos | MySQL 8 |
| Pagos | Mercado Pago Checkout Pro (SDK oficial v2) |
| Auth | JWT + bcrypt (roles `user` / `admin`) |

## Estructura

```
TAVO-WEB/
├── database/schema.sql      ← script que crea la DB + datos de ejemplo
├── server/                  ← API Express (puerto 4000)
│   ├── .env                 ← TU configuración (no se versiona)
│   └── src/
│       ├── index.js         ← entrada; también sirve el frontend compilado
│       ├── db.js            ← pool MySQL
│       ├── mp.js            ← integración Mercado Pago
│       ├── middleware/auth.js
│       ├── routes/          ← auth, products, orders, payments, admin
│       └── services/        ← pagos (confirmación), comprobante HTML
├── client/                  ← React (dev en puerto 5173)
│   ├── public/logo.svg      ← REEMPLAZAR por el logo real
│   └── src/pages/           ← Home, Catálogo, Carrito, Checkout, Admin, etc.
├── setup.bat                ← instala todo
├── start-dev.bat            ← desarrollo (2 ventanas)
├── start-produccion.bat     ← producción casera (1 solo puerto)
└── LEGALES.md               ← facturación y obligaciones legales
```

---

## Instalación desde cero (válido para CUALQUIER PC)

Estos pasos sirven igual para tu PC actual y para la PC "servidor". La app no guarda nada fuera de esta carpeta + MySQL.

### 1. Requisitos
- **Node.js LTS** → https://nodejs.org (al instalar, dejar tildado "Add to PATH")
- **MySQL Community Server 8** → https://dev.mysql.com/downloads/installer/
  - Durante la instalación definís la password de `root`. **Anotala.**

### 2. Instalar
Doble click en **`setup.bat`**. El script:
1. Verifica Node y MySQL.
2. Ofrece importar `database/schema.sql` (crea la DB `tavo_ecommerce`, el admin y productos de ejemplo).
3. Crea `server/.env` desde la plantilla.
4. Hace `npm install` en server y client.

> Si la importación automática falla, abrí `database/schema.sql` en MySQL Workbench y ejecutalo (⚡).

### 3. Configurar `server/.env`
Abrir con Bloc de notas y completar:
- `DB_PASSWORD` → password de root de MySQL.
- `MP_ACCESS_TOKEN` → ver sección Mercado Pago abajo.
- `JWT_SECRET` → cualquier texto largo y aleatorio.

### 4. Levantar
- **Desarrollo:** `start-dev.bat` → abre http://localhost:5173
- **Producción casera:** `start-produccion.bat` → compila el frontend y deja TODO en http://localhost:4000 (un solo proceso).

### Usuario admin inicial
- Email: `admin@tavo.com`
- Password: `admin123` → **cambiarla**: por ahora se cambia actualizando el hash en la DB o creando otro admin (registrás un usuario y en MySQL: `UPDATE users SET rol='admin' WHERE email='...';`).

---

## Configurar Mercado Pago

1. Entrar con la cuenta de Mercado Pago **que va a recibir el dinero** (la de tu viejo) a https://www.mercadopago.com.ar/developers/panel/app
2. **Crear aplicación** → tipo "Pagos online" → "CheckoutPro".
3. En **Credenciales de producción** copiar el **Access Token** (`APP_USR-...`) y pegarlo en `server/.env` → `MP_ACCESS_TOKEN`.
4. Para **probar sin plata real**: usar las **Credenciales de prueba** (`TEST-...`) y las tarjetas de prueba que da MP en la misma página.

### Cómo se confirma un pago (importante en localhost)
- **Webhook**: MP avisa a `PUBLIC_URL/api/payments/webhook`. Solo funciona con URL pública (no localhost).
- **Fallback automático**: cuando el comprador vuelve a `/pago/exito`, el frontend manda el `payment_id` al backend, que lo **verifica contra la API de MP** y recién ahí marca el pedido como pagado y descuenta stock. Por eso funciona aunque estés en localhost.
- Cuando tengas IP pública o dominio: poné esa URL en `PUBLIC_URL` del `.env` y el webhook queda activo solo (más robusto, confirma aunque el usuario cierre el navegador).

---

## Migrar a la PC "servidor"

1. **Copiar la carpeta** `TAVO-WEB` completa (podés borrar antes `server/node_modules` y `client/node_modules`, se regeneran).
2. **Exportar los datos** de la PC vieja (si ya hubo ventas):
   ```cmd
   mysqldump -u root -p tavo_ecommerce > backup_tavo.sql
   ```
3. En la PC nueva: instalar Node + MySQL → correr `setup.bat` → si tenés backup, importarlo **en lugar** del schema:
   ```cmd
   mysql -u root -p < backup_tavo.sql
   ```
4. Completar `server/.env` (la password de MySQL puede ser distinta en esta PC).
5. `start-produccion.bat`.
6. **Acceso desde otras PCs / internet:**
   - Red local: entrar a `http://IP-DEL-SERVIDOR:4000` (ver IP con `ipconfig`). Abrir el puerto en el Firewall de Windows si no responde.
   - Internet: redirigir el puerto en el router (port forwarding) hacia la PC servidor, y actualizar en `.env`: `PUBLIC_URL` y `FRONTEND_URL` con la IP/dominio público. Recomendado: DDNS gratis (No-IP/DuckDNS) si tu IP es dinámica, y HTTPS (Cloudflare Tunnel es la opción más simple y gratis para hostear desde casa).

---

## Carga de productos reales

Los productos del `schema.sql` son **de ejemplo**. Para cargar la lista real:
- Desde el **panel admin** (pestaña "Productos y stock") — recomendado, o
- Editando los `INSERT` de `database/schema.sql` antes de importar.

Imágenes de productos: subir los archivos a `client/public/img/` y en el campo "Imagen" del producto poner `/img/nombre-archivo.jpg`. El logo real va en `client/public/` reemplazando `logo.svg`.

## API (resumen)

| Método | Ruta | Quién | Qué hace |
|---|---|---|---|
| POST | /api/auth/register · /login | público | registro / login (JWT) |
| GET/PUT | /api/auth/me | logueado | ver / editar perfil |
| GET | /api/products | público | catálogo (sin stock, solo "disponible") |
| POST | /api/orders | público | crea pedido + preferencia MP, devuelve link de pago |
| GET | /api/orders/seguimiento?codigo&email | público | estado del pedido |
| GET | /api/orders/:codigo/comprobante?email | público | comprobante HTML imprimible |
| POST | /api/payments/webhook | Mercado Pago | notificación de pago |
| POST | /api/payments/confirmar | público | verifica un pago contra MP (fallback) |
| CRUD | /api/admin/products | admin | productos con stock |
| GET/PUT | /api/admin/orders | admin | pedidos + cambio de estado |
| GET | /api/admin/stats | admin | ventas, stock bajo, top productos |

## Seguridad implementada
- Contraseñas con bcrypt; sesiones JWT (7 días); rutas admin protegidas por rol.
- Los **precios siempre se toman de la base** en el servidor (el cliente no puede manipularlos).
- El **stock nunca se expone** en la API pública.
- Stock descontado de forma transaccional e **idempotente** (un pago no descuenta dos veces).
- Validación de stock al crear el pedido y al confirmarse el pago.

## Pendientes sugeridos (cuando haya hosting)
- HTTPS (Cloudflare Tunnel / certificado).
- Emails automáticos de confirmación (ej: Nodemailer + Gmail).
- Facturación electrónica ARCA automática (ver `LEGALES.md`).
- Cambio de contraseña desde la web.
