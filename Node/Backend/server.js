const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({
  origin: 'http://frontend-opendrive.apps-crc.testing',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Rutas
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// Health checks
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'OpenDrive backend funcionando' });
});

app.get('/db-health', async (req, res) => {
  const pool = require('./db');
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