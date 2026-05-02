-- 1. Tabla de Roles Globales
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    descripcion TEXT
);

-- 2. Tabla de Usuarios
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    direccion TEXT,
    rol_id INT REFERENCES roles(id) ON DELETE SET NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Almacenes (Espacios tipo Drive)
CREATE TABLE almacenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    espacio_total_bytes BIGINT NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Catálogo de Permisos
CREATE TABLE permisos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    descripcion TEXT
);

-- 5. Relación Usuario <-> Almacén (Gestión de Cuotas)
CREATE TABLE usuario_almacen (
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    almacen_id UUID REFERENCES almacenes(id) ON DELETE CASCADE,
    cuota_maxima_bytes BIGINT NOT NULL,
    espacio_usado_bytes BIGINT DEFAULT 0,
    PRIMARY KEY (usuario_id, almacen_id)
);

-- 6. Relación Usuario <-> Almacén <-> Permisos (Granularidad)
CREATE TABLE usuario_almacen_permisos (
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    almacen_id UUID REFERENCES almacenes(id) ON DELETE CASCADE,
    permiso_id INT REFERENCES permisos(id) ON DELETE CASCADE,
    PRIMARY KEY (usuario_id, almacen_id, permiso_id),
    FOREIGN KEY (usuario_id, almacen_id) REFERENCES usuario_almacen(usuario_id, almacen_id) ON DELETE CASCADE
);

INSERT INTO roles (nombre, descripcion) VALUES
  ('superadmin', 'Control total del sistema sin restricciones'),
  ('admin', 'Gestión de usuarios y roles con restricciones'),
  ('soporte', 'Visualización de usuarios y reset de contraseñas'),
  ('usuario', 'Acceso estándar al almacenamiento personal');

ALTER TABLE usuarios ADD COLUMN activo BOOLEAN DEFAULT true;
ALTER TABLE usuarios ADD COLUMN password_must_change BOOLEAN DEFAULT false;


CREATE TABLE archivos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    nombre_objeto VARCHAR(255) NOT NULL,
    tipo VARCHAR(100),
    tamanio_bytes BIGINT NOT NULL,
    propietario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    almacen_id UUID REFERENCES almacenes(id) ON DELETE CASCADE,
    eliminado BOOLEAN DEFAULT false,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    accion VARCHAR(100) NOT NULL,
    entidad VARCHAR(100),
    entidad_id UUID,
    detalle TEXT,
    ip VARCHAR(45),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    accion VARCHAR(100) NOT NULL,
    detalle TEXT,
    ip VARCHAR(45),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE bovedas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    creador_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    espacio_total_bytes BIGINT NOT NULL,
    espacio_usado_bytes BIGINT DEFAULT 0,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


INSERT INTO permisos (nombre, descripcion) VALUES
  ('boveda_leer',    'Ver y descargar archivos de la bóveda'),
  ('boveda_subir',   'Subir archivos a la bóveda'),
  ('boveda_borrar',  'Eliminar archivos de la bóveda'),
  ('boveda_gestionar','Gestionar miembros de la bóveda (excepto al creador)');


CREATE TABLE boveda_miembros (
    boveda_id UUID REFERENCES bovedas(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    puede_leer     BOOLEAN DEFAULT true,
    puede_subir    BOOLEAN DEFAULT false,
    puede_borrar   BOOLEAN DEFAULT false,
    puede_gestionar BOOLEAN DEFAULT false,
    invitado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (boveda_id, usuario_id)
);


ALTER TABLE archivos ADD COLUMN boveda_id UUID REFERENCES bovedas(id) ON DELETE CASCADE;
