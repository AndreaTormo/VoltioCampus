/* ============================================================
   VoltioCampus · Lógica de la pantalla de login
   ============================================================ */

"use strict";

import {
  validarEmail,
  validarPasswordObligatoria
} from "../core/auth-validations.js";

import {
  mostrarError,
  limpiarError,
  limpiarErrores,
  enfocarPrimerError,
  mostrarMensajeFormulario,
  ocultarMensajeFormulario
} from "../core/validation-errors.js";

import {
  cargarSesion,
  cerrarSesion,
  esAdmin
} from "../core/session.js";

// URL de la API.
const API_URL = "/api/auth/login";

// Elementos del formulario.
const formulario = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("toggle-password");
const botonEnviar = document.getElementById("submit-btn");
const formError = document.getElementById("form-error");

const campos = [emailInput, passwordInput];

// Evita que se envíe dos veces el mismo formulario.
let enviando = false;

/* ---------- Gestión de la sesión ---------- */

function rutaInicio(usuario) {
  return esAdmin(usuario)
    ? "/html/admin.html"
    : "/html/dashboard.html";
}

// Si la sesión es válida, no tiene sentido quedarse en el login.
async function redirigirSiHaySesion() {
  const sesion = await cargarSesion();

  if (sesion) {
    window.location.replace(rutaInicio(sesion.usuario));
    return true;
  }
  return false;
}

// Función pública para cerrar sesión desde cualquier pantalla.
async function logout() {
  await cerrarSesion();
  window.location.replace("/html/login.html");
}

// Conserva el acceso global que tenía cuando era un script clásico.
window.logout = logout;

/* ---------- Validación ---------- */

function validarFormulario() {
  limpiarErrores(campos);

  let valido = true;

  const errorEmail = validarEmail(emailInput.value);
  if (errorEmail) {
    mostrarError(emailInput, errorEmail);
    valido = false;
  }

  const errorPassword = validarPasswordObligatoria(passwordInput.value);
  if (errorPassword) {
    mostrarError(passwordInput, errorPassword);
    valido = false;
  }

  if (!valido) {
    enfocarPrimerError(formulario);
  }

  return valido;
}

/* ---------- Interfaz ---------- */

function actualizarBoton(cargando) {
  botonEnviar.disabled = cargando;
  botonEnviar.textContent = cargando ? "Entrant..." : "Entrar";
  botonEnviar.setAttribute("aria-busy", String(cargando));
}

function alternarPassword() {
  const mostrar = passwordInput.type === "password";
  passwordInput.type = mostrar ? "text" : "password";
  togglePassword.textContent = mostrar ? "Amagar" : "Veure";
  togglePassword.setAttribute("aria-pressed", String(mostrar));
}

function mensajeDeError(estado, errorBackend) {
  if (errorBackend) {
    return errorBackend;
  }
  if (estado === 400) {
    return "Revisa les dades introduïdes.";
  }
  if (estado === 401) {
    return "Correu o contrasenya incorrectes.";
  }
  return "No s'ha pogut iniciar sessió. Torna-ho a provar.";
}

/* ---------- Envío del login ---------- */

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
      body: JSON.stringify({
        email: emailInput.value.trim(),
        password: passwordInput.value
      })
    });

    const datos = await respuesta.json().catch(function () {
      return {};
    });

    if (!respuesta.ok) {
      mostrarMensajeFormulario(
        formError,
        mensajeDeError(respuesta.status, datos.error),
        true
      );
      return;
    }

    if (!datos.usuario) {
      mostrarMensajeFormulario(
        formError,
        "El servidor va retornar una sessió no vàlida.",
        true
      );
      return;
    }

    // La contraseña no se conserva después de iniciar sesión.
    passwordInput.value = "";
    window.location.replace(rutaInicio(datos.usuario));
  } catch (error) {
    mostrarMensajeFormulario(
      formError,
      "No s'ha pogut connectar amb el servidor. Torna-ho a provar.",
      true
    );
  } finally {
    enviando = false;
    actualizarBoton(false);
  }
}

/* ---------- Arranque de la página ---------- */

function mostrarMensajeRegistro() {
  const parametros = new URLSearchParams(window.location.search);
  if (parametros.get("registrado") === "1") {
    mostrarMensajeFormulario(formError, "Compte creat, ja pots entrar", false);
  }
}

function conectarEventos() {
  formulario.addEventListener("submit", manejarEnvio);
  togglePassword.addEventListener("click", alternarPassword);

  emailInput.addEventListener("input", function () {
    limpiarError(emailInput);
    ocultarMensajeFormulario(formError);
  });

  passwordInput.addEventListener("input", function () {
    limpiarError(passwordInput);
    ocultarMensajeFormulario(formError);
  });
}

async function iniciar() {
  if (await redirigirSiHaySesion()) {
    return;
  }
  mostrarMensajeRegistro();
  conectarEventos();
}

iniciar();
