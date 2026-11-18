/* ============================================================
   VoltioCampus · Lógica del registro de cuenta
   ============================================================ */

"use strict";

import {
  normalizarMatricula,
  validarNombre,
  validarApellidos,
  validarEmail,
  validarPassword,
  validarPassword2,
  validarTipo,
  validarNia,
  validarMatricula,
  validarModelo
} from "../core/auth-validations.js";

import {
  mostrarError,
  limpiarError,
  limpiarErrores,
  enfocarPrimerError,
  mostrarMensajeFormulario,
  ocultarMensajeFormulario
} from "../core/validation-errors.js";

// URL de la API.
const API_URL = "/api/auth/registro";

// Elementos del formulario.
const formulario = document.getElementById("register-form");
const nombreInput = document.getElementById("nombre");
const apellidosInput = document.getElementById("apellidos");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const password2Input = document.getElementById("password2");
const tipoSelect = document.getElementById("tipo");
const campoNia = document.getElementById("campo-nia");
const niaInput = document.getElementById("nia_profesor");
const matriculaInput = document.getElementById("matricula");
const modeloInput = document.getElementById("modelo_coche");
const botonEnviar = document.getElementById("submit-btn");
const formError = document.getElementById("form-error");

const campos = [
  nombreInput,
  apellidosInput,
  emailInput,
  passwordInput,
  password2Input,
  tipoSelect,
  niaInput,
  matriculaInput,
  modeloInput
];

// Cada campo obtiene su mensaje de error mediante su validador.
const validadores = {
  nombre: function () {
    return validarNombre(nombreInput.value);
  },
  apellidos: function () {
    return validarApellidos(apellidosInput.value);
  },
  email: function () {
    return validarEmail(emailInput.value);
  },
  password: function () {
    return validarPassword(passwordInput.value);
  },
  password2: function () {
    return validarPassword2(password2Input.value, passwordInput.value);
  },
  tipo: function () {
    return validarTipo(tipoSelect.value);
  },
  nia_profesor: function () {
    return validarNia(niaInput.value, tipoSelect.value);
  },
  matricula: function () {
    return validarMatricula(matriculaInput.value);
  },
  modelo_coche: function () {
    return validarModelo(modeloInput.value);
  }
};

// Evita envíos duplicados.
let enviando = false;

/* ---------- Validaciones ---------- */

// Valida un campo y muestra u oculta su error.
function validarCampo(input) {
  const validador = validadores[input.id];

  if (!validador) {
    return true;
  }

  const mensaje = validador();

  if (mensaje) {
    mostrarError(input, mensaje);
    return false;
  }

  limpiarError(input);
  return true;
}

function validarFormulario() {
  limpiarErrores(campos);

  let valido = true;

  campos.forEach(function (campo) {
    if (!validarCampo(campo)) {
      valido = false;
    }
  });

  if (!valido) {
    enfocarPrimerError(formulario);
  }

  return valido;
}

/* ---------- Interfaz ---------- */

function actualizarBoton(cargando) {
  botonEnviar.disabled = cargando;
  botonEnviar.textContent = cargando ? "Creant compte..." : "Crear compte";
  botonEnviar.setAttribute("aria-busy", String(cargando));
}

function actualizarCampoNia() {
  const esProfesor = tipoSelect.value === "profesor";

  campoNia.hidden = !esProfesor;
  niaInput.required = esProfesor;
  niaInput.setAttribute("aria-required", String(esProfesor));

  if (!esProfesor) {
    limpiarError(niaInput);
  }
}

function manejarBlur(evento) {
  validarCampo(evento.target);
}

function manejarInput(evento) {
  const input = evento.target;

  limpiarError(input);
  ocultarMensajeFormulario(formError);

  // La matrícula se muestra siempre en mayúsculas y sin espacios.
  if (input === matriculaInput) {
    const valor = normalizarMatricula(input.value);
    if (input.value !== valor) {
      input.value = valor;
    }
  }
}

/* ---------- Envío del registro ---------- */

function construirDatos() {
  return {
    nombre: nombreInput.value.trim(),
    apellidos: apellidosInput.value.trim(),
    email: emailInput.value.trim(),
    password: passwordInput.value,
    tipo: tipoSelect.value,
    nia_profesor: tipoSelect.value === "profesor" ? niaInput.value.trim() : null,
    matricula: normalizarMatricula(matriculaInput.value),
    modelo_coche: modeloInput.value.trim()
  };
}

async function manejarEnvio(evento) {
  evento.preventDefault();

  if (enviando) {
    return;
  }

  ocultarMensajeFormulario(formError);
  if (!validarFormulario()) {
    return;
  }

  enviando = true;
  actualizarBoton(true);

  try {
    const respuesta = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(construirDatos())
    });

    const datos = await respuesta.json().catch(function () {
      return {};
    });

    if (respuesta.status === 201) {
      // Las contraseñas no se conservan después del registro.
      passwordInput.value = "";
      password2Input.value = "";
      window.location.href = "/html/login.html?registrado=1";
      return;
    }

    mostrarMensajeFormulario(
      formError,
      datos.error || "No s'ha pogut crear el compte. Torna-ho a provar."
    );
  } catch (error) {
    mostrarMensajeFormulario(
      formError,
      "No s'ha pogut connectar amb el servidor. Torna-ho a provar."
    );
  } finally {
    enviando = false;
    actualizarBoton(false);
  }
}

/* ---------- Arranque de la página ---------- */

function conectarEventos() {
  formulario.addEventListener("submit", manejarEnvio);
  tipoSelect.addEventListener("change", actualizarCampoNia);

  campos.forEach(function (campo) {
    campo.addEventListener("blur", manejarBlur);
    campo.addEventListener("input", manejarInput);
  });
}

export function initRegisterForm() {
  actualizarCampoNia();
  conectarEventos();
}
