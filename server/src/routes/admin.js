const router = require('express').Router();
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

router.use(requireAdmin);

const ESTADOS = ['pendiente_pago', 'pagado', 'en_preparacion', 'en_camino', 'entregado', 'cancelado'];

// ---------- PRODUCTOS (con stock visible) ----------

// GET /api/admin/products
router.get('/products', async (_req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM products ORDER BY categoria, nombre');
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /api/admin/products
router.post('/products', async (req, res, next) => {
  try {
    const { nombre, descripcion, categoria, precio, unidad, stock, imagen } = req.body;
    if (!nombre || precio == null) return res.status(400).json({ error: 'Nombre y precio son obligatorios' });
    const [ins] = await db.query(
      'INSERT INTO products (nombre, descripcion, categoria, precio, unidad, stock, imagen) VALUES (?,?,?,?,?,?,?) RETURNING id',
      [nombre, descripcion || null, categoria || 'General', precio, unidad || 'caja', stock || 0, imagen || null]
    );
    const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [ins[0].id]);
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

// PUT /api/admin/products/:id
router.put('/products/:id', async (req, res, next) => {
  try {
    const { nombre, descripcion, categoria, precio, unidad, stock, imagen, activo } = req.body;
    const [, rowCount] = await db.query(
      `UPDATE products SET
         nombre = COALESCE(?, nombre), descripcion = COALESCE(?, descripcion),
         categoria = COALESCE(?, categoria), precio = COALESCE(?, precio),
         unidad = COALESCE(?, unidad), stock = COALESCE(?, stock),
         imagen = COALESCE(?, imagen), activo = COALESCE(?, activo)
       WHERE id = ?`,
      [nombre, descripcion, categoria, precio, unidad, stock, imagen, activo, req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Producto no encontrado' });
    const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (e) { next(e); }
});

// DELETE /api/admin/products/:id  (baja lógica)
router.delete('/products/:id', async (req, res, next) => {
  try {
    await db.query('UPDATE products SET activo = 0 WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------- PEDIDOS ----------

// GET /api/admin/orders?estado=pagado
router.get('/orders', async (req, res, next) => {
  try {
    const { estado } = req.query;
    let sql = 'SELECT * FROM orders';
    const params = [];
    if (estado && ESTADOS.includes(estado)) { sql += ' WHERE estado = ?'; params.push(estado); }
    sql += ' ORDER BY created_at DESC LIMIT 500';
    const [orders] = await db.query(sql, params);

    // items de cada pedido
    const ids = orders.map(o => o.id);
    let itemsByOrder = {};
    if (ids.length) {
      // Usamos = ANY(?) para pasar el array directamente a PostgreSQL
      const [items] = await db.query(
        'SELECT order_id, nombre, precio_unit, cantidad, subtotal FROM order_items WHERE order_id = ANY(?)',
        [ids]
      );
      for (const it of items) (itemsByOrder[it.order_id] ||= []).push(it);
    }
    res.json(orders.map(o => ({ ...o, items: itemsByOrder[o.id] || [] })));
  } catch (e) { next(e); }
});

// PUT /api/admin/orders/:id/estado  { estado }
router.put('/orders/:id/estado', async (req, res, next) => {
  let conn;
  try {
    const { estado } = req.body;
    if (!ESTADOS.includes(estado)) return res.status(400).json({ error: 'Estado inválido' });

    conn = await db.getConnection();
    await conn.beginTransaction();

    const [orders] = await conn.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!orders.length) {
      await conn.rollback();
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    const order = orders[0];

    // Si se cancela un pedido que ya estaba pagado, devolver el stock
    const estabaDescontado = !['pendiente_pago', 'cancelado'].includes(order.estado);
    if (estado === 'cancelado' && estabaDescontado) {
      const [items] = await conn.query(
        'SELECT product_id, cantidad FROM order_items WHERE order_id = ?', [order.id]
      );
      for (const it of items) {
        if (it.product_id) {
          await conn.query('UPDATE products SET stock = stock + ? WHERE id = ?', [it.cantidad, it.product_id]);
        }
      }
    }

    await conn.query('UPDATE orders SET estado = ? WHERE id = ?', [estado, order.id]);
    await conn.commit();
    res.json({ ok: true, estado });
  } catch (e) {
    if (conn) await conn.rollback().catch(() => {});
    next(e);
  } finally {
    if (conn) conn.release();
  }
});

// ---------- ESTADÍSTICAS ----------

// GET /api/admin/stats
router.get('/stats', async (_req, res, next) => {
  try {
    const [[ventas]] = await db.query(
      `SELECT COUNT(*) AS pedidos, COALESCE(SUM(total),0) AS total
       FROM orders WHERE estado NOT IN ('pendiente_pago','cancelado')`
    );
    const [porEstado] = await db.query(
      'SELECT estado, COUNT(*) AS cantidad FROM orders GROUP BY estado'
    );
    const [stockBajo] = await db.query(
      'SELECT id, nombre, stock, unidad FROM products WHERE activo = 1 AND stock <= 10 ORDER BY stock ASC'
    );
    const [topProductos] = await db.query(
      `SELECT oi.nombre, SUM(oi.cantidad) AS vendido, SUM(oi.subtotal) AS facturado
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.estado NOT IN ('pendiente_pago','cancelado')
       GROUP BY oi.nombre ORDER BY vendido DESC LIMIT 10`
    );
    res.json({ ventas, porEstado, stockBajo, topProductos });
  } catch (e) { next(e); }
});

module.exports = router;
