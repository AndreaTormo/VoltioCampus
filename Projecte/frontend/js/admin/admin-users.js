"use strict";

import {
  cambiarEstadoUsuario,
  eliminarUsuario,
  listarUsuarios
} from "../users/users-api.js";
import {
  mostrarAlerta,
  mostrarMensajeFormulario,
  ocultarMensajeFormulario
} from "../core/validation-errors.js";
import {
  abrirDialogo,
  cerrarDialogo,
  escaparHtml,
  etiquetaTipo,
  formatearFecha,
  icon,
  mostrarToast,
  nombreCompleto,
  obtenerIniciales
} from "./admin-shell.js";

export function iniciarUsuarios({ usuarioActual, abrirFormulario, abrirHorario }) {
  const usersLoading = document.getElementById("users-loading");
  const usersTableWrap = document.getElementById("users-table-wrap");
  const usersTbody = document.getElementById("users-tbody");
  const usersEmpty = document.getElementById("users-empty");
  const usersError = document.getElementById("users-error");
  const usersErrorMessage = document.getElementById("users-error-message");
  const usersCount = document.getElementById("users-count");
  const deleteUserMessage = document.getElementById("delete-user-message");
  const deleteUserError = document.getElementById("delete-user-error");
  const confirmDeleteUser = document.getElementById("confirm-delete-user");
  const toggleUserModal = document.getElementById("toggle-user-modal");
  const toggleUserTitle = document.getElementById("toggle-user-title");
  const toggleUserMessage = document.getElementById("toggle-user-message");
  const toggleUserError = document.getElementById("toggle-user-error");
  const toggleUserIcon = document.getElementById("toggle-user-icon");
  const confirmToggleUser = document.getElementById("confirm-toggle-user");
  let usuarios = [];
  let usuarioPendienteEliminar = null;
  let usuarioPendienteEstado = null;
  let cargandoUsuarios = false;
  let eliminandoUsuario = false;
  let cambiandoEstado = false;

  function mostrarEstadoUsuarios(estado) {
    usersLoading.hidden = estado !== "loading";
    usersTableWrap.hidden = estado !== "ready";
    usersEmpty.hidden = estado !== "empty";
    usersError.hidden = estado !== "error";
  }

  function pintarUsuarios(lista) {
    usuarios = Array.isArray(lista) ? lista : [];
    if (usuarios.length === 0) {
      usersTbody.innerHTML = "";
      usersCount.textContent = "0 usuaris registrats";
      mostrarEstadoUsuarios("empty");
      return;
    }

    usersTbody.innerHTML = usuarios.map(function (usuario) {
      const nombre = nombreCompleto(usuario);
      const esCuentaAdmin = usuario.rol === "admin";
      const esCuentaActual =
        Number(usuario.id) === Number(usuarioActual && usuarioActual.id);
      const activo = usuario.activo !== false;
      const puedeEliminar = !esCuentaAdmin && !esCuentaActual;
      const puedeCambiarEstado = !esCuentaAdmin && !esCuentaActual;
      const accionEstado = puedeCambiarEstado
        ? `<button class="icon-button${activo ? " danger" : ""}" type="button" data-toggle-user="${escaparHtml(usuario.id)}" aria-label="${activo ? "Desactivar" : "Activar"} ${escaparHtml(nombre)}" title="${activo ? "Desactivar usuari" : "Activar usuari"}">${icon("power", 16)}</button>`
        : `<button class="icon-button" type="button" disabled aria-label="No es pot canviar l’estat d’este usuari" title="No es pot canviar l’estat d’este usuari">${icon("power", 16)}</button>`;
      const accion = `
        <button class="button secondary" type="button" data-edit-schedule="${escaparHtml(usuario.id)}" aria-label="Editar l’horari de ${escaparHtml(nombre)}">
          ${icon("calendar", 16)} Horari
        </button>
        ${accionEstado}
        ${puedeEliminar
          ? `<button class="icon-button danger" type="button" data-delete-user="${escaparHtml(usuario.id)}" aria-label="Eliminar ${escaparHtml(nombre)}" title="Eliminar usuari">${icon("trash", 16)}</button>`
          : `<button class="icon-button" type="button" disabled aria-label="Este usuari no es pot eliminar" title="Este usuari no es pot eliminar">${icon("trash", 16)}</button>`}
      `;
      const vehiculo = [usuario.matricula, usuario.modelo_coche]
        .filter(Boolean)
        .join(" · ");

      return `
        <tr>
          <td>
            <span class="avatar small">${escaparHtml(obtenerIniciales(nombre))}</span>
            <div>
              <strong>${escaparHtml(nombre || "Sense nom")}</strong>
              <small>${escaparHtml(usuario.email || "")}</small>
            </div>
          </td>
          <td>${escaparHtml(usuario.rol === "admin" ? "Admin" : "Usuari")}</td>
          <td>${escaparHtml(etiquetaTipo(usuario))}</td>
          <td>${escaparHtml(usuario.nia_profesor || "—")}</td>
          <td>${escaparHtml(vehiculo || "—")}</td>
          <td>${escaparHtml(formatearFecha(usuario.fecha_registro))}</td>
          <td><span class="state ${activo ? "free" : "off"}"><i></i>${activo ? "Actiu" : "Inactiu"}</span></td>
          <td><div class="user-actions">${accion}</div></td>
        </tr>
      `;
    }).join("");

    usersCount.textContent = usuarios.length === 1
      ? "1 usuari registrat"
      : `${usuarios.length} usuaris registrats`;
    mostrarEstadoUsuarios("ready");
  }

  async function cargarUsuarios(opciones = {}) {
    if (cargandoUsuarios) {
      return;
    }
    cargandoUsuarios = true;
    if (!opciones.silencioso) {
      mostrarEstadoUsuarios("loading");
      usersCount.textContent = "Carregant usuaris...";
    }

    try {
      const datos = await listarUsuarios();
      pintarUsuarios(datos.usuarios);
    } catch (error) {
      usersErrorMessage.textContent = error.message || "Torna-ho a provar.";
      usersCount.textContent = "No s'han pogut carregar els usuaris";
      mostrarEstadoUsuarios("error");
      mostrarAlerta(usersErrorMessage.textContent, "No s'han pogut carregar els usuaris");
    } finally {
      cargandoUsuarios = false;
    }
  }

  function abrirModalEliminarUsuario(usuario) {
    usuarioPendienteEliminar = usuario;
    deleteUserMessage.textContent =
      `Vas a eliminar el compte de ${nombreCompleto(usuario) || "este usuari"}. Esta acció no es pot desfer.`;
    ocultarMensajeFormulario(deleteUserError);
    abrirDialogo("delete-user-modal");
  }

  async function confirmarEliminarUsuario() {
    if (!usuarioPendienteEliminar || eliminandoUsuario) {
      return;
    }
    eliminandoUsuario = true;
    confirmDeleteUser.disabled = true;
    confirmDeleteUser.textContent = "Eliminant...";
    ocultarMensajeFormulario(deleteUserError);

    try {
      const datos = await eliminarUsuario(usuarioPendienteEliminar.id);
      const nombre = nombreCompleto(datos.usuario) || "L'usuari";
      cerrarDialogo("delete-user-modal");
      mostrarToast("Usuari eliminat", `${nombre} s'ha eliminat correctament.`);
      await cargarUsuarios({ silencioso: true });
    } catch (error) {
      mostrarMensajeFormulario(
        deleteUserError,
        error.message || "No s'ha pogut eliminar l'usuari. Torna-ho a provar."
      );
    } finally {
      eliminandoUsuario = false;
      confirmDeleteUser.disabled = false;
      confirmDeleteUser.textContent = "Sí, elimina";
    }
  }

  function abrirModalEstado(usuario) {
    usuarioPendienteEstado = usuario;
    const activo = usuario.activo !== false;
    const nombre = nombreCompleto(usuario) || "este usuari";

    toggleUserTitle.textContent = activo ? "Desactivar usuari?" : "Activar usuari?";
    toggleUserMessage.textContent = activo
      ? `Vas a desactivar ${nombre}. No podrà iniciar sessió, però les seues dades i reserves es conserven.`
      : `Vas a reactivar ${nombre}. Podrà tornar a iniciar sessió.`;
    toggleUserIcon.classList.toggle("danger", activo);
    confirmToggleUser.textContent = activo ? "Sí, desactiva" : "Sí, activa";
    confirmToggleUser.className = activo ? "button danger-button" : "button primary";
    ocultarMensajeFormulario(toggleUserError);
    abrirDialogo("toggle-user-modal");
  }

  async function confirmarCambioEstado() {
    if (!usuarioPendienteEstado || cambiandoEstado) {
      return;
    }

    cambiandoEstado = true;
    confirmToggleUser.disabled = true;
    const textoOriginal = confirmToggleUser.textContent;
    confirmToggleUser.textContent = "Guardant...";
    ocultarMensajeFormulario(toggleUserError);

    try {
      const activoActual = usuarioPendienteEstado.activo !== false;
      const datos = await cambiarEstadoUsuario(
        usuarioPendienteEstado.id,
        !activoActual
      );
      const nombre = nombreCompleto(datos.usuario) || "L'usuari";
      cerrarDialogo("toggle-user-modal");
      mostrarToast(
        activoActual ? "Usuari desactivat" : "Usuari activat",
        `${nombre} s'ha ${activoActual ? "desactivat" : "activat"} correctament.`
      );
      await cargarUsuarios({ silencioso: true });
    } catch (error) {
      mostrarMensajeFormulario(
        toggleUserError,
        error.message || "No s'ha pogut canviar l'estat de l'usuari. Torna-ho a provar."
      );
    } finally {
      cambiandoEstado = false;
      confirmToggleUser.disabled = false;
      confirmToggleUser.textContent = textoOriginal;
    }
  }

  document.getElementById("add-user-btn").addEventListener("click", abrirFormulario);
  document.querySelectorAll("[data-open-user-modal]").forEach(function (boton) {
    boton.addEventListener("click", abrirFormulario);
  });
  document.getElementById("retry-users").addEventListener("click", function () {
    cargarUsuarios();
  });
  confirmDeleteUser.addEventListener("click", confirmarEliminarUsuario);
  document.getElementById("delete-user-modal").addEventListener("close", function () {
    usuarioPendienteEliminar = null;
    ocultarMensajeFormulario(deleteUserError);
  });
  confirmToggleUser.addEventListener("click", confirmarCambioEstado);
  toggleUserModal.addEventListener("close", function () {
    usuarioPendienteEstado = null;
    ocultarMensajeFormulario(toggleUserError);
  });
  usersTbody.addEventListener("click", function (evento) {
    const botonHorario = evento.target.closest("[data-edit-schedule]");
    if (botonHorario) {
      const usuarioHorario = usuarios.find(function (item) {
        return Number(item.id) === Number(botonHorario.dataset.editSchedule);
      });
      if (usuarioHorario) {
        abrirHorario(usuarioHorario);
      }
      return;
    }

    const botonEstado = evento.target.closest("[data-toggle-user]");
    if (botonEstado) {
      const usuarioEstado = usuarios.find(function (item) {
        return Number(item.id) === Number(botonEstado.dataset.toggleUser);
      });
      if (usuarioEstado) {
        abrirModalEstado(usuarioEstado);
      }
      return;
    }

    const boton = evento.target.closest("[data-delete-user]");
    if (!boton) {
      return;
    }
    const id = Number(boton.dataset.deleteUser);
    const usuario = usuarios.find(function (item) {
      return Number(item.id) === id;
    });
    if (usuario) {
      abrirModalEliminarUsuario(usuario);
    }
  });

  return cargarUsuarios;
}
