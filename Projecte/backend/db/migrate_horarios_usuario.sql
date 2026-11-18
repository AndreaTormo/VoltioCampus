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
