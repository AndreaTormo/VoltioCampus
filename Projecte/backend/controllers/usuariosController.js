const bcrypt = require('bcrypt');
const db = require('../config/db');
const {
  validarMatriculaEspanola,
  validarNiaONumeroProfesor
} = require('../utils/validaciones');

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Admin: obtener todos los usuarios
async function obtenerUsuarios(req, res) {
  try {
    const resultado = await db.query(
      `SELECT u.id, u.nombre, u.apellidos, u.email, u.tipo,
              u.nia_profesor, u.matricula, u.modelo_coche,
              u.fecha_registro, u.activo, r.nombre AS rol
       FROM usuarios u
       INNER JOIN roles r ON u.rol_id = r.id
       ORDER BY u.apellidos ASC, u.nombre ASC`
    );

    return res.status(200).json({
      usuarios: resultado.rows
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Error en obtindre els usuaris'
    });
  }
}

// Admin: crear usuario
async function crearUsuario(req, res) {
  try {
    const {
      nombre,
      apellidos,
      email,
      password,
      tipo,
      nia_profesor,
      matricula,
      modelo_coche
    } = req.body;

    const nombreLimpio = typeof nombre === 'string' ? nombre.trim() : '';
    const apellidosLimpios = typeof apellidos === 'string' ? apellidos.trim() : '';
    const emailLimpio = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const matriculaLimpia = typeof matricula === 'string'
      ? matricula.trim().toUpperCase()
      : '';
    const modeloLimpio = typeof modelo_coche === 'string'
      ? modelo_coche.trim()
      : '';
    const niaLimpio = typeof nia_profesor === 'string'
      ? nia_profesor.trim()
      : '';

    if (!nombreLimpio || !apellidosLimpios || !emailLimpio || !password || !tipo) {
      return res.status(400).json({
        error: 'Falten camps obligatoris'
      });
    }

    if (nombreLimpio.length > 50 || apellidosLimpios.length > 100) {
      return res.status(400).json({
        error: 'El nom o els cognoms superen la longitud permesa'
      });
    }

    if (!REGEX_EMAIL.test(emailLimpio) || emailLimpio.length > 100) {
      return res.status(400).json({
        error: 'El correu electrònic no té un format vàlid'
      });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        error: 'La contrasenya ha de tindre almenys 8 caràcters'
      });
    }

    if (tipo !== 'profesor' && tipo !== 'alumno') {
      return res.status(400).json({
        error: 'El tipus ha de ser professor o alumne'
      });
    }

    if (tipo === 'profesor' && !validarNiaONumeroProfesor(niaLimpio)) {
      return res.status(400).json({
        error: 'El NIA del professor ha de tindre 8 dígits numèrics'
      });
    }

    if (!validarMatriculaEspanola(matriculaLimpia)) {
      return res.status(400).json({
        error: 'La matrícula ha de tindre format espanyol (4 números i 3 lletres)'
      });
    }

    if (!modeloLimpio || modeloLimpio.length > 50) {
      return res.status(400).json({
        error: 'El model del cotxe és obligatori i no pot superar 50 caràcters'
      });
    }

    const emailExiste = await db.query(
      'SELECT id FROM usuarios WHERE LOWER(email) = $1',
      [emailLimpio]
    );

    if (emailExiste.rows.length > 0) {
      return res.status(400).json({
        error: 'El correu electrònic ja està registrat'
      });
    }

    const rolQuery = await db.query(
      'SELECT id FROM roles WHERE nombre = $1',
      ['user']
    );

    if (rolQuery.rows.length === 0) {
      return res.status(400).json({
        error: 'Rol no vàlid'
      });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const niaFinal = tipo === 'profesor' ? niaLimpio : null;

    const resultado = await db.query(
      `INSERT INTO usuarios (
        nombre, apellidos, email, password_hash, rol_id, tipo,
        nia_profesor, matricula, modelo_coche
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, nombre, apellidos, email, tipo, nia_profesor,
                 matricula, modelo_coche, fecha_registro`,
      [
        nombreLimpio,
        apellidosLimpios,
        emailLimpio,
        password_hash,
        rolQuery.rows[0].id,
        tipo,
        niaFinal,
        matriculaLimpia,
        modeloLimpio
      ]
    );

    return res.status(201).json({
      mensaje: 'Usuari creat correctament',
      usuario: resultado.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({
        error: 'El correu electrònic ja està registrat'
      });
    }

    return res.status(500).json({
      error: 'Error en crear l\'usuari'
    });
  }
}

