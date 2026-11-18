import {
  obtenerDisponibilidad,
  crearReserva
} from "./reservations-api.js";
import {
  mostrarError,
  limpiarError,
  limpiarErrores,
  enfocarPrimerError,
  mostrarAlerta,
  mostrarMensajeFormulario,
  ocultarMensajeFormulario
} from "../core/validation-errors.js";
import {
  BLOQUES,
  aISO,
  escaparHtml,
  etiquetaGrupo,
  fechaEsPasada,
  fechaInicial,
  formatearFecha,
  formatearPotencia,
  iconMarkup,
  mostrarToast
} from "../dashboard/dashboard-utils.js";

const reserveForm = document.getElementById("reserve-form");
const fechaInput = document.getElementById("fecha");
const bloqueSelect = document.getElementById("bloque");
const checkBtn = document.getElementById("check-btn");
const reserveBtn = document.getElementById("reserve-btn");
const reserveError = document.getElementById("reserve-error");

const chargersLoading = document.getElementById("chargers-loading");
const chargerGrid = document.getElementById("charger-grid");
const chargersEmpty = document.getElementById("chargers-empty");
const chargersError = document.getElementById("chargers-error");
const chargersErrorMessage = document.getElementById("chargers-error-message");
const chargersCount = document.getElementById("chargers-count");

let disponibilidad = null;
let reservando = false;
let solicitudDisponibilidad = 0;

function mostrarEstadoCargadores(estado) {
  chargersLoading.hidden = estado !== "loading";
  chargerGrid.hidden = estado !== "ready";
  chargersEmpty.hidden = estado !== "empty";
  chargersError.hidden = estado !== "error";
}

function motivoNoDisponible(datos) {
  if (datos.pasada) {
    return "No pots reservar en una data passada.";
  }
  if (datos.festivo) {
    return "Eixe dia és festiu.";
  }
  if (!datos.laborable) {
    return "Només es pot reservar de dilluns a divendres.";
  }
  if (datos.horario_valido === false) {
    return "El bloc complet ha d’estar dins del teu horari de presència.";
  }
  return "La franja seleccionada no és vàlida.";
}

function pintarDisponibilidad(datos) {
  disponibilidad = datos;

  const cargadores = Array.isArray(datos.cargadores) ? datos.cargadores : [];

  if (cargadores.length === 0) {
    chargerGrid.innerHTML = "";
    chargersCount.textContent = "No hi ha carregadors configurats";
    mostrarEstadoCargadores("empty");
    actualizarBotonReserva();
    return;
  }

  const libres = cargadores.filter(function (cargador) {
    return cargador.activo && !cargador.ocupado;
  }).length;

  chargerGrid.innerHTML = cargadores.map(function (cargador) {
    const activo = Boolean(cargador.activo);
    const ocupado = Boolean(cargador.ocupado);
    const estado = !activo ? "inactive" : ocupado ? "busy" : "free";
    const etiqueta = !activo ? "Inactiu" : ocupado ? "Ocupat" : "Lliure";
    const descripcion = cargador.descripcion
      ? escaparHtml(cargador.descripcion)
      : `Carregador ${escaparHtml(cargador.numero)}`;

    return `
      <article class="charger-card is-${estado} ${cargador.preferente ? "is-preferred" : ""}">
        <div class="charger-card-top">
          <span class="charger-number">#${escaparHtml(cargador.numero)}</span>
          <span class="state ${estado === "free" ? "free" : estado === "busy" ? "busy" : "off"}">
            <i></i>${etiqueta}
          </span>
        </div>
        <h3>${descripcion}</h3>
        <p class="charger-meta">
          ${escaparHtml(etiquetaGrupo(cargador.tipo_grupo))} · ${escaparHtml(cargador.conector || "—")} · ${escaparHtml(formatearPotencia(cargador.kw))}
        </p>
        <span class="charger-group">${cargador.preferente ? "El teu grup" : "Un altre grup"}</span>
      </article>
    `;
  }).join("");

  if (!datos.disponible) {
    chargersCount.textContent = motivoNoDisponible(datos);
  } else if (libres === 0) {
    chargersCount.textContent = "No queden carregadors lliures en eixa franja";
  } else {
    chargersCount.textContent = `${libres} de ${cargadores.length} carregadors lliures · ${BLOQUES[datos.bloque] ? BLOQUES[datos.bloque].label : datos.bloque}`;
  }

  mostrarEstadoCargadores("ready");
  actualizarBotonReserva();
}

function actualizarBotonReserva() {
  const fecha = fechaInput.value;
  const bloque = bloqueSelect.value;
  const coincide = disponibilidad &&
    disponibilidad.fecha === fecha &&
    disponibilidad.bloque === bloque;
  const hayLibre = coincide &&
    disponibilidad.disponible &&
    disponibilidad.cargadores.some(function (cargador) {
      return cargador.activo && !cargador.ocupado;
    });

  reserveBtn.disabled = reservando || !hayLibre;
  reserveBtn.setAttribute("aria-busy", String(reservando));
  reserveBtn.innerHTML = reservando
    ? "Reservant..."
    : `${iconMarkup("bolt", 16)} Reservar plaça`;
}

