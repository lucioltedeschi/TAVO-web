// Genera el comprobante de pago en HTML imprimible (Ctrl+P -> guardar como PDF).
// IMPORTANTE: esto es un COMPROBANTE de la operación, NO una factura fiscal.
// Ver LEGALES.md para la obligación de emitir factura electrónica vía ARCA.

const fmt = n => Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

function comprobanteHTML(order, items) {
  const fecha = new Date(order.created_at).toLocaleString('es-AR');
  const filas = items.map(i => `
    <tr>
      <td>${i.nombre}</td>
      <td class="num">${Number(i.cantidad)}</td>
      <td class="num">${fmt(i.precio_unit)}</td>
      <td class="num">${fmt(i.subtotal)}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Comprobante ${order.codigo} - TAVO</title>
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
      <div style="margin-top:6px; font-size:13px;">N° <b>${order.codigo}</b><br>${fecha}</div>
    </div>
  </header>

  <div class="datos">
    <b>Cliente:</b> ${order.nombre} &nbsp;|&nbsp; ${order.email}${order.telefono ? ' &nbsp;|&nbsp; Tel: ' + order.telefono : ''}<br>
    <b>Entrega:</b> ${order.direccion}, ${order.ciudad}, ${order.provincia}${order.codigo_postal ? ' (CP ' + order.codigo_postal + ')' : ''}<br>
    <b>Estado del pedido:</b> ${order.estado.replace(/_/g, ' ').toUpperCase()}
    ${order.mp_payment_id ? `<br><b>ID de pago Mercado Pago:</b> ${order.mp_payment_id}` : ''}
  </div>

  <table>
    <thead>
      <tr><th>Producto</th><th class="num">Cant.</th><th class="num">Precio unit.</th><th class="num">Subtotal</th></tr>
    </thead>
    <tbody>
      ${filas}
      <tr class="total"><td colspan="3">TOTAL</td><td class="num">${fmt(order.total)}</td></tr>
    </tbody>
  </table>

  <button class="print-btn" onclick="window.print()">Imprimir / Guardar PDF</button>

  <div class="aviso">
    Este documento es un comprobante de la operación y del pago realizado a través de Mercado Pago.
    No reemplaza a la factura fiscal. Documento generado automáticamente por el sistema de TAVO.
  </div>
</body>
</html>`;
}

module.exports = { comprobanteHTML };
