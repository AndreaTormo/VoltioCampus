"use strict";

const CLAVE = "tema";

function iconoLuna() {
  return '<svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>';
}

function iconoSol() {
  return '<svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
}

function temaInicial() {
  try {
    const guardado = localStorage.getItem(CLAVE);
    if (guardado === "dark" || guardado === "light") {
      return guardado;
    }
  } catch (error) {
    // Si localStorage no está disponible, usamos la preferencia del sistema.
  }

  return window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function aplicar(tema) {
  document.documentElement.dataset.theme = tema;

  document.querySelectorAll("[data-theme-toggle]").forEach(function (boton) {
    const oscuro = tema === "dark";
    boton.setAttribute("aria-pressed", String(oscuro));
    boton.setAttribute("aria-label", oscuro ? "Activar mode clar" : "Activar mode fosc");
    boton.innerHTML = oscuro ? iconoSol() : iconoLuna();
  });
}

function iniciar() {
  let tema = temaInicial();
  aplicar(tema);

  document.querySelectorAll("[data-theme-toggle]").forEach(function (boton) {
    boton.addEventListener("click", function () {
      tema = tema === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(CLAVE, tema);
      } catch (error) {
        // Sin persistencia, el cambio sigue funcionando en esta página.
      }
      aplicar(tema);
    });
  });
}

iniciar();
