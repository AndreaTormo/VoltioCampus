const DIAS_SEMANA = [
  { id: 1, nombre: "Dilluns", corto: "Dl" },
  { id: 2, nombre: "Dimarts", corto: "Dt" },
  { id: 3, nombre: "Dimecres", corto: "Dc" },
  { id: 4, nombre: "Dijous", corto: "Dj" },
  { id: 5, nombre: "Divendres", corto: "Dv" }
];

export function iniciarEditorHorario(raiz, { obtener, guardar }) {
  const dias = raiz.querySelector("[data-horario-dias]");
  const botonGuardar = raiz.querySelector("[data-horario-guardar]");
  const estado = raiz.querySelector("[data-horario-estado]");
  const error = raiz.querySelector("[data-horario-error]");

  let usuarioId = null;
  let operacion = null;
  let solicitud = 0;
  let cargado = false;

  // Una fila por día: interruptor + hora de inicio + hora de fin
  dias.innerHTML = `
    <table class="schedule-table">
      <thead>
        <tr>
          <th scope="col">Dia</th>
          <th scope="col">Actiu</th>
          <th scope="col">Entrada</th>
          <th scope="col">Eixida</th>
        </tr>
      </thead>
      <tbody>
        ${DIAS_SEMANA.map(function (dia) {
          return `
            <tr class="schedule-row" data-horario-fila data-dia="${dia.id}">
              <th scope="row" class="schedule-day-name">${dia.nombre}</th>
              <td class="schedule-active">
                <label class="schedule-switch">
                  <input type="checkbox" data-horario-dia value="${dia.id}"
                         aria-label="Activar ${dia.nombre}">
                  <span class="schedule-switch-track" aria-hidden="true"></span>
                </label>
              </td>
              <td>
                <input type="time" class="schedule-time" data-dia-inicio
                       aria-label="Hora d’inici de ${dia.nombre}">
              </td>
              <td>
                <input type="time" class="schedule-time" data-dia-fin
                       aria-label="Hora de fi de ${dia.nombre}">
              </td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;

  function filas() {
    return Array.from(dias.querySelectorAll("[data-horario-fila]")).map(function (fila) {
      return {
        id: Number(fila.dataset.dia),
        check: fila.querySelector("[data-horario-dia]"),
        inicio: fila.querySelector("[data-dia-inicio]"),
        fin: fila.querySelector("[data-dia-fin]")
      };
    });
  }

  function nombreDia(id) {
    const dia = DIAS_SEMANA.find(function (d) { return d.id === id; });
    return dia ? dia.nombre : "";
  }

  function mostrarError(mensaje) {
    error.textContent = mensaje;
    error.hidden = false;
  }

  function limpiarError() {
    error.textContent = "";
    error.hidden = true;
  }

  function actualizarControles() {
    const ocupado = operacion !== null;
    botonGuardar.disabled = ocupado || !cargado;
    raiz.querySelectorAll("input").forEach(function (campo) {
      campo.disabled = ocupado;
    });
    // Las horas de un día sin marcar no se pueden editar
    filas().forEach(function (fila) {
      if (!ocupado && !fila.check.checked) {
        fila.inicio.disabled = true;
        fila.fin.disabled = true;
      }
    });
    botonGuardar.setAttribute("aria-busy", String(ocupado));
    botonGuardar.textContent = ocupado ? "Guardant..." : "Guardar horari";
  }

  function leerIntervalos() {
    return filas()
      .filter(function (fila) { return fila.check.checked; })
      .map(function (fila) {
        return {
          dia_semana: fila.id,
          hora_inicio: fila.inicio.value,
          hora_fin: fila.fin.value
        };
      });
  }

  // Devuelve true si algún día venía con más de un tramo (el editor solo admite uno por día)
  function cargarValores(intervalos) {
    const porDia = new Map();
    let variosTramos = false;

    intervalos.forEach(function (intervalo) {
      const id = Number(intervalo.dia_semana);
      if (porDia.has(id)) {
        variosTramos = true;
        return;
      }
      porDia.set(id, intervalo);
    });

    filas().forEach(function (fila) {
      const intervalo = porDia.get(fila.id);
      fila.check.checked = Boolean(intervalo);
      fila.inicio.value = intervalo ? intervalo.hora_inicio : "";
      fila.fin.value = intervalo ? intervalo.hora_fin : "";
    });

    return variosTramos;
  }

  // Al marcar un día vacío, proponemos las horas de otro día ya rellenado
  dias.addEventListener("change", function (evento) {
    const check = evento.target.closest("[data-horario-dia]");
    if (!check) {
      return;
    }

    const todas = filas();
    const fila = todas.find(function (f) { return f.check === check; });

    if (check.checked && !fila.inicio.value && !fila.fin.value) {
      const modelo = todas.find(function (f) {
        return f !== fila && f.check.checked && f.inicio.value && f.fin.value;
      });
      if (modelo) {
        fila.inicio.value = modelo.inicio.value;
        fila.fin.value = modelo.fin.value;
      }
    }

    actualizarControles();
  });

  async function cargar(id) {
    if (operacion === "guardar") {
      return;
    }

    const solicitudActual = ++solicitud;
    usuarioId = id === undefined ? null : id;
    operacion = "cargar";
    cargado = false;
    limpiarError();
    cargarValores([]);
    estado.textContent = "Carregant horari...";
    actualizarControles();

    try {
      const datos = await obtener(usuarioId);
      if (solicitudActual !== solicitud) {
        return;
      }

      const intervalos = Array.isArray(datos.intervalos) ? datos.intervalos : [];
      const variosTramos = cargarValores(intervalos);
      cargado = true;
      estado.textContent = variosTramos
        ? "Algun dia tenia més d’un tram. L’editor només mostra el primer; en guardar, els altres es perdran."
        : intervalos.length
          ? "Tria els dies i defineix l’horari de cada un."
          : "Marca els dies que vens al centre i indica l’horari de cada dia.";
    } catch (errorCarga) {
      if (solicitudActual !== solicitud) {
        return;
      }
      cargarValores([]);
      estado.textContent = "";
      mostrarError(errorCarga.message || "No s’ha pogut carregar l’horari.");
    } finally {
      if (solicitudActual === solicitud) {
        operacion = null;
        actualizarControles();
      }
    }
  }

  async function guardarHorario() {
    if (operacion) {
      return;
    }

    // Validamos cada día marcado por separado
    const invalido = filas().find(function (fila) {
      return fila.check.checked &&
        (!fila.inicio.value || !fila.fin.value || fila.inicio.value >= fila.fin.value);
    });
    if (invalido) {
      mostrarError(`Indica una hora d’inici i una de fi vàlides per a ${nombreDia(invalido.id)}.`);
      return;
    }

    const solicitudActual = ++solicitud;
    operacion = "guardar";
    limpiarError();
    estado.textContent = "";
    actualizarControles();

    try {
      const datos = await guardar(usuarioId, leerIntervalos());
      if (solicitudActual !== solicitud) {
        return;
      }

      const intervalos = Array.isArray(datos.intervalos) ? datos.intervalos : [];
      cargarValores(intervalos);
      cargado = true;
      estado.textContent = intervalos.length
        ? "Horari setmanal guardat correctament."
        : "Horari eliminat. No es podran fer reserves fins que en configures un.";
    } catch (errorGuardado) {
      if (solicitudActual !== solicitud) {
        return;
      }
      mostrarError(errorGuardado.message || "No s’ha pogut guardar l’horari.");
    } finally {
      if (solicitudActual === solicitud) {
        operacion = null;
        actualizarControles();
      }
    }
  }

  botonGuardar.addEventListener("click", guardarHorario);

  return { cargar };
}