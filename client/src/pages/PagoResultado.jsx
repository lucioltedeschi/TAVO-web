import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { comprobanteUrl } from '../api';
import { useCart } from '../context/CartContext';

// Página a la que vuelve el usuario desde Mercado Pago:
// /pago/exito | /pago/error | /pago/pendiente
export default function PagoResultado() {
  const { resultado } = useParams();
  const [params] = useSearchParams();
  const { clear } = useCart();
  const [confirmado, setConfirmado] = useState(false);
  const [verificando, setVerificando] = useState(resultado === 'exito');

  const codigo = params.get('codigo') ||
    JSON.parse(sessionStorage.getItem('tavo_ultimo_pedido') || '{}').codigo;
  const email = JSON.parse(sessionStorage.getItem('tavo_ultimo_pedido') || '{}').email;
  const paymentId = params.get('payment_id') || params.get('collection_id');

  useEffect(() => {
    if (resultado === 'exito') {
      clear(); // el carrito ya se compró
      // Confirmar el pago contra MP (fallback al webhook)
      if (paymentId && paymentId !== 'null') {
        supabase.functions.invoke('confirmar-pago', { body: { payment_id: paymentId } })
          .then(({ data, error }) => {
            if (!error && data?.ok) setConfirmado(true);
          })
          .catch(() => {})
          .finally(() => setVerificando(false));
      } else {
        setVerificando(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (resultado === 'exito') {
    return (
      <div className="container center">
        <div className="resultado ok">✓</div>
        <h1>¡Gracias por tu compra!</h1>
        {verificando ? <p>Verificando el pago…</p> : (
          <p>{confirmado
            ? 'El pago fue acreditado correctamente.'
            : 'El pago está siendo procesado por Mercado Pago.'}</p>
        )}
        {codigo && (
          <p>Tu código de pedido es <b className="codigo">{codigo}</b>.<br />
            Guardalo para hacer el seguimiento.</p>
        )}
        <div className="acciones-center">
          {codigo && email && (
            <a className="btn btn-outline" target="_blank" rel="noreferrer"
               href={comprobanteUrl(codigo, email)}>
              Ver comprobante de pago
            </a>
          )}
          <Link to="/seguimiento" className="btn btn-primary">Seguir mi pedido</Link>
        </div>
      </div>
    );
  }

  if (resultado === 'pendiente') {
    return (
      <div className="container center">
        <div className="resultado warn">⏳</div>
        <h1>Pago pendiente</h1>
        <p>Mercado Pago está procesando tu pago (ej: pago en efectivo).
          Cuando se acredite, tu pedido pasará a "Pagado".</p>
        {codigo && <p>Código de pedido: <b className="codigo">{codigo}</b></p>}
        <Link to="/seguimiento" className="btn btn-primary">Seguir mi pedido</Link>
      </div>
    );
  }

  return (
    <div className="container center">
      <div className="resultado err">✕</div>
      <h1>El pago no se completó</h1>
      <p>Podés intentarlo nuevamente. Tu carrito sigue guardado.</p>
      <Link to="/carrito" className="btn btn-primary">Volver al carrito</Link>
    </div>
  );
}
