const db = require('../config/db');
const { extraerToken, verificarToken } = require('../utils/jwt');

// Middleware para verificar autenticación con cookie httpOnly (o Bearer).
async function authMiddleware(req, res, next) {
  try {
    const token = extraerToken(req);

    if (!token) {
      return res.status(401).json({
        error: 'No autoritzat. Token no proporcionat'
      });
    }

    const decoded = verificarToken(token);

    if (!decoded) {
      res.clearCookie('token', { path: '/' });
      return res.status(401).json({
        error: 'No autoritzat. Token invàlid o expirat'
      });
    }

    const resultado = await db.query(
      `SELECT u.id, u.nombre, u.apellidos, u.email, u.tipo,
              u.nia_profesor, u.matricula, u.modelo_coche, u.activo,
              r.nombre AS rol
       FROM usuarios u
       INNER JOIN roles r ON u.rol_id = r.id
       WHERE u.id = $1`,
      [decoded.id]
    );

    if (resultado.rows.length === 0) {
      res.clearCookie('token', { path: '/' });
      return res.status(401).json({
        error: 'No autoritzat. Usuari no trobat'
      });
    }

    const usuario = resultado.rows[0];

    if (!usuario.activo) {
      res.clearCookie('token', { path: '/' });
      return res.status(401).json({
        error: 'El teu compte està desactivat'
      });
    }

    req.usuario = usuario;
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'No autoritzat'
    });
  }
}

module.exports = authMiddleware;
