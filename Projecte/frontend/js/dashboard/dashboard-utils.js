import { mostrarAlerta } from "../core/validation-errors.js";

export const BLOQUES = {
  BLOQUE_1: { label: "Matí · 08:00 - 11:00", horas: 3 },
  BLOQUE_2: { label: "Matí · 11:30 - 14:00", horas: 2.5 },
  BLOQUE_3: { label: "Vesprada · 15:00 - 18:00", horas: 3 },
  BLOQUE_4: { label: "Vesprada · 18:15 - 21:00", horas: 2.75 }
};

const iconPaths = {
  bolt: '<path d="m13 2-8 11h6l-1 9 8-12h-6l1-8Z"/>',
  plug: '<path d="M8 2v5M16 2v5M6 7h12v3a6 6 0 0 1-12 0V7ZM12 16v6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
  logout: '<path d="M10 17l5-5-5-5M15 12H3"/><path d="M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/>',
  alert: '<path d="M12 3 2 21h20L12 3Z"/><path d="M12 9v5M12 18h.01"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  car: '<path d="M5 17h14M6 17l-1-5 2-5h10l2 5-1 5"/><circle cx="8" cy="17" r="2"/><circle cx="16" cy="17" r="2"/>'
};

function icon(name, size = 20) {
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || ""}</svg>`;
}

export function renderIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach(function (elemento) {
    const nombre = elemento.dataset.icon;
    if (!iconPaths[nombre]) {
      return;
    }
    const tamano = elemento.classList.contains("logo-mark") ? 21 : 20;
    elemento.innerHTML = icon(nombre, tamano);
  });
}

export function iconMarkup(name, size = 20) {
  return icon(name, size);
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
    .join("") || "VC";
}

export function nombreCompleto(usuario) {
  return [usuario && usuario.nombre, usuario && usuario.apellidos]
    .filter(Boolean)
    .join(" ")
    .trim();
}

export function etiquetaTipo(usuario) {
  return usuario && usuario.tipo === "profesor" ? "Professor/a" : "Alumne/a";
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

function parseFecha(valor) {
  if (!valor) {
    return null;
  }

  if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return new Date(`${valor}T00:00:00`);
  }

  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

export function formatearFecha(valor) {
  const fecha = parseFecha(valor);

  if (!fecha) {
    return "—";
  }

  return fecha.toLocaleDateString("ca-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export function aISO(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

export function fechaInicial() {
  const fecha = new Date();
  fecha.setHours(0, 0, 0, 0);
  const dia = fecha.getDay();

  if (dia === 6) {
    fecha.setDate(fecha.getDate() + 2);
  } else if (dia === 0) {
    fecha.setDate(fecha.getDate() + 1);
  }

  return aISO(fecha);
}

export function fechaEsPasada(fechaStr) {
  const fecha = parseFecha(fechaStr);

  if (!fecha) {
    return false;
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return fecha < hoy;
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
    <span class="toast-check">${iconMarkup("check", 17)}</span>
    <div>
      <strong>${escaparHtml(titulo)}</strong>
      <span>${escaparHtml(mensaje)}</span>
    </div>
    <button class="icon-button" type="button" aria-label="Tancar avís">${iconMarkup("close", 15)}</button>
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