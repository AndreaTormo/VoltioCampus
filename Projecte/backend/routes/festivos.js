const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const { obtenerFestivos, crearFestivo, eliminarFestivo } = require('../controllers/festivosController');

// Todos los autenticados pueden ver festivos
router.get('/', authMiddleware, obtenerFestivos);

// Solo admin puede gestionar festivos
router.post('/', authMiddleware, roleMiddleware(['admin']), crearFestivo);
router.delete('/:id', authMiddleware, roleMiddleware(['admin']), eliminarFestivo);

module.exports = router;
