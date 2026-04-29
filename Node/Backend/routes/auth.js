const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'opendrive-secret-key';

function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validarPassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/.test(password);
}

function validarTelefono(telefono) {
  return /^\+?[\d\s\-]{7,15}$/.test(telefono);
}

// Registro
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

  try {
    const password_hash = await bcrypt.hash(password, 10);
    const rolUsuario = await pool.query("SELECT id FROM roles WHERE nombre = 'usuario'");
    const rol_id = rolUsuario.rows[0]?.id || null;

    const result = await pool.query(
      `INSERT INTO usuarios (username, email, password_hash, nombre, apellido, telefono, direccion, rol_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, username, email`,
      [username, email, password_hash, nombre, apellido, telefono || null, direccion || null, rol_id]
    );

    res.status(201).json({ message: 'Usuario creado', user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'El usuario o email ya existe' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
  }

  try {
    const result = await pool.query(
      `SELECT u.*, r.nombre as rol 
       FROM usuarios u 
       LEFT JOIN roles r ON u.rol_id = r.id
       WHERE u.email = $1`,
      [email]
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

    const csrf_token = crypto.randomBytes(32).toString('hex');

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, rol: user.rol, csrf_token },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ 
      message: 'Login correcto', 
      token,
      csrf_token,
      rol: user.rol,
      username: user.username,
      password_must_change: user.password_must_change
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;