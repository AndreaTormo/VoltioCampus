const test = require('node:test');
const assert = require('node:assert/strict');
const {
  esReservaActiva,
  esFechaPasada,
  horasDeReserva,
  filtrarReservas,
  sumarHoras,
  obtenerResumenHoras,
  obtenerHorasPorUsuario
} = require('../services/horasService');

const HOY = new Date('2026-11-16T12:00:00');

test('calcula las horas de cada bloque', function () {
  assert.equal(horasDeReserva({ bloque: 'BLOQUE_1' }), 3);
  assert.equal(horasDeReserva({ bloque: 'BLOQUE_2' }), 2.5);
  assert.equal(horasDeReserva({ bloque: 'BLOQUE_3' }), 3);
  assert.equal(horasDeReserva({ bloque: 'BLOQUE_4' }), 2.75);
});

test('usa las horas ya calculadas si vienen en la reserva', function () {
  assert.equal(horasDeReserva({ bloque: 'BLOQUE_1', horas: 1.25 }), 1.25);
});

test('devuelve 0 para reservas vacías o bloques inválidos', function () {
  assert.equal(horasDeReserva(null), 0);
  assert.equal(horasDeReserva({}), 0);
  assert.equal(horasDeReserva({ bloque: 'RECREO' }), 0);
});

test('solo considera activa la reserva con estado activa', function () {
  assert.equal(esReservaActiva({ estado: 'activa' }), true);
  assert.equal(esReservaActiva({ estado: 'cancelada' }), false);
  assert.equal(esReservaActiva(null), false);
});

test('una fecha solo es pasada si es anterior a hoy', function () {
  assert.equal(esFechaPasada('2026-11-15', HOY), true);
  assert.equal(esFechaPasada('2026-11-16', HOY), false);
  assert.equal(esFechaPasada('2026-11-17', HOY), false);
  assert.equal(esFechaPasada('fecha-invalida', HOY), false);
});

test('filtra reservas canceladas por defecto', function () {
  const reservas = [
    { id: 1, estado: 'activa', bloque: 'BLOQUE_1' },
    { id: 2, estado: 'cancelada', bloque: 'BLOQUE_2' }
  ];

  const filtradas = filtrarReservas(reservas);
  assert.equal(filtradas.length, 1);
  assert.equal(filtradas[0].id, 1);
});

test('puede filtrar solo reservas pasadas', function () {
  const reservas = [
    { id: 1, estado: 'activa', bloque: 'BLOQUE_1', fecha_reserva: '2026-11-15' },
    { id: 2, estado: 'activa', bloque: 'BLOQUE_2', fecha_reserva: '2026-11-16' },
    { id: 3, estado: 'activa', bloque: 'BLOQUE_3', fecha_reserva: '2026-11-17' }
  ];

  const filtradas = filtrarReservas(reservas, { soloPasadas: true, hoy: HOY });
  assert.deepEqual(filtradas.map(function (reserva) {
    return reserva.id;
  }), [1]);
});

test('suma las horas de las reservas indicadas', function () {
  assert.equal(sumarHoras([
    { bloque: 'BLOQUE_1' },
    { bloque: 'BLOQUE_2' },
    { bloque: 'BLOQUE_4' }
  ]), 8.25);
});

test('obtiene el resumen de horas y número de reservas', function () {
  const resumen = obtenerResumenHoras([
    { estado: 'activa', bloque: 'BLOQUE_1', fecha_reserva: '2026-11-15' },
    { estado: 'activa', bloque: 'BLOQUE_2', fecha_reserva: '2026-11-16' },
    { estado: 'cancelada', bloque: 'BLOQUE_3', fecha_reserva: '2026-11-15' }
  ], { soloPasadas: true, hoy: HOY });

  assert.deepEqual(resumen, {
    horas: 3,
    reservas: 1
  });
});

test('agrupa horas y reservas por usuario', function () {
  const resultado = obtenerHorasPorUsuario([
    { usuario_id: 2, estado: 'activa', bloque: 'BLOQUE_1' },
    { usuario_id: 1, estado: 'activa', bloque: 'BLOQUE_2' },
    { usuario_id: 2, estado: 'activa', bloque: 'BLOQUE_4' },
    { usuario_id: 2, estado: 'cancelada', bloque: 'BLOQUE_3' }
  ]);

  assert.deepEqual(resultado, [
    { usuario_id: 1, horas: 2.5, reservas: 1 },
    { usuario_id: 2, horas: 5.75, reservas: 2 }
  ]);
});

test('tolera listas vacías o valores no válidos', function () {
  assert.deepEqual(filtrarReservas(null), []);
  assert.equal(sumarHoras(null), 0);
  assert.deepEqual(obtenerHorasPorUsuario([]), []);
});
