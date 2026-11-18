import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { callEdge } from '../api';

/*
  Lista de precios (interno / admin).
  - Genera el PNG imprimible de la lista TAVO tomando los productos y precios
    directamente del catálogo (tabla products de Supabase). Una sola fuente de precios.
  - Permite EDITAR los precios inline (botón "Editar precios"), guardándolos con la
    misma Edge Function admin que usa el panel. Pensado para usarse también desde el celular.
*/

const ORDEN_CAT = ['Hamburguesas', 'Salchichas', 'Aderezos y extras', 'Panes'];
const CONTACTOS = ['11 4993 - 6342 (Gustavo)', '11 6377 - 0953 (Maxi)'];

const precioFmt = (n) =>
  (n === null || n === undefined || n === '') ? '' :
  '$' + Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });

const fechaCorta = (d) => {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const aa = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${aa}`;
};

// Llama a la Edge Function admin con el JWT del admin logueado.
async function adminFn(body) {
  const { data: { session } } = await supabase.auth.getSession();
  return callEdge('admin', body, session);
}

function cargarHtml2Canvas() {
  return new Promise((resolve, reject) => {
    if (window.html2canvas) return resolve(window.html2canvas);
    const s = document.createElement('script');
    s.src = '/vendor/html2canvas.min.js';
    s.onload = () => resolve(window.html2canvas);
    s.onerror = () => reject(new Error('No se pudo cargar html2canvas'));
    document.body.appendChild(s);
  });
}

// Agrupa por categoría (orden fijo) y empareja "X" con "X c/pan" (Sola / c/pan).
// Cada fila guarda referencia a los productos reales (para poder editar sus precios).
function armarSecciones(productos) {
  const porCat = new Map();
  for (const p of productos) {
    if (!porCat.has(p.categoria)) porCat.set(p.categoria, []);
    porCat.get(p.categoria).push(p);
  }
  const cats = [...porCat.keys()].sort((a, b) => {
    const ia = ORDEN_CAT.indexOf(a), ib = ORDEN_CAT.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  return cats.map((cat) => {
    const prods = porCat.get(cat);
    const porNombre = new Map(prods.map((p) => [p.nombre.trim(), p]));
    const usados = new Set();
    const filas = [];
    for (const p of prods) {
      if (usados.has(p.id)) continue;
      const nombre = p.nombre.trim();
      if (/\sc\/pan$/i.test(nombre)) {
        filas.push({ par: false, label: nombre, prod: p });
        usados.add(p.id);
        continue;
      }
      const variante = porNombre.get(nombre + ' c/pan');
      if (variante && !usados.has(variante.id)) {
        filas.push({ par: true, label: nombre, base: p, variante });
        usados.add(p.id); usados.add(variante.id);
      } else {
        filas.push({ par: false, label: nombre, prod: p });
        usados.add(p.id);
      }
    }
    return { cat, filas, hayPares: filas.some((f) => f.par) };
  });
}

export default function ListaPrecios() {
  const [productos, setProductos] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [generando, setGenerando] = useState(false);

  const [editando, setEditando] = useState(false);
  const [edits, setEdits] = useState({});     // { [productId]: valorString }
  const [guardando, setGuardando] = useState(false);

  const previewRef = useRef(null);
  const fecha = new Date();

  const cargar = () =>
    supabase.from('products')
      .select('id,nombre,categoria,precio,activo')
      .eq('activo', 1)
      .order('categoria')
      .order('id')
      .then(({ data, error: e }) => {
        if (e) { setError(e.message); return; }
        setProductos((data ?? []).map((p) => ({ ...p, precio: Number(p.precio) })));
      });

  useEffect(() => {
    cargarHtml2Canvas().catch((e) => setError(e.message));
    cargar();
  }, []);

  /* ---------- Editar precios ---------- */
  const entrarEdicion = () => {
    const ini = {};
    for (const p of productos) ini[p.id] = String(p.precio);
    setEdits(ini);
    setMsg(''); setError('');
    setEditando(true);
  };
  const cancelar = () => { setEditando(false); setError(''); };
  const setPrecio = (id, v) => setEdits((e) => ({ ...e, [id]: v }));

  const guardar = async () => {
    setError(''); setMsg('');
    // Detectar cambios y validar
    const cambios = [];
    for (const p of productos) {
      const raw = edits[p.id];
      if (raw === undefined) continue;
      if (raw === '' || isNaN(Number(raw)) || Number(raw) < 0) {
        setError(`Precio inválido en "${p.nombre}".`);
        return;
      }
      if (Number(raw) !== Number(p.precio)) cambios.push({ id: p.id, precio: Number(raw) });
    }
    if (cambios.length === 0) { setEditando(false); return; }

    setGuardando(true);
    try {
      for (const c of cambios) {
        await adminFn({ action: 'updateProduct', id: c.id, precio: c.precio });
      }
      await cargar();
      setEditando(false);
      setMsg(`Precios actualizados (${cambios.length}).`);
    } catch (e) {
      setError(e.message || 'No se pudieron guardar los cambios');
    } finally {
      setGuardando(false);
    }
  };

  /* ---------- Generar PNG ---------- */
  const descargarPNG = async () => {
    setError(''); setGenerando(true);
    try {
      const html2canvas = await cargarHtml2Canvas();
      const nodo = previewRef.current;
      const img = nodo.querySelector('img');
      if (img && !img.complete) await new Promise((r) => { img.onload = r; img.onerror = r; });
      const canvas = await html2canvas(nodo, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const url = canvas.toDataURL('image/png');
      const iso = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
      const a = document.createElement('a');
      a.href = url; a.download = `lista-precios-${iso}.png`;
      document.body.appendChild(a); a.click(); a.remove();
    } catch (e) {
      setError(e.message || 'No se pudo generar la imagen');
    } finally {
      setGenerando(false);
    }
  };

  const secciones = productos ? armarSecciones(productos) : [];

  return (
    <div>
      <style>{CSS}</style>

      <div className="lp-toolbar">
        <p className="hint">
          {editando
            ? 'Editá los precios y tocá Guardar. Se actualizan en el catálogo y en la lista.'
            : 'La lista usa los productos y precios del catálogo (los mismos que ve el cliente).'}
        </p>
        <div className="lp-actions">
          {!editando ? (
            <>
              <button className="btn btn-primary" onClick={entrarEdicion} disabled={!productos}>Editar precios</button>
              <button className="btn btn-primary" onClick={descargarPNG} disabled={generando || !productos}>
                {generando ? 'Generando…' : 'Descargar PNG'}
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-primary" onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar cambios'}
              </button>
              <button className="btn btn-ghost" onClick={cancelar} disabled={guardando}>Cancelar</button>
            </>
          )}
        </div>
      </div>

      {error && <p className="alert error">{error}</p>}
      {msg && <p className="alert ok">{msg}</p>}
      {!productos && !error && <p>Cargando productos…</p>}
      {productos && productos.length === 0 && <p className="hint">No hay productos activos en el catálogo.</p>}

      {/* ---------- MODO EDICIÓN (responsive) ---------- */}
      {editando && productos && (
        <div className="lpe">
          {secciones.map((sec) => (
            <div className="lpe-sec" key={sec.cat}>
              <h3 className="lpe-sec-title">{sec.cat}</h3>
              {sec.filas.map((f, i) => (
                <div className="lpe-row" key={i}>
                  <div className="lpe-name">{f.label}</div>
                  <div className="lpe-fields">
                    {f.par ? (
                      <>
                        <label className="lpe-field"><span>Sola</span>
                          <input type="number" min="0" step="0.01" inputMode="decimal"
                            value={edits[f.base.id] ?? ''} onChange={(e) => setPrecio(f.base.id, e.target.value)} />
                        </label>
                        <label className="lpe-field"><span>c/pan</span>
                          <input type="number" min="0" step="0.01" inputMode="decimal"
                            value={edits[f.variante.id] ?? ''} onChange={(e) => setPrecio(f.variante.id, e.target.value)} />
                        </label>
                      </>
                    ) : (
                      <label className="lpe-field"><span>Precio</span>
                        <input type="number" min="0" step="0.01" inputMode="decimal"
                          value={edits[f.prod.id] ?? ''} onChange={(e) => setPrecio(f.prod.id, e.target.value)} />
                      </label>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ---------- VISTA PREVIA / PNG (cuando no se edita) ---------- */}
      {!editando && (
        <div className="lp-scroll">
          <div className="lp-preview" ref={previewRef}>
            <div className="lp-date">{fechaCorta(fecha)}</div>
            <div className="lp-title">LISTA DE PRECIOS</div>

            {secciones.map((sec) => (
              <div className="lp-section" key={sec.cat}>
                <div className="lp-section-title">{sec.cat}</div>
                <table className="lp-table">
                  <colgroup>
                    {sec.hayPares
                      ? (<><col style={{ width: '54%' }} /><col style={{ width: '23%' }} /><col style={{ width: '23%' }} /></>)
                      : (<><col style={{ width: '77%' }} /><col style={{ width: '23%' }} /></>)}
                  </colgroup>
                  {sec.hayPares && (
                    <thead><tr><th></th><th>Sola</th><th>c/pan</th></tr></thead>
                  )}
                  <tbody>
                    {sec.filas.map((f, i) => (
                      <tr key={i}>
                        <td className="lp-item">• {f.label}</td>
                        {sec.hayPares ? (
                          <>
                            <td className="lp-price">{precioFmt(f.par ? f.base.precio : f.prod.precio)}</td>
                            <td className="lp-price">{precioFmt(f.par ? f.variante.precio : '')}</td>
                          </>
                        ) : (
                          <td className="lp-price">{precioFmt(f.prod.precio)}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

            <div className="lp-footer">
              <div className="lp-contact">
                <h4>Contacto</h4>
                {CONTACTOS.map((c) => <p key={c}>{c}</p>)}
              </div>
              <div className="lp-logo">
                <img src="/logo.png" alt="Distribuidora Tavo" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const CSS = `
.lp-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px;}
.lp-toolbar .hint{margin:0;max-width:560px;}
.lp-actions{display:flex;gap:8px;flex-wrap:wrap;}
.alert.ok{background:#e7f6ec;color:#1b7a3d;border:1px solid #bfe6cc;padding:8px 12px;border-radius:8px;}

/* Editor de precios (responsive, pensado para celular) */
.lpe{background:#fff;border:1px solid #e6e8ec;border-radius:12px;padding:14px;}
.lpe-sec{margin-bottom:18px;}
.lpe-sec-title{color:#d98e0a;margin:0 0 6px;font-size:18px;border-bottom:2px solid #f5a623;padding-bottom:4px;}
.lpe-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 2px;border-bottom:1px solid #eef0f3;flex-wrap:wrap;}
.lpe-name{flex:1 1 160px;font-size:15px;line-height:1.25;}
.lpe-fields{display:flex;gap:10px;}
.lpe-field{display:flex;flex-direction:column;font-size:11px;color:#8a8f98;text-align:right;}
.lpe-field span{margin-bottom:2px;}
.lpe-field input{width:120px;font-size:16px;padding:9px 10px;border:1px solid #d7dbe0;border-radius:8px;text-align:right;}
.lpe-field input:focus{outline:2px solid #f5a623;border-color:#f5a623;}
@media(max-width:480px){
  .lpe-name{flex:1 1 100%;font-weight:600;margin-bottom:4px;}
  .lpe-fields{width:100%;}
  .lpe-field{flex:1;}
  .lpe-field input{width:100%;}
}

/* Vista previa / PNG */
.lp-scroll{overflow-x:auto;padding:10px 0;background:#f4f4f4;border-radius:10px;}
.lp-preview{width:640px;margin:0 auto;background:#fff;padding:30px 34px 26px;font-family:Arial,Helvetica,sans-serif;color:#111;box-shadow:0 2px 10px rgba(0,0,0,.08);}
.lp-date{text-align:right;font-size:15px;color:#999;margin-bottom:4px;}
.lp-title{text-align:center;font-size:30px;font-weight:800;text-decoration:underline;letter-spacing:1px;margin:0 0 22px;}
.lp-section{margin-bottom:18px;}
.lp-section-title{color:#f5a623;font-size:26px;font-weight:800;margin:0 0 6px;}
.lp-table{width:100%;border-collapse:collapse;table-layout:fixed;}
.lp-table th{color:#f5a623;font-style:italic;font-weight:normal;text-align:right;padding:2px 6px;font-size:15px;}
.lp-table td{padding:3px 6px;font-size:16px;color:#111;}
.lp-table td.lp-item{text-align:left;}
.lp-table td.lp-price{text-align:right;white-space:nowrap;}
.lp-footer{display:flex;justify-content:space-between;align-items:flex-end;margin-top:26px;}
.lp-contact h4{font-size:18px;margin:0 0 8px;color:#000;}
.lp-contact p{margin:3px 0;font-size:15px;font-weight:bold;letter-spacing:1px;color:#111;}
.lp-logo img{width:150px;height:auto;}
`;