// Admin: activar o desactivar un usuario sin eliminarlo
async function cambiarEstadoUsuario(req, res) {
  try {
    const usuarioId = Number(req.params.id);
    const activo = req.body ? req.body.activo : undefined;

    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
      return res.status(400).json({
        error: 'Identificador d\'usuari no vàlid'
      });
    }

    if (typeof activo !== 'boolean') {
      return res.status(400).json({
        error: 'El camp activo ha de ser un booleà'
      });
    }

    const usuarioQuery = await db.query(
      `SELECT u.id, u.nombre, u.apellidos, u.email, u.activo, r.nombre AS rol
       FROM usuarios u
       INNER JOIN roles r ON u.rol_id = r.id
       WHERE u.id = $1`,
      [usuarioId]
    );

    if (usuarioQuery.rows.length === 0) {
      return res.status(404).json({
        error: 'Usuari no trobat'
      });
    }

    const usuario = usuarioQuery.rows[0];

    if (usuario.rol === 'admin') {
      return res.status(409).json({
        error: 'No es pot desactivar un administrador'
      });
    }

    if (usuarioId === req.usuario.id && !activo) {
      return res.status(409).json({
        error: 'No pots desactivar el teu propi compte'
      });
    }

    const resultado = await db.query(
      `UPDATE usuarios
       SET activo = $1
       WHERE id = $2
       RETURNING id, nombre, apellidos, email, tipo, nia_profesor,
                 matricula, modelo_coche, fecha_registro, activo`,
      [activo, usuarioId]
    );

    return res.status(200).json({
      mensaje: activo
        ? 'Usuari activat correctament'
        : 'Usuari desactivat correctament',
      usuario: {
        ...resultado.rows[0],
        rol: usuario.rol
      }
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Error en canviar l\'estat de l\'usuari'
    });
  }
}

// Admin: eliminar usuario
async function eliminarUsuario(req, res) {
  try {
    const usuarioId = Number(req.params.id);

    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
      return res.status(400).json({
        error: 'Identificador d\'usuari no vàlid'
      });
    }

    if (usuarioId === req.usuario.id) {
      return res.status(409).json({
        error: 'No pots eliminar el teu propi compte'
      });
    }

    const usuarioQuery = await db.query(
      `SELECT u.id, u.nombre, u.apellidos, u.email, r.nombre AS rol
       FROM usuarios u
       INNER JOIN roles r ON u.rol_id = r.id
       WHERE u.id = $1`,
      [usuarioId]
    );

    if (usuarioQuery.rows.length === 0) {
      return res.status(404).json({
        error: 'Usuari no trobat'
      });
    }

    const usuario = usuarioQuery.rows[0];

    if (usuario.rol === 'admin') {
      return res.status(409).json({
        error: 'No es pot eliminar un administrador'
      });
    }

    const reservasQuery = await db.query(
      'SELECT id FROM reservas WHERE usuario_id = $1 LIMIT 1',
      [usuarioId]
    );

    if (reservasQuery.rows.length > 0) {
      return res.status(409).json({
        error: 'No es pot eliminar un usuari amb reserves'
      });
    }

    await db.query('DELETE FROM usuarios WHERE id = $1', [usuarioId]);

    return res.status(200).json({
      mensaje: 'Usuari eliminat correctament',
      usuario
    });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(409).json({
        error: 'No es pot eliminar l\'usuari perquè té dades associades'
      });
    }

    return res.status(500).json({
      error: 'Error en eliminar l\'usuari'
    });
  }
}

module.exports = {
  obtenerUsuarios,
  crearUsuario,
  cambiarEstadoUsuario,
  eliminarUsuario
};
