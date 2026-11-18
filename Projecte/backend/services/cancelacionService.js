function fechaEsPasada(fechaStr, hoy = new Date()) {
  if (!fechaStr) {
    return false;
  }

  const fecha = new Date(`${fechaStr}T00:00:00`);
  if (Number.isNaN(fecha.getTime())) {
    return false;
  }

  const referencia = new Date(hoy);
  referencia.setHours(0, 0, 0, 0);
  return fecha < referencia;
}

function validarCancelacionReserva({ reserva, usuario, esAdmin = false, hoy = new Date() }) {
  if (!reserva) {
    return {
      permitido: false,
      status: 404,
      error: 'Reserva no trobada'
    };
  }

  if (!esAdmin && Number(reserva.usuario_id) !== Number(usuario && usuario.id)) {
    return {
      permitido: false,
      status: 403,
      error: 'No pots cancel·lar una reserva d’un altre usuari'
    };
  }

  if (reserva.estado !== 'activa') {
    return {
      permitido: false,
      status: 409,
      error: 'La reserva ja està cancel·lada'
    };
  }

  if (fechaEsPasada(reserva.fecha_reserva, hoy)) {
    return {
      permitido: false,
      status: 400,
      error: 'No es poden cancel·lar reserves de dates passades'
    };
  }

  return {
    permitido: true,
    status: 200
  };
}

module.exports = {
  fechaEsPasada,
  validarCancelacionReserva
};
