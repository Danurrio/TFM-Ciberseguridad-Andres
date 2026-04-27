const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'opendrive-secret-key';

// Validaciones
function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validarPassword(password) {
  // Mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/.test(password);
}

function validarTelefono(telefono) {
  // Acepta formatos internacionales: +34 612345678, 612345678, etc.
  return /^\+?[\d\s\-]{7,15}$/.test(telefono);
}

// Registro
router.post('/register', async (req, res) => {
  const { username, email, password, nombre, apellido, telefono, direccion } = req.body;

  // Campos obligatorios
  if (!username || !email || !password || !nombre || !apellido) {
    return res.status(400).json({ error: 'Nombre, apellido, usuario, email y contraseña son obligatorios' });
  }

  // Validar email
  if (!validarEmail(email)) {
    return res.status(400).json({ error: 'El email no tiene un formato válido' });
  }

  // Validar contraseña
  if (!validarPassword(password)) {
    return res.status(400).json({ 
      error: 'La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial' 
    });
  }

  // Validar teléfono si se proporciona
  if (telefono && !validarTelefono(telefono)) {
    return res.status(400).json({ error: 'El teléfono no tiene un formato válido' });
  }

  try {
    const password_hash = await bcrypt.hash(password, 10);
    const csrf_token = crypto.randomBytes(32).toString('hex');

    const result = await pool.query(
      `INSERT INTO usuarios (username, email, password_hash, nombre, apellido, telefono, direccion, csrf_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, username, email`,
      [username, email, password_hash, nombre, apellido, telefono || null, direccion || null, csrf_token]
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
      'SELECT * FROM usuarios WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    // Regenerar CSRF token en cada login
    const csrf_token = crypto.randomBytes(32).toString('hex');
    await pool.query(
      'UPDATE usuarios SET csrf_token = $1 WHERE id = $2',
      [csrf_token, user.id]
    );

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, csrf_token },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ 
      message: 'Login correcto', 
      token,
      csrf_token
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;