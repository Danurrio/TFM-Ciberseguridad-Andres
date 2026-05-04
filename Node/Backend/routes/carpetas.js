const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verificarToken } = require('../middleware/auth');
const { logUser } = require('../logger');

// ─── HELPERS ────────────────────────────────────────────────────────────────

// Obtiene acceso del usuario a una bóveda (reutilizamos lógica de bovedas)
async function obtenerAccesoBoveda(bovedaId, usuarioId) {
  const creador = await pool.query(
    `SELECT id FROM bovedas WHERE id = $1 AND creador_id = $2`,
    [bovedaId, usuarioId]
  );
  if (creador.rows.length > 0) {
    return { esCreador: true, puede_leer: true, puede_subir: true, puede_borrar: true, puede_gestionar: true };
  }
  const miembro = await pool.query(
    `SELECT puede_leer, puede_subir, puede_borrar, puede_gestionar
     FROM boveda_miembros WHERE boveda_id = $1 AND usuario_id = $2`,
    [bovedaId, usuarioId]
  );
  if (miembro.rows.length > 0) {
    return { esCreador: false, ...miembro.rows[0] };
  }
  return null;
}

// Verifica si el usuario tiene acceso a una carpeta dentro de una bóveda
// Hereda los permisos de la bóveda, con posibilidad de permisos específicos de carpeta
async function obtenerAccesoCarpeta(carpetaId, usuarioId) {
  // Obtener datos de la carpeta
  const carpeta = await pool.query(
    `SELECT * FROM carpetas WHERE id = $1`,
    [carpetaId]
  );
  if (carpeta.rows.length === 0) return null;

  const c = carpeta.rows[0];

  // Si es carpeta de almacén personal (sin boveda_id), solo el propietario
  if (!c.boveda_id) {
    if (c.creador_id === usuarioId) {
      return { esCreador: true, puede_leer: true, puede_subir: true, puede_borrar: true, puede_gestionar: true, carpeta: c };
    }
    return null;
  }

  // Si tiene bóveda, verificar acceso a la bóveda
  const accesoBoveda = await obtenerAccesoBoveda(c.boveda_id, usuarioId);
  if (!accesoBoveda) return null;

  // Verificar si hay permisos específicos de carpeta
  const permisosCarpeta = await pool.query(
    `SELECT * FROM carpeta_permisos WHERE carpeta_id = $1 AND usuario_id = $2`,
    [carpetaId, usuarioId]
  );

  // Si hay permisos específicos de carpeta, usarlos (solo si no es creador de bóveda ni tiene gestión)
  if (permisosCarpeta.rows.length > 0 && !accesoBoveda.esCreador && !accesoBoveda.puede_gestionar) {
    const pc = permisosCarpeta.rows[0];
    return {
      esCreador: c.creador_id === usuarioId,
      puede_leer: pc.puede_leer,
      puede_subir: pc.puede_subir,
      puede_borrar: pc.puede_borrar,
      puede_gestionar: false,
      boveda: accesoBoveda,
      carpeta: c
    };
  }

  // Si no hay permisos específicos, hereda de la bóveda
  return {
    esCreador: c.creador_id === usuarioId,
    puede_leer: accesoBoveda.puede_leer,
    puede_subir: accesoBoveda.puede_subir,
    puede_borrar: accesoBoveda.puede_borrar,
    puede_gestionar: accesoBoveda.puede_gestionar || accesoBoveda.esCreador,
    boveda: accesoBoveda,
    carpeta: c
  };
}

// ─── RUTAS DE CARPETAS EN BÓVEDA ────────────────────────────────────────────

