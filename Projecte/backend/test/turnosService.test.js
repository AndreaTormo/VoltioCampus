const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizarInicioSemana,
  generarDiasSemana,
  generarAsignacionesTurnos
} = require('../services/turnosService');

const HORARIO_COMPLETO = [1, 2, 3, 4, 5].map(function (dia) {
  return {
    usuario_id: 1,
    dia_semana: dia,
    hora_inicio: '08:00',
    hora_fin: '21:00'
  };
});

const CARGADORES = [
  { id: 1, numero: 1, tipo_grupo: 'profesores' },
  { id: 2, numero: 2, tipo_grupo: 'profesores' },
  { id: 3, numero: 3, tipo_grupo: 'alumnos' },
  { id: 4, numero: 4, tipo_grupo: 'alumnos' }
];

function usuario(overrides = {}) {
  return {
    id: 1,
    nombre: 'Ana',
    apellidos: 'Garcia',
    tipo: 'profesor',
    ...overrides
  };
}

test('normaliza cualquier día de la semana al lunes correspondiente', function () {
  assert.equal(normalizarInicioSemana('2026-11-18'), '2026-11-16');
  assert.equal(normalizarInicioSemana('2026-11-16'), '2026-11-16');
  assert.equal(normalizarInicioSemana('2026-11-22'), '2026-11-16');
  assert.equal(normalizarInicioSemana('fecha-invalida'), null);
  assert.equal(normalizarInicioSemana('2026-02-30'), null);
});

test('genera de lunes a viernes', function () {
  assert.deepEqual(generarDiasSemana('2026-11-16'), [
    '2026-11-16',
    '2026-11-17',
    '2026-11-18',
    '2026-11-19',
    '2026-11-20'
  ]);
});

test('asigna como máximo cinco tornos, uno por día y repartiendo bloques', function () {
  const resultado = generarAsignacionesTurnos({
    usuarios: [usuario()],
    horarios: HORARIO_COMPLETO,
    cargadores: CARGADORES,
    reservasSemana: [],
    reservasPasadas: [],
    semanaInicio: '2026-11-16',
    hoy: '2026-11-16'
  });

  assert.equal(resultado.asignaciones.length, 5);
  assert.deepEqual(
    resultado.asignaciones.map(function (asignacion) {
      return asignacion.fecha_reserva;
    }),
    ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20']
  );
  assert.equal(
    new Set(resultado.asignaciones.slice(0, 4).map(function (asignacion) {
      return asignacion.bloque;
    })).size,
    4
  );
});

test('prioriza al usuario con menos horas activas pasadas', function () {
  const resultado = generarAsignacionesTurnos({
    usuarios: [
      usuario({ id: 1, tipo: 'alumno' }),
      usuario({ id: 2, tipo: 'alumno' })
    ],
    horarios: [
      { usuario_id: 1, dia_semana: 1, hora_inicio: '08:00', hora_fin: '11:00' },
      { usuario_id: 2, dia_semana: 1, hora_inicio: '08:00', hora_fin: '11:00' }
    ],
    cargadores: [{ id: 3, numero: 3, tipo_grupo: 'alumnos' }],
    reservasSemana: [],
    reservasPasadas: [
      {
        usuario_id: 1,
        bloque: 'BLOQUE_1',
        fecha_reserva: '2026-11-09',
        estado: 'activa'
      }
    ],
    semanaInicio: '2026-11-16',
    hoy: '2026-11-16'
  });

  assert.equal(resultado.asignaciones.length, 1);
  assert.equal(resultado.asignaciones[0].usuario.id, 2);
});

test('prefiere un cargador del grupo propio', function () {
  const resultado = generarAsignacionesTurnos({
    usuarios: [usuario({ tipo: 'alumno' })],
    horarios: [
      { usuario_id: 1, dia_semana: 1, hora_inicio: '08:00', hora_fin: '21:00' }
    ],
    cargadores: CARGADORES,
    reservasSemana: [],
    reservasPasadas: [],
    semanaInicio: '2026-11-16',
    hoy: '2026-11-16'
  });

  assert.equal(resultado.asignaciones.length, 1);
  assert.equal(resultado.asignaciones[0].cargador.tipo_grupo, 'alumnos');
});

