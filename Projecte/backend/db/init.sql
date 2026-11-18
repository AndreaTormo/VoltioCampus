-- Crear tables
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(20) UNIQUE NOT NULL
);

-- Insertar roles por defecte (admin i user)
INSERT INTO roles (nombre) VALUES ('admin'), ('user')
ON CONFLICT (nombre) DO NOTHING;

CREATE TABLE IF NOT EXISTS horario_centro (
  id SERIAL PRIMARY KEY,
  descripcion VARCHAR(100),
  bloque1_inicio TIME NOT NULL,
  bloque1_fin TIME NOT NULL,
  recreo_inicio TIME NOT NULL,
  recreo_fin TIME NOT NULL,
  bloque2_inicio TIME NOT NULL,
  bloque2_fin TIME NOT NULL,
  dias_laborables JSONB NOT NULL DEFAULT '["lunes","martes","miercoles","jueves","viernes"]'
);

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol_id INT NOT NULL REFERENCES roles(id),
  tipo VARCHAR(10) NOT NULL CHECK(tipo IN ('profesor','alumno')),
  nia_profesor VARCHAR(20),
  matricula VARCHAR(10),
  modelo_coche VARCHAR(50),
  fecha_registro TIMESTAMP DEFAULT NOW(),
  ultima_reserva_fecha TIMESTAMP NULL,
  reservas_creadas_count INT DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS horarios_usuario (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 1 AND 5),
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  CHECK (hora_inicio < hora_fin)
);

CREATE INDEX IF NOT EXISTS horarios_usuario_usuario_dia_idx
  ON horarios_usuario(usuario_id, dia_semana, hora_inicio);

CREATE TABLE IF NOT EXISTS cargadores (
  id SERIAL PRIMARY KEY,
  numero INT NOT NULL UNIQUE CHECK(numero > 0),
  tipo_grupo VARCHAR(10) NOT NULL CHECK(tipo_grupo IN ('profesores','alumnos')),
  conector VARCHAR(20) NOT NULL,
  kw DECIMAL(4,1) NOT NULL CHECK(kw > 0),
  tiempo_estimado_fijo INT NOT NULL CHECK(tiempo_estimado_fijo > 0),
  activo BOOLEAN DEFAULT TRUE,
  descripcion VARCHAR(100)
);

CREATE UNIQUE INDEX IF NOT EXISTS cargadores_numero_key ON cargadores(numero);
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_lower_key ON usuarios(LOWER(email));

CREATE TABLE IF NOT EXISTS festivos (
  id SERIAL PRIMARY KEY,
  fecha DATE UNIQUE NOT NULL,
  descripcion VARCHAR(100),
  creado_por_admin_id INT REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS reservas (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id),
  cargador_id INT NOT NULL REFERENCES cargadores(id),
  bloque VARCHAR(10) NOT NULL CHECK(bloque IN ('BLOQUE_1','BLOQUE_2','BLOQUE_3','BLOQUE_4')),
  fecha_reserva DATE NOT NULL,
  hora_creacion TIMESTAMP DEFAULT NOW(),
  estado VARCHAR(10) DEFAULT 'activa' CHECK(estado IN ('activa','cancelada')),
  nombre_apellidos_snapshot VARCHAR(150),
  nia_snapshot VARCHAR(20),
  matricula_snapshot VARCHAR(10),
  modelo_coche_snapshot VARCHAR(50)
);

ALTER TABLE reservas
  DROP CONSTRAINT IF EXISTS reservas_cargador_id_fecha_reserva_bloque_key;

CREATE UNIQUE INDEX IF NOT EXISTS reservas_cargador_fecha_bloque_activa_key
  ON reservas(cargador_id, fecha_reserva, bloque)
  WHERE estado = 'activa';

CREATE UNIQUE INDEX IF NOT EXISTS reservas_usuario_fecha_activa_key
  ON reservas(usuario_id, fecha_reserva)
  WHERE estado = 'activa';

CREATE INDEX IF NOT EXISTS reservas_usuario_fecha_estado_idx
  ON reservas(usuario_id, fecha_reserva, estado);

CREATE INDEX IF NOT EXISTS reservas_fecha_estado_idx
  ON reservas(fecha_reserva, estado);
