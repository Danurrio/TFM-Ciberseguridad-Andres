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

// Listar archivos del usuario
router.get('/lista', verificarToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nombre, tipo, tamanio_bytes, creado_en
       FROM archivos
       WHERE propietario_id = $1 AND eliminado = false
       ORDER BY creado_en DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Subir archivo
router.post('/subir', verificarToken, upload.single('archivo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se ha enviado ningún archivo' });
  }

  const { originalname, mimetype, buffer, size } = req.file;
  const nombreObjeto = `${req.user.id}/${Date.now()}-${originalname}`;

  try {
    // Subir a MinIO
    await minioClient.putObject(BUCKET, nombreObjeto, buffer, size, {
      'Content-Type': mimetype
    });

    // Guardar en PostgreSQL
    const result = await pool.query(
      `INSERT INTO archivos (nombre, nombre_objeto, tipo, tamanio_bytes, propietario_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, nombre, tipo, tamanio_bytes, creado_en`,
      [originalname, nombreObjeto, mimetype, size, req.user.id]
    );
    await logUser(req.user.id, 'SUBIR_ARCHIVO', `Archivo: ${originalname}`, req.ip);
 

    // Actualizar espacio usado
    await pool.query(
      `UPDATE usuario_almacen SET espacio_usado_bytes = espacio_usado_bytes + $1
       WHERE usuario_id = $2`,
      [size, req.user.id]
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

// Eliminar archivo (papelera)
router.delete('/eliminar/:id', verificarToken, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE archivos SET eliminado = true WHERE id = $1 AND propietario_id = $2 RETURNING tamanio_bytes`,
      [req.params.id, req.user.id]
    );
    await logUser(req.user.id, 'ELIMINAR_ARCHIVO', `Archivo ID: ${req.params.id}`, req.ip);


    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    // Actualizar espacio usado
    await pool.query(
      `UPDATE usuario_almacen SET espacio_usado_bytes = espacio_usado_bytes - $1
       WHERE usuario_id = $2`,
      [result.rows[0].tamanio_bytes, req.user.id]
    );

    res.json({ message: 'Archivo eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;