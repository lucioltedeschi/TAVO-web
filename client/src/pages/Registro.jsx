import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const VACIO = { nombre: '', email: '', password: '', telefono: '', direccion: '', ciudad: '', provincia: '', codigo_postal: '' };

export default function Registro() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState('');

  const onChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async e => {
    e.preventDefault();
    setError('');
    try {
      await register(form);
      nav('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="container narrow">
      <h1>Crear cuenta</h1>
      <p className="hint">Con tu cuenta no tenés que cargar tus datos en cada compra y podés ver tu historial de pedidos.</p>
      <form onSubmit={onSubmit} className="form">
        <label>Nombre y apellido *<input required name="nombre" value={form.nombre} onChange={onChange} /></label>
        <div className="form-row">
          <label>Email *<input required type="email" name="email" value={form.email} onChange={onChange} /></label>
          <label>Contraseña * <small>(mín. 6)</small><input required type="password" minLength={6} name="password" value={form.password} onChange={onChange} /></label>
        </div>
        <div className="form-row">
          <label>Teléfono<input name="telefono" value={form.telefono} onChange={onChange} /></label>
          <label>Dirección<input name="direccion" value={form.direccion} onChange={onChange} /></label>
        </div>
        <div className="form-row">
          <label>Ciudad<input name="ciudad" value={form.ciudad} onChange={onChange} /></label>
          <label>Provincia<input name="provincia" value={form.provincia} onChange={onChange} /></label>
          <label>CP<input name="codigo_postal" value={form.codigo_postal} onChange={onChange} /></label>
        </div>
        {error && <p className="alert error">{error}</p>}
        <button className="btn btn-primary">Crear cuenta</button>
        <p className="hint">¿Ya tenés cuenta? <Link to="/login">Ingresá</Link></p>
      </form>
    </div>
  );
}
