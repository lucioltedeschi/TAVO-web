# LEGALES — Facturación y obligaciones para vender online en Argentina

> **Aviso**: esto es información orientativa, no asesoramiento legal/contable. Antes de operar en serio, consulten un contador (la primera consulta suele ser barata y les ahorra problemas con ARCA).

## ¿Es obligatorio facturar las ventas web?

**Sí.** No existe excepción por ser venta online: al contrario, el e-commerce está más fiscalizado porque Mercado Pago **informa a ARCA (ex AFIP) los movimientos de las cuentas**. Cada cobro por MP queda registrado a nombre del titular de la cuenta. Si entra plata por ventas de forma habitual y no hay CUIT activo ni facturas emitidas, tarde o temprano llegan intimaciones, retenciones sobre los cobros de MP e incluso embargos de cuenta.

Puntos clave de la normativa vigente (2026):

- Toda actividad comercial habitual requiere **alta en ARCA** antes de vender. La plataforma (web propia, WooCommerce, etc.) es solo una herramienta; lo que genera obligaciones es la actividad.
- Desde el **1 de julio de 2026 la factura electrónica es obligatoria para todos los monotributistas** (se eliminan los talonarios en papel).
- Cada **punto de venta** (local físico y tienda online) debe registrarse por separado en ARCA.
- Además, Mercado Pago aplica **retenciones impositivas automáticas** (IIBB y, según condición, ganancias/IVA) sobre los cobros cuando el titular no tiene su situación fiscal en regla o según la jurisdicción.

**Conclusión: "evitarlo" no es una opción viable.** La buena noticia es que regularizarse es simple y barato con el Monotributo.

## Camino recomendado para tu viejo (paso a paso)

1. **Sacar/activar CUIT** en ARCA (se hace online con clave fiscal nivel 3).
2. **Inscribirse en Monotributo** (categoría según facturación anual estimada; para venta de cosas muebles las categorías llegan hasta la K). La cuota mensual incluye el componente impositivo + jubilación + obra social.
3. **Inscripción en Ingresos Brutos** de la provincia (o Convenio Multilateral si vende a varias provincias).
4. **Dar de alta un punto de venta "web"** en ARCA.
5. **Emitir Factura C** por cada venta. Opciones:
   - **Comprobantes en línea** (gratis, en el sitio de ARCA): manual, sirve para arrancar.
   - **Facturador móvil** (app oficial de ARCA).
   - **API de facturación** (WSFEv1) o servicios tipo TusFacturas/Contabilium/Facturante para emitirla **automáticamente desde esta web** (mejora futura: el backend ya guarda todos los datos necesarios por pedido).
6. **DNI/CUIT del comprador**: para consumidor final por montos chicos no hace falta identificarlo; por encima del monto que fija ARCA hay que identificar al comprador (el checkout ya pide nombre y email; agregar campo DNI/CUIT es trivial si se necesita).

## Qué emite la web hoy

- La web genera automáticamente un **comprobante de pago** (no fiscal) con el detalle del pedido, el total y el ID de pago de Mercado Pago. El cliente lo puede ver/imprimir desde "Seguimiento" o desde la pantalla post-pago.
- Ese comprobante **no reemplaza la factura**: la Factura C se emite por ARCA (manual al principio, automatizable después).
- La página pública `/legales` del sitio ya informa al cliente sobre facturación, defensa del consumidor (Ley 24.240, botón de arrepentimiento) y protección de datos (Ley 25.326).

## Otras obligaciones de un e-commerce argentino

- **Defensa del consumidor (Ley 24.240)**: información clara de precios, derecho de revocación dentro de los 10 días (con excepciones para alimentos perecederos), y link a Defensa del Consumidor — ya incluido en `/legales`.
- **Botón de arrepentimiento** (Res. 424/2020): los sitios de venta online deben tener un acceso visible para arrepentirse de la compra. El link de `/legales` lo cubre de mínima; ideal: agregar un botón directo en el footer.
- **Datos personales (Ley 25.326)**: usar los datos solo para procesar pedidos — declarado en `/legales`.
- **Bromatología/transporte**: al ser productos de frigorífico, el transporte de alimentos refrigerados tiene habilitaciones municipales/provinciales propias (independiente de la web).

## Resumen

| Tema | Estado |
|---|---|
| Cobros con Mercado Pago | ✅ Funcionando (Checkout Pro) |
| Comprobante de pago al cliente | ✅ Automático (no fiscal) |
| Factura C | ⚠️ Emitir por ARCA (manual al inicio; automatizable vía API como mejora) |
| Alta CUIT + Monotributo + IIBB | ⚠️ Hacer antes de vender en serio — con contador |
| Página de legales / botón de arrepentimiento | ✅ Incluida (`/legales`) |

### Fuentes consultadas
- [Facturación Electrónica ARCA 2026 — Zetek](https://www.zetek.com.ar/blog/news/facturacion-electronica-arca-2026-guia-completa-para-negocios-en-argentina)
- [E-commerce Argentina: impuestos y facturación ARCA 2026 — Contablix](https://contablix.ar/blog/woocommerce-argentina-impuestos-2026)
- [Factura electrónica Argentina 2026: guía desde cero hasta e-commerce — Contablix](https://contablix.ar/blog/factura-electronica-argentina-2026)
- [Facturación electrónica 2026: nuevas obligaciones — Estudio Libran](https://www.estudiolibran.com.ar/blog/facturacion-electronica)
- [Monotributo 2026: monto máximo a facturar — Los Andes](https://www.losandes.com.ar/economia/monotributo-2026-el-monto-maximo-que-se-puede-facturar-problemas-arca-n5988030)
