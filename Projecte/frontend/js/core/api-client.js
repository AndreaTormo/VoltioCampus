import { limpiarSesion } from "./session.js";

const API_BASE = "/api";

export async function apiRequest(ruta, opciones = {}) {
  const headers = new Headers(opciones.headers || {});

  if (opciones.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let respuesta;

  try {
    respuesta = await fetch(`${API_BASE}${ruta}`, {
      credentials: "same-origin",
      ...opciones,
      headers
    });
  } catch (error) {
    const errorRed = new Error("No s'ha pogut connectar amb el servidor");
    errorRed.causa = error;
    throw errorRed;
  }

  const datos = await respuesta.json().catch(function () {
    return {};
  });

  if (respuesta.status === 401) {
    limpiarSesion();
    window.location.replace("/html/login.html");
  }

  if (!respuesta.ok) {
    const error = new Error(datos.error || "No s'ha pogut completar l'operació");
    error.status = respuesta.status;
    error.datos = datos;
    throw error;
  }

  return datos;
}
