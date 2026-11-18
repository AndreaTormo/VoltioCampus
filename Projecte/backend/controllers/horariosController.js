const db = require('../config/db');
const { validarIntervalosHorario } = require('../utils/horariosUsuario');

function responderErrorHorario(res, error, accion) {
  if (error.code === '42P01') {
    return res.status(503).json({
      error: 'La base de dades encara no té activats els horaris. Executa la migració migrate_horarios_usuario.sql.'
    });
  }

  console.error(`Error en ${accion} l’horari`, error);
  return res.status(500).json({ error: `Error en ${accion} l’horari` });
}

async function obtenerHorario(req, res, usuarioId) {
  try {
    const resultado = await db.query(
      `SELECT u.id AS usuario_id, h.dia_semana,
              TO_CHAR(h.hora_inicio, 'HH24:MI') AS hora_inicio,
              TO_CHAR(h.hora_fin, 'HH24:MI') AS hora_fin
       FROM usuarios u
       LEFT JOIN horarios_usuario h ON h.usuario_id = u.id
       WHERE u.id = $1
       ORDER BY h.dia_semana, h.hora_inicio`,
      [usuarioId]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Usuari no trobat' });
    }

    const intervalos = resultado.rows
      .filter(function (fila) {
        return fila.dia_semana !== null;
      })
      .map(function (fila) {
        return {
          dia_semana: fila.dia_semana,
          hora_inicio: fila.hora_inicio,
          hora_fin: fila.hora_fin
        };
      });

    return res.status(200).json({ intervalos });
  } catch (error) {
    return responderErrorHorario(res, error, 'obtindre');
  }
}

async function guardarHorario(req, res, usuarioId) {
  const validacion = validarIntervalosHorario(req.body && req.body.intervalos);

  if (!validacion.valido) {
    return res.status(400).json({ error: validacion.error });
  }

  let cliente;
  let transaccionIniciada = false;

  try {
    cliente = await db.pool.connect();
    await cliente.query('BEGIN');
    transaccionIniciada = true;

    const usuario = await cliente.query(
      'SELECT id FROM usuarios WHERE id = $1 FOR UPDATE',
      [usuarioId]
    );

    if (usuario.rows.length === 0) {
      await cliente.query('ROLLBACK');
      transaccionIniciada = false;
      return res.status(404).json({ error: 'Usuari no trobat' });
    }

    await cliente.query(
      'DELETE FROM horarios_usuario WHERE usuario_id = $1',
      [usuarioId]
    );

    for (const intervalo of validacion.intervalos) {
      await cliente.query(
        `INSERT INTO horarios_usuario
           (usuario_id, dia_semana, hora_inicio, hora_fin)
         VALUES ($1, $2, $3::time, $4::time)`,
        [
          usuarioId,
          intervalo.dia_semana,
          intervalo.hora_inicio,
          intervalo.hora_fin
        ]
      );
    }

    await cliente.query('COMMIT');
    transaccionIniciada = false;
    return res.status(200).json({
      mensaje: 'Horari guardat correctament',
      intervalos: validacion.intervalos
    });
  } catch (error) {
    if (cliente && transaccionIniciada) {
      try {
        await cliente.query('ROLLBACK');
      } catch (errorRollback) {
        console.error('Error en revertir la transacció de l’horari', errorRollback);
      }
    }
    return responderErrorHorario(res, error, 'guardar');
  } finally {
    if (cliente) {
      cliente.release();
    }
  }
}

function obtenerMiHorario(req, res) {
  return obtenerHorario(req, res, req.usuario.id);
}

function guardarMiHorario(req, res) {
  return guardarHorario(req, res, req.usuario.id);
}

function obtenerHorarioUsuario(req, res) {
  const usuarioId = Number(req.params.id);
  if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
    return res.status(400).json({ error: 'Identificador d’usuari no vàlid' });
  }
  return obtenerHorario(req, res, usuarioId);
}

function guardarHorarioUsuario(req, res) {
  const usuarioId = Number(req.params.id);
  if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
    return res.status(400).json({ error: 'Identificador d’usuari no vàlid' });
  }
  return guardarHorario(req, res, usuarioId);
}

module.exports = {
  obtenerMiHorario,
  guardarMiHorario,
  obtenerHorarioUsuario,
  guardarHorarioUsuario
};
