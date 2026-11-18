"use strict";

import { mostrarAlerta } from "../core/validation-errors.js";

const iconPaths = {
  bolt: '<path d="m13 2-8 11h6l-1 9 8-12h-6l1-8Z"/>',
  plug: '<path d="M8 2v5M16 2v5M6 7h12v3a6 6 0 0 1-12 0V7ZM12 16v6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
  power: '<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.8 0"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  alert: '<path d="M12 3 2 21h20L12 3Z"/><path d="M12 9v5M12 18h.01"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 2"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/>',
  logout: '<path d="M10 17l5-5-5-5M15 12H3"/><path d="M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5"/>'
};

const SECCIONES_ADMIN = {
  usuarios: { etiqueta: "Usuaris", id: "section-usuarios" },
  cargadores: { etiqueta: "Carregadors", id: "section-cargadores" },
  reservas: { etiqueta: "Reserves", id: "section-reservas" },
  historial: { etiqueta: "Historial", id: "section-historial" }
};

export function icon(name, size = 20) {
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || ""}</svg>`;
}

function renderIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach(function (elemento) {
    const nombre = elemento.dataset.icon;
    if (!iconPaths[nombre]) {
      return;
    }
    const tamano = elemento.classList.contains("logo-mark") ? 21 : 20;
    elemento.innerHTML = icon(nombre, tamano);
  });
}

export function escaparHtml(valor) {
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

export function obtenerIniciales(nombre) {
  return String(nombre || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(function (parte) {
      return parte.charAt(0).toUpperCase();
    })
    .join("") || "AD";
}

export function nombreCompleto(usuario) {
  return [usuario && usuario.nombre, usuario && usuario.apellidos]
    .filter(Boolean)
    .join(" ")
    .trim();
}

export function etiquetaTipo(usuario) {
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

export function formatearFecha(valor) {
  if (!valor) {
    return "—";
  }

  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) {
    return "—";
  }

  return fecha.toLocaleDateString("ca-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export function etiquetaGrupo(tipoGrupo) {
  if (tipoGrupo === "profesores") {
    return "Professors";
  }
  if (tipoGrupo === "alumnos") {
    return "Alumnes";
  }
  return "—";
}

export function formatearPotencia(valor) {
  const potencia = Number(valor);
  if (!Number.isFinite(potencia)) {
    return "—";
  }
  return `${potencia.toLocaleString("ca-ES", {
    maximumFractionDigits: 2
  })} kW`;
}

export function abrirDialogo(id) {
  const dialogo = document.getElementById(id);
  if (!dialogo) {
    return;
  }
  if (typeof dialogo.showModal === "function") {
    dialogo.showModal();
  } else {
    dialogo.setAttribute("open", "");
  }
}

export function cerrarDialogo(id) {
  const dialogo = document.getElementById(id);
  if (!dialogo) {
    return;
  }
  if (typeof dialogo.close === "function") {
    dialogo.close();
  } else {
    dialogo.removeAttribute("open");
  }
}

export function mostrarToast(titulo, mensaje, esError = false) {
  if (esError) {
    mostrarAlerta(mensaje, titulo);
    return;
  }

  const toastRegion = document.getElementById("toast-region");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `
    <span class="toast-check">${icon("check", 17)}</span>
    <div>
      <strong>${escaparHtml(titulo)}</strong>
      <span>${escaparHtml(mensaje)}</span>
    </div>
    <button class="icon-button" type="button" aria-label="Tancar avís">${icon("close", 15)}</button>
  `;

  const cerrar = function () {
    toast.classList.add("is-leaving");
    window.setTimeout(function () {
      toast.remove();
    }, 220);
  };

  toast.querySelector("button").addEventListener("click", cerrar);
  toastRegion.appendChild(toast);
  window.setTimeout(cerrar, 4200);
}

function mostrarSeccion(nombre, onSectionChange) {
  const seccion = SECCIONES_ADMIN[nombre];
  if (!seccion) {
    return;
  }

  document.querySelectorAll("[data-section]").forEach(function (boton) {
    const activo = boton.dataset.section === nombre;
    boton.classList.toggle("is-active", activo);
    if (activo) {
      boton.setAttribute("aria-current", "page");
    } else {
      boton.removeAttribute("aria-current");
    }
  });

  Object.values(SECCIONES_ADMIN).forEach(function (configuracion) {
    const elemento = document.getElementById(configuracion.id);
    if (elemento) {
      elemento.hidden = configuracion.id !== seccion.id;
    }
  });

  document.getElementById("breadcrumb-section").textContent = seccion.etiqueta;
  onSectionChange(nombre);
}

export function iniciarAdminShell({ usuario, onSectionChange }) {
  renderIcons();

  const nombre = nombreCompleto(usuario) || "Administrador";
  const iniciales = obtenerIniciales(nombre);
  document.getElementById("admin-name").textContent = nombre;
  document.getElementById("admin-email").textContent = usuario.email || "";
  document.getElementById("admin-avatar").textContent = iniciales;
  document.getElementById("top-avatar").textContent = iniciales;

  document.addEventListener("click", function (evento) {
    const objetivo = evento.target.closest("[data-section], [data-close-dialog]");
    if (!objetivo) {
      return;
    }
    if (objetivo.hasAttribute("data-section")) {
      mostrarSeccion(objetivo.dataset.section, onSectionChange);
    } else {
      cerrarDialogo(objetivo.dataset.closeDialog);
    }
  });

  document.querySelectorAll("dialog").forEach(function (dialogo) {
    dialogo.addEventListener("click", function (evento) {
      const caja = dialogo.getBoundingClientRect();
      const fora =
        evento.clientX < caja.left ||
        evento.clientX > caja.right ||
        evento.clientY < caja.top ||
        evento.clientY > caja.bottom;
      if (fora) {
        cerrarDialogo(dialogo.id);
      }
    });
  });

  mostrarSeccion("usuarios", onSectionChange);
}
