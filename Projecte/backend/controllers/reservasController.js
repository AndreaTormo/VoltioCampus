const db = require('../config/db');
const {
  esDiaLaborable,
  esBloqueValido,
  obtenerMetadatosBloque
} = require('../utils/horarios');
const { bloqueEstaEnHorario } = require('../utils/horariosUsuario');
const { validarDatosReserva } = require('../utils/validaciones');
const { obtenerResumenHoras } = require('../services/horasService');
const { agruparHistorialUsuarios } = require('../services/historialService');
const {
  fechaEsPasada,
  validarCancelacionReserva
} = require('../services/cancelacionService');
const {
  normalizarInicioSemana,
  formatearFechaISO,
  generarDiasSemana,
  generarAsignacionesTurnos
} = require('../services/turnosService');

function enriquecerReserva(reserva) {
  const metadatos = obtenerMetadatosBloque(reserva && reserva.bloque);

  return {
    ...reserva,
    hora_inicio: metadatos ? metadatos.inicio : null,
    hora_fin: metadatos ? metadatos.fin : null,
    horas: metadatos ? metadatos.horas : 0
  };
}

const SELECT_CARGADOR = `SELECT c.id, c.numero, c.tipo_grupo, c.conector, c.kw,
                                c.tiempo_estimado_fijo, c.activo, c.descripcion
                         FROM cargadores c`;

function grupoDelUsuario(tipo) {
  return tipo === 'profesor' ? 'profesores' : 'alumnos';
}

// Busca el primer cargador libre de un grupo para una fecha y bloque.
async function buscarCargadorLibre(tipoGrupo, fecha, bloque) {
  const cargadores = await db.query(
    `${SELECT_CARGADOR}
     WHERE c.tipo_grupo = $1 AND c.activo = TRUE
     ORDER BY c.numero ASC`,
    [tipoGrupo]
  );

  for (const cargador of cargadores.rows) {
    const ocupados = await db.query(
      `SELECT id
       FROM reservas
       WHERE cargador_id = $1 AND fecha_reserva = $2 AND bloque = $3 AND estado = 'activa'`,
      [cargador.id, fecha, bloque]
    );

    if (ocupados.rows.length === 0) {
      return cargador;
    }
  }

  return null;
}

