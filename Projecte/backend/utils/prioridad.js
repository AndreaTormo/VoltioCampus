const db = require('../config/db');

// Obtener usuarios con su info de prioridad
async function obtenerUsuariosParaPrioridad() {
  try {
    const query = `
      SELECT 
        u.id,
        u.nombre,
        u.apellidos,
        u.tipo,
        u.ultima_reserva_fecha,
        u.reservas_creadas_count,
        u.fecha_registro
      FROM usuarios u
      INNER JOIN roles r ON u.rol_id = r.id
      WHERE r.nombre != 'admin'
      ORDER BY u.id ASC
    `;
    const resultado = await db.query(query);
    return resultado.rows;
  } catch (error) {
    throw error;
  }
}

// Calcular prioridad: 
// 1. Quien NUNCA ha creado ninguna reserva (ultima_reserva_fecha NULL) tiene PRIORIDAD
// 2. Desempate: quien lleve más tiempo sin cargar (ultima_reserva_fecha más antigua)
// Si ultima_reserva_fecha es NULL, significa más tiempo sin cargar -> mayor prioridad
function compararPrioridad(usuarioA, usuarioB) {
  // Si A nunca ha creado reserva y B sí
  if (usuarioA.ultima_reserva_fecha === null && usuarioB.ultima_reserva_fecha !== null) {
    return -1; // A tiene prioridad
  }
  // Si B nunca ha creado reserva y A sí
  if (usuarioB.ultima_reserva_fecha === null && usuarioA.ultima_reserva_fecha !== null) {
    return 1; // B tiene prioridad
  }
  // Si ambos nunca han creado reserva o ambos sí, desempate por quien lleve más tiempo sin cargar
  if (usuarioA.ultima_reserva_fecha === null && usuarioB.ultima_reserva_fecha === null) {
    // Ambos nunca han creado reserva -> desempate por fecha_registro más antigua o id
    if (new Date(usuarioA.fecha_registro) < new Date(usuarioB.fecha_registro)) {
      return -1;
    }
    if (new Date(usuarioA.fecha_registro) > new Date(usuarioB.fecha_registro)) {
      return 1;
    }
    return usuarioA.id - usuarioB.id;
  }
  // Ambos tienen reservas, quien tenga ultima_reserva_fecha más antigua lleva más tiempo sin cargar
  const fechaA = new Date(usuarioA.ultima_reserva_fecha);
  const fechaB = new Date(usuarioB.ultima_reserva_fecha);
  if (fechaA < fechaB) {
    return -1; // A lleva más tiempo sin cargar
  }
  if (fechaA > fechaB) {
    return 1;
  }
  // Si misma fecha, por id
  return usuarioA.id - usuarioB.id;
}

module.exports = {
  obtenerUsuariosParaPrioridad,
  compararPrioridad
};
