import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

/*
  Lista de precios (interno / admin).
  Genera el PNG imprimible de la lista de precios TAVO tomando los productos
  y precios directamente del catálogo (tabla products de Supabase).
  Una sola fuente de precios: lo que se edita en "Productos y stock" es lo que
  sale en la lista.
*/

// Orden fijo de las secciones (las demás categorías van al final).
const ORDEN_CAT = ['Hamburguesas', 'Salchichas', 'Aderezos y extras', 'Panes'];

// Teléfonos de contacto que van en el pie de la lista.
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

// Carga html2canvas (vendorizado en /vendor) una sola vez.
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

// Agrupa productos por categoría (en el orden fijo) y arma filas.
// Empareja "X" con "X c/pan" para mostrarlos en dos columnas (Sola / c/pan).
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
      if (/\sc\/pan$/i.test(nombre)) {           // c/pan suelto (sin base): una sola columna
        filas.push({ label: nombre, precios: [p.precio] });
        usados.add(p.id);
        continue;
      }
      const variante = porNombre.get(nombre + ' c/pan');
      if (variante && !usados.has(variante.id)) { // par Sola / c/pan
        filas.push({ label: nombre, sola: p.precio, cpan: variante.precio, par: true });
        usados.add(p.id); usados.add(variante.id);
      } else {
        filas.push({ label: nombre, precios: [p.precio] });
        usados.add(p.id);
      }
    }
    const hayPares = filas.some((f) => f.par);
    return { cat, filas, hayPares };
  });
}

export default function ListaPrecios() {
  const [productos, setProductos] = useState(null);
  const [error, setError] = useState('');
  const [generando, setGenerando] = useState(false);
  const previewRef = useRef(null);
  const fecha = new Date();

  useEffect(() => {
    cargarHtml2Canvas().catch((e) => setError(e.message));
    supabase
      .from('products')
      .select('id,nombre,categoria,precio,activo')
      .eq('activo', 1)
      .order('categoria')
      .order('id')
      .then(({ data, error: e }) => {
        if (e) { setError(e.message); return; }
        setProductos((data ?? []).map((p) => ({ ...p, precio: Number(p.precio) })));
      });
  }, []);

  const descargarPNG = async () => {
    setError('');
    setGenerando(true);
    try {
      const html2canvas = await cargarHtml2Canvas();
      const nodo = previewRef.current;
      const img = nodo.querySelector('img');
      if (img && !img.complete) await new Promise((r) => { img.onload = r; img.onerror = r; });
      const canvas = await html2canvas(nodo, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const url = canvas.toDataURL('image/png');
      const iso = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
      const a = document.createElement('a');
      a.href = url;
      a.download = `lista-precios-${iso}.png`;
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
          La lista toma los productos y precios del catálogo (los mismos que ve el cliente).
          Para cambiar un precio, editalo en la pestaña <b>Productos y stock</b>.
        </p>
        <button className="btn btn-primary" onClick={descargarPNG} disabled={generando || !productos}>
          {generando ? 'Generando…' : 'Descargar PNG'}
        </button>
      </div>

      {error && <p className="alert error">{error}</p>}
      {!productos && !error && <p>Cargando productos…</p>}
      {productos && productos.length === 0 && <p className="hint">No hay productos activos en el catálogo.</p>}

      {/* Vista previa (lo que se exporta como PNG) */}
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
                  <thead>
                    <tr><th></th><th>Sola</th><th>c/pan</th></tr>
                  </thead>
                )}
                <tbody>
                  {sec.filas.map((f, i) => (
                    <tr key={i}>
                      <td className="lp-item">• {f.label}</td>
                      {sec.hayPares ? (
                        <>
                          <td className="lp-price">{precioFmt(f.par ? f.sola : f.precios?.[0])}</td>
                          <td className="lp-price">{precioFmt(f.par ? f.cpan : '')}</td>
                        </>
                      ) : (
                        <td className="lp-price">{precioFmt(f.precios?.[0])}</td>
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
    </div>
  );
}

/* Estilos propios de la lista (prefijo lp-), inyectados para no tocar styles.css */
const CSS = `
.lp-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px;}
.lp-toolbar .hint{margin:0;max-width:620px;}
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
