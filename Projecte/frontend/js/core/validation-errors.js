/* ============================================================
   VoltioCampus · Presentación de errores del registro
   Funciones que escriben los mensajes de error en el DOM.
   ============================================================ */

"use strict";

export function mostrarAlerta(mensaje, titulo = "Error") {
  if (window.Swal) {
    return window.Swal.fire({
      icon: "error",
      title: titulo,
      text: mensaje
    });
  }

  window.alert(`${titulo}: ${mensaje}`);
}

// Cada campo indica su error mediante aria-describedby.
function obtenerError(input) {
  const idError = input.getAttribute("aria-describedby");
  return idError ? document.getElementById(idError) : null;
}

export function mostrarError(input, mensaje) {
  const contenedor = input.closest(".input-wrap");
  const error = obtenerError(input);

  if (contenedor) {
    contenedor.classList.add("is-invalid");
  }
  if (error) {
    error.textContent = mensaje;
  }
  input.setAttribute("aria-invalid", "true");
}

export function limpiarError(input) {
  const contenedor = input.closest(".input-wrap");
  const error = obtenerError(input);

  if (contenedor) {
    contenedor.classList.remove("is-invalid");
  }
  if (error) {
    error.textContent = "";
  }
  input.removeAttribute("aria-invalid");
}

export function limpiarErrores(campos) {
  campos.forEach(function (campo) {
    limpiarError(campo);
  });
}

export function enfocarPrimerError(formulario) {
  const primerInvalido = formulario.querySelector(
    ".input-wrap.is-invalid input, .input-wrap.is-invalid select"
  );
  if (primerInvalido) {
    primerInvalido.focus();
  }
}

export function mostrarMensajeFormulario(formError, mensaje, esError) {
  formError.textContent = mensaje;
  formError.classList.toggle("is-success", esError === false);
  formError.hidden = false;

  if (esError !== false) {
    mostrarAlerta(mensaje);
  }
}

export function ocultarMensajeFormulario(formError) {
  formError.textContent = "";
  formError.classList.remove("is-success");
  formError.hidden = true;
}
