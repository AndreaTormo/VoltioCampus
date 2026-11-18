"use strict";

import {
  cambiarEstadoCargador,
  crearCargador,
  listarCargadores
} from "../chargers/chargers-api.js";
import {
  enfocarPrimerError,
  limpiarError,
  limpiarErrores,
  mostrarAlerta,
  mostrarError,
  mostrarMensajeFormulario,
  ocultarMensajeFormulario
} from "../core/validation-errors.js";
import {
  abrirDialogo,
  cerrarDialogo,
  escaparHtml,
  etiquetaGrupo,
  formatearPotencia,
  icon,
  mostrarToast
} from "./admin-shell.js";

export function iniciarCarregadors() {
  const chargersLoading = document.getElementById("chargers-loading");
  const chargersTableWrap = document.getElementById("chargers-table-wrap");
  const chargersTbody = document.getElementById("chargers-tbody");
  const chargersEmpty = document.getElementById("chargers-empty");
  const chargersError = document.getElementById("chargers-error");
  const chargersErrorMessage = document.getElementById("chargers-error-message");
  const chargersCount = document.getElementById("chargers-count");
  const chargerForm = document.getElementById("charger-form");
  const chargerFormError = document.getElementById("charger-form-error");
  const chargerSubmit = document.getElementById("charger-submit");
  const chargerNumero = document.getElementById("charger-numero");
  const chargerGrupo = document.getElementById("charger-grupo");
  const chargerConector = document.getElementById("charger-conector");
  const chargerKw = document.getElementById("charger-kw");
  const chargerTiempo = document.getElementById("charger-tiempo");
  const chargerDescripcion = document.getElementById("charger-descripcion");
  const chargerFields = [
    chargerNumero,
    chargerGrupo,
    chargerConector,
    chargerKw,
    chargerTiempo,
    chargerDescripcion
  ];
  let cargadores = [];
  let cargadoresCargados = false;
  let cargandoCargadores = false;
  let enviandoCargador = false;
  let cargadorEnProceso = null;

  function validarEnteroPositivo(valor, mensajeVacio, mensajeInvalido) {
    if (String(valor || "").trim() === "") {
      return mensajeVacio;
    }
    const numero = Number(valor);
    if (!Number.isInteger(numero) || numero < 1) {
      return mensajeInvalido;
    }
    return null;
  }

  function validarCampo(campo) {
    let mensaje = null;
    if (campo === chargerNumero) {
      mensaje = validarEnteroPositivo(
        campo.value,
        "Introdueix el número del carregador.",
        "El número ha de ser un enter major que 0."
      );
    } else if (campo === chargerGrupo) {
      if (campo.value !== "alumnos" && campo.value !== "profesores") {
        mensaje = "Selecciona el grup del carregador.";
      }
    } else if (campo === chargerConector) {
      const conector = campo.value.trim();
      if (conector === "") {
        mensaje = "Introdueix el tipus de connector.";
      } else if (conector.length > 20) {
        mensaje = "El connector no pot superar 20 caràcters.";
      }
    } else if (campo === chargerKw) {
      const valor = campo.value.trim();
      const potencia = Number(valor);
      if (valor === "") {
        mensaje = "Introdueix la potència del carregador.";
      } else if (!Number.isFinite(potencia) || potencia <= 0) {
        mensaje = "La potència ha de ser major que 0.";
      } else if (potencia > 999.9) {
        mensaje = "La potència no pot superar 999,9 kW.";
      }
    } else if (campo === chargerTiempo) {
      mensaje = validarEnteroPositivo(
        campo.value,
        "Introdueix el temps estimat.",
        "El temps ha de ser un enter major que 0."
      );
    } else if (campo === chargerDescripcion && campo.value.trim().length > 100) {
      mensaje = "La descripció no pot superar 100 caràcters.";
    }

    if (mensaje) {
      mostrarError(campo, mensaje);
      return false;
    }
    limpiarError(campo);
    return true;
  }

  function validarFormulario() {
    limpiarErrores(chargerFields);
    const valido = chargerFields.map(validarCampo).every(Boolean);
    if (!valido) {
      enfocarPrimerError(chargerForm);
    }
    return valido;
  }

  function mostrarEstado(estado) {
    chargersLoading.hidden = estado !== "loading";
    chargersTableWrap.hidden = estado !== "ready";
    chargersEmpty.hidden = estado !== "empty";
    chargersError.hidden = estado !== "error";
  }

  function pintarCargadores(lista) {
    cargadores = Array.isArray(lista) ? lista : [];
    cargadoresCargados = true;
    if (cargadores.length === 0) {
      chargersTbody.innerHTML = "";
      chargersCount.textContent = "0 carregadors registrats";
      mostrarEstado("empty");
      return;
    }

    const activos = cargadores.filter(function (cargador) {
      return Boolean(cargador.activo);
    }).length;
    chargersTbody.innerHTML = cargadores.map(function (cargador) {
      const activo = Boolean(cargador.activo);
      const numero = escaparHtml(cargador.numero);
      const accion = activo ? "Desactivar" : "Activar";
      const claseBoton = activo ? "icon-button danger" : "icon-button";
      const descripcion = cargador.descripcion
        ? escaparHtml(cargador.descripcion)
        : "Sense descripció";
      return `
        <tr>
          <td>
            <span class="table-plug">${icon("plug", 17)}</span>
            <div>
              <strong>Carregador ${numero}</strong>
              <small>${descripcion}</small>
            </div>
          </td>
          <td>${escaparHtml(etiquetaGrupo(cargador.tipo_grupo))}</td>
          <td>${escaparHtml(formatearPotencia(cargador.kw))}</td>
          <td>${escaparHtml(cargador.conector || "—")}</td>
          <td>
            <span class="state ${activo ? "active" : "off"}">
              <i></i>${activo ? "Actiu" : "Inactiu"}
            </span>
          </td>
          <td>
            <button class="${claseBoton}" type="button"
              data-toggle-charger="${escaparHtml(cargador.id)}"
              aria-label="${accion} carregador ${numero}"
              title="${accion} carregador">${icon("power", 16)}</button>
          </td>
          <td>
            <button class="icon-button danger" type="button"
              data-delete-charger="${escaparHtml(cargador.id)}"
              aria-label="Eliminar carregador"
              title="Eliminar carregador">${icon("trash", 16)}</button>
          </td>
        </tr>
      `;
    }).join("");

    chargersCount.textContent = cargadores.length === 1
      ? `1 carregador · ${activos} ${activos === 1 ? "actiu" : "actius"}`
      : `${cargadores.length} carregadors · ${activos} ${activos === 1 ? "actiu" : "actius"}`;
    mostrarEstado("ready");
  }

  async function cargarCargadores(opciones = {}) {
    if (cargandoCargadores || (cargadoresCargados && !opciones.forzar)) {
      return;
    }
    cargandoCargadores = true;
    if (!opciones.silencioso) {
      mostrarEstado("loading");
      chargersCount.textContent = "Carregant carregadors...";
    }
    try {
      const datos = await listarCargadores();
      pintarCargadores(datos.cargadores);
    } catch (error) {
      chargersErrorMessage.textContent = error.message || "Torna-ho a provar.";
      chargersCount.textContent = "No s'han pogut carregar els carregadors";
      mostrarEstado("error");
      mostrarAlerta(chargersErrorMessage.textContent, "No s'han pogut carregar els carregadors");
    } finally {
      cargandoCargadores = false;
    }
  }

  function actualizarBoton(cargando) {
    chargerSubmit.disabled = cargando;
    chargerSubmit.textContent = cargando ? "Creant carregador..." : "Crear carregador";
    chargerSubmit.setAttribute("aria-busy", String(cargando));
  }

  function abrirModalCargador() {
    chargerForm.reset();
    limpiarErrores(chargerFields);
    ocultarMensajeFormulario(chargerFormError);
    abrirDialogo("charger-modal");
    chargerNumero.focus();
  }

  function construirDatosCargador() {
    return {
      numero: Number(chargerNumero.value),
      tipo_grupo: chargerGrupo.value,
      conector: chargerConector.value.trim(),
      kw: Number(chargerKw.value),
      tiempo_estimado_fijo: Number(chargerTiempo.value),
      descripcion: chargerDescripcion.value.trim() || null
    };
  }

  async function manejarEnvio(evento) {
    evento.preventDefault();
    if (enviandoCargador) {
      return;
    }
    ocultarMensajeFormulario(chargerFormError);
    if (!validarFormulario()) {
      return;
    }
    enviandoCargador = true;
    actualizarBoton(true);
    try {
      const datos = await crearCargador(construirDatosCargador());
      const nou = datos.cargador;
      cerrarDialogo("charger-modal");
      mostrarToast(
        "Carregador afegit",
        `El carregador ${nou ? nou.numero : ""} s'ha registrat correctament.`
      );
      if (nou) {
        cargadores = cargadores.concat(nou).sort(function (a, b) {
          return Number(a.numero) - Number(b.numero);
        });
        pintarCargadores(cargadores);
      } else {
        await cargarCargadores({ silencioso: true, forzar: true });
      }
    } catch (error) {
      mostrarMensajeFormulario(
        chargerFormError,
        error.message || "No s'ha pogut crear el carregador. Torna-ho a provar."
      );
    } finally {
      enviandoCargador = false;
      actualizarBoton(false);
    }
  }

  function bloquearBotones(bloquear) {
    document.querySelectorAll("[data-toggle-charger]").forEach(function (boton) {
      boton.disabled = bloquear;
    });
  }

  async function alternarCargador(id, boton) {
    if (cargadorEnProceso !== null) {
      return;
    }
    const cargador = cargadores.find(function (item) {
      return Number(item.id) === Number(id);
    });
    if (!cargador) {
      return;
    }

    cargadorEnProceso = id;
    bloquearBotones(true);
    boton.classList.add("is-busy");
    try {
      const datos = await cambiarEstadoCargador(id, !cargador.activo);
      const actualizado = datos.cargador || {
        ...cargador,
        activo: !cargador.activo
      };
      cargadores = cargadores.map(function (item) {
        return Number(item.id) === Number(id)
          ? { ...item, ...actualizado }
          : item;
      });
      pintarCargadores(cargadores);
      mostrarToast(
        actualizado.activo ? "Carregador activat" : "Carregador desactivat",
        `El carregador ${actualizado.numero} està ${actualizado.activo ? "actiu" : "inactiu"}.`
      );
    } catch (error) {
      mostrarToast(
        "No s'ha pogut canviar l'estat",
        error.message || "Torna-ho a provar.",
        true
      );
      bloquearBotones(false);
      boton.classList.remove("is-busy");
    } finally {
      cargadorEnProceso = null;
    }
  }

  document.getElementById("add-charger-btn").addEventListener("click", abrirModalCargador);
  document.querySelectorAll("[data-open-charger-modal]").forEach(function (boton) {
    boton.addEventListener("click", abrirModalCargador);
  });
  document.getElementById("retry-chargers").addEventListener("click", function () {
    cargarCargadores({ forzar: true });
  });
  chargerForm.addEventListener("submit", manejarEnvio);
  chargerFields.forEach(function (campo) {
    campo.addEventListener("blur", function () {
      validarCampo(campo);
    });
    campo.addEventListener("input", function () {
      limpiarError(campo);
      ocultarMensajeFormulario(chargerFormError);
    });
  });
  document.getElementById("charger-modal").addEventListener("close", function () {
    chargerForm.reset();
    limpiarErrores(chargerFields);
    ocultarMensajeFormulario(chargerFormError);
  });
  chargersTbody.addEventListener("click", async function (evento) {
    const boton = evento.target.closest("[data-toggle-charger]");
    if (boton) {
      alternarCargador(Number(boton.dataset.toggleCharger), boton);
    }
    const botonDelete = evento.target.closest("[data-delete-charger]");
    if (botonDelete) {
      const id = Number(botonDelete.dataset.deleteCharger);
      if (window.Swal) {
        const resultado = await window.Swal.fire({
          icon: "warning",
          title: "Eliminar carregador?",
          text: "Esta acció no es pot desfer.",
          showCancelButton: true,
          confirmButtonText: "Sí, eliminar",
          cancelButtonText: "Cancel·lar",
          confirmButtonColor: "#c0392b"
        });
        if (resultado.isConfirmed) {
          eliminarCargador(id).then(function () {
            mostrarToast("Carregador eliminat", "El carregador s'ha eliminat correctament.", false);
            cargarCargadores({ forzar: true });
          }).catch(function (error) {
            mostrarToast("Error", error.message || "No s'ha pogut eliminar el carregador.", true);
          });
        }
      } else {
        if (window.confirm("Vols eliminar aquest carregador? Aquesta acció no es pot desfer.")) {
          eliminarCargador(id).then(function () {
            mostrarToast("Carregador eliminat", "El carregador s'ha eliminat correctament.", false);
            cargarCargadores({ forzar: true });
          }).catch(function (error) {
            mostrarToast("Error", error.message || "No s'ha pogut eliminar el carregador.", true);
          });
        }
      }
    }
  });

  return cargarCargadores;
}
