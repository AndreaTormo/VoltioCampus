BEGIN;

INSERT INTO roles (nombre)
VALUES ('user')
ON CONFLICT (nombre) DO NOTHING;

UPDATE usuarios
SET rol_id = (SELECT id FROM roles WHERE nombre = 'user')
WHERE rol_id IN (
  SELECT id FROM roles WHERE nombre IN ('profesor', 'alumno')
);

DELETE FROM roles
WHERE nombre IN ('profesor', 'alumno');

COMMIT;