test('usa el otro grupo si no queda ningún cargador propio libre', function () {
  const resultado = generarAsignacionesTurnos({
    usuarios: [usuario({ tipo: 'alumno' })],
    horarios: [
      { usuario_id: 1, dia_semana: 1, hora_inicio: '08:00', hora_fin: '11:00' }
    ],
    cargadores: CARGADORES,
    reservasSemana: [
      {
        usuario_id: 99,
        cargador_id: 3,
        fecha_reserva: '2026-11-16',
        bloque: 'BLOQUE_1',
        estado: 'activa'
      },
      {
        usuario_id: 98,
        cargador_id: 4,
        fecha_reserva: '2026-11-16',
        bloque: 'BLOQUE_1',
        estado: 'activa'
      }
    ],
    reservasPasadas: [],
    semanaInicio: '2026-11-16',
    hoy: '2026-11-16'
  });

  assert.equal(resultado.asignaciones.length, 1);
  assert.equal(resultado.asignaciones[0].cargador.tipo_grupo, 'profesores');
});

test('respeta el máximo semanal contando reservas activas existentes', function () {
  const resultado = generarAsignacionesTurnos({
    usuarios: [usuario()],
    horarios: HORARIO_COMPLETO,
    cargadores: [{ id: 1, numero: 1, tipo_grupo: 'profesores' }],
    reservasSemana: [
      {
        usuario_id: 1,
        cargador_id: 1,
        fecha_reserva: '2026-11-16',
        bloque: 'BLOQUE_1',
        estado: 'activa'
      },
      {
        usuario_id: 1,
        cargador_id: 1,
        fecha_reserva: '2026-11-17',
        bloque: 'BLOQUE_1',
        estado: 'activa'
      },
      {
        usuario_id: 1,
        cargador_id: 1,
        fecha_reserva: '2026-11-18',
        bloque: 'BLOQUE_1',
        estado: 'activa'
      },
      {
        usuario_id: 1,
        cargador_id: 1,
        fecha_reserva: '2026-11-19',
        bloque: 'BLOQUE_1',
        estado: 'activa'
      }
    ],
    reservasPasadas: [],
    semanaInicio: '2026-11-16',
    hoy: '2026-11-16'
  });

  assert.equal(resultado.asignaciones.length, 1);
  assert.equal(resultado.asignaciones[0].fecha_reserva, '2026-11-20');
});

test('no asigna un segundo torno al mismo usuario el mismo día', function () {
  const resultado = generarAsignacionesTurnos({
    usuarios: [usuario()],
    horarios: HORARIO_COMPLETO,
    cargadores: CARGADORES,
    reservasSemana: [
      {
        usuario_id: 1,
        cargador_id: 1,
        fecha_reserva: '2026-11-16',
        bloque: 'BLOQUE_1',
        estado: 'activa'
      }
    ],
    reservasPasadas: [],
    semanaInicio: '2026-11-16',
    hoy: '2026-11-16'
  });

  assert.equal(
    resultado.asignaciones.some(function (asignacion) {
      return asignacion.fecha_reserva === '2026-11-16';
    }),
    false
  );
  assert.equal(resultado.asignaciones.length, 4);
});

test('omite los días que ya han pasado dentro de la semana actual', function () {
  const resultado = generarAsignacionesTurnos({
    usuarios: [usuario()],
    horarios: HORARIO_COMPLETO,
    cargadores: CARGADORES,
    reservasSemana: [],
    reservasPasadas: [],
    semanaInicio: '2026-11-16',
    hoy: '2026-11-18'
  });

  assert.deepEqual(
    resultado.asignaciones.map(function (asignacion) {
      return asignacion.fecha_reserva;
    }),
    ['2026-11-18', '2026-11-19', '2026-11-20']
  );
});

test('no asigna tornos en días festivos', function () {
  const resultado = generarAsignacionesTurnos({
    usuarios: [usuario()],
    horarios: HORARIO_COMPLETO,
    cargadores: CARGADORES,
    reservasSemana: [],
    reservasPasadas: [],
    festivos: ['2026-11-16', '2026-11-18'],
    semanaInicio: '2026-11-16',
    hoy: '2026-11-16'
  });

  assert.deepEqual(
    resultado.asignaciones.map(function (asignacion) {
      return asignacion.fecha_reserva;
    }),
    ['2026-11-17', '2026-11-19', '2026-11-20']
  );
});

test('no asigna bloques que no estén dentro del horario del usuario', function () {
  const resultado = generarAsignacionesTurnos({
    usuarios: [usuario({ tipo: 'alumno' })],
    horarios: [
      { usuario_id: 1, dia_semana: 1, hora_inicio: '15:00', hora_fin: '18:00' }
    ],
    cargadores: CARGADORES,
    reservasSemana: [],
    reservasPasadas: [],
    semanaInicio: '2026-11-16',
    hoy: '2026-11-16'
  });

  assert.equal(resultado.asignaciones.length, 1);
  assert.equal(resultado.asignaciones[0].bloque, 'BLOQUE_3');
});