// Crear reserva
async function crearReserva(req, res) {
  try {
    const usuarioId = req.usuario.id;
    const fecha_reserva = typeof req.body.fecha_reserva === 'string'
      ? req.body.fecha_reserva.trim()
      : '';
    const bloque = typeof req.body.bloque === 'string'
      ? req.body.bloque.trim()
      : '';

    const validacion = validarDatosReserva({ fecha_reserva, bloque });
    if (!validacion.valido) {
      return res.status(400).json({
        error: 'Errors en el formulari',
        errores: validacion.errores
      });
    }

    if (fechaEsPasada(fecha_reserva)) {
      return res.status(400).json({
        error: 'No es poden fer reserves en dates passades'
      });
    }

    if (!esDiaLaborable(fecha_reserva)) {
      return res.status(400).json({
        error: 'Només es poden fer reserves de dilluns a divendres'
      });
    }

    if (!esBloqueValido(bloque)) {
      return res.status(400).json({
        error: 'Bloc no vàlid'
      });
    }

    // Comprobar que no sea festivo
    const festivoExiste = await db.query(
      'SELECT id FROM festivos WHERE fecha = $1',
      [fecha_reserva]
    );

    if (festivoExiste.rows.length > 0) {
      return res.status(400).json({
        error: 'No es poden fer reserves en dies festius'
      });
    }

    const horarioValido = await bloqueEstaEnHorario(
      usuarioId,
      fecha_reserva,
      bloque
    );
    if (!horarioValido) {
      return res.status(400).json({
        error: 'El bloc de càrrega ha d’estar completament dins del teu horari de presència'
      });
    }

    // Obtener los datos del usuario autenticado
    const usuarioQuery = await db.query(
      `SELECT u.id, u.nombre, u.apellidos, u.tipo, u.nia_profesor,
              u.matricula, u.modelo_coche, u.ultima_reserva_fecha,
              u.reservas_creadas_count, u.fecha_registro
       FROM usuarios u
       WHERE u.id = $1`,
      [usuarioId]
    );

    if (usuarioQuery.rows.length === 0) {
      return res.status(404).json({
        error: 'Usuari no trobat'
      });
    }

    const usuario = usuarioQuery.rows[0];

    // Un único bloque por día
    const reservaDia = await db.query(
      `SELECT id
       FROM reservas
       WHERE usuario_id = $1 AND fecha_reserva = $2 AND estado = 'activa'`,
      [usuarioId, fecha_reserva]
    );

    if (reservaDia.rows.length > 0) {
      return res.status(409).json({
        error: 'Ja tens una reserva per a eixe dia'
      });
    }

    // Preferencia por el grupo propio; si no hay libre, usar el otro grupo
    let cargadorAsignado = await buscarCargadorLibre(
      grupoDelUsuario(usuario.tipo),
      fecha_reserva,
      bloque
    );

    if (!cargadorAsignado) {
      const otroGrupo = usuario.tipo === 'profesor' ? 'alumnos' : 'profesores';
      cargadorAsignado = await buscarCargadorLibre(
        otroGrupo,
        fecha_reserva,
        bloque
      );
    }

    if (!cargadorAsignado) {
      return res.status(400).json({
        error: 'No hi ha carregadors disponibles per a eixa data i franja'
      });
    }

    const nombreCompleto = `${usuario.nombre || ''} ${usuario.apellidos || ''}`.trim();
    const matricula = usuario.matricula
      ? String(usuario.matricula).toUpperCase()
      : null;

    // Crear reserva con los datos guardados en la cuenta del usuario
    const reservaResultado = await db.query(
      `INSERT INTO reservas (
         usuario_id, cargador_id, bloque, fecha_reserva,
         nombre_apellidos_snapshot, nia_snapshot,
         matricula_snapshot, modelo_coche_snapshot
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, usuario_id, cargador_id, bloque,
                 TO_CHAR(fecha_reserva, 'YYYY-MM-DD') AS fecha_reserva, estado`,
      [
        usuarioId,
        cargadorAsignado.id,
        bloque,
        fecha_reserva,
        nombreCompleto,
        usuario.nia_profesor || null,
        matricula,
        usuario.modelo_coche || null
      ]
    );

    // Actualizar usuario: ultima_reserva_fecha y reservas_creadas_count
    await db.query(
      `UPDATE usuarios
       SET ultima_reserva_fecha = NOW(), reservas_creadas_count = reservas_creadas_count + 1
       WHERE id = $1`,
      [usuarioId]
    );

    return res.status(201).json({
      mensaje: 'Reserva creada correctament',
      reserva: enriquecerReserva(reservaResultado.rows[0]),
      cargador: cargadorAsignado
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({
        error: 'Ja existeix una reserva per a eixe carregador en eixa data i franja'
      });
    }

    return res.status(500).json({
      error: 'Error en crear la reserva'
    });
  }
}

// Disponibilidad de todos los cargadores para una fecha y bloque
async function obtenerDisponibilidad(req, res) {
  try {
    const fecha = typeof req.query.fecha === 'string' ? req.query.fecha.trim() : '';
    const bloque = typeof req.query.bloque === 'string' ? req.query.bloque.trim() : '';

    const validacion = validarDatosReserva({ fecha_reserva: fecha, bloque });
    if (!validacion.valido) {
      return res.status(400).json({
        error: 'Errors en la consulta',
        errores: validacion.errores
      });
    }

    const laborable = esDiaLaborable(fecha);
    const bloqueValido = esBloqueValido(bloque);
    const pasada = fechaEsPasada(fecha);

    const festivoExiste = await db.query(
      'SELECT id FROM festivos WHERE fecha = $1',
      [fecha]
    );
    const festivo = festivoExiste.rows.length > 0;
    const horarioValido = laborable && bloqueValido && !festivo && !pasada
      ? await bloqueEstaEnHorario(req.usuario.id, fecha, bloque)
      : false;

    const resultado = await db.query(
      `SELECT c.id, c.numero, c.tipo_grupo, c.conector, c.kw,
              c.tiempo_estimado_fijo, c.activo, c.descripcion,
              CASE WHEN r.id IS NULL THEN FALSE ELSE TRUE END AS ocupado
       FROM cargadores c
       LEFT JOIN reservas r
         ON r.cargador_id = c.id
        AND r.fecha_reserva = $1
        AND r.bloque = $2
        AND r.estado = 'activa'
       ORDER BY c.numero ASC`,
      [fecha, bloque]
    );

    const grupoUsuario = grupoDelUsuario(req.usuario.tipo);

    const cargadores = resultado.rows.map(function (cargador) {
      return {
        id: cargador.id,
        numero: cargador.numero,
        tipo_grupo: cargador.tipo_grupo,
        conector: cargador.conector,
        kw: cargador.kw,
        tiempo_estimado_fijo: cargador.tiempo_estimado_fijo,
        activo: cargador.activo,
        descripcion: cargador.descripcion,
        ocupado: cargador.ocupado,
        preferente: cargador.tipo_grupo === grupoUsuario
      };
    });

    return res.status(200).json({
      fecha: fecha,
      bloque: bloque,
      laborable: laborable,
      festivo: festivo,
      pasada: pasada,
      horario_valido: horarioValido,
      disponible: laborable && bloqueValido && !festivo && !pasada && horarioValido,
      cargadores: cargadores
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Error en obtindre la disponibilitat'
    });
  }
}

// Obtener mis reservas
async function misReservas(req, res) {
  try {
    const usuarioId = req.usuario.id;
    const resultado = await db.query(
      `SELECT r.id, r.bloque,
              TO_CHAR(r.fecha_reserva, 'YYYY-MM-DD') AS fecha_reserva,
              r.estado, r.hora_creacion,
              c.numero as cargador_numero, c.tipo_grupo, c.conector, c.kw
       FROM reservas r
       INNER JOIN cargadores c ON r.cargador_id = c.id
       WHERE r.usuario_id = $1
       ORDER BY r.fecha_reserva DESC, r.bloque ASC`,
      [usuarioId]
    );

    const reservas = resultado.rows.map(enriquecerReserva);
    const resumenActivas = obtenerResumenHoras(reservas, { soloActivas: true });
    const resumenPasadas = obtenerResumenHoras(reservas, {
      soloActivas: true,
      soloPasadas: true
    });

    return res.status(200).json({
      reservas,
      resumen: {
        horas_activas: resumenActivas.horas,
        horas_pasadas: resumenPasadas.horas,
        reservas_activas: resumenActivas.reservas,
        reservas_pasadas: resumenPasadas.reservas,
        total_reservas: reservas.length
      }
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Error en obtindre les reserves'
    });
  }
}

// Listado de reservas para el panel de administración
async function listarReservasAdmin(req, res) {
  try {
    const estado = typeof req.query.estado === 'string'
      ? req.query.estado.trim()
      : 'activa';
    const estadosValidos = ['activa', 'cancelada', 'todas'];

    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({
        error: 'Estat de reserva no vàlid'
      });
    }

    const filtroEstado = estado === 'todas' ? '' : 'WHERE r.estado = $1';
    const parametros = estado === 'todas' ? [] : [estado];

    const resultado = await db.query(
      `SELECT r.id, r.usuario_id, r.bloque, r.estado,
              TO_CHAR(r.fecha_reserva, 'YYYY-MM-DD') AS fecha_reserva,
              r.hora_creacion,
              u.nombre AS usuario_nombre, u.apellidos AS usuario_apellidos,
              u.email AS usuario_email, u.tipo AS usuario_tipo,
              rol.nombre AS usuario_rol,
              c.numero AS cargador_numero, c.tipo_grupo, c.conector, c.kw
       FROM reservas r
       INNER JOIN usuarios u ON u.id = r.usuario_id
       INNER JOIN roles rol ON rol.id = u.rol_id
       INNER JOIN cargadores c ON c.id = r.cargador_id
       ${filtroEstado}
       ORDER BY r.fecha_reserva ASC, r.bloque ASC, u.apellidos ASC`,
      parametros
    );

    const reservas = resultado.rows.map(enriquecerReserva);

    return res.status(200).json({
      reservas,
      total: reservas.length
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Error en obtindre les reserves'
    });
  }
}

