const Minio = require('minio');

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'minio',
  port: parseInt(process.env.MINIO_PORT) || 9000,
  useSSL: false,
  accessKey: process.env.MINIO_ROOT_USER || 'opendrive_minio',
  secretKey: process.env.MINIO_ROOT_PASSWORD 
});

const BUCKET = process.env.MINIO_BUCKET || 'opendrive';

module.exports = { minioClient, BUCKET };