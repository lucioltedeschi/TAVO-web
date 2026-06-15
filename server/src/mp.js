// Cliente de Mercado Pago (SDK oficial v2)
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

function getClient() {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token || token.includes('XXXX')) {
    throw Object.assign(
      new Error('Mercado Pago no está configurado. Completá MP_ACCESS_TOKEN en server/.env'),
      { status: 503 }
    );
  }
  return new MercadoPagoConfig({ accessToken: token });
}

// Crea una preferencia de Checkout Pro para un pedido
async function crearPreferencia(order, items) {
  const client = getClient();
  const preference = new Preference(client);
  const FRONT = process.env.FRONTEND_URL || 'http://localhost:5173';
  const PUBLIC = process.env.PUBLIC_URL || '';

  const body = {
    items: items.map(i => ({
      id: String(i.product_id),
      title: i.nombre,
      quantity: Number(i.cantidad),
      unit_price: Number(i.precio_unit),
      currency_id: 'ARS'
    })),
    payer: { name: order.nombre, email: order.email },
    external_reference: order.codigo,
    back_urls: {
      success: `${FRONT}/pago/exito?codigo=${order.codigo}`,
      failure: `${FRONT}/pago/error?codigo=${order.codigo}`,
      pending: `${FRONT}/pago/pendiente?codigo=${order.codigo}`
    },
    statement_descriptor: 'TAVO DISTRIBUIDORA'
  };

  // auto_return y webhook solo funcionan con URL pública (no localhost)
  if (PUBLIC && !PUBLIC.includes('localhost')) {
    body.notification_url = `${PUBLIC}/api/payments/webhook`;
    body.auto_return = 'approved';
  }

  const result = await preference.create({ body });
  return result; // { id, init_point, sandbox_init_point, ... }
}

// Consulta un pago por ID en Mercado Pago
async function obtenerPago(paymentId) {
  const client = getClient();
  const payment = new Payment(client);
  return payment.get({ id: paymentId });
}

module.exports = { crearPreferencia, obtenerPago };
