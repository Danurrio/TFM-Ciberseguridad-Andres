const pool = require('./db');

async function logAdmin(admin_id, accion, entidad = null, entidad_id = null, detalle = null, ip = null) {
  try {
    await pool.query(
      `INSERT INTO admin_logs (admin_id, accion, entidad, entidad_id, detalle, ip)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [admin_id, accion, entidad, entidad_id, detalle, ip]
    );
  } catch (err) {
    console.error('Error guardando admin log:', err.message);
  }
}

async function logUser(usuario_id, accion, detalle = null, ip = null) {
  try {
    await pool.query(
      `INSERT INTO user_logs (usuario_id, accion, detalle, ip)
       VALUES ($1, $2, $3, $4)`,
      [usuario_id, accion, detalle, ip]
    );
  } catch (err) {
    console.error('Error guardando user log:', err.message);
  }
}

module.exports = { logAdmin, logUser };