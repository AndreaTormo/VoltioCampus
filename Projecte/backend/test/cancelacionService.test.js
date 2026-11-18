const test = require('node:test');
const assert = require('node:assert/strict');
const {
  fechaEsPasada,
  validarCancelacionReserva
} = require('../services/cancelacionService');

const HOY = new Date('2026-11-16T12:00:00');

test('un usuario puede cancelar su propia reserva activa futura', function () {
  const resultado = validarCancelacionReserva({
    reserva: {
      usuario_id: 2,
      estado: 'activa',
      fecha_reserva: '2026-11-17'
    },
    usuario: { id: 2 },
    esAdmin: false,
    hoy: HOY
  });

  assert.equal(resultado.permitido, true);
  assert.equal(resultado.status, 200);
});

test('un usuario no puede cancelar la reserva de otro usuario', function () {
  const resultado = validarCancelacionReserva({
    reserva: {
      usuario_id: 3,
      estado: 'activa',
      fecha_reserva: '2026-11-17'
    },
    usuario: { id: 2 },
    esAdmin: false,
    hoy: HOY
  });

  assert.equal(resultado.permitido, false);
  assert.equal(resultado.status, 403);
});

test('un administrador puede cancelar la reserva de otro usuario', function () {
  const resultado = validarCancelacionReserva({
    reserva: {
      usuario_id: 3,
      estado: 'activa',
      fecha_reserva: '2026-11-17'
    },
    usuario: { id: 1 },
    esAdmin: true,
    hoy: HOY
  });

  assert.equal(resultado.permitido, true);
});

test('no se puede cancelar una reserva ya cancelada', function () {
  const resultado = validarCancelacionReserva({
    reserva: {
      usuario_id: 2,
      estado: 'cancelada',
      fecha_reserva: '2026-11-17'
    },
    usuario: { id: 2 },
    esAdmin: false,
    hoy: HOY
  });

  assert.equal(resultado.permitido, false);
  assert.equal(resultado.status, 409);
});

test('no se puede cancelar una reserva de una fecha pasada', function () {
  const resultado = validarCancelacionReserva({
    reserva: {
      usuario_id: 2,
      estado: 'activa',
      fecha_reserva: '2026-11-15'
    },
    usuario: { id: 2 },
    esAdmin: false,
    hoy: HOY
  });

  assert.equal(resultado.permitido, false);
  assert.equal(resultado.status, 400);
});

test('permite cancelar una reserva de hoy', function () {
  const resultado = validarCancelacionReserva({
    reserva: {
      usuario_id: 2,
      estado: 'activa',
      fecha_reserva: '2026-11-16'
    },
    usuario: { id: 2 },
    esAdmin: false,
    hoy: HOY
  });

  assert.equal(resultado.permitido, true);
});

test('devuelve 404 cuando la reserva no existe', function () {
  const resultado = validarCancelacionReserva({
    reserva: null,
    usuario: { id: 2 },
    esAdmin: false,
    hoy: HOY
  });

  assert.equal(resultado.permitido, false);
  assert.equal(resultado.status, 404);
});

test('fechaEsPasada compara solo la fecha, no la hora', function () {
  assert.equal(fechaEsPasada('2026-11-15', HOY), true);
  assert.equal(fechaEsPasada('2026-11-16', HOY), false);
  assert.equal(fechaEsPasada('2026-11-17', HOY), false);
  assert.equal(fechaEsPasada('', HOY), false);
  assert.equal(fechaEsPasada('fecha-invalida', HOY), false);
});
