const express = require('express');
const path = require('path');
const app = express();
require('dotenv').config({ path: path.join(__dirname, '.env') });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
const authRoutes = require('./routes/auth');
const usuariosRoutes = require('./routes/usuarios');
const cargadoresRoutes = require('./routes/cargadores');
const festivosRoutes = require('./routes/festivos');
const reservasRoutes = require('./routes/reservas');
const horariosRoutes = require('./routes/horarios');
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/cargadores', cargadoresRoutes);
app.use('/api/festivos', festivosRoutes);
app.use('/api/reservas', reservasRoutes);
app.use('/api/horarios', horariosRoutes);

// Redirigir la raíz al frontend
app.get('/', (req, res) => {
  res.redirect('/html/login.html');
});

app.get('/app/features/auth/login/login.html', (req, res) => {
  res.redirect('/html/login.html');
});
app.get('/app/features/auth/register/register.html', (req, res) => {
  res.redirect('/html/register.html');
});
app.get('/app/features/admin/admin.html', (req, res) => {
  res.redirect('/html/admin.html');
});
app.get('/app/features/dashboard/dashboard.html', (req, res) => {
  res.redirect('/html/dashboard.html');
});
app.get('/app/features/errors/error.html', (req, res) => {
  res.redirect('/html/error.html');
});

// API no encontrada
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Ruta no trobada' });
});

// Frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no trobada' });
});

// Errores no controlados
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  console.error(err);
  const status = err.status || 500;
  const mensaje = status === 400
    ? 'Sol·licitud no vàlida'
    : 'Error intern del servidor';

  return res.status(status).json({ error: mensaje });
});

const PORT = process.env.PORT || 3051;

app.listen(PORT, () => {
  console.log(`Servidor en marxa al port ${PORT}`);
});

module.exports = app;
