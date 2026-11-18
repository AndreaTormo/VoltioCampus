// Middleware para autorización por rol
function roleMiddleware(rolesPermitidos) {
  return (req, res, next) => {
    try {
      if (!req.usuario) {
        return res.status(401).json({ 
          error: 'No autoritzat' 
        });
      }
      
      const rolUsuario = req.usuario.rol;
      
      if (!rolesPermitidos.includes(rolUsuario)) {
        return res.status(403).json({ 
          error: 'Accés denegat. No tens permisos per a esta acció' 
        });
      }
      
      next();
    } catch (error) {
      return res.status(403).json({ 
        error: 'Accés denegat' 
      });
    }
  };
}

module.exports = roleMiddleware;
