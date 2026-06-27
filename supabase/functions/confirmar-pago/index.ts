import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, corsResponse, json, err } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MP_TOKEN     = Deno.env.get('MP_ACCESS_TOKEN')!;

async function procesarPago(paymentId: string) {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // Consultar pago en Mercado Pago
  const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { 'Authorization': `Bearer ${MP_TOKEN}` },
  });
  const pago = await mpRes.json();
  if (!mpRes.ok) throw new Error('Error consultando pago en MP');

  const codigo = pago.external_reference;
  if (!codigo) return { ok: false, motivo: 'Pago sin referencia de pedido' };
  if (pago.status !== 'approved') return { ok: false, estadoPago: pago.status, codigo };

  // Buscar la orden
  const { data: orden } = await supabase
    .from('orders').select('*').eq('codigo', codigo).single();
  if (!orden) return { ok: false, motivo: 'Pedido no encontrado' };

  // Idempotente: si ya estaba pagado no se vuelve a procesar
  if (orden.estado !== 'pendiente_pago') return { ok: true, yaProcesado: true, codigo };

  // Marcar como pagado
  await supabase.from('orders').update({
    estado: 'pagado',
    mp_payment_id: String(pago.id),
  }).eq('id', orden.id);

  // Descontar stock
  const { data: items } = await supabase
    .from('order_items').select('product_id, cantidad').eq('order_id', orden.id);

  for (const it of items ?? []) {
    if (!it.product_id) continue;
    const { data: prod } = await supabase
      .from('products').select('stock').eq('id', it.product_id).single();
    if (prod) {
      const nuevoStock = Math.max(Number(prod.stock) - Number(it.cantidad), 0);
      await supabase.from('products').update({ stock: nuevoStock }).eq('id', it.product_id);
    }
  }

  return { ok: true, codigo };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();
  try {
    const { payment_id } = await req.json();
    if (!payment_id) return err('Falta payment_id', 400);
    const resultado = await procesarPago(String(payment_id));
    return json(resultado);
  } catch (e) {
    console.error(e);
    return err(e instanceof Error ? e.message : 'Error interno');
  }
});
