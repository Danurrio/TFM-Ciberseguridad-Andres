const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verificarToken, soloRoles } = require('../middleware/auth');


router.get('/admin', verificarToken, soloRoles('superadmin', 'admin'), async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200); 
  const page  = Math.max(parseInt(req.query.page)  || 1, 1);
  const offset = (page - 1) * limit;

  try {
    const [data, total] = await Promise.all([
      pool.query(
        `SELECT al.*, u.username as admin_username
         FROM admin_logs al
         LEFT JOIN usuarios u ON al.admin_id = u.id
         ORDER BY al.creado_en DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM admin_logs`)
    ]);

    res.json({
      logs: data.rows,
      total: parseInt(total.rows[0].count),
      page,
      limit,
      pages: Math.ceil(total.rows[0].count / limit)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get('/usuarios', verificarToken, soloRoles('superadmin', 'admin'), async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const page  = Math.max(parseInt(req.query.page)  || 1, 1);
  const offset = (page - 1) * limit;

  try {
    const [data, total] = await Promise.all([
      pool.query(
        `SELECT ul.*, u.username
         FROM user_logs ul
         LEFT JOIN usuarios u ON ul.usuario_id = u.id
         ORDER BY ul.creado_en DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM user_logs`)
    ]);

    res.json({
      logs: data.rows,
      total: parseInt(total.rows[0].count),
      page,
      limit,
      pages: Math.ceil(total.rows[0].count / limit)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;