import { cargarSesion } from "./session.js";

export async function requireSession(loginPath) {
  const sesion = await cargarSesion();

  if (!sesion) {
    window.location.replace(loginPath);
    return null;
  }

  return sesion;
}
