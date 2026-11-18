-- Permite reutilizar una plaza cancelada y mantiene una sola reserva activa por usuario y día.
-- Ejecutar una sola vez sobre una base de datos ya creada:
-- psql -U postgres -d cargadores_db -f Projecte/backend/db/migrate_reservas_cancelacion.sql

ALTER TABLE reservas
  DROP CONSTRAINT IF EXISTS reservas_cargador_id_fecha_reserva_bloque_key;

CREATE UNIQUE INDEX IF NOT EXISTS reservas_cargador_fecha_bloque_activa_key
  ON reservas(cargador_id, fecha_reserva, bloque)
  WHERE estado = 'activa';

CREATE UNIQUE INDEX IF NOT EXISTS reservas_usuario_fecha_activa_key
  ON reservas(usuario_id, fecha_reserva)
  WHERE estado = 'activa';
