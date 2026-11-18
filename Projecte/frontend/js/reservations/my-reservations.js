import {
  cancelarReserva,
  misReservas
} from "./reservations-api.js";
import {
  mostrarAlerta
} from "../core/validation-errors.js";
import {
  BLOQUES,
  escaparHtml,
  etiquetaGrupo,
  fechaEsPasada,
  formatearFecha,
  iconMarkup,
  mostrarToast
} from "../dashboard/dashboard-utils.js";

const reservationsLoading = document.getElementById("reservations-loading");
const reservationsTableWrap = document.getElementById("reservations-table-wrap");
const reservationsTbody = document.getElementById("reservations-tbody");
const reservationsEmpty = document.getElementById("reservations-empty");
const reservationsError = document.getElementById("reservations-error");
const reservationsErrorMessage = document.getElementById("reservations-error-message");
const reservationsCount = document.getElementById("reservations-count");
const reservationSummary = document.getElementById("reservation-summary");
const summaryHours = document.getElementById("summary-hours");
const summaryActive = document.getElementById("summary-active");
const summaryPastHours = document.getElementById("summary-past-hours");
const summaryPastReservas = document.getElementById("summary-past-reservas");

let reservasCargadas = false;
let cancelacionEnProceso = null;

function formatearHoras(valor) {
  return `${valor.toLocaleString("ca-ES", { maximumFractionDigits: 2 })} h`;
}

function mostrarEstadoReservas(estado) {
  reservationsLoading.hidden = estado !== "loading";
  reservationsTableWrap.hidden = estado !== "ready";
  reservationsEmpty.hidden = estado !== "empty";
  reservationsError.hidden = estado !== "error";
  if (reservationSummary) {
    reservationSummary.hidden = estado !== "ready";
  }
}

function pintarReservas(lista, resumen) {
  const reservas = Array.isArray(lista) ? lista : [];
  reservasCargadas = true;

  if (reservas.length === 0) {
    reservationsTbody.innerHTML = "";
    reservationsCount.textContent = "0 reserves registrades";
    mostrarEstadoReservas("empty");
    return;
  }

  reservationsTbody.innerHTML = reservas.map(function (reserva) {
    const activa = reserva.estado === "activa";
    const bloque = BLOQUES[reserva.bloque]
      ? BLOQUES[reserva.bloque].label
      : reserva.bloque;
    const fecha = formatearFecha(reserva.fecha_reserva);
    const horaInicio = reserva.hora_inicio || "—";
    const horaFin = reserva.hora_fin || "—";
    const sePuedeCancelar = activa && !fechaEsPasada(reserva.fecha_reserva);
    const accion = sePuedeCancelar
      ? `<button class="icon-button danger" type="button" data-cancel-reservation="${escaparHtml(reserva.id)}" aria-label="Cancel·lar la reserva" title="Cancel·lar reserva">${iconMarkup("close", 16)}</button>`
      : "—";

    return `
      <tr>
        <td>${escaparHtml(fecha)}</td>
        <td>${escaparHtml(bloque)}</td>
        <td>
          <div class="charge-time">
            <span><strong>Endollar</strong> ${escaparHtml(fecha)} · ${escaparHtml(horaInicio)}</span>
            <span><strong>Desendollar</strong> ${escaparHtml(fecha)} · ${escaparHtml(horaFin)}</span>
          </div>
        </td>
        <td>
          <span class="table-plug">${iconMarkup("plug", 16)}</span>
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

  reservationsCount.textContent = reservas.length === 1
    ? "1 reserva registrada"
    : `${reservas.length} reserves registrades`;

  if (resumen) {
    if (summaryHours) {
      summaryHours.textContent = formatearHoras(Number(resumen.horas_activas) || 0);
    }
    if (summaryActive) {
      summaryActive.textContent = String(Number(resumen.reservas_activas) || 0);
    }
    if (summaryPastHours) {
      summaryPastHours.textContent = formatearHoras(Number(resumen.horas_pasadas) || 0);
    }
    if (summaryPastReservas) {
      summaryPastReservas.textContent = String(Number(resumen.reservas_pasadas) || 0);
    }
  } else {
    const activas = reservas.filter(function (reserva) {
      return reserva.estado === "activa";
    });
    const horas = activas.reduce(function (total, reserva) {
      const bloque = BLOQUES[reserva.bloque];
      return total + (bloque ? bloque.horas : 0);
    }, 0);

    if (summaryHours) {
      summaryHours.textContent = formatearHoras(horas);
    }
    if (summaryActive) {
      summaryActive.textContent = String(activas.length);
    }
  }

  mostrarEstadoReservas("ready");
}

async function confirmarCancelacion(id, boton) {
  if (cancelacionEnProceso !== null) {
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

  cancelacionEnProceso = id;
  boton.disabled = true;
  boton.classList.add("is-busy");

  try {
    await cancelarReserva(id);
    mostrarToast(
      "Reserva cancel·lada",
      "La franja horària s'ha alliberat correctament."
    );
    await cargarReservas({ silencioso: true });
  } catch (error) {
    mostrarAlerta(
      error.message || "No s'ha pogut cancel·lar la reserva. Torna-ho a provar.",
      "No s'ha pogut cancel·lar la reserva"
    );
    boton.disabled = false;
    boton.classList.remove("is-busy");
  } finally {
    cancelacionEnProceso = null;
  }
}

async function cargarReservas(opciones = {}) {
  if (!opciones.silencioso) {
    mostrarEstadoReservas("loading");
    reservationsCount.textContent = "Carregant reserves...";
  }

  try {
    const datos = await misReservas();
    pintarReservas(datos.reservas, datos.resumen);
  } catch (error) {
    reservasCargadas = false;
    reservationsErrorMessage.textContent = error.message || "Torna-ho a provar.";
    reservationsCount.textContent = "No s'han pogut carregar les teues reserves";
    mostrarEstadoReservas("error");
    mostrarAlerta(
      reservationsErrorMessage.textContent,
      "No s'han pogut carregar les teues reserves"
    );
  }
}

export function iniciarReservas() {
  document.getElementById("refresh-reservations").addEventListener("click", function () {
    cargarReservas();
  });

  document.getElementById("retry-reservations").addEventListener("click", function () {
    cargarReservas();
  });
  reservationsTbody.addEventListener("click", function (evento) {
    const boton = evento.target.closest("[data-cancel-reservation]");
    if (!boton) {
      return;
    }
    confirmarCancelacion(Number(boton.dataset.cancelReservation), boton);
  });

  return {
    cargar: cargarReservas,
    cargarSiNecesario: function () {
      if (!reservasCargadas) {
        cargarReservas();
      }
    },
    marcarDesactualizadas: function () {
      reservasCargadas = false;
    }
  };
}
