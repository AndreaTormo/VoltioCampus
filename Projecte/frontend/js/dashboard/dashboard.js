/* ============================================================
   VoltioCampus · Dashboard de reservas del usuario
   ============================================================ */

"use strict";

import { cerrarSesion as cerrarSesionServidor } from "../core/session.js";
import { requireSession } from "../core/auth-guard.js";
import { requireUser } from "../core/role-guard.js";
import { iniciarMenuCuenta } from "../core/account-menu.js";
import { iniciarCargadores } from "../reservations/reservation-booking.js";
import { iniciarReservas } from "../reservations/my-reservations.js";
import { pintarPerfil } from "./dashboard-profile.js";
import { renderIcons } from "./dashboard-utils.js";
import {
  guardarMiHorario,
  obtenerMiHorario
} from "../schedules/schedules-api.js";
import { iniciarEditorHorario } from "../schedules/schedule-editor.js";

function mostrarSeccion(nombre, reservas, horario) {
  if (nombre !== "cargadores" && nombre !== "reservas" && nombre !== "horario") {
    return;
  }

  document.querySelectorAll("[data-section]").forEach(function (boton) {
    const activo = boton.dataset.section === nombre;
    boton.classList.toggle("is-active", activo);
    if (activo) {
      boton.setAttribute("aria-current", "page");
    } else {
      boton.removeAttribute("aria-current");
    }
  });

  document.getElementById("section-cargadores").hidden = nombre !== "cargadores";
  document.getElementById("section-reservas").hidden = nombre !== "reservas";
  document.getElementById("section-horario").hidden = nombre !== "horario";
  document.getElementById("breadcrumb-section").textContent =
    nombre === "cargadores"
      ? "Carregadors"
      : nombre === "reservas"
        ? "Les meues reserves"
        : "El meu horari";

  if (nombre === "reservas") {
    reservas.cargarSiNecesario();
  }
  if (nombre === "horario") {
    horario.cargar();
  }
}

function conectarNavegacion(reservas, horario) {
  document.addEventListener("click", function (evento) {
    const botonSeccion = evento.target.closest("[data-section]");
    if (botonSeccion) {
      mostrarSeccion(botonSeccion.dataset.section, reservas, horario);
    }
  });
}

async function iniciar() {
  const sesion = await requireSession("/html/login.html");

  if (!sesion || !requireUser(sesion, "/html/admin.html")) {
    return;
  }

  renderIcons();
  pintarPerfil(sesion.usuario);

  const reservas = iniciarReservas();
  const cargarDisponibilidad = iniciarCargadores(reservas);
  const horario = iniciarEditorHorario(
    document.getElementById("horario-editor"),
    {
      obtener: obtenerMiHorario,
      guardar: function (_usuarioId, intervalos) {
        return guardarMiHorario(intervalos);
      }
    }
  );

  conectarNavegacion(reservas, horario);

  const cerrarSesion = async function () {
    await cerrarSesionServidor();
    window.location.replace("/html/login.html");
  };

  document.getElementById("logout-btn").addEventListener("click", cerrarSesion);
  iniciarMenuCuenta(sesion.usuario, { onLogout: cerrarSesion });

  mostrarSeccion("cargadores", reservas, horario);
  cargarDisponibilidad();
}

iniciar();
