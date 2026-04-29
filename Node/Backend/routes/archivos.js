const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verificarToken } = require('../middleware/auth');

// Espacio usado por el usuario
router.get('/espacio', verificarToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        ua.cuota_maxima_bytes,
        ua.espacio_usado_bytes,
        a.nombre as almacen
       FROM usuario_almacen ua
       JOIN almacenes a ON ua.almacen_id = a.id
       WHERE ua.usuario_id = $1`,
      [req.user.id]
    );
    res.json(result.rows[0] || { cuota_maxima_bytes: 0, espacio_usado_bytes: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Notificaciones del usuario
router.get('/notificaciones', verificarToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT password_must_change, activo FROM usuarios WHERE id = $1`,
      [req.user.id]
    );
    const user = result.rows[0];
    const notificaciones = [];

    if (user.password_must_change) {
      notificaciones.push({
        tipo: 'warning',
        mensaje: 'Debes cambiar tu contraseña. Ha sido reseteada por un administrador.'
      });
    }
    if (!user.activo) {
      notificaciones.push({
        tipo: 'error',
        mensaje: 'Tu cuenta está deshabilitada. Contacta con soporte.'
      });
    }

    res.json(notificaciones);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;