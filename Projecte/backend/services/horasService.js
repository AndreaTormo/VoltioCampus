const { obtenerHorasBloque } = require('../utils/horarios');

const ESTADO_ACTIVA = 'activa';

function esReservaActiva(reserva) {
  return Boolean(reserva) && reserva.estado === ESTADO_ACTIVA;
}

function parseFecha(fechaStr) {
  if (typeof fechaStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
    return null;
  }

  const fecha = new Date(`${fechaStr}T00:00:00`);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

// Una fecha es pasada cuando es anterior a hoy; el día actual no cuenta.
function esFechaPasada(fechaStr, hoy = new Date()) {
  const fecha = parseFecha(fechaStr);
  if (!fecha) {
    return false;
  }

  const referencia = new Date(hoy);
  referencia.setHours(0, 0, 0, 0);
  return fecha < referencia;
}

// Horas de una reserva según su bloque. Si ya trae horas calculadas, se respetan.
function horasDeReserva(reserva) {
  if (!reserva) {
    return 0;
  }

  if (Number.isFinite(reserva.horas)) {
    return reserva.horas;
  }

  const horas = obtenerHorasBloque(reserva.bloque);
  return horas === null ? 0 : horas;
}

function filtrarReservas(reservas, opciones = {}) {
  if (!Array.isArray(reservas)) {
    return [];
  }

  const soloActivas = opciones.soloActivas !== false;
  const soloPasadas = opciones.soloPasadas === true;
  const hoy = opciones.hoy || new Date();

  return reservas.filter(function (reserva) {
    if (!reserva) {
      return false;
    }
    if (soloActivas && !esReservaActiva(reserva)) {
      return false;
    }
    if (soloPasadas && !esFechaPasada(reserva.fecha_reserva, hoy)) {
      return false;
    }
    return true;
  });
}

function sumarHoras(reservas) {
  if (!Array.isArray(reservas)) {
    return 0;
  }

  return reservas.reduce(function (total, reserva) {
    return total + horasDeReserva(reserva);
  }, 0);
}

function obtenerResumenHoras(reservas, opciones = {}) {
  const filtradas = filtrarReservas(reservas, opciones);
  return {
    horas: sumarHoras(filtradas),
    reservas: filtradas.length
  };
}

function obtenerHorasPorUsuario(reservas, opciones = {}) {
  const filtradas = filtrarReservas(reservas, opciones);
  const acumulado = new Map();

  for (const reserva of filtradas) {
    const usuarioId = Number(reserva.usuario_id);
    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
      continue;
    }

    const actual = acumulado.get(usuarioId) || {
      usuario_id: usuarioId,
      horas: 0,
      reservas: 0
    };
    actual.horas += horasDeReserva(reserva);
    actual.reservas += 1;
    acumulado.set(usuarioId, actual);
  }

  return Array.from(acumulado.values()).sort(function (a, b) {
    return a.usuario_id - b.usuario_id;
  });
}

module.exports = {
  ESTADO_ACTIVA,
  esReservaActiva,
  esFechaPasada,
  horasDeReserva,
  filtrarReservas,
  sumarHoras,
  obtenerResumenHoras,
  obtenerHorasPorUsuario
};
