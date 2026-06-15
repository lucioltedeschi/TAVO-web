const router = require('express').Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { sign, requireAuth } = require('../middleware/auth');

const PERFIL_FIELDS = 'id, nombre, email, telefono, direccion, ciudad, provincia, codigo_postal, rol';

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { nombre, email, password, telefono, direccion, ciudad, provincia, codigo_postal } = req.body;
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }
    const [exists] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (exists.length) return res.status(409).json({ error: 'Ese email ya está registrado' });

    const hash = await bcrypt.hash(password, 10);
    const [r] = await pool.query(
      `INSERT INTO users (nombre, email, password_hash, telefono, direccion, ciudad, provincia, codigo_postal)
       VALUES (?,?,?,?,?,?,?,?)`,
      [nombre, email, hash, telefono || null, direccion || null, ciudad || null, provincia || null, codigo_postal || null]
    );
    const [rows] = await pool.query(`SELECT ${PERFIL_FIELDS} FROM users WHERE id = ?`, [r.insertId]);
    res.status(201).json({ token: sign(rows[0]), user: rows[0] });
  } catch (e) { next(e); }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email || '']);
    if (!rows.length || !(await bcrypt.compare(password || '', rows[0].password_hash))) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }
    const user = rows[0];
    delete user.password_hash;
    res.json({ token: sign(user), user });
  } catch (e) { next(e); }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.query(`SELECT ${PERFIL_FIELDS} FROM users WHERE id = ?`, [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

// PUT /api/auth/me  (actualizar perfil)
router.put('/me', requireAuth, async (req, res, next) => {
  try {
    const { nombre, telefono, direccion, ciudad, provincia, codigo_postal } = req.body;
    await pool.query(
      `UPDATE users SET nombre = COALESCE(?, nombre), telefono = ?, direccion = ?, ciudad = ?, provincia = ?, codigo_postal = ?
       WHERE id = ?`,
      [nombre, telefono || null, direccion || null, ciudad || null, provincia || null, codigo_postal || null, req.user.id]
    );
    const [rows] = await pool.query(`SELECT ${PERFIL_FIELDS} FROM users WHERE id = ?`, [req.user.id]);
    res.json(rows[0]);
  } catch (e) { next(e); }
});

module.exports = router;
