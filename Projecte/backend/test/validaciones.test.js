const test = require('node:test');
const assert = require('node:assert/strict');
const { validarDatosReserva } = require('../utils/validaciones');

test('acepta una fecha real y rechaza días de calendario imposibles', function () {
  assert.equal(
    validarDatosReserva({
      fecha_reserva: '2028-02-29',
      bloque: 'BLOQUE_1'
    }).valido,
    true
  );
  assert.equal(
    validarDatosReserva({
      fecha_reserva: '2026-02-30',
      bloque: 'BLOQUE_1'
    }).valido,
    false
  );
});
