const jwt = require('jsonwebtoken');

const SECRET = () => process.env.JWT_SECRET || 'dev_secret';

function sign(user) {
  return jwt.sign({ id: user.id, email: user.email, rol: user.rol }, SECRET(), {
    expiresIn: '7d'
  });
}

// Requiere estar logueado
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autenticado' });
  try {
    req.user = jwt.verify(token, SECRET());
    next();
  } catch {
    return res.status(401).json({ error: 'Sesión inválida o expirada' });
  }
}

// Si hay token lo lee, si no sigue como invitado
function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try { req.user = jwt.verify(token, SECRET()); } catch { /* invitado */ }
  }
  next();
}

// Requiere rol admin
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'Acceso solo para administradores' });
    }
    next();
  });
}

module.exports = { sign, requireAuth, optionalAuth, requireAdmin };
