import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async e => {
    e.preventDefault();
    setError('');
    try {
      const user = await login(email, password);
      nav(user.rol === 'admin' ? '/admin' : '/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="container narrow">
      <h1>Ingresar</h1>
      <form onSubmit={onSubmit} className="form">
        <label>Email<input required type="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label>Contraseña<input required type="password" value={password} onChange={e => setPassword(e.target.value)} /></label>
        {error && <p className="alert error">{error}</p>}
        <button className="btn btn-primary">Entrar</button>
        <p className="hint">¿No tenés cuenta? <Link to="/registro">Registrate</Link></p>
      </form>
    </div>
  );
}
