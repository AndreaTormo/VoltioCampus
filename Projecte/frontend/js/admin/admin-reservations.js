"use strict";

import {
  cancelarReserva,
  generarTurnos as generarTurnosApi,
  reservasAdmin
} from "../reservations/reservations-api.js";
import { mostrarAlerta } from "../core/validation-errors.js";
import {
  escaparHtml,
  etiquetaGrupo,
  formatearFecha,
  icon,
  mostrarToast
} from "./admin-shell.js";

const ETIQUETAS_BLOQUE = {
  BLOQUE_1: "Matí · 08:00 - 11:00",
  BLOQUE_2: "Matí · 11:30 - 14:00",
  BLOQUE_3: "Vesprada · 15:00 - 18:00",
  BLOQUE_4: "Vesprada · 18:15 - 21:00"
};

function formatearFechaISO(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function siguienteLunes() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const diaSemana = hoy.getDay();
  const offset = (8 - diaSemana) % 7 || 7;
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + offset);
  return formatearFechaISO(lunes);
}

function fechaEsPasada(fechaStr) {
  if (!fechaStr) {
    return false;
  }
  const fecha = new Date(`${fechaStr}T00:00:00`);
  if (Number.isNaN(fecha.getTime())) {
    return false;
  }
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return fecha < hoy;
}

