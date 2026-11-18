const db = require('../config/db');
const { obtenerBloques } = require('./horarios');

const DIAS_SEMANA = Object.freeze([1, 2, 3, 4, 5]);
const FORMATO_HORA = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function intervaloIncluyeBloque(intervalo, bloque) {
  const horarioBloque = obtenerBloques()[bloque];
  return Boolean(
    horarioBloque &&
    intervalo.hora_inicio <= horarioBloque.inicio &&
    intervalo.hora_fin >= horarioBloque.fin
  );
}

function validarIntervalosHorario(intervalos) {
  if (!Array.isArray(intervalos)) {
    return {
      valido: false,
      error: 'L’horari ha de ser una llista d’intervals'
    };
  }

  const normalizados = [];

  for (const intervalo of intervalos) {
    if (!intervalo || typeof intervalo !== 'object' || Array.isArray(intervalo)) {
      return { valido: false, error: 'Hi ha un interval no vàlid' };
    }

    const dia = Number(intervalo.dia_semana);
    const inicio = intervalo.hora_inicio;
    const fin = intervalo.hora_fin;

    if (!DIAS_SEMANA.includes(dia)) {
      return { valido: false, error: 'El dia ha d’estar entre dilluns i divendres' };
    }

    if (
      typeof inicio !== 'string' ||
      typeof fin !== 'string' ||
      !FORMATO_HORA.test(inicio) ||
      !FORMATO_HORA.test(fin) ||
      inicio >= fin
    ) {
      return {
        valido: false,
        error: 'Cada interval ha de tindre una hora d’inici i una de fi vàlides'
      };
    }

    normalizados.push({
      dia_semana: dia,
      hora_inicio: inicio,
      hora_fin: fin
    });
  }

  normalizados.sort(function (a, b) {
    return a.dia_semana - b.dia_semana ||
      a.hora_inicio.localeCompare(b.hora_inicio);
  });

  for (let indice = 1; indice < normalizados.length; indice += 1) {
    const anterior = normalizados[indice - 1];
    const actual = normalizados[indice];

    if (
      anterior.dia_semana === actual.dia_semana &&
      actual.hora_inicio < anterior.hora_fin
    ) {
      return {
        valido: false,
        error: 'Els intervals d’un mateix dia no poden solapar-se'
      };
    }
  }

  return { valido: true, intervalos: normalizados };
}

async function bloqueEstaEnHorario(usuarioId, fecha, bloque) {
  if (!obtenerBloques()[bloque]) {
    return false;
  }

  const resultado = await db.query(
    `SELECT TO_CHAR(hora_inicio, 'HH24:MI') AS hora_inicio,
            TO_CHAR(hora_fin, 'HH24:MI') AS hora_fin
     FROM horarios_usuario
     WHERE usuario_id = $1
       AND dia_semana = EXTRACT(ISODOW FROM $2::date)::smallint`,
    [usuarioId, fecha]
  );

  return resultado.rows.some(function (intervalo) {
    return intervaloIncluyeBloque(intervalo, bloque);
  });
}

module.exports = {
  validarIntervalosHorario,
  bloqueEstaEnHorario,
  intervaloIncluyeBloque
};
