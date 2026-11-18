const test = require('node:test');
const assert = require('node:assert/strict');
const { agruparHistorialUsuarios } = require('../services/historialService');

const HOY = new Date('2026-11-16T12:00:00');

test('agrupa reservas activas y calcula horas por usuario', function () {
  const usuarios = agruparHistorialUsuarios([
    {
      usuario_id: 1,
      nombre: 'Ana',
      apellidos: 'Fernandez',
      email: 'ana@centro.edu',
      tipo: 'alumno',
      activo: true,
      rol: 'user',
      reserva_id: 10,
      bloque: 'BLOQUE_1',
      estado: 'activa',
      fecha_reserva: '2026-11-15'
    },
    {
      usuario_id: 1,
      nombre: 'Ana',
      apellidos: 'Fernandez',
      email: 'ana@centro.edu',
      tipo: 'alumno',
      activo: true,
      rol: 'user',
      reserva_id: 11,
      bloque: 'BLOQUE_2',
      estado: 'activa',
      fecha_reserva: '2026-11-17'
    }
  ], { hoy: HOY });

  assert.equal(usuarios.length, 1);
  assert.deepEqual(usuarios[0], {
    id: 1,
    nombre: 'Ana',
    apellidos: 'Fernandez',
    email: 'ana@centro.edu',
    tipo: 'alumno',
    activo: true,
    rol: 'user',
    horas_activas: 5.5,
    horas_pasadas: 3,
    reservas_activas: 2,
    reservas_pasadas: 1,
    ultima_reserva: '2026-11-17'
  });
});

test('incluye usuarios sin reservas con valores a cero', function () {
  const usuarios = agruparHistorialUsuarios([
    {
      usuario_id: 2,
      nombre: 'Carlos',
      apellidos: 'Martin',
      email: 'carlos@centro.edu',
      tipo: 'profesor',
      activo: false,
      rol: 'user',
      reserva_id: null,
      bloque: null,
      estado: null,
      fecha_reserva: null
    }
  ], { hoy: HOY });

  assert.deepEqual(usuarios[0], {
    id: 2,
    nombre: 'Carlos',
    apellidos: 'Martin',
    email: 'carlos@centro.edu',
    tipo: 'profesor',
    activo: false,
    rol: 'user',
    horas_activas: 0,
    horas_pasadas: 0,
    reservas_activas: 0,
    reservas_pasadas: 0,
    ultima_reserva: null
  });
});

test('ignora filas sin usuario válido', function () {
  assert.deepEqual(agruparHistorialUsuarios([
    { usuario_id: null },
    { usuario_id: 0 },
    null
  ]), []);
});
