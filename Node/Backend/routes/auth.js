const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db');
const { logUser } = require('../logger');
const { verificarToken, verificarCsrf } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET;

// ── Cambiar contraseña (ruta mutante → requiere CSRF) ────────────────────────
router.post('/cambiar-password', verificarToken, verificarCsrf, async (req, res) => {
  const { password_actual, password_nueva } = req.body;

  if (!password_actual || !password_nueva) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
  if (!passwordRegex.test(password_nueva)) {
    return res.status(400).json({ error: 'La contraseña no cumple los requisitos de seguridad' });
  }

  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    const valid = await bcrypt.compare(password_actual, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'La contraseña actual no es correcta' });
    }

    const password_hash = await bcrypt.hash(password_nueva, 10);
    await pool.query(
      'UPDATE usuarios SET password_hash = $1, password_must_change = false WHERE id = $2',
      [password_hash, req.user.id]
    );

    await logUser(req.user.id, 'CAMBIAR_PASSWORD', 'Cambio de contraseña exitoso', req.ip);
    res.json({ message: 'Contraseña cambiada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validarPassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/.test(password);
}

function validarTelefono(telefono) {
  return /^\+?[\d\s\-]{7,15}$/.test(telefono);
}

// ── Registro (público, sin CSRF — el usuario aún no tiene token) ─────────────
router.post('/register', async (req, res) => {
  const { username, email, password, nombre, apellido, telefono, direccion } = req.body;

  if (!username || !email || !password || !nombre || !apellido) {
    return res.status(400).json({ error: 'Nombre, apellido, usuario, email y contraseña son obligatorios' });
  }

  if (!validarEmail(email)) {
    return res.status(400).json({ error: 'El email no tiene un formato válido' });
  }

  if (!validarPassword(password)) {
    return res.status(400).json({
      error: 'La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial'
    });
  }

  if (telefono && !validarTelefono(telefono)) {
    return res.status(400).json({ error: 'El teléfono no tiene un formato válido' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const password_hash = await bcrypt.hash(password, 10);
    const rolUsuario = await client.query("SELECT id FROM roles WHERE nombre = 'usuario'");
    const rol_id = rolUsuario.rows[0]?.id || null;

    const result = await client.query(
      `INSERT INTO usuarios (username, email, password_hash, nombre, apellido, telefono, direccion, rol_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, username, email`,
      [username, email, password_hash, nombre, apellido, telefono || null, direccion || null, rol_id]
    );

    const nuevoUsuario = result.rows[0];

    const CUOTA_DEFAULT = 20 * 1024 * 1024;
    const almacen = await client.query(
      `INSERT INTO almacenes (nombre, espacio_total_bytes)
       VALUES ($1, $2) RETURNING id`,
      [`Personal de ${username}`, CUOTA_DEFAULT]
    );
    await client.query(
      `INSERT INTO usuario_almacen (usuario_id, almacen_id, cuota_maxima_bytes, espacio_usado_bytes)
       VALUES ($1, $2, $3, 0)`,
      [nuevoUsuario.id, almacen.rows[0].id, CUOTA_DEFAULT]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Usuario creado', user: nuevoUsuario });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: 'El usuario o email ya existe' });
    }
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ── Login (público, genera csrf_token embebido en JWT) ───────────────────────
router.post('/login', async (req, res) => {
  const { identificador, password } = req.body;

  if (!identificador || !password) {
    return res.status(400).json({ error: 'Usuario/email y contraseña son obligatorios' });
  }

  try {
    const result = await pool.query(
      `SELECT u.*, r.nombre as rol
       FROM usuarios u
       LEFT JOIN roles r ON u.rol_id = r.id
       WHERE u.email = $1 OR u.username = $1`,
      [identificador]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const user = result.rows[0];

    if (!user.activo) {
      return res.status(403).json({ error: 'Tu cuenta está deshabilitada. Contacta con soporte.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    // csrf_token: valor aleatorio embebido en el JWT.
    // El cliente lo guarda y lo reenvía en X-CSRF-Token en cada petición mutante.
    const csrf_token = crypto.randomBytes(32).toString('hex');

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, rol: user.rol, csrf_token },
      JWT_SECRET,
      { expiresIn: '2h' } // Reducido de 8h a 2h
    );

    await logUser(user.id, 'LOGIN', `Login desde ${req.ip}`, req.ip);

    res.json({
      message: 'Login correcto',
      token,
      csrf_token,       // el cliente debe guardarlo y enviarlo en X-CSRF-Token
      rol: user.rol,
      username: user.username,
      password_must_change: user.password_must_change
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;