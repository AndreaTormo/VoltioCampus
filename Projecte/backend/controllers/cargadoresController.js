const db = require('../config/db');

function limpiarTexto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

// Obtener cargadores para dashboard (todos los usuarios autenticados)
async function obtenerCargadores(req, res) {
  try {
    const resultado = await db.query(
      `SELECT id, numero, tipo_grupo, conector, kw, tiempo_estimado_fijo, activo, descripcion
       FROM cargadores
       ORDER BY numero ASC`
    );

    return res.status(200).json({
      cargadores: resultado.rows
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Error en obtindre els carregadors'
    });
  }
}

async function actualizarEstado(req, res, activo) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      error: 'Identificador de carregador no vàlid'
    });
  }

  try {
    const resultado = await db.query(
      `UPDATE cargadores
       SET activo = $1
       WHERE id = $2
       RETURNING id, numero, tipo_grupo, conector, kw, tiempo_estimado_fijo, activo, descripcion`,
      [activo, id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        error: 'Carregador no trobat'
      });
    }

    return res.status(200).json({
      mensaje: activo
        ? 'Carregador activat correctament'
        : 'Carregador desactivat correctament',
      cargador: resultado.rows[0]
    });
  } catch (error) {
    return res.status(500).json({
      error: activo ? 'Error en activar el carregador' : 'Error en desactivar el carregador'
    });
  }
}

// Admin: activar cargador
function activarCargador(req, res) {
  return actualizarEstado(req, res, true);
}

// Admin: desactivar cargador
function desactivarCargador(req, res) {
  return actualizarEstado(req, res, false);
}

// Admin: añadir cargador
async function crearCargador(req, res) {
  try {
    const numero = Number(req.body.numero);
    const tipoGrupo = limpiarTexto(req.body.tipo_grupo);
    const conector = limpiarTexto(req.body.conector);
    const kw = Number(req.body.kw);
    const tiempoEstimado = Number(req.body.tiempo_estimado_fijo);
    const descripcion = limpiarTexto(req.body.descripcion);

    if (!Number.isInteger(numero) || numero < 1) {
      return res.status(400).json({
        error: 'El número del carregador ha de ser un enter major que 0'
      });
    }

    if (tipoGrupo !== 'profesores' && tipoGrupo !== 'alumnos') {
      return res.status(400).json({
        error: 'El tipo_grupo ha de ser profesores o alumnos'
      });
    }

    if (!conector || conector.length > 20) {
      return res.status(400).json({
        error: 'El connector és obligatori i no pot superar 20 caràcters'
      });
    }

    if (!Number.isFinite(kw) || kw <= 0 || kw > 999.9) {
      return res.status(400).json({
        error: 'La potència ha de ser un número major que 0 i menor o igual que 999.9'
      });
    }

    if (!Number.isInteger(tiempoEstimado) || tiempoEstimado <= 0) {
      return res.status(400).json({
        error: 'El temps estimat ha de ser un enter major que 0'
      });
    }

    if (descripcion.length > 100) {
      return res.status(400).json({
        error: 'La descripció no pot superar 100 caràcters'
      });
    }

    const numeroExiste = await db.query(
      'SELECT id FROM cargadores WHERE numero = $1',
      [numero]
    );

    if (numeroExiste.rows.length > 0) {
      return res.status(409).json({
        error: 'Ja existeix un carregador amb eixe número'
      });
    }

    const resultado = await db.query(
      `INSERT INTO cargadores (numero, tipo_grupo, conector, kw, tiempo_estimado_fijo, activo, descripcion)
       VALUES ($1, $2, $3, $4, $5, TRUE, $6)
       RETURNING id, numero, tipo_grupo, conector, kw, tiempo_estimado_fijo, activo, descripcion`,
      [numero, tipoGrupo, conector, kw, tiempoEstimado, descripcion || null]
    );

    return res.status(201).json({
      mensaje: 'Carregador afegit correctament',
      cargador: resultado.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'Ja existeix un carregador amb eixe número'
      });
    }

    return res.status(500).json({
      error: 'Error en afegir el carregador'
    });
  }
}

// Admin: eliminar carregador
async function eliminarCargador(req, res) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      error: 'Identificador de carregador no vàlid'
    });
  }

  try {
    const reservaExiste = await db.query(
      'SELECT id FROM reservas WHERE cargador_id = $1 LIMIT 1',
      [id]
    );

    if (reservaExiste.rows.length > 0) {
      return res.status(409).json({
        error: 'No es pot eliminar un carregador amb reserves associades'
      });
    }

    const resultado = await db.query(
      `DELETE FROM cargadores WHERE id = $1 RETURNING id, numero, tipo_grupo, conector, kw, tiempo_estimado_fijo, activo, descripcion`,
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        error: 'Carregador no trobat'
      });
    }

    return res.status(200).json({
      mensaje: 'Carregador eliminat correctament',
      cargador: resultado.rows[0]
    });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(409).json({
        error: 'No es pot eliminar un carregador amb reserves associades'
      });
    }

    return res.status(500).json({
      error: 'Error en eliminar el carregador'
    });
  }
}

module.exports = {
  obtenerCargadores,
  activarCargador,
  desactivarCargador,
  crearCargador,
  eliminarCargador
};
