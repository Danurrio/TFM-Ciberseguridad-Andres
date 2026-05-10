const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({
  origin: 'https://frontend-opendrive.apps-crc.testing',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const archivosRoutes = require('./routes/archivos');
const logsRoutes = require('./routes/logs');
const bovedaRoutes = require('./routes/bovedas');
const carpetasRoutes = require('./routes/carpetas');

app.use('/bovedas', bovedaRoutes);
app.use('/logs', logsRoutes);
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/archivos', archivosRoutes);
app.use('/carpetas', carpetasRoutes);

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

app.listen(PORT, async () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);

  try {
    const { minioClient, BUCKET } = require('./minio');
    const exists = await minioClient.bucketExists(BUCKET);
    if (!exists) {
      await minioClient.makeBucket(BUCKET);
      console.log(`Bucket '${BUCKET}' creado correctamente`);
    } else {
      console.log(`Bucket '${BUCKET}' ya existe`);
    }
  } catch (err) {
    console.error('Error al verificar/crear bucket de MinIO:', err.message);
  }
});