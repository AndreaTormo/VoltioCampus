const db = require('../config/db');

// Obtener festivos
async function obtenerFestivos(req, res) {
  try {
    const resultado = await db.query(
      `SELECT id, fecha, descripcion 
       FROM festivos 
       ORDER BY fecha ASC`
    );
    return res.status(200).json({
      festivos: resultado.rows
    });
  } catch (error) {
    return res.status(500).json({ 
      error: 'Error en obtindre els festius' 
    });
  }
}

// Admin: crear festivo
async function crearFestivo(req, res) {
  try {
    const { fecha, descripcion } = req.body;
    const adminId = req.usuario.id;
    
    if (!fecha) {
      return res.status(400).json({ 
        error: 'La data és obligatòria' 
      });
    }
    
    // Comprobar si ya existe
    const existe = await db.query('SELECT id FROM festivos WHERE fecha = $1', [fecha]);
    if (existe.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Ja existeix un festiu per a esta data' 
      });
    }
    
    const resultado = await db.query(
      `INSERT INTO festivos (fecha, descripcion, creado_por_admin_id)
       VALUES ($1, $2, $3)
       RETURNING id, fecha, descripcion`,
      [fecha, descripcion || null, adminId]
    );
    
    return res.status(201).json({
      mensaje: 'Festiu afegit correctament',
      festivo: resultado.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ 
      error: 'Error en afegir el festiu' 
    });
  }
}

// Admin: eliminar festivo
async function eliminarFestivo(req, res) {
  try {
    const { id } = req.params;
    
    const resultado = await db.query(
      `DELETE FROM festivos 
       WHERE id = $1 
       RETURNING id, fecha, descripcion`,
      [id]
    );
    
    if (resultado.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Festiu no trobat' 
      });
    }
    
    return res.status(200).json({
      mensaje: 'Festiu eliminat correctament',
      festivo: resultado.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ 
      error: 'Error en eliminar el festiu' 
    });
  }
}

module.exports = {
  obtenerFestivos,
  crearFestivo,
  eliminarFestivo
};
