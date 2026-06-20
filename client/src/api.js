// Helper centralizado para llamar a la API
// En dev: Vite proxy redirige /api → localhost:4000
// En prod (Vercel): VITE_API_URL apunta al backend en Render
const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

const TOKEN_KEY = 'tavo_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = t => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  let data = null;
  try { data = await res.json(); } catch { /* respuesta sin JSON */ }

  if (!res.ok) {
    throw new Error(data?.error || `Error ${res.status}`);
  }
  return data;
}

export const fmt = n =>
  Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

// Emoji por categoría para productos sin foto
export const EMOJI_CATEGORIA = {
  'Hamburguesas': '🍔',
  'Salchichas': '🌭',
  'Aderezos y extras': '🍟',
  'Panes': '🥖'
};
export const emojiDe = cat => EMOJI_CATEGORIA[cat] || '🍔';

export const ESTADOS_LABEL = {
  pendiente_pago: 'Pendiente de pago',
  pagado: 'Pagado',
  en_preparacion: 'En preparación',
  en_camino: 'En camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado'
};
