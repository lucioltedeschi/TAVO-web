// Helpers de formato y constantes compartidas
export const fmt = n =>
  Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

export const EMOJI_CATEGORIA = {
  'Hamburguesas':    '🍔',
  'Salchichas':      '🌭',
  'Aderezos y extras': '🍟',
  'Panes':           '🥖',
};
export const emojiDe = cat => EMOJI_CATEGORIA[cat] || '🍔';

export const ESTADOS_LABEL = {
  pendiente_pago: 'Pendiente de pago',
  pagado:         'Pagado',
  en_preparacion: 'En preparación',
  en_camino:      'En camino',
  entregado:      'Entregado',
  cancelado:      'Cancelado',
};

// URL base de las Edge Functions de Supabase
const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  : null;

// Llama a una Edge Function de Supabase con el JWT del usuario si está disponible
export async function callEdge(fnName, body = {}, session = null) {
  if (!FUNCTIONS_URL) throw new Error('VITE_SUPABASE_URL no configurada');

  const headers = { 'Content-Type': 'application/json' };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  // apikey header requerido por Supabase
  if (import.meta.env.VITE_SUPABASE_ANON_KEY) {
    headers['apikey'] = import.meta.env.VITE_SUPABASE_ANON_KEY;
  }

  const res = await fetch(`${FUNCTIONS_URL}/${fnName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  let data = null;
  try { data = await res.json(); } catch { /* sin JSON */ }
  if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
  return data;
}

// URL del comprobante (Edge Function, devuelve HTML)
export function comprobanteUrl(codigo, email) {
  if (!FUNCTIONS_URL) return '#';
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  return `${FUNCTIONS_URL}/comprobante?codigo=${encodeURIComponent(codigo)}&email=${encodeURIComponent(email)}&apikey=${anon}`;
}
