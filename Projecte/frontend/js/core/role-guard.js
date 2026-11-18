import { esAdmin } from "./session.js";

export function requireAdmin(sesion, fallbackPath) {
  if (!sesion || !esAdmin(sesion.usuario)) {
    window.location.replace(fallbackPath);
    return false;
  }

  return true;
}

export function requireUser(sesion, fallbackPath) {
  if (!sesion || esAdmin(sesion.usuario)) {
    window.location.replace(fallbackPath);
    return false;
  }

  return true;
}
