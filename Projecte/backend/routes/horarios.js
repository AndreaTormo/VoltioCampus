const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const {
  obtenerMiHorario,
  guardarMiHorario,
  obtenerHorarioUsuario,
  guardarHorarioUsuario
} = require('../controllers/horariosController');

router.get('/me', authMiddleware, obtenerMiHorario);
router.put('/me', authMiddleware, guardarMiHorario);
router.get(
  '/usuarios/:id',
  authMiddleware,
  roleMiddleware(['admin']),
  obtenerHorarioUsuario
);
router.put(
  '/usuarios/:id',
  authMiddleware,
  roleMiddleware(['admin']),
  guardarHorarioUsuario
);

module.exports = router;