export function iniciarReservasAdmin() {
  const loading = document.getElementById("admin-reservations-loading");
  const tableWrap = document.getElementById("admin-reservations-table-wrap");
  const tbody = document.getElementById("admin-reservations-tbody");
  const empty = document.getElementById("admin-reservations-empty");
  const error = document.getElementById("admin-reservations-error");
  const errorMessage = document.getElementById("admin-reservations-error-message");
  const count = document.getElementById("admin-reservations-count");
  const semanaInput = document.getElementById("turnos-semana");
  const generarBtn = document.getElementById("generate-turns");
  const turnosStatus = document.getElementById("turnos-status");
  let cargando = false;
  let cancelando = null;
  let generando = false;

  semanaInput.min = formatearFechaISO(new Date());
  semanaInput.value = siguienteLunes();

  function mostrarEstadoTurnos(mensaje, esError = false) {
    if (!mensaje) {
      turnosStatus.hidden = true;
      turnosStatus.textContent = "";
      return;
    }
    turnosStatus.hidden = false;
    turnosStatus.textContent = mensaje;
    turnosStatus.classList.toggle("is-success", !esError);
  }

  function mostrarEstado(estado) {
    loading.hidden = estado !== "loading";
    tableWrap.hidden = estado !== "ready";
    empty.hidden = estado !== "empty";
    error.hidden = estado !== "error";
  }

  function pintarReservas(lista) {
    const reservas = Array.isArray(lista) ? lista : [];

    if (reservas.length === 0) {
      tbody.innerHTML = "";
      count.textContent = "0 reserves actives";
      mostrarEstado("empty");
      return;
    }

    tbody.innerHTML = reservas.map(function (reserva) {
      const nombre = [reserva.usuario_nombre, reserva.usuario_apellidos]
        .filter(Boolean)
        .join(" ")
        .trim() || "Sense nom";
      const bloque = ETIQUETAS_BLOQUE[reserva.bloque] || reserva.bloque;
      const fecha = formatearFecha(reserva.fecha_reserva);
      const activa = reserva.estado === "activa";
      const sePuedeCancelar = activa && !fechaEsPasada(reserva.fecha_reserva);
      const accion = sePuedeCancelar
        ? `<button class="icon-button danger" type="button" data-cancel-admin-reservation="${escaparHtml(reserva.id)}" aria-label="Cancel·lar la reserva de ${escaparHtml(nombre)}" title="Cancel·lar reserva">${icon("close", 16)}</button>`
        : "—";

      return `
        <tr>
          <td>
            <div>
              <strong>${escaparHtml(nombre)}</strong>
              <small>${escaparHtml(reserva.usuario_email || "")}</small>
            </div>
          </td>
          <td>${escaparHtml(fecha)}</td>
          <td>${escaparHtml(bloque)}</td>
          <td>
            <span class="table-plug">${icon("plug", 16)}</span>
            Carregador ${escaparHtml(reserva.cargador_numero)}
          </td>
          <td>${escaparHtml(etiquetaGrupo(reserva.tipo_grupo))}</td>
          <td>
            <span class="state ${activa ? "free" : "off"}">
              <i></i>${activa ? "Activa" : "Cancel·lada"}
            </span>
          </td>
          <td>${accion}</td>
        </tr>
      `;
    }).join("");

    count.textContent = reservas.length === 1
      ? "1 reserva activa"
      : `${reservas.length} reserves actives`;
    mostrarEstado("ready");
  }

  async function cargarReservas(opciones = {}) {
    if (cargando) {
      return;
    }

    cargando = true;
    if (!opciones.silencioso) {
      mostrarEstado("loading");
      count.textContent = "Carregant reserves...";
    }

    try {
      const datos = await reservasAdmin("activa");
      pintarReservas(datos.reservas);
    } catch (err) {
      errorMessage.textContent = err.message || "Torna-ho a provar.";
      count.textContent = "No s'han pogut carregar les reserves";
      mostrarEstado("error");
      mostrarAlerta(
        errorMessage.textContent,
        "No s'han pogut carregar les reserves"
      );
    } finally {
      cargando = false;
    }
  }

  async function confirmarCancelacion(id, boton) {
    if (cancelando !== null) {
      return;
    }

    let confirmado = true;
    if (window.Swal) {
      const resultado = await window.Swal.fire({
        icon: "warning",
        title: "Cancel·lar la reserva?",
        text: "La franja quedarà lliure i esta acció no es pot desfer.",
        showCancelButton: true,
        confirmButtonText: "Sí, cancel·la",
        cancelButtonText: "No",
        confirmButtonColor: "#c0392b"
      });
      confirmado = resultado.isConfirmed;
    } else {
      confirmado = window.confirm("Vols cancel·lar esta reserva?");
    }

    if (!confirmado) {
      return;
    }

    cancelando = id;
    boton.disabled = true;
    boton.classList.add("is-busy");

    try {
      await cancelarReserva(id);
      mostrarToast(
        "Reserva cancel·lada",
        "La franja horària s'ha alliberat correctament."
      );
      await cargarReservas({ silencioso: true });
    } catch (err) {
      mostrarToast(
        "No s'ha pogut cancel·lar la reserva",
        err.message || "Torna-ho a provar.",
        true
      );
      boton.disabled = false;
      boton.classList.remove("is-busy");
    } finally {
      cancelando = null;
    }
  }

  async function generarSemana() {
    if (generando) {
      return;
    }

    if (!semanaInput.value) {
      mostrarEstadoTurnos("Indica una data per a generar els torns.", true);
      semanaInput.focus();
      return;
    }

    generando = true;
    generarBtn.disabled = true;
    generarBtn.classList.add("is-busy");
    mostrarEstadoTurnos("Generant els torns setmanals...");

    try {
      const datos = await generarTurnosApi(semanaInput.value);
      const resumen = datos.resumen || {};
      const periodo = datos.semana_inicio && datos.semana_fin
        ? ` (${formatearFecha(datos.semana_inicio)} - ${formatearFecha(datos.semana_fin)})`
        : "";

      mostrarEstadoTurnos(
        `${datos.mensaje}${periodo}. Creades: ${resumen.creadas || 0}; ja existien: ${resumen.omitidas || 0}; sense plaça: ${resumen.usuarios_sin_plaza || 0}.`
      );
      mostrarToast(
        "Torns setmanals generats",
        datos.mensaje || "Els torns s'han generat correctament."
      );
      await cargarReservas({ silencioso: true });
    } catch (err) {
      mostrarEstadoTurnos(
        err.message || "No s'han pogut generar els torns.",
        true
      );
      mostrarToast(
        "No s'han pogut generar els torns",
        err.message || "Torna-ho a provar.",
        true
      );
    } finally {
      generando = false;
      generarBtn.disabled = false;
      generarBtn.classList.remove("is-busy");
    }
  }

  document.getElementById("refresh-admin-reservations").addEventListener("click", function () {
    cargarReservas();
  });
  document.getElementById("retry-admin-reservations").addEventListener("click", function () {
    cargarReservas();
  });
  generarBtn.addEventListener("click", generarSemana);
  semanaInput.addEventListener("input", function () {
    mostrarEstadoTurnos("");
  });
  tbody.addEventListener("click", function (evento) {
    const boton = evento.target.closest("[data-cancel-admin-reservation]");
    if (!boton) {
      return;
    }
    confirmarCancelacion(
      Number(boton.dataset.cancelAdminReservation),
      boton
    );
  });

  return {
    cargar: cargarReservas
  };
}
