import jwt from 'jsonwebtoken';
import { AUTH_COOKIE_NAME, CLAVE_SECRETA } from '../index.js';

// Middleware para verificar autenticación
export const auth = (req, res, next) => {
  const token = req.cookies[AUTH_COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'Autenticación requerida' });
  }

  try {
    const decoded = jwt.verify(token, CLAVE_SECRETA);
    req.user = decoded; // Almacena los datos del usuario en la solicitud
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }
};

// Middleware para verificar el rol de administrador
export const adminMiddleware = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador' });
  }
};
