import { useEffect, useMemo, useState } from 'react';
import { fmt, emojiDe } from '../api';
import { supabase } from '../lib/supabase';
import { useCart } from '../context/CartContext';

export default function Catalogo() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cat, setCat] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');
  const { add, items } = useCart();
  const [agregado, setAgregado] = useState(null);

  useEffect(() => {
    supabase
      .from('products')
      .select('*')
      .eq('activo', 1)
      .order('categoria')
      .order('nombre')
      .then(({ data, error: e }) => {
        if (e) { setError(e.message); return; }
        const prods = (data ?? []).map(p => ({ ...p, disponible: Number(p.stock) > 0 }));
        setProductos(prods);
        const cats = [...new Set(prods.map(p => p.categoria).filter(Boolean))];
        setCategorias(cats);
      });
  }, []);

  const visibles = useMemo(() =>
    productos.filter(p =>
      (!cat || p.categoria === cat) &&
      (!busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    ), [productos, cat, busqueda]);

  const agregar = p => {
    add(p);
    setAgregado(p.id);
    setTimeout(() => setAgregado(null), 900);
  };

  return (
    <div className="container">
      <h1>Catálogo</h1>

      <div className="filtros">
        <input
          type="search"
          placeholder="Buscar producto…"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
        <div className="chips">
          <button className={`chip-btn ${!cat ? 'on' : ''}`} onClick={() => setCat('')}>Todos</button>
          {categorias.map(c => (
            <button key={c} className={`chip-btn ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{c}</button>
          ))}
        </div>
      </div>

      {error && <p className="alert error">No se pudo cargar el catálogo: {error}</p>}

      <div className="grid">
        {visibles.map(p => {
          const enCarrito = items.find(i => i.id === p.id);
          return (
            <article key={p.id} className="card">
              <div className="card-img">{p.imagen ? <img src={p.imagen} alt={p.nombre} /> : emojiDe(p.categoria)}</div>
              <div className="card-body">
                <span className="chip">{p.categoria}</span>
                <h3>{p.nombre}</h3>
                {p.descripcion && <p className="desc">{p.descripcion}</p>}
                <div className="card-foot">
                  <b>{fmt(p.precio)} <small>/ {p.unidad}</small></b>
                  <button
                    className={`btn btn-sm ${agregado === p.id ? 'btn-ok' : 'btn-primary'}`}
                    disabled={!p.disponible}
                    onClick={() => agregar(p)}
                  >
                    {!p.disponible ? 'Sin stock' : agregado === p.id ? '✓ Agregado' : enCarrito ? `Agregar (${enCarrito.cantidad})` : 'Agregar'}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {!visibles.length && !error && <p>No hay productos para mostrar.</p>}
    </div>
  );
}
