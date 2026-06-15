require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/admin', require('./routes/admin'));

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'conectada' });
  } catch (e) {
    res.status(500).json({ ok: false, db: 'sin conexión', detalle: e.message });
  }
});

// En "producción casera": servir el frontend compilado (client/dist)
// Así alcanza con UN solo proceso/puerto para toda la web.
const dist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// Manejo de errores centralizado
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log('==============================================');
  console.log(`  TAVO backend corriendo en http://localhost:${PORT}`);
  console.log(`  Frontend compilado: ${fs.existsSync(dist) ? 'sirviéndose desde /client/dist' : 'no compilado (usar npm run dev en /client)'}`);
  console.log('==============================================');
});
