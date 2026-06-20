const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Convierte placeholders mysql-style (?) a PostgreSQL ($1, $2, ...)
function toPg(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

// Interfaz compatible con mysql2/promise:
//   const [rows, rowCount] = await db.query(sql, params)
async function query(sql, params = []) {
  const res = await pool.query(toPg(sql), params);
  return [res.rows, res.rowCount];
}

// Conexión con soporte de transacciones
//   const conn = await db.getConnection()
//   await conn.beginTransaction() / conn.commit() / conn.rollback() / conn.release()
async function getConnection() {
  const client = await pool.connect();
  return {
    async query(sql, params = []) {
      const res = await client.query(toPg(sql), params);
      return [res.rows, res.rowCount];
    },
    async beginTransaction() { await client.query('BEGIN'); },
    async commit()          { await client.query('COMMIT'); },
    async rollback()        { await client.query('ROLLBACK'); },
    release()               { client.release(); }
  };
}

module.exports = { query, getConnection };
