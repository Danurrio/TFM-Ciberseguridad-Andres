const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'opendrive_db',
  user: process.env.DB_USER || 'opendrive_user',
  password: process.env.DB_PASSWORD || '',
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'OpenDrive backend funcionando' });
});

app.get('/db-health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'OK', db_time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
});

app.get('/', (req, res) => {
  res.json({ message: 'Bienvenido a OpenDrive API' });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});