// Listar carpetas de una bóveda en un nivel (raíz o dentro de una carpeta)
// GET /carpetas/boveda/:bovedaId?parent_id=xxx
router.get('/boveda/:bovedaId', verificarToken, async (req, res) => {
  const { bovedaId } = req.params;
  const { parent_id } = req.query; // null = raíz

  const acceso = await obtenerAccesoBoveda(bovedaId, req.user.id);
  if (!acceso || !acceso.puede_leer) return res.status(403).json({ error: 'Sin acceso a esta bóveda' });

  try {
    const result = await pool.query(
      `SELECT c.*, u.username as creador_username
       FROM carpetas c
       LEFT JOIN usuarios u ON c.creador_id = u.id
       WHERE c.boveda_id = $1 AND c.parent_id IS NOT DISTINCT FROM $2
       ORDER BY c.nombre ASC`,
      [bovedaId, parent_id || null]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear carpeta en bóveda
// POST /carpetas/boveda/:bovedaId
router.post('/boveda/:bovedaId', verificarToken, async (req, res) => {
  const { bovedaId } = req.params;
  const { nombre, parent_id } = req.body;

  if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });

  const acceso = await obtenerAccesoBoveda(bovedaId, req.user.id);
  if (!acceso || !acceso.puede_subir) return res.status(403).json({ error: 'Sin permiso para crear carpetas' });

  try {
    // Si hay parent_id, verificar que pertenece a esta bóveda
    if (parent_id) {
      const padre = await pool.query(`SELECT id FROM carpetas WHERE id = $1 AND boveda_id = $2`, [parent_id, bovedaId]);
      if (padre.rows.length === 0) return res.status(404).json({ error: 'Carpeta padre no encontrada' });
    }

    const result = await pool.query(
      `INSERT INTO carpetas (nombre, boveda_id, parent_id, creador_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [nombre.trim(), bovedaId, parent_id || null, req.user.id]
    );
    await logUser(req.user.id, 'CREAR_CARPETA', `Carpeta: ${nombre} en bóveda ${bovedaId}`, req.ip);
    res.status(201).json({ message: 'Carpeta creada', carpeta: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar carpeta de bóveda (elimina en cascada subcarpetas y archivos lógicamente)
// DELETE /carpetas/boveda/:bovedaId/:carpetaId
router.delete('/boveda/:bovedaId/:carpetaId', verificarToken, async (req, res) => {
  const { bovedaId, carpetaId } = req.params;

  const acceso = await obtenerAccesoBoveda(bovedaId, req.user.id);
  if (!acceso) return res.status(403).json({ error: 'Sin acceso a esta bóveda' });

  try {
    const carpeta = await pool.query(
      `SELECT * FROM carpetas WHERE id = $1 AND boveda_id = $2`,
      [carpetaId, bovedaId]
    );
    if (carpeta.rows.length === 0) return res.status(404).json({ error: 'Carpeta no encontrada' });

    // Solo puede eliminar el creador de la carpeta, creador de la bóveda o gestores
    const esCreadorCarpeta = carpeta.rows[0].creador_id === req.user.id;
    if (!esCreadorCarpeta && !acceso.esCreador && !acceso.puede_gestionar) {
      return res.status(403).json({ error: 'Sin permiso para eliminar esta carpeta' });
    }

    // Soft delete de todos los archivos dentro (recursivo vía SQL)
    // Primero obtenemos todos los ids de subcarpetas recursivamente
    await pool.query(
      `WITH RECURSIVE sub AS (
         SELECT id FROM carpetas WHERE id = $1
         UNION ALL
         SELECT c.id FROM carpetas c JOIN sub ON c.parent_id = sub.id
       )
       UPDATE archivos SET eliminado = true
       WHERE carpeta_id IN (SELECT id FROM sub) AND boveda_id = $2`,
      [carpetaId, bovedaId]
    );

    // Eliminar la carpeta (cascade borrará subcarpetas en la BD)
    await pool.query(`DELETE FROM carpetas WHERE id = $1`, [carpetaId]);

    await logUser(req.user.id, 'ELIMINAR_CARPETA', `Carpeta ID: ${carpetaId}`, req.ip);
    res.json({ message: 'Carpeta eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener permisos de una carpeta
// GET /carpetas/:carpetaId/permisos
router.get('/:carpetaId/permisos', verificarToken, async (req, res) => {
  const { carpetaId } = req.params;

  const acceso = await obtenerAccesoCarpeta(carpetaId, req.user.id);
  if (!acceso) return res.status(403).json({ error: 'Sin acceso a esta carpeta' });
  if (!acceso.puede_gestionar && !acceso.esCreador) return res.status(403).json({ error: 'Solo gestores pueden ver permisos de carpeta' });

  try {
    const result = await pool.query(
      `SELECT cp.*, u.username, u.email
       FROM carpeta_permisos cp
       JOIN usuarios u ON cp.usuario_id = u.id
       WHERE cp.carpeta_id = $1`,
      [carpetaId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Establecer/actualizar permisos de carpeta para un usuario
// POST /carpetas/:carpetaId/permisos
router.post('/:carpetaId/permisos', verificarToken, async (req, res) => {
  const { carpetaId } = req.params;
  const { identificador, puede_leer = true, puede_subir = false, puede_borrar = false } = req.body;

  if (!identificador) return res.status(400).json({ error: 'Indica el usuario o email' });

  const acceso = await obtenerAccesoCarpeta(carpetaId, req.user.id);
  if (!acceso) return res.status(403).json({ error: 'Sin acceso a esta carpeta' });
  if (!acceso.puede_gestionar && !acceso.esCreador) return res.status(403).json({ error: 'Solo gestores pueden asignar permisos' });

  try {
    const usuario = await pool.query(
      `SELECT id, username FROM usuarios WHERE username = $1 OR email = $1`,
      [identificador]
    );
    if (usuario.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    const target = usuario.rows[0];

    await pool.query(
      `INSERT INTO carpeta_permisos (carpeta_id, usuario_id, puede_leer, puede_subir, puede_borrar)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (carpeta_id, usuario_id) DO UPDATE
       SET puede_leer = $3, puede_subir = $4, puede_borrar = $5`,
      [carpetaId, target.id, puede_leer, puede_subir, puede_borrar]
    );

    await logUser(req.user.id, 'ASIGNAR_PERMISO_CARPETA', `Usuario ${target.username} en carpeta ${carpetaId}`, req.ip);
    res.json({ message: `Permisos actualizados para ${target.username}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Revocar permisos de carpeta
// DELETE /carpetas/:carpetaId/permisos/:uid
router.delete('/:carpetaId/permisos/:uid', verificarToken, async (req, res) => {
  const { carpetaId, uid } = req.params;

  const acceso = await obtenerAccesoCarpeta(carpetaId, req.user.id);
  if (!acceso) return res.status(403).json({ error: 'Sin acceso a esta carpeta' });
  if (!acceso.puede_gestionar && !acceso.esCreador) return res.status(403).json({ error: 'Solo gestores pueden revocar permisos' });

  try {
    await pool.query(
      `DELETE FROM carpeta_permisos WHERE carpeta_id = $1 AND usuario_id = $2`,
      [carpetaId, uid]
    );
    res.json({ message: 'Permiso revocado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── RUTAS DE CARPETAS EN ALMACÉN PERSONAL ──────────────────────────────────

// Listar carpetas del almacén personal
// GET /carpetas/personal?parent_id=xxx
router.get('/personal', verificarToken, async (req, res) => {
  const { parent_id } = req.query;

  try {
    const result = await pool.query(
      `SELECT c.*, u.username as creador_username
       FROM carpetas c
       LEFT JOIN usuarios u ON c.creador_id = u.id
       WHERE c.creador_id = $1 AND c.boveda_id IS NULL AND c.parent_id IS NOT DISTINCT FROM $2
       ORDER BY c.nombre ASC`,
      [req.user.id, parent_id || null]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear carpeta en almacén personal
// POST /carpetas/personal
router.post('/personal', verificarToken, async (req, res) => {
  const { nombre, parent_id } = req.body;

  if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });

  try {
    if (parent_id) {
      const padre = await pool.query(
        `SELECT id FROM carpetas WHERE id = $1 AND creador_id = $2 AND boveda_id IS NULL`,
        [parent_id, req.user.id]
      );
      if (padre.rows.length === 0) return res.status(404).json({ error: 'Carpeta padre no encontrada' });
    }

    const result = await pool.query(
      `INSERT INTO carpetas (nombre, boveda_id, parent_id, creador_id)
       VALUES ($1, NULL, $2, $3) RETURNING *`,
      [nombre.trim(), parent_id || null, req.user.id]
    );
    await logUser(req.user.id, 'CREAR_CARPETA_PERSONAL', `Carpeta: ${nombre}`, req.ip);
    res.status(201).json({ message: 'Carpeta creada', carpeta: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar carpeta del almacén personal
// DELETE /carpetas/personal/:carpetaId
router.delete('/personal/:carpetaId', verificarToken, async (req, res) => {
  const { carpetaId } = req.params;

  try {
    const carpeta = await pool.query(
      `SELECT * FROM carpetas WHERE id = $1 AND creador_id = $2 AND boveda_id IS NULL`,
      [carpetaId, req.user.id]
    );
    if (carpeta.rows.length === 0) return res.status(404).json({ error: 'Carpeta no encontrada' });

    // Soft delete de archivos dentro
    await pool.query(
      `WITH RECURSIVE sub AS (
         SELECT id FROM carpetas WHERE id = $1
         UNION ALL
         SELECT c.id FROM carpetas c JOIN sub ON c.parent_id = sub.id
       )
       UPDATE archivos SET eliminado = true
       WHERE carpeta_id IN (SELECT id FROM sub) AND propietario_id = $2`,
      [carpetaId, req.user.id]
    );

    await pool.query(`DELETE FROM carpetas WHERE id = $1`, [carpetaId]);

    await logUser(req.user.id, 'ELIMINAR_CARPETA_PERSONAL', `Carpeta ID: ${carpetaId}`, req.ip);
    res.json({ message: 'Carpeta eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;