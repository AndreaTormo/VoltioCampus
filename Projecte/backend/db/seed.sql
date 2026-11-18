-- Roles de permisos
INSERT INTO roles (nombre) VALUES ('admin'), ('user')
ON CONFLICT (nombre) DO NOTHING;

-- Horari centre
INSERT INTO horario_centro (descripcion, bloque1_inicio, bloque1_fin, recreo_inicio, recreo_fin, bloque2_inicio, bloque2_fin, dias_laborables)
SELECT 'Horario general centro', '08:00'::time, '11:00'::time, '11:00'::time, '11:30'::time, '11:30'::time, '14:00'::time, '["lunes","martes","miercoles","jueves","viernes"]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM horario_centro WHERE descripcion = 'Horario general centro'
);

-- Carregadors
INSERT INTO cargadores (numero, tipo_grupo, conector, kw, tiempo_estimado_fijo, activo, descripcion)
VALUES 
  (1, 'profesores', 'Type 2', 22.0, 180, TRUE, 'Cargador profesores 1'),
  (2, 'profesores', 'Type 2', 22.0, 180, TRUE, 'Cargador profesores 2'),
  (3, 'alumnos', 'Type 2', 22.0, 180, TRUE, 'Cargador alumnos 1'),
  (4, 'alumnos', 'Type 2', 22.0, 180, TRUE, 'Cargador alumnos 2')
ON CONFLICT (numero) DO NOTHING;

-- Usuaris amb contrasenya "admin123"
INSERT INTO usuarios (nombre, apellidos, email, password_hash, rol_id, tipo, nia_profesor, matricula, modelo_coche, ultima_reserva_fecha)
VALUES 
  ('Admin', 'Sistema', 'admin@centro.edu', '$2b$10$2.zku1JsGlCM90MTsfnCEuSH2A7gtgWjwF1uNvxRuqpQW7xEcsgYe', (SELECT id FROM roles WHERE nombre = 'admin'), 'profesor', '99999999', '0000AAA', 'Tesla Model 3', NULL),
  ('Juan', 'Perez Garcia', 'jperez@centro.edu', '$2b$10$2.zku1JsGlCM90MTsfnCEuSH2A7gtgWjwF1uNvxRuqpQW7xEcsgYe', (SELECT id FROM roles WHERE nombre = 'user'), 'profesor', '10231412', '1234ABC', 'Nissan Leaf', NULL),
  ('Maria', 'Lopez Sanchez', 'mlopez@centro.edu', '$2b$10$2.zku1JsGlCM90MTsfnCEuSH2A7gtgWjwF1uNvxRuqpQW7xEcsgYe', (SELECT id FROM roles WHERE nombre = 'user'), 'profesor', '10231413', '2345BCD', 'Renault Zoe', NULL),
  ('Carlos', 'Martin Ruiz', 'cmartin@centro.edu', '$2b$10$2.zku1JsGlCM90MTsfnCEuSH2A7gtgWjwF1uNvxRuqpQW7xEcsgYe', (SELECT id FROM roles WHERE nombre = 'user'), 'alumno', NULL, '3456CDE', 'BMW i3', NULL),
  ('Ana', 'Fernandez Torres', 'afernandez@centro.edu', '$2b$10$2.zku1JsGlCM90MTsfnCEuSH2A7gtgWjwF1uNvxRuqpQW7xEcsgYe', (SELECT id FROM roles WHERE nombre = 'user'), 'alumno', NULL, '4567DEF', 'Peugeot e-208', NULL)
ON CONFLICT (email) DO NOTHING;
