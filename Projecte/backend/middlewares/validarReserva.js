const { validarDatosReserva } = require('../utils/validaciones');
const { esDiaLaborable, esBloqueValido } = require('../utils/horarios');

// Middleware para validar los datos mínimos de la reserva
function validarReserva(req, res, next) {
  try {
    const datos = req.body;
    const resultado = validarDatosReserva(datos);
    
    if (!resultado.valido) {
      return res.status(400).json({ 
        error: 'Errors en el formulari',
        errores: resultado.errores
      });
    }
    
    // Validar día laborable (lunes-viernes)
    if (!esDiaLaborable(datos.fecha_reserva)) {
      return res.status(400).json({ 
        error: 'Només es poden fer reserves de dilluns a divendres' 
      });
    }
    
    // Validar bloque de horas
    if (!esBloqueValido(datos.bloque)) {
      return res.status(400).json({ 
        error: 'Bloc no vàlid' 
      });
    }
    
    next();
  } catch (error) {
    return res.status(400).json({ 
      error: 'Error en la validació de la reserva' 
    });
  }
}

module.exports = validarReserva;
