import { etiquetaTipo, nombreCompleto, obtenerIniciales } from "./dashboard-utils.js";

export function pintarPerfil(usuario) {
  const nombre = nombreCompleto(usuario) || "Usuari";
  const iniciales = obtenerIniciales(nombre);
  const vehiculo = [usuario.matricula, usuario.modelo_coche]
    .filter(Boolean)
    .join(" · ");

  document.getElementById("user-name").textContent = nombre;
  document.getElementById("user-email").textContent = usuario.email || "";
  document.getElementById("user-avatar").textContent = iniciales;
  document.getElementById("top-avatar").textContent = iniciales;
  document.getElementById("user-tipo-pill").textContent = etiquetaTipo(usuario);

  document.getElementById("reserve-vehicle-title").textContent =
    vehiculo || "Vehicle sense dades";
  document.getElementById("reserve-vehicle-meta").textContent =
    usuario.tipo === "profesor" && usuario.nia_profesor
      ? `NIA ${usuario.nia_profesor}`
      : "Les dades es prenen del teu compte.";
}
