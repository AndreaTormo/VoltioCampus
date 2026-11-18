import { apiRequest } from "../core/api-client.js";

export function listarCargadores() {
  return apiRequest("/cargadores");
}

export function crearCargador(cargador) {
  return apiRequest("/cargadores", {
    method: "POST",
    body: JSON.stringify(cargador)
  });
}

export function cambiarEstadoCargador(id, activo) {
  const accion = activo ? "activar" : "desactivar";
  return apiRequest(`/cargadores/${encodeURIComponent(id)}/${accion}`, {
    method: "PUT"
  });
}

export function eliminarCargador(id) {
  return apiRequest(`/cargadores/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}
