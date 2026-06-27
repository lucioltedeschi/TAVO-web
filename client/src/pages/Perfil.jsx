import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { fmt, ESTADOS_LABEL } from '../api';

export default function Perfil() {
  const { user, updateProfile, loading } = useAuth();
  const [form, setForm] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (user) {
      setForm({
        nombre: user.nombre || '', telefono: user.telefono || '',
        direccion: user.direccion || '', ciudad: user.ciudad || '',
        provincia: user.provincia || '', codigo_postal: user.codigo_postal || ''
      });
      // Cargar pedidos del usuario autenticado directamente desde Supabase
      supabase
        .from('orders')
        .select('id, codigo, total, estado, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => setPedidos(data ?? []));
    }
  }, [user]);

  if (loading) return <div className="container"><p>Cargando…</p></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!form) return null;

  const onChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const guardar = async e => {
    e.preventDefault();
    setMsg('');
    try {
      await updateProfile(form);
      setMsg('Datos guardados ✓');
    } catch (err) {
      setMsg(err.message);
    }
  };

  return (
    <div className="container">
      <h1>Mi perfil</h1>
      <div className="checkout-grid">
        <form onSubmit={guardar} className="form">
          <h2>Mis datos</h2>
          <p className="hint">Email: <b>{user.email}</b></p>
          <label>Nombre y apellido<input name="nombre" value={form.nombre} onChange={onChange} /></label>
          <div className="form-row">
            <label>Teléfono<input name="telefono" value={form.telefono} onChange={onChange} /></label>
            <label>Dirección<input name="direccion" value={form.direccion} onChange={onChange} /></label>
          </div>
          <div className="form-row">
            <label>Ciudad<input name="ciudad" value={form.ciudad} onChange={onChange} /></label>
            <label>Provincia<input name="provincia" value={form.provincia} onChange={onChange} /></label>
            <label>CP<input name="codigo_postal" value={form.codigo_postal} onChange={onChange} /></label>
          </div>
          {msg && <p className="alert ok">{msg}</p>}
          <button className="btn btn-primary">Guardar cambios</button>
        </form>

        <div>
          <h2>Mis pedidos</h2>
          {!pedidos.length && <p className="hint">Todavía no hiciste ningún pedido.</p>}
          {pedidos.map(p => (
            <div key={p.id} className="pedido-card">
              <div>
                <b>{p.codigo}</b><br />
                <small>{new Date(p.created_at).toLocaleDateString('es-AR')}</small>
              </div>
              <div className="num">
                {fmt(p.total)}<br />
                <span className={`estado estado-${p.estado}`}>{ESTADOS_LABEL[p.estado]}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
