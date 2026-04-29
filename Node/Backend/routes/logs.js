const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verificarToken, soloRoles } = require('../middleware/auth');

// Logs de administración
router.get('/admin', verificarToken, soloRoles('superadmin', 'admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT al.*, u.username as admin_username
       FROM admin_logs al
       LEFT JOIN usuarios u ON al.admin_id = u.id
       ORDER BY al.creado_en DESC
       LIMIT 500`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logs de usuarios
router.get('/usuarios', verificarToken, soloRoles('superadmin', 'admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ul.*, u.username
       FROM user_logs ul
       LEFT JOIN usuarios u ON ul.usuario_id = u.id
       ORDER BY ul.creado_en DESC
       LIMIT 500`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;