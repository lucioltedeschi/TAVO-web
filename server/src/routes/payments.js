const router = require('express').Router();
const { procesarPago } = require('../services/pagos');

// POST /api/payments/webhook
// Mercado Pago avisa acá cuando hay un pago (solo funciona con URL pública).
router.post('/webhook', async (req, res) => {
  try {
    const type = req.query.type || req.body?.type;
    const paymentId = req.query['data.id'] || req.body?.data?.id;
    if (type === 'payment' && paymentId) {
      await procesarPago(paymentId);
    }
    res.sendStatus(200); // siempre 200 para que MP no reintente infinitamente
  } catch (e) {
    console.error('Error en webhook MP:', e.message);
    res.sendStatus(200);
  }
});

// POST /api/payments/confirmar  { payment_id }
// Fallback: cuando el usuario vuelve del checkout a /pago/exito,
// el frontend manda el payment_id de la URL y acá se verifica contra MP.
// Imprescindible mientras el servidor corra en localhost (sin webhooks).
router.post('/confirmar', async (req, res, next) => {
  try {
    const { payment_id } = req.body;
    if (!payment_id) return res.status(400).json({ error: 'Falta payment_id' });
    const resultado = await procesarPago(payment_id);
    res.json(resultado);
  } catch (e) { next(e); }
});

module.exports = router;
