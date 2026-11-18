/* ============================================================
   VoltioCampus · Validaciones del formulario de registro
   Funciones puras: reciben valores y devuelven null si son
   válidos o el mensaje de error correspondiente.
   ============================================================ */

"use strict";

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGEX_NIA = /^[0-9]{8}$/;
const REGEX_MATRICULA = /^[0-9]{4}[A-Z]{3}$/;

function validarObligatorio(valor, mensaje) {
  if (valor.trim() === "") {
    return mensaje;
  }
  return null;
}

export function validarTextoObligatorio(valor, mensaje) {
  return validarObligatorio(String(valor || ""), mensaje);
}

// La matrícula se muestra siempre en mayúsculas y sin espacios.
export function normalizarMatricula(valor) {
  return valor.toUpperCase().replace(/\s+/g, "");
}

export function validarNombre(valor) {
  return validarObligatorio(valor, "Introdueix el teu nom.");
}

export function validarApellidos(valor) {
  return validarObligatorio(valor, "Introdueix els teus cognoms.");
}

export function validarEmail(valor) {
  const email = valor.trim();

  if (email === "") {
    return "Introdueix el teu correu electrònic.";
  }
  if (!REGEX_EMAIL.test(email)) {
    return "Escriu un correu electrònic vàlid.";
  }
  return null;
}

export function validarPassword(valor) {
  if (valor === "") {
    return "Introdueix una contrasenya.";
  }
  if (valor.length < 8) {
    return "La contrasenya ha de tindre almenys 8 caràcters.";
  }
  return null;
}

export function validarPasswordObligatoria(valor) {
  if (valor === "") {
    return "Introdueix la teua contrasenya.";
  }
  return null;
}

export function validarPassword2(valor, password) {
  if (valor === "") {
    return "Repeteix la contrasenya.";
  }
  if (valor !== password) {
    return "Les contrasenyes no coincidixen.";
  }
  return null;
}

export function validarTipo(valor) {
  if (valor !== "profesor" && valor !== "alumno") {
    return "Selecciona el tipus d'usuari.";
  }
  return null;
}

export function validarNia(valor, tipo) {
  // El NIA solo se valida cuando el usuario es profesor.
  if (tipo !== "profesor") {
    return null;
  }

  const nia = valor.trim();

  if (nia === "") {
    return "Introdueix el NIA del professor.";
  }
  if (!REGEX_NIA.test(nia)) {
    return "El NIA ha de tindre exactament 8 dígits.";
  }
  return null;
}

export function validarMatricula(valor) {
  const matricula = normalizarMatricula(valor);

  if (matricula === "") {
    return "Introdueix la matrícula del cotxe.";
  }
  if (!REGEX_MATRICULA.test(matricula)) {
    return "La matrícula ha de ser 4 números i 3 lletres (ex. 1234ABC).";
  }
  return null;
}

export function validarModelo(valor) {
  return validarObligatorio(valor, "Introdueix el model del teu cotxe.");
}
