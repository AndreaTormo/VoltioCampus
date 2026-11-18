/* ============================================================
   VoltioCampus · Aviso para usuarios sin permisos de admin
   ============================================================ */

"use strict";

import {
  cerrarSesion as cerrarSesionServidor,
} from "../core/session.js";

import { requireSession } from "../core/auth-guard.js";
import { requireUser } from "../core/role-guard.js";

async function cerrarSesion() {
  await cerrarSesionServidor();
  window.location.replace("/html/login.html");
}

function nombreCompleto(usuario) {
  return [usuario.nombre, usuario.apellidos]
    .filter(Boolean)
    .join(" ")
    .trim();
}

async function iniciar() {
  const sesion = await requireSession("/html/login.html");

  if (!sesion || !requireUser(sesion, "/html/admin.html")) {
    return;
  }

  document.getElementById("aviso-name").textContent =
    nombreCompleto(sesion.usuario) || "usuari";
  document.getElementById("logout-btn").addEventListener("click", cerrarSesion);

  // Volver al login debe cerrar la sesión; si no, login.js nos redirige de nuevo aquí.
  document.getElementById("back-login").addEventListener("click", function (evento) {
    evento.preventDefault();
    cerrarSesion();
  });
}

iniciar();
