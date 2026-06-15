import { createContext, useContext, useEffect, useState } from 'react';

const CartCtx = createContext(null);
export const useCart = () => useContext(CartCtx);
const KEY = 'tavo_cart';

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
  });

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(items)); }, [items]);

  const add = (producto, cantidad = 1) =>
    setItems(prev => {
      const i = prev.find(x => x.id === producto.id);
      if (i) return prev.map(x => x.id === producto.id ? { ...x, cantidad: x.cantidad + cantidad } : x);
      return [...prev, { id: producto.id, nombre: producto.nombre, precio: Number(producto.precio), unidad: producto.unidad, cantidad }];
    });

  const setCantidad = (id, cantidad) =>
    setItems(prev => cantidad <= 0
      ? prev.filter(x => x.id !== id)
      : prev.map(x => x.id === id ? { ...x, cantidad } : x));

  const remove = id => setItems(prev => prev.filter(x => x.id !== id));
  const clear = () => setItems([]);

  const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const count = items.reduce((s, i) => s + i.cantidad, 0);

  return (
    <CartCtx.Provider value={{ items, add, setCantidad, remove, clear, total, count }}>
      {children}
    </CartCtx.Provider>
  );
}
