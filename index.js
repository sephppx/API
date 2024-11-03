import express from 'express';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import authRoutes from './routes/authRoutes.js';
import productosRoutes from './routes/productosRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import carritoRoutes from './routes/carritoRoutes.js';

dotenv.config();

export const sql = neon(process.env.DATABASE_URL);
export const CLAVE_SECRETA = process.env.CLAVE_SECRETA;
export const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME;

const app = express();

app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/carrito', carritoRoutes);

app.listen(3001, () => console.log('Servidor encendido en el puerto 3001'));