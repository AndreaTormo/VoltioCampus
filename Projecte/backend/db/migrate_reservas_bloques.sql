-- Permite reservas en los cuatro bloques horarios (mañana y tarde).
-- Ejecutar una sola vez sobre una base de datos ya creada:
-- psql -U postgres -d cargadores_db -f Projecte/backend/db/migrate_reservas_bloques.sql

ALTER TABLE reservas
  DROP CONSTRAINT IF EXISTS reservas_bloque_check;

ALTER TABLE reservas
  ADD CONSTRAINT reservas_bloque_check
  CHECK (bloque IN ('BLOQUE_1', 'BLOQUE_2', 'BLOQUE_3', 'BLOQUE_4'));
