const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const { obtenerCargadores, activarCargador, desactivarCargador, crearCargador, eliminarCargador } = require('../controllers/cargadoresController');

// Todos los usuarios autenticados pueden ver cargadores
router.get('/', authMiddleware, obtenerCargadores);

// Solo admin puede gestionar cargadores
router.put('/:id/activar', authMiddleware, roleMiddleware(['admin']), activarCargador);
router.put('/:id/desactivar', authMiddleware, roleMiddleware(['admin']), desactivarCargador);
router.post('/', authMiddleware, roleMiddleware(['admin']), crearCargador);
router.delete('/:id', authMiddleware, roleMiddleware(['admin']), eliminarCargador);

module.exports = router;
