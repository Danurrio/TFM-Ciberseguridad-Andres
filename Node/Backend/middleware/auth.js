const jwt = require('jsonwebtoken');

// ── Arranque seguro: si no hay JWT_SECRET el servidor no debe iniciar ────────
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET no está definida en las variables de entorno. El servidor no puede arrancar.');
  process.exit(1);
}

// Métodos HTTP que modifican estado y requieren validación CSRF
const METODOS_MUTANTES = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Rutas públicas que no requieren CSRF aunque sean mutantes
// (el usuario aún no tiene token ni csrf_token en estas rutas)
const RUTAS_PUBLICAS_CSRF = ['/auth/login', '/auth/register'];

/**
 * Verifica que el JWT sea válido e inyecta req.user
 */
function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }
}

/**
 * Valida el CSRF token en peticiones mutantes.
 * El cliente debe enviar en el header X-CSRF-Token el valor
 * que recibió del servidor al hacer login.
 * Se compara con el csrf_token embebido en el JWT (req.user.csrf_token).
 *
 * Uso: añadir este middleware DESPUÉS de verificarToken en rutas mutantes,
 * o usar verificarTokenYCsrf como combinación directa.
 */
function verificarCsrf(req, res, next) {
  // Solo aplica a métodos mutantes
  if (!METODOS_MUTANTES.includes(req.method)) {
    return next();
  }

  // Rutas de auth públicas no tienen csrf_token todavía
  if (RUTAS_PUBLICAS_CSRF.includes(req.path)) {
    return next();
  }

  const csrfHeader = req.headers['x-csrf-token'];

  if (!csrfHeader) {
    return res.status(403).json({ error: 'CSRF token requerido' });
  }

  // req.user ya fue poblado por verificarToken
  if (!req.user || !req.user.csrf_token) {
    return res.status(403).json({ error: 'Token sin CSRF embebido, inicia sesión de nuevo' });
  }

  // Comparación estricta: el header debe coincidir exactamente con el del JWT
  if (csrfHeader !== req.user.csrf_token) {
    return res.status(403).json({ error: 'CSRF token inválido' });
  }

  next();
}

/**
 * Combinación de verificarToken + verificarCsrf para rutas protegidas mutantes.
 * Úsalo como array de middlewares: [verificarTokenYCsrf]
 * o llama a los dos por separado si necesitas granularidad.
 */
const verificarTokenYCsrf = [verificarToken, verificarCsrf];

/**
 * Middleware de autorización por rol.
 */
function soloRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }
    next();
  };
}

module.exports = { verificarToken, verificarCsrf, verificarTokenYCsrf, soloRoles };