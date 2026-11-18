const jwt = require('jsonwebtoken');
require('dotenv').config();

// Generar token JWT con Authorization: Bearer
function generarToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30m' });
}

// Verificar token JWT
function verificarToken(token) {
  try {
    if (!token) {
      return null;
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
}

// Extraer token del header Authorization: Bearer ...
function extraerTokenHeader(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return null;
  }
  const partes = authHeader.split(' ');
  if (partes.length === 2 && partes[0] === 'Bearer') {
    return partes[1];
  }
  return null;
}

// Extraer token de la cookie httpOnly "token".
function extraerTokenCookie(req) {
  const cookies = req.headers['cookie'];
  if (!cookies) {
    return null;
  }

  const partes = cookies.split(';');
  for (const parte of partes) {
    const indice = parte.indexOf('=');
    if (indice === -1) {
      continue;
    }
    const nombre = parte.slice(0, indice).trim();
    if (nombre === 'token') {
      return decodeURIComponent(parte.slice(indice + 1).trim());
    }
  }
  return null;
}

// Cookie primero; header Bearer como compatibilidad para clientes de API.
function extraerToken(req) {
  return extraerTokenCookie(req) || extraerTokenHeader(req);
}

module.exports = {
  generarToken,
  verificarToken,
  extraerTokenHeader,
  extraerTokenCookie,
  extraerToken
};
