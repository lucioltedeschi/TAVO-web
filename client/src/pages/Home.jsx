import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, fmt, emojiDe } from '../api';
import { useCart } from '../context/CartContext';

export default function Home() {
  const [destacados, setDestacados] = useState([]);
  const { add } = useCart();
  const nav = useNavigate();

  useEffect(() => {
    api('/products').then(p => setDestacados(p.slice(0, 6))).catch(() => {});
  }, []);

  return (
    <>
      {/* Presentación */}
      <section className="hero">
        <div className="hero-content">
          <img src="/logo.png" alt="Distribuidora Tavo" className="hero-logo" />
          <h1>Distribuidora <span>Tavo</span></h1>
          <p>
            Hamburguesas, salchichas, panes y aderezos al por mayor, directo del
            frigorífico a tu negocio. Desde 2016. Comprá online, pagá con
            Mercado Pago y seguí tu pedido hasta la entrega.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary btn-lg" onClick={() => nav('/catalogo')}>
              Ver catálogo completo →
            </button>
            <Link to="/seguimiento" className="btn btn-outline btn-lg">Seguir mi pedido</Link>
          </div>
          <div className="hero-features">
            <div>🚚 <b>Envío propio</b><br /><small>Entrega directa</small></div>
            <div>💳 <b>Mercado Pago</b><br /><small>Todos los medios de pago</small></div>
            <div>❄️ <b>Cadena de frío</b><br /><small>Calidad garantizada</small></div>
          </div>
        </div>
      </section>

      {/* Productos destacados → lleva directo al catálogo */}
      <section className="container">
        <div className="section-head">
          <h2>Nuestros productos</h2>
          <Link to="/catalogo">Ver todos →</Link>
        </div>
        <div className="grid">
          {destacados.map(p => (
            <article key={p.id} className="card">
              <div className="card-img">{p.imagen ? <img src={p.imagen} alt={p.nombre} /> : emojiDe(p.categoria)}</div>
              <div className="card-body">
                <span className="chip">{p.categoria}</span>
                <h3>{p.nombre}</h3>
                <div className="card-foot">
                  <b>{fmt(p.precio)} <small>/ {p.unidad}</small></b>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={!p.disponible}
                    onClick={() => add(p)}
                  >
                    {p.disponible ? 'Agregar' : 'Sin stock'}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <h2>Distribución mayorista desde 2016</h2>
        <div className="galeria">
          <img src="/img/super-confiable.jpg" alt="Super confiable - Tavo" />
          <img src="/img/mega-precios.jpg" alt="Mega precios - Tavo" />
          <img src="/img/deposito.jpg" alt="Nuestro depósito" />
          <img src="/img/salchichas.jpg" alt="Salchichas frescas" />
        </div>
      </section>
    </>
  );
}
