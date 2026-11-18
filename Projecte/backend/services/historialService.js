const { obtenerResumenHoras } = require('./horasService');

function agruparHistorialUsuarios(filas, opciones = {}) {
  const usuarios = new Map();
  const hoy = opciones.hoy || new Date();

  for (const fila of Array.isArray(filas) ? filas : []) {
    const usuarioId = Number(fila && fila.usuario_id);
    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
      continue;
    }

    let usuario = usuarios.get(usuarioId);

    if (!usuario) {
      usuario = {
        id: usuarioId,
        nombre: fila.nombre,
        apellidos: fila.apellidos,
        email: fila.email,
        tipo: fila.tipo,
        activo: fila.activo !== false,
        rol: fila.rol,
        reservas: []
      };
      usuarios.set(usuarioId, usuario);
    }

    if (fila.reserva_id) {
      usuario.reservas.push({
        id: fila.reserva_id,
        bloque: fila.bloque,
        estado: fila.estado,
        fecha_reserva: fila.fecha_reserva
      });
    }
  }

  return Array.from(usuarios.values()).map(function (usuario) {
    const resumenActivas = obtenerResumenHoras(usuario.reservas, {
      soloActivas: true
    });
    const resumenPasadas = obtenerResumenHoras(usuario.reservas, {
      soloActivas: true,
      soloPasadas: true,
      hoy
    });
    const ultimaReserva = usuario.reservas.reduce(function (ultima, reserva) {
      if (!reserva.fecha_reserva) {
        return ultima;
      }
      return !ultima || reserva.fecha_reserva > ultima
        ? reserva.fecha_reserva
        : ultima;
    }, null);

    return {
      id: usuario.id,
      nombre: usuario.nombre,
      apellidos: usuario.apellidos,
      email: usuario.email,
      tipo: usuario.tipo,
      activo: usuario.activo,
      rol: usuario.rol,
      horas_activas: resumenActivas.horas,
      horas_pasadas: resumenPasadas.horas,
      reservas_activas: resumenActivas.reservas,
      reservas_pasadas: resumenPasadas.reservas,
      ultima_reserva: ultimaReserva
    };
  });
}

module.exports = {
  agruparHistorialUsuarios
};
