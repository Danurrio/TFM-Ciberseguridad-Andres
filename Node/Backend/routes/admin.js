const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verificarToken, soloRoles } = require('../middleware/auth');
const { logAdmin } = require('../logger');

const ROLES_ADMIN = ['superadmin', 'admin', 'soporte'];

router.get('/usuarios', verificarToken, soloRoles(...ROLES_ADMIN), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.email, u.nombre, u.apellido,
              u.telefono, u.activo, u.password_must_change, u.creado_en,
              r.nombre as rol
       FROM usuarios u
       LEFT JOIN roles r ON u.rol_id = r.id
       ORDER BY u.creado_en DESC`
    );
    await logAdmin(req.user.id, 'VER_USUARIOS', null, null, null, req.ip);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/usuarios/:id/activo', verificarToken, soloRoles('superadmin', 'admin'), async (req, res) => {
  const { id } = req.params;
  const { activo } = req.body;

  try {
    const target = await pool.query(
      `SELECT r.nombre as rol FROM usuarios u LEFT JOIN roles r ON u.rol_id = r.id WHERE u.id = $1`,
      [id]
    );

    if (target.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    const rolObjetivo = target.rows[0].rol;
    const rolSolicitante = req.user.rol;

    if (rolSolicitante === 'admin' && ['admin', 'superadmin'].includes(rolObjetivo)) {
      return res.status(403).json({ error: 'No puedes deshabilitar a alguien de tu mismo rango o superior' });
    }

    await pool.query('UPDATE usuarios SET activo = $1 WHERE id = $2', [activo, id]);
    await logAdmin(req.user.id, activo ? 'HABILITAR_USUARIO' : 'DESHABILITAR_USUARIO', 'usuarios', id, null, req.ip);
    res.json({ message: `Usuario ${activo ? 'habilitado' : 'deshabilitado'} correctamente` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/usuarios/:id/forzar-password', verificarToken, soloRoles('superadmin', 'admin', 'soporte'), async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE usuarios SET password_must_change = true WHERE id = $1', [id]);
    await logAdmin(req.user.id, 'FORZAR_PASSWORD', 'usuarios', id, null, req.ip);
    res.json({ message: 'Se ha forzado el cambio de contraseña' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/usuarios/:id/rol', verificarToken, soloRoles('superadmin', 'admin'), async (req, res) => {
  const { id } = req.params;
  const { rol_nombre } = req.body;
  const rolSolicitante = req.user.rol;

  if (rolSolicitante === 'admin' && ['admin', 'superadmin'].includes(rol_nombre)) {
    return res.status(403).json({ error: 'No puedes asignar este rol' });
  }

  try {
    const rol = await pool.query('SELECT id FROM roles WHERE nombre = $1', [rol_nombre]);
    if (rol.rows.length === 0) return res.status(404).json({ error: 'Rol no encontrado' });

    await pool.query('UPDATE usuarios SET rol_id = $1 WHERE id = $2', [rol.rows[0].id, id]);
    await logAdmin(req.user.id, 'CAMBIAR_ROL', 'usuarios', id, `Nuevo rol: ${rol_nombre}`, req.ip);
    res.json({ message: 'Rol actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/usuarios/:id', verificarToken, soloRoles('superadmin'), async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
    await logAdmin(req.user.id, 'ELIMINAR_USUARIO', 'usuarios', id, null, req.ip);
    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;