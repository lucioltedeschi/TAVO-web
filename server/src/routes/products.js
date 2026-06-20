const router = require('express').Router();
const db = require('../db');

// Campos públicos: el stock NUNCA se expone, solo "disponible"
const PUBLIC_SELECT = `
  SELECT id, nombre, descripcion, categoria, precio, unidad, imagen,
         (stock > 0) AS disponible
  FROM products
  WHERE activo = 1`;

// GET /api/products  → catálogo público
router.get('/', async (_req, res, next) => {
  try {
    const [rows] = await db.query(`${PUBLIC_SELECT} ORDER BY categoria, nombre`);
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /api/products/categorias
router.get('/categorias', async (_req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT DISTINCT categoria FROM products WHERE activo = 1 ORDER BY categoria'
    );
    res.json(rows.map(r => r.categoria));
  } catch (e) { next(e); }
});

// GET /api/products/:id
router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await db.query(`${PUBLIC_SELECT} AND id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

module.exports = router;
