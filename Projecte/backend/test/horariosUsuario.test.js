const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validarIntervalosHorario,
  intervaloIncluyeBloque
} = require('../utils/horariosUsuario');

test('accepts multiple non-overlapping weekly attendance intervals', function () {
  const resultado = validarIntervalosHorario([
    { dia_semana: 1, hora_inicio: '08:00', hora_fin: '11:00' },
    { dia_semana: 1, hora_inicio: '11:30', hora_fin: '14:00' },
    { dia_semana: 5, hora_inicio: '09:15', hora_fin: '16:00' }
  ]);

  assert.equal(resultado.valido, true);
  assert.equal(resultado.intervalos.length, 3);
});

test('accepts an empty week when the user has no school attendance', function () {
  assert.deepEqual(validarIntervalosHorario([]), {
    valido: true,
    intervalos: []
  });
});

test('rejects invalid weekdays, times, and overlapping intervals', function () {
  assert.equal(validarIntervalosHorario([
    { dia_semana: 6, hora_inicio: '08:00', hora_fin: '12:00' }
  ]).valido, false);
  assert.equal(validarIntervalosHorario([
    { dia_semana: 1, hora_inicio: '08:00', hora_fin: '08:00' }
  ]).valido, false);
  assert.equal(validarIntervalosHorario([
    { dia_semana: 1, hora_inicio: '08:00', hora_fin: '12:00' },
    { dia_semana: 1, hora_inicio: '11:00', hora_fin: '14:00' }
  ]).valido, false);
});

test('allows a reservation block only when fully contained in one interval', function () {
  const interval = { hora_inicio: '08:00', hora_fin: '11:00' };

  assert.equal(intervaloIncluyeBloque(interval, 'BLOQUE_1'), true);
  assert.equal(intervaloIncluyeBloque(
    { hora_inicio: '08:15', hora_fin: '11:00' },
    'BLOQUE_1'
  ), false);
  assert.equal(intervaloIncluyeBloque(
    { hora_inicio: '08:00', hora_fin: '10:59' },
    'BLOQUE_1'
  ), false);
});
