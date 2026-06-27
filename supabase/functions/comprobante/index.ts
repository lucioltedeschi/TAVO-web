import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const fmt = (n: number) => Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

serve(async (req) => {
  const url = new URL(req.url);
  const codigo = url.searchParams.get('codigo') || '';
  const email  = url.searchParams.get('email')  || '';

  if (!codigo || !email) {
    return new Response('Falta código o email', { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: orden } = await supabase.from('orders')
    .select('*').eq('codigo', codigo).eq('email', email).single();

  if (!orden) return new Response('Comprobante no encontrado.', { status: 404 });
  if (orden.estado === 'pendiente_pago' || orden.estado === 'cancelado') {
    return new Response('El pedido aún no tiene pago aprobado.', { status: 400 });
  }

  const { data: items } = await supabase.from('order_items')
    .select('nombre, precio_unit, cantidad, subtotal').eq('order_id', orden.id);

  const fecha = new Date(orden.created_at).toLocaleString('es-AR');
  const filas = (items ?? []).map((i: Record<string, unknown>) => `
    <tr>
      <td>${i.nombre}</td>
      <td class="num">${Number(i.cantidad)}</td>
      <td class="num">${fmt(Number(i.precio_unit))}</td>
      <td class="num">${fmt(Number(i.subtotal))}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Comprobante ${orden.codigo} - TAVO</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; max-width: 720px; margin: 30px auto; color: #222; }
  header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #f2b01e; padding-bottom: 12px; }
  h1 { color: #1c1c1e; margin: 0; font-size: 26px; }
  h1 span { color: #d99a0b; }
  .badge { background: #1c1c1e; color: #f2b01e; padding: 4px 12px; border-radius: 4px; font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin-top: 18px; }
  th { background: #f3f3f3; text-align: left; }
  th, td { padding: 8px 10px; border-bottom: 1px solid #ddd; font-size: 14px; }
  .num { text-align: right; }
  .total td { font-weight: bold; font-size: 16px; border-top: 2px solid #222; }
  .datos { margin-top: 16px; font-size: 14px; line-height: 1.6; }
  .aviso { margin-top: 28px; font-size: 11px; color: #777; border-top: 1px dashed #ccc; padding-top: 10px; }
  .print-btn { margin-top: 20px; padding: 10px 24px; background: #f2b01e; color: #1c1c1e; font-weight: 700; border: 0; border-radius: 6px; cursor: pointer; font-size: 15px; }
  @media print { .print-btn { display: none; } }
</style>
</head>
<body>
  <header>
    <div>
      <h1>Distribuidora <span>Tavo</span></h1>
      <small>Hamburguesas · Salchichas · Panes · Aderezos — Since 2016</small>
    </div>
    <div>
      <div class="badge">COMPROBANTE DE PAGO</div>
      <div style="margin-top:6px; font-size:13px;">N° <b>${orden.codigo}</b><br>${fecha}</div>
    </div>
  </header>
  <div class="datos">
    <b>Cliente:</b> ${orden.nombre} &nbsp;|&nbsp; ${orden.email}${orden.telefono ? ' &nbsp;|&nbsp; Tel: ' + orden.telefono : ''}<br>
    <b>Entrega:</b> ${orden.direccion}, ${orden.ciudad}, ${orden.provincia}${orden.codigo_postal ? ' (CP ' + orden.codigo_postal + ')' : ''}<br>
    <b>Estado:</b> ${orden.estado.replace(/_/g, ' ').toUpperCase()}
    ${orden.mp_payment_id ? `<br><b>ID pago MP:</b> ${orden.mp_payment_id}` : ''}
  </div>
  <table>
    <thead><tr><th>Producto</th><th class="num">Cant.</th><th class="num">Precio unit.</th><th class="num">Subtotal</th></tr></thead>
    <tbody>
      ${filas}
      <tr class="total"><td colspan="3">TOTAL</td><td class="num">${fmt(Number(orden.total))}</td></tr>
    </tbody>
  </table>
  <button class="print-btn" onclick="window.print()">Imprimir / Guardar PDF</button>
  <div class="aviso">Este documento es un comprobante de operación y del pago realizado a través de Mercado Pago. No reemplaza a la factura fiscal.</div>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
});
