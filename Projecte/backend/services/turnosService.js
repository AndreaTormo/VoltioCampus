const { HORARIOS_CENTRO } = require('../config/horarios');
const { esFechaISOValida } = require('../utils/validaciones');

const BLOQUES = Object.freeze(['BLOQUE_1', 'BLOQUE_2', 'BLOQUE_3', 'BLOQUE_4']);
const MAX_RESERVAS_SEMANA = 5;
const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

function parseFecha(fechaStr) {
  if (!FORMATO_FECHA.test(fechaStr) || !esFechaISOValida(fechaStr)) {
    return null;
  }

  const fecha = new Date(`${fechaStr}T00:00:00`);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function formatearFechaISO(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function normalizarInicioSemana(fechaStr) {
  const fecha = parseFecha(fechaStr);
  if (!fecha) {
    return null;
  }

  const diaSemana = fecha.getDay();
  const desplazamiento = (diaSemana + 6) % 7;
  fecha.setDate(fecha.getDate() - desplazamiento);
  return formatearFechaISO(fecha);
}

function generarDiasSemana(semanaInicio) {
  const inicio = parseFecha(semanaInicio);
  if (!inicio) {
    return [];
  }

  return [0, 1, 2, 3, 4].map(function (desplazamiento) {
    const fecha = new Date(inicio);
    fecha.setDate(inicio.getDate() + desplazamiento);
    return formatearFechaISO(fecha);
  });
}

function compararFechas(a, b) {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

function intervaloIncluyeBloque(intervalo, bloque) {
  const horarioBloque = HORARIOS_CENTRO[bloque];
  return Boolean(
    horarioBloque &&
    intervalo.hora_inicio <= horarioBloque.inicio &&
    intervalo.hora_fin >= horarioBloque.fin
  );
}

function horasBloque(bloque) {
  const configuracion = HORARIOS_CENTRO[bloque];
  return configuracion ? configuracion.horas : 0;
}

function grupoDelUsuario(tipo) {
  return tipo === 'profesor' ? 'profesores' : 'alumnos';
}

function diaSemanaISO(fechaStr) {
  const fecha = parseFecha(fechaStr);
  if (!fecha) {
    return null;
  }
  const dia = fecha.getDay();
  return dia === 0 ? 7 : dia;
}

function crearEstadisticas(usuarios) {
  const estadisticas = new Map();

  usuarios.forEach(function (usuario) {
    estadisticas.set(Number(usuario.id), {
      horas_pasadas: 0,
      ultima_pasada: null,
      reservas_semana: 0
    });
  });

  return estadisticas;
}

function calcularEstadisticas(usuarios, reservasPasadas, reservasSemana) {
  const estadisticas = crearEstadisticas(usuarios);

  (Array.isArray(reservasPasadas) ? reservasPasadas : []).forEach(function (reserva) {
    if (reserva.estado && reserva.estado !== 'activa') {
      return;
    }
    const datos = estadisticas.get(Number(reserva.usuario_id));
    if (!datos) {
      return;
    }
    datos.horas_pasadas += horasBloque(reserva.bloque);
    if (!datos.ultima_pasada || reserva.fecha_reserva > datos.ultima_pasada) {
      datos.ultima_pasada = reserva.fecha_reserva;
    }
  });

  (Array.isArray(reservasSemana) ? reservasSemana : []).forEach(function (reserva) {
    if (reserva.estado && reserva.estado !== 'activa') {
      return;
    }
    const datos = estadisticas.get(Number(reserva.usuario_id));
    if (datos) {
      datos.reservas_semana += 1;
    }
  });

  return estadisticas;
}

function ordenarUsuariosPorPrioridad(usuarios, estadisticas) {
  return usuarios.slice().sort(function (usuarioA, usuarioB) {
    const datosA = estadisticas.get(Number(usuarioA.id));
    const datosB = estadisticas.get(Number(usuarioB.id));

    if (datosA.horas_pasadas !== datosB.horas_pasadas) {
      return datosA.horas_pasadas - datosB.horas_pasadas;
    }

    if (datosA.ultima_pasada === null && datosB.ultima_pasada !== null) {
      return -1;
    }
    if (datosB.ultima_pasada === null && datosA.ultima_pasada !== null) {
      return 1;
    }
    if (datosA.ultima_pasada !== null && datosB.ultima_pasada !== null) {
      const comparacion = compararFechas(datosA.ultima_pasada, datosB.ultima_pasada);
      if (comparacion !== 0) {
        return comparacion;
      }
    }

    if (datosA.reservas_semana !== datosB.reservas_semana) {
      return datosA.reservas_semana - datosB.reservas_semana;
    }

    return Number(usuarioA.id) - Number(usuarioB.id);
  });
}

function crearSlotsLibres(dias, cargadores, reservasSemana) {
  const ocupados = new Set();
  const diasUsuario = new Set();
  const slots = new Map();

  (Array.isArray(reservasSemana) ? reservasSemana : []).forEach(function (reserva) {
    if (reserva.estado && reserva.estado !== 'activa') {
      return;
    }
    ocupados.add(`${reserva.cargador_id}|${reserva.fecha_reserva}|${reserva.bloque}`);
    diasUsuario.add(`${reserva.usuario_id}|${reserva.fecha_reserva}`);
  });

  dias.forEach(function (dia) {
    BLOQUES.forEach(function (bloque) {
      const clave = `${dia}|${bloque}`;
      const libres = cargadores.filter(function (cargador) {
        return cargador.activo !== false &&
          !ocupados.has(`${cargador.id}|${dia}|${bloque}`);
      });
      slots.set(clave, libres.slice());
    });
  });

  return { slots, diasUsuario };
}

function crearContadoresBloques(usuarios, reservasSemana) {
  const porUsuario = new Map();
  const global = {};

  BLOQUES.forEach(function (bloque) {
    global[bloque] = 0;
  });

  usuarios.forEach(function (usuario) {
    const contador = {};
    BLOQUES.forEach(function (bloque) {
      contador[bloque] = 0;
    });
    porUsuario.set(Number(usuario.id), contador);
  });

  (Array.isArray(reservasSemana) ? reservasSemana : []).forEach(function (reserva) {
    if (reserva.estado && reserva.estado !== 'activa') {
      return;
    }
    if (!BLOQUES.includes(reserva.bloque)) {
      return;
    }
    global[reserva.bloque] += 1;
    const contador = porUsuario.get(Number(reserva.usuario_id));
    if (contador) {
      contador[reserva.bloque] += 1;
    }
  });

  return { porUsuario, global };
}

function elegirCandidato(candidatos, contadorUsuario, contadorGlobal) {
  return candidatos.slice().sort(function (a, b) {
    if (a.preferente !== b.preferente) {
      return a.preferente ? -1 : 1;
    }

    const usuarioA = contadorUsuario[a.bloque] || 0;
    const usuarioB = contadorUsuario[b.bloque] || 0;
    if (usuarioA !== usuarioB) {
      return usuarioA - usuarioB;
    }

    const globalA = contadorGlobal[a.bloque] || 0;
    const globalB = contadorGlobal[b.bloque] || 0;
    if (globalA !== globalB) {
      return globalA - globalB;
    }

    return BLOQUES.indexOf(a.bloque) - BLOQUES.indexOf(b.bloque);
  })[0];
}

function generarAsignacionesTurnos({
  usuarios,
  horarios,
  cargadores,
  reservasSemana,
  reservasPasadas,
  festivos,
  semanaInicio,
  hoy
}) {
  const dias = generarDiasSemana(semanaInicio);
  const diasFestivos = new Set(
    (Array.isArray(festivos) ? festivos : []).map(function (festivo) {
      return typeof festivo === 'string' ? festivo : festivo.fecha;
    })
  );
  if (dias.length === 0 || usuarios.length === 0 || cargadores.length === 0) {
    return {
      asignaciones: [],
      usuarios_sin_plaza: usuarios.slice(),
      estadisticas: new Map()
    };
  }

  const estadisticas = calcularEstadisticas(
    usuarios,
    reservasPasadas,
    reservasSemana
  );
  const usuariosOrdenados = ordenarUsuariosPorPrioridad(usuarios, estadisticas);
  const { slots, diasUsuario } = crearSlotsLibres(
    dias,
    cargadores,
    reservasSemana
  );
  const contadores = crearContadoresBloques(usuarios, reservasSemana);
  const asignaciones = [];
  const usuariosSinPlaza = [];

  usuariosOrdenados.forEach(function (usuario) {
    const usuarioId = Number(usuario.id);
    const datos = estadisticas.get(usuarioId);
    let restantes = MAX_RESERVAS_SEMANA - datos.reservas_semana;

    if (restantes <= 0) {
      return;
    }

    const grupo = grupoDelUsuario(usuario.tipo);
    const diasDisponibles = [];

    dias.forEach(function (dia) {
      if (hoy && compararFechas(dia, hoy) < 0) {
        return;
      }
      if (diasFestivos.has(dia)) {
        return;
      }
      if (diasUsuario.has(`${usuarioId}|${dia}`)) {
        return;
      }

      const diaSemana = diaSemanaISO(dia);
      const intervalos = horarios.filter(function (horario) {
        return Number(horario.usuario_id) === usuarioId &&
          Number(horario.dia_semana) === diaSemana;
      });

      if (intervalos.length === 0) {
        return;
      }

      const candidatos = [];

      BLOQUES.forEach(function (bloque) {
        const dentroDeHorario = intervalos.some(function (intervalo) {
          return intervaloIncluyeBloque(intervalo, bloque);
        });
        if (!dentroDeHorario) {
          return;
        }

        const libres = slots.get(`${dia}|${bloque}`) || [];
        const propios = libres.filter(function (cargador) {
          return cargador.tipo_grupo === grupo;
        });
        const otros = libres.filter(function (cargador) {
          return cargador.tipo_grupo !== grupo;
        });
        const disponibles = propios.length > 0 ? propios : otros;

        if (disponibles.length > 0) {
          candidatos.push({
            bloque,
            preferente: propios.length > 0,
            cargadores: disponibles
          });
        }
      });

      if (candidatos.length > 0) {
        diasDisponibles.push({ fecha: dia, candidatos });
      }
    });

    if (diasDisponibles.length === 0) {
      usuariosSinPlaza.push(usuario);
      return;
    }

    const contadorUsuario = contadores.porUsuario.get(usuarioId);

    for (const dia of diasDisponibles) {
      if (restantes <= 0) {
        break;
      }

      const candidato = elegirCandidato(
        dia.candidatos,
        contadorUsuario,
        contadores.global
      );
      if (!candidato || candidato.cargadores.length === 0) {
        continue;
      }

      const cargador = candidato.cargadores[0];
      const clave = `${dia.fecha}|${candidato.bloque}`;
      slots.set(
        clave,
        (slots.get(clave) || []).filter(function (item) {
          return Number(item.id) !== Number(cargador.id);
        })
      );

      asignaciones.push({
        usuario,
        cargador,
        fecha_reserva: dia.fecha,
        bloque: candidato.bloque
      });

      diasUsuario.add(`${usuarioId}|${dia.fecha}`);
      contadorUsuario[candidato.bloque] += 1;
      contadores.global[candidato.bloque] += 1;
      datos.reservas_semana += 1;
      restantes -= 1;
    }

    if (restantes > 0) {
      usuariosSinPlaza.push(usuario);
    }
  });

  return {
    asignaciones,
    usuarios_sin_plaza: usuariosSinPlaza,
    estadisticas
  };
}

module.exports = {
  BLOQUES,
  MAX_RESERVAS_SEMANA,
  normalizarInicioSemana,
  formatearFechaISO,
  generarDiasSemana,
  calcularEstadisticas,
  ordenarUsuariosPorPrioridad,
  generarAsignacionesTurnos
};
