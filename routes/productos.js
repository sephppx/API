import express from 'express';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();
const sql = neon(process.env.DATABASE_URL);
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await sql('SELECT id, nombre, precio, stock FROM productos ORDER BY id ASC');
    const productos = result;
    res.json({ productos });
  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(500).json({ error: 'Error al cargar los productos' });
  }
});

export default router;
