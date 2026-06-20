const router = require('express').Router();
const crypto = require('crypto');
const db = require('../db');
const { optionalAuth, requireAuth } = require('../middleware/auth');
const { crearPreferencia } = require('../mp');
const { comprobanteHTML } = require('../services/comprobante');

function nuevoCodigo() {
  return 'TAVO-' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

// POST /api/orders  → crea pedido + preferencia de Mercado Pago
router.post('/', optionalAuth, async (req, res, next) => {
  let conn;
  try {
    conn = await db.getConnection();
    const { items, cliente } = req.body;
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: 'El carrito está vacío' });
    }
    const c = cliente || {};
    for (const campo of ['nombre', 'email', 'direccion', 'ciudad', 'provincia']) {
      if (!c[campo]) return res.status(400).json({ error: `Falta el campo: ${campo}` });
    }

    await conn.beginTransaction();

    // Validar productos y stock; el precio SIEMPRE sale de la base, nunca del cliente
    const detalle = [];
    for (const it of items) {
      const cantidad = Number(it.cantidad);
      if (!cantidad || cantidad <= 0) {
        await conn.rollback();
        return res.status(400).json({ error: 'Cantidad inválida' });
      }
      const [rows] = await conn.query(
        'SELECT id, nombre, precio, stock FROM products WHERE id = ? AND activo = 1 FOR UPDATE',
        [it.product_id]
      );
      if (!rows.length) {
        await conn.rollback();
        return res.status(400).json({ error: `Producto ${it.product_id} no disponible` });
      }
      const p = rows[0];
      if (Number(p.stock) < cantidad) {
        await conn.rollback();
        return res.status(409).json({ error: `Stock insuficiente para "${p.nombre}"` });
      }
      detalle.push({
        product_id: p.id,
        nombre: p.nombre,
        precio_unit: Number(p.precio),
        cantidad,
        subtotal: +(Number(p.precio) * cantidad).toFixed(2)
      });
    }
    const total = +detalle.reduce((s, d) => s + d.subtotal, 0).toFixed(2);

    const codigo = nuevoCodigo();
    const [ins] = await conn.query(
      `INSERT INTO orders (codigo, user_id, nombre, email, telefono, direccion, ciudad, provincia, codigo_postal, notas, total)
       VALUES (?,?,?,?,?,?,?,?,?,?,?) RETURNING id`,
      [codigo, req.user?.id || null, c.nombre, c.email, c.telefono || null,
       c.direccion, c.ciudad, c.provincia, c.codigo_postal || null, c.notas || null, total]
    );
    const orderId = ins[0].id;

    for (const d of detalle) {
      await conn.query(
        'INSERT INTO order_items (order_id, product_id, nombre, precio_unit, cantidad, subtotal) VALUES (?,?,?,?,?,?)',
        [orderId, d.product_id, d.nombre, d.precio_unit, d.cantidad, d.subtotal]
      );
    }

    // Preferencia de Mercado Pago (Checkout Pro)
    const pref = await crearPreferencia({ codigo, nombre: c.nombre, email: c.email }, detalle);
    await conn.query('UPDATE orders SET mp_preference_id = ? WHERE id = ?', [pref.id, orderId]);

    await conn.commit();
    res.status(201).json({ codigo, total, init_point: pref.init_point });
  } catch (e) {
    if (conn) await conn.rollback().catch(() => {});
    next(e);
  } finally {
    if (conn) conn.release();
  }
});

// GET /api/orders/mios  → pedidos del usuario logueado
router.get('/mios', requireAuth, async (req, res, next) => {
  try {
    const [orders] = await db.query(
      'SELECT id, codigo, total, estado, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(orders);
  } catch (e) { next(e); }
});

// GET /api/orders/seguimiento?codigo=TAVO-XXXX&email=...
router.get('/seguimiento', async (req, res, next) => {
  try {
    const { codigo, email } = req.query;
    if (!codigo || !email) return res.status(400).json({ error: 'Indicá código de pedido y email' });
    const [orders] = await db.query(
      'SELECT * FROM orders WHERE codigo = ? AND email = ?', [codigo.trim(), email.trim()]
    );
    if (!orders.length) return res.status(404).json({ error: 'No se encontró un pedido con esos datos' });
    const order = orders[0];
    const [items] = await db.query(
      'SELECT nombre, precio_unit, cantidad, subtotal FROM order_items WHERE order_id = ?', [order.id]
    );
    res.json({
      codigo: order.codigo, estado: order.estado, total: order.total,
      nombre: order.nombre, direccion: order.direccion, ciudad: order.ciudad,
      provincia: order.provincia, created_at: order.created_at,
      updated_at: order.updated_at, items
    });
  } catch (e) { next(e); }
});

// GET /api/orders/:codigo/comprobante?email=...
router.get('/:codigo/comprobante', async (req, res, next) => {
  try {
    const { email } = req.query;
    const [orders] = await db.query(
      'SELECT * FROM orders WHERE codigo = ? AND email = ?', [req.params.codigo, email || '']
    );
    if (!orders.length) return res.status(404).send('Comprobante no encontrado. Verificá código y email.');
    const order = orders[0];
    if (order.estado === 'pendiente_pago' || order.estado === 'cancelado') {
      return res.status(400).send('El pedido aún no tiene un pago aprobado.');
    }
    const [items] = await db.query(
      'SELECT nombre, precio_unit, cantidad, subtotal FROM order_items WHERE order_id = ?', [order.id]
    );
    res.send(comprobanteHTML(order, items));
  } catch (e) { next(e); }
});

module.exports = router;
