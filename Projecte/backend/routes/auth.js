const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { registrar, login, me, logout } = require('../controllers/authController');

// Rutas públicas
router.post('/registro', registrar);
router.post('/login', login);
router.post('/logout', logout);

// Rutas protegidas
router.get('/me', authMiddleware, me);

module.exports = router;
