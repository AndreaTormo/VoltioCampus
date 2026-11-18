"use strict";

import { historialAdmin } from "../reservations/reservations-api.js";
import { mostrarAlerta } from "../core/validation-errors.js";
import {
  escaparHtml,
  etiquetaTipo,
  formatearFecha,
  nombreCompleto,
  obtenerIniciales
} from "./admin-shell.js";

function formatearHoras(valor) {
  const horas = Number(valor);
  if (!Number.isFinite(horas)) {
    return "0 h";
  }
  return `${horas.toLocaleString("ca-ES", {
    maximumFractionDigits: 2
  })} h`;
}

export function iniciarHistorial() {
  const historyLoading = document.getElementById("history-loading");
  const historyTableWrap = document.getElementById("history-table-wrap");
  const historyTbody = document.getElementById("history-tbody");
  const historyEmpty = document.getElementById("history-empty");
  const historyError = document.getElementById("history-error");
  const historyErrorMessage = document.getElementById("history-error-message");
  const historyCount = document.getElementById("history-count");
  let cargando = false;

  function mostrarEstado(estado) {
    historyLoading.hidden = estado !== "loading";
    historyTableWrap.hidden = estado !== "ready";
    historyEmpty.hidden = estado !== "empty";
    historyError.hidden = estado !== "error";
  }

  function pintarUsuarios(lista) {
    const usuarios = Array.isArray(lista) ? lista : [];

    if (usuarios.length === 0) {
      historyTbody.innerHTML = "";
      historyCount.textContent = "0 usuaris registrats";
      mostrarEstado("empty");
      return;
    }

    historyTbody.innerHTML = usuarios.map(function (usuario) {
      const nombre = nombreCompleto(usuario) || "Sense nom";
      const activo = usuario.activo !== false;
      const rol = usuario.rol === "admin" ? "Admin" : "Usuari";
      const tipo = etiquetaTipo(usuario);
      const ultimaReserva = usuario.ultima_reserva
        ? formatearFecha(usuario.ultima_reserva)
        : "—";

      return `
        <tr>
          <td>
            <span class="avatar small">${escaparHtml(obtenerIniciales(nombre))}</span>
            <div>
              <strong>${escaparHtml(nombre)}</strong>
              <small>${escaparHtml(usuario.email || "")} · ${escaparHtml(rol)} · ${escaparHtml(tipo)}</small>
            </div>
          </td>
          <td><strong>${escaparHtml(formatearHoras(usuario.horas_activas))}</strong></td>
          <td>${escaparHtml(formatearHoras(usuario.horas_pasadas))}</td>
          <td>${escaparHtml(usuario.reservas_activas)}</td>
          <td>${escaparHtml(ultimaReserva)}</td>
          <td>
            <span class="state ${activo ? "free" : "off"}">
              <i></i>${activo ? "Actiu" : "Inactiu"}
            </span>
          </td>
        </tr>
      `;
    }).join("");

    const totalHoras = usuarios.reduce(function (total, usuario) {
      const horas = Number(usuario.horas_activas);
      return total + (Number.isFinite(horas) ? horas : 0);
    }, 0);
    const activos = usuarios.filter(function (usuario) {
      return usuario.activo !== false;
    }).length;

    historyCount.textContent = usuarios.length === 1
      ? `1 usuari · ${formatearHoras(totalHoras)} assignades · ${activos} actiu`
      : `${usuarios.length} usuaris · ${formatearHoras(totalHoras)} assignades · ${activos} actius`;

    mostrarEstado("ready");
  }

  async function cargarHistorial(opciones = {}) {
    if (cargando) {
      return;
    }

    cargando = true;
    if (!opciones.silencioso) {
      mostrarEstado("loading");
      historyCount.textContent = "Carregant historial...";
    }

    try {
      const datos = await historialAdmin();
      pintarUsuarios(datos.usuarios);
    } catch (error) {
      historyErrorMessage.textContent = error.message || "Torna-ho a provar.";
      historyCount.textContent = "No s'ha pogut carregar l'historial";
      mostrarEstado("error");
      mostrarAlerta(
        historyErrorMessage.textContent,
        "No s'ha pogut carregar l'historial"
      );
    } finally {
      cargando = false;
    }
  }

  document.getElementById("refresh-history").addEventListener("click", function () {
    cargarHistorial();
  });
  document.getElementById("retry-history").addEventListener("click", function () {
    cargarHistorial();
  });

  return {
    cargar: cargarHistorial
  };
}
