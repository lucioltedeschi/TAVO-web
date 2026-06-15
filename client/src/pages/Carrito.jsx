import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { fmt } from '../api';

export default function Carrito() {
  const { items, setCantidad, remove, clear, total } = useCart();
  const nav = useNavigate();

  if (!items.length) {
    return (
      <div className="container center">
        <h1>Tu carrito está vacío</h1>
        <Link to="/catalogo" className="btn btn-primary">Ir al catálogo</Link>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Carrito</h1>
      <table className="tabla">
        <thead>
          <tr><th>Producto</th><th>Precio</th><th>Cantidad</th><th>Subtotal</th><th></th></tr>
        </thead>
        <tbody>
          {items.map(i => (
            <tr key={i.id}>
              <td>{i.nombre}</td>
              <td>{fmt(i.precio)} <small>/ {i.unidad}</small></td>
              <td>
                <div className="qty">
                  <button onClick={() => setCantidad(i.id, i.cantidad - 1)}>−</button>
                  <span>{i.cantidad}</span>
                  <button onClick={() => setCantidad(i.id, i.cantidad + 1)}>+</button>
                </div>
              </td>
              <td>{fmt(i.precio * i.cantidad)}</td>
              <td><button className="link-btn" onClick={() => remove(i.id)}>✕</button></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr><td colSpan="3"><b>Total</b></td><td colSpan="2"><b>{fmt(total)}</b></td></tr>
        </tfoot>
      </table>

      <div className="acciones">
        <button className="link-btn" onClick={clear}>Vaciar carrito</button>
        <div>
          <Link to="/catalogo" className="btn btn-outline">Seguir comprando</Link>
          <button className="btn btn-primary btn-lg" onClick={() => nav('/checkout')}>
            Finalizar compra →
          </button>
        </div>
      </div>
    </div>
  );
}
