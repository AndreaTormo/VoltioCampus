"use strict";

import {
  normalizarMatricula,
  validarEmail,
  validarNia,
  validarPassword,
  validarMatricula,
  validarTextoObligatorio,
  validarTipo
} from "../core/auth-validations.js";
import {
  enfocarPrimerError,
  limpiarError,
  limpiarErrores,
  mostrarError,
  mostrarMensajeFormulario,
  ocultarMensajeFormulario
} from "../core/validation-errors.js";
import { crearUsuario } from "../users/users-api.js";
import {
  abrirDialogo,
  cerrarDialogo,
  mostrarToast,
  nombreCompleto
} from "./admin-shell.js";

export function iniciarFormularioUsuario({ alCrear }) {
  const userForm = document.getElementById("user-form");
  const userFormError = document.getElementById("user-form-error");
  const userSubmit = document.getElementById("user-submit");
  const userNombre = document.getElementById("user-nombre");
  const userApellidos = document.getElementById("user-apellidos");
  const userEmail = document.getElementById("user-email");
  const userPassword = document.getElementById("user-password");
  const userTipo = document.getElementById("user-tipo");
  const userNiaField = document.getElementById("user-nia-field");
  const userNia = document.getElementById("user-nia");
  const userMatricula = document.getElementById("user-matricula");
  const userModelo = document.getElementById("user-modelo");
  const userFields = [
    userNombre,
    userApellidos,
    userEmail,
    userPassword,
    userTipo,
    userNia,
    userMatricula,
    userModelo
  ];
  let enviandoUsuario = false;

  const validadores = {
    "user-nombre": function () {
      return validarTextoObligatorio(userNombre.value, "Introdueix el nom.");
    },
    "user-apellidos": function () {
      return validarTextoObligatorio(userApellidos.value, "Introdueix els cognoms.");
    },
    "user-email": function () {
      return validarEmail(userEmail.value);
    },
    "user-password": function () {
      return validarPassword(userPassword.value);
    },
    "user-tipo": function () {
      return validarTipo(userTipo.value);
    },
    "user-nia": function () {
      return validarNia(userNia.value, userTipo.value);
    },
    "user-matricula": function () {
      return validarMatricula(userMatricula.value);
    },
    "user-modelo": function () {
      return validarTextoObligatorio(userModelo.value, "Introdueix el model del cotxe.");
    }
  };

  function validarCampo(campo) {
    const validador = validadores[campo.id];
    if (!validador) {
      return true;
    }
    const mensaje = validador();
    if (mensaje) {
      mostrarError(campo, mensaje);
      return false;
    }
    limpiarError(campo);
    return true;
  }

  function validarFormulario() {
    limpiarErrores(userFields);
    const valido = userFields.map(validarCampo).every(Boolean);
    if (!valido) {
      enfocarPrimerError(userForm);
    }
    return valido;
  }

  function actualizarCampoNia() {
    const esProfesor = userTipo.value === "profesor";
    userNiaField.hidden = !esProfesor;
    userNia.required = esProfesor;
    userNia.setAttribute("aria-required", String(esProfesor));
    if (!esProfesor) {
      userNia.value = "";
      limpiarError(userNia);
    }
  }

  function actualizarBoton(cargando) {
    userSubmit.disabled = cargando;
    userSubmit.textContent = cargando ? "Creant usuari..." : "Crear usuari";
    userSubmit.setAttribute("aria-busy", String(cargando));
  }

  function obrirModal() {
    userForm.reset();
    limpiarErrores(userFields);
    ocultarMensajeFormulario(userFormError);
    actualizarCampoNia();
    abrirDialogo("user-modal");
    userNombre.focus();
  }

  function construirDatosUsuario() {
    return {
      nombre: userNombre.value.trim(),
      apellidos: userApellidos.value.trim(),
      email: userEmail.value.trim(),
      password: userPassword.value,
      tipo: userTipo.value,
      nia_profesor: userTipo.value === "profesor" ? userNia.value.trim() : null,
      matricula: normalizarMatricula(userMatricula.value),
      modelo_coche: userModelo.value.trim()
    };
  }

  async function manejarEnvio(evento) {
    evento.preventDefault();
    if (enviandoUsuario) {
      return;
    }
    ocultarMensajeFormulario(userFormError);
    if (!validarFormulario()) {
      return;
    }

    enviandoUsuario = true;
    actualizarBoton(true);
    try {
      const datos = await crearUsuario(construirDatosUsuario());
      const nombre = nombreCompleto(datos.usuario) || "L'usuari";
      cerrarDialogo("user-modal");
      mostrarToast("Usuari creat", `${nombre} s'ha afegit correctament.`);
      await alCrear();
    } catch (error) {
      mostrarMensajeFormulario(
        userFormError,
        error.message || "No s'ha pogut crear l'usuari. Torna-ho a provar."
      );
    } finally {
      enviandoUsuario = false;
      actualizarBoton(false);
    }
  }

  userForm.addEventListener("submit", manejarEnvio);
  userTipo.addEventListener("change", actualizarCampoNia);
  userFields.forEach(function (campo) {
    campo.addEventListener("blur", function () {
      validarCampo(campo);
    });
    campo.addEventListener("input", function () {
      limpiarError(campo);
      ocultarMensajeFormulario(userFormError);
    });
  });
  userMatricula.addEventListener("input", function () {
    userMatricula.value = normalizarMatricula(userMatricula.value);
  });
  document.getElementById("user-modal").addEventListener("close", function () {
    userForm.reset();
    limpiarErrores(userFields);
    ocultarMensajeFormulario(userFormError);
    actualizarCampoNia();
  });

  return obrirModal;
}