async function cargarDisponibilidad(opciones = {}) {
  const fecha = fechaInput.value;
  const bloque = bloqueSelect.value;

  if (!fecha || !bloque) {
    disponibilidad = null;
    chargerGrid.innerHTML = "";
    chargersCount.textContent = "Selecciona un dia i una franja.";
    mostrarEstadoCargadores("idle");
    actualizarBotonReserva();
    return;
  }

  const solicitud = ++solicitudDisponibilidad;

  if (!opciones.silencioso) {
    mostrarEstadoCargadores("loading");
    chargersCount.textContent = "Consultant disponibilitat...";
  }

  checkBtn.disabled = true;
  ocultarMensajeFormulario(reserveError);

  try {
    const datos = await obtenerDisponibilidad(fecha, bloque);

    if (solicitud !== solicitudDisponibilidad) {
      return;
    }

    pintarDisponibilidad(datos);
  } catch (error) {
    if (solicitud !== solicitudDisponibilidad) {
      return;
    }

    disponibilidad = null;
    chargersErrorMessage.textContent = error.message || "Torna-ho a provar.";
    chargersCount.textContent = "No s'ha pogut consultar la disponibilitat";
    mostrarEstadoCargadores("error");
    mostrarAlerta(chargersErrorMessage.textContent, "No s'ha pogut consultar la disponibilitat");
    actualizarBotonReserva();
  } finally {
    if (solicitud === solicitudDisponibilidad) {
      checkBtn.disabled = false;
    }
  }
}

function validarFormulario() {
  limpiarErrores([fechaInput, bloqueSelect]);

  let valido = true;

  if (!fechaInput.value) {
    mostrarError(fechaInput, "Selecciona un dia.");
    valido = false;
  } else if (fechaEsPasada(fechaInput.value)) {
    mostrarError(fechaInput, "Selecciona una data d'hui en avant.");
    valido = false;
  }

  if (!bloqueSelect.value) {
    mostrarError(bloqueSelect, "Selecciona una franja horària.");
    valido = false;
  }

  if (!valido) {
    enfocarPrimerError(reserveForm);
  }

  return valido;
}

async function manejarEnvio(evento, reservas) {
  evento.preventDefault();

  if (reservando) {
    return;
  }

  ocultarMensajeFormulario(reserveError);

  if (!validarFormulario()) {
    return;
  }

  const fecha = fechaInput.value;
  const bloque = bloqueSelect.value;
  const coincide = disponibilidad &&
    disponibilidad.fecha === fecha &&
    disponibilidad.bloque === bloque;

  if (!coincide || !disponibilidad.disponible) {
    mostrarMensajeFormulario(
      reserveError,
      "Consulta la disponibilitat d'esta data i franja abans de reservar.",
      true
    );
    return;
  }

  const hayLibre = disponibilidad.cargadores.some(function (cargador) {
    return cargador.activo && !cargador.ocupado;
  });

  if (!hayLibre) {
    mostrarMensajeFormulario(
      reserveError,
      "No queden carregadors lliures en eixa franja.",
      true
    );
    return;
  }

  reservando = true;
  actualizarBotonReserva();

  try {
    const datos = await crearReserva({
      fecha_reserva: fecha,
      bloque: bloque
    });

    const numero = datos.cargador ? datos.cargador.numero : "";
    const reserva = datos.reserva || {};
    const horaInicio = reserva.hora_inicio || "—";
    const horaFin = reserva.hora_fin || "—";
    mostrarToast(
      "Reserva creada",
      `Carregador ${numero} · ${formatearFecha(fecha)}. Endolla ${horaInicio}, desendolla ${horaFin}.`
    );

    reservas.marcarDesactualizadas();
    await cargarDisponibilidad({ silencioso: true });

    if (!document.getElementById("section-reservas").hidden) {
      reservas.cargar({ silencioso: true });
    }
  } catch (error) {
    mostrarMensajeFormulario(
      reserveError,
      error.message || "No s'ha pogut crear la reserva. Torna-ho a provar.",
      true
    );
  } finally {
    reservando = false;
    actualizarBotonReserva();
  }
}

export function iniciarCargadores(reservas) {
  fechaInput.min = aISO(new Date());
  fechaInput.value = fechaInicial();
  bloqueSelect.value = "BLOQUE_1";

  reserveForm.addEventListener("submit", function (evento) {
    manejarEnvio(evento, reservas);
  });

  checkBtn.addEventListener("click", function () {
    cargarDisponibilidad();
  });

  document.getElementById("retry-chargers").addEventListener("click", function () {
    cargarDisponibilidad();
  });

  [fechaInput, bloqueSelect].forEach(function (campo) {
    campo.addEventListener("input", function () {
      limpiarError(campo);
      ocultarMensajeFormulario(reserveError);
      disponibilidad = null;
      actualizarBotonReserva();
    });

    campo.addEventListener("change", function () {
      limpiarError(campo);
      ocultarMensajeFormulario(reserveError);
      disponibilidad = null;
      actualizarBotonReserva();
      cargarDisponibilidad();
    });
  });

  return cargarDisponibilidad;
}
