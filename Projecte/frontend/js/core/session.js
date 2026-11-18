/* ============================================================
   VoltioCampus · Gestión compartida de la sesión
   El token vive en una cookie httpOnly; aquí solo guardamos
   el usuario en memoria durante la carga de la página.
   ============================================================ */

"use strict";

const CLAVE_TOKEN_ANTIGUO = "token";
const CLAVE_USUARIO_ANTIGUO = "usuario";

let usuarioActual = null;

// Elimina restos de la versión anterior que guardaba todo en localStorage.
function limpiarAlmacenamientoAntiguo() {
  try {
    localStorage.removeItem(CLAVE_TOKEN_ANTIGUO);
    localStorage.removeItem(CLAVE_USUARIO_ANTIGUO);
  } catch (error) {
    // Si localStorage no está disponible, no hay nada que borrar.
  }
}

// Pregunta al backend quién es el usuario de la cookie actual.
export async function cargarSesion() {
  limpiarAlmacenamientoAntiguo();

  try {
    const respuesta = await fetch("/api/auth/me", {
      credentials: "same-origin",
      headers: { Accept: "application/json" }
    });

    if (!respuesta.ok) {
      usuarioActual = null;
      return null;
    }

    const datos = await respuesta.json().catch(function () {
      return {};
    });

    if (!datos.usuario || typeof datos.usuario !== "object") {
      usuarioActual = null;
      return null;
    }

    usuarioActual = datos.usuario;
    return { usuario: usuarioActual };
  } catch (error) {
    usuarioActual = null;
    return null;
  }
}

// Sesión ya cargada en memoria (solo durante esta página).
export function obtenerSesion() {
  return usuarioActual ? { usuario: usuarioActual } : null;
}

export function limpiarSesion() {
  usuarioActual = null;
  limpiarAlmacenamientoAntiguo();
}

// Cierra la sesión en el servidor (borra la cookie) y en memoria.
export async function cerrarSesion() {
  limpiarSesion();

  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    // Si falla la red, igualmente redirigimos al login.
  }
}

// Comprueba si el usuario tiene rol de administrador.
export function esAdmin(usuario) {
  return Boolean(usuario && usuario.rol === "admin");
}
