const bcrypt = require('bcrypt');
const db = require('../config/db');
const { generarToken } = require('../utils/jwt');
const {
  validarMatriculaEspanola,
  validarNiaONumeroProfesor
} = require('../utils/validaciones');

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const COOKIE_TOKEN = 'token';

function limpiarTexto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

function opcionesCookie() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  };
}

// Registro de usuario
async function registrar(req, res) {
  try {
    const nombre = limpiarTexto(req.body.nombre);
    const apellidos = limpiarTexto(req.body.apellidos);
    const email = limpiarTexto(req.body.email).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const tipo = limpiarTexto(req.body.tipo);
    const niaProfesor = limpiarTexto(req.body.nia_profesor);
    const matricula = limpiarTexto(req.body.matricula).toUpperCase();
    const modeloCoche = limpiarTexto(req.body.modelo_coche);

    if (!nombre || !apellidos || !email || !password || !tipo) {
      return res.status(400).json({
        error: 'Falten camps obligatoris'
      });
    }

    if (nombre.length > 50 || apellidos.length > 100) {
      return res.status(400).json({
        error: 'El nom o els cognoms superen la longitud permesa'
      });
    }

    if (!REGEX_EMAIL.test(email) || email.length > 100) {
      return res.status(400).json({
        error: 'El correu electrònic no té un format vàlid'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'La contrasenya ha de tindre almenys 8 caràcters'
      });
    }

    if (tipo !== 'profesor' && tipo !== 'alumno') {
      return res.status(400).json({
        error: 'El tipus ha de ser professor o alumne'
      });
    }

    if (tipo === 'profesor' && !validarNiaONumeroProfesor(niaProfesor)) {
      return res.status(400).json({
        error: 'El NIA del professor ha de tindre 8 dígits numèrics'
      });
    }

    if (!validarMatriculaEspanola(matricula)) {
      return res.status(400).json({
        error: 'La matrícula ha de tindre format espanyol (4 números i 3 lletres)'
      });
    }

    if (!modeloCoche || modeloCoche.length > 50) {
      return res.status(400).json({
        error: 'El model del cotxe és obligatori i no pot superar 50 caràcters'
      });
    }

    // Comprobar si el email ya existe
    const emailExiste = await db.query(
      'SELECT id FROM usuarios WHERE LOWER(email) = $1',
      [email]
    );

    if (emailExiste.rows.length > 0) {
      return res.status(400).json({
        error: 'El correu electrònic ja està registrat'
      });
    }

    // Comprobar si es el primer usuari (sense admin)
    const adminExiste = await db.query(
      `SELECT 1 FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE r.nombre = 'admin' LIMIT 1`
    );
    const rolNombre = adminExiste.rows.length === 0 ? 'admin' : 'user';

    // Cifrar contraseña con bcrypt
    const password_hash = await bcrypt.hash(password, 10);

    // Obtenir el rol correspondient
    const rolQuery = await db.query(
      'SELECT id FROM roles WHERE nombre = $1',
      [rolNombre]
    );

    if (rolQuery.rows.length === 0) {
      return res.status(500).json({
        error: 'Rol no disponible'
      });
    }

    const resultado = await db.query(
      `INSERT INTO usuarios (
        nombre, apellidos, email, password_hash, rol_id, tipo,
        nia_profesor, matricula, modelo_coche
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, nombre, apellidos, email, tipo`,
      [
        nombre,
        apellidos,
        email,
        password_hash,
        rolQuery.rows[0].id,
        tipo,
        tipo === 'profesor' ? niaProfesor : null,
        matricula,
        modeloCoche
      ]
    );

    return res.status(201).json({
      mensaje: 'Usuari registrat correctament',
      usuario: resultado.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({
        error: 'El correu electrònic ja està registrat'
      });
    }

    return res.status(500).json({
      error: 'Error en registrar l\'usuari'
    });
  }
}

// Login de usuario
async function login(req, res) {
  try {
    const email = limpiarTexto(req.body.email).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      return res.status(400).json({
        error: 'El correu electrònic i la contrasenya són obligatoris'
      });
    }

    const resultado = await db.query(
      `SELECT u.id, u.nombre, u.apellidos, u.email, u.password_hash, u.tipo,
              u.nia_profesor, u.matricula, u.modelo_coche, u.activo,
              r.nombre AS rol
       FROM usuarios u
       INNER JOIN roles r ON u.rol_id = r.id
       WHERE LOWER(u.email) = $1`,
      [email]
    );

    if (resultado.rows.length === 0) {
      return res.status(401).json({
        error: 'Credencials incorrectes'
      });
    }

    const usuario = resultado.rows[0];
    const passwordValido = await bcrypt.compare(password, usuario.password_hash);

    if (!passwordValido) {
      return res.status(401).json({
        error: 'Credencials incorrectes'
      });
    }

    if (!usuario.activo) {
      return res.status(403).json({
        error: 'El teu compte està desactivat. Contacta amb l’administrador.'
      });
    }

    const token = generarToken({
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      tipo: usuario.tipo
    });

    res.cookie(COOKIE_TOKEN, token, opcionesCookie());

    return res.status(200).json({
      mensaje: 'Inici de sessió correcte',
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellidos: usuario.apellidos,
        email: usuario.email,
        rol: usuario.rol,
        tipo: usuario.tipo,
        nia_profesor: usuario.nia_profesor,
        matricula: usuario.matricula,
        modelo_coche: usuario.modelo_coche,
        activo: usuario.activo
      }
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Error en iniciar sessió'
    });
  }
}

// Devuelve el usuario autenticado (req.usuario lo carga authMiddleware).
function me(req, res) {
  return res.status(200).json({
    usuario: req.usuario
  });
}

// Cierra la sesión eliminando la cookie httpOnly.
function logout(req, res) {
  res.clearCookie(COOKIE_TOKEN, opcionesCookie());
  return res.status(200).json({
    mensaje: 'Sessió tancada correctament'
  });
}

module.exports = {
  registrar,
  login,
  me,
  logout
};
