const express = require('express');
const router = express.Router();
const multer = require('multer');
const pool = require('../db');
const { minioClient, BUCKET } = require('../minio');
const { verificarToken } = require('../middleware/auth');
const { logUser } = require('../logger');

const upload = multer({ storage: multer.memoryStorage() });

// Espacio usado por el usuario
router.get('/espacio', verificarToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ua.cuota_maxima_bytes, ua.espacio_usado_bytes, a.nombre as almacen
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

// Notificaciones
router.get('/notificaciones', verificarToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT password_must_change, activo FROM usuarios WHERE id = $1`,
      [req.user.id]
    );
    const user = result.rows[0];
    const notificaciones = [];
    if (user.password_must_change) {
      notificaciones.push({ tipo: 'warning', mensaje: 'Debes cambiar tu contraseña. Ha sido reseteada por un administrador.' });
    }
    if (!user.activo) {
      notificaciones.push({ tipo: 'error', mensaje: 'Tu cuenta está deshabilitada. Contacta con soporte.' });
    }
    res.json(notificaciones);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar archivos del usuario (soporte de carpeta_id)
router.get('/lista', verificarToken, async (req, res) => {
  const { carpeta_id } = req.query;
  try {
    const result = await pool.query(
      `SELECT id, nombre, tipo, tamanio_bytes, creado_en, carpeta_id
       FROM archivos
       WHERE propietario_id = $1
         AND eliminado = false
         AND boveda_id IS NULL
         AND carpeta_id IS NOT DISTINCT FROM $2
       ORDER BY creado_en DESC`,
      [req.user.id, carpeta_id || null]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PAPELERA ────────────────────────────────────────────────────────────────

// Listar archivos en la papelera (solo almacén personal)
router.get('/papelera', verificarToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nombre, tipo, tamanio_bytes, creado_en, nombre_objeto
       FROM archivos
       WHERE propietario_id = $1
         AND eliminado = true
         AND boveda_id IS NULL
       ORDER BY creado_en DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Restaurar archivo de la papelera
router.patch('/papelera/:id/restaurar', verificarToken, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE archivos SET eliminado = false
       WHERE id = $1 AND propietario_id = $2 AND eliminado = true AND boveda_id IS NULL
       RETURNING tamanio_bytes, nombre`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Archivo no encontrado en la papelera' });
    }
    // Volver a contar el espacio
    await pool.query(
      `UPDATE usuario_almacen SET espacio_usado_bytes = espacio_usado_bytes + $1
       WHERE usuario_id = $2`,
      [result.rows[0].tamanio_bytes, req.user.id]
    );
    await logUser(req.user.id, 'RESTAURAR_ARCHIVO', `Archivo: ${result.rows[0].nombre}`, req.ip);
    res.json({ message: 'Archivo restaurado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar archivo permanentemente de la papelera (borra de MinIO y BD)
router.delete('/papelera/:id', verificarToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nombre, nombre_objeto, tamanio_bytes
       FROM archivos
       WHERE id = $1 AND propietario_id = $2 AND eliminado = true AND boveda_id IS NULL`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Archivo no encontrado en la papelera' });
    }
    const archivo = result.rows[0];

    // Borrar de MinIO
    try {
      await minioClient.removeObject(BUCKET, archivo.nombre_objeto);
    } catch (minioErr) {
      console.error('Error borrando de MinIO:', minioErr.message);
      // Continuamos aunque falle MinIO para no dejar registros huérfanos en BD
    }

    // Borrar de PostgreSQL
    await pool.query(`DELETE FROM archivos WHERE id = $1`, [archivo.id]);

    await logUser(req.user.id, 'ELIMINAR_PERMANENTE', `Archivo: ${archivo.nombre}`, req.ip);
    res.json({ message: 'Archivo eliminado permanentemente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vaciar papelera completa (elimina permanentemente todos los archivos eliminados)
router.delete('/papelera', verificarToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nombre_objeto FROM archivos
       WHERE propietario_id = $1 AND eliminado = true AND boveda_id IS NULL`,
      [req.user.id]
    );

    // Borrar todos de MinIO
    for (const archivo of result.rows) {
      try {
        await minioClient.removeObject(BUCKET, archivo.nombre_objeto);
      } catch (minioErr) {
        console.error('Error borrando de MinIO:', minioErr.message);
      }
    }

    // Borrar todos de PostgreSQL
    await pool.query(
      `DELETE FROM archivos WHERE propietario_id = $1 AND eliminado = true AND boveda_id IS NULL`,
      [req.user.id]
    );

    await logUser(req.user.id, 'VACIAR_PAPELERA', `${result.rows.length} archivos eliminados`, req.ip);
    res.json({ message: `Papelera vaciada (${result.rows.length} archivos eliminados)` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ARCHIVOS ────────────────────────────────────────────────────────────────

// Subir archivo al almacén personal
router.post('/subir', verificarToken, upload.single('archivo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se ha enviado ningún archivo' });
  }

  const { originalname, mimetype, buffer, size } = req.file;
  const carpeta_id = req.body.carpeta_id || null;
  const nombreObjeto = `${req.user.id}/${Date.now()}-${originalname}`;

  try {
    if (carpeta_id) {
      const carpeta = await pool.query(
        `SELECT id FROM carpetas WHERE id = $1 AND creador_id = $2 AND boveda_id IS NULL`,
        [carpeta_id, req.user.id]
      );
      if (carpeta.rows.length === 0) {
        return res.status(404).json({ error: 'Carpeta no encontrada' });
      }
    }

    const cuota = await pool.query(
      `SELECT cuota_maxima_bytes, espacio_usado_bytes, almacen_id FROM usuario_almacen WHERE usuario_id = $1`,
      [req.user.id]
    );
    if (cuota.rows.length === 0) {
      return res.status(403).json({ error: 'No tienes ningún almacén asignado' });
    }

    const { almacen_id } = cuota.rows[0];
    const cuota_maxima_bytes = parseInt(cuota.rows[0].cuota_maxima_bytes);
    const espacio_usado_bytes = parseInt(cuota.rows[0].espacio_usado_bytes);

    if ((espacio_usado_bytes + size) > cuota_maxima_bytes) {
      return res.status(400).json({ error: 'No tienes espacio suficiente' });
    }

    await minioClient.putObject(BUCKET, nombreObjeto, buffer, size, { 'Content-Type': mimetype });

    const result = await pool.query(
      `INSERT INTO archivos (nombre, nombre_objeto, tipo, tamanio_bytes, propietario_id, almacen_id, carpeta_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, nombre, tipo, tamanio_bytes, creado_en, carpeta_id`,
      [originalname, nombreObjeto, mimetype, size, req.user.id, almacen_id, carpeta_id]
    );

    await logUser(req.user.id, 'SUBIR_ARCHIVO', `Archivo: ${originalname}`, req.ip);

    await pool.query(
      `UPDATE usuario_almacen SET espacio_usado_bytes = espacio_usado_bytes + $1
       WHERE usuario_id = $2 AND almacen_id = $3`,
      [size, req.user.id, almacen_id]
    );

    res.status(201).json({ message: 'Archivo subido', archivo: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Descargar archivo
router.get('/descargar/:id', verificarToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM archivos WHERE id = $1 AND propietario_id = $2 AND eliminado = false`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    const archivo = result.rows[0];
    const stream = await minioClient.getObject(BUCKET, archivo.nombre_objeto);
    res.setHeader('Content-Disposition', `attachment; filename="${archivo.nombre}"`);
    res.setHeader('Content-Type', archivo.tipo);
    await logUser(req.user.id, 'DESCARGAR_ARCHIVO', `Archivo: ${archivo.nombre}`, req.ip);
    stream.pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mover archivo a la papelera (soft delete)
router.delete('/eliminar/:id', verificarToken, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE archivos SET eliminado = true WHERE id = $1 AND propietario_id = $2 AND eliminado = false
       RETURNING tamanio_bytes`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    await pool.query(
      `UPDATE usuario_almacen SET espacio_usado_bytes = espacio_usado_bytes - $1
       WHERE usuario_id = $2`,
      [result.rows[0].tamanio_bytes, req.user.id]
    );
    await logUser(req.user.id, 'ELIMINAR_ARCHIVO', `Archivo ID: ${req.params.id}`, req.ip);
    res.json({ message: 'Archivo movido a la papelera' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;