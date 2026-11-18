const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const mockDb = {
  query: async function () {
    return { rows: [] };
  }
};
const dbPath = require.resolve('../config/db');
const dbModule = new Module(dbPath);
dbModule.filename = dbPath;
dbModule.loaded = true;
dbModule.exports = mockDb;
require.cache[dbPath] = dbModule;

const { eliminarCargador } = require('../controllers/cargadoresController');

function crearRespuesta() {
  return {
    statusCode: null,
    body: null,
    status: function (statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json: function (body) {
      this.body = body;
      return this;
    }
  };
}

test('no elimina un cargador asociado a una reserva cancelada', async function () {
  const consultas = [];
  mockDb.query = async function (texto, parametros) {
    consultas.push({ texto, parametros });
    return { rows: [{ id: 8, estado: 'cancelada' }] };
  };
  const respuesta = crearRespuesta();

  await eliminarCargador({ params: { id: '3' } }, respuesta);

  assert.equal(respuesta.statusCode, 409);
  assert.match(respuesta.body.error, /reserves associades/);
  assert.equal(consultas.length, 1);
  assert.match(consultas[0].texto, /FROM reservas WHERE cargador_id = \$1 LIMIT 1/);
  assert.deepEqual(consultas[0].parametros, [3]);
});

test('responde con conflicto si una reserva aparece durante la eliminación', async function () {
  let consultas = 0;
  mockDb.query = async function () {
    consultas += 1;
    if (consultas === 1) {
      return { rows: [] };
    }
    const error = new Error('foreign key violation');
    error.code = '23503';
    throw error;
  };
  const respuesta = crearRespuesta();

  await eliminarCargador({ params: { id: '3' } }, respuesta);

  assert.equal(respuesta.statusCode, 409);
  assert.match(respuesta.body.error, /reserves associades/);
});

test('elimina un cargador sin reservas asociadas', async function () {
  let consultas = 0;
  mockDb.query = async function () {
    consultas += 1;
    return consultas === 1
      ? { rows: [] }
      : { rows: [{ id: 3, numero: 1 }] };
  };
  const respuesta = crearRespuesta();

  await eliminarCargador({ params: { id: '3' } }, respuesta);

  assert.equal(respuesta.statusCode, 200);
  assert.equal(respuesta.body.cargador.id, 3);
});

test('responde con error de servidor ante un fallo inesperado de base de datos', async function () {
  mockDb.query = async function () {
    throw new Error('database unavailable');
  };
  const respuesta = crearRespuesta();

  await eliminarCargador({ params: { id: '3' } }, respuesta);

  assert.equal(respuesta.statusCode, 500);
  assert.match(respuesta.body.error, /Error en eliminar/);
});
