import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MP_TOKEN     = Deno.env.get('MP_ACCESS_TOKEN')!;

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type') || (await req.json().catch(() => ({}))).type;
    const paymentId = url.searchParams.get('data.id') || (await req.json().catch(() => ({}))).data?.id;

    if (type === 'payment' && paymentId) {
      const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${MP_TOKEN}` },
      });
      const pago = await mpRes.json();
      if (!mpRes.ok || pago.status !== 'approved') {
        return new Response('ok', { status: 200 });
      }

      const codigo = pago.external_reference;
      if (!codigo) return new Response('ok', { status: 200 });

      const { data: orden } = await supabase
        .from('orders').select('*').eq('codigo', codigo).single();
      if (!orden || orden.estado !== 'pendiente_pago') {
        return new Response('ok', { status: 200 });
      }

      await supabase.from('orders').update({
        estado: 'pagado', mp_payment_id: String(pago.id),
      }).eq('id', orden.id);

      const { data: items } = await supabase
        .from('order_items').select('product_id, cantidad').eq('order_id', orden.id);
      for (const it of items ?? []) {
        if (!it.product_id) continue;
        const { data: prod } = await supabase
          .from('products').select('stock').eq('id', it.product_id).single();
        if (prod) {
          await supabase.from('products')
            .update({ stock: Math.max(Number(prod.stock) - Number(it.cantidad), 0) })
            .eq('id', it.product_id);
        }
      }
    }
  } catch (e) {
    console.error('Webhook error:', e);
  }
  // Siempre 200 para que MP no reintente
  return new Response('ok', { status: 200 });
});
