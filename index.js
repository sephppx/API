import express from 'express';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';
import { auth } from './middlewares/auth.js';
import productosRoutes from './routes/productos.js';

dotenv.config();

const sql = neon(process.env.DATABASE_URL);
export const CLAVE_SECRETA = process.env.CLAVE_SECRETA;
export const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME;

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Ruta principal para generar token y almacenar en cookie
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Reemplaza esto con tu lógica de autenticación (consulta a la base de datos, etc.)
  const userQuery = 'SELECT id, name, password, role FROM users WHERE email = $1';
  const results = await sql(userQuery, [email]);
  
  if (results.length === 0) {
    return res.status(400).json({ error: 'Usuario no encontrado' });
  }

  const user = results[0];
  const passwordMatch = bcrypt.compareSync(password, user.password);

  if (!passwordMatch) {
    return res.status(400).json({ error: 'Contraseña incorrecta' });
  }

  const token = jwt.sign({ id: user.id, name: user.name, role: user.role }, process.env.CLAVE_SECRETA, { expiresIn: '1h' });
  res.cookie(process.env.AUTH_COOKIE_NAME, token, { httpOnly: true, maxAge: 3600000 });
  res.json({ message: 'Inicio de sesión exitoso', token });
});

// Ruta protegida para obtener productos con JWT
app.use('/api/productos', auth, productosRoutes);

app.listen(3001, () => console.log('Servidor encendido en el puerto 3001'));
