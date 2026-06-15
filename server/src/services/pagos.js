const pool = require('../db');
const { obtenerPago } = require('../mp');

/**
 * Verifica un pago contra Mercado Pago y, si está aprobado,
 * marca el pedido como pagado y descuenta stock (una sola vez).
 * Se usa tanto desde el webhook como cuando el usuario vuelve del checkout.
 */
async function procesarPago(paymentId) {
  const pago = await obtenerPago(paymentId);
  const codigo = pago.external_reference;
  if (!codigo) return { ok: false, motivo: 'Pago sin referencia de pedido' };

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [orders] = await conn.query(
      'SELECT * FROM orders WHERE codigo = ? FOR UPDATE', [codigo]
    );
    if (!orders.length) {
      await conn.rollback();
      return { ok: false, motivo: 'Pedido no encontrado' };
    }
    const order = orders[0];

    if (pago.status !== 'approved') {
      await conn.rollback();
      return { ok: false, estadoPago: pago.status, codigo };
    }

    // Idempotente: si ya estaba pagado no se vuelve a descontar stock
    if (order.estado !== 'pendiente_pago') {
      await conn.commit();
      return { ok: true, yaProcesado: true, codigo };
    }

    await conn.query(
      "UPDATE orders SET estado = 'pagado', mp_payment_id = ? WHERE id = ?",
      [String(pago.id), order.id]
    );

    const [items] = await conn.query(
      'SELECT product_id, cantidad FROM order_items WHERE order_id = ?', [order.id]
    );
    for (const it of items) {
      if (it.product_id) {
        await conn.query(
          'UPDATE products SET stock = GREATEST(stock - ?, 0) WHERE id = ?',
          [it.cantidad, it.product_id]
        );
      }
    }

    await conn.commit();
    return { ok: true, codigo };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

module.exports = { procesarPago };
