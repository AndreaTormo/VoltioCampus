const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const bcrypt = require('bcrypt');

process.env.JWT_SECRET = 'auth-controller-test-secret';

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

const { login } = require('../controllers/authController');

test('el login crea una cookie de sesión que caduca al cerrar el navegador', async function () {
  const password = 'test-password';
  mockDb.query = async function () {
    return {
      rows: [{
        id: 1,
        nombre: 'Admin',
        apellidos: 'Test',
        email: 'admin@example.test',
        password_hash: await bcrypt.hash(password, 4),
        tipo: 'alumno',
        activo: true,
        rol: 'admin'
      }]
    };
  };

  const respuesta = {
    cookieInfo: null,
    statusCode: null,
    status: function (statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    cookie: function (nombre, valor, opciones) {
      this.cookieInfo = { nombre, valor, opciones };
      return this;
    },
    json: function (datos) {
      this.datos = datos;
      return this;
    }
  };

  await login({ body: { email: 'admin@example.test', password } }, respuesta);

  assert.equal(respuesta.statusCode, 200);
  assert.equal(respuesta.cookieInfo.nombre, 'token');
  assert.equal(respuesta.cookieInfo.opciones.maxAge, undefined);
  assert.equal(respuesta.cookieInfo.opciones.httpOnly, true);
});
