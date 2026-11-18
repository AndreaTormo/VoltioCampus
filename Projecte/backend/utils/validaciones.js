// Validaciones propias para formulario de reservas

function validarMatriculaEspanola(matricula) {
  if (!matricula) {
    return false;
  }
  const valor = String(matricula).trim().toUpperCase();
  // Formato español: 4 dígitos + 3 letras
  const regex = /^[0-9]{4}[A-Z]{3}$/;
  return regex.test(valor);
}

function validarNiaONumeroProfesor(nia) {
  if (!nia) {
    return false;
  }
  const valor = String(nia).trim();
  // Según ejemplo 11254752 -> numérico de 8 dígitos
  const regex = /^[0-9]{8}$/;
  return regex.test(valor);
}

function esFechaISOValida(fecha) {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (!coincidencia) {
    return false;
  }

  const anio = Number(coincidencia[1]);
  const mes = Number(coincidencia[2]);
  const dia = Number(coincidencia[3]);
  const fechaParseada = new Date(`${fecha}T00:00:00`);

  return anio > 0 &&
    !Number.isNaN(fechaParseada.getTime()) &&
    fechaParseada.getFullYear() === anio &&
    fechaParseada.getMonth() === mes - 1 &&
    fechaParseada.getDate() === dia;
}

// Valida solo los datos que envía el usuario: fecha y bloque.
// El resto de datos (nombre, matrícula, NIA...) se leen de su cuenta.
function validarDatosReserva(datos) {
  const errores = [];
  const fecha = datos && typeof datos.fecha_reserva === 'string'
    ? datos.fecha_reserva.trim()
    : '';
  const bloque = datos && typeof datos.bloque === 'string'
    ? datos.bloque.trim()
    : '';

  if (!fecha) {
    errores.push('El dia és obligatori');
  } else if (!esFechaISOValida(fecha)) {
    errores.push('La data no té un format vàlid (YYYY-MM-DD)');
  }

  if (!bloque) {
    errores.push('La franja/bloc és obligatòria');
  } else if (bloque !== 'BLOQUE_1' && bloque !== 'BLOQUE_2' && bloque !== 'BLOQUE_3' && bloque !== 'BLOQUE_4') {
    errores.push('El bloc ha de ser BLOQUE_1, BLOQUE_2, BLOQUE_3 o BLOQUE_4');
  }

  return {
    valido: errores.length === 0,
    errores: errores
  };
}

module.exports = {
  validarMatriculaEspanola,
  validarNiaONumeroProfesor,
  esFechaISOValida,
  validarDatosReserva
};
