import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AUTH_COOKIE_NAME, CLAVE_SECRETA, sql } from '../index.js';
import { auth } from '../middlewares/middleware.js';

const router = express.Router();

// Endpoint de Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'No se pudo completar la solicitud. Email y contraseña son requeridos.' });
  }

  try {
    const query = 'SELECT id, password, name, role FROM users WHERE email = $1';
    const results = await sql(query, [email]);

    if (results.length === 0) {
      return res.status(401).json({ error: 'Usuario no registrado.' });
    }

    const { id, password: hashedPassword, name, role } = results[0];
    if (!bcrypt.compareSync(password, hashedPassword)) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }

    const token = jwt.sign({ id, name, role }, CLAVE_SECRETA);
    res.status(200).cookie(AUTH_COOKIE_NAME, token, { httpOnly: true }).json({
      message: 'Inicio de sesión exitoso',
      token
    });
  } catch (error) {
    console.error("Error en el proceso de login:", error);
    res.status(500).json({ error: "Error en el servidor. Intente nuevamente más tarde." });
  }
});

// Endpoint de Signup
router.post('/signup', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Todos los campos (email, contraseña, nombre) son requeridos.' });
  }

  try {
    const emailCheckQuery = 'SELECT id FROM users WHERE email = $1';
    const emailCheckResult = await sql(emailCheckQuery, [email]);

    if (emailCheckResult.length > 0) {
      return res.status(409).json({ error: 'El correo ya está registrado.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const insertUserQuery = 'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, name';
    const newUser = await sql(insertUserQuery, [email, hashedPassword, name]);

    const userId = newUser[0].id;
    const token = jwt.sign({ userId, name, email }, CLAVE_SECRETA);

    res.status(201).cookie(AUTH_COOKIE_NAME, token, { httpOnly: true }).json({
      message: 'Cuenta creada exitosamente',
      token
    });
  } catch (error) {
    console.error("Error en el proceso de registro:", error);
    res.status(500).json({ error: "Error en el servidor. Intente nuevamente más tarde." });
  }
});

// Endpoint para obtener el perfil del usuario
router.get('/profile', auth, async (req, res) => {
  const userId = req.user.id;

  try {
    // Consulta para obtener el nombre, email y saldo de la wallet del usuario
    const userQuery = `
      SELECT u.name, u.email, w.monto AS wallet_balance
      FROM users u
      JOIN wallet w ON u.id = w.user_id
      WHERE u.id = $1
    `;
    const userData = await sql(userQuery, [userId]);

    const user = userData[0] || {};

    // Respuesta con los datos del usuario
    res.status(200).json({
      name: user.name || "No disponible",
      email: user.email || "No disponible",
      walletBalance: user.wallet_balance || 0.0
    });
  } catch (error) {
    console.error("Error al obtener el perfil del usuario:", error);
    res.status(500).json({ error: "Error al obtener el perfil. Intente nuevamente más tarde." });
  }
});

export default router;