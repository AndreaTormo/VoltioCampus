import { apiRequest } from "../core/api-client.js";

export function listarUsuarios() {
  return apiRequest("/usuarios");
}

export function crearUsuario(usuario) {
  return apiRequest("/usuarios", {
    method: "POST",
    body: JSON.stringify(usuario)
  });
}

export function cambiarEstadoUsuario(id, activo) {
  return apiRequest(`/usuarios/${encodeURIComponent(id)}/estado`, {
    method: "PATCH",
    body: JSON.stringify({ activo })
  });
}

export function eliminarUsuario(id) {
  return apiRequest(`/usuarios/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}