// Cancelar una reserva propia o, si es admin, cualquiera
async function cancelarReserva(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        error: 'Reserva no vàlida'
      });
    }

    const resultado = await db.query(
      `SELECT r.id, r.usuario_id, r.cargador_id, r.bloque, r.estado,
              TO_CHAR(r.fecha_reserva, 'YYYY-MM-DD') AS fecha_reserva,
              r.hora_creacion,
              c.numero AS cargador_numero, c.tipo_grupo, c.conector, c.kw
       FROM reservas r
       INNER JOIN cargadores c ON c.id = r.cargador_id
       WHERE r.id = $1`,
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        error: 'Reserva no trobada'
      });
    }

    const reserva = resultado.rows[0];
    const validacion = validarCancelacionReserva({
      reserva,
      usuario: req.usuario,
      esAdmin: req.usuario.rol === 'admin'
    });

    if (!validacion.permitido) {
      return res.status(validacion.status).json({
        error: validacion.error
      });
    }

    const actualizada = await db.query(
      `UPDATE reservas
       SET estado = 'cancelada'
       WHERE id = $1 AND estado = 'activa'
       RETURNING id, usuario_id, cargador_id, bloque, estado,
                 TO_CHAR(fecha_reserva, 'YYYY-MM-DD') AS fecha_reserva,
                 hora_creacion`,
      [id]
    );

    if (actualizada.rows.length === 0) {
      return res.status(409).json({
        error: 'La reserva ja no es pot cancel·lar'
      });
    }

    return res.status(200).json({
      mensaje: 'Reserva cancel·lada correctament',
      reserva: enriquecerReserva({
        ...reserva,
        ...actualizada.rows[0]
      })
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Error en cancel·lar la reserva'
    });
  }
}

