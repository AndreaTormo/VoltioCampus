const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const {
  obtenerUsuarios,
  crearUsuario,
  cambiarEstadoUsuario,
  eliminarUsuario
} = require('../controllers/usuariosController');

// Solo admin puede gestionar usuarios
router.get('/', authMiddleware, roleMiddleware(['admin']), obtenerUsuarios);
router.post('/', authMiddleware, roleMiddleware(['admin']), crearUsuario);
router.patch('/:id/estado', authMiddleware, roleMiddleware(['admin']), cambiarEstadoUsuario);
router.delete('/:id', authMiddleware, roleMiddleware(['admin']), eliminarUsuario);

module.exports = router;
