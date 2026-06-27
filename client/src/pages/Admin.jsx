import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { fmt, ESTADOS_LABEL, callEdge } from '../api';

const ESTADOS = ['pendiente_pago', 'pagado', 'en_preparacion', 'en_camino', 'entregado', 'cancelado'];
const PROD_VACIO = { nombre: '', descripcion: '', categoria: '', precio: '', unidad: 'caja', stock: '', imagen: '' };

// Helper: llama a la Edge Function admin con el JWT del admin
async function adminFn(body) {
  const { data: { session } } = await supabase.auth.getSession();
  return callEdge('admin', body, session);
}

export default function Admin() {
  const [tab, setTab] = useState('dashboard');
  return (
    <div className="container">
      <h1>Panel de administración</h1>
      <div className="tabs">
        {[['dashboard', 'Dashboard'], ['pedidos', 'Pedidos'], ['productos', 'Productos y stock']].map(([k, label]) => (
          <button key={k} className={`tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>
      {tab === 'dashboard' && <Dashboard />}
      {tab === 'pedidos' && <Pedidos />}
      {tab === 'productos' && <Productos />}
    </div>
  );
}

/* ---------------- DASHBOARD ---------------- */
function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminFn({ action: 'getStats' }).then(setStats).catch(e => setError(e.message));
  }, []);

  if (error) return <p className="alert error">{error}</p>;
  if (!stats) return <p>Cargando…</p>;

  return (
    <div>
      <div className="stats-grid">
        <div className="stat"><small>Ventas confirmadas</small><b>{stats.ventas.pedidos}</b></div>
        <div className="stat"><small>Total vendido</small><b>{fmt(stats.ventas.total)}</b></div>
        {stats.porEstado.map(e => (
          <div className="stat" key={e.estado}><small>{ESTADOS_LABEL[e.estado]}</small><b>{e.cantidad}</b></div>
        ))}
      </div>

      <div className="checkout-grid">
        <div>
          <h3>⚠ Stock bajo (≤ 10)</h3>
          {!stats.stockBajo.length && <p className="hint">Todo el stock está bien.</p>}
          <table className="tabla">
            <tbody>
              {stats.stockBajo.map(p => (
                <tr key={p.id}><td>{p.nombre}</td><td className="num"><b>{Number(p.stock)}</b> {p.unidad}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h3>Más vendidos</h3>
          <table className="tabla">
            <tbody>
              {stats.topProductos.map((p, i) => (
                <tr key={i}><td>{p.nombre}</td><td className="num">{Number(p.vendido)} u. · {fmt(p.facturado)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------------- PEDIDOS ---------------- */
function Pedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [abierto, setAbierto] = useState(null);
  const [error, setError] = useState('');

  const cargar = f => adminFn({ action: 'getOrders', ...(f ? { estado: f } : {}) })
    .then(setPedidos).catch(e => setError(e.message));

  useEffect(() => { cargar(filtro); }, [filtro]);

  const cambiarEstado = async (id, estado) => {
    try {
      await adminFn({ action: 'updateOrderEstado', id, estado });
      cargar(filtro);
    } catch (e) { alert(e.message); }
  };

  return (
    <div>
      <div className="chips">
        <button className={`chip-btn ${!filtro ? 'on' : ''}`} onClick={() => setFiltro('')}>Todos</button>
        {ESTADOS.map(e => (
          <button key={e} className={`chip-btn ${filtro === e ? 'on' : ''}`} onClick={() => setFiltro(e)}>
            {ESTADOS_LABEL[e]}
          </button>
        ))}
      </div>
      {error && <p className="alert error">{error}</p>}

      <table className="tabla">
        <thead>
          <tr><th>Código</th><th>Fecha</th><th>Cliente</th><th>Entrega</th><th>Total</th><th>Estado</th><th></th></tr>
        </thead>
        <tbody>
          {pedidos.map(p => (
            <PedidoFila key={p.id} p={p} abierto={abierto === p.id}
              onToggle={() => setAbierto(abierto === p.id ? null : p.id)}
              onEstado={cambiarEstado} />
          ))}
        </tbody>
      </table>
      {!pedidos.length && <p className="hint">No hay pedidos con ese filtro.</p>}
    </div>
  );
}

function PedidoFila({ p, abierto, onToggle, onEstado }) {
  return (
    <>
      <tr>
        <td><b>{p.codigo}</b></td>
        <td>{new Date(p.created_at).toLocaleString('es-AR')}</td>
        <td>{p.nombre}<br /><small>{p.email}{p.telefono ? ` · ${p.telefono}` : ''}</small></td>
        <td><small>{p.direccion}, {p.ciudad}, {p.provincia}</small></td>
        <td className="num">{fmt(p.total)}</td>
        <td>
          <select value={p.estado} onChange={e => onEstado(p.id, e.target.value)}
                  className={`estado-select estado-${p.estado}`}>
            {ESTADOS.map(e => <option key={e} value={e}>{ESTADOS_LABEL[e]}</option>)}
          </select>
        </td>
        <td><button className="link-btn" onClick={onToggle}>{abierto ? '▲' : '▼ items'}</button></td>
      </tr>
      {abierto && (
        <tr className="fila-detalle">
          <td colSpan="7">
            {p.items.map((i, idx) => (
              <span key={idx} className="chip">{i.nombre} × {Number(i.cantidad)} = {fmt(i.subtotal)}</span>
            ))}
            {p.notas && <p><b>Notas:</b> {p.notas}</p>}
          </td>
        </tr>
      )}
    </>
  );
}

/* ---------------- PRODUCTOS ---------------- */
function Productos() {
  const [productos, setProductos] = useState([]);
  const [form, setForm] = useState(PROD_VACIO);
  const [editando, setEditando] = useState(null);
  const [error, setError] = useState('');

  const cargar = () => adminFn({ action: 'getProducts' }).then(setProductos).catch(e => setError(e.message));
  useEffect(() => { cargar(); }, []);

  const onChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const guardar = async e => {
    e.preventDefault();
    setError('');
    try {
      const body = { ...form, precio: Number(form.precio), stock: Number(form.stock || 0) };
      if (editando) await adminFn({ action: 'updateProduct', id: editando, ...body });
      else await adminFn({ action: 'createProduct', ...body });
      setForm(PROD_VACIO);
      setEditando(null);
      cargar();
    } catch (err) { setError(err.message); }
  };

  const editar = p => {
    setEditando(p.id);
    setForm({
      nombre: p.nombre, descripcion: p.descripcion || '', categoria: p.categoria,
      precio: p.precio, unidad: p.unidad, stock: p.stock, imagen: p.imagen || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const desactivar = async p => {
    if (!confirm(`¿${p.activo ? 'Desactivar' : 'Reactivar'} "${p.nombre}"?`)) return;
    await adminFn({ action: 'updateProduct', id: p.id, activo: p.activo ? 0 : 1 });
    cargar();
  };

  return (
    <div>
      <form onSubmit={guardar} className="form form-card">
        <h3>{editando ? `Editando producto #${editando}` : 'Nuevo producto'}</h3>
        <div className="form-row">
          <label>Nombre *<input required name="nombre" value={form.nombre} onChange={onChange} /></label>
          <label>Categoría<input name="categoria" value={form.categoria} onChange={onChange} /></label>
        </div>
        <div className="form-row">
          <label>Precio (ARS) *<input required type="number" step="0.01" min="0" name="precio" value={form.precio} onChange={onChange} /></label>
          <label>Unidad
            <select name="unidad" value={form.unidad} onChange={onChange}>
              <option value="caja">caja</option><option value="pack">pack</option><option value="bolsa">bolsa</option>
              <option value="unidad">unidad</option><option value="kg">kg</option>
            </select>
          </label>
          <label>Stock<input type="number" step="0.01" min="0" name="stock" value={form.stock} onChange={onChange} /></label>
        </div>
        <label>Descripción<input name="descripcion" value={form.descripcion} onChange={onChange} /></label>
        <label>Imagen (URL o /img/archivo.jpg)<input name="imagen" value={form.imagen} onChange={onChange} /></label>
        {error && <p className="alert error">{error}</p>}
        <div>
          <button className="btn btn-primary">{editando ? 'Guardar cambios' : 'Crear producto'}</button>
          {editando && <button type="button" className="link-btn" onClick={() => { setEditando(null); setForm(PROD_VACIO); }}>Cancelar</button>}
        </div>
      </form>

      <table className="tabla">
        <thead>
          <tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Activo</th><th></th></tr>
        </thead>
        <tbody>
          {productos.map(p => (
            <tr key={p.id} className={!p.activo ? 'inactivo' : ''}>
              <td>{p.nombre}</td>
              <td>{p.categoria}</td>
              <td className="num">{fmt(p.precio)} / {p.unidad}</td>
              <td className={`num ${Number(p.stock) <= 10 ? 'stock-bajo' : ''}`}>{Number(p.stock)}</td>
              <td>{p.activo ? '✓' : '✕'}</td>
              <td>
                <button className="link-btn" onClick={() => editar(p)}>Editar</button>
                <button className="link-btn" onClick={() => desactivar(p)}>{p.activo ? 'Desactivar' : 'Activar'}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
