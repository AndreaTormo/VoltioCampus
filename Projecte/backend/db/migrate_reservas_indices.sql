-- Índices para el histórico de horas y la prioridad de turnos.
-- Ejecutar una sola vez sobre una base de datos ya creada:
-- psql -U postgres -d cargadores_db -f Projecte/backend/db/migrate_reservas_indices.sql

CREATE INDEX IF NOT EXISTS reservas_usuario_fecha_estado_idx
  ON reservas(usuario_id, fecha_reserva, estado);

CREATE INDEX IF NOT EXISTS reservas_fecha_estado_idx
  ON reservas(fecha_reserva, estado);
