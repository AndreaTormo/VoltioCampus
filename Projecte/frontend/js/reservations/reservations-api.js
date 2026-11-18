import { apiRequest } from "../core/api-client.js";

export function obtenerDisponibilidad(fecha, bloque) {
  const params = new URLSearchParams({ fecha, bloque });
  return apiRequest(`/reservas/disponibilidad?${params.toString()}`);
}

export function crearReserva(datos) {
  return apiRequest("/reservas", {
    method: "POST",
    body: JSON.stringify(datos)
  });
}

export function misReservas() {
  return apiRequest("/reservas/mis-reservas");
}

export function cancelarReserva(id) {
  return apiRequest(`/reservas/${encodeURIComponent(id)}/cancelar`, {
    method: "PATCH"
  });
}

export function reservasAdmin(estado = "activa") {
  const params = new URLSearchParams({ estado });
  return apiRequest(`/reservas/admin?${params.toString()}`);
}

export function generarTurnos(fechaInicio) {
  return apiRequest("/reservas/turnos", {
    method: "POST",
    body: JSON.stringify({ fecha_inicio: fechaInicio })
  });
}

export function historialAdmin() {
  return apiRequest("/reservas/historial");
}