// Generar los turnos semanales para todos los usuarios activos
async function generarTurnosSemana(req, res) {
  try {
    const fechaSolicitada = req.body
      ? req.body.fecha_inicio || req.body.semana_inicio || req.body.fecha
      : '';
    const semanaInicio = normalizarInicioSemana(fechaSolicitada);

    if (!semanaInicio) {
      return res.status(400).json({
        error: 'Indica una data vàlida per a generar els torns'
      });
    }

    const dias = generarDiasSemana(semanaInicio);
    const hoy = formatearFechaISO(new Date());

    if (dias[dias.length - 1] < hoy) {
      return res.status(400).json({
        error: 'No es poden generar torns per a una setmana passada'
      });
    }

    const usuariosQuery = await db.query(
      `SELECT u.id, u.nombre, u.apellidos, u.email, u.tipo,
              u.nia_profesor, u.matricula, u.modelo_coche, u.fecha_registro
       FROM usuarios u
       INNER JOIN roles r ON r.id = u.rol_id
       WHERE r.nombre != 'admin' AND u.activo = TRUE
       ORDER BY u.id ASC`
    );
    const usuarios = usuariosQuery.rows;
    const idsUsuarios = usuarios.map(function (usuario) {
      return Number(usuario.id);
    });

    if (idsUsuarios.length === 0) {
      return res.status(200).json({
        mensaje: 'No hi ha usuaris actius per a generar torns',
        semana_inicio: semanaInicio,
        semana_fin: dias[dias.length - 1],
        resumen: {
          propuestas: 0,
          creadas: 0,
          omitidas: 0,
          usuarios_asignados: 0,
          usuarios_sin_plaza: 0
        },
        reservas: []
      });
    }

    const [
      horariosQuery,
      cargadoresQuery,
      reservasSemanaQuery,
      reservasPasadasQuery,
      festivosQuery
    ] = await Promise.all([
        db.query(
          `SELECT usuario_id, dia_semana,
                  TO_CHAR(hora_inicio, 'HH24:MI') AS hora_inicio,
                  TO_CHAR(hora_fin, 'HH24:MI') AS hora_fin
           FROM horarios_usuario
           WHERE usuario_id = ANY($1::int[])`,
          [idsUsuarios]
        ),
        db.query(
          `SELECT id, numero, tipo_grupo, conector, kw
           FROM cargadores
           WHERE activo = TRUE
           ORDER BY tipo_grupo ASC, numero ASC`
        ),
        db.query(
          `SELECT id, usuario_id, cargador_id, bloque, estado,
                  TO_CHAR(fecha_reserva, 'YYYY-MM-DD') AS fecha_reserva
           FROM reservas
           WHERE estado = 'activa'
             AND fecha_reserva BETWEEN $1 AND $2`,
          [semanaInicio, dias[dias.length - 1]]
        ),
        db.query(
          `SELECT usuario_id, bloque, estado,
                  TO_CHAR(fecha_reserva, 'YYYY-MM-DD') AS fecha_reserva
           FROM reservas
           WHERE estado = 'activa'
             AND fecha_reserva < $1
             AND usuario_id = ANY($2::int[])`,
          [hoy, idsUsuarios]
        ),
        db.query(
          `SELECT TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha
           FROM festivos
           WHERE fecha BETWEEN $1 AND $2`,
          [semanaInicio, dias[dias.length - 1]]
        )
      ]);

    const resultado = generarAsignacionesTurnos({
      usuarios,
      horarios: horariosQuery.rows,
      cargadores: cargadoresQuery.rows,
      reservasSemana: reservasSemanaQuery.rows,
      reservasPasadas: reservasPasadasQuery.rows,
      festivos: festivosQuery.rows.map(function (festivo) {
        return festivo.fecha;
      }),
      semanaInicio,
      hoy
    });

    if (resultado.asignaciones.length === 0) {
      return res.status(200).json({
        mensaje: 'No s\'ha generat cap torn nou',
        semana_inicio: semanaInicio,
        semana_fin: dias[dias.length - 1],
        resumen: {
          propuestas: 0,
          creadas: 0,
          omitidas: 0,
          usuarios_asignados: 0,
          usuarios_sin_plaza: resultado.usuarios_sin_plaza.length
        },
        reservas: []
      });
    }

    const client = await db.pool.connect();
    const creadas = [];

    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(8142026)');

      const contadoresUsuarios = new Map();

      for (const asignacion of resultado.asignaciones) {
        const usuario = asignacion.usuario;
        const cargador = asignacion.cargador;
        const nombreCompleto = `${usuario.nombre || ''} ${usuario.apellidos || ''}`.trim();
        const matricula = usuario.matricula
          ? String(usuario.matricula).toUpperCase()
          : null;

        const insertada = await client.query(
          `INSERT INTO reservas (
             usuario_id, cargador_id, bloque, fecha_reserva,
             nombre_apellidos_snapshot, nia_snapshot,
             matricula_snapshot, modelo_coche_snapshot
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT DO NOTHING
           RETURNING id, usuario_id, cargador_id, bloque,
                     TO_CHAR(fecha_reserva, 'YYYY-MM-DD') AS fecha_reserva,
                     hora_creacion, estado`,
          [
            usuario.id,
            cargador.id,
            asignacion.bloque,
            asignacion.fecha_reserva,
            nombreCompleto,
            usuario.nia_profesor || null,
            matricula,
            usuario.modelo_coche || null
          ]
        );

        if (insertada.rows.length === 0) {
          continue;
        }

        const fila = insertada.rows[0];
        creadas.push({
          ...fila,
          cargador_numero: cargador.numero,
          tipo_grupo: cargador.tipo_grupo,
          conector: cargador.conector,
          kw: cargador.kw
        });

        const usuarioId = Number(usuario.id);
        contadoresUsuarios.set(
          usuarioId,
          (contadoresUsuarios.get(usuarioId) || 0) + 1
        );
      }

      for (const [usuarioId, cantidad] of contadoresUsuarios.entries()) {
        await client.query(
          `UPDATE usuarios
           SET ultima_reserva_fecha = NOW(),
               reservas_creadas_count = reservas_creadas_count + $1
           WHERE id = $2`,
          [cantidad, usuarioId]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const usuariosAsignados = new Set(
      creadas.map(function (reserva) {
        return Number(reserva.usuario_id);
      })
    ).size;

    return res.status(200).json({
      mensaje: creadas.length === 1
        ? 'S\'ha creat 1 torn setmanal'
        : `S'han creat ${creadas.length} torns setmanals`,
      semana_inicio: semanaInicio,
      semana_fin: dias[dias.length - 1],
      resumen: {
        propuestas: resultado.asignaciones.length,
        creadas: creadas.length,
        omitidas: resultado.asignaciones.length - creadas.length,
        usuarios_asignados: usuariosAsignados,
        usuarios_sin_plaza: resultado.usuarios_sin_plaza.length
      },
      reservas: creadas.map(enriquecerReserva)
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Error en generar els torns setmanals'
    });
  }
}

// Histórico de horas por usuario para el panel de administración
async function historialAdmin(req, res) {
  try {
    const resultado = await db.query(
      `SELECT u.id AS usuario_id, u.nombre, u.apellidos, u.email,
              u.tipo, u.activo, r.nombre AS rol,
              res.id AS reserva_id, res.bloque, res.estado,
              TO_CHAR(res.fecha_reserva, 'YYYY-MM-DD') AS fecha_reserva
       FROM usuarios u
       INNER JOIN roles r ON r.id = u.rol_id
       LEFT JOIN reservas res
         ON res.usuario_id = u.id
        AND res.estado = 'activa'
       ORDER BY u.apellidos ASC, u.nombre ASC,
                res.fecha_reserva ASC, res.bloque ASC`
    );

    return res.status(200).json({
      usuarios: agruparHistorialUsuarios(resultado.rows)
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Error en obtindre l\'históric de reserves'
    });
  }
}

module.exports = {
  crearReserva,
  obtenerDisponibilidad,
  misReservas,
  listarReservasAdmin,
  cancelarReserva,
  generarTurnosSemana,
  historialAdmin
};
