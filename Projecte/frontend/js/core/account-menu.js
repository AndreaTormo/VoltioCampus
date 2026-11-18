"use strict";

import { cerrarSesion } from "./session.js";

function escapar(valor) {
  return String(valor === null || valor === undefined ? "" : valor).replace(
    /[&<>"']/g,
    function (caracter) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[caracter];
    }
  );
}

function iniciales(nombre) {
  return String(nombre || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(function (parte) {
      return parte.charAt(0).toUpperCase();
    })
    .join("") || "VC";
}

function etiquetaTipo(usuario) {
  if (usuario.rol === "admin") {
    return "Administrador/a";
  }
  if (usuario.tipo === "profesor") {
    return "Professor/a";
  }
  if (usuario.tipo === "alumno") {
    return "Alumne/a";
  }
  return "—";
}

export function iniciarMenuCuenta(usuario, { onLogout } = {}) {
  const cuenta = document.querySelector("[data-account]");
  const boton = document.querySelector("[data-account-toggle]");

  if (!cuenta || !boton || !usuario) {
    return;
  }

  const nombre = [usuario.nombre, usuario.apellidos]
    .filter(Boolean)
    .join(" ")
    .trim() || "Usuari";

  const filas = [["Rol", etiquetaTipo(usuario)]];
  if (usuario.email) {
    filas.push(["Correu", usuario.email]);
  }
  if (usuario.nia_profesor) {
    filas.push(["NIA", usuario.nia_profesor]);
  }
  if (usuario.matricula) {
    filas.push(["Matrícula", usuario.matricula]);
  }
  if (usuario.modelo_coche) {
    filas.push(["Vehicle", usuario.modelo_coche]);
  }

  const menu = document.createElement("div");
  menu.className = "account-menu";
  menu.setAttribute("role", "menu");
  menu.hidden = true;
  menu.innerHTML = `
    <div class="account-menu-head">
      <span class="avatar" aria-hidden="true">${escapar(iniciales(nombre))}</span>
      <div>
        <strong>${escapar(nombre)}</strong>
        <small>${escapar(usuario.email || "")}</small>
      </div>
    </div>
    <dl class="account-menu-data">
      ${filas.map(function (fila) {
        return `<div><dt>${escapar(fila[0])}</dt><dd>${escapar(fila[1])}</dd></div>`;
      }).join("")}
    </dl>
    <button class="button secondary account-menu-logout" type="button" role="menuitem">
      Tancar sessió
    </button>
  `;
  cuenta.appendChild(menu);

  function abrir() {
    menu.hidden = false;
    boton.setAttribute("aria-expanded", "true");
  }

  function cerrar() {
    menu.hidden = true;
    boton.setAttribute("aria-expanded", "false");
  }

  boton.addEventListener("click", function (evento) {
    evento.stopPropagation();
    if (menu.hidden) {
      abrir();
    } else {
      cerrar();
    }
  });

  menu.addEventListener("click", function (evento) {
    evento.stopPropagation();
  });

  document.addEventListener("click", function (evento) {
    if (!menu.hidden && !cuenta.contains(evento.target)) {
      cerrar();
    }
  });

  document.addEventListener("keydown", function (evento) {
    if (evento.key === "Escape" && !menu.hidden) {
      cerrar();
      boton.focus();
    }
  });

  menu.querySelector(".account-menu-logout").addEventListener("click", async function () {
    cerrar();
    if (typeof onLogout === "function") {
      onLogout();
      return;
    }
    await cerrarSesion();
    window.location.replace("/html/login.html");
  });
}
