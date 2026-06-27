import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, corsResponse, json, err } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MP_TOKEN      = Deno.env.get('MP_ACCESS_TOKEN')!;
const FRONT_URL     = Deno.env.get('FRONTEND_URL') || 'https://tavo-web.vercel.app';
const PUBLIC_URL    = Deno.env.get('PUBLIC_URL')   || '';

function nuevoCodigo() {
  return 'TAVO-' + Array.from(crypto.getRandomValues(new Uint8Array(3)))
    .map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { items, cliente } = await req.json();

    // Validar campos del cliente
    for (const campo of ['nombre', 'email', 'direccion', 'ciudad', 'provincia']) {
      if (!cliente?.[campo]) return err(`Falta el campo: ${campo}`, 400);
    }
    if (!Array.isArray(items) || !items.length) return err('El carrito está vacío', 400);

    // Obtener user_id si viene autenticado
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const userSupabase = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!);
      const { data: { user } } = await userSupabase.auth.getUser(authHeader.replace('Bearer ', ''));
      userId = user?.id ?? null;
    }

    // Validar productos y calcular total (precios siempre del servidor)
    const detalle = [];
    for (const it of items) {
      const cantidad = Number(it.cantidad);
      if (!cantidad || cantidad <= 0) return err('Cantidad inválida', 400);

      const { data: producto } = await supabase
        .from('products')
        .select('id, nombre, precio, stock')
        .eq('id', it.product_id)
        .eq('activo', 1)
        .single();

      if (!producto) return err(`Producto ${it.product_id} no disponible`, 400);
      if (Number(producto.stock) < cantidad) {
        return err(`Stock insuficiente para "${producto.nombre}"`, 409);
      }
      detalle.push({
        product_id: producto.id,
        nombre: producto.nombre,
        precio_unit: Number(producto.precio),
        cantidad,
        subtotal: +(Number(producto.precio) * cantidad).toFixed(2),
      });
    }
    const total = +detalle.reduce((s, d) => s + d.subtotal, 0).toFixed(2);
    const codigo = nuevoCodigo();

    // Crear orden
    const { data: orden, error: orderError } = await supabase.from('orders').insert({
      codigo,
      user_id: userId,
      nombre: cliente.nombre,
      email: cliente.email,
      telefono: cliente.telefono || null,
      direccion: cliente.direccion,
      ciudad: cliente.ciudad,
      provincia: cliente.provincia,
      codigo_postal: cliente.codigo_postal || null,
      notas: cliente.notas || null,
      total,
    }).select('id').single();

    if (orderError) throw new Error(orderError.message);

    // Insertar ítems
    await supabase.from('order_items').insert(
      detalle.map(d => ({ order_id: orden.id, ...d }))
    );

    // Crear preferencia en Mercado Pago
    const prefBody: Record<string, unknown> = {
      items: detalle.map(d => ({
        id: String(d.product_id),
        title: d.nombre,
        quantity: Number(d.cantidad),
        unit_price: Number(d.precio_unit),
        currency_id: 'ARS',
      })),
      payer: { name: cliente.nombre, email: cliente.email },
      external_reference: codigo,
      back_urls: {
        success: `${FRONT_URL}/pago/exito?codigo=${codigo}`,
        failure: `${FRONT_URL}/pago/error?codigo=${codigo}`,
        pending: `${FRONT_URL}/pago/pendiente?codigo=${codigo}`,
      },
      statement_descriptor: 'TAVO DISTRIBUIDORA',
    };

    if (PUBLIC_URL && !PUBLIC_URL.includes('localhost')) {
      prefBody.notification_url = `${PUBLIC_URL}/functions/v1/webhook-mp`;
      prefBody.auto_return = 'approved';
    }

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(prefBody),
    });
    const pref = await mpRes.json();
    if (!mpRes.ok) throw new Error(pref.message || 'Error creando preferencia MP');

    // Guardar preference ID
    await supabase.from('orders').update({ mp_preference_id: pref.id }).eq('id', orden.id);

    return json({ codigo, total, init_point: pref.init_point });
  } catch (e) {
    console.error(e);
    return err(e instanceof Error ? e.message : 'Error interno');
  }
});
