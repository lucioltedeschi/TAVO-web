import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api, fmt } from '../api';

const VACIO = { nombre: '', email: '', telefono: '', direccion: '', ciudad: '', provincia: '', codigo_postal: '', notas: '' };

export default function Checkout() {
  const { items, total } = useCart();
  const { user } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Autocompletar con los datos del perfil si está logueado
  useEffect(() => {
    if (user) {
      setForm(f => ({
        ...f,
        nombre: user.nombre || '',
        email: user.email || '',
        telefono: user.telefono || '',
        direccion: user.direccion || '',
        ciudad: user.ciudad || '',
        provincia: user.provincia || '',
        codigo_postal: user.codigo_postal || ''
      }));
    }
  }, [user]);

  if (!items.length) {
    return (
      <div className="container center">
        <h1>No hay nada para pagar</h1>
        <Link to="/catalogo" className="btn btn-primary">Ir al catálogo</Link>
      </div>
    );
  }

  const onChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const pagar = async e => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const { init_point, codigo } = await api('/orders', {
        method: 'POST',
        body: {
          items: items.map(i => ({ product_id: i.id, cantidad: i.cantidad })),
          cliente: form
        }
      });
      // Guardamos el pedido para la vuelta del checkout
      sessionStorage.setItem('tavo_ultimo_pedido', JSON.stringify({ codigo, email: form.email }));
      // Redirigir a Mercado Pago (Checkout Pro)
      window.location.href = init_point;
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  };

  return (
    <div className="container checkout">
      <h1>Finalizar compra</h1>
      <div className="checkout-grid">
        <form onSubmit={pagar} className="form">
          <h2>Datos de entrega</h2>
          {!user && (
            <p className="hint">
              ¿Comprás seguido? <Link to="/registro">Creá tu cuenta</Link> para no cargar tus datos cada vez.
              También podés comprar como invitado.
            </p>
          )}
          <div className="form-row">
            <label>Nombre y apellido *<input required name="nombre" value={form.nombre} onChange={onChange} /></label>
            <label>Email *<input required type="email" name="email" value={form.email} onChange={onChange} /></label>
          </div>
          <div className="form-row">
            <label>Teléfono<input name="telefono" value={form.telefono} onChange={onChange} /></label>
            <label>Dirección *<input required name="direccion" value={form.direccion} onChange={onChange} /></label>
          </div>
          <div className="form-row">
            <label>Ciudad *<input required name="ciudad" value={form.ciudad} onChange={onChange} /></label>
            <label>Provincia *<input required name="provincia" value={form.provincia} onChange={onChange} /></label>
            <label>CP<input name="codigo_postal" value={form.codigo_postal} onChange={onChange} /></label>
          </div>
          <label>Notas para la entrega<textarea name="notas" rows="2" value={form.notas} onChange={onChange} /></label>

          {error && <p className="alert error">{error}</p>}

          <button className="btn btn-mp btn-lg" disabled={enviando}>
            {enviando ? 'Generando pago…' : 'Pagar con Mercado Pago'}
          </button>
          <p className="hint">Serás redirigido a Mercado Pago para completar el pago de forma segura.</p>
        </form>

        <aside className="resumen">
          <h2>Resumen</h2>
          {items.map(i => (
            <div key={i.id} className="resumen-item">
              <span>{i.nombre} × {i.cantidad}</span>
              <span>{fmt(i.precio * i.cantidad)}</span>
            </div>
          ))}
          <div className="resumen-total"><span>Total</span><span>{fmt(total)}</span></div>
        </aside>
      </div>
    </div>
  );
}
