import express from 'express';
import { sql } from '../index.js';

const router = express.Router();

// Endpoint para obtener todos los productos
router.get('/products', async (req, res) => {
  try {
    // Consulta para obtener los productos con los campos mínimos
    const query = 'SELECT id, nombre, precio, imagen_url, stock FROM productos ORDER BY id ASC';
    const productos = await sql(query);

    // Devuelve los productos en formato JSON
    res.status(200).json({ productos });
  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(500).json({ error: 'Error al cargar los productos' });
  }
});

// Endpoint para obtener un producto específico
router.get('/products/:productId', async (req, res) => {
  const { productId } = req.params;

  try {
    // Consulta para obtener la información del producto
    const query = 'SELECT id, nombre, precio, imagen_url, stock FROM productos WHERE id = $1';
    const result = await sql(query, [productId]);

    // Verifica si el producto existe
    if (result.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Devuelve la información del producto en formato JSON
    res.status(200).json(result[0]);
  } catch (error) {
    console.error("Error al obtener el producto:", error);
    res.status(500).json({ error: 'Error al cargar el producto' });
  }
});

export default router;