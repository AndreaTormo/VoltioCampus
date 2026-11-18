const { HORARIOS_CENTRO, DIAS_LABORABLES } = require('../config/horarios');

// Comprobar si es día laborable (lunes-viernes)
function esDiaLaborable(fechaStr) {
  if (!fechaStr) {
    return false;
  }
  const fecha = new Date(fechaStr + 'T00:00:00');
  const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const dia = diasSemana[fecha.getDay()];
  
  if (dia === 'sabado' || dia === 'domingo') {
    return false;
  }
  
  return DIAS_LABORABLES.includes(dia);
}

// Comprobar si el bloque de horas es válido
function esBloqueValido(bloque) {
  if (!bloque) {
    return false;
  }
  return bloque === 'BLOQUE_1' || bloque === 'BLOQUE_2' || bloque === 'BLOQUE_3' || bloque === 'BLOQUE_4';
}

// Obtener información de los bloques
function obtenerBloques() {
  return HORARIOS_CENTRO;
}

// Obtener un bloque concreto
function obtenerBloque(bloque) {
  if (!esBloqueValido(bloque)) {
    return null;
  }
  return HORARIOS_CENTRO[bloque];
}

// Obtener la duración en horas de un bloque
function obtenerHorasBloque(bloque) {
  const informacion = obtenerBloque(bloque);
  return informacion && Number.isFinite(informacion.horas)
    ? informacion.horas
    : null;
}

// Obtener metadatos completos de un bloque para respuestas API
function obtenerMetadatosBloque(bloque) {
  const informacion = obtenerBloque(bloque);
  if (!informacion) {
    return null;
  }

  return {
    nombre: informacion.nombre,
    inicio: informacion.inicio,
    fin: informacion.fin,
    horas: informacion.horas,
    descripcion: informacion.descripcion
  };
}

module.exports = {
  esDiaLaborable,
  esBloqueValido,
  obtenerBloques,
  obtenerBloque,
  obtenerHorasBloque,
  obtenerMetadatosBloque
};
