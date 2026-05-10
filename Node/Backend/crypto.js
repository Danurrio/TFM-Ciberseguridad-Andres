const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;   // bytes
const TAG_LENGTH = 16;  // bytes de auth tag GCM

/**
 * Deriva una clave de 32 bytes a partir de FILE_ENCRYPTION_KEY.
 * Usamos SHA-256 para asegurar que siempre sea exactamente 32 bytes
 * independientemente de la longitud de la variable de entorno.
 */
function getKey() {
  const raw = process.env.FILE_ENCRYPTION_KEY;
  if (!raw) throw new Error('FILE_ENCRYPTION_KEY no está definida en las variables de entorno');
  return crypto.createHash('sha256').update(raw).digest(); // Buffer de 32 bytes
}

/**
 * Cifra un Buffer con AES-256-GCM.
 * Formato del buffer resultante: [IV (16 bytes)][AuthTag (16 bytes)][Ciphertext]
 * @param {Buffer} plainBuffer
 * @returns {Buffer} encryptedBuffer
 */
function encrypt(plainBuffer) {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Prefijamos IV + tag al ciphertext para poder descifrar luego
  return Buffer.concat([iv, tag, encrypted]);
}

/**
 * Descifra un Buffer cifrado con encrypt().
 * @param {Buffer} encryptedBuffer
 * @returns {Buffer} plainBuffer
 */
function decrypt(encryptedBuffer) {
  const key = getKey();
  const iv  = encryptedBuffer.subarray(0, IV_LENGTH);
  const tag = encryptedBuffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = encryptedBuffer.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 *
 * @param {stream.Readable} stream
 * @returns {Promise<Buffer>}
 */
function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

module.exports = { encrypt, decrypt, streamToBuffer };