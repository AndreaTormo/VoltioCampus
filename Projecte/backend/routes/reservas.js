const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const validarReserva = require('../middlewares/validarReserva');
const {
  crearReserva,
  obtenerDisponibilidad,
  misReservas,
  listarReservasAdmin,
  cancelarReserva,
  generarTurnosSemana,
  historialAdmin
} = require('../controllers/reservasController');

// Rutas protegidas
router.post('/', authMiddleware, validarReserva, crearReserva);
router.get('/disponibilidad', authMiddleware, obtenerDisponibilidad);
router.get('/mis-reservas', authMiddleware, misReservas);
router.get(
  '/admin',
  authMiddleware,
  roleMiddleware(['admin']),
  listarReservasAdmin
);
router.post(
  '/turnos',
  authMiddleware,
  roleMiddleware(['admin']),
  generarTurnosSemana
);
router.patch('/:id/cancelar', authMiddleware, cancelarReserva);
router.get(
  '/historial',
  authMiddleware,
  roleMiddleware(['admin']),
  historialAdmin
);

module.exports = router;
