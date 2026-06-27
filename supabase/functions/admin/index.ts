import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, corsResponse, json, err } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY')!;

const ESTADOS = ['pendiente_pago','pagado','en_preparacion','en_camino','entregado','cancelado'];

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  // Verificar que el usuario es admin
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return err('No autenticado', 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: { user } } = await userClient.auth.getUser(authHeader.replace('Bearer ', ''));
  if (!user) return err('Sesión inválida', 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: profile } = await admin.from('profiles').select('rol').eq('id', user.id).single();
  if (profile?.rol !== 'admin') return err('Acceso solo para administradores', 403);

  try {
    const body = await req.json();
    const { action } = body;

    // ---------- PRODUCTOS ----------
    if (action === 'getProducts') {
      const { data } = await admin.from('products').select('*').order('categoria').order('nombre');
      return json(data);
    }

    if (action === 'createProduct') {
      const { nombre, descripcion, categoria, precio, unidad, stock, imagen } = body;
      if (!nombre || precio == null) return err('Nombre y precio son obligatorios', 400);
      const { data, error } = await admin.from('products').insert({
        nombre, descripcion: descripcion || null,
        categoria: categoria || 'General', precio,
        unidad: unidad || 'caja', stock: stock || 0,
        imagen: imagen || null,
      }).select().single();
      if (error) throw new Error(error.message);
      return json(data, 201);
    }

    if (action === 'updateProduct') {
      const { id, ...fields } = body;
      const { data, error } = await admin.from('products').update(fields).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      if (!data) return err('Producto no encontrado', 404);
      return json(data);
    }

    // ---------- PEDIDOS ----------
    if (action === 'getOrders') {
      const { estado } = body;
      let query = admin.from('orders').select('*').order('created_at', { ascending: false }).limit(500);
      if (estado && ESTADOS.includes(estado)) query = query.eq('estado', estado);
      const { data: orders } = await query;

      const ids = (orders ?? []).map((o: { id: number }) => o.id);
      let itemsByOrder: Record<number, unknown[]> = {};
      if (ids.length) {
        const { data: items } = await admin.from('order_items')
          .select('order_id, nombre, precio_unit, cantidad, subtotal')
          .in('order_id', ids);
        for (const it of items ?? []) {
          const key = (it as { order_id: number }).order_id;
          (itemsByOrder[key] ||= []).push(it);
        }
      }
      return json((orders ?? []).map((o: { id: number }) => ({ ...o, items: itemsByOrder[o.id] || [] })));
    }

    if (action === 'updateOrderEstado') {
      const { id, estado } = body;
      if (!ESTADOS.includes(estado)) return err('Estado inválido', 400);

      const { data: orden } = await admin.from('orders').select('*').eq('id', id).single();
      if (!orden) return err('Pedido no encontrado', 404);

      // Devolver stock si se cancela un pedido ya pagado
      const estabaDescontado = !['pendiente_pago', 'cancelado'].includes(orden.estado);
      if (estado === 'cancelado' && estabaDescontado) {
        const { data: items } = await admin.from('order_items')
          .select('product_id, cantidad').eq('order_id', id);
        for (const it of items ?? []) {
          if (!(it as { product_id: number }).product_id) continue;
          const { data: prod } = await admin.from('products')
            .select('stock').eq('id', (it as { product_id: number }).product_id).single();
          if (prod) {
            await admin.from('products').update({
              stock: Number((prod as { stock: number }).stock) + Number((it as { cantidad: number }).cantidad)
            }).eq('id', (it as { product_id: number }).product_id);
          }
        }
      }

      await admin.from('orders').update({ estado }).eq('id', id);
      return json({ ok: true, estado });
    }

    // ---------- ESTADÍSTICAS ----------
    if (action === 'getStats') {
      const { data: ordenes } = await admin.from('orders')
        .select('total, estado');

      const pagados = (ordenes ?? []).filter((o: { estado: string }) =>
        !['pendiente_pago', 'cancelado'].includes(o.estado));
      const ventas = {
        pedidos: pagados.length,
        total: pagados.reduce((s: number, o: { total: number }) => s + Number(o.total), 0),
      };

      const porEstado: Record<string, number> = {};
      for (const o of ordenes ?? []) {
        porEstado[(o as { estado: string }).estado] = (porEstado[(o as { estado: string }).estado] || 0) + 1;
      }

      const { data: stockBajo } = await admin.from('products')
        .select('id, nombre, stock, unidad')
        .eq('activo', 1).lte('stock', 10).order('stock');

      const { data: allItems } = await admin.from('order_items')
        .select('nombre, cantidad, subtotal, order_id');
      const { data: paidOrders } = await admin.from('orders')
        .select('id').not('estado', 'in', '("pendiente_pago","cancelado")');
      const paidIds = new Set((paidOrders ?? []).map((o: { id: number }) => o.id));
      const itemMap: Record<string, { vendido: number; facturado: number }> = {};
      for (const it of (allItems ?? []).filter((i: { order_id: number }) => paidIds.has(i.order_id))) {
        const k = (it as { nombre: string }).nombre;
        if (!itemMap[k]) itemMap[k] = { vendido: 0, facturado: 0 };
        itemMap[k].vendido += Number((it as { cantidad: number }).cantidad);
        itemMap[k].facturado += Number((it as { subtotal: number }).subtotal);
      }
      const topProductos = Object.entries(itemMap)
        .map(([nombre, v]) => ({ nombre, ...v }))
        .sort((a, b) => b.vendido - a.vendido).slice(0, 10);

      return json({ ventas, porEstado: Object.entries(porEstado).map(([estado, cantidad]) => ({ estado, cantidad })), stockBajo, topProductos });
    }

    return err('Acción desconocida', 400);
  } catch (e) {
    console.error(e);
    return err(e instanceof Error ? e.message : 'Error interno');
  }
});
