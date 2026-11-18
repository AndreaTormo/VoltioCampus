import { apiRequest } from "../core/api-client.js";

export function obtenerMiHorario() {
  return apiRequest("/horarios/me");
}

export function guardarMiHorario(intervalos) {
  return apiRequest("/horarios/me", {
    method: "PUT",
    body: JSON.stringify({ intervalos })
  });
}

export function obtenerHorarioUsuario(usuarioId) {
  return apiRequest(`/horarios/usuarios/${encodeURIComponent(usuarioId)}`);
}

export function guardarHorarioUsuario(usuarioId, intervalos) {
  return apiRequest(`/horarios/usuarios/${encodeURIComponent(usuarioId)}`, {
    method: "PUT",
    body: JSON.stringify({ intervalos })
  });
}
