import { Routes, Route, Link, NavLink, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useCart } from './context/CartContext';
import Home from './pages/Home';
import Catalogo from './pages/Catalogo';
import Carrito from './pages/Carrito';
import Checkout from './pages/Checkout';
import PagoResultado from './pages/PagoResultado';
import Seguimiento from './pages/Seguimiento';
import Login from './pages/Login';
import Registro from './pages/Registro';
import Perfil from './pages/Perfil';
import Admin from './pages/Admin';
import Legales from './pages/Legales';

function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  return (
    <nav className="nav">
      <Link to="/" className="nav-brand">
        <img src="/logo.png" alt="Distribuidora Tavo" />
        <span>Tavo <small>Distribuidora · Since 2016</small></span>
      </Link>
      <div className="nav-links">
        <NavLink to="/catalogo">Catálogo</NavLink>
        <NavLink to="/seguimiento">Seguir pedido</NavLink>
        {user?.rol === 'admin' && <NavLink to="/admin" className="nav-admin">Admin</NavLink>}
        <NavLink to="/carrito" className="nav-cart">
          🛒 {count > 0 && <span className="badge">{count}</span>}
        </NavLink>
        {user ? (
          <>
            <NavLink to="/perfil">{user.nombre.split(' ')[0]}</NavLink>
            <button className="link-btn" onClick={logout}>Salir</button>
          </>
        ) : (
          <NavLink to="/login">Ingresar</NavLink>
        )}
      </div>
    </nav>
  );
}

function RutaAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="container"><p>Cargando…</p></div>;
  if (!user || user.rol !== 'admin') return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalogo" element={<Catalogo />} />
          <Route path="/carrito" element={<Carrito />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/pago/:resultado" element={<PagoResultado />} />
          <Route path="/seguimiento" element={<Seguimiento />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/legales" element={<Legales />} />
          <Route path="/admin/*" element={<RutaAdmin><Admin /></RutaAdmin>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="footer">
        <div>
          <b>Distribuidora Tavo · Since 2016</b>
          <p>Hamburguesas, salchichas, panes y aderezos · Envíos propios</p>
          <p>📞 11 4993-6342 (Gustavo) · 11 6377-0953 (Maxi)</p>
        </div>
        <div>
          <Link to="/legales">Información legal y facturación</Link>
          <p>Pagos procesados por Mercado Pago</p>
        </div>
      </footer>
    </div>
  );
}
