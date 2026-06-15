import { useState } from 'react';
import { api, fmt, ESTADOS_LABEL } from '../api';

const PASOS = ['pagado', 'en_preparacion', 'en_camino', 'entregado'];

export default function Seguimiento() {
  const [codigo, setCodigo] = useState('');
  const [email, setEmail] = useState('');
  const [pedido, setPedido] = useState(null);
  const [error, setError] = useState('');

  const buscar = async e => {
    e.preventDefault();
    setError('');
    setPedido(null);
    try {
      const p = await api(`/orders/seguimiento?codigo=${encodeURIComponent(codigo.trim())}&email=${encodeURIComponent(email.trim())}`);
      setPedido(p);
    } catch (err) {
      setError(err.message);
    }
  };

  const pasoActual = pedido ? PASOS.indexOf(pedido.estado) : -1;

  return (
    <div className="container">
      <h1>Seguimiento de pedido</h1>
      <form onSubmit={buscar} className="form form-inline">
        <label>Código de pedido
          <input required placeholder="TAVO-XXXXXX" value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())} />
        </label>
        <label>Email de la compra
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)} />
        </label>
        <button className="btn btn-primary">Buscar</button>
      </form>

      {error && <p className="alert error">{error}</p>}

      {pedido && (
        <div className="pedido-detalle">
          <div className="pedido-head">
            <h2>{pedido.codigo}</h2>
            <span className={`estado estado-${pedido.estado}`}>{ESTADOS_LABEL[pedido.estado]}</span>
          </div>

          {pedido.estado === 'cancelado' ? (
            <p className="alert error">Este pedido fue cancelado.</p>
          ) : pedido.estado === 'pendiente_pago' ? (
            <p className="alert warn">Estamos esperando la confirmación del pago.</p>
          ) : (
            <div className="timeline">
              {PASOS.map((paso, i) => (
                <div key={paso} className={`paso ${i <= pasoActual ? 'done' : ''}`}>
                  <div className="punto">{i <= pasoActual ? '✓' : i + 1}</div>
                  <span>{ESTADOS_LABEL[paso]}</span>
                </div>
              ))}
            </div>
          )}

          <h3>Detalle</h3>
          <table className="tabla">
            <tbody>
              {pedido.items.map((i, idx) => (
                <tr key={idx}>
                  <td>{i.nombre} × {Number(i.cantidad)}</td>
                  <td className="num">{fmt(i.subtotal)}</td>
                </tr>
              ))}
              <tr><td><b>Total</b></td><td className="num"><b>{fmt(pedido.total)}</b></td></tr>
            </tbody>
          </table>
          <p><b>Entrega:</b> {pedido.direccion}, {pedido.ciudad}, {pedido.provincia}</p>

          {pedido.estado !== 'pendiente_pago' && pedido.estado !== 'cancelado' && (
            <a className="btn btn-outline" target="_blank" rel="noreferrer"
               href={`/api/orders/${pedido.codigo}/comprobante?email=${encodeURIComponent(email.trim())}`}>
              Ver comprobante de pago
            </a>
          )}
        </div>
      )}
    </div>
  );
}
