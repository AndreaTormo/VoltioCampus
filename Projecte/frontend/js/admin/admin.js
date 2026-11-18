"use strict";

import { cerrarSesion as cerrarSesionServidor } from "../core/session.js";
import { requireSession } from "../core/auth-guard.js";
import { requireAdmin } from "../core/role-guard.js";
import { iniciarMenuCuenta } from "../core/account-menu.js";
import { iniciarAdminShell, abrirDialogo } from "./admin-shell.js";
import { iniciarUsuarios } from "./admin-users.js";
import { iniciarFormularioUsuario } from "./admin-user-form.js";
import { iniciarCarregadors } from "./admin-chargers.js";
import { iniciarHistorial } from "./admin-history.js";
import { iniciarReservasAdmin } from "./admin-reservations.js";
import {
  guardarHorarioUsuario,
  obtenerHorarioUsuario
} from "../schedules/schedules-api.js";
import { iniciarEditorHorario } from "../schedules/schedule-editor.js";

async function iniciar() {
  const sesion = await requireSession("/html/login.html");
  if (!sesion || !requireAdmin(sesion, "/html/dashboard.html")) {
    return;
  }

  let cargarUsuarios;
  const editorHorario = iniciarEditorHorario(
    document.getElementById("admin-horario-editor"),
    {
      obtener: obtenerHorarioUsuario,
      guardar: guardarHorarioUsuario
    }
  );
  const abrirHorario = function (usuario) {
    document.getElementById("user-schedule-name").textContent =
      `${usuario.nombre} ${usuario.apellidos}`;
    abrirDialogo("user-schedule-modal");
    editorHorario.cargar(usuario.id);
  };
  const abrirFormulario = iniciarFormularioUsuario({
    alCrear: function () {
      return cargarUsuarios({ silencioso: true });
    }
  });
  cargarUsuarios = iniciarUsuarios({
    usuarioActual: sesion.usuario,
    abrirFormulario,
    abrirHorario
  });
  const cargarCargadores = iniciarCarregadors();
  const cargarReservas = iniciarReservasAdmin();
  const cargarHistorial = iniciarHistorial();

  iniciarAdminShell({
    usuario: sesion.usuario,
    onSectionChange: function (seccion) {
      if (seccion === "cargadores") {
        cargarCargadores();
      }
      if (seccion === "reservas") {
        cargarReservas.cargar();
      }
      if (seccion === "historial") {
        cargarHistorial.cargar();
      }
    }
  });

  const cerrarSesion = async function () {
    await cerrarSesionServidor();
    window.location.replace("/html/login.html");
  };

  document.getElementById("logout-btn").addEventListener("click", cerrarSesion);
  iniciarMenuCuenta(sesion.usuario, { onLogout: cerrarSesion });
  cargarUsuarios();
}

iniciar();
