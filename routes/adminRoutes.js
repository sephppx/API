import express from 'express';
import { sql } from '../index.js';
import { auth, adminMiddleware } from '../middlewares/middleware.js';

const router = express.Router();

// Endpoint para obtener el total ganado (solo accesible para administradores)
router.get('/totalEarned', auth, adminMiddleware, async (req, res) => {
  try {
    const totalQuery = 'SELECT SUM(monto) as totalEarned FROM recibos';
    const result = await sql(totalQuery);

    // Convierte totalEarned a número, con 0 como valor predeterminado si es nulo
    const totalEarned = parseFloat(result[0].totalearned) || 0;

    // Respuesta con el monto total
    res.status(200).json({ totalEarned });
  } catch (error) {
    console.error("Error al calcular el total ganado:", error);
    res.status(500).json({ error: 'Error al calcular el total ganado' });
  }
});

// Endpoint para agregar un nuevo producto (solo accesible para administradores)
router.post('/products', auth, adminMiddleware, async (req, res) => {
  const { nombre, precio, imagen_url, stock } = req.body;

  // Validación de los campos requeridos
  if (!nombre || !precio || !imagen_url || !stock) {
    return res.status(400).json({ error: 'Todos los campos son requeridos: nombre, precio, imagen_url, stock' });
  }

  try {
    // Consulta para insertar el nuevo producto
    const insertQuery = `
      INSERT INTO productos (nombre, precio, imagen_url, stock)
      VALUES ($1, $2, $3, $4)
      RETURNING id, nombre, precio, imagen_url, stock;
    `;
    const result = await sql(insertQuery, [nombre, precio, imagen_url, stock]);

    // El producto recién agregado
    const newProduct = result[0];
    
    // Respuesta exitosa con el producto añadido
    res.status(201).json({
      message: 'Producto agregado exitosamente',
      product: newProduct
    });
  } catch (error) {
    console.error("Error al agregar el producto:", error);
    res.status(500).json({ error: "Error en el servidor. Intente nuevamente más tarde." });
  }
});

// Endpoint para editar un producto (solo accesible para administradores)
router.post('/products/:productId', auth, adminMiddleware, async (req, res) => {
  const productId = req.params.productId;
  const { nombre, stock, precio, imagen_url } = req.body;

  try {
    // Obtener el producto actual para usar sus valores como predeterminados
    const productQuery = 'SELECT nombre, stock, precio, imagen_url FROM productos WHERE id = $1';
    const productResult = await sql(productQuery, [productId]);

    if (productResult.length === 0) {
      return res.status(404).json({ error: 'El producto no existe en la base de datos' });
    }

    // Asignar valores actuales como predeterminados en caso de campos faltantes
    const existingProduct = productResult[0];
    const updatedNombre = nombre || existingProduct.nombre;
    const updatedStock = stock !== undefined ? stock : existingProduct.stock;
    const updatedPrecio = precio !== undefined ? precio : existingProduct.precio;
    const updatedImagenUrl = imagen_url || existingProduct.imagen_url;

    // Actualización directa del producto
    const result = await sql(
      'UPDATE productos SET nombre = $1, stock = $2, precio = $3, imagen_url = $4 WHERE id = $5 RETURNING id, nombre, stock, precio, imagen_url;',
      [updatedNombre, updatedStock, updatedPrecio, updatedImagenUrl, productId]
    );

    // Producto actualizado exitosamente
    res.status(200).json({
      message: 'Producto modificado exitosamente',
      product: result[0]
    });
  } catch (error) {
    console.error("Error al actualizar el producto:", error);
    res.status(500).json({ error: 'Error en el servidor. Intente nuevamente más tarde.' });
  }
});

// Endpoint para eliminar un producto existente (solo accesible para administradores)
router.delete('/products/:productId', auth, adminMiddleware, async (req, res) => {
  const productId = req.params.productId;

  try {
    // Verificar si el producto existe antes de eliminarlo
    const checkProduct = await sql('SELECT id FROM productos WHERE id = $1', [productId]);

    if (checkProduct.length === 0) {
      return res.status(404).json({ error: 'El producto no existe en la base de datos' });
    }

    // Eliminar el producto de la base de datos
    await sql('DELETE FROM productos WHERE id = $1', [productId]);

    // Respuesta de éxito
    res.status(200).json({
      message: 'Producto eliminado exitosamente'
    });
  } catch (error) {
    console.error("Error al eliminar el producto:", error);
    res.status(500).json({ error: 'Error en el servidor. Intente nuevamente más tarde.' });
  }
});

export default router;